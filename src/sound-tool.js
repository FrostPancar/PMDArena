// Dev tool (sounds.html): play every sound in "Sound Effects", give each a name, a group and notes, export the list.
// On the published test client there is no dev server to list the sounds or keep the names: the list comes from a
// file made at build time, and the page is read only.
const $ = (id) => document.getElementById(id);
const READ_ONLY = !import.meta.env.DEV;
const { sounds, names: saved } = await (await fetch(READ_ONLY ? '/sounds.json' : '/api/sounds')).json();

// the groups offered as buttons (any other group already in the names file is added after them)
const GROUPS = ['hit', 'slash', 'whoosh', 'element', 'beam', 'explosion', 'status', 'ui', 'jingle', 'ambient', 'cry', 'other'];
for (const v of Object.values(saved)) if (v.group && !GROUPS.includes(v.group)) GROUPS.push(v.group);

for (const s of sounds) {
  // a file that came with a real name (beep.mp3, take_hit.mp3) starts out named after itself
  s.own = /^song\d+\.mp3$/.test(s.file) ? '' : s.file.replace(/\.mp3$/, '');
  s.name = saved[s.file]?.name ?? s.own;
  s.group = saved[s.file]?.group ?? '';
  s.notes = saved[s.file]?.notes ?? '';
  s.url = `/Sound Effects/${encodeURIComponent(s.file)}`;
}
const byFile = new Map(sounds.map((s) => [s.file, s]));
const named = (s) => !!s.name;

const state = { sel: null, filter: 'all', group: '', sort: 'file', q: '', auto: true, loop: false };

// ---- saving ----
let saveTimer = 0;
function save() {
  if (READ_ONLY) return;
  clearTimeout(saveTimer);
  $('saved').textContent = 'saving…';
  saveTimer = setTimeout(async () => {
    const out = {};
    for (const s of sounds) if ((s.name && s.name !== s.own) || s.group || s.notes) out[s.file] = { name: s.name, group: s.group, notes: s.notes };
    const r = await fetch('/api/sounds', { method: 'POST', body: JSON.stringify(out) });
    $('saved').textContent = r.ok ? `saved ${new Date().toLocaleTimeString()}` : 'save failed';
  }, 400);
}

const exportRows = () => sounds.map((s) => ({ file: s.file, name: s.name, group: s.group, notes: s.notes, seconds: s.seconds, roughGuess: s.guess ?? '', sameAs: s.twin ?? '' }));
function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}
$('exp-json').onclick = () => download('sound_names.json', JSON.stringify(exportRows(), null, 1), 'application/json');
$('exp-csv').onclick = () => {
  const q = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;
  const rows = exportRows().map((r) => [r.file, r.name, r.group, r.seconds, r.roughGuess, r.sameAs, r.notes].map(q).join(','));
  download('sound_names.csv', ['file,name,group,seconds,rough_guess,same_as,notes', ...rows].join('\n'), 'text/csv');
};

// ---- list ----
const SORTS = {
  file: () => 0, // the list arrives in file order
  len: (a, b) => (a.seconds ?? 0) - (b.seconds ?? 0),
  kind: (a, b) => (a.guess || a.name).replace(/^\d+_/, '').localeCompare((b.guess || b.name).replace(/^\d+_/, '')),
  group: (a, b) => (a.group || '~').localeCompare(b.group || '~'),
};
const visible = () => {
  const q = state.q.toLowerCase();
  return sounds.filter((s) => {
    if (state.filter === 'todo' && named(s)) return false;
    if (state.filter === 'named' && !named(s)) return false;
    if (state.filter === 'twins' && !s.twin) return false;
    if (state.group === '-' ? s.group : state.group && s.group !== state.group) return false;
    return !q || `${s.file} ${s.name} ${s.group} ${s.notes} ${s.guess ?? ''}`.toLowerCase().includes(q);
  }).sort(SORTS[state.sort]);
};

const countText = (shown) => `${shown} shown · ${sounds.filter(named).length} of ${sounds.length} named`;
const label = (s) => s.name || (s.guess ? s.guess.replace(/^\d+_/, '').replaceAll('_', ' ') : '');

