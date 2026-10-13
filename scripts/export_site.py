#!/usr/bin/env python3
"""Publish only ORIGINAL v2 lesson content; never source-derived analysis."""
import concurrent.futures,json,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SITE=ROOT/'site'; AUDIO=SITE/'audio'
SOURCE=ROOT/'pilot/output-v2/timeline.json'

def export():
    timeline=json.loads(SOURCE.read_text())
    AUDIO.mkdir(parents=True,exist_ok=True)
    clips=sorted({s['clip'] for s in timeline['segments']})
    def encode(clip):
        src=ROOT/'pilot'/clip
        dest=AUDIO/(src.stem+'.mp3')
        if not dest.exists():
            subprocess.run(['ffmpeg','-y','-v','error','-i',str(src),'-af','loudnorm=I=-18:TP=-2:LRA=11','-ar','24000','-codec:a','libmp3lame','-b:a','96k',str(dest)],check=True)
        seconds=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',str(dest)],text=True))
        return clip,seconds
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        durations=dict(pool.map(encode,clips))
    segments=[]
    for s in timeline['segments']:
        # Deliberate whitelist: no machine paths, ASR material, or hidden answers.
        segments.append({
            'id':s['id'],'chapter':s['chapter'],'kind':s['kind'],
            'language':s['language'],'voice':s['voice'],'text':s['text'],
            'audio':f'audio/{Path(s["clip"]).stem}.mp3',
            'duration':s['speech_duration_seconds'],'gap':s['gap_after_seconds'],
            'practice':s['kind'].endswith('_prompt') or s['kind']=='repeat_model',
        })
        assert abs(durations[s['clip']]-s['speech_duration_seconds'])<.2
    chapters=[]
    for i,s in enumerate(segments):
        if not chapters or chapters[-1]['title']!=s['chapter']:
            chapters.append({'title':s['chapter'],'index':i})
    manifest={'title':'Now, yesterday, tomorrow','subtitle':'Everyday English & music production','revision':2,
        'description':'Original American English lesson with Brazilian Portuguese guidance. Not affiliated with Pimsleur.',
        'segments':segments,'chapters':chapters}
    (SITE/'lesson.json').write_text(json.dumps(manifest,ensure_ascii=False,separators=(',',':'))+'\n')
    (SITE/'.nojekyll').touch()
    print(f'Exported {len(clips)} original clips, {len(segments)} segments, {len(chapters)} chapters.')

if __name__=='__main__':export()
