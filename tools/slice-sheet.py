# Cuts a sprite sheet whose frames sit in a magenta grid into frames the effect viewer can play:
#   python3 tools/slice-sheet.py <sheet.png> <out dir> <name,name,...>   (one name per block of cells, top to bottom)
# Each block of touching cells becomes an effect folder (9001_name, ...), each row of it a sequence. Without names it only lists the blocks.
import sys, os, shutil, collections
import numpy as np
from PIL import Image
im = Image.open(sys.argv[1]).convert('RGB'); a = np.array(im); H, W = a.shape[:2]
cols = collections.Counter(map(tuple, a.reshape(-1, 3))); print(cols.most_common(6))
bg = a[0, 0]; 
grid = max((c for c in cols if c[0] > 150 and c[2] > 150 and c[1] < 80), key=lambda c: cols[c]); print('grid', grid, 'bg', tuple(bg))
g = (a == np.array(grid)).all(2)
# cells: maximal rectangles enclosed by grid lines. Find by scanning: a cell's top-left is a non-grid pixel with grid above and left.
cells = []
seen = np.zeros((H, W), bool)
for y in range(1, H - 1):
    for x in range(1, W - 1):
        if g[y, x] or seen[y, x] or not (g[y - 1, x] and g[y, x - 1]): continue
        x2 = x
        while x2 < W and not g[y, x2]: x2 += 1
        y2 = y
        while y2 < H and not g[y2, x]: y2 += 1
        if x2 >= W or y2 >= H: continue
        w, h = x2 - x, y2 - y
        if w < 6 or h < 6 or g[y:y2, x:x2].any(): continue
        if not (g[y2, x:x2].all() and g[y:y2, x2].all() and g[y - 1, x:x2].all() and g[y:y2, x - 1].all()): continue
        seen[y:y2, x:x2] = True
        cells.append((x, y, w, h))
print(len(cells), 'cells')
# rows: same y & h, touching in x (one grid line between)
cells.sort(key=lambda c: (c[1], c[0]))
rows = []
for c in cells:
    r = next((r for r in rows if r[-1][1] == c[1] and r[-1][3] == c[3] and 0 < c[0] - (r[-1][0] + r[-1][2]) <= 3), None)
    if r: r.append(c)
    else: rows.append([c])
# blocks: rows stacked directly under one another sharing x overlap
blocks = []
for r in rows:
    x0, x1, y0 = r[0][0], r[-1][0] + r[-1][2], r[0][1]
    b = next((b for b in blocks if 0 < y0 - b['y1'] <= 3 and x0 < b['x1'] and x1 > b['x0']), None)
    if b: b['rows'].append(r); b['y1'] = y0 + r[0][3]; b['x0'] = min(b['x0'], x0); b['x1'] = max(b['x1'], x1)
    else: blocks.append({'rows': [r], 'x0': x0, 'x1': x1, 'y0': y0, 'y1': y0 + r[0][3]})
for i, b in enumerate(blocks): print(i, b['x0'], b['y0'], [(len(r), r[0][2], r[0][3]) for r in b['rows']])
out = sys.argv[2]
names = sys.argv[3].split(',') if len(sys.argv) > 3 else []
if names:
    shutil.rmtree(out, ignore_errors=True)
    for i, b in enumerate(blocks):
        folder = os.path.join(out, f'{9001 + i}_{names[i]}')
        for si, r in enumerate(b['rows']):
            d = os.path.join(folder, f'{si:03d}'); os.makedirs(d)
            cw, ch = max(c[2] for c in r), max(c[3] for c in r)
            for fi, (x, y, w, h) in enumerate(r):
                px = a[y:y + h, x:x + w]
                rgba = np.dstack([px, np.where((px == bg).all(2), 0, 255).astype(np.uint8)])
                canvas = Image.new('RGBA', (cw, ch), (0, 0, 0, 0)); canvas.paste(Image.fromarray(rgba, 'RGBA'), ((cw - w) // 2, (ch - h) // 2))
                canvas.save(os.path.join(d, f'{fi * 3:03d}.png'))  # file numbers are ticks at 30 a second: three ticks a frame
