# DClips — image-first narrated stories

**Purpose:** Replace repeating background headlines with cinematic visual storytelling. This addresses feedback that the first lighthouse demo felt like two conflicting text layers (scene headline and narration captions), and the simulated streamer-comeback demo was not meaningful real content.

## Illustrated story format

1. **Cover (about 2 seconds):** User-supplied / AI-created, licensed vertical artwork, with a single readable story title. Narration starts after the cover.
2. **Scene illustration for each script beat:** Full-bleed 9:16 artwork, with **no repeated scene title, banner, slide text or logos**. Only speech-timed captions appear over the illustration.
3. **Soft transitions:** Slow zoom / slight Ken Burns movement and optional crossfade. Scene changes can be manually aligned to the narrated words via `start_seconds` on each scene.
4. **Consistent characters:** Keep recurring subjects visually consistent across age changes, lighting, costume, architecture and historical period.
5. **Human review:** Image suitability, historical accuracy, copyright, speech timestamps and audio/music must be checked before approval.

The renderer is **implemented and tested** for uploaded scene illustrations. The public app and private GitHub production share the same image-first renderer. **Automatic AI image generation and image selection are NOT connected yet.** Scenes require original or licensed JPG/PNG/WEBP image files. The renderer refuses missing scene images instead of silently reverting to text cards.

## How to use it in DClips

- Create a project of type **Original narrated video**, then open **Production flow**.
- Choose **Illustrated story — cover image, then pictures + captions only** in Visual treatment.
- Click **Suggest scenes from script**, or write 2–8 descriptive scene lines. The first line is the cover, the rest represent the pictures accompanying the narration. There must be an image per line.
- Select a JPG/PNG/WEBP picture, choose its **Scene #**, then click **Attach image to scene #**. Scene numbers start at 1 (the cover).
- In the scene text editor, format an entry as `Optional seconds@Scene description | uploaded-image-path`. For example, `0@Caesar as a child | user-data/media/your-image.jpg` and `6.5@Caesar in military training | user-data/media/other-image.png`. **Seconds are relative to the first spoken word, after the 2-second cover.** If you use manual scene start times, supply them for every scene after the cover, beginning at 0. Otherwise scenes receive equal durations and may not match narrative beats perfectly.
- Select a voice and caption style, then render and inspect the completed MP4 with the final review checklist. Any changed scene image or timing requires another render and approval.

## Example: an original Julius Caesar biography

This is a **sample visual plan, not verified detailed historical reconstruction**:

| Scene | Start after narration begins | Suggested illustration |
|---|---:|---|
| Opening cover | Before narration | Illustrated Roman cityscape and young/adult Caesar silhouette. Title: **The Life of Julius Caesar** |
| Early life | 0 s | An imaginative reconstruction of a young Caesar in a wealthy Roman household, in a consistent painterly style |
| Early military service | 6 s | A young Roman military officer travelling with soldiers |
| Gaul | 13 s | Caesar leading troops in a Roman military encampment during his Gallic campaigns |
| Civil War | 22 s | Caesar and his army at the Rubicon River, restrained dramatic lighting |
| Final years | 29 s | Caesar in a late-Republic Roman political setting |

The spoken script must actually discuss each beat at the associated time, and exact dates/details must be fact-checked. There are very few reliable specifics about Caesar's childhood: don't invent a documented childhood episode and present it as historical fact. Generated art should be identified as illustrative reconstructions, not authentic photos.

### Prompt structure for future image generation

`Cinematic historical illustration in a consistent restrained oil-painted style, vertical 9:16 composition. Subject: [age/appearance/scene], period-appropriate Roman clothing and architecture, [action that matches script]. Same character continuity across scenes. Clear subject, safe empty lower third for subtitles. No writing, speech bubbles, titles, logos or watermarks.`

Avoid using unlicensed marketplace prints or photos simply because they appear in web search.

## Known limitations and next steps

- **Illustrations must be supplied:** Integrated AI image creation and reusable character/scene generation remain future work.
- **Manual scene cue timing is optional:** Speech captions have actual-audio word estimates, but scene-to-narration semantic matching is not yet automatic. Review timestamps and moves manually.
- **Cover title is drawn by the image renderer** and hidden after the first scene; no title is repeated on subsequent background frames.
- **Audio starts after the cover:** Two-second introduction, then chosen narrator; subtitle word timestamps shift by the same offset when generated.
- **Streamer clips are a separate pipeline:** The abandoned synthetic comeback proof-of-concept is not recommended as content. For real gaming/IRL highlights, use rights-cleared meaningful footage and keep the original audio.
