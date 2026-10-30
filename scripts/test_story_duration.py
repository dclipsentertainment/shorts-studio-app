#!/usr/bin/env python3
"""Offline preflight ensures long original Facebook stories are possible,
but do not accidentally extend other people's short clips."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from local_studio import validate_job
from render import JobError, render
base={"version":1,"kind":"original","rights_confirmed":True,"duration":360,
 "title":"One complete Caesar story","source":{"path":None,"url":None,"start_seconds":0},
 "narration":{"mode":"none"},"script":"Original rights-cleared script.",
 "caption_segments":[],"captions":False,"visuals":{"mode":"classic"}}
assert validate_job(base)["duration"]==360
for duration in [601,-1]:
    try:validate_job({**base,"duration":duration})
    except ValueError:pass
    else:raise AssertionError("Invalid original runtime was accepted: "+str(duration))
try:validate_job({**base,"kind":"clip","duration":360,"source":{"path":"media.mp4"}})
except ValueError:pass
else:raise AssertionError("A short clip cannot be 360 seconds")
assert validate_job({**base,"duration":180})["duration"]==180
print("PASS: 6-minute original story accepted, >10min rejected, streamer clip capped at 3min")
