"""Erzeugt public/assets/skins.css: selbst gezeichnete Hintergründe (SVG) und Verzierungen der Vorlagen.

Aufruf im Hauptordner: python3 werkzeug/skins.py
Die Farben der Vorlagen stehen in public/assets/design.js (SKINS), ihre Einstellungen in vorlagen.js.
"""
import math, random
from pathlib import Path
from urllib.parse import quote

OUT = Path(__file__).resolve().parent.parent / 'public' / 'assets' / 'skins.css'

def url(w, h, body, extra=''):
    s = f"<svg xmlns='http://www.w3.org/2000/svg' width='{w}' height='{h}' viewBox='0 0 {w} {h}'{extra}>{body}</svg>"
    return 'url("data:image/svg+xml,' + quote(s, safe="/:='<>() ,.-") + '")'

def rect(x, y, w, h, f, o=1):
    return f"<rect x='{x}' y='{y}' width='{w}' height='{h}' fill='{f}'" + (f" opacity='{o}'" if o != 1 else '') + '/>'
def circ(x, y, r, f, o=1, stroke=None, sw=0):
    st = f" stroke='{stroke}' stroke-width='{sw}'" if stroke else ''
    return f"<circle cx='{x}' cy='{y}' r='{r}' fill='{f}'{st}" + (f" opacity='{o}'" if o != 1 else '') + '/>'
def path(d, f='none', o=1, stroke=None, sw=0):
    st = f" stroke='{stroke}' stroke-width='{sw}'" if stroke else ''
    return f"<path d='{d}' fill='{f}'{st}" + (f" opacity='{o}'" if o != 1 else '') + '/>'

def pixels(w, h, rows):
    """rows: Liste von (x, y, farbe). Gleiche Nachbarn je Zeile werden zusammengefasst."""
    grid = {(x, y): c for x, y, c in rows}
    out = []
    for y in range(h):
        x = 0
        while x < w:
            c = grid.get((x, y))
            n = 1
            while x + n < w and grid.get((x + n, y)) == c:
                n += 1
            if c:
                out.append(rect(x, y, n, 1, c))
            x += n
    return url(w, h, ''.join(out), " shape-rendering='crispEdges'")

def noise(colors, seed, w=16, h=16):
    r = random.Random(seed)
    return pixels(w, h, [(x, y, r.choice(colors)) for y in range(h) for x in range(w)])

def sprite(art, colors):
    rows = art.split('|')
    return pixels(len(rows[0]), len(rows), [(x, y, colors[c]) for y, row in enumerate(rows) for x, c in enumerate(row) if c in colors])

def ground(top, body, seed, w=16, h=20, cover=4):
    r = random.Random(seed); cells = []
    for x in range(w):
        depth = cover + r.choice([0, 0, 1, 2])
        for y in range(h):
            cells.append((x, y, r.choice(top if y < depth else body)))
    return pixels(w, h, cells)

def scatter(w, h, n, seed, draw):
    r = random.Random(seed)
    return url(w, h, ''.join(draw(r, r.uniform(0, w), r.uniform(0, h), i) for i in range(n)))

def stars(w, h, n, seed, colors=('#ffffff',), big=1.4):
    return scatter(w, h, n, seed, lambda r, x, y, i: circ(round(x, 1), round(y, 1), round(r.uniform(.4, big), 1), r.choice(colors), round(r.uniform(.25, .9), 2)))

def L(img, repeat='repeat', pos='0 0', size='auto'):
    return (img, repeat, pos, size)
def grad(css):
    return (css, 'no-repeat', '0 0', '100% 100%')
def lines(color, step, deg):
    return L(f'repeating-linear-gradient({deg}deg, {color} 0 1px, transparent 1px {step}px)')
def glow(x, y, rx, ry, color):
    return grad(f'radial-gradient({rx}px {ry}px at {x} {y}, {color}, transparent 70%)')

# ---------------- Verzierungen ----------------
SURF = ':is(.panel, .card, .tile)'
BTN = ':is(button:not(.ghost, .chip, .switch, [data-k]), .btn:not(.ghost))'
HEAD = ':is(.top, .topbar)'
def bevel(hi, lo, edge, inner=3):
    return {SURF: f'border-color: {edge}; box-shadow: inset {inner}px {inner}px 0 {hi}, inset -{inner}px -{inner}px 0 {lo};',
            BTN: f'border-color: {edge}; box-shadow: inset 2px 2px 0 {hi}, inset -2px -2px 0 {lo};',
            f'{BTN}:active': f'box-shadow: inset -2px -2px 0 {hi}, inset 2px 2px 0 {lo};',
            ':is(input, select, textarea)': f'border-color: {edge}; box-shadow: inset 2px 2px 0 {lo};'}
def frame(color, dim):
    return {SURF: f'border-color: {color}; box-shadow: inset 0 0 0 3px var(--bg2), inset 0 0 0 4px {dim}, 0 10px 26px -18px #000;',
            BTN: f'border-color: {dim};', '.sec-h h2': 'letter-spacing: .06em;', HEAD: f'border-bottom: 1px solid {color};'}
def thick(ink, offset=5):
    return {SURF: f'border: 3px solid {ink}; box-shadow: {offset}px {offset}px 0 {ink};',
            BTN: f'border: 2px solid {ink}; box-shadow: 2px 2px 0 {ink};', f'{BTN}:active': 'box-shadow: none; transform: translate(2px, 2px);',
            '.tile .ico': f'border: 2px solid {ink};', ':is(input, select, textarea)': f'border: 2px solid {ink};', HEAD: f'border-bottom: 3px solid {ink};'}
