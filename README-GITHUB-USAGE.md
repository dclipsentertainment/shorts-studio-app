# DClips — GitHub usage monitor

The **GitHub usage** sidebar page shows GitHub Actions activity and helps you check whether the DClips production workflows are approaching your reference allowance.

## What is and is not measured

- **Official GitHub billing**: Account-wide usage and net Actions charges appear only if an authorised session token can access GitHub's billing API. The source of truth is [GitHub billing](https://github.com/settings/billing).
- **Workflow runtime estimate**: Sums completed Actions job start/end times, rounded up to full minutes. This is **not** necessarily what GitHub bills. Failed/restarted jobs, reruns, macOS/Windows multipliers, storage, other repos, and billing processing delays may change charges.
- **Included reference minutes**: 2,000/month is the default for *GitHub Free*, not a guarantee of the user's plan or billing entitlement. Update the field if your plan differs. Public repository standard hosted runners are normally not counted against private Actions minutes.
- **Privacy**: The production repository remains private. No credentials are placed in this public app or its ZIP.

## Easiest setup (no GitHub token needed)

1. Open the private [DClips usage snapshot](https://github.com/dclipsentertainment/shorts-studio-production/blob/main/reports/github-usage-latest.json).
2. Use GitHub's **Download raw file** option to save the JSON locally. Do not copy the secret settings.
3. Open Shorts Studio -> **GitHub usage** -> **Import private usage report**, and choose the downloaded JSON.
4. The private repository's [usage-report workflow](https://github.com/dclipsentertainment/shorts-studio-production/actions/workflows/github-usage-report.yml) refreshes its snapshot daily (GitHub scheduled workflows may run later than their nominal time).

No upload or automatic paid action is triggered by importing a report.

## Optional live refresh

1. Open **GitHub usage** in the app.
2. Without a token, **Refresh** shows public repository activity, but **private figures are unavailable**.
3. To read private Actions jobs, create a **fine-grained GitHub personal access token** with **Actions: Read-only** repository access for the two DClips repos. If you also require official account billing figures, add the **Plan: Read-only** account permission (and use a token authorised for your own billing data). Enter the token **only in the local app**, never in GitHub repository files or in ChatGPT.
4. Click **Refresh GitHub usage**. The token is **held only in browser memory** until reload or **Forget session token**. It is never stored in localStorage, exported, or logged. Access is sent solely to `api.github.com`.
5. If your GitHub account doesn't expose the billing endpoint or your token lacks permission, the billing fields will say **Unavailable**.

GitHub usage is denominated in USD. Check [official GitHub budgets](https://github.com/settings/billing/budgets) and turn on *Stop usage when budget limit is reached* if available. The dashboard is informative and does **not** control GitHub billing or stop workflows.

## Troubleshooting

- **Private report imported but a different month is shown**: The snapshot is generated for the current UTC month. Import a new one once the calendar month changes.
- **Partial results**: GitHub's API may not include previous retry attempts or active jobs in a snapshot. Consult GitHub's billing page for accurate amounts.
- **Cannot connect from a saved HTML file**: Try **OPEN-DASHBOARD.cmd** with the local Python server, or use the import workflow instead.
- **Usage appears low**: Check other repositories, storage, any cost multipliers, and account-wide usage in GitHub billing.
