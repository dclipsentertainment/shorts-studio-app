"""Content-addressed narration cache; corrupt or incompatible entries are misses."""
import hashlib
import importlib.metadata
import json
import os
from pathlib import Path
import shutil
import tempfile
import wave


def sha(path):
    with open(path, 'rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def fingerprint(script, narration, root):
    mode=narration.get('mode')
    models=[]
    folder=Path(root)/'.voice-models'
    if mode=='kokoro':
        models=[folder/'kokoro'/'kokoro-v1.0.onnx',folder/'kokoro'/'voices-v1.0.bin']
    elif mode=='piper':
        name=narration.get('voice') or 'en_GB-cori-high'
        models=[folder/(name+'.onnx'),folder/(name+'.onnx.json')]
    versions={}
    for name in ['kokoro-onnx','piper-tts','onnxruntime','faster-whisper']:
        try: versions[name]=importlib.metadata.version(name)
        except importlib.metadata.PackageNotFoundError: versions[name]='absent'
    payload={'schema':1,'script':script,'mode':mode,'voice':narration.get('voice'),'speed':narration.get('speed',.96),'models':[sha(p) if p.is_file() else 'absent' for p in models],'versions':versions,'engine':sha(Path(__file__).with_name('render.py'))}
    return hashlib.sha256(json.dumps(payload,sort_keys=True).encode()).hexdigest()


def valid_wav(path):
    try:
        with wave.open(str(path),'rb') as audio:
            return 0<audio.getnframes()/audio.getframerate()<=600 and audio.getnchannels() in (1,2)
    except (OSError,EOFError,wave.Error,ZeroDivisionError):return False


def cached_voice(key, destination, generate):
    directory=os.environ.get('DCLIPS_RENDER_CACHE')
    if not directory:return generate()
    root=Path(directory);root.mkdir(parents=True,exist_ok=True)
    audio=root/(key+'.wav');meta=root/(key+'.json')
    try:
        record=json.loads(meta.read_text())
        if valid_wav(audio) and record['sha256']==sha(audio):
            shutil.copyfile(audio,destination)
            print('Reused unchanged narration from verified cache.')
            return destination
    except (OSError,ValueError,KeyError):pass
    result=generate()
    if valid_wav(result):
        # Publish atomically. Cache failure must not discard a successful render.
        try:
            with tempfile.NamedTemporaryFile(dir=root,delete=False) as temp:
                temporary=Path(temp.name)
                with open(result,'rb') as source:shutil.copyfileobj(source,temp)
            temporary.replace(audio)
            meta.write_text(json.dumps({'sha256':sha(audio)}))
            # Bound runner cache size to the 30 most recent narration files.
            for old in sorted(root.glob('*.wav'),key=lambda p:p.stat().st_mtime,reverse=True)[30:]:
                old.unlink(missing_ok=True);old.with_suffix('.json').unlink(missing_ok=True)
        except OSError:pass
    return result


def align_scenes(scenes, script, cues, intro):
    """Locate each exact narration beat in measured ASR captions, interpolate within a cue."""
    from copy import deepcopy
    from difflib import SequenceMatcher
    import re
    normalize=lambda text:re.sub(r'[^a-z0-9 ]','',text.lower()).split()
    intended=[];indices=[]
    for i,word in enumerate(script.split()):
        for token in normalize(word):intended.append(token);indices.append(i)
    heard=[];times=[]
    for cue in cues:
        words=normalize(cue['text'])
        for i,word in enumerate(words):
            heard.append(word);times.append(cue['start_seconds']+(cue['end_seconds']-cue['start_seconds'])*i/max(1,len(words)))
    matches={}
    for block in SequenceMatcher(None,intended,heard,autojunk=False).get_matching_blocks():
        for i in range(block.size):matches.setdefault(indices[block.a+i],times[block.b+i])
    result=deepcopy(scenes)
    previous=-1
    for scene in result[1:]:
        word=scene.get('narration_start_word')
        if not isinstance(word,int) or word not in matches:return None
        time=max(0,matches[word]-intro)
        if time<=previous:return None
        scene['start_seconds']=round(time,3);previous=time
    return result
