#!/usr/bin/env python3
"""Offline visual storyboard renderer for owned/licensed original Shorts.

Creates illustrated title-card scenes from user-supplied titles and optional local
images. No AI image generation, online image search, or copyright assumptions.
Requires the free Pillow package and FFmpeg.
"""
from __future__ import annotations
import hashlib
import math
import re
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PALETTES = {
    'aurora': ((8, 19, 43), (22, 77, 112), (111, 226, 222)),
    'ember': ((37, 18, 33), (91, 42, 66), (255, 191, 106)),
    'cosmos': ((18, 13, 45), (57, 36, 101), (183, 150, 255)),
}


def clean_title(value: str) -> str:
    if not isinstance(value, str):
        raise ValueError('Every scene must have a headline.')
    title = ' '.join(value.strip().split())
    if not title or len(title) > 95 or any(ord(c)<32 for c in title):
        raise ValueError('Scene headlines must be 1–95 printable characters.')
    if re.search(r'\[(RESEARCH|EXAMPLE|HOOK|PAYOFF|MAIN|END)\]', title, re.I):
        raise ValueError('Scene headline contains a research placeholder.')
    return title


def scene_media_path(raw: str) -> Path:
    p = (ROOT / raw).resolve()
    if not p.is_relative_to(ROOT):
        raise ValueError('Visual asset path must stay inside the project folder.')
    if p.suffix.lower() not in ('.png', '.jpg', '.jpeg', '.webp') or not p.is_file():
        raise ValueError(f'Visual image is missing or unsupported: {raw}')
    if p.stat().st_size > 25 * 1024 * 1024:
        raise ValueError('Each scene image must be smaller than 25 MiB.')
    return p


def build_scenes(job: dict) -> list[dict]:
    visuals = job.get('visuals') or {}
    rows = visuals.get('scenes') or []
    if rows and (not isinstance(rows, list) or len(rows) > 8):
        raise ValueError('Use no more than eight storyboard scenes.')
    if not rows:
        # A lightweight storyboard outline from supplied original narration,
        # not AI scene understanding or factual research.
        script = re.sub(r'\[[^\]]+\]', '', str(job.get('script') or ''))
        sentences = [x.strip() for x in re.split(r'(?<=[.!?])\s+|\n+', script) if x.strip()]
        if not sentences:
            sentences = [str(job.get('title') or 'Your story')]
        # Build four beats from sentences rather than repeat the entire script.
        count = min(5, max(2, len(sentences)))
        rows = [{'headline': sentences[min(len(sentences)-1, round(i * (len(sentences)-1) / max(1, count-1)))][:90]} for i in range(count)]
    output = []
    for i,row in enumerate(rows):
        if not isinstance(row, dict):
            raise ValueError(f'Scene {i+1} must be an object.')
        headline=clean_title(row.get('headline', ''))
        image_path=row.get('image_path') or ''
        if image_path:
            if not isinstance(image_path,str) or len(image_path)>250:
                raise ValueError('Invalid image path.')
            scene_media_path(image_path)
        start=row.get('start_seconds')
        if start is not None:
            if isinstance(start,bool) or not isinstance(start,(int,float)) or not math.isfinite(start) or start<0:
                raise ValueError('Scene start_seconds must be a nonnegative number.')
        output.append({'headline':headline, 'image_path':image_path, 'start_seconds':start})
    return output


def font(size: int, *, bold: bool = False):
    from PIL import ImageFont
    preferred = [
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        'C:/Windows/Fonts/arialbd.ttf' if bold else 'C:/Windows/Fonts/arial.ttf',
        '/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf',
    ]
    for p in preferred:
        try: return ImageFont.truetype(p, size)
        except OSError: pass
    return ImageFont.load_default()


def wrap_lines(draw, text, fnt, max_width=595, max_lines=4):
    words=text.split(); lines=[]; current=''
    for word in words:
        candidate=(current+' '+word).strip()
        if draw.textbbox((0,0),candidate,font=fnt)[2]>max_width and current:
            lines.append(current);current=word
        else:current=candidate
    if current: lines.append(current)
    if len(lines)>max_lines:
        lines=lines[:max_lines]
        while draw.textbbox((0,0),lines[-1]+'…',font=fnt)[2]>max_width and len(lines[-1])>4:
            lines[-1]=lines[-1][:-2]
        lines[-1]+='…'
    return lines


