**Update for v0.12:** The new **Production flow** screen brings script, caption editing and optional local rendering together. See `README-PRODUCTION-FLOW.md`. This page remains available for detailed caption edits.

# Preview & subtitles — Shorts Studio v0.11

## In the dashboard — works without GitHub or installation

1. Open `OPEN-DASHBOARD.cmd`, or open `index.html` in a browser.
2. Choose **Preview & subtitles** in the sidebar. If needed, first create a project under **Content studio**.
3. Select that project. Choose **Select video** to preview an original media file from your computer, or **Demo video** to try the included licensed sample.
4. Set **Source start** and **Clip length**. Subtitles must be timed **relative to the beginning of your selected clip**, not the original video's start.
5. Import an **SRT**, **WebVTT (.vtt)**, or Shorts Studio **JSON** timed transcript, or click **+ Cue** to write a caption manually. All editing is local to the browser.
6. Play the video to review caption timing. Edit the timestamp and text for any cue. Click the purple time button to jump to a cue.
7. Click **Apply to project**. The trimmed start, clip length and caption JSON save in your local browser workspace. Go to **Content studio → Job** to export rendering instructions. Only the job settings are stored; the actual local video file is **not** saved or uploaded.
8. Export `.srt` or `.json` subtitles separately if useful. If you reload, you must reselect the source video file; your project and saved caption timestamps remain in browser storage. Back up projects via **Setup & backups → Export backup**.

The preview uses the HTML video player and an overlay; it does **not** encode or export the finished MP4. The actual renderer can burn your saved subtitle timestamps into an MP4 if you run it with FFmpeg later. The preview does not auto-crop video into a real 9:16 file or apply all final rendering effects.

## Automatic speech transcription (free, optional)

**Prerequisites:** Python 3.10+, FFmpeg on your PATH, a `faster-whisper` installation, and internet access the **first time** to download the selected free speech model. A local Python installation may be possible without administrator rights, but not on all managed PCs. ChatGPT Pro does not include a free API for automatic application transcription.

In the extracted Shorts Studio folder, run:

```sh
python -m pip install faster-whisper
python scripts/transcribe.py --media assets/example-background.mp4 --clip-start 1 --clip-duration 6 --model base --out reports/transcription/my-first-clip
```

If the selected video has spoken audio, the script produces:

- `reports/transcription/my-first-clip.json` — word-timed caption groups ready to import into **Preview & subtitles**
- `reports/transcription/my-first-clip.srt` — standard timestamped subtitle text

Speech recognition may return no captions for non-speech audio. Review every recognised word and timestamp before publishing. If the recording contains sensitive material, consider whether you want to download speech model dependencies on your local machine.

### Using an approved Shorts Studio render job

```sh
python scripts/transcribe.py --job jobs/example-clip.json --model base --out reports/transcription/latest
```

This reads the local job's `source.path`, `source.start_seconds`, and `duration` values; it checks `rights_confirmed` is true. It can also transcribe `narration.audio_path` for jobs with a supplied recorded voice file. Remote social URLs are not supported. Clips are limited to 180 seconds. Default `base` model runs on the CPU; `tiny` is faster but less accurate, and `small` may be more accurate but is slower. There are no per-minute API fees, but running the model consumes compute resources.

If you later connect GitHub, upload the private production repository template. The **Transcribe authorised Short** Actions workflow can run it in the cloud and supply a downloadable JSON/SRT artifact. GitHub limits and internet/model downloads apply. The cloud workflow **does not** publish a video or automatically import the transcript into the dashboard.

### Advanced: render the captioned job

Once your project is saved and rights-confirmed, export its job JSON from Content Studio, place it in `jobs/`, add the licensed source video to the relative media path given in `source.path`, then run:

```sh
python scripts/render.py --job jobs/your-project.json --out output
```

**Limitations:** Preview is local to one browser tab. Transcription is a separate optional command/workflow, not an in-browser AI service. Timecodes are based on estimated ASR word timestamps and can drift. Video export, multiple accounts, posting, AI sourcing and publishing remain separate stages.
