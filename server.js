// Werkbank – Server ohne externe Abhängigkeiten
// Login (scrypt, Sessions, Sperre nach Fehlversuchen, optional 2FA/TOTP), Rechte pro App,
// Daten pro Nutzer, Ende-zu-Ende-Messenger-Backend (speichert nur Geheimtext), RSS-Wochenbericht, HTTPS.
'use strict';
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const net = require('net');
const tls = require('tls');
const os = require('os');

const PORT = +process.env.PORT || 8080;
const HTTPS_PORT = +process.env.HTTPS_PORT || 8443;
const OWNER = (process.env.WB_OWNER || 'admin').toLowerCase(); // Name des ersten Kontos, nur bei der Ersteinrichtung wichtig
const PUB = path.join(__dirname, 'public');
const DATA = process.env.DATA_DIR || path.join(__dirname, 'data');
for (const d of ['u', 'msg/keys', 'msg/conv', 'tls', 'outfits']) fs.mkdirSync(path.join(DATA, d), { recursive: true });

const APPS = ['finanzen', 'abos', 'kueche', 'gewohnheiten', 'aufgaben', 'notizen', 'countdown', 'fokus', 'lesezeichen', 'wochenbericht',
  'berichtsheft', 'schule', 'lernen', 'tippen', 'erklaert', 'bewerbung', 'outfits', 'messenger', 'spiele', 'entscheiden', 'rechner', 'reisen', 'passwort', 'pihole', 'monitor', 'system', 'protokoll', 'docker', 'wartung', 'geraete', 'pakete', 'jellyfin'];
const ADMIN_APPS = ['protokoll', 'docker', 'wartung', 'geraete']; // Server- und Netzdaten, fremde IPs: nie für normale Nutzer

const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };

// ---------- Dateien ----------
const readJSON = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
const writeJSON = (f, v) => { fs.mkdirSync(path.dirname(f), { recursive: true }); const t = f + '.' + process.pid + '.tmp'; fs.writeFileSync(t, JSON.stringify(v)); fs.renameSync(t, f); };
const F = { users: path.join(DATA, 'users.json'), sessions: path.join(DATA, 'sessions.json'), audit: path.join(DATA, 'audit.json') };
let users = readJSON(F.users, []);
let sessions = readJSON(F.sessions, {});
let audit = readJSON(F.audit, []);
const saveUsers = () => writeJSON(F.users, users);
// Einmalig: bisherige Konten mit dem alten Standard (12 Stunden) bleiben jetzt angemeldet (sessionHours 0)
const STAY_MARK = path.join(DATA, 'migration-angemeldet-bleiben');
if (!fs.existsSync(STAY_MARK)) { for (const u of users) if ((u.sessionHours || 12) === 12) u.sessionHours = 0; if (users.length) saveUsers(); fs.writeFileSync(STAY_MARK, new Date().toISOString()); }
let sessT; const saveSessions = () => { clearTimeout(sessT); sessT = setTimeout(() => writeJSON(F.sessions, sessions), 500); };
function log(ev, user, ip, detail = '') { audit.push({ t: new Date().toISOString(), ev, user, ip, detail }); if (audit.length > 2000) audit = audit.slice(-2000); writeJSON(F.audit, audit); }

let jf = null; // Jellyfin-Modul, wird beim Aufbau der Routen gesetzt

// ---------- Passwörter ----------
const SCRYPT = { N: 32768, r: 8, p: 1, maxmem: 96 * 1024 * 1024 };
const hashPw = pw => new Promise((ok, no) => { const salt = crypto.randomBytes(16);
  crypto.scrypt(pw, salt, 64, SCRYPT, (e, k) => e ? no(e) : ok(`scrypt$${SCRYPT.N}$${salt.toString('base64')}$${k.toString('base64')}`)); });
const checkPw = (pw, stored) => new Promise(ok => {
  const [, N, s, h] = (stored || 'scrypt$32768$AAAAAAAAAAAAAAAAAAAAAA==$' + 'A'.repeat(86) + '==').split('$');
  crypto.scrypt(pw, Buffer.from(s, 'base64'), 64, { ...SCRYPT, N: +N }, (e, k) => {
    const hb = Buffer.from(h, 'base64'); ok(!e && !!stored && hb.length === k.length && crypto.timingSafeEqual(hb, k)); }); });
const COMMON = ['passwort', 'password', '123456', '12345678', '123456789', 'qwertz', 'qwerty', 'hallo', 'letmein', 'iloveyou', 'admin', 'welcome', 'werkbank', OWNER, 'sommer', 'winter', 'fussball', 'schatz', 'abc123', 'baller'];
function pwPolicy(p, name) {
  if (typeof p !== 'string' || p.length < 10 || p.length > 200) return 'Passwort: mindestens 10 Zeichen';
  const l = p.toLowerCase(); if (name && l.includes(String(name).toLowerCase())) return 'Passwort darf deinen Namen nicht enthalten';
  if (COMMON.some(c => l.includes(c)) && p.length < 16) return 'Passwort enthält ein sehr häufiges Wort. Nimm etwas Eigenes oder eine längere Passphrase';
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter(r => r.test(p)).length;
  if (p.length < 16 && classes < 3) return 'Unter 16 Zeichen brauchst du mindestens drei Arten: Klein-, Großbuchstaben, Ziffern, Sonderzeichen';
  if (/^(.)\1+$/.test(p)) return 'Passwort zu einfach'; return null;
}

// ---------- TOTP (RFC 6238) ----------
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const b32enc = buf => { let bits = '', out = ''; for (const b of buf) bits += b.toString(2).padStart(8, '0'); for (let i = 0; i < bits.length; i += 5) out += B32[parseInt(bits.slice(i, i + 5).padEnd(5, '0'), 2)]; return out; };
const b32dec = s => { let bits = ''; for (const c of s.replace(/=+$/, '').toUpperCase()) { const v = B32.indexOf(c); if (v < 0) continue; bits += v.toString(2).padStart(5, '0'); } const out = []; for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2)); return Buffer.from(out); };
function totp(secret, step) { const b = Buffer.alloc(8); b.writeBigUInt64BE(BigInt(step)); const h = crypto.createHmac('sha1', b32dec(secret)).update(b).digest(); const o = h[19] & 15;
  return String(((h.readUInt32BE(o) & 0x7fffffff) % 1e6)).padStart(6, '0'); }
const totpOk = (secret, code) => { const s = Math.floor(Date.now() / 30000); return [-1, 0, 1].some(d => totp(secret, s + d) === String(code || '').replace(/\s/g, '')); };

