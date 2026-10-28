#!/usr/bin/env python3
"""Generate locally timed subtitle segments for Shorts Studio from creator-supplied media.

Free speech recognition is provided by the optional faster-whisper package.
A model downloads on first use. No video is uploaded to Shorts Studio or ChatGPT.
Output times are relative to the selected clip, matching render.py caption_segments.
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
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def project_file(raw: str) -> Path:
    if not isinstance(raw, str) or not raw.strip():
        raise ValueError('Missing source media path.')
    candidate = Path(raw)
    path = (candidate if candidate.is_absolute() else ROOT / candidate).resolve()
    if not path.is_file():
        raise ValueError(f'Cannot read media file: {raw}')
    return path

def timestamp(seconds: float) -> str:
    ms = max(0, round(seconds * 1000))
    hours, remain = divmod(ms, 3600000)
    mins, remain = divmod(remain, 60000)
    secs, milli = divmod(remain, 1000)
    return f'{hours:02d}:{mins:02d}:{secs:02d},{milli:03d}'

def segment_words(words: list[dict], end_limit: float, max_words: int = 4) -> list[dict]:
    # Output grouped word-level timestamps, checked for renderer compatibility.
    result, group = [], []
    def flush():
        nonlocal group
        if not group:
            return
        a, b = group[0]['start'], group[-1]['end']
        text = ' '.join(x['word'] for x in group).strip()
        if text and b > a:
            result.append({'start_seconds': round(a, 3), 'end_seconds': round(b, 3), 'text': text[:160]})
        group = []
    for w in words:
        a, b = float(w['start']), float(w['end'])
        t = re.sub(r'\s+', ' ', str(w['word'])).strip()
        if not (math.isfinite(a) and math.isfinite(b) and 0 <= a < b <= end_limit + 0.1 and t):
            continue
        if group and (len(group) >= max_words or b - group[0]['start'] > 2.7 or a - group[-1]['end'] > .65 or len(' '.join(x['word'] for x in group+[{'word':t}])) > 65):
            flush()
        if result and a < result[-1]['end_seconds']:
            a = result[-1]['end_seconds']
        if group and a < group[-1]['end']:
            a = group[-1]['end']
        if b <= a:
            continue
        group.append({'start':a, 'end':min(b,end_limit), 'word':t})
        if t.endswith(('.', '!', '?')):
            flush()
    flush()
    return result[:250]

def job_source(file: Path) -> tuple[Path, float, float]:
    payload = json.loads(file.read_text(encoding='utf-8'))
    if not isinstance(payload, dict) or not payload.get('rights_confirmed'):
        raise ValueError('Render job requires rights_confirmed=true before transcription.')
    if payload.get('narration', {}).get('mode') == 'file' and payload['narration'].get('audio_path'):
        raw = payload['narration']['audio_path']
        start = 0.0
    else:
        source = payload.get('source') or {}
        raw = source.get('path')
        start = float(source.get('start_seconds') or 0)
    if not raw:
        raise ValueError('Job needs a local media source path (or voice audio path). Remote links are not supported for transcription.')
    duration = float(payload.get('duration') or 0)
    return project_file(raw), start, duration

def transcribe(media: Path, clip_start: float, duration: float, model_name: str, language: str | None, max_words: int) -> tuple[list[dict], str | None]:
    if shutil.which('ffmpeg') is None:
        raise RuntimeError('FFmpeg not found. Add FFmpeg to PATH or run through GitHub Actions.')
    if not (math.isfinite(clip_start) and clip_start >= 0 and math.isfinite(duration) and 3 <= duration <= 180):
        raise ValueError('Clip start must be >= 0 and duration must be 3–180 seconds.')
    try:
        from faster_whisper import WhisperModel
    except ImportError as exc:
        raise RuntimeError('faster-whisper is not installed. Run: python -m pip install faster-whisper (a model downloads on first use)') from exc
    with tempfile.TemporaryDirectory(prefix='shorts_transcribe_') as folder:
        wav=Path(folder)/'clip.wav'
        cmd=['ffmpeg','-nostdin','-hide_banner','-loglevel','error','-y','-ss',str(clip_start),'-i',str(media),'-t',str(duration),'-vn','-ar','16000','-ac','1','-c:a','pcm_s16le',str(wav)]
        run=subprocess.run(cmd, text=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
        if run.returncode or not wav.exists() or wav.stat().st_size < 1024:
            raise RuntimeError(f'Could not extract speech audio: {run.stderr.strip()[-500:]}')
        engine=WhisperModel(model_name, device='cpu', compute_type='int8')
        transcript, info=engine.transcribe(str(wav), language=language, beam_size=5, word_timestamps=True, vad_filter=True)
        words=[]
        for sentence in transcript:
            for w in (sentence.words or []):
                words.append({'start':w.start,'end':w.end,'word':w.word})
        cues=segment_words(words, duration, max_words)
        return cues, getattr(info,'language',None)

def main() -> int:
    parser=argparse.ArgumentParser(description='Speech-to-text subtitles for your licensed Short/Reel')
    source=parser.add_mutually_exclusive_group(required=True)
    source.add_argument('--media', help='Path to your local audio/video file')
    source.add_argument('--job', help='Shorts Studio JSON render job (source path and trim from job)')
    parser.add_argument('--clip-start', type=float, default=0)
    parser.add_argument('--clip-duration', type=float, default=60)
    parser.add_argument('--model', choices=['tiny','base','small'],default='base',help='Base recommended; tiny faster, small more accurate but slower')
    parser.add_argument('--language',default='auto',help='Language code (en) or auto')
    parser.add_argument('--words-per-cue',type=int,default=4)
    parser.add_argument('--out',default='reports/transcription/shorts-captions',help='Output prefix for .json and .srt')
    args=parser.parse_args()
    try:
        if not 1 <= args.words_per_cue <= 8:
            raise ValueError('words-per-cue must be between 1 and 8')
        media,start,duration=job_source(project_file(args.job)) if args.job else (project_file(args.media),args.clip_start,args.clip_duration)
        cues,detected=transcribe(media,start,duration,args.model,None if args.language=='auto' else args.language,args.words_per_cue)
        if not cues:
            raise ValueError('No speech was detected. Try a clearer recording or a different language/model.')
        prefix=Path(args.out)
        prefix=prefix if prefix.is_absolute() else ROOT/prefix
        prefix.parent.mkdir(parents=True,exist_ok=True)
        (prefix.with_suffix('.json')).write_text(json.dumps({'caption_segments':cues,'source_name':media.name,'clip_start_seconds':start,'clip_duration_seconds':duration,'detected_language':detected,'model':args.model},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        (prefix.with_suffix('.srt')).write_text('\n'.join(f'{i}\n{timestamp(c["start_seconds"])} --> {timestamp(c["end_seconds"])}\n{c["text"]}\n' for i,c in enumerate(cues,1)),encoding='utf-8')
        print(f'Saved {len(cues)} timed cues to {prefix.with_suffix(".json")} and {prefix.with_suffix(".srt")} (detected language: {detected or "unknown"}).')
        return 0
    except Exception as err:
        print(f'Transcription error: {err}',file=sys.stderr)
        return 1

if __name__=='__main__':
    sys.exit(main())
