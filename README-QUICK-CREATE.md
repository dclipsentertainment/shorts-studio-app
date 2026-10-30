# DClips Quick Create — title first

Open **Quick Create** in the sidebar (or **Create story** at the top).

1. Enter the **story title**. A short description is optional. Nothing else is required.
2. Click **Prepare my story with ChatGPT**. DClips writes the entire request, attempts to copy it, and opens a ChatGPT tab. If the clipboard is blocked, use the visible Copy ChatGPT request button.
3. Open ChatGPT and paste the prepared request. ChatGPT writes the original narration, chooses fiction/factual treatment, produces chronological scene descriptions, and lists factual sources where appropriate.
4. Copy the returned JSON into Quick Create and click **Review generated story**.
5. Review the full script, suggested illustrations, the automatically prepared numbered ChatGPT image-generation request, factual citations and recommended episode counts for YouTube, TikTok, Instagram and Facebook.
6. Click **Create editable video drafts**. DClips automatically saves per-platform scripts, estimated timings, a default voice, scene descriptions and episode numbering. A default **DClips Entertainment** brand is created if no channel exists.

**No paid API is called**, and the computer does not run an image model. This is a small, deliberate manual ChatGPT copy/paste step because a ChatGPT subscription does not give the public DClips website a free image-generation API.

**After draft creation:** Open an episode in **Production flow**, copy its scene-specific ChatGPT image request, and generate the numbered illustrations with ChatGPT. Import them together using **ChatGPT image pack → online video**. DClips prepares one private cloud-render ZIP; manually upload it to your private GitHub production repository to render online. Download the resulting MP4 artifact and open it in DClips for review. No local GPU, Python or FFmpeg required. See **README-CLOUD-RENDER.md**. DClips still requires manual ChatGPT image creation, a GitHub upload and factual/rights approval; it does not automatically publish.

This creator complements, rather than removes, the advanced Story series planner, ChatGPT script desk and Production flow. The advanced editors remain available if you decide to change anything after the first preview. Do not trust generated sources or factual claims without checking them.

For convenience, Quick Create temporarily remembers the title, optional description and pasted JSON in this browser so you can return from ChatGPT without losing your progress. Creating drafts clears that temporary handoff. Clearing browser storage also clears it.
