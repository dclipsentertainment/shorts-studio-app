# DClips — Video editor: remove narration, rewrite captions, drag text

These controls are available on both the **Production flow** and **Preview & subtitles** pages.

## Remove unwanted voice-over
- **Production flow:** Open your project and choose **Remove AI commentary — keep streamer audio**.
- **Preview & subtitles:** Check **Remove AI commentary** or press **Remove voice-over now**. Saved projects switch to narration mode `none`.
- The renderer keeps the source recording's audio when available. This **does not erase speech, music or background sounds already embedded in the original video**.
- For AI Stories with generated visuals and no source soundtrack, removal may produce silent output.
- You can subsequently choose Heart/Emma/Michael/George again from the voice selector.

## Edit and reposition the captions
1. Open **Preview & subtitles**, select the project and load a video.
2. Select **Text display**: Classic, Word-pop, Kinetic, Headline at top only, or None.
3. Seek to the relevant timed cue, or select Headline-only for a title overlay.
4. Overwrite **Current caption / headline** in the text box, then click **Apply caption text**.
5. **Drag the text overlay on the video** (pointer or touch), or type exact X/Y percentages.
6. Press **Apply to project**. Dragging the overlay itself also saves its position.
7. Export a render job and render the MP4 from your authorized source; the final video receives the same caption X/Y position.

**Limits:** At present one X/Y location is applied to the **whole caption track** of a project, not a different location for every word. Individual caption **text and timestamps** remain separately editable. The player is a planning preview, not the final encoded video; always inspect the MP4 for clipping, safe areas, accurate speech, and readability.

The AI narrator rendering pipeline uses speech-to-text word estimates from the **generated WAV** rather than proportionally dividing the script. Review automatic transcription; you can supply a manually edited timed-caption file to override it.

## Copyright and safe reuse
- Original stream footage may be copyrighted. A creator's online stream or clip-enabled account doesn't guarantee unrestricted commercial reuse.
- Obtain and retain written permission to **download/record**, edit, publish on YouTube/Instagram/TikTok/Facebook, and **monetise** the clips. Pay attention to duration, territories, attribution, third-party elements and right of withdrawal.
- Rights granted by a streamer do **not** automatically clear a licensed song, broadcast footage, another guest's rights, or sensitive IRL content.
- Do not rely on music, caption text, filters or cropped footage to avoid copyright claims. A genuine original contribution may matter for platform monetisation, but is not a guaranteed copyright exception.
- The project has a `rights_confirmed` approval step before rendering, but **DClips cannot independently verify legal rights**. Keep actual permission records outside this public website. No automatic public posting is enabled.
- Under Irish law, fair dealing for review/criticism is a case-specific, limited exception. For a systematic commercial highlights channel, a written licence is generally a more robust basis than asserting fair dealing.

## Working status
- These are web/frontend editing controls and matching options in the private GitHub FFmpeg renderer.
- Streamer discovery and clip rights review are still manual. The Live Stream Monitor watchlist **does not** automatically record, process, or create clips from others' live streams.
- Cloudflare hosting must be connected separately; the GitHub app release and Windows self-updater remain available while hosting is pending.
