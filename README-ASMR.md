# Satisfying ASMR — original, free-tier cloud videos

The **Satisfying ASMR** page is an additional creator mode alongside story videos. It only asks for a **title** and an optional **short description**. The browser chooses one of four original satisfying styles and an associated synchronised sound treatment.

| Auto-selected subject | Animation | Original generated sound |
| --- | --- | --- |
| Slime / squishing / jelly | Elastic translucent blob compressed and released | Low wet squish pulses |
| Bubble popping | Large shimmering bubbles expanding and popping | Gentle pops and plinks |
| Kinetic sand cutting | Textured pastel sand block sliced by a smooth blade | Fine crunchy scraping |
| Soap carving | Colourful soap block being shaved into curls | Delicate slicing/shaving |

If the title is ambiguous, DClips defaults to the **Slime squishing** style. No extra settings, voice or narration are required.

## Quick workflow — no local PC rendering

1. Open **Satisfying ASMR** in the left sidebar.
2. Enter your **title**; description is optional. Click **Generate ASMR concept**.
3. Read the proposed subject, visuals and sound. DClips selects a 16-second, 9:16 original loop automatically. The animated colour swatch is only an illustration of the style, **not the final video**.
4. Click **Approve concept & start online render**. DClips downloads a small `cloud-asmr-YYYYMMDDHHMMSS-xxxxxx.json` job file and opens your **private** GitHub production repository upload page.
5. Choose the downloaded JSON file, then **Commit changes** to `main`. GitHub Actions automatically runs **Render uploaded satisfying ASMR video** and creates an MP4. Only one new cloud-asmr job per commit.
6. Download the **finished-asmr-video** artifact ZIP under the completed workflow run, and select the ZIP directly on DClips' ASMR page. DClips plays the generated video with sound for your final approval. No automatic social posting occurs.

The job JSON contains a title, optional description and safe predefined render options. No uploaded footage, narration, images, account tokens, image AI API credits, GPU, software installation or local FFmpeg are required. The runner uses Pillow, standard-library Python sound synthesis and FFmpeg. GitHub Actions usage and storage have account-level limits and may incur fees if you exceed your allowance.

**Quality distinction:** This first version uses animated artwork and algorithmically synthesised effects. It does **not** create photorealistic macro footage of real hands squishing slime, shaving soap or cutting real kinetic sand; it does not record real Foley sounds. Those require authorised real stock footage/recordings or a separately available AI-video service. The free procedural renderer is a foundation for production-style satisfying loops.

The final MP4 and GitHub Actions quality check are technical, not editorial approval. Listen and watch for artefacts, abrupt cuts, overly loud effects, repetitive movement or visual inaccuracies before publishing. The artifacts expire after seven days. For privacy, upload the JSON only into your **private** `dclipsentertainment/shorts-studio-production` repository, not the public app repository.
