# Cuts sprite sheets that have no tidy grid into frames the effect viewer can play (extra_VFX/<section>/<id>_<name>/<seq>/<tick>.png).
#   python3 tools/slice-sheets.py [section ...]      (no arguments: every sheet below)
# Three kinds of sheet:
#   cells  - frames sit in boxes on a separator colour (each row of boxes is one effect)
#   loose  - sprites lie loose on a plain background (each line of sprites is one effect; captions are thrown away)
#   strips - tile strips packed edge to edge, each with its own background colour (each strip is one effect)
# The cuts are guesses from the layout: good for browsing, not a faithful record of how the game animates them.
import sys, os, shutil, collections
import numpy as np
from PIL import Image

ART = 'Art/effect_sheets'
SHEETS = {
    'negima': dict(file='DS _ DSi - Negima!? Chou Mahora Taisen Chuu_ Check-in Zenin Shuugou! Yappari Onsen Kichaimashita (JPN) - Miscellaneous - Battle Effects.png', mode='cells', sep=(255, 0, 255), first=8001),
    'dbz': dict(file='Game Boy Advance - Dragon Ball Z_ Supersonic Warriors - Miscellaneous - Effects.png', mode='cells', sep=(255, 255, 255), first=7001),
    'sonic': dict(file='DS _ DSi - Sonic Rush - Effects - Blast Effect.png', mode='loose', first=6901, minh=16),
    'emerald': dict(file='Game Boy Advance - Pokemon Emerald - Miscellaneous - Move Effects.png', mode='strips', sep=(255, 255, 255), first=5001),
    'mana': dict(file='SNES - Trials of Mana (JPN) - Miscellaneous - Effects.png', mode='loose', first=6001),
    'som': dict(file='SNES - Secret of Mana - Miscellaneous - Death Effects.png', mode='cells', sep=(0, 96, 0), first=4001),
    # full-screen weather: every box of the sheet is one frame of a single animation
    'rain': dict(file='Game Boy Advance - Pokemon Mystery Dungeon_ Red Rescue Team - Weather - Rain.png', mode='cells', sep=(60, 60, 90), first=3001, join=True, out='weather'),
    # a folder of frames already cut apart
    'hail': dict(folder='Hail', mode='frames', first=3002, out='weather'),
}

def components(mask, diag=False):
    """Connected regions of a mask, as lists of (y, x0, x1) runs."""
    parent = []
    def find(i):
        while parent[i] != i: parent[i] = parent[parent[i]]; i = parent[i]
        return i
    prev, runs = [], []
    for y in range(mask.shape[0]):
        row = mask[y]
        if not row.any(): prev = []; continue
        d = np.diff(np.concatenate(([0], row.view(np.int8), [0])))
        cur = []
        for x0, x1 in zip(np.where(d == 1)[0], np.where(d == -1)[0]):
            i = len(parent); parent.append(i); runs.append((y, int(x0), int(x1))); cur.append((int(x0), int(x1), i))
            for p0, p1, j in prev:
                if p0 < x1 + diag and p1 > x0 - diag: parent[find(j)] = find(i)
        prev = cur
    out = collections.defaultdict(list)
    for i, r in enumerate(runs): out[find(i)].append(r)
    return list(out.values())

def box(runs):
    return min(r[1] for r in runs), min(r[0] for r in runs), max(r[2] for r in runs), max(r[0] for r in runs) + 1  # x0, y0, x1, y1

def merge(boxes, gap):
    """Join boxes that lie within `gap` pixels of one another; returns groups of indexes."""
    n = len(boxes); parent = list(range(n))
    def find(i):
        while parent[i] != i: parent[i] = parent[parent[i]]; i = parent[i]
        return i
    order = sorted(range(n), key=lambda i: boxes[i][0])
    for a in range(n):
        i = order[a]
        for b in range(a + 1, n):
            j = order[b]
            if boxes[j][0] > boxes[i][2] + gap: break
            if boxes[j][1] <= boxes[i][3] + gap and boxes[j][3] >= boxes[i][1] - gap: parent[find(i)] = find(j)
    groups = collections.defaultdict(list)
    for i in range(n): groups[find(i)].append(i)
    return list(groups.values())

def union(bs): return min(b[0] for b in bs), min(b[1] for b in bs), max(b[2] for b in bs), max(b[3] for b in bs)

