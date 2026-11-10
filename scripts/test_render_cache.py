import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import wave
from render_cache import cached_voice, fingerprint, align_scenes

class CacheTests(unittest.TestCase):
    def test_reuse_and_corruption(self):
        with tempfile.TemporaryDirectory() as directory,patch.dict(os.environ,{'DCLIPS_RENDER_CACHE':directory}):
            dest=Path(directory)/'output.wav';calls=[]
            def generate():
                calls.append(1)
                with wave.open(str(dest),'wb') as wav:
                    wav.setnchannels(1);wav.setsampwidth(2);wav.setframerate(16000);wav.writeframes(bytes(32000))
                return dest
            cached_voice('key',dest,generate);dest.unlink();cached_voice('key',dest,generate)
            self.assertEqual(len(calls),1)
            (Path(directory)/'key.wav').write_bytes(b'corrupt')
            cached_voice('key',dest,generate);self.assertEqual(len(calls),2)
    def test_voice_changes_invalidate(self):
        root=Path(__file__).resolve().parents[1]
        a=fingerprint('One.',{'mode':'basic'},root)
        self.assertNotEqual(a,fingerprint('Two.',{'mode':'basic'},root))
        self.assertNotEqual(a,fingerprint('One.',{'mode':'kokoro','voice':'af_heart'},root))
    def test_scene_follows_pause(self):
        scenes=[{'headline':'cover'},{'narration_start_word':0},{'narration_start_word':2}]
        result=align_scenes(scenes,'Hello world. Goodbye moon.',[{'text':'Hello world.','start_seconds':2,'end_seconds':3},{'text':'Goodbye moon.','start_seconds':7,'end_seconds':8}],2)
        self.assertEqual(result[2]['start_seconds'],5)
        self.assertIsNone(align_scenes(scenes,'Hello world. Goodbye moon.',[],2))
if __name__=='__main__':unittest.main()
