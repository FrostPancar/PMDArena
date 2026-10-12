// What each playable species grows into, in order. Evolved forms are skins: a mon wearing one looks different and
// is otherwise the same fighter (same numbers; its moves are the species' own, plus an evolution's if it branches).
// Their sprite packs live in evolutions/<form>/.
export const EVOLUTIONS = {
  bulbasaur: ['ivysaur', 'venusaur'], charmander: ['charmeleon', 'charizard'], squirtle: ['wartortle', 'blastoise'],
  chikorita: ['bayleef', 'meganium'], treecko: ['grovyle', 'sceptile'], torchic: ['combusken', 'blaziken'],
  mudkip: ['marshtomp', 'swampert'], ralts: ['kirlia', 'gardevoir'], eevee: ['vaporeon', 'jolteon', 'flareon', 'espeon', 'umbreon', 'leafeon', 'glaceon', 'sylveon'], axew: ['fraxure', 'haxorus'],
  zorua: ['zoroark'], starly: ['staravia', 'staraptor'], corphish: ['crawdaunt'], cubone: ['marowak'],
  nidoran: ['nidorina', 'nidoqueen'], aron: ['lairon', 'aggron'], venipede: ['whirlipede', 'scolipede'], rotom: [],
  riolu: ['lucario'], combee: ['vespiquen'], clefairy: ['clefable'], rhyhorn: ['rhydon', 'rhyperior'],
  scyther: ['scizor'], joltik: ['galvantula'], skarmory: [],
  cacnea: ['cacturne'], alolanvulpix: ['alolanninetales'], heracross: [], porygon: ['porygon2', 'porygonz'],
};

// Species whose forms are alternatives, not steps: the player picks one when the mon is ready, and it stays that form
// for good (session.mons[id].branch). The list is in EVOLUTIONS too, so the sprites are known.
export const CHOICES = { eevee: EVOLUTIONS.eevee };
