// The browser supplies its own short-lived GitHub token. Never store it or forward it to redirects.
const REPO='dclipsentertainment/shorts-studio-production';
const MAX=500*1024*1024;
const error=(status,message)=>Response.json({error:message},{status,headers:{'Cache-Control':'no-store'}});
export async function artifact(request,fetcher=fetch){
 const url=new URL(request.url);
 if(request.method!=='GET')return error(405,'GET required.');
 if(request.headers.get('Origin')&&request.headers.get('Origin')!==url.origin)return error(403,'Same-origin requests only.');
 const id=url.searchParams.get('id'),token=request.headers.get('X-DClips-GitHub-Token');
 if(!/^\d{1,20}$/.test(id||''))return error(400,'Invalid artifact ID.');
 if(!token||token.length>1000||/[\r\n]/.test(token))return error(401,'Connect GitHub first.');
 let first;
 try{first=await fetcher(`https://api.github.com/repos/${REPO}/actions/artifacts/${id}/zip`,{redirect:'manual',headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'DClips-Studio'},signal:AbortSignal.timeout(30000)});}catch(_){return error(502,'GitHub is temporarily unavailable.');}
 if(first.status!==302)return error(first.status===401||first.status===403?401:502,'Artifact unavailable. Check access or retention.');
 let target;try{target=new URL(first.headers.get('Location'));}catch(_){return error(502,'Missing download location.');}
 if(target.protocol!=='https:'||target.username||target.password)return error(502,'Invalid download location.');
 let media;try{media=await fetcher(target.href,{redirect:'error',signal:AbortSignal.timeout(180000)});}catch(_){return error(502,'Artifact download failed.');}
 if(!media.ok||!media.body)return error(502,'Artifact download failed.');
 const length=Number(media.headers.get('Content-Length'));
 if(length>MAX){await media.body.cancel();return error(413,'Artifact exceeds 500 MiB.');}
 let bytes=0;const reader=media.body.getReader();
 const body=new ReadableStream({async pull(controller){try{const r=await reader.read();if(r.done){controller.close();return;}bytes+=r.value.byteLength;if(bytes>MAX){await reader.cancel();controller.error(Error('Artifact too large.'));return;}controller.enqueue(r.value);}catch(e){controller.error(e);}},cancel:reason=>reader.cancel(reason)});
 return new Response(body,{headers:{'Content-Type':'application/zip','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Disposition':'attachment; filename="finished-online-video.zip"'}});
}
