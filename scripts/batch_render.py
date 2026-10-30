#!/usr/bin/env python3
"""Render a validated browser-exported manifest OR individual approved jobs.

This script never uploads or publishes videos. All source media must be owned
or licensed by the user. Every render has a provenance/hash entry.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import sys
import tempfile

from render import ROOT, render, JobError


def confined_path(candidate: str, parent: Path, label: str) -> Path:
    value = (ROOT / candidate).resolve()
    if not value.is_relative_to(parent.resolve()):
        raise JobError(f'{label} must be located within {parent.relative_to(ROOT)}/')
    return value


def load_manifest(filename: str, limit: int) -> list[tuple[str, dict]]:
    file = confined_path(filename, ROOT / 'jobs', 'Batch manifest')
    if not file.is_file() or file.stat().st_size > 2_000_000:
        raise JobError('Batch manifest is missing or exceeds 2 MB')
    data = json.loads(file.read_text(encoding='utf-8'))
    if not isinstance(data, dict) or data.get('batch_version') != 1:
        raise JobError('Expected a Shorts Studio batch_version 1 manifest')
    jobs = data.get('jobs')
    if not isinstance(jobs, list) or not 1 <= len(jobs) <= 10:
        raise JobError('Batch must contain between 1 and 10 render jobs')
    selected = jobs[:limit]
    for i, job in enumerate(selected):
        if not isinstance(job, dict) or job.get('version') != 1 or job.get('rights_confirmed') is not True:
            raise JobError(f'Job {i+1} is invalid or lacks confirmed media rights')
    return [(f'{file.relative_to(ROOT).as_posix()}#{i+1}', job) for i, job in enumerate(selected)]


def load_folder(foldername: str, limit: int) -> list[tuple[str, dict]]:
    folder = confined_path(foldername, ROOT / 'jobs', 'Jobs folder')
    if not folder.is_dir():
        raise JobError('Jobs folder does not exist')
    files = sorted(folder.glob('*.json'))[:limit]
    if not files:
        raise JobError('No JSON jobs found')
    result = []
    for f in files:
        data = json.loads(f.read_text(encoding='utf-8'))
        if isinstance(data, dict) and data.get('batch_version') == 1:
            print(f'Skipping batch manifest in folder mode: {f.name} (use --manifest to render it)')
            continue
        if not isinstance(data, dict) or data.get('version') != 1:
            raise JobError(f'{f.name} is not an individual version 1 render job')
        result.append((f.relative_to(ROOT).as_posix(), data))
    if not result:
        raise JobError('No individual render jobs found (use --manifest for batch JSON files)')
    return result


def main() -> int:
    parser = argparse.ArgumentParser(description='Batch render up to ten approved Shorts Studio videos')
    group = parser.add_mutually_exclusive_group()
    group.add_argument('--manifest', help='One-file manifest, e.g. jobs/production-batch.json')
    group.add_argument('--jobs', default='jobs', help='Legacy folder of individual JSON jobs')
    parser.add_argument('--out', default='output')
    parser.add_argument('--limit', type=int, default=10)
    args = parser.parse_args()
    try:
        if not 1 <= args.limit <= 10:
            raise JobError('Batch limit must be 1–10')
        output = (ROOT / args.out).resolve()
        if not output.is_relative_to(ROOT):
            raise JobError('Output must stay within the project')
        records = load_manifest(args.manifest, args.limit) if args.manifest else load_folder(args.jobs, args.limit)
        output.mkdir(parents=True, exist_ok=True)
        results = []
        seen = set()
        skipped = []
        with tempfile.TemporaryDirectory(prefix='shorts-batch-', dir=ROOT / 'jobs') as td:
            scratch = Path(td)
            for pos, (label, data) in enumerate(records, start=1):
                # Exclude only metadata that cannot alter rendered output.
                identity = json.dumps({key:value for key,value in data.items()
                                       if key not in ('id','generated_at','description')},
                                      sort_keys=True, separators=(',',':'), allow_nan=False)
                fingerprint = hashlib.sha256(identity.encode()).hexdigest()
                if fingerprint in seen:
                    skipped.append({'job':label,'reason':'Identical output settings','fingerprint':fingerprint})
                    print(f'Skipping duplicate: {label}')
                    continue
                seen.add(fingerprint)
                job_path = scratch / f'job-{pos:02d}.json'
                job_path.write_text(json.dumps(data, ensure_ascii=False), encoding='utf-8')
                print(f'Rendering {label}', flush=True)
                job_output = output / f'job-{pos:02d}-{fingerprint[:8]}'
                job_output.mkdir(parents=True, exist_ok=True)
                movie = render(job_path, job_output)
                uniquely_named = movie
                results.append({'job': label, 'channel': data.get('channel', ''),
                                'title': data.get('title', ''), 'video': uniquely_named.relative_to(output).as_posix(),
                                'sha256': hashlib.sha256(uniquely_named.read_bytes()).hexdigest(),
                                'source_fingerprint': fingerprint})
        if not results:
            raise JobError('Every selected job was a duplicate; nothing rendered')
        (output / 'renders-manifest.json').write_text(json.dumps(
            {'version': 1, 'renders': results, 'skipped': skipped}, indent=2) + '\n', encoding='utf-8')
        print(f'Rendered {len(results)} unique videos (render only; no posting)')
        return 0
    except (JobError, ValueError, TypeError, OSError, json.JSONDecodeError) as exc:
        print(f'Batch error: {exc}', file=sys.stderr)
        return 1


if __name__ == '__main__':
    sys.exit(main())

