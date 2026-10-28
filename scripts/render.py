#!/usr/bin/env python3
"""Render a permission-cleared Shorts Studio job to a 9:16 MP4 with FFmpeg.

Only source media supplied by the creator is processed. This script does not
scrape social sites, transcribe audio, discover clips, or publish videos.
"""
from __future__ import annotations

import argparse
import json
import math
import re
import shutil
import subprocess
import sys
import tempfile
import textwrap
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
MAX_DOWNLOAD = 600 * 1024 * 1024


class JobError(Exception):
    pass


def run(args: list[str], *, capture: bool = False) -> str:
    result = subprocess.run(args, text=True, stdout=subprocess.PIPE if capture else None,
                            stderr=subprocess.PIPE if capture else None, check=False)
    if result.returncode != 0:
        detail = (result.stderr or '').strip()[-2000:]
        raise JobError(f"Command failed ({result.returncode}): {args[0]}\n{detail}")
    return result.stdout if capture else ''


def path_from_project(value: str) -> Path:
    if not value or not isinstance(value, str):
        raise JobError('A source media path is required.')
    p = (ROOT / value).resolve()
    if not p.is_relative_to(ROOT):
        raise JobError('Media paths must stay inside the project folder.')
    if not p.is_file():
        raise JobError(f'Media file not found: {value}. Add it to your repository.')
    return p


def download_media(url: str, destination: Path) -> Path:
    parsed = urlparse(url)
    if parsed.scheme != 'https' or not parsed.hostname:
        raise JobError('Direct media URLs must use HTTPS.')
    if any(site in parsed.hostname.lower() for site in ['youtube.com', 'youtu.be', 'instagram.com', 'tiktok.com']):
        raise JobError('Social watch-page links are unsupported. Supply media you are licensed to use.')
    req = Request(url, headers={'User-Agent': 'ShortsStudioRenderer/1.0'})
    with urlopen(req, timeout=45) as res:
        final = urlparse(res.geturl())
        if final.scheme != 'https':
            raise JobError('Media download redirected away from HTTPS.')
        length = res.headers.get('Content-Length')
        if length and int(length) > MAX_DOWNLOAD:
            raise JobError('Media exceeds 600 MiB download limit.')
        with destination.open('wb') as fp:
            total = 0
            while True:
                chunk = res.read(1024 * 1024)
                if not chunk:
                    break
                total += len(chunk)
                if total > MAX_DOWNLOAD:
                    raise JobError('Media exceeds 600 MiB download limit.')
                fp.write(chunk)
    if destination.stat().st_size < 100:
        raise JobError('Downloaded file is empty or too short to be a video.')
    return destination


def probe(path: Path) -> dict:
    raw = run(['ffprobe','-v','error','-show_entries',
               'format=duration:stream=codec_type','-of','json',str(path)],capture=True)
    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        raise JobError(f'Not a supported media file: {path.name}') from exc


def duration_of(path: Path) -> float:
    data = probe(path)
    try:
        return float(data['format']['duration'])
    except (KeyError, ValueError, TypeError):
        raise JobError(f'Could not determine audio duration: {path.name}')


def ass_time(sec: float) -> str:
    centis=max(0,round(sec*100))
    h, rem=divmod(centis, 360_000)
    m, rem=divmod(rem, 6000)
    s, cs=divmod(rem, 100)
    return f'{h}:{m:02}:{s:02}.{cs:02}'


def caption_chunks(script: str) -> list[str]:
    """Readable groups. These are approximate intervals, not ASR-synchronised."""
    script = re.sub(r'\[[^]]+\]', '', script)
    blocks = re.split(r'[\n]+|(?<=[.!?])\s+', script)
    chunks: list[str] = []
    for block in blocks:
        block = ' '.join(block.split())
        if not block:
            continue
        if len(block) <= 54:
            chunks.append(block)
        else:
            words = block.split(' ')
            current = []
            for word in words:
                if current and len(' '.join(current+[word])) > 48:
                    chunks.append(' '.join(current));current=[]
                current.append(word)
            if current:
                chunks.append(' '.join(current))
    return chunks[:100]


