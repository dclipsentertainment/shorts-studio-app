# DClips Studio — multi-platform creator workspace

**Current version: v0.14.3 | 30 October 2026**

DClips is a four-platform creator workspace for **YouTube Shorts, Instagram Reels, TikTok and Facebook Reels**. The same original 9:16 video can be prepared for each network, with separate account labels, manual performance metrics and earnings tracked by platform.

## Use as a website — Cloudflare Pages (Free)

The source code is already prepared for Cloudflare Pages with a restricted public build. See [Cloudflare setup](README-CLOUDFLARE.md).

**One-time setup:** sign into Cloudflare -> Workers & Pages -> Create application -> Pages -> Connect to Git -> select the public `dclipsentertainment/shorts-studio-app` repository only. Use `bash scripts/build_cloudflare_pages.sh` as the build command and `dist-cloudflare` as the output directory.

**Important:** The Cloudflare deployment still needs account authorisation. A live hosted website is not yet confirmed. Cloudflare will show the real `*.pages.dev` URL after the first successful deployment. The site is public by default, and browser data does not yet sync between computers.

## GitHub repositories

- **Public application:** https://github.com/dclipsentertainment/shorts-studio-app
- **Private production engine:** https://github.com/dclipsentertainment/shorts-studio-production

The private repo includes cloud rendering, expressive AI voice synthesis, original storyboards, technical quality checks, and manually approved **private** YouTube uploads. TikTok, Instagram and Facebook publishing integrations are planned, not currently connected. Automatic publication is intentionally disabled.

## Windows fallback

If you prefer the local version, download the release ZIP from https://github.com/dclipsentertainment/shorts-studio-app/releases/latest, extract once, and open `OPEN-DASHBOARD.cmd`. The launcher checks for new releases and updates itself without Git or administrator access.

## Security and monetisation

We **never publish private footage, credentials or jobs** to Cloudflare Pages. Its static build contains only HTML, CSS, client-side JavaScript and response headers. GitHub account access and future upload integrations must be authorised securely.

We track platform-specific income independently because Ireland's monetisation eligibility differs across YouTube, Facebook, Instagram and TikTok. Views are not automatically equivalent to paid views; read [the Cloudflare guide](README-CLOUDFLARE.md) for restrictions and the [usage guide](README-GITHUB-USAGE.md) for infrastructure cost estimates.

## Release verification

GitHub Actions checks JavaScript syntax, the public asset allowlist, the dashboard controls and release ZIP packaging. The local Windows updater was tested against a real GitHub release.
