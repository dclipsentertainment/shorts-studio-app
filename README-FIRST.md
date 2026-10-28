**New in v0.14:** Original-video storyboard scene builder: animated 9:16 graphic cards, editable scene headlines, three colour palettes, optional licensed image backgrounds, gentle transitions. See `README-STORYBOARD.md`. Actual rendering additionally requires free Pillow.

**Visual upgrades (v0.13):** See `README-VISUAL-UPGRADE.md` for kinetic captions, optional face tracking, and improved Clip Scout.

# Shorts Studio — start here

**Version 0.14.0 (28 October 2026)** · Free prototype, account setup optional.

Shorts Studio lets you plan multiple YouTube/Instagram brands, research short-form trends, scout highlights in licensed footage and export instructions for rendering vertical MP4s. **It does not currently connect to your social accounts or publish videos automatically.**

## 1. Open the app without installing anything

1. Unzip the downloaded `Shorts_Studio_v0_14_Storyboard_Upgrade.zip` into a permanent folder you can write to (such as Documents).
2. On Windows, open `OPEN-DASHBOARD.cmd`. It attempts to start the local production dashboard if Python is available; otherwise it opens `index.html` in browser-only mode. No administrator access is required to plan content.
3. Add your brands under **Channels**, then add ideas under **Content studio**. Mark projects **Ready** only after review.
4. Back up anything you enter using **Setup & backups → Export backup**. Dashboard data lives in that browser's localStorage, not GitHub or the downloaded ZIP. Importing a backup restores it. If you haven't entered any data yet, there's nothing you need to export.

### Production flow — one-page editing and local MP4 rendering

- **Production flow** puts project, script, narration choice, caption timing, preview, permission checks and MP4 export in one screen.
- **Local render service:** `OPEN-PRODUCTION-STUDIO.cmd` starts a Python-only loopback server; with FFmpeg and ffprobe on PATH, you can upload your own authorised footage and render an MP4 by pressing a button. Generated video stays on your machine under `user-data/renders/`.
- **Captions:** approximate script timings work without installed AI. Import SRT/VTT/JSON for accurate timing, or optionally use free `faster-whisper` locally to transcribe uploaded audio. Installing a speech model is separate, not included in the ZIP. Optional alignment of synthetic narration adds compute time.
- **Preview:** test video and captions together, or preview an approximate storyboard when using a generated original-video background. The final MP4 must still be reviewed after rendering.
- **Browser-only fallback:** no Python or FFmpeg? Planning and job JSON export still work. No GitHub required.
- **Data warning:** a file-based `index.html` URL and the local `127.0.0.1` page have separate localStorage. Export a backup from the former and import it into the latter before switching if you entered projects earlier.

**Start here:** `README-PRODUCTION-FLOW.md` for exact steps, requirements and test limitations. The full browser-to-MP4 workflow has not yet been validated on an ordinary Windows computer.

### Previously added in v0.11 — video preview and subtitle editing

- **Preview & subtitles:** select a video file (or the supplied demo), scrub playback, edit the clip start and length, import `.srt`, `.vtt` or timed JSON subtitles, correct timestamps and captions, then apply those changes to the selected project. The video file itself is not saved or uploaded.
- **Automatic speech-to-text, optional:** `scripts/transcribe.py` uses free `faster-whisper` models for word-timed captions. This is a separate Python/FFmpeg step or future GitHub Actions job (now also available through the optional local bridge in Production flow), not a pure browser feature; the speech model downloads on first use and CPU speed varies. The optional workflow is `.github/workflows/transcribe-short.yml`.
- **On the separate Preview & subtitles page, preview is not export:** the HTML video preview does not itself produce an MP4. Rendered output remains a separate workflow. Read `README-PREVIEW-AND-SUBTITLES.md` for the detailed guide.
- **No accounts required:** try the browser editor and demo without GitHub, API keys or paid services.

### Previously added in v0.10 — safer workflow and improved editing

