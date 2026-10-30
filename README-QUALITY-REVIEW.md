# DClips — Phase 1: render, review and approve

This milestone is available in **DClips v0.14.6**. It is a preparation step, not automatic public publishing.

## How to test an authorised streamer clip locally

1. Open `OPEN-DASHBOARD.cmd` or `OPEN-PRODUCTION-STUDIO.cmd`. One-click local rendering requires Python and FFmpeg **already available on your PC**; on a locked-down computer you can still edit jobs and use private GitHub cloud workflows.
2. Create a content channel and a **Clip from licensed footage** project.
3. Open **Production flow**, select the project and upload a clip you own or are authorised to reuse. The local server stores it under `user-data/media/`. A stream page link by itself is **not** video footage and isn't accepted.
4. Choose **Original audio / no added voice** and **Headline at top only** (or no text). Only add licensed music if genuinely useful, never as a copyright workaround.
5. Check the rights declaration and **Render finished MP4**. The file is stored under `user-data/renders/`.
6. Watch the finished video from beginning to end. The **Final quality & rights review** section shows resolution, duration, audio codec, SHA-256 availability, errors and warnings.
7. Review all four items (video, captions/scenes, rights/music, facts/platform policies), then click **Approve reviewed video**. A failed technical check cannot be approved. This action **does not upload** anywhere.
8. Changing the video content (source, script, voice, captions, headline, title, timing, visual treatment) invalidates that approval. Render and review again.

## How to test an original AI Story

1. Select **Original narrated video** in Content Studio and write a unique script. For factual videos, verify research sources.
2. Use **Production flow** to select one of the four narrator voices (Heart, Emma, Michael, George), an original storyboard and safe image assets.
3. For **private GitHub cloud rendering** the AI voice models are prepared by the cloud workflows. The local downloaded app includes compatible rendering code, but neural speech requires optional Python dependencies and downloaded model files; on restricted Windows machines the AI voice dropdown alone does not install those models.
4. Captions are derived from the actual generated narration audio using optional speech recognition. Word timestamps are estimates; listen and inspect every cue before approval.
5. Test the result through the same technical and human review gate.

## Actual testing

The public app's **Test DClips Phase 1 production milestone** GitHub Actions workflow runs a real FFmpeg MP4 render using generated five-second source video and audio (no third-party copyrighted footage), tests rights-gate rejection, checks original audio preservation, output quality and integrity and asserts that edited projects cannot reuse a previous approval. The private production repo has separate successful cloud previews for two female and two male AI voices.

## Not implemented in this milestone

- Always-on Kick/Twitch detection or automatic stream recording
- Semantic ranking of interesting stream moments
- Browser-controlled cloud job dispatch
- Social network OAuth/posting to Instagram, TikTok or Facebook
- Fully automatic multi-platform uploading
- Cross-device project sync
- Automated copyright clearance or platform eligibility guarantees

No output passes its copyright/originality checks without personal review. A 9:16 codec check is technical, not legal approval.
