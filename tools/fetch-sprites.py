# Fetches a mon's sprite pack and portrait from the PMD SpriteCollab repository (github.com/PMDCollab/SpriteCollab)
# into the folders the game reads: sprites/<id>/ for a playable species, evolutions/<id>/ for an evolved form, and
# portraits/<id>.png.   python3 tools/fetch-sprites.py <id>=<dex>[/<form>] ... [--form <id>=<dex>[/<form>] ...]
# (--boss in place of --form puts what follows in bosses/<id>/: mons that are fought, never played)
# e.g.  python3 tools/fetch-sprites.py munchlax=0446 --form snorlax=0143 alolanmarowak=0105/0001
# Needs the GitHub CLI (gh) for the file listings.
import sys, os, json, subprocess, concurrent.futures as cf
REPO = 'PMDCollab/SpriteCollab'
def listing(path):
    out = subprocess.run(['gh', 'api', f'repos/{REPO}/contents/{path}'], capture_output=True, text=True)
    if out.returncode: raise SystemExit(f'cannot list {path}: {out.stderr.strip()[:200]}')
    return [f for f in json.loads(out.stdout) if f['type'] == 'file']
def get(url, to):
    r = subprocess.run(['curl', '-sSL', '--fail', '--retry', '3', '-o', to, url], capture_output=True, text=True)
    return None if r.returncode == 0 else f'{to}: {r.stderr.strip()[:120]}'
jobs, form = [], False
for arg in sys.argv[1:]:
    if arg in ('--form', '--boss'): form = arg; continue
    mon, dex = arg.split('=')
    folder = os.path.join({'--form': 'evolutions', '--boss': 'bosses'}.get(form, 'sprites'), mon)
    os.makedirs(folder, exist_ok=True)
    files = listing(f'sprite/{dex}')
    jobs += [(f['download_url'], os.path.join(folder, f['name'])) for f in files]
    face = next((f for f in listing(f'portrait/{dex}') if f['name'] == 'Normal.png'), None)
    if face: jobs.append((face['download_url'], os.path.join('portraits', mon + '.png')))
    print(mon, len(files), 'files', sum(f['size'] for f in files) // 1024, 'KB', '+ portrait' if face else '(no portrait)')
with cf.ThreadPoolExecutor(8) as pool: errors = [e for e in pool.map(lambda j: get(*j), jobs) if e]
print(len(jobs) - len(errors), 'of', len(jobs), 'fetched'); [print(' ', e) for e in errors[:10]]
