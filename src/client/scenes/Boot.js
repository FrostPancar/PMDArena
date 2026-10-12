import { Boot } from '../../scene.js';
import { preloadArt, buildArt } from '../art.js';
import { loadSession, session } from '../session.js';
import { reveal } from '../transition.js';

// Loads the art sheets, then opens the title screen. Mon sprites and move effects are loaded by the screens that
// need them; the stages are fetched by the title screen while the player looks at it.
export class ClientBoot extends Boot {
  preload() {
    this.loadingBar();
    this.loadCore(false); // no mon sprites yet: each screen loads the ones it shows (a phone cannot hold them all)
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
