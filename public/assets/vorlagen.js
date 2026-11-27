// Werkbank – Vorlagen: ein Klick stellt das ganze Aussehen um. Wird mit den Einstellungen geladen.
// Neue Vorlage: Eintrag in LIST; mit eigenem Hintergrund zusätzlich Farben (design.js, SKINS) und Bild (werkzeug/skins.py).
(function () {
  'use strict';
  const CATS = [['basis', 'Standard und Aufbau'], ['spiele', 'Spiele'], ['welten', 'Welten'], ['zeit', 'Jahreszeiten und Feste'], ['retro', 'Retro und Kreatives'], ['schlicht', 'Schlicht und schön']];

  // Diese Werte stellt eine Vorlage um. Was sie nicht nennt, geht auf Standard.
  // Kacheln, Links, Anordnung, was angezeigt wird, Einheiten, Bedienung und eigenes CSS bleiben unberührt.
  const KEYS = ['theme', 'skinBg', 'skinDeko', 'phMorgen', 'phMittag', 'phAbend', 'phNacht', 'myBg', 'accent', 'colors', 'groups', 'cBg', 'cBg2', 'cBg3', 'cLine', 'cText', 'cMute', 'cGood', 'cWarn', 'cBad',
    'bg', 'patSize', 'patStrength', 'grad', 'grad1', 'grad2', 'gradAngle', 'img', 'imgDim', 'imgBlur', 'imgFit', 'imgPos', 'glow', 'glowPower', 'glowColor', 'alpha', 'blur', 'headAlpha', 'brightness', 'saturation', 'warmth', 'contrast',
    'font', 'headFont', 'numFont', 'scale', 'weight', 'lineHeight', 'letter', 'headScale', 'headCaps', 'clockScale', 'radius', 'card', 'borderW', 'tint', 'density', 'width', 'icons', 'iconSize', 'iconStroke', 'hover', 'scrollbar',
    'heroLayout', 'clockAlign', 'clockStyle', 'todayCompact', 'todayIcons', 'groupMode', 'tiles', 'cols', 'tileMin', 'tileGap', 'tileHeight', 'secGap', 'tileAlign', 'tileBar', 'tileDesc', 'groupHead', 'groupDesc', 'ckSize', 'ckAlpha', 'ckLines', 'ckColor'];

  const PIXEL = { font: 'pixel', numFont: 'pixel' };
  const BLOCK = { ...PIXEL, radius: 0, borderW: 3, icons: 'eckig', glow: false, tint: false };
  const game = (id, cat, hint, set) => ({ id, cat, hint, set: { theme: id, glow: false, ...set } });

  const LIST = [
    // ---------- Standard und Aufbau ----------
    { id: 'standard', name: 'Standard', cat: 'basis', hint: 'Der Auslieferungszustand', set: {} },
    { id: 'symbolwand', name: 'Symbolwand', cat: 'basis', hint: 'Große Symbole, alles mittig', set: { tiles: 'symbole', groupMode: 'eins', clockAlign: 'mitte', heroLayout: 'gestapelt', icons: 'rund', iconSize: 130, radius: 20 } },
    { id: 'listenansicht', name: 'Liste', cat: 'basis', hint: 'Schmal und dicht', set: { tiles: 'liste', density: 'kompakt', width: 'schmal', todayCompact: true, radius: 8, glow: false } },
    { id: 'kompakt', name: 'Alles auf einen Blick', cat: 'basis', hint: 'Kleine Kacheln, volle Breite', set: { tiles: 'kompakt', density: 'kompakt', width: 'voll', cols: 6, tileDesc: false, groupDesc: false, secGap: 14, scale: 90, todayCompact: true, ckSize: 85 } },
    { id: 'grossbild', name: 'Großbild', cat: 'basis', hint: 'Für Fernseher und Abstand', set: { scale: 125, tiles: 'karten', cols: 4, width: 'breit', iconSize: 120, clockScale: 130, iconStroke: 20, weight: 'mittel' } },
    { id: 'minimal', name: 'Minimal', cat: 'basis', hint: 'Nur das Nötige', set: { theme: 'graphit', colors: 'grau', bg: 'schlicht', glow: false, card: 'flach', tint: false, tiles: 'kompakt', tileDesc: false, groupDesc: false, icons: 'ohne', todayIcons: false, ckLines: false } },

    // ---------- Spiele ----------
    game('minecraft', 'spiele', 'Erde, Gras und Stein', { ...BLOCK }),
    game('nether', 'spiele', 'Netherrack über Lava', { ...BLOCK }),
    game('ende', 'spiele', 'Endstein unter violettem Himmel', { ...BLOCK }),
    game('mario', 'spiele', 'Wolken, Hügel, Ziegel', { font: 'rund', headFont: 'pixel', numFont: 'pixel', radius: 6, hover: 'zoom', weight: 'mittel', headScale: 90, tint: false }),
    game('zelda', 'spiele', 'Wald und Gold', { font: 'serif', headFont: 'klassisch', headCaps: true, letter: 2, radius: 4, tint: false }),
    game('pokemon', 'spiele', 'Bälle, Rot und Weiß', { font: 'rund', radius: 20, icons: 'rund', hover: 'zoom', weight: 'mittel' }),
    game('tetris', 'spiele', 'Fallende Steine', { font: 'technisch', headFont: 'pixel', numFont: 'pixel', radius: 0, borderW: 2, hover: 'leuchten', headScale: 90 }),
    game('pacman', 'spiele', 'Labyrinth in Neonblau', { ...PIXEL, radius: 18, borderW: 2, icons: 'rund', tint: false }),
    game('gameboy', 'spiele', 'Vier Grüntöne', { ...PIXEL, radius: 4, borderW: 3, colors: 'akzent', tint: false, hover: 'keiner', cGood: '#0f380f', cWarn: '#4a3000', cBad: '#5c0b0b' }),
    game('fallout', 'spiele', 'Grünes Terminal mit Röhrenbild', { font: 'mono', radius: 2, colors: 'akzent', icons: 'ohne', hover: 'leuchten', headCaps: true, density: 'kompakt', tint: false, ckColor: '#39ff7a' }),
    game('cyberpunk', 'spiele', 'Gelb, Cyan, schräge Kanten', { font: 'technisch', headCaps: true, radius: 0, letter: 2, weight: 'mittel', hover: 'leuchten', tint: false }),
    game('gta', 'spiele', 'Palmen im Sonnenuntergang', { font: 'technisch', radius: 16, headScale: 120, ckColor: '#ff4fa3', tint: false }),
    game('portal', 'spiele', 'Testkammer mit zwei Portalen', { font: 'system', radius: 24, icons: 'rund', tint: false }),
    game('valorant', 'spiele', 'Rot, kantig, taktisch', { font: 'technisch', headCaps: true, radius: 0, letter: 3, tint: false }),
    game('lol', 'spiele', 'Nachtblau mit Goldrahmen', { font: 'serif', headFont: 'klassisch', headCaps: true, letter: 1, radius: 2, tint: false }),
    game('eldenring', 'spiele', 'Goldene Ringe und Funken', { font: 'klassisch', headCaps: true, letter: 5, radius: 0, tint: false, colors: 'akzent', clockAlign: 'mitte', tileAlign: 'mitte' }),
    game('stardew', 'spiele', 'Bauernhof mit Holzrahmen', { ...PIXEL, radius: 4, borderW: 3, tint: false }),
    game('amongus', 'spiele', 'Crew im All', { font: 'rund', weight: 'kraeftig', radius: 22, icons: 'rund', hover: 'zoom' }),
    game('fortnite', 'spiele', 'Bunt, schräg, laut', { font: 'technisch', headCaps: true, weight: 'kraeftig', radius: 10, hover: 'zoom', headScale: 120 }),
    game('counterstrike', 'spiele', 'Oliv und Orange', { font: 'technisch', headCaps: true, radius: 0, density: 'kompakt', tint: false, colors: 'akzent' }),
    game('ark', 'spiele', 'Dschungel und Hologramme', { font: 'technisch', radius: 4, hover: 'leuchten', tint: false }),

    // ---------- Welten ----------
    game('weltraum', 'welten', 'Sterne und Nebel', { font: 'system', alpha: 70, radius: 18, icons: 'rund', headAlpha: 60 }),
    game('matrix', 'welten', 'Zeichenregen', { font: 'mono', radius: 0, colors: 'akzent', icons: 'ohne', hover: 'leuchten', tint: false, ckColor: '#00ff66' }),
    game('synthwave', 'welten', 'Gitter bis zur Sonne', { font: 'technisch', headCaps: true, letter: 4, radius: 10, hover: 'leuchten', ckColor: '#ff2bd6' }),
    game('tiefsee', 'welten', 'Blasen und Lichtstrahlen', { font: 'rund', radius: 22, icons: 'rund' }),
    game('kirschbluete', 'welten', 'Fallende Blüten', { font: 'rund', headFont: 'klassisch', radius: 22, icons: 'rund', card: 'schatten', headScale: 115 }),

    // ---------- Jahreszeiten und Feste ----------
    game('herbst', 'zeit', 'Bunte Blätter', { font: 'serif', card: 'schatten' }),
    game('winter', 'zeit', 'Schneeflocken und Wehen', { font: 'rund', radius: 18, card: 'schatten' }),
    game('halloween', 'zeit', 'Kürbisse und Fledermäuse', { headFont: 'hand', hover: 'leuchten', headScale: 110 }),
    game('weihnachten', 'zeit', 'Lichterkette und Schnee', { font: 'serif', headFont: 'klassisch', headScale: 115 }),

    // ---------- Retro und Kreatives ----------
    game('win95', 'retro', 'Grauer Rahmen, blaue Leiste', { font: 'system', radius: 0, borderW: 2, tint: false, colors: 'akzent', hover: 'keiner', tiles: 'symbole', density: 'kompakt', cols: 6 }),
    game('blaupause', 'retro', 'Technische Zeichnung', { font: 'mono', radius: 0, colors: 'akzent', icons: 'ohne', tint: false, headCaps: true }),
    game('kreide', 'retro', 'Tafel mit Kreideschrift', { font: 'hand', radius: 12, tint: false }),
    game('comic', 'retro', 'Raster, dicke Linien, Knall', { font: 'hand', weight: 'kraeftig', radius: 8, headCaps: true, hover: 'zoom' }),

    // ---------- Schlicht und schön ----------
    ...[
      ['ruhig', 'Ruhig', 'Grau und still', { theme: 'graphit', colors: 'grau', bg: 'schlicht', glow: false, card: 'flach', tint: false }],
      ['neon', 'Neon', 'Leuchtkanten auf Schwarz', { theme: 'schwarz', accent: '#22e3ff', bg: 'raster', card: 'glas', radius: 18, hover: 'leuchten', glowPower: 160 }],
      ['papier', 'Papier', 'Warm wie ein Notizbuch', { theme: 'sand', font: 'serif', bg: 'linien', glow: false, card: 'schatten', radius: 8 }],
      ['konsole', 'Konsole', 'Nur Text und Grün', { theme: 'terminal', colors: 'akzent', font: 'mono', bg: 'schlicht', radius: 0, density: 'kompakt', icons: 'ohne', hover: 'keiner' }],
      ['lesbar', 'Gut lesbar', 'Groß mit viel Kontrast', { theme: 'schnee', font: 'klar', scale: 115, contrast: true, density: 'luftig', glow: false, bg: 'schlicht', iconStroke: 21 }],
      ['aurora', 'Aurora', 'Verlauf und Milchglas', { theme: 'mitternacht', grad: true, grad1: '#0b1e3f', grad2: '#2b0f45', gradAngle: 150, bg: 'schlicht', alpha: 55, blur: 18, headAlpha: 40, radius: 20, icons: 'rund' }],
      ['sonnenuntergang', 'Sonnenuntergang', 'Weinrot bis Nacht', { theme: 'abend', grad: true, grad1: '#3a1220', grad2: '#0f0b1c', gradAngle: 170, accent: '#ff7a59', bg: 'schlicht', alpha: 65, radius: 22, glowPower: 180 }],
      ['minzfrisch', 'Minze frisch', 'Hell und rund', { theme: 'minze', card: 'schatten', bg: 'punkte', patSize: 22, radius: 20, icons: 'rund', font: 'rund' }],
      ['werkstatt', 'Werkstatt', 'Karo, Kanten, Kaffee', { theme: 'kaffee', bg: 'karo', patSize: 40, patStrength: 55, font: 'technisch', headCaps: true, radius: 6, borderW: 2, tileBar: 'links' }],
      ['magazin', 'Magazin', 'Wie eine Zeitschrift', { theme: 'rose', headFont: 'klassisch', headScale: 125, bg: 'schlicht', card: 'flach', glow: false, tileBar: 'oben', radius: 4 }],
      ['nachtschicht', 'Nachtschicht', 'Gedimmt für spät', { theme: 'schwarz', warmth: 30, brightness: 88, glow: false, bg: 'schlicht', colors: 'grau' }]
    ].map(([id, name, hint, set]) => ({ id, name, cat: 'schlicht', hint, set }))
  ];
  for (const v of LIST) v.name = v.name || WB.design.THEMES[v.id][0];

  // Alle Werte, die diese Vorlage setzt, ausgehend vom jetzigen Stand
  function patch(v, now) {
    const base = WB.design.normalizePrefs(v.set), out = Object.fromEntries(KEYS.map(k => [k, base[k]]));
    // Namen, Symbole und Zuordnungen der Kacheln bleiben, nur eigene Farben weichen der Vorlage
    out.apps = Object.fromEntries(Object.entries(now.apps).map(([id, e]) => [id, { ...e, color: '' }]));
    return out;
  }
  function active(v, now) {
    const base = WB.design.normalizePrefs(v.set);
    return KEYS.every(k => JSON.stringify(now[k]) === JSON.stringify(base[k])) && !Object.values(now.apps).some(e => e.color);
  }

  window.WBVorlagen = { CATS, LIST, KEYS, patch, active };
})();
