"""Build the same dashboard as a private, dependency-free hosted Worker."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
files=['index.html','app.js','asmr.js','story-series.js','quick-create.js','cloud-pack.js','github-usage.js','creator.js','creator-support.js','recovery.js','styles.css']
assets={('/'+name):{'body':(ROOT/name).read_text(),'type':'text/html; charset=utf-8' if name.endswith('.html') else 'text/css; charset=utf-8' if name.endswith('.css') else 'text/javascript; charset=utf-8'} for name in files}
assets['/index.html']['body']=assets['/index.html']['body'].replace('href="#overview"','href="#creator"')
# A first visit opens the online creator; existing bookmarks remain valid.
assets['/app.js']['body']=assets['/app.js']['body'].replace(": 'overview';",": 'creator';",1)
worker=(ROOT/'web/artifact-proxy.mjs').read_text()+"\nconst assets="+json.dumps(assets)+";\n"+'''
export default {async fetch(request){
 const url=new URL(request.url);
 if(url.pathname==='/api/cloud-artifact')return artifact(request);
 if(url.pathname==='/api/online-status')return Response.json({online:true,version:'0.16.0',automatic_preview:true},{headers:{'Cache-Control':'no-store'}});
 if(request.method!=='GET'&&request.method!=='HEAD')return new Response('Method not allowed',{status:405});
 const item=assets[url.pathname==='/'?'/index.html':url.pathname];
 if(!item)return new Response('Not found',{status:404});
 return new Response(request.method==='HEAD'?null:item.body,{headers:{'Content-Type':item.type,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; media-src 'self' blob:; connect-src 'self' https://api.github.com; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"}});
}};
'''
out=ROOT/'dist/server';out.mkdir(parents=True,exist_ok=True);(out/'index.js').write_text(worker)
print('Built private online dashboard and streaming artifact proxy.')
