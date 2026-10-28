# Shorts Studio v0.14 — original video scene builder

This upgrade produces **animated, multi-scene original Shorts** instead of relying on a single background. It works with original text and optional images you own or have permission to use. It is **not** AI image generation and does not fetch copyrighted stock or social-platform content.

## What is new

- **Storyboard mode** for original projects with no source video: up to eight scenes, with one editable headline per scene.
- **Three original visual themes**: Aurora teal, Ember orange and Cosmic violet.
- **Scene transitions**: gentle crossfades or clean cuts, plus a small alternating zoom for visual movement.
- **Optional licensed image backgrounds**, uploaded locally through **Production flow → Add licensed scene image**, appended to the current scene headline as a project-relative path. Images are used locally and should not include private data you don't want in finished videos.
- **Suggest scenes from script** helps split your narration into simple visual beats. This is a heuristic and needs human review, especially for research claims.
- **Live planning preview** illustrates scene headings and rough timing. It is not a WYSIWYG replacement for watching the finished video.
- **All previous video/caption modes remain available.** The existing editor and render-job format remain `version: 1` with an optional `visuals` object.

## Use from dashboard

1. Open **Content studio**, create an **Original** project, and add an original researched script.
2. Open **Production flow**, select the project, and choose **Use generated background**. The multi-scene renderer is used only when no source video is selected.
3. In **Original video visuals**, choose **Animated multi-scene storyboard**.
4. Click **Suggest scenes from script** or type up to eight headlines on separate lines.
5. Choose a palette and soft crossfade or cut transition. Optional: upload a JPEG, PNG or WebP you own/license; its safe relative path is placed after the last scene (`Scene headline | user-data/media/example.jpg`). You can repeat for more scenes.
6. Confirm you hold the rights, save, and choose **Render finished MP4** if the local engine is available. Otherwise export the job JSON for later rendering.
7. Watch the MP4 fully before publishing. Captions still rely on supplied cue timings or estimates and could overlap important imagery. All claims must be reviewed by a human.

## Requirements and costs

For actual scene rendering: **Python, FFmpeg/ffprobe, and free Pillow**. To enable the optional scene generator where Python is available:

```bash
python -m pip install --user -r requirements-visuals.txt
```

No new paid API or online account is required. If you cannot install Python packages (e.g. restricted workplace PC), the browser can still plan scenes and export jobs; use another computer or later cloud workflow for rendering.

The GitHub Actions render templates include Pillow installation but do nothing until deployed and run on your own GitHub account. The local production server is limited to localhost; it does **not** publish to social media or expose credentials.

## Render-job example

`jobs/example-storyboard.json` produces a four-scene original vertical MP4. Run:

```bash
python scripts/render.py --job jobs/example-storyboard.json --out output
```

Example scene data:

```json
"visuals": {
  "mode": "storyboard",
  "theme": "aurora",
  "transition": "fade",
  "scenes": [
    {"headline": "A surprising question", "image_path": ""},
    {"headline": "The key discovery", "image_path": "assets/my-licensed-image.jpg"}
  ]
}
```

The script renderer validates paths: no `../` traversal, no remote images, only existing JPG/PNG/WebP within the project, each smaller than 25 MiB. The original image is not included in downloaded render-job JSON exports: you must supply it in the same relative location to render elsewhere. Keep private images and credentials **out of public GitHub repositories**.

**Important:** This is an improved offline graphics/storyboard tool, not a text-to-video diffusion model. Character animation, licensed footage sourcing, automatic factual scene illustration and realistic AI voices remain future improvements.
