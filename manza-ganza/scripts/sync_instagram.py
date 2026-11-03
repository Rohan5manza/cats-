#!/usr/bin/env python3
"""Optional public Instagram feed sync for Manza Ganza.

Runs in GitHub Actions. Requires IG_ACCESS_TOKEN as a GitHub Actions secret.
The result contains public metadata, never an access token.
Note that professional Instagram account permissions are required by Meta.
"""
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'data' / 'instagram.json'

def main():
    token = os.environ.get('IG_ACCESS_TOKEN', '').strip()
    if not token:
        print('No IG_ACCESS_TOKEN; retaining bundled/manual feed.')
        return 0
    mode = os.environ.get('IG_API_MODE', 'instagram_login').strip()
    version = os.environ.get('IG_GRAPH_VERSION', 'v24.0').strip()
    user_id = os.environ.get('IG_USER_ID', 'me').strip()
    if mode == 'facebook_login':
        if user_id == 'me':
            print('IG_USER_ID required for facebook_login mode', file=sys.stderr)
            return 1
        endpoint = f'https://graph.facebook.com/{version}/{user_id}/media'
    else:
        endpoint = f'https://graph.instagram.com/{version}/{user_id}/media'
    fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,children{media_type,media_url,thumbnail_url}'
    url = endpoint + '?' + urlencode({'fields':fields,'limit':40})
    # Token is sent only in an HTTP header. Errors omit the token and URL.
    req = Request(url, headers={'Authorization':f'Bearer {token}','User-Agent':'ManzaGanzaSite/1.0'})
    try:
        with urlopen(req, timeout=25) as response:
            payload = json.load(response)
    except HTTPError as exc:
        print(f'Instagram API HTTP error: {exc.code}. Check account type/token/permissions.',file=sys.stderr)
        return 1
    except (URLError,TimeoutError,ValueError) as exc:
        print(f'Instagram API unavailable or returned invalid JSON: {type(exc).__name__}',file=sys.stderr)
        return 1
    if not isinstance(payload.get('data'),list):
        print('Instagram API returned no media array. Keeping existing feed.',file=sys.stderr)
        return 1
    posts=[]
    for item in payload['data']:
        if not isinstance(item,dict):
            continue
        thumb = item.get('thumbnail_url') or item.get('media_url')
        # For a carousel, use the first child thumbnail when available.
        children = item.get('children',{}).get('data',[]) if isinstance(item.get('children'),dict) else []
        if not thumb and children:
            thumb = children[0].get('thumbnail_url') or children[0].get('media_url')
        if not item.get('permalink'):
            continue
        posts.append({
            'id':str(item.get('id','')),
            'caption':str(item.get('caption',''))[:3000],
            'media_type':item.get('media_type',''),
            'media_url':item.get('media_url',''),
            'thumbnail_url':thumb or '',
            'permalink':item.get('permalink',''),
            'timestamp':item.get('timestamp',''),
        })
    posts.sort(key=lambda post:post.get('timestamp',''),reverse=True)
    new={'updated_at':datetime.now(timezone.utc).isoformat(timespec='seconds'), 'source':'instagram_api', 'items':posts[:32]}
    OUT.write_text(json.dumps(new,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'Updated public feed with {len(new["items"])} posts (no credentials exported).')
    return 0

if __name__=='__main__':
    raise SystemExit(main())