def lines(boxes):
    """Boxes gathered into lines (those that overlap in height), each sorted left to right."""
    rows = []
    for b in sorted(boxes, key=lambda b: (b[1] + b[3]) / 2):
        for r in rows:
            top, bot = max(r['y0'], b[1]), min(r['y1'], b[3])
            if bot - top >= 0.5 * min(b[3] - b[1], r['y1'] - r['y0']): r['b'].append(b); r['y0'] = min(r['y0'], b[1]); r['y1'] = max(r['y1'], b[3]); break
        else: rows.append({'b': [b], 'y0': b[1], 'y1': b[3]})
    rows.sort(key=lambda r: r['y0'])
    return [sorted(r['b']) for r in rows]

def cut(a, b, bg):
    px = a[b[1]:b[3], b[0]:b[2]]
    alpha = np.where((px == np.array(bg)).all(2), 0, 255).astype(np.uint8)
    return Image.fromarray(np.dstack([px, alpha]), 'RGBA')

def corner_bg(a, b):
    cs = [tuple(a[y, x]) for x, y in ((b[0], b[1]), (b[2] - 1, b[1]), (b[0], b[3] - 1), (b[2] - 1, b[3] - 1))]
    return collections.Counter(cs).most_common(1)[0][0]

def write(out, section, first, effects, clear=True):
    """effects: [[sequence: [RGBA frame, ...], ...], ...]"""
    if clear: shutil.rmtree(out, ignore_errors=True)
    n = 0
    for seqs in effects:
        seqs = [[f for f in s if f.getbbox()] for s in seqs]
        for s in seqs:
            if s and 'dy' in s[0].info:
                top = min(f.info['dy'] for f in s)
                for f in s: f.info['dy'] -= top
        seqs = [s for s in seqs if s]
        if not seqs: continue
        folder = os.path.join(out, f'{first + n}_{section}_{n + 1:03d}'); n += 1
        for si, frames in enumerate(seqs):
            d = os.path.join(folder, f'{si:03d}'); os.makedirs(d)
            w, h = max(f.width for f in frames), max(f.info.get('dy', 0) + f.height for f in frames)
            for fi, f in enumerate(frames):
                # a frame cut from a line of loose sprites keeps the height it had in that line (f.info['dy']), so things standing on the same ground still do
                canvas = Image.new('RGBA', (w, h), (0, 0, 0, 0)); canvas.paste(f, ((w - f.width) // 2, f.info.get('dy', (h - f.height) // 2)))
                canvas.save(os.path.join(d, f'{fi * 3:03d}.png'))  # file numbers are ticks at 30 a second: three ticks a frame
    print(section, n, 'effects')

def cells(a, cfg):
    comps = [box(c) for c in components(~(a == np.array(cfg['sep'])).all(2))]
    comps = [b for b in comps if b[2] - b[0] >= 12 and b[3] - b[1] >= 12]
    # a box is a filled rectangle: nothing of the separator inside it
    comps = [b for b in comps if not (a[b[1]:b[3], b[0]:b[2]] == np.array(cfg['sep'])).all(2).mean() > 0.02]
    if cfg.get('join'):
        # one animation over the whole sheet: only the boxes of the usual size, read row by row
        size = collections.Counter((b[2] - b[0], b[3] - b[1]) for b in comps).most_common(1)[0][0]
        comps = [b for b in comps if (b[2] - b[0], b[3] - b[1]) == size]
        return [[[cut(a, b, corner_bg(a, b)) for row in lines(comps) for b in row]]]
    effects = []
    for row in lines(comps):
        # a line of boxes is one effect; where the boxes change size or background, a new sequence starts
        seqs, last = [], None
        for b in row:
            bg = corner_bg(a, b); key = (b[2] - b[0], b[3] - b[1], bg)
            if key != last: seqs.append([]); last = key
            seqs[-1].append(cut(a, b, bg))
        effects.append(seqs)
    return effects

def loose(a, cfg):
    bg = tuple(a[0, 0])
    comps = components(~(a == np.array(bg)).all(2), diag=True)
    boxes = [box(c) for c in comps]
    # captions: grey-white glyphs, small, in runs. A run of them is text and goes.
    def grey(c):
        px = np.concatenate([a[y, x0:x1] for y, x0, x1 in c]).astype(int)
        return (abs(px[:, 0] - px[:, 1]).max() <= 8) and (abs(px[:, 1] - px[:, 2]).max() <= 8)
    glyph = [i for i, c in enumerate(comps) if boxes[i][3] - boxes[i][1] <= 16 and grey(c)]
    drop = set()
    for g in merge([boxes[i] for i in glyph], 7):
        u = union([boxes[glyph[i]] for i in g])
        if len(g) >= 4 and u[2] - u[0] >= 30: drop.update(glyph[i] for i in g)
    # the brackets drawn round groups of sprites: long thin grey lines
    for i, c in enumerate(comps):
        b = boxes[i]; w, h = b[2] - b[0], b[3] - b[1]
        if max(w, h) >= 40 and sum(x1 - x0 for _, x0, x1 in c) <= 2.5 * (w + h) and grey(c): drop.add(i)
    keep = [boxes[i] for i in range(len(comps)) if i not in drop]
    sprites = [union([keep[i] for i in g]) for g in merge(keep, cfg.get('gap', 3))]
    sprites = [b for b in sprites if (b[2] - b[0]) * (b[3] - b[1]) >= 9 and b[3] - b[1] >= cfg.get('minh', 0)]
    def placed(b):
        im = cut(a, b, bg); im.info['dy'] = b[1]
        return im
    return [[[placed(b) for b in row]] for row in lines(sprites)]

def strips(a, cfg):
    sep = np.array(cfg['sep'])
    effects = []
    def mode(px): return collections.Counter(map(tuple, px.reshape(-1, 3))).most_common(1)[0][0]
    def split(b, depth=0):
        x0, y0, x1, y1 = b
        if x1 - x0 < 8 or y1 - y0 < 8: return
        # the background of each row and each column of this piece: where it changes for good, the piece is cut
        for axis in (0, 1):
            n = (y1 - y0) if axis == 0 else (x1 - x0)
            ms = [mode(a[y0 + i, x0:x1] if axis == 0 else a[y0:y1, x0 + i]) for i in range(n)]
            best = None
            for i in range(8, n - 7):
                before, after = collections.Counter(ms[max(0, i - 8):i]).most_common(1)[0], collections.Counter(ms[i:i + 8]).most_common(1)[0]
                if before[0] != after[0] and before[1] >= 7 and after[1] >= 7 and ms[i] == after[0] and ms[i - 1] == before[0]: best = i; break
            if best is not None and depth < 40:
                if axis == 0: split((x0, y0, x1, y0 + best), depth + 1); split((x0, y0 + best, x1, y1), depth + 1)
                else: split((x0, y0, x0 + best, y1), depth + 1); split((x0 + best, y0, x1, y1), depth + 1)
                return
        bg = mode(a[y0:y1, x0:x1])
        if bg == tuple(sep): return
        w, h = x1 - x0, y1 - y0
        if h > w and h % w == 0: frames = [(x0, y0 + i * w, x1, y0 + (i + 1) * w) for i in range(h // w)]
        elif w > h and w % h == 0: frames = [(x0 + i * h, y0, x0 + (i + 1) * h, y1) for i in range(w // h)]
        else: frames = [b]
        effects.append(((y0, x0), [[cut(a, f, bg) for f in frames]]))
    chunks = [box(c) for c in components(~(a == sep).all(2))]
    for b in sorted(chunks, key=lambda b: (b[0], b[1])):
        if b[1] < 40 and b[3] - b[1] < 14: continue  # the ripper's credit line
        split(b)
    return [e for _, e in sorted(effects, key=lambda e: e[0])]

def frames(cfg):
    d = os.path.join(ART, cfg['folder'])
    return [[[Image.open(os.path.join(d, f)).convert('RGBA') for f in sorted(os.listdir(d)) if f.endswith('.png')]]]

cleared = set()
for section in (sys.argv[1:] or SHEETS):
    cfg = SHEETS[section]
    out = os.path.join('extra_VFX', cfg.get('out', section))  # (sheets that share a folder each keep their own numbers)
    if cfg['mode'] == 'frames': effects = frames(cfg)
    else:
        a = np.array(Image.open(os.path.join(ART, cfg['file'])).convert('RGB'))
        effects = {'cells': cells, 'loose': loose, 'strips': strips}[cfg['mode']](a, cfg)
    if cfg.get('out'):
        for f in os.listdir(out) if os.path.isdir(out) else []:
            if f.startswith(str(cfg['first'])): shutil.rmtree(os.path.join(out, f))
    write(out, section, cfg['first'], effects, clear=not cfg.get('out'))
