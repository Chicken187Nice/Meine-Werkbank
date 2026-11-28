# Werkbank – Anleitung

Deine persönliche Startseite mit vielen kleinen Apps. Sie läuft in Docker – auf deinem Laptop oder einem Linux-Server – mit Login, Rechten pro Nutzer und Ende-zu-Ende-verschlüsseltem Messenger.

## Von GitHub holen

```
git clone https://github.com/Chicken187Nice/Meine-Werkbank.git
cd Meine-Werkbank
```

Du brauchst **Docker** mit Compose. Für die Server-Kacheln und das Cockpit zusätzlich Linux mit `python3` und `cron` (unter Windows bleiben Docker-, Update- und Geräte-Kacheln leer).
Einstellungen stehen in `.env` neben `docker-compose.yml`; Vorlage mit allen Werten: `.env.example`. `start.sh` legt die Datei selbst an.
Optional und erst nach dem Start einzutragen: Wetterort, Pi-hole, Jellyfin-Zugang, DHL- und Pexels-Schlüssel. Die Oberfläche ist deutsch, Zeitzone `Europe/Berlin` (in `docker-compose.yml` änderbar).

## Starten (Windows)

1. **Docker Desktop** installieren und starten (docker.com → Docker Desktop for Windows).
2. Doppelklick auf **`start.bat`**. Beim ersten Mal wird das Image gebaut, das dauert 1–2 Minuten.
3. Der Browser öffnet **http://localhost:8081**.
4. **Ersteinrichtung:** Du legst das Passwort für das erste Konto fest (Benutzername aus `WB_OWNER` in `.env`, sonst `admin`; mindestens 10 Zeichen). Du bist Owner und Admin.

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
Aus dem Internet erreichbar machen: siehe *Verschlüsselung* unten (Caddy mit Let's Encrypt). Auf dem Server dazu `WB_DOMAIN`, `WB_TRUST_PROXY=1` und (bei Portfreigabe im Router) `WB_PUBLIC_BIND=0.0.0.0` in `.env` eintragen, dann `docker compose --profile internet up -d --build`.

## Über playit aus dem Internet erreichbar machen

Weg: Browser → playit (HTTPS-Tunnel mit eigener Adresse) → Caddy (80/443, nur `127.0.0.1`, Standard) → Werkbank (interner Port 8082).
Den PROXY-Kopf mit der echten Besucher-IP nimmt Caddy nur aus den Netzen in `WB_PROXY_ALLOW` an (Standard: Docker-Netze `172.16.0.0/12`).

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
  2. In `.env` eintragen: `WB_TLS_SAN=DNS:localhost,IP:127.0.0.1,IP:192.168.178.42`, dann `start.bat`.
  3. Am Handy die Zertifikatswarnung einmal bestätigen (selbst ausgestelltes Zertifikat, trotzdem voll verschlüsselt).
  4. Falls Windows blockiert: Windows-Firewall → eingehende Regel für TCP 8443 im **privaten** Netz.
- **Aus dem Internet:** nur über den mitgelieferten **Caddy** mit echtem Let's-Encrypt-Zertifikat. Damit gibt es keine Warnung, die Verbindung ist durchgehend verschlüsselt, HSTS ist aktiv und HTTP wird auf HTTPS umgeleitet.
  1. Domain besorgen, z. B. kostenlos bei duckdns.org, und auf deine Internet-IP zeigen lassen.
  2. Im Router (Fritz!Box: Internet → Freigaben) die Ports **80 und 443** an den Laptop weiterleiten. **8081 und 8443 nicht freigeben.**
  3. Im Werkbank-Ordner in der Eingabeaufforderung:
     ```
     set WB_DOMAIN=deinname.duckdns.org
     set WB_TRUST_PROXY=1
     set WB_PUBLIC_BIND=0.0.0.0
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
  - Admins heben eine Sperre mit einem Knopf auf: im **Protokoll** unter „Anmeldungen“ oder in der **Verwaltung** beim betroffenen Nutzer.
  - Setzt ein Admin ein neues Passwort oder legt das Konto neu an, verschwinden die Sperren dieses Namens (nicht die Sperre einer ganzen IP).
- Beim mit ⟳ erzeugten Einmalpasswort sind Bindestriche und Leerzeichen beim Eingeben egal. Selbst gewählte Passwörter zählen genau so, wie sie sind.
- **Rückmeldungen:** Die Anmeldeseite nennt verbleibende Versuche, Sperrdauer mit Uhrzeit und Tipps. Beim Passwort haken sich die Regeln während des Tippens ab, es lässt sich anzeigen, und Feststelltaste oder Leerzeichen am Rand werden gemeldet. Neue Zugänge sehen unter „Mein Konto“ die nötigen Schritte.
- **Passwort für jemanden zurücksetzen:** Verwaltung → Nutzer → ⟳ (oder selbst eintippen) → Knopf unten zweimal anklicken (der zweite Klick bestätigt). Erst die Anzeige „Neues Passwort gespeichert“ heißt, dass es gilt. „Muss eigenes Passwort setzen“ wird dabei angehakt und lässt sich abwählen.
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

Die Kachel **Jellyfin** (Bereich Freizeit) zeigt Filme und Serien in der Werkbank: Weiterschauen, Als Nächstes, Favoriten, Neu hinzugefügt, Bibliotheken, Suche, Staffeln und Folgen, Player mit Untertiteln, Tonspur, Qualität und Vollbild (auch Taste **F** oder Doppelklick).

- Jeder verbindet sich einmal mit seinem **eigenen Jellyfin-Zugang**. Das Passwort wird nicht gespeichert, nur der Zugangsschlüssel von Jellyfin (`/data/jellyfin.json`, nur für den Dienst lesbar). Er erreicht nie den Browser. Er steckt in der Datensicherung, also Sicherungen geschützt aufbewahren.
- Der Browser spricht nur mit der Werkbank; Jellyfin selbst muss nicht aus dem Internet erreichbar sein. Es ist eine eigene Oberfläche, nicht die Jellyfin-Webseite: Verwaltung, Plugins und Live-TV gibt es dort weiterhin nur in Jellyfin.
- Jellyfin sieht Zugriffe über die Werkbank als lokale Zugriffe. Wer in der Werkbank freigeschaltet ist, braucht trotzdem ein Jellyfin-Konto.
- Von unterwegs (playit) ist die Qualität auf „mittel“ voreingestellt. Umwandeln rechnet ohne Grafikkarte auf dem Prozessor.
- Adresse ändern: `WB_JELLYFIN_URL` in `.env` (Standard `http://host.docker.internal:8096`).

## Persönliche Einstellungen

Das **Zahnrad** oben rechts (oder **Mein Konto**) öffnet die Einstellungen. Sie gelten nur für das eigene Konto, wirken sofort und lassen sich mit **Rückgängig** zurücknehmen. Das Suchfeld findet jede Einstellung.

| Bereich | Was du einstellst |
|---|---|
| Vorlagen | 51 fertige Vorlagen, die mit einem Klick alles umstellen (siehe unten) |
| Design | „Überrasch mich“, 18 Designs oder ein eigenes, je Tageszeit oder wie das Gerät, Akzentfarbe, eigene Ansichten zum Umschalten |
| Farben | Farbschema, Farben je Bereich, jede Oberflächen- und Schriftfarbe einzeln, Helligkeit, Sättigung, warmes Licht, Kontrast |
| Hintergrund | Muster, Farbverlauf, eigenes Bild (abdunkeln, weichzeichnen), Schimmer, Transparenz und Milchglas |
| Schrift | Schrift für Text, Überschriften und Zahlen, Größe, Strichstärke, Zeilen- und Buchstabenabstand |
| Form | Kartenstil, Ecken, Rahmen, Symbole, Abstände, Breite, Verhalten beim Überfahren, Animationen, Scrollleisten |
| Startseite | Abschnitte und Karten anordnen, Begrüßung, Uhr (digital oder analog), „Heute“, Wetter, Kopfzeile |
| Kacheln | frei anordnen (ziehen oder Pfeile), Gliederung, Sortierung, Darstellung, Maße; je Kachel Name, Symbol, Farbe, Größe, Bereich, Sichtbarkeit; eigene Bereiche und eigene Link-Kacheln |
| Cockpit | Größe, Deckkraft, Farbe, Takt, Anzeigen und Plätze |
| Bedienung | Start-App, neuer Tab, Tastenkürzel, Zifferntasten, Nachfrage beim Abmelden, Abmelden bei Untätigkeit, eigenes CSS |
| Daten | als Datei sichern und laden, zurücksetzen |

Macht eine Einstellung (etwa eigenes CSS) die Seite unbedienbar, öffne die Adresse mit **`?sicher`** am Ende: Dann erscheint alles im Standard, und du kannst es ändern.

### Vorlagen

Eine Vorlage stellt Farben, Hintergrund, Schrift, Form, Kachelansicht und Cockpit-Aussehen auf einmal um. Deine Kacheln, Links, Anordnung, sichtbaren Abschnitte, Bedienung und eigenes CSS bleiben. **Rückgängig** holt den vorigen Stand zurück.

| Gruppe | Vorlagen |
|---|---|
| Standard und Aufbau | Standard, Symbolwand, Liste, Alles auf einen Blick, Großbild, Minimal |
| Spiele | Minecraft, Nether, Das Ende, Super Mario, Zelda, Pokémon, Tetris, Pac-Man, Game Boy, Fallout, Cyberpunk, Vice City, Portal, Valorant, League of Legends, Elden Ring, Stardew Valley, Among Us, Fortnite, Counter-Strike, ARK |
| Welten | Weltraum, Matrix, Synthwave, Tiefsee, Kirschblüte |
| Jahreszeiten und Feste | Herbst, Winter, Halloween, Weihnachten |
| Retro und Kreatives | Windows 95, Blaupause, Kreidetafel, Comic |
| Schlicht und schön | Ruhig, Neon, Papier, Konsole, Gut lesbar, Aurora, Sonnenuntergang, Minze frisch, Werkstatt, Magazin, Nachtschicht |

- Unter **Hintergrund** lassen sich Bild und Verzierungen einer Vorlage getrennt abschalten; ein eigenes Bild hat Vorrang.
- Wählst du unter **Design** ein anderes Design, verschwinden Hintergrund und Verzierungen. Vorlagen-Designs kannst du auch je Tageszeit einsetzen.
- Alle Hintergründe und die Pixelschrift sind selbst gezeichnet und an die Spiele nur angelehnt. Es besteht keine Verbindung zu deren Herstellern.
- Handschrift-Vorlagen (Kreidetafel, Comic) nutzen eine Schrift deines Geräts; fehlt sie, erscheint eine normale Schrift.

## Wochenbericht

Der Wochenbericht fasst die **wichtigsten Ereignisse der letzten 7 Tage** zusammen, statt Meldungen aufzulisten. Meldungen zum selben Ereignis werden gebündelt; vorne steht, worüber mehrere Quellen, oft und an mehreren Tagen berichten. Stichwörter bevorzugen passende Ereignisse oder zeigen auf Wunsch nur diese.

- Die Texte bestehen aus Sätzen der Quellen. Es ist kein KI-Dienst beteiligt, und außer den Feeds wird nichts abgerufen.
- Viele Feeds zeigen nur die letzten ein bis zwei Tage. Mit **Automatisch** sammelt der Server deshalb stündlich und erstellt montags ab 7 Uhr den Bericht.
- Je mehr Quellen sich überschneiden, desto besser erkennt er, was wichtig war.

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

Unter **Aktuell gesperrt** hebst du eine Sperre mit **Aufheben** sofort auf (bei mehreren auch **Alle aufheben**). Die Fehlerzähler zu diesem Namen und dieser Adresse beginnen dann von vorn, und das Aufheben wird in der Verwaltung festgehalten.

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

## Kalender

- **+ Termin** oder Doppelklick auf einen Tag. Termine können mehrtägig sein und sich wöchentlich, monatlich oder jährlich wiederholen.
- Oben das **Bundesland** wählen, dann stimmen die Feiertage.
- Zusätzlich erscheinen fällige Aufgaben, Countdowns, Reisen und Kündigungsfristen, aber nur aus Kacheln, die du selbst nutzen darfst. Ändern kannst du sie in der jeweiligen Kachel.
- **Als .ics speichern** erzeugt eine Datei mit deinen eigenen Terminen für Handy oder Outlook. Die Werkbank gleicht sich nicht selbst mit anderen Kalendern ab.

## Arbeitszeit

- **Kommen**, **Pause**, **Gehen**. Vergessene oder falsche Zeiten korrigierst du unten über den Stift am Tag.
- Unter **Einstellungen**: Wochenstunden, Arbeitstage, Bundesland, Startstand des Stundenkontos und „unter 18“ (strengere Pausenregeln).
- Das Stundenkonto zählt nur eingetragene, abgeschlossene Tage. Die Hinweise zu Pausen und Höchstzeiten sind eine Hilfe und ersetzen weder die Zeiterfassung im Betrieb noch eine Rechtsauskunft.

## Merkliste, Ablage, Dev-Werkzeuge

- **Merkliste:** Filme, Serien, Bücher und Spiele mit Stand (geplant, läuft, fertig), Fortschritt, Notiz und Sternen. **Was als Nächstes?** schlägt etwas Geplantes vor.
- **Ablage:** Text am einen Gerät ablegen, am anderen kopieren. Die Seite lädt alle paar Sekunden nach. Die Texte liegen **unverschlüsselt** auf dem Server, also keine Passwörter. Höchstens 200 Einträge mit je 20.000 Zeichen.
- **Dev-Werkzeuge:** JSON, Kodieren, Zeitstempel, Regex, Prüfsummen und UUID, JWT, Farben, Zahlensysteme, Textvergleich. Alles rechnet im Browser, nichts wird gespeichert. Prüfsummen brauchen eine sichere Verbindung (https oder localhost).

Neue Kacheln sieht zuerst nur der Owner. Für andere Nutzer gibst du sie in der **Verwaltung** frei.

## KI-Assistent (lokal)

Ein Sprachmodell, das auf deinem eigenen Server läuft (Ollama). Nichts geht an einen fremden KI-Dienst.

**Einrichten** (einmal, lädt mehrere Gigabyte):

```
bash ki-einrichten.sh qwen3.5:4b qwen3.5:2b
docker compose --profile internet --profile ki up -d --build
```

Ohne Internet-Zugriff von außen lässt du `--profile internet` weg. Unter Windows (`start.bat`) wird die KI nicht automatisch mitgestartet.

**Benutzen:** Kachel **KI-Assistent** oder der Funken-Knopf oben rechts auf jeder Seite. Auf einer Unterseite weiß die KI, wo du bist, und liest deren Einträge mit. Unter jeder Antwort steht, welche Bereiche sie gelesen hat.

**Was sie sieht:**

- Nur, was dein Konto selbst sehen darf. Der Server sucht die Daten vor der Frage aus; das Modell selbst hat keinen Zugriff auf irgendetwas.
- Von Einträgen nur deine eigenen, nie die anderer Nutzer. Das gilt auch für Admins und den Owner.
- Fragst du nach den Terminen oder Einträgen eines anderen Kontos („Welche Termine hat …?“), antwortet die KI nur, dass sie darüber keine Auskunft gibt. Bei Personen ohne Konto gibt sie dieselbe Auskunft, dort hält sich aber nur das Modell daran. In keinem Fall hat sie fremde Einträge vorliegen.
- Aus dem **Protokoll** liest sie nur deine eigenen Anmeldungen, von allen anderen bloß Anzahlen. Wer sich wann angemeldet hat, siehst du in der Kachel selbst.
- Serverdaten (Docker, Pi-hole, Heimnetz …) nur mit der Freigabe der jeweiligen Kachel.
- Nie Passwörter, Schlüssel oder den Messenger.
- Mit abgewähltem **Meine Daten nutzen** gar nichts davon (antwortet dann schneller).

### Eintragen lassen

Schreib einfach, was wohin soll:

- „Trag morgen um 15 Uhr Zahnarzt ein“
- „Setz Milch und Eier auf die Einkaufsliste“
- „Neue Aufgabe: Berichtsheft abgeben bis Freitag, hohe Priorität“
- „Trag ein, dass ich gestern 12,50 € für Döner ausgegeben habe“

Die KI **speichert nie von selbst**. Sie zeigt eine Karte mit den Angaben; du kannst sie ändern, mit **Eintragen** speichern oder **Verwerfen**. Datum, Uhrzeit und Beträge liest der Server selbst aus deinem Text.

Möglich in: Kalender, Aufgaben, Notizen, Küche (Einkaufsliste, Vorrat), Finanzen (Buchung, Sparziel), Abo-Killer, Countdowns, Gewohnheiten, Merkliste, Ablage, Pakete, Schule (Note), Arbeitszeit, Berichtsheft, C#-Trainer (Lernkarte) und Reiseplaner (Packliste). Immer nur in Kacheln, die dein Konto benutzen darf, und nur bei deinen eigenen Einträgen. Ändern und Löschen geht nur in der Kachel selbst. Vorhandenes wird nie überschrieben.

Hast du dieselbe Kachel noch in einem anderen Fenster offen, lädt es beim nächsten Speichern neu, damit der neue Eintrag nicht verloren geht.

### Prozessor

Die KI darf höchstens **75 %** des Prozessors nutzen (auf 4 Kernen also 3). `ki-einrichten.sh` rechnet das für deinen Rechner aus und trägt `WB_KI_CPUS` in `.env` ein.

**Modelle:** `qwen3.5:4b` ist voreingestellt (gründlicher), `qwen3.5:2b` ist schneller, schreibt aber öfter Ungenaues. Umschalten kannst du unter dem Eingabefeld.

**Gut zu wissen:** Ohne Grafikkarte braucht eine Antwort Geduld. Gemessen auf einem i5 mit 4 Kernen: erstes Wort nach etwa 20–30 s (klein) bzw. 35–50 s (groß), fertig nach 30–80 s. Auf schnellerer Hardware entsprechend weniger. Es wird immer nur eine Antwort gleichzeitig berechnet, weitere warten. Kleine Modelle irren sich öfter als große Online-Dienste, besonders beim Rechnen und bei Fakten. Dein Chatverlauf wird bei deinen Daten gespeichert (**Neuer Chat** löscht ihn).

Neue Nutzer bekommen die KI erst, wenn du die Kachel in der **Verwaltung** freigibst.

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

## Auf GitHub sichern (nur für eigene Kopien)

```
bash hochladen.sh "Was ich geändert habe"
```

Ins Git kommen nur Quelldateien: `.gitignore` sperrt alles und erlaubt einzeln. `.env`, `status/`, Sicherungen, Notizen und alle Nutzerdaten bleiben auf dem Server.
Das Skript verlangt eine lokale Schutzprüfung (`.git/hooks/pre-commit` und `pre-push`), die nach privaten Daten und Konfliktresten sucht. Sie liegt nicht im Repository; ohne sie bricht das Skript ab.
Vor dem Hochladen holt es Änderungen von GitHub ab. Bei einem Konflikt bricht es ab, statt eine kaputte Datei hochzuladen.
Dateien nicht gleichzeitig auf der GitHub-Webseite und auf dem Server ändern.

## Port ändern

Eine Datei `.env` neben `docker-compose.yml` anlegen bzw. ändern, z. B. `WB_HTTP_PORT=3000` und `WB_HTTPS_PORT=3443`. Danach neu starten.
