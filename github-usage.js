/* DClips GitHub usage monitor.
 * GitHub tokens exist only in memory; never stored, logged, exported, or sent to non-GitHub hosts.
 * Estimates from workflow jobs are not invoices. Private usage needs read-only access.
 */
(function () {
  'use strict';
  const OWNER = 'dclipsentertainment';
  const REPOS = ['shorts-studio-production', 'shorts-studio-app'];
  const STORAGE_KEY = 'dclips_github_usage_settings_v1';
  const REPORT_KEY = 'dclips_github_usage_report_v1';
  const API = 'https://api.github.com';
  let token = '';
  let running = false;
  let data = null;
  let message = '';
  let error = '';
  let savedReport = null;
  let month = new Date().toISOString().slice(0, 7);
  let allowance = 2000;
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (/^\d{4}-(0[1-9]|1[0-2])$/.test(stored.month || '')) month = stored.month;
    if (Number.isFinite(stored.allowance) && stored.allowance > 0 && stored.allowance <= 1000000) allowance = stored.allowance;
    const report = JSON.parse(localStorage.getItem(REPORT_KEY) || 'null');
    if (report && report.type === 'dclips-github-usage-v1') savedReport = report;
  } catch (_) { /* Storage is optional. Never store access tokens. */ }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (s) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s];
    });
  }
  function num(value) {
    return Number(value || 0).toLocaleString('en-IE', { maximumFractionDigits: 1 });
  }
  function money(value) {
    return '$' + Number(value || 0).toFixed(2);
  }
  function progress(value) {
    return Math.max(0, Math.min(100, (value || 0) * 100 / allowance));
  }
  function statusLabel(used) {
    if (!Number.isFinite(used)) return 'Not available';
    if (used >= allowance) return 'At or above selected allowance';
    if (used >= allowance * .9) return 'Above 90% of selected allowance';
    if (used >= allowance * .75) return 'Above 75% of selected allowance';
    return 'Below 75% of selected allowance';
  }
  function paint() {
    if (location.hash !== '#usage') return;
    const main = document.getElementById('main');
    if (main) main.innerHTML = render();
  }
  function repoLink(name) {
    return 'https://github.com/' + OWNER + '/' + name;
  }

  function render() {
    const input = data || savedReport;
    const live = Boolean(data);
    const hasPrivate = Boolean(input && Array.isArray(input.repositories) && input.repositories.some(function (r) { return r.private && !r.unavailable; }));
    const estimated = hasPrivate && Number.isFinite(Number(input.estimatedPrivateMinutes))
      ? Number(input.estimatedPrivateMinutes) : null;
    const billing = live ? input.billing : null;
    const official = billing && billing.available;
    const used = official && billing.actionsMinutes != null ? billing.actionsMinutes : estimated;
    const level = used == null ? null : progress(used);
    const boundary = level == null ? '0' : String(level.toFixed(1));
    let html = '<div class="page-head"><div><div class="eyebrow">SYSTEM / ACCOUNT USAGE</div><h1>GitHub usage monitor</h1>' +
      '<p class="subhead">Watch Actions usage for DClips, view your monthly budget, and avoid surprise charges.</p></div>' +
      '<a class="button button-ghost" target="_blank" rel="noopener noreferrer" href="https://github.com/settings/billing">Official GitHub billing ↗</a></div>';
    html += '<div class="usage-panel"><div class="usage-grid">' +
      '<div class="usage-metric"><span>Selected month</span><strong>' + esc(month) + '</strong><small>UTC billing month</small></div>' +
      '<div class="usage-metric"><span>Private Actions runtime</span><strong>' + (estimated == null ? '—' : num(estimated) + ' min') + '</strong><small>Estimate from observed jobs, not billable usage</small></div>' +
      '<div class="usage-metric"><span>Official account Actions usage</span><strong>' + (official && billing.actionsMinutes != null ? num(billing.actionsMinutes) + ' min' : 'Unavailable') + '</strong><small>' + (official ? 'GitHub billing API' : 'Requires authorized billing access') + '</small></div>' +
      '<div class="usage-metric"><span>Official Actions net charge</span><strong>' + (official ? money(billing.actionsNetUSD) : 'Unavailable') + '</strong><small>USD, if reported by GitHub</small></div></div>' +
      '<div class="usage-meter-label"><strong>Reference allowance: ' + num(allowance) + ' minutes</strong><span>' +
      (used == null ? 'Not enough data' : esc(statusLabel(used))) + '</span></div>' +
      '<div class="usage-meter" aria-label="Reference allowance progress"><div style="width:' + boundary + '%"></div></div>' +
      '<p class="usage-note">' + (official && billing.actionsMinutes != null
        ? 'Based on account-wide Actions billing data. Confirm charges in GitHub billing; reporting can lag.'
        : 'This bar is only a project-level approximation if a report is loaded. The default 2,000 minutes applies to GitHub Free accounts, and other plans differ. Public-repository Actions minutes are generally free.') +
      '</p></div>';

    html += '<div class="usage-panel"><h2>Refresh data</h2><p class="usage-note">Public workflows can be checked without signing in. A private repository requires an Actions read-only GitHub token; official billing figures additionally require account Plan: read permission. The token is held only in memory until you close or reload this page.</p>' +
      '<div class="usage-controls"><label>Billing month <input type="month" id="usage-month" value="' + esc(month) + '"></label>' +
      '<label>Monthly allowance (minutes) <input type="number" id="usage-allowance" min="1" max="1000000" value="' + allowance + '"></label></div>' +
      '<label class="usage-token-label">Optional read-only GitHub token <input id="usage-token" type="password" autocomplete="off" placeholder="' + (token ? 'Connected for this session (leave blank to reuse)' : 'Leave blank to check public activity only') + '"></label>' +
      '<div class="usage-actions"><button type="button" class="button button-primary" data-usage-action="refresh" ' + (running ? 'disabled' : '') + '>' + (running ? 'Checking GitHub…' : '↻ Refresh GitHub usage') + '</button>' +
      '<button type="button" class="button button-ghost" data-usage-action="clear-token">Forget session token</button>' +
      '<button type="button" class="button button-ghost" data-usage-action="import">Import private usage report</button>' +
      '<input id="usage-report-file" type="file" accept=".json,application/json" hidden></div>' +
      '<p class="usage-note">Never use your YouTube OAuth token here. Create a separate GitHub token with only the permissions required. For a no-token alternative, run the private repository\'s usage-report workflow and import its JSON report.</p>' +
      (running ? '<p class="usage-status" role="status">Reading GitHub Actions runs and job durations. Large histories may take longer.</p>' : '') +
      (message ? '<p class="usage-status" role="status">' + esc(message) + '</p>' : '') +
      (error ? '<p class="usage-error" role="alert">' + esc(error) + '</p>' : '') + '</div>';

    html += '<div class="usage-panel"><h2>Repository activity</h2><div class="usage-repos">';
    if (input && Array.isArray(input.repositories) && input.repositories.length) {
      for (const repo of input.repositories) {
        html += '<div class="usage-repo"><a href="' + repoLink(esc(repo.repo)) + '/actions" target="_blank" rel="noopener noreferrer">' + esc(repo.repo) + ' ↗</a>' +
          '<span>' + num(repo.runs) + ' workflow runs</span><span>' + num(repo.failed) + ' failed</span>' +
          '<span>' + (repo.private ? ('~' + num(repo.estimatedMinutes) + ' runner min') : 'Public repo (free hosted minutes)') + '</span>' +
          (repo.complete ? '' : '<small>Partial results</small>') + '</div>';
      }
    } else {
      html += '<p class="usage-note">No report loaded yet. Select Refresh to check public runs or import a private snapshot.</p>';
    }
    html += '</div><p class="usage-note">Runner minutes are estimated from job start/end timestamps and rounded per job; they can differ from billed minutes, especially on Windows/macOS or across other repositories. In-progress runs, billing discounts and storage are not accounted for in estimates.</p></div>';
    html += '<div class="usage-panel"><h2>Source and coverage</h2>' +
      '<p class="usage-note">Status: ' + (live ? 'Live GitHub API read' : savedReport ? 'Imported local snapshot' : 'No data') +
      (input && input.generatedAt ? ' · Updated ' + esc(new Date(input.generatedAt).toLocaleString('en-IE')) : '') +
      '. The monitor never enables paid usage or uploads videos.</p>' +
      '<p><a target="_blank" rel="noopener noreferrer" href="https://github.com/dclipsentertainment/shorts-studio-production/actions/workflows/github-usage-report.yml">Open private usage-report workflow ↗</a></p>' +
      '<p><a target="_blank" rel="noopener noreferrer" href="https://github.com/settings/billing/budgets">Set a spending cap with GitHub ↗</a></p></div>';
    return html;
  }

  async function request(path, useToken) {
    const headers = { 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
    if (useToken && token) headers.Authorization = 'Bearer ' + token;
    const response = await fetch(API + path, { headers: headers, cache: 'no-store' });
    if (!response.ok) {
      const err = new Error('GitHub returned HTTP ' + response.status + '. Check token permissions and repository access.');
      err.code = response.status;
      throw err;
    }
    return response.json();
  }
  async function readRuns(repo, auth) {
    const list = [];
    let isPartial = false;
    for (let page = 1; page <= 3; page++) {
      const result = await request('/repos/' + OWNER + '/' + repo + '/actions/runs?per_page=100&page=' + page +
        '&created=' + encodeURIComponent(month + '-01..' + month + '-' + String(new Date(Date.UTC(Number(month.slice(0,4)), Number(month.slice(5,7)), 0)).getUTCDate()).padStart(2, '0')), auth);
      if (Array.isArray(result.workflow_runs)) list.push.apply(list, result.workflow_runs);
      if (result.total_count > 300) isPartial = true;
      if (!result.workflow_runs || result.workflow_runs.length < 100) break;
      if (page === 3 && result.workflow_runs.length === 100) isPartial = true;
    }
    return { runs: list, complete: !isPartial };
  }
  async function countMinutes(repo, runs, auth) {
    // Use job timestamps for monitoring only. This does not reproduce GitHub billing logic.
    const completed = runs.filter(function (r) { return r.status === 'completed'; });
    let seconds = 0, cursor = 0, incomplete = false;
    async function worker() {
      while (cursor < completed.length) {
        const run = completed[cursor++];
        try {
          const result = await request('/repos/' + OWNER + '/' + repo + '/actions/runs/' + run.id + '/jobs?per_page=100', auth);
          if (result.total_count > 100) incomplete = true;
          for (const job of result.jobs || []) {
            if (job.started_at && job.completed_at) {
              const secs = (Date.parse(job.completed_at) - Date.parse(job.started_at)) / 1000;
              if (Number.isFinite(secs) && secs >= 0) seconds += Math.ceil(secs / 60) * 60;
            } else if (job.status !== 'skipped') incomplete = true;
          }
        } catch (_) { incomplete = true; }
      }
    }
    await Promise.all(Array.from({ length: Math.min(5, completed.length) }, worker));
    if (completed.length !== runs.length) incomplete = true;
    return { minutes: Math.round(seconds / 60), complete: !incomplete };
  }
  async function loadBilling() {
    // The user-account billing report is the only official billing source here.
    try {
      const parts = month.split('-');
      const result = await request('/users/' + OWNER + '/settings/billing/usage?year=' + Number(parts[0]) +
        '&month=' + Number(parts[1]), true);
      if (!Array.isArray(result.usageItems)) return { available: false };
      let actionsMinutes = 0, actionsNetUSD = 0;
      let knownMinutes = false;
      for (const item of result.usageItems) {
        if (String(item.product || '').toLowerCase() !== 'actions') continue;
        actionsNetUSD += Number(item.netAmount || 0);
        if (String(item.unitType || '').toLowerCase() === 'minutes') {
          actionsMinutes += Number(item.quantity || 0);
          knownMinutes = true;
        }
      }
      return { available: true, actionsMinutes: knownMinutes ? actionsMinutes : null, actionsNetUSD: actionsNetUSD };
    } catch (_) {
      return { available: false };
    }
  }
  async function refresh() {
    if (running) return;
    const monthField = document.getElementById('usage-month');
    const allowanceField = document.getElementById('usage-allowance');
    const tokenField = document.getElementById('usage-token');
    if (monthField && /^\d{4}-(0[1-9]|1[0-2])$/.test(monthField.value)) month = monthField.value;
    const nextAllowance = Number(allowanceField && allowanceField.value);
    if (Number.isInteger(nextAllowance) && nextAllowance > 0 && nextAllowance < 1000001) allowance = nextAllowance;
    if (tokenField && tokenField.value.trim()) token = tokenField.value.trim();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ month: month, allowance: allowance })); } catch (_) {}
    running = true; message = ''; error = ''; paint();
    try {
      const repositories = [];
      for (const repo of REPOS) {
        const privateRepo = repo === 'shorts-studio-production';
        try {
          const result = await readRuns(repo, privateRepo);
          let metering = { minutes: 0, complete: true };
          if (privateRepo) metering = await countMinutes(repo, result.runs, true);
          repositories.push({
            repo: repo, private: privateRepo, runs: result.runs.length,
            failed: result.runs.filter(function (r) { return r.conclusion === 'failure'; }).length,
            estimatedMinutes: metering.minutes,
            complete: result.complete && metering.complete
          });
        } catch (err) {
          repositories.push({ repo: repo, private: privateRepo, runs: 0, failed: 0,
            estimatedMinutes: 0, complete: false, unavailable: true });
        }
      }
      const billing = token ? await loadBilling() : { available: false };
      data = { type: 'dclips-github-usage-v1', month: month, generatedAt: new Date().toISOString(),
        repositories: repositories, estimatedPrivateMinutes: repositories
          .filter(function (r) { return r.private && !r.unavailable; })
          .reduce(function (sum, r) { return sum + r.estimatedMinutes; }, 0),
        billing: billing };
      if (repositories.every(function (r) { return r.unavailable; })) throw new Error('GitHub could not be reached. Try the local server or check your browser network permissions.');
      if (repositories.some(function (r) { return r.unavailable; })) message = 'Public data checked. Private usage is unavailable without repository Actions: read access, or a private report import.';
      else if (repositories.some(function (r) { return !r.complete; })) message = 'Usage checked, but some jobs or runs are incomplete. Estimates may be low.';
      else message = 'Workflow usage refreshed successfully. Official billed amounts are only displayed when GitHub provides them.';
    } catch (err) {
      error = String(err.message || 'Unable to retrieve GitHub data.');
    } finally { running = false; paint(); }
  }
  function importReport(file) {
    if (!file) return;
    if (file.size > 1500000) { error = 'The report is too large.'; paint(); return; }
    const reader = new FileReader();
    reader.onload = function () {
      try {
        const report = JSON.parse(reader.result);
        if (!report || report.type !== 'dclips-github-usage-v1' ||
            !/^\d{4}-(0[1-9]|1[0-2])$/.test(report.month || '') ||
            !Array.isArray(report.repositories) || report.repositories.length > 10) throw new Error();
        for (const r of report.repositories) {
          if (!REPOS.includes(r.repo) || !Number.isFinite(r.runs) || !Number.isFinite(r.estimatedMinutes)) throw new Error();
        }
        savedReport = report; data = null; month = report.month; message = 'Private usage report imported. This is an estimated activity snapshot, not an invoice.'; error = '';
        try { localStorage.setItem(REPORT_KEY, JSON.stringify(report)); localStorage.setItem(STORAGE_KEY, JSON.stringify({ month: month, allowance: allowance })); } catch (_) {}
      } catch (_) { error = 'Invalid report. Choose the JSON created by the DClips GitHub usage-report workflow.'; }
      paint();
    };
    reader.readAsText(file);
  }
  document.addEventListener('click', function (e) {
    const button = e.target.closest('[data-usage-action]');
    if (!button || location.hash !== '#usage') return;
    const action = button.getAttribute('data-usage-action');
    if (action === 'refresh') refresh();
    if (action === 'clear-token') { token = ''; message = 'Session access token cleared.'; paint(); }
    if (action === 'import') { const el = document.getElementById('usage-report-file'); if (el) el.click(); }
  });
  document.addEventListener('change', function (e) {
    if (e.target.id === 'usage-report-file') {
      importReport(e.target.files && e.target.files[0]);
      e.target.value = '';
    }
  });
  window.DClipsUsageMonitor = { render: render, afterRender: function () {} };
})();
