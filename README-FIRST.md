# DClips Shorts Studio — Start here

**Version 0.14.2 | 30 October 2026**

DClips is a GitHub-managed Shorts production dashboard. It has separate pages for planning, video production, previews, trends, publishing, analytics, growth and GitHub Actions usage.

## One download, then automatic updates

1. Download the newest **shorts-studio-app.zip** from https://github.com/dclipsentertainment/shorts-studio-app/releases/latest.
2. Extract it once into a permanent writable folder, such as Documents\\DClips.
3. Double-click **OPEN-DASHBOARD.cmd** whenever you want to use it.
4. It checks **your public GitHub app repository** for a newer stable version, verifies the downloaded ZIP's SHA-256 digest, updates the application files and opens your dashboard.
5. It works offline using the version already installed. Your own files and browser data are not replaced.

**You do not need Git, administrator permissions, a new ZIP for every update, or manual updater configuration.**

If Python is already available, the launcher opens a local production server. Otherwise it opens browser-only mode. You can use planning tools, analytics and GitHub usage monitoring without Python. Local MP4 rendering requires Python and FFmpeg, while the private GitHub repository has cloud-based rendering workflows.

## Separate pages

The app sidebar has: Overview, Channels, Production flow, Content studio, Preview & subtitles, Clip scout, Viral radar, Trend discovery, Publishing queue, Analytics, GitHub usage, Growth lab, Creative lab, ChatGPT script desk, Competitors, Quality gate, and Setup & backups. Hash links such as `#usage` open an individual page.

## Your two GitHub repositories

- **Public app and downloadable updates:** https://github.com/dclipsentertainment/shorts-studio-app
- **Private YouTube production workflows and credentials:** https://github.com/dclipsentertainment/shorts-studio-production

Your production repository already supports rights-confirmed video rendering, technical quality checks, natural AI-voice previews and explicitly approved **private** YouTube test uploads. A confirmed private test upload succeeded. Public publishing remains off unless you explicitly approve it.

The local browser dashboard does **not** directly manage your private GitHub Actions workflows yet; follow their links from GitHub.

## Data and security

Your project and channel plans are stored in your browser, **not** in GitHub automatically. Use **Setup & backups → Export backup** regularly. A file opened from a `file://` path, the optional local server, and GitHub Pages are different browser storage locations; import your backup before switching.

The automatic updater uses a hard-coded official DClips public repository, validates each release and only updates known application-code files. It never reads or uploads YouTube credentials.

## Optional browser website on GitHub Pages

To use DClips directly from GitHub without downloading, open your public GitHub repo's **Settings → Pages**, select **Deploy from a branch**, **main / (root)**, then Save. After publishing, the website can be reached at:

https://dclipsentertainment.github.io/shorts-studio-app/

The hosted website offers the public frontend only. Your private production data stays in GitHub's private repository.

## More help

- **README-RELEASES.md** — how auto-update and GitHub Pages work, including tested Windows update
- **README-GITHUB-USAGE.md** — GitHub Actions usage and billing monitor
- **README-PRODUCTION-FLOW.md** — plan and render a Short
- **README-STORYBOARD.md** — animated storyboards
- **README-PREVIEW-AND-SUBTITLES.md** — previews and subtitles
- **README-CHATGPT-WORKFLOW.md** — ChatGPT scripting workflow

The Windows auto-updater was tested in GitHub Actions against a real published GitHub release. Actual local video-rendering requirements still depend on your computer.
