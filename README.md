# Shorts Studio — DClips Entertainment

The public application repository for **Shorts Studio**, an AI-assisted YouTube Shorts creation and editing dashboard.

## Project status

**Repository initialized.** The existing Shorts Studio v0.14 application files have **not yet been imported**. This README describes the planned repository boundary; it is not a claim that the application is deployed.

The v0.14 application includes work on the dashboard, Viral Radar, Clip Scout, Creative Lab, script drafting, analytics, production flow, previews/subtitles, face tracking, kinetic captions, and storyboard visuals.

## What belongs here

- Application source code and interface assets suitable for public distribution
- Non-sensitive build and release configuration
- Public documentation and update/release metadata

The production workflow and any sensitive operational data belong in the **private** `shorts-studio-production` repository.

## Planned release flow

1. Import the existing, tested v0.14 project files.
2. Verify that the application starts and its packaged dependencies work.
3. Create a versioned GitHub Release with the distributable application.
4. Connect the application's updater to its published releases and test upgrades.

## Security

Never commit API keys, access tokens, OAuth credentials, private media, customer data, or generated production output. Use GitHub Actions secrets where necessary.