def draw_scene(scene: dict, i: int, count: int, theme: str, dest: Path, *, illustrated=False, cover=False, title=''):
    from PIL import Image,ImageDraw,ImageFilter
    dark,mid,accent=PALETTES[theme]
    w,h=720,1280
    seed=int.from_bytes(hashlib.sha256((scene['headline']+str(i)).encode()).digest()[:8],'little')
    pixels=Image.new('RGB',(w,h))
    # Smooth vertical gradient that is attractive without any external footage.
    for y in range(h):
        t=y/(h-1)
        glow=0.20 + 0.62*math.exp(-((t-0.38)/0.37)**2)
        col=tuple(round(a*(1-glow)+b*glow) for a,b in zip(dark,mid))
        ImageDraw.Draw(pixels).line((0,y,w,y),fill=col)
    base=pixels.convert('RGBA')
    if scene['image_path']:
        pic=Image.open(scene_media_path(scene['image_path'])).convert('RGB')
        scale=max(w/pic.width,h/pic.height)
        pic=pic.resize((math.ceil(pic.width*scale),math.ceil(pic.height*scale)),Image.Resampling.LANCZOS)
        x=(pic.width-w)//2;y=(pic.height-h)//2
        base=pic.crop((x,y,x+w,y+h)).convert('RGBA')
        dim=Image.new('RGBA',(w,h),(4,10,26,0 if illustrated else 180))
        base=Image.alpha_composite(base,dim)
    if illustrated:
        # Image-first story: full-bleed illustration and no repeated scene
        # headlines, labels or branding over spoken-word captions.
        # Only the COVER carries the story title. All subsequent scenes
        # contain illustrations only; captions are added by render.py.
        from PIL import ImageDraw
        if cover:
            band=Image.new('RGBA',(w,h),(0,0,0,0))
            draw=ImageDraw.Draw(band)
            draw.rounded_rectangle((38,150,682,520),radius=26,fill=(3,8,24,172))
            base=Image.alpha_composite(base,band)
            d=ImageDraw.Draw(base)
            heading=title[:110] or scene['headline']
            fnt=font(60 if len(heading)<65 else 46,bold=True)
            lines=wrap_lines(d,heading,fnt,max_width=570,max_lines=4)
            y=200
            for line in lines:
                d.text((72,y),line,font=fnt,fill=(255,255,255,255))
                y+=77 if len(heading)<65 else 65
        # Minimal transparent gradient at bottom is acceptable for legible
        # subtitle contrast; never write duplicate text onto images.
        else:
            shade=Image.new('RGBA',(w,h),(0,0,0,0))
            sd=ImageDraw.Draw(shade)
            for y in range(920,h):
                alpha=round(115*(y-920)/(h-920))
                sd.line((0,y,w,y),fill=(0,0,0,alpha))
            base=Image.alpha_composite(base,shade)
        dest.parent.mkdir(parents=True,exist_ok=True)
        base.convert('RGB').save(dest,optimize=True)
        return
    # Geometric subject motifs make scenes visibly different even without photos.
    accents=Image.new('RGBA',(w,h),(0,0,0,0));d=ImageDraw.Draw(accents)
    cx=430+(seed%145)-72;cy=660+((seed>>7)%170)-85
    for r,alpha,stroke in [(260,20,0),(185,36,0),(120,60,0),(235,85,3),(145,80,3)]:
        d.ellipse((cx-r,cy-r,cx+r,cy+r),fill=accent+(alpha,) if stroke==0 else None,
                  outline=accent+(alpha,) if stroke else None,width=stroke or 1)
    for k in range(8):
        xx=40+k*92 + int((seed>>k)&12)
        d.line((xx,585,xx,890),fill=accent+(16,),width=2)
    d.rounded_rectangle((54,64,666,122),radius=24,fill=(0,0,0,65),outline=accent+(90,),width=2)
    d.rounded_rectangle((52,1126,669,1142),radius=8,fill=(255,255,255,45))
    d.rounded_rectangle((52,1126,52+round(617*(i+1)/count),1142),radius=8,fill=accent+(245,))
    base=Image.alpha_composite(base,accents)
    dd=ImageDraw.Draw(base)
    dd.text((72,82),f'ORIGINAL  /  SCENE {i+1:02d} OF {count:02d}',font=font(21,bold=True),fill=(235,247,255,225))
    headline=scene['headline']
    headline_font=font(64 if len(headline)<70 else 52,bold=True)
    lines=wrap_lines(dd,headline,headline_font)
    # Soft black shadow ensures visual labels remain legible over personal images.
    yy=235
    for line in lines:
        dd.text((76,yy+3),line,font=headline_font,fill=(0,0,0,195),stroke_width=3,stroke_fill=(0,0,0,140))
        dd.text((72,yy),line,font=headline_font,fill=(255,255,255,250))
        yy+=75 if len(headline)<70 else 67
    dd.rounded_rectangle((70,885,245,936),radius=15,fill=accent+(235,))
    dd.text((89,899),'THE STORY',font=font(19,bold=True),fill=dark+(255,))
    dd.text((68,1184),'✦  SHORTS STUDIO',font=font(22,bold=True),fill=(232,241,255,220))
    # Keep bottom centre free for speech captions drawn later by ASS.
    dest.parent.mkdir(parents=True,exist_ok=True)
    base.convert('RGB').save(dest,optimize=True)


