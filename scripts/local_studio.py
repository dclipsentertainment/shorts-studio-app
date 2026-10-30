#!/usr/bin/env python3
"""Local-only Shorts Studio rendering bridge (Python stdlib; optional FFmpeg).

Never binds to a public interface. Serves a narrow set of project files and provides
explicitly requested upload/transcription/render endpoints. No credentials or
third-party services, and no automatic downloads/publishing.
"""
from __future__ import annotations
import argparse
import json
import os
import re
import shutil
import sys
import threading
import time
import uuid
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, unquote

ROOT = Path(__file__).resolve().parents[1]
MEDIA = ROOT / 'user-data' / 'media'
RENDERS = ROOT / 'user-data' / 'renders'
MAX_MEDIA = 600 * 1024 * 1024
MAX_JSON = 160 * 1024
TASKS = {}
LOCK = threading.Lock()

CONTENT_TYPES = {'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.mp4':'video/mp4','.webm':'video/webm','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.png':'image/png','.json':'application/json; charset=utf-8','.srt':'text/plain; charset=utf-8'}
ALLOWED_STATIC = {'/','/index.html','/app.js','/github-usage.js','/styles.css','/assets/example-background.mp4'}
MEDIA_EXTS = {'.mp4','.mov','.m4v','.webm','.mp3','.wav','.m4a','.png','.jpg','.jpeg','.webp'}


def media_path(raw):
    if not isinstance(raw,str) or not raw.startswith('user-data/media/'):
        raise ValueError('Choose a video through the production flow first.')
    path=(ROOT/raw).resolve()
    if not path.is_relative_to(MEDIA.resolve()) or not path.is_file():
        raise ValueError('Uploaded media is missing.')
    return path


def validate_job(payload):
    if not isinstance(payload,dict) or payload.get('version') != 1:
        raise ValueError('Invalid Shorts Studio render job.')
    if payload.get('rights_confirmed') is not True:
        raise ValueError('Confirm rights to the video, audio and script before rendering.')
    kind=payload.get('kind')
    if kind not in ('original','clip'):
        raise ValueError('Unsupported project type.')
    try:
        duration=float(payload.get('duration') or 0)
        start=float((payload.get('source') or {}).get('start_seconds') or 0)
    except (TypeError,ValueError):
        raise ValueError('Invalid clip timing.')
    if not (3<=duration<=180 and 0<=start<=86400):
        raise ValueError('Clip must be 3–180 seconds with a nonnegative source start.')
    source=payload.get('source') or {}
    if source.get('url'):
        raise ValueError('Remote media URLs are disabled in the local one-click workflow.')
    if source.get('path'):
        s=source['path']
        if s!='assets/example-background.mp4':
            media_path(s)
    elif kind=='clip':
        raise ValueError('A clip needs an uploaded, authorised video source.')
    narration=payload.get('narration') or {}
    if narration.get('mode')=='file':
        media_path(narration.get('audio_path'))
    if len(str(payload.get('script') or ''))>10000:
        raise ValueError('Script is too long.')
    if len(payload.get('caption_segments') or [])>250:
        raise ValueError('Too many captions.')
    if len(str(payload.get('title') or ''))>200:
        raise ValueError('Title is too long.')
    if kind=='original' and (payload.get('visuals') or {}).get('mode') in ('storyboard','illustrated'):
        if source.get('path') or source.get('url'):
            raise ValueError('Choose generated background before using storyboard mode.')
        from storyboard import build_scenes
        build_scenes(payload)
    return payload


