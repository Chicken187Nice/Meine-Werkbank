// Wochenbericht: bündelt Meldungen zum selben Ereignis, gewichtet die Ereignisse
// und fasst jedes mit Sätzen aus den Quellen zusammen. Läuft komplett auf dem Server, ohne fremden Dienst.
'use strict';

const STOP = new Set(('der die das den dem des ein eine einen einem einer eines und oder aber doch auch noch nur schon sehr mehr als wie bei beim mit von vom zum zur für fuer auf aus an am im ins ist sind war waren wird werden wurde wurden worden ' +
  'hat haben hatte hatten habe sei seien sein seine seinen seiner seinem ihr ihre ihren ihrer ihrem sie er es wir uns ihm ihn ihnen sich nicht kein keine keinen keiner nach vor über unter gegen ohne um bis seit durch zwischen während wegen trotz ' +
  'dass weil wenn dann denn so da dort hier jetzt nun neu neue neuen neuer neues neuem will wollen wollte soll sollen sollte kann können konnte könnte muss müssen musste darf dürfen möchte gibt geben gab geht gehen kommt kommen kam macht machen ' +
  'laut sagt sagte erklärt erklärte teilt teilte mitteilte berichtet jahr jahre jahren heute gestern morgen woche wochen tag tage tagen monat monate prozent millionen milliarden euro weitere weiteren weiter erste ersten erstmals zwei drei vier fünf ' +
  'viele vielen alle allen alles zudem außerdem jedoch bereits immer wieder dabei damit davon dazu dafür darauf diese dieser diesem diesen dieses jede jeder jedes man mal etwa rund fast knapp ab zu was wer wo warum welche welcher welches künftig ' +
  'deutschland deutsche deutschen deutscher eigene eigenen anderen andere anderer einige mehrere seit gleich lange kurz groß große großen viel wenig ganz zeigt zeigen sieht sehen steht stehen bleibt bleiben setzt setzen stellt stellen liegt ' +
  'the of to in on for and or with from by is are was were be been has have had new says said after over into about more than its it as at this that these those will can could would how why what who not but their them they his her you your').split(/\s+/));