def ass_escape(text: str) -> str:
    return text.replace('\\', ' ').replace('{','(').replace('}',')').replace('\r','').replace('\n',' ')


def make_ass(script: str, runtime: float, title: str, dest: Path) -> bool:
    clips = caption_chunks(script)
    if not clips:
        return False
    head = '''[Script Info]
ScriptType: v4.00+
PlayResX: 720
PlayResY: 1280
ScaledBorderAndShadow: yes
WrapStyle: 0
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,DejaVu Sans,46,&H00FFFFFF,&H00FFFFFF,&HBA151525,&H85101523,-1,0,0,0,100,100,0,0,3,12,0,2,36,36,205,1
Style: Hook,DejaVu Sans,42,&H00BFAAFF,&H00BFAAFF,&H900B0B10,&H900B0B10,-1,0,0,0,100,100,0,0,1,4,1,8,35,35,90,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
'''
    # Split time according to word count so the captions roughly track reading time.
    weights=[max(2,len(c.split())) for c in clips]
    total=sum(weights)
    elapsed=0.0
    events=[]
    for i, chunk in enumerate(clips):
        next_time=runtime if i==len(clips)-1 else elapsed + runtime*weights[i]/total
        # Subtitle line breaks at roughly 23 chars; max 3 lines.
        lines=textwrap.wrap(ass_escape(chunk),width=24,break_long_words=False)
        if len(lines)>3:
            lines=lines[:2]+[' '.join(lines[2:])]
        caption='\\N'.join(lines)
        events.append(f'Dialogue: 0,{ass_time(elapsed)},{ass_time(next_time)},Caption,,0,0,0,,{caption}')
        elapsed=next_time
    if title:
        hook=ass_escape(title[:55])
        events.append(f'Dialogue: 0,{ass_time(.15)},{ass_time(min(2.2,runtime))},Hook,,0,0,0,,{hook}')
    dest.write_text(head+'\n'.join(events)+'\n',encoding='utf-8')
    return True


def make_ass_word_pop(script: str, runtime: float, title: str, dest: Path) -> bool:
    """Approximate word-group pop captions without pretending to have ASR timestamps."""
    raw = re.sub(r"\[[^]]+\]", "", script)
    words = raw.split()[:320]
    if not words:
        return False
    groups = [' '.join(words[i:i+3]) for i in range(0, len(words), 3)]
    weights = [len(x.split()) for x in groups]
    unit = runtime / max(1, sum(weights))
    head = """[Script Info]
ScriptType: v4.00+
PlayResX: 720
PlayResY: 1280
ScaledBorderAndShadow: yes
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: WordPop,DejaVu Sans,55,&H0000F5FF,&H0000F5FF,&HCC101025,&H94080A10,-1,0,0,0,100,100,0,0,3,13,0,2,38,38,245,1
Style: Hook,DejaVu Sans,42,&H00BFAAFF,&H00BFAAFF,&H900B0B10,&H900B0B10,-1,0,0,0,100,100,0,0,1,4,1,8,35,35,90,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    elapsed = 0.0
    lines = []
    for i, group in enumerate(groups):
        end = min(runtime, elapsed + unit * weights[i]) if i < len(groups)-1 else runtime
        if end > elapsed + 0.01:
            lines.append(f'Dialogue: 0,{ass_time(elapsed)},{ass_time(end)},WordPop,,0,0,0,,{{\\fad(60,80)}}{ass_escape(group.upper())}')
        elapsed=end
    if title:
        lines.append(f'Dialogue: 0,{ass_time(.15)},{ass_time(min(2.2,runtime))},Hook,,0,0,0,,{ass_escape(title[:55])}')
    dest.write_text(head+'\n'.join(lines)+'\n', encoding='utf-8')
    return True


def make_ass_timed(segments: list, runtime: float, title: str, dest: Path, style: str) -> bool:
    """Render user-supplied, speech-aligned timings; do not guess where words occur."""
    if not isinstance(segments, list) or len(segments) > 250:
        raise JobError('Timed captions must be an array of up to 250 segments.')
    if not segments:
        return False
    header = """[Script Info]