def begin_task(job, kind):
    task_id=uuid.uuid4().hex
    with LOCK:
        TASKS[task_id]={'status':'queued','kind':kind,'created_at':time.time(),'message':'Waiting for renderer'}
        # Avoid retaining large records indefinitely.
        for key in list(TASKS):
            if TASKS[key]['created_at'] < time.time()-86400:
                del TASKS[key]
    def work():
        with LOCK: TASKS[task_id].update(status='working',message='Processing locally…')
        try:
            if kind=='render':
                from render import render
                job_file = RENDERS / f'{task_id}.json'
                job_file.write_text(json.dumps(job,ensure_ascii=False),encoding='utf-8')
                result=render(job_file,RENDERS/task_id)
                value={'status':'done','message':'MP4 rendered successfully','video_url':f'/output/{task_id}/{result.name}'}
                if job.get('auto_align') and job.get('narration',{}).get('mode')=='basic':
                    with LOCK: TASKS[task_id]['message']='Aligning narration speech (optional model)…'
                    try:
                        from transcribe import transcribe
                        from render import duration_of
                        runtime=min(180,duration_of(result))
                        cues,detected=transcribe(result,0,runtime,'tiny',None,4)
                        if cues:
                            job['caption_segments']=cues
                            job_file.write_text(json.dumps(job,ensure_ascii=False),encoding='utf-8')
                            result=render(job_file,RENDERS/task_id)
                            value['caption_segments']=cues
                            value['message']='MP4 rendered with speech-aligned captions'
                        else: value['warning']='No speech was recognised; estimated captions kept.'
                    except Exception as exc:
                        value['warning']='Speech alignment was unavailable: '+str(exc)[-170:]

                # Return word-timed caption edits from the real generated narration.
                # The editor can correct them and re-render; they aren't preapproved.
                timed_sidecar=result.with_suffix('.captions.json')
                if timed_sidecar.is_file():
                    parsed=json.loads(timed_sidecar.read_text(encoding='utf-8'))
                    timed_cues=parsed.get('segments')
                    if isinstance(timed_cues,list) and 1<=len(timed_cues)<=250:
                        value['caption_segments']=timed_cues
                        value['caption_alignment']='estimated_from_spoken_audio'
                # Validate the finished file itself, not merely the input job.
                # These checks cover MP4 format/codec/resolution, not rights or originality.
                from quality_check import check_video
                quality = check_video(result)
                value['quality_report'] = quality
                (RENDERS / task_id / 'quality-report.json').write_text(
                    json.dumps(quality, indent=2) + '\n', encoding='utf-8')
                if quality['status'] == 'fail':
                    value['warning'] = 'Technical quality check failed; do not approve this video.'
                elif quality['warnings']:
                    value['warning'] = '; '.join(quality['warnings'][:3])

            else:
                from transcribe import transcribe
                path=media_path(job['media'])
                cues,lang=transcribe(path,float(job.get('start') or 0),float(job['duration']),job.get('model','tiny'),None,int(job.get('words_per_cue',4)))
                if not cues: raise ValueError('No recognisable speech detected in the selected audio.')
                value={'status':'done','message':f'{len(cues)} subtitle cues generated. Review them before rendering.','caption_segments':cues,'language':lang}
        except Exception as e:
            value={'status':'failed','message':str(e)[-700:]}
        with LOCK: TASKS[task_id].update(value)
    threading.Thread(target=work,daemon=True).start()
    return task_id


