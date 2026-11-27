<<<<<<< HEAD
# Meine Werkbank

> This project was built with Claude (Anthropic).

**A self-hosted personal dashboard in Docker:** one start page with 25+ small apps for everyday life, apprenticeship, homelab and more. Every app sits behind one login with single sign-on and per-user permissions. 2FA, brute-force protection and an end-to-end encrypted messenger are built in.

Zero-dependency Node.js · one container · runs on a laptop or a home server.

---

## Features

### The start page
- **Tiles in colour-coded groups:** Everyday, Organisation, Apprenticeship, Style & Social, Leisure, Tools and Tech.
- **"Today" feed:** shows what needs your attention, e.g. an unfinished training log, a due subscription or a Pi-hole warning.
- **Notifications:** configurable per tile. Hover an icon to mute it, with undo.
- **Pins, clock and weather.**
- **Edit everywhere:** every entry in every app can be edited, not just added or deleted.

### Apps

| Group | Apps |
|---|---|
| **Everyday** | Finances & savings goals · Subscriptions · Kitchen · Habits |
| **Organisation** | Kanban tasks · Notes · Countdowns · Focus timer · Bookmarks · Travel planner |
| **Apprenticeship** | Training log (Berichtsheft) · School grades · Weekly news (RSS) · **C# trainer for Java developers** · Typing trainer · Explainers · Job applications |
| **Style & Social** | **Weekly outfits** · **E2E-encrypted messenger** |
| **Leisure & Tools** | Mini games · Decision helper · Calculator · Password generator |
| **Tech** | **Pi-hole** stats & warnings · **Uptime monitor** (HTTP/TCP/TLS) · System info |

#### Highlights
- **Kitchen:**
  - Track your pantry, plan your week and get the shopping list built for you.
  - Every recipe has a step-by-step **cooking mode** with timers.
  - Diet filter: all, vegetarian or vegan.
  - Recipe search online via TheMealDB.
- **Outfits:** 6 new urban looks every Monday (slim top, baggy pants) in black & white or black & red. They come from real shop products with images and direct product links. Old weeks are deleted automatically.
- **Messenger:** messages are encrypted in the browser (ECDH P-256 + HKDF + AES-GCM, signed with ECDSA). The server only ever stores ciphertext.
- **C# trainer:** learn C# coming from Java, with side-by-side comparisons, quizzes and your own flashcards.

---

## Security

- **Single sign-on / single log-out** across all apps. Users only see the apps they are allowed to use.
- **Owner-only user management:** only the owner creates users and sets app access, admin rights and other options.
- **Passwords:** scrypt hashes and a password policy (min. 10 characters, no common words).
- **2FA:**
  - TOTP (RFC 6238) with replay protection and 10 one-time recovery codes.
  - Users can reset their own password, but only with 2FA.
- **Brute-force protection:**
  - Lockouts per IP + account, per account and per IP.
  - Lock times grow exponentially and survive restarts.
  - Known devices can still sign in while an account is locked.
- **Transport:** HTTPS by default (self-signed certificate) and HTTP → HTTPS redirect. Optional Caddy reverse proxy with Let's Encrypt and HSTS for public access.
- **Hardening:** CSRF protection, a strict Content Security Policy, COOP/CORP headers, SSRF protection for outgoing requests and rate limits on open routes. First-time setup is only possible from the local network.

