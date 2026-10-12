import { Boot } from '../../scene.js';
import { preloadArt, buildArt } from '../art.js';
import { loadSession, session } from '../session.js';
import { reveal } from '../transition.js';

// Loads the mons and the art sheets, then opens the title screen. The move effects and stages (thousands of
// files) are fetched by the title screen while the player looks at it.
export class ClientBoot extends Boot {
  preload() {
    this.loadingBar();
    this.loadCore();
    preloadArt(this);
  }

  create() {
    this.build();
    buildArt(this);
    loadSession();
    this.registry.set('callouts', !session.briefed?.quiet); // move names called out in battle, unless turned off at the dojo pool
    this.scene.launch('wipe');
    reveal(this, 'title');
  }
}
