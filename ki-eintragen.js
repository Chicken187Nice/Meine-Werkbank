// KI-Assistent: Einträge in Kacheln vorbereiten und speichern.
//
// Sicherheitsgrundsatz: Das Modell schreibt nichts. Es zerlegt nur den Auftrag in Felder (festes JSON-Schema).
// Der Server prüft jedes Feld, zeigt der Person einen Vorschlag, und erst deren Klick speichert (ki.js,
// POST /api/ki/eintragen). Es wird nur angehängt, nie überschrieben oder gelöscht, immer im Ordner des
// fragenden Kontos und nur in Kacheln, die dieses Konto benutzen darf.
'use strict';
const crypto = require('crypto');

module.exports = ({ K }) => {
  const arr = v => Array.isArray(v) ? v : [];
  const uid = () => crypto.randomBytes(5).toString('hex');
  const one = (v, n) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
  const many = (v, n) => String(v ?? '').replace(/\r\n?/g, '\n').trim().slice(0, n);
  const today = () => K.ymd(new Date());
  const isDay = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '') && K.ymd(K.day(s)) === s && s >= '2000-01-01' && s <= '2100-12-31';
  const isTime = s => /^([01]\d|2[0-3]):[0-5]\d$/.test(s || '');
  const deDay = s => s.split('-').reverse().join('.');

  // ---------- Datum, Uhrzeit und Zahlen aus deutschem Text (rechnen soll nicht das Modell) ----------
  const WD = ['sonntag', 'montag', 'dienstag', 'mittwoch', 'donnerstag', 'freitag', 'samstag'];
  const MON = ['jan', 'feb', 'mär', 'apr', 'mai', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dez'];
  const NUM = { ein: 1, eine: 1, einem: 1, einen: 1, einer: 1, zwei: 2, drei: 3, vier: 4, 'fünf': 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10, elf: 11, 'zwölf': 12 };
  const NW = Object.keys(NUM).join('|');
  const DATE = new RegExp([
    String.raw`\b(?<iso>\d{4}-\d{2}-\d{2})\b`,
    String.raw`(?<![\d.])(?<d>\d{1,2})\.\s?(?<m>\d{1,2})\.(?<y>\d{4}|\d{2}(?![\d:]|\s*uhr))?(?!\d)`,
    String.raw`(?<=\b(?:am|bis|vom|ab|den)\s)(?<d2>\d{1,2})\.(?<m2>\d{1,2})(?![\d.]|\s*(?:uhr|€|euro))`,
    String.raw`(?<![\d.])(?<d3>\d{1,2})\.?\s*(?<mn>januar|februar|märz|april|mai|juni|juli|august|september|oktober|november|dezember|jan|feb|mär|apr|jun|jul|aug|sept?|okt|nov|dez)(?![a-zäöü])\.?(?:\s*(?<y3>\d{4}))?`,
    String.raw`(?<rel>übermorgen|vorgestern|heute(?:\s+(?:morgen|früh|abend|mittag|nachmittag|vormittag|nacht))?|gestern|(?<!(?:guten|am|jeden)\s)(?<![a-zäöü])morgen(?![a-zäöü]))`,
    String.raw`\bin\s+(?<n>\d{1,3}|${NW})\s+(?<unit>tag(?:en)?|woche[n]?|monat(?:en)?|jahr(?:en)?)(?![a-zäöü])`,
    String.raw`(?:(?<nw>(?:nächste|kommende)[nr]?\s+woche)\s+(?:am\s+)?)?(?:(?<pre>nächste[nrsm]?|kommende[nrsm]?|letzte[nrsm]?|vergangene[nrsm]?|diese[nrsm]?)\s+)?(?<![a-zäöü])(?<wd>montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonnabend|sonntag)(?:abend|morgen|mittag|nachmittag|vormittag|nacht)?s?(?![a-zäöü])`,
    String.raw`(?<we>wochenende)`,
    String.raw`(?<nw2>(?:nächste|kommende)[nr]?\s+woche)`,
    String.raw`\b(?:am|bis zum|zum)\s+(?<dom>\d{1,2})\.(?!\s*(?:\d|(?:januar|februar|märz|april|mai|juni|juli|august|september|oktober|november|dezember|jan|feb|mär|apr|jun|jul|aug|sept?|okt|nov|dez)(?![a-zäöü])|mal(?![a-zäöü])))`
  ].join('|'), 'gi');

  // Liefert alle Datumsangaben in der Reihenfolge des Textes. back: Vergangenheit ist gemeint (Ausgaben, Arbeitszeit …)
  function dates(text, back = false, now = new Date()) {
    const base = K.day(K.ymd(now)), T = K.ymd(base), plus = n => K.ymd(K.plus(base, n)), out = [];
    const make = (y, m, d) => { const x = new Date(y, m - 1, d, 12); return x.getMonth() === m - 1 && x.getDate() === d ? K.ymd(x) : null; };
    const fit = (m, d, y) => {
      if (y) return make(+y < 100 ? 2000 + +y : +y, m, d);
      let s = make(base.getFullYear(), m, d); if (!s) return make(base.getFullYear() + (back ? -1 : 1), m, d);
      if (!back && s < T) s = make(base.getFullYear() + 1, m, d); if (back && s > T) s = make(base.getFullYear() - 1, m, d); return s;
    };
    for (const hit of String(text).toLowerCase().matchAll(DATE)) {
      const g = hit.groups; let s = null;
      if (g.iso) s = isDay(g.iso) ? g.iso : null;
      else if (g.d) s = fit(+g.m, +g.d, g.y);
      else if (g.d2) s = fit(+g.m2, +g.d2);
      else if (g.d3) s = fit(MON.indexOf(g.mn.slice(0, 3)) + 1, +g.d3, g.y3);
      else if (g.rel) s = plus(g.rel.startsWith('heute') ? 0 : g.rel === 'übermorgen' ? 2 : g.rel === 'vorgestern' ? -2 : g.rel === 'gestern' ? -1 : 1);
      else if (g.n) { const n = NUM[g.n] || +g.n;
        if (g.unit.startsWith('tag')) s = plus(n); else if (g.unit.startsWith('woche')) s = plus(7 * n);
        else { const months = g.unit.startsWith('jahr') ? 12 * n : n, x = new Date(base.getFullYear(), base.getMonth() + months, 1, 12); x.setDate(Math.min(base.getDate(), new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate())); s = K.ymd(x); } }
      else if (g.wd) { const w = g.wd === 'sonnabend' ? 6 : WD.indexOf(g.wd), t = base.getDay(), pre = g.pre || '';
        if (g.nw) s = plus(7 - ((t + 6) % 7) + ((w + 6) % 7));
        else if (/^(letzte|vergangene)/.test(pre) || (back && !/^(nächste|kommende)/.test(pre))) { let n = (t - w + 7) % 7; if (!n && pre && !pre.startsWith('diese')) n = 7; s = plus(-n); }
        else { let n = (w - t + 7) % 7; if (!n && !pre.startsWith('diese')) n = 7; s = plus(n); } }
      else if (g.we) s = plus((6 - base.getDay() + 7) % 7);
      else if (g.nw2) s = plus(7);
      else if (g.dom) { const d = +g.dom; for (let k = 0; k < 3 && !s; k++) { const x = new Date(base.getFullYear(), base.getMonth() + (back ? -k : k), 1, 12), c = make(x.getFullYear(), x.getMonth() + 1, d); if (c && (back ? c <= T : c >= T)) s = c; } }
      if (s) out.push({ ymd: s, at: hit.index, len: hit[0].length });
    }
    return out;
  }

  const pad = n => String(n).padStart(2, '0');
  // Alle Uhrzeiten im Text. „von 14 bis 16 Uhr“ liefert beide.
  function times(text) {
    let s = String(text).toLowerCase().replace(DATE, m => ' '.repeat(m.length));
    const found = [], add = (at, h, m) => { if (h >= 0 && h < 24 && m >= 0 && m < 60) found.push({ at, t: pad(h) + ':' + pad(m) }); };
    const evening = /abends|nachmittags|heute abend|(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|morgen)(abend|nachmittag)/.test(String(text).toLowerCase());
    const pm = h => evening && h > 0 && h < 12 ? h + 12 : h;
    const take = (re, fn) => { s = s.replace(re, (m, ...a) => { const at = a[a.length - 2]; fn(at, ...a); return ' '.repeat(m.length); }); };
    take(/\b(?:von|zwischen)\s+(\d{1,2})(?:[:.](\d{2}))?\s*(?:uhr)?\s*(?:bis|und|-|–)\s*(\d{1,2})(?:[:.](\d{2}))?\s*uhr/g, (at, a, b, c, d) => { add(at, pm(+a), +(b || 0)); add(at + 1, pm(+c), +(d || 0)); });
    take(/(?<![\d.,])(\d{1,2})(?:[:.](\d{2}))?\s*(?:-|–|bis)\s*(\d{1,2})(?:[:.](\d{2}))?\s*uhr/g, (at, a, b, c, d) => { add(at, pm(+a), +(b || 0)); add(at + 1, pm(+c), +(d || 0)); });
    take(new RegExp(String.raw`\b(halb|viertel nach|viertel vor|dreiviertel)\s+(\d{1,2}|${NW})(?![a-zäöü\d])`, 'g'), (at, how, n) => { let h = NUM[n] || +n, m = 0;
      if (how === 'halb') { h -= 1; m = 30; } else if (how === 'viertel nach') m = 15; else { h -= 1; m = 45; }
      if (h >= 0 && h < 7) h += 12; add(at, pm(h), m); });
    take(/(?<![\d.,])(\d{1,2})[:.](\d{2})\s*uhr/g, (at, h, m) => add(at, pm(+h), +m));
    take(/(?<![\d.,])(\d{1,2}):(\d{2})(?!\d)/g, (at, h, m) => add(at, pm(+h), +m));
    take(/(?<![\d.,])(\d{1,2})\s*uhr(?:\s*([0-5]\d)(?!\d))?/g, (at, h, m) => add(at, pm(+h), +(m || 0)));
    take(/\bum\s+(\d{1,2})(?![\d.,:]|\s*(?:€|euro|prozent|%))/g, (at, h) => add(at, pm(+h), 0));
    return found.sort((a, b) => a.at - b.at).map(x => x.t);
  }
  const number = v => { let s = String(v ?? '').replace(/€|euro|eur|\s/gi, ''); if (/,/.test(s)) s = s.replace(/\./g, '').replace(',', '.'); else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
    return /^-?\d+(\.\d+)?$/.test(s) ? +s : null; };
  const money = text => [...String(text).matchAll(/(?<![\d.,])(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2})|\.(\d{1,2}))?\s*(?:€|euro\b|eur\b)/gi)].map(m => +(m[1].replace(/\./g, '') + '.' + (m[2] || m[3] || '0')));

  // ---------- Ziele ----------
  // Feld: k Schlüssel, l Beschriftung, typ text|lang|date|time|zahl|wahl, req Pflicht, hint Erklärung für das Modell
  const F = (k, l, typ = 'text', more = {}) => ({ k, l, typ, ...more });
  const CATS = { aus: ['Lebensmittel', 'Wohnen', 'Mobilität', 'Freizeit', 'Abos', 'Kleidung', 'Gesundheit', 'Technik', 'Geschenke', 'Sonstiges'], ein: ['Gehalt', 'Nebenjob', 'Verkauf', 'Geschenk', 'Erstattung', 'Sonstiges'] };
  const monday = s => { const d = K.day(s); return K.ymd(K.plus(d, -((d.getDay() + 6) % 7))); };
  const list = (d, k) => { if (d[k] === undefined || d[k] === null) d[k] = []; if (!Array.isArray(d[k])) throw new Error('Die gespeicherten Daten dieser Kachel haben ein unerwartetes Format'); return d[k]; };
  const full = (l, max) => l.length >= max ? { fehler: `Diese Liste ist voll (${max}). Räum sie in der Kachel zuerst auf.` } : null;

  const T = {
    kalender: { app: 'kalender', name: 'Termin', words: /\bkalender\w*|\btermin(?:e|en|s)?\b/,
      fields: [F('titel', 'Was?', 'text', { req: true, max: 120, hint: 'kurzer Titel ohne Datum und Uhrzeit' }), F('datum', 'Datum', 'date', { req: true }), F('uhrzeit', 'Uhrzeit (leer = ganztägig)', 'time'), F('bis', 'Bis (mehrtägig)', 'date', { hint: 'letzter Tag, nur bei mehrtägigen Terminen' }),
        F('wiederholung', 'Wiederholung', 'wahl', { opts: [['', 'einmalig'], ['weekly', 'jede Woche'], ['monthly', 'jeden Monat'], ['yearly', 'jedes Jahr']] }), F('notiz', 'Notiz', 'lang', { max: 500 })],
      start: () => ({ events: [], land: 'BY' }),
      add(d, v) { const l = list(d, 'events'); l.push({ id: uid(), t: v.titel, date: v.datum, time: v.uhrzeit, end: v.bis && v.bis > v.datum ? v.bis : '', rep: v.wiederholung, until: '', c: 'blau', note: v.notiz });
        return { text: `Termin „${v.titel}“ am ${deDay(v.datum)}${v.uhrzeit ? ' um ' + v.uhrzeit + ' Uhr' : ''}` }; } },
    aufgaben: { app: 'aufgaben', name: 'Aufgabe', words: /\b(?:haus)?aufgaben?(?:liste|board)?\b|\bto-?dos?(?:-?liste)?\b|\bkanban\w*/,
      fields: [F('titel', 'Aufgabe', 'text', { req: true, max: 200 }), F('datum', 'Fällig am', 'date', { hint: 'Fälligkeit' }), F('prio', 'Priorität', 'wahl', { opts: [['normal', 'normal'], ['hoch', 'hoch'], ['niedrig', 'niedrig']] }), F('stichwort', 'Stichwort', 'text', { max: 30 })],
      start: () => ({ tasks: [] }),
      add(d, v) { list(d, 'tasks').push({ id: uid(), t: v.titel, due: v.datum || null, prio: { niedrig: 0, normal: 1, hoch: 2 }[v.prio], tag: v.stichwort, col: 'offen', created: today() });
        return { text: `Aufgabe „${v.titel}“${v.datum ? ', fällig ' + deDay(v.datum) : ''}` }; } },
    notizen: { app: 'notizen', name: 'Notiz', words: /\bnotiz(?:en)?\b/,
      fields: [F('titel', 'Titel', 'text', { req: true, max: 100 }), F('text', 'Inhalt', 'lang', { max: 5000, hint: 'der Inhalt der Notiz' })],
      start: () => ({ notes: [], sel: null }),
      add(d, v) { const id = uid(); list(d, 'notes').push({ id, t: v.titel, b: v.text, u: Date.now() }); d.sel = id; return { text: `Notiz „${v.titel}“` }; } },
    einkauf: { app: 'kueche', name: 'Einkaufsliste', words: /\beinkaufs?-?(?:liste|zettel)\b|\beinkauf(?:en)?\b/,
      fields: [F('artikel', 'Artikel', 'text', { req: true, max: 80, hint: 'genau ein Artikel, gern mit Menge; mehrere Artikel = mehrere Einträge' })],
      start: () => ({ extra: [] }),
      add(d, v) { const l = list(d, 'extra'); if (l.some(x => String(x).toLowerCase() === v.artikel.toLowerCase())) return { fehler: `„${v.artikel}“ steht schon auf der Einkaufsliste` }; const f = full(l, 200); if (f) return f; l.push(v.artikel); return { text: `„${v.artikel}“ auf der Einkaufsliste` }; } },
    vorrat: { app: 'kueche', name: 'Vorrat', words: /\bvorrat\w*|\bkühlschrank\b/,
      fields: [F('zutat', 'Zutat', 'text', { req: true, max: 60, hint: 'genau eine Zutat; mehrere = mehrere Einträge' })],
      start: () => ({ inv: [] }),
      add(d, v) { const l = list(d, 'inv'), n = v.zutat.toLowerCase(); if (l.includes(n)) return { fehler: `„${n}“ ist schon im Vorrat` }; const f = full(l, 300); if (f) return f; l.push(n); return { text: `„${n}“ im Vorrat` }; } },
    finanzen: { app: 'finanzen', name: 'Buchung', words: /\bfinanzen\b|\bbuchung(?:en)?\b|\bbuche\b|\bausgaben?\b|\beinnahmen?\b|\bkassenbuch\b|\bhaushaltsbuch\b/, back: true,
      fields: [F('art', 'Art', 'wahl', { opts: [['aus', 'Ausgabe'], ['ein', 'Einnahme']] }), F('betrag', 'Betrag in €', 'zahl', { req: true, min: 0.01, max: 1e7 }),
        F('kategorie', 'Kategorie', 'wahl', { opts: [...new Set([...CATS.aus, ...CATS.ein])].map(c => [c, c]), dflt: 'Sonstiges' }), F('datum', 'Datum', 'date', { req: true, heute: true }), F('notiz', 'Wofür?', 'text', { max: 100 })],
      start: () => ({ tx: [], goals: [] }),
      add(d, v) { const type = v.art === 'ein' ? 'in' : 'out', cat = CATS[v.art].includes(v.kategorie) ? v.kategorie : 'Sonstiges'; list(d, 'goals'); list(d, 'tx').push({ id: uid(), type, amount: v.betrag, cat, note: v.notiz, date: v.datum });
        return { text: `${v.art === 'ein' ? 'Einnahme' : 'Ausgabe'} ${v.betrag.toFixed(2).replace('.', ',')} € (${cat}) am ${deDay(v.datum)}` }; } },
    sparziel: { app: 'finanzen', name: 'Sparziel', words: /\bsparziel\w*/,
      fields: [F('titel', 'Wofür?', 'text', { req: true, max: 60 }), F('betrag', 'Zielbetrag in €', 'zahl', { req: true, min: 1, max: 1e8 }), F('gespart', 'Schon gespart in €', 'zahl', { min: 0, max: 1e8 })],
      start: () => ({ tx: [], goals: [] }),
      add(d, v) { list(d, 'tx'); list(d, 'goals').push({ id: uid(), name: v.titel, target: v.betrag, saved: v.gespart || 0 }); return { text: `Sparziel „${v.titel}“` }; } },
    abos: { app: 'abos', name: 'Abo', words: /\babos?\b|\babonnement\w*|\babo-?killer\b/,
      fields: [F('titel', 'Name', 'text', { req: true, max: 60 }), F('betrag', 'Preis in €', 'zahl', { req: true, min: 0, max: 100000 }), F('intervall', 'Abrechnung', 'wahl', { opts: [['1', 'monatlich'], ['3', 'vierteljährlich'], ['6', 'halbjährlich'], ['12', 'jährlich']] }),
        F('datum', 'Nächste Verlängerung', 'date', { req: true }), F('frist', 'Kündigungsfrist (Zahl)', 'zahl', { min: 0, max: 365 }), F('einheit', 'Frist in', 'wahl', { opts: [['m', 'Monaten'], ['w', 'Wochen'], ['d', 'Tagen']] })],
      start: () => ({ abos: [] }),
      add(d, v) { list(d, 'abos').push({ id: uid(), use: null, name: v.titel, price: v.betrag, interval: +v.intervall, renew: v.datum, notice: v.frist ?? 1, unit: v.einheit, cat: '' }); return { text: `Abo „${v.titel}“` }; } },
    countdown: { app: 'countdown', name: 'Countdown', words: /\bcountdowns?\b/,
      fields: [F('titel', 'Was?', 'text', { req: true, max: 80 }), F('datum', 'Datum', 'date', { req: true }), F('uhrzeit', 'Uhrzeit', 'time'), F('wiederholung', 'Wiederholung', 'wahl', { opts: [['once', 'einmalig'], ['yearly', 'jährlich']] })],
      start: () => ({ items: [] }),
      add(d, v) { list(d, 'items').push({ id: uid(), name: v.titel, date: v.datum, time: v.uhrzeit, kind: v.wiederholung }); return { text: `Countdown „${v.titel}“ bis ${deDay(v.datum)}` }; } },
    gewohnheiten: { app: 'gewohnheiten', name: 'Gewohnheit', words: /\bgewohnheit(?:en)?\b|\bhabits?\b/,
      fields: [F('titel', 'Gewohnheit', 'text', { req: true, max: 60 })],
      start: () => ({ habits: [], rewards: [{ id: 'r1', lvl: 3, text: 'Lieblingsessen bestellen' }] }),
      add(d, v) { if (!Array.isArray(d.rewards)) d.rewards = []; const l = list(d, 'habits'); if (l.some(h => String(h.name).toLowerCase() === v.titel.toLowerCase())) return { fehler: 'Diese Gewohnheit gibt es schon' }; l.push({ id: uid(), name: v.titel, done: [] }); return { text: `Gewohnheit „${v.titel}“` }; } },
    merkliste: { app: 'merkliste', name: 'Merkliste', words: /\bmerkliste\b|\bwatchlist\b|\bleseliste\b/,
      fields: [F('titel', 'Titel', 'text', { req: true, max: 120 }), F('art', 'Art', 'wahl', { opts: [['film', 'Film'], ['serie', 'Serie'], ['buch', 'Buch'], ['spiel', 'Spiel'], ['sonst', 'Sonstiges']], dflt: 'sonst' }), F('status', 'Status', 'wahl', { opts: [['offen', 'geplant'], ['laeuft', 'läuft'], ['fertig', 'fertig']] })],
      start: () => ({ items: [] }),
      add(d, v) { const l = list(d, 'items'); if (l.some(i => String(i.t).toLowerCase() === v.titel.toLowerCase() && i.kind === v.art)) return { fehler: 'Das steht schon auf der Merkliste' };
        l.push({ id: uid(), t: v.titel, kind: v.art, status: v.status, rating: 0, progress: '', note: '', added: new Date().toISOString(), done: v.status === 'fertig' ? today() : '' }); return { text: `„${v.titel}“ auf der Merkliste` }; } },
    ablage: { app: 'ablage', name: 'Ablage', words: /\b(?:zwischen)?ablage\b/,
      fields: [F('titel', 'Titel', 'text', { max: 80 }), F('text', 'Text', 'lang', { req: true, max: 20000, hint: 'der abzulegende Text, wörtlich' })],
      start: () => ({ items: [] }),
      add(d, v) { const l = list(d, 'items'); const f = full(l, 200); if (f) return f; l.push({ id: uid(), t: v.titel, body: v.text, pin: false, at: Date.now() });
        if (Buffer.byteLength(JSON.stringify(d)) > 3.5e6) return { fehler: 'Die Ablage ist voll. Lösch zuerst große Einträge.' }; return { text: `Eintrag in der Ablage${v.titel ? ' „' + v.titel + '“' : ''}` }; } },
    pakete: { app: 'pakete', name: 'Paket', words: /\bpaket(?:e|nummer|verfolgung)?\b|\bsendung(?:snummer|en)?\b/,
      fields: [F('nummer', 'Sendungsnummer', 'text', { req: true, max: 60 }), F('dienst', 'Dienst', 'wahl', { opts: [['dhl', 'DHL'], ['hermes', 'Hermes'], ['dpd', 'DPD'], ['gls', 'GLS'], ['ups', 'UPS'], ['amazon', 'Amazon'], ['sonstige', 'Sonstige']] }), F('inhalt', 'Inhalt', 'text', { max: 80 })],
      start: () => ({ pakete: [] }),
      add(d, v) { const nr = v.nummer.replace(/[\s-]/g, '').toUpperCase(); if (!/^[A-Z0-9]{8,40}$/.test(nr)) return { fehler: 'Sendungsnummer: 8 bis 40 Buchstaben oder Ziffern' };
        const l = list(d, 'pakete'); if (l.some(p => p.nr === nr)) return { fehler: 'Diese Nummer steht schon in der Liste' }; l.unshift({ id: uid(), nr, dienst: v.dienst, inhalt: v.inhalt, stand: 'unterwegs', added: today(), done: false }); return { text: `Paket ${nr}` }; } },
    schule: { app: 'schule', name: 'Schulnote', words: /\bnoten?\b|\bnotenliste\b/, back: true,
      fields: [F('fach', 'Fach', 'text', { req: true, max: 40 }), F('note', 'Note (1–6)', 'zahl', { req: true, min: 1, max: 6 }), F('gewicht', 'Art', 'wahl', { opts: [['1', 'Ex / mündlich / Referat (×1)'], ['2', 'Schulaufgabe (×2)']] }), F('thema', 'Notiz', 'text', { max: 80 }), F('datum', 'Datum', 'date', { req: true, heute: true })],
      start: () => ({ grades: [] }),
      add(d, v) { list(d, 'grades').push({ id: uid(), s: v.fach, v: v.note, w: +v.gewicht, n: v.thema, d: v.datum }); return { text: `Note ${String(v.note).replace('.', ',')} in ${v.fach}` }; } },
    arbeitszeit: { app: 'arbeitszeit', name: 'Arbeitszeit', words: /\barbeitszeit(?:en)?\b|\bstundenzettel\b|\bstempeluhr\b|\bzeiterfassung\b|\bstundenkonto\b/, back: true,
      fields: [F('datum', 'Datum', 'date', { req: true, heute: true }), F('art', 'Art', 'wahl', { opts: [['betrieb', 'Betrieb'], ['schule', 'Berufsschule'], ['urlaub', 'Urlaub'], ['krank', 'Krank'], ['feiertag', 'Feiertag'], ['frei', 'Zeitausgleich']] }),
        F('von', 'Von', 'time'), F('bis', 'Bis', 'time'), F('pause', 'Pause in Minuten', 'zahl', { min: 0, max: 600 }), F('notiz', 'Notiz', 'text', { max: 120 })],
      start: () => ({ cfg: {}, days: {} }),
      add(d, v) { if (!d.days || typeof d.days !== 'object') d.days = {}; const timed = v.art === 'betrieb' || v.art === 'schule';
        if (d.days[v.datum]) return { fehler: `Für den ${deDay(v.datum)} steht schon etwas drin. Ändern kannst du es in der Kachel „Arbeitszeit“.` };
        if (v.art === 'betrieb' && !v.von) return { fehler: 'Bei „Betrieb“ fehlt die Uhrzeit bei „Von“' };
        if (timed && (!!v.von !== !!v.bis) && !(v.von && v.datum === today())) return { fehler: 'Bitte „Von“ und „Bis“ angeben' };
        d.days[v.datum] = { type: v.art, from: timed ? v.von : '', to: timed ? v.bis : '', pause: timed ? v.pause || 0 : 0, note: v.notiz }; return { text: `Arbeitszeit am ${deDay(v.datum)}` }; } },
    berichtsheft: { app: 'berichtsheft', name: 'Berichtsheft', words: /\bberichtsheft\w*|\bausbildungsnachweis\w*/, back: true,
      fields: [F('datum', 'Tag', 'date', { req: true, heute: true }), F('text', 'Tätigkeit', 'lang', { req: true, max: 2000, hint: 'was gemacht oder gelernt wurde' }), F('ort', 'Ort', 'wahl', { opts: [['', 'wie bisher'], ['Betrieb', 'Betrieb'], ['Berufsschule', 'Berufsschule'], ['Urlaub', 'Urlaub'], ['Krank', 'Krank'], ['Feiertag', 'Feiertag'], ['Überbetrieblich', 'Überbetrieblich']] }), F('stunden', 'Stunden', 'zahl', { min: 0, max: 12 })],
      start: () => ({ weeks: {} }),
      add(d, v) { const i = (K.day(v.datum).getDay() + 6) % 7; if (i > 4) return { fehler: 'Das Berichtsheft hat nur Montag bis Freitag' };
        if (!d.weeks || typeof d.weeks !== 'object') d.weeks = {}; const k = monday(v.datum), w = d.weeks[k] || (d.weeks[k] = { days: [0, 1, 2, 3, 4].map(() => ({ ort: 'Betrieb', h: 8, txt: '' })), signed: false });
        if (w.signed) return { fehler: 'Diese Woche ist schon abgezeichnet' }; const x = w.days?.[i]; if (!x) return { fehler: 'Die gespeicherte Woche hat ein unerwartetes Format' };
        x.txt = (String(x.txt || '').trim() ? String(x.txt).trim() + '\n' : '') + v.text; if (v.ort) x.ort = v.ort; if (v.stunden !== null) x.h = v.stunden; return { text: `Berichtsheft, ${deDay(v.datum)}` }; } },
    lernen: { app: 'lernen', name: 'Lernkarte', words: /\b(?:kartei|lern)karten?\b/,
      fields: [F('frage', 'Frage', 'text', { req: true, max: 300 }), F('antwort', 'Antwort', 'lang', { req: true, max: 1000, hint: 'die Antwort; bitte ergänzen, wenn nicht genannt' }), F('code', 'Code (optional)', 'lang', { max: 1000 })],
      start: () => ({ own: [] }),
      add(d, v) { list(d, 'own').push({ id: 'o' + uid(), q: v.frage, a: v.antwort, c: v.code }); return { text: `Lernkarte „${v.frage}“` }; } },
    reisen: { app: 'reisen', name: 'Packliste', words: /\bpackliste\b/,
      fields: [F('artikel', 'Einpacken', 'text', { req: true, max: 60, hint: 'genau ein Gegenstand; mehrere = mehrere Einträge' }), F('reise', 'Reiseziel (leer = nächste Reise)', 'text', { max: 60 })],
      start: () => ({ trips: [], sel: null }),
      add(d, v) { const trips = list(d, 'trips'), want = v.reise.toLowerCase(), T0 = today();
        const trip = want ? trips.find(t => String(t.dest).toLowerCase().includes(want)) : [...trips].filter(t => String(t.to) >= T0).sort((a, b) => String(a.from).localeCompare(String(b.from)))[0];
        if (!trip) return { fehler: want ? `Keine Reise nach „${v.reise}“ gefunden` : 'Es gibt keine kommende Reise. Leg sie zuerst in der Kachel „Reiseplaner“ an.' };
        const l = list(trip, 'pack'); if (l.some(p => String(p.n).toLowerCase() === v.artikel.toLowerCase())) return { fehler: 'Das steht schon auf der Packliste' }; l.push({ n: v.artikel, d: false }); return { text: `„${v.artikel}“ auf der Packliste für ${one(trip.dest, 40)}` }; } }
  };

  // ---------- Ist das ein Auftrag zum Eintragen, und wohin? ----------
  const STRONG = /(?<![a-zäöü])(?:trage?|trägst|eintragen|einzutragen|notiere?n?|notierst|füge?n?|fügst|hinzufügen|hinzuzufügen|vormerken|erinnere? mich|erinnerst|merk(?:e)? (?:dir|mir))(?![a-zäöü])/;
  const WEAK = /(?<![a-zäöü])(?:erstelle?n?|anlegen|lege?|speichere?n?|setze?n?|packe?n?|schreibe?n?|buche?n?|mache?n?|übernimm|aufnehmen|nimm)(?![a-zäöü])/;
  const QUESTION = /^\s*(?:(?:und\s+)?(?:was|welche[a-z]*|wann|wie|wo|warum|wieso|wer|hab(?:e)? ich|hast du|ist|sind|gibt|steht|zeige?|liste|erkläre?|kann ich|darf ich|muss ich))(?![a-zäöü])/;
  const PREFIX = /^\s*(?:(?:bitte\s+)?neue[rsn]?\s+)?(termin|aufgabe|to-?do|notiz|countdown|abo|gewohnheit|buchung|ausgabe|einnahme|einkaufsliste|sparziel|lernkarte|karteikarte)\s*:|^\s*neue[rsn]?\s+(termin|aufgabe|to-?do|notiz|countdown|abo|gewohnheit|buchung|ausgabe|einnahme|sparziel|lernkarte|karteikarte)(?![a-zäöü])/;
  const match = text => Object.keys(T).filter(id => T[id].words.test(text));
  // „in den Kalender“, „eine Aufgabe“: so ist das Ziel gemeint und nicht nur ein Wort im Titel
  const named = text => Object.keys(T).filter(id => {
    for (const m of text.matchAll(new RegExp(T[id].words.source, 'g'))) if (/(?:\b(?:in|ins|im|auf|zu|zur|zum|an|als)\s+(?:(?:meine[nmrs]?|die|den|das|der|dem|eine[nmr]?)\s+)?(?:neue[nmrs]?\s+)?|\b(?:eine?[nmr]?|neue[nmrs]?)\s+(?:neue[nmrs]?\s+)?)$/.test(text.slice(0, m.index))) return true;
    return false;
  });
  // „… und setz Milch auf die Einkaufsliste“: Jeder Teil mit eigenem Verb hat sein eigenes Ziel
  const SPLIT = /(?:\s*;|\.\s|,?\s+und\s|,?\s+außerdem\s|,?\s+dann\s)\s*(?=(?:bitte\s+)?(?:trage?|setze?|packe?|füge?|schreibe?|notiere?|erstelle?|lege?|erinnere?|speichere?|buche?|merke?)\s)/;
  function detect(message, before) {
    const q = String(message).toLowerCase().trim(), parts = q.split(SPLIT);
    if (parts.length > 1 && !QUESTION.test(q)) { const found = parts.map(x => detect(x)).filter(Boolean); if (found.length) return { targets: [...new Set(found.flatMap(x => x.targets))].slice(0, 3) }; }
    const follow = /^(?:und|auch|noch|ebenso|dasselbe|das gleiche)(?![a-zäöü])/.test(q) && q.length < 120 && !QUESTION.test(q);
    if (before && follow && !STRONG.test(q) && !match(q).length) { const b = detect(before); return b ? { ...b, follow: true } : null; }
    if (QUESTION.test(q)) return null;
    // „Buche 20 € …“ ist auch ohne genanntes Ziel eindeutig
    const prefix = PREFIX.exec(q), strong = STRONG.test(q) || (/^(?:bitte\s+)?buche?\s/.test(q) && /\d\s*(?:€|euro)/.test(q)), direct = named(q);
    if (!prefix && !strong && !(WEAK.test(q) && direct.length)) return null;
    let targets;
    if (prefix) targets = match(prefix[1] || prefix[2]);
    else targets = direct.length ? direct : match(q);
    if (!targets.length) {
      if (/€|\beuro\b|ausgegeben|bezahlt/.test(q)) targets = ['finanzen'];
      else if (/\bgearbeitet\b/.test(q)) targets = ['arbeitszeit'];
      else if (/\b(?:film|serie|buch)\b/.test(q) && !times(q).length) targets = ['merkliste'];
      else if (dates(q).length || times(q).length || /geburtstag/.test(q)) targets = ['kalender'];
      else if (/erinner/.test(q)) targets = ['aufgaben'];
      else if (/(?<![a-zäöü])(?:notiere?|merk(?:e)? (?:dir|mir))(?![a-zäöü])/.test(q)) targets = ['notizen'];
    }
    return { targets: targets.slice(0, 3) };
  }

  // ---------- Auftrag an das Modell ----------
  const ex = f => f.typ === 'date' ? 'Datumsangabe wörtlich aus dem Auftrag, z. B. „nächsten Dienstag“ oder „3.12.“' : f.typ === 'time' ? 'Uhrzeit als HH:MM' : f.typ === 'zahl' ? 'nur die Zahl' : f.typ === 'wahl' ? 'eine von: ' + f.opts.map(o => o[0] ? (o[0] === o[1] ? o[0] : `${o[0]} (${o[1]})`) : `"" (${o[1]})`).join(', ') : '';
  const schema = targets => ({ type: 'object', required: targets, properties: Object.fromEntries(targets.map(id => [id, { type: 'array', maxItems: 12, items: { type: 'object', required: T[id].fields.map(f => f.k),
    properties: Object.fromEntries(T[id].fields.map(f => [f.k, f.typ === 'wahl' ? { type: 'string', enum: f.opts.map(o => o[0]) } : { type: 'string' }])) } }])) });
  function prompt(targets, message, context) {
    const system = ['Du zerlegst einen Auftrag auf Deutsch in Einträge für eine App. Antworte nur mit JSON.',
      'Regeln: Erfinde nichts. Was nicht genannt ist, bleibt "". Pro Sache genau ein Eintrag; bei mehreren Tagen, Artikeln oder Dingen mehrere Einträge. Lege nur an, worum gebeten wird, sonst leere Liste. Titel kurz, ohne „trag ein“, Datum und Uhrzeit. Datumsangaben nicht umrechnen, sondern wörtlich übernehmen.',
      ...targets.map(id => `Liste "${id}" (${T[id].name}):\n${T[id].fields.map(f => `- ${f.k}: ${f.l}${[f.hint, ex(f)].filter(Boolean).map(x => '; ' + x).join('')}`).join('\n')}`)].join('\n\n');
    return [{ role: 'system', content: system }, { role: 'user', content: (context ? `Zusammenhang, nur um „das“ oder „auch“ zu verstehen:\n${context}\n\n` : '') + `Auftrag: ${message}` }];
  }

  // ---------- Antwort des Modells in geprüfte Vorschläge verwandeln ----------
  function proposals(targets, raw, message, before) {
    let j; try { j = JSON.parse(raw); } catch { return []; }
    const items = targets.flatMap(id => arr(j?.[id]).filter(x => x && typeof x === 'object').map(x => ({ id, x }))).slice(0, 12), out = [], seen = new Set();
    // Bei genau einem Eintrag gelten die Angaben aus dem Text: Das ist zuverlässiger als das Modell
    const source = before ? before + '\n' + message : message, single = items.length === 1;
    for (const { id, x } of items) {
      const t = T[id], inText = dates(message, t.back), clock = times(message), amounts = money(message), v = {};
      for (const f of t.fields) {
        const model = typeof x[f.k] === 'string' || typeof x[f.k] === 'number' ? String(x[f.k]).trim() : '';
        if (f.typ === 'date') {
          const own = model ? dates(model, t.back)[0]?.ymd || dates('am ' + model, t.back)[0]?.ymd : null, second = f.k === 'bis';
          let s = '';
          if (single && inText.length === 1) s = second ? '' : inText[0].ymd;
          else if (single && inText.length === 2 && t.fields.some(y => y.k === 'bis' && y.typ === 'date') && /bis|–|-/.test(message)) s = inText[second ? 1 : 0].ymd;
          else s = own || (!second && inText.length === 1 ? inText[0].ymd : '');
          if (!s && !second && !inText.length && !model && f.heute) s = today();
          if (!s && !second && !inText.length && before) s = own || dates(before, t.back)[0]?.ymd || (f.heute ? today() : '');
          v[f.k] = s;
        } else if (f.typ === 'time') {
          const own = isTime(model) ? model : times(model)[0] || (/^\d{1,2}$/.test(model) ? times(model + ' Uhr')[0] : '') || '';
          const second = f.k === 'bis';
          if (single && clock.length) v[f.k] = second ? (t.fields.some(y => y.k === 'von') ? clock[1] || '' : '') : clock[0];
          else v[f.k] = clock.includes(own) || times(source).includes(own) ? own : '';
        } else if (f.typ === 'zahl') {
          let n = number(model);
          if (single && f.k === 'betrag' && amounts.length === 1) n = amounts[0];
          // Zahlen, die nirgends stehen, hat das Modell erfunden
          if (n !== null && !(amounts.includes(n) || (source.match(/\d+(?:[.,]\d+)?/g) || []).some(s => number(s) === n))) n = null;
          if (n !== null && (n < (f.min ?? -Infinity) || n > (f.max ?? Infinity))) n = null;
          v[f.k] = n === null ? '' : String(n).replace('.', ',');
        } else if (f.typ === 'wahl') v[f.k] = f.opts.some(o => o[0] === model) ? model : f.dflt ?? f.opts[0][0];
        else v[f.k] = f.typ === 'lang' ? many(model, f.max) : one(model, f.max);
      }
      // „bis 16 Uhr“ hat im Kalender kein eigenes Feld
      if (id === 'kalender') { if (single && clock.length > 1 && !v.notiz) v.notiz = `bis ${clock[1]} Uhr`;
        if (single && /\bjede[nrs]? (?:woche|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)|wöchentlich|\b(?:montags|dienstags|mittwochs|donnerstags|freitags|samstags|sonntags)\b/i.test(message)) v.wiederholung = 'weekly';
        else if (single && /jeden monat|monatlich/i.test(message)) v.wiederholung = 'monthly'; else if (single && /jedes jahr|jährlich|geburtstag/i.test(message)) v.wiederholung = 'yearly';
        else if (!/jede|lich|geburtstag|montags|dienstags|mittwochs|donnerstags|freitags|samstags|sonntags/i.test(source)) v.wiederholung = ''; }
      const main = t.fields.find(f => f.req && (f.typ === 'text' || f.typ === 'lang'));
      if (main && !v[main.k] && !t.fields.some(f => f.typ !== 'wahl' && f.k !== main.k && v[f.k])) continue; // leerer Eintrag
      const key = id + JSON.stringify(v); if (seen.has(key)) continue; seen.add(key);
      out.push(card(id, v));
    }
    return out;
  }
  const card = (id, v) => ({ ziel: id, app: T[id].app, name: T[id].name, felder: T[id].fields.map(f => ({ k: f.k, l: f.l, typ: f.typ, req: !!f.req, ...(f.opts ? { opts: f.opts } : {}), v: v[f.k] ?? '' })) });
  const summary = p => `${p.name}: ${p.felder.filter(f => f.v && f.typ !== 'wahl').map(f => f.typ === 'date' ? deDay(f.v) : String(f.v).slice(0, 80)).join(', ')}`;

  // Werte aus dem Browser streng prüfen, bevor etwas gespeichert wird
  function check(id, werte) {
    const t = T[id], v = {};
    if (!werte || typeof werte !== 'object') return { fehler: 'Es fehlen die Angaben' };
    for (const f of t.fields) {
      const raw = Object.prototype.hasOwnProperty.call(werte, f.k) ? werte[f.k] : '';
      if (raw !== null && raw !== undefined && typeof raw !== 'string' && typeof raw !== 'number') return { fehler: `„${f.l}“ ist ungültig` };
      const s = String(raw ?? '').trim();
      if (f.typ === 'wahl') { const w = s === '' && !f.opts.some(o => o[0] === '') ? f.dflt ?? f.opts[0][0] : s; if (!f.opts.some(o => o[0] === w)) return { fehler: `„${f.l}“ ist ungültig` }; v[f.k] = w; continue; }
      if (!s) { if (f.req) return { fehler: `„${f.l}“ fehlt noch` }; v[f.k] = f.typ === 'zahl' ? null : ''; continue; }
      if (f.typ === 'date') { if (!isDay(s)) return { fehler: `„${f.l}“ ist kein gültiges Datum` }; v[f.k] = s; }
      else if (f.typ === 'time') { if (!isTime(s)) return { fehler: `„${f.l}“ ist keine gültige Uhrzeit` }; v[f.k] = s; }
      else if (f.typ === 'zahl') { const n = number(s); if (n === null || n < (f.min ?? -Infinity) || n > (f.max ?? Infinity)) return { fehler: `„${f.l}“: bitte eine Zahl von ${String(f.min).replace('.', ',')} bis ${f.max}` }; v[f.k] = Math.round(n * 100) / 100; }
      else { if (s.length > f.max) return { fehler: `„${f.l}“ ist zu lang (höchstens ${f.max} Zeichen)` }; v[f.k] = f.typ === 'lang' ? many(s, f.max) : one(s, f.max); }
    }
    return { v };
  }

  return { TARGETS: T, detect, schema, prompt, proposals, summary, check, dates, times, money };
};