const SHORT = new Set(['ki', 'eu', 'us', 'ai', 'un', 'uk', 'ag', 'it']);
// Werbung, Sammelformate und Sendungshinweise sind keine Ereignisse
const NOISE = /^(heise[ -]angebot|anzeige\b|techstage|top\+?:|deal:|(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag):)|tagesschau in 100 sekunden|livestream|gewinnspiel|\bpodcast\b|\bquiz\b|11km|bit-rauschen|was war\. was wird|^c['’]t (3003|uplink)|\bdeals?\b|schnäppchen|rabatt(aktion|code)|gutschein|bestpreis|tiefstpreis|kaufberatung|bestenliste|testsieger|im preisvergleich|(black (friday|week)|cyber (monday|week)).*(euro|rabatt|angebot|günstig|preis|sparen)|(euro|rabatt|angebot|günstig|sparen).*(black (friday|week)|cyber (monday|week))/i;
const WEAK = /^(\+\+\+|liveblog|liveticker|kommentar|interview|analyse|kolumne|faq|hintergrund|test:|ausprobiert|meinung)|\?$/i;

const stem = w => w.length > 7 ? w.slice(0, 7) : w.length > 4 ? w.replace(/(en|er|es|em|e|n|s)$/, '') : w;
const words = t => (String(t || '').toLowerCase().match(/[\p{L}\p{N}]+/gu) || []).filter(w => (w.length > 2 || SHORT.has(w)) && !STOP.has(w) && !/^\d{1,3}$/.test(w)).map(stem);

function vectors(items) {
  const df = new Map(), docs = items.map(i => { const title = words(i.title), body = words(i.summary); for (const w of new Set([...title, ...body])) df.set(w, (df.get(w) || 0) + 1); return { title, body }; });
  return docs.map(d => { const v = new Map();
    for (const [list, f] of [[d.title, 2.2], [d.body, 1]]) for (const w of list) v.set(w, (v.get(w) || 0) + f * Math.log(1 + items.length / df.get(w)));
    const len = Math.hypot(...v.values()) || 1; for (const [w, x] of v) v.set(w, x / len); return { v, title: new Set(d.title) }; });
}
const dot = (a, b) => { if (a.size > b.size) [a, b] = [b, a]; let s = 0; for (const [w, x] of a) s += x * (b.get(w) || 0); return s; };

function cluster(items, vec) {
  const list = [], byWord = new Map(); // nur Gruppen vergleichen, die ein Wort teilen
  const order = items.map((_, i) => i).sort((a, b) => String(items[a].date).localeCompare(String(items[b].date)));
  for (const i of order) {
    const { v, title } = vec[i], t = Date.parse(items[i].date) || 0, near = new Set();
    for (const w of title) for (const c of byWord.get(w) || []) near.add(c);
    let best = null, score = 0;
    for (const c of near) {
      if (t - c.last > 4 * 864e5) continue;
      const s = dot(v, c.sum) / c.len, shared = [...title].filter(w => c.titles.has(w)).length;
      // Zwei gemeinsame Wörter in der Überschrift, oder eines bei sehr ähnlichem Text
      if (s > score && (shared >= 2 && s >= .2 || shared >= 1 && s >= .34)) { best = c; score = s; }
    }
    if (!best) { best = { members: [], sum: new Map(), titles: new Set(), len: 1, last: 0 }; list.push(best); }
    best.members.push(i); best.last = Math.max(best.last, t);
    for (const [w, x] of v) best.sum.set(w, (best.sum.get(w) || 0) + x);
    best.len = Math.hypot(...best.sum.values()) || 1;
    for (const w of title) { best.titles.add(w); let l = byWord.get(w); if (!l) byWord.set(w, l = new Set()); l.add(best); }
  }
  return list;
}

// Ganze Sätze aus einem Anrisstext; abgeschnittene und Füllsätze fallen weg
function sentences(text) {
  const t = String(text || '').replace(/\s+/g, ' ').trim()
    .replace(/\b(z|d|u|o|s|v|ca|bzw|Dr|Prof|Nr|St|Mio|Mrd|ggf|inkl|sog|etc|vgl|Jan|Feb|Aug|Sept?|Okt|Nov|Dez|\d{1,2})\.(?= )/g, '$1\u0001');
  return t.split(/(?<=[.!?]["“”»«]?)\s+(?=["„“»«(]?[\p{Lu}\p{N}])/u).map(s => s.replace(/\u0001/g, '.').trim())
    .filter(s => s.length >= 30 && s.length <= 340 && /[.!?]["“”»«)]?$/.test(s) && !/(\.\.\.|…|\[\])\s*$/.test(s) && !/^(von|mehr|lesen|weiterlesen|hier|zum artikel|read more)\b|\[(…|\.\.\.)\]|der beitrag .* erschien|\bwir (zeigen|erklären|stellen)\b|heise ?\+|pro-talk|jetzt (lesen|ansehen|anmelden)/i.test(s));
}
const overlap = (a, b) => { const x = new Set(words(a)), y = new Set(words(b)); if (!x.size || !y.size) return 1; return [...x].filter(w => y.has(w)).length / Math.min(x.size, y.size); };
const clean = t => String(t || '').replace(/^\s*(\+\+\+\s*|liveblog:\s*|liveticker:\s*)/i, '').replace(/\s*\+\+\+\s*$/, '').trim();

function keywordRx(k) { const e = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); return new RegExp(`(?<![\\p{L}\\p{N}])${e}${k.length <= 3 ? '(?![\\p{L}\\p{N}])' : ''}`, 'iu'); }

function summarize(raw, { keywords = [], only = false, count = 7 } = {}) {
  const kws = keywords.map(k => String(k).trim()).filter(Boolean).slice(0, 40).map(k => ({ k, rx: keywordRx(k) }));
  const seen = new Set();
  const items = raw.filter(i => { if (!i || !i.title || NOISE.test(i.title)) return false; const key = i.title.toLowerCase(); if (seen.has(key)) return false; seen.add(key); return true; }).slice(0, 2500);
  const vec = vectors(items);
  let events = cluster(items, vec).map(c => {
    const m = c.members.map(i => ({ ...items[i], sim: dot(vec[i].v, c.sum) / c.len }));
    const matched = kws.filter(({ rx }) => m.some(i => rx.test(i.title) || rx.test(i.summary || ''))).map(x => x.k);
    const sources = [...new Set(m.map(i => i.source))], days = new Set(m.map(i => String(i.date).slice(0, 10))).size;
    const newest = Math.max(...m.map(i => Date.parse(i.date) || 0));
    // Wichtig ist, worüber mehrere Quellen, oft und an mehreren Tagen berichten
    const score = 4 * (sources.length - 1) + 3 * Math.log2(m.length) + 1.2 * (days - 1) + 1.5 * Math.min(2, matched.length) + Math.max(0, 1 - (Date.now() - newest) / (7 * 864e5));
    return { m, matched, sources, score };
  });
  if (only && kws.length) events = events.filter(e => e.matched.length);
  events.sort((a, b) => b.score - a.score);
  const out = [], perSource = {};
  for (const e of events) {
    if (out.length >= count) break;
    // Einzelmeldungen: nicht alle aus derselben Quelle
    if (e.m.length === 1 && (perSource[e.sources[0]] || 0) >= Math.ceil(count / 2)) continue;
    const quality = i => i.sim + (sentences(i.summary).length ? .25 : 0) - (WEAK.test(i.title) ? .5 : 0);
    const lead = [...e.m].sort((a, b) => quality(b) - quality(a))[0];
    const text = sentences(lead.summary).slice(0, 2);
    const more = e.m.filter(i => i !== lead).sort((a, b) => b.sim - a.sim).slice(0, 8).flatMap(i => sentences(i.summary).slice(0, 1).map(s => ({ s, date: i.date })));
    const extra = [];
    for (const x of more) { if (text.length + extra.length >= 4 || [...text, ...extra.map(y => y.s), x.s].join(' ').length > 620) break;
      if ([...text, ...extra.map(y => y.s)].every(s => overlap(s, x.s) < .45)) extra.push(x); }
    extra.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    const dates = e.m.map(i => i.date).filter(Boolean).sort();
    const links = [lead, ...e.m.filter(i => i !== lead).sort((a, b) => b.sim - a.sim)].filter(i => /^https?:\/\//i.test(i.link || '')).slice(0, 6).map(i => ({ source: i.source, title: i.title, link: i.link }));
    for (const s of e.sources) perSource[s] = (perSource[s] || 0) + 1;
    out.push({ title: clean(lead.title), text: [...text, ...extra.map(x => x.s)].join(' '), from: dates[0] || null, to: dates[dates.length - 1] || null, count: e.m.length, sources: e.sources, matched: e.matched, links });
  }
  const dates = items.map(i => i.date).filter(Boolean).sort();
  return { events: out, total: items.length, sources: [...new Set(items.map(i => i.source))], since: dates[0] || null, until: dates[dates.length - 1] || null };
}

// Sammelbecken: Feeds zeigen oft nur die letzten ein, zwei Tage, deshalb wird laufend gesammelt
function mergePool(old, fresh, now = Date.now()) {
  const map = new Map();
  for (const i of [...(Array.isArray(old) ? old : []), ...fresh]) {
    if (!i || !i.title) continue; const key = (i.feed || '') + '|' + (i.link || i.title), before = map.get(key);
    map.set(key, { title: i.title, link: i.link, summary: i.summary, source: i.source, feed: i.feed, date: i.date || before?.date || new Date(now).toISOString() });
  }
  return [...map.values()].filter(i => { const t = Date.parse(i.date); return t >= now - 7 * 864e5 && t <= now + 864e5; }).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3000);
}

module.exports = { summarize, mergePool, sentences };