def cut(c=14):
    shape = f'polygon(0 0, calc(100% - {c}px) 0, 100% {c}px, 100% 100%, {c}px 100%, 0 calc(100% - {c}px))'
    return {SURF: f'clip-path: {shape};', ':is(button.primary, .btn.primary)': f'clip-path: polygon(0 0, 100% 0, 100% 62%, calc(100% - 9px) 100%, 0 100%);',
            f'{SURF}:focus-visible': 'clip-path: none;'}
def crt(color, strength=.22):
    return {'body::after': f"content: ''; position: fixed; inset: 0; pointer-events: none; z-index: 2147483646; background: repeating-linear-gradient(0deg, rgba(0,0,0,{strength}) 0 1px, transparent 1px 3px);",
            ':is(h1, h2, h3, .clock)': f'text-shadow: 0 0 8px {color};', SURF: f'box-shadow: 0 0 0 1px {color}33, inset 0 0 28px -14px {color};'}
def neon(a, b):
    return {SURF: f'border-color: {a}; box-shadow: 0 0 12px -3px {a}, inset 0 0 18px -12px {a};', ':is(h1, .clock)': f'text-shadow: 0 0 6px {b}, 0 0 20px {b};', '.sec-h h2': f'text-shadow: 0 0 10px {b};', HEAD: f'border-bottom: 1px solid {a}; box-shadow: 0 0 18px -6px {a};'}
def header(bg, img=None, extra=''):
    b = f'{img}, {bg}' if img else bg
    return {HEAD: f'background: {b}; {extra}'}
def shadowtext(c):
    return {':is(h1, h2, h3, .clock, .sec-h span, .foot, .page-head p)': f'text-shadow: 2px 2px 0 {c};'}

SKINS = {}
def skin(key, layers, *rules, tiles=None):
    merged = {}
    for r in rules:
        for sel, decl in r.items():
            merged[sel] = (merged.get(sel, '') + ' ' + decl).strip()
    if tiles:
        merged['.tile'] = (merged.get('.tile', '') + ' ' + tiles).strip()
    SKINS[key] = (layers, merged)

