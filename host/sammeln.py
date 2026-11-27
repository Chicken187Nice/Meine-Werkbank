#!/usr/bin/env python3
"""Sammelt Serverdaten für die Werkbank und schreibt sie als JSON nach ../status/.

Läuft jede Minute per crontab auf dem Server (nicht im Container). Die Werkbank hängt den Ordner nur lesend ein,
sie braucht dadurch weder den Docker-Socket noch Zugriff auf das System.
Aufruf:  python3 sammeln.py [--alles]
"""
import concurrent.futures
import glob
import ipaddress
import json
import os
import subprocess
import sys
import time

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(BASE, 'status')
ENV = dict(os.environ, LC_ALL='C', PATH='/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin')
NOW = int(time.time() * 1000)
ALL = '--alles' in sys.argv


def run(args, timeout=60):
    r = subprocess.run(args, capture_output=True, text=True, timeout=timeout, env=ENV)
    if r.returncode:
        raise RuntimeError((r.stderr.strip() or f'{args[0]} endete mit {r.returncode}')[:300])
    return r.stdout


def read(name):
    try:
        with open(os.path.join(OUT, name + '.json'), encoding='utf-8') as f:
            return json.load(f)
    except (OSError, ValueError):
        return {}


def write(name, data):
    path = os.path.join(OUT, name + '.json')
    tmp = path + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False)
    os.chmod(tmp, 0o644)
    os.replace(tmp, path)


# ---------- Docker ----------
def size(text):
    units = {'B': 1, 'kB': 1e3, 'KiB': 1024, 'MB': 1e6, 'MiB': 1024 ** 2, 'GB': 1e9, 'GiB': 1024 ** 3, 'TiB': 1024 ** 4}
    for u in sorted(units, key=len, reverse=True):
        if text.endswith(u):
            return int(float(text[:-len(u)]) * units[u])
    return 0


def percent(text):
    try:
        return float(text.rstrip('%'))
    except ValueError:
        return 0.0


def docker():
    ids = run(['docker', 'ps', '-aq', '--no-trunc']).split()
    info = json.loads(run(['docker', 'inspect', *ids])) if ids else []
    stats = {}
    for line in run(['docker', 'stats', '--no-stream', '--format', '{{json .}}']).splitlines():
        s = json.loads(line)
        stats[s['Name']] = s
    old = {c['name']: c for c in read('docker').get('containers', [])}
    out = []
    for c in info:
        # Nur ausgewählte Felder übernehmen: "inspect" enthält auch Umgebungsvariablen mit Geheimnissen.
        state, name = c['State'], c['Name'].lstrip('/')
        prev, restarts = old.get(name, {}), c.get('RestartCount', 0)
        times = [t for t in prev.get('restartTimes', []) if t > NOW - 86400000]
        if prev.get('id') == c['Id'][:12] and restarts > prev.get('restarts', 0):
            times.append(NOW)
        s = stats.get(name) if state.get('Running') else None
        out.append({
            'id': c['Id'][:12], 'name': name, 'image': c['Config'].get('Image', ''),
            'project': (c['Config'].get('Labels') or {}).get('com.docker.compose.project', ''),
            'state': state.get('Status', ''), 'health': (state.get('Health') or {}).get('Status', ''),
            'exit': state.get('ExitCode', 0), 'oom': bool(state.get('OOMKilled')),
            'started': state.get('StartedAt', ''), 'finished': state.get('FinishedAt', ''),
            'restarts': restarts, 'restartTimes': times[-50:],
            'cpu': percent(s['CPUPerc']) if s else None,
            'mem': size(s['MemUsage'].split('/')[0].strip()) if s else None,
            'memPerc': percent(s['MemPerc']) if s else None,
        })
    write('docker', {'t': NOW, 'containers': sorted(out, key=lambda x: x['name'])})


# ---------- Updates, Speicherplatz, Sicherungen ----------
def apt_changed(since):
    """Wurde seit der letzten Prüfung etwas installiert oder die Paketliste erneuert?"""
    for path in ('/var/lib/dpkg/status', '/var/lib/apt/lists', '/var/lib/apt/periodic/update-success-stamp'):
        try:
            if os.path.getmtime(path) * 1000 > since:
                return True
        except OSError:
            pass
    return False


def updates(old):
    if old and not ALL and not old.get('error') and NOW - old.get('t', 0) < 30 * 60000 and not apt_changed(old.get('t', 0)):
        return old
    lines = [l for l in run(['apt', 'list', '--upgradable'], 180).splitlines() if '/' in l]
    security = [l.split('/')[0] for l in lines if '-security' in l.split(' ')[0]]
    try:
        checked = int(os.path.getmtime('/var/lib/apt/periodic/update-success-stamp') * 1000)
    except OSError:
        checked = None
    return {'t': NOW, 'count': len(lines), 'security': len(security), 'names': (security + [l.split('/')[0] for l in lines if l.split('/')[0] not in security])[:60], 'listFrom': checked}


