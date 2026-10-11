import { defineConfig } from 'vite';

// The test client as a static site of its own: playground.html (served at /) and moves.html (the move viewer).
// `npm run build:tools` writes it to dist-tools/. vfx.html is left out: it needs the dev server's file API.
export default defineConfig({
  build: {
    outDir: 'dist-tools',
    emptyOutDir: true,
    rollupOptions: { input: { playground: 'playground.html', moves: 'moves.html' } },
  },
  plugins: [{
    name: 'tools-root',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: '_redirects', source: '/ /playground.html 200\n' });
    },
  }],
});
