# DClips Entertainment — Cloudflare Pages setup

**Goal:** A free website with the existing multi-page DClips dashboard. GitHub remains the source of truth for application code and the private video-production engine.

## What is ready

- Existing public app repository: https://github.com/dclipsentertainment/shorts-studio-app
- Existing private production repository: https://github.com/dclipsentertainment/shorts-studio-production
- Static-site build script: `scripts/build_cloudflare_pages.sh`
- Static deploy output: `dist-cloudflare/` (HTML/CSS/JS/_headers only)
- Automated GitHub build/test workflow: `Verify public DClips Cloudflare Pages build`
- Current UI tracks YouTube Shorts, Instagram Reels, TikTok videos and Facebook Reels, including manual views and platform-specific earnings.

## Connect Cloudflare Pages to GitHub (one-time action required)

1. Sign up or sign into the **Free** plan at https://dash.cloudflare.com/.
2. Choose **Workers & Pages**, then **Create application → Pages → Connect to Git**.
3. Authorize the Cloudflare GitHub app. Where possible, select **Only select repositories** and grant access exclusively to `dclipsentertainment/shorts-studio-app`. **Do NOT authorize the private** `shorts-studio-production` repository as part of this static site setup.
4. Select `dclipsentertainment/shorts-studio-app`.
5. Set:
   - Production branch: **main**
   - Framework preset: **None**
   - Build command: **bash scripts/build_cloudflare_pages.sh**
   - Build output directory: **dist-cloudflare**
   - Root directory: **/** (repository root)
   - Environment variables: **none**
6. Click **Save and Deploy**. Cloudflare will show the actual generated `*.pages.dev` web address. Do not guess the address before successful deployment.
7. Open the website, check **Channels**, **Content studio**, **Analytics** and **GitHub usage**. Every new push to `main` triggers a Pages rebuild.

**No paid plan, custom domain, Git installation or Windows download required.** Cloudflare Pages has a free tier. Its limits and terms may evolve.

## Privacy and future backend work

Cloudflare Pages serves a **public website** by default. It is NOT password-protected merely because the production repo is private. The static build excludes private footage, account tokens, project backups and GitHub workflow files. The actual private GitHub repository stays private.

At this stage the cloud-hosted app works as a browser-only planning, previews, manual analytics, platform tracking and usage reporting frontend. Per-browser localStorage does **not** automatically sync across computers, URLs, devices or profiles. To migrate existing content, export your current workspace via **Setup & backups → Export backup**, then import it into the Cloudflare version. Keep backups.

Generating videos, AI voices and private YouTube uploads continues to happen in **private GitHub Actions**. The web dashboard is not yet connected directly to those workflows. A secure authenticated backend must be implemented before we expose video generation, private files or social-platform OAuth actions through the website. Cloudflare Pages Functions or Workers are a potential backend, but need authentication, scoped permissions and rate/cost limits.

Do not add GitHub personal access tokens or YouTube OAuth credentials to public JavaScript, HTML, GitHub app source, or client-side Cloudflare Pages environment variables. Workers secrets may be used **only server-side**, after the backend has a real authorization design.

## Notes on platforms and monetisation

DClips is designed as a **multi-platform** vertical-video creation system, not a YouTube-only reposting tool. Content should be original or properly licensed. Account connections, automatic multi-platform publishing and platform-verified revenue reporting are planned work, not enabled by this static deployment.

TikTok Creator Rewards eligibility varies by country (currently not available to Irish-based creators), and rewards require eligible original video lengths. Instagram often relies on sponsorships, gifting and affiliates. Facebook Content Monetization is invitation-only. YouTube eligibility and revenue rules also evolve. **Never treat views as guaranteed income.**

## Cloudflare Pages release safety

The build allowlists **only** `index.html`, `app.js`, `github-usage.js`, `styles.css` and `_headers`. It blocks the inclusion of other files, including `user-data/`, credentials, Python rendering code, GitHub workflows and reports.

Security headers set noindex, deny framing, and restrict camera, microphone and geolocation. Static assets are public; no secrets should be placed there.
