'use strict';
// Chat mit der lokalen KI. Läuft auf der KI-Seite und in der Seitenleiste jeder anderen Seite.
// Welche Daten die KI sieht, entscheidet allein der Server (ki.js). Hier wird nur angezeigt.
(() => {
  const { esc, api, Store, toast, icon } = WB;
  const KEEP = 30;
  const IDEAS = {
    '': ['Was steht heute und morgen an?', 'Trag morgen um 15 Uhr Zahnarzt in den Kalender ein', 'Erkläre mir den Unterschied zwischen Stack und Heap.', 'Hilf mir, eine freundliche E-Mail an meinen Ausbilder zu schreiben.'],
    finanzen: ['Wofür habe ich diesen Monat am meisten ausgegeben?', 'Wie weit bin ich bei meinen Sparzielen?'],
    aufgaben: ['Was sollte ich zuerst erledigen?', 'Welche Aufgaben sind überfällig?', 'Neue Aufgabe: Berichtsheft abgeben bis Freitag'],
    kalender: ['Welche Termine habe ich in den nächsten zwei Wochen?', 'Wann ist der nächste Feiertag?', 'Trag Freitag um 18 Uhr Training ein'],
    arbeitszeit: ['Wie steht mein Stundenkonto?', 'Wie viel habe ich diese Woche gearbeitet?'],
    kueche: ['Was kann ich aus meinem Vorrat kochen?', 'Schlag mir einen Essensplan für die Woche vor.', 'Setz Milch und Eier auf die Einkaufsliste'],
    schule: ['Wo stehe ich bei meinen Noten?', 'Wie bereite ich mich auf die nächste Klausur vor?'],
    berichtsheft: ['Welche Tage fehlen noch im Berichtsheft?', 'Formuliere meine Einträge dieser Woche sauberer.'],
    abos: ['Was kosten meine Abos im Jahr?', 'Welche Kündigungsfrist kommt als Nächstes?'],
    docker: ['Gibt es Probleme mit Containern?'], monitor: ['Ist gerade etwas offline?'], wartung: ['Was muss am Server getan werden?'], protokoll: ['Gab es auffällige Anmeldeversuche?'],
    devtools: ['Erkläre mir diesen regulären Ausdruck: ^\\d{2}\\.\\d{2}\\.\\d{4}$']
  };
  // Erst entschärfen, dann wenig Formatierung. Links und Bilder werden absichtlich nicht gebaut.
  const inline = s => esc(s).replace(/`([^`\n]+)`/g, '<code>$1</code>').replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>');
  const render = text => String(text).split(/^```[^\n]*$/m).map((part, i) => i % 2 ? `<pre>${esc(part.replace(/^\n|\n$/g, ''))}</pre>`
    : part.split('\n').map(l => { const h = /^#{1,4}\s+(.*)/.exec(l), li = /^\s*[-*]\s+(.*)/.exec(l); return h ? `<b>${inline(h[1])}</b>` : li ? '• ' + inline(li[1]) : inline(l); }).join('\n').trim()).filter(Boolean).map((h, i) => h.startsWith('<pre>') ? h : `<div>${h}</div>`).join('');

  async function mount(root, { page = '' } = {}) {
    root.classList.add('wb-chat');
    root.innerHTML = `<div class="log" aria-live="polite"></div>
      <div class="notice warn hide" data-s></div>
      <form class="send"><textarea rows="2" maxlength="4000" placeholder="Frag etwas …" aria-label="Deine Frage"></textarea><button class="primary" data-go>Fragen</button><button type="button" class="danger hide" data-stop>Abbrechen</button></form>
      <div class="row opts"><label title="Aus: Die KI bekommt keine deiner Daten und antwortet schneller."><input type="checkbox" data-daten checked> Meine Daten nutzen</label><select data-model aria-label="Modell" class="hide"></select><span class="grow"></span><button type="button" class="ghost sm" data-new>Neuer Chat</button></div>
      <p class="faint">Läuft auf deinem Server. Die KI liest nur deine eigenen Kacheln und trägt erst nach deinem Klick etwas ein. Sie kann sich irren.</p>`;
    const q = s => root.querySelector(s), log = q('.log'), input = q('textarea');
    let D = { msgs: [], daten: true, modell: '' }, running = null, ready = false;
    const save = () => { Store.set('ki', D); };
    const trim = () => { D.msgs = D.msgs.slice(-KEEP); };
    const meta = m => [m.q?.length ? 'Gelesen: ' + m.q.join(', ') : '', m.v?.length ? 'Keine Freigabe: ' + m.v.join(', ') : '', m.sek ? `${String(m.sek).replace('.', ',')} s` : '', m.note || ''].filter(Boolean).join(' · ');
    // Vorschläge zum Eintragen: prüfen, bei Bedarf ändern, dann speichern
    const tile = id => WB.APPS.find(a => a.id === id)?.t || id;
    const field = f => { const a = `data-f="${esc(f.k)}" aria-label="${esc(f.l)}"`, v = esc(f.v);
      const input = f.typ === 'wahl' ? `<select ${a}>${f.opts.map(o => `<option value="${esc(o[0])}" ${o[0] === f.v ? 'selected' : ''}>${esc(o[1])}</option>`).join('')}</select>`
        : f.typ === 'lang' ? `<textarea ${a} rows="3">${v}</textarea>` : `<input ${a} type="${f.typ === 'date' ? 'date' : f.typ === 'time' ? 'time' : 'text'}" ${f.typ === 'zahl' ? 'inputmode="decimal"' : ''} value="${v}">`;
      return `<label${f.typ === 'lang' ? ' class="breit"' : ''}><span>${esc(f.l)}${f.req ? ' *' : ''}</span>${input}</label>`; };
    const card = (p, i, j) => {
      const at = `data-m="${i}" data-p="${j}"`;
      if (p.done) return `<div class="vor fertig" ${at}><b>✓ Eingetragen:</b> ${esc(p.done)} <a href="/apps/${esc(p.app)}">${esc(tile(p.app))} öffnen</a></div>`;
      if (p.weg) return `<div class="vor weg" ${at}>${esc(p.name)} verworfen</div>`;
      const main = p.felder.filter(f => f.req || (f.v !== '' && f.typ !== 'wahl')), more = p.felder.filter(f => !main.includes(f));
      return `<div class="vor" ${at}><div class="k"><b>${esc(p.name)}</b><span class="faint">kommt in „${esc(tile(p.app))}“</span></div>
        <div class="f">${main.map(field).join('')}</div>${more.length ? `<details><summary>Mehr Angaben</summary><div class="f">${more.map(field).join('')}</div></details>` : ''}
        ${p.err ? `<div class="notice warn">${esc(p.err)}</div>` : ''}<div class="row"><button type="button" class="primary sm" data-add>Eintragen</button><button type="button" class="ghost sm" data-drop>Verwerfen</button></div></div>`;
    };
    const cards = (m, i) => !m.p?.length ? '' : m.p.map((p, j) => card(p, i, j)).join('') + (m.p.length > 1 ? `<button type="button" class="sm" data-all="${i}">Alle eintragen</button>` : '');
    const bubble = (m, i) => `<div class="msg ${m.role === 'user' ? 'me' : 'ai'}"><div class="b">${m.role === 'user' ? esc(m.content) : render(m.content)}</div>${cards(m, i)}${m.role === 'assistant' ? `<div class="m">${esc(meta(m))}${m.content ? ' <button type="button" class="ghost sm" data-copy>Kopieren</button>' : ''}</div>` : ''}</div>`;
    const redraw = (i, j) => { const el = log.querySelector(`.vor[data-m="${i}"][data-p="${j}"]`); if (el) el.outerHTML = card(D.msgs[i].p[j], i, j); };
    // Zeigt diese Seite die geänderte Kachel, wird sie neu geladen, sonst stünde der Eintrag nicht darauf
    let stale = false;
    function reload() { if (!stale || running) return; if (root.closest('.wb-ki')) try { sessionStorage.setItem('wb-ki-offen', location.pathname); } catch {} setTimeout(() => location.reload(), 900); }
    async function add(i, j) {
      const p = D.msgs[i]?.p?.[j]; if (!p || p.done || p.weg || p.busy) return;
      p.busy = true; const el = log.querySelector(`.vor[data-m="${i}"][data-p="${j}"]`); el?.querySelectorAll('button').forEach(b => { b.disabled = true; });
      try {
        await Store.flush();
        const r = await api('/api/ki/eintragen', { method: 'POST', body: { ziel: p.ziel, werte: Object.fromEntries(p.felder.map(f => [f.k, f.v])) } });
        p.done = r.text; delete p.err; if (r.app === page) stale = true; toast('Eingetragen');
      } catch (e) { p.err = e.message; }
      delete p.busy; save(); await Store.flush(); redraw(i, j);
    }
    const bottom = () => { log.scrollTop = log.scrollHeight; };
    function draw() {
      log.innerHTML = D.msgs.length ? D.msgs.map((m, i) => bubble(m, i)).join('') : `<div class="start"><span class="ic">${icon('ki', 28)}</span><b>Womit kann ich helfen?</b>${(IDEAS[page] || IDEAS['']).map(t => `<button type="button" class="chip" data-idea>${esc(t)}</button>`).join('')}</div>`;
      bottom();
    }
    function state() { q('[data-go]').classList.toggle('hide', !!running); q('[data-stop]').classList.toggle('hide', !running); q('[data-go]').disabled = !ready; q('[data-new]').disabled = !!running; }
    async function status() {
      const warn = q('[data-s]');
      try {
        const s = await api('/api/ki/status'); ready = s.bereit; warn.textContent = s.grund; warn.classList.toggle('hide', s.bereit);
        const sel = q('[data-model]'); sel.innerHTML = s.modelle.map(m => `<option value="${esc(m)}">${esc(/:(0\.8|1|2)b/.test(m) ? 'Schnell' : /:(4|8|9)b/.test(m) ? 'Genauer' : 'Modell')} (${esc(m)})</option>`).join('');
        sel.value = s.modelle.includes(D.modell) ? D.modell : s.standard; sel.classList.toggle('hide', s.modelle.length < 2);
      } catch (e) { ready = false; warn.textContent = e.message; warn.classList.remove('hide'); }
      state(); if (!ready && root.isConnected) setTimeout(() => root.isConnected && status(), 15000);
    }
    async function ask(text) {
      text = text.trim(); if (!text || running) return; if (!ready) return toast('Die KI ist noch nicht bereit');
      const ctrl = running = new AbortController(), a = { role: 'assistant', content: '' };
      D.msgs.push({ role: 'user', content: text }); input.value = ''; draw(); state();
      const el = document.createElement('div'); el.className = 'msg ai'; el.innerHTML = '<div class="b"></div><div class="m">Frage wird vorbereitet …</div>'; log.appendChild(el); bottom();
      const t0 = Date.now(); let wait = 'Die KI liest', painted = 0, ticker = setInterval(() => { if (!a.content) el.querySelector('.m').textContent = `${wait} … ${Math.round((Date.now() - t0) / 1000)} s`; }, 500);
      const paint = force => { if (!force && Date.now() - painted < 120) return; painted = Date.now(); const stick = log.scrollHeight - log.scrollTop - log.clientHeight < 60; el.querySelector('.b').innerHTML = render(a.content); if (a.content) el.querySelector('.m').textContent = meta(a) || 'schreibt …'; if (stick) bottom(); };
      let failed = '';
      try {
        await Store.flush(); // damit gerade Eingetragenes schon mitzählt
        const r = await fetch('/api/ki/chat', { method: 'POST', signal: ctrl.signal, headers: { 'Content-Type': 'application/json', 'X-WB': '1' },
          body: JSON.stringify({ seite: page, daten: D.daten, modell: q('[data-model]').value, messages: D.msgs.filter(m => m.content).map(m => ({ role: m.role, content: m.content })) }) });
        if (r.status === 401) { location.href = '/login?grund=abgemeldet&next=' + encodeURIComponent(location.pathname); return; }
        if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error([j.error || 'Fehler ' + r.status, j.hint].filter(Boolean).join('. ')); }
        const reader = r.body.getReader(), dec = new TextDecoder(); let buf = '', done = false;
        for (;;) {
          const part = await reader.read(); if (part.done) break; buf += dec.decode(part.value, { stream: true }); let i;
          while ((i = buf.indexOf('\n')) >= 0) {
            const j = JSON.parse(buf.slice(0, i)); buf = buf.slice(i + 1);
            if (j.art === 'warten') wait = 'Wartet, bis eine andere Antwort fertig ist';
            else if (j.art === 'info') { a.q = j.quellen; a.v = j.verboten; wait = j.eintragen ? `Bereitet vor: ${j.eintragen.join(', ')}` : a.q.length ? `Liest ${a.q.join(', ')} und denkt nach` : 'Denkt nach'; }
            else if (j.art === 'vorschlag') a.p = j.liste;
            else if (j.art === 'text') { a.content += j.t; paint(); }
            else if (j.art === 'ende') { done = true; a.sek = j.sek; if (j.gekürzt) a.note = 'gekürzt, frag „weiter“'; }
            else if (j.art === 'fehler') throw new Error(j.msg);
          }
        }
        if (!done) throw new Error('Die Antwort wurde unterbrochen');
      } catch (e) { if (ctrl.signal.aborted) a.note = 'abgebrochen'; else failed = e.message === 'Failed to fetch' || e.name === 'TypeError' ? 'Keine Verbindung zum Server' : e.message; }
      clearInterval(ticker); running = null;
      if (a.content) { if (failed) a.note = failed; D.msgs.push(a); trim(); draw(); }
      else { // nichts angekommen: Frage zurück ins Feld, damit man sie nicht neu tippen muss
        D.msgs.pop(); draw(); if (!input.value) input.value = text; if (failed) toast(failed); }
      save(); state(); reload();
    }
    q('form').onsubmit = e => { e.preventDefault(); ask(input.value); };
    input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); ask(input.value); } });
    q('[data-stop]').onclick = () => running?.abort();
    q('[data-new]').onclick = () => { if (D.msgs.length && !confirm('Den bisherigen Verlauf löschen?')) return; D.msgs = []; save(); draw(); input.focus(); };
    q('[data-daten]').onchange = e => { D.daten = e.target.checked; save(); };
    q('[data-model]').onchange = e => { D.modell = e.target.value; save(); };
    log.addEventListener('input', e => {
      const t = e.target.closest('[data-f]'), box = t?.closest('.vor'); if (!box) return;
      const f = D.msgs[box.dataset.m]?.p?.[box.dataset.p]?.felder.find(x => x.k === t.dataset.f); if (f) { f.v = t.value; save(); }
    });
    log.addEventListener('click', async e => {
      const box = e.target.closest('.vor');
      if (box && e.target.closest('[data-add]')) { await add(+box.dataset.m, +box.dataset.p); return reload(); }
      if (box && e.target.closest('[data-drop]')) { D.msgs[box.dataset.m].p[box.dataset.p].weg = true; save(); return redraw(box.dataset.m, box.dataset.p); }
      const all = e.target.closest('[data-all]');
      if (all) { all.disabled = true; const i = +all.dataset.all; for (let j = 0; j < D.msgs[i].p.length; j++) await add(i, j); all.disabled = false; return reload(); }
      const idea = e.target.closest('[data-idea]'); if (idea) { input.value = idea.textContent; return ready ? ask(input.value) : input.focus(); }
      const c = e.target.closest('[data-copy]'); if (!c) return; const i = [...log.children].indexOf(c.closest('.msg'));
      try { await navigator.clipboard.writeText(D.msgs[i].content); toast('Kopiert'); } catch { toast('Kopieren ging nicht. Markiere den Text und drück Strg + C.'); }
    });
    state();
    D = Object.assign(D, await Store.get('ki', D)); q('[data-daten]').checked = D.daten !== false; draw(); await status();
    return { focus: () => input.focus() };
  }

  // Seitenleiste auf den übrigen Seiten
  let panel = null;
  async function drawer(page) {
    if (panel) { const open = panel.classList.toggle('offen'); if (open) panel.querySelector('textarea')?.focus(); return; }
    panel = document.createElement('aside'); panel.className = 'wb-ki offen no-print'; panel.setAttribute('aria-label', 'KI-Assistent');
    panel.innerHTML = `<div class="head"><b>${icon('ki', 17)} KI-Assistent</b><span class="grow"></span><a class="btn ghost sm" href="/apps/ki">Große Ansicht</a><button type="button" class="ghost sm" data-x aria-label="Schließen">✕</button></div><div class="body"></div>`;
    document.body.appendChild(panel);
    const close = () => panel.classList.remove('offen');
    panel.querySelector('[data-x]').onclick = close;
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && panel.classList.contains('offen') && !document.querySelector('dialog[open]')) { e.stopImmediatePropagation(); e.preventDefault(); close(); } }, true);
    const chat = await mount(panel.querySelector('.body'), { page }); chat.focus();
  }
  window.WBKI = { mount, drawer, render };
})();
