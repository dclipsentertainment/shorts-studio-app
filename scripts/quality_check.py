#!/usr/bin/env python3
"""Technical MP4 quality gate. Does NOT check truth, permission or legal rights."""
from __future__ import annotations
import argparse
import hashlib
import json
import math
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path


def cmd(args):
    p=subprocess.run(args,text=True,capture_output=True,check=False)
    if p.returncode:
        raise RuntimeError((p.stderr or '')[-700:] or 'FFmpeg command failed')
    return p.stdout,p.stderr


def check_video(path: Path) -> dict:
    if path.suffix.lower() != '.mp4' or not path.is_file():
        raise ValueError('Provide an existing MP4 file')
    if path.stat().st_size>1_000_000_000:
        raise ValueError('Video too large for free QA (>1GB)')
    raw,_=cmd(['ffprobe','-v','error','-show_format','-show_streams','-of','json',str(path)])
    info=json.loads(raw)
    video=next((x for x in info.get('streams',[]) if x.get('codec_type')=='video'),None)
    audio=next((x for x in info.get('streams',[]) if x.get('codec_type')=='audio'),None)
    if not video:
        raise ValueError('Missing video stream')
    dur=float(info.get('format',{}).get('duration') or 0)
    width=int(video.get('width') or 0);height=int(video.get('height') or 0)
    errors=[];warnings=[]
    if not math.isfinite(dur) or not 3<=dur<=180:errors.append('Duration outside 3–180 second target')
    if width<540 or height<960 or width*16!=height*9:errors.append('Video is not portrait 9:16 at 540x960 or above')
    if video.get('codec_name')!='h264':warnings.append('H.264 is recommended for broad compatibility')
    if video.get('pix_fmt') not in ('yuv420p','yuvj420p'):warnings.append('Use 4:2:0 8-bit pixel format for compatibility')
    if not audio:warnings.append('No audio stream: verify this is intentional')
    elif audio.get('codec_name')!='aac':warnings.append('AAC audio is recommended')
    # This checks file bytes, not whether similar content was posted elsewhere.
    digest=hashlib.sha256()
    with path.open('rb') as stream:
        for block in iter(lambda:stream.read(1024*1024),b''):
            digest.update(block)
    return {'quality_report_version':1,'generated_at':datetime.now(timezone.utc).isoformat(),
            'file':path.name,'sha256':digest.hexdigest(),'size_bytes':path.stat().st_size,
            'duration_seconds':round(dur,2),'width':width,'height':height,
            'video_codec':video.get('codec_name'),'audio_codec':audio.get('codec_name') if audio else None,
            'status':'fail' if errors else ('review' if warnings else 'pass'),
            'errors':errors,'warnings':warnings,
            'human_review':['Verify source and music rights','Verify factual claims','Watch the whole video and check caption timing/crop','Review platform policies before posting']}


def main():
    p=argparse.ArgumentParser(description='Technical quality review for finished MP4s')
    p.add_argument('--video',type=Path,required=True)
    p.add_argument('--out',type=Path,default=None)
    opts=p.parse_args()
    try:
        report=check_video(opts.video)
        body=json.dumps(report,indent=2)+'\n'
        if opts.out:
            opts.out.parent.mkdir(parents=True,exist_ok=True)
            opts.out.write_text(body,encoding='utf-8')
        print(body)
        return 1 if report['errors'] else 0
    except (OSError,RuntimeError,ValueError,json.JSONDecodeError) as e:
        print(f'Quality check failed: {e}',file=sys.stderr)
        return 2


if __name__=='__main__':
    sys.exit(main())
