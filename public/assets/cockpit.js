// Werkbank – Cockpit: Anzeigen wie im Auto, links und rechts auf der Startseite.
// Welche Anzeige wo steht, stellt jeder selbst ein (gespeichert unter „cockpit“). Ob jemand das Cockpit sehen darf, legt die Verwaltung fest.
(function () {
  'use strict';
  const { esc, icon } = WB;

  const css = `
  /* Flach und ruhig: keine Kacheln, nur feine Trennlinien */
  .ckw { --s1: #3987e5; --s2: #d95926; position: relative; min-width: 0; padding: 11px 0; }
  :root[data-light] .ckw { --s1: #2a78d6; --s2: #eb6834; }
  .ck > .ckw + .ckw, .ck-row .ckw { border-top: 1px solid var(--line); }
  .ckw .label { display:flex; flex-wrap: wrap; justify-content: space-between; gap: 2px 8px; letter-spacing: .08em; font-size: 10px; color: var(--faint); }
  .ckw .sub { font: 500 10.5px var(--f-mono); color: var(--faint); white-space: nowrap; overflow:hidden; text-overflow: ellipsis; }
  .ckw .state { font: 600 10px var(--f-mono); letter-spacing: .06em; white-space: nowrap; } .ckw .state.warn { color: var(--warn); } .ckw .state.bad { color: var(--bad); }
  .dial { display:flex; align-items:center; gap: 11px; } .dial > div { flex: 1; min-width: 0; }
  .gauge { display:block; width: 60px; flex: none; }
  .gauge .track { fill:none; stroke: var(--line2); stroke-width: 15; stroke-linecap: round; opacity: .55; }
  .gauge .val { fill:none; stroke: var(--acc); stroke-width: 15; stroke-linecap: round; transition: stroke-dasharray .8s var(--ease), stroke .3s; }
  .gauge.warn .val { stroke: var(--warn); } .gauge.bad .val { stroke: var(--bad); }
  .gauge .red { fill:none; stroke: var(--bad); stroke-width: 5; }
  .gauge .tick { stroke: var(--faint); stroke-width: 4; }
  .gauge .needle { transition: transform .9s cubic-bezier(.3,1.3,.5,1); transform-origin: 100px 100px; }
  .gauge .needle path { fill: var(--text); } .gauge .hub { fill: var(--bg); stroke: var(--text); stroke-width: 6; }
  .read { display:flex; align-items: baseline; gap: 3px; margin: 1px 0; } .read .num { font: 700 20px/1.15 var(--f-mono); letter-spacing: -.04em; } .read .unit { font: 500 11px var(--f-mono); color: var(--mute); }
  .tank { display:grid; grid-template-columns: repeat(14, 1fr); gap: 2px; margin: 7px 0 5px; } .tank i { height: 5px; border-radius: 2px; background: var(--line); }
  .tank i.on { background: var(--acc); } .tank.warn i.on { background: var(--warn); } .tank.bad i.on { background: var(--bad); }
  .line { display:flex; justify-content: space-between; align-items: baseline; flex-wrap: wrap; gap: 0 8px; } .big { font: 700 13px var(--f-mono); white-space: nowrap; }
  .net { display:flex; justify-content: space-between; flex-wrap: wrap; gap: 2px 8px; margin-top: 6px; } .net span { white-space: nowrap; } .net i { font: 700 12px var(--f-mono); font-style: normal; color: var(--faint); margin-right: 4px; } .net b { font: 600 13px var(--f-mono); }
  .odo { display:flex; align-items: center; flex-wrap: wrap; gap: 7px; margin-top: 6px; }
  .odo > div { display:flex; align-items: baseline; gap: 3px; } .odo small { font: 10px var(--f-mono); color: var(--faint); }
  .odo span { display:inline-flex; gap: 1px; } .odo i { font: 700 12px/18px var(--f-mono); font-style: normal; width: 11px; border-radius: 3px; text-align:center; background: var(--bg2); border: 1px solid var(--line); }
  .lamps { display:flex; flex-wrap: wrap; gap: 5px; margin-top: 7px; }
  .lamp { position: relative; text-decoration:none; color: inherit; border-radius: 50%; }
  .lamp .bulb { width: 27px; height: 27px; border-radius: 50%; display:grid; place-items:center; border: 1px solid var(--line); color: var(--faint); transition: background .3s, color .3s, border-color .3s; }
  .lamp .bulb svg { width: 14px; height: 14px; }
  .lamp.ok .bulb { color: color-mix(in srgb, var(--good) 80%, var(--faint)); }
  .lamp.warn .bulb { color: #1a1200; background: var(--warn); border-color: var(--warn); box-shadow: 0 0 9px 0 color-mix(in srgb, var(--warn) 55%, transparent); }
  .lamp.bad .bulb { color: #fff; background: var(--bad); border-color: var(--bad); box-shadow: 0 0 10px 1px color-mix(in srgb, var(--bad) 55%, transparent); }
  a.lamp:hover .bulb { border-color: var(--text); }
  .lamp b, .lamp small { position:absolute; left: 0; top: 0; width: 1px; height: 1px; overflow:hidden; clip-path: inset(50%); white-space: nowrap; }
  .alerts:empty { display:none; } .alerts { margin-top: 7px; display:flex; flex-direction: column; gap: 3px; }
  .alerts > * { display:flex; align-items:center; gap: 7px; font-size: 11.5px; color: var(--text); text-decoration:none; min-width: 0; } a.al:hover span { text-decoration: underline; }
  .alerts i { width: 6px; height: 6px; border-radius: 50%; background: var(--warn); flex: none; } .alerts .bad i { background: var(--bad); }
  .alerts span { white-space: nowrap; overflow:hidden; text-overflow: ellipsis; } .alerts em { font-style: normal; color: var(--mute); }
  .trace { position: relative; margin-top: 7px; } .trace svg { display:block; width: 100%; height: 36px; overflow: visible; }
  .trace .gl { stroke: var(--line); stroke-width: 1; } .trace polyline { fill: none; stroke-width: 1.8; stroke-linejoin: round; stroke-linecap: round; vector-effect: non-scaling-stroke; }
  .trace .s1 { stroke: var(--s1); } .trace .s2 { stroke: var(--s2); } .trace .cross { stroke: var(--mute); stroke-width: 1; vector-effect: non-scaling-stroke; }
  .trace .tip { position:absolute; bottom: calc(100% + 2px); z-index: 2; pointer-events:none; background: var(--text); color: var(--bg); border-radius: 7px; padding: 3px 7px; font: 600 10px var(--f-mono); white-space: nowrap; }
  .legend { display:flex; justify-content: space-between; gap: 8px; font: 500 10.5px var(--f-mono); color: var(--faint); margin-top: 4px; } .legend i { display:inline-block; width: 10px; height: 2px; border-radius: 2px; vertical-align: middle; margin-right: 5px; }
  .trace .wait { padding: 11px 0; }
  /* Seitenspalten ohne Scrollen: Stufe 1 und 2 rücken enger zusammen (siehe fit) */
  .ck-c1 .ckw { padding: 7px 0; } .ck-c1 .gauge { width: 50px; } .ck-c1 .read .num { font-size: 17px; } .ck-c1 .lamps, .ck-c1 .alerts { margin-top: 5px; } .ck-c1 .trace { margin-top: 4px; } .ck-c1 .trace svg { height: 28px; } .ck-c1 .trace .wait { padding: 7px 0; }
  .ck-c2 .ckw { padding: 4px 0; } .ck-c2 .gauge { width: 42px; } .ck-c2 .sub:not(.wait), .ck-c2 .legend { display:none; } .ck-c2 .lamp .bulb { width: 23px; height: 23px; } .ck-c2 .trace svg { height: 22px; }
  .ckset { display:flex; flex-direction:column; } .ckset .cs { display:flex; gap: 8px; align-items:center; padding: 7px 0; border-bottom: 1px solid var(--line); } .ckset .cs:last-child { border:0; }
  .ckset .cs select { width: auto; } .ckset .cs.off b { color: var(--faint); }
  `;
  document.head.insertAdjacentHTML('beforeend', `<style>${css}</style>`);

  const L = {
    disk: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    temp: '<path d="M10 14V5a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0z"/><path d="M12 11v6"/>',
    daten: '<path d="M3 12h4l3-7 4 14 3-7h4"/>',
    updates: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    neustart: '<path d="M12 3v8"/><path d="M7 6.5a8 8 0 1 0 10 0"/>',
    sicherung: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
    docker: '<path d="M3 13h18c0 4-3.5 7-9 7s-9-3-9-7z"/><path d="M6 13V9h4v4M10 13V9h4v4M10 9V5h4v4M14 13V9h4v4"/>',
    dienste: '<circle cx="12" cy="12" r="2"/><path d="M8 8a6 6 0 0 0 0 8M16 8a6 6 0 0 1 0 8M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14"/>',
    pihole: '<path d="M12 3c4 3 7 3 8 3 0 8-3 13-8 15C7 19 4 14 4 6c1 0 4 0 8-3z"/><path d="M8 12h8"/>',
    sperren: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/>',
    geraete: '<rect x="3" y="14" width="18" height="6" rx="2"/><path d="M7 17h.01M11 17h.01M8 10a6 6 0 0 1 8 0M5 7a10 10 0 0 1 14 0"/>'
  };
  const lampIcon = id => `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${L[id] || ''}</svg>`;

  const level = (v, warn, bad) => v >= bad ? 'bad' : v >= warn ? 'warn' : '';
  const WORD = { '': '', warn: 'HOCH', bad: 'KRITISCH' };
  const gb = b => (b / 1073741824).toLocaleString('de-DE', { maximumFractionDigits: b < 107374182400 ? 1 : 0 }) + ' GB';
  const rate = b => b >= 1e6 ? (b / 1e6).toLocaleString('de-DE', { maximumFractionDigits: 1 }) + ' MB/s' : b >= 1e3 ? Math.round(b / 1e3) + ' kB/s' : b + ' B/s';
  const $q = (el, s) => el.querySelector(s);

  // ---------- Rundinstrument ----------
  const polar = (deg, r) => { const a = deg * Math.PI / 180; return [(100 + r * Math.cos(a)).toFixed(2), (100 + r * Math.sin(a)).toFixed(2)]; };
  const arc = (a, b, r) => `M${polar(a, r)} A${r} ${r} 0 ${b - a > 180 ? 1 : 0} 1 ${polar(b, r)}`;
  function gauge({ min, max, red }) {
    const start = 135, sweep = 270, ang = v => start + sweep * (Math.max(min, Math.min(max, v)) - min) / (max - min);
    const ticks = [0, .25, .5, .75, 1].map(p => { const a = start + sweep * p; return `<line class="tick" x1="${polar(a, 66)[0]}" y1="${polar(a, 66)[1]}" x2="${polar(a, 56)[0]}" y2="${polar(a, 56)[1]}"/>`; }).join('');
    const html = `<svg class="gauge" viewBox="0 0 200 172" role="img"><path class="track" d="${arc(start, start + sweep, 80)}"/><path class="val" d="${arc(start, start + sweep, 80)}" pathLength="100" stroke-dasharray="0 200"/>
      <path class="red" d="${arc(ang(red), start + sweep, 96)}"/>${ticks}<g class="needle" style="transform: rotate(${start}deg)"><path d="M100 94 L166 98.5 L166 101.5 L100 106 Z"/></g><circle class="hub" cx="100" cy="100" r="11"/></svg>`;
    return { html, set(el, v, cls, label) { const s = $q(el, '.gauge'); s.setAttribute('class', 'gauge ' + cls); s.setAttribute('aria-label', label);
      const part = v === null ? 0 : (ang(v) - start) / sweep * 100; $q(s, '.val').style.strokeDasharray = `${part} 200`; $q(s, '.val').style.opacity = part ? 1 : 0;
      $q(s, '.needle').style.transform = `rotate(${v === null ? start : ang(v)}deg)`; $q(el, '.num').textContent = v === null ? '–' : Math.round(v); } };
  }
  const head = title => `<div class="label"><span>${title}</span><span class="state"></span></div>`;
  const state = (el, cls) => { const s = $q(el, '.state'); s.className = 'state ' + cls; s.textContent = WORD[cls]; };
  const round = (name, title, opt, read) => { const g = gauge(opt); return { t: name, create: el => { el.innerHTML = `<div class="dial">${g.html}<div>${head(title)}<div class="read"><b class="num">–</b><span class="unit">${opt.unit}</span></div><div class="sub"></div></div></div>`; },
    update(el, d) { const r = read(d); g.set(el, r.v, r.cls, `${name}: ${r.v === null ? 'unbekannt' : Math.round(r.v) + ' ' + opt.unit}`); state(el, r.cls); $q(el, '.sub').textContent = r.sub; el.title = r.hint || ''; } }; };

  // ---------- Anzeigen ----------
  const full = { min: 0, max: 100, red: 85, unit: '%' };
  const num = x => x.toLocaleString('de-DE');
  const WIDGETS = {
    tacho: round('Prozessor', 'Prozessor', full, d => ({ v: d.cpu, cls: level(d.cpu, 75, 90), sub: `Last ${num(d.load[0])}`, hint: `Last ${d.load.map(num).join(' · ')} · ${d.cores} Kerne` })),
    ram: round('Arbeitsspeicher', 'RAM', full, d => { const p = d.mem.used / d.mem.total * 100; return { v: p, cls: level(p, 80, 92), sub: `${gb(d.mem.used).replace(' GB', '')} / ${gb(d.mem.total)}`, hint: `${gb(d.mem.used)} von ${gb(d.mem.total)} belegt` }; }),
    temp: round('Temperatur', 'Temperatur', { min: 30, max: 100, red: 85, unit: '°C' }, d => ({ v: d.temp, cls: d.temp === null ? '' : level(d.temp, 75, 90), sub: d.temp === null ? 'Kein Sensor' : '', hint: 'Prozessor' })),
    tank: { t: 'Speicherplatz', create: el => { el.innerHTML = head('Speicher') + `<div class="tank">${'<i></i>'.repeat(14)}</div><div class="line"><span class="big">–</span><span class="sub"></span></div>`; },
      update(el, d) { const k = d.disk; if (!k) { $q(el, '.sub').textContent = 'unbekannt'; return; } const free = 100 - k.percent, cls = level(k.percent, 85, 95), n = Math.round(free / 100 * 14);
        $q(el, '.tank').className = 'tank ' + cls; el.querySelectorAll('.tank i').forEach((x, i) => x.className = i < n ? 'on' : ''); state(el, cls); if (cls) $q(el, '.state').textContent = cls === 'bad' ? 'FAST LEER' : 'RESERVE';
        $q(el, '.big').textContent = free + ' % frei'; $q(el, '.sub').textContent = gb(k.free); el.title = `${gb(k.free)} von ${gb(k.total)} frei`; } },
    netz: { t: 'Netzwerk', create: el => { el.innerHTML = head('Netzwerk') + '<div class="net"><span title="Download"><i>↓</i><b data-n="rx">–</b></span><span title="Upload"><i>↑</i><b data-n="tx">–</b></span></div><div class="sub"></div>'; },
      update(el, d) { for (const k of ['rx', 'tx']) $q(el, `[data-n="${k}"]`).textContent = d.net ? rate(d.net[k]) : '–';
        $q(el, '.sub').textContent = d.net ? '' : 'Noch keine Messung'; el.title = d.net ? 'Mittel der letzten Minute' : 'Noch keine Messung vom Server'; } },
    trip: { t: 'Laufzeit', create: el => { el.innerHTML = head('Laufzeit') + '<div class="odo"></div>'; },
      update(el, d) { const s = d.uptime, box = (v, n, l) => `<div><span>${String(v).padStart(n, '0').split('').map(c => `<i>${c}</i>`).join('')}</span><small>${l}</small></div>`;
        $q(el, '.odo').innerHTML = box(Math.floor(s / 86400), 3, 'T') + box(Math.floor(s / 3600) % 24, 2, 'Std') + box(Math.floor(s / 60) % 60, 2, 'Min');
        el.title = 'Server läuft seit ' + new Date(Date.now() - s * 1000).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' }); } },
    // Alle Leuchten als kleine Symbole (Name beim Überfahren); ausgeschrieben wird nur, was gerade leuchtet
    lampen: { t: 'Kontrollleuchten', wide: true, create: el => { el.innerHTML = head('Kontrollleuchten') + '<div class="lamps"></div><div class="alerts"></div>'; },
      update(el, d, ctx) { const tag = l => l.app && ctx.apps.includes(l.app) ? ['a', `href="/apps/${esc(l.app)}"`] : ['div', ''];
        const on = d.lamps.filter(l => l.state === 'bad' || l.state === 'warn');
        const html = d.lamps.map(l => { const [t, href] = tag(l); return `<${t} class="lamp ${esc(l.state)}" title="${esc(l.label + ': ' + l.text)}" ${href}><span class="bulb">${lampIcon(l.id)}</span><b>${esc(l.label)}</b><small>${esc(l.text)}</small></${t}>`; }).join('');
        const list = on.map(l => { const [t, href] = tag(l); return `<${t} class="al ${esc(l.state)}" ${href}><i></i><span>${esc(l.label)} <em>${esc(l.text)}</em></span></${t}>`; }).join('');
        for (const [sel, h] of [['.lamps', html], ['.alerts', list]]) { const box = $q(el, sel); if (box._h !== h) box.innerHTML = box._h = h; }
        const s = $q(el, '.state'); s.className = 'state ' + (on.length ? 'warn' : ''); s.textContent = on.length ? on.length + ' AN' : 'ALLES OK'; } },
    verlauf: { t: 'Verlauf CPU/RAM', wide: true, create: el => { el.innerHTML = head('Verlauf') + '<div class="trace"></div><div class="legend"><span><i style="background:var(--s1)"></i>CPU <b data-v="cpu"></b></span><span><i style="background:var(--s2)"></i>RAM <b data-v="mem"></b></span></div>';
        const t = $q(el, '.trace');
        t.addEventListener('pointermove', e => { const h = t._h; if (!h) return; const r = t.getBoundingClientRect(), i = Math.max(0, Math.min(h.length - 1, Math.round((e.clientX - r.left) / r.width * (h.length - 1)))), x = i / (h.length - 1) * 200, c = $q(t, '.cross'), tip = $q(t, '.tip');
          c.setAttribute('x1', x); c.setAttribute('x2', x); c.style.display = ''; tip.hidden = false; tip.textContent = `${new Date(h[i].t).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} · CPU ${h[i].cpu} % · RAM ${h[i].mem} %`;
          tip.style.left = Math.max(0, Math.min(r.width - tip.offsetWidth, x / 200 * r.width - tip.offsetWidth / 2)) + 'px'; });
        t.addEventListener('pointerleave', () => { const c = $q(t, '.cross'), tip = $q(t, '.tip'); if (c) c.style.display = 'none'; if (tip) tip.hidden = true; }); },
      update(el, d) { const t = $q(el, '.trace'), h = d.hist, last = h[h.length - 1];
        $q(el, '[data-v="cpu"]').textContent = last ? last.cpu + ' %' : ''; $q(el, '[data-v="mem"]').textContent = last ? last.mem + ' %' : '';
        $q(el, '.state').textContent = h.length > 1 ? `${Math.max(1, Math.round((last.t - h[0].t) / 60000))} MIN` : '';
        if (h.length < 2) { t._h = null; t.innerHTML = '<div class="sub wait">Sammelt noch Daten …</div>'; return; }
        if (t._h && t._h.length === h.length && t._h[t._h.length - 1].t === last.t) return; t._h = h;
        const line = k => h.map((p, i) => `${(i / (h.length - 1) * 200).toFixed(1)},${(90 - p[k] * .88).toFixed(1)}`).join(' ');
        t.innerHTML = `<svg viewBox="0 0 200 92" preserveAspectRatio="none" role="img" aria-label="Auslastung von Prozessor und Arbeitsspeicher">${[2, 46, 90].map(y => `<line class="gl" x1="0" x2="200" y1="${y}" y2="${y}" vector-effect="non-scaling-stroke"/>`).join('')}
          <polyline class="s1" points="${line('cpu')}"/><polyline class="s2" points="${line('mem')}"/><line class="cross" y1="0" y2="92" style="display:none"/></svg><div class="tip" hidden></div>`; } }
  };
  const DEFAULT = { on: true, left: ['tacho', 'ram', 'temp', 'verlauf'], right: ['tank', 'lampen', 'netz', 'trip'] };

  function normalize(c) {
    if (!c || typeof c !== 'object') return JSON.parse(JSON.stringify(DEFAULT));
    const seen = new Set(), list = l => (Array.isArray(l) ? l : []).filter(id => Object.hasOwn(WIDGETS, id) && !seen.has(id) && seen.add(id));
    return { on: c.on !== false, left: list(c.left), right: list(c.right) };
  }

  // Baut die gewählten Anzeigen in die angegebenen Behälter. Gibt eine Funktion zum Aktualisieren zurück.
  function mount(targets, ctx) {
    const made = [];
    for (const [box, ids] of targets) { box.innerHTML = ''; for (const id of ids) { const w = WIDGETS[id], el = document.createElement('section'); el.className = 'ckw ck-' + id + (w.wide ? ' wide' : ''); w.create(el); box.appendChild(el); made.push([w, el]); } }
    return data => made.forEach(([w, el]) => w.update(el, data, ctx));
  }

  // Passt eine Seitenspalte ohne Scrollen in ihre Höhe: erst enger zusammenrücken, als letztes Mittel verkleinern
  function fit(box) {
    const items = [...box.children], over = () => box.scrollHeight > box.clientHeight + 1;
    const base = +getComputedStyle(document.documentElement).getPropertyValue('--ck-scale') || 1; // eigene Größe aus den Einstellungen
    box.classList.remove('ck-c1', 'ck-c2'); items.forEach(el => el.style.zoom = base === 1 ? '' : base);
    for (const step of ['ck-c1', 'ck-c2']) { if (!over()) return; box.classList.add(step); }
    for (let z = base * .975; over() && z > .3; z -= .025) items.forEach(el => el.style.zoom = z.toFixed(3));
  }

  // Einstellungen: pro Anzeige links, rechts oder aus, dazu die Reihenfolge
  function settings(host, cfg, onChange) {
    const draw = focus => {
      const rows = [...cfg.left.map(id => [id, 'left']), ...cfg.right.map(id => [id, 'right']), ...Object.keys(WIDGETS).filter(id => !cfg.left.includes(id) && !cfg.right.includes(id)).map(id => [id, ''])];
      host.innerHTML = `<label class="row" style="gap:10px;margin-bottom:8px"><input type="checkbox" data-ck-on ${cfg.on ? 'checked' : ''}> Cockpit auf der Startseite anzeigen</label><div class="ckset">${rows.map(([id, side]) => { const l = side ? cfg[side] : [], i = l.indexOf(id);
        return `<div class="cs ${side ? '' : 'off'}" data-w="${id}"><b class="grow" style="font-size:13.5px">${esc(WIDGETS[id].t)}</b>
          <button type="button" class="ghost sm" data-mv="-1" title="nach oben" ${side && i > 0 ? '' : 'disabled'}>↑</button><button type="button" class="ghost sm" data-mv="1" title="nach unten" ${side && i < l.length - 1 ? '' : 'disabled'}>↓</button>
          <select class="sm" data-side aria-label="Platz für ${esc(WIDGETS[id].t)}"><option value="left" ${side === 'left' ? 'selected' : ''}>Links</option><option value="right" ${side === 'right' ? 'selected' : ''}>Rechts</option><option value="" ${side ? '' : 'selected'}>Aus</option></select></div>`; }).join('')}</div>
        <div class="row end" style="margin-top:10px"><button type="button" class="ghost sm" data-ck-reset>Standard wiederherstellen</button></div>`;
      if (focus) host.querySelector(focus)?.focus();
    };
    host.onchange = e => { const t = e.target;
      if ('ckOn' in t.dataset) cfg.on = t.checked;
      else if ('side' in t.dataset) { const id = t.closest('[data-w]').dataset.w; cfg.left = cfg.left.filter(x => x !== id); cfg.right = cfg.right.filter(x => x !== id); if (t.value) cfg[t.value].push(id); draw(`[data-w="${id}"] select`); }
      else return; onChange(cfg); };
    host.onclick = e => { const b = e.target.closest('button'); if (!b) return;
      if ('ckReset' in b.dataset) Object.assign(cfg, JSON.parse(JSON.stringify(DEFAULT)));
      else if (b.dataset.mv) { const id = b.closest('[data-w]').dataset.w, l = cfg.left.includes(id) ? cfg.left : cfg.right, i = l.indexOf(id), j = i + +b.dataset.mv; if (i < 0 || j < 0 || j >= l.length) return; [l[i], l[j]] = [l[j], l[i]]; }
      else return; draw(); onChange(cfg); };
    draw();
  }

  WB.Cockpit = { WIDGETS, DEFAULT, normalize, mount, settings, fit };
})();
