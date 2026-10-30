"""Portable render identity; descriptive metadata never grants publication approval."""
import hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def digest(path):
 with Path(path).open('rb') as stream:return hashlib.file_digest(stream,'sha256').hexdigest()
def write_provenance(video,job,duration):
 version=json.loads((ROOT/'VERSION.json').read_text())['version']
 canonical=json.dumps(job,sort_keys=True,separators=(',',':'),ensure_ascii=False,allow_nan=False)
 sidecars=[{'file':p.name,'sha256':digest(p)} for p in sorted(video.parent.glob(video.stem+'.captions.*'))]
 result={'schema_version':1,'job_id':job.get('id'),'input_sha256':hashlib.sha256(canonical.encode()).hexdigest(),
 'engine_version':version,'video':video.name,'video_sha256':digest(video),'actual_duration_seconds':float(duration),
 'captions':sidecars,'review_required':True}
 video.with_suffix('.provenance.json').write_text(json.dumps(result,indent=2)+'\n')
 return result
