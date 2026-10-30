/* Static tests for the GitHub usage dashboard; no network requests. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const src = fs.readFileSync('github-usage.js', 'utf8');
const files = fs.readFileSync('index.html', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');
const nav = /data-nav="usage"/.test(files);
assert(nav, 'GitHub usage nav missing');
assert(files.includes('<script src="github-usage.js" defer></script>'), 'usage script missing');
assert(app.includes("usage:window.DClipsUsageMonitor.render"), 'page renderer is not wired');

let stored = {};
const clickEvents = {};
const fakeDOM = {
  addEventListener(event, cb) { clickEvents[event] = cb; },
  getElementById(id) { return null; }
};
const context = {
  window: {},
  location: { hash: '#usage' },
  document: fakeDOM,
  localStorage: {
    getItem(key) { return stored[key] || null; },
    setItem(key, value) { assert(!/github_pat_|ghp_/.test(value), 'PAT saved in browser storage'); stored[key] = value; }
  },
  fetch() { throw new Error('No network required to render usage dashboard'); },
  Date, Number, String, Array, JSON, Math,
};
vm.runInNewContext(src, context, { timeout: 2000 });
const html = context.window.DClipsUsageMonitor.render();
assert(html.includes('GitHub usage monitor'), 'Usage page title missing');
assert(html.includes('Import private usage report'), 'Private report import missing');
assert(html.includes('Official GitHub billing'), 'Official billing link missing');
assert(html.includes('monthly budget') || html.includes('monthly allowance') || html.includes('Monthly allowance'),
  'Allowance controls missing');
assert(html.includes('Optional read-only GitHub token'), 'Read-only access missing');
assert(html.includes('Unavailable'), 'Official billing must not be invented');

assert(!Object.keys(stored).some(s => /token/i.test(s)), 'Token must not persist');
assert(typeof clickEvents.click === 'function', 'Usage navigation interaction missing');
assert(typeof clickEvents.change === 'function', 'Report import handler missing');
console.log('PASS: GitHub usage dashboard renders without credentials and does not expose fabricated billing.');
