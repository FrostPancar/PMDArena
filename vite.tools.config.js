import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { VFX_DIR, listEffects, readNames } from './server/vfx-list.js';

// The test client as a static site of its own: playground.html (served at /), moves.html (the move viewer) and
// vfx.html (the effect viewer). `npm run build:tools` writes it to dist-tools/.
// The effect viewer is read only there: with no dev server behind it, its list of effects is a file written here
// (vfx.json) beside a copy of the effect pictures, and the names given to effects cannot be saved.
export default defineConfig({
  build: {
    outDir: 'dist-tools',
    emptyOutDir: true,
    rollupOptions: { input: { playground: 'playground.html', moves: 'moves.html', vfx: 'vfx.html' } },
  },
  plugins: [{
    name: 'tools-root',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: '_redirects', source: '/ /playground.html 200\n' });
      this.emitFile({ type: 'asset', fileName: 'vfx.json', source: JSON.stringify({ effects: listEffects(), names: readNames() }) });
    },
    closeBundle() {
      for (const e of listEffects()) for (const s of e.seqs) {
        const to = path.resolve('dist-tools/move_VFX', e.folder, s.seq);
        fs.mkdirSync(to, { recursive: true });
        for (const f of s.files) fs.copyFileSync(path.join(VFX_DIR, e.folder, s.seq, f), path.join(to, f));
      }
    },
  }],
});
