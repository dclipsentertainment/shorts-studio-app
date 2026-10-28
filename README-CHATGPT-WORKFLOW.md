# ChatGPT Script Desk — free handoff workflow (v0.9)

Shorts Studio is a local dashboard. It **cannot directly call or access ChatGPT Pro**, and a ChatGPT Pro subscription does not grant free API calls. This tool copies a prompt to your own ChatGPT conversation, then imports its JSON answer. No social accounts, GitHub account, code installation or API key required for planning.

## Try it

1. Extract the ZIP and open `index.html` or `OPEN-DASHBOARD.cmd` (Windows).
2. Create a channel, e.g. **Curious Science**.
3. Open **ChatGPT script desk** and enter a topic. Choose channel, length, style and original/clip format.
4. Click **Build ChatGPT prompt**, then **Copy prompt**. If clipboard access fails, select the prompt and Ctrl+C, or use **Download prompt**.
5. Click **Open ChatGPT** and paste it into a new ChatGPT conversation. It should return one JSON object containing: `schema_version`, `title`, `narration_script`, `youtube_title`, `youtube_description`, `instagram_caption`, `hashtags`, `suggested_duration_seconds`, `claims`, and `editor_notes`.
6. Return to Shorts Studio, paste the complete JSON into the response box, and click **Preview and validate**. You can also test the importer using the illustrative `reports/chatgpt-script-example.json` included in this ZIP (source link not validated).
7. Click **Save as draft in Content studio**. It will not be marked ready and will not upload anything.
8. In **Content studio**, edit that project. Visit every reference and **personally verify** each material factual statement. The app only checks URL syntax, not whether the citation supports the claim.
9. After verifying references, confirm **AI references reviewed** and media/music rights. Save. Only then can the project pass the batch rendering preflight.
10. Optional: once you have FFmpeg/Python or GitHub Actions available, export the approved render job. Check the output video before publishing.

## What it does not do

- Does not retrieve sources, browse YouTube, transcribe videos or contact ChatGPT automatically.
- Does not perform actual fact-checking, confirm permissions, validate copyright, prove commercial rights or guarantee originality.
- Does not automatically publish or run cloud render jobs.
- Does not synthesise premium human-like voices. Basic voice narration depends on FFmpeg/Flite.
- Does not place private scripts in public GitHub repositories. Imported project data stays in the current browser's localStorage; export backups.

## Tips

- Ask ChatGPT for direct first-party research URLs, rather than homepages, and open each. If ChatGPT cannot establish an accurate source, ask it to drop the unsupported claim.
- Do not use movie, streamer, podcast or music clips unless you own or have a suitable licence/permission; adding AI narration alone is not a copyright or monetisation exemption.
- For a real script, check pacing and claims by listening to the narration. Approximate word-group captions are not speech-synchronised.
- For a 45-second Short, around 90-110 spoken words is a useful starting target, depending on pace.
- The included example JSON is a *test fixture*, not a vetted, publishable video.
