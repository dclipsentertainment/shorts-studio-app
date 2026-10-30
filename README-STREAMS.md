# DClips Studio — Stream Monitor and AI Stories

DClips has **two separate content-production paths** designed for YouTube Shorts, Instagram Reels, TikTok videos and Facebook Reels.

## Path A: Streamer Clips (gaming and IRL)
**Editorial default:** keep the authentic original stream audio. AI narration is optional, not automatic. The best edit may be just a well-chosen licensed clip with an accurate headline and tasteful subtitles.

**Current app status (v0.14.4):**
- Separate **Live stream monitor** page for a streamer watchlist.
- User can save Twitch, Kick or YouTube channel usernames with ownership/permission status.
- Each entry can open the official stream page and start a **review-only** clip project in Content Studio.
- Clip projects default to **original audio** and optional **hook at top only**.
- Projects cannot be rendered until their owner manually confirms sufficient rights and provides authorised media.
- These features are local; there is **no live-status API connection, autonomous stream capture, automatic highlight-detection or notifications yet**. Do not imply otherwise.

**Planned live pipeline (requires real backend/auth):**
1. Platform Go Live event (prefer Twitch official EventSub `stream.online`; investigate appropriate official Kick/YouTube status mechanisms).
2. Notify the signed-in DClips user on the website when a **verified** live-status transition occurs. Browser notifications require user opt-in; notifying when closed requires additional push infrastructure.
3. Analyse *permission-cleared* live segments or the broadcaster's authorised VOD starting at stream start. Do not silently download other creators' broadcasts from third-party endpoints.
4. Find candidate moments using audio peaks, speech/emotion cues, chat activity where authorised, gameplay scene changes and ASR. A loud sound isn't always interesting; score candidates and preserve surrounding context.
5. Suggest 15–60-second candidates and rank them for manual approval.
6. Let the editor choose **Original Audio**, **Headline Only**, **Accurate Captions**, **Commentary**, or **No Overlay**. Never add background music merely to attempt copyright evasion.
7. Run rights and original-value review, then show private previews. Keep public publishing off by default.

Twitch's APIs include **Create Clip** and **Create Clip From VOD**, but they have different broadcaster/editor access requirements; permissions must be verified in the official API documentation. A Clip button or official clip URL is **not** a blanket permission to redistribute for commercial use on other networks.

### What counts as a useful clip
A surprising game ending, funny reaction, dramatic reversal, original creator commentary, genuinely interesting IRL moment, or unusual skill display. Avoid generic loudness-based compilations, misleading clickbait and decontextualised personal moments.

## Path B: AI Stories (fiction, history, explainers)
- Write original scripts and verify all factual historical claims.
- Select among **Heart — American female**, **Emma — British female**, **Michael — American male**, and **George — British male** (Kokoro neural TTS).
- Narration is optional; characters and voices should not impersonate identifiable real people without permission.
- Use actual voice audio and speech-to-text word timestamps for captions, rather than dividing the video into equal text chunks. Word timestamps are **estimates**; always review previews and correct any transcription errors.
- Synchronise storyboard scene changes to narrative beats in a later iteration (word sync alone does not ensure semantic scene alignment).
- Retain two alternative formats, including caption-only and original-audio-first.

## Copyright & commercial reuse safeguards
1. **Recording/reposting footage requires rights.** An online stream being public, clip-enabled, or already viral does not automatically authorise commercial republication. For routine clipping of creators such as Neon, obtain an explicit written grant covering clips, derivative editing, platforms, monetisation, and the expected duration of permission.
2. **Permission is different from monetisation eligibility.** Even with a streamer's permission, YouTube can deem minimally edited third-party footage ineligible under its reused-content policy. Facebook also deprioritises minor edits including captions/borders.
3. **Music is a second copyright layer.** The stream itself may include copyrighted songs, games or broadcast audio. Adding royalty-free music doesn't neutralise third-party audio. Default **music off**; if added, obtain a licence covering all intended platforms and commercial reuse.
4. **Text and cropping aren't copyright shields.** Adding a headline, filter, borders, zoom or captions may improve watchability but usually isn't enough to establish originality. Where editorially appropriate, add meaningful commentary, analysis, storytelling or original value rather than artificial embellishments.
5. **IRL streams may include private people.** Review context, privacy rights, minors, personal information and what the streamer agreed you could reuse.
6. **Historical facts are not copyrighted**, but illustrations, music, photos, archival films, quotations and other source materials can be.
7. **Never auto-publish** suspicious or unapproved footage. The final approval gate should include actual rights, factual accuracy, platform-specific monetisation policies and a clean copyrighted-music review.

## Why cloud processing must be scoped
24/7 full-video recording and transcription of many live channels can rapidly exceed free GitHub Actions minutes, storage and bandwidth. Start with a handful of authorised streamers, detect go-live using lightweight events, watch metadata, and perform selective candidate analysis. Add GitHub/Cloudflare budget safeguards and explicit opt-in for long-running recording.

## User experience
The DClips website remains browser-based; current app releases are still available for Windows. Live monitoring and private workflow actions require a secure Cloudflare connection before they can run unattended. The public static site must never contain GitHub/YouTube tokens or streamer footage.