def system():
    reboot = None
    if os.path.exists('/var/run/reboot-required'):
        try:
            with open('/var/run/reboot-required.pkgs', encoding='utf-8') as f:
                pkgs = sorted(set(f.read().split()))[:15]
        except OSError:
            pkgs = []
        reboot = {'since': int(os.path.getmtime('/var/run/reboot-required') * 1000), 'pkgs': pkgs}
    disks = []
    for line in run(['df', '-P', '-k', '-l', '-x', 'tmpfs', '-x', 'devtmpfs', '-x', 'overlay', '-x', 'squashfs', '-x', 'efivarfs']).splitlines()[1:]:
        p = line.split(None, 5)
        disks.append({'mount': p[5], 'total': int(p[1]) * 1024, 'used': int(p[2]) * 1024, 'free': int(p[3]) * 1024, 'percent': int(p[4].rstrip('%'))})
    backups = []
    for path in glob.glob(os.path.join(BASE, 'werkbank-daten*.tgz')):
        st = os.stat(path)
        if st.st_size and 'importiert' not in os.path.basename(path):
            backups.append({'name': os.path.basename(path), 'size': st.st_size, 't': int(st.st_mtime * 1000)})
    try:
        apt = updates(read('system').get('apt'))
    except Exception as e:  # Speicherplatz und Sicherungen trotzdem melden
        apt = {'t': NOW, 'error': str(e)[:300]}
    raw, net = traffic(read('system').get('netRaw'))
    write('system', {'t': NOW, 'netRaw': raw, 'net': net, 'apt': apt, 'reboot': reboot, 'disks': disks, 'backups': sorted(backups, key=lambda b: -b['t'])[:10], 'backupCount': len(backups)})


def traffic(old):
    """Bytes pro Sekunde der Netzwerkkarte, über die der Server ins Internet geht (Mittel seit dem letzten Lauf)."""
    try:
        with open('/proc/net/route', encoding='ascii') as f:
            dev = next(p[0] for p in (line.split() for line in f.readlines()[1:]) if p[1] == '00000000')
        base = f'/sys/class/net/{dev}/statistics/'
        with open(base + 'rx_bytes', encoding='ascii') as r, open(base + 'tx_bytes', encoding='ascii') as t:
            raw = {'t': int(time.time() * 1000), 'dev': dev, 'rx': int(r.read()), 'tx': int(t.read())}
    except (OSError, StopIteration, ValueError):
        return None, None
    secs = (raw['t'] - old['t']) / 1000 if old and old.get('dev') == dev else 0
    if not 5 <= secs <= 900 or raw['rx'] < old['rx'] or raw['tx'] < old['tx']:
        return (old if 0 < secs < 5 else raw), None
    return raw, {'rx': round((raw['rx'] - old['rx']) / secs), 'tx': round((raw['tx'] - old['tx']) / secs)}


# ---------- Geräte im Heimnetz ----------
def ping(ip):
    return subprocess.run(['ping', '-n', '-c', '1', '-W', '1', ip], capture_output=True, env=ENV).returncode == 0


def hostname(ip):
    try:
        parts = run(['getent', 'hosts', ip], 3).split()
        return parts[1] if len(parts) > 1 else ''
    except Exception:
        return ''


def netz():
    route = json.loads(run(['ip', '-j', '-4', 'route', 'show', 'default']))[0]
    dev, router = route['dev'], route.get('gateway', '')
    link = json.loads(run(['ip', '-j', '-4', 'addr', 'show', 'dev', dev]))[0]
    own, prefix = link['addr_info'][0]['local'], link['addr_info'][0]['prefixlen']
    net = ipaddress.ip_network(f'{own}/{max(prefix, 24)}', strict=False)  # höchstens 254 Adressen absuchen
    hosts = [str(h) for h in net.hosts() if str(h) != own]
    with concurrent.futures.ThreadPoolExecutor(64) as pool:
        replied = {h for h, ok in zip(hosts, pool.map(ping, hosts)) if ok}
    time.sleep(8)  # warten, bis die ARP-Tabelle weiß, wer wirklich antwortet (auch Geräte, die Ping blockieren)
    with open(f'/sys/class/net/{dev}/address', encoding='ascii') as f:
        found = {own: f.read().strip()}
    for n in json.loads(run(['ip', '-j', '-4', 'neigh', 'show', 'dev', dev])):
        ip = n.get('dst', '')
        if n.get('lladdr') and ipaddress.ip_address(ip) in net and (ip in replied or 'REACHABLE' in n.get('state', [])):
            found[ip] = n['lladdr']
    with concurrent.futures.ThreadPoolExecutor(32) as pool:
        names = dict(zip(found, pool.map(hostname, found)))
    devices = [{'mac': mac.lower(), 'ip': ip, 'host': names[ip], 'self': ip == own, 'router': ip == router} for ip, mac in found.items()]
    write('netz', {'t': NOW, 'iface': dev, 'net': str(net), 'devices': sorted(devices, key=lambda d: ipaddress.ip_address(d['ip']))})


def main():
    os.makedirs(OUT, mode=0o755, exist_ok=True)
    jobs = [('docker', docker), ('system', system)]
    if ALL or NOW - read('netz').get('t', 0) > 270000:
        jobs.append(('netz', netz))
    failed = False
    for name, job in jobs:
        try:
            job()
        except Exception as e:  # ein Fehler darf die anderen Bereiche nicht aufhalten
            failed = True
            print(f'{name}: {e}', file=sys.stderr)
            write(name, {**read(name), 'error': str(e)[:300]})  # alter Zeitstempel bleibt: gilt dann als veraltet
    sys.exit(1 if failed else 0)


if __name__ == '__main__':
    main()