ScriptType: v4.00+
PlayResX: 720
PlayResY: 1280
ScaledBorderAndShadow: yes
WrapStyle: 0
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Caption,DejaVu Sans,46,&H00FFFFFF,&H00FFFFFF,&HBA151525,&H85101523,-1,0,0,0,100,100,0,0,3,12,0,2,36,36,205,1
Style: WordPop,DejaVu Sans,55,&H0000F5FF,&H0000F5FF,&HCC101025,&H94080A10,-1,0,0,0,100,100,0,0,3,13,0,2,38,38,245,1
Style: Hook,DejaVu Sans,42,&H00BFAAFF,&H00BFAAFF,&H900B0B10,&H900B0B10,-1,0,0,0,100,100,0,0,1,4,1,8,35,35,90,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    lines = []
    last_end = 0.0
    for i,seg in enumerate(segments):
        if not isinstance(seg,dict):
            raise JobError(f'Timed caption {i+1} is not an object.')
        try:
            a,b = float(seg['start_seconds']),float(seg['end_seconds'])
        except (KeyError,TypeError,ValueError):
            raise JobError(f'Timed caption {i+1} has missing or invalid timestamps.')
        content=seg.get('text')
        if (not math.isfinite(a) or not math.isfinite(b) or a < 0 or b <= a or
            b > runtime+0.05 or a < last_end-0.005 or not isinstance(content,str) or
            not 1 <= len(content.strip()) <= 160):
            raise JobError(f'Timed caption {i+1} is invalid or overlaps another segment.')
        last_end = b
        clean = ass_escape(content.strip())
        if style == 'word-pop':
            display = r'{\fad(60,80)}'+clean.upper()
            style_name = 'WordPop'
        else:
            display = r'\N'.join(textwrap.wrap(clean,width=24,break_long_words=False))
            style_name = 'Caption'
        lines.append(f'Dialogue: 0,{ass_time(a)},{ass_time(b)},{style_name},,0,0,0,,{display}')
    if title:
        lines.append(f'Dialogue: 0,{ass_time(.15)},{ass_time(min(2.2,runtime))},Hook,,0,0,0,,{ass_escape(title[:55])}')
    dest.write_text(header+'\n'.join(lines)+'\n',encoding='utf-8')
    return True



