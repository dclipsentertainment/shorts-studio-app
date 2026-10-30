#!/usr/bin/env python3
"""End-to-end DClips Phase 1: authorised original audio, headline, render, QA.
Runs offline with FFmpeg and free stdlib. No uploads, user footage or credentials.
"""
from __future__ import annotations
import json
import subprocess
import sys
import time
import uuid
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
import local_studio
from quality_check import check_video

def execute(args):
    result=subprocess.run(args,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
    if result.returncode:
        raise AssertionError((result.stderr or '')[-1000:])

def main():
    filename=uuid.uuid4().hex+".mp4"
    source=local_studio.MEDIA/filename
    task_id=None
    try:
        source.parent.mkdir(parents=True,exist_ok=True)
        execute(["ffmpeg","-hide_banner","-loglevel","error","-y",
                 "-f","lavfi","-i","color=c=blue:s=720x1280:r=15:d=5",
                 "-f","lavfi","-i","sine=frequency=370:sample_rate=44100:duration=5",
                 "-t","5","-c:v","libx264","-preset","ultrafast","-pix_fmt","yuv420p",
                 "-c:a","aac","-shortest",str(source)])
        job={"version":1,"kind":"clip","title":"Owned demo gameplay reaction",
             "rights_confirmed":True,"duration":4,"source":{"path":"user-data/media/"+filename,"start_seconds":0},
             "narration":{"mode":"none"},"script":"","captions":True,
             "editing":{"caption_style":"hook","hook_text":"A surprising ending","crop_focus":"center","motion":"none","background":"midnight"}}
        try:
            local_studio.validate_job({**job,"rights_confirmed":False})
            raise AssertionError("Missing permission should block rendering")
        except ValueError: pass
        local_studio.validate_job(job)
        local_studio.RENDERS.mkdir(parents=True,exist_ok=True)
        task_id=local_studio.begin_task(job,"render")
        until=time.monotonic()+105
        while time.monotonic()<until:
            with local_studio.LOCK:
                status=dict(local_studio.TASKS[task_id])
            if status.get("status") in ("done","failed"):break
            time.sleep(.4)
        else: raise AssertionError("Local render timed out")
        assert status.get("status")=="done",status
        report=status.get("quality_report")
        assert isinstance(report,dict),status
        assert report["status"]=="pass",report
        assert report["width"]==720 and report["height"]==1280,report
        assert report["audio_codec"]=="aac","Original stream audio was lost"
        assert report["duration_seconds"]>=3.5,report
        assert len(report["sha256"])==64,report
        output=ROOT/status["video_url"].lstrip("/")
        # /output is a virtual server route; underlying files reside under user-data/renders.
        name=status["video_url"].rsplit("/",1)[-1]
        actual=local_studio.RENDERS/task_id/name
        assert actual.is_file() and actual.stat().st_size>10000,actual
        assert (local_studio.RENDERS/task_id/"quality-report.json").is_file()
        print("PASS: rights preflight, owned source, hook-only captions, original audio, render, SHA-256 QA and review output")
    finally:
        source.unlink(missing_ok=True)
        if task_id:
            import shutil
            shutil.rmtree(local_studio.RENDERS/task_id,ignore_errors=True)
            (local_studio.RENDERS/(task_id+".json")).unlink(missing_ok=True)

if __name__=="__main__":
    main()
