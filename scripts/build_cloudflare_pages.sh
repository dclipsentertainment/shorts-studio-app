#!/usr/bin/env bash
# Make a safe, static-only Cloudflare Pages deployment from the public DClips repo.
# Does not deploy private credentials, jobs, Python renderers, reports or source code.
set -euo pipefail
cd "$(dirname "$0")/.."
node --check app.js
node --check story-series.js
node --check quick-create.js
node --check cloud-pack.js
node scripts/test_cloud_pack.js
node scripts/test_quick_create.js
node scripts/test_story_series.js
node --check github-usage.js
node scripts/test_github_usage.js
node scripts/test_review_gate.js
node scripts/test_caption_ui.js
node scripts/test_illustrated_ui.js
mkdir -p dist-cloudflare
rm -f dist-cloudflare/index.html dist-cloudflare/styles.css dist-cloudflare/app.js dist-cloudflare/story-series.js dist-cloudflare/quick-create.js dist-cloudflare/cloud-pack.js dist-cloudflare/github-usage.js dist-cloudflare/_headers
for file in index.html app.js story-series.js quick-create.js cloud-pack.js github-usage.js styles.css; do
  cp "$file" "dist-cloudflare/$file"
done
cp cloudflare/_headers dist-cloudflare/_headers
if find dist-cloudflare -type f | grep -vE '/(index.html|app.js|story-series.js|quick-create.js|cloud-pack.js|github-usage.js|styles.css|_headers)$'; then
  echo "Refusing to publish unexpected files" >&2
  exit 1
fi
test -s dist-cloudflare/index.html
echo "DClips Cloudflare Pages static site ready — no credentials or private files included."