def kinetic_ass_events(entries: list[tuple[float,float,str]], title: str, dest: Path) -> bool:
    """Animated, readable 2–4-word caption groups with optional exact cue timings.

    When an ASR cue contains multiple words, division within the cue is an
    estimate, NOT precise word-alignment. One-word cues retain exact timing.
    """
    if not entries:
        return False
    header = """[Script Info]
ScriptType: v4.00+
PlayResX: 720
PlayResY: 1280
ScaledBorderAndShadow: yes
WrapStyle: 0
[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Kinetic,DejaVu Sans,54,&H0000ECFF,&H0000ECFF,&HCF0E0E18,&H9B08080E,-1,0,0,0,100,100,0,0,3,12,1,2,42,42,245,1
Style: Hook,DejaVu Sans,42,&H00BFAAFF,&H00BFAAFF,&H900B0B10,&H900B0B10,-1,0,0,0,100,100,0,0,1,4,1,8,35,35,90,1
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    events=[]
    for start,end,text in entries:
        if end <= start+0.03: continue
        words=text.split()
        if not words: continue
        # Longer transcription segments are split into animated caption beats.
        groups=[' '.join(words[i:i+3]) for i in range(0,len(words),3)]
        group_weights=[max(1,sum(len(w) for w in g.split())) for g in groups]
        total=sum(group_weights)
        current=start
        for i,group in enumerate(groups):
            finish=end if i==len(groups)-1 else current+(end-start)*group_weights[i]/total
            animation=r'{\fscx84\fscy84\t(0,150,\fscx100\fscy100)\fad(60,90)}'
            events.append(f'Dialogue: 0,{ass_time(current)},{ass_time(finish)},Kinetic,,0,0,0,,{animation}{ass_escape(group.upper())}')
            current=finish
    if title and events:
        last=max(x[1] for x in entries)
        if last>0.5:
            events.append(f'Dialogue: 0,{ass_time(.15)},{ass_time(min(2.2,last))},Hook,,0,0,0,,{ass_escape(title[:55])}')
    dest.write_text(header+'\n'.join(events)+'\n',encoding='utf-8')
    return bool(events)


def make_kinetic(script: str, runtime: float, title: str, dest: Path) -> bool:
    words=re.sub(r'\[[^]]+\]','',script).split()[:600]
    if not words: return False
    # Estimated timings for unsynchronised scripts, shown honestly in UI.
    entries=[]
    weights=[max(1,len(w)) for w in words]
    total=sum(weights)
    t=0.
    for i,w in enumerate(words):
        end=runtime if i==len(words)-1 else t+runtime*weights[i]/total
        entries.append((t,end,w))
        t=end
    # Merge into 3-word beats to avoid excessive ASS events / flicker.
    grouped=[]
    for i in range(0,len(entries),3):
        chunk=entries[i:i+3]
        grouped.append((chunk[0][0],chunk[-1][1],' '.join(x[2] for x in chunk)))
    return kinetic_ass_events(grouped,title,dest)

def voice_flite(script: str, path: Path, tempdir: Path) -> Path:
    if ' flite ' not in run(['ffmpeg','-hide_banner','-filters'],capture=True):
        raise JobError('This FFmpeg build has no Flite voice. Select no narration or provide an audio file.')
    clean = re.sub(r'\[[^]]+\]', '', script).strip()
    if not clean:
        raise JobError('Free basic voice needs a non-empty script.')
    script_path=tempdir/'speech.txt'
    script_path.write_text(clean[:4000],encoding='utf-8')
    # The temp path is generated without spaces/special FFmpeg delimiter chars.
    filter_str=f'flite=textfile={script_path}:voice=slt'
    run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','lavfi','-i',filter_str,
         '-ar','48000','-ac','2','-c:a','pcm_s16le',str(path)])
    return path


def render(job_path: Path, out_dir: Path) -> Path:
    if not shutil.which('ffmpeg') or not shutil.which('ffprobe'):
        raise JobError('FFmpeg and ffprobe are required on your machine or GitHub Actions runner.')
    data=json.loads(job_path.read_text(encoding='utf-8'))
    if not isinstance(data,dict) or data.get('version')!=1:
        raise JobError('Not a supported render job (version 1).')
    if data.get('rights_confirmed') is not True:
        raise JobError('Confirm rights to all footage and audio before rendering.')
    kind=data.get('kind','clip')
    if kind not in ('clip','original'):
        raise JobError('Kind must be clip or original.')
    requested=float(data.get('duration') or 30)
    if not math.isfinite(requested) or not 3<=requested<=180:
        raise JobError('Duration must be between 3 and 180 seconds.')
    source=data.get('source') or {}
    start=float(source.get('start_seconds') or 0)
    if not math.isfinite(start) or start<0:
        raise JobError('Start time must be non-negative.')
    narration=data.get('narration') or {}
    mode=narration.get('mode','none')
    if mode not in ('none','basic','file'):
        raise JobError('Unsupported narration mode.')
    script=str(data.get('script') or '')
    if kind=='original' and re.search(r'\[(RESEARCH|EXAMPLE|PAYOFF|HOOK|MAIN|END)\]',script,re.I):
        raise JobError('Replace all research/outline placeholders before rendering an original video.')
    options=data.get('editing') or {}
    if not isinstance(options,dict):
        raise JobError('Editing options must be an object.')
    caption_style=options.get('caption_style','classic')
    crop_focus=options.get('crop_focus','center')
    motion=options.get('motion','none')
    backdrop=options.get('background','midnight')
    if caption_style not in ('classic','word-pop','kinetic','none') or crop_focus not in ('center','left','right','smart-face') or motion not in ('none','gentle-pan') or backdrop not in ('midnight','ocean','plum'):
        raise JobError('Unsupported editing preset.')
    title=str(data.get('title') or 'Untitled Short')
    out_dir.mkdir(parents=True,exist_ok=True)
    safe=re.sub(r'[^a-z0-9-]+','-',title.lower().replace(' ','-')).strip('-')[:45] or 'short'
    output=out_dir / f'{safe}.mp4'
    with tempfile.TemporaryDirectory(prefix='shorts-studio-') as td:
        tempdir=Path(td)
        procedural=kind=='original' and not source.get('path') and not source.get('url')
        visual_mode=(data.get('visuals') or {}).get('mode','classic')
        if visual_mode not in ('classic','storyboard'):
            raise JobError('Visual mode must be classic or storyboard.')
        if kind=='original' and visual_mode=='storyboard' and not procedural:
            raise JobError('Storyboard mode requires generated background, not a source video.')
        if source.get('path'):
            video=path_from_project(source['path'])
        elif source.get('url'):
            print('Downloading direct media URL...')
            video=download_media(source['url'],tempdir/'source.mp4')
        elif procedural:
            # Free self-contained original-video background: no stock footage or API required.
            shades={'midnight':'0x10192f','ocean':'0x073c48','plum':'0x341c4b'}
            video=tempdir/'generated-background.mp4'
            run(['ffmpeg','-hide_banner','-loglevel','error','-y','-f','lavfi',
                 '-i',f"color=c={shades[backdrop]}:s=720x1280:r=30:d={requested}",
                 '-vf','drawgrid=w=80:h=80:t=2:c=white@0.045',
                 '-c:v','libx264','-preset','ultrafast','-crf','30','-pix_fmt','yuv420p',str(video)])
        else:
            raise JobError('Add a source.path or direct source.url for footage.')
        metadata=probe(video)
        if not any(s.get('codec_type')=='video' for s in metadata.get('streams',[])):
            raise JobError('Source must have a video stream.')
        source_length=float(metadata.get('format',{}).get('duration',0) or 0)
        if kind=='clip' and source_length and start>=source_length:
            raise JobError('Clip start is beyond the end of the source video.')
        voice=None
        if mode=='file':
            voice=path_from_project(narration.get('audio_path') or '')
            if not any(s.get('codec_type')=='audio' for s in probe(voice).get('streams',[])):
                raise JobError('Narration audio file contains no audio stream.')
        if mode=='basic':
            voice=voice_flite(script,tempdir/'voice.wav',tempdir)
        runtime=requested
        if kind=='original' and voice:
            runtime=min(180,max(requested,duration_of(voice)+0.2))
        if kind=='clip' and source_length:
            runtime=min(runtime,source_length-start)
        if procedural and visual_mode=='storyboard':
            try:
                from storyboard import create_story_video
                video=create_story_video(data,runtime,tempdir/'story-scenes')
            except (ImportError,ValueError,OSError) as exc:
                raise JobError(f'Cannot create storyboard scenes: {exc}') from exc
            metadata=probe(video)
            print('Original storyboard: animated scene sequence with gentle zoom and transitions.')
        if runtime<1:
            raise JobError('Not enough source footage remains for this clip.')
        ass=tempdir/'captions.ass'
        if bool(data.get('captions',True)) and caption_style!='none':
            timed=data.get('caption_segments') or []
            if caption_style=='kinetic':
                if timed:
                    # Validate all timestamp rules before composing kinetic groups.
                    make_ass_timed(timed,runtime,title,tempdir/'validate.ass','classic')
                    captions=kinetic_ass_events([(float(c['start_seconds']),float(c['end_seconds']),c['text']) for c in timed],title,ass)
                else:
                    captions=make_kinetic(script,runtime,title,ass)
            else:
                captions=(make_ass_timed(timed,runtime,title,ass,caption_style) if timed
                          else (make_ass_word_pop(script,runtime,title,ass) if caption_style=='word-pop'
                                else make_ass(script,runtime,title,ass)))
        else:
            captions=False
        horizontal={'left':'0','center':'(iw-720)/2','right':'iw-720'}
        x=horizontal.get(crop_focus,'(iw-720)/2')
        if crop_focus=='smart-face' and not procedural:
            try:
                from smart_crop import track_faces, smooth_track, crop_expression
                track=smooth_track(track_faces(video,start,runtime),runtime)
                if track:
                    x=crop_expression(track)
                    print(f'Face-aware framing: {len(track)} smoothed positions (no face identity recognition).')
                else:
                    print('Face-aware framing: no visible face found; using central crop.')
            except (ImportError,OSError,ValueError) as exc:
                print(f'Face-aware framing unavailable ({exc}); using central crop.')
        if motion=='gentle-pan' and crop_focus=='center':
            x='(iw-720)*(0.5+0.38*sin(n/85))'
        vf=f'scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280:x={x}:y=(ih-1280)/2,setsar=1'
        if captions:
            vf+=f',ass={ass}'
        command=['ffmpeg','-hide_banner','-loglevel','error','-y']
        if kind=='original':
            command+=['-stream_loop','-1']
        if start:
            command+=['-ss',str(start)]
        command+=['-i',str(video)]
        if voice:
            command+=['-i',str(voice)]
        command+=['-map','0:v:0']
        if voice:
            command+=['-map','1:a:0']
        else:
            # If the video has no audio, produce a valid silent MP4.
            if any(s.get('codec_type')=='audio' for s in metadata.get('streams',[])):
                command+=['-map','0:a:0']
        command+=['-vf',vf,'-t',f'{runtime:.3f}','-r','30','-c:v','libx264',
                  '-preset','veryfast','-crf','25','-pix_fmt','yuv420p',
                  '-c:a','aac','-b:a','128k','-ar','48000',
                  '-movflags','+faststart','-shortest']
        if voice or any(s.get('codec_type')=='audio' for s in metadata.get('streams',[])):
            command+=['-af','loudnorm=I=-16:TP=-1.5:LRA=11,apad' if voice else 'loudnorm=I=-16:TP=-1.5:LRA=11']
        command.append(str(output))
        print(f'Rendering {kind}: {title} ({runtime:.1f}s; {"captions" if captions else "no captions"}; voice={mode})')
        run(command)
        if not output.is_file() or output.stat().st_size<1000:
            raise JobError('Rendering failed to create a playable MP4.')
        result=probe(output)
        if not any(s.get('codec_type')=='video' for s in result.get('streams',[])):
            raise JobError('Output MP4 has no video stream.')
    print(f'✅ Finished: {output} ({output.stat().st_size/1024/1024:.2f} MiB)')
    return output


def main() -> int:
    parser=argparse.ArgumentParser(description='Make a 9:16 MP4 from a Shorts Studio render job')
    parser.add_argument('--job',type=Path,required=True,help='JSON job file exported from dashboard')
    parser.add_argument('--out',type=Path,default=ROOT/'output',help='Output directory')
    args=parser.parse_args()
    try:
        render(args.job.resolve(),args.out.resolve())
        return 0
    except (JobError, json.JSONDecodeError, OSError, ValueError) as exc:
        print(f'❌ {exc}',file=sys.stderr)
        return 1

if __name__=='__main__':
    sys.exit(main())
