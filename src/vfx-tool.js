// Dev tool (vfx.html): browse every effect in move_VFX, give each a name, export the list.
// On the published test client there is no dev server to list the effects or keep the names: the list comes from a
// file made at build time, and the page is read only.
import { MOVES } from './moves.js';

const $ = (id) => document.getElementById(id);
const READ_ONLY = !import.meta.env.DEV;
const { effects, names: saved } = await (await fetch(READ_ONLY ? '/vfx.json' : '/api/vfx')).json();

// which in-game moves already use each effect
const usedBy = {};
for (const mv of Object.values(MOVES)) if (mv.fx) (usedBy[mv.fx.slice(0, 4)] ??= []).push(mv.name);

for (const e of effects) {
  e.original = e.folder.slice(5);
  e.name = saved[e.id]?.name ?? e.original;
  e.notes = saved[e.id]?.notes ?? '';
  e.used = usedBy[e.id] ?? [];
  // a sequence's file numbers are ticks; a skipped number holds the previous frame
  for (const s of e.seqs) {
    s.ticks = [];
    s.files.forEach((f, i) => {
      const t = parseInt(f, 10), next = i + 1 < s.files.length ? parseInt(s.files[i + 1], 10) : t + 1;
      for (let n = t; n < next; n++) s.ticks.push(i);
    });
    s.url = (i) => `/move_VFX/${e.folder}/${s.seq}/${s.files[i]}`;
  }
  e.main = e.seqs.reduce((a, b) => (b.files.length * b.w * b.h > a.files.length * a.w * a.h ? b : a), e.seqs[0]);
}
const edited = (e) => e.name !== e.original;

const state = { sel: null, seq: null, filter: 'all', q: '', playing: true, fps: 30, zoom: 4, tick: 0, acc: 0 };

// ---- saving ----
let saveTimer = 0;
function save() {
  if (READ_ONLY) return;
  clearTimeout(saveTimer);
  $('saved').textContent = 'saving…';
  saveTimer = setTimeout(async () => {
    const out = {};
    for (const e of effects) if (edited(e) || e.notes) out[e.id] = { name: e.name, notes: e.notes };
    const r = await fetch('/api/vfx', { method: 'POST', body: JSON.stringify(out) });
    $('saved').textContent = r.ok ? `saved ${new Date().toLocaleTimeString()}` : 'save failed';
  }, 400);
}

const exportRows = () =>
  effects.map((e) => ({
    id: e.id, name: e.name, original: e.original, folder: e.folder, renamed: edited(e), notes: e.notes, usedBy: e.used,
    sequences: e.seqs.map((s) => ({ seq: s.seq, width: s.w, height: s.h, frames: s.files.length, ticks: s.ticks.length })),
  }));

function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}
$('exp-json').onclick = () => download('move_vfx_names.json', JSON.stringify(exportRows(), null, 1), 'application/json');
$('exp-csv').onclick = () => {
  const q = (v) => `"${String(v).replaceAll('"', '""')}"`;
  const rows = exportRows().map((r) => [r.id, r.name, r.original, r.folder, r.renamed, r.sequences.length, r.usedBy.join('; '), r.notes].map(q).join(','));
  download('move_vfx_names.csv', ['id,name,original,folder,renamed,sequences,used_by,notes', ...rows].join('\n'), 'text/csv');
};

// ---- list ----
const visible = () => {
  const q = state.q.toLowerCase();
  return effects.filter((e) => {
    if (state.filter === 'edited' && !edited(e)) return false;
    if (state.filter === 'todo' && edited(e)) return false;
    if (state.filter === 'used' && !e.used.length) return false;
    return !q || `${e.id} ${e.name} ${e.original} ${e.notes} ${e.used.join(' ')}`.toLowerCase().includes(q);
  });
};

function renderList() {
  const list = $('list');
  list.replaceChildren();
  const vis = visible();
  for (const e of vis) {
    const row = document.createElement('div');
    row.className = `item${e === state.sel ? ' sel' : ''}${edited(e) ? ' edited' : ''}`;
    row.dataset.id = e.id;
    const mid = e.main.files.length >> 1;
    row.innerHTML = `<div class="thumb"><img loading="lazy" src="${e.main.url(mid)}" alt=""></div>
      <div><div class="id">${e.id}${e.used.length ? '<span class="tag">in game</span>' : ''}</div><div class="nm"></div></div>`;
    row.querySelector('.nm').textContent = e.name;
    row.onclick = () => select(e);
    list.appendChild(row);
  }
  $('count').textContent = `${vis.length} shown · ${effects.filter(edited).length} of ${effects.length} renamed`;
}

function refreshRow(e) {
  const row = $('list').querySelector(`[data-id="${e.id}"]`);
  if (row) {
    row.classList.toggle('edited', edited(e));
    row.querySelector('.nm').textContent = e.name;
  }
  $('count').textContent = `${visible().length} shown · ${effects.filter(edited).length} of ${effects.length} renamed`;
}

// ---- selection and playback ----
const cache = new Map();
const img = (url) => {
  let i = cache.get(url);
  if (!i) { i = new Image(); i.src = url; cache.set(url, i); }
  return i;
};

