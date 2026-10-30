# DClips Story Series Planner — 30 October 2026

One original master narration script can be turned into different **editorial plans** for Instagram Reels, YouTube Shorts, TikTok and Facebook Reels. Every planned part becomes its own editable, non-approved project when you choose **Create drafts**.

## Default editorial recommendations (not platform limits)

| Platform | Initial target | Format | Example six-minute story |
|---|---:|---|---|
| Instagram Reels | 45 seconds | Multiple episodes | About 8 parts |
| YouTube Shorts | 60 seconds | Multiple episodes | About 6 parts |
| TikTok | 70 seconds | Multiple episodes | About 6 parts |
| Facebook Reels | One full version, where possible | Complete narrative | About 6 minutes in one video |

These are testable **creative assumptions**, not guaranteed performance outcomes. Account features, discovery systems, monetisation thresholds and API posting limits can change. YouTube Shorts accepts up to three minutes. Facebook offers variable-length reels, including long videos. Instagram offers longer Reels but recommendations to nonfollowers generally favour under three minutes. TikTok Creator Rewards has additional eligibility rules and is not currently available to Irish-based creators; don't assume one-minute episodes earn revenue.

**Every part must have its own real hook and satisfying pay-off.** Don't rely solely on 'Part 1/10' or fake cliffhangers. No algorithmic length guarantees exist.

## Using the planner

1. Open **Story series planner** from the left-hand sidebar.
2. Enter the master story title and complete narration script. Choose a brand.
3. Select the platforms. Start with 145 spoken words per minute; adjust for your selected narrator.
4. Choose **Short parts** or **Full story where possible** and override the seconds target on each platform.
5. Select **Recommend story parts**. DClips estimates total spoken duration and proposes numbered scripts while preserving the full original text.
6. Inspect the proposed cuts; choose **Create editable video drafts** only after you want those projects in Content Studio.
7. Each draft stores platform code, episode number, total parts and the current portion of the original script. **Rights are unconfirmed**, rendering still requires licensed/AI-generated scene illustrations and human review, and no public publishing is enabled.
8. Open each project in **Production flow**, adjust the script and scene images, render and check that visual changes happen at the appropriate part of the narration.

The planner now keeps whole sentences together, even when a sentence is unusually long, rather than chopping narration at a fixed word count. It warns when there are too few natural cuts. It still cannot guarantee dramatic pacing or semantic cliffhangers; review every ending manually. The source script is saved with the series record for continuity.

## Long videos

DClips now accepts **original stories up to 600 seconds (10 minutes)** in the app and private GitHub renderer. This makes a six-minute Facebook narrative possible in principle, though it requires more processing and review, and longer renders are not yet performance-tested at that full length. Streamer clips stay restricted to 180 seconds. The FFmpeg quality report marks videos longer than three minutes as requiring special long-form review.

DClips does not guarantee that a six-minute generated story is entertaining, and does not provide automatic social-media publishing. Different placements/APIs may impose their own upload constraints. Split master stories longer than the local renderer allows, and maintain a separate longer-format YouTube plan if desired.

## Timing and part numbering

For a complete six-minute spoken script:
- Instagram could receive roughly eight independent ~45-second edits.
- YouTube Shorts could receive roughly six ~60-second edits.
- TikTok could receive six or fewer ~70-second edits, depending on natural sentence boundaries.
- Facebook could receive one uninterrupted ~6-minute version.

Actual part lengths depend on selected narrator, pauses, editorial rewrites and natural speech. Use **actual audio-to-caption timing** at render time, not script division alone. Default image-story cover is about two seconds per episode, which adds to spoken duration.

Keep each platform's audience retention, qualified views, completion and follows separately so the editor can adjust future targets based on evidence. **Never optimise solely for inflated views at the expense of meaningful story content.**

## Rebalance after previewing a finished episode

When you have **rendered** an episode and watched its actual finished MP4 through to the end in Production flow, DClips unlocks **Adjust the series after watching**. This is a separate step after the initial automatic recommendations.

- Type a new **number of parts**, or use the numeric **seconds per part** field. Changing one recalculates the other from the complete original narration estimate; these are targets, not strict cut-off times.
- Click **Create revised parts** to redistribute all of that platform's master-script text across full sentence boundaries.
- The new parts are saved as draft revision 2, 3, etc. Previous drafts and finished renders remain in your project history, marked as superseded for the series planner. No existing rendered MP4 is destroyed.
- Revised episodes start without scene assets, aligned captions, a finished render or rights confirmation because the script boundaries changed. Reattach illustrations, regenerate the narration, inspect the captions and reapprove.
- For a sentence so long that the requested split is impossible, the planner refuses to cut in the middle and asks you to revise the master story. Part durations can differ from numeric targets to preserve complete thoughts.
- Narrated series now refuse rendering when the last sentence is incomplete or narration is switched off. The final review requires confirmation that narration/captions finish together and the next part continues logically.

This is **editorial assistance, not automatic script rewriting**: choosing a longer or shorter time cannot invent extra narrative content or stretch generated speech to an exact duration. AI illustration generation and semantic alignment of scene changes to words still require separate integration and/or hands-on review.

## Current limitations

- Recommendation is estimation, not AI semantic story segmentation.
- Drafts and series are in local browser storage, not yet synced to Cloudflare or GitHub.
- One-click local render depends on Python and FFmpeg (plus optional neural model, transcription and licensed scene images). The private GitHub renderer can handle AI voices but does not publish publicly.
- The generated episode order and upload schedule are for review only: no background post scheduler or Instagram/TikTok/Facebook API posting connection yet.
- A 'full story' longer than 10 minutes must be planned in chapters; there is no streaming unlimited-length export at this stage.
