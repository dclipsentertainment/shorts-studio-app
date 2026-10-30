# DClips 0.14.17

Includes all nine audit fixes merged on 30 October 2026.

- ASMR Pro: editable 8–32 second duration and deterministic variation; four shots scale together. Duration changes also change sound playback speed/pitch.
- Visual loop returns to the exact opening frame. Audio transitions overlap outgoing/incoming shots and return to the opening waveform without a forced end fade. Encoded AAC/browser playback can still introduce a small seam; review the actual MP4.
- Voice downloads require pinned SHA-256 values from the upstream model-files-v1.1 release, including cached models.
- Render provenance sidecars record job/input hash, engine version, actual duration, video hash and caption hashes. They are identity metadata, not automatic editorial approval.
- Release publication waits for complete regressions and real browser tests, checks archive integrity and publishes a checksum.

## External setup and limits

The repositories use main. Branch protection needs repository administration access; the connected GitHub app cannot configure it. Require pull requests and the regression check, and disable force pushes/deletion in repository Settings → Rules.

Cloudflare Pages deployment is not configured or confirmed in this repository. Connect the public app repo using README-CLOUDFLARE.md; do not deploy the private engine. A successful static build is not proof of a live deployment.

Procedural ASMR is stylised animation, not real footage. Photorealistic material/hands, native-resolution material re-authoring, semantic scene alignment, and multi-channel OAuth are separate feature work. No paid generation or real social upload is part of this release verification.
