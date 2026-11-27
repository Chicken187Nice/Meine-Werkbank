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

```bash
git clone https://github.com/Chicken187Nice/Meine-Werkbank.git
cd Meine-Werkbank
bash start.sh
```

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
