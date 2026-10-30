import pathlib,sys,json,tempfile,unittest
from unittest.mock import patch
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'scripts'))
import artifact_identity as identity
class IdentityTests(unittest.TestCase):
 def test_render_and_input_hashes_bind_the_artifact(self):
  with tempfile.TemporaryDirectory() as td:
   root=pathlib.Path(td);(root/'VERSION.json').write_text('{"version":"test"}')
   video=root/'example.mp4';video.write_bytes(b'original video')
   video.with_suffix('.captions.json').write_text('{}')
   with patch.object(identity,'ROOT',root):
    first=identity.write_provenance(video,{'id':'a','script':'Old.'},12.2)
    second=identity.write_provenance(video,{'id':'a','script':'New.'},12.2)
    self.assertNotEqual(first['input_sha256'],second['input_sha256'])
    self.assertEqual(first['video_sha256'],second['video_sha256'])
    video.write_bytes(b'changed video')
    self.assertNotEqual(identity.digest(video),first['video_sha256'])
    self.assertEqual(first['actual_duration_seconds'],12.2)
    self.assertEqual(len(first['captions']),1)
if __name__=='__main__':unittest.main()