class Handler(BaseHTTPRequestHandler):
    server_version='ShortsStudioLocal/0.14'
    def log_message(self,fmt,*args):
        if not self.path.startswith('/api/task'): super().log_message(fmt,*args)
    def _safe_host(self):
        host=self.headers.get('Host','').split(':')[0].lower()
        return host in ('localhost','127.0.0.1')
    def _safe_origin(self):
        origin=self.headers.get('Origin','')
        if not origin: return True
        parsed=urlparse(origin)
        return parsed.scheme=='http' and parsed.hostname in ('localhost','127.0.0.1') and parsed.port==self.server.server_port
    def response(self,status,payload):
        data=json.dumps(payload,ensure_ascii=False).encode('utf-8')
        self.send_response(status);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Content-Length',str(len(data)))
        self.send_header('Cache-Control','no-store');self.send_header('X-Content-Type-Options','nosniff');self.end_headers();self.wfile.write(data)
    def do_GET(self):
        if not self._safe_host(): return self.response(403,{'error':'Invalid local host'})
        path=urlparse(self.path).path
        if path=='/api/status':
            return self.response(200,{'local':True,'ffmpeg':bool(shutil.which('ffmpeg') and shutil.which('ffprobe')),'transcriber':__import__('importlib').util.find_spec('faster_whisper') is not None,'face_tracking':__import__('importlib').util.find_spec('cv2') is not None})
        if path.startswith('/api/task/'):
            task=path.rsplit('/',1)[-1]
            with LOCK: result=dict(TASKS.get(task) or {})
            return self.response(200 if result else 404,result if result else {'error':'Unknown task'})
        if path.startswith('/output/'):
            parts=path.split('/')
            if len(parts)!=4 or not re.fullmatch('[0-9a-f]{32}',parts[2]) or not re.fullmatch('[a-z0-9-]{1,50}\\.mp4',parts[3]):
                return self.response(404,{'error':'Unknown video'})
            full=(RENDERS/parts[2]/parts[3]).resolve()
            if not full.is_relative_to(RENDERS) or not full.is_file(): return self.response(404,{'error':'Missing video'})
            return self.send_file(full)
        if path.startswith('/local-media/'):
            name=unquote(path.split('/')[-1])
            if not re.fullmatch('[0-9a-f]{32}\\.(mp4|mov|webm|m4v|mp3|wav|m4a|png|jpg|jpeg|webp)',name):
                return self.response(404,{'error':'Unknown media'})
            full=(MEDIA/name).resolve()
            if not full.is_file(): return self.response(404,{'error':'Missing media'})
            return self.send_file(full)
        if path not in ALLOWED_STATIC:return self.response(404,{'error':'Not found'})
        full=ROOT/('index.html' if path=='/' else path.lstrip('/'))
        return self.send_file(full)
    def send_file(self,path):
        try:
            stat=path.stat();size=stat.st_size;length=size;start=0;end=size-1
            range_header=self.headers.get('Range','')
            if range_header:
                m=re.fullmatch(r'bytes=(\d*)-(\d*)',range_header)
                if not m:return self.response(416,{'error':'Unsupported range'})
                if m.group(1): start=int(m.group(1));end=int(m.group(2)) if m.group(2) else end
                elif m.group(2): start=max(0,size-int(m.group(2)))
                if start>=size or end<start:return self.response(416,{'error':'Outside file'})
                end=min(end,size-1);length=end-start
                # inclusive range
                length+=1
            self.send_response(206 if range_header else 200)
            self.send_header('Content-Type',CONTENT_TYPES.get(path.suffix.lower(),'application/octet-stream'))
            self.send_header('Content-Length',str(length));self.send_header('Accept-Ranges','bytes')
            self.send_header('X-Content-Type-Options','nosniff');self.send_header('Cache-Control','no-store')
            if range_header:self.send_header('Content-Range',f'bytes {start}-{end}/{size}')
            self.end_headers()
            with path.open('rb') as f:
                f.seek(start)
                remaining=length
                while remaining:
                    chunk=f.read(min(65536,remaining))
                    if not chunk:break
                    self.wfile.write(chunk);remaining-=len(chunk)
        except (BrokenPipeError, ConnectionResetError): pass
    def do_POST(self):
        if not self._safe_host() or not self._safe_origin() or self.headers.get('X-Shorts-Studio')!='local-0.12':
            return self.response(403,{'error':'Only local Shorts Studio can use this endpoint.'})
        path=urlparse(self.path).path
        if path not in ('/api/upload','/api/render','/api/transcribe'):
            return self.response(404,{'error':'Unknown action'})
        try: length=int(self.headers.get('Content-Length','0'))
        except ValueError: length=0
        if length<=0 or length>(MAX_MEDIA if path=='/api/upload' else MAX_JSON):
            return self.response(413,{'error':'Request is empty or too large.'})
        if path=='/api/upload':
            ext=Path(unquote(self.headers.get('X-Media-Name',''))).suffix.lower()
            if ext not in MEDIA_EXTS:return self.response(400,{'error':'Use a recognised media file type.'})
            if ext in ('.png','.jpg','.jpeg','.webp') and length>25*1024*1024:
                return self.response(413,{'error':'Scene images must be smaller than 25 MiB.'})
            if not shutil.which('ffprobe'):return self.response(503,{'error':'FFprobe is required for local uploads.'})
            MEDIA.mkdir(parents=True,exist_ok=True)
            name=f'{uuid.uuid4().hex}{ext}'
            dest=MEDIA/name
            try:
                with dest.open('xb') as f:
                    remain=length
                    while remain:
                        chunk=self.rfile.read(min(1024*1024,remain))
                        if not chunk:break
                        f.write(chunk);remain-=len(chunk)
                if remain:raise ValueError('Incomplete upload.')
                from render import probe
                info=probe(dest)
                if not any(x.get('codec_type') in ('audio','video') for x in info.get('streams',[])):
                    raise ValueError('Not a playable media file.')
            except Exception as e:
                dest.unlink(missing_ok=True)
                return self.response(400,{'error':str(e)[-400:]})
            return self.response(200,{'path':f'user-data/media/{name}','preview_url':f'/local-media/{name}'})
        if self.headers.get('Content-Type','').split(';')[0]!='application/json':
            return self.response(415,{'error':'Send JSON content.'})
        try:
            obj=json.loads(self.rfile.read(length))
            if path=='/api/render':
                validate_job(obj)
                if not shutil.which('ffmpeg') or not shutil.which('ffprobe'):raise ValueError('FFmpeg and ffprobe must be on PATH.')
                RENDERS.mkdir(parents=True,exist_ok=True)
                return self.response(202,{'task_id':begin_task(obj,'render')})
            if not isinstance(obj,dict) or obj.get('media') is None: raise ValueError('Choose licensed source audio/video.')
            media_path(obj['media'])
            if obj.get('model') not in ('tiny','base','small'): raise ValueError('Unknown model.')
            if not (3<=float(obj.get('duration',0))<=180):raise ValueError('Invalid duration.')
            if not shutil.which('ffmpeg'):raise ValueError('FFmpeg is missing.')
            if __import__('importlib').util.find_spec('faster_whisper') is None:raise ValueError('Optional faster-whisper is not installed.')
            return self.response(202,{'task_id':begin_task(obj,'transcribe')})
        except Exception as e: return self.response(400,{'error':str(e)[-700:]})


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--port',type=int,default=8765)
    parser.add_argument('--open',action='store_true')
    args=parser.parse_args()
    MEDIA.mkdir(parents=True,exist_ok=True)
    RENDERS.mkdir(parents=True,exist_ok=True)
    server=ThreadingHTTPServer(('127.0.0.1',args.port),Handler)
    print(f'Shorts Studio local production server: http://127.0.0.1:{args.port}/',flush=True)
    print('Private local machine only. Close this window to stop the server.',flush=True)
    if args.open:threading.Timer(.5,lambda:webbrowser.open(f'http://127.0.0.1:{args.port}/')).start()
    try:server.serve_forever()
    except KeyboardInterrupt:pass
    finally:server.server_close()

if __name__=='__main__':main()
