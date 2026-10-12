import { loadStages } from '../scene.js';

// The stage art and the handful of effects every fight shares are fetched behind the title and dream screens.
// (The moves' own effects, thousands of files, are loaded fight by fight: see moves.js.)
// The always-running wipe scene does the loading, so changing screens does not interrupt it.
export function fetchStages(game) {
  if (game.registry.get('stagesProgress') !== undefined) return;
  game.registry.set('stagesProgress', 0);
  const loader = game.scene.getScene('wipe').load;
  loader.maxParallelDownloads = 96; // downloads are only started once a frame
  loadStages(loader.scene, true);
  loader.on('progress', (v) => game.registry.set('stagesProgress', v));
  loader.once('complete', () => {
    game.registry.set('stagesProgress', 1);
    game.events.emit('stages');
  });
  loader.start();
}

export const stagesReady = (game) => game.registry.get('stagesProgress') === 1;

// "Loading 42%" while the fetch runs, '' once it is done.
export const stagesNote = (game) => (stagesReady(game) ? '' : `Loading ${Math.floor((game.registry.get('stagesProgress') ?? 0) * 100)}%`);

// Run fn now, or as soon as the stages are in (unless the scene has been left by then).
export function whenStages(scene, fn) {
  if (stagesReady(scene.game)) return fn();
  scene.game.events.once('stages', fn);
  scene.events.once('shutdown', () => scene.game.events.off('stages', fn));
}
