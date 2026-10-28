# Shorts Studio v0.13 — Visual upgrade

This release keeps the v0.12 projects, URLs, exports, rights checks and local engine unchanged.

## Kinetic captions
In **Content Studio → Edit project**, set **Caption style → Kinetic pop captions**.
The **Production flow** has the same selection. The renderer displays short uppercase word groups with an entrance scale animation and a readable dark backdrop.
If timed subtitle cues are supplied, the start/end of each cue is respected. Long cues are split into short animated groups using **estimated** intervals; for true single-word timings import word-level captions via Preview & subtitles. Without supplied timed cues, all timing is estimated from script text and total duration. Always preview the MP4, especially when editing speech.

## Optional face-aware cropping
Set **Crop focus → Track visible face** in Content Studio or **Framing → Follow visible face** in Production flow. This estimates the primary visible face location at sparse intervals using OpenCV's built-in frontal-face detector, smoothly reframes it and crops to 9:16. It does **not** recognise a person's identity or send footage to any service.

- No face, no OpenCV, very small face or back-facing subject → falls back to center crop.
- Multiple people, quick cuts and occlusion may produce imperfect results. Watch every video.
- The browser preview shows the source, not the rendered tracked crop. Watch the final MP4 before uploading.
- Requires Python with `opencv-python-headless` for smart framing; local setup: `python -m pip install opencv-python-headless`. This is optional. Existing classic, left, right and center crops work without it. On GitHub Actions the rendering workflows now install it.
- Only input video is sampled; no face data is saved in exports.

## Better clip scouting
`python scripts/scout.py --source assets/your-video.mp4 --rights-confirmed --duration 30 --count 5`

Candidate starts can align to pauses, scene changes and transcript segment boundaries. The score now accounts for silent intros and transcript hooks in the first five seconds. A nearby transcript segment end can shorten the clip slightly to avoid cutting speech abruptly. The report still includes the same `report_version: 1` format and can be imported through **Clip Scout**.

Scores are heuristics, **not** AI understanding of humour, topic quality, speaker sentiment, copyright clearance, or virality. An optional time-aligned transcript remains required for speech cues.

## Cost and safety
All new capabilities are offline; no new third-party account or paid API is needed. Existing Python/FFmpeg requirements for rendering still apply. For optional face-aware cropping, install OpenCV. GitHub cloud workflows are ready but do not run until you create an account and deploy them. Original media must be owned or licensed.
