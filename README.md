# Shorts Studio — DClips Entertainment

Public application repository for **Shorts Studio v0.14.0**.

## Status — 28 October 2026

- **Imported:** existing v0.14 dashboard, scripts, styles, and documentation.
- **Verified:** the GitHub importer completed and ran application syntax and packaging checks.
- **Released:** [v0.14.0](https://github.com/dclipsentertainment/shorts-studio-app/releases/tag/v0.14.0), with the code-only `shorts-studio-app.zip` asset.
- **Not yet configured:** YouTube API credentials, channel authorisation, and unattended publishing.

## Download or run

Download the ZIP from [Releases](https://github.com/dclipsentertainment/shorts-studio-app/releases) and follow `README-FIRST.md`. Windows launch scripts (`OPEN-DASHBOARD.cmd`, `OPEN-PRODUCTION-STUDIO.cmd`) are included in the app package.

To publish a later update, use **Actions → Publish Shorts Studio app release**, specifying a tag matching `VERSION.json`. Do not reuse existing release tags.

## Repository roles

This public repository holds application code, non-sensitive build configuration and documentation. Production data, sample assets, and rendering workflows belong in the private repository.

Never upload passwords, OAuth credentials, API keys, private footage or user data here.

## Import history

The v0.14 source was imported using the checksum-verified `import-app.yml` workflow. The import ZIP was removed from the main branch by the successful workflow. The release workflow was installed separately because the workflow job token cannot create additional workflow files.