// ---------- Nutzer & Sessions ----------
// 2FA: Admins immer, alle anderen wenn ein Admin es verlangt. setup2fa = Pflicht, aber noch nicht eingerichtet.
const needs2fa = u => !!(u.admin || u.owner || u.require2fa);
const setup2fa = u => needs2fa(u) && !(u.totp && u.totp.enabled);
const locked = u => !!u.mustChange || setup2fa(u); // nur noch „Mein Konto“ erreichbar
// name = vom Admin angelegter Benutzername (zum Anmelden), display = selbst gewählter Name
const shownName = u => u.display || u.name;
const foldName = s => String(s || '').toLowerCase().replace(/[ ._'-]/g, '');
const nameTaken = (n, self) => users.some(u => u !== self && [u.name, u.display].some(x => x && foldName(x) === foldName(n)));
const pub = u => ({ id: u.id, name: u.name, display: u.display || '', shown: shownName(u), askName: !u.nameAsked, require2fa: needs2fa(u), setup2fa: setup2fa(u), admin: !!u.admin, owner: !!u.owner, apps: (u.owner ? APPS : u.apps.filter(a => APPS.includes(a))).filter(a => u.admin || !ADMIN_APPS.includes(a)), active: u.active,
  mustChange: !!u.mustChange, cockpit: u.owner || u.cockpit !== false, expires: u.expires || null, sessionHours: u.sessionHours, totp: !!(u.totp && u.totp.enabled), created: u.created, lastLogin: u.lastLogin || null, note: u.note || '' });
const findUser = id => users.find(u => u.id === id);
const canApp = (u, app) => u.owner || (u.admin || !ADMIN_APPS.includes(app)) && (app === 'messenger' || APPS.includes(app)) && u.apps.includes(app);
const expired = u => u.expires && new Date().toISOString().slice(0, 10) > u.expires;
const sha = t => crypto.createHash('sha256').update(t).digest('hex');
function parseCookies(req) { const o = {}; (req.headers.cookie || '').split(';').forEach(c => { const i = c.indexOf('='); if (i > 0) o[c.slice(0, i).trim()] = decodeURIComponent(c.slice(i + 1).trim()); }); return o; }
// sessionHours 0 = angemeldet bleiben (läuft erst nach 400 Tagen ohne Besuch ab, länger speichern Browser keine Cookies)
const STAY_MS = 400 * 864e5;
const idleMs = u => u.sessionHours === 0 ? STAY_MS : (u.sessionHours || 12) * 3600e3;
function getSession(req, res) {
  const tok = parseCookies(req).wb_s; if (!tok) return null; const key = sha(tok); const s = sessions[key]; if (!s) return null;
  const u = findUser(s.uid); const now = Date.now();
  if (!u || !u.active || expired(u) || now > s.exp || now - s.last > idleMs(u) || (u.sessionHours !== 0 && now - s.created > 30 * 864e5)) { delete sessions[key]; saveSessions(); closeStreams(key); return null; }
  if (now - s.last > 60000) { s.last = now; s.exp = now + idleMs(u); saveSessions(); if (res) setCookie(res, req, tok, idleMs(u) / 1000); } // Cookie mitverlängern
  req.wbUser = u.name;
  return { key, s, u };
}
function newSession(res, req, u) {
  const tok = crypto.randomBytes(32).toString('base64url'); const now = Date.now();
  const prev = parseCookies(req).wb_s; if (prev) delete sessions[sha(prev)]; // alte Sitzung dieses Browsers ersetzen
  sessions[sha(tok)] = { id: crypto.randomBytes(6).toString('hex'), uid: u.id, created: now, last: now, exp: now + idleMs(u), ip: ipOf(req), ua: String(req.headers['user-agent'] || '').slice(0, 160) };
  saveSessions(); setCookie(res, req, tok, idleMs(u) / 1000);
}
// Setzt ein Cookie, ohne andere Cookies derselben Antwort zu verwerfen
function addCookie(res, c) { const name = c.slice(0, c.indexOf('=') + 1); res.setHeader('Set-Cookie', [...[].concat(res.getHeader('Set-Cookie') || []).filter(x => !x.startsWith(name)), c]); }
const setCookie = (res, req, tok, maxAge) => addCookie(res, `wb_s=${tok}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.round(maxAge)}${isHttps(req) ? '; Secure' : ''}`);
function killSessions(uid, exceptKey) { for (const [k, s] of Object.entries(sessions)) if (s.uid === uid && k !== exceptKey) { delete sessions[k]; closeStreams(k); } saveSessions(); }
setInterval(() => { const n = Date.now(); let ch = false; for (const [k, s] of Object.entries(sessions)) if (n > s.exp) { delete sessions[k]; closeStreams(k); ch = true; } if (ch) saveSessions(); }, 10 * 60e3);

// ---------- Brute-Force-Schutz (bleibt über Neustarts erhalten) ----------
// Drei Ebenen: Name+IP (5 Fehler → 15 Min), Konto über alle IPs (10 → 30 Min), IP über alle Konten (20 → 60 Min).
// Wiederholte Sperren verdoppeln die Dauer (bis 8×). Bekannte Geräte (Gerätecookie) sind von der Kontosperre ausgenommen,
// damit ein Angreifer dich nicht aussperren kann. Jede fehlgeschlagene Anmeldung wird zusätzlich künstlich verzögert.
const TRUST_PROXY = process.env.WB_TRUST_PROXY === '1';
// Eigener Eingang nur für Caddy. Er wird nie auf dem Host veröffentlicht, ist also aus dem Heimnetz nicht erreichbar.
// Nur hier zählen X-Forwarded-For und X-Forwarded-Proto. Auf 8080/8443 könnte sie jedes Gerät fälschen.
const PROXY_PORT = 8082;
const viaProxy = req => TRUST_PROXY && req.socket.localPort === PROXY_PORT;
const LOCK_FILE = path.join(DATA, 'lockouts.json');
let guard = readJSON(LOCK_FILE, {}); let guardT;
const saveGuard = () => { clearTimeout(guardT); guardT = setTimeout(() => writeJSON(LOCK_FILE, guard), 300); };
const RULES = { ipacct: [5, 15], acct: [10, 30], ip: [20, 60], reset: [5, 60], jf: [5, 15] };
const isPrivateIp = ip => /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|::1$|fc|fd|fe80:|localhost$)/i.test(ip || '');
function ipOf(req) {
  const sock = (req.socket.remoteAddress || '').replace('::ffff:', '');
  if (viaProxy(req) && req.headers['x-forwarded-for']) { const l = String(req.headers['x-forwarded-for']).split(',').map(x => x.trim()).filter(Boolean); return (l[l.length - 1] || sock).replace('::ffff:', ''); }
  return sock;
}
const isHttps = req => !!req.socket.encrypted || (viaProxy(req) && String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https');
function lockLeft(keys) { const now = Date.now(); let m = 0; for (const k of keys) { const g = guard[k]; if (g && g.until > now) m = Math.max(m, Math.ceil((g.until - now) / 60000)); } return m; }
function recordFail(kind, key) {
  const k = kind + ':' + key, now = Date.now(); let g = guard[k];
  if (!g || now - g.first > 3600e3) g = { n: 0, first: now, until: g ? g.until : 0, level: g ? g.level || 0 : 0 };
  g.n++; const [lim, min] = RULES[kind];
  if (g.n >= lim) { g.level = (g.level || 0) + 1; g.until = now + min * 60e3 * Math.min(8, 2 ** (g.level - 1)); g.n = 0; g.first = now; log('sperre-' + kind, key.split('|')[0], key.split('|')[1] || '', `${min * Math.min(8, 2 ** (g.level - 1))} Min`); }
  guard[k] = g; saveGuard();
}
const clearFails = (...keys) => { keys.forEach(k => delete guard[k]); saveGuard(); };
setInterval(() => { const now = Date.now(); let ch = false; for (const [k, g] of Object.entries(guard)) if (g.until < now && now - g.first > 24 * 3600e3) { delete guard[k]; ch = true; } if (ch) saveGuard(); }, 3600e3);
const slow = () => new Promise(r => setTimeout(r, 600 + Math.random() * 600));
// Bekannte Geräte
const devOk = (req, u) => { const t = parseCookies(req).wb_d; return !!(t && u && (u.devices || []).some(d => d.h === sha(t) && d.exp > Date.now())); };
function rememberDevice(res, req, u) {
  if (devOk(req, u)) return; const t = crypto.randomBytes(24).toString('base64url');
  u.devices = [...(u.devices || []).filter(d => d.exp > Date.now()), { h: sha(t), exp: Date.now() + 365 * 864e5 }].slice(-10);
  addCookie(res, `wb_d=${t}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${365 * 86400}${isHttps(req) ? '; Secure' : ''}`);
}
// Einfaches Tempolimit für nicht angemeldete Anfragen
const rate = new Map();
function rateOk(ip, limit = 40) { const now = Date.now(), r = rate.get(ip) || { n: 0, t: now }; if (now - r.t > 60e3) { r.n = 0; r.t = now; } r.n++; rate.set(ip, r); return r.n <= limit; }
setInterval(() => { const now = Date.now(); for (const [k, r] of rate) if (now - r.t > 120e3) rate.delete(k); }, 120e3);
// TOTP mit Schutz gegen Wiederverwendung + Wiederherstellungscodes
function totpUse(u, code) {
  if (!u.totp || !u.totp.secret) return false; const c = String(code || '').replace(/\s/g, ''); const s0 = Math.floor(Date.now() / 30000);
  for (const d of [-1, 0, 1]) if (totp(u.totp.secret, s0 + d) === c) { if ((u.totp.last || 0) >= s0 + d) return false; u.totp.last = s0 + d; return true; }
  return false;
}
function recoveryUse(u, code) { const h = sha(String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '')); const i = (u.recovery || []).indexOf(h); if (i < 0) return false; u.recovery.splice(i, 1); return true; }
function newRecovery(u) { const codes = Array.from({ length: 10 }, () => b32enc(crypto.randomBytes(5)).slice(0, 8)); u.recovery = codes.map(c => sha(c)); return codes.map(c => c.slice(0, 4) + '-' + c.slice(4)); }
const secondFactor = (u, code) => totpUse(u, code) || recoveryUse(u, code);

// ---------- HTTP-Helfer ----------
const SEC = {
  'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer', 'Cross-Origin-Opener-Policy': 'same-origin', 'Cross-Origin-Resource-Policy': 'same-origin', 'X-Permitted-Cross-Domain-Policies': 'none',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(self)',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://cdn.shopify.com https://www.themealdb.com; connect-src 'self' https://api.open-meteo.com https://geocoding-api.open-meteo.com; frame-ancestors 'none'; base-uri 'none'; form-action 'self'; object-src 'none'"
};
function send(res, code, body, type = 'application/json; charset=utf-8') {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store', ...SEC });
  res.end(typeof body === 'string' || Buffer.isBuffer(body) ? body : JSON.stringify(body));
}
const err = (res, code, msg) => send(res, code, { error: msg });
const readBody = (req, limit = 4 * 1024 * 1024) => new Promise((ok, no) => { let size = 0; const ch = [];
  req.on('data', c => { size += c.length; if (size > limit) { no(new Error('Anfrage zu groß')); req.destroy(); } else ch.push(c); });
  req.on('end', () => ok(Buffer.concat(ch).toString('utf8'))); req.on('error', no); });
const json = async req => { const b = await readBody(req); try { return b ? JSON.parse(b) : {}; } catch { throw new Error('Ungültiges JSON'); } };
const page = (res, code, title, text) => send(res, code, `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/assets/base.css"><script src="/assets/core.js"></script><title>${title}</title></head><body><main class="wrap" style="padding-top:12vh;max-width:560px"><div class="label">${code}</div><h1 style="margin:8px 0 12px">${title}</h1><p class="mute">${text}</p><p style="margin-top:22px"><a class="btn primary" href="/">Zur Werkbank</a></p></main></body></html>`, 'text/html; charset=utf-8');
const userDir = uid => path.join(DATA, 'u', uid);

// ---------- Protokoll: Zugriffe auf die Werkbank und Anmeldeversuche ----------
// Zugriffe: eine Datei pro Tag (JSON je Zeile), 14 Tage. Wird sie zu groß, bleibt der neueste Teil erhalten.
// Anmeldungen: eigene Datei, damit viele Zugriffe sie nicht verdrängen. Gespeichert werden nie Passwörter, Codes oder URL-Parameter.
const LOG_DIR = path.join(DATA, 'log'); fs.mkdirSync(LOG_DIR, { recursive: true });
const TRAFFIC_DAYS = 14, TRAFFIC_PART = 5 * 1024 * 1024, LOGIN_PART = 5 * 1024 * 1024;
const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function sourceOf(req) {
  if (viaProxy(req)) return 'tunnel'; const ip = ipOf(req);
  if (/^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(ip)) return 'tailscale';
  return isPrivateIp(ip) ? 'heimnetz' : 'internet';
}
function appendLog(file, text, max) {
  try { try { if (fs.statSync(file).size > max) fs.renameSync(file, file + '.1'); } catch (e) { if (e.code !== 'ENOENT') throw e; } fs.appendFileSync(file, text); }
  catch (e) { console.error('Protokoll:', e.message); }
}
const readLog = file => [file + '.1', file].flatMap(f => { let t; try { t = fs.readFileSync(f, 'utf8'); } catch { return []; }
  return t.split('\n').flatMap(l => { if (!l) return []; try { return [JSON.parse(l)]; } catch { return []; } }); });
const trafficFile = day => path.join(LOG_DIR, `zugriffe-${day}.jsonl`);
let trafficBuf = [];
function flushTraffic() {
  if (!trafficBuf.length) return; const byDay = {};
  for (const e of trafficBuf) (byDay[dayKey(new Date(e.t))] ||= []).push(JSON.stringify(e) + '\n');
  trafficBuf = []; for (const [d, l] of Object.entries(byDay)) appendLog(trafficFile(d), l.join(''), TRAFFIC_PART);
}
const trafficDays = () => [...new Set(fs.readdirSync(LOG_DIR).map(f => (f.match(/^zugriffe-(\d{4}-\d\d-\d\d)\.jsonl/) || [])[1]).filter(Boolean))].sort().reverse();
function cleanTraffic() { const old = dayKey(new Date(Date.now() - (TRAFFIC_DAYS - 1) * 864e5));
  for (const f of fs.readdirSync(LOG_DIR)) { const m = f.match(/^zugriffe-(\d{4}-\d\d-\d\d)\.jsonl/); if (m && m[1] < old) fs.rmSync(path.join(LOG_DIR, f), { force: true }); } }
setInterval(flushTraffic, 2000); setInterval(cleanTraffic, 3600e3); cleanTraffic();
for (const sig of ['SIGTERM', 'SIGINT']) process.once(sig, () => { flushTraffic(); setTimeout(() => process.exit(0), 800); }); // 800 ms: offene Speichervorgänge abwarten
function trackRequest(req, res) {
  const t = Date.now(), sock = req.socket, sent = sock.bytesWritten || 0, ip = ipOf(req), s = sourceOf(req);
  res.once('close', () => {
    const p = String(req.url).split('?')[0].slice(0, 200);
    if (s !== 'tunnel' && ip === '127.0.0.1' && p === '/api/health') return; // Selbsttest des Containers
    if (p.startsWith('/api/protokoll') && res.statusCode < 400) return;       // das Protokoll protokolliert sich nicht selbst
    if (p === '/api/cockpit' && res.statusCode < 400) return;                // die Anzeige fragt alle paar Sekunden
    const head = req.method.length + req.url.length + 12 + req.rawHeaders.reduce((n, h) => n + h.length + 2, 0);
    trafficBuf.push({ t, ip, s, m: req.method, p, c: res.statusCode, ms: Date.now() - t, i: head + (req.complete ? +req.headers['content-length'] || 0 : 0),
      o: Math.max(0, (sock.bytesWritten || 0) - sent), u: req.wbUser || '' });
    if (trafficBuf.length > 500) flushTraffic();
  });
}
const LOGIN_FILE = path.join(LOG_DIR, 'anmeldungen.jsonl');
const LOGIN_OK = ['ok', 'setup', 'reset-ok'], LOGIN_WAIT = ['code-nötig'];
function loginLog(req, name, r, extra = {}) {
  appendLog(LOGIN_FILE, JSON.stringify({ t: Date.now(), name: String(name).slice(0, 40), r, ip: ipOf(req), s: sourceOf(req), ua: String(req.headers['user-agent'] || '').slice(0, 160), ...extra }) + '\n', LOGIN_PART);
}
// Einmalig: bisherige Anmeldungen aus dem Verwaltungs-Protokoll übernehmen
if (!fs.existsSync(LOGIN_FILE)) {
  const map = { login: 'ok', 'login-fehler': 'passwort', '2fa-fehler': 'code-falsch', 'login-gesperrt': 'gesperrt', 'login-deaktiviert': 'deaktiviert', 'login-abgelaufen': 'abgelaufen',
    setup: 'setup', 'setup-blockiert': 'setup-blockiert', 'reset-fehler': 'reset-fehler', 'passwort-selbst-zurückgesetzt': 'reset-ok' };
  appendLog(LOGIN_FILE, audit.filter(a => Object.hasOwn(map, a.ev)).map(a => JSON.stringify({ t: Date.parse(a.t), name: a.user, r: map[a.ev], ip: a.ip, s: '', ua: '' }) + '\n').join(''), LOGIN_PART);
}

// ---------- RSS ----------
const decode = s => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]+>/g, ' ')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const tag = (x, t) => { const m = x.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`, 'i')); return m ? decode(m[1]) : ''; };
function parseFeed(xml, source) {
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || [];
  return blocks.slice(0, 80).map(b => { let link = tag(b, 'link'); if (!link) { const m = b.match(/<link[^>]*href="([^"]+)"/i); link = m ? m[1] : ''; }
    const t = Date.parse(tag(b, 'pubDate') || tag(b, 'published') || tag(b, 'updated') || tag(b, 'dc:date'));
    return { title: tag(b, 'title'), link: /^https?:\/\//.test(link) ? link : '', summary: (tag(b, 'description') || tag(b, 'summary') || tag(b, 'content')).slice(0, 280), date: isNaN(t) ? null : new Date(t).toISOString(), source }; });
}
const dnsP = require('dns').promises;
async function publicHost(url) { const h = new URL(url).hostname.replace(/^\[|\]$/g, ''); const addrs = net.isIP(h) ? [h] : (await dnsP.lookup(h, { all: true })).map(a => a.address);
  if (!addrs.length || addrs.some(a => isPrivateIp(a.replace('::ffff:', '')) || a === '0.0.0.0')) throw new Error('Interne Adressen sind für Feeds gesperrt'); }
async function fetchFeed(url, name) {
  if (!/^https?:\/\//i.test(url)) throw new Error('nur http/https');
  await publicHost(url);
  const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 12000);
  try { let r = await fetch(url, { signal: ctrl.signal, redirect: 'manual', headers: { 'User-Agent': 'Werkbank/1.0 (+RSS)' } });
    for (let i = 0; i < 3 && r.status >= 300 && r.status < 400 && r.headers.get('location'); i++) { const nu = new URL(r.headers.get('location'), url).href; await publicHost(nu); r = await fetch(nu, { signal: ctrl.signal, redirect: 'manual', headers: { 'User-Agent': 'Werkbank/1.0 (+RSS)' } }); }
    return parseFeed((await r.text()).slice(0, 3e6), name || new URL(url).hostname); }
  finally { clearTimeout(to); }
}
const isoWeek = d => { const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())); const day = x.getUTCDay() || 7; x.setUTCDate(x.getUTCDate() + 4 - day);
  const y = new Date(Date.UTC(x.getUTCFullYear(), 0, 1)); return `${x.getUTCFullYear()}-W${String(Math.ceil(((x - y) / 864e5 + 1) / 7)).padStart(2, '0')}`; };
async function buildReport(cfg) {
  const kw = (cfg.keywords || []).map(k => String(k).toLowerCase()).filter(Boolean), since = Date.now() - 7 * 864e5, all = [], errors = [];
  await Promise.all((cfg.feeds || []).slice(0, 30).map(async f => { try { all.push(...await fetchFeed(f.url, f.name)); } catch { errors.push(f.name || f.url); } }));
  const seen = new Set();
  const items = all.filter(i => { if (!i.title || seen.has(i.title)) return false; seen.add(i.title); if (i.date && Date.parse(i.date) < since) return false;
    if (!kw.length) return true; const h = (i.title + ' ' + i.summary).toLowerCase(); i.matched = kw.filter(k => h.includes(k)); return i.matched.length > 0; })
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return { week: isoWeek(new Date()), created: new Date().toISOString(), keywords: kw, errors, items: items.slice(0, 150) };
}
async function autoReports() {
  const now = new Date(); if (now.getDay() === 1 && now.getHours() < 7) return;
  for (const u of users) { if (!u.active || !canApp(u, 'wochenbericht')) continue;
    const cfg = readJSON(path.join(userDir(u.id), 'wochenbericht.json'), null); if (!cfg || !cfg.auto || !(cfg.feeds || []).length) continue;
    const f = path.join(userDir(u.id), 'reports', isoWeek(now) + '.json'); if (fs.existsSync(f)) continue;
    try { writeJSON(f, await buildReport(cfg)); console.log('Wochenbericht', u.name, isoWeek(now)); } catch (e) { console.error(e.message); } }
}
setInterval(autoReports, 3600e3); setTimeout(autoReports, 20000);


// ---------- Outfits der Woche ----------
// Jeden Montag (neue Kalenderwoche) 6 Outfits aus ECHTEN Produkten von Streetwear-Shops (öffentliche Shopify-Produktlisten).
// Jedes Teil: Original-Produktfoto + exakter Name + Preis + Direktlink zum Produkt. Gemischt Schwarz-Weiß und Schwarz-Rot,
// oben slim/fitted, unten baggy/wide/loose. Bilder werden direkt vom Shop-CDN geladen, es liegen keine Bilddateien lokal.
const OUT_DIR = path.join(DATA, 'outfits');
const STORES = [
  { id: 'asphaltgold', name: 'Asphaltgold', url: 'https://www.asphaltgold.com', cur: 'EUR', pages: 8 },
  { id: 'mnml', name: 'mnml', url: 'https://mnml.la', cur: 'USD', pages: 5 },
  { id: 'pegador', name: 'Pegador', url: 'https://www.pegador.com', cur: 'EUR', pages: 5 },
  { id: 'represent', name: 'Represent', url: 'https://representclo.com', cur: 'GBP', pages: 4 }
];
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36';
let outfitStatus = { last: null, error: null, stores: {} };
const pick = a => a[Math.floor(Math.random() * a.length)];
const shuffle = a => { const x = [...a]; for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };
async function getJSON(url) {
  const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 20000);
  try { const r = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': UA, Accept: 'application/json' } }); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); }
  finally { clearTimeout(to); }
}
const WOMEN = /\b(women|womens|wmns|damen|female|ladies|girls|kids|kinder|junior|bra|corset|skirt|dress|leggings|bikini)\b|\| women/i;
const COLORS = [['red', /\b(red|rot|rote[nrs]?|burgundy|bordeaux|cherry|crimson|maroon|scarlet|ruby|wine|varsity red|university red|fire red)\b/i],
  ['white', /\b(white|weiß|weiss|off[- ]?white|cream|ivory|chalk|sail|summit white|cloud white)\b/i],
  ['black', /\b(black|schwarz|jet black|washed black|onyx|anthracite|core black|triple black|tnf black)\b/i]];
const BAD_COLOR = /\b(blue|navy|green|olive|khaki|beige|brown|tan|pink|purple|lilac|yellow|orange|grey|gray|grau|silver|gold|camo|denim blue|indigo|teal|mint|sand|stone|taupe|mocha|espresso|light wash|mid wash|blau|grün|braun|rosa)\b/i;
function colorsOf(t) { return COLORS.filter(([, re]) => re.test(t)).map(([c]) => c); }
function slotOf(p) {
  const t = `${p.title} ${p.product_type} ${(p.tags || []).join(' ')}`;
  if (WOMEN.test(t)) return null;
  const title = p.title;
  if (/sneaker|shoe|schuh|footwear|trainer|runner|dunk|jordan|air force|samba|gazelle|campus|new balance|asics|vans|converse/i.test(`${p.product_type} ${title}`) && !/sock|lace|cleaner|bag|shirt|hoodie|cap/i.test(title)) return 'shoes';
  if (/\b(baggy|wide|loose|relaxed|parachute|balloon|carpenter|double knee|skate pant)\b/i.test(title) && /pant|jean|denim|trouser|cargo|sweatpant|jogger|bottom|hose/i.test(t) && !/short/i.test(title)) return 'pants';
  if (/\b(slim|fitted|muscle|rib|ribbed|ripp|tank|compression|tight|baby tee|athletic fit)\b/i.test(title) && /tee|t-shirt|shirt|top|longsleeve|long sleeve|tank|polo|knit|sweater/i.test(t) && !/oversized|hoodie|short/i.test(title)) return 'top';
  if (/\b(t-shirt|tee|longsleeve|long sleeve|l\/s tee|tank top|henley)\b/i.test(title) && !/oversized|boxy|heavy|hoodie|short|sweat/i.test(title)) return 'top2';
  if (/jacket|bomber|varsity|leather|coach|puffer|vest|weste|jacke|overshirt|windbreaker|track top/i.test(title) && !/vest top/i.test(title)) return 'outer';
  if (/beanie|cap\b|chain|necklace|crossbody|shoulder bag|belt|gürtel|bandana/i.test(title)) return 'acc';
  return null;
}
async function loadCatalog() {
  const items = []; outfitStatus.stores = {};
  await Promise.all(STORES.map(async st => {
    let n = 0;
    try {
      for (let pg = 1; pg <= st.pages; pg++) {
        const j = await getJSON(`${st.url}/products.json?limit=250&page=${pg}`); const ps = j.products || []; if (!ps.length) break;
        for (const p of ps) {
          const slot = slotOf(p); if (!slot) continue;
          const t = `${p.title} ${(p.options || []).map(o => (o.values || []).join(' ')).join(' ')}`;
          const cols = colorsOf(p.title); if (!cols.length || BAD_COLOR.test(p.title)) continue;
          const v = (p.variants || []).filter(x => x.available); if (!v.length || !p.images || !p.images[0]) continue;
          items.push({ store: st.id, storeName: st.name, slot, colors: cols, title: p.title, type: p.product_type || '', vendor: p.vendor || '',
            url: `${st.url}/products/${p.handle}`, img: p.images[0].src.replace(/^http:/, 'https:'), price: Math.min(...v.map(x => +x.price || 0)), cur: st.cur,
            sizes: [...new Set(v.map(x => x.option1).filter(Boolean))].slice(0, 12) });
          n++;
        }
      }
      outfitStatus.stores[st.id] = { ok: true, items: n };
    } catch (e) { outfitStatus.stores[st.id] = { ok: false, error: e.message, items: n }; }
  }));
  return items;
}
const SLOT_DE = { top: 'Oberteil (slim)', top2: 'Oberteil', outer: 'Jacke', pants: 'Hose (baggy)', shoes: 'Schuhe', acc: 'Accessoire' };
const NAMES = { bw: ['Mono Noir', 'Ink & Chalk', 'Contrast Mode', 'Paper & Coal', 'Night Shift', 'Static'], br: ['Red Signal', 'Night Ember', 'Black Cherry', 'Redline', 'Crimson Shift', 'Heat Map'] };
function assemble(cat, pal, used) {
  const okCol = it => pal === 'bw' ? it.colors.every(c => c !== 'red') : it.colors.some(c => c === 'red' || c === 'black');
  const pool = slot => shuffle(cat.filter(it => it.slot === slot && !used.has(it.url) && okCol(it)));
  for (let tries = 0; tries < 60; tries++) {
    const top = pool('top')[0] || pool('top2')[0], pants = pool('pants')[0], shoes = pool('shoes')[0];
    if (!top || !pants || !shoes) return null;
    const pieces = [top];
    const outer = Math.random() < .45 ? pool('outer')[0] : null; if (outer) pieces.push(outer);
    pieces.push(pants, shoes);
    const acc = Math.random() < .5 ? pool('acc')[0] : null; if (acc) pieces.push(acc);
    const reds = pieces.filter(p => p.colors.includes('red')).length;
    const whites = pieces.filter(p => p.colors.includes('white')).length;
    if (pal === 'br' && (reds < 1 || reds > 2)) continue;
    if (pal === 'bw' && whites < 1 && Math.random() < .7) continue; // meist echter Kontrast
    pieces.forEach(p => used.add(p.url));
    return pieces;
  }
  return null;
}
let outfitBuild = null;
function buildOutfits(force) {
  if (outfitBuild) return outfitBuild;
  outfitBuild = (async () => {
    const week = isoWeek(new Date()), dir = path.join(OUT_DIR, week);
    const cur = readJSON(path.join(dir, 'week.json'), null);
    if (!force && cur && cur.v === 2 && (cur.outfits.length >= 6 || Date.now() - Date.parse(cur.created) < 25 * 60e3)) return;
    const cat = await loadCatalog();
    const used = new Set(), names = new Set(), outfits = [];
    for (const pal of shuffle(['bw', 'bw', 'bw', 'br', 'br', 'br'])) {
      const pieces = assemble(cat, pal, used); if (!pieces) continue;
      const name = shuffle(NAMES[pal]).find(n => !names.has(n)); names.add(name);
      outfits.push({ id: crypto.randomBytes(5).toString('hex'), name, palette: pal,
        pieces: pieces.map(p => ({ slot: p.slot, kind: SLOT_DE[p.slot], title: p.title, vendor: p.vendor, store: p.storeName, url: p.url, img: p.img, price: p.price, cur: p.cur, sizes: p.sizes, colors: p.colors })) });
    }
    outfitStatus = { ...outfitStatus, last: new Date().toISOString(), error: outfits.length ? null : 'Keine passenden Produkte gefunden (Internet im Container?)', catalog: cat.length,
      bySlot: cat.reduce((o, i) => (o[i.slot] = (o[i.slot] || 0) + 1, o), {}) };
    fs.mkdirSync(dir, { recursive: true });
    writeJSON(path.join(dir, 'week.json'), { v: 2, week, created: new Date().toISOString(), outfits });
    for (const f of fs.readdirSync(OUT_DIR)) if (f !== week) fs.rmSync(path.join(OUT_DIR, f), { recursive: true, force: true }); // alte Wochen weg
    for (const f of fs.readdirSync(dir)) if (f !== 'week.json') fs.rmSync(path.join(dir, f), { force: true });                  // keine Altdateien
    console.log('Outfits', week, ':', outfits.length, 'Looks aus', cat.length, 'Produkten');
  })().catch(e => { outfitStatus.error = e.message; console.error('Outfits:', e.message); }).finally(() => { outfitBuild = null; });
  return outfitBuild;
}
setInterval(() => buildOutfits(false), 30 * 60e3); setTimeout(() => buildOutfits(false), 8000);


// ---------- Technik: Einstellungen, Pi-hole, Dienste-Monitor, System ----------
const SETTINGS = path.join(DATA, 'settings.json');
const settings = () => readJSON(SETTINGS, {});
const saveSettings = st => writeJSON(SETTINGS, st);
// HTTP(S)-Anfrage mit optional ungeprüftem Zertifikat (Pi-hole/Router nutzen oft selbst signierte)
function req(url, { method = 'GET', headers = {}, body = null, timeout = 8000, insecure = true } = {}) {
  return new Promise((ok, no) => {
    let u; try { u = new URL(url); } catch { return no(new Error('Ungültige Adresse')); }
    const mod = u.protocol === 'https:' ? https : http; const t0 = Date.now();
    const r = mod.request(u, { method, headers: { 'User-Agent': 'Werkbank/1.0', ...headers }, rejectUnauthorized: !insecure, timeout }, res => {
      const ch = []; let size = 0;
      res.on('data', c => { size += c.length; if (size < 3e6) ch.push(c); });
      res.on('end', () => ok({ status: res.statusCode, ms: Date.now() - t0, text: Buffer.concat(ch).toString('utf8'), headers: res.headers }));
    });
    r.on('timeout', () => r.destroy(new Error('Zeitüberschreitung'))); r.on('error', no);
    if (body) r.write(body); r.end();
  });
}
// --- Pi-hole (v6 mit Sitzung, v5 mit API-Token) ---
let phCache = { t: 0, data: null }, phSid = null;
async function piholeStatus(force) {
  const c = settings().pihole; if (!c || !c.url) return { configured: false };
  if (!force && phCache.data && Date.now() - phCache.t < 30000) return phCache.data;
  const base = c.url.replace(/\/+$/, '').replace(/\/admin$/, '');
  let out;
  try {
    const v6 = async (pth) => {
      const get = () => req(`${base}/api${pth}`, { headers: phSid ? { 'X-FTL-SID': phSid } : {} });
      let r = await get();
      if (r.status === 401) {
        const a = await req(`${base}/api/auth`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: c.password || '' }) });
        const j = JSON.parse(a.text || '{}'); if (!j.session || !j.session.valid) throw new Error('Pi-hole: Passwort falsch'); phSid = j.session.sid; r = await get();
      }
      if (r.status !== 200) throw new Error('Pi-hole antwortet mit ' + r.status); return JSON.parse(r.text);
    };
    let v = 6, sum, msgs = [], blocking, ver = null;
    try { sum = await v6('/stats/summary'); }
    catch (e) { if (/Passwort/.test(e.message)) throw e; v = 5; }
    if (v === 6) {
      try { msgs = ((await v6('/info/messages')).messages || []).map(m => ({ id: m.id, type: m.type, text: m.plain || m.html || '', time: m.timestamp ? new Date(m.timestamp * 1000).toISOString() : null })); } catch {}
      try { blocking = (await v6('/dns/blocking')).blocking; } catch {}
      try { const vv = await v6('/info/version'); ver = vv.version && vv.version.core && vv.version.core.local ? vv.version.core.local.version : null; } catch {}
      out = { configured: true, ok: true, version: 6, ver, blocking, total: sum.queries.total, blocked: sum.queries.blocked, percent: sum.queries.percent_blocked,
        domains: sum.gravity.domains_being_blocked, gravityUpdated: sum.gravity.last_update ? new Date(sum.gravity.last_update * 1000).toISOString() : null, clients: sum.clients.active, messages: msgs };
    } else {
      const r = await req(`${base}/admin/api.php?summaryRaw&auth=${encodeURIComponent(c.password || '')}`); const j = JSON.parse(r.text || '{}');
      if (!j.dns_queries_today && j.dns_queries_today !== 0) throw new Error('Pi-hole nicht erkannt (Adresse oder API-Token prüfen)');
      out = { configured: true, ok: true, version: 5, blocking: j.status, total: j.dns_queries_today, blocked: j.ads_blocked_today, percent: +j.ads_percentage_today,
        domains: j.domains_being_blocked, gravityUpdated: j.gravity_last_updated && j.gravity_last_updated.absolute ? new Date(j.gravity_last_updated.absolute * 1000).toISOString() : null, clients: j.unique_clients, messages: [] };
    }
    const age = out.gravityUpdated ? (Date.now() - Date.parse(out.gravityUpdated)) / 864e5 : null;
    out.warnings = [...out.messages.map(m => m.text), ...(out.blocking && out.blocking !== 'enabled' ? ['Werbeblocker ist ausgeschaltet'] : []), ...(age > 14 ? [`Blocklisten seit ${Math.floor(age)} Tagen nicht aktualisiert`] : [])];
  } catch (e) { out = { configured: true, ok: false, error: e.message, warnings: ['Pi-hole nicht erreichbar: ' + e.message] }; }
  out.url = base; phCache = { t: Date.now(), data: out }; return out;
}
async function piholeBlocking(enable, seconds) {
  const c = settings().pihole; const base = c.url.replace(/\/+$/, '').replace(/\/admin$/, '');
  if (!phSid) await piholeStatus(true);
  const r = await req(`${base}/api/dns/blocking`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(phSid ? { 'X-FTL-SID': phSid } : {}) }, body: JSON.stringify({ blocking: enable, timer: seconds || null }) });
  if (r.status !== 200) throw new Error('Umschalten nicht möglich (nur Pi-hole v6)'); phCache.t = 0; return JSON.parse(r.text);
}
// --- Dienste-Monitor ---
const MON_STATE = path.join(DATA, 'monitor-state.json');
let monState = readJSON(MON_STATE, {});
const monTargets = () => (settings().monitor || {}).targets || [];
function tcpCheck(host, port, timeout = 5000) { return new Promise(ok => { const t0 = Date.now(); const s = net.connect({ host, port, timeout });
  s.on('connect', () => { s.destroy(); ok({ up: true, ms: Date.now() - t0 }); }); s.on('timeout', () => { s.destroy(); ok({ up: false, error: 'Zeitüberschreitung' }); }); s.on('error', e => ok({ up: false, error: e.code || e.message })); }); }
function tlsCheck(host, port = 443) { return new Promise(ok => { const t0 = Date.now(); const s = tls.connect({ host, port, servername: host, rejectUnauthorized: false, timeout: 6000 }, () => {
  const c = s.getPeerCertificate(); s.end(); const days = c && c.valid_to ? Math.floor((Date.parse(c.valid_to) - Date.now()) / 864e5) : null;
  ok({ up: true, ms: Date.now() - t0, days, issuer: c && c.issuer ? (c.issuer.O || c.issuer.CN) : '', authorized: s.authorized }); });
  s.on('timeout', () => { s.destroy(); ok({ up: false, error: 'Zeitüberschreitung' }); }); s.on('error', e => ok({ up: false, error: e.code || e.message })); }); }
async function checkTarget(t) {
  try {
    if (t.type === 'http') { const r = await req(t.target, { timeout: 8000 }); return { up: r.status < 400 || r.status === 401 || r.status === 403, ms: r.ms, code: r.status }; }
    const [host, port] = t.target.split(':');
    if (t.type === 'tcp') return await tcpCheck(host, +port || 80);
    if (t.type === 'tls') { const r = await tlsCheck(host, +port || 443); if (r.up && r.days != null && r.days < (t.warnDays || 14)) r.warn = `Zertifikat läuft in ${r.days} Tagen ab`; return r; }
  } catch (e) { return { up: false, error: e.message }; }
  return { up: false, error: 'Unbekannter Typ' };
}
let monRunning = false;
async function runMonitor() {
  if (monRunning) return; monRunning = true;
  try {
    const ts = monTargets(), now = Date.now();
    await Promise.all(ts.map(async t => { const r = await checkTarget(t); const st = monState[t.id] || { hist: [], since: now, up: null };
      if (st.up !== r.up) st.since = now; Object.assign(st, { up: r.up, ms: r.ms, error: r.error || null, code: r.code, days: r.days, warn: r.warn || null, issuer: r.issuer, last: now });
      st.hist.push(r.up ? (r.ms || 1) : -1); st.hist = st.hist.slice(-90); monState[t.id] = st; }));
    for (const k of Object.keys(monState)) if (!ts.some(t => t.id === k)) delete monState[k];
    writeJSON(MON_STATE, monState);
  } finally { monRunning = false; }
}
setInterval(runMonitor, 60e3); setTimeout(runMonitor, 5000);
// --- System ---
function dirSize(d) { let n = 0; try { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); n += f.isDirectory() ? dirSize(p) : fs.statSync(p).size; } } catch {} return n; }
let cpuPrev = os.cpus();
function cpuPct() { const cur = os.cpus(); let idle = 0, tot = 0; cur.forEach((c, i) => { const p = cpuPrev[i] || c; for (const k in c.times) tot += c.times[k] - p.times[k]; idle += c.times.idle - p.times.idle; }); cpuPrev = cur; return tot ? Math.round((1 - idle / tot) * 100) : 0; }
const sysHist = []; setInterval(() => { sysHist.push({ t: Date.now(), cpu: cpuPct(), mem: Math.round((1 - os.freemem() / os.totalmem()) * 100) }); if (sysHist.length > 120) sysHist.shift(); }, 30e3);
function systemInfo() {
  let disk = null; try { const st = fs.statfsSync(DATA); disk = { total: st.blocks * st.bsize, free: st.bavail * st.bsize }; } catch {}
  const mem = { total: os.totalmem(), free: os.freemem() };
  const warnings = [];
  if (disk && disk.free / disk.total < .1) warnings.push('Speicherplatz fast voll');
  if (mem.free / mem.total < .08) warnings.push('Arbeitsspeicher fast voll');
  return { host: os.hostname(), platform: `${os.type()} ${os.release()}`, cpus: os.cpus().length, cpuModel: (os.cpus()[0] || {}).model, load: os.loadavg(),
    uptime: os.uptime(), appUptime: process.uptime(), node: process.version, mem, disk, dataSize: dirSize(DATA), users: users.length,
    sessions: Object.keys(sessions).length, hist: sysHist, warnings, started: new Date(Date.now() - process.uptime() * 1000).toISOString() };
}

// ---------- Messenger ----------
const streams = new Map(); // uid -> Set({res, key})
const convFile = (a, b) => path.join(DATA, 'msg/conv', [a, b].sort().join('__') + '.json');
function push(uid, ev) { for (const c of streams.get(uid) || []) c.res.write(`data: ${JSON.stringify(ev)}\n\n`); }
function pushAll(ev) { for (const uid of streams.keys()) push(uid, ev); }
function closeStreams(key) { jf?.cutSession(key); for (const [uid, set] of streams) for (const c of set) if (c.key === key) { c.res.end(); set.delete(c); presence(uid); } }
setInterval(() => { for (const set of streams.values()) for (const c of set) c.res.write(': ping\n\n'); }, 25000);
const b64ok = (s, max) => typeof s === 'string' && s.length <= max && /^[A-Za-z0-9+/=]*$/.test(s);

// ---------- Router ----------
const routes = [];
const on = (method, re, fn, opt = {}) => routes.push({ method, re, fn, ...opt });

on('GET', /^\/api\/health$/, (q, res) => { const ss = getSession(q.req, res);
  send(res, 200, ss && ss.u.admin && !locked(ss.u) ? { ok: true, outfits: { last: outfitStatus.last, error: outfitStatus.error, catalog: outfitStatus.catalog, bySlot: outfitStatus.bySlot, stores: outfitStatus.stores } } : { ok: true }); }, { open: true });
on('GET', /^\/api\/auth\/state$/, (q, res) => send(res, 200, { setup: users.length === 0, owner: users.length ? undefined : OWNER }), { open: true });

on('POST', /^\/api\/auth\/setup$/, async (q, res) => {
  if (users.length) return err(res, 403, 'Bereits eingerichtet');
  // Ersteinrichtung nur aus dem eigenen Netz, nie aus dem Internet
  if (viaProxy(q.req) || (!isPrivateIp(ipOf(q.req)) && process.env.WB_ALLOW_REMOTE_SETUP !== '1')) { log('setup-blockiert', OWNER, ipOf(q.req)); loginLog(q.req, OWNER, 'setup-blockiert'); return err(res, 403, 'Die Ersteinrichtung geht nur aus dem eigenen Netz'); }
  const b = await json(q.req); const pe = pwPolicy(b.pass, OWNER); if (pe) return err(res, 400, pe);
  const u = { id: crypto.randomBytes(8).toString('hex'), name: OWNER, hash: await hashPw(b.pass), admin: true, owner: true, apps: [...APPS], active: true, mustChange: false, sessionHours: 0, created: new Date().toISOString() };
  users.push(u); rememberDevice(res, q.req, u); saveUsers(); log('setup', u.name, ipOf(q.req)); loginLog(q.req, u.name, 'setup'); newSession(res, q.req, u); send(res, 200, { ok: true });
}, { open: true });

on('POST', /^\/api\/auth\/login$/, async (q, res) => {
  const b = await json(q.req); const name = String(b.name || '').trim().toLowerCase().slice(0, 40); const ip = ipOf(q.req);
  const u = users.find(x => x.name === name); const known = devOk(q.req, u);
  const lk = lockLeft(['ipacct:' + name + '|' + ip, 'ip:' + ip, ...(known ? [] : ['acct:' + name])]);
  if (lk) { await slow(); log('login-gesperrt', name, ip); loginLog(q.req, name, 'gesperrt'); return err(res, 429, `Zu viele Fehlversuche. Bitte in ${lk} Min. erneut versuchen.`); }
  const ok = await checkPw(String(b.pass || ''), u && u.hash);
  const failNow = async (msg, ev) => { recordFail('ipacct', name + '|' + ip); recordFail('acct', name); recordFail('ip', ip); log(ev, name, ip); loginLog(q.req, name, ev === '2fa-fehler' ? 'code-falsch' : 'passwort', u ? {} : { unbekannt: true }); await slow(); return err(res, 401, msg); };
  if (!u || !ok) return failNow('Name oder Passwort falsch', 'login-fehler');
  if (!u.active) { log('login-deaktiviert', name, ip); loginLog(q.req, name, 'deaktiviert'); return err(res, 403, 'Dieser Zugang ist deaktiviert'); }
  if (expired(u)) { log('login-abgelaufen', name, ip); loginLog(q.req, name, 'abgelaufen'); return err(res, 403, 'Dieser Zugang ist abgelaufen'); }
  if (u.totp && u.totp.enabled) { if (!b.code) { loginLog(q.req, name, 'code-nötig'); return send(res, 200, { need2fa: true }); } if (!secondFactor(u, b.code)) return failNow('Code falsch', '2fa-fehler'); }
  clearFails('ipacct:' + name + '|' + ip); if (!known) log('login-neues-gerät', name, ip, String(q.req.headers['user-agent'] || '').slice(0, 80));
  u.lastLogin = new Date().toISOString(); rememberDevice(res, q.req, u); saveUsers(); log('login', name, ip); loginLog(q.req, name, 'ok', known ? {} : { neu: true });
  newSession(res, q.req, u); send(res, 200, { ok: true, mustChange: !!u.mustChange, setup2fa: setup2fa(u), recoveryLeft: u.totp && u.totp.enabled ? (u.recovery || []).length : null });
}, { open: true });

// Passwort vergessen: nur mit zweitem Faktor (Authenticator-Code oder Wiederherstellungscode)
on('POST', /^\/api\/auth\/reset$/, async (q, res) => {
  const b = await json(q.req); const name = String(b.name || '').trim().toLowerCase().slice(0, 40); const ip = ipOf(q.req);
  const lk = lockLeft(['reset:' + name, 'reset:' + ip, 'ip:' + ip]); if (lk) { await slow(); loginLog(q.req, name, 'gesperrt'); return err(res, 429, `Zu viele Versuche. Bitte in ${lk} Min. erneut versuchen.`); }
  const u = users.find(x => x.name === name);
  if (!u || !u.active || expired(u) || !(u.totp && u.totp.enabled) || !secondFactor(u, b.code)) {
    recordFail('reset', name); recordFail('reset', ip); recordFail('ip', ip); log('reset-fehler', name, ip); loginLog(q.req, name, 'reset-fehler'); await slow();
    return err(res, 401, 'Das hat nicht geklappt. Zurücksetzen geht nur mit eingerichteter Zwei-Faktor-Anmeldung, sonst frag den Admin.'); }
  const pe = pwPolicy(b.pass, name); if (pe) { saveUsers(); return err(res, 400, pe); }
  u.hash = await hashPw(b.pass); u.mustChange = false; saveUsers(); killSessions(u.id);
  fs.rmSync(path.join(DATA, 'msg/keys', u.id + '.json'), { force: true }); pushAll({ type: 'keys' });
  clearFails('reset:' + name, 'acct:' + name, 'ipacct:' + name + '|' + ip); log('passwort-selbst-zurückgesetzt', name, ip); loginLog(q.req, name, 'reset-ok');
  send(res, 200, { ok: true, recoveryLeft: (u.recovery || []).length });
}, { open: true });

on('POST', /^\/api\/auth\/logout$/, (q, res) => { delete sessions[q.sess.key]; saveSessions(); closeStreams(q.sess.key); log('logout', q.u.name, ipOf(q.req)); setCookie(res, q.req, '', 0); send(res, 200, { ok: true }); }, { anyState: true });
on('POST', /^\/api\/auth\/logout-all$/, (q, res) => { killSessions(q.u.id); q.u.devices = []; saveUsers(); log('logout-überall', q.u.name, ipOf(q.req)); setCookie(res, q.req, '', 0); send(res, 200, { ok: true }); }, { anyState: true });
on('GET', /^\/api\/auth\/me$/, (q, res) => send(res, 200, { user: { ...pub(q.u), recoveryLeft: q.u.totp && q.u.totp.enabled ? (q.u.recovery || []).length : null } }), { anyState: true });
const reauth = async (q, res, pass) => { const k = q.u.name + '|' + ipOf(q.req);
  if (lockLeft(['ipacct:' + k, 'acct:' + q.u.name])) { await slow(); err(res, 429, 'Zu viele Fehlversuche'); return false; }
  if (!await checkPw(String(pass || ''), q.u.hash)) { recordFail('ipacct', k); recordFail('acct', q.u.name); await slow(); err(res, 401, 'Passwort falsch'); return false; } return true; };
on('POST', /^\/api\/auth\/name$/, async (q, res) => { const b = await json(q.req);
  if (b.skip) { q.u.nameAsked = true; saveUsers(); return send(res, 200, { ok: true }); }
  const n = String(b.display ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim();
  if (n && !/^(?=.{2,32}$)[A-Za-z0-9À-ÖØ-öø-ſ][A-Za-z0-9À-ÖØ-öø-ſ ._'-]*$/.test(n)) return err(res, 400, 'Name: 2–32 Zeichen, Buchstaben, Ziffern, Leerzeichen, Punkt, Bindestrich, Apostroph');
  if (n && (nameTaken(n, q.u) || (['admin', 'owner', 'system', 'werkbank'].includes(foldName(n)) && foldName(n) !== foldName(q.u.name)))) return err(res, 400, 'Dieser Name ist schon vergeben');
  const before = shownName(q.u); if (n && n !== q.u.name) q.u.display = n; else delete q.u.display; q.u.nameAsked = true; saveUsers();
  if (before !== shownName(q.u)) { pushAll({ type: 'keys' }); log('name-geändert', q.u.name, ipOf(q.req), `${before} → ${shownName(q.u)}`); }
  send(res, 200, { ok: true, display: q.u.display || '', shown: shownName(q.u) }); }, { anyState: true });
on('POST', /^\/api\/auth\/verify$/, async (q, res) => { const b = await json(q.req); if (await reauth(q, res, b.pass)) send(res, 200, { ok: true }); }, { anyState: true });
on('POST', /^\/api\/auth\/password$/, async (q, res) => {
  const b = await json(q.req); if (!await reauth(q, res, b.old)) return;
  const pe = pwPolicy(b.pass, q.u.name); if (pe) return err(res, 400, pe); if (b.pass === b.old) return err(res, 400, 'Neues Passwort muss anders sein');
  q.u.hash = await hashPw(b.pass); q.u.mustChange = false; saveUsers();
  const kf = path.join(DATA, 'msg/keys', q.u.id + '.json');
  if (b.vault && fs.existsSync(kf)) { const rec = readJSON(kf, null); if (rec && b64ok(b.vault.ct, 20000)) { rec.blob = b.vault; writeJSON(kf, rec); } }
  killSessions(q.u.id, q.sess.key); log('passwort-geändert', q.u.name, ipOf(q.req)); send(res, 200, { ok: true });
}, { anyState: true });
on('GET', /^\/api\/auth\/sessions$/, (q, res) => send(res, 200, Object.entries(sessions).filter(([, s]) => s.uid === q.u.id).map(([k, s]) => ({ id: s.id, created: s.created, last: s.last, ip: s.ip, ua: s.ua, current: k === q.sess.key }))), { anyState: true });
on('DELETE', /^\/api\/auth\/sessions\/([a-f0-9]+)$/, (q, res, m) => { for (const [k, s] of Object.entries(sessions)) if (s.uid === q.u.id && s.id === m[1]) { delete sessions[k]; closeStreams(k); } saveSessions(); send(res, 200, { ok: true }); }, { anyState: true });
on('POST', /^\/api\/auth\/totp\/begin$/, async (q, res) => { const b = await json(q.req); if (q.u.totp && q.u.totp.enabled) return err(res, 400, '2FA ist schon aktiv');
  if (!await reauth(q, res, b.pass)) return;
  const secret = b32enc(crypto.randomBytes(20)); q.u.totp = { secret, enabled: false }; saveUsers();
  send(res, 200, { secret, uri: `otpauth://totp/Werkbank:${encodeURIComponent(q.u.name)}?secret=${secret}&issuer=Werkbank&digits=6&period=30` }); }, { anyState: true });
on('POST', /^\/api\/auth\/totp\/enable$/, async (q, res) => { const b = await json(q.req); if (!q.u.totp || q.u.totp.enabled || !totpUse(q.u, b.code)) { recordFail('ipacct', q.u.name + '|' + ipOf(q.req)); return err(res, 400, 'Code passt nicht, Uhrzeit am Handy prüfen'); }
  q.u.totp.enabled = true; const codes = newRecovery(q.u); saveUsers(); log('2fa-aktiviert', q.u.name, ipOf(q.req)); send(res, 200, { ok: true, recovery: codes }); }, { anyState: true });
on('POST', /^\/api\/auth\/totp\/disable$/, async (q, res) => { const b = await json(q.req); if (needs2fa(q.u)) return err(res, 403, 'Zwei-Faktor ist für dein Konto Pflicht'); if (!await reauth(q, res, b.pass)) return;
  if (!q.u.totp || !secondFactor(q.u, b.code)) { recordFail('ipacct', q.u.name + '|' + ipOf(q.req)); return err(res, 400, 'Code falsch'); }
  q.u.totp = null; q.u.recovery = []; saveUsers(); log('2fa-deaktiviert', q.u.name, ipOf(q.req)); send(res, 200, { ok: true }); }, { anyState: true });
on('POST', /^\/api\/auth\/recovery$/, async (q, res) => { const b = await json(q.req); if (!q.u.totp || !q.u.totp.enabled) return err(res, 400, '2FA ist nicht aktiv');
  if (!totpUse(q.u, b.code)) { recordFail('ipacct', q.u.name + '|' + ipOf(q.req)); return err(res, 400, 'Code falsch'); }
  const codes = newRecovery(q.u); saveUsers(); log('wiederherstellungscodes-neu', q.u.name, ipOf(q.req)); send(res, 200, { recovery: codes }); }, { anyState: true });

// Admin
const adminOnly = { admin: true };
const sanitize = (b, actor, target) => {
  const o = {};
  if (b.apps !== undefined) o.apps = (Array.isArray(b.apps) ? b.apps : []).filter(a => APPS.includes(a));
  if (b.admin !== undefined) { if (!actor.owner) throw new Error('Nur der Owner vergibt Admin-Rechte'); o.admin = !!b.admin; }
  if (b.active !== undefined) o.active = !!b.active;
  if (b.mustChange !== undefined) o.mustChange = !!b.mustChange;
  if (b.require2fa !== undefined) o.require2fa = !!b.require2fa;
  if (b.cockpit !== undefined) o.cockpit = !!b.cockpit;
  if (b.display === '' && target) o.display = ''; // Admins können einen selbst gewählten Namen nur entfernen
  if (b.expires !== undefined) o.expires = /^\d{4}-\d{2}-\d{2}$/.test(b.expires || '') ? b.expires : null;
  if (b.sessionHours !== undefined) o.sessionHours = b.sessionHours === 0 ? 0 : Math.min(720, Math.max(1, +b.sessionHours || 12));
  if (b.note !== undefined) o.note = String(b.note).slice(0, 300);
  if (target && target.owner) { delete o.admin; delete o.active; delete o.apps; delete o.expires; delete o.cockpit; }
  return o;
};
on('GET', /^\/api\/admin\/users$/, (q, res) => send(res, 200, { apps: APPS, users: users.map(u => ({ ...pub(u), sessions: Object.values(sessions).filter(s => s.uid === u.id).length, msgKey: fs.existsSync(path.join(DATA, 'msg/keys', u.id + '.json')) })) }), adminOnly);
on('POST', /^\/api\/admin\/users$/, async (q, res) => {
  const b = await json(q.req); const name = String(b.name || '').trim().toLowerCase();
  if (!/^[a-z0-9._-]{2,32}$/.test(name)) return err(res, 400, 'Name: 2–32 Zeichen, nur a–z, 0–9, Punkt, Bindestrich, Unterstrich');
  if (nameTaken(name)) return err(res, 400, 'Name ist schon vergeben');
  const pe = pwPolicy(b.pass); if (pe) return err(res, 400, pe);
  let o; try { o = sanitize({ apps: [], active: true, mustChange: true, sessionHours: 0, ...b }, q.u); } catch (e) { return err(res, 403, e.message); }
  const u = { id: crypto.randomBytes(8).toString('hex'), name, hash: await hashPw(b.pass), admin: false, owner: false, created: new Date().toISOString(), ...o };
  users.push(u); saveUsers(); log('nutzer-angelegt', q.u.name, ipOf(q.req), name); send(res, 200, pub(u));
}, adminOnly);
on('PUT', /^\/api\/admin\/users\/([a-f0-9]+)$/, async (q, res, m) => {
  const t = findUser(m[1]); if (!t) return err(res, 404, 'Nicht gefunden');
  if (t.admin && !q.u.owner && t.id !== q.u.id) return err(res, 403, 'Nur der Owner bearbeitet Admins');
  const b = await json(q.req); let o; try { o = sanitize(b, q.u, t); } catch (e) { return err(res, 403, e.message); }
  if (t.id === q.u.id) { delete o.admin; delete o.active; }
  Object.assign(t, o);
  if (b.pass) { const pe = pwPolicy(b.pass); if (pe) return err(res, 400, pe); t.hash = await hashPw(b.pass); t.mustChange = b.mustChange !== undefined ? !!b.mustChange : true;
    fs.rmSync(path.join(DATA, 'msg/keys', t.id + '.json'), { force: true }); pushAll({ type: 'keys' }); killSessions(t.id); log('passwort-zurückgesetzt', q.u.name, ipOf(q.req), t.name); }
  if (!t.active || expired(t)) killSessions(t.id);
  // Live-Verbindungen kappen, sobald etwas nicht mehr erlaubt ist
  if (setup2fa(t) || !canApp(t, 'messenger')) for (const [k, s] of Object.entries(sessions)) if (s.uid === t.id) closeStreams(k);
  if (setup2fa(t) || !canApp(t, 'jellyfin')) jf.cutUser(t.id);
  if (b.display === '') pushAll({ type: 'keys' });
  saveUsers(); log('nutzer-geändert', q.u.name, ipOf(q.req), t.name); send(res, 200, pub(t));
}, adminOnly);
on('DELETE', /^\/api\/admin\/users\/([a-f0-9]+)$/, async (q, res, m) => {
  const t = findUser(m[1]); if (!t) return err(res, 404, 'Nicht gefunden'); if (t.owner) return err(res, 403, 'Der Owner kann nicht gelöscht werden');
  if (t.id === q.u.id) return err(res, 403, 'Du kannst dich nicht selbst löschen'); if (t.admin && !q.u.owner) return err(res, 403, 'Nur der Owner löscht Admins');
  await jf.forget(t.id); killSessions(t.id); users = users.filter(u => u !== t); saveUsers(); dropFiles(f => f.from === t.id || f.to === t.id);
  fs.rmSync(userDir(t.id), { recursive: true, force: true }); fs.rmSync(path.join(DATA, 'msg/keys', t.id + '.json'), { force: true });
  for (const f of fs.readdirSync(path.join(DATA, 'msg/conv'))) if (f.includes(t.id)) fs.rmSync(path.join(DATA, 'msg/conv', f), { force: true });
  pushAll({ type: 'keys' }); log('nutzer-gelöscht', q.u.name, ipOf(q.req), t.name); send(res, 200, { ok: true });
}, adminOnly);
on('POST', /^\/api\/admin\/users\/([a-f0-9]+)\/logout$/, (q, res, m) => { const t = findUser(m[1]); if (!t) return err(res, 404, 'Nicht gefunden'); killSessions(t.id, t.id === q.u.id ? q.sess.key : undefined); log('admin-abgemeldet', q.u.name, ipOf(q.req), t.name); send(res, 200, { ok: true }); }, adminOnly);
on('POST', /^\/api\/admin\/users\/([a-f0-9]+)\/reset-2fa$/, (q, res, m) => { const t = findUser(m[1]); if (!t) return err(res, 404, 'Nicht gefunden'); if ((t.owner || t.admin) && !q.u.owner && t.id !== q.u.id) return err(res, 403, 'Nur der Owner setzt 2FA von Admins zurück'); t.totp = null; t.recovery = []; saveUsers(); for (const [k, s] of Object.entries(sessions)) if (s.uid === t.id) closeStreams(k); log('2fa-zurückgesetzt', q.u.name, ipOf(q.req), t.name); send(res, 200, { ok: true }); }, adminOnly);
on('GET', /^\/api\/admin\/audit$/, (q, res) => send(res, 200, audit.slice(-400).reverse()), adminOnly);

// Daten pro Nutzer
const keyApp = k => k === 'hub' || k === 'cockpit' ? true : APPS.includes(k) ? k : null;
on('GET', /^\/api\/data\/([a-z0-9_-]{1,40})$/, (q, res, m) => { const a = keyApp(m[1]); if (!a || (a !== true && !canApp(q.u, a))) return err(res, 403, 'Kein Zugriff');
  const f = path.join(userDir(q.u.id), m[1] + '.json'); send(res, 200, fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : 'null'); }); // noch nichts gespeichert ist kein Fehler
on('PUT', /^\/api\/data\/([a-z0-9_-]{1,40})$/, async (q, res, m) => { const a = keyApp(m[1]); if (!a || (a !== true && !canApp(q.u, a))) return err(res, 403, 'Kein Zugriff');
  const v = await json(q.req); writeJSON(path.join(userDir(q.u.id), m[1] + '.json'), v); send(res, 200, { ok: true }); });
on('GET', /^\/api\/backup$/, (q, res) => { const out = {}; const d = userDir(q.u.id); if (fs.existsSync(d)) for (const f of fs.readdirSync(d)) if (f.endsWith('.json')) out[f.slice(0, -5)] = readJSON(path.join(d, f), null);
  res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="werkbank-${q.u.name}.json"`, ...SEC }); res.end(JSON.stringify(out, null, 1)); });
on('POST', /^\/api\/backup$/, async (q, res) => { const o = await json(q.req); let n = 0; for (const [k, v] of Object.entries(o)) { const a = keyApp(k); if (a && (a === true || canApp(q.u, a))) { writeJSON(path.join(userDir(q.u.id), k + '.json'), v); n++; } } send(res, 200, { ok: true, restored: n }); });

// Wochenbericht
const wb = { app: 'wochenbericht' };
on('GET', /^\/api\/feed$/, async (q, res) => { let items;
  try { items = await fetchFeed(q.url.searchParams.get('url') || '', q.url.searchParams.get('name')); }
  catch (e) { return err(res, 400, /^(nur http|Interne)/.test(e.message) ? e.message : 'Feed nicht erreichbar, bitte die Adresse prüfen'); }
  send(res, 200, items); }, wb);
on('POST', /^\/api\/news\/build$/, async (q, res) => { const cfg = readJSON(path.join(userDir(q.u.id), 'wochenbericht.json'), { feeds: [] }); const r = await buildReport(cfg);
  writeJSON(path.join(userDir(q.u.id), 'reports', r.week + '.json'), r); send(res, 200, r); }, wb);
on('GET', /^\/api\/news\/reports$/, (q, res) => { const d = path.join(userDir(q.u.id), 'reports'); send(res, 200, fs.existsSync(d) ? fs.readdirSync(d).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5)).sort().reverse() : []); }, wb);
on('GET', /^\/api\/news\/reports\/(\d{4}-W\d{2})$/, (q, res, m) => { const f = path.join(userDir(q.u.id), 'reports', m[1] + '.json'); fs.existsSync(f) ? send(res, 200, fs.readFileSync(f, 'utf8')) : err(res, 404, 'nicht gefunden'); }, wb);



// Technik
on('GET', /^\/api\/pihole$/, async (q, res) => { const d = await piholeStatus(q.url.searchParams.has('frisch')); const c = settings().pihole || {};
  send(res, 200, { ...d, cfg: q.u.admin ? { url: c.url || '', hasPassword: !!c.password } : undefined }); }, { app: 'pihole' });
on('PUT', /^\/api\/pihole\/config$/, async (q, res) => { const b = await json(q.req); const st = settings(); const old = st.pihole || {};
  if (b.url && !/^https?:\/\//.test(b.url)) return err(res, 400, 'Adresse mit http:// oder https:// angeben');
  st.pihole = { url: String(b.url || '').trim(), password: b.password === undefined ? old.password : String(b.password) }; saveSettings(st); phSid = null; phCache.t = 0;
  log('pihole-einstellung', q.u.name, ipOf(q.req)); send(res, 200, await piholeStatus(true)); }, { app: 'pihole', admin: true });
on('POST', /^\/api\/pihole\/blocking$/, async (q, res) => { const b = await json(q.req); log('pihole-blocking', q.u.name, ipOf(q.req), String(b.enable)); send(res, 200, await piholeBlocking(!!b.enable, +b.seconds || 0)); }, { app: 'pihole', admin: true });
on('GET', /^\/api\/monitor$/, (q, res) => send(res, 200, { targets: monTargets(), state: monState }), { app: 'monitor' });
on('PUT', /^\/api\/monitor\/targets$/, async (q, res) => { const b = await json(q.req);
  const l = (Array.isArray(b.targets) ? b.targets : []).slice(0, 60).map(t => ({ id: typeof t.id === 'string' && /^[a-z0-9]{4,20}$/.test(t.id) ? t.id : crypto.randomBytes(5).toString('hex'), name: String(t.name || '').slice(0, 60),
    type: ['http', 'tcp', 'tls'].includes(t.type) ? t.type : 'http', target: String(t.target || '').trim().slice(0, 300), warnDays: Math.min(90, Math.max(1, +t.warnDays || 14)), group: String(t.group || '').slice(0, 40) }))
    .filter(t => t.target && (t.type !== 'http' || /^https?:\/\//.test(t.target)));
  const st = settings(); st.monitor = { targets: l }; saveSettings(st); log('monitor-geändert', q.u.name, ipOf(q.req)); runMonitor(); send(res, 200, { ok: true, targets: l }); }, { app: 'monitor', admin: true });
on('POST', /^\/api\/monitor\/check$/, async (q, res) => { await runMonitor(); send(res, 200, { targets: monTargets(), state: monState }); }, { app: 'monitor' });
on('GET', /^\/api\/system$/, (q, res) => send(res, 200, systemInfo()), { app: 'system' });

// Outfits
const of = { app: 'outfits' };
on('GET', /^\/api\/outfits$/, (q, res) => { const f = path.join(OUT_DIR, isoWeek(new Date()), 'week.json'); const w = readJSON(f, null);
  if (!w || w.v !== 2) { buildOutfits(false); return send(res, 202, { building: true }); }
  send(res, 200, { ...w, building: !!outfitBuild, status: outfitStatus }); }, of);
on('POST', /^\/api\/outfits\/refresh$/, async (q, res) => { buildOutfits(true); log('outfits-neu', q.u.name, ipOf(q.req)); send(res, 202, { building: true }); }, { app: 'outfits', admin: true });

// Küche: Rezepte aus dem Netz (TheMealDB, frei & ohne Schlüssel). Antworten werden einen Tag im Speicher gehalten.
const MEAL = process.env.WB_MEALDB_URL || 'https://www.themealdb.com/api/json/v1/1/';
const mealCache = new Map();
async function mealGet(qs) { const c = mealCache.get(qs); if (c && Date.now() - c.t < 864e5) return c.v;
  const v = await getJSON(MEAL + qs); mealCache.set(qs, { t: Date.now(), v }); if (mealCache.size > 500) mealCache.delete(mealCache.keys().next().value); return v; }
const DE_EN = { nudeln: 'pasta', spaghetti: 'spaghetti', reis: 'rice', kartoffeln: 'potatoes', kartoffel: 'potatoes', eier: 'eggs', ei: 'egg', tomaten: 'tomatoes', tomate: 'tomatoes', zwiebel: 'onion', zwiebeln: 'onion',
  knoblauch: 'garlic', paprika: 'red pepper', karotte: 'carrots', karotten: 'carrots', möhren: 'carrots', käse: 'cheese', milch: 'milk', butter: 'butter', sahne: 'double cream', mehl: 'flour', zucker: 'sugar',
  hähnchen: 'chicken', huhn: 'chicken', hackfleisch: 'minced beef', rind: 'beef', schwein: 'pork', lachs: 'salmon', thunfisch: 'tuna', garnelen: 'prawns', tofu: 'tofu', linsen: 'lentils', 'rote linsen': 'red lentils',
  kichererbsen: 'chickpeas', bohnen: 'beans', kidneybohnen: 'kidney beans', mais: 'sweetcorn', spinat: 'spinach', brokkoli: 'broccoli', zucchini: 'courgettes', aubergine: 'aubergine', pilze: 'mushrooms',
  champignons: 'mushrooms', lauch: 'leek', kokosmilch: 'coconut milk', ingwer: 'ginger', zitrone: 'lemon', limette: 'lime', avocado: 'avocado', apfel: 'apple', äpfel: 'apple', banane: 'banana', bananen: 'banana',
  haferflocken: 'oats', couscous: 'couscous', feta: 'feta', mozzarella: 'mozzarella', parmesan: 'parmesan', joghurt: 'yogurt', erbsen: 'peas', gurke: 'cucumber', kürbis: 'pumpkin', süßkartoffel: 'sweet potatoes' };
function mealOut(m) { const ing = [];
  for (let i = 1; i <= 20; i++) { const n = (m['strIngredient' + i] || '').trim(); if (n) ing.push({ i: n, m: (m['strMeasure' + i] || '').trim() }); }
  const raw = String(m.strInstructions || '').replace(/\r/g, '');
  let steps = raw.split(/\n+/).map(x => x.replace(/^\s*(step\s*\d+[:.)-]?|\d+[.)]\s)\s*/i, '').trim()).filter(x => x.length > 2 && !/^step\s*\d*$/i.test(x));
  if (steps.length < 3) steps = raw.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+(?=[A-Z])/).reduce((a, x) => { if (a.length && a[a.length - 1].length < 110) a[a.length - 1] += ' ' + x; else a.push(x); return a; }, []).map(x => x.trim()).filter(Boolean);
  const ok = u => /^https:\/\//.test(u || '') ? u : '';
  return { id: m.idMeal, name: m.strMeal, cat: m.strCategory, area: m.strArea, img: /^https:\/\/www\.themealdb\.com\//.test(m.strMealThumb || '') ? m.strMealThumb : '', ing, steps: steps.slice(0, 30), src: ok(m.strSource), yt: ok(m.strYoutube) }; }
on('GET', /^\/api\/rezepte$/, async (q, res) => {
  const sp = q.url.searchParams, diet = ['veg', 'vegan'].includes(sp.get('diet')) ? sp.get('diet') : 'alle';
  const term = String(sp.get('q') || '').trim().toLowerCase().slice(0, 40).replace(/[^\p{L}\p{N} -]/gu, '');
  const cats = diet === 'vegan' ? ['Vegan'] : diet === 'veg' ? ['Vegetarian', 'Vegan'] : null;
  try {
    let ids = [];
    if (term) { const en = DE_EN[term] || term;
      const [byName, byIng, byNameDe] = await Promise.all([mealGet('search.php?s=' + encodeURIComponent(en)), mealGet('filter.php?i=' + encodeURIComponent(en.replace(/ /g, '_'))), en !== term ? mealGet('search.php?s=' + encodeURIComponent(term)) : { meals: null }]);
      ids = [...(byName.meals || []), ...(byNameDe.meals || []), ...(byIng.meals || [])].map(m => m.idMeal);
      if (cats) { const allowed = new Set((await Promise.all(cats.map(c => mealGet('filter.php?c=' + c)))).flatMap(r => (r.meals || []).map(m => m.idMeal))); ids = ids.filter(id => allowed.has(id)); }
    } else if (cats) { ids = (await Promise.all(cats.map(c => mealGet('filter.php?c=' + c)))).flatMap(r => (r.meals || []).map(m => m.idMeal)); ids = shuffle(ids); }
    else { ids = (await Promise.all(Array.from({ length: 8 }, () => getJSON(MEAL + 'random.php')))).map(r => r.meals && r.meals[0] && r.meals[0].idMeal); }
    ids = [...new Set(ids.filter(Boolean))].slice(0, 8);
    const meals = (await Promise.all(ids.map(id => mealGet('lookup.php?i=' + encodeURIComponent(id)).catch(() => ({ meals: null }))))).map(r => r.meals && r.meals[0]).filter(Boolean).map(mealOut);
    send(res, 200, { diet, q: term, meals });
  } catch (e) { err(res, 502, 'Rezept-Dienst gerade nicht erreichbar'); }
}, { app: 'kueche' });

// Messenger (Server sieht nur Geheimtext)
const ms = { app: 'messenger' };
const keyFile = uid => path.join(DATA, 'msg/keys', uid + '.json');
const reachable = u => u && u.active && !expired(u) && !locked(u) && canApp(u, 'messenger');
const msgPrefs = uid => readJSON(path.join(userDir(uid), 'messenger.json'), null) || {};
const online = u => !!streams.get(u.id)?.size && msgPrefs(u.id).showOnline !== false;
on('GET', /^\/api\/msg\/keys$/, (q, res) => { const f = keyFile(q.u.id); send(res, 200, fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : 'null'); }, { ...ms, anyState: true }); // null = noch kein Tresor
on('PUT', /^\/api\/msg\/keys$/, async (q, res) => { const b = await json(q.req);
  if (!b.pub || !b64ok(b.pub.ecdh, 400) || !b64ok(b.pub.ecdsa, 400) || !b.blob || !b64ok(b.blob.ct, 20000) || !b64ok(b.blob.salt, 64) || !b64ok(b.blob.iv, 64) || !(b.blob.iter >= 100000)) return err(res, 400, 'Ungültige Schlüssel');
  writeJSON(keyFile(q.u.id), { pub: b.pub, blob: b.blob, created: new Date().toISOString() }); pushAll({ type: 'keys' }); log('messenger-schlüssel', q.u.name, ipOf(q.req)); send(res, 200, { ok: true }); }, ms);
on('GET', /^\/api\/msg\/users$/, (q, res) => { const now = Date.now(), seen = msgPrefs(q.u.id).lastRead || {};
  send(res, 200, users.filter(u => u.id !== q.u.id && u.active && !expired(u) && canApp(u, 'messenger')).map(u => {
    const k = readJSON(keyFile(u.id), null); const l = readJSON(convFile(q.u.id, u.id), []).filter(x => !x.quiet && (!x.ttl || x.ts + x.ttl > now)); const last = l[l.length - 1];
    return { id: u.id, name: shownName(u), pub: k ? k.pub : null, last: last ? last.ts : 0, lastFrom: last ? last.from : null, online: online(u),
      unread: l.filter(x => x.from === u.id && x.ts > (+seen[u.id] || 0)).length }; })); }, ms);
on('GET', /^\/api\/msg\/conv\/([a-f0-9]+)$/, (q, res, m) => { const now = Date.now(); send(res, 200, readJSON(convFile(q.u.id, m[1]), []).filter(x => !x.ttl || x.ts + x.ttl > now)); }, ms);

// Anhänge: der Browser verschlüsselt die Datei, der Server speichert nur Geheimtext. Den Schlüssel enthält nur die Nachricht.
const FILE_DIR = path.join(DATA, 'msg/files'); fs.mkdirSync(FILE_DIR, { recursive: true });
const FILE_INDEX = path.join(DATA, 'msg/files.json'); let files = readJSON(FILE_INDEX, {});
const saveFiles = () => writeJSON(FILE_INDEX, files);
const FILE_MAX = 8 * 1024 * 1024 + 64, QUOTA = (+process.env.WB_MSG_QUOTA_MB || 300) * 1024 * 1024;
function dropFiles(test) { let n = 0; for (const [id, f] of Object.entries(files)) if (test(f, id)) { fs.rmSync(path.join(FILE_DIR, id), { force: true }); delete files[id]; n++; } if (n) saveFiles(); }
const sendRate = new Map(); // Nutzer -> { n, t }: Schutz gegen Fluten
function msgRate(uid, limit = 120) { const now = Date.now(), r = sendRate.get(uid) || { n: 0, t: now }; if (now - r.t > 60e3) { r.n = 0; r.t = now; } r.n++; sendRate.set(uid, r); return r.n <= limit; }
on('POST', /^\/api\/msg\/file\/([a-f0-9]+)$/, async (q, res, m) => {
  const to = findUser(m[1]); if (!to || to.id === q.u.id || !to.active || !canApp(to, 'messenger')) return err(res, 400, 'Empfänger nicht erreichbar');
  const declared = +q.req.headers['content-length'] || 0; if (declared > FILE_MAX) return err(res, 413, 'Datei zu groß (höchstens 8 MB)');
  const used = () => Object.values(files).filter(f => f.from === q.u.id).reduce((n, f) => n + f.size, 0);
  if (!msgRate('file:' + q.u.id, 30) || Object.values(files).filter(f => f.from === q.u.id && !f.msg).length >= 5) return err(res, 429, 'Zu viele Uploads, bitte kurz warten');
  const chunks = []; let size = 0;
  for await (const c of q.req) { size += c.length; if (size > FILE_MAX) { q.req.destroy(); return; } chunks.push(c); }
  if (size < 17) return err(res, 400, 'Leere Datei');
  if (used() + size > QUOTA) return err(res, 413, 'Dein Speicher für Anhänge ist voll. Lösch alte Nachrichten mit Dateien.');
  const id = crypto.randomBytes(16).toString('hex'); fs.writeFileSync(path.join(FILE_DIR, id), Buffer.concat(chunks), { mode: 0o600 });
  files[id] = { from: q.u.id, to: to.id, size, t: Date.now(), msg: null }; saveFiles(); send(res, 200, { id });
}, ms);
on('GET', /^\/api\/msg\/file\/([a-f0-9]{32})$/, (q, res, m) => { const f = Object.hasOwn(files, m[1]) && files[m[1]]; const p = path.join(FILE_DIR, m[1]);
  if (!f || (f.from !== q.u.id && f.to !== q.u.id) || !fs.existsSync(p)) return err(res, 404, 'Datei nicht gefunden');
  res.writeHead(200, { ...SEC, 'Content-Type': 'application/octet-stream', 'Content-Length': f.size, 'Content-Disposition': 'attachment', 'Cache-Control': 'private, no-store' }); fs.createReadStream(p).pipe(res); }, ms);
// Verwaiste Uploads nach einer Stunde, abgelaufene Nachrichten samt Anhang jede Minute entfernen
setInterval(() => { const now = Date.now(); const gone = new Set();
  for (const f of fs.readdirSync(path.join(DATA, 'msg/conv'))) { if (!f.endsWith('.json')) continue; const p = path.join(DATA, 'msg/conv', f); const l = readJSON(p, []);
    const k = l.filter(m => !m.ttl || m.ts + m.ttl > now); if (k.length !== l.length) { for (const m of l) if (m.file && !k.includes(m)) gone.add(m.file); writeJSON(p, k); } }
  dropFiles((f, id) => gone.has(id) || (!f.msg && now - f.t > 3600e3)); }, 60e3);

on('POST', /^\/api\/msg\/send$/, async (q, res) => {
  const b = await json(q.req); const to = findUser(b.to);
  if (!to || to.id === q.u.id || !to.active || !canApp(to, 'messenger')) return err(res, 400, 'Empfänger nicht erreichbar');
  if (b.from !== q.u.id || !b64ok(b.ct, 60000) || !b64ok(b.iv, 32) || !b64ok(b.sig, 200) || Math.abs(Date.now() - b.ts) > 5 * 60e3) return err(res, 400, 'Ungültige Nachricht');
  if (!b.keys || Object.keys(b.keys).sort().join() !== [q.u.id, to.id].sort().join() || !Object.values(b.keys).every(k => b64ok(k.epk, 400) && b64ok(k.salt, 64) && b64ok(k.iv, 32) && b64ok(k.wk, 200))) return err(res, 400, 'Ungültige Schlüssel');
  const file = b.file === undefined ? null : String(b.file);
  if (file !== null && !(Object.hasOwn(files, file) && files[file].from === q.u.id && files[file].to === to.id && !files[file].msg)) return err(res, 400, 'Anhang ungültig');
  if (!msgRate(q.u.id)) return err(res, 429, 'Zu viele Nachrichten, bitte kurz warten');
  const ttl = [0, 3600e3, 86400e3, 604800e3].includes(+b.ttl) ? +b.ttl : 0;
  // quiet: Reaktion oder Bearbeitung, zählt nicht als neue Nachricht
  const msg = { id: crypto.randomBytes(8).toString('hex'), from: q.u.id, to: to.id, ts: b.ts, ttl, iv: b.iv, ct: b.ct, keys: b.keys, sig: b.sig, ...(file ? { file } : {}), ...(b.quiet ? { quiet: true } : {}) };
  const f = convFile(q.u.id, to.id); const l = readJSON(f, []); l.push(msg);
  const cut = new Set(l.slice(0, -5000).map(x => x.file).filter(Boolean)); writeJSON(f, l.slice(-5000));
  if (file) { files[file].msg = msg.id; saveFiles(); } if (cut.size) dropFiles((_, id) => cut.has(id));
  push(to.id, { type: 'msg', msg }); push(q.u.id, { type: 'msg', msg }); send(res, 200, { ok: true, id: msg.id });
}, ms);
on('DELETE', /^\/api\/msg\/conv\/([a-f0-9]+)\/([a-f0-9]+)$/, (q, res, m) => { const f = convFile(q.u.id, m[1]); const l = readJSON(f, []); const x = l.find(y => y.id === m[2]);
  if (!x || x.from !== q.u.id) return err(res, 403, 'Nur eigene Nachrichten'); writeJSON(f, l.filter(y => y !== x)); if (x.file) dropFiles((_, id) => id === x.file);
  push(m[1], { type: 'del', id: x.id }); push(q.u.id, { type: 'del', id: x.id }); send(res, 200, { ok: true }); }, ms);

// „tippt …“ und Lesebestätigungen: nur flüchtige Hinweise, abschaltbar im Browser
on('POST', /^\/api\/msg\/typing\/([a-f0-9]+)$/, (q, res, m) => { const to = findUser(m[1]);
  if (reachable(to) && msgRate('typing:' + q.u.id, 60)) push(to.id, { type: 'typing', from: q.u.id }); send(res, 200, { ok: true }); }, ms);
const READ_FILE = path.join(DATA, 'msg/read.json'); let reads = readJSON(READ_FILE, {});
on('POST', /^\/api\/msg\/read\/([a-f0-9]+)$/, async (q, res, m) => { const b = await json(q.req), to = findUser(m[1]), ts = Math.min(Date.now() + 6 * 60e3, Math.max(0, +b.ts || 0)); // Absender-Uhren dürfen bis 5 Min vorgehen
  if (!to || !canApp(to, 'messenger')) return err(res, 400, 'Empfänger nicht erreichbar');
  const k = q.u.id + '>' + to.id; if (ts > (reads[k] || 0)) { reads[k] = ts; writeJSON(READ_FILE, reads); push(to.id, { type: 'read', from: q.u.id, ts }); } send(res, 200, { ok: true }); }, ms);
on('GET', /^\/api\/msg\/read\/([a-f0-9]+)$/, (q, res, m) => send(res, 200, { ts: reads[m[1] + '>' + q.u.id] || 0 }), ms);
function presence(uid) { const u = findUser(uid); if (!u) return; const ev = { type: 'presence', id: uid, online: online(u) }; for (const other of streams.keys()) if (other !== uid) push(other, ev); }
on('POST', /^\/api\/msg\/presence$/, (q, res) => { presence(q.u.id); send(res, 200, { ok: true }); }, ms); // nach dem Umschalten der Einstellung
on('GET', /^\/api\/msg\/stream$/, (q, res) => {
  const mine = streams.get(q.u.id) || new Set(); if (mine.size >= 20) return err(res, 429, 'Zu viele offene Verbindungen');
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive', ...SEC }); res.write(': ok\n\n');
  const c = { res, key: q.sess.key }; streams.set(q.u.id, mine.add(c)); if (mine.size === 1) presence(q.u.id);
  q.req.on('close', () => { if (mine.delete(c) && !mine.size) presence(q.u.id); });
}, ms);

// ---------- Protokoll-Schnittstellen (nur Admins mit der Kachel) ----------
const logAdmin = { app: 'protokoll', admin: true };
on('GET', /^\/api\/protokoll\/zugriffe$/, (q, res) => {
  flushTraffic(); const days = trafficDays(), want = q.url.searchParams.get('tag'), day = days.includes(want) ? want : dayKey();
  const src = q.url.searchParams.get('quelle'), onlyErr = q.url.searchParams.get('fehler') === '1';
  const all = readLog(trafficFile(day)).filter(e => !src || e.s === src);
  const hours = Array.from({ length: 24 }, () => ({ n: 0, err: 0 })), ips = new Map(); let inB = 0, outB = 0, errors = 0;
  for (const e of all) { const bad = e.c >= 400, h = hours[new Date(e.t).getHours()]; h.n++; inB += e.i; outB += e.o; if (bad) { h.err++; errors++; }
    const k = ips.get(e.ip) || { ip: e.ip, s: e.s, n: 0, err: 0, bytes: 0, last: 0 }; k.n++; k.bytes += e.i + e.o; if (bad) k.err++; k.last = Math.max(k.last, e.t); ips.set(e.ip, k); }
  send(res, 200, { day, days, keep: TRAFFIC_DAYS, cut: fs.existsSync(trafficFile(day) + '.1'), total: all.length, errors, inB, outB, ipCount: ips.size, hours,
    ips: [...ips.values()].sort((a, b) => b.n - a.n).slice(0, 15), entries: all.filter(e => !onlyErr || e.c >= 400).sort((a, b) => b.t - a.t).slice(0, 300) });
}, logAdmin);
on('GET', /^\/api\/protokoll\/anmeldungen$/, (q, res) => {
  const f = q.url.searchParams.get('filter'), all = readLog(LOGIN_FILE).sort((a, b) => b.t - a.t);
  const kind = e => LOGIN_OK.includes(e.r) ? 'ok' : LOGIN_WAIT.includes(e.r) ? 'offen' : 'fehler';
  const day = all.filter(e => e.t > Date.now() - 864e5), failed = day.filter(e => kind(e) === 'fehler');
  send(res, 200, { total: all.length, sum: { ok: day.filter(e => kind(e) === 'ok').length, failed: failed.length, failedIps: new Set(failed.map(e => e.ip)).size },
    entries: all.map(e => ({ ...e, kind: kind(e) })).filter(e => !f || e.kind === f).slice(0, 500) });
}, logAdmin);

// ---------- Server-Kacheln: Daten vom Sammler auf dem Host (host/sammeln.py, nur lesend eingehängt) ----------
const HOST_DIR = process.env.WB_HOST_DIR || path.join(DATA, 'host');
function hostData(name, maxMin) { const d = readJSON(path.join(HOST_DIR, name + '.json'), null);
  return d && d.t ? { ...d, stale: Date.now() - d.t > maxMin * 60e3 } : { missing: true, stale: true, error: d && d.error }; }
const STALE_TEXT = 'Der Server liefert keine aktuellen Daten. Läuft der Sammler (crontab)?';

// Docker-Übersicht
function dockerProblem(c) {
  if (c.state === 'restarting') return 'startet ständig neu';
  if (c.state === 'dead') return 'defekt';
  if (c.health === 'unhealthy') return 'unhealthy';
  if (c.oom) return 'Speicher ging aus';
  if (c.state === 'exited' && ![0, 130, 137, 143].includes(c.exit)) return `abgestürzt (Code ${c.exit})`; // 130/137/143: normal gestoppt
  const n = (c.restartTimes || []).filter(t => t > Date.now() - 864e5).length;
  return n ? `${n}× neu gestartet in 24 h` : '';
}
on('GET', /^\/api\/docker$/, (q, res) => { const d = hostData('docker', 5);
  send(res, 200, { t: d.t || null, stale: d.stale, error: d.error || (d.stale ? STALE_TEXT : ''), containers: (d.containers || []).map(c => ({ ...c, problem: dockerProblem(c) })) }); }, { app: 'docker', admin: true });

// Updates & Backups
const BACKUP_DAYS = 7, DISK_WARN = 85;
on('GET', /^\/api\/wartung$/, (q, res) => {
  const d = hostData('system', 10), w = [], add = (text, sub, val, bad) => w.push({ text, sub, val, bad: !!bad });
  if (d.stale) add('Keine aktuellen Serverdaten', STALE_TEXT, '?', true);
  if (!d.missing) {
    const b = (d.backups || [])[0], age = b ? Math.floor((Date.now() - b.t) / 864e5) : null;
    if (!b) add('Noch keine Werkbank-Sicherung', 'auf dem Server: bash sichern.sh', '–', true);
    else if (Date.now() - b.t > BACKUP_DAYS * 864e5) add('Sicherung ist veraltet', `älter als ${BACKUP_DAYS} Tage`, age + ' T', true);
    for (const k of d.disks || []) if (k.percent >= DISK_WARN) add(`Platte ${k.mount} läuft voll`, `${k.percent} % belegt`, k.percent + ' %', k.percent >= 95);
    const a = d.apt || {};
    if (a.error) add('Updates nicht prüfbar', a.error, '?'); else if (a.security) add('Sicherheitsupdates stehen an', `${a.count} Updates insgesamt`, a.security, true);
    else if (a.count) add('Updates stehen an', 'apt', a.count);
    if (d.reboot) add('Neustart des Servers nötig', 'nach Updates', '↻');
  }
  send(res, 200, { ...d, backupDays: BACKUP_DAYS, diskWarn: DISK_WARN, warnings: w });
}, { app: 'wartung', admin: true });

// Heimnetz-Geräte: bekannte Geräte merken, neue melden
const DEV_FILE = path.join(DATA, 'geraete.json');
let devs = readJSON(DEV_FILE, { first: 0, scan: 0, list: {} });
function syncDevices() {
  const d = hostData('netz', 15); if (!d.devices || !d.devices.length || d.t <= devs.scan) return d;
  const baseline = !devs.first; if (baseline) devs.first = d.t;
  for (const x of d.devices) { if (!/^[0-9a-f]{2}(:[0-9a-f]{2}){5}$/.test(x.mac)) continue;
    let g = devs.list[x.mac];
    if (!g) { if (Object.keys(devs.list).length >= 1000) continue; g = devs.list[x.mac] = { name: '', known: baseline || !!x.self || !!x.router, first: d.t };
      if (!g.known) log('neues-gerät-im-netz', '', x.ip, `${x.mac} ${x.host || ''}`.trim()); }
    Object.assign(g, { ip: x.ip, host: x.host || g.host || '', self: !!x.self, router: !!x.router, last: d.t }); }
  devs.scan = d.t; writeJSON(DEV_FILE, devs); return d;
}
setInterval(syncDevices, 30e3); setTimeout(syncDevices, 1000);
const gr = { app: 'geraete', admin: true };
on('GET', /^\/api\/geraete$/, (q, res) => { const d = syncDevices();
  send(res, 200, { t: devs.scan || null, stale: d.stale, error: d.error || (d.stale ? STALE_TEXT : ''), net: d.net || '', since: devs.first,
    devices: Object.entries(devs.list).map(([mac, g]) => ({ mac, ...g, online: !d.stale && g.last === devs.scan, private: !!(parseInt(mac.slice(0, 2), 16) & 2) })) }); }, gr);
on('PUT', /^\/api\/geraete\/([0-9a-f:]{17})$/, async (q, res, m) => { const g = devs.list[m[1]]; if (!g) return err(res, 404, 'Gerät nicht gefunden'); const b = await json(q.req);
  if (b.name !== undefined) g.name = String(b.name).trim().slice(0, 60); if (b.known !== undefined) g.known = !!b.known; writeJSON(DEV_FILE, devs); send(res, 200, { ok: true }); }, gr);
on('DELETE', /^\/api\/geraete\/([0-9a-f:]{17})$/, (q, res, m) => { delete devs.list[m[1]]; writeJSON(DEV_FILE, devs); send(res, 200, { ok: true }); }, gr);

// Aktuell gesperrte Anmeldungen (für die Protokoll-Kachel)
on('GET', /^\/api\/protokoll\/sperren$/, (q, res) => { const now = Date.now();
  send(res, 200, Object.entries(guard).filter(([, g]) => g.until > now).map(([k, g]) => { const i = k.indexOf(':'), kind = k.slice(0, i), v = k.slice(i + 1); let name = '', ip = '';
    if (kind === 'jf') { if (v.startsWith('ip-')) ip = v.slice(3); else name = findUser(v)?.name || v; } else if (kind === 'ipacct') [name, ip] = v.split('|'); else if (kind === 'acct' || (kind === 'reset' && !net.isIP(v))) name = v; else ip = v;
    return { kind, name, ip, until: g.until, level: g.level || 1 }; }).sort((a, b) => b.until - a.until)); }, logAdmin);

// ---------- Paketverfolgung ----------
// Live-Status nur für DHL über die offizielle Schnittstelle (kostenloser Schlüssel). Andere Dienste: Stand von Hand + Link.
const DHL_URL = process.env.WB_DHL_URL || 'https://api-eu.dhl.com/track/shipments';
const PKG_FILE = path.join(DATA, 'pakete-cache.json');
let pkgCache = readJSON(PKG_FILE, {}); const pkgQueue = new Set(); let pkgBusy = false, pkgPause = 0, pkgUse = { day: '', n: 0 };
const pkgDue = nr => { const c = pkgCache[nr]; return !c || Date.now() - c.checked > (c.code === 'delivered' ? 7 * 864e5 : c.error ? 30 * 60e3 : 2 * 3600e3); };
async function pkgWork() {
  const key = settings().dhlKey; if (pkgBusy || !key || !pkgQueue.size || Date.now() < pkgPause) return;
  if (pkgUse.day !== dayKey()) pkgUse = { day: dayKey(), n: 0 }; if (pkgUse.n >= 200) return; // kostenloser Zugang: 250 Abfragen pro Tag
  const nr = pkgQueue.values().next().value; pkgQueue.delete(nr); pkgBusy = true; pkgUse.n++;
  let c = { checked: Date.now() };
  try {
    const r = await fetch(`${DHL_URL}?trackingNumber=${encodeURIComponent(nr)}&language=de`, { headers: { 'DHL-API-Key': key, Accept: 'application/json' }, redirect: 'error', signal: AbortSignal.timeout(10000) });
    if (r.status === 404) c.error = 'DHL kennt die Nummer (noch) nicht';
    else if (r.status === 401 || r.status === 403) { c.error = 'DHL lehnt den API-Schlüssel ab'; pkgPause = Date.now() + 15 * 60e3; }
    else if (r.status === 429) { c.error = 'DHL-Tageslimit erreicht'; pkgPause = Date.now() + 3600e3; }
    else if (!r.ok) c.error = 'DHL antwortet mit Fehler ' + r.status;
    else { const s = ((await r.json()).shipments || [])[0], st = s && s.status;
      if (!st) c.error = 'Noch keine Daten bei DHL';
      else c = { ...c, code: String(st.statusCode || 'unknown'), text: String(st.description || st.status || '').slice(0, 300), time: String(st.timestamp || ''), place: String(st.location?.address?.addressLocality || '').slice(0, 80) }; }
  } catch { c.error = 'DHL nicht erreichbar'; }
  // Bei Fehlern den letzten bekannten Stand behalten
  pkgCache[nr] = c.error && pkgCache[nr]?.code ? { ...pkgCache[nr], checked: c.checked, error: c.error } : c;
  for (const [k, v] of Object.entries(pkgCache)) if (Date.now() - v.checked > 60 * 864e5) delete pkgCache[k];
  writeJSON(PKG_FILE, pkgCache); pkgBusy = false;
}
setInterval(() => pkgWork().catch(e => { pkgBusy = false; console.error('Pakete:', e.message); }), +process.env.WB_DHL_PAUSE || 6000); // höchstens eine Abfrage alle 6 s
const pk = { app: 'pakete' };
on('GET', /^\/api\/pakete\/status$/, (q, res) => {
  const key = !!settings().dhlKey, own = readJSON(path.join(userDir(q.u.id), 'pakete.json'), null), out = {};
  for (const p of (own && Array.isArray(own.pakete) ? own.pakete : []).slice(0, 100)) {
    if (!p || p.dienst !== 'dhl' || !/^[A-Za-z0-9]{8,40}$/.test(p.nr) || p.done) continue;
    if (key && pkgDue(p.nr)) pkgQueue.add(p.nr); if (key && pkgCache[p.nr]) out[p.nr] = pkgCache[p.nr];
  }
  send(res, 200, { key, admin: !!q.u.admin, pending: [...pkgQueue].length > 0, status: out });
}, pk);
on('PUT', /^\/api\/pakete\/schluessel$/, async (q, res) => { const b = await json(q.req), key = String(b.key || '').trim();
  if (key && !/^[A-Za-z0-9_-]{8,100}$/.test(key)) return err(res, 400, 'Das sieht nicht wie ein DHL-API-Schlüssel aus');
  const st = settings(); if (key) st.dhlKey = key; else delete st.dhlKey; saveSettings(st);
  pkgPause = 0; for (const [k, v] of Object.entries(pkgCache)) if (v.error) delete pkgCache[k]; log('dhl-schlüssel', q.u.name, ipOf(q.req), key ? 'gespeichert' : 'entfernt'); send(res, 200, { ok: true }); }, { app: 'pakete', admin: true });

// ---------- Cockpit: Anzeigen links und rechts auf der Startseite ----------
let ckPrev = os.cpus(), ckCpu = 0;
setInterval(() => { const cur = os.cpus(); let idle = 0, tot = 0; cur.forEach((c, i) => { const p = ckPrev[i] || c; for (const k in c.times) tot += c.times[k] - p.times[k]; idle += c.times.idle - p.times.idle; });
  ckPrev = cur; if (tot > 0) ckCpu = Math.round((1 - idle / tot) * 100); }, 3000);
function cpuTemp() { try { for (const z of fs.readdirSync('/sys/class/thermal')) { if (!z.startsWith('thermal_zone')) continue; const d = '/sys/class/thermal/' + z;
  if (/x86_pkg_temp|cpu|soc|coretemp|k10temp/i.test(fs.readFileSync(d + '/type', 'utf8'))) return Math.round(+fs.readFileSync(d + '/temp', 'utf8') / 1000); } } catch {} return null; }
function memAvail() { try { const m = fs.readFileSync('/proc/meminfo', 'utf8').match(/MemAvailable:\s+(\d+)/); if (m) return +m[1] * 1024; } catch {} return os.freemem(); }
on('GET', /^\/api\/cockpit$/, async (q, res) => {
  const u = q.u; if (!pub(u).cockpit) return err(res, 403, 'Das Cockpit ist für dein Konto abgeschaltet');
  const may = app => canApp(u, app), sys = hostData('system', 10), lamps = [];
  const lamp = (id, label, state, text, app) => lamps.push({ id, label, state, text, ...(app ? { app } : {}) });
  const total = os.totalmem(), temp = cpuTemp();
  let disk = sys.missing ? null : (sys.disks || []).find(d => d.mount === '/') || null;
  if (!disk) try { const st = fs.statfsSync(DATA); disk = { total: st.blocks * st.bsize, free: st.bavail * st.bsize, percent: Math.round((1 - st.bavail / st.blocks) * 100) }; } catch {}
  lamp('disk', 'Platte', !disk ? 'off' : disk.percent >= 95 ? 'bad' : disk.percent >= DISK_WARN ? 'warn' : 'ok', disk ? disk.percent + ' % belegt' : 'unbekannt', may('wartung') && 'wartung');
  lamp('temp', 'Temperatur', temp === null ? 'off' : temp >= 90 ? 'bad' : temp >= 75 ? 'warn' : 'ok', temp === null ? 'kein Sensor' : temp + ' °C');
  if (may('wartung')) { const a = sys.apt || {}, b = (sys.backups || [])[0], age = b ? Math.floor((Date.now() - b.t) / 864e5) : null;
    lamp('daten', 'Sammler', sys.stale ? 'bad' : 'ok', sys.stale ? 'keine aktuellen Daten' : 'liefert Daten', 'wartung');
    if (!sys.missing) { lamp('updates', 'Updates', a.error ? 'off' : a.security ? 'bad' : a.count ? 'warn' : 'ok', a.error ? 'nicht prüfbar' : a.count ? `${a.count} offen` : 'aktuell', 'wartung');
      lamp('neustart', 'Neustart', sys.reboot ? 'warn' : 'ok', sys.reboot ? 'nötig' : 'nicht nötig', 'wartung');
      lamp('sicherung', 'Sicherung', age === null ? 'bad' : age >= BACKUP_DAYS ? 'warn' : 'ok', age === null ? 'keine' : age ? `vor ${age} T` : 'heute', 'wartung'); } }
  if (may('docker')) { const d = hostData('docker', 5), l = d.containers || [], bad = l.filter(c => dockerProblem(c)).length, run = l.filter(c => c.state === 'running').length;
    lamp('docker', 'Container', d.stale ? 'off' : bad ? 'bad' : 'ok', d.stale ? 'keine Daten' : bad ? `${bad} auffällig` : `${run}/${l.length} laufen`, 'docker'); }
  if (may('monitor') && monTargets().length) { const down = monTargets().filter(t => monState[t.id]?.up === false).length, warn = monTargets().filter(t => monState[t.id]?.warn).length;
    lamp('dienste', 'Dienste', down ? 'bad' : warn ? 'warn' : 'ok', down ? `${down} offline` : warn ? `${warn} Hinweise` : 'alle online', 'monitor'); }
  if (may('pihole') && settings().pihole?.url) { const p = await piholeStatus().catch(() => ({ ok: false }));
    lamp('pihole', 'Pi-hole', !p.ok ? 'bad' : p.warnings?.length ? 'warn' : 'ok', !p.ok ? 'nicht erreichbar' : p.warnings?.length ? `${p.warnings.length} Warnung(en)` : `${(+p.percent || 0).toFixed(0)} % blockiert`, 'pihole'); }
  if (may('protokoll')) { const n = Object.values(guard).filter(g => g.until > Date.now()).length; lamp('sperren', 'Sperren', n ? 'bad' : 'ok', n ? `${n} aktiv` : 'keine', 'protokoll'); }
  if (may('geraete') && devs.scan) { const n = Object.values(devs.list).filter(g => !g.known).length; lamp('geraete', 'Heimnetz', n ? 'warn' : 'ok', n ? `${n} unbekannt` : `${Object.values(devs.list).filter(g => g.last === devs.scan).length} online`, 'geraete'); }
  const net = !sys.missing && !sys.stale && sys.net && Number.isFinite(sys.net.rx) ? { rx: sys.net.rx, tx: sys.net.tx } : null;
  send(res, 200, { t: Date.now(), cpu: ckCpu, cores: os.cpus().length, load: os.loadavg().map(x => Math.round(x * 100) / 100), mem: { total, used: total - memAvail() }, temp,
    disk: disk ? { total: disk.total, free: disk.free, percent: disk.percent } : null, uptime: Math.round(os.uptime()), net, hist: sysHist.slice(-120), lamps });
});

// ---------- Jellyfin ----------
jf = require('./jellyfin.js')({ on, send, err, json, SEC, DATA, log, ipOf, viaProxy, lockLeft, recordFail, clearFails, slow, findUser });

// ---------- Seiten ----------
const MSG_HEADERS = { 'Permissions-Policy': 'camera=(), microphone=(self), geolocation=(self)',
  'Content-Security-Policy': SEC['Content-Security-Policy'].replace("img-src 'self' data:", "img-src 'self' data: blob:") + "; media-src 'self' blob:" };
function servePage(q, res, file) {
  const fp = path.join(PUB, file); if (!fs.existsSync(fp)) return page(res, 404, 'Nicht gefunden', 'Diese Seite gibt es nicht.');
  res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream', 'Cache-Control': 'no-cache', ...SEC, ...(file === 'apps/messenger.html' ? MSG_HEADERS : {}) }); fs.createReadStream(fp).pipe(res);
}
async function handle(req, res) {
  trackRequest(req, res);
  let url, p; try { url = new URL(req.url, 'http://x'); p = decodeURIComponent(url.pathname); } catch { return err(res, 400, 'Ungültiger Pfad'); }
  const q = { req, url };
  try {
    // Unverschlüsselt nur direkt am Laptop (localhost). Alles andere wird auf HTTPS umgeleitet.
    if (!isHttps(req) && process.env.WB_ALLOW_HTTP !== '1') {
      const host = String(req.headers.host || '').replace(/:\d+$/, '').replace(/^\[|\]$/g, '');
      if (!['localhost', '127.0.0.1', '::1'].includes(host)) {
        res.writeHead(301, { Location: `https://${host}${viaProxy(req) || String(process.env.WB_HTTPS_PUBLIC_PORT || HTTPS_PORT) === '443' ? '' : ':' + (process.env.WB_HTTPS_PUBLIC_PORT || HTTPS_PORT)}${req.url}`, ...SEC }); return res.end(); }
    }
    if (isHttps(req) && viaProxy(req)) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    if (p.startsWith('/api/')) {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        if (req.headers['x-wb'] !== '1') return err(res, 403, 'CSRF-Schutz: Header fehlt');
        const o = req.headers.origin; if (o && new URL(o).host !== req.headers.host) return err(res, 403, 'Fremde Herkunft');
      }
      const r = routes.find(r => r.method === req.method && r.re.test(p)); if (!r) return err(res, 404, 'Unbekannte API');
      if (r.open && !rateOk(ipOf(req))) { if (/^\/api\/auth\/(login|reset|setup)$/.test(p)) loginLog(req, '', 'tempolimit'); return err(res, 429, 'Zu viele Anfragen, bitte kurz warten'); }
      if (!r.open) {
        const s = getSession(req, res); if (!s) return err(res, 401, 'Nicht angemeldet'); q.sess = s; q.u = s.u;
        if (s.u.mustChange && !r.anyState) return err(res, 403, 'Bitte zuerst das Passwort ändern');
        if (setup2fa(s.u) && !r.anyState) return send(res, 403, { error: 'Bitte zuerst Zwei-Faktor einrichten', setup2fa: true });
        if (r.admin && !s.u.admin) return err(res, 403, 'Nur für Admins');
        if (r.app && !canApp(s.u, r.app)) return err(res, 403, 'Kein Zugriff auf diese App');
      }
      return await r.fn(q, res, p.match(r.re));
    }
    if (p.startsWith('/assets/') || p === '/favicon.ico' || p === '/manifest.webmanifest') {
      const fp = path.normalize(path.join(PUB, p)); if (!fp.startsWith(PUB + path.sep) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) return send(res, 404, 'nicht gefunden', 'text/plain');
      res.writeHead(200, { 'Content-Type': MIME[path.extname(fp)] || 'application/octet-stream', 'Cache-Control': 'no-cache', ...SEC }); return fs.createReadStream(fp).pipe(res);
    }
    if (p === '/login' || p === '/login.html') { if (users.length && getSession(req, res) && !url.searchParams.has('bye')) { res.writeHead(302, { Location: '/' }); return res.end(); } return servePage(q, res, 'login.html'); }
    const s = getSession(req, res);
    if (!s) { res.writeHead(302, { Location: '/login?next=' + encodeURIComponent(p) }); return res.end(); }
    if (p === '/' || p === '/index.html') { if (locked(s.u)) { res.writeHead(302, { Location: '/apps/konto' }); return res.end(); } return servePage(q, res, 'index.html'); }
    const m = p.match(/^\/apps\/([a-z]+)(\.html)?$/);
    if (m) {
      const id = m[1];
      if (locked(s.u) && id !== 'konto') { res.writeHead(302, { Location: '/apps/konto' }); return res.end(); }
      if (id === 'admin' && !s.u.admin) return page(res, 403, 'Kein Zugriff', 'Die Verwaltung ist nur für Admins.');
      if (id !== 'konto' && id !== 'admin' && !canApp(s.u, id)) return page(res, 403, 'Kein Zugriff', 'Für diese Seite hast du keine Berechtigung. Frag den Admin, falls du sie brauchst.');
      return servePage(q, res, `apps/${id}.html`);
    }
    return page(res, 404, 'Nicht gefunden', 'Diese Seite gibt es nicht.');
  } catch (e) { console.error(e); if (!res.headersSent) err(res, 500, e.message); }
}

