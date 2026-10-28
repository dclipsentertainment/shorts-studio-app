#!/usr/bin/env python3
"""Discover short-form YouTube *candidates* by niche using the official Data API.

The API does not expose a definitive Shorts flag or public video aspect ratio:
we filter duration (3-180 seconds) but label results as 'short-form candidates'.
No social-video download, no scraping, no guarantee of rights to reuse.
An API key is read from YOUTUBE_API_KEY, never from a committed file.
"""
from __future__ import annotations
import argparse
import datetime as dt
import json
import math
import os
import re
import sys
from collections import defaultdict
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen

SEARCH_ENDPOINT = 'https://www.googleapis.com/youtube/v3/search'
VIDEOS_ENDPOINT = 'https://www.googleapis.com/youtube/v3/videos'
DURATION = re.compile(r'^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$')
UTC = dt.timezone.utc


def api_get(endpoint, params, fetch=None):
    url = endpoint + '?' + urlencode(params)
    if fetch:
        return fetch(url)
    with urlopen(url, timeout=30) as resp:
        return json.load(resp)


def parse_duration(s):
    m = DURATION.fullmatch(s or '')
    if not m:
        return None
    days, hours, minutes, seconds = (int(i or 0) for i in m.groups())
    return days*86400 + hours*3600 + minutes*60 + seconds


def load_config(path):
    config = json.loads(Path(path).read_text(encoding='utf-8-sig'))
    if not isinstance(config, dict) or not isinstance(config.get('niches'),list):
        raise ValueError('Config must contain a niches list')
    niches = config['niches']
    if not 1 <= len(niches) <= 8:
        raise ValueError('Provide 1–8 niches')
    days = config.get('lookback_days', 14)
    limit = config.get('max_results_per_query', 25)
    min_views = config.get('min_views', 1000)
    language = config.get('language', 'en')
    if type(days) is not int or not 1 <= days <= 90: raise ValueError('lookback_days must be 1–90')
    if type(limit) is not int or not 1 <= limit <= 50: raise ValueError('max_results_per_query must be 1–50')
    if type(min_views) is not int or not 0 <= min_views <= 1000000000: raise ValueError('min_views invalid')
    if not isinstance(language,str) or len(language)>8: raise ValueError('language invalid')
    names = set()
    for n in niches:
        if not isinstance(n,dict): raise ValueError('Each niche must be an object')
        name = n.get('name'); queries = n.get('queries')
        if not isinstance(name,str) or not 1<=len(name.strip())<=60 or name in names: raise ValueError('Invalid or duplicate niche name')
        if not isinstance(queries,list) or not 1 <= len(queries) <= 3 or not all(isinstance(q,str) and 2<=len(q.strip())<=100 for q in queries):
            raise ValueError('Each niche needs 1–3 query strings (2–100 characters)')
        names.add(name)
    return config


def rank(views, age_days, likes):
    # This is a heuristically ordered *research* queue, not proof a clip is growing.
    views_daily = views / max(age_days, 1.0)
    like_rate = likes / views if views else 0
    score = min(100, round(11 * math.log10(1+views_daily) + 3.6 * math.log10(1+views) + min(10, like_rate*100), 1))
    return score, round(views_daily)


def discover(config, key, *, now=None, fetch=None):
    if not key: raise ValueError('YOUTUBE_API_KEY is required')
    now = now or dt.datetime.now(UTC)
    start = now - dt.timedelta(days=config.get('lookback_days',14))
    after = start.isoformat(timespec='seconds').replace('+00:00','Z')
    found: dict[str,set[str]] = defaultdict(set)
    search_count = 0
    for niche in config['niches']:
        for query in niche['queries']:
            result = api_get(SEARCH_ENDPOINT, {
                'key': key, 'part':'snippet', 'q':query, 'type':'video',
                'videoDuration':'short', 'order':'viewCount',
                'maxResults':config.get('max_results_per_query',25),
                'publishedAfter':after, 'relevanceLanguage':config.get('language','en'),
                'safeSearch':'moderate',
            }, fetch=fetch)
            search_count += 1
            for item in result.get('items',[]):
                vid = item.get('id',{}).get('videoId')
                if isinstance(vid,str) and re.fullmatch(r'[a-zA-Z0-9_-]{11}',vid):
                    found[vid].add(niche['name'])
    all_items=[]
    ids=list(found)
    for off in range(0,len(ids),50):
        response=api_get(VIDEOS_ENDPOINT,{'key':key,'part':'snippet,statistics,contentDetails',
            'id':','.join(ids[off:off+50]),'maxResults':50},fetch=fetch)
        all_items.extend(response.get('items',[]))
    output=[]
    for v in all_items:
        vid=v.get('id','')
        if vid not in found:continue
        duration=parse_duration(v.get('contentDetails',{}).get('duration'))
        if duration is None or not 3<=duration<=180:continue
        snippet=v.get('snippet',{})
        try: views=int(v.get('statistics',{}).get('viewCount',0))
        except (TypeError,ValueError):continue
        if views<config.get('min_views',1000):continue
        try: likes=int(v.get('statistics',{}).get('likeCount',0))
        except (TypeError,ValueError):likes=0
        try: published=dt.datetime.fromisoformat(snippet['publishedAt'].replace('Z','+00:00'))
        except (KeyError,ValueError): continue
        age_days = max((now-published).total_seconds()/86400,1/24)
        if published < start or published>now:continue
        score,vpd=rank(views,age_days,likes)
        output.append({
            'url':f'https://www.youtube.com/watch?v={vid}',
            'platform':'YouTube',
            'source':'youtube_api_discovery',
            'title':str(snippet.get('title','Untitled'))[:150],
            'creator':str(snippet.get('channelTitle',''))[:100],
            'niches':sorted(found[vid]), 'published_at':published.date().isoformat(),
            'views':views, 'likes':likes, 'duration_seconds':duration,
            'age_days':round(age_days,1),'estimated_views_per_day':vpd,'discovery_score':score,
            'shorts_verified':False,'usage_status':'reference',
        })
    output.sort(key=lambda x:(-x['discovery_score'],-x['views'],x['url']))
    for item in output: item['rank']=output.index(item)+1
    return {'discovery_version':1,'generated_at':now.isoformat(),'platform':'YouTube',
        'method':'official_youtube_data_api',
        'note':'Short-form candidates by duration, not confirmed Shorts. Estimated views/day is lifetime average since upload, not observed momentum. Research-only links.',
        'settings':{'lookback_days':config.get('lookback_days',14),'min_views':config.get('min_views',1000),
                    'niches':[n['name'] for n in config['niches']]},
        'search_calls':search_count,'items':output}


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--config',default='reports/discovery-niches.json')
    p.add_argument('--out',default='reports/discovery-results.json')
    args=p.parse_args()
    try:
        config=load_config(args.config)
        result=discover(config,os.environ.get('YOUTUBE_API_KEY',''))
        out=Path(args.out);out.parent.mkdir(parents=True,exist_ok=True)
        out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        print(f"Discovered {len(result['items'])} short-form candidates across {len(config['niches'])} niches; {result['search_calls']} search calls")
    except Exception as e:
        print(f'Discovery failed: {e}',file=sys.stderr)
        raise SystemExit(1) from e

if __name__=='__main__':main()
