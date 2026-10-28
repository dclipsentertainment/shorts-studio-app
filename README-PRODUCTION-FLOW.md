# Shorts Studio v0.13 — One-page production workflow

This release keeps the previous dashboard and adds **Production flow**: project → script and narration → subtitles → preview → finished vertical MP4. No GitHub account or paid AI API is needed for the planning and export steps.

## Use it

1. **Extract the complete ZIP into a permanent folder you can write to.** The ZIP is an app folder, not an installer; do not run it from inside the ZIP.
2. Double-click **`OPEN-DASHBOARD.cmd`**. If Python 3.10+ is available, it launches a **local-only** dashboard at `http://127.0.0.1:8765/`, and opens your browser. `OPEN-PRODUCTION-STUDIO.cmd` does the same without checking GitHub updates. Leave its command window running while making videos. Close the window to stop the server.
3. If Python isn't available, the launcher opens the static browser dashboard. All planning, caption editing, script importing and JSON job exporting still work. **One-click MP4 rendering does not work in browser-only mode.** Check the status banner at the top of Production flow.
4. Create a **Channel** and a **Content studio project**, or go to **Setup & backups → Load demo data**. Select the project in **Production flow**.
5. Edit the script, duration and narration setting. For clips, use **Select video → Use selected video** to store authorised media in the local `user-data/media/` folder. For original videos, you can leave the video source blank to generate a simple visual background. The **Play preview** button previews selected footage or an approximate storyboard for originals without footage.
6. Add subtitles: **Estimate caption timings** from the script (rough timing only), **Import subtitles** (SRT/VTT/timed JSON), or **Transcribe source audio** when the optional `faster-whisper` model is installed. Correct the text and timing; save progress.
7. Check **rights confirmation** only if you have permission for the source footage, script, voice and music. For ChatGPT-assisted scripts, verify claims and their sources in the project editor. Render refuses projects that fail the existing readiness checks.
8. Click **Render finished MP4**. The local service runs the bundled FFmpeg renderer, creates `user-data/renders/<run id>/...mp4` and displays the output in the dashboard. Watch it fully before distributing. The output is never uploaded to a social network automatically.

## Free technical requirements

- Python 3.10+ and FFmpeg **including ffprobe** must be available on the local machine to render. Neither is bundled in the ZIP. Some workplace devices prevent running them even without needing administrator rights.
- `faster-whisper` is **optional** for actual speech recognition. It needs a separate Python installation command (`python -m pip install faster-whisper`) and internet access for its initial free model download. It can be slow on CPU. **ChatGPT Pro does not pay for an automatic API**.
- The built-in basic synthetic voice uses FFmpeg's optional **Flite filter**. Your FFmpeg build might not have it. In that case select **no added narration** or upload your own authorised voice recording.
- Auto-aligning the generated voice after rendering is optional when the model is installed. If it fails, the original video may still be saved with estimated caption timings; the app tells you if alignment was unavailable.
- Large videos are capped at 600 MiB for local uploads. The app's 720×1280 outputs are intended as draft Shorts/Reels, not final professional editing quality.

## Security, privacy and backups

- The local server binds to **127.0.0.1 only**, does not accept remote browser origins for write operations, and never uploads your media to ChatGPT, YouTube or Instagram.
- Source video/audio files are copied into `user-data/media/` only when you press **Use selected video** or **Use recording**. Finished videos are saved under `user-data/renders/`. These remain on your machine and are excluded from public source-code releases.
- Channel names, scripts, settings and captions are still stored in your **browser's localStorage**, not in a database. **Export regular backups** in Setup & backups. Copy the `user-data/` folder as well if you want backups of media and output MP4s.
- **Important migration:** If you used v0.11 by opening `index.html` as a file, the new `http://127.0.0.1:8765` site uses separate browser storage. Export a JSON backup from the old file-based page and import it into the local-server dashboard. This is not automatic. Once you use a stable URL, the same local browser will normally reuse the data.
- No video is re-uploaded on restart; the saved media path stays usable while the files remain in `user-data/media/`.
- The app never downloads and reposts other people's YouTube Shorts/Reels without rights, and does not connect to or publish to your channels.

## Alternate manual workflow

If you cannot launch Python locally, use **Production flow → Export job JSON**. The existing `scripts/render.py` or a future private GitHub Actions runner can execute it when the required footage is accessible to that machine. Local-server uploads use `user-data/media/<file>` paths and will not exist on a future cloud runner unless you intentionally copy the media there.

## Testing for this release

- Python/Node syntax checks passed.
- Existing caption parser and caption-save logic tests passed.
- Browser UI editing, estimated captions, job export and page state tests passed using Playwright with the HTML injected into the test page. Direct navigation from Chromium to local URLs was blocked by this test environment.
- The actual local HTTP API passed media upload, rights validation, render-job submission, status polling, and retrieval of a 3-second captioned MP4.
- An original-video MP4 with basic narration was rendered from the sample job.
- **Not fully verified:** clicking *Render finished MP4* end-to-end in an ordinary Windows browser, installed-model speech recognition, optional automatic speech alignment, Windows launchers and any future GitHub update/release.
