import fs from 'node:fs';
import path from 'node:path';

// What sounds.html shows: every sound in "Sound Effects", what was measured about each (analysis.json: a rough guess
// at a name, its length, its main pitch, and a file it sounds identical to) and the names given so far (names.json).
export const SOUND_DIR = path.resolve('Sound Effects');
export const SOUND_NAMES_FILE = path.join(SOUND_DIR, 'names.json');

const read = (file) => {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return {}; }
};
export const readSoundNames = () => read(SOUND_NAMES_FILE);

export function listSounds() {
  const measured = read(path.join(SOUND_DIR, 'analysis.json'));
  return fs.readdirSync(SOUND_DIR).filter((f) => f.endsWith('.mp3')).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))
    .map((file) => ({ file, ...measured[file] }));
}
