import pathlib,sys,unittest,tempfile,types
from unittest.mock import patch
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parent))
import render,transcribe
class LongNarration(unittest.TestCase):
 def test_chunks_preserve_words(self):
  story=('This complete sentence should survive every narration chunk. '*110).strip()
  chunks=render.narration_chunks(story)
  self.assertGreater(len(chunks),1);self.assertEqual(' '.join(chunks),story)
  self.assertTrue(all(len(x)<=1800 and x.endswith('.') for x in chunks))
 def test_full_transcript_and_explicit_overflow(self):
  words=[{'start':i*.4,'end':i*.4+.3,'word':'word'} for i in range(1100)]
  cues=transcribe.segment_words(words,600,4)
  self.assertEqual(len(cues),275);self.assertEqual(cues[-1]['end_seconds'],439.9)
  with self.assertRaisesRegex(ValueError,'900'):transcribe.segment_words(words,600,1)
 def test_long_duration_reaches_recognition(self):
  class ReachedModel(Exception):pass
  with tempfile.TemporaryDirectory() as td:
   def fake_run(args,**kwargs):pathlib.Path(args[-1]).write_bytes(b'0'*2048);return types.SimpleNamespace(returncode=0,stderr='')
   with patch.dict(sys.modules,{'faster_whisper':types.SimpleNamespace(WhisperModel=lambda *a,**k:(_ for _ in ()).throw(ReachedModel()))}),patch.object(transcribe.subprocess,'run',fake_run):
    with self.assertRaises(ReachedModel):transcribe.transcribe(pathlib.Path(td)/'test.wav',0,360,'tiny',None,4)
 def test_kokoro_multiple_calls_preserve_entire_story(self):
  import numpy as np, wave
  def write(path,samples,rate,**kwargs):
   with wave.open(path,'wb') as out:out.setnchannels(1);out.setsampwidth(2);out.setframerate(rate);out.writeframes((samples*32767).astype('<i2').tobytes())
  calls=[]
  class Kokoro:
   def __init__(self,*a):pass
   def create(self,text,**kw):calls.append(text);return np.zeros(24000,dtype=np.float32),24000
  with tempfile.TemporaryDirectory() as td:
   root=pathlib.Path(td);models=root/'.voice-models/kokoro';models.mkdir(parents=True)
   for name in ['kokoro-v1.0.onnx','voices-v1.0.bin']:(models/name).touch()
   story=('The whole story continues into another complete sentence. '*100).strip()
   with patch.object(render,'ROOT',root),patch.dict(sys.modules,{'kokoro_onnx':types.SimpleNamespace(Kokoro=Kokoro),'soundfile':types.SimpleNamespace(write=write)}):render.voice_kokoro(story,root/'out.wav','af_heart')
   self.assertEqual(' '.join(calls),story);self.assertGreater(len(calls),1)
   with wave.open(str(root/'out.wav')) as out:self.assertGreater(out.getnframes()/out.getframerate(),len(calls))
if __name__=='__main__':unittest.main()