function fillRow(row, s) {
  row.className = `item${s === state.sel ? ' sel' : ''}${named(s) ? ' named' : ''}`;
  row.querySelector('.id').innerHTML = `${s.file}${s.group ? `<span class="tag">${s.group}</span>` : ''}${s.twin ? '<span class="tag twin">repeat</span>' : ''}`;
  row.querySelector('.nm').textContent = label(s);
}

function renderList() {
  const list = $('list');
  list.replaceChildren();
  const vis = visible();
  for (const s of vis) {
    const row = document.createElement('div');
    row.dataset.file = s.file;
    row.innerHTML = `<div><div class="id"></div><div class="nm"></div></div><div class="len">${(s.seconds ?? 0).toFixed(2)}s</div>`;
    fillRow(row, s);
    row.onclick = () => select(s);
    list.appendChild(row);
  }
  $('count').textContent = countText(vis.length);
}

function refreshRow(s) {
  const row = [...$('list').children].find((r) => r.dataset.file === s.file);
  if (row) fillRow(row, s);
  $('count').textContent = countText($('list').children.length);
}

function renderGroups() {
  $('groups').replaceChildren(...GROUPS.map((g, i) => {
    const b = document.createElement('button');
    b.textContent = i < 10 ? `${(i + 1) % 10} ${g}` : g;
    b.className = state.sel?.group === g ? 'on' : '';
    b.onclick = () => setGroup(g);
    return b;
  }));
  const f = $('groupfilter'), was = state.group;
  f.replaceChildren(new Option('Any group', ''), new Option('No group yet', '-'), ...GROUPS.map((g) => new Option(`${g} (${sounds.filter((s) => s.group === g).length})`, g)));
  f.value = was;
}

function setGroup(g) {
  if (READ_ONLY || !state.sel) return;
  state.sel.group = state.sel.group === g ? '' : g;
  renderGroups();
  refreshRow(state.sel);
  save();
}

// ---- playing, and the picture of the sound ----
const audio = new Audio();
let actx = null;
const waves = new Map(); // file -> peaks along its length
async function wave(s) {
  if (!waves.has(s.file)) {
    try {
      actx ??= new AudioContext();
      const buf = await actx.decodeAudioData(await (await fetch(s.url)).arrayBuffer());
      const d = buf.getChannelData(0), n = 640, step = Math.max(1, Math.floor(d.length / n)), peaks = [];
      for (let i = 0; i < n; i++) {
        let lo = 0, hi = 0;
        for (let j = i * step; j < Math.min(d.length, (i + 1) * step); j++) { if (d[j] < lo) lo = d[j]; if (d[j] > hi) hi = d[j]; }
        peaks.push([lo, hi]);
      }
      waves.set(s.file, peaks);
    } catch { waves.set(s.file, []); }
  }
  return waves.get(s.file);
}

function drawWave() {
  const c = $('wave'), g = c.getContext('2d'), peaks = waves.get(state.sel?.file) ?? [];
  g.clearRect(0, 0, c.width, c.height);
  const mid = c.height / 2, w = c.width / Math.max(1, peaks.length);
  g.fillStyle = '#8fd14f';
  peaks.forEach(([lo, hi], i) => g.fillRect(i * w, mid - hi * mid, Math.max(1, w - 0.5), Math.max(1, (hi - lo) * mid)));
  if (audio.duration && !audio.paused) {
    g.fillStyle = '#f2c94c';
    g.fillRect((audio.currentTime / audio.duration) * c.width, 0, 2, c.height);
  }
}
function tick() { drawWave(); requestAnimationFrame(tick); }

function play(s = state.sel) {
  if (!s) return;
  audio.src = s.url;
  audio.loop = state.loop;
  audio.currentTime = 0;
  audio.play().catch(() => {}); // (the browser wants a click on the page before the first sound)
}

