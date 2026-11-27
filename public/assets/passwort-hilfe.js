'use strict';
// Rückmeldung beim Passwort: anzeigen/verbergen, Feststelltaste, Leerzeichen und Regeln, die sich beim Tippen abhaken.
// Die Regeln spiegeln pwPolicy in server.js. Maßgeblich bleibt die Prüfung auf dem Server.
(() => {
  const COMMON = ['passwort', 'password', '123456', '12345678', '123456789', 'qwertz', 'qwerty', 'hallo', 'letmein', 'iloveyou', 'admin', 'welcome', 'werkbank', 'sommer', 'winter', 'fussball', 'schatz', 'abc123', 'baller'];
  // Wie pwVariants in server.js: Beim erzeugten Einmalpasswort (16 Zeichen) sind Bindestriche und Leerzeichen egal
  function variants(p) {
    const bare = p.replace(/[\s\-\u2010-\u2015\u2212]/g, '');
    return /^[A-HJ-NP-Za-km-np-z2-9]{16}$/.test(bare) ? [...new Set([p, bare.match(/.{4}/g).join('-'), bare])] : [p];
  }
  // Einheitliche Schreibweise, aus der ein neuer Messenger-Tresor seinen Schlüssel ableitet
  const canon = p => { const v = variants(p); return v[1] || v[0]; };
  function rules(p, name) {
    const l = p.toLowerCase(), kinds = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter(r => r.test(p)).length;
    const list = [
      [p.length >= 10 && p.length <= 200, p.length > 200 ? 'Höchstens 200 Zeichen' : `Mindestens 10 Zeichen (${p.length} eingegeben)`],
      [p.length >= 16 || kinds >= 3, p.length >= 16 ? 'Ab 16 Zeichen reicht jede Mischung' : `Drei Zeichenarten oder 16 Zeichen: Klein, Groß, Ziffer, Sonderzeichen (${kinds} von 3)`],
      [p.length > 0 && !(p.length < 16 && COMMON.some(c => l.includes(c))) && !/^(.)\1+$/.test(p), 'Kein sehr häufiges Wort wie „passwort“ oder „sommer“ (außer ab 16 Zeichen)']
    ];
    if (name) list.push([p.length > 0 && !l.includes(name.toLowerCase()), `Dein Name „${name}“ kommt nicht darin vor`]);
    return list;
  }
  // input: Passwortfeld. opts: show (Knopf „Anzeigen“), neu (Regeln prüfen), name() , repeat (zweites Feld), active() (ob gerade geprüft wird)
  function attach(input, opts = {}) {
    const field = input.closest('label') || input.parentNode;
    const box = document.createElement('div'); box.className = 'pwhelp'; box.setAttribute('aria-live', 'polite');
    if (opts.after) opts.after.after(box); else field.after(box);
    if (opts.show !== false) {
      const row = document.createElement('div'); row.className = 'pwrow'; input.before(row); row.appendChild(input);
      const eye = document.createElement('button'); eye.type = 'button'; eye.className = 'sm ghost pweye'; eye.textContent = 'Anzeigen'; row.appendChild(eye);
      eye.onclick = () => { const hide = input.type === 'text'; input.type = hide ? 'password' : 'text'; eye.textContent = hide ? 'Anzeigen' : 'Verbergen'; };
    }
    let caps = false;
    const draw = () => {
      const p = input.value, lines = [];
      if (caps) lines.push(['warn', 'Die Feststelltaste ist an.']);
      if (p && p !== p.trim() && variants(p).length === 1) lines.push(['warn', 'Am Anfang oder Ende steht ein Leerzeichen. Das zählt als Teil des Passworts.']);
      if (opts.neu && (!opts.active || opts.active()) && (p || opts.always)) {
        for (const [ok, text] of rules(p, opts.name && opts.name())) lines.push([ok ? 'ok' : 'no', text]);
        if (opts.repeat) lines.push([p && opts.repeat.value === p ? 'ok' : 'no', opts.repeat.value && opts.repeat.value !== p ? 'Die Wiederholung weicht noch ab' : 'Beide Eingaben sind gleich']);
      }
      box.replaceChildren(...lines.map(([kind, text]) => { const d = document.createElement('div'); d.className = kind; d.textContent = text; return d; }));
    };
    const key = e => { if (e.getModifierState) { const c = e.getModifierState('CapsLock'); if (c !== caps) { caps = c; draw(); } } };
    input.addEventListener('input', draw); input.addEventListener('keydown', key); input.addEventListener('keyup', key); input.addEventListener('blur', () => { caps = false; draw(); });
    if (opts.repeat) opts.repeat.addEventListener('input', draw);
    input.form?.addEventListener('reset', () => setTimeout(draw));
    draw(); return { draw };
  }
  // Uhrzeit, ab der es wieder geht („23:49 Uhr“)
  const bis = min => new Date(Date.now() + min * 60000).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr';
  // Meldung mit Überschrift und Erklärung in ein Element schreiben
  function fill(el, title, hint, retryMin) {
    const b = document.createElement('b'); b.textContent = title; el.replaceChildren(b);
    for (const t of [retryMin ? `Wieder möglich ab etwa ${bis(retryMin)}.` : '', hint || '']) if (t) { const d = document.createElement('div'); d.textContent = t; el.appendChild(d); }
  }
  window.WBPass = { attach, rules, fill, variants, canon };
})();
