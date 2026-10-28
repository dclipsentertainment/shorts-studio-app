#!/usr/bin/env python3
"""Fetch public YouTube video view counts for an approved, user-curated watchlist.

No video downloads, no Instagram scraping. Requires YOUTUBE_API_KEY.
CSV columns: url,title,creator. Instagram links are retained only if a manually
entered non-negative views value is supplied in a `views` column.
"""
from __future__ import annotations
import argparse
import csv
import datetime as dt
import json
import os
from pathlib import Path
from urllib.parse import urlparse, parse_qs, urlencode
from urllib.request import urlopen

YOUTUBE_HOSTS = {'youtube.com','www.youtube.com','m.youtube.com','youtu.be','www.youtu.be'}
INSTAGRAM_HOSTS = {'instagram.com','www.instagram.com'}

def video_id(url: str) -> str | None:
    """Supported watch and Shorts URLs; never downloads video content."""
    p = urlparse(url)
    if p.scheme != 'https' or (p.hostname or '').lower() not in YOUTUBE_HOSTS:
        return None
    if p.hostname in {'youtu.be','www.youtu.be'}:
        candidate = p.path.strip('/').split('/')[0]
    elif p.path.startswith('/shorts/') or p.path.startswith('/live/') or p.path.startswith('/embed/'):
        candidate = p.path.split('/')[2]
    elif p.path == '/watch':
        candidate = parse_qs(p.query).get('v',[''])[0]
    else:
        return None
    return candidate if len(candidate)==11 and all(c.isascii() and (c.isalnum() or c in '-_') for c in candidate) else None

def retrieve_video_stats(ids: list[str], key: str) -> dict:
    result={}
    for start in range(0,len(ids),50):
        batch=ids[start:start+50]
        endpoint='https://www.googleapis.com/youtube/v3/videos?'+urlencode({'part':'snippet,statistics','id':','.join(batch),'key':key})
        with urlopen(endpoint, timeout=25) as res:
            payload=json.load(res)
        for item in payload.get('items',[]):
            result[item['id']]=item
    return result

def build_report(rows: list[dict], stats: dict) -> dict:
    items=[];seen=set()
    for r in rows:
        url=(r.get('url') or '').strip()
        v=video_id(url)
        parsed=urlparse(url)
        if v:
            dedupe='yt:'+v
            if dedupe in seen:continue
            seen.add(dedupe)
            data=stats.get(v)
            if not data:continue
            snippet=data.get('snippet',{})
            amount=int(data.get('statistics',{}).get('viewCount') or 0)
            items.append({'url':f'https://www.youtube.com/shorts/{v}',
              'platform':'YouTube','title':str(snippet.get('title') or r.get('title') or 'Untitled')[:150],
              'creator':str(snippet.get('channelTitle') or r.get('creator') or '')[:100],
              'published_at':str(snippet.get('publishedAt') or '')[:10],
              'views':amount,'source':'youtube_api'})
        elif parsed.scheme=='https' and (parsed.hostname or '').lower() in INSTAGRAM_HOSTS:
            # Meta doesn't provide unrestricted third-party Reel insights; use manual supplied values only.
            if not parsed.path.startswith('/reel/') or not str(r.get('views','')).strip().isdigit():continue
            dedupe='ig:'+parsed.path.rstrip('/')
            if dedupe in seen:continue
            seen.add(dedupe)
            items.append({'url':url,'platform':'Instagram','title':str(r.get('title') or 'Instagram Reel')[:150],
              'creator':str(r.get('creator') or '')[:100], 'published_at':(r.get('published_at') or '')[:10],
              'views':int(r['views']), 'source':'manual_import'})
    return {'report_version':1,'generated_at':dt.datetime.now(dt.timezone.utc).isoformat(),
            'items':sorted(items,key=lambda t:t['views'],reverse=True)}

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--input',required=True,help='CSV of short/reel URLs')
    ap.add_argument('--out',required=True,help='Output JSON for Viral Radar import')
    ns=ap.parse_args()
    source=Path(ns.input)
    if not source.exists():raise SystemExit(f'Missing CSV watchlist: {source}')
    with source.open(encoding='utf-8-sig',newline='') as f:
        rows=list(csv.DictReader(f))
    if len(rows)>300:raise SystemExit('Limit is 300 watchlist URLs per run')
    ids=list(dict.fromkeys(x for r in rows if (x:=video_id((r.get('url') or '').strip()))))
    if ids and not os.environ.get('YOUTUBE_API_KEY'):
        raise SystemExit('Set YOUTUBE_API_KEY as a GitHub Actions secret or environment variable to fetch YouTube views.')
    stats=retrieve_video_stats(ids,os.environ['YOUTUBE_API_KEY']) if ids else {}
    result=build_report(rows,stats)
    output=Path(ns.out);output.parent.mkdir(parents=True,exist_ok=True)
    output.write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    print(f'Exported {len(result["items"])} video metrics to {output}')

if __name__=='__main__':main()