function select(s, focusName = false) {
  state.sel = s;
  for (const r of $('list').children) r.classList.toggle('sel', r.dataset.file === s.file);
  $('list').querySelector('.sel')?.scrollIntoView({ block: 'nearest' });
  $('title').textContent = s.name ? `${s.file}  →  ${s.name}` : s.file;
  $('sub').textContent = [`${(s.seconds ?? 0).toFixed(2)} s`, s.kind && `measured as ${s.kind}, around ${s.hz} Hz`, s.guess && `rough guess: ${s.guess}`].filter(Boolean).join(' · ');
  $('name').value = s.name;
  $('name').placeholder = s.guess ? `e.g. ${s.guess.replace(/^\d+_/, '')}` : 'name for this sound';
  $('notes').value = s.notes;
  $('useguess').style.display = s.guess && !READ_ONLY ? '' : 'none';
  const twin = s.twin && byFile.get(s.twin);
  $('twin').style.display = twin ? '' : 'none';
  if (twin) { $('twin').textContent = `▶ Measures the same as ${twin.file}${twin.name ? ` (${twin.name})` : ''}`; $('twin').onclick = () => play(twin); }
  renderGroups();
  wave(s);
  if (state.auto) play(s);
  if (focusName) { $('name').focus(); $('name').select(); }
}

function move(d, focusName = false) {
  const vis = [...$('list').children].map((r) => byFile.get(r.dataset.file));
  if (!vis.length) return;
  const i = vis.indexOf(state.sel);
  select(vis[Math.max(0, Math.min(vis.length - 1, i + d))], focusName);
}

// ---- wiring ----
if (READ_ONLY) {
  $('name').readOnly = $('notes').readOnly = true;
  $('saved').textContent = 'Read only: names are edited on the dev server';
}
function setName(v) {
  const s = state.sel;
  s.name = v.trim();
  $('title').textContent = s.name ? `${s.file}  →  ${s.name}` : s.file;
  refreshRow(s);
  save();
}
$('name').oninput = () => setName($('name').value);
$('notes').oninput = () => { state.sel.notes = $('notes').value; save(); };
$('name').onkeydown = (ev) => {
  if (ev.key === 'Enter') { ev.preventDefault(); move(1, true); }
  else if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') { ev.preventDefault(); move(ev.key === 'ArrowDown' ? 1 : -1, true); }
};
$('useguess').onclick = () => { $('name').value = state.sel.guess.replace(/^\d+_/, ''); setName($('name').value); };
$('q').oninput = () => { state.q = $('q').value; renderList(); };
$('groupfilter').onchange = () => { state.group = $('groupfilter').value; renderList(); };
$('sort').onchange = () => { state.sort = $('sort').value; renderList(); };
for (const b of $('filters').children) {
  b.onclick = () => {
    state.filter = b.dataset.f;
    for (const o of $('filters').children) o.classList.toggle('on', o === b);
    renderList();
  };
}
$('play').onclick = () => play();
$('wave').onclick = () => play();
$('loop').onclick = () => { state.loop = !state.loop; $('loop').classList.toggle('on', state.loop); audio.loop = state.loop; if (state.loop) play(); else audio.pause(); };
$('auto').onclick = () => { state.auto = !state.auto; $('auto').classList.toggle('on', state.auto); };
document.addEventListener('keydown', (ev) => {
  if (/INPUT|TEXTAREA|SELECT/.test(ev.target.tagName)) return;
  if (ev.key === 'ArrowDown') { ev.preventDefault(); move(1); }
  else if (ev.key === 'ArrowUp') { ev.preventDefault(); move(-1); }
  else if (ev.key === ' ') { ev.preventDefault(); play(); }
  else if (ev.key === 'Enter') { $('name').focus(); $('name').select(); }
  else if (/^[0-9]$/.test(ev.key)) { const g = GROUPS[(+ev.key + 9) % 10]; if (g) setGroup(g); }
});

renderList();
state.auto = false; // nothing plays until the page has been clicked
select(sounds[0]);
state.auto = true;
requestAnimationFrame(tick);
if (import.meta.env.DEV) Object.assign(window, { snd: { sounds, state, select, play, exportRows } });