- **Searchable Content Studio:** search projects across titles, scripts, notes and channel names. Filter by channel/status and sort by title, age or schedule.
- **Local recovery checkpoints:** the browser retains up to five previous versions of saved workspace data. In **Setup & backups** you can restore a checkpoint after an accidental change. This is only a convenience: clearing browser storage erases checkpoints too. Continue exporting backups to files.
- **Timestamp-accurate caption option:** edit a project and paste timed JSON under **Timed captions JSON**. Use arrays like `[ {"start_seconds": 0.2, "end_seconds": 1.4, "text": "Watch this"} ]`. These timings replace approximate word-count subtitles when rendering the MP4. Overlaps/invalid times are blocked; timing must be supplied by you or a separate transcript tool (automatic transcription requires a separate optional script). You can test rendering with `jobs/example-timed-captions.json`.
- Previous features remain, and no GitHub, paid APIs or accounts are required for the dashboard.

### Previously added in v0.9 — ChatGPT Pro script handoff (no API bill)

- Open **ChatGPT script desk** in the sidebar. Enter a topic, target audience, channel, format, tone and optional trusted research URLs.
- Select **Build ChatGPT prompt**, then **Copy prompt** (or **Download prompt** when clipboard permission is unavailable). Open a regular ChatGPT conversation and paste the prompt. This uses your existing ChatGPT access, **not** a direct API connection.
- Ask ChatGPT to use reputable first-party references and return **JSON only** in the schema shown in the prompt. You can try a structural demo using `reports/chatgpt-script-example.json`; the example references are **not verified evidence**.
- Paste the JSON into **Step 3** or import the JSON file. **Preview and validate** checks the required fields, duration, script length, source URL shape and research placeholders. It does **not** confirm the factual accuracy or validity of the source material.
- Click **Save as draft** to create a linked channel project with script, YouTube title, hashtags, Instagram caption and references.
- In **Content studio → Edit project**, open/check each linked source and verify material claims against it. Only then tick the **AI references reviewed** checkbox and confirm media/music rights. Any script change invalidates that confirmation and requires re-review. The publishing queue refuses unreviewed AI scripts.
- The entire handoff runs in the browser with **no GitHub, new service accounts, API keys or paid API credits**. It does **not** invoke ChatGPT in the background or automatically fill in the response.

**Start here:** `README-CHATGPT-WORKFLOW.md`. The app is still a free offline prototype: you must review claims and visuals, and rendering needs FFmpeg/Python or future GitHub Actions.

### Previously added in v0.8 — no social account required

- **Creative lab:** enter a topic, get three formula-based hook suggestions and save an original-video outline. Research placeholders are **not** an AI-authored, verified script; review and replace them before rendering.
- **Video editing presets:** classic or word-group pop captions; left/centre/right crops; optional gentle pan; FFmpeg audio normalisation. Captions are *timed by word count*, not synced to speech: review the MP4.
- **Original videos without footage:** a selected colour/grid background can be generated automatically with FFmpeg; supply your own footage if you want richer visuals. Optional basic Flite voice remains dependent on the FFmpeg build.
- **Clip Scout transcript cues:** optionally pass a time-aligned `assets/transcript.json` and it combines keyword signals with scene/audio activity. It is a heuristic and **does not comprehend speech like a language model**.
- **Competitors:** use imported YouTube discovery results to calculate *sample-based* views and relative performance; the sample may be too small.
- **Quality gate:** checks draft readiness and a transparent five-cue writing score; use `scripts/quality_check.py` for MP4 dimensions, duration, codecs and SHA-256. It cannot verify copyright, factual accuracy or viewer appeal.
- **Growth assistant:** after manually recording at least three published videos per channel, offers descriptive suggestions based on what received views and retained attention. No claimed AI prediction or guarantee of income.
- **Hook testing:** save the three hook variants as distinct idea projects; this is not a live A/B experiment until you publish and record results yourself.

**No new accounts or subscriptions are needed to open and plan in the browser.** Actual rendering requires FFmpeg/Python, or GitHub Actions after you have an account. This release does **not** magically enable cloud rendering before GitHub setup.

### What is ready now

