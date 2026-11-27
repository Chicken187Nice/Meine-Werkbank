// Werkbank – eigene Pixelschrift „WB Pixel“. Die Zeichen stehen hier als Raster und werden im Browser
// zu einer Schriftdatei zusammengebaut (nichts wird geladen, nichts stammt aus fremden Schriften).
// Raster: 7 Zeilen Großbuchstabenhöhe; weitere Zeilen darunter sind Unterlängen, „^“-Zeilen liegen darüber.
(function () {
  'use strict';
  const G = {
    'A': '.###.|#...#|#...#|#####|#...#|#...#|#...#', 'B': '####.|#...#|#...#|####.|#...#|#...#|####.', 'C': '.###.|#...#|#....|#....|#....|#...#|.###.', 'D': '####.|#...#|#...#|#...#|#...#|#...#|####.',
    'E': '#####|#....|#....|####.|#....|#....|#####', 'F': '#####|#....|#....|####.|#....|#....|#....', 'G': '.###.|#...#|#....|#.###|#...#|#...#|.###.', 'H': '#...#|#...#|#...#|#####|#...#|#...#|#...#',
    'I': '###|.#.|.#.|.#.|.#.|.#.|###', 'J': '....#|....#|....#|....#|....#|#...#|.###.', 'K': '#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#', 'L': '#....|#....|#....|#....|#....|#....|#####',
    'M': '#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#', 'N': '#...#|##..#|##..#|#.#.#|#..##|#..##|#...#', 'O': '.###.|#...#|#...#|#...#|#...#|#...#|.###.', 'P': '####.|#...#|#...#|####.|#....|#....|#....',
    'Q': '.###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#', 'R': '####.|#...#|#...#|####.|#.#..|#..#.|#...#', 'S': '.####|#....|#....|.###.|....#|....#|####.', 'T': '#####|..#..|..#..|..#..|..#..|..#..|..#..',
    'U': '#...#|#...#|#...#|#...#|#...#|#...#|.###.', 'V': '#...#|#...#|#...#|#...#|#...#|.#.#.|..#..', 'W': '#...#|#...#|#...#|#.#.#|#.#.#|##.##|#...#', 'X': '#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#',
    'Y': '#...#|#...#|.#.#.|..#..|..#..|..#..|..#..', 'Z': '#####|....#|...#.|..#..|.#...|#....|#####',
    'a': '.....|.....|.###.|....#|.####|#...#|.####', 'b': '#....|#....|#.##.|##..#|#...#|#...#|####.', 'c': '.....|.....|.###.|#...#|#....|#...#|.###.', 'd': '....#|....#|.##.#|#..##|#...#|#...#|.####',
    'e': '.....|.....|.###.|#...#|#####|#....|.###.', 'f': '..##|.#..|####|.#..|.#..|.#..|.#..', 'g': '.....|.....|.####|#...#|#...#|.####|....#|.###.', 'h': '#....|#....|#.##.|##..#|#...#|#...#|#...#',
    'i': '#|.|#|#|#|#|#', 'j': '...#|....|...#|...#|...#|...#|#..#|.##.', 'k': '#...|#...|#..#|#.#.|##..|#.#.|#..#', 'l': '#.|#.|#.|#.|#.|#.|.#',
    'm': '.....|.....|##.#.|#.#.#|#.#.#|#...#|#...#', 'n': '.....|.....|####.|#...#|#...#|#...#|#...#', 'o': '.....|.....|.###.|#...#|#...#|#...#|.###.', 'p': '.....|.....|#.##.|##..#|#...#|####.|#....|#....',
    'q': '.....|.....|.##.#|#..##|#...#|.####|....#|....#', 'r': '.....|.....|#.##.|##..#|#....|#....|#....', 's': '.....|.....|.####|#....|.###.|....#|####.', 't': '.#..|.#..|####|.#..|.#..|.#..|..##',
    'u': '.....|.....|#...#|#...#|#...#|#..##|.##.#', 'v': '.....|.....|#...#|#...#|#...#|.#.#.|..#..', 'w': '.....|.....|#...#|#...#|#.#.#|#.#.#|.#.#.', 'x': '.....|.....|#...#|.#.#.|..#..|.#.#.|#...#',
    'y': '.....|.....|#...#|#...#|#...#|.####|....#|.###.', 'z': '.....|.....|#####|...#.|..#..|.#...|#####',
    '0': '.###.|#...#|#..##|#.#.#|##..#|#...#|.###.', '1': '..#..|.##..|..#..|..#..|..#..|..#..|#####', '2': '.###.|#...#|....#|..##.|.#...|#...#|#####', '3': '.###.|#...#|....#|..##.|....#|#...#|.###.',
    '4': '...##|..#.#|.#..#|#...#|#####|....#|....#', '5': '#####|#....|####.|....#|....#|#...#|.###.', '6': '..##.|.#...|#....|####.|#...#|#...#|.###.', '7': '#####|#...#|....#|...#.|..#..|..#..|..#..',
    '8': '.###.|#...#|#...#|.###.|#...#|#...#|.###.', '9': '.###.|#...#|#...#|.####|....#|...#.|.##..',
    '!': '#|#|#|#|#|.|#', '"': '#.#|#.#|...|...|...|...|...', '#': '.#.#.|.#.#.|#####|.#.#.|#####|.#.#.|.#.#.', '$': '..#..|.####|#....|.###.|....#|####.|..#..', '%': '##..#|##.#.|...#.|..#..|.#...|.#.##|#..##',
    '&': '..#..|.#.#.|..#..|.##.#|#..#.|#..#.|.##.#', "'": '#|#|.|.|.|.|.', '(': '.#|#.|#.|#.|#.|#.|.#', ')': '#.|.#|.#|.#|.#|.#|#.', '*': '.....|#.#.#|.###.|#.#.#|.....|.....|.....',
    '+': '.....|..#..|..#..|#####|..#..|..#..|.....', ',': '..|..|..|..|..|.#|.#|#.', '-': '....|....|....|####|....|....|....', '.': '.|.|.|.|.|.|#', '/': '....#|...#.|...#.|..#..|.#...|.#...|#....',
    ':': '.|.|#|.|.|#|.', ';': '..|..|.#|..|..|.#|.#|#.', '<': '...#|..#.|.#..|#...|.#..|..#.|...#', '=': '....|....|####|....|####|....|....', '>': '#...|.#..|..#.|...#|..#.|.#..|#...',
    '?': '.###.|#...#|....#|...#.|..#..|.....|..#..', '@': '.###.|#...#|#.###|#.#.#|#.###|#....|.###.', '[': '###|#..|#..|#..|#..|#..|###', '\\': '#....|.#...|.#...|..#..|...#.|...#.|....#', ']': '###|..#|..#|..#|..#|..#|###',
    '^': '..#..|.#.#.|#...#|.....|.....|.....|.....', '_': '.....|.....|.....|.....|.....|.....|.....|#####', '`': '#.|.#|..|..|..|..|..', '{': '..##|.#..|.#..|#...|.#..|.#..|..##', '|': '#|#|#|#|#|#|#', '}': '##..|..#.|..#.|...#|..#.|..#.|##..',
    '~': '.....|.....|.#...|#.#.#|...#.|.....|.....',
    '€': '..###|.#...|####.|.#...|####.|.#...|..###', '£': '..##.|.#..#|.#...|###..|.#...|.#...|#####', '°': '.##.|#..#|.##.|....|....|....|....', '§': '.###|#...|.##.|#..#|.##.|...#|###.', 'µ': '.....|.....|#...#|#...#|#...#|##.##|#.#.#|#....',
    'ß': '.##..|#..#.|#..#.|#.##.|#...#|#...#|#.##.', '–': '.....|.....|.....|#####|.....|.....|.....', '—': '.......|.......|.......|#######|.......|.......|.......', '·': '.|.|.|#|.|.|.', '•': '...|...|###|###|###|...|...', '…': '.....|.....|.....|.....|.....|.....|#.#.#',
    '„': '....|....|....|....|....|.#.#|.#.#|#.#.', '“': '.#.#|#.#.|#.#.|....|....|....|....', '”': '#.#.|#.#.|.#.#|....|....|....|....', '‚': '..|..|..|..|..|.#|.#|#.', '‘': '.#|#.|#.|..|..|..|..', '’': '.#|.#|#.|..|..|..|..',
    '«': '.....|..#.#|.#.#.|#.#..|.#.#.|..#.#|.....', '»': '.....|#.#..|.#.#.|..#.#|.#.#.|#.#..|.....', '‹': '..|.#|#.|#.|#.|.#|..', '›': '..|#.|.#|.#|.#|#.|..', '×': '.....|.....|#...#|.#.#.|..#..|.#.#.|#...#', '÷': '.....|..#..|.....|#####|.....|..#..|.....',
    '←': '.......|..#....|.#.....|#######|.#.....|..#....|.......', '→': '.......|....#..|.....#.|#######|.....#.|....#..|.......', '↑': '..#..|.###.|#.#.#|..#..|..#..|..#..|..#..', '↓': '..#..|..#..|..#..|..#..|#.#.#|.###.|..#..',
    '✓': '.....|....#|...#.|...#.|#.#..|.#...|.....', '✕': '.....|#...#|.#.#.|..#..|.#.#.|#...#|.....', '✎': '....#|...##|..##.|.##..|##...|##...|.....', '▸': '#..|##.|###|###|##.|#..|...', '▾': '.....|.....|#####|.###.|..#..|.....|.....',
    '²': '##.|..#|.#.|###|...|...|...', '³': '##.|.#.|..#|##.|...|...|...', '½': '#...#|#..#.|#.#..|..###|.#..#|#..#.|..###', '±': '..#..|..#..|#####|..#..|..#..|.....|#####', '≈': '.....|.#..#|#.##.|.....|.#..#|#.##.|.....'
  };
  const dots = (base, gap) => '^' + gap + '|' + G[base];
  // Umlaute: Punkte über dem Buchstaben (Kleinbuchstaben haben oben Platz im Raster)
  const top = (base, row) => { const r = G[base].split('|'); r[0] = row; return r.join('|'); };
  G['Ä'] = dots('A', '.#.#.|^.....'); G['Ö'] = dots('O', '.#.#.|^.....'); G['Ü'] = dots('U', '.#.#.|^.....');
  G['ä'] = top('a', '.#.#.'); G['ö'] = top('o', '.#.#.'); G['ü'] = top('u', '.#.#.');
  G['é'] = top('e', '...#.').replace('|.....', '|..#..'); G['è'] = top('e', '.#...').replace('|.....', '|..#..'); G['á'] = top('a', '...#.').replace('|.....', '|..#..'); G['à'] = top('a', '.#...').replace('|.....', '|..#..');

  const PX = 100, ASC = 900, DESC = 250; // Einheiten je Pixel, Ober- und Unterlänge (1000 = eine Schriftgröße)

  // Umriss der gefüllten Pixel als geschlossene Linienzüge (gefüllte Fläche rechts, wie TrueType es erwartet)
  function outline(cells) {
    const has = new Set(cells.map(c => c.join(','))), edges = new Map();
    const add = (a, b) => { const k = a.join(','); if (!edges.has(k)) edges.set(k, []); edges.get(k).push(b); };
    for (const [x, y] of cells) {
      if (!has.has([x, y + 1].join(','))) add([x, y + 1], [x + 1, y + 1]);
      if (!has.has([x + 1, y].join(','))) add([x + 1, y + 1], [x + 1, y]);
      if (!has.has([x, y - 1].join(','))) add([x + 1, y], [x, y]);
      if (!has.has([x - 1, y].join(','))) add([x, y], [x, y + 1]);
    }
    const loops = [];
    while (edges.size) {
      const start = edges.keys().next().value; let at = start.split(',').map(Number), dir = null; const pts = [];
      do {
        const k = at.join(','), list = edges.get(k); let i = 0;
        // An Berührpunkten zweier Pixel rechts abbiegen, damit die Züge getrennt bleiben
        if (list.length > 1 && dir) { const rank = b => { const d = [b[0] - at[0], b[1] - at[1]], cross = dir[0] * d[1] - dir[1] * d[0]; return cross < 0 ? 0 : cross === 0 ? 1 : 2; }; i = rank(list[0]) <= rank(list[1]) ? 0 : 1; }
        const next = list.splice(i, 1)[0]; if (!list.length) edges.delete(k);
        const d = [next[0] - at[0], next[1] - at[1]]; if (!dir || d[0] !== dir[0] || d[1] !== dir[1]) pts.push(at);
        dir = d; at = next;
      } while (at.join(',') !== start);
      loops.push(pts);
    }
    return loops;
  }

  function glyph(def) {
    const rows = def.split('|'), above = rows.filter(r => r[0] === '^').length;
    const cells = [];
    rows.forEach((raw, i) => { const r = raw.replace('^', ''), y = 6 + above - i; for (let x = 0; x < r.length; x++) if (r[x] === '#') cells.push([x, y]); });
    const width = rows[rows.length - 1].replace('^', '').length;
    return { adv: (width + 1) * PX, loops: outline(cells).map(l => l.map(([x, y]) => [x * PX, y * PX])) };
  }

  // ---------- Schriftdatei (TrueType) ----------
  class Out { constructor() { this.b = []; } u8(v) { this.b.push(v & 255); return this; } u16(v) { return this.u8(v >> 8).u8(v); } u32(v) { return this.u16(v >>> 16).u16(v); }
    tag(s) { for (const c of s) this.u8(c.charCodeAt(0)); return this; } add(a) { for (const v of a) this.b.push(v); return this; } pad() { while (this.b.length % 4) this.b.push(0); return this; } }
  function glyfData(g) {
    if (!g.loops.length) return [];
    const pts = g.loops.flat(), xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), o = new Out();
    o.u16(g.loops.length).u16(Math.min(...xs)).u16(Math.min(...ys)).u16(Math.max(...xs)).u16(Math.max(...ys));
    let n = -1; for (const l of g.loops) { n += l.length; o.u16(n); }
    o.u16(0); for (let i = 0; i < pts.length; i++) o.u8(1); // jeder Punkt liegt auf der Linie, Abstände als 16 Bit
    for (const axis of [0, 1]) { let last = 0; for (const p of pts) { o.u16(p[axis] - last); last = p[axis]; } }
    return o.pad().b;
  }
  function build() {
    const chars = Object.keys(G).sort((a, b) => a.codePointAt(0) - b.codePointAt(0));
    const space = { adv: 4 * PX, loops: [] };
    const box = { adv: 6 * PX, loops: [[[0, 0], [0, 700], [500, 700], [500, 0]], [[100, 100], [400, 100], [400, 600], [100, 600]]] };
    // Reihenfolge: Ersatzzeichen, Leerzeichen, geschütztes Leerzeichen, dann alle Zeichen nach Nummer
    const list = [{ g: box }, { cp: 32, g: space }, { cp: 160, g: space }, ...chars.map(c => ({ cp: c.codePointAt(0), g: glyph(G[c]) }))];
    const map = list.map((e, i) => [e.cp, i]).filter(e => e[0] !== undefined).sort((a, b) => a[0] - b[0]);
    const glyf = new Out(), loca = new Out(), hmtx = new Out(); let maxPts = 0, maxCont = 0, xMax = 0, yMax = 0, yMin = 0, advMax = 0;
    for (const { g } of list) {
      loca.u32(glyf.b.length); glyf.add(glyfData(g));
      const pts = g.loops.flat(); hmtx.u16(g.adv).u16(pts.length ? Math.min(...pts.map(p => p[0])) : 0);
      maxPts = Math.max(maxPts, pts.length); maxCont = Math.max(maxCont, g.loops.length); advMax = Math.max(advMax, g.adv);
      for (const [x, y] of pts) { xMax = Math.max(xMax, x); yMax = Math.max(yMax, y); yMin = Math.min(yMin, y); }
    }
    loca.u32(glyf.b.length);
    const n = list.length;
    // cmap: Format 4, ein Abschnitt je zusammenhängender Zeichenfolge
    const segs = []; for (const [cp, gi] of map) { const s = segs[segs.length - 1]; if (s && cp === s.end + 1 && gi - cp === s.delta) s.end = cp; else segs.push({ start: cp, end: cp, delta: gi - cp }); }
    segs.push({ start: 0xffff, end: 0xffff, delta: 1 });
    const sc = segs.length, pow = 2 ** Math.floor(Math.log2(sc)), cmap = new Out();
    cmap.u16(0).u16(1).u16(3).u16(1).u32(12).u16(4).u16(16 + sc * 8).u16(0).u16(sc * 2).u16(pow * 2).u16(Math.log2(pow)).u16(sc * 2 - pow * 2);
    segs.forEach(s => cmap.u16(s.end)); cmap.u16(0); segs.forEach(s => cmap.u16(s.start)); segs.forEach(s => cmap.u16(s.delta)); segs.forEach(() => cmap.u16(0));
    const head = new Out().u32(0x00010000).u32(0x00010000).u32(0).u32(0x5f0f3cf5).u16(3).u16(1000).u32(0).u32(0).u32(0).u32(0).u16(0).u16(yMin).u16(xMax).u16(yMax).u16(0).u16(8).u16(2).u16(1).u16(0);
    const hhea = new Out().u32(0x00010000).u16(ASC).u16(-DESC).u16(0).u16(advMax).u16(0).u16(0).u16(xMax).u16(1).u16(0).u16(0).u32(0).u32(0).u16(0).u16(n);
    const maxp = new Out().u32(0x00010000).u16(n).u16(maxPts).u16(maxCont).u16(0).u16(0).u16(2).u16(0).u16(0).u16(0).u16(0).u16(0).u16(0).u16(0).u16(0);
    const os2 = new Out().u16(4).u16(500).u16(400).u16(5).u16(0);
    for (const v of [650, 600, 0, 75, 650, 600, 0, 350, 50, 300, 0]) os2.u16(v);
    os2.add([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]).u32(1).u32(0).u32(0).u32(0).tag('WBNK').u16(0x40).u16(32).u16(map[map.length - 1][0]).u16(ASC).u16(-DESC).u16(0).u16(ASC).u16(DESC).u32(1).u32(0).u16(500).u16(700).u16(0).u16(32).u16(1);
    const names = [[1, 'WB Pixel'], [2, 'Regular'], [3, 'WB Pixel 1'], [4, 'WB Pixel'], [5, 'Version 1.0'], [6, 'WBPixel-Regular']];
    const name = new Out().u16(0).u16(names.length).u16(6 + names.length * 12); let off = 0;
    for (const [id, s] of names) { name.u16(3).u16(1).u16(0x409).u16(id).u16(s.length * 2).u16(off); off += s.length * 2; }
    for (const [, s] of names) for (const c of s) name.u16(c.charCodeAt(0));
    const post = new Out().u32(0x00030000).u32(0).u16(-100).u16(100).u32(0).u32(0).u32(0).u32(0).u32(0);
    const tables = { 'OS/2': os2, cmap, glyf, head, hhea, hmtx, loca, maxp, name, post };
    const tags = Object.keys(tables).sort(), count = tags.length, p2 = 2 ** Math.floor(Math.log2(count));
    const sum = a => { let s = 0; for (let i = 0; i < a.length; i += 4) s = (s + ((a[i] << 24) | ((a[i + 1] || 0) << 16) | ((a[i + 2] || 0) << 8) | (a[i + 3] || 0))) >>> 0; return s; };
    const file = new Out().u32(0x00010000).u16(count).u16(p2 * 16).u16(Math.log2(p2)).u16(count * 16 - p2 * 16);
    let at = 12 + count * 16; const where = {};
    for (const t of tags) { const d = tables[t].b; file.tag(t).u32(sum(d)).u32(at).u32(d.length); where[t] = at; at += Math.ceil(d.length / 4) * 4; }
    for (const t of tags) file.add(tables[t].b).pad();
    const adj = (0xb1b0afba - sum(file.b)) >>> 0, h = where.head + 8;
    file.b.splice(h, 4, adj >>> 24 & 255, adj >>> 16 & 255, adj >>> 8 & 255, adj & 255);
    return new Uint8Array(file.b);
  }

  const face = new FontFace('WB Pixel', build().buffer);
  document.fonts.add(face);
  window.WBPixel = { ready: face.load(), glyphs: Object.keys(G) };
})();
