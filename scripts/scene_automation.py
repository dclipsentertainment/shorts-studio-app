#!/usr/bin/env python3
"""Offline story beat timing and opt-in image generation for DClips.

Planning never calls an API. Image generation is a separately requested action,
requires OPENAI_API_KEY on the LOCAL server, and never stores credentials.
"""
from __future__ import annotations
import base64
import hashlib
import json
import math
import os
import re
import uuid
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
MEDIA = ROOT / 'user-data' / 'media'
MODEL = 'gpt-image-2.5-flare'
MAX_SCENES = 8
WORD = re.compile(r"[\w]+(?:[-'’][\w]+)*", re.UNICODE)


def words(s):
    return len(WORD.findall(str(s or '')))


def clean_label(value):
    value=' '.join(str(value or '').split()).strip()
    return value[:95] or 'Scene illustration'


def sentences(script):
    """Keep whole sentences, and use paragraph breaks only when necessary."""
    script=str(script or '').strip()
    if not script or len(script)>10000:
        raise ValueError('Provide a narration script up to 10,000 characters.')
    from story_text import sentence_units
    return sentence_units(script)


def plan_scenes(title,script,spoken_seconds,max_scenes=6):
    """Select chronological narration beats and proportional start times.

    Starts are relative to the FIRST spoken word, AFTER the title cover.
    These are speech-rate estimates, not semantic/audio forced alignment.
    """
    if not isinstance(title,str) or not title.strip() or len(title)>150:
        raise ValueError('Enter a story title (maximum 150 characters).')
    if isinstance(spoken_seconds,bool) or not isinstance(spoken_seconds,(int,float)) or not math.isfinite(spoken_seconds) or not 5<=spoken_seconds<=598:
        raise ValueError('Spoken narration duration must be 5–598 seconds.')
    if isinstance(max_scenes,bool) or not isinstance(max_scenes,int) or not 2<=max_scenes<=MAX_SCENES:
        raise ValueError('Use 2–8 scenes including cover.')
    chunks=sentences(script)
    # Avoid producing inaccessible, low-value duplicates for tiny scripts.
    n=min(max_scenes-1,len(chunks),max(1,int(spoken_seconds//2)))
    weights=[max(1,words(s)) for s in chunks]
    total=sum(weights)
    # Start each beat at approximately a whole-sentence portion of the script.
    bounds=[0]
    for i in range(1,n):
        target=total*i/n
        candidates=range(bounds[-1]+1,len(chunks)-(n-i)+1)
        split=min(candidates,key=lambda k:abs(sum(weights[:k])-target))
        bounds.append(split)
    bounds.append(len(chunks))
    starts=[round(spoken_seconds*sum(weights[:idx])/total,3) for idx in bounds[:-1]]
    # Every visual lasts >=1.2 seconds; do not fabricate ultra-short scenes.
    for a,b in zip(starts,starts[1:]):
        if b-a<1.2: raise ValueError('Too many beats for this narration. Try fewer scenes.')
    if spoken_seconds-starts[-1]<1.2:
        raise ValueError('The final beat would be too short. Try fewer scenes.')
    cover={'headline':clean_label(title),'image_path':'','start_seconds':None,
           'beat_text':'Opening title cover; representative establishing image for '+title}
    scenes=[cover]
    for i in range(n):
        text=' '.join(chunks[bounds[i]:bounds[i+1]])
        scenes.append({'headline':clean_label(chunks[bounds[i]]),'image_path':'',
                       'start_seconds':starts[i],'beat_text':text})
    return {'scenes':scenes,'spoken_seconds':spoken_seconds,
            'timing':'estimated_from_script_words','requires_review':True}



def retime_to_recorded_narration(scenes, reference_seconds, recorded_seconds):
    """Scale planned scene start cues to true generated speech duration."""
    if isinstance(reference_seconds, bool) or isinstance(recorded_seconds, bool):
        raise ValueError('Invalid scene timing reference.')
    try:
        reference = float(reference_seconds)
        actual = float(recorded_seconds)
    except (ValueError, TypeError):
        raise ValueError('Invalid scene timing reference.')
    if not (math.isfinite(reference) and math.isfinite(actual) and reference >= 5 and actual >= 5):
        raise ValueError('Narration timing must be finite and at least five seconds.')
    if not isinstance(scenes, list) or not 2 <= len(scenes) <= MAX_SCENES:
        raise ValueError('No story scenes to retime.')
    result = []
    for index, scene in enumerate(scenes):
        if not isinstance(scene, dict):
            raise ValueError('Invalid illustrated scene.')
        item = dict(scene)
        if index and item.get('start_seconds') is not None:
            start = float(item['start_seconds'])
            if not math.isfinite(start) or start < 0 or start > reference:
                raise ValueError('Invalid planned scene start.')
            item['start_seconds'] = round(start * actual / reference, 3)
        result.append(item)
    return result


def validate_image_request(payload):
    if not isinstance(payload,dict):
        raise ValueError('Image request must be an object.')
    title=payload.get('title','')
    if not isinstance(title,str) or not title.strip() or len(title)>150:
        raise ValueError('Enter a valid story title.')
    story=payload.get('script','')
    if not isinstance(story,str) or not 10<=len(story)<=10000:
        raise ValueError('Provide a complete narration script.')
    rows=payload.get('scenes')
    if not isinstance(rows,list) or not 2<=len(rows)<=MAX_SCENES:
        raise ValueError('Prepare 2–8 story scenes before creating images.')
    style=payload.get('style','cinematic')
    if style not in ('cinematic','watercolour','documentary'):
        raise ValueError('Choose a supported scene illustration style.')
    model=payload.get('model',MODEL)
    if model not in (MODEL,'gpt-image-2'):
        raise ValueError('Choose a supported image model.')
    for row in rows:
        if not isinstance(row,dict) or not isinstance(row.get('headline'),str) or not 1<=len(row['headline'])<=95:
            raise ValueError('Scene descriptions must be 1–95 characters.')
    return {'title':title,'script':story,'scenes':rows,'style':style,'model':model}


def scene_prompt(request,row,index):
    styles={'cinematic':'cinematic painterly historical/story illustration, cohesive lighting',
            'watercolour':'refined watercolour storybook illustration, soft natural light',
            'documentary':'restrained photo-real documentary reconstruction, realistic lighting'}
    is_cover=index==0
    description=row.get('beat_text') or row['headline']
    description=' '.join(str(description).split())[:1600]
    story=request['script'][:1500]
    return (
        f'Create one ORIGINAL portrait 9:16 illustration for the DClips narrated story "{request["title"]}". '
        f'Visual style across all shots: {styles[request["style"]]}. '
        'Use recurring subjects with matching age progression, facial characteristics, wardrobe and period. '
        'Do not invent specific historical facts, and do not imply a reconstruction is documentary evidence. '
        'NO text, lettering, captions, logos, signs, watermarks, or split screens. '
        'Leave the lower third compositionally clear for subtitles. '
        + ('Opening establishing cover artwork (the app overlays title text separately). ' if is_cover else
           f'Illustrate ONLY scene {index} at this precise stage of the narrative. ')
        + f'Key visual action: {description}. Context from narration: {story}.'
    )


def generate_scene_images(payload, *, api_key=None, transport=None, media_dir=None):
    """Only called after explicit action; every generated image has an API cost.

    Existing user-provided pictures are kept, never overwritten. On partial API
    failure generated files stay on disk for optional reuse, and callers receive
    an error rather than a fake successful render.
    """
    request=validate_image_request(payload)
    token=api_key if api_key is not None else os.environ.get('OPENAI_API_KEY','')
    if not token:
        raise ValueError('Set OPENAI_API_KEY in the local server environment to enable optional paid AI images.')
    if not isinstance(token,str) or len(token)<8: raise ValueError('Invalid server API credential.')
    destdir=Path(media_dir) if media_dir is not None else MEDIA
    destdir.mkdir(parents=True,exist_ok=True)
    url='https://api.openai.com/v1/images/generations'
    output=[]
    cache_path=destdir/'.generation-cache.json'
    try:cache=json.loads(cache_path.read_text())
    except (OSError,ValueError):cache={}
    if not isinstance(cache,dict):cache={}
    for i,row in enumerate(request['scenes']):
        if row.get('image_path'):
            # Reuse user-supplied images, do not incur another paid generation.
            output.append({'scene':i+1,'image_path':row['image_path'],'reused':True})
            continue
        prompt=scene_prompt(request,row,i)
        body=json.dumps({'model':request['model'],'prompt':prompt,
                         'size':'1024x1536','quality':'medium','n':1}).encode('utf-8')
        key=hashlib.sha256(body).hexdigest()
        cached=cache.get(key)
        if isinstance(cached,str) and re.fullmatch(r'[0-9a-f]{32}\.png',cached) and (destdir/cached).is_file():
            output.append({'scene':i+1,'image_path':'user-data/media/'+cached,'reused':False,'cached':True})
            continue
        http=Request(url,data=body,headers={'Authorization':'Bearer '+token,
                    'Content-Type':'application/json'},method='POST')
        try:
            if transport is not None:
                response=transport(http)
            else:
                with urlopen(http,timeout=150) as res:
                    response=res.read(22*1024*1024)
            parsed=json.loads(response)
            encoded=parsed['data'][0]['b64_json']
            image=base64.b64decode(encoded,validate=True)
            if not (image.startswith(b'\x89PNG\r\n\x1a\n') and len(image)<=25*1024*1024):
                raise ValueError('Image provider returned an invalid or oversized PNG.')
        except HTTPError as e:
            raise ValueError(f'Image generation failed for scene {i+1} (HTTP {e.code}). Check API credits, permissions and model availability.') from None
        except (URLError,ValueError,KeyError,IndexError,TypeError) as e:
            raise ValueError(f'Image generation failed at scene {i+1}: '+str(e)[:180]) from None
        name=uuid.uuid4().hex+'.png'
        (destdir/name).write_bytes(image)
        cache[key]=name
        temporary=cache_path.with_suffix('.tmp')
        temporary.write_text(json.dumps(cache),encoding='utf-8')
        temporary.replace(cache_path)
        output.append({'scene':i+1,'image_path':'user-data/media/'+name,'reused':False})
    return output