http.createServer(handle).listen(PORT, '0.0.0.0', () => console.log(`Werkbank: http://localhost:${PORT}`));
if (TRUST_PROXY) http.createServer(handle).listen(PROXY_PORT, '0.0.0.0', () => console.log(`Werkbank: interner Eingang für Caddy auf Port ${PROXY_PORT}`));

// HTTPS mit selbst signiertem Zertifikat (für Zugriff aus dem Heimnetz – Browser-Kryptografie braucht eine sichere Verbindung)
try {
  const kf = path.join(DATA, 'tls/key.pem'), cf = path.join(DATA, 'tls/cert.pem');
  const san = process.env.WB_TLS_SAN || 'DNS:localhost,IP:127.0.0.1';
  const sanFile = path.join(DATA, 'tls/san.txt');
  if (!fs.existsSync(cf) || readJSON(sanFile, '') !== san) {
    execFileSync('openssl', ['req', '-x509', '-newkey', 'ec', '-pkeyopt', 'ec_paramgen_curve:P-256', '-nodes', '-days', '825', '-subj', '/CN=Werkbank', '-addext', 'subjectAltName=' + san, '-keyout', kf, '-out', cf], { stdio: 'ignore' });
    writeJSON(sanFile, san); console.log('TLS-Zertifikat erzeugt für', san);
  }
  const tlsOpts = { key: fs.readFileSync(kf), cert: fs.readFileSync(cf), minVersion: 'TLSv1.2' };
  https.createServer(tlsOpts, handle).listen(HTTPS_PORT, '0.0.0.0', () => console.log(`Werkbank: https://localhost:${HTTPS_PORT}`));
} catch (e) { console.log('HTTPS nicht aktiv (openssl fehlt?):', e.message); }
