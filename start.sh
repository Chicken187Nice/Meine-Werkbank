#!/usr/bin/env bash
# Werkbank auf einem Linux-Server (z. B. Ubuntu) starten.  Aufruf:  bash start.sh
set -e
cd "$(dirname "$0")"

say()  { printf '\033[1;32m▸\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!\033[0m %s\n' "$*"; }

# --- Docker vorhanden? Sonst anbieten, es zu installieren ---------------------
if ! command -v docker >/dev/null 2>&1; then
  warn "Docker ist nicht installiert."
  read -r -p "Jetzt mit dem offiziellen Docker-Skript installieren? [j/N] " a
  if [[ "$a" =~ ^[jJyY] ]]; then
    curl -fsSL https://get.docker.com | sudo sh
    sudo usermod -aG docker "$USER" || true
    say "Docker installiert. Damit es ohne sudo geht: einmal ab- und wieder anmelden."
  else
    echo "Abgebrochen. Docker-Anleitung: https://docs.docker.com/engine/install/ubuntu/"; exit 1
  fi
fi
DOCKER="docker"; docker info >/dev/null 2>&1 || DOCKER="sudo docker"
if ! $DOCKER compose version >/dev/null 2>&1; then
  warn "Das Docker-Compose-Plugin fehlt – wird installiert."; sudo apt-get update -qq && sudo apt-get install -y docker-compose-plugin
fi

# --- IP des Servers ermitteln und .env schreiben ------------------------------
IPS=$(hostname -I 2>/dev/null | tr ' ' '\n' | grep -E '^[0-9]+\.' | grep -v '^172\.1[7-9]\.\|^172\.2[0-9]\.\|^127\.' || true)
MAIN_IP=$(echo "$IPS" | head -n1)
SAN="DNS:localhost,DNS:$(hostname),IP:127.0.0.1"
for ip in $IPS; do SAN="$SAN,IP:$ip"; done
HTTPS_PORT=$(grep -s '^WB_HTTPS_PORT=' .env | cut -d= -f2); HTTPS_PORT=${HTTPS_PORT:-8443}
HTTP_PORT=$(grep -s '^WB_HTTP_PORT=' .env | cut -d= -f2); HTTP_PORT=${HTTP_PORT:-8081}
# Eigene Zeilen (z. B. WB_DOMAIN, WB_TRUST_PROXY für playit) bleiben erhalten
EXTRA=$(grep -sv -E '^(#|WB_HTTP_BIND=|WB_HTTP_PORT=|WB_HTTPS_PORT=|WB_TLS_SAN=|[[:space:]]*$)' .env || true)
cat > .env <<ENV
# Wird von start.sh geschrieben. Ports kannst du hier ändern (danach start.sh erneut ausführen).
WB_HTTP_BIND=0.0.0.0
WB_HTTP_PORT=$HTTP_PORT
WB_HTTPS_PORT=$HTTPS_PORT
WB_TLS_SAN=$SAN
ENV
[ -n "$EXTRA" ] && printf '%s\n' "$EXTRA" >> .env

# --- Daten vom Laptop übernehmen (falls werkbank-daten.tgz daneben liegt) -----
if [ -f werkbank-daten.tgz ]; then
  if $DOCKER volume inspect werkbank_werkbank-daten >/dev/null 2>&1; then
    warn "werkbank-daten.tgz gefunden, aber hier gibt es schon Daten – nichts überschrieben."
    warn "Zum Ersetzen: bash stop.sh && $DOCKER volume rm werkbank_werkbank-daten && bash start.sh"
  else
    say "Übernehme Nutzer und Daten aus werkbank-daten.tgz …"
    $DOCKER volume create werkbank_werkbank-daten >/dev/null
    $DOCKER run --rm -v werkbank_werkbank-daten:/d -v "$PWD":/b alpine sh -c 'tar xzf /b/werkbank-daten.tgz -C /d && rm -rf /d/tls && chown -R 1000:1000 /d'
    mv werkbank-daten.tgz werkbank-daten.importiert.tgz
    say "Fertig. Die Sicherungsdatei heißt jetzt werkbank-daten.importiert.tgz – lösch sie, wenn alles läuft."
  fi
fi

# --- Bauen & starten -----------------------------------------------------------
say "Werkbank wird gebaut und gestartet …"
PROFILE=""; grep -q '^WB_DOMAIN=.' .env && PROFILE="--profile internet"
mkdir -p status   # vor Docker anlegen, sonst gehört der Ordner root und der Sammler kann nicht schreiben
$DOCKER compose $PROFILE up -d --build

# --- Sammler für die Server-Kacheln (Docker, Updates, Geräte) per crontab -------
if command -v crontab >/dev/null 2>&1 && ! crontab -l 2>/dev/null | grep -q 'host/sammeln.py'; then
  mkdir -p status
  { crontab -l 2>/dev/null || true; echo "* * * * * /usr/bin/flock -n '$PWD/status/.lock' /usr/bin/python3 '$PWD/host/sammeln.py' >/dev/null 2>&1"; } | crontab -
  say "Sammler für die Server-Kacheln eingerichtet (läuft jede Minute)."
fi

# --- Firewall (ufw) öffnen, falls aktiv ---------------------------------------
if command -v ufw >/dev/null 2>&1 && sudo -n true 2>/dev/null && sudo ufw status | grep -q "Status: active"; then
  sudo ufw allow "$HTTPS_PORT"/tcp >/dev/null && sudo ufw allow "$HTTP_PORT"/tcp >/dev/null && say "Firewall: Ports $HTTP_PORT und $HTTPS_PORT freigegeben."
elif command -v ufw >/dev/null 2>&1; then
  warn "Falls die Firewall (ufw) aktiv ist:  sudo ufw allow $HTTPS_PORT/tcp && sudo ufw allow $HTTP_PORT/tcp"
fi

echo
say "Läuft! Im Heimnetz aufrufen:"
for ip in $IPS; do echo "    https://$ip:$HTTPS_PORT      (oder einfach http://$ip:$HTTP_PORT – leitet weiter)"; done
echo
echo "  Beim ersten Aufruf warnt der Browser vor dem selbst signierten Zertifikat:"
echo "  „Erweitert“ → „Weiter zu $MAIN_IP“. Der Verkehr ist trotzdem verschlüsselt."
echo "  Startet nach einem Neustart des Servers automatisch wieder."
