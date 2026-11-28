'use strict';
// Läuft getrennt von der Seite: Ein Ausdruck, der ewig rechnet, kann so abgebrochen werden.
onmessage = e => {
  const { pattern, flags, text, replace } = e.data;
  try {
    const re = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g'); const hits = []; let m, count = 0;
    while ((m = re.exec(text))) { count++; if (hits.length < 500) hits.push({ i: m.index, s: m[0], g: m.slice(1), n: m.groups ? { ...m.groups } : null });
      if (m[0] === '') re.lastIndex++; if (!flags.includes('g') || count >= 100000) break; }
    postMessage({ hits, count, replaced: replace === null ? null : text.replace(new RegExp(pattern, flags), replace).slice(0, 100000) });
  } catch (err) { postMessage({ error: err.message }); }
};