- Multiple channel brands with YouTube/Instagram handles as **labels only** (not authentication).
- Content studio, manual analytics, publishing calendar and exportable render jobs.
- Growth lab (new in v0.7): record published video views, likes, average percentage viewed, followers gained and actual gross revenue. It compares results and exports a manual performance report; it cannot fetch account analytics or estimate future earnings.
- Viral Radar: save public Instagram Reels / YouTube Shorts references, enter view counts and generate reports. It does not download or repost footage.
- Trend Discovery: a GitHub Actions job can query the official YouTube Data API by niche after you set up a free API key. The browser **imports the resulting JSON report manually**. Video length is used as a short-form proxy; not all results are officially Shorts.
- Clip scout: finds possible highlights from owned/licensed footage using visual cuts and audio signals. It doesn't understand the meaning of conversations.
- FFmpeg renderer: 720x1280 vertical MP4 with editing presets and approximate script captions and optional **basic Flite voice**, if the runner's FFmpeg supports it. Optional local speech alignment is available through faster-whisper when installed; natural expressive AI voices, complete original scene-generation and verified storytelling remain future work.
- Export approved **batches of up to 10 videos** as a single JSON file for a GitHub Actions render run (new in v0.6).
- GitHub release updater (configured only after your GitHub account and first public release exist).

## 2. NEW: export multiple videos with one click

1. In **Content studio**, make two or more projects and mark them **Ready** or **Scheduled**. You must confirm permission for all media, enter your source footage path or a direct permitted HTTPS MP4 link, and fill in any required narration script/audio path. A social viewing URL is not a downloadable source.
2. Open **Publishing queue**. The **Production readiness** panel shows projects blocked for missing permissions, source footage or narration; identical jobs are deduplicated.
3. Click **Export render batch**. The browser downloads `production-batch.json` containing up to 10 approved, unique jobs. It does not contain the MP4 footage itself.
4. When your GitHub account is ready, upload the JSON to **your private production repository** as `jobs/production-batch.json` and supply the approved video files under `assets/` (or use authorised direct HTTPS source files). Video sources in the JSON must be available at those paths to the runner.
5. In your private repository, open **Actions → Render approved batch → Run workflow**. Set **manifest_file** to `jobs/production-batch.json` and `max_videos` to 10 or fewer. Download the `finished-video-batch` artifact (MP4s and `renders-manifest.json`) after the run. GitHub artifacts are retained for 7 days in this template.

This batch workflow only creates videos. It **does not upload to YouTube or Instagram**, even when the project is called "Scheduled". Manually preview and approve all finished videos. The UI checks are a first pass; the renderer checks rights confirmation, video validity and required inputs again.

**Local rendering (optional):** If your computer already has Python 3.10+ and FFmpeg installed, run:

```bash
python scripts/render.py --job jobs/example-clip.json --out output
python scripts/render.py --job jobs/example-original.json --out output
python scripts/batch_render.py --manifest jobs/production-batch.json --limit 10 --out output
```

Alternatively, the existing legacy workflow can still render separate `jobs/*.json` files using `python scripts/batch_render.py --jobs jobs --limit 5 --out output`. Do **not** place a batch manifest in the folder used by legacy folder mode; choose `--manifest` for it.

## 3. GitHub — when you create an account

You do not need to do this now. When you have a GitHub login:

- Make `shorts-studio-app` **public**, for app source code and the release updater only. Upload the **separate** `Shorts_Studio_Public_App_Repo_v0_14.zip` template. Never commit personal videos, credentials or backups to it.
- Make `shorts-studio-production` **private**, for rendering workflows, job JSON files and properly licensed source footage. The full starter ZIP has the relevant `.github/workflows/` examples. GitHub has source-file size limits; larger footage may require your own secure direct file URLs.
- Follow `README-RELEASES.md` to publish the initial `v0.14.0` public release and configure `SETUP-UPDATES.cmd`. From then on, **always** open the installed folder with `OPEN-DASHBOARD.cmd`: it checks for newer published releases and installs app-code changes before opening the dashboard. Offline, it opens the existing version.

The updater does **not** use Git or administrator access, and doesn't replace the `jobs/`, `assets/`, `reports/`, `output/` or `user-data/` folders. It does not back up or synchronise browser localStorage. A real Windows-to-GitHub release update remains **untested until the first public release exists**. Workplace restrictions may prevent PowerShell scripts from running.

