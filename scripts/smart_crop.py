#!/usr/bin/env python3
"""Optional privacy-preserving face-aware crop positions for authorised local footage.

Never identifies people: this only estimates where to frame a face. Uses OpenCV's
bundled Haar frontal-face detector; if missing or no face is found, callers
keep their normal center crop. Tracking results never leave the local machine.
"""
from __future__ import annotations
from dataclasses import dataclass
import math
from pathlib import Path

@dataclass(frozen=True)
class Sample:
    time: float
    center: float
    confidence: float


def face_center(frame, classifier, previous: float | None = None) -> tuple[float, float] | None:
    import cv2
    if frame is None or frame.size == 0:
        return None
    height, width=frame.shape[:2]
    reduced=cv2.resize(frame, (min(width,640), max(2,round(height*min(width,640)/width))))
    gray=cv2.cvtColor(reduced,cv2.COLOR_BGR2GRAY)
    # Equalising the entire letterboxed frame can obscure small faces.
    faces=classifier.detectMultiScale(gray,scaleFactor=1.13,minNeighbors=4,minSize=(22,22))
    if len(faces)==0:
        return None
    rw=reduced.shape[1]
    # Prefer a reasonably sized face that is closest to the previous one.
    # Do not jump to a newly appearing smaller face on a hard cut.
    scored=[]
    for x,y,w,h in faces:
        cx=(x+w/2)/rw
        area=(w*h)/(reduced.shape[0]*rw)
        continuity=(1-abs(cx-previous)) if previous is not None else 0.5
        scored.append((min(area*40,1)*0.65+continuity*0.35, cx, min(area*25,1)))
    _,cx,conf=max(scored)
    return (max(0.,min(1.,float(cx))), float(conf))


def track_faces(path: Path, start: float, duration: float, period: float = 1.5) -> list[Sample]:
    """At most 100 sparse samples; no detection means a central crop fallback."""
    import cv2
    cascade=Path(cv2.data.haarcascades)/'haarcascade_frontalface_default.xml'
    if not cascade.exists():
        return []
    classifier=cv2.CascadeClassifier(str(cascade))
    if classifier.empty():
        return []
    video=cv2.VideoCapture(str(path))
    if not video.isOpened():
        return []
    samples=[]
    previous=None
    try:
        count=min(100, int(math.ceil(duration/period))+1)
        for k in range(count):
            rel=min(duration,k*period)
            video.set(cv2.CAP_PROP_POS_MSEC, (start+rel)*1000)
            ok,frame=video.read()
            if not ok: continue
            result=face_center(frame,classifier,previous)
            if result:
                center,confidence=result
                previous=center
                samples.append(Sample(round(rel,3),round(center,5),round(confidence,3)))
    finally:
        video.release()
    return samples


def smooth_track(samples: list[Sample], duration: float, interval: float = 1.5) -> list[tuple[float,float]]:
    """Interpolate sparse sightings, smooth motion, and return bounded track points."""
    if not samples or duration<=0:
        return []
    seen=sorted(samples,key=lambda x:x.time)
    if len(seen)==1:
        return [(0.0,seen[0].center),(round(duration,3),seen[0].center)]
    track=[]
    smooth=None
    for i in range(min(100, math.ceil(duration/interval)+1)):
        t=min(duration,i*interval)
        before=seen[0];after=seen[-1]
        for j,p in enumerate(seen):
            if p.time<=t:before=p
            if p.time>=t:
                after=p;break
        alpha=max(0.,min(1.,(t-before.time)/max(0.001,after.time-before.time)))
        target=before.center*(1-alpha)+after.center*alpha
        # Limit movement per sample to avoid camera shake.
        if smooth is None: smooth=target
        else: smooth+=max(-0.12,min(0.12,(target-smooth)*0.58))
        track.append((round(t,3),round(max(0,min(1,smooth)),5)))
    if track[-1][0]<duration:
        track.append((round(duration,3),track[-1][1]))
    return track


def crop_expression(track: list[tuple[float,float]]) -> str:
    """FFmpeg crop filter expression, with interpolated x and bounds.

    Express crop x in *scaled* source coordinates so portrait, square, and
    landscape material frame consistently. FFmpeg filtergraph commas escaped.
    """
    if not track:
        return '(iw-720)/2'
    # Limit expression complexity and keep ffmpeg parsing quick.
    # A constant face location still stays inside the video.
    if len(track)==1:
        factor=f'{track[0][1]:.5f}'
    else:
        factor=f'{track[-1][1]:.5f}'
        for i in range(len(track)-2,-1,-1):
            t0,x0=track[i];t1,x1=track[i+1]
            if t1<=t0:continue
            interpolation=f'({x0:.5f}+({x1-x0:.5f})*(t-{t0:.3f})/{t1-t0:.3f})'
            factor=f'if(lt(t\\,{t1:.3f})\\,{interpolation}\\,{factor})'
    return f'max(0\\,min(iw-720\\,iw*({factor})-360))'
