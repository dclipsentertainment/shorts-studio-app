import base64,json,tempfile,pathlib,sys,unittest
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parent))
from scene_automation import generate_scene_images
class Resume(unittest.TestCase):
 def test_partial_success_is_reused(self):
  job={'title':'Story','script':'A complete story with two different scenes.','scenes':[{'headline':'Cover'},{'headline':'Ending'}]}
  calls=[]
  def transport(request):
   calls.append(request.data)
   if len(calls)==2:raise ValueError('temporary provider failure')
   return json.dumps({'data':[{'b64_json':base64.b64encode(b'\x89PNG\r\n\x1a\n'+b'fake-image').decode()}]}).encode()
  with tempfile.TemporaryDirectory() as td:
   with self.assertRaises(ValueError):generate_scene_images(job,api_key='test-key-only',transport=transport,media_dir=td)
   result=generate_scene_images(job,api_key='test-key-only',transport=transport,media_dir=td)
   self.assertEqual(len(calls),3);self.assertTrue(result[0]['cached']);self.assertEqual(len(result),2)
if __name__=='__main__':unittest.main()
