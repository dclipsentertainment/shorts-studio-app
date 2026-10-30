# DClips Shorts Studio — one download, automatic updates

## Your GitHub repos

- **Public app:** https://github.com/dclipsentertainment/shorts-studio-app
- **Private video production:** https://github.com/dclipsentertainment/shorts-studio-production

Your app source, separate navigable pages, Windows launchers and release packages are versioned on GitHub. API keys, YouTube OAuth credentials, video jobs and private production reports stay in the **private** production repository, never the public app.

## Download once (Windows)

1. Download the newest `shorts-studio-app.zip` at https://github.com/dclipsentertainment/shorts-studio-app/releases/latest.
2. Extract it once to a folder you can write to, such as `Documents\DClips`.
3. Each time you want to use the app, double-click **OPEN-DASHBOARD.cmd** in that folder.
4. The launcher automatically looks for the latest stable release from the pinned public GitHub repo. If newer, the updater checks the ZIP's GitHub-published SHA-256 digest and installs **application files only**, then opens the dashboard.
5. If you are offline or GitHub is temporarily unavailable, the installed app opens anyway.

**You do not need to download a second ZIP for later app releases**, run Git, enter credentials, or run the one-time SETUP-UPDATES script. `OPEN-PRODUCTION-STUDIO.cmd` also checks for updates when opened directly; `CHECK-FOR-UPDATES.cmd` checks and installs updates on demand.

**Windows requirement:** Windows PowerShell and the ability to run batch scripts; no admin privileges or installation of Git. The app opens in the browser if Python is unavailable. Local MP4 rendering requires Python and FFmpeg, but the private GitHub production workflows can render online.

### Data safety

- The updater only replaces its allowlisted program files and retains rollback copies temporarily if installing a replacement fails.
- It does not touch `user-data/`, `assets/`, `jobs/`, `reports/`, `output/` or browser localStorage.
- Back up your channels and projects from **Setup & backups → Export backup**. Browser profiles/origins store different copies.
- Installing in a **new folder** or switching between the local file, local server, and a GitHub Pages website can show different browser-stored data. Import your saved backup if needed.
- For security, this app always updates from **dclipsentertainment/shorts-studio-app**, not an arbitrary configurable repository. Do not replace the updater with scripts from strangers.

## Different pages

Open the app sidebar to switch among Overview, Channels, Production flow, Content studio, Preview & subtitles, Clip scout, Viral radar, Trend discovery, Publishing queue, Analytics, GitHub usage, Growth lab, Creative lab, ChatGPT script desk, Competitors, Quality gate, and Setup & backups. Each page has a shareable hash route like `index.html#usage`.

## Optional browser version on GitHub Pages

The same static dashboard can be served from GitHub Pages without downloading. In your public repo open **Settings → Pages**, select **Deploy from a branch**, choose **main** and **/(root)**, then Save. After GitHub completes publishing, the intended URL is:

https://dclipsentertainment.github.io/shorts-studio-app/

GitHub Pages only runs the public frontend. Privileged YouTube/API processing remains in private GitHub Actions, and browser-local content is not automatically shared between the Pages site and the Windows dashboard.

## Verified tests

- GitHub workflow `Test DClips self-update on Windows` verified the real Windows updater on GitHub-hosted Windows against an already published release, including checks for preservation of existing `user-data/`.
- A release must be a newer stable `vX.Y.Z` tag with the prescribed `shorts-studio-app.zip` asset and SHA-256 digest. The packaged `VERSION.json` must match the GitHub tag.
- Public releases are built from the public repository's `.github/workflows/release-app.yml` and exclude secrets, media, and private projects.