def create_story_video(job: dict, runtime: float, folder: Path) -> Path:
    """Return a silent MP4 with scene changes and subtle motion.

    Writes to a temp folder belonging to caller. It is subsequently merged with
    captions/narration by the regular render function.
    """
    try:
        import PIL  # noqa F401
    except ImportError as exc:
        raise ValueError('Storyboard mode needs free Pillow: python -m pip install Pillow') from exc
    visuals=job.get('visuals') or {}
    theme=visuals.get('theme','aurora')
    if theme not in PALETTES:
        raise ValueError('Visual theme must be aurora, ember or cosmos.')
    transition=visuals.get('transition','fade')
    if transition not in ('fade','cut'):
        raise ValueError('Visual transition must be fade or cut.')
    scenes=build_scenes(job)
    illustrated=visuals.get('mode')=='illustrated'
    count=len(scenes)
    if illustrated:
        if count<2:
            raise ValueError('Illustrated stories need a cover image and at least one story scene image.')
        if any(not row['image_path'] for row in scenes):
            raise ValueError('Illustrated scenes require real, owned/licensed scene images. Text cards are not substituted.')

    if count<1 or count>8:
        raise ValueError('Storyboard requires 1–8 scenes.')
    if runtime/count<1.2:
        raise ValueError('Scenes would be too short; use fewer scenes or a longer duration.')
    if not shutil.which('ffmpeg'):
        raise ValueError('FFmpeg is required for the scene renderer.')
    t=0.33 if transition=='fade' and count>1 else 0
    if illustrated:
        intro=float(visuals.get('intro_seconds',2.0))
        if not 1.2<=intro<=4.0 or runtime-intro<1.2*(count-1):
            raise ValueError('Need 1.2–4 second cover and at least 1.2 seconds per illustrated scene.')
        starts=[row['start_seconds'] for row in scenes[1:]]
        if any(x is not None for x in starts):
            if any(x is None for x in starts) or abs(starts[0])>0.01:
                raise ValueError('Timed illustrated story scenes need a start time for each beat; first beat starts at 0.')
            if any(b-a<1.2 for a,b in zip(starts,starts[1:])):
                raise ValueError('Leave at least 1.2 seconds between story scene start times.')
            if runtime-intro-starts[-1]<1.2:
                raise ValueError('Final story scene starts too late for the narration length.')
            scene_lengths=[intro]+[b-a for a,b in zip(starts,starts[1:]+[runtime-intro])]
        else:
            scene_lengths=[intro]+[(runtime-intro)/(count-1)]*(count-1)
    else:
        scene_lengths=[runtime/count]*count
    for i,scene in enumerate(scenes):
        draw_scene(scene,i,count,theme,folder/f'scene-{i:02}.png',
                   illustrated=illustrated,cover=illustrated and i==0,title=str(job.get('title') or 'Our story'))
    files=[]
    for i in range(count):
        scene_runtime=scene_lengths[i]+(t if i<count-1 else 0)
        still=folder/f'scene-{i:02}.png'
        clip=folder/f'part-{i:02}.mp4'
        # Encode each motion scene with a true CFR before applying crossfades.
        # Many FFmpeg builds cannot xfade directly from zoompan filter outputs.
        z=f"min(zoom+0.00025,1.05)" if i%2==0 else "max(1.05-0.00025*on,1.0)"
        vf=f"scale=756:1344,zoompan=z='{z}':d=1:x='(iw-iw/zoom)/2':y='(ih-ih/zoom)/2':s=720x1280:fps=30,fps=30,format=yuv420p"
        cmd=['ffmpeg','-hide_banner','-loglevel','error','-y',
             '-loop','1','-framerate','30','-i',str(still),'-t',f'{scene_runtime:.5f}',
             '-vf',vf,'-r','30','-an','-c:v','libx264','-preset','veryfast',
             '-crf','27','-pix_fmt','yuv420p',str(clip)]
        result=subprocess.run(cmd,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,timeout=900)
        if result.returncode:
            raise ValueError('Scene encoding failed: '+result.stderr[-700:])
        files.append(clip)
    result=folder/'storyboard.mp4'
    if count==1:
        shutil.copyfile(files[0],result)
        return result
    cmd=['ffmpeg','-hide_banner','-loglevel','error','-y']
    for f in files: cmd+=['-i',str(f)]
    graph=[]
    if t:
        acc='0:v'
        for i in range(1,count):
            target=f'joined{i}'
            graph.append(f'[{acc}][{i}:v]xfade=transition=fade:duration={t}:offset={sum(scene_lengths[:i]):.5f}[{target}]')
            acc=target
    else:
        acc='joined';graph.append(''.join(f'[{i}:v]' for i in range(count))+f'concat=n={count}:v=1:a=0[{acc}]')
    cmd+=['-filter_complex',';'.join(graph),'-map',f'[{acc}]','-t',f'{runtime:.4f}',
          '-r','30','-c:v','libx264','-preset','veryfast','-crf','27',
          '-pix_fmt','yuv420p','-movflags','+faststart',str(result)]
    process=subprocess.run(cmd,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,timeout=900)
    if process.returncode:
        raise ValueError('Storyboard renderer failed: '+process.stderr[-900:])
    return result

