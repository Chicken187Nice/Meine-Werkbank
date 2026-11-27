// Werkbank – persönliche Einstellungen: prüfen, anwenden, speichern.
// Wird vor core.js geladen; core.js ruft WBDesign(...) auf.
(function () {
  'use strict';
  window.WBDesign = function ({ APPS, GROUPS, toast, save, logout }) {
    // Designs: [Name, hell?, Hintergrund, Akzent]. Die übrigen Farben stehen je Design in base.css.
    const THEMES = {
      morgen: ['Morgen', 0, '#0b131d', '#63c3ff'], mittag: ['Mittag', 1, '#f2f0eb', '#e2561f'], abend: ['Abend', 0, '#120f0e', '#ff9b54'], nacht: ['Nacht', 0, '#0a0c0f', '#9cc3d5'],
      schwarz: ['Tiefschwarz', 0, '#000000', '#e8e8ea'], graphit: ['Graphit', 0, '#17181a', '#c9ced6'], wald: ['Wald', 0, '#0a120e', '#5fd39a'], ozean: ['Ozean', 0, '#06141a', '#35d0c4'],
      beere: ['Beere', 0, '#140b14', '#ef7fc4'], terminal: ['Terminal', 0, '#030804', '#4cf58a'], mitternacht: ['Mitternacht', 0, '#0a0d1f', '#8ea2ff'], kaffee: ['Kaffee', 0, '#16100c', '#d9a066'],
      rubin: ['Rubin', 0, '#150709', '#ff6470'], schnee: ['Schnee', 1, '#f4f6f9', '#2563c9'], sand: ['Sand', 1, '#f1e8d8', '#8c5310'], lavendel: ['Lavendel', 1, '#f3f0fa', '#6a46d6'],
      minze: ['Minze', 1, '#ecf6f1', '#0b7a55'], rose: ['Rosé', 1, '#fbeff1', '#b8365c']
    };
    // Designs der Vorlagen (mit eigenem Hintergrund aus skins.css):
    // [Name, hell?, Hintergrund, Akzent, Karten, Knöpfe, Linie, Rahmen, Schrift, gedämpft, blass]
    const SKINS = {
      minecraft: ['Minecraft', 0, '#2a1f16', '#7ed348', '#33291f', '#4a4a4a', '#141008', '#5a4a38', '#ffffff', '#d6cfc4', '#a89f92'],
      nether: ['Nether', 0, '#2a0c0c', '#ff8a2a', '#2c1211', '#4a1c19', '#5a201b', '#7a2f26', '#ffeee6', '#e0b3a4', '#b08074'],
      ende: ['Das Ende', 0, '#0b0714', '#c77dff', '#160e26', '#251740', '#3a2560', '#50348a', '#f1eaff', '#bba9e0', '#8a78b0'],
      mario: ['Super Mario', 1, '#8cc8ff', '#c81e16', '#fff7e0', '#ffffff', '#d9b96a', '#b8933f', '#1c1208', '#55391a', '#7a5c30'],
      zelda: ['Zelda', 0, '#0b1f16', '#e8c55a', '#11291d', '#193826', '#2c5238', '#43704d', '#f2ecd6', '#b9c4a2', '#86987a'],
      pokemon: ['Pokémon', 1, '#fbf3e2', '#c8262d', '#ffffff', '#ffffff', '#e5d5b5', '#c9b48a', '#1f2229', '#5d5a52', '#857f72'],
      tetris: ['Tetris', 0, '#080a18', '#35d0ff', '#10132a', '#1a1f40', '#272e5c', '#3a4486', '#eef0ff', '#a2a9d8', '#6d74a4'],
      pacman: ['Pac-Man', 0, '#000000', '#ffe14d', '#07071a', '#101030', '#1c2a8c', '#2b45d8', '#fff7d1', '#bcb6e8', '#8480b4'],
      gameboy: ['Game Boy', 1, '#9bbc0f', '#0f380f', '#aecd2c', '#8bac0f', '#306230', '#0f380f', '#0f380f', '#1b461b', '#2a5a2a'],
      fallout: ['Fallout', 0, '#031107', '#39ff7a', '#051a0b', '#0a2a14', '#155c2e', '#1f8a45', '#b6ffcd', '#5fd88a', '#3a9a5c'],
      cyberpunk: ['Cyberpunk', 0, '#0b0b14', '#fcee0a', '#13131f', '#1d1d30', '#1f4a5c', '#00a8b8', '#e8fbff', '#8fc9d4', '#62909c'],
      gta: ['Vice City', 0, '#26104a', '#ff4fa3', '#200c38', '#34154f', '#4e2470', '#6e3494', '#fff0fa', '#e0b4e0', '#a880b4'],
      portal: ['Portal', 1, '#eaeef2', '#0a6fd0', '#ffffff', '#ffffff', '#d3dae2', '#b6c1cd', '#1a232d', '#53606d', '#7b8794'],
      valorant: ['Valorant', 0, '#0f1923', '#ff4655', '#15212d', '#1f2f3e', '#2b3d4e', '#3d5468', '#ece8e1', '#a3b0ba', '#70808c'],
      lol: ['League of Legends', 0, '#04101c', '#c8aa6e', '#0a1a2a', '#11273c', '#1e3a52', '#6b5a32', '#f0e6d2', '#a9a58f', '#757a70'],
      eldenring: ['Elden Ring', 0, '#0a0806', '#d9b862', '#13100b', '#1e1911', '#332a1a', '#524426', '#ece2c8', '#b0a282', '#7d725a'],
      stardew: ['Stardew Valley', 1, '#c4e6b0', '#7a400c', '#fbe6bd', '#ffdf9e', '#c99a5a', '#a8763a', '#3a1f08', '#5c3b18', '#7d5a30'],
      amongus: ['Among Us', 0, '#090b16', '#ff5c5c', '#151a2e', '#222942', '#343d5e', '#4a557e', '#f2f4ff', '#aab2d4', '#767ea4'],
      fortnite: ['Fortnite', 0, '#1c1058', '#ffe033', '#26166e', '#35218c', '#4a33aa', '#6a50d0', '#ffffff', '#c6bcff', '#9488d8'],
      counterstrike: ['Counter-Strike', 0, '#1a1c15', '#f0a020', '#22241c', '#2e3125', '#3d4132', '#555a45', '#eeeadc', '#b0ad96', '#7f7d6a'],
      ark: ['ARK', 0, '#08181b', '#00dcc8', '#0d2326', '#133236', '#1c474c', '#286468', '#e2fbf8', '#93c2bf', '#629090'],
      weltraum: ['Weltraum', 0, '#05060f', '#8ab4ff', '#0d1022', '#171b36', '#252b52', '#363e72', '#e9edff', '#a0a9d4', '#6c74a0'],
      matrix: ['Matrix', 0, '#000000', '#00ff66', '#031208', '#072210', '#0c3d1c', '#126330', '#c4ffd6', '#5fd488', '#389458'],
      synthwave: ['Synthwave', 0, '#150730', '#22e3ff', '#1a0a38', '#2a1156', '#46207e', '#7a2fa8', '#fbeaff', '#c8a4e8', '#9070b8'],
      tiefsee: ['Tiefsee', 0, '#04263a', '#4ff0d8', '#07304a', '#0c4262', '#17587c', '#247aa4', '#e4fbff', '#9fd2e0', '#6aa0b4'],
      kirschbluete: ['Kirschblüte', 1, '#fdeef4', '#b8285f', '#fffafc', '#ffffff', '#f3d3df', '#e5b3c6', '#3a1626', '#74425a', '#996c80'],
      herbst: ['Herbst', 0, '#1b1007', '#f0932b', '#26180c', '#342211', '#4a3118', '#684523', '#f8e9d4', '#c8a780', '#927658'],
      winter: ['Winter', 1, '#dbeefa', '#12609c', '#ffffff', '#ffffff', '#cfe2f0', '#aecbe2', '#0f2a40', '#3f5d76', '#68849c'],
      halloween: ['Halloween', 0, '#140822', '#ff7a1a', '#1d0e30', '#2c1646', '#44226a', '#623396', '#fbeede', '#c9a8d8', '#9276a4'],
      weihnachten: ['Weihnachten', 0, '#0a2418', '#ffd269', '#10301f', '#17422b', '#24593c', '#347a54', '#f7f3e6', '#b6d0bc', '#82a08a'],
      win95: ['Windows 95', 1, '#008080', '#000080', '#c0c0c0', '#c0c0c0', '#808080', '#404040', '#000000', '#141414', '#2e2e2e'],
      blaupause: ['Blaupause', 0, '#0f4682', '#ffffff', '#0f4a88', '#1a5a9c', '#5b8cc4', '#8db3dc', '#ffffff', '#d4e4f6', '#aac6e4'],
      kreide: ['Kreidetafel', 0, '#1d4032', '#ffe08a', '#234a3a', '#2d5a47', '#4a7663', '#6d9683', '#f4f6ee', '#c8d8cc', '#98b0a0'],
      comic: ['Comic', 1, '#ffefb0', '#c2155a', '#ffffff', '#ffffff', '#2a2a2a', '#111111', '#111111', '#3c3c3c', '#5c5c5c']
    };
    for (const [k, v] of Object.entries(SKINS)) THEMES[k] = v.slice(0, 4);
    const SKIN_VARS = ['--bg2', '--bg3', '--line', '--line2', '--text', '--mute', '--faint'];
    const PHASE_NAME = { ...Object.fromEntries(Object.entries(THEMES).map(([k, v]) => [k, v[0]])), eigen: 'Eigenes' };
    // Nur Schriften, die auf Geräten vorhanden sind (nichts wird aus dem Internet geladen)
    const FONTS = {
      standard: ['Standard', ''],
      system: ['System', 'system-ui, -apple-system, Roboto, sans-serif'],
      klar: ['Klar', 'Verdana, "Atkinson Hyperlegible", "DejaVu Sans", sans-serif'],
      technisch: ['Technisch', 'Bahnschrift, "DIN Alternate", "Barlow Semi Condensed", "Roboto Condensed", system-ui, sans-serif'],
      schmal: ['Schmal', '"Arial Narrow", "Roboto Condensed", "Liberation Sans Narrow", "DejaVu Sans Condensed", sans-serif-condensed, sans-serif'],
      rund: ['Rund', 'ui-rounded, "SF Pro Rounded", Nunito, Quicksand, Comfortaa, "Varela Round", system-ui, sans-serif'],
      serif: ['Serifen', 'Georgia, "Iowan Old Style", "DejaVu Serif", serif'],
      klassisch: ['Klassisch', '"Palatino Linotype", Palatino, "Book Antiqua", "TeX Gyre Pagella", "Times New Roman", serif'],
      mono: ['Mono', '"Cascadia Mono", "JetBrains Mono", ui-monospace, Consolas, "DejaVu Sans Mono", monospace'],
      hand: ['Handschrift', '"Segoe Print", "Bradley Hand", "Comic Sans MS", "Comic Neue", cursive'],
      pixel: ['Pixel', '"WB Pixel", "Cascadia Mono", "DejaVu Sans Mono", monospace'] // eigene Schrift aus pixel.js
    };
    const WIDTHS = { schmal: '980px', normal: '', breit: '1560px', voll: '100000px' };
    const THEME_IDS = Object.keys(THEMES), FONT_IDS = Object.keys(FONTS);
    const SECTIONS = ['uebersicht', 'cockpit', 'angeheftet', 'zuletzt', 'kacheln'], HERO = ['uhr', 'heute', 'wetter'];
    // Jede Einstellung: [Standardwert, erlaubte Werte | [min, max] | 'bool' | 'farbe' | Textlänge]
    const SPEC = {
      theme: ['auto', ['auto', 'system', ...THEME_IDS, 'eigen']], lastTheme: ['', ['', 'system', ...THEME_IDS, 'eigen']],
      phMorgen: ['morgen', THEME_IDS], phMittag: ['mittag', THEME_IDS], phAbend: ['abend', THEME_IDS], phNacht: ['nacht', THEME_IDS],
      skinBg: [true, 'bool'], skinDeko: [true, 'bool'],
      myBg: ['#14181f', 'farbe'], accent: ['', 'farbe'], colors: ['bereich', ['bereich', 'akzent', 'grau']],
      cBg: ['', 'farbe'], cBg2: ['', 'farbe'], cBg3: ['', 'farbe'], cLine: ['', 'farbe'], cText: ['', 'farbe'], cMute: ['', 'farbe'], cGood: ['', 'farbe'], cWarn: ['', 'farbe'], cBad: ['', 'farbe'],
      // Hintergrund
      bg: ['punkte', ['punkte', 'raster', 'linien', 'streifen', 'karo', 'ringe', 'schlicht']], patSize: [28, [10, 90]], patStrength: [100, [10, 100]],
      grad: [false, 'bool'], grad1: ['#1b2a4a', 'farbe'], grad2: ['#2a1030', 'farbe'], gradAngle: [160, [0, 360]],
      img: [false, 'bool'], imgDim: [55, [0, 95]], imgBlur: [0, [0, 40]], imgFit: ['fuellen', ['fuellen', 'einpassen', 'kacheln']], imgPos: ['mitte', ['mitte', 'oben', 'unten']],
      glow: [true, 'bool'], glowPower: [100, [30, 250]], glowColor: ['', 'farbe'],
      // Transparenz und Effekte
      alpha: [100, [0, 100]], blur: [14, [0, 40]], headAlpha: [80, [0, 100]], brightness: [100, [60, 130]], saturation: [100, [0, 180]], warmth: [0, [0, 60]],
      // Schrift
      font: ['standard', FONT_IDS], headFont: ['standard', FONT_IDS], numFont: ['standard', FONT_IDS], scale: [100, [80, 140]], weight: ['normal', ['normal', 'mittel', 'kraeftig']],
      lineHeight: [150, [120, 190]], letter: [0, [-3, 12]], headScale: [100, [75, 150]], headCaps: [false, 'bool'], clockScale: [100, [50, 160]],
      // Form
      radius: [14, [0, 26]], card: ['rahmen', ['rahmen', 'flach', 'schatten', 'glas']], borderW: [1, [0, 4]], tint: [true, 'bool'], density: ['normal', ['kompakt', 'normal', 'luftig']],
      width: ['normal', Object.keys(WIDTHS)], hover: ['heben', ['heben', 'leuchten', 'zoom', 'keiner']], icons: ['eckig', ['eckig', 'rund', 'voll', 'ohne']], iconSize: [100, [70, 150]], iconStroke: [17, [10, 28]],
      scrollbar: ['normal', ['normal', 'schmal', 'aus']], contrast: [false, 'bool'], motion: [true, 'bool'],
      // Kopfzeile
      headFix: [true, 'bool'], brand: ['', 24], showBrand: [true, 'bool'], showSearch: [true, 'bool'], showPhase: [true, 'bool'], showThemeBtn: [true, 'bool'], showCkBtn: [true, 'bool'], showNames: [true, 'bool'],
      // Startseite
      heroLayout: ['auto', ['auto', 'gestapelt']], clockAlign: ['links', ['links', 'mitte']],
      showClock: [true, 'bool'], showToday: [true, 'bool'], showWeather: [true, 'bool'], showPins: [true, 'bool'], showFoot: [true, 'bool'],
      greet: ['auto', ['auto', 'eigen', 'aus']], greetText: ['', 60], clockStyle: ['digital', ['digital', 'analog', 'beides']], seconds: [true, 'bool'], hour12: [false, 'bool'],
      showDate: [true, 'bool'], dateStyle: ['lang', ['lang', 'kurz', 'zahlen']], showWeek: [true, 'bool'], showArc: [true, 'bool'],
      todayMax: [6, [3, 20]], todayCompact: [false, 'bool'], todayIcons: [true, 'bool'], todayOnlyBad: [false, 'bool'],
      tempUnit: ['c', ['c', 'f']], windUnit: ['kmh', ['kmh', 'ms', 'mph']], fcDays: [4, [0, 7]], wxDetails: [true, 'bool'],
      // Kacheln
      groupMode: ['gruppen', ['gruppen', 'eins']], sort: ['standard', ['standard', 'az', 'oft', 'eigen']], foldable: [true, 'bool'], showRecent: [false, 'bool'],
      tiles: ['karten', ['karten', 'kompakt', 'liste', 'symbole']], cols: [0, [0, 8]], tileMin: [0, [0, 380]], tileGap: [-1, [-1, 40]], tileHeight: [0, [0, 240]], secGap: [-1, [-1, 90]],
      tileAlign: ['links', ['links', 'mitte']], tileBar: ['keine', ['keine', 'links', 'oben']], tileDesc: [true, 'bool'], tileLive: [true, 'bool'], tileButtons: [true, 'bool'], groupHead: [true, 'bool'], groupDesc: [true, 'bool'],
      // Cockpit
      ckSize: [100, [70, 140]], ckAlpha: [100, [25, 100]], ckLines: [true, 'bool'], ckEvery: [5, [2, 60]], ckColor: ['', 'farbe'],
      // Bedienung
      newTab: [false, 'bool'], focusSearch: [false, 'bool'], hotkeys: [true, 'bool'], numberKeys: [false, 'bool'], startApp: ['', ['', ...APPS.map(a => a.id)]],
      confirmLogout: [false, 'bool'], idleLogout: [0, [0, 480]],
      css: ['', 6000]
    };
    const BUILTIN = Object.keys(GROUPS), BASE = Object.fromEntries(BUILTIN.map(g => [g, GROUPS[g]]));
    APPS.forEach(a => { a.t0 = a.t; a.g0 = a.g; });
    const OWN_COLORS = [['#ff8fab', '#c22d5c'], ['#7dd3fc', '#0369a1'], ['#fcd34d', '#8a5a00'], ['#86efac', '#15803d'], ['#d8b4fe', '#7e22ce'], ['#fdba74', '#c2410c'], ['#67e8f9', '#0e7490'], ['#bef264', '#4d7c0f']];
    const RESERVED = ['__proto__', 'constructor', 'prototype'];
    const isHex = v => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v);
    const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
    const text = (v, n) => typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n) : '';
    const emojiText = v => [...text(v, 24).replace(/[<>&"'`\\\s]/g, '')].slice(0, 4).join('');
    const webUrl = v => { try { const u = new URL(String(v).slice(0, 500)); return /^https?:$/.test(u.protocol) ? u.href : ''; } catch { return ''; } };
    const list = (v, ok, max = 200) => [...new Set(Array.isArray(v) ? v : [])].filter(ok).slice(0, max);
    const perm = (v, all) => { const l = list(v, x => all.includes(x)); return [...l, ...all.filter(x => !l.includes(x))]; };

    // Nimmt nur bekannte, gültige Werte an (auch aus importierten Dateien)
    function normalizePrefs(raw, nested) {
      const r = isObj(raw) ? raw : {}, out = {};
      for (const [k, [def, rule]] of Object.entries(SPEC)) {
        const v = Object.hasOwn(r, k) ? r[k] : undefined; let ok = def;
        if (rule === 'bool') ok = typeof v === 'boolean' ? v : def;
        else if (rule === 'farbe') ok = isHex(v) ? v.toLowerCase() : def;
        else if (typeof rule === 'number') ok = typeof v === 'string' ? v.slice(0, rule) : def;
        else if (typeof rule[0] === 'number') ok = typeof v === 'number' && isFinite(v) ? Math.min(rule[1], Math.max(rule[0], Math.round(v))) : def;
        else ok = rule.includes(v) ? v : def;
        out[k] = ok;
      }
      if (out.cols === 1) out.cols = 0;
      const own = [];
      for (const g of Array.isArray(r.ownGroups) ? r.ownGroups : []) {
        const n = text(g && g.n, 24);
        if (n && !RESERVED.includes(n) && !BUILTIN.includes(n) && !own.some(x => x.n === n) && own.length < 8) own.push({ n, d: text(g.d, 60) });
      }
      out.ownGroups = own;
      const valid = [...BUILTIN, ...own.map(g => g.n)], isGroup = g => valid.includes(g);
      out.groups = Object.fromEntries(Object.entries(isObj(r.groups) ? r.groups : {}).filter(([g, c]) => isGroup(g) && isHex(c)));
      out.groupNames = Object.fromEntries(Object.entries(isObj(r.groupNames) ? r.groupNames : {}).map(([g, n]) => [g, text(n, 24)]).filter(([g, n]) => BUILTIN.includes(g) && n));
      out.order = list(r.order, isGroup); out.closed = list(r.closed, g => isGroup(g) || g === 'Meine Links');
      const links = [];
      for (const l of Array.isArray(r.links) ? r.links : []) {
        if (!isObj(l) || links.length >= 30) continue;
        const u = webUrl(l.u), n = text(l.n, 32);
        if (u && n && /^l[a-z0-9]{3,14}$/.test(l.id) && !links.some(x => x.id === l.id)) links.push({ id: l.id, n, u, i: emojiText(l.i), g: isGroup(l.g) ? l.g : '', c: isHex(l.c) ? l.c.toLowerCase() : '' });
      }
      out.links = links;
      const isTile = id => APPS.some(a => a.id === id) || links.some(l => l.id === id);
      out.hidden = list(r.hidden, isTile); out.tileOrder = list(r.tileOrder, isTile);
      out.apps = {};
      for (const a of APPS) {
        const v = isObj(r.apps) && Object.hasOwn(r.apps, a.id) ? r.apps[a.id] : null; if (!isObj(v)) continue;
        const e = { name: text(v.name, 32), icon: emojiText(v.icon), color: isHex(v.color) ? v.color.toLowerCase() : '', size: ['breit', 'gross'].includes(v.size) ? v.size : '', g: isGroup(v.g) && v.g !== a.g0 ? v.g : '' };
        const set = Object.fromEntries(Object.entries(e).filter(([, x]) => x)); if (Object.keys(set).length) out.apps[a.id] = set;
      }
      out.sections = perm(r.sections, SECTIONS); out.heroOrder = perm(r.heroOrder, HERO);
      if (!nested) {
        const profiles = [];
        for (const p of Array.isArray(r.profiles) ? r.profiles : []) { const n = text(p && p.n, 24); if (n && !profiles.some(x => x.n === n) && profiles.length < 8) { const q = normalizePrefs(p.p, true); profiles.push({ n, p: q }); } }
        out.profiles = profiles;
      }
      return out;
    }

    // ---------- Farben ----------
    const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
    const mix = (a, b, t) => '#' + rgb(a).map((v, i) => Math.round(v + (rgb(b)[i] - v) * t).toString(16).padStart(2, '0')).join('');
    const lum = h => { const [r, g, b] = rgb(h).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }); return .2126 * r + .7152 * g + .0722 * b; };
    const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + .05) / (y + .05); };
    const inkOn = c => contrast(c, '#ffffff') >= contrast(c, '#0b0d10') ? '#ffffff' : '#0b0d10';
    // Eigene Farben so weit aufhellen oder abdunkeln, dass sie auf dem Hintergrund lesbar bleiben
    function readableOn(c, bg, min = 3) { const to = inkOn(bg); for (let i = 0; i < 12 && contrast(c, bg) < min; i++) c = mix(c, to, .12); return c; }
    // Alle Flächen- und Schriftfarben passend zu einem selbst gewählten Hintergrund
    function derived(bg, strong) {
      const ink = inkOn(bg), light = ink !== '#ffffff', soft = strong ? .4 : 1;
      const v = { '--bg': bg, '--bg2': mix(bg, '#ffffff', light ? .55 : .045), '--bg3': mix(bg, '#ffffff', light ? .85 : .095), '--line': mix(bg, ink, strong ? .28 : .13), '--line2': mix(bg, ink, strong ? .42 : .22), '--text': mix(ink, bg, .05) };
      v['--mute'] = readableOn(mix(ink, bg, .34 * soft), v['--bg2'], 4.5); v['--faint'] = readableOn(mix(ink, bg, .54 * soft), v['--bg2'], 3);
      return v;
    }

    // ---------- Zustand ----------
    const readStore = k => { try { return localStorage.getItem(k); } catch { return null; } };
    const writeStore = (k, v) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} };
    const legacyTheme = () => ({ hell: 'mittag', dunkel: 'nacht' })[readStore('wb-theme')] || 'auto';
    let cached = null; try { cached = JSON.parse(readStore('wb-ui')); } catch {}
    let prefs = normalizePrefs(cached || { theme: legacyTheme() });
    // Sicherer Anzeigemodus (Adresse mit ?sicher): zeigt alles im Standard, falls eine Einstellung die Seite unbrauchbar macht
    let safe = /[?&]sicher(&|=|$)/.test(location.search);
    const DEFAULTS = normalizePrefs({});
    const shown = () => safe ? DEFAULTS : prefs;
    let appId = null, lastLook = '', dirty = false;
    const adminPage = location.pathname === '/apps/admin'; // in der Verwaltung gelten die echten Namen
    const phaseFor = h => h >= 5 && h < 10 ? 'morgen' : h >= 10 && h < 17 ? 'mittag' : h >= 17 && h < 22 ? 'abend' : 'nacht';
    const lightQuery = matchMedia('(prefers-color-scheme: light)');
    function resolveTheme(p) {
      if (p.theme === 'auto') { const x = phaseFor(new Date().getHours()); return p['ph' + x[0].toUpperCase() + x.slice(1)]; }
      if (p.theme === 'system') return lightQuery.matches ? p.phMittag : p.phNacht;
      return p.theme;
    }
    const isLight = () => document.documentElement.hasAttribute('data-light');
    const curBg = () => { const p = shown(), id = document.documentElement.dataset.phase; return p.cBg || (id === 'eigen' ? p.myBg : (THEMES[id] || THEMES.nacht)[2]); };
    const themeAccent = () => { const id = document.documentElement.dataset.phase; return id === 'eigen' ? readableOn(isLight() ? '#2563c9' : '#8fc7ff', curBg()) : (THEMES[id] || THEMES.nacht)[3]; };
    const accentNow = () => shown().accent ? readableOn(shown().accent, curBg()) : themeAccent();

    // ---------- Eigene Namen, Gruppen und Zuordnungen ----------
    function applyModel() {
      const p = adminPage ? DEFAULTS : shown();
      for (const g of Object.keys(GROUPS)) if (!BUILTIN.includes(g)) delete GROUPS[g];
      BUILTIN.forEach(g => { GROUPS[g] = { ...BASE[g], label: p.groupNames[g] || g }; });
      p.ownGroups.forEach((g, i) => { GROUPS[g.n] = { c: OWN_COLORS[i % OWN_COLORS.length], d: g.d, label: g.n, own: true }; });
      APPS.forEach(a => { const e = p.apps[a.id] || {}; a.t = e.name || a.t0; a.g = e.g || a.g0; });
    }
    const groupLabel = g => (GROUPS[g] && GROUPS[g].label) || g;
    function groupColor(g) {
      const p = shown();
      if (p.groups[g]) return readableOn(p.groups[g], curBg());
      if (p.colors === 'akzent') return accentNow();
      if (p.colors === 'grau') return isLight() ? '#62666e' : '#a3a9b4';
      return (GROUPS[g] || { c: ['#9cc3d5', '#2a6f8f'] }).c[isLight() ? 1 : 0];
    }
    const appColor = a => { const own = a.id && shown().apps[a.id]?.color || a.c; return own ? readableOn(own, curBg()) : groupColor(a.g); };
    const emoji = id => adminPage ? '' : shown().apps[id]?.icon || '';

    // Eigenes CSS: keine nachgeladenen Inhalte, keine Umgehung über Escape-Zeichen
    const cleanCss = c => String(c || '').replace(/\\/g, '').replace(/\/\*[\s\S]*?(\*\/|$)/g, '').replace(/@import[^;{}]*;?/gi, '').replace(/(url|image-set|image|cross-fade|element|expression|src)\s*\(/gi, 'gesperrt(');
    let cssEl = null, imgEl = null, imgData = '';
    const goodImage = d => typeof d === 'string' && d.length < 2200000 && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(d);
    function styleTag(el, css) { if (!el) { el = document.createElement('style'); (document.body || document.head).appendChild(el); } if (el.textContent !== css) el.textContent = css; return el; }
    // Hintergründe der Vorlagen und die Pixelschrift werden erst geladen, wenn sie gebraucht werden
    const loaded = new Set();
    function need(tag, url) {
      if (loaded.has(url)) return; loaded.add(url);
      const el = document.createElement(tag); el.setAttribute('blocking', 'render');
      if (tag === 'link') { el.rel = 'stylesheet'; el.href = url; } else el.src = url;
      el.onerror = () => { loaded.delete(url); el.remove(); };
      document.head.appendChild(el);
    }
    const needSkins = () => need('link', '/assets/skins.css'), needPixel = () => need('script', '/assets/pixel.js');
    function paintExtras() {
      const p = shown();
      const css = cleanCss(p.css); if (css || cssEl) cssEl = styleTag(cssEl, css);
      const img = p.img && imgData ? `:root { --img: url("${imgData}"); }` : ''; if (img || imgEl) imgEl = styleTag(imgEl, img);
    }
    document.addEventListener('DOMContentLoaded', () => { cssEl?.remove(); imgEl?.remove(); cssEl = imgEl = null; paintExtras(); }); // ans Ende, damit es die Seitenstile übersteuert

    const MANAGED = ['--bg', '--bg2', '--bg3', '--line', '--line2', '--text', '--mute', '--faint', '--good', '--warn', '--bad', '--acc', '--acc2', '--acc-ink', '--glow', '--f-body', '--f-display', '--f-mono', '--wb-wa', '--wb-wh',
      '--pat-size', '--pat-op', '--gp', '--grad1', '--grad2', '--grad-angle', '--img-dim', '--img-blur', '--img-size', '--img-pos', '--img-repeat', '--alpha', '--blur', '--head-alpha', '--warm', '--lh', '--ls', '--head-z', '--clk', '--bw', '--icon', '--stroke',
      '--tmin-u', '--tgap', '--th', '--secgap', '--ck-scale', '--ck-alpha', '--ck-color'];
    // Setzt Design und Aussehen auf die Seite; meldet 'wb-theme', wenn sich Sichtbares geändert hat
    function applyTheme() {
      const r = document.documentElement, s = r.style, p = shown(), id = resolveTheme(p);
      applyModel();
      MANAGED.forEach(v => s.removeProperty(v));
      r.dataset.phase = id; r.dataset.mode = p.theme;
      const custom = p.cBg || (id === 'eigen' ? p.myBg : '');
      const light = custom ? inkOn(custom) !== '#ffffff' : !!THEMES[id][1];
      r.toggleAttribute('data-light', light);
      s.colorScheme = custom ? (light ? 'light' : 'dark') : '';
      const set = (k, v) => s.setProperty(k, v);
      const skin = Object.hasOwn(SKINS, id) ? SKINS[id] : null;
      if (skin && !custom) { SKIN_VARS.forEach((v, i) => set(v, skin[i + 4])); set('--bg', skin[2]); set('--acc', skin[3]); set('--acc2', skin[3]); set('--acc-ink', inkOn(skin[3])); set('--glow', `color-mix(in srgb, ${skin[3]} 11%, transparent)`); s.colorScheme = skin[1] ? 'light' : 'dark'; }
      if (custom) { Object.entries(derived(custom, p.contrast)).forEach(([k, v]) => set(k, v)); const a = themeAccent(); set('--acc', a); set('--acc2', mix(a, inkOn(custom), .15)); set('--acc-ink', inkOn(a)); set('--glow', `color-mix(in srgb, ${a} 11%, transparent)`); }
      for (const [k, v] of Object.entries({ '--bg2': p.cBg2, '--bg3': p.cBg3, '--line': p.cLine, '--text': p.cText, '--mute': p.cMute, '--good': p.cGood, '--warn': p.cWarn, '--bad': p.cBad })) if (v) set(k, v);
      if (p.cLine) set('--line2', mix(p.cLine, inkOn(curBg()), .12));
      if (p.cMute) set('--faint', mix(p.cMute, curBg(), .3));
      const attr = (k, v) => v === null ? delete r.dataset[k] : r.dataset[k] = v;
      for (const [k, v] of Object.entries({ bg: p.img ? 'schlicht' : p.bg, card: p.card, density: p.density, tiles: p.tiles, glow: +p.glow, tint: +p.tint, contrast: +p.contrast, motion: +p.motion, hover: p.hover, icons: p.icons, bar: p.tileBar, align: p.tileAlign, scrollbar: p.scrollbar, weight: p.weight, headfix: +p.headFix, cklines: +p.ckLines })) attr(k, v);
      attr('skin', skin && p.skinDeko ? id : null); attr('skinbg', skin && p.skinBg && !(p.img && imgData) ? id : null);
      if (skin) needSkins();
      const pixel = [p.font, p.headFont, p.numFont].includes('pixel'); if (pixel) needPixel();
      attr('pixel', pixel ? '1' : null);
      attr('grad', p.grad && !p.img ? '1' : null); attr('img', p.img && imgData ? '1' : null); attr('alpha', p.alpha < 100 ? '1' : null); attr('headalpha', p.headAlpha !== 80 ? '1' : null); attr('warm', p.warmth ? '1' : null);
      attr('lh', p.lineHeight !== 150 ? '1' : null); attr('ls', p.letter ? '1' : null); attr('headz', p.headScale !== 100 ? '1' : null); attr('caps', p.headCaps ? '1' : null); attr('bw', p.borderW !== 1 ? '1' : null);
      attr('stroke', p.iconStroke !== 17 ? '1' : null); attr('tilegap', p.tileGap >= 0 ? '1' : null); attr('th', p.tileHeight ? '1' : null); attr('secgap', p.secGap >= 0 ? '1' : null); attr('ckcolor', p.ckColor ? '1' : null);
      set('--r', p.radius + 'px'); set('--r-sm', Math.round(p.radius * .64) + 'px');
      set('--pat-size', p.patSize + 'px'); set('--pat-op', p.patStrength + '%'); set('--gp', p.glowPower / 100);
      set('--grad1', p.grad1); set('--grad2', p.grad2); set('--grad-angle', p.gradAngle + 'deg');
      set('--img-dim', p.imgDim + '%'); set('--img-blur', p.imgBlur + 'px'); set('--img-size', { fuellen: 'cover', einpassen: 'contain', kacheln: 'auto' }[p.imgFit]); set('--img-repeat', p.imgFit === 'kacheln' ? 'repeat' : 'no-repeat'); set('--img-pos', { mitte: 'center', oben: 'top', unten: 'bottom' }[p.imgPos]);
      set('--alpha', p.alpha + '%'); set('--blur', p.blur + 'px'); set('--head-alpha', p.headAlpha + '%'); set('--warm', p.warmth / 200);
      set('--lh', p.lineHeight / 100); set('--ls', p.letter / 100 + 'em'); set('--head-z', p.headScale / 100); set('--clk', p.clockScale / 100); set('--bw', p.borderW + 'px'); set('--icon', p.iconSize / 100); set('--stroke', p.iconStroke / 10);
      if (p.tileMin) set('--tmin-u', Math.max(80, p.tileMin) + 'px'); if (p.tileGap >= 0) set('--tgap', p.tileGap + 'px'); if (p.tileHeight) set('--th', p.tileHeight + 'px'); if (p.secGap >= 0) set('--secgap', p.secGap + 'px');
      set('--ck-scale', p.ckSize / 100); set('--ck-alpha', p.ckAlpha / 100); if (p.ckColor) set('--ck-color', readableOn(p.ckColor, curBg()));
      if (FONTS[p.font][1]) { set('--f-body', FONTS[p.font][1]); set('--f-display', FONTS[p.font][1]); }
      if (FONTS[p.headFont][1]) set('--f-display', FONTS[p.headFont][1]);
      if (FONTS[p.numFont][1]) set('--f-mono', FONTS[p.numFont][1]);
      s.filter = p.brightness !== 100 || p.saturation !== 100 ? `brightness(${p.brightness / 100}) saturate(${p.saturation / 100})` : '';
      // Vergrößern nur so weit, dass auf schmalen Bildschirmen mindestens 350 Punkte Breite bleiben
      const vw = Math.min(window.innerWidth, window.screen.width || window.innerWidth); // am Handy wächst innerWidth mit überbreitem Inhalt
      const z = p.scale > 100 ? Math.min(p.scale / 100, Math.max(1, vw / 350)) : p.scale / 100;
      s.zoom = z === 1 ? '' : z; set('--wb-z', z);
      if (WIDTHS[p.width]) { set('--wb-wa', WIDTHS[p.width]); set('--wb-wh', WIDTHS[p.width]); }
      // Akzent: in Apps die Farbe der App bzw. ihres Bereichs, sonst die eigene Farbe
      const app = appId && APPS.find(a => a.id === appId);
      let acc = '', ink = '';
      if (app && (p.colors === 'bereich' || p.groups[app.g] || p.apps[app.id]?.color)) { acc = appColor(app); ink = p.groups[app.g] || p.apps[app.id]?.color ? inkOn(acc) : light ? '#ffffff' : '#0b0d10'; }
      else if (p.accent) { acc = readableOn(p.accent, curBg()); ink = inkOn(acc); }
      if (acc) { set('--acc', acc); set('--acc2', app ? acc : mix(acc, inkOn(curBg()), .15)); set('--acc-ink', ink); set('--glow', `color-mix(in srgb, ${acc} ${app ? 16 : 11}%, transparent)`); }
      if (p.glowColor) set('--glow', `color-mix(in srgb, ${p.glowColor} 22%, transparent)`);
      paintExtras();
      const look = JSON.stringify([id, p.accent, p.colors, p.groups, p.myBg, p.cBg, p.cText, p.scale, p.width, p.font, p.headFont, p.numFont, p.apps]);
      if (look !== lastLook) { const first = !lastLook; lastLook = look; if (!first) document.dispatchEvent(new CustomEvent('wb-theme')); }
      return id;
    }
    // Seitenfarbe: jede App übernimmt die Farbe ihres Bereichs als Akzent
    function paintApp(id) { if (!APPS.some(a => a.id === id)) return; appId = id; applyTheme(); }
    const themeMode = () => shown().theme;
    const themeIcon = () => themeMode() === 'auto' || themeMode() === 'system' ? 'auto' : isLight() ? 'sun' : 'moon';
    const cachePrefs = () => writeStore('wb-ui', JSON.stringify(prefs));
    const announce = () => document.dispatchEvent(new CustomEvent('wb-prefs'));
    // Einstellungen ändern: sofort anzeigen und im eigenen Konto speichern
    function setPrefs(patch, replace) {
      safe = false;
      prefs = normalizePrefs(replace ? patch : { ...prefs, ...patch });
      if (!['auto', 'mittag', 'nacht'].includes(prefs.theme)) prefs.lastTheme = prefs.theme;
      dirty = true; cachePrefs(); applyTheme(); announce(); save('ui', prefs);
    }
    function cycleTheme() {
      const order = ['auto', 'mittag', 'nacht', ...(prefs.lastTheme ? [prefs.lastTheme] : [])];
      const next = order[(order.indexOf(prefs.theme) + 1) % order.length];
      setPrefs({ theme: next });
      toast({ auto: 'Design folgt der Tageszeit', mittag: 'Immer hell', nacht: 'Immer dunkel', system: 'Design folgt dem Gerät' }[next] || 'Design: ' + PHASE_NAME[next]);
    }

    // ---------- Hintergrundbild (eigener Speicherplatz, damit es nicht bei jeder Änderung mitgeschickt wird) ----------
    const storedImg = readStore('wb-uibild'); if (goodImage(storedImg)) imgData = storedImg;
    const getImage = () => imgData;
    function setImage(data) {
      if (data && !goodImage(data)) return false;
      imgData = data || ''; writeStore('wb-uibild', imgData || null); save('uibild', { data: imgData });
      setPrefs({ img: !!imgData }); return true;
    }
    const getJson = async url => { const r = await fetch(url, { headers: { 'X-WB': '1' }, cache: 'no-store' }); if (!r.ok) throw new Error(r.status); return r.json(); };
    async function load() {
      if (location.pathname === '/login') return;
      try {
        const v = await getJson('/api/data/ui'); if (dirty) return;
        const next = normalizePrefs(v || { theme: legacyTheme() });
        const changed = JSON.stringify(next) !== JSON.stringify(prefs);
        prefs = next; cachePrefs();
        if (changed) { applyTheme(); announce(); }
        if (prefs.img) { const b = await getJson('/api/data/uibild'); const d = b && goodImage(b.data) ? b.data : ''; if (d !== imgData && !dirty) { imgData = d; writeStore('wb-uibild', d || null); applyTheme(); announce(); } }
      } catch {}
      if (safe) toast('Sicherer Anzeigemodus: alles im Standard. Ändere die Einstellung und lade die Seite ohne „?sicher“ neu.');
    }

    // ---------- Automatisch abmelden bei Untätigkeit ----------
    let lastWrite = 0;
    const touch = () => { const n = Date.now(); if (n - lastWrite > 5000) { lastWrite = n; writeStore('wb-act', String(n)); } };
    function idleCheck() {
      const min = prefs.idleLogout; if (!min || location.pathname === '/login') return;
      if ([...document.querySelectorAll('video, audio')].some(m => !m.paused)) return touch();
      const last = +readStore('wb-act'); if (!last) return touch();
      if (Date.now() - last > min * 60000) { writeStore('wb-act', null); logout(); }
    }
    setTimeout(() => { idleCheck(); for (const ev of ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart']) window.addEventListener(ev, touch, { passive: true, capture: true }); setInterval(idleCheck, 15000); }, 0);
    const forget = () => ['wb-ui', 'wb-uibild', 'wb-act'].forEach(k => writeStore(k, null));

    applyTheme();
    setInterval(applyTheme, 60000);
    lightQuery.addEventListener('change', applyTheme);
    window.addEventListener('resize', () => { if (shown().scale > 100) applyTheme(); });

    return { THEMES, SKINS, needSkins, needPixel, FONTS, PHASE_NAME, SPEC, BUILTIN, SECTIONS, HERO, phaseFor, normalizePrefs, applyTheme, paintApp, groupColor, appColor, groupLabel, emoji, isLight, themeMode, themeIcon, cycleTheme,
      setPrefs, getPrefs: shown, getStored: () => prefs, isSafe: () => safe, load, forget, setImage, getImage, contrast, curBg };
  };
})();
