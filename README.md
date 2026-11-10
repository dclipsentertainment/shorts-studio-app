# DClips Studio — multi-platform creator workspace

**Current version: v0.14.17 | 30 October 2026**

DClips is a four-platform creator workspace for **YouTube Shorts, Instagram Reels, TikTok and Facebook Reels**. The same original 9:16 video can be prepared for each network, with separate account labels, manual performance metrics and earnings tracked by platform.

## Use as a website — Cloudflare Pages (Free)

The source code is already prepared for Cloudflare Pages with a restricted public build. See [Cloudflare setup](README-CLOUDFLARE.md).

**One-time setup:** sign into Cloudflare -> Workers & Pages -> Create application -> Pages -> Connect to Git -> select the public `dclipsentertainment/shorts-studio-app` repository only. Use `bash scripts/build_cloudflare_pages.sh` as the build command and `dist-cloudflare` as the output directory.

**Important:** The Cloudflare deployment still needs account authorisation. A live hosted website is not yet confirmed. Cloudflare will show the real `*.pages.dev` URL after the first successful deployment. The site is public by default, and browser data does not yet sync between computers.

## GitHub repositories

- **Public application:** https://github.com/dclipsentertainment/shorts-studio-app
- **Private production engine:** https://github.com/dclipsentertainment/shorts-studio-production

The private repo includes cloud rendering, expressive AI voice synthesis, original storyboards, technical quality checks, and manually approved **private** YouTube uploads. TikTok, Instagram and Facebook publishing integrations are planned, not currently connected. Automatic publication is intentionally disabled.

## Story Series — Instagram parts, YouTube Shorts, TikTok and complete Facebook stories

Open the **Story series planner** from the left menu, paste your complete narrated script, select platforms and adjust their recommended episode lengths. The planner shows numbered parts and can create editable video drafts in Content Studio, with no automatic uploads. Original stories now support planning and rendering up to 10 minutes; clip projects remain up to three minutes. Read [Story Series](README-STORY-SERIES.md) for details, current caveats and manual review steps.

## Phase 1 production review

- **Working now:** Local FFmpeg output and technical MP4 quality reports (codec, 9:16, duration, SHA-256), followed by four explicit human review checks. Editing the project invalidates previous approvals. Includes editor-imported speech-timed subtitle cues and a video-comparison link. See [Quality review](README-QUALITY-REVIEW.md).
- **Tested:** GitHub Actions creates a rights-approved sample streamer clip with original audio and headline, then verifies the MP4 and review state.
- **Limit:** Local AI voice synthesis requires optional speech packages and model files; previous cloud narrator previews remain available through the private production repository.

## Windows fallback

If you prefer the local version, download the release ZIP from https://github.com/dclipsentertainment/shorts-studio-app/releases/latest, extract once, and open `OPEN-DASHBOARD.cmd`. The launcher checks for new releases and updates itself without Git or administrator access.

## Easier editing (v0.14.5)

- One-click **Remove AI commentary** while keeping the original clip soundtrack when it exists.
- Overwrite any timed caption or headline using the editor's text box.
- **Drag the on-screen text** or enter X/Y positions; save placement with the render job and final MP4.
- The position currently applies to the whole caption track; individual wording/timing remains editable.
- [Caption editor and copyright guidance](README-CAPTION-EDITOR.md).

## Two creative modes

- **Stream Monitor:** Track Twitch, Kick and YouTube streamers in a saved watchlist, record reuse permissions, and create review-only clip projects. Automatic go-live detection, stream recording and candidate scoring are NOT connected yet. See [Stream and AI Story guide](README-STREAMS.md).
- **AI Stories:** Four narrator options (two female, two male) in Content Studio and Production Flow. The private GitHub engine can generate narrated previews with captions timed using the generated audio. Always review sync and transcription accuracy.
- **Creator clips:** Keep original audio by default; choose top headline only, accurate captions, or no overlays. Text/music does NOT avoid copyright.

## Security and monetisation

We **never publish private footage, credentials or jobs** to Cloudflare Pages. Its static build contains only HTML, CSS, client-side JavaScript and response headers. GitHub account access and future upload integrations must be authorised securely.

We track platform-specific income independently because Ireland's monetisation eligibility differs across YouTube, Facebook, Instagram and TikTok. Views are not automatically equivalent to paid views; read [the Cloudflare guide](README-CLOUDFLARE.md) for restrictions and the [usage guide](README-GITHUB-USAGE.md) for infrastructure cost estimates.

## Release verification

GitHub Actions checks JavaScript syntax, the public asset allowlist, the dashboard controls and release ZIP packaging. The local Windows updater was tested against a real GitHub release.



## v0.15.0: connected story workflow

The app's **Story creator** page combines a title, reviewed narration, continuity notes, scene pictures, online voice/rendering and finished-video preview. Script and artwork generation still use copied ChatGPT prompts and imported images; no paid generation API is implied. The optional GitHub connection holds a fine-grained token only in tab memory. Limit it to the private production repository with Contents read/write and Actions read. Uploading a reviewed pack starts the existing private render workflow. Download the completed Actions artifact and open it in the creator to preview.

Each scene stores its complete narration beat and a shared character/style reference. Measured caption timing locates scene boundaries when matching succeeds; otherwise the existing narration-duration scaling remains the fallback. Images remain creator-reviewed illustrations, not authenticated historical photographs.

Replace one picture without replacing the others, or open the subtitle editor after preview. The private workflow caches verified narration WAVs; unchanged speech can be reused after picture/caption/style edits. Narration text, voice, model or engine changes invalidate it. Cache availability is best effort and final video encoding still runs.

Download a **complete browser backup** (`.dclips`) to preserve the workspace, attached pictures, their assignments and imported finished videos. Restore validates project references and media checksums before replacing storage. Backups support up to 250 MiB of media. Files referenced only by filesystem paths are not included; back those up separately. Keep backups outside browser storage.

**Production health** shows installed/latest versions, private connection status, tracked failures, browser storage and imported usage estimates. Remaining billable allowance and a deployed website's availability are not inferred. This release does not automatically provision hosting or publish videos.

Upgrading from v0.14.17 or earlier: download and extract the v0.15.0 ZIP once. Those older updaters reject newly introduced root JavaScript files. Keep your existing browser origin and export a complete backup before moving installations. Subsequent releases use the expanded updater allowlist.


## v0.16.0: online studio and fewer manual steps

Open https://dclips-studio-online.diamand456.chatgpt.site for the private hosted dashboard. Existing browser storage belongs to its original address: download a complete .dclips backup there and restore it on the hosted app to move projects and attached media. The browser app needs no ZIP installation. Updates are deployed to this stable address.

Story creator now supports History, General stories and ASMR defaults, saved per-channel voice/style/caption/platform settings, and a readiness review before upload. Factual claims need your review or a fiction confirmation; automated checks detect placeholders but cannot establish truth or rights. Actions minutes are shown as a broad planning estimate, not verified billing or a free-allowance guarantee.

On the hosted app, successful story renders load their video artifact directly into preview while the page is open and connected to GitHub. A manual Load preview button retries expired connections. Tokens remain in tab memory and are passed transiently through the same-origin streaming proxy; they are never sent to the artifact storage redirect. Artifact expiry and 500 MiB limits are reported rather than hidden.

Media setup uses signed Ubuntu packages, HTTPS, IPv4, bounded retries and an alternate official mirror. Dependency failure remains a hard failure; tests are never skipped to make CI appear green.