# ================= Spiele =================
# Klötzchenwelt: Erde, Gras, Stein, Bretter
dirt = noise(['#2f2219', '#35261c', '#3b2b20', '#281d15', '#33251b'], 11)
stone = noise(['#3b3b3b', '#404040', '#373737', '#434343'], 12)
planks = pixels(16, 16, [(x, y, '#3a2c19' if y % 4 == 3 or (x == (y // 4 * 5 + 3) % 16) else random.Random(y // 4 * 31 + x // 3).choice(['#55401f', '#5c4623', '#503b1d'])) for y in range(16) for x in range(16)])
skin('minecraft', [L(ground(['#3f6b24', '#467628', '#385f20'], ['#4a3423', '#533b28', '#412e1f'], 3, h=11, cover=3), 'repeat-x', 'left bottom', '64px 44px'), L(dirt, size='64px 64px')],
     bevel('rgba(255,255,255,.22)', 'rgba(0,0,0,.45)', '#000000'), shadowtext('rgba(0,0,0,.65)'),
     header('#4a381d', planks, 'background-size: 48px 48px; border-bottom: 3px solid #000;'),
     {':is(button:not(.ghost, .chip, .switch, .primary, [data-k]), .btn:not(.ghost, .primary))': f'background-image: {stone}; background-size: 48px 48px; image-rendering: pixelated;', '.tile .ico': 'box-shadow: inset 2px 2px 0 rgba(0,0,0,.4), inset -2px -2px 0 rgba(255,255,255,.18); border-color: transparent; background: rgba(0,0,0,.28);'},
     tiles=f'background: linear-gradient(rgba(20,20,20,.35), rgba(20,20,20,.35)), {stone}; background-size: auto, 64px 64px;')

nether = noise(['#3a1212', '#451616', '#2f0e0e', '#4d1a19', '#38100f'], 21)
lava = ground(['#c2540d', '#e07a14', '#a8420a', '#f29a22'], ['#a8420a', '#8c3207', '#c2540d'], 7, h=7, cover=3)
skin('nether', [L(lava, 'repeat-x', 'left bottom', '64px 28px'), glow('50%', '110%', 900, 420, 'rgba(255,110,20,.28)'), L(nether, size='64px 64px')],
     bevel('rgba(255,170,120,.2)', 'rgba(0,0,0,.55)', '#120404'), shadowtext('rgba(0,0,0,.7)'), header('#220909', None, 'border-bottom: 3px solid #000;'))

endstone = noise(['#b9b678', '#c7c486', '#a9a66c', '#d2cf93'], 31)
skin('ende', [L(endstone, 'repeat-x', 'left bottom', '64px 22px'), L(stars(420, 420, 60, 32, ('#c77dff', '#7ef0d4', '#ffffff'))), glow('80%', '10%', 700, 480, 'rgba(120,40,170,.35)'), grad('linear-gradient(#07040d, #100a1c)')],
     bevel('rgba(199,125,255,.28)', 'rgba(0,0,0,.6)', '#000000'), shadowtext('rgba(40,0,60,.8)'), header('#0d0816', None, 'border-bottom: 3px solid #000;'),
     tiles=f'background: linear-gradient(rgba(14,8,24,.72), rgba(14,8,24,.72)), {noise(["#241238", "#2d1745", "#1b0d2b"], 33)}; background-size: auto, 64px 64px;')

# Hüpfspiel: Himmel, Wolken, Hügel, Ziegel
cloud = sprite('......wwww..........|....wwwwwwww..ww....|..wwwwwwwwwwwwwwww..|.wwwwwwwwwwwwwwwwww.|wwwwwwwwwwwwwwwwwwww|wwsswwwwwsswwwwsswww|.ssssssssssssssssss.', {'w': '#ffffff', 's': '#cfe6ff'})
brick = pixels(16, 16, [(x, y, '#5a2208' if y % 8 == 7 or x == (0 if y // 8 == 0 else 8) else '#b8561f' if y % 8 else '#d9803c') for y in range(16) for x in range(16)])
hills = url(600, 150, path('M0 150 Q90 20 180 150 Z', '#4aa52e') + path('M150 150 Q300 -10 450 150 Z', '#5cbf3a') + path('M420 150 Q520 60 600 150 Z', '#4aa52e') + circ(285, 80, 6, '#1d4d12') + circ(315, 80, 6, '#1d4d12'))
skin('mario', [L(brick, 'repeat-x', 'left bottom', '32px 32px'), L(hills, 'repeat-x', 'left calc(100% - 32px)', '600px 150px'), L(cloud, 'no-repeat', '98% 24%', '150px 52px'), L(cloud, 'no-repeat', '2% 66%', '130px 45px'), L(cloud, 'no-repeat', '58% 80%', '100px 35px'), grad('linear-gradient(#7cc0ff, #b9e0ff)')],
     thick('#1a1a1a', 4), header('#c8201e', None, 'border-bottom: 4px solid #1a1a1a;'),
     {HEAD + ' :is(.brand, .crumb, .crumb *, .btn.ghost, button.ghost, .clock, .chip)': 'color: #fff;', HEAD + ' .chip': 'background: rgba(0,0,0,.18); border-color: rgba(255,255,255,.55);', '.tile .ico': 'background: #ffc928; color: #6a3500;'})

triforce = url(120, 104, path('M60 20 L74 44 H46 Z M46 44 L60 68 H32 Z M74 44 L88 68 H60 Z', '#e8c55a', .09))
leaf = url(160, 160, ''.join(path(f'M{x} {y} q14 -18 28 0 q-14 18 -28 0 Z', '#3d7a45', .22) for x, y in [(8, 30), (92, 12), (56, 96), (118, 130), (16, 134)]))
skin('zelda', [L(triforce, size='120px 104px'), L(leaf), glow('50%', '-5%', 900, 520, 'rgba(232,197,90,.22)'), grad('linear-gradient(160deg, #10291c, #071510)')],
     frame('#c9a54a', '#7a6430'), header('#0c1f15'), {':is(h1, .sec-h h2)': 'color: #f1d98a;'})

pokeball = url(180, 180, circ(60, 60, 34, 'none', .13, '#7a2a2a', 6) + path('M26 60 H94', stroke='#7a2a2a', sw=6, o=.13) + circ(60, 60, 10, '#fbf5ea', 1, '#c9a9a0', 5) + circ(140, 140, 16, 'none', .1, '#2a4a7a', 4) + path('M124 140 H156', stroke='#2a4a7a', sw=4, o=.1))
skin('pokemon', [L(pokeball), grad('linear-gradient(#fdf6e8, #f6ead2)')],
     thick('#22252b', 4), header('#d8343a', None, 'border-bottom: 6px solid #22252b; box-shadow: 0 3px 0 #fff;'),
     {HEAD + ' :is(.brand, .crumb, .crumb *, .btn.ghost, button.ghost, .clock, .chip)': 'color: #fff;', HEAD + ' .chip': 'background: rgba(0,0,0,.18); border-color: rgba(255,255,255,.55);', '.tile .ico': 'border-radius: 50%;'})

def tetro(x, y, cells, c):
    return ''.join(rect(x + cx * 20 + 1, y + cy * 20 + 1, 18, 18, c, .16) + rect(x + cx * 20 + 1, y + cy * 20 + 1, 18, 4, '#ffffff', .07) for cx, cy in cells)
tet = url(320, 400, tetro(20, 20, [(0, 0), (1, 0), (2, 0), (3, 0)], '#35d0ff') + tetro(200, 80, [(0, 0), (0, 1), (1, 1), (2, 1)], '#4a6bff') + tetro(60, 160, [(0, 0), (1, 0), (0, 1), (1, 1)], '#ffd93b') + tetro(240, 220, [(1, 0), (0, 1), (1, 1), (2, 1)], '#c25cff') + tetro(20, 300, [(1, 0), (2, 0), (0, 1), (1, 1)], '#46e06a') + tetro(160, 320, [(0, 0), (1, 0), (1, 1), (2, 1)], '#ff5470'))
skin('tetris', [L(tet), lines('rgba(120,140,220,.09)', 20, 0), lines('rgba(120,140,220,.09)', 20, 90), grad('linear-gradient(#0a0c1e, #05060f)')],
     {SURF: 'border-color: var(--g, var(--acc)); box-shadow: inset 4px 4px 0 rgba(255,255,255,.10), inset -4px -4px 0 rgba(0,0,0,.38);', BTN: 'box-shadow: inset 3px 3px 0 rgba(255,255,255,.14), inset -3px -3px 0 rgba(0,0,0,.4);'}, header('#07081a'))

maze = url(160, 160, ''.join(path(d, stroke='#2138d6', sw=3, o=.28) for d in ['M10 10 H70 V30 H30 V70 H10 Z', 'M90 10 H150 V70 H130 V30 H90 Z', 'M10 90 H30 V130 H70 V150 H10 Z', 'M90 130 H130 V90 H150 V150 H90 Z', 'M55 55 H105 V105 H55 Z']) + ''.join(circ(x, 80, 2.5, '#ffd9a0', .35) for x in range(10, 160, 20)) + ''.join(circ(80, y, 2.5, '#ffd9a0', .35) for y in (20, 40, 120, 140)))
skin('pacman', [L(maze), grad('linear-gradient(#000000, #000000)')],
     neon('#2b45ff', '#2b45ff'), header('#000', None, 'border-bottom: 3px double #2b45ff;'), {':is(h1, .clock)': 'color: #ffe14d;'})

dot = url(4, 4, rect(0, 0, 1, 4, '#0f380f', .10) + rect(0, 0, 4, 1, '#0f380f', .10))
skin('gameboy', [L(dot, size='4px 4px'), grad('linear-gradient(#9bbc0f, #8fb00e)')],
     {SURF: 'border: 3px solid #0f380f; box-shadow: inset 0 0 0 3px #8bac0f, inset 0 0 0 5px #306230;', BTN: 'border: 2px solid #0f380f;', HEAD: 'background: #8bac0f; border-bottom: 4px solid #0f380f;',
      '.tile .ico': 'background: #8bac0f; border: 2px solid #0f380f; color: #0f380f;'})

skin('fallout', [glow('50%', '40%', 1100, 800, 'rgba(60,255,130,.10)'), grad('radial-gradient(ellipse at center, #04180b 0%, #010703 80%)')],
     crt('#39ff7a', .3), header('#021006', None, 'border-bottom: 2px solid #39ff7a;'), {'body': 'text-shadow: 0 0 5px rgba(57,255,122,.45);', ':is(button, .btn, input, select)': 'border-color: #1d8a45;'})

stripes = 'repeating-linear-gradient(135deg, #fcee0a 0 10px, #0b0b12 10px 20px)'
skin('cyberpunk', [L(f'linear-gradient(135deg, rgba(252,238,10,.9) 0 70px, transparent 70px)', 'no-repeat', '0 0', '100% 100%'), lines('rgba(0,240,255,.07)', 36, 0), lines('rgba(0,240,255,.05)', 36, 90), glow('100%', '100%', 800, 520, 'rgba(255,0,110,.22)'), grad('linear-gradient(150deg, #12101c, #07070c)')],
     cut(16), {SURF: 'border-color: rgba(0,240,255,.45); border-left: 4px solid #fcee0a;', HEAD: f'border-bottom: 4px solid transparent; border-image: {stripes} 1;',
               ':is(h1, .clock)': 'text-shadow: 2px 0 0 rgba(255,0,110,.75), -2px 0 0 rgba(0,240,255,.75);', ':is(button.primary, .btn.primary)': 'text-transform: uppercase; letter-spacing: .08em;'})

def palm(x, h, s=1):
    return (f"<g transform='translate({x} {200 - h}) scale({s})'>" + path(f'M0 {h} Q8 {h / 2} 2 6', stroke='#16041f', sw=7)
            + ''.join(path(d, '#16041f') for d in ['M2 8 Q-30 -14 -58 12 Q-28 0 2 14 Z', 'M2 8 Q34 -16 62 10 Q30 0 2 14 Z', 'M2 8 Q-18 -34 -44 -28 Q-16 -18 0 12 Z', 'M2 8 Q22 -34 48 -30 Q18 -16 4 12 Z', 'M2 8 Q-4 -30 8 -44 Q14 -20 6 10 Z']) + '</g>')
palms = url(700, 200, palm(80, 150) + palm(130, 100, .7) + palm(560, 170) + path('M0 200 V188 Q180 172 350 190 T700 186 V200 Z', '#16041f'))
skin('gta', [L(palms, 'repeat-x', 'left bottom', '700px 200px'), glow('50%', '96%', 620, 340, 'rgba(255,190,90,.55)'), grad('linear-gradient(#160a33 0%, #3d1259 38%, #8d1f6b 68%, #d9496a 88%, #f08a57 100%)')],
     {SURF: 'background-color: rgba(24,8,44,.82); border-color: rgba(255,79,163,.5); box-shadow: 0 12px 30px -18px #000;', ':is(h1, .sec-h h2)': 'font-style: italic; text-shadow: 3px 3px 0 rgba(255,79,163,.55);'}, header('rgba(22,10,51,.9)', None, 'border-bottom: 2px solid #ff4fa3;'),
     tiles='background: rgba(24,8,44,.82);')

tilesbg = url(80, 80, rect(0, 0, 80, 80, 'none') + path('M0 .5 H80 M.5 0 V80', stroke='#9aa6b2', sw=1.5, o=.35))
skin('portal', [glow('-2%', '55%', 180, 420, 'rgba(0,140,255,.42)'), glow('102%', '45%', 180, 420, 'rgba(255,140,0,.42)'), L(tilesbg, size='80px 80px'), grad('linear-gradient(#f2f5f7, #dfe5ea)')],
     {SURF: 'box-shadow: 0 8px 22px -16px rgba(20,40,60,.55);', '.tile:hover': 'border-color: #ff8a00;', HEAD: 'border-bottom: 3px solid; border-image: linear-gradient(90deg, #008cff 50%, #ff8a00 50%) 1;', '.tile .ico': 'border-radius: 50%;'})

shards = url(900, 600, path('M0 0 H190 L0 250 Z', '#ff4655', .16) + path('M900 600 H640 L900 280 Z', '#ff4655', .2) + path('M760 0 L790 0 L560 330 L545 330 Z', '#ece8e1', .06) + path('M120 600 L135 600 L330 330 L322 330 Z', '#ff4655', .22))
skin('valorant', [L(shards, 'no-repeat', 'center', 'cover'), grad('linear-gradient(120deg, #111c27, #0a1118)')],
     cut(18), {SURF: 'border-color: rgba(236,232,225,.14); border-top: 2px solid #ff4655;', ':is(button.primary, .btn.primary)': 'text-transform: uppercase; letter-spacing: .12em;', HEAD: 'border-bottom: 1px solid #ff4655;'})

hexa = url(56, 97, path('M28 1 L54 16 V48 L28 64 L2 48 V16 Z M28 64 V96 M2 48 L-26 64 M54 48 L82 64', stroke='#c8aa6e', sw=1, o=.11))
skin('lol', [L(hexa, size='56px 97px'), glow('50%', '0%', 900, 460, 'rgba(10,200,185,.18)'), grad('linear-gradient(#06182a, #010a13)')],
     frame('#c8aa6e', '#6b5a32'), header('#010a13'), {':is(h1, .sec-h h2)': 'color: #f0e6d2;', ':is(button.primary, .btn.primary)': 'text-transform: uppercase; letter-spacing: .1em;'})

embers = scatter(500, 500, 40, 41, lambda r, x, y, i: circ(round(x), round(y), round(r.uniform(.6, 2.2), 1), r.choice(['#ffb347', '#ff8a2a', '#ffd98a']), round(r.uniform(.2, .75), 2)))
ring = url(900, 900, circ(450, 450, 300, 'none', .13, '#e6c877', 3) + circ(450, 360, 190, 'none', .09, '#e6c877', 2) + circ(450, 540, 190, 'none', .09, '#e6c877', 2) + path('M450 60 V840', stroke='#e6c877', sw=2, o=.1))
skin('eldenring', [L(embers), L(ring, 'no-repeat', 'center top', '900px 900px'), glow('50%', '100%', 900, 380, 'rgba(180,110,20,.25)'), grad('linear-gradient(#0d0b08, #050403)')],
     frame('#8c7440', '#463a20'), header('#080604'), {':is(h1, .sec-h h2)': 'color: #e6cf8f; font-weight: 400;', SURF: 'background-color: rgba(18,15,10,.9);'})

fence = url(64, 48, rect(0, 14, 64, 6, '#8a5a2b') + rect(0, 30, 64, 6, '#8a5a2b') + path('M8 48 V8 L16 0 L24 8 V48 Z', '#a8723a') + path('M40 48 V8 L48 0 L56 8 V48 Z', '#a8723a'))
flowers = scatter(300, 300, 26, 51, lambda r, x, y, i: circ(round(x), round(y), 3, r.choice(['#ffffff', '#ff8fb1', '#ffd23f', '#b48cff']), .8) + circ(round(x), round(y), 1, '#7a4a00', .8))
skin('stardew', [L(fence, 'repeat-x', 'left bottom', '64px 48px'), L(flowers), grad('linear-gradient(#a9dcf5 0%, #cdeaa8 55%, #a8d672 100%)')],
     bevel('#ffe9bd', '#b0773a', '#5c3312'), header('#b9783c', None, 'border-bottom: 4px solid #5c3312;'),
     {HEAD + ' :is(.brand, .crumb, .crumb *, .btn.ghost, button.ghost, .clock, .chip)': 'color: #fff6e0;', HEAD + ' .chip': 'background: rgba(0,0,0,.18); border-color: rgba(255,255,255,.55);'})

def bean(x, y, c, s=1, o=.3):
    return (f"<g transform='translate({x} {y}) scale({s})' opacity='{o}'>" + path('M8 12 Q8 0 22 0 Q36 0 36 14 V42 Q36 48 30 48 H27 Q24 48 24 44 V38 H18 V44 Q18 48 14 48 H12 Q8 48 8 42 Z', c)
            + rect(0, 14, 9, 22, c) + path('M18 8 Q18 5 24 5 H34 Q40 5 40 12 Q40 19 34 19 H24 Q18 19 18 14 Z', '#a8e4f2') + '</g>')
crew = url(640, 520, bean(60, 90, '#ff3b3b') + bean(470, 40, '#2b6cff', .8) + bean(330, 300, '#22c55e', .65) + bean(560, 380, '#ffd23f', .9) + bean(120, 420, '#ff77c8', .55))
skin('amongus', [L(crew), L(stars(380, 380, 55, 61)), grad('linear-gradient(#0b0e1c, #05060d)')],
     thick('#e8ecf5', 4), header('#12162a'))

skin('fortnite', [L('repeating-linear-gradient(115deg, rgba(255,255,255,.055) 0 34px, transparent 34px 90px)'), glow('15%', '0%', 800, 520, 'rgba(0,200,255,.45)'), glow('90%', '90%', 800, 600, 'rgba(255,60,200,.35)'), grad('linear-gradient(140deg, #2a1a7a, #1a0f4d 50%, #3b0f66)')],
     {SURF: 'border-color: rgba(255,255,255,.22); border-bottom: 4px solid #ffe033; box-shadow: 0 14px 28px -18px #000;', ':is(h1, .sec-h h2, .clock)': 'font-style: italic; text-shadow: 3px 3px 0 #12082e;',
      ':is(button.primary, .btn.primary)': 'text-transform: uppercase; font-style: italic; box-shadow: 0 4px 0 #a88f00;'}, header('rgba(20,10,64,.92)'))

crosshair = url(140, 140, circ(70, 70, 16, 'none', .1, '#f0a020', 1.5) + path('M70 42 V60 M70 80 V98 M42 70 H60 M80 70 H98', stroke='#f0a020', sw=1.5, o=.14))
skin('counterstrike', [L('linear-gradient(115deg, transparent 0 62%, rgba(240,160,32,.09) 62% 70%, transparent 70%)', 'no-repeat', '0 0', '100% 100%'), L(crosshair, size='140px 140px'), grad('linear-gradient(160deg, #23251c, #12130f)')],
     cut(10), {SURF: 'border-left: 4px solid #f0a020;', ':is(button.primary, .btn.primary)': 'text-transform: uppercase; letter-spacing: .1em;', HEAD: 'border-bottom: 2px solid #f0a020;'})

fern = url(260, 220, ''.join(path(f'M{x} 220 Q{x + dx / 2} {220 - h * .8} {x + dx} {220 - h} Q{x + dx * .2} {220 - h * .5} {x} 220 Z', c, .5) for x, dx, h, c in [(20, -18, 130, '#14452f'), (30, 40, 170, '#0f3525'), (60, 30, 90, '#1b5a3b'), (200, -50, 150, '#14452f'), (230, 25, 110, '#0f3525'), (190, 10, 70, '#1b5a3b')]))
skin('ark', [L(fern, 'repeat-x', 'left bottom', '260px 220px'), L(hexa, size='56px 97px'), glow('85%', '5%', 800, 460, 'rgba(0,220,200,.2)'), grad('linear-gradient(#0a1f22, #061012)')],
     cut(12), {SURF: 'border-color: rgba(0,220,200,.35); box-shadow: inset 0 0 24px -16px #00dcc8;', ':is(h1, .clock)': 'text-shadow: 0 0 14px rgba(0,220,200,.6);'}, header('#07181a', None, 'border-bottom: 2px solid #ff8c1a;'))

# ================= Welten =================
skin('weltraum', [L(stars(520, 520, 110, 71, ('#ffffff', '#bcd4ff', '#ffe6c2'), 1.6)), L(stars(260, 260, 40, 72, ('#ffffff',), .8)), glow('18%', '20%', 620, 420, 'rgba(100,70,220,.34)'), glow('85%', '70%', 720, 480, 'rgba(20,130,190,.28)'), grad('linear-gradient(#070918, #02030a)')],
     {SURF: 'backdrop-filter: blur(6px);', ':is(h1, .clock)': 'text-shadow: 0 0 18px rgba(138,180,255,.55);'}, header('rgba(5,7,20,.85)'))

def rain(seed):
    r = random.Random(seed); out = []
    for col in range(0, 240, 16):
        y, n = r.randrange(0, 300), r.randrange(5, 16)
        for i in range(n):
            yy = (y + i * 15) % 300
            x0 = col + 4
            d = r.choice(['M0 0 h8 M4 0 v10', 'M0 0 v10 h8', 'M0 2 h8 M0 8 h8 M6 2 l-5 6', 'M1 0 l6 10 M7 0 l-6 10', 'M0 0 h8 v5 h-8 v5 h8', 'M4 0 v10 M0 5 h8'])
            out.append(f"<path transform='translate({x0} {yy})' d='{d}' fill='none' stroke='{'#c8ffd8' if i == n - 1 else '#00c24e'}' stroke-width='1.3' opacity='{round(.05 + .3 * (i + 1) / n, 2)}'/>")
    return url(240, 300, ''.join(out))
skin('matrix', [L(rain(81)), grad('linear-gradient(#000000, #010a03)')],
     crt('#00ff66', .2), header('#000', None, 'border-bottom: 1px solid #00ff66;'), {SURF: 'background-color: rgba(0,16,5,.88);'})

def grid3d():
    out = [circ(450, 150, 105, 'url(#s)')]
    out = ["<defs><linearGradient id='s' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#ffe15a'/><stop offset='1' stop-color='#ff2b8a'/></linearGradient></defs>"] + out
    for i, y in enumerate(range(150, 256, 12)):
        out.append(rect(330, y + 4, 240, 2 + i * .8, '#2a0d4f'))
    out.append(rect(0, 200, 900, 160, '#14052b'))
    for y in (201, 208, 218, 232, 252, 280, 318, 358):
        out.append(path(f'M0 {y} H900', stroke='#ff2bd6', sw=1.4, o=.6))
    for x in range(-900, 1801, 120):
        out.append(path(f'M450 150 L{x} 360' if False else f'M{450 + (x - 450) * .24} 200 L{x} 360', stroke='#ff2bd6', sw=1.4, o=.5))
    return url(900, 360, ''.join(out))
skin('synthwave', [L(grid3d(), 'no-repeat', 'center bottom', 'max(100%, 900px) auto'), L(stars(500, 300, 35, 91), 'repeat-x'), grad('linear-gradient(#0d0524 0%, #2a0d4f 70%, #14052b 100%)')],
     neon('#ff2bd6', '#22e3ff'), header('rgba(13,5,36,.92)', None, 'border-bottom: 2px solid #22e3ff;'), {SURF: 'background-color: rgba(22,8,52,.84);'}, tiles='background: rgba(22,8,52,.84);')

bubbles = scatter(420, 520, 26, 101, lambda r, x, y, i: circ(round(x), round(y), round(r.uniform(3, 16)), 'none', round(r.uniform(.12, .35), 2), '#bdf6ff', 1.4))
rays = 'repeating-linear-gradient(105deg, rgba(180,240,255,.05) 0 60px, transparent 60px 190px)'
skin('tiefsee', [L(bubbles), L(rays), grad('linear-gradient(#0b5c7a 0%, #06324c 45%, #021524 100%)')],
     {SURF: 'background-color: rgba(4,32,48,.72); border-color: rgba(140,230,255,.25); backdrop-filter: blur(8px);'}, header('rgba(4,32,48,.88)'), tiles='background: rgba(4,32,48,.72);')

def petal(x, y, a, s):
    return f"<path transform='translate({x} {y}) rotate({a}) scale({s})' d='M0 0 C6 -10 18 -8 18 2 L13 1 L16 7 C10 14 0 10 0 0 Z' fill='#f28bb0' opacity='.42'/>"
petals = scatter(380, 380, 22, 111, lambda r, x, y, i: petal(round(x), round(y), r.randrange(360), round(r.uniform(.6, 1.3), 2)))
skin('kirschbluete', [L(petals), glow('10%', '0%', 620, 420, 'rgba(255,150,190,.4)'), grad('linear-gradient(#fff3f7, #fbe3ec)')],
     {SURF: 'box-shadow: 0 10px 26px -18px rgba(170,40,90,.6);'})

# ================= Jahreszeiten =================
def leafshape(x, y, a, s, c):
    return f"<path transform='translate({x} {y}) rotate({a}) scale({s})' d='M0 0 Q10 -16 26 -12 Q30 4 14 10 Q4 12 0 0 Z M0 0 L22 -4' fill='{c}' stroke='#3a1a05' stroke-width='.8' opacity='.34'/>"
autumn = scatter(460, 460, 24, 121, lambda r, x, y, i: leafshape(round(x), round(y), r.randrange(360), round(r.uniform(.7, 1.7), 2), r.choice(['#e8862e', '#c4451c', '#d9a520', '#8f5a1e'])))
skin('herbst', [L(autumn), glow('80%', '0%', 800, 480, 'rgba(232,134,46,.28)'), grad('linear-gradient(#221409, #130b05)')], {SURF: 'box-shadow: 0 12px 28px -18px #000;'})

def flake(x, y, s, o):
    return f"<g transform='translate({x} {y}) scale({s})' stroke='#5d9fd6' stroke-width='1.4' opacity='{o}' fill='none'>" + ''.join(path(f'M0 0 L{round(12 * math.cos(a))} {round(12 * math.sin(a))}') for a in [i * math.pi / 3 for i in range(6)]) + circ(0, 0, 3, 'none') + '</g>'
snowfall = scatter(420, 420, 20, 131, lambda r, x, y, i: flake(round(x), round(y), round(r.uniform(.45, 1.3), 2), round(r.uniform(.2, .5), 2)))
drift = url(600, 70, path('M0 70 V34 Q90 6 190 32 T400 28 T600 34 V70 Z', '#ffffff'))
skin('winter', [L(drift, 'repeat-x', 'left bottom', '600px 70px'), L(snowfall), grad('linear-gradient(#cfe6f8, #eaf5fd)')], {SURF: 'box-shadow: 0 6px 0 -2px #ffffff, 0 12px 26px -18px rgba(20,70,120,.7);', '.tile': 'border-top: 3px solid #ffffff;'})

def pumpkin(x, y, s):
    return (f"<g transform='translate({x} {y}) scale({s})' opacity='.55'>" + ''.join(f"<ellipse cx='{cx}' cy='30' rx='{rx}' ry='26' fill='{c}'/>" for cx, rx, c in [(18, 18, '#c85a08'), (52, 18, '#c85a08'), (35, 22, '#e8700f')])
            + rect(32, -2, 7, 10, '#3f6b24') + path('M18 22 L26 30 H10 Z M52 22 L60 30 H44 Z M14 40 L24 46 L30 42 L36 48 L42 42 L48 46 L58 40 L48 52 H24 Z', '#2a0f02') + '</g>')
def bat(x, y, s):
    return f"<path transform='translate({x} {y}) scale({s})' d='M0 8 Q10 -6 22 6 L26 0 L29 6 L32 0 L36 6 Q48 -6 58 8 Q46 6 42 16 Q36 10 29 18 Q22 10 16 16 Q12 6 0 8 Z' fill='#0a0310' opacity='.75'/>"
pumps = url(560, 90, pumpkin(30, 30, 1) + pumpkin(130, 46, .7) + pumpkin(390, 24, 1.1))
bats = url(600, 380, bat(60, 60, 1.3) + bat(360, 40, .8) + bat(470, 210, 1) + bat(180, 280, .7))
skin('halloween', [L(pumps, 'repeat-x', 'left bottom', '560px 90px'), L(bats), glow('82%', '12%', 200, 200, 'rgba(255,220,150,.38)'), glow('50%', '110%', 900, 420, 'rgba(255,110,10,.25)'), grad('linear-gradient(#1b0b2e, #0b0414)')],
     {SURF: 'border-color: rgba(255,122,26,.4); box-shadow: 0 0 22px -12px #ff7a1a;', ':is(h1, .clock)': 'text-shadow: 0 0 16px rgba(255,122,26,.7);'}, header('#120620', None, 'border-bottom: 2px solid #ff7a1a;'))

def lights():
    out = [path('M0 4 Q40 30 80 4 T160 4 T240 4 T320 4', stroke='#0c2a18', sw=2)]
    for i, (x, y) in enumerate([(20, 15), (40, 17), (60, 15), (100, 15), (120, 17), (140, 15), (180, 15), (200, 17), (220, 15), (260, 15), (280, 17), (300, 15)]):
        c = ['#ff4b4b', '#ffd23f', '#41d1ff', '#6dff7a'][i % 4]
        out.append(circ(x, y + 7, 9, c, .25) + rect(x - 2, y, 4, 4, '#0c2a18') + circ(x, y + 8, 4, c))
    return url(320, 40, ''.join(out))
snow2 = stars(400, 400, 60, 141, ('#ffffff',), 2.2)
skin('weihnachten', [L(lights(), 'repeat-x', 'left 58px', '320px 40px'), L(drift, 'repeat-x', 'left bottom', '600px 26px'), L(snow2), glow('50%', '0%', 900, 420, 'rgba(255,200,90,.16)'), grad('linear-gradient(#0e3322, #071a12)')],
     {SURF: 'border-color: rgba(255,210,100,.35); box-shadow: 0 12px 28px -18px #000;', ':is(h1, .sec-h h2)': 'color: #ffe3a1;'}, header('#8e1b1b', None, 'border-bottom: 3px solid #ffd269;'),
     {HEAD + ' :is(.brand, .crumb, .crumb *, .btn.ghost, button.ghost, .clock, .chip)': 'color: #fff3da;', HEAD + ' .chip': 'background: rgba(0,0,0,.18); border-color: rgba(255,255,255,.55);'})

# ================= Retro & Arbeit =================
skin('win95', [grad('linear-gradient(#008080, #008080)')],
     bevel('#ffffff', '#808080', '#000000', 2), header('#c0c0c0', None, 'border-bottom: 2px solid #000; box-shadow: inset 0 2px 0 #fff;'),
     {'.sec-h': 'background: linear-gradient(90deg, #000080, #1084d0); padding: 4px 10px; align-items: center; color: #fff;', '.sec-h h2': 'color: #fff; font-size: 15px;', '.sec-h span': 'color: #e8eeff;', '.sec-h::after': 'color: #fff;',
      ':is(input, select, textarea)': 'background: #fff; color: #000;', '.tile .ico': 'background: transparent; border-color: transparent;', '.page-head': 'background: #c0c0c0; padding: 14px 16px; box-shadow: inset 2px 2px 0 #fff, inset -2px -2px 0 #808080; border: 1px solid #000;', '.foot': 'color: #ffffff;'})

skin('blaupause', [lines('rgba(255,255,255,.16)', 100, 0), lines('rgba(255,255,255,.16)', 100, 90), lines('rgba(255,255,255,.07)', 20, 0), lines('rgba(255,255,255,.07)', 20, 90), grad('linear-gradient(135deg, #12508f, #0b3a6e)')],
     {SURF: 'border: 1px solid rgba(255,255,255,.75); box-shadow: 0 0 0 4px rgba(255,255,255,.07);', '.tile .ico': 'border: 1px dashed rgba(255,255,255,.7); background: transparent;', HEAD: 'border-bottom: 1px solid #fff;'}, header('#0b3a6e'))

dust = scatter(360, 360, 90, 151, lambda r, x, y, i: circ(round(x), round(y), round(r.uniform(.5, 2.6), 1), '#ffffff', round(r.uniform(.02, .09), 2)))
smear = url(700, 500, path('M40 120 Q220 60 380 130 T660 100', stroke='#ffffff', sw=60, o=.025) + path('M80 380 Q260 300 420 390 T640 360', stroke='#ffffff', sw=80, o=.02))
skin('kreide', [L(dust), L(smear), grad('linear-gradient(160deg, #244a3a, #17332a)')],
     {SURF: 'border: 2px dashed rgba(240,245,235,.55); box-shadow: none;', BTN: 'border: 2px dashed rgba(240,245,235,.55);', ':is(h1, .sec-h h2, .clock)': 'text-shadow: 1px 1px 0 rgba(255,255,255,.25), -1px 0 2px rgba(255,255,255,.2);',
      HEAD: 'background: #6b4a2b; border-bottom: 5px solid #8a6238;', '.tile .ico': 'border: 2px dashed currentColor; background: transparent;'})

halftone = url(14, 14, circ(7, 7, 2.2, '#d48a00', .22))
burst = 'repeating-conic-gradient(from 0deg at 50% -10%, rgba(255,170,0,.13) 0 6deg, transparent 6deg 15deg)'
skin('comic', [L(halftone, size='14px 14px'), grad(burst), grad('linear-gradient(#fff6c9, #ffe9a0)')],
     thick('#111111', 6), header('#fff', None, 'border-bottom: 4px solid #111;'), {'.tile': 'transform: rotate(-.35deg);', '.tile:nth-child(even)': 'transform: rotate(.35deg);', ':root[data-hover] .tile:hover': 'transform: rotate(0) scale(1.03);',
                                    '.sec-h h2': 'background: #111; color: #fff; padding: 2px 12px; transform: rotate(-1deg);'})

# Wo Bilder unter den Überschriften liegen, bekommen diese eine ruhige Unterlage
for key in ('minecraft', 'nether', 'ende', 'mario', 'tetris', 'pacman', 'gta', 'stardew', 'amongus', 'matrix', 'synthwave', 'tiefsee', 'kirschbluete', 'herbst', 'winter', 'halloween', 'weihnachten'):
    rules = SKINS[key][1]
    rules['.sec-h'] = rules.get('.sec-h', '') + ' width: fit-content; max-width: 100%; padding: 3px 12px; margin-left: -12px; border-radius: calc(var(--r) * .6); background: color-mix(in srgb, var(--bg) 82%, transparent);'

# ---------------- Ausgabe ----------------
css = ['/* Verzierungen und Hintergründe der Vorlagen. Alle Bilder sind selbst gezeichnete SVG. */',
       '/* Erzeugt mit werkzeug/skins.py. data-skin schaltet die Verzierungen, data-skinbg den Hintergrund einer Vorlage ein. */',
       ]
for key, (layers, rules) in SKINS.items():
    images = ', '.join(l[0] for l in layers)
    base = (f'background-image: {images}; background-repeat: {", ".join(l[1] for l in layers)}; '
            f'background-position: {", ".join(l[2] for l in layers)}; background-size: {", ".join(l[3] for l in layers)};')
    css.append(f'\n/* ---------- {key} ---------- */')
    # eine Zeile für Seite und Vorschaubild, damit jedes Bild nur einmal in der Datei steht
    css.append(f':root[data-skinbg="{key}"] body, .pv[data-pv="{key}"] {{ {base} }}')
    css.append(f':root[data-skinbg="{key}"] body {{ background-attachment: fixed; }}')
    for sel, decl in rules.items():
        if sel == 'body':
            css.append(f':root[data-skin="{key}"] body {{ {decl} }}')
        elif sel == 'body::after':
            css.append(f':root[data-skin="{key}"] body::after {{ {decl} }}')
        elif sel.startswith(':root'):
            css.append(f':root[data-skin="{key}"]{sel[5:]} {{ {decl} }}')
        else:
            css.append(f':root[data-skin="{key}"] {sel} {{ {decl} }}')
css.append('\n@media print { :root[data-skin] body::after { display: none; } :root[data-skinbg] body { background-image: none !important; } }')
open(OUT, 'w', encoding='utf-8').write('\n'.join(css) + '\n')
print(len(SKINS), 'Skins,', len('\n'.join(css)) // 1024, 'KB:', ' '.join(SKINS))
