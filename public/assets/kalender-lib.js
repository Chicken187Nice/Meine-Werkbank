'use strict';
// Gemeinsam für Kalender, Arbeitszeit und Startseite: Feiertage (rechnet alles selbst) und Terminwiederholungen.
(() => {
  const ymd = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const day = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12); };
  const plus = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  // Gleicher Tag n Monate später; gibt es ihn nicht (31., 29.2.), der letzte Tag des Monats
  const months = (d, n) => { const x = new Date(d); x.setDate(1); x.setMonth(x.getMonth() + n); x.setDate(Math.min(d.getDate(), new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate())); return x; };
  function easter(y) { const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451); return new Date(y, Math.floor((h + l - 7 * m + 114) / 31) - 1, (h + l - 7 * m + 114) % 31 + 1, 12); }
  const LAENDER = [['BW', 'Baden-Württemberg'], ['BY', 'Bayern'], ['BE', 'Berlin'], ['BB', 'Brandenburg'], ['HB', 'Bremen'], ['HH', 'Hamburg'], ['HE', 'Hessen'], ['MV', 'Mecklenburg-Vorpommern'], ['NI', 'Niedersachsen'], ['NW', 'Nordrhein-Westfalen'], ['RP', 'Rheinland-Pfalz'], ['SL', 'Saarland'], ['SN', 'Sachsen'], ['ST', 'Sachsen-Anhalt'], ['SH', 'Schleswig-Holstein'], ['TH', 'Thüringen']];
  const cache = {};
  // Gesetzliche Feiertage eines Jahres: { 'JJJJ-MM-TT': Name }
  function feiertage(y, land = 'BY') {
    const key = y + land; if (cache[key]) return cache[key]; const E = easter(y), o = {};
    const fix = (m, d, n) => { o[ymd(new Date(y, m - 1, d, 12))] = n; }, rel = (n, name) => { o[ymd(plus(E, n))] = name; }, nur = list => list.split(' ').includes(land);
    fix(1, 1, 'Neujahr'); rel(-2, 'Karfreitag'); rel(1, 'Ostermontag'); fix(5, 1, 'Tag der Arbeit'); rel(39, 'Christi Himmelfahrt'); rel(50, 'Pfingstmontag'); fix(10, 3, 'Tag der Deutschen Einheit'); fix(12, 25, '1. Weihnachtstag'); fix(12, 26, '2. Weihnachtstag');
    if (nur('BW BY ST')) fix(1, 6, 'Heilige Drei Könige');
    if (nur('BE MV')) fix(3, 8, 'Frauentag');
    if (nur('BW BY HE NW RP SL')) rel(60, 'Fronleichnam');
    if (nur('BY SL')) fix(8, 15, land === 'BY' ? 'Mariä Himmelfahrt (nicht überall in Bayern)' : 'Mariä Himmelfahrt');
    if (nur('TH')) fix(9, 20, 'Weltkindertag');
    if (nur('BB HB HH MV NI SN ST SH TH')) fix(10, 31, 'Reformationstag');
    if (nur('BW BY NW RP SL')) fix(11, 1, 'Allerheiligen');
    if (nur('SN')) { let d = new Date(y, 10, 22, 12); while (d.getDay() !== 3) d = plus(d, -1); o[ymd(d)] = 'Buß- und Bettag'; }
    return cache[key] = o;
  }
  const feiertag = (s, land) => feiertage(+s.slice(0, 4), land)[s] || '';
  // Alle Tage eines Termins zwischen von und bis. rep: '', 'weekly', 'monthly', 'yearly'
  function tage(ev, von, bis) {
    const out = []; if (!ev.date) return out; const start = day(ev.date), len = ev.end && ev.end > ev.date ? Math.min(366, Math.round((day(ev.end) - start) / 864e5)) : 0;
    const stop = ev.rep && ev.until && ev.until < bis ? ev.until : bis;
    const nth = i => ev.rep === 'weekly' ? plus(start, 7 * i) : ev.rep === 'monthly' ? months(start, i) : ev.rep === 'yearly' ? months(start, 12 * i) : start;
    // Nicht beim ersten Mal anfangen: ein alter wöchentlicher Termin hat sehr viele Vorkommen
    const gap = day(von) - start; let i = !ev.rep || gap <= 0 ? 0 : Math.max(0, Math.floor(gap / 864e5 / (ev.rep === 'weekly' ? 7 : ev.rep === 'monthly' ? 31 : 366)) - 1 - Math.ceil(len / 7));
    for (let n = 0; n < 1200; n++, i++) { const a = nth(i); if (ymd(a) > stop) break;
      for (let k = 0; k <= len; k++) { const s = ymd(plus(a, k)); if (s >= von && s <= bis) out.push(s); }
      if (!ev.rep) break; }
    return [...new Set(out)];
  }
  // Termine aus anderen Kacheln (nur lesen). data = { aufgaben, countdown, abos, reisen }
  function fremde(data, von, bis) {
    const out = [], add = (date, t, app) => { if (date >= von && date <= bis) out.push({ date, t, app }); };
    for (const t of data.aufgaben?.tasks || []) if (t.due && t.col !== 'fertig') add(t.due, t.t, 'aufgaben');
    for (const c of data.countdown?.items || []) for (const s of tage({ date: c.date, rep: c.kind === 'yearly' ? 'yearly' : '' }, von, bis)) add(s, c.name, 'countdown');
    for (const t of data.reisen?.trips || []) if (t.from) for (const s of tage({ date: t.from, end: t.to }, von, bis)) add(s, 'Reise: ' + t.dest, 'reisen');
    for (const a of data.abos?.abos || []) if (!a.cancelled && a.renew && a.interval > 0) { const base = day(a.renew);
      for (let i = 0; i < 400; i++) { const r = months(base, i * a.interval); const f = a.unit === 'd' ? plus(r, -a.notice) : a.unit === 'w' ? plus(r, -7 * a.notice) : months(r, -a.notice); const s = ymd(f); if (s > bis) break; add(s, 'Kündigungsfrist: ' + a.name, 'abos'); } }
    return out;
  }
  // Der Server (KI-Assistent) lädt diese Datei auch
  (typeof window === 'object' ? window : module.exports).WBKalender = { LAENDER, feiertage, feiertag, tage, fremde, ymd, day, plus };
})();
