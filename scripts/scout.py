#!/usr/bin/env python3
"""Find candidate clip windows in AUTHORISED video via FFmpeg heuristics.

No account access, downloads, generative AI, or claims of predicting virality.
Reports may be imported into the Shorts Studio browser dashboard.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
import math
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]


def inspect(cmd: list[str]) -> str:
    result = subprocess.run(cmd, capture_output=True, text=True, check=False)
    if result.returncode:
        raise RuntimeError(f"FFmpeg/ffprobe failed: {(result.stderr or '')[-800:]}")
    return result.stderr + '\n' + result.stdout


def parse_scene_events(source: Path, limit: float) -> list[float]:
    # Decode at 4 FPS to keep cloud cost low; scene scores are not semantic understanding.
    log = inspect(['ffmpeg', '-hide_banner', '-loglevel', 'info', '-i', str(source),
                   '-t', str(limit), '-vf', 'fps=4,select=gt(scene\\,0.20),showinfo',
                   '-an', '-f', 'null', '-'])
    return sorted(set(float(m.group(1)) for m in re.finditer(r'pts_time:\s*([\d.]+)', log)))


def parse_silences(source: Path, limit: float) -> list[tuple[float, float]]:
    log = inspect(['ffmpeg', '-hide_banner', '-loglevel', 'info', '-i', str(source),
                   '-t', str(limit), '-af', 'silencedetect=noise=-34dB:d=0.55',
                   '-vn', '-f', 'null', '-'])
    events = re.findall(r'silence_(start|end):\s*([\d.]+)', log)
    start = None
    intervals = []
    for kind, value in events:
        moment = min(limit, max(0, float(value)))
        if kind == 'start':
            start = moment
        elif start is not None:
            if moment > start:
                intervals.append((start, moment))
            start = None
    if start is not None:
        intervals.append((start, limit))
    return intervals


def overlap(a: float, b: float, x: float, y: float) -> float:
    return max(0, min(b, y) - max(a, x))


def load_transcript(path: Path) -> list[dict]:
    """Accept a user-provided, time-aligned JSON transcript (no model/API required)."""
    if path.stat().st_size > 2_000_000:
        raise ValueError('Transcript JSON exceeds 2MB')
    data=json.loads(path.read_text(encoding='utf-8'))
    segments=data.get('segments') if isinstance(data,dict) else data
    if not isinstance(segments,list) or len(segments)>15000:
        raise ValueError('Transcript should be a list of timed segments')
    valid=[]
    for seg in segments:
        if not isinstance(seg,dict):
            continue
        a,b=seg.get('start'),seg.get('end')
        if all(isinstance(n,(int,float)) and math.isfinite(n) for n in (a,b)) and 0<=a<b and isinstance(seg.get('text'),str):
            valid.append({'start':a,'end':b,'text':seg['text'][:800]})
    if not valid:
        raise ValueError('Transcript has no usable timed segments')
    return valid


def speech_signals(text: str) -> tuple[float,list[str]]:
    """Simple lexical flags; not semantic AI or a reliable virality predictor."""
    low=text.lower()
    signals={
        'question or curiosity': bool(re.search(r'\?|\bwhy\b|\bhow\b|\bwhat if\b', low)),
        'contrast or surprise': bool(re.search(r'\bbut\b|\bactually\b|\bnever\b|\bwait\b|\bsurpris', low)),
        'specific number': bool(re.search(r'\b\d+(?:[.,]\d+)?\b', low)),
        'high-energy wording': bool(re.search(r'!|\bunbelievable\b|\binsane\b|\bamazing\b|\bshocking\b', low)),
    }
    hits=[label for label,has in signals.items() if has]
    return min(1.,len(hits)/4),hits


def get_report(source: Path, relative_source: str, clip_length: int, count: int,
               transcript: list[dict] | None = None) -> dict:
    meta = json.loads(inspect(['ffprobe', '-v', 'error', '-show_entries',
                               'format=duration:stream=codec_type', '-of', 'json', str(source)]))
    streams = meta.get('streams', [])
    if not any(s.get('codec_type') == 'video' for s in streams):
        raise ValueError('Source does not contain video')
    length = float(meta['format']['duration'])
    if not math.isfinite(length) or length < 3:
        raise ValueError('Source must be at least 3 seconds long')
    if length > 1800:
        raise ValueError('To keep free-cloud costs predictable, only the first 30 minutes are analysed. Trim the source first.')
    has_audio = any(s.get('codec_type') == 'audio' for s in streams)
    scenes = parse_scene_events(source, length)
    silent = parse_silences(source, length) if has_audio else []
    window = min(float(clip_length), length)
    # Propose starts at speech boundaries and after pauses, in addition to a
    # coarse grid. This is still heuristic: we do not know the topic or punchline.
    increment=max(3., window / 2)
    anchors=[n*increment for n in range(int(math.ceil((length-window)/increment))+1)]
    anchors += [length-window]
    anchors += [x for _,x in silent if x < length-3]
    anchors += [x for x in scenes if x < length-3]
    if transcript:
        anchors += [seg['start'] for seg in transcript if seg['start']<length-3]
    anchors=sorted(set(round(max(0.,min(length-window,a)),1) for a in anchors))
    # More than 450 candidate windows is unnecessarily costly for a short clip.
    if len(anchors)>450:
        stride=math.ceil(len(anchors)/450)
        anchors=anchors[::stride]+[round(max(0,length-window),1)]
    scored=[]
    for start in sorted(set(anchors)):
        end=min(start+window,length)
        if transcript:
            # Avoid cutting speech in mid-sentence when an end boundary is near.
            nearby=[seg['end'] for seg in transcript if start+window*.83<=seg['end']<=end]
            if nearby:
                end=max(nearby)
        if end-start < 3:
            continue
        changes=sum(start <= t < end for t in scenes)
        silence=sum(overlap(start,end,a,b) for a,b in silent)
        active=max(0,1-silence/(end-start)) if has_audio else None
        # A silent first second is rarely a strong opener.
        opening_silence=sum(overlap(start,min(end,start+1.5),a,b) for a,b in silent)
        opener_score=(1-opening_silence/min(1.5,end-start)) if has_audio else 0.5
        scene_score=min(1,changes/max(1,(end-start)/9))
        base=(0.35 + 0.65*(active if active is not None else 0.5))*57 + scene_score*23 + opener_score*20
        text=' '.join(seg['text'] for seg in (transcript or []) if overlap(start,end,seg['start'],seg['end'])>0)
        hook_text=' '.join(seg['text'] for seg in (transcript or []) if overlap(start,min(end,start+5),seg['start'],seg['end'])>0)
        speech,flags=speech_signals(text) if text else (0,[])
        hook,opening_flags=speech_signals(hook_text) if hook_text else (0,[])
        boundary=any(abs(start-seg['start'])<.15 for seg in (transcript or []))
        score=round(min(100,base*.65+speech*17+hook*14+(4 if boundary else 0)) if transcript else base,1)
        clues=[]
        if active is not None: clues.append(f'{round(active*100)}% non-silent audio')
        if opener_score>.95: clues.append('clean audio opening')
        clues.append(f'{changes} detected scene changes')
        if boundary: clues.append('starts at transcript boundary')
        if hook>0: clues.append('hook cues early in clip')
        clues.extend(flags)
        scored.append({'start_seconds':round(start,2),'duration_seconds':round(end-start,2),
                       'score':score,'clues':clues[:8]})
    candidates = []
    for row in sorted(scored, key=lambda c: (-c['score'],c['start_seconds'])):
        # Max overlap 40% of shorter clip, to surface DIFFERENT moments.
        if any(overlap(row['start_seconds'], row['start_seconds']+row['duration_seconds'],
                       picked['start_seconds'], picked['start_seconds']+picked['duration_seconds']) >
               0.4*min(row['duration_seconds'], picked['duration_seconds']) for picked in candidates):
            continue
        candidates.append(row)
        if len(candidates)>=count:
            break
    return {'report_version':1,'source_path':relative_source,'source_duration_seconds':round(length,2),
            'analysis':'FFmpeg audio/scene heuristics plus pause-aligned starts, intro activity and optional transcript boundaries and lexical cues (not AI understanding or virality prediction)',
            'rights_confirmed':True, 'created_at':datetime.now(timezone.utc).isoformat(),
            'candidates':candidates}


def main() -> int:
    parser = argparse.ArgumentParser(description='Suggest clip windows from owned/licensed footage')
    parser.add_argument('--source', required=True, help='Media path relative to project root, inside assets/')
    parser.add_argument('--out', default='reports/clip-candidates.json')
    parser.add_argument('--duration', type=int, default=30, help='Candidate duration in seconds (10 to 90)')
    parser.add_argument('--count', type=int, default=5, help='Number of non-overlapping candidates (1 to 20)')
    parser.add_argument('--rights-confirmed', action='store_true', help='Confirm authorisation to use the source media')
    parser.add_argument('--transcript', default='', help='Optional time-aligned transcript JSON, inside assets/')
    opts = parser.parse_args()
    try:
        if not opts.rights_confirmed:
            raise ValueError('Confirm footage rights with --rights-confirmed')
        if not 10 <= opts.duration <= 90 or not 1 <= opts.count <= 20:
            raise ValueError('Duration must be 10–90 and count must be 1–20')
        source = (ROOT / opts.source).resolve()
        assets = (ROOT / 'assets').resolve()
        if not source.is_relative_to(assets) or not source.is_file():
            raise ValueError('Source must be an existing media file inside assets/')
        output = (ROOT / opts.out).resolve()
        if not output.is_relative_to(ROOT):
            raise ValueError('Report must be saved within project root')
        transcript=None
        if opts.transcript:
            transcript_file=(ROOT/opts.transcript).resolve()
            if not transcript_file.is_relative_to(assets) or not transcript_file.is_file() or transcript_file.suffix.lower()!='.json':
                raise ValueError('Transcript must be a JSON file inside assets/')
            transcript=load_transcript(transcript_file)
        report = get_report(source, source.relative_to(ROOT).as_posix(), opts.duration, opts.count, transcript)
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(report, indent=2)+'\n',encoding='utf-8')
        print(f"Analysed {report['source_duration_seconds']}s; wrote {len(report['candidates'])} candidates to {output}")
        for c in report['candidates']:
            print(f"  {c['start_seconds']:>7}s, {c['duration_seconds']}s, score {c['score']} — {', '.join(c['clues'])}")
        return 0
    except (RuntimeError, ValueError, OSError, KeyError, json.JSONDecodeError) as exc:
        print(f'Clip scout error: {exc}',file=sys.stderr)
        return 1

if __name__=='__main__':
    sys.exit(main())
