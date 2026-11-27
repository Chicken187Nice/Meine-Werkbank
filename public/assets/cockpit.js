// Werkbank – Cockpit: Anzeigen wie im Auto, links und rechts auf der Startseite.
// Welche Anzeige wo steht, stellt jeder selbst ein (gespeichert unter „cockpit“). Ob jemand das Cockpit sehen darf, legt die Verwaltung fest.
(function () {
  'use strict';
  const { esc, icon } = WB;

  const css = `
  .ckw { --s1: #3987e5; --s2: #d95926; background: linear-gradient(170deg, var(--bg3), var(--bg2) 60%); border: 1px solid var(--line); border-radius: 18px; padding: 14px; position: relative; min-width: 0;
    box-shadow: 0 1px 0 color-mix(in srgb, var(--text) 6%, transparent) inset, 0 14px 30px -24px rgba(0,0,0,.7); }
  [data-phase="mittag"] .ckw { --s1: #2a78d6; --s2: #eb6834; }
  .ckw > .label { display:flex; justify-content: space-between; gap: 8px; }
  .ckw .sub { font: 500 11.5px var(--f-mono); color: var(--mute); text-align:center; }
  .ckw .state { font: 600 11px var(--f-mono); letter-spacing: .06em; white-space: nowrap; } .ckw .state.warn { color: var(--warn); } .ckw .state.bad { color: var(--bad); }
  .gauge { display:block; width: 100%; max-width: 230px; margin: 4px auto 0; }
  .gauge .track { fill:none; stroke: var(--line2); stroke-width: 9; stroke-linecap: round; opacity: .55; }
  .gauge .val { fill:none; stroke: var(--acc); stroke-width: 9; stroke-linecap: round; transition: stroke-dasharray .8s var(--ease), stroke .3s; }
  .gauge.warn .val { stroke: var(--warn); } .gauge.bad .val { stroke: var(--bad); }
  .gauge .red { fill:none; stroke: var(--bad); stroke-width: 2.5; }
  .gauge .tick { stroke: var(--faint); stroke-width: 1.2; } .gauge .tick.big { stroke: var(--mute); stroke-width: 2; }
  .gauge text { fill: var(--faint); font: 500 9px var(--f-mono); text-anchor: middle; }
  .gauge text.num { fill: var(--text); font: 700 30px var(--f-mono); letter-spacing: -.04em; } .gauge text.unit { fill: var(--mute); font-size: 10px; }
  .gauge .needle { transition: transform .9s cubic-bezier(.3,1.3,.5,1); transform-origin: 100px 100px; }
  .gauge .needle path { fill: var(--text); } .gauge .hub { fill: var(--bg2); stroke: var(--text); stroke-width: 2.5; }
  .tank { display:grid; grid-template-columns: repeat(14, 1fr); gap: 2px; margin: 14px 0 4px; } .tank i { height: 26px; border-radius: 3px; background: var(--line); }
  .tank i.on { background: var(--acc); } .tank.warn i.on { background: var(--warn); } .tank.bad i.on { background: var(--bad); }
  .ef { display:flex; justify-content: space-between; font: 700 11px var(--f-mono); color: var(--mute); margin-bottom: 8px; }
  .big { font: 700 26px/1.1 var(--f-mono); text-align:center; letter-spacing: -.03em; }
  .net { display:grid; grid-template-columns: 22px 1fr; gap: 4px 8px; align-items:center; margin-top: 12px; }
  .net b { font: 600 17px var(--f-mono); white-space: nowrap; } .net .ar { font: 700 16px var(--f-mono); color: var(--mute); }
  .net .bar { grid-column: 2; height: 5px; margin-bottom: 4px; }
  .odo { display:flex; justify-content: center; align-items:flex-end; gap: 8px; margin: 14px 0 8px; }
  .odo > div { text-align:center; } .odo small { display:block; font: 10px var(--f-mono); color: var(--faint); margin-top: 4px; }
  .odo span { display:inline-flex; gap: 2px; } .odo i { font: 700 19px/30px var(--f-mono); font-style: normal; width: 19px; height: 30px; border-radius: 5px; text-align:center; background: var(--bg); border: 1px solid var(--line2);
    box-shadow: 0 6px 8px -6px rgba(0,0,0,.6) inset, 0 -6px 8px -6px rgba(0,0,0,.6) inset; }
  .lamps { display:grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 8px; margin-top: 12px; }
  .lamp { display:flex; flex-direction: column; align-items:center; gap: 4px; text-align:center; text-decoration:none; color: inherit; min-width: 0; padding: 4px 2px; border-radius: 10px; }
  a.lamp:hover { background: var(--bg); }
  .lamp .bulb { width: 38px; height: 38px; border-radius: 50%; display:grid; place-items:center; border: 1.5px solid var(--line2); color: var(--faint); background: var(--bg); transition: all .3s; }
  .lamp.ok .bulb { color: var(--good); border-color: color-mix(in srgb, var(--good) 45%, transparent); }
  .lamp.warn .bulb { color: #1a1200; background: var(--warn); border-color: var(--warn); box-shadow: 0 0 14px 1px color-mix(in srgb, var(--warn) 55%, transparent); }
  .lamp.bad .bulb { color: #fff; background: var(--bad); border-color: var(--bad); box-shadow: 0 0 16px 2px color-mix(in srgb, var(--bad) 60%, transparent); animation: ckpulse 1.8s ease-in-out infinite; }
  .lamp b { font-size: 11.5px; line-height: 1.2; } .lamp small { font-size: 10.5px; color: var(--mute); line-height: 1.25; overflow-wrap: anywhere; }
  @keyframes ckpulse { 50% { box-shadow: 0 0 6px 0 color-mix(in srgb, var(--bad) 40%, transparent); } }
  .trace { position: relative; margin-top: 10px; } .trace svg { display:block; width: 100%; height: 92px; overflow: visible; }
  .trace .gl { stroke: var(--line); stroke-width: 1; } .trace polyline { fill: none; stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; vector-effect: non-scaling-stroke; }
  .trace .s1 { stroke: var(--s1); } .trace .s2 { stroke: var(--s2); } .trace .cross { stroke: var(--mute); stroke-width: 1; vector-effect: non-scaling-stroke; }
  .trace .tip { position:absolute; top: -6px; pointer-events:none; background: var(--text); color: var(--bg); border-radius: 7px; padding: 4px 8px; font: 600 11px var(--f-mono); white-space: nowrap; }
  .legend { display:flex; justify-content: space-between; gap: 8px; font: 500 11px var(--f-mono); color: var(--mute); margin-top: 6px; } .legend i { display:inline-block; width: 12px; height: 3px; border-radius: 2px; vertical-align: middle; margin-right: 5px; }
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
  function gauge({ start, sweep, min, max, step, major, red, unit, height }) {
    const ang = v => start + sweep * (Math.max(min, Math.min(max, v)) - min) / (max - min);
    let ticks = '';
    for (let v = min; v <= max + .01; v += step) { const big = (v - min) % major === 0, a = ang(v); ticks += `<line class="tick ${big ? 'big' : ''}" x1="${polar(a, 69)[0]}" y1="${polar(a, 69)[1]}" x2="${polar(a, big ? 61 : 65)[0]}" y2="${polar(a, big ? 61 : 65)[1]}"/>`;
      if (big) ticks += `<text x="${polar(a, 51)[0]}" y="${+polar(a, 51)[1] + 3}">${v}</text>`; }
    const html = `<svg class="gauge" viewBox="0 0 200 ${height}" role="img"><path class="track" d="${arc(start, start + sweep, 82)}"/><path class="val" d="${arc(start, start + sweep, 82)}" pathLength="100" stroke-dasharray="0 200"/>
      <path class="red" d="${arc(ang(red), start + sweep, 92)}"/>${ticks}<g class="needle" style="transform: rotate(${start}deg)"><path d="M100 97.2 L172 99.4 L172 100.6 L100 102.8 Z"/></g><circle class="hub" cx="100" cy="100" r="7"/>
      <text class="num" x="100" y="${height - 22}">–</text><text class="unit" x="100" y="${height - 8}">${unit}</text></svg>`;
    return { html, set(el, v, cls, label) { const s = $q(el, '.gauge'); s.setAttribute('class', 'gauge ' + cls); s.setAttribute('aria-label', label);
      const part = v === null ? 0 : (ang(v) - start) / sweep * 100; $q(s, '.val').style.strokeDasharray = `${part} 200`; $q(s, '.val').style.opacity = part ? 1 : 0;
      $q(s, '.needle').style.transform = `rotate(${v === null ? start : ang(v)}deg)`; $q(s, '.num').textContent = v === null ? '–' : Math.round(v); } };
  }
  const head = title => `<div class="label"><span>${title}</span><span class="state"></span></div>`;
  const state = (el, cls) => { const s = $q(el, '.state'); s.className = 'state ' + cls; s.textContent = WORD[cls]; };
  const round = (title, opt, read) => { const g = gauge(opt); return { t: title, create: el => { el.innerHTML = head(title) + g.html + '<div class="sub"></div>'; },
    update(el, d) { const r = read(d); g.set(el, r.v, r.cls, `${title}: ${r.v === null ? 'unbekannt' : Math.round(r.v) + ' ' + opt.unit}`); state(el, r.cls); $q(el, '.sub').textContent = r.sub; } }; };

  // ---------- Anzeigen ----------
  const full = { start: 135, sweep: 270, min: 0, max: 100, step: 5, major: 20, red: 85, height: 188 };
  const WIDGETS = {
    tacho: round('Prozessor', { ...full, unit: '% CPU' }, d => ({ v: d.cpu, cls: level(d.cpu, 75, 90), sub: `Last ${d.load.map(x => x.toLocaleString('de-DE')).join(' · ')} · ${d.cores} Kerne` })),
    ram: round('Arbeitsspeicher', { ...full, unit: '% RAM' }, d => { const p = d.mem.used / d.mem.total * 100; return { v: p, cls: level(p, 80, 92), sub: `${gb(d.mem.used)} von ${gb(d.mem.total)}` }; }),
    temp: round('Temperatur', { start: 180, sweep: 180, min: 30, max: 100, step: 5, major: 35, red: 85, height: 160, unit: '°C' }, d => ({ v: d.temp, cls: d.temp === null ? '' : level(d.temp, 75, 90), sub: d.temp === null ? 'Kein Sensor gefunden' : 'Prozessor' })),
    tank: { t: 'Speicherplatz', create: el => { el.innerHTML = head('Tank · Speicher') + `<div class="tank">${'<i></i>'.repeat(14)}</div><div class="ef"><span>E</span><span>½</span><span>F</span></div><div class="big">–</div><div class="sub"></div>`; },
      update(el, d) { const k = d.disk; if (!k) { $q(el, '.sub').textContent = 'unbekannt'; return; } const free = 100 - k.percent, cls = level(k.percent, 85, 95), n = Math.round(free / 100 * 14);
        $q(el, '.tank').className = 'tank ' + cls; el.querySelectorAll('.tank i').forEach((x, i) => x.className = i < n ? 'on' : ''); state(el, cls); if (cls) $q(el, '.state').textContent = cls === 'bad' ? 'FAST LEER' : 'RESERVE';
        $q(el, '.big').textContent = free + ' % frei'; $q(el, '.sub').textContent = `${gb(k.free)} von ${gb(k.total)}`; } },
    netz: { t: 'Netzwerk', create: el => { el.innerHTML = head('Netzwerk') + '<div class="net"><span class="ar" title="Download">↓</span><b data-n="rx">–</b><div class="bar"><i data-b="rx" style="width:0"></i></div><span class="ar" title="Upload">↑</span><b data-n="tx">–</b><div class="bar"><i data-b="tx" style="width:0"></i></div></div><div class="sub"></div>'; },
      update(el, d) { for (const k of ['rx', 'tx']) { const v = d.net ? d.net[k] : null; $q(el, `[data-n="${k}"]`).textContent = v === null ? '–' : rate(v); $q(el, `[data-b="${k}"]`).style.width = (v ? Math.min(100, Math.log10(1 + v / 1000) / Math.log10(1 + 125000) * 100) : 0) + '%'; }
        $q(el, '.sub').textContent = d.net ? 'Mittel der letzten Minute' : 'Noch keine Messung vom Server'; } },
    trip: { t: 'Laufzeit', create: el => { el.innerHTML = head('Kilometerzähler') + '<div class="odo"></div><div class="sub"></div>'; },
      update(el, d) { const s = d.uptime, box = (v, n, l) => `<div><span>${String(v).padStart(n, '0').split('').map(c => `<i>${c}</i>`).join('')}</span><small>${l}</small></div>`;
        $q(el, '.odo').innerHTML = box(Math.floor(s / 86400), 3, 'Tage') + box(Math.floor(s / 3600) % 24, 2, 'Std') + box(Math.floor(s / 60) % 60, 2, 'Min');
        $q(el, '.sub').textContent = 'Server läuft seit ' + new Date(Date.now() - s * 1000).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' }); } },
    lampen: { t: 'Kontrollleuchten', wide: true, create: el => { el.innerHTML = head('Kontrollleuchten') + '<div class="lamps"></div>'; },
      update(el, d, ctx) { const html = d.lamps.map(l => { const link = l.app && ctx.apps.includes(l.app), tag = link ? 'a' : 'div';
          return `<${tag} class="lamp ${esc(l.state)}" ${link ? `href="/apps/${esc(l.app)}"` : ''}><span class="bulb">${lampIcon(l.id)}</span><b>${esc(l.label)}</b><small>${esc(l.text)}</small></${tag}>`; }).join('');
        const box = $q(el, '.lamps'); if (box._h !== html) box.innerHTML = box._h = html;
        const n = d.lamps.filter(l => l.state === 'bad' || l.state === 'warn').length; const s = $q(el, '.state'); s.className = 'state ' + (n ? 'warn' : ''); s.textContent = n ? n + ' AN' : 'ALLES OK'; } },
    verlauf: { t: 'Verlauf CPU/RAM', wide: true, create: el => { el.innerHTML = head('Fahrtenschreiber') + '<div class="trace"></div><div class="legend"><span><i style="background:var(--s1)"></i>CPU <b data-v="cpu"></b></span><span><i style="background:var(--s2)"></i>RAM <b data-v="mem"></b></span></div>';
        const t = $q(el, '.trace');
        t.addEventListener('pointermove', e => { const h = t._h; if (!h) return; const r = t.getBoundingClientRect(), i = Math.max(0, Math.min(h.length - 1, Math.round((e.clientX - r.left) / r.width * (h.length - 1)))), x = i / (h.length - 1) * 200, c = $q(t, '.cross'), tip = $q(t, '.tip');
          c.setAttribute('x1', x); c.setAttribute('x2', x); c.style.display = ''; tip.hidden = false; tip.textContent = `${new Date(h[i].t).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} · CPU ${h[i].cpu} % · RAM ${h[i].mem} %`;
          tip.style.left = Math.max(0, Math.min(r.width - tip.offsetWidth, x / 200 * r.width - tip.offsetWidth / 2)) + 'px'; });
        t.addEventListener('pointerleave', () => { const c = $q(t, '.cross'), tip = $q(t, '.tip'); if (c) c.style.display = 'none'; if (tip) tip.hidden = true; }); },
      update(el, d) { const t = $q(el, '.trace'), h = d.hist, last = h[h.length - 1];
        $q(el, '[data-v="cpu"]').textContent = last ? last.cpu + ' %' : ''; $q(el, '[data-v="mem"]').textContent = last ? last.mem + ' %' : '';
        $q(el, '.state').textContent = h.length > 1 ? `${Math.max(1, Math.round((last.t - h[0].t) / 60000))} MIN` : '';
        if (h.length < 2) { t._h = null; t.innerHTML = '<div class="sub" style="padding:34px 0">Sammelt noch Daten …</div>'; return; }
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

  WB.Cockpit = { WIDGETS, DEFAULT, normalize, mount, settings };
})();
