// Werkbank – persönliche Einstellungen (Zahnrad oben rechts). Wird erst beim Öffnen geladen.
(function () {
  'use strict';
  const { $, $$, esc, icon, APPS, GROUPS, groupColor, appColor, groupLabel, THEMES, setPrefs, normalizePrefs, api, me, toast, download, loadScript, Store, design: D } = WB;

  const LINKS = 'Meine Links';
  // „Überrasch mich“ würfelt nur das Aussehen, nicht Aufbau, Kacheln und Bedienung
  const LOOK_KEYS = ['theme', 'skinBg', 'skinDeko', 'myBg', 'accent', 'colors', 'groups', 'cBg', 'cBg2', 'cBg3', 'cLine', 'cText', 'cMute', 'cGood', 'cWarn', 'cBad',
    'bg', 'patSize', 'patStrength', 'grad', 'grad1', 'grad2', 'gradAngle', 'img', 'imgDim', 'imgBlur', 'glow', 'glowPower', 'glowColor', 'alpha', 'blur', 'headAlpha', 'brightness', 'saturation', 'warmth',
    'font', 'headFont', 'numFont', 'scale', 'weight', 'lineHeight', 'letter', 'headScale', 'headCaps', 'radius', 'card', 'borderW', 'tint', 'density', 'hover', 'icons', 'iconStroke', 'tileBar', 'contrast'];
  const ACCENTS = ['#ff9b54', '#e2561f', '#ef5b4c', '#ef7fc4', '#a78bfa', '#8ea2ff', '#5aa9ff', '#22d3ee', '#3ddc97', '#a3e635', '#ffbd4a', '#d9a066'];
  const TABS = [['vorlagen', 'Vorlagen'], ['aussehen', 'Design'], ['farben', 'Farben'], ['hintergrund', 'Hintergrund'], ['schrift', 'Schrift'], ['form', 'Form'], ['start', 'Startseite'], ['kacheln', 'Kacheln'], ['cockpit', 'Cockpit'], ['bedienung', 'Bedienung'], ['daten', 'Daten']];
  // Welche Werte „Diesen Bereich zurücksetzen“ betrifft
  const TAB_KEYS = {
    aussehen: ['theme', 'lastTheme', 'phMorgen', 'phMittag', 'phAbend', 'phNacht', 'myBg', 'accent'],
    farben: ['colors', 'groups', 'cBg', 'cBg2', 'cBg3', 'cLine', 'cText', 'cMute', 'cGood', 'cWarn', 'cBad', 'brightness', 'saturation', 'warmth', 'contrast'],
    hintergrund: ['skinBg', 'skinDeko', 'bg', 'patSize', 'patStrength', 'grad', 'grad1', 'grad2', 'gradAngle', 'img', 'imgDim', 'imgBlur', 'imgFit', 'imgPos', 'glow', 'glowPower', 'glowColor', 'alpha', 'blur', 'headAlpha'],
    schrift: ['font', 'headFont', 'numFont', 'scale', 'weight', 'lineHeight', 'letter', 'headScale', 'headCaps', 'clockScale'],
    form: ['radius', 'card', 'borderW', 'tint', 'density', 'width', 'icons', 'iconSize', 'iconStroke', 'hover', 'motion', 'scrollbar'],
    start: ['sections', 'heroOrder', 'heroLayout', 'clockAlign', 'showClock', 'showToday', 'showWeather', 'showPins', 'showFoot', 'greet', 'greetText', 'clockStyle', 'seconds', 'hour12', 'showDate', 'dateStyle', 'showWeek', 'showArc',
      'todayMax', 'todayCompact', 'todayIcons', 'todayOnlyBad', 'tempUnit', 'windUnit', 'fcDays', 'wxDetails', 'headFix', 'brand', 'showBrand', 'showSearch', 'showPhase', 'showThemeBtn', 'showCkBtn', 'showNames'],
    kacheln: ['groupMode', 'sort', 'foldable', 'showRecent', 'tiles', 'cols', 'tileMin', 'tileGap', 'tileHeight', 'secGap', 'tileAlign', 'tileBar', 'tileDesc', 'tileLive', 'tileButtons', 'groupHead', 'groupDesc', 'order', 'closed', 'hidden', 'tileOrder', 'apps', 'groupNames', 'ownGroups', 'links'],
    cockpit: ['ckSize', 'ckAlpha', 'ckLines', 'ckEvery', 'ckColor'],
    bedienung: ['newTab', 'focusSearch', 'hotkeys', 'numberKeys', 'startApp', 'confirmLogout', 'idleLogout', 'css']
  };
  const onHome = location.pathname === '/' || location.pathname === '/index.html';
  let dlg, tab = 'vorlagen', user = null, ckCfg = null, query = '';
  const opened = new Set(), history = []; let lastPush = 0, lastKey = '';

  // ---------- Zustand ----------
  const P = () => D.getStored();
  // Jede Änderung merkt sich den vorigen Stand für „Rückgängig“ (Reglerbewegungen zählen als ein Schritt)
  function put(patch, replace, sliding) {
    const key = sliding ? Object.keys(patch).join() : '', now = Date.now();
    if (replace || !key || key !== lastKey || now - lastPush > 1200) { history.push(JSON.stringify(P())); if (history.length > 40) history.shift(); }
    lastKey = key; lastPush = now; setPrefs(patch, replace); $('[data-undo]', dlg).disabled = !history.length;
  }
  const change = (patch, replace) => { put(patch, replace); draw(true); };

  // ---------- Bausteine ----------
  const label = (t, sub) => `<span>${esc(t)}${sub ? `<small>${esc(sub)}</small>` : ''}</span>`;
  const row = (t, control, sub, cls = '') => `<div class="set-row ${cls}">${label(t, sub)}${control}</div>`;
  const sw = (k, t, sub) => `<label class="set-row">${label(t, sub)}<input type="checkbox" class="switch" data-k="${k}" ${P()[k] ? 'checked' : ''}></label>`;
  const seg = (k, t, opts, sub) => row(t, `<div class="seg" role="group" aria-label="${esc(t)}">${opts.map(([v, l]) => `<button type="button" data-k="${k}" data-v="${esc(v)}" class="${String(P()[k]) === String(v) ? 'on' : ''}" aria-pressed="${String(P()[k]) === String(v)}">${esc(l)}</button>`).join('')}</div>`, sub, 'col');
  const options = (opts, cur) => opts.map(([v, l]) => `<option value="${esc(v)}" ${String(cur) === String(v) ? 'selected' : ''}>${esc(l)}</option>`).join('');
  const select = (k, t, opts, sub) => row(t, `<select data-k="${k}" aria-label="${esc(t)}">${options(opts, P()[k])}</select>`, sub);
  const UNITS = { patSize: v => v + ' px', patStrength: v => v + ' %', gradAngle: v => v + '°', imgDim: v => v + ' %', imgBlur: v => v + ' px', glowPower: v => v + ' %', alpha: v => v + ' %', blur: v => v + ' px', headAlpha: v => v + ' %',
    brightness: v => v + ' %', saturation: v => v + ' %', warmth: v => v ? v + ' %' : 'aus', lineHeight: v => (v / 100).toFixed(2).replace('.', ','), letter: v => (v > 0 ? '+' : '') + v, headScale: v => v + ' %', clockScale: v => v + ' %',
    radius: v => v + ' px', borderW: v => v + ' px', iconSize: v => v + ' %', iconStroke: v => (v / 10).toFixed(1).replace('.', ','), tileMin: v => v ? Math.max(80, v) + ' px' : 'Auto', tileGap: v => v < 0 ? 'Auto' : v + ' px', tileHeight: v => v ? v + ' px' : 'Auto',
    secGap: v => v < 0 ? 'Auto' : v + ' px', todayMax: v => v, fcDays: v => v ? v + ' Tage' : 'aus', cols: v => v > 1 ? v : 'Auto', ckSize: v => v + ' %', ckAlpha: v => v + ' %' };
  const range = (k, t, step = 1, sub) => row(t, `<span class="set-range"><input type="range" data-k="${k}" min="${D.SPEC[k][1][0]}" max="${D.SPEC[k][1][1]}" step="${step}" value="${P()[k]}" aria-label="${esc(t)}"><output>${esc(UNITS[k](P()[k]))}</output></span>`, sub);
  const color = (k, t, fallback, sub) => row(t, `<span class="set-color">${P()[k] && D.SPEC[k][0] === '' ? `<button type="button" class="ghost sm" data-k="${k}" data-v="">Standard</button>` : ''}<input type="color" data-k="${k}" value="${P()[k] || hexOf(fallback)}" aria-label="${esc(t)}"></span>`, sub);
  const textIn = (k, t, ph, sub) => row(t, `<input type="text" data-k="${k}" maxlength="${D.SPEC[k][1]}" value="${esc(P()[k])}" placeholder="${esc(ph)}" aria-label="${esc(t)}">`, sub, 'col');
  const mover = (list, id, i, n, name) => `<span class="mv"><button type="button" class="sm" data-move="${list}" data-id="${esc(id)}" data-dir="-1" ${i ? '' : 'disabled'} aria-label="${esc(name)} nach oben">↑</button><button type="button" class="sm" data-move="${list}" data-id="${esc(id)}" data-dir="1" ${i < n - 1 ? '' : 'disabled'} aria-label="${esc(name)} nach unten">↓</button></span>`;
  const card = (key, head, body) => `<details class="set-card" data-open="${esc(key)}" ${opened.has(key) ? 'open' : ''}><summary>${head}</summary>${body}</details>`;
  const homeOnly = (buttons, what) => onHome ? `<div class="set-row">${label(what)}<span class="row" style="gap:6px">${buttons.map(([id, t]) => `<button type="button" class="sm" data-home="${id}">${t}</button>`).join('')}</span></div>` : `<p class="faint" style="font-size:12px;margin-top:8px">${what}: auf der <a href="/" class="acc">Startseite</a> einstellen.</p>`;
  const themeCard = (id, name, bg, acc) => `<button type="button" data-k="theme" data-v="${id}" class="${P().theme === id ? 'on' : ''}" aria-pressed="${P().theme === id}"><i style="background:${bg};--c:${acc}"></i>${esc(name)}</button>`;
  const themeOpts = Object.entries(THEMES).map(([id, t]) => [id, t[0]]);
  const fontOpts = Object.entries(D.FONTS).map(([id, f]) => [id, f[0]]);
  const allowed = () => APPS.filter(a => user.apps.includes(a.id));
  const groupNames = () => [...Object.keys(GROUPS)];
  const orderedGroups = () => { const known = [...groupNames(), LINKS], o = P().order.filter(g => known.includes(g)); return [...o, ...known.filter(g => !o.includes(g))]; };
  // Farbwähler brauchen #rrggbb
  function hexOf(c) { c = String(c || '').trim(); if (/^#[0-9a-f]{6}$/i.test(c)) return c; const x = document.createElement('canvas').getContext('2d'); x.fillStyle = '#888888'; x.fillStyle = c; return /^#/.test(x.fillStyle) ? x.fillStyle : '#888888'; }
  const css = v => hexOf(getComputedStyle(document.documentElement).getPropertyValue(v));

  // ---------- Vorlagen ----------
  const skinNow = () => D.SKINS[document.documentElement.dataset.phase];
  // Kleines Vorschaubild: echte Farben und Hintergrund der Vorlage mit angedeuteter Seite
  function preview(v) {
    const set = v.set, skin = D.SKINS[set.theme], theme = skin ? '' : THEMES[set.theme] ? set.theme : 'nacht';
    const vars = skin ? `--bg:${skin[2]};--acc:${skin[3]};--bg2:${skin[4]};--line2:${skin[7]};--text:${skin[8]};color-scheme:${skin[1] ? 'light' : 'dark'};` : '';
    const own = (set.accent ? `--acc:${set.accent};` : '') + (set.grad ? `background-image:linear-gradient(${set.gradAngle}deg,${set.grad1},${set.grad2});` : '');
    const r = Math.round((set.radius ?? 14) / 2.4), kind = set.tiles || 'karten';
    return `<span class="pvbox" ${theme ? `data-phase="${theme}"` : ''} style="${vars}${own}--pr:${r}px" aria-hidden="true">${skin ? `<i class="pv" data-pv="${set.theme}"></i>` : ''}<span class="pvhead"></span><span class="pvtiles ${kind}">${'<span><i></i><b></b></span>'.repeat(kind === 'symbole' ? 4 : 3)}</span></span>`;
  }
  const tplCard = v => { const on = WBVorlagen.active(v, P()), font = D.FONTS[v.set.headFont || v.set.font || 'standard'][1];
    return `<button type="button" class="tpl ghost ${on ? 'on' : ''}" data-vorlage="${v.id}" aria-pressed="${on}">${preview(v)}<strong style="${esc(font ? 'font-family:' + font.replace(/"/g, "'") : '')}">${esc(v.name)}</strong><small>${esc(v.hint)}</small></button>`; };

  // ---------- Seiten ----------
  const PAGES = {
    vorlagen: () => !window.WBVorlagen ? '<p class="mute" style="margin-top:20px">Die Vorlagen konnten nicht geladen werden. Lade die Seite neu.</p>'
      : `<p class="faint" style="font-size:12px;margin-top:14px">Eine Vorlage stellt Farben, Hintergrund, Schrift, Form, Kachelansicht und Cockpit-Aussehen auf einmal um. Deine Kacheln, Links, Anordnung und Bedienung bleiben. „Rückgängig“ holt den vorigen Stand zurück.</p>
      <div class="set-looks"><button type="button" class="primary" data-act="zufall">Zufällige Vorlage</button></div>
      ${WBVorlagen.CATS.map(([c, t]) => `<h3>${esc(t)}</h3><div class="set-tpl">${WBVorlagen.LIST.filter(v => v.cat === c).map(tplCard).join('')}</div>`).join('')}
      <p class="faint" style="font-size:11px;margin-top:16px">Alle Bilder und die Pixelschrift sind selbst gezeichnet und an die Spiele nur angelehnt. Keine Verbindung zu deren Herstellern.</p>`,
    aussehen: () => { const p = P(), cur = D.SKINS[p.theme];
      return `<h3>Zusammenstellen</h3><div class="set-looks"><button type="button" data-tab="vorlagen">Fertige Vorlagen ansehen</button><button type="button" class="primary" data-act="random">Überrasch mich</button></div>
      <h3>Design</h3><div class="set-themes">
        ${themeCard('auto', 'Tageszeit', 'linear-gradient(90deg,#0b131d 25%,#f2f0eb 25% 50%,#120f0e 50% 75%,#0a0c0f 75%)', '#ff9b54')}
        ${themeCard('system', 'Wie Gerät', 'linear-gradient(110deg,#f2f0eb 50%,#0a0c0f 50%)', '#5aa9ff')}
        ${themeOpts.filter(([id]) => !D.SKINS[id]).map(([id, n]) => themeCard(id, n, THEMES[id][2], THEMES[id][3])).join('')}
        ${cur ? themeCard(p.theme, cur[0], cur[2], cur[3]) : ''}
        ${themeCard('eigen', 'Eigenes', p.myBg, p.accent || '#8fc7ff')}</div>
      ${p.theme === 'eigen' ? color('myBg', 'Eigene Hintergrundfarbe', p.myBg, 'Flächen, Linien und Schrift passen sich automatisch an') : ''}
      ${p.theme === 'auto' ? `<h3>Design je Tageszeit</h3>${select('phMorgen', 'Morgens (5–10 Uhr)', themeOpts)}${select('phMittag', 'Tagsüber (10–17 Uhr)', themeOpts)}${select('phAbend', 'Abends (17–22 Uhr)', themeOpts)}${select('phNacht', 'Nachts (22–5 Uhr)', themeOpts)}` : ''}
      ${p.theme === 'system' ? `<h3>Passend zum Gerät</h3>${select('phMittag', 'Wenn das Gerät hell ist', themeOpts)}${select('phNacht', 'Wenn das Gerät dunkel ist', themeOpts)}` : ''}
      <h3>Akzentfarbe</h3><div class="set-dots">
        <button type="button" class="auto ${p.accent ? '' : 'on'}" data-k="accent" data-v="" title="Passend zum Design" aria-label="Passend zum Design"></button>
        ${ACCENTS.map(c => `<button type="button" style="--c:${c}" class="${p.accent === c ? 'on' : ''}" data-k="accent" data-v="${c}" title="${c}" aria-label="Akzent ${c}"></button>`).join('')}
        <input type="color" data-k="accent" value="${p.accent || css('--acc')}" title="Eigene Farbe wählen" aria-label="Eigene Akzentfarbe"></div>
      <h3>Meine Ansichten</h3><p class="faint" style="font-size:12px">Speichere den kompletten Stand (Aussehen und Aufbau) unter einem Namen, z. B. „Arbeit“ und „Abend“, und wechsle mit einem Klick.</p>
      ${p.profiles.map((x, i) => row(x.n, `<span class="row" style="gap:4px;flex-wrap:nowrap"><button type="button" class="sm primary" data-prof="use" data-i="${i}">Anwenden</button><button type="button" class="sm" data-prof="save" data-i="${i}" title="Mit dem aktuellen Stand überschreiben">Ersetzen</button><button type="button" class="sm danger" data-prof="del" data-i="${i}" aria-label="${esc(x.n)} löschen">✕</button></span>`)).join('')}
      ${p.profiles.length < 8 ? row('Neue Ansicht', `<span class="row" style="gap:6px;flex-wrap:nowrap"><input type="text" data-new="profil" maxlength="24" placeholder="Name" aria-label="Name der Ansicht"><button type="button" class="sm" data-act="profil">Speichern</button></span>`, '', 'col') : ''}`; },
    farben: () => { const p = P(), bg = p.cBg || D.curBg(), weak = [['--text', 'Schrift', 4.5], ['--mute', 'Gedämpfte Schrift', 3]].filter(([v]) => D.contrast(css(v), css('--bg2')) < 3 || D.contrast(css(v), css('--bg')) < 3);
      return `<h3>Farben der Kacheln und Apps</h3>
      ${seg('colors', 'Schema', [['bereich', 'Je Bereich'], ['akzent', 'Meine Akzentfarbe'], ['grau', 'Grau']], 'Bei „Je Bereich“ behält jede App ihre Bereichsfarbe')}
      ${groupNames().map(g => row(groupLabel(g), `<span class="set-color">${p.groups[g] ? `<button type="button" class="ghost sm" data-groupreset="${esc(g)}">Standard</button>` : ''}<input type="color" data-group="${esc(g)}" value="${hexOf(groupColor(g))}" aria-label="Farbe für ${esc(groupLabel(g))}"></span>`)).join('')}
      <h3>Farben im Detail</h3><p class="faint" style="font-size:12px">Jede Farbe überschreibt die des Designs.</p>
      ${weak.length ? `<div class="set-warn">Achtung: ${esc(weak.map(w => w[1]).join(' und '))} ist mit diesen Farben schwer lesbar.</div>` : ''}
      ${color('cBg', 'Hintergrund', bg, 'Flächen und Schrift passen sich an, solange du sie nicht selbst wählst')}${color('cBg2', 'Karten und Kacheln', css('--bg2'))}${color('cBg3', 'Knöpfe', css('--bg3'))}${color('cLine', 'Linien und Rahmen', css('--line'))}
      ${color('cText', 'Schrift', css('--text'))}${color('cMute', 'Gedämpfte Schrift', css('--mute'))}${color('cGood', 'In Ordnung', css('--good'))}${color('cWarn', 'Hinweis', css('--warn'))}${color('cBad', 'Problem', css('--bad'))}
      <h3>Bildwirkung</h3>${range('brightness', 'Helligkeit')}${range('saturation', 'Farbsättigung', 1, '0 % ist Schwarz-Weiß')}${range('warmth', 'Warmes Licht', 1, 'Weniger Blau am Abend')}
      ${sw('contrast', 'Höherer Kontrast', 'Kräftigere Schrift und Linien')}`; },
    hintergrund: () => { const p = P(), img = D.getImage();
      return `${skinNow() ? `<h3>Vorlage „${esc(skinNow()[0])}“</h3>${sw('skinBg', 'Hintergrund der Vorlage', 'Aus: Muster, Farbverlauf und Schimmer von hier unten gelten')}${sw('skinDeko', 'Verzierungen der Vorlage', 'Rahmen, Schatten und Kopfzeile im Stil der Vorlage')}` : ''}<h3>Muster</h3>${seg('bg', 'Art', [['punkte', 'Punkte'], ['raster', 'Raster'], ['linien', 'Linien'], ['streifen', 'Streifen'], ['karo', 'Karo'], ['ringe', 'Ringe'], ['schlicht', 'Ohne']])}
      ${range('patSize', 'Größe des Musters')}${range('patStrength', 'Stärke des Musters')}
      <h3>Farbverlauf</h3>${sw('grad', 'Farbverlauf verwenden')}${p.grad ? color('grad1', 'Erste Farbe', p.grad1) + color('grad2', 'Zweite Farbe', p.grad2) + range('gradAngle', 'Richtung', 5) : ''}
      <h3>Eigenes Bild</h3>${img ? `<div class="set-thumb" role="img" aria-label="Dein Hintergrundbild" style="background-image:url('${img}')"></div>` : ''}
      <div class="set-row">${label(img ? 'Bild ersetzen' : 'Bild hochladen', 'Wird verkleinert und nur in deinem Konto gespeichert')}<span class="row" style="gap:6px"><button type="button" class="sm" data-act="bild">Bild wählen</button>${img ? '<button type="button" class="sm danger" data-act="bildweg">Entfernen</button>' : ''}</span><input type="file" accept="image/*" data-bild class="hide"></div>
      ${img ? sw('img', 'Bild anzeigen') + range('imgDim', 'Abdunkeln bzw. aufhellen', 1, 'Je höher, desto besser lesbar') + range('imgBlur', 'Weichzeichnen') + seg('imgFit', 'Anpassung', [['fuellen', 'Füllen'], ['einpassen', 'Einpassen'], ['kacheln', 'Wiederholen']]) + seg('imgPos', 'Ausschnitt', [['oben', 'Oben'], ['mitte', 'Mitte'], ['unten', 'Unten']]) : ''}
      <h3>Schimmer</h3>${sw('glow', 'Farbschimmer am oberen Rand')}${p.glow ? range('glowPower', 'Größe', 5) + color('glowColor', 'Farbe des Schimmers', css('--acc')) : ''}
      <h3>Transparenz</h3>${range('alpha', 'Deckkraft von Karten und Kacheln', 1, 'Niedrig: der Hintergrund scheint durch')}${range('headAlpha', 'Deckkraft der Kopfzeile')}${range('blur', 'Milchglas-Unschärfe')}`; },
    schrift: () => `<h3>Schriftarten</h3><p class="faint" style="font-size:12px">Genutzt werden Schriften deines Geräts. Fehlt eine, sieht sie wie eine ähnliche aus.</p>
      ${select('font', 'Text', fontOpts)}${select('headFont', 'Überschriften', [['standard', 'Wie Text'], ...fontOpts.slice(1)])}${select('numFont', 'Zahlen und Uhr', fontOpts)}
      <h3>Größe</h3>${seg('scale', 'Alles', [[85, '85 %'], [90, '90 %'], [100, '100 %'], [110, '110 %'], [115, '115 %'], [125, '125 %'], [135, '135 %']], 'Auf schmalen Bildschirmen wird höchstens so weit vergrößert, wie alles Platz hat')}
      ${range('headScale', 'Überschriften', 5)}${range('clockScale', 'Uhr auf der Startseite', 5)}
      <h3>Satz</h3>${seg('weight', 'Strichstärke', [['normal', 'Normal'], ['mittel', 'Mittel'], ['kraeftig', 'Kräftig']])}${range('lineHeight', 'Zeilenabstand', 5)}${range('letter', 'Buchstabenabstand')}${sw('headCaps', 'Überschriften in Großbuchstaben')}`,
    form: () => `<h3>Karten und Kacheln</h3>
      ${seg('card', 'Stil', [['rahmen', 'Rahmen'], ['flach', 'Flach'], ['schatten', 'Schatten'], ['glas', 'Glas']])}${range('radius', 'Rundung der Ecken')}${range('borderW', 'Rahmenstärke')}${sw('tint', 'Kacheln farbig tönen')}
      <h3>Symbole</h3>${seg('icons', 'Form', [['eckig', 'Eckig'], ['rund', 'Rund'], ['voll', 'Ausgefüllt'], ['ohne', 'Ohne Fläche']])}${range('iconSize', 'Größe', 5)}${range('iconStroke', 'Strichstärke')}
      <h3>Abstände und Breite</h3>${seg('density', 'Abstände', [['kompakt', 'Kompakt'], ['normal', 'Normal'], ['luftig', 'Luftig']])}${seg('width', 'Breite des Inhalts', [['schmal', 'Schmal'], ['normal', 'Normal'], ['breit', 'Breit'], ['voll', 'Voll']], 'Wirkt auf großen Bildschirmen')}
      <h3>Verhalten</h3>${seg('hover', 'Beim Überfahren einer Kachel', [['heben', 'Anheben'], ['leuchten', 'Leuchten'], ['zoom', 'Vergrößern'], ['keiner', 'Nichts']])}${sw('motion', 'Animationen', 'Aus: nichts bewegt oder blendet sich ein')}
      ${seg('scrollbar', 'Scrollleisten', [['normal', 'Normal'], ['schmal', 'Schmal'], ['aus', 'Unsichtbar']])}`,
    start: () => { const p = P(), SN = { uebersicht: 'Übersicht (Uhr, Heute, Wetter)', cockpit: 'Cockpit (auf schmalen Bildschirmen)', angeheftet: 'Angeheftet', zuletzt: 'Zuletzt benutzt', kacheln: 'Kacheln' }, HN = { uhr: 'Begrüßung und Uhr', heute: 'Heute', wetter: 'Wetter' };
      return `<h3>Was angezeigt wird</h3>${sw('showClock', 'Begrüßung und Uhr')}${sw('showToday', '„Heute“ mit Hinweisen')}${sw('showWeather', 'Wetter')}${sw('showPins', 'Angeheftete Kacheln')}${sw('showRecent', 'Zuletzt benutzt')}${sw('showFoot', 'Fußzeile mit Tastenhilfe')}
      ${homeOnly([['notify', 'Hinweise'], ['city', 'Wetterort']], 'Hinweise und Wetterort')}
      <h3>Reihenfolge der Abschnitte</h3><div class="set-list">${p.sections.map((s, i) => row(SN[s], mover('sections', s, i, p.sections.length, SN[s]))).join('')}</div>
      <h3>Reihenfolge in der Übersicht</h3><div class="set-list">${p.heroOrder.map((s, i) => row(HN[s], mover('heroOrder', s, i, p.heroOrder.length, HN[s]))).join('')}</div>
      ${seg('heroLayout', 'Anordnung', [['auto', 'Nebeneinander'], ['gestapelt', 'Untereinander']])}
      <h3>Begrüßung</h3>${seg('greet', 'Text', [['auto', 'Nach Tageszeit'], ['eigen', 'Eigener Text'], ['aus', 'Keine']])}
      ${p.greet === 'eigen' ? textIn('greetText', 'Dein Text', 'Moin {name}!', '{name} wird durch deinen Namen ersetzt') : ''}${seg('clockAlign', 'Ausrichtung', [['links', 'Links'], ['mitte', 'Mittig']])}
      <h3>Uhr und Datum</h3>${seg('clockStyle', 'Uhr', [['digital', 'Digital'], ['analog', 'Analog'], ['beides', 'Beides']])}${sw('seconds', 'Sekunden anzeigen')}${sw('hour12', '12-Stunden-Format')}${sw('showDate', 'Datum')}${seg('dateStyle', 'Datumsformat', [['lang', 'Freitag, 27. November'], ['kurz', 'Fr., 27. Nov.'], ['zahlen', '27.11.2026']])}${sw('showWeek', 'Kalenderwoche')}${sw('showArc', 'Tageslauf mit Sonnenzeiten')}
      <h3>Heute</h3>${range('todayMax', 'Einträge bis „weitere“')}${sw('todayCompact', 'Kompakte Zeilen')}${sw('todayIcons', 'Symbole anzeigen')}${sw('todayOnlyBad', 'Nur Dringendes zeigen')}
      <h3>Wetter</h3>${seg('tempUnit', 'Temperatur', [['c', 'Celsius'], ['f', 'Fahrenheit']])}${seg('windUnit', 'Wind', [['kmh', 'km/h'], ['ms', 'm/s'], ['mph', 'mph']])}${range('fcDays', 'Vorhersage')}${sw('wxDetails', 'Gefühlt, Wind und Regen')}
      <h3>Kopfzeile</h3>${sw('headFix', 'Beim Scrollen oben stehen bleiben')}${sw('showBrand', 'Logo und Name')}${textIn('brand', 'Eigener Name', 'WERKBANK')}${sw('showSearch', 'Suchfeld', 'Aus: die Taste „/“ hat dann kein Ziel')}${sw('showPhase', 'Design-Anzeige')}${sw('showThemeBtn', 'Knopf für Hell/Dunkel')}${sw('showCkBtn', 'Knopf für das Cockpit')}${sw('showNames', 'Beschriftung bei Verwaltung und Konto')}`; },
    kacheln: () => { const p = P(), groups = orderedGroups(), real = groups.filter(g => g !== LINKS), groupOpts = groupNames().map(g => [g, groupLabel(g)]);
      return `<h3>Anordnung</h3>${homeOnly([['arrange', 'Jetzt anordnen']], 'Kacheln mit der Maus ziehen oder mit Pfeilen verschieben')}
      ${seg('groupMode', 'Gliederung', [['gruppen', 'Nach Bereichen'], ['eins', 'Alles in einem Raster']])}${seg('sort', 'Sortierung', [['standard', 'Standard'], ['az', 'A–Z'], ['oft', 'Meistgenutzt'], ['eigen', 'Eigene']])}
      ${sw('foldable', 'Bereiche einklappbar', 'Klick auf die Überschrift')}${sw('showRecent', 'Abschnitt „Zuletzt benutzt“')}
      <h3>Darstellung</h3>${seg('tiles', 'Art', [['karten', 'Karten'], ['kompakt', 'Kompakt'], ['liste', 'Liste'], ['symbole', 'Symbole']])}
      ${seg('cols', 'Höchstens so viele Spalten', [[0, 'Auto'], [2, '2'], [3, '3'], [4, '4'], [5, '5'], [6, '6'], [8, '8']], 'Auf schmalen Bildschirmen werden es weniger')}
      ${range('tileMin', 'Mindestbreite', 10, 'Wirkt, wenn Spalten auf „Auto“ steht')}${range('tileHeight', 'Mindesthöhe', 10)}${range('tileGap', 'Abstand zwischen Kacheln')}${range('secGap', 'Abstand zwischen Abschnitten')}
      ${seg('tileAlign', 'Inhalt', [['links', 'Links'], ['mitte', 'Mittig']])}${seg('tileBar', 'Farbstreifen', [['keine', 'Keiner'], ['links', 'Links'], ['oben', 'Oben']])}
      ${sw('tileDesc', 'Beschreibungen')}${sw('tileLive', 'Live-Zeilen', 'z. B. „3 offen“')}${sw('tileButtons', 'Glocke und Stecknadel')}${sw('groupHead', 'Überschriften der Bereiche')}${sw('groupDesc', 'Untertitel der Bereiche')}
      <h3>Bereiche</h3>${groups.map((g, i) => { const own = GROUPS[g]?.own; return card('g:' + g, `<i style="--g:${groupColor(g)};background:var(--g)"></i>${esc(groupLabel(g))}<small>${own ? 'eigener Bereich' : g === LINKS ? 'deine Links' : ''}</small>`,
        `${g === LINKS ? '' : row('Name', `<input type="text" data-grpname="${esc(g)}" maxlength="24" value="${esc(own ? g : p.groupNames[g] || '')}" placeholder="${esc(g)}" aria-label="Name des Bereichs">`)}
         ${g === LINKS ? '' : row('Farbe', `<span class="set-color">${p.groups[g] ? `<button type="button" class="ghost sm" data-groupreset="${esc(g)}">Standard</button>` : ''}<input type="color" data-group="${esc(g)}" value="${hexOf(groupColor(g))}" aria-label="Farbe"></span>`)}
         ${row('Position', mover('order', g, i, groups.length, groupLabel(g)))}${own ? row('Bereich löschen', `<button type="button" class="sm danger" data-grpdel="${esc(g)}">Löschen</button>`, 'Kacheln wandern an ihren alten Platz zurück') : ''}`); }).join('')}
      ${p.ownGroups.length < 8 ? row('Eigener Bereich', `<span class="row" style="gap:6px;flex-wrap:nowrap"><input type="text" data-new="bereich" maxlength="24" placeholder="z. B. Favoriten" aria-label="Name des neuen Bereichs"><button type="button" class="sm" data-act="bereich">Anlegen</button></span>`, 'Danach unten bei einer Kachel auswählen', 'col') : ''}
      <h3>Einzelne Kacheln</h3><p class="faint" style="font-size:12px">Name, Symbol, Farbe, Größe, Bereich und Sichtbarkeit. Freigaben ändert das nicht.</p>
      ${real.flatMap(g => allowed().filter(a => a.g === g)).map(a => { const e = p.apps[a.id] || {}, hidden = p.hidden.includes(a.id); return card('a:' + a.id, `<i style="--g:${appColor(a)};background:var(--g)"></i>${esc(a.t)}<small>${hidden ? 'ausgeblendet' : esc(groupLabel(a.g))}</small>`,
        `<label class="set-row">${label('Auf der Startseite zeigen', 'Über die Suche findest du sie immer')}<input type="checkbox" class="switch" data-vis="${a.id}" ${hidden ? '' : 'checked'}></label>
         ${row('Name', `<input type="text" data-app="${a.id}" data-f="name" maxlength="32" value="${esc(e.name || '')}" placeholder="${esc(a.t0)}" aria-label="Name">`)}
         ${row('Symbol (Emoji)', `<input type="text" data-app="${a.id}" data-f="icon" maxlength="8" value="${esc(e.icon || '')}" placeholder="Standard" aria-label="Symbol">`)}
         ${row('Farbe', `<span class="set-color">${e.color ? `<button type="button" class="ghost sm" data-appreset="${a.id}">Standard</button>` : ''}<input type="color" data-app="${a.id}" data-f="color" value="${hexOf(appColor(a))}" aria-label="Farbe"></span>`)}
         ${row('Größe', `<select data-app="${a.id}" data-f="size" aria-label="Größe">${options([['', 'Normal'], ['breit', 'Breit'], ['gross', 'Groß']], e.size || '')}</select>`)}
         ${row('Bereich', `<select data-app="${a.id}" data-f="g" aria-label="Bereich">${options(groupOpts, a.g)}</select>`)}`); }).join('')}
      <h3>Eigene Links</h3><p class="faint" style="font-size:12px">Kacheln zu beliebigen Webseiten, z. B. Router, Mails oder dein NAS. Sie öffnen in einem neuen Tab.</p>
      ${p.links.map(l => card('l:' + l.id, `<i style="--g:${appColor({ id: l.id, c: l.c, g: l.g || LINKS })};background:var(--g)"></i>${esc(l.n)}<small>${esc(l.g ? groupLabel(l.g) : LINKS)}</small>`,
        `${row('Name', `<input type="text" data-link="${l.id}" data-f="n" maxlength="32" value="${esc(l.n)}" aria-label="Name">`)}${row('Adresse', `<input type="url" data-link="${l.id}" data-f="u" maxlength="500" value="${esc(l.u)}" aria-label="Adresse">`)}
         ${row('Symbol (Emoji)', `<input type="text" data-link="${l.id}" data-f="i" maxlength="8" value="${esc(l.i)}" placeholder="Standard" aria-label="Symbol">`)}${row('Farbe', `<input type="color" data-link="${l.id}" data-f="c" value="${l.c || hexOf(appColor({ g: l.g || LINKS }))}" aria-label="Farbe">`)}
         ${row('Bereich', `<select data-link="${l.id}" data-f="g" aria-label="Bereich">${options([['', LINKS], ...groupOpts], l.g)}</select>`)}${row('Link löschen', `<button type="button" class="sm danger" data-linkdel="${l.id}">Löschen</button>`)}`)).join('')}
      ${p.links.length < 30 ? `<div class="set-row col">${label('Neuer Link')}<input type="text" data-new="linkname" maxlength="32" placeholder="Name" aria-label="Name des Links"><span class="row" style="gap:6px;flex-wrap:nowrap"><input type="url" data-new="linkurl" maxlength="500" placeholder="https://…" aria-label="Adresse des Links"><button type="button" class="sm" data-act="link">Hinzufügen</button></span></div>` : ''}`; },
    cockpit: () => !user.cockpit ? '<p class="mute" style="margin-top:20px">Das Cockpit ist für dein Konto nicht freigegeben. Frag den Admin, falls du es nutzen möchtest.</p>'
      : `<h3>Aussehen</h3>${range('ckSize', 'Größe der Anzeigen', 5)}${range('ckAlpha', 'Deckkraft', 5)}${color('ckColor', 'Farbe der Zeiger und Balken', css('--acc'))}${sw('ckLines', 'Trennlinien')}
        ${seg('ckEvery', 'Aktualisieren', [[2, 'alle 2 s'], [5, 'alle 5 s'], [10, 'alle 10 s'], [30, 'alle 30 s']])}${sw('showCkBtn', 'Cockpit-Knopf in der Kopfzeile')}
        <h3>Anzeigen und Plätze</h3>${ckCfg ? '<div data-ck></div>' : '<p class="mute">Lädt …</p>'}`,
    bedienung: () => `<h3>Bedienung</h3>
      ${select('startApp', 'Nach dem Anmelden öffnen', [['', 'Startseite'], ...allowed().map(a => [a.id, a.t])])}
      ${sw('newTab', 'Apps in neuem Tab öffnen', 'Gilt für Kacheln und die Suche auf der Startseite')}${sw('focusSearch', 'Suche beim Öffnen aktivieren', 'Du kannst auf der Startseite sofort lostippen')}
      ${sw('hotkeys', 'Tastenkürzel', '„/“ springt zur Suche, „Esc“ führt aus einer App zurück')}${sw('numberKeys', 'Zifferntasten', '1–9 öffnen die angehefteten Kacheln')}
      <h3>Sicherheit</h3>${sw('confirmLogout', 'Vor dem Abmelden nachfragen')}
      ${seg('idleLogout', 'Bei Untätigkeit abmelden', [[0, 'Nie'], [15, '15 Min'], [30, '30 Min'], [60, '1 Std'], [240, '4 Std']], 'Gilt in Browsern, in denen die Werkbank offen ist. Meldet dich überall ab.')}
      <h3>Eigenes CSS (für Fortgeschrittene)</h3><div class="set-row col">${label('Eigene Stilregeln', 'Nachgeladene Inhalte (url, @import) sind gesperrt. Falls danach nichts mehr bedienbar ist: Adresse mit ?sicher öffnen.')}<textarea data-css maxlength="6000" spellcheck="false" placeholder=".tile { transform: rotate(-.4deg); }" aria-label="Eigenes CSS">${esc(P().css)}</textarea><div class="row end"><button type="button" class="sm primary" data-act="css">Anwenden</button></div></div>`,
    daten: () => `<h3>Konto</h3><div class="set-row">${label('Name, Passwort, Zwei-Faktor, Geräte')}<a class="btn sm" href="/apps/konto">Mein Konto</a></div>
      <h3>Meine Einstellungen</h3>
      <div class="set-row">${label('Als Datei sichern', 'Mit Hintergrundbild, zum Aufheben oder Weitergeben')}<button type="button" class="sm" data-act="export">Herunterladen</button></div>
      <div class="set-row">${label('Aus Datei laden')}<button type="button" class="sm" data-act="import">Datei wählen</button><input type="file" accept="application/json,.json" data-file class="hide"></div>
      <div class="set-row">${label('Sicherer Anzeigemodus', 'Zeigt alles im Standard, ohne etwas zu löschen')}<a class="btn sm" href="/?sicher">Öffnen</a></div>
      <div class="set-row">${label('Alles auf Standard', 'Aussehen, Startseite, Kacheln und Bedienung. Deine Ansichten und Daten bleiben.')}<button type="button" class="sm danger" data-act="reset">Zurücksetzen</button></div>`
  };

  // ---------- Zeichnen ----------
  const ATTRS = ['vorlage', 'k', 'v', 'app', 'f', 'link', 'group', 'move', 'id', 'dir', 'act', 'look', 'vis', 'grpname', 'prof', 'i', 'new'];
  function mountCockpit(body) { const host = $('[data-ck]', body); if (host && ckCfg) WB.Cockpit.settings(host, ckCfg, c => { ckCfg = WB.Cockpit.normalize(c); Store.set('cockpit', ckCfg); document.dispatchEvent(new CustomEvent('wb-cockpit', { detail: ckCfg })); }); }
  function draw(keep) {
    const body = $('.set-body', dlg), y = keep ? body.scrollTop : 0, el = keep && body.contains(document.activeElement) ? document.activeElement : null;
    const focus = el ? el.tagName.toLowerCase() + ATTRS.map(a => el.dataset[a] !== undefined ? `[data-${a}="${CSS.escape(el.dataset[a])}"]` : '').join('') + (el.type ? `[type="${el.type}"]` : '') : '';
    const typed = $$('[data-new]', body).map(i => [i.dataset.new, i.value]);
    $$('.set-tabs button', dlg).forEach(b => { const on = !query && b.dataset.tab === tab; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
    const reset = id => TAB_KEYS[id] ? `<div class="row end" style="margin-top:18px"><button type="button" class="ghost sm" data-act="tabreset">Diesen Bereich zurücksetzen</button></div>` : '';
    const note = D.isSafe() ? '<div class="set-warn">Sicherer Anzeigemodus: Du siehst gerade den Standard. Eine Änderung hier zeigt wieder deine Einstellungen.</div>' : '';
    body.classList.toggle('set-hit', !!query);
    body.innerHTML = note + (query ? TABS.map(([id, t]) => `<section data-sec="${id}"><h3 class="tabname">${esc(t)}</h3>${PAGES[id]()}</section>`).join('') + '<p class="mute set-none hide" style="margin-top:20px">Keine Einstellung gefunden.</p>' : PAGES[tab]() + reset(tab));
    for (const [k, v] of typed) { const i = $(`[data-new="${k}"]`, body); if (i && v) i.value = v; }
    mountCockpit(body); if (query) filter(body);
    body.scrollTop = y; if (focus) { try { $(focus, body)?.focus({ preventScroll: true }); } catch {} }
  }
  // Suche über alle Bereiche: nur passende Zeilen und ihre Überschriften bleiben
  function filter(body) {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean), has = el => { const t = (el.textContent + ' ' + [...el.querySelectorAll('[aria-label],[placeholder]')].map(x => (x.getAttribute('aria-label') || '') + ' ' + (x.placeholder || '')).join(' ')).toLowerCase(); return words.every(w => t.includes(w)); };
    let any = false;
    for (const sec of $$('section[data-sec]', body)) {
      let heading = null, headingHit = false, shownInSec = false, shownUnder = false;
      const close = () => { if (heading) heading.classList.toggle('hide', !shownUnder); };
      for (const el of [...sec.children].slice(1)) {
        if (el.tagName === 'H3') { close(); heading = el; headingHit = has(el); shownUnder = false; continue; }
        const group = el.classList.contains('set-list') || el.classList.contains('set-tpl'), items = group ? [...el.children] : [el]; let vis = false;
        for (const it of items) { const ok = headingHit || has(it); it.classList.toggle('hide', !ok); vis = vis || ok; }
        if (group) el.classList.toggle('hide', !vis);
        shownUnder = shownUnder || vis; shownInSec = shownInSec || vis;
      }
      close(); sec.classList.toggle('hide', !shownInSec); any = any || shownInSec;
    }
    $('.set-none', body).classList.toggle('hide', any);
  }

  // ---------- Aktionen ----------
  const swap = (list, a, b) => { const x = list.indexOf(a), z = list.indexOf(b); [list[x], list[z]] = [list[z], list[x]]; return list; };
  const fresh = name => { const i = $(`[data-new="${name}"]`, dlg); const v = i.value.trim(); return [i, v]; };
  const nameTaken = n => ['__proto__', 'constructor', 'prototype', LINKS].includes(n) || D.BUILTIN.includes(n) || P().ownGroups.some(g => g.n === n);
  function renameGroup(old, input) {
    const p = P();
    if (D.BUILTIN.includes(old)) { const names = { ...p.groupNames }; input ? names[old] = input : delete names[old]; return change({ groupNames: names }); }
    if (!input || input === old) return draw(true);
    if (nameTaken(input)) { toast('Diesen Bereich gibt es schon'); return draw(true); }
    const ren = g => g === old ? input : g, groups = { ...p.groups }; if (groups[old]) { groups[input] = groups[old]; delete groups[old]; }
    opened.delete('g:' + old); opened.add('g:' + input);
    change({ ownGroups: p.ownGroups.map(g => g.n === old ? { ...g, n: input } : g), groups, order: p.order.map(ren), closed: p.closed.map(ren),
      apps: Object.fromEntries(Object.entries(p.apps).map(([id, e]) => [id, e.g === old ? { ...e, g: input } : e])), links: p.links.map(l => ({ ...l, g: ren(l.g) })) });
  }
  function setApp(id, f, v) { const apps = { ...P().apps }; apps[id] = { ...(apps[id] || {}), [f]: v }; return { apps }; }
  const setLink = (id, f, v) => ({ links: P().links.map(l => l.id === id ? { ...l, [f]: v } : l) });
  const webAddress = v => { try { const u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(v) ? v : 'https://' + v); return /^https?:$/.test(u.protocol) && u.hostname ? u.href : ''; } catch { return ''; } };
  async function shrink(file) {
    if (!/^image\//.test(file.type) || file.size > 30e6) throw new Error('Bitte ein Bild bis 30 MB wählen');
    const bmp = await createImageBitmap(file);
    for (const [max, q] of [[2200, .84], [1920, .8], [1600, .74], [1280, .7], [960, .65]]) {
      const f = Math.min(1, max / Math.max(bmp.width, bmp.height)), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(bmp.width * f)); c.height = Math.max(1, Math.round(bmp.height * f));
      c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height); const url = c.toDataURL('image/jpeg', q); if (url.length < 1400000) return url;
    }
    throw new Error('Das Bild ist zu groß');
  }
  // Zweimal klicken bei Aktionen, die etwas wegwerfen
  const sure = b => { if (b.dataset.sure) return true; b.dataset.sure = '1'; b.textContent = 'Wirklich?'; return false; };

  const useTemplate = v => { change(WBVorlagen.patch(v, P())); toast(`Vorlage „${v.name}“`); };
  const one = l => l[Math.floor(Math.random() * l.length)];
  const ACTIONS = {
    zufall: () => useTemplate(one(WBVorlagen.LIST.filter(v => !WBVorlagen.active(v, P())))),
    random: () => { const base = normalizePrefs({ theme: one(Object.keys(THEMES).filter(t => !D.SKINS[t])), accent: Math.random() < .6 ? one(ACCENTS) : '', bg: one(['punkte', 'raster', 'linien', 'streifen', 'karo', 'ringe', 'schlicht']), patStrength: 60,
      card: one(['rahmen', 'flach', 'schatten', 'glas']), radius: one([0, 6, 14, 20, 26]), font: one(['standard', 'standard', 'klar', 'technisch', 'rund', 'serif']), icons: one(['eckig', 'rund', 'voll', 'ohne']), tileBar: one(['keine', 'keine', 'links', 'oben']), hover: one(['heben', 'leuchten', 'zoom']), glow: Math.random() < .7 });
      change(Object.fromEntries(LOOK_KEYS.map(k => [k, base[k]]))); },
    profil: () => { const [, n] = fresh('profil'); if (!n) return toast('Gib der Ansicht einen Namen'); const { profiles, ...now } = P(); $('[data-new="profil"]', dlg).value = '';
      change({ profiles: [...profiles.filter(x => x.n !== n), { n, p: now }] }); toast(`Ansicht „${n}“ gespeichert`); },
    bereich: () => { const [i, n] = fresh('bereich'); if (!n) return toast('Gib dem Bereich einen Namen'); if (nameTaken(n)) return toast('Diesen Bereich gibt es schon'); i.value = ''; opened.add('g:' + n); change({ ownGroups: [...P().ownGroups, { n, d: '' }] }); },
    link: () => { const [i, n] = fresh('linkname'), [j, raw] = fresh('linkurl'), u = raw && webAddress(raw); if (!n) return toast('Gib dem Link einen Namen'); if (!u) return toast('Die Adresse muss mit http:// oder https:// funktionieren');
      i.value = j.value = ''; change({ links: [...P().links, { id: 'l' + Math.random().toString(36).slice(2, 9), n, u, i: '', g: '', c: '' }] }); toast('Link hinzugefügt'); },
    css: () => { change({ css: $('[data-css]', dlg).value }); toast('CSS angewendet'); },
    bild: () => $('[data-bild]', dlg).click(),
    bildweg: () => { D.setImage(''); draw(true); },
    export: () => download('werkbank-einstellungen.json', JSON.stringify({ werkbankEinstellungen: 1, ui: P(), bild: D.getImage() || undefined }), 'application/json'),
    import: () => $('[data-file]', dlg).click(),
    tabreset: b => { if (!sure(b)) return; const def = normalizePrefs({}); if (tab === 'hintergrund') D.setImage(''); change(Object.fromEntries(TAB_KEYS[tab].map(k => [k, def[k]]))); toast('Bereich zurückgesetzt'); },
    reset: b => { if (!sure(b)) return; D.setImage(''); change({ profiles: P().profiles }, true); toast('Einstellungen zurückgesetzt'); }
  };

  function onClick(e) {
    if (e.target === dlg) { const r = dlg.getBoundingClientRect(); if (e.clientX < r.left) dlg.close(); return; }
    const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
    if ('close' in d) return dlg.close();
    if ('undo' in d) { const last = history.pop(); if (!last) return; setPrefs(JSON.parse(last), true); lastKey = ''; b.disabled = !history.length; return draw(true); }
    if (d.tab) { tab = d.tab; query = ''; $('[data-search]', dlg).value = ''; return draw(); }
    if (d.k !== undefined) return change({ [d.k]: typeof P()[d.k] === 'number' ? Number(d.v) : d.v });
    if (d.vorlage) { const v = WBVorlagen.LIST.find(x => x.id === d.vorlage); return v && useTemplate(v); }
    if (d.groupreset) { const g = { ...P().groups }; delete g[d.groupreset]; return change({ groups: g }); }
    if (d.appreset) return change(setApp(d.appreset, 'color', ''));
    if (d.prof) { const x = P().profiles[+d.i]; if (!x) return;
      if (d.prof === 'use') { change({ ...x.p, profiles: P().profiles }, true); return toast(`Ansicht „${x.n}“`); }
      if (d.prof === 'save') { const { profiles, ...now } = P(); change({ profiles: profiles.map((y, i) => i === +d.i ? { n: x.n, p: now } : y) }); return toast(`„${x.n}“ ersetzt`); }
      if (sure(b)) change({ profiles: P().profiles.filter((_, i) => i !== +d.i) }); return; }
    if (d.move) { const list = d.move === 'order' ? orderedGroups() : [...P()[d.move]], other = list[list.indexOf(d.id) + +d.dir]; if (other === undefined) return; return change({ [d.move]: swap(list, d.id, other) }); }
    if (d.grpdel) { if (!sure(b)) return; const p = P(), g = d.grpdel; const groups = { ...p.groups }; delete groups[g];
      return change({ ownGroups: p.ownGroups.filter(x => x.n !== g), groups, apps: Object.fromEntries(Object.entries(p.apps).map(([id, x]) => [id, x.g === g ? { ...x, g: '' } : x])), links: p.links.map(l => l.g === g ? { ...l, g: '' } : l) }); }
    if (d.linkdel) { if (!sure(b)) return; return change({ links: P().links.filter(l => l.id !== d.linkdel) }); }
    if (d.home) { dlg.close(); return window.WBHome?.[d.home](); }
    if (d.act) return ACTIONS[d.act](b);
  }
  // Während des Ziehens oder Tippens sofort anzeigen, ohne das Feld neu zu zeichnen
  function onInput(e) {
    const t = e.target, d = t.dataset;
    if ('search' in d) { query = t.value.trim(); return draw(); }
    if (d.k && ['range', 'text', 'color'].includes(t.type)) { const v = t.type === 'range' ? Number(t.value) : t.value; put({ [d.k]: v }, false, true); const out = t.nextElementSibling; if (out?.tagName === 'OUTPUT') out.textContent = UNITS[d.k](v); }
    else if (d.group) put({ groups: { ...P().groups, [d.group]: t.value } }, false, true);
    else if (d.app && t.type === 'color') put(setApp(d.app, 'color', t.value), false, true);
  }
  function onChange(e) {
    const t = e.target, d = t.dataset;
    if (d.file !== undefined) { const f = t.files[0]; t.value = ''; if (!f) return; if (f.size > 3e6) return toast('Datei ist zu groß');
      return void f.text().then(x => { const j = JSON.parse(x); if (!j || j.werkbankEinstellungen !== 1 || typeof j.ui !== 'object' || !j.ui) throw 0;
        const ui = { ...j.ui }; if (ui.css && !window.confirm('Die Datei enthält eigenes CSS. Soll es mit übernommen werden?')) delete ui.css;
        if (typeof j.bild === 'string') D.setImage(j.bild); change(ui, true); toast('Einstellungen geladen'); }).catch(() => toast('Das ist keine Einstellungs-Datei der Werkbank')); }
    if (d.bild !== undefined) { const f = t.files[0]; t.value = ''; if (!f) return; return void shrink(f).then(url => { if (!D.setImage(url)) throw new Error('Das Bild konnte nicht übernommen werden'); draw(true); }).catch(err => toast(err.message || 'Das Bild konnte nicht gelesen werden')); }
    if (d.vis) { const h = new Set(P().hidden); t.checked ? h.delete(d.vis) : h.add(d.vis); return change({ hidden: [...h] }); }
    if (d.grpname !== undefined) return renameGroup(d.grpname, t.value.trim());
    if (d.app) return change(setApp(d.app, d.f, t.value));
    if (d.link) { if (d.f === 'u') { const u = webAddress(t.value.trim()); if (!u) { toast('Diese Adresse geht nicht'); return draw(true); } return change(setLink(d.link, 'u', u)); }
      if (d.f === 'n' && !t.value.trim()) return draw(true); return change(setLink(d.link, d.f, t.value)); }
    if (d.group) return draw(true);
    if (t.type === 'checkbox' && d.k) return change({ [d.k]: t.checked });
    if (t.tagName === 'SELECT' && d.k) return change({ [d.k]: t.value });
    if (d.k && (t.type === 'color' || t.type === 'range')) draw(true);
  }

  function build() {
    dlg = document.createElement('dialog'); dlg.className = 'wb-set'; dlg.setAttribute('aria-label', 'Einstellungen');
    dlg.innerHTML = `<div class="set-head"><div class="row between"><div><h2>Einstellungen</h2><div class="faint" style="font-size:12px" data-who></div></div><span class="row" style="gap:6px"><button type="button" class="ghost sm" data-undo disabled>Rückgängig</button><button type="button" class="sm" data-close>Fertig</button></span></div>
      <input type="search" data-search placeholder="Einstellung suchen …" aria-label="Einstellung suchen" autocomplete="off">
      <div class="set-tabs" role="tablist">${TABS.map(([id, t]) => `<button type="button" role="tab" data-tab="${id}">${esc(t)}</button>`).join('')}</div></div><div class="set-body"></div>`;
    document.body.appendChild(dlg);
    dlg.addEventListener('click', onClick); dlg.addEventListener('input', onInput); dlg.addEventListener('change', onChange);
    dlg.addEventListener('toggle', e => { const k = e.target.dataset?.open; if (k) e.target.open ? opened.add(k) : opened.delete(k); }, true);
    dlg.addEventListener('keydown', e => { if (e.key !== 'Enter') return; const n = e.target.dataset?.new; if (!n) return; e.preventDefault(); ACTIONS[n.startsWith('link') ? 'link' : n](); });
    // Vom Server geladene Einstellungen nachziehen, falls das Fenster schon offen ist
    document.addEventListener('wb-theme', () => { if (dlg.open && !dlg.contains(document.activeElement)) draw(true); });
  }

  async function open(which) {
    user = await me();
    if (user.setup2fa || user.mustChange) return toast('Richte zuerst dein Konto fertig ein, dann geht es hier weiter');
    if (!dlg) build();
    if (which && PAGES[which]) tab = which;
    query = ''; $('[data-search]', dlg).value = '';
    try { if (!window.WBVorlagen) await loadScript('/assets/vorlagen.js'); D.needSkins(); D.needPixel(); } catch {}
    $('[data-who]', dlg).textContent = `Gilt nur für dein Konto (${user.shown})`;
    draw(); if (!dlg.open) dlg.showModal();
    $(`.set-tabs [data-tab="${tab}"]`, dlg).focus();
    if (user.cockpit) try { if (!WB.Cockpit) await loadScript('/assets/cockpit.js');
      await Store.flush(); ckCfg = WB.Cockpit.normalize(await api('/api/data/cockpit')); if (tab === 'cockpit' || query) draw(true); } catch { toast('Cockpit-Einstellungen nicht ladbar'); }
  }

  WB.Settings = { open };
})();