function select(e, focusName = false) {
  state.sel = e;
  state.tick = 0;
  for (const r of $('list').children) r.classList.toggle('sel', r.dataset.id === e.id);
  $('list').querySelector('.sel')?.scrollIntoView({ block: 'nearest' });
  $('title').textContent = `${e.id}  ${e.name}`;
  $('sub').textContent = `folder ${e.folder} · ${e.seqs.length} sequence${e.seqs.length > 1 ? 's' : ''}` + (e.used.length ? ` · used by ${e.used.join(', ')}` : '');
  $('name').value = e.name;
  $('notes').value = e.notes;
  const box = $('seqs');
  box.replaceChildren();
  for (const s of e.seqs) {
    const el = document.createElement('div');
    el.className = 'seq';
    const sc = Math.max(1, Math.min(2, Math.floor(96 / Math.max(s.w, s.h))));
    el.innerHTML = `<canvas class="bg-dark" width="${s.w}" height="${s.h}" style="width:${s.w * sc}px;height:${s.h * sc}px"></canvas>${s.seq} · ${s.files.length}f · ${s.w}×${s.h}`;
    el.onclick = () => pickSeq(s);
    s.el = el;
    s.ctx = el.firstChild.getContext('2d');
    box.appendChild(el);
  }
  pickSeq(e.main);
  if (focusName) { $('name').focus(); $('name').select(); }
}

function pickSeq(s) {
  state.seq = s;
  state.tick = 0;
  for (const q of state.sel.seqs) q.el.classList.toggle('sel', q === s);
  sizeBig();
}

function sizeBig() {
  const s = state.seq, c = $('big');
  c.width = s.w; c.height = s.h;
  c.style.width = `${s.w * state.zoom}px`;
  c.style.height = `${s.h * state.zoom}px`;
}

const PAUSE = 8; // blank ticks between loops
function draw() {
  const e = state.sel;
  if (!e) return;
  for (const s of e.seqs) {
    const t = state.tick % (s.ticks.length + PAUSE);
    const frame = s.ticks[t];
    const targets = s === state.seq ? [s.ctx, $('big').getContext('2d')] : [s.ctx];
    for (const ctx of targets) {
      ctx.clearRect(0, 0, s.w, s.h);
      if (frame !== undefined) {
        const im = img(s.url(frame));
        if (im.complete && im.naturalWidth) ctx.drawImage(im, 0, 0);
      }
    }
    if (s === state.seq) $('frameinfo').textContent = frame === undefined ? `tick – / ${s.ticks.length}` : `tick ${t + 1} / ${s.ticks.length} · file ${s.files[frame]}`;
  }
}

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (state.playing) {
    state.acc += dt * state.fps;
    const n = Math.floor(state.acc);
    state.acc -= n;
    state.tick += n;
  }
  draw();
  requestAnimationFrame(loop);
}

function step(d) {
  state.playing = false;
  $('play').textContent = 'Play';
  const len = state.seq.ticks.length + PAUSE;
  state.tick = (((state.tick + d) % len) + len) % len;
  draw();
}

function move(d, focusName = false) {
  const vis = visible();
  if (!vis.length) return;
  const i = vis.indexOf(state.sel);
  select(vis[Math.max(0, Math.min(vis.length - 1, i + d))], focusName);
}

// ---- wiring ----
if (READ_ONLY) {
  $('name').readOnly = $('notes').readOnly = true;
  $('reset').style.display = 'none';
  $('saved').textContent = 'Read only: names are edited on the dev server';
}
$('name').oninput = () => {
  const e = state.sel;
  e.name = $('name').value.trim() || e.original;
  $('title').textContent = `${e.id}  ${e.name}`;
  refreshRow(e);
  save();
};
$('notes').oninput = () => { state.sel.notes = $('notes').value; save(); };
$('name').onkeydown = (ev) => {
  if (ev.key === 'Enter') { ev.preventDefault(); move(1, true); }
  else if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') { ev.preventDefault(); move(ev.key === 'ArrowDown' ? 1 : -1, true); }
};
$('reset').onclick = () => {
  const e = state.sel;
  e.name = e.original;
  $('name').value = e.name;
  $('title').textContent = `${e.id}  ${e.name}`;
  refreshRow(e);
  save();
};
$('q').oninput = () => { state.q = $('q').value; renderList(); };
for (const b of $('filters').children) {
  b.onclick = () => {
    state.filter = b.dataset.f;
    for (const o of $('filters').children) o.classList.toggle('on', o === b);
    renderList();
  };
}
$('play').onclick = () => { state.playing = !state.playing; $('play').textContent = state.playing ? 'Pause' : 'Play'; };
$('prev').onclick = () => step(-1);
$('next').onclick = () => step(1);
$('fps').oninput = () => { state.fps = +$('fps').value; $('fpsv').textContent = state.fps; };
$('zoom').oninput = () => { state.zoom = +$('zoom').value; $('zoomv').textContent = `${state.zoom}×`; sizeBig(); };
for (const b of $('bgs').children) {
  b.onclick = () => {
    for (const o of $('bgs').children) o.classList.toggle('on', o === b);
    $('big').className = `bg-${b.dataset.bg}`;
  };
}
document.addEventListener('keydown', (ev) => {
  if (/INPUT|TEXTAREA/.test(ev.target.tagName)) return;
  if (ev.key === 'ArrowDown') { ev.preventDefault(); move(1); }
  else if (ev.key === 'ArrowUp') { ev.preventDefault(); move(-1); }
  else if (ev.key === ' ') { ev.preventDefault(); $('play').click(); }
  else if (ev.key === ',') step(-1);
  else if (ev.key === '.') step(1);
  else if (ev.key === 'Enter') { $('name').focus(); $('name').select(); }
});

renderList();
select(effects[0]);
requestAnimationFrame(loop);
if (import.meta.env.DEV) Object.assign(window, { vfx: { effects, state, select, draw, step, exportRows } });
