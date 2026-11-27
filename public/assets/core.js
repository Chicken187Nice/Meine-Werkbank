// Werkbank – gemeinsame Helfer für alle Seiten
(function () {
  'use strict';

  // ---------- App-Verzeichnis ----------
  const I = {
    finanzen: '<path d="M3 17l5-5 4 3 8-8"/><path d="M15 7h5v5"/>',
    abos: '<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M9 15l2 2 4-4"/>',
    kueche: '<path d="M6 3v8a3 3 0 0 0 3 3v7M9 3v5M12 3v8a3 3 0 0 1-3 3"/><path d="M18 21V3c-2 1-3 4-3 8h3"/>',
    gewohnheiten: '<path d="M4 12l4 4L20 5"/><path d="M4 19h16"/>',
    lernen: '<rect x="3" y="6" width="14" height="12" rx="2"/><path d="M7 3h12a2 2 0 0 1 2 2v10"/>',
    erklaert: '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16.5v.5"/>',
    tippen: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
    spiele: '<path d="M6 12h4M8 10v4"/><circle cx="16" cy="11" r=".6"/><circle cx="18" cy="13" r=".6"/><path d="M7 6h10a5 5 0 0 1 4.9 6l-.6 3a3 3 0 0 1-5.3 1.2L14.5 14h-5L8 16.2A3 3 0 0 1 2.7 15l-.6-3A5 5 0 0 1 7 6z"/>',
    entscheiden: '<path d="M12 3v18M5 7h14M5 7l-3 7a4 4 0 0 0 6 0zM19 7l-3 7a4 4 0 0 0 6 0z"/>',
    rechner: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15v3"/>',
    reisen: '<path d="M3 11l18-8-8 18-2-8z"/>',
    bewerbung: '<rect x="5" y="3" width="14" height="18" rx="2"/><circle cx="12" cy="9" r="2.5"/><path d="M8.5 16a3.5 3.5 0 0 1 7 0"/>',
    wochenbericht: '<path d="M4 4h16v16H4z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
    fokus: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/>',
    notizen: '<path d="M5 3h10l4 4v14H5z"/><path d="M15 3v4h4M8 12h8M8 16h6"/>',
    passwort: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
    countdown: '<path d="M6 2h12M6 22h12M7 2c0 6 10 6 10 10S7 16 7 22M17 2c0 6-10 6-10 10s10 4 10 10"/>',
    outfits: '<path d="M8 3l4 3 4-3 5 4-3 4-2-1v11H8V10l-2 1-3-4z"/>',
    messenger: '<path d="M4 5h16v11H9l-5 4z"/><path d="M9 10h6"/>',
    admin: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
    konto: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    logout: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>',
    home: '<path d="M4 11l8-7 8 7v9H4z"/>',
    aufgaben: '<rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="10" y="4" width="5" height="11" rx="1.5"/><rect x="17" y="4" width="4" height="7" rx="1.5"/>',
    berichtsheft: '<path d="M6 3h12v18H6z"/><path d="M9 7h6M9 11h6M9 15h3"/><path d="M14 17l1.5 1.5L19 15"/>',
    schule: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2.5 9 2.5 12 0v-5"/>',
    lesezeichen: '<path d="M6 3h12v18l-6-4-6 4z"/>',
    pihole: '<path d="M12 3c4 3 7 3 8 3 0 8-3 13-8 15C7 19 4 14 4 6c1 0 4 0 8-3z"/><path d="M9 12l2 2 4-4"/>',
    monitor: '<path d="M3 12h4l3-7 4 14 3-7h4"/>',
    system: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    protokoll: '<path d="M8 6h12M8 12h12M8 18h12"/><path d="M4 6h.01M4 12h.01M4 18h.01"/>',
    docker: '<path d="M3 13h18c0 4-3.5 7-9 7s-9-3-9-7z"/><path d="M6 13V9h4v4M10 13V9h4v4M10 9V5h4v4M14 13V9h4v4"/>',
    wartung: '<path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4v4h-4"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/>',
    geraete: '<rect x="3" y="14" width="18" height="6" rx="2"/><path d="M7 17h.01M11 17h.01M8 10a6 6 0 0 1 8 0M5 7a10 10 0 0 1 14 0"/>',
    pakete: '<path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10M7.5 5l9 4"/>',
    jellyfin: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="M10 9l5.5 3-5.5 3z"/>',
    cockpit: '<path d="M3 17a9 9 0 1 1 18 0"/><path d="M12 17l4-5"/><circle cx="12" cy="17" r="1.4"/><path d="M5.5 17h1M17.5 17h1M12 9.5v1"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 21a2 2 0 0 0 4 0"/>',
    belloff: '<path d="M6 8a6 6 0 0 1 9.5-4.9M18 8c0 7 3 8 3 8H8"/><path d="M10 21a2 2 0 0 0 4 0M3 3l18 18"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    pin: '<path d="M12 17v5M8 3h8l-1 6 3 3H6l3-3z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5"/>',
    moon: '<path d="M20 14A8 8 0 1 1 10 4a7 7 0 0 0 10 10z"/>',
    auto: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18" /><path d="M12 3a9 9 0 0 1 0 18" fill="currentColor"/>'
  };
  const icon = (name, size = 18) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[name] || ''}</svg>`;

  // Bereiche mit eigener Farbe: [dunkles Design, helles Design]
  const GROUPS = {
    'Alltag':        { c: ['#3ddc97', '#0b8a58'], d: 'Geld, Essen, Routinen' },
    'Organisation':  { c: ['#a78bfa', '#6a46d6'], d: 'Aufgaben, Notizen, Termine' },
    'Ausbildung':    { c: ['#5aa9ff', '#1b66c9'], d: 'Berichtsheft, Schule, C#' },
    'Style & Social':{ c: ['#ff5a6e', '#d02840'], d: 'Outfits und Messenger' },
    'Freizeit':      { c: ['#ffbd4a', '#a86a00'], d: 'Spiele und Entscheidungen' },
    'Werkzeuge':     { c: ['#3cc8d8', '#0a8494'], d: 'Rechner, Passwörter, Reisen' },
    'Technik':       { c: ['#a3e635', '#4d7c0f'], d: 'Pi-hole, Dienste, System' }
  };
  const APPS = [
    { id: 'finanzen', t: 'Finanzen', g: 'Alltag', d: 'Einnahmen, Ausgaben, Sparziele' },
    { id: 'abos', t: 'Abo-Killer', g: 'Alltag', d: 'Abos und Kündigungsfristen' },
    { id: 'kueche', t: 'Küche', g: 'Alltag', d: 'Vorrat, Wochenplan, Einkaufsliste' },
    { id: 'gewohnheiten', t: 'Gewohnheiten', g: 'Alltag', d: 'Streaks, Heatmap, Level' },
    { id: 'aufgaben', t: 'Aufgaben', g: 'Organisation', d: 'Kanban mit Fälligkeiten' },
    { id: 'notizen', t: 'Notizen', g: 'Organisation', d: 'Markdown und Checklisten' },
    { id: 'countdown', t: 'Countdowns', g: 'Organisation', d: 'Urlaub, Geburtstage, Deadlines' },
    { id: 'fokus', t: 'Fokus-Timer', g: 'Organisation', d: 'Pomodoro mit Statistik' },
    { id: 'lesezeichen', t: 'Lesezeichen', g: 'Organisation', d: 'Deine wichtigsten Links' },
    { id: 'wochenbericht', t: 'Wochenbericht', g: 'Organisation', d: 'News montags automatisch' },
    { id: 'berichtsheft', t: 'Berichtsheft', g: 'Ausbildung', d: 'Ausbildungsnachweis pro Woche' },
    { id: 'schule', t: 'Schule', g: 'Ausbildung', d: 'Stundenplan und Notenschnitt' },
    { id: 'lernen', t: 'C#-Trainer', g: 'Ausbildung', d: 'Karteikarten, Quiz, Java → C#' },
    { id: 'tippen', t: 'Tipp-Trainer', g: 'Ausbildung', d: 'Tempo und Genauigkeit, mit Code' },
    { id: 'erklaert', t: 'Erklärt', g: 'Ausbildung', d: 'Netz, Krypto, Motor interaktiv' },
    { id: 'bewerbung', t: 'Bewerbungs-Kit', g: 'Ausbildung', d: 'Lebenslauf, Anschreiben, Interview' },
    { id: 'outfits', t: 'Outfits', g: 'Style & Social', d: '6 neue Looks jeden Montag' },
    { id: 'messenger', t: 'Messenger', g: 'Style & Social', d: 'Ende-zu-Ende-verschlüsselt' },
    { id: 'spiele', t: 'Spielhalle', g: 'Freizeit', d: 'Snake mit Twist, Reaktionstest' },
    { id: 'entscheiden', t: 'Entscheider', g: 'Freizeit', d: 'Matrix oder Glücksrad' },
    { id: 'rechner', t: 'Rechner', g: 'Werkzeuge', d: 'Kredit, Strom, Sparplan, Miete' },
    { id: 'reisen', t: 'Reiseplaner', g: 'Werkzeuge', d: 'Route, Packliste, Budget' },
    { id: 'passwort', t: 'Passwort-Schmiede', g: 'Werkzeuge', d: 'Starke Passwörter, lokal' },
    { id: 'pihole', t: 'Pi-hole', g: 'Technik', d: 'Warnungen, Blockrate, Schalter' },
    { id: 'monitor', t: 'Dienste-Monitor', g: 'Technik', d: 'Erreichbarkeit und Zertifikate' },
    { id: 'system', t: 'System', g: 'Technik', d: 'CPU, RAM, Speicher, Laufzeit' },
    { id: 'protokoll', t: 'Protokoll', g: 'Technik', d: 'Zugriffe, Anmeldungen, Sperren' },
    { id: 'docker', t: 'Docker', g: 'Technik', d: 'Container, Auslastung, Neustarts' },
    { id: 'wartung', t: 'Updates & Backups', g: 'Technik', d: 'Updates, Sicherung, Speicherplatz' },
    { id: 'geraete', t: 'Heimnetz-Geräte', g: 'Technik', d: 'Wer ist im Netz, was ist neu' },
    { id: 'pakete', t: 'Pakete', g: 'Alltag', d: 'Sendungen verfolgen' },
    { id: 'jellyfin', t: 'Jellyfin', g: 'Freizeit', d: 'Filme und Serien vom Server' }
  ].map((a, i) => ({ ...a, nr: String(i + 1).padStart(2, '0') }));
  const isLight = () => document.documentElement.dataset.phase === 'mittag';
  const groupColor = g => (GROUPS[g] || { c: ['#9cc3d5', '#2a6f8f'] }).c[isLight() ? 1 : 0];
  // Seitenfarbe: jede App übernimmt die Farbe ihres Bereichs als Akzent
  function paintApp(id) {
    const app = APPS.find(a => a.id === id); if (!app) return;
    const set = () => { const c = groupColor(app.g), r = document.documentElement.style;
      r.setProperty('--acc', c); r.setProperty('--acc2', c);
      r.setProperty('--acc-ink', isLight() ? '#fff' : '#0b0d10');
      r.setProperty('--glow', `color-mix(in srgb, ${c} 16%, transparent)`); };
    set(); document.addEventListener('wb-theme', set); setInterval(set, 60000);
  }

  // ---------- Tageszeit-Theme ----------
  const phaseFor = (h) => h >= 5 && h < 10 ? 'morgen' : h >= 10 && h < 17 ? 'mittag' : h >= 17 && h < 22 ? 'abend' : 'nacht';
  const PHASE_NAME = { morgen: 'Morgen', mittag: 'Mittag', abend: 'Abend', nacht: 'Nacht' };
  function themeMode() { try { return localStorage.getItem('wb-theme') || 'auto'; } catch { return 'auto'; } }
  function applyTheme() {
    const m = themeMode();
    const p = m === 'hell' ? 'mittag' : m === 'dunkel' ? 'nacht' : phaseFor(new Date().getHours());
    document.documentElement.dataset.phase = p;
    document.documentElement.dataset.mode = m;
    return p;
  }
  function cycleTheme() {
    const order = ['auto', 'hell', 'dunkel'];
    const next = order[(order.indexOf(themeMode()) + 1) % 3];
    try { localStorage.setItem('wb-theme', next); } catch {}
    applyTheme(); document.dispatchEvent(new CustomEvent('wb-theme'));
    toast({ auto: 'Design folgt der Tageszeit', hell: 'Immer hell', dunkel: 'Immer dunkel' }[next]);
  }
  applyTheme();
  setInterval(applyTheme, 60000);

  // ---------- Server-API (Login-Session per Cookie, CSRF-Header) ----------
  async function api(url, opt = {}) {
    const o = { method: opt.method || 'GET', headers: { 'X-WB': '1' }, cache: 'no-store' };
    if (opt.body !== undefined) { o.headers['Content-Type'] = 'application/json'; o.body = JSON.stringify(opt.body); }
    const r = await fetch(url, o);
    if (r.status === 401) { location.href = '/login?next=' + encodeURIComponent(location.pathname); throw new Error('Nicht angemeldet'); }
    const txt = await r.text(); let data; try { data = txt ? JSON.parse(txt) : null; } catch { data = txt; }
    if (r.status === 403 && data && data.setup2fa && location.pathname !== '/apps/konto') location.href = '/apps/konto';
    if (!r.ok) throw new Error((data && data.error) || ('Fehler ' + r.status));
    return data;
  }
  let meP = null;
  const me = () => meP || (meP = api('/api/auth/me').then(r => r.user));

  // ---------- Speicher: pro Nutzer auf dem Server (Docker-Volume) ----------
  const Store = {
    _t: {}, _p: {},
    async get(key, def) {
      try { const v = await api('/api/data/' + key); return v === null ? clone(def) : v; } // null = noch nichts gespeichert
      catch (e) { toast('Laden fehlgeschlagen: ' + e.message); return clone(def); }
    },
    set(key, val) {
      clearTimeout(this._t[key]);
      const body = JSON.stringify(val);
      this._p[key] = body;
      this._t[key] = setTimeout(() => this._send(key), 300);
    },
    _send(key) {
      const body = this._p[key]; if (body === undefined) return Promise.resolve(); delete this._p[key];
      return fetch('/api/data/' + key, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-WB': '1' }, body, keepalive: body.length < 60000 })
        .then(r => { if (!r.ok) toast('Speichern fehlgeschlagen'); }).catch(() => toast('Server nicht erreichbar, nicht gespeichert'));
    },
    flush() { return Promise.all(Object.keys(this._p).map(k => { clearTimeout(this._t[k]); return this._send(k); })); }
  };
  window.addEventListener('pagehide', () => Store.flush());
  const clone = v => v === undefined ? v : JSON.parse(JSON.stringify(v));

  // ---------- kleine Helfer ----------
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
  const eur = (n, d = 2) => (isFinite(n) ? n : 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: d, maximumFractionDigits: d });
  const num = (n, d = 0) => (isFinite(n) ? n : 0).toLocaleString('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
  const today = () => ymd(new Date());
  const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const parseYmd = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const fmtDate = (s, o = { day: '2-digit', month: '2-digit', year: 'numeric' }) => s ? (typeof s === 'string' && s.length === 10 ? parseYmd(s) : new Date(s)).toLocaleDateString('de-DE', o) : '';
  const daysBetween = (a, b) => Math.round((parseYmd(b) - parseYmd(a)) / 864e5);
  const pf = v => parseFloat(String(v).replace(/\./g, '').replace(',', '.')) || 0; // deutsche Zahleneingabe
  const debounce = (fn, ms = 200) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  let toastEl;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add('show');
    clearTimeout(toastEl._t); toastEl._t = setTimeout(() => toastEl.classList.remove('show'), 2200);
  }
  function download(name, content, type = 'text/plain') {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([content], { type }));
    a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // ---------- Gemeinsamer Bearbeiten-Dialog ----------
  // fields: [{ k, l, type: 'text'|'number'|'date'|'time'|'textarea'|'select'|'color', v, opts: [[wert, text]], req }]
  function editForm(title, fields, { danger } = {}) {
    return new Promise(done => {
      const d = document.createElement('dialog');
      d.innerHTML = `<form method="dialog" class="stack"><h3>${esc(title)}</h3>${fields.map((f, i) => `<label class="field"><span>${esc(f.l)}</span>${
        f.type === 'textarea' ? `<textarea data-i="${i}">${esc(f.v ?? '')}</textarea>` :
        f.type === 'select' ? `<select data-i="${i}">${f.opts.map(([v, t]) => `<option value="${esc(v)}" ${String(v) === String(f.v) ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>` :
        `<input data-i="${i}" type="${f.type || 'text'}" value="${esc(f.v ?? '')}" ${f.req ? 'required' : ''} ${f.type === 'number' ? 'step="any"' : ''}>`}</label>`).join('')}
        <div class="row">${danger ? `<button value="delete" class="ghost danger" formnovalidate>${esc(danger)}</button>` : ''}<span class="grow"></span><button value="cancel" class="ghost" formnovalidate>Abbrechen</button><button value="ok" class="primary">Speichern</button></div></form>`;
      document.body.appendChild(d); d.showModal();
      d.addEventListener('close', () => { const rv = d.returnValue;
        if (rv === 'ok') { const out = {}; fields.forEach((f, i) => { const el = d.querySelector(`[data-i="${i}"]`); out[f.k] = f.type === 'number' ? (parseFloat(el.value) || 0) : el.value.trim(); }); done(out); }
        else done(rv === 'delete' ? 'delete' : null);
        d.remove(); });
    });
  }

  // ---------- Kopfzeile für Unterseiten ----------
  function header(id) {
    const app = APPS.find(a => a.id === id);
    document.title = (app ? app.t + ' · ' : '') + 'Werkbank';
    paintApp(id);
    const el = document.createElement('header');
    el.className = 'top no-print';
    el.innerHTML = `<div class="in">
      <a class="crumb" href="/" title="Zur Werkbank (Esc)"><span class="home">${icon('home', 15)}</span>Werkbank <span>/</span>
      ${app ? `<span class="idx">${esc(app.g)}</span> <span>/</span> <b>${esc(app.t)}</b>` : ''}</a>
      <span class="clock mono" id="wb-clock"></span>
      <button class="ghost icon" id="wb-theme" title="Design umschalten"></button>
      <a class="btn ghost sm" href="/apps/konto" id="wb-user" title="Mein Konto">${icon('konto', 15)}<span></span></a>
      <button class="ghost icon" id="wb-out" title="Abmelden (überall in der Werkbank)">${icon('logout', 17)}</button>
    </div>`;
    document.body.prepend(el);
    const lbl = document.querySelector('.page-head .label'); if (lbl && app) { lbl.innerHTML = `<span class="dot"></span>${esc(app.g)}`; lbl.classList.add('glabel'); }
    if (app) { const ic = document.createElement('span'); ic.className = 'app-ico'; ic.innerHTML = icon(app.id, 22); const h1 = document.querySelector('.page-head h1'); if (h1) h1.prepend(ic); }
    const tb = el.querySelector('#wb-theme');
    const setIcon = () => { const m = themeMode(); tb.innerHTML = icon(m === 'hell' ? 'sun' : m === 'dunkel' ? 'moon' : 'auto', 17); };
    tb.onclick = cycleTheme; setIcon(); document.addEventListener('wb-theme', setIcon);
    me().then(u => { el.querySelector('#wb-user span').textContent = u.shown; }).catch(() => {});
    el.querySelector('#wb-out').onclick = logout;
    const c = el.querySelector('#wb-clock');
    const tick = () => { c.textContent = new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }); };
    tick(); setInterval(tick, 10000);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !document.querySelector('dialog[open]') && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) location.href = '/';
    });
  }

  async function logout() { await Store.flush(); try { await api('/api/auth/logout', { method: 'POST' }); } catch {} location.href = '/login?bye=1'; }

  window.WB = { editForm, api, me, logout, APPS, GROUPS, groupColor, isLight, icon, Store, $, $$, esc, uid, eur, num, today, ymd, parseYmd, fmtDate, daysBetween, pf, debounce, toast, download, header, applyTheme, cycleTheme, themeMode, phaseFor, PHASE_NAME };
})();
