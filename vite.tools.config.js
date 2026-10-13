import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { listEffects, readNames, effectDir, sectionLabels } from './server/vfx-list.js';
import { SOUND_DIR, listSounds, readSoundNames } from './server/sound-list.js';

// The test client as a static site of its own: playground.html (served at /), moves.html (the move viewer),
// vfx.html (the effect viewer) and sounds.html (the sound viewer). `npm run build:tools` writes it to dist-tools/.
// The effect and sound viewers are read only there: with no dev server behind them, their lists are files written
// here (vfx.json, sounds.json) beside copies of the pictures and sounds, and names cannot be saved.
export default defineConfig({
  build: {
    outDir: 'dist-tools',
    emptyOutDir: true,
    rollupOptions: { input: { playground: 'playground.html', moves: 'moves.html', vfx: 'vfx.html', sounds: 'sounds.html' } },
  },
  plugins: [{
    name: 'tools-root',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: '_redirects', source: '/ /playground.html 200\n' });
      this.emitFile({ type: 'asset', fileName: 'sounds.json', source: JSON.stringify({ sounds: listSounds(), names: readSoundNames() }) });
      this.emitFile({ type: 'asset', fileName: 'vfx.json', source: JSON.stringify({ effects: listEffects(), names: readNames(), sections: sectionLabels() }) });
    },
    closeBundle() {
      for (const e of listEffects()) for (const s of e.seqs) {
        const to = path.resolve(`dist-tools${e.base}`, e.folder, s.seq);
        fs.mkdirSync(to, { recursive: true });
        for (const f of s.files) fs.copyFileSync(path.join(effectDir(e), s.seq, f), path.join(to, f));
      }
      const to = path.resolve('dist-tools/Sound Effects');
      fs.mkdirSync(to, { recursive: true });
      for (const s of listSounds()) fs.copyFileSync(path.join(SOUND_DIR, s.file), path.join(to, s.file));
    },
  }],
});
