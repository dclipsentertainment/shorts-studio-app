#!/usr/bin/env python3
"""Offline regression checks: no provider access or charge occurs."""
import base64
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from scene_automation import plan_scenes,validate_image_request,generate_scene_images,retime_to_recorded_narration

STORY=('Caesar grew up in Rome during political upheaval. '
       'He later gained experience as a military officer. '
       'His career advanced during the campaigns in Gaul. '
       'He crossed the Rubicon at a moment of civil conflict. '
       'In the final years he held extraordinary power. '
       'Senators assassinated him in forty-four BCE. ')

class SceneTests(unittest.TestCase):
    def test_plan_timing_and_sequence(self):
        plan=plan_scenes('Caesar',STORY,60,max_scenes=6)
        scenes=plan['scenes']
        self.assertEqual(len(scenes),6)
        self.assertIsNone(scenes[0]['start_seconds'])
        self.assertEqual(scenes[1]['start_seconds'],0)
        times=[s['start_seconds'] for s in scenes[1:]]
        self.assertTrue(all(b-a>=1.2 for a,b in zip(times,times[1:])))
        self.assertIn('Caesar grew up',scenes[1]['beat_text'])
        self.assertIn('assassinated',scenes[-1]['beat_text'])
        self.assertEqual(plan['timing'],'estimated_from_script_words')

    def test_retime(self):
        plan=plan_scenes('Caesar',STORY,60,max_scenes=5)
        old=plan['scenes']
        new=retime_to_recorded_narration(old,60,90)
        self.assertEqual(new[1]['start_seconds'],0)
        self.assertEqual(new[2]['start_seconds'],round(old[2]['start_seconds']*1.5,3))
        self.assertNotEqual(old[2]['start_seconds'],new[2]['start_seconds'])

    def test_bad_data(self):
        with self.assertRaises(ValueError):
            plan_scenes('Caesar','',45)
        with self.assertRaises(ValueError):
            plan_scenes('Caesar',STORY,float('nan'))
        with self.assertRaises(ValueError):
            retime_to_recorded_narration([],60,60)
        with self.assertRaises(ValueError):
            validate_image_request({'title':'Caesar','script':STORY,'scenes':[{}]})

    def test_images_only_on_opt_in(self):
        plan=plan_scenes('Caesar',STORY,60,max_scenes=3)
        request={'title':'Caesar','script':STORY,'scenes':plan['scenes'],'style':'cinematic'}
        sample_image=b'\x89PNG\r\n\x1a\n'+b'mocked-png-content'
        calls=[]
        def fake_transport(http):
            calls.append({'url':http.full_url,'model':json.loads(http.data)['model']})
            return json.dumps({'data':[{'b64_json':base64.b64encode(sample_image).decode()}]}).encode()
        with tempfile.TemporaryDirectory() as tmp:
            output=generate_scene_images(request,api_key='fake-key-for-tests',transport=fake_transport,media_dir=tmp)
            self.assertEqual(len(output),len(plan['scenes']))
            self.assertEqual(len(calls),len(output))
            for item in output:
                self.assertTrue((Path(tmp)/item['image_path'].split('/')[-1]).is_file())
        with self.assertRaises(ValueError):
            generate_scene_images(request,api_key='',transport=fake_transport)
        self.assertEqual(len(calls),len(output),'Missing credential must not make API calls')

if __name__=='__main__':
    unittest.main()
