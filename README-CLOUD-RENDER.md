# DClips: ChatGPT images → free-tier GitHub cloud MP4

This workflow runs from the **online DClips dashboard**, even without a graphics card, Python, or FFmpeg on your computer. It uses browser file selection, a manual private GitHub upload, and GitHub-hosted rendering. GitHub Actions may have free usage limits and may charge if you exceed your account's allowances: review your GitHub billing settings before large batches.

## Start with just the title

1. Open **Quick Create**. Enter a story title; short description is optional.
2. Click **Prepare my story with ChatGPT**, paste the generated request into ChatGPT, then paste the returned JSON into Quick Create.
3. Review the complete story, chronological illustration prompts, factual sources, duration and part recommendations. Click **Create editable video drafts**.
4. In **Production flow**, use **Copy ChatGPT image request for this episode** to get a numbered prompt for exactly that episode's scenes. Paste it into ChatGPT. Ask ChatGPT for a single ZIP with the separate, numbered images if its tools permit it (not a collage); otherwise save the numbered pictures separately. Prefer filenames `01-cover.png`, `02-scene.png`, `03-scene.png`, and so on.

## Bulk import from your browser

1. Open **Production flow**, select the episode you want to produce. Use **Illustrated story** visual mode. Generate this episode's matching images from the provided ChatGPT prompt first.
2. Under **ChatGPT image pack → online video**, choose **one ChatGPT image ZIP**, or all separate images together (PNG/JPG/WebP). ZIP contents are unpacked in the browser without installing software. The app matches numbered filenames to the same-numbered scene. Unnumbered images are assigned alphabetically into remaining positions.
3. Check each thumbnail. Change the individual dropdown to swap the picture matched to a scene.
4. Confirm you have the rights to use the images, narration and story. If it is a factual story, review the source claims in the content editor.
5. Click **Download pack & open GitHub upload**. The download begins and the GitHub upload page opens in a new tab (if your browser allows pop-ups). A ZIP named `cloud-render-YYYYMMDDHHMMSS-xxxxxx.zip` downloads. It contains the **script, story metadata and exactly one image per scene**. Images are not sent automatically to our website and do not become browser-stored project assets. Selected image files are kept in browser memory and disappear after a reload.

## Run rendering entirely online

1. The **private** GitHub upload page should already be open. If your browser blocked the tab, open https://github.com/dclipsentertainment/shorts-studio-production/upload/main manually.
2. Click **Add file → Upload files**, choose the newly downloaded `cloud-render-....zip`, then **Commit changes** to `main`. One ZIP per commit. **Never upload this ZIP to your public DClips app repository.**
3. In **Actions**, open **Render uploaded DClips video** (it starts automatically after the upload). GitHub renders the illustrations, narration, subtitles and transitions.
4. Open the completed workflow run and download **finished-online-video** in its Artifacts section. You can download the artifact ZIP and select it **directly in DClips** to view the MP4, without extracting it. DClips also accepts an already-extracted MP4. The technical quality report remains inside the ZIP for inspection.
5. Return to **Production flow**, choose **Review the finished cloud video**, select the downloaded **finished-online-video.zip** (or its MP4) and watch it. For a story-series episode, watching the full MP4 unlocks the controls to revise number of parts and target duration. The uploaded MP4 stays in your browser; it is not posted.

## Security and quality

- The public dashboard has no GitHub personal access token, OpenAI API key, or media-upload endpoint.
- The private GitHub workflow validates the ZIP paths, names, per-image limits, required rights flag and disallowed media references, then generates the MP4 with a free voice model and FFmpeg. No automatic social-media publishing.
- Maximum eight images per episode, 8 MiB per image and 36 MiB total. A large multi-part story is rendered **one episode per upload** at present.
- AI-generated art may contain factual or visual mistakes. Check each image and narration; passing file-format checks is **not** an approval of factual accuracy, copyright, or storytelling quality.
- GitHub workflow artifacts expire after seven days. Download your finished video promptly.
- Repeated ZIP commits stay in the private repository and count toward repository storage. Delete old ZIPs when no longer needed. Their removal will not delete downloaded MP4s.

**Limitations:** Fully automatic cloud upload would require secure account authorization/back-end integration. For zero additional API billing, the website intentionally asks you to move the ZIP into your private GitHub repository. ChatGPT image generation itself still takes place in your ChatGPT conversation within your plan allowance. The dashboard cannot automatically use your ChatGPT subscription to generate image files. There is not yet a hosted instant streaming preview generated without this GitHub handoff.