GitHub Actions on free plans have usage and storage limits. The template uses bounded jobs and artifact retention but is **not guaranteed to remain within the free quota** on high volume; monitor usage and billing settings.

## 4. Free YouTube trend discovery (after GitHub)

1. In your private repository upload the project, including `.github/workflows/discover-viral.yml` and `reports/discovery-niches.json`.
2. In Google Cloud Console enable **YouTube Data API v3** for a project, create an API key, and store it as a private GitHub Actions secret named `YOUTUBE_API_KEY`. Don't put it in dashboard fields or public code.
3. Optional: edit `reports/discovery-niches.json` to adjust gaming, podcast and science/facts keywords, minimum views and lookback window.
4. Run **Discover YouTube short-form trends** in the private repository Actions tab. The template also schedules a daily discovery run, which GitHub may delay or skip.
5. Download the workflow artifact JSON, open **Trend discovery** and import that file. Save good ideas to Viral Radar or use them to plan **original** content.

Instagram Reels can be tracked through links and manual view snapshots; a reliable unrestricted official discovery API for other creators' Reels isn't provided by this prototype.

## 5. Common safeguards and limitations

- Reposting another creator's clip can breach copyright and may fail YouTube's reused-content monetisation tests, even if subtitles are added. Use media you own or have appropriate licences/rights to reuse and add meaningful original value.
- Always review generated claims, captions, cropping, audio, source permissions and platform eligibility before you upload.
- **No direct ChatGPT integration, automatic account sign-in, publishing, Instagram discovery scraping, private analytics, or language-model semantic clip selection yet.** No guarantee that a clip will earn views or income.
- The dashboard stores state in the browser locally; v0.13 also offers an optional loopback Python service for video render/upload. A GitHub release is for *software updates*, not cloud sync. Browser data is lost if you clear local site storage without a backup. No passwords are needed in this prototype.

## 6. Contents

- `index.html`, `app.js`, `styles.css` — dashboard.
- `scripts/render.py` — individual renderer; `scripts/batch_render.py` — batch renderer; `scripts/scout.py` — footage heuristic clip detection; `scripts/discover_viral.py` and `scripts/viral_metrics.py` — official YouTube Data API reports.
- `jobs/` — sample render jobs and where your approved production manifest goes.
- `assets/` — demonstration background video; replace with media you have rights to use.
- `reports/` — example candidate data, trend configurations and reference watchlists.
- `.github/workflows/` — GitHub Actions examples for rendering, scouting, trends and releases.
- `README-RELEASES.md` — source control / GitHub update guide.

**This is an early but functional prototype, not a fully autonomous video agency.**

## v0.8 — trying the new features

1. Open **Creative lab** in the left sidebar, enter a topic and angle, generate three hooks, then choose **Create draft**. Review the research placeholders in Content studio. For an original draft, source path and source URL may both be blank: the renderer will generate a simple background.
2. Open that draft and choose **word-group captions**, crop focus, gentle pan and background colours. Set rights confirmation only when satisfied you own all the written and audiovisual material. Move the project to **Ready** and export the render job from Content studio or a batch from Publishing queue.
3. To scout with transcript cues, create `assets/transcript.json` such as:

```json
{"segments":[{"start":0,"end":3.1,"text":"Wait, what happens if we try this?"},{"start":3.1,"end":7.5,"text":"Actually this result is surprising!"}]}
```

Run `python scripts/scout.py --source assets/example-background.mp4 --transcript assets/transcript.json --duration 10 --count 3 --rights-confirmed` from your project root. The time-aligned transcript must be your own or authorised.
4. After rendering, run `python scripts/quality_check.py --video output/name.mp4 --out reports/quality.json`. The GitHub batch workflow (when connected) checks output videos automatically and includes quality JSON in the artifact.
5. **Quality gate** helps catch missing permissions, media and narration inputs before rendering. **Competitors** requires importing a valid YouTube discovery report. **Growth lab** only provides performance advice after you enter real results manually.

**Important:** The release ZIP is a standalone folder. If you use a different browser or clear local storage, dashboard data will not follow you automatically; export backups regularly. No one-click app updates will work before you have published an initial GitHub release. The no-footage background uses synthetic graphics, not licensed stock images.
