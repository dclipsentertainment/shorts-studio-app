#!/usr/bin/env python3
"""Check image-first DClips stories using original synthetic artwork/audio.

This test demonstrates the rendering pipeline, not the editorial quality of
real historical illustrations. It never uploads or distributes the video.
"""
from __future__ import annotations
import json
import math
import shutil
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"scripts"))
from storyboard import build_scenes
from render import render
from quality_check import check_video

def cmd(args):
    p=subprocess.run(args,stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=False)
    if p.returncode:
        raise AssertionError(p.stderr.decode(errors="replace")[-1200:])
    return p.stdout

def main():
    from PIL import Image,ImageDraw
    with tempfile.TemporaryDirectory(prefix="dclips-illustrated-",dir=ROOT) as td:
        folder=Path(td)
        paths=[]
        for i,color in enumerate([(35,76,155),(32,136,90),(180,90,45)]):
            im=Image.new("RGB",(720,1280),color)
            draw=ImageDraw.Draw(im)
            draw.ellipse((120+i*55,300,600,820),fill=tuple(min(255,v+35) for v in color))
            path=folder/f"frame{i}.png"
            im.save(path)
            paths.append(path.relative_to(ROOT).as_posix())
        audio=folder/"voice.wav"
        cmd(["espeak-ng","-v","en-us","-s","155","-w",str(audio),
             "As a child, he studied in Rome. Years later, he commanded an army."])
        scenes=[
            {"headline":"The Life of Julius Caesar","image_path":paths[0]},
            {"headline":"Caesar studies as a child","image_path":paths[1],"start_seconds":0},
            {"headline":"Caesar leads a Roman army","image_path":paths[2],"start_seconds":3.0},
        ]
        job={"version":1,"kind":"original","title":"The Life of Julius Caesar",
            "rights_confirmed":True,"duration":10,"source":{"path":None,"url":None,"start_seconds":0},
            "narration":{"mode":"file","audio_path":audio.relative_to(ROOT).as_posix()},
            "script":"As a child, he studied in Rome. Years later, he commanded an army.",
            "caption_segments":[
                {"start_seconds":2.2,"end_seconds":4.5,"text":"As a child, he studied in Rome."},
                {"start_seconds":5.8,"end_seconds":8.6,"text":"Years later, he commanded an army."},
            ],
            "captions":True,
            "editing":{"caption_style":"kinetic","caption_x":50,"caption_y":75,
                       "crop_focus":"center","background":"plum"},
            "visuals":{"mode":"illustrated","intro_seconds":2,
                       "theme":"aurora","transition":"fade","scenes":scenes}}
        # In illustrated mode, missing scene art must fail rather than
        # quietly generating the previous headline-on-background cards.
        bad=json.loads(json.dumps(job))
        bad["visuals"]["scenes"][1]["image_path"]=""
        try:
            from storyboard import create_story_video
            create_story_video(bad,10,folder/"missing-images")
        except ValueError as err:
            assert "require real" in str(err),err
        else:
            raise AssertionError("Illustrated scene without image must be blocked")
        file=folder/"job.json"
        file.write_text(json.dumps(job))
        video=render(file,folder/"finished")
        check=check_video(video)
        assert check["status"]=="pass",check
        assert check["width"]==720 and check["height"]==1280
        assert check["audio_codec"]=="aac"
        # 2-second visual cover then childhood then general scene:
        from PIL import Image as Img
        pictures=[]
        for second in [0.8,4.0,8.0]:
            frame=folder/f"snap-{second}.png"
            cmd(["ffmpeg","-hide_banner","-loglevel","error","-y",
                 "-ss",str(second),"-i",str(video),"-frames:v","1",str(frame)])
            pic=Img.open(frame)
            pictures.append(pic.getpixel((350,650)))
        assert len(set(pictures))==3,f"Scene changes did not produce three different visual chapters: {pictures}"
        # Audio begins AFTER the visual title, not during the introduction.
        def rms(start,length=1.0):
            pcm=cmd(["ffmpeg","-hide_banner","-loglevel","error",
                     "-ss",str(start),"-i",str(video),"-t",str(length),
                     "-vn","-ac","1","-ar","16000","-f","s16le","pipe:1"])
            import array
            vals=array.array("h");vals.frombytes(pcm[:len(pcm)//2*2])
            return math.sqrt(sum(x*x for x in vals)/len(vals)) if vals else 0
        pre,spoken=rms(.4),rms(2.8)
        assert pre<25,f"Title cover has unexpectedly audible narration: RMS={pre:.1f}"
        assert spoken>50,f"Narration missing after title: RMS={spoken:.1f}"
        print("PASS: 2-second image cover, scene-specific images, no synthetic title cards, timed text and delayed narration")
        print(f"PASS: {check['duration_seconds']}s, {check['width']}x{check['height']}, AAC audio, scene colours={pictures}")

if __name__=="__main__":
    main()
