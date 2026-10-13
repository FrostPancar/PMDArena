# Turns the soundtrack files in "PMDRRT Soundtrack/" (.brstm, saved by hand from smashcustommusic.net) into the game's
# music: Music/<name>.mp3 and Music/tracks.json, which says what each is and where it loops.
#   python3 tools/convert-music.py
# WANT maps the game's name for a track to the title in the file name. A track with no file is reported and left out.
import subprocess, json, os, re, unicodedata
SRC, OUT = 'PMDRRT Soundtrack', 'Music'
WANT = {
    'stage_beach': 'Beach Cave', 'stage_pond': 'Tiny Woods', 'stage_safari': 'Apple Woods', 'stage_mushroom': 'Sinister Woods',
    'stage_jungle': 'Treeshroud Forest', 'stage_mistrise': 'Foggy Forest', 'stage_secretive': 'Mystifying Forest', 'stage_swamp': 'Silent Chasm',
    'stage_sacred': 'Great Canyon', 'stage_scorched': 'Magma Cavern', 'stage_desert': 'Northern Desert', 'stage_blaze': 'Mt. Blaze Peak',
    'stage_steel': 'Mt. Steel', 'stage_northern': 'Mt. Freeze', 'stage_cavern': 'Frosty Grotto', 'stage_dragon': 'Lapis Cave',
    'stage_relic': 'Buried Relic', 'stage_plant': 'Amp Plains', 'stage_stratos': 'Sky Tower Summit', 'stage_serene': 'Drenched Bluff',
    'stage_bountiful': 'Surrounded Sea', 'stage_deepsea': 'Miracle Sea', 'stage_enclosed': 'Craggy Coast', 'stage_island': 'Stormy Sea',
    'screen_title': 'Title', 'screen_save': 'File Select', 'screen_dream': 'Personality Test', 'screen_welcome': 'Welcome to the World of Pokemon!',
    'screen_base': 'Rescue Team Base', 'screen_dojo': 'Marowak Dojo', 'screen_basement': 'Time Gear', 'screen_lab': 'Friend Area Lab',
    'screen_crew': 'Do Your Best, As Always!', 'screen_map': 'Top Menu Theme', 'fight_boss': 'Versus Legendary', 'fight_decider': 'Danger',
    'screen_evolution': 'Evolution', 'jingle_win': 'Mission Completed', 'jingle_loss': 'Mission Failed', 'jingle_unlock': 'Dungeon Unlocked',
    'jingle_tm': 'Get Special Item', 'jingle_levelup': 'Level Up',
}
files = {}
for f in os.listdir(SRC):
    m = re.match(r'.*Mystery Dungeon_ (.*?) - (.*)\.brstm$', unicodedata.normalize('NFC', f))
    if m: files[m.group(2)] = (f, m.group(1))
os.makedirs(OUT, exist_ok=True)
tracks, missing = {}, []
for name, title in WANT.items():
    if title not in files: missing.append(f'{name} ({title})'); continue
    f, game = files[title]
    src = os.path.join(SRC, f)
    probe = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-show_format', '-of', 'json', src], capture_output=True).stdout)['format']
    dur, loop = float(probe['duration']), probe.get('tags', {}).get('loop_start')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-ar', '32000', '-c:a', 'libmp3lame', '-q:a', '5', os.path.join(OUT, name + '.mp3')], check=True)
    # (a .brstm that loops says where the loop starts, in millionths of a second; it loops back from its end)
    tracks[name] = {'title': title, 'game': 'Pokémon Mystery Dungeon: ' + game, 'seconds': round(dur, 2), **({'loopStart': round(int(loop) / 1e6, 4), 'loopEnd': round(dur, 4)} if loop is not None and not name.startswith('jingle') else {})}
json.dump(tracks, open(os.path.join(OUT, 'tracks.json'), 'w'), indent=1, ensure_ascii=False)
print(len(tracks), 'converted;', 'missing:', ', '.join(missing) or 'none')
print('unused files:', [t for t in files if t not in WANT.values()])
