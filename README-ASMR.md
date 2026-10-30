# Satisfying ASMR — original, free-tier cloud videos

The **Satisfying ASMR** page is an additional creator mode alongside story videos. It only asks for a **title** and an optional **short description**. The browser now chooses one of four **cinematic procedural v2** styles, a colour palette and a sound-intensity treatment, directly from the title and optional description.

| Auto-selected subject | Animation | Original generated sound |
| --- | --- | --- |
| Slime / squishing / jelly | Multi-layer shiny gel with micro-bubbles, surface reflections and repeated press/rebound animation | Layered stereo wet squish and tiny synchronized pops |
| Bubble popping | Iridescent reflections, drifting hero bubble, outward particles and timed bursting | Stereo bubble pops and soft plinks matching visible bursts |
| Kinetic sand cutting | Fine granular texture, shallow depth cues, animated blade and loose grains | Stereo grainy scraping/clicks following each cut |
| Soap carving | Highlighted soap slab, shallow carved grooves and smooth shaving ribbons | Original layered shaving and crisp slicing sounds |

If the title is ambiguous, DClips defaults to **Slime squishing**. It also infers a mint, rose, lavender or amber colour treatment and gentle, balanced or crisp sound from ordinary descriptive words. No extra settings, voice or narration are required.

## Quick workflow — no local PC rendering

1. Open **Satisfying ASMR** in the left sidebar.
2. Enter your **title**; description is optional. Click **Generate ASMR concept**.
3. Read the proposed subject, visuals and sound. DClips selects a 16-second, 9:16 original 24 fps loop automatically, with precomputed material shading, dynamic highlights, subtle continuous camera push-ins and stereo Foley. The animated colour swatch is only an illustration of the style, **not the final video**.
4. Click **Approve concept & start online render**. DClips downloads a small `cloud-asmr-YYYYMMDDHHMMSS-xxxxxx.json` job file and opens your **private** GitHub production repository upload page.
5. Choose the downloaded JSON file, then **Commit changes** to `main`. GitHub Actions automatically runs **Render uploaded satisfying ASMR video** and creates an MP4. Only one new cloud-asmr job per commit.
6. Download the **finished-asmr-video** artifact ZIP under the completed workflow run, and select the ZIP directly on DClips' ASMR page. DClips plays the generated video with sound for your final approval. No automatic social posting occurs.

The job JSON contains a title, optional description and safe predefined render options. No uploaded footage, narration, images, account tokens, image AI API credits, GPU, software installation or local FFmpeg are required. The runner uses NumPy, Pillow, standard-library Python sound synthesis and FFmpeg. It produces a 720×1280 final MP4 and 48 kHz AAC stereo audio. GitHub Actions usage and storage have account-level limits and may incur fees if you exceed your allowance.

**Quality distinction:** This more advanced version still uses animated, algorithmically textured artwork and synthesised stereo effects, rather than a photorealistic text-to-video model. It does **not** create photorealistic macro footage of real hands squishing slime, shaving soap or cutting real kinetic sand; it does not record real Foley sounds. Those require authorised real stock footage/recordings or a separately available AI-video service. The free procedural renderer is a foundation for production-style satisfying loops.

The final MP4 and GitHub Actions quality check are technical, not editorial approval. Listen and watch for artefacts, abrupt cuts, overly loud effects, repetitive movement or visual inaccuracies before publishing. The artifacts expire after seven days. For privacy, upload the JSON only into your **private** `dclipsentertainment/shorts-studio-production` repository, not the public app repository.

## Cinematic procedural v2 improvements

Compared with the previous flat ASMR loops, cinematic v2 has deterministically generated material micro-texture, highlights/shadows, gradual camera movement, more detailed cutting/pressing/ripple cues and stereo sound envelopes locked to the 2-second action cadence. Audio includes gentle fades and conservative peak limiting. GitHub Actions runs all rendering without needing any local GPU, extra AI credits, or an external copyrighted sound library. Earlier v1 jobs remain supported by the private renderer for reproducibility.

This remains a **procedural illustrated video**, not actual macro-camera footage. It can be more polished and satisfying than the original simple animation without claiming to replicate high-end text-to-video realism. The still image on the DClips planning page is illustrative only; always assess the downloadable full MP4 and audio.