> The security measures follow common best practices but have **not been professionally audited**. See [Disclaimer](#license--disclaimer).

---

## Quick start

### Linux server (e.g. Ubuntu)


`start.sh` does the following:
- installs Docker if needed (asks first)
- puts your server's IP into the HTTPS certificate
- builds and starts the container
- opens the firewall (ufw)

Then open **`https://<server-ip>:8443`** and set the owner password. Your browser will warn about the self-signed certificate once. The connection is still encrypted.

### Windows

1. Install and start **Docker Desktop**.
2. Double-click **`start.bat`**.
3. Open **http://localhost:8080** and set the owner password.

### Useful commands

```bash
bash stop.sh        # stop (data is kept)
bash sichern.sh     # back up all data to werkbank-daten-<date>.tgz
docker compose logs -f
```

---

## Configuration

Settings live in a `.env` file next to `docker-compose.yml`. `start.sh` creates it for you.

| Variable | Default | Description |
|---|---|---|
| `WB_HTTP_PORT` | `8080` | HTTP port (redirects to HTTPS outside localhost) |
| `WB_HTTPS_PORT` | `8443` | HTTPS port |
| `WB_HTTP_BIND` | `127.0.0.1` | `0.0.0.0` to reach HTTP from your network |
| `WB_TLS_SAN` | `DNS:localhost,IP:127.0.0.1` | Hostnames/IPs for the self-signed certificate |
| `WB_DOMAIN` | – | Your public domain (Caddy profile) |
| `WB_TRUST_PROXY` | `0` | Set to `1` when running behind Caddy |

### Making it reachable from the internet

```bash
WB_DOMAIN=your-domain.com WB_TRUST_PROXY=1 docker compose --profile internet up -d --build
```

This starts **Caddy** in front of the app, with automatic Let's Encrypt certificates and HSTS. It also works behind tunnels such as **playit.gg** or **Cloudflare Tunnel**, as long as the tunnel forwards to ports 80/443. Before you expose it, finish the first-time setup and enable 2FA.

---

## Data & backups

All data lives in the Docker volume `werkbank_werkbank-daten`.
- **Full backup:** `bash sichern.sh` (Linux) or `sichern.bat` (Windows).
- **Restore / move to another machine:** put `werkbank-daten.tgz` next to `start.sh` and run `bash start.sh`. The backup is imported automatically.
- **Per user:** everyone can export and import their own data as JSON under *My account*.

---

## Project structure

```
├── server.js            # complete backend (auth, API, HTTPS) – no npm dependencies
├── public/
│   ├── index.html       # start page
│   ├── login.html       # login, 2FA, password reset
│   ├── assets/          # shared JS (core.js) and design system (base.css)
│   └── apps/            # one HTML file per app
├── Dockerfile
├── docker-compose.yml   # app + optional Caddy (profile "internet")
├── Caddyfile
└── start.sh / start.bat, stop.*, sichern.*
```

**Tech:** Node.js 22 (standard library only), vanilla JavaScript, HTML and CSS, the Web Crypto API, Docker and Caddy.

---

## License & Disclaimer

This project is licensed under the [MIT License](LICENSE).

**You are free to** use this code, run it on your own machine or server, and modify it however you like.

**No warranty, no liability:** this software is provided "as is", without any warranty. I am not responsible for any problems, data loss, security incidents or other damage that may result from using, modifying or running this code. You use it entirely at your own risk.

- **Third-party content:** outfit suggestions show product images, names and links from public online shops. All images, brand names and trademarks belong to their respective owners. I am not affiliated with these shops and receive no commission.
- **External services:** some features use third-party services (e.g. TheMealDB, RSS feeds, online shops). They may change or stop working at any time.
- **Not professional advice:** the finance and other tools are simple helpers for personal organisation.
=======
# Werkbank

Deine persönliche Startseite mit 19 Apps. Sie läuft in Docker – auf deinem Laptop oder einem Linux-Server – mit Login, Rechten pro Nutzer und Ende-zu-Ende-verschlüsseltem Messenger.

## Starten (Windows)

1. **Docker Desktop** installieren und starten (docker.com → Docker Desktop for Windows).
2. Doppelklick auf **`start.bat`**. Beim ersten Mal wird das Image gebaut, das dauert 1–2 Minuten.
3. Der Browser öffnet **http://localhost:8081**.
4. **Ersteinrichtung:** Du legst das Passwort für das erste Konto fest (Name aus `WB_OWNER` in `.env`, sonst `admin`) (mindestens 10 Zeichen). Du bist Owner und Admin.

Stoppen mit `stop.bat`. Die Werkbank startet automatisch mit Docker Desktop (`restart: unless-stopped`).

Alternativ im Terminal in diesem Ordner:

```
docker compose up -d --build     # starten / nach Änderungen neu bauen
docker compose logs -f           # Protokoll ansehen
docker compose down              # stoppen (Daten bleiben)
```

## Auf einem Ubuntu-Server laufen lassen

1. **Optional, Daten mitnehmen:** Auf dem Laptop Doppelklick auf **`sichern.bat`** (Docker Desktop muss laufen). Daneben entsteht `werkbank-daten.tgz` mit allen Nutzern, Einstellungen und Nachrichten.
2. Den **ganzen Ordner `werkbank`** auf den Server kopieren, z. B. mit `scp -r werkbank BENUTZER@SERVER-IP:~/docker/` oder per USB-Stick oder WinSCP.
3. Auf dem Server:
   ```
   cd ~/docker/werkbank
   bash start.sh
   ```
   `start.sh` installiert bei Bedarf Docker (fragt vorher), trägt die IP des Servers ins HTTPS-Zertifikat ein, übernimmt `werkbank-daten.tgz` automatisch, baut, startet und öffnet die Firewall (ufw).
4. Im Browser: **`https://SERVER-IP:8443`**. `http://SERVER-IP:8081` leitet automatisch dorthin weiter. Die Zertifikatswarnung beim ersten Mal einmal bestätigen (selbst signiert, der Verkehr ist trotzdem verschlüsselt).

Ohne mitgenommene Daten startet die Werkbank leer, dann richtest du das erste Konto neu ein. Die Ersteinrichtung geht nur aus dem Heimnetz.
Stoppen: `bash stop.sh`. Sichern: `bash sichern.sh`. Nach einem Server-Neustart startet die Werkbank von selbst wieder.
Ports ändern: in der Datei `.env` (`WB_HTTPS_PORT`, `WB_HTTP_PORT`) und danach `bash start.sh`.
Aus dem Internet erreichbar machen: siehe *Verschlüsselung* unten (Caddy mit Let's Encrypt). Auf dem Server dazu `WB_DOMAIN=deine-domain.de WB_TRUST_PROXY=1 docker compose --profile internet up -d --build`.

## Über playit aus dem Internet erreichbar machen

Weg: Browser → playit (HTTPS-Tunnel mit eigener Adresse) → Caddy (80/443, nur `127.0.0.1`) → Werkbank (interner Port 8082).

1. Vorher für jedes Konto **Zwei-Faktor** einschalten.
2. Auf playit.gg einen **HTTPS-Tunnel** auf `127.0.0.1` Port 80 und 443 anlegen, **Proxy Protocol v2** einschalten.
3. In `.env` setzen: `WB_DOMAIN=<deine playit-Adresse>` und `WB_TRUST_PROXY=1`.
4. Starten und nach Änderungen neu bauen: `docker compose --profile internet up -d --build`
   (`start.sh` behält diese zwei Zeilen und startet Caddy dann mit.)
5. Nach Änderungen am `Caddyfile`: `docker compose --profile internet up -d --force-recreate caddy`

Klappt es nicht: `docker logs werkbank-caddy` und `docker logs werkbank` ansehen.

## Verschlüsselung: so ist der Zugriff abgesichert

- **Am Laptop selbst:** `http://localhost:8081`. Dieser Port ist nur am Laptop erreichbar, nicht im Netz.
- **Heimnetz (Handy, anderer PC):** nur verschlüsselt über `https://<Laptop-IP>:8443` (TLS 1.2/1.3). Unverschlüsselte Aufrufe aus dem Netz leitet der Server automatisch auf HTTPS um.
  1. IP des Laptops herausfinden: `ipconfig` → „IPv4-Adresse“, z. B. `192.168.178.42`.
  2. In `docker-compose.yml` ergänzen: `WB_TLS_SAN=DNS:localhost,IP:127.0.0.1,IP:192.168.178.42`, dann `start.bat`.
  3. Am Handy die Zertifikatswarnung einmal bestätigen (selbst ausgestelltes Zertifikat, trotzdem voll verschlüsselt).
  4. Falls Windows blockiert: Windows-Firewall → eingehende Regel für TCP 8443 im **privaten** Netz.
- **Aus dem Internet:** nur über den mitgelieferten **Caddy** mit echtem Let's-Encrypt-Zertifikat. Damit gibt es keine Warnung, die Verbindung ist durchgehend verschlüsselt, HSTS ist aktiv und HTTP wird auf HTTPS umgeleitet.
  1. Domain besorgen, z. B. kostenlos bei duckdns.org, und auf deine Internet-IP zeigen lassen.
  2. Im Router (Fritz!Box: Internet → Freigaben) die Ports **80 und 443** an den Laptop weiterleiten. **8081 und 8443 nicht freigeben.**
  3. Im Werkbank-Ordner in der Eingabeaufforderung:
     ```
     set WB_DOMAIN=deinname.duckdns.org
     set WB_TRUST_PROXY=1
     docker compose --profile internet up -d --build
     ```
  4. Vorher unbedingt für jedes Konto **Zwei-Faktor** einschalten (Konto → Zwei-Faktor-Anmeldung).
  Alternative ganz ohne Portfreigabe: Cloudflare Tunnel oder Tailscale (nur deine eigenen Geräte).
- **Messenger:** zusätzlich Ende-zu-Ende-verschlüsselt. Selbst wer den Server hätte, kann die Nachrichten nicht lesen.

## Sicherheit

- Passwörter mit scrypt gehasht. Passwortregeln: mindestens 10 Zeichen, keine häufigen Wörter, nicht der eigene Name, unter 16 Zeichen drei Zeichenarten.
- **Brute-Force-Schutz auf drei Ebenen, bleibt auch nach einem Neustart erhalten:**
  - Name + IP: nach 5 Fehlversuchen 15 Minuten gesperrt.
  - Konto (über alle IPs): nach 10 Fehlversuchen 30 Minuten.
  - IP (über alle Konten): nach 20 Fehlversuchen 60 Minuten.
  - Wiederholte Sperren verdoppeln die Dauer, bis zum 8-Fachen.
  - Jeder Fehlversuch wird zusätzlich ca. 1 Sekunde verzögert.
  - Deine bekannten Geräte sind von der Kontosperre ausgenommen, damit dich ein Angreifer nicht aussperren kann.
- **Zwei-Faktor (TOTP)** mit Schutz gegen das Wiederverwenden von Codes und 10 einmaligen **Wiederherstellungscodes**.
- **Passwort vergessen?** Auf der Login-Seite selbst zurücksetzen, mit Authenticator-Code oder Wiederherstellungscode. Danach werden alle Sitzungen beendet. Ohne 2FA setzt der Admin das Passwort zurück.
- Die Ersteinrichtung geht nur aus dem eigenen Netz, nie aus dem Internet.
- Sicherheits-Header: CSP, kein Einbetten in fremde Seiten, nosniff, COOP/CORP. Dazu CSRF-Schutz, Tempolimit für Login-Anfragen, Schutz vor Anfragen ins Heimnetz über die Feed-Funktion (SSRF), Du bleibst angemeldet, bis du dich abmeldest (nach 400 Tagen ohne Besuch läuft die Sitzung ab). Wer in der Verwaltung eine automatische Abmeldung einstellt, wird zusätzlich nach höchstens 30 Tagen abgemeldet.
- Das Protokoll in der Verwaltung zeigt Logins, neue Geräte, Sperren und Fehlversuche.
- Der Container läuft als normaler Nutzer, nicht als root.

## Nutzer & Rechte

- Nur Admins (zuerst nur der Owner) legen Nutzer an: **Verwaltung** oben rechts.
- Pro Nutzer: welche Seiten (mit **„Alles freigeben“** auf einen Klick; Seiten nur für Admins bleiben bei normalen Nutzern außen vor), Cockpit ja/nein, Admin ja/nein (vergibt nur der Owner), aktiv, Ablaufdatum, automatische Abmeldung nach Inaktivität, Pflicht zum Passwortwechsel, Pflicht zur Zwei-Faktor-Anmeldung und eine Notiz.
- **2FA-Pflicht:** Admins immer, alle anderen nach Häkchen in der Verwaltung. Wer sie noch nicht eingerichtet hat, erreicht nur „Mein Konto“. Pflicht-Konten können 2FA nicht selbst abschalten; bei neuem Handy setzt ein Admin sie zurück (der Owner bei sich selbst).
- **Eigener Name:** Nach dem ersten Anmelden und unter „Mein Konto“ wählt jeder seinen Anzeigenamen (Startseite, Messenger). Angemeldet wird weiter mit dem vom Admin angelegten Benutzernamen; die Verwaltung zeigt beide.
- **Single Sign-on:** Ein Login gilt für alle freigegebenen Seiten. **Single Logout:** Abmelden beendet die Sitzung überall. „Überall abmelden“ beendet auch die Sitzungen auf anderen Geräten.
- Jede Seite und jede API prüft die Rechte auf dem Server. Wer keine Freigabe hat, kommt auch per Direktlink nicht hinein.
- Jeder Nutzer hat seine eigenen Daten.
- Unter **Mein Konto**: Passwort ändern, **Zwei-Faktor-Anmeldung** (Authenticator-App), angemeldete Geräte, Datensicherung.

## Details zur Verschlüsselung

- Messenger: ECDH P-256 + HKDF + AES-256-GCM, ein frischer Schlüssel pro Nachricht, ECDSA-Signatur, auf 128 Byte aufgefüllt (verschleiert die Länge). Der private Schlüssel liegt mit PBKDF2 (600.000 Runden) verschlüsselt auf dem Server. Der Server speichert nur Geheimtext.
  Sicherheitsnummern zum Gegenprüfen, Warnung bei geändertem Schlüssel, Selbstzerstörung (1 h / 24 h / 7 Tage).
  Grenzen: kein Forward Secrecy wie bei Signal. Wer Passwort **und** Serverdaten hat, kann alte Nachrichten lesen.
- Der Container läuft als normaler Nutzer, nicht als root.

## Messenger

- Antworten, Reaktionen, Bearbeiten, Kopieren, Löschen für beide, Suche im Chat, Emoji-Auswahl.
- Bilder und Dateien bis 8 MB (Büroklammer, Ablegen oder Einfügen) und Sprachnachrichten bis 3 Minuten. Alles wird vor dem Hochladen im Browser verschlüsselt.
- Online-Anzeige, „tippt …“, Lesebestätigung (✓ gesendet, ✓✓ gelesen), Ungelesen-Zähler. Unter **Einstellungen** abschaltbar; dort auch automatisches Sperren.
- Das Mikrofon darf nur die Messenger-Seite benutzen, und der Browser fragt vorher.
- Speichergrenze für Anhänge: 300 MB je Nutzer (`WB_MSG_QUOTA_MB`). Der Server sieht, wer wem wann wie viel schickt, aber keine Inhalte, Dateinamen oder Reaktionen.

## Jellyfin

Die Kachel **Jellyfin** (Bereich Freizeit) zeigt Filme und Serien in der Werkbank: Weiterschauen, Als Nächstes, Favoriten, Neu hinzugefügt, Bibliotheken, Suche, Staffeln und Folgen, Player mit Untertiteln, Tonspur und Qualität.

- Jeder verbindet sich einmal mit seinem **eigenen Jellyfin-Zugang**. Das Passwort wird nicht gespeichert, nur der Zugangsschlüssel von Jellyfin (`/data/jellyfin.json`, nur für den Dienst lesbar). Er erreicht nie den Browser. Er steckt in der Datensicherung, also Sicherungen geschützt aufbewahren.
- Der Browser spricht nur mit der Werkbank; Jellyfin selbst muss nicht aus dem Internet erreichbar sein. Es ist eine eigene Oberfläche, nicht die Jellyfin-Webseite: Verwaltung, Plugins und Live-TV gibt es dort weiterhin nur in Jellyfin.
- Jellyfin sieht Zugriffe über die Werkbank als lokale Zugriffe. Wer in der Werkbank freigeschaltet ist, braucht trotzdem ein Jellyfin-Konto.
- Von unterwegs (playit) ist die Qualität auf „mittel“ voreingestellt. Umwandeln rechnet ohne Grafikkarte auf dem Prozessor.
- Adresse ändern: `WB_JELLYFIN_URL` in `.env` (Standard `http://host.docker.internal:8096`).

## Cockpit

Auf der Startseite stehen links und rechts Anzeigen wie im Auto: Prozessor, Arbeitsspeicher, Temperatur, Verlauf, Speicherplatz als Tank, Kontrollleuchten, Netzwerk und Betriebszeit als Kilometerzähler.
Einstellen über das Tacho-Symbol oben oder unter **Mein Konto**: ein/aus, Seite und Reihenfolge je Anzeige. Auf schmalen Bildschirmen stehen sie unter der Übersicht.
Admins schalten das Cockpit in der Verwaltung pro Nutzer ab. Kontrollleuchten zu Technik-Seiten sieht nur, wer diese Seiten darf.

## Technik-Kacheln

- **Pi-hole:** Unter „Verbindung einstellen“ Adresse und App-Passwort (v6) bzw. API-Token (v5) eintragen. Die Seite zeigt Warnungen, Blockrate, Geräte und das Alter der Blocklisten. Bei v6 lässt sich der Blocker pausieren.
- **Dienste-Monitor:** prüft jede Minute Webseiten, Ports und Zertifikate. Ausfälle erscheinen auf der Startseite.
- **System:** CPU, RAM und Speicher der Docker-Umgebung.

## Protokoll (nur Admins)

Die Kachel **Protokoll** (Bereich Technik) zeigt zwei getrennte Listen:

- **Zugriffe:** jede Anfrage an die Werkbank mit Zeit, IP, Herkunft (Tunnel, Heimnetz, Tailscale), Pfad, Status, Datenmenge und angemeldetem Nutzer. Aufbewahrung 14 Tage. Der übrige Netzwerkverkehr des Servers wird nicht erfasst.
- **Anmeldungen:** wer sich angemeldet hat und wer es versucht hat, mit Grund, IP und Browser.

Passwörter, Codes und URL-Parameter werden nicht gespeichert. Andere Admins sehen die Kachel erst, wenn der Owner sie ihnen freigibt.

## Server-Kacheln: Docker, Updates & Backups, Heimnetz-Geräte (nur Admins)

Die Daten sammelt `host/sammeln.py` direkt auf dem Server und legt sie in `status/` ab. Die Werkbank hängt den Ordner nur lesend ein und braucht keinen Docker-Socket.
`start.sh` richtet das automatisch ein. Von Hand (`crontab -e`):

```
* * * * * /usr/bin/flock -n $HOME/docker/werkbank/status/.lock /usr/bin/python3 $HOME/docker/werkbank/host/sammeln.py >/dev/null 2>&1
```

- **Docker:** Status, CPU, RAM, Neustarts. Jede Minute.
- **Updates & Backups:** anstehende apt-Updates (alle 30 Minuten und innerhalb einer Minute nach `apt update`/`apt upgrade`), Neustart nötig, Speicherplatz, Alter der letzten Sicherung (`werkbank-daten*.tgz` aus `sichern.sh`).
- **Heimnetz-Geräte:** alle 5 Minuten Ping und ARP-Tabelle im Heimnetz. Beim ersten Lauf gelten alle gefundenen Geräte als bekannt.

Fehlersuche: `python3 host/sammeln.py --alles` von Hand ausführen. Entfernen: die Zeile aus der crontab löschen.

## Pakete

Sendungsnummer, Dienst und Inhalt eintragen. Automatischen Status gibt es nur für **DHL** mit einem kostenlosen Schlüssel von developer.dhl.com
(API „Shipment Tracking - Unified“), einzutragen auf der Pakete-Seite durch einen Admin. Dabei wird die Sendungsnummer an DHL übermittelt.
Bei anderen Diensten den Stand selbst setzen; der Link öffnet die Verfolgung beim Anbieter.

## Hinweise auf der Startseite

Jede Kachel kann im Bereich „Heute“ melden, was fehlt oder ansteht, zum Beispiel ein unfertiges Berichtsheft, fällige Aufgaben oder Pi-hole-Warnungen.
Mit der **Glocke** an jeder Kachel oder über **„Hinweise einstellen“** schaltest du das pro Kachel an oder aus.

## Outfits der Woche

Jeden Montag (neue Kalenderwoche) stellt der Server automatisch 6 Outfits zusammen, gemischt in Schwarz-Weiß und Schwarz-Rot, oben slim, unten baggy.
Zu jedem Look lädt er ein echtes Foto herunter. Ohne Schlüssel kommt es von Openverse (frei lizenziert, mit Bildnachweis).
Mit einem kostenlosen Schlüssel von pexels.com/api werden die Fotos hochwertiger: auf der Outfits-Seite unter „Einstellungen (Admin)“ eintragen.
Die Fotos der Vorwoche werden danach gelöscht, es bleiben keine alten Dateien liegen. Zu jedem Teil gibt es Links zu Zalando, ABOUT YOU und ASOS.
Ohne Internet werden die Outfits erst einmal ohne Fotos erstellt, und der Server versucht es alle 30 Minuten erneut.

## Daten & Sicherung

Alles liegt im Docker-Volume `werkbank_werkbank-daten`. Jeder Nutzer kann unter *Mein Konto* seine Daten als JSON sichern und wieder einspielen.
Alles komplett sichern: `sichern.bat` (Windows) bzw. `bash sichern.sh` (Linux).

## Auf GitHub sichern

```
bash hochladen.sh "Was ich geändert habe"
```

Ins Git kommen nur Quelldateien: `.gitignore` sperrt alles und erlaubt einzeln. `.env`, `status/`, Sicherungen, `Kontext.md` und alle Nutzerdaten bleiben auf dem Server.
Vor jedem Commit und Push sucht eine lokale Prüfung (`.git/hooks/pre-commit`, `pre-push`) nach Schlüsseln, E-Mail- und MAC-Adressen, den Werten aus `.env` und den Begriffen in `.git/info/verboten.txt`. Bei einem Treffer wird nichts hochgeladen.
Die Prüfung liegt nur lokal. Nach einem frischen `git clone` muss sie neu eingerichtet werden. Sie erkennt nur bekannte Muster: Keine Passwörter oder privaten Angaben in Quelldateien schreiben.

## Port ändern

Eine Datei `.env` neben `docker-compose.yml` anlegen bzw. ändern, z. B. `WB_HTTP_PORT=3000` und `WB_HTTPS_PORT=3443`. Danach neu starten.
>>>>>>> origin/master
