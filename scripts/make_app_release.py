"""Build a code-only portable update archive. No secrets, media, jobs or user data."""
from __future__ import annotations
import argparse
import json
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FILES = [
    'index.html', 'app.js', 'story-series.js', 'github-usage.js', 'styles.css', 'VERSION.json',
    'README-FIRST.md', 'README-CAPTION-EDITOR.md', 'README-STREAMS.md', 'README-STORY-SERIES.md', 'README-QUALITY-REVIEW.md', 'README-ILLUSTRATED-STORIES.md', 'README-CLOUDFLARE.md', 'README-GITHUB-USAGE.md', 'README-STORYBOARD.md', 'requirements-visuals.txt', 'README-VISUAL-UPGRADE.md', 'README-PRODUCTION-FLOW.md', 'README-PREVIEW-AND-SUBTITLES.md', 'README-CHATGPT-WORKFLOW.md', 'README-RELEASES.md', '.gitignore',
    'OPEN-DASHBOARD.cmd', 'OPEN-PRODUCTION-STUDIO.cmd', 'CHECK-FOR-UPDATES.cmd', 'SETUP-UPDATES.cmd',
    '.github/workflows/release-app.yml',
]

def files_to_ship():
    result = set(FILES)
    result.update(p.relative_to(ROOT).as_posix() for p in (ROOT / 'scripts').glob('*.py'))
    result.update(p.relative_to(ROOT).as_posix() for p in (ROOT / 'scripts').glob('*.ps1'))
    for name in sorted(result):
        path = ROOT / name
        if not path.is_file():
            raise SystemExit(f'Missing expected app file: {name}')
        yield name, path


def build(destination: Path):
    meta = json.loads((ROOT / 'VERSION.json').read_text(encoding='utf-8'))
    version = meta['version']
    assert version.count('.') == 2 and all(part.isdigit() for part in version.split('.')), version
    destination.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(destination, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=8) as z:
        for name, path in files_to_ship():
            info = zipfile.ZipInfo(name, (2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            z.writestr(info, path.read_bytes(), compress_type=zipfile.ZIP_DEFLATED, compresslevel=8)
    print(f'Created {destination}: app v{version}, {destination.stat().st_size:,} bytes')

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--out', type=Path, default=ROOT / 'dist' / 'shorts-studio-app.zip')
    args = parser.parse_args()
    build(args.out)
