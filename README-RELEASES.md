# GitHub source control and app updates

## Before you have a GitHub account
Open `OPEN-DASHBOARD.cmd` normally. No setup, automatic update, or network request occurs until you enable updates. Your existing browser data remains local.

## After creating one free GitHub account

Create **two repositories** under the same login:

1. `shorts-studio-app` — **Public**. Contains only application code (nothing sensitive). Upload the contents of `Shorts_Studio_Public_App_Repo_v0_14.zip` from the download. On GitHub choose **Add file → Upload files** and commit to `main`. Be sure the hidden `.github` folder is included, including `.github/workflows/release-app.yml`.
2. `shorts-studio-production` — **Private**. Later, store render jobs, properly licensed footage and workflow runs there. Do not place video footage, API keys, account tokens or saved browser backups in the public repository. Keep large footage out of Git when possible.

Do not share your GitHub password. Enable two-factor authentication.

### Publish the first release

In your public repo, select **Actions → Publish Shorts Studio app release → Run workflow**. Enter `v0.14.0`. If GitHub asks to enable workflows or give Actions read/write permissions, follow the repository's own security settings. The workflow creates a **code-only** `shorts-studio-app.zip` release asset; it deliberately excludes jobs, assets, private reports and user data. It works only after the workflow file has been uploaded. You may need to permit Actions to create releases via repository **Settings → Actions → General → Workflow permissions → Read and write permissions**.

After the workflow succeeds, open your installed Shorts Studio folder and double-click **SETUP-UPDATES.cmd**. Enter `YOURUSERNAME/shorts-studio-app` (your actual GitHub username). The setting is saved only on your own computer.

After that, use **OPEN-DASHBOARD.cmd** every time. It checks GitHub's *latest published stable release* via HTTPS, compares semantic versions, verifies the release ZIP's GitHub SHA-256 digest, updates application code, and opens the dashboard. If there is no internet or GitHub is unavailable, it opens your existing version instead. `CHECK-FOR-UPDATES.cmd` lets you run the updater manually while the browser is closed. No administrator rights, Git installation or personal access tokens are required for updating a public repository.

**This updates application code only**, not content projects or connected-account data. Your channel and project information is stored in your browser's localStorage; export backups regularly. Do not rename or move the installed folder if you want browser-local data to remain in the same place. The updater never touches `assets/`, `jobs/`, `reports/`, `output/` or `user-data/`.

### How future releases work

Each new release gets a new tag (e.g. `v0.13.1`). The release workflow packages the latest application code without private content. Once published, the next dashboard launch installs it automatically. Merely committing to `main` does **not** update installed apps until a new release has been published.

**Important:** Update behaviour is prepared but has **not been exercised against your real GitHub repository or a Windows machine**. GitHub account/repo creation, first release and permissions must be completed before end-to-end verification is possible. If workplace security policies block PowerShell, use manual releases instead. Avoid running the updater from an untrusted repository; you are installing executable code from the configured public source.
