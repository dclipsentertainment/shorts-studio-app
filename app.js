/* Shorts Studio — privacy-first, dependency-free planning dashboard.
 * No API credentials are stored or requested by this version.
 */
(() => {
'use strict';
const STORE_KEY = 'shorts_studio_state_v1';
const RECOVERY_KEY = 'shorts_studio_recovery_v1';
const APP_VERSION = '0.14.7';
const views = {overview:'Overview',channels:'Channels',production:'Production flow',series:'Story series planner',studio:'Content studio',queue:'Publishing queue',scout:'Clip scout',live:'Live stream monitor',radar:'Viral radar',discover:'Trend discovery',analytics:'Analytics',usage:'GitHub usage',growth:'Growth lab',creative:'Creative lab',quality:'Quality gate',competitors:'Competitors',ai:'ChatGPT script desk',preview:'Preview & subtitles',setup:'Setup & backups'};
const palettes = ['#8c7aff','#ef7ab6','#50bdc3','#e9a868','#5abb92','#6b95f1'];
const initial = () => ({version:1,channels:[],projects:[],scoutReports:[],trends:[],discovery:null,streamers:[],viralThreshold:100000,createdAt:new Date().toISOString(),demo:false});
const $ = s => document.querySelector(s);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const str = v => String(v ?? '').trim();
const uid = () => (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ss-${Date.now()}-${Math.random().toString(36).slice(2,10)}`);
let state = load();
if(!Array.isArray(state.scoutReports)) state.scoutReports=[];
if(!Array.isArray(state.trends)) state.trends=[];
if(!Array.isArray(state.streamers)) state.streamers=[];
if(!state.discovery || !Array.isArray(state.discovery.items)) state.discovery=null;
if(!Number.isSafeInteger(state.viralThreshold)||state.viralThreshold<1) state.viralThreshold=100000;
let page = (location.hash.replace('#','') in views) ? location.hash.slice(1) : 'overview';
let filter = 'all';
let discoveryNiche='all';
let aiDraft = null;
let seriesDraft = null;
let seriesPreview = null;
let aiBrief = null;
let aiPrefill = null;
let previewProjectId = '';
let previewSegments = [];
let previewUrl = '';
let previewObjectUrl = '';
let previewMediaName = '';
let previewFileDuration = 0;
let previewEditingCueIndex = -1;
let captionDragging = null;
let toastTimer;
function load(){try{let item=JSON.parse(localStorage.getItem(STORE_KEY)); if(item && item.version === 1 && Array.isArray(item.channels) && Array.isArray(item.projects)) return item;}catch(err){console.warn('Could not load local data:',err)}return initial()}
function recoveryEntries(){
 try{const entries=JSON.parse(localStorage.getItem(RECOVERY_KEY)||'[]');return Array.isArray(entries)?entries.filter(x=>x&&typeof x.data==='string'&&typeof x.savedAt==='string').slice(-5):[]}catch(_){return []}
}
function save(){
 const next=JSON.stringify(state);
 try{
  const previous=localStorage.getItem(STORE_KEY);
  try{localStorage.setItem(STORE_KEY,next)}catch(err){
   // Recovery snapshots are secondary; never risk losing new edits to keep them.
   localStorage.removeItem(RECOVERY_KEY);
   localStorage.setItem(STORE_KEY,next);
  }
  if(previous && previous!==next && previous.length<300000){
   try{
    let list=recoveryEntries();list.push({savedAt:new Date().toISOString(),data:previous});
    list=list.slice(-5);while(JSON.stringify(list).length>900000 && list.length>1)list.shift();
    localStorage.setItem(RECOVERY_KEY,JSON.stringify(list));
   }catch(_){/* Main workspace save succeeded; recovery is best effort. */}
  }
  return true;
 }catch(err){notice('Could not save browser data. Export a backup now.');return false}
}
function restoreRecovery(index){
 const points=recoveryEntries(),entry=points[index];if(!entry){notice('Recovery point no longer exists.');return}
 let recovered;try{recovered=JSON.parse(entry.data)}catch(_){notice('Recovery point is damaged.');return}
 if(!recovered||recovered.version!==1||!Array.isArray(recovered.channels)||!Array.isArray(recovered.projects)){notice('Invalid recovery point.');return}
 if(!confirm(`Restore workspace from ${dateStr(entry.savedAt)}? Current data is saved as a recovery point first.`))return;
 state=recovered;if(!Array.isArray(state.scoutReports))state.scoutReports=[];if(!Array.isArray(state.trends))state.trends=[];
 if(!save()){notice('Recovery could not be saved.');return}
 render();notice('Recovery point restored. Export a backup for longer-term protection.');
}
function notice(text){const e=$('#toast');e.textContent=text;e.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>e.classList.remove('show'),3900)}
const dateStr = d => {if(!d)return 'Not scheduled';let date=new Date(d);return isNaN(+date)?'Invalid date':date.toLocaleString('en-IE',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false})};
const num = n => Number(n||0).toLocaleString('en-IE');
const compact = n => Number(n||0).toLocaleString('en-IE',{notation:'compact',maximumFractionDigits:1});
const channel = id => state.channels.find(c=>c.id===id);
const projectsFor = id => state.projects.filter(p=>p.channelId===id);
const status = name => `<span class="status ${esc(name)}">${esc(name.charAt(0).toUpperCase()+name.slice(1))}</span>`;
const empty = (emoji,title,description,button,action)=>`<div class="empty"><div class="empty-icon">${emoji}</div><h3>${esc(title)}</h3><p>${esc(description)}</p>${button?`<button class="button button-primary small" data-action="${action}">${esc(button)}</button>`:''}</div>`;
function render(){
 $('#nav-channel-count').textContent=state.channels.length;
 $('#today-date').textContent=new Date().toLocaleDateString('en-IE',{weekday:'short',day:'numeric',month:'short'});
 $('#crumb-current').textContent=views[page];
 document.querySelectorAll('[data-nav]').forEach(b=>b.classList.toggle('active',b.dataset.nav===page));
 const main=$('#main');main.innerHTML=({overview:overview,channels:channelsPage,production:productionPage,series:seriesPage,studio:studioPage,queue:queuePage,scout:scoutPage,live:liveMonitorPage,radar:radarPage,discover:discoverPage,analytics:analyticsPage,usage:window.DClipsUsageMonitor.render,growth:growthPage,creative:creativePage,ai:aiDeskPage,preview:previewPage,quality:qualityPage,competitors:competitorsPage,setup:setupPage}[page])();
 if(page==='usage')window.DClipsUsageMonitor.afterRender();
 if(page==='preview')previewRestoreDisplay();
 if(page==='production'){productionRestoreDisplay();productionCheckBackend();}
}
const heading=(label,title,desc,button)=>`<div class="page-head"><div><div class="eyebrow">${label}</div><h1>${title}</h1><p class="subhead">${desc}</p></div>${button||''}</div>`;
function overview(){
 const ready=state.projects.filter(p=>p.status==='ready'||p.status==='scheduled').length;
 const published=state.projects.filter(p=>p.status==='published').length;
 const total=state.projects.reduce((a,p)=>a+['YT','IG','TT','FB'].reduce((sum,k)=>sum+Number(p['views'+k]||0),0),0);
 return `${heading('YOUR COMMAND CENTER','Make more. Manage less.','Your content, channels and upcoming releases in one workspace.',`<button class="button button-ghost" data-action="new-channel">＋ Add channel</button>`)}
 <section class="preview-hero"><div class="hero-tag">★ PHASE 1 · €0 SOFTWARE COST</div><h2>From an idea to a Short.<br>All in one workflow.</h2><p>Plan → caption → preview → export MP4 locally (when Python/FFmpeg are available).</p></section>
 <div class="kpis">
 ${[{a:'Channels',v:state.channels.length,ic:'◫',f:'Independent content niches'},{a:'Content projects',v:state.projects.length,ic:'✧',f:'Clips and original videos'},{a:'Ready / scheduled',v:ready,ic:'◷',f:'Prepared for publishing'},{a:'Recorded views',v:compact(total),ic:'◩',f:'Entered manually · '+published+' published'}].map(k=>`<div class="kpi"><div class="kpi-head"><span>${k.a}</span><span class="kpi-icon">${k.ic}</span></div><div class="kpi-value">${k.v}</div><div class="kpi-foot">${k.f}</div></div>`).join('')}</div>
 <div class="grid-main"><section class="panel"><div class="panel-head"><h2>Recent content</h2><button class="eyelink" data-nav="studio">View all →</button></div>
 ${state.projects.length?`<div class="tablewrap"><table class="data-table"><thead><tr><th>Video</th><th>Channel</th><th>Status</th><th></th></tr></thead><tbody>${[...state.projects].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,6).map(p=>`<tr><td class="title-cell">${esc(p.title)}<span class="subcell">${p.kind==='clip'?'✂ Clip':'✦ Original'} · ${esc(p.duration)} sec</span></td><td>${esc(channel(p.channelId)?.name||'Unassigned')}</td><td>${status(p.status)}</td><td><button class="kebab" title="Edit" data-action="edit-content" data-id="${p.id}">Edit</button></td></tr>`).join('')}</tbody></table></div>`:empty('🎬','No videos yet','Create your first video project to start building your content pipeline.','Create a project','new-content')}
 </section><section class="panel"><div class="panel-head"><h2>Get started</h2><span class="tiny-muted">SETUP CHECKLIST</span></div>
 ${[['1','Create your channel groups','Start with gaming, podcast or original AI videos.',state.channels.length>0],['2','Prepare your first project','Enter a source video, timings and/or script.',state.projects.length>0],['3','Open Production flow','Make a local MP4 if Python and FFmpeg are available.',false]].map(x=>`<div class="step"><div class="step-number">${x[3]?'✓':x[0]}</div><div><div class="step-title">${x[1]}</div><div class="step-text">${x[2]}</div></div></div>`).join('')}
 <div class="notice">🔒 This dashboard does not publish or process video by itself. Automated YouTube discovery is available as an optional GitHub workflow; importing its report is manual. Publishing and AI generation remain future integrations.</div></section></div>
 <h2 class="section-title">Your channels <button class="eyelink" data-nav="channels">Manage →</button></h2>
 ${state.channels.length?`<div class="channel-grid">${state.channels.slice(0,3).map(channelCard).join('')}</div>`:empty('◉','Your channels will appear here','Start a separate brand for each niche. You can link YouTube and Instagram handles later.','Add your first channel','new-channel')}`;
}
function channelCard(c){
 const count=projectsFor(c.id).length;
 return `<article class="channel-card" style="--accent:${esc(c.color||palettes[0])}"><div class="channel-top"><span class="channel-avatar">${esc((c.name||'?').slice(0,1).toUpperCase())}</span><span class="tiny-muted">${count} projects</span></div><h3 class="channel-name">${esc(c.name)}</h3><div class="channel-type">${esc(c.niche||'Uncategorised content')}</div><div class="platforms"><span class="platform">▶ YouTube ${c.youtubeHandle?'· '+esc(c.youtubeHandle):'· not linked'}</span><span class="platform">◎ Instagram ${c.instagramHandle?'· '+esc(c.instagramHandle):'· not linked'}</span><span class="platform">♪ TikTok ${c.tiktokHandle?'· '+esc(c.tiktokHandle):'· not linked'}</span><span class="platform">f Facebook ${c.facebookHandle?'· '+esc(c.facebookHandle):'· not linked'}</span></div><div class="card-actions"><button class="button tiny button-ghost" data-action="edit-channel" data-id="${c.id}">Edit channel</button><button class="button tiny" data-action="new-content" data-channel="${c.id}">＋ Content</button></div></article>`;
}
function channelsPage(){return `${heading('BRANDS & ACCOUNTS','Your channels','Manage your YouTube Shorts, Instagram Reels, TikTok and Facebook accounts by brand.',`<button class="button button-primary" data-action="new-channel">＋ Add channel</button>`)}
 <div class="notice" style="margin-bottom:21px">Names and @handles are planning information only. Entering a handle does <strong>not</strong> connect an account or enable publishing. OAuth integration comes later.</div>
 ${state.channels.length?`<div class="channel-grid">${state.channels.map(channelCard).join('')}</div>`:empty('◎','No channel groups yet','Create one brand for each type of content.','Create a channel','new-channel')}
 <h2 class="section-title">Recommended structure</h2><div class="panel"><p class="secondary-note">Use one content brand across YouTube Shorts, Instagram Reels, TikTok and Facebook Reels. Keep each platform handle and performance figure separate; publishing rights and monetisation eligibility vary by platform.</p></div>`}

function seriesPage(){
 const defaults={title:'',script:'',wpm:145,channelId:state.channels[0]?.id||'',
  enabled:{IG:true,YT:true,TT:true,FB:true},conf:{}};
 const d=seriesDraft||defaults,profiles=window.DClipsSeries?.PROFILES||{};
 return `${heading('MULTI-PLATFORM NARRATIVE','Story series planner','Write one complete story, then plan different-length episodes for Instagram, YouTube Shorts, TikTok and Facebook.')}
 <div class="notice" style="margin-bottom:18px">These are editorial length recommendations, not guaranteed reach, revenue or eligibility. Creating drafts does not render or post anything. Add illustrations and approve all parts before exporting.</div>
 <section class="panel series-editor"><div class="panel-head"><h2>1. Your complete story</h2><span class="tiny-muted">MASTER SCRIPT</span></div>
 <div class="form-grid">
 <div class="form-field span2"><label for="series-title">Story title</label><input class="field" id="series-title" value="${esc(d.title)}" maxlength="150" placeholder="The Life of Julius Caesar"></div>
 <div class="form-field span2"><label for="series-script">Narration script</label><textarea class="field" id="series-script" rows="10" maxlength="45000" placeholder="Write the complete story in chronological order…">${esc(d.script)}</textarea><div class="field-help">Parts use approximate sentence boundaries. Review the cuts, improve every opening hook and ensure each part feels complete.</div></div>
 <div class="form-field"><label for="series-wpm">Narrator speed (words/minute)</label><input class="field" id="series-wpm" type="number" min="100" max="200" step="5" value="${Number(d.wpm)||145}"></div>
 <div class="form-field"><label for="series-channel">Your DClips brand</label><select class="field" id="series-channel">${state.channels.length?state.channels.map(ch=>`<option value="${esc(ch.id)}" ${ch.id===(d.channelId||state.channels[0]?.id)?'selected':''}>${esc(ch.name)}</option>`).join(''):'<option value="">Create a brand first</option>'}</select></div>
 </div></section>
 <section class="panel" style="margin-top:18px"><div class="panel-head"><h2>2. Platform-specific episode lengths</h2><span class="tiny-muted">EDITABLE RECOMMENDATIONS</span></div>
 <div class="series-platform-grid">${Object.keys(profiles).map(id=>{
  const p=profiles[id],enabled=d.enabled?.[id]!==false,conf=d.conf?.[id]||{};
  const mode=conf.mode||p.mode,target=Number(conf.target||p.target);
  return `<div class="series-platform"><label class="checkbox-row"><input type="checkbox" id="series-enabled-${id}" ${enabled?'checked':''}> <strong>${esc(p.name)}</strong></label>
   <div class="form-field"><label for="series-mode-${id}">Format</label><select class="field" id="series-mode-${id}"><option value="parts" ${mode==='parts'?'selected':''}>Short parts</option><option value="full" ${mode==='full'?'selected':''}>Complete story where possible</option></select></div>
   <div class="form-field"><label for="series-target-${id}">Target seconds</label><input class="field" id="series-target-${id}" type="number" min="15" max="${p.max}" step="5" value="${target}"></div>
   <p class="tiny-muted"><strong>Suggested: ${esc(p.recommended)}</strong>. ${esc(p.why)}</p>
  </div>`;
 }).join('')}</div>
 <div class="preview-actions"><button type="button" class="button button-ghost" data-action="series-example">Load sample Caesar outline</button><button type="button" class="button button-primary" data-action="series-preview">✦ Recommend story parts</button></div></section>
 ${seriesPreview?`<section class="panel" style="margin-top:18px"><div class="panel-head"><h2>3. Review the proposed episodes</h2><span class="tiny-muted">${num(seriesPreview.words)} WORDS · ≈ ${Math.round(seriesPreview.estimatedSeconds/6)/10} MINUTES</span></div>
 <div class="notice warn">These are estimated cuts, not finished scripts. Edit each part for smooth transitions, a strong opening, accurate narration and scene illustrations before publishing.</div>
 ${seriesPreview.platforms.map(v=>`<div class="series-variant"><h3>${esc(v.name)} · ${v.partCount} ${v.partCount===1?'video':'parts'} <span class="tiny-muted">${v.mode==='full'?'Full-story preference':'Short episodes'} · target ${v.target}s</span></h3>
 <div class="series-parts">${v.parts.map(part=>`<article class="series-part"><div><strong>${esc(part.label)}</strong><small>≈ ${part.seconds} sec · ${part.words} words</small></div><p>${esc(part.script.slice(0,185))}${part.script.length>185?'…':''}</p></article>`).join('')}</div>
 ${v.warnings.map(x=>`<p class="review-error">⚠ ${esc(x)}</p>`).join('')}</div>`).join('')}
 <button type="button" class="button button-primary" data-action="series-create">＋ Create ${seriesPreview.platforms.reduce((sum,v)=>sum+v.partCount,0)} editable video drafts</button>
 <p class="footnote">Each part is saved as a separate draft with its target platform and episode number. The full master script remains in the series record. Nothing is automatically uploaded.</p></section>`:''}
 <section class="panel" style="margin-top:18px"><h2>Saved story series · ${(state.seriesPlans||[]).length}</h2>
 ${(state.seriesPlans||[]).length?(state.seriesPlans||[]).slice(-8).reverse().map(x=>`<div class="metric-list"><span><strong>${esc(x.title)}</strong><small>${esc(dateStr(x.createdAt))} · ${x.projectCount} video drafts</small></span><button class="button tiny" data-action="series-show-drafts" data-id="${esc(x.id)}">Open drafts</button></div>`).join(''):'<p class="secondary-note">Create your first story series above to see its episodes in Content Studio.</p>'}</section>`;
}
function seriesReadForm(){
 if(!window.DClipsSeries)throw Error('Story planner module is missing; reload the latest DClips app.');
 const ids=Object.keys(window.DClipsSeries.PROFILES),enabled={},conf={},platforms=[];
 for(const id of ids){
  enabled[id]=Boolean($('#series-enabled-'+id)?.checked);
  conf[id]={mode:$('#series-mode-'+id)?.value||window.DClipsSeries.PROFILES[id].mode,
    target:Number($('#series-target-'+id)?.value||window.DClipsSeries.PROFILES[id].target)};
  if(enabled[id])platforms.push(id);
 }
 const draft={title:($('#series-title')?.value||'').trim(),script:($('#series-script')?.value||'').trim(),
  wpm:Number($('#series-wpm')?.value||145),channelId:$('#series-channel')?.value||'',enabled,conf};
 return {draft,plan:window.DClipsSeries.plan({...draft,platforms,config:conf})};
}
function seriesPreviewAction(){
 try{const data=seriesReadForm();seriesDraft=data.draft;seriesPreview=data.plan;render();
  notice('Story recommendations ready. Check the cuts before creating projects.');
 }catch(e){notice(e.message)}
}
function seriesExample(){
 const script='Julius Caesar was born into a patrician family in ancient Rome. His early life unfolded amid political instability and rivalries. He later developed a military and political career that brought him increasing influence. In Gaul, his campaigns greatly expanded Roman power, but also intensified political tension at home. When he crossed the Rubicon in forty-nine BCE, he started a civil war against rivals including Pompey. His victory left him with extraordinary authority. In forty-four BCE, a group of senators assassinated Caesar. Their actions did not restore the old Republic. Instead, more civil wars followed, helping pave the way for the Roman Empire.';
 seriesDraft={title:'The Life of Julius Caesar',script,wpm:145,channelId:state.channels[0]?.id||'',
  enabled:{IG:true,YT:true,TT:true,FB:true},conf:{}};seriesPreview=null;render();
 notice('Sample outline loaded. Expand it and fact-check the script before publication.');
}
function seriesCreate(){
 try{
  const {draft,plan}=seriesReadForm();
  if(!state.channels.some(ch=>ch.id===draft.channelId))throw Error('Create and select a channel before saving story drafts.');
  const count=plan.platforms.reduce((n,v)=>n+v.partCount,0);
  if(count>80)throw Error('This plan has more than 80 drafts. Choose fewer platforms or split the master story into chapters.');
  if((state.seriesPlans||[]).length>=35)throw Error('Maximum 35 saved series. Back up your workspace before adding more.');
  const seriesId=uid(),now=new Date().toISOString(),projects=[];
  for(const variant of plan.platforms){
   for(const part of variant.parts){
    const duration=Math.max(8,Math.min(600,Math.ceil(part.seconds+2.5)));
    projects.push({id:uid(),title:part.label,kind:'original',channelId:draft.channelId,status:'draft',
     script:part.script,description:'',notes:'Part of '+draft.title+'; '+variant.name+
      '. Review individual hook, facts and illustration sequence. This is a draft, not publish-ready.',
     duration,start:0,sourcePath:'',sourceUrl:'',voiceMode:'kokoro',voiceName:'am_michael',
     captionStyle:'kinetic',captionX:50,captionY:75,visualMode:'illustrated',visualTheme:'cosmos',
     visualTransition:'fade',visualScenes:[],rights:false,timedCaptions:'',
     series:{id:seriesId,title:draft.title,platform:variant.id,part:part.number,total:part.total,estimatedSeconds:part.seconds},
     createdAt:now,updatedAt:now});
   }
  }
  const record={id:seriesId,title:draft.title,masterScript:draft.script,wpm:draft.wpm,
   channelId:draft.channelId,createdAt:now,projectCount:projects.length,
   variants:plan.platforms.map(v=>({platform:v.id,mode:v.mode,count:v.partCount,target:v.target}))};
  state.projects.push(...projects);if(!Array.isArray(state.seriesPlans))state.seriesPlans=[];
  state.seriesPlans.push(record);
  if(!save()){
   state.projects.splice(state.projects.length-projects.length,projects.length);state.seriesPlans.pop();
   throw Error('Could not save series in browser storage. Export a backup.');
  }
  seriesPreview=null;seriesDraft=null;navigate('studio');
  notice('Created '+projects.length+' video drafts. Add pictures, verify rights and review every script before rendering.');
 }catch(e){notice(e.message)}
}
function seriesShowDrafts(id){
 const item=(state.seriesPlans||[]).find(x=>x.id===id);if(!item)return;
 const found=state.projects.filter(p=>p.series?.id===id);
 if(!found.length){notice('These series drafts have already been removed.');return}
 navigate('studio');notice(found.length+' saved drafts belong to '+item.title+'.');
}
function liveMonitorPage(){
 const watchers=state.streamers||[];
 const url=w=>(w.platform==='twitch'?'https://www.twitch.tv/':w.platform==='kick'?'https://kick.com/':'https://www.youtube.com/@')+encodeURIComponent(w.handle);
 return `${heading('STREAM CLIP DISCOVERY','Live stream monitor','Track gaming and IRL streamer accounts, permissions and clip candidates.')}
 <div class="notice warn" style="margin-bottom:18px"><strong>Monitoring is not connected yet.</strong> The watchlist below works offline, but automatic go-live notifications and continuous stream analysis require an authorised streaming-platform connection and backend. We do not record or scrape anyone’s livestream here.</div>
 <div class="grid-main"><section class="panel"><h2>Add streamer to watchlist</h2>
 <form id="live-add-form" class="form-grid">
 <div class="form-field"><label for="live-platform">Platform</label><select class="field" name="platform" id="live-platform"><option value="twitch">Twitch</option><option value="kick">Kick</option><option value="youtube">YouTube Live</option></select></div>
 <div class="form-field"><label for="live-handle">Username</label><input class="field" id="live-handle" name="handle" maxlength="45" required placeholder="Streamer's username"></div>
 <div class="form-field"><label for="live-rights">Reuse permission</label><select class="field" id="live-rights" name="rights"><option value="unknown">Not confirmed — discovery only</option><option value="owned">My own stream</option><option value="written">Written permission</option><option value="licensed">Suitable licence</option></select></div>
 <div class="form-field"><label for="live-rights-notes">Rights / creative notes</label><input class="field" name="notes" maxlength="200" placeholder="Permission and restrictions"></div>
 <div class="span2"><button class="button button-primary" type="submit">＋ Save streamer</button></div>
 </form></section>
 <section class="panel"><h2>How clip review will work</h2>
 <div class="step"><div class="step-number">1</div><div><strong>Detect stream start</strong><p class="secondary-note">Connect official platform go-live events later; show notifications when the backend is authorised.</p></div></div>
 <div class="step"><div class="step-number">2</div><div><strong>Review interesting moments</strong><p class="secondary-note">Rank highlight candidates from permission-cleared streams/VODs using speech, scene changes and audience reactions.</p></div></div>
 <div class="step"><div class="step-number">3</div><div><strong>Choose creative treatment</strong><p class="secondary-note">Keep original audio, add a brief headline or accurate subtitles, or choose a voice-over if it adds something meaningful.</p></div></div>
 <p class="footnote">No clip is automatically published. Captions, crops and music do not replace permission or guarantee monetisation.</p></section></div>
 <h2 class="section-title">Watchlist · ${watchers.length}</h2>
 ${watchers.length?`<div class="channel-grid">${watchers.map(w=>`<article class="channel-card"><div class="channel-top"><strong>${esc(w.platform)}</strong><span class="tiny-muted">Status not connected</span></div><h3 class="channel-name">${esc(w.handle)}</h3><p class="secondary-note">${w.rights==='unknown'?'Rights to reuse not verified':w.rights==='owned'?'Own footage':w.rights==='written'?'Written permission recorded':'Licence recorded'}.</p><p class="secondary-note">${esc(w.notes||'')}</p><div class="card-actions"><a class="button tiny" href="${url(w)}" target="_blank" rel="noopener noreferrer">Open stream ↗</a><button class="button tiny button-ghost" type="button" data-action="live-plan" data-id="${esc(w.id)}">Plan a clip</button><button class="button tiny button-danger" type="button" data-action="live-delete" data-id="${esc(w.id)}">Remove</button></div></article>`).join('')}</div>`:empty('◉','No streamers added','Add a creator to your watchlist. Their live status is not automatically checked yet.','','')}
 `;
}
function liveAdd(form){
 state.streamers=Array.isArray(state.streamers)?state.streamers:[];
 const fd=new FormData(form),platform=String(fd.get('platform')||'');
 const handle=String(fd.get('handle')||'').trim().replace(/^@/,'');
 const rights=String(fd.get('rights')||'unknown'),notes=String(fd.get('notes')||'').trim().slice(0,200);
 if(!['twitch','kick','youtube'].includes(platform)||!/^[A-Za-z0-9_-]{2,45}$/.test(handle)||!['unknown','owned','written','licensed'].includes(rights)){notice('Enter a valid streamer username and permission status.');return}
 if(state.streamers.some(w=>w.platform===platform&&w.handle.toLowerCase()===handle.toLowerCase())){notice('Already tracked.');return}
 if(state.streamers.length>=60){notice('Watchlist is full.');return}
 state.streamers.push({id:uid(),platform,handle,rights,notes});save();render();notice('Streamer saved. Automated monitoring requires a platform connection.');
}
function livePlan(id){
 const w=(state.streamers||[]).find(x=>x.id===id);if(!w)return;
 if(!state.channels.length){navigate('channels');notice('Create a brand before planning a clip.');return}
 const now=new Date().toISOString();
 state.projects.push({id:uid(),title:w.handle+' · stream moment',kind:'clip',channelId:state.channels[0].id,status:'idea',
 duration:35,start:0,sourcePath:'',sourceUrl:'',script:'',captionStyle:'hook',hookText:'What happens next?',
 voiceMode:'none',rights:false,notes:'Source streamer: '+w.platform+'/'+w.handle+'. Permissions: '+w.rights+'. '+w.notes+
 '. Use authorised source footage only. Confirm music/streamer rights and human review before exporting.',createdAt:now,updatedAt:now});
 save();navigate('studio');notice('Review-only clip project created. Source and permissions must be confirmed.');
}
function studioPage(){const list=state.projects.filter(p=>filter==='all'||p.kind===filter);
 return `${heading('CREATIVE WORKSPACE','Content studio','Build original narration videos or plan authorised clips.',`<button class="button button-primary" data-action="new-content">＋ Create project</button>`)}
 <div class="studio-layout"><div class="panel"><div class="panel-head"><h2>Two production paths</h2></div><div class="setup-list"><div class="setup-item"><div class="check">✂</div><div><strong>Clip an existing video</strong><p>Use footage you own or have permission to edit. Pick a start time, duration and captions.</p><button class="button tiny" data-action="new-content" data-kind="clip">Make a clip →</button></div></div><div class="setup-item"><div class="check">✧</div><div><strong>Create a narrated video</strong><p>Use a script plus background footage. Starter renderer includes optional basic free narration.</p><button class="button tiny" data-action="new-content" data-kind="original">Make an original →</button></div></div></div></div><div class="panel"><div class="panel-head"><h2>Starter production capabilities</h2></div><div class="step"><div class="step-number">✓</div><div><div class="step-title">9:16 vertical MP4 output</div><div class="step-text">720 × 1280, ready to preview as a Short or Reel.</div></div></div><div class="step"><div class="step-number">✓</div><div><div class="step-title">Text overlays and caption timing</div><div class="step-text">Creates captions from your supplied script, not automatic transcription.</div></div></div><div class="step"><div class="step-number">✓</div><div><div class="step-title">Free basic narration</div><div class="step-text">FFmpeg's Flite voice if supported by the rendering machine. More natural AI voices come later.</div></div></div><div class="notice">Use Clip scout to import FFmpeg-generated candidate moments. Use Preview & subtitles for video trimming and imported timed captions. Optional speech transcription runs through scripts/transcribe.py.</div></div></div>
 <h2 class="section-title">Content library</h2><div class="filters"><button class="filter ${filter==='all'?'active':''}" data-filter="all">All (${state.projects.length})</button><button class="filter ${filter==='clip'?'active':''}" data-filter="clip">Clips (${state.projects.filter(p=>p.kind==='clip').length})</button><button class="filter ${filter==='original'?'active':''}" data-filter="original">Original (${state.projects.filter(p=>p.kind==='original').length})</button></div>
 <div class="studio-tools" aria-label="Filter content library">
  <div class="form-field"><label for="studio-search">Search projects</label><input class="field" id="studio-search" type="search" placeholder="Title, script, notes or channel"></div>
  <div class="form-field"><label for="studio-channel">Channel</label><select class="field" id="studio-channel"><option value="all">All channels</option>${state.channels.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</select></div>
  <div class="form-field"><label for="studio-status">Status</label><select class="field" id="studio-status"><option value="all">All statuses</option>${[['idea','Idea'],['draft','Draft'],['ready','Ready'],['scheduled','Scheduled'],['published','Published']].map(([v,l])=>`<option value="${v}">${l}</option>`).join('')}</select></div>
  <div class="form-field"><label for="studio-sort">Sort by</label><select class="field" id="studio-sort"><option value="new">Newest first</option><option value="old">Oldest first</option><option value="title">Title A–Z</option><option value="scheduled">Scheduled first</option></select></div>
 </div>
 ${list.length?`<div class="library-count" id="studio-filter-count" aria-live="polite">Showing ${list.length} projects</div><div id="studio-projects">${tableProjects(list)}</div><div id="studio-no-matches" class="notice" hidden>No projects match those filters. Try another search or channel.</div>`:empty('✦','Nothing in this collection','Add your first content project.','New project','new-content')}`;
}
function tableProjects(list){return `<div class="tablewrap"><table class="data-table"><thead><tr><th>Project</th><th>Channel</th><th>Status</th><th>Next release</th><th>Actions</th></tr></thead><tbody>${[...list].sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||'')).map(p=>`<tr data-project-id="${esc(p.id)}"><td class="title-cell">${esc(p.title)}<span class="subcell">${p.kind==='clip'?'✂ Clip':'✧ Original'} · ${esc(p.duration||'30')} sec</span></td><td>${esc(channel(p.channelId)?.name||'Unassigned')}</td><td>${status(p.status)}</td><td>${p.schedule?esc(dateStr(p.schedule)):'—'}</td><td><div class="inline-actions"><button class="kebab" title="Edit project" data-action="edit-content" data-id="${p.id}">Edit</button><button class="kebab" title="Export render job" data-action="export-job" data-id="${p.id}">⇩ Job</button><button class="kebab" title="Preview & time captions" data-action="preview-project" data-id="${p.id}">▶ Preview</button><button class="kebab" title="Copy title and description" data-action="copy-caption" data-id="${p.id}">Copy</button></div></td></tr>`).join('')}</tbody></table></div>`}
function applyStudioFilters(){
 const host=$('#studio-projects');if(!host)return;
 const query=str($('#studio-search')?.value).toLowerCase();
 const channelChoice=$('#studio-channel')?.value||'all',statusChoice=$('#studio-status')?.value||'all',sort=$('#studio-sort')?.value||'new';
 const tbody=host.querySelector('tbody');const rows=[...tbody.querySelectorAll('tr[data-project-id]')];
 const byId=new Map(state.projects.map(p=>[p.id,p]));
 rows.sort((a,b)=>{
  const x=byId.get(a.dataset.projectId),y=byId.get(b.dataset.projectId);if(!x||!y)return 0;
  if(sort==='title')return x.title.localeCompare(y.title);
  if(sort==='old')return (x.createdAt||'').localeCompare(y.createdAt||'');
  if(sort==='scheduled')return (x.schedule||'9999').localeCompare(y.schedule||'9999');
  return (y.createdAt||'').localeCompare(x.createdAt||'');
 });
 let visible=0;
 for(const tr of rows){const p=byId.get(tr.dataset.projectId);if(!p)continue;
  const text=[p.title,p.notes,p.script,p.description,channel(p.channelId)?.name].join(' ').toLowerCase();
  const show=(!query||text.includes(query))&&(channelChoice==='all'||p.channelId===channelChoice)&&(statusChoice==='all'||p.status===statusChoice);
  tr.style.display=show?'':'none';visible+=show?1:0;tbody.appendChild(tr);
 }
 if($('#studio-filter-count'))$('#studio-filter-count').textContent=`Showing ${visible} of ${rows.length} projects`;
 if($('#studio-no-matches'))$('#studio-no-matches').hidden=visible!==0;
}
function candidateAlreadyAdded(report,c){
 return state.projects.some(p=>p.kind==='clip' && p.sourcePath===report.source_path &&
   Math.abs(Number(p.start)-c.start_seconds)<1 && Math.abs(Number(p.duration)-c.duration_seconds)<1);
}
function scoutPage(){
 const reports=state.scoutReports||[];
 return `${heading('AUTOMATED HIGHLIGHT SCOUT','Clip scout','Discover promising sections of an authorised video using free video/audio analysis.')}
 <div class="notice" style="margin-bottom:20px">Clip scouting runs with FFmpeg on your own machine or via the free GitHub workflow. It ranks based on sound activity and scene changes — <strong>it does not understand dialogue or predict viral success</strong>. Clips still need human review and rights clearance.</div>
 <div class="grid-main"><section class="panel"><div class="panel-head"><h2>1 · Analyse a source</h2></div><div class="setup-list"><div class="setup-item"><div class="check">1</div><div><strong>Use footage you own or can license</strong><p>Put the MP4 inside the <code>assets/</code> folder in your private GitHub repository.</p></div></div><div class="setup-item"><div class="check">2</div><div><strong>Run “Find candidate clips”</strong><p>Choose a duration and request up to 20 suggestions. Download <code>clip-candidates.json</code> from the resulting GitHub Actions run.</p></div></div><div class="setup-item"><div class="check">3</div><div><strong>Import results here</strong><p>Review suggested moments and turn the best into draft projects. You still approve every render.</p></div></div></div></section>
 <section class="panel"><div class="panel-head"><h2>2 · Import a report</h2></div><p class="secondary-note">The report is stored locally in this browser. This does not upload video footage or publish anything.</p><div style="margin:16px 0"><button class="button button-primary" data-action="import-scout">⇧ Import clip candidates</button></div><input type="file" id="scout-file" accept=".json,application/json" hidden><div class="notice">${state.channels.length?'Your drafts will be assigned to your first channel by default; change them in Content studio.':'Add at least one channel before turning candidates into draft projects.'}</div><p class="footnote">Example report: <code>reports/sample-candidates.json</code> in the ZIP. Suitable for seeing how this screen works.</p></section></div>
 <h2 class="section-title">Suggested moments <span class="tiny-muted">${reports.length} imported reports</span></h2>
 ${reports.length ? reports.slice().reverse().map(report=>`<section class="panel" style="margin-bottom:16px"><div class="panel-head"><h2>${esc(report.source_path)}</h2><span class="tiny-muted">${esc(report.candidates.length)} candidates · ${esc(report.source_duration_seconds)}s total</span></div><div class="tablewrap"><table class="data-table"><thead><tr><th>Start</th><th>Length</th><th>Score*</th><th>Signal</th><th>Action</th></tr></thead><tbody>${report.candidates.map((c,i)=>`<tr><td class="title-cell">${esc(c.start_seconds)}s</td><td>${esc(c.duration_seconds)}s</td><td><strong>${esc(c.score)}/100</strong></td><td>${esc((c.clues||[]).join(' · '))}</td><td>${candidateAlreadyAdded(report,c)?'<span class="tiny-muted">✓ Draft exists</span>':`<button class="button tiny button-ghost" data-action="add-candidate" data-id="${esc(report.id)}" data-index="${i}" ${!state.channels.length?'disabled':''}>＋ Create draft</button>`}</td></tr>`).join('')}</tbody></table></div><p class="footnote">*Relative heuristic score, not a probability of virality or monetisation. Always watch and assess the clip before publishing.</p></section>`).join(''):empty('✂','No scouting reports yet','Run the cloud workflow or test with the bundled sample report, then import its JSON file.','','')}`;
}
function importScout(file){
 if(!file)return;
 if(file.size>300000){notice('Clip report is too large.');return}
 const reader=new FileReader();
 reader.onload=()=>{try{
  const r=JSON.parse(reader.result);
  if(!r || r.report_version!==1 || r.rights_confirmed!==true || typeof r.source_path!=='string' ||
   !/^assets\/[a-zA-Z0-9_./ -]+$/.test(r.source_path) || r.source_path.includes('..') ||
   !Array.isArray(r.candidates) || r.candidates.length>20 || !r.candidates.length ||
   !r.candidates.every(c=>Number.isFinite(c.start_seconds)&&c.start_seconds>=0 && Number.isFinite(c.duration_seconds)&&c.duration_seconds>=3&&c.duration_seconds<=180 && Number.isFinite(c.score)&&c.score>=0&&c.score<=100 && Array.isArray(c.clues)))
   throw Error('Unsupported report structure');
  const cleaned={id:uid(),source_path:r.source_path.slice(0,250),source_duration_seconds:Number(r.source_duration_seconds)||0,created_at:r.created_at||'',candidates:r.candidates.map(c=>({start_seconds:c.start_seconds,duration_seconds:c.duration_seconds,score:c.score,clues:c.clues.map(x=>str(x).slice(0,90)).slice(0,5)}))};
  state.scoutReports.push(cleaned);
  state.scoutReports=state.scoutReports.slice(-20);save();render();notice(`Imported ${cleaned.candidates.length} suggested clip moments.`);
 }catch(err){notice('Invalid report. Choose a clip-candidates.json generated by Shorts Studio.')}};
 reader.readAsText(file);
}
function addCandidate(reportId,index){
 const report=state.scoutReports.find(r=>r.id===reportId);
 const c=report?.candidates[index];
 if(!report || !c || !state.channels.length){notice('Create a channel first.');return}
 if(candidateAlreadyAdded(report,c)){notice('This clip has already been added.');return}
 const now=new Date().toISOString();
 state.projects.push({id:uid(),title:`Clip review · ${Math.floor(c.start_seconds)}s`,kind:'clip',channelId:state.channels[0].id,status:'idea',sourcePath:report.source_path,sourceUrl:'',start:c.start_seconds,duration:c.duration_seconds,voiceMode:'none',audioPath:'',script:'',ytTitle:'',igCaption:'',description:'',schedule:'',viewsYT:0,viewsIG:0,rights:false,notes:`Scouted score ${c.score}/100. ${c.clues.join('; ')}. REVIEW this moment and confirm media rights before rendering.`,createdAt:now,updatedAt:now});
 save();render();notice('Draft created. Review it in Content studio before exporting.');
}
function parseTimedCaptions(value,duration){
 const raw=str(value);if(!raw)return [];
 let segments;try{segments=JSON.parse(raw)}catch(_){throw Error('Timed captions must be valid JSON')}
 if(!Array.isArray(segments)||segments.length<1||segments.length>900)throw Error('Timed captions need 1–900 segments');
 let last=0;
 return segments.map((x,i)=>{
  if(!x||typeof x!=='object'||Array.isArray(x)||x.start_seconds==null||x.end_seconds==null)throw Error(`Missing times in timed caption ${i+1}`);
  const a=Number(x.start_seconds),b=Number(x.end_seconds),text=str(x.text);
  if(!Number.isFinite(a)||!Number.isFinite(b)||a<0||b<=a||b>Number(duration)+0.05||a<last-0.005||text.length<1||text.length>160)
   throw Error(`Invalid/overlapping timed caption at item ${i+1}`);
  last=b;return {start_seconds:a,end_seconds:b,text};
 });
}

// v0.11: Local browser video preview + subtitle editor. No video bytes are uploaded.
function previewProject(){return state.projects.find(p=>p.id===previewProjectId)||null}
function previewDuration(){
 const p=previewProject();return Number($('#preview-length')?.value ?? p?.duration ?? 30);
}
function previewStart(){return Number($('#preview-start')?.value ?? previewProject()?.start ?? 0)}
function formatPreviewTime(seconds){return Number(seconds||0).toFixed(2)}
function subtitleTimestamp(sec,separator=','){
 const ms=Math.max(0,Math.round(sec*1000)),h=Math.floor(ms/3600000),m=Math.floor(ms/60000)%60,s=Math.floor(ms/1000)%60,t=ms%1000;
 return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}${separator}${String(t).padStart(3,'0')}`;
}
function parseSubtitleTimestamp(raw){
 const parts=raw.trim().replace(',', '.').split(':');if(parts.length<2||parts.length>3)return NaN;
 if(parts.some(x=>!/^\d+(?:\.\d+)?$/.test(x)))return NaN;
 let v=0;for(const x of parts)v=v*60+Number(x);return v;
}
function parseSubtitleFile(content,filename){
 if(content.length>250000)throw Error('Subtitle file exceeds 250 KB');
 if(/\.json$/i.test(filename)){
  const data=JSON.parse(content);const arr=Array.isArray(data)?data:(data.caption_segments||data.segments);
  if(!Array.isArray(arr))throw Error('Expected a caption array or transcription JSON');
  return arr.map(x=>({start_seconds:Number(x.start_seconds??x.start),end_seconds:Number(x.end_seconds??x.end),text:str(x.text)}));
 }
 // SRT and VTT cues with optional cue index, VTT headers and positioning metadata.
 const groups=content.replace(/\r/g,'').replace(/^\uFEFF/,'').split(/\n\s*\n/),segments=[];
 for(const group of groups){const lines=group.split('\n'),t=lines.findIndex(x=>x.includes('-->'));if(t<0)continue;
  const match=lines[t].match(/\s*((?:\d{1,2}:)?\d{2}:\d{2}[.,]\d{1,3})\s*-->\s*((?:\d{1,2}:)?\d{2}:\d{2}[.,]\d{1,3})/);
  if(!match)continue;
  const text=lines.slice(t+1).join(' ').replace(/<[^>]*>/g,'').trim();
  if(text)segments.push({start_seconds:parseSubtitleTimestamp(match[1]),end_seconds:parseSubtitleTimestamp(match[2]),text});
 }
 if(!segments.length)throw Error('No readable SRT/VTT cues found');return segments;
}
function previewValidateSegments(){
 const length=previewDuration();if(!Number.isFinite(length)||length<3||length>180)throw Error('Clip length must be 3–180 seconds');
 const start=previewStart();if(!Number.isFinite(start)||start<0)throw Error('Clip start must be positive');
 if(previewFileDuration && start+length>previewFileDuration+0.05)throw Error('Trim exceeds the duration of the loaded video');
 return parseTimedCaptions(JSON.stringify(previewSegments),length);
}
function previewPage(){
 const p=previewProject()||state.projects[0]||null;
 if(p && !previewProjectId){previewProjectId=p.id;try{previewSegments=parseTimedCaptions(p.timedCaptions,p.duration)}catch(_){previewSegments=[]}}
 const current=previewProject()||p;
 return `${heading('POST-PRODUCTION','Preview & subtitles','Preview local or sample footage, trim clips, edit subtitles and save accurate timing into your project.',`<button class="button button-primary" data-action="preview-save" ${current?'':'disabled'}>✓ Apply to project</button>`)}
 <div class="notice" style="margin-bottom:18px"><strong>Local-only:</strong> video files stay on your computer. This screen previews your edits but does not export an MP4. Use the render job export after saving; audio-to-text uses an optional free model via the included transcription script. Always check speech recognition accuracy.</div>
 <div class="studio-layout preview-layout"><section class="panel">
  <div class="panel-head"><h2>Video preview</h2><span class="tiny-muted">9:16 safe-area guide</span></div>
  <div class="form-field"><label for="preview-project">Project</label><select id="preview-project" class="field"><option value="">Choose a project</option>${state.projects.map(x=>`<option value="${esc(x.id)}" ${x.id===current?.id?'selected':''}>${esc(x.title)}</option>`).join('')}</select></div>
  <div class="preview-stage" id="preview-stage"><video id="preview-video" preload="metadata" controls playsinline></video><div id="preview-caption" class="preview-caption" role="button" tabindex="0" aria-label="Drag caption to move it" title="Drag to move caption" aria-live="off"></div><div class="preview-safe">VERTICAL OUTPUT · 9:16</div><div id="preview-placeholder" class="preview-placeholder">Choose a local video or load the included sample</div></div>
  <div class="preview-actions"><label class="button button-ghost small preview-file-button" for="preview-file">＋ Select video<input id="preview-file" type="file" accept="video/*" hidden></label><button class="button button-ghost small" data-action="preview-demo">▶ Demo video</button><button class="button small" data-action="preview-seek-start">↶ Go to start</button></div>
  <div class="panel caption-edit-panel" style="margin:12px 0"><h3>Caption and commentary editor</h3>
   <p class="secondary-note">Play or seek to the caption you want to change. Overwrite the text below, then drag the text on the video to position it. The position applies to all captions in this project and the final MP4.</p>
   <div class="form-field"><label for="preview-overlay-mode">Text display</label><select class="field" id="preview-overlay-mode">
    ${[['classic','Classic subtitles'],['word-pop','Word-pop'],['kinetic','Kinetic'],['hook','Headline at top only'],['none','No on-screen text']].map(([key,label])=>`<option value="${key}" ${(current?.captionStyle||'classic')===key?'selected':''}>${label}</option>`).join('')}
   </select></div>
   <div class="form-field"><label for="preview-caption-text">Overwrite the current caption / headline</label><textarea class="field" id="preview-caption-text" rows="2" maxlength="160" placeholder="Select a cue or type your new hook"></textarea></div>
   <div class="preview-actions"><button class="button small button-ghost" data-action="preview-apply-text">✓ Apply caption text</button><button class="button small" data-action="preview-center-text">↔ Reset position</button></div>
   <div class="form-grid"><label class="form-field">Horizontal position (%)<input class="field" type="number" id="preview-caption-x" min="20" max="80" step="1" value="${Number.isFinite(Number(current?.captionX))?Math.min(80,Math.max(20,Number(current.captionX))):50}"></label><label class="form-field">Vertical position (%)<input class="field" type="number" id="preview-caption-y" min="12" max="85" step="1" value="${Number.isFinite(Number(current?.captionY))?Math.min(85,Math.max(12,Number(current.captionY))):75}"></label></div>
   <button type="button" class="button button-ghost small" data-action="preview-remove-voice">✕ Remove voice-over now</button>
   <label class="checkbox-row"><input id="preview-remove-commentary" type="checkbox" ${(current?.voiceMode||'none')==='none'?'checked':''}><span><strong>Remove AI commentary</strong> — retain original stream audio when available</span></label>
   <p class="footnote">This removes added narration, not words or music already in the original recording. If there is no original audio, output may be silent.</p>
  </div>
  <div class="tiny-muted" id="preview-file-name">${previewMediaName?esc(previewMediaName):'No media loaded — local media is never saved or uploaded.'}</div>
  <div class="preview-time-controls"><div class="form-field"><label for="preview-start">Source start (seconds)</label><input class="field" type="number" step="0.01" min="0" id="preview-start" value="${Number(current?.start||0)}"></div><div class="form-field"><label for="preview-length">Clip length (seconds)</label><input class="field" type="number" step="0.01" min="3" max="180" id="preview-length" value="${Number(current?.duration||30)}"></div></div>
  <p class="secondary-note">Captions are relative to the trimmed clip (0 = clip beginning). Load video footage you own or have permission to edit. Source start and duration are saved with your project.</p>
 </section><section class="panel">
  <div class="panel-head"><h2>Timed subtitle editor</h2><span class="tiny-muted" id="preview-cue-count">0 cues</span></div>
  <div class="preview-actions"><label class="button button-ghost small preview-file-button" for="preview-subtitle-file">⇩ Import SRT / VTT / JSON<input type="file" id="preview-subtitle-file" accept=".srt,.vtt,.json,text/plain,application/json" hidden></label><button class="button small" data-action="preview-add">＋ Cue</button></div>
  <p class="secondary-note">Import accurate timestamps from the free speech transcription workflow, or add your own. Click a cue's time to jump there.</p>
  <div id="preview-cues" class="preview-cues"></div>
  <div class="preview-actions"><button class="button small" data-action="preview-save" ${current?'':'disabled'}>✓ Save timings</button><button class="button small" data-action="preview-export-srt">⇩ Export SRT</button><button class="button small" data-action="preview-export-json">⇩ Export JSON</button></div>
  <div id="preview-validation" class="secondary-note">All changes stay in this browser until you save them to a project.</div>
 </section></div>
 <section class="panel" style="margin-top:18px"><h2>Free automatic speech transcription</h2><p class="secondary-note">The included <code>scripts/transcribe.py</code> uses the optional <code>faster-whisper</code> model to generate word-timed caption groups in JSON and SRT format. It does <strong>not</strong> run in this browser: it requires Python, FFmpeg and a one-time model download, or later a GitHub Actions run. Import the resulting file above.</p><button class="button button-ghost small" data-action="preview-export-job" ${current?'':'disabled'}>⇩ Export project job for transcription</button></section>`;
}
function previewRestoreDisplay(){
 const v=$('#preview-video');if(!v)return;
 if(previewUrl){v.src=previewUrl;v.load();$('#preview-placeholder').hidden=true}else{$('#preview-placeholder').hidden=false;v.removeAttribute('src')}
 const f=$('#preview-file-name');if(f)f.textContent=previewMediaName||'No media loaded — local media is never saved or uploaded.';
 previewPaintCues();
}
function previewSelectProject(id){
 previewProjectId=id;const p=previewProject();previewSegments=[];previewEditingCueIndex=-1;
 if(p){try{previewSegments=parseTimedCaptions(p.timedCaptions,p.duration)}catch(_){previewSegments=[]}}
 if(previewObjectUrl){URL.revokeObjectURL(previewObjectUrl);previewObjectUrl=''}
 previewUrl='';previewMediaName='';previewFileDuration=0;render();previewRestoreDisplay();
}
function previewPaintCues(){
 const host=$('#preview-cues');if(!host)return;
 const count=$('#preview-cue-count');if(count)count.textContent=`${previewSegments.length} cues`;
 host.innerHTML=previewSegments.length?previewSegments.map((x,i)=>`<div class="preview-cue" data-cue="${i}"><button class="preview-jump" title="Go to caption" data-action="preview-jump" data-index="${i}">${formatPreviewTime(x.start_seconds)}s</button><label>Start<input class="field" type="number" min="0" step="0.01" data-cue-field="start_seconds" data-index="${i}" value="${x.start_seconds}"></label><label>End<input class="field" type="number" min="0" step="0.01" data-cue-field="end_seconds" data-index="${i}" value="${x.end_seconds}"></label><label class="preview-cue-text">Caption<input class="field" maxlength="160" data-cue-field="text" data-index="${i}" value="${esc(x.text)}"></label><button class="kebab" title="Remove cue" data-action="preview-remove" data-index="${i}">×</button></div>`).join(''):'<p class="secondary-note">No timed captions yet. Import a transcript or add a cue.</p>';
 previewUpdateOverlay();
}
function captionPosition(p,mode){
 const defaultY=mode==='hook'?19:75;
 return {x:Number.isFinite(Number(p?.captionX))?Math.min(80,Math.max(20,Number(p.captionX))):50,
         y:Number.isFinite(Number(p?.captionY))?Math.min(85,Math.max(12,Number(p.captionY))):defaultY};
}
function overlayPlace(node,x,y){node.style.left=x+'%';node.style.top=y+'%';node.style.bottom='auto';node.style.transform='translate(-50%,-50%)';}
function previewUpdateOverlay(){
 const v=$('#preview-video'),c=$('#preview-caption');if(!v||!c)return;
 const project=previewProject();
 const mode=$('#preview-overlay-mode')?.value||project?.captionStyle||'classic';
 const t=(v.currentTime||0)-previewStart();
 const i=previewSegments.findIndex(x=>t>=x.start_seconds&&t<x.end_seconds);
 const isHook=mode==='hook';
 const seg=i>=0?previewSegments[i]:null;
 const content=isHook?(project?.hookText||project?.title||''):seg?.text||'';
 c.textContent=mode==='none'?'':content;
 c.hidden=mode==='none'||!content||(isHook&&t>5.2);
 c.classList.toggle('caption-is-hook',isHook);
 const coords=captionPosition(project,mode);
 const xEl=$('#preview-caption-x'),yEl=$('#preview-caption-y');
 overlayPlace(c,xEl?Math.max(20,Math.min(80,Number(xEl.value)||50)):coords.x,
                 yEl?Math.max(12,Math.min(85,Number(yEl.value)||75)):coords.y);
 if(!isHook && i>=0 && i!==previewEditingCueIndex){
  previewEditingCueIndex=i;
  const box=$('#preview-caption-text');
  if(box && document.activeElement!==box)box.value=seg.text;
 }
 if(isHook){
  previewEditingCueIndex=-1;
  const box=$('#preview-caption-text');
  if(box && document.activeElement!==box)box.value=project?.hookText||project?.title||'';
 }
}
function previewSetFile(file){
 if(!file)return;if(file.size>1.5*1024*1024*1024){notice('The video is over the 1.5 GB preview limit');return}
 if(!file.type.startsWith('video/')&&!/\.(mp4|mov|webm|m4v)$/i.test(file.name)){notice('Choose a supported video file');return}
 if(previewObjectUrl)URL.revokeObjectURL(previewObjectUrl);
 previewObjectUrl=URL.createObjectURL(file);previewUrl=previewObjectUrl;previewMediaName=file.name;previewFileDuration=0;
 previewRestoreDisplay();
}
function previewDemo(){
 if(previewObjectUrl)URL.revokeObjectURL(previewObjectUrl);previewObjectUrl='';
 previewUrl='assets/example-background.mp4';previewMediaName='Included demo footage · assets/example-background.mp4';previewFileDuration=0;previewRestoreDisplay();
}
function previewAddCue(){
 const v=$('#preview-video');const t=Math.max(0,Number.isFinite(v?.currentTime)?v.currentTime-previewStart():0);
 const last=previewSegments.at(-1)?.end_seconds||0;const start=Math.max(t,last);
 if(start>=previewDuration()-.1){notice('Move the playhead earlier or extend the clip');return}
 previewSegments.push({start_seconds:+start.toFixed(2),end_seconds:+Math.min(start+1.5,previewDuration()).toFixed(2),text:'New caption'});previewPaintCues();
}
function previewSave(){
 const p=previewProject();if(!p){notice('Select or create a project first');return}
 try{
  if(previewSegments.length)previewSegments=previewValidateSegments();
  const start=previewStart(),length=previewDuration();
  if(!Number.isFinite(start)||start<0||!Number.isFinite(length)||length<3||length>180)throw Error('Invalid trim range');
  if(previewFileDuration && start+length>previewFileDuration+0.05)throw Error('Clip exceeds video length');
  if(p.aiReview?.required && (start!==Number(p.start||0)||length!==Number(p.duration)|| (p.timedCaptions||'')!==(previewSegments.length?JSON.stringify(previewSegments,null,2):'')))p.aiReview.confirmed=false;
  const captionMode=$('#preview-overlay-mode')?.value||p.captionStyle||'classic';
  const x=Math.max(20,Math.min(80,Number($('#preview-caption-x')?.value||50)));
  const y=Math.max(12,Math.min(85,Number($('#preview-caption-y')?.value||(captionMode==='hook'?19:75))));
  if(!Number.isFinite(x)||!Number.isFinite(y))throw Error('Invalid caption position.');
  p.start=start;p.duration=length;p.timedCaptions=previewSegments.length?JSON.stringify(previewSegments,null,2):'';
  p.captionStyle=captionMode;p.captionX=x;p.captionY=y;
  if($('#preview-remove-commentary')?.checked)p.voiceMode='none';
  p.updatedAt=new Date().toISOString();
  if(!save())return;
  const summary=$('#preview-validation');if(summary)summary.textContent='✓ Changes saved to this project. Export its render job when ready.';
  notice('Preview edits saved to project');
 }catch(err){const summary=$('#preview-validation');if(summary)summary.textContent=err.message;notice(err.message)}
}
function previewApplyText(){
 const p=previewProject();if(!p){notice('Choose a project first.');return;}
 const mode=$('#preview-overlay-mode')?.value||p.captionStyle||'classic';
 const box=$('#preview-caption-text'),value=box?.value.trim()||'';
 if(!value){notice('Enter caption text first.');return;}
 if(mode==='hook'){p.hookText=value.slice(0,95);previewUpdateOverlay();notice('Headline updated. Save your project to keep it.');return;}
 const v=$('#preview-video'),t=(v?.currentTime||0)-previewStart();
 const i=previewSegments.findIndex(x=>t>=x.start_seconds&&t<x.end_seconds);
 const index=i>=0?i:previewEditingCueIndex;
 if(index<0||!previewSegments[index]){notice('Seek to a caption first or add a timed cue.');return;}
 previewSegments[index].text=value.slice(0,160);
 previewPaintCues();
 previewUpdateOverlay();
 notice('Caption replaced. Save your project to keep it.');
}
function previewRemoveCommentary(){
 const p=previewProject();if(!p){notice('Select a project first.');return;}
 p.voiceMode='none';p.updatedAt=new Date().toISOString();
 const box=$('#preview-remove-commentary');if(box)box.checked=true;
 if(save())notice('AI voice-over removed. Original clip audio will be preserved, if present.');
}
function moveTextInput(kind,reset=false){
 const prefix=kind==='preview'?'preview':'production';
 const x=$('#'+prefix+'-caption-x'),y=$('#'+prefix+'-caption-y');
 if(!x||!y)return;
 if(reset){x.value=50;y.value=($('#'+(prefix==='preview'?'preview-overlay-mode':'production-caption-style'))?.value==='hook')?19:75;}
 const xNum=Number(x.value),yNum=Number(y.value);
 x.value=Number.isFinite(xNum)?Math.min(80,Math.max(20,xNum)):50;
 y.value=Number.isFinite(yNum)?Math.min(85,Math.max(12,yNum)):75;
 if(kind==='preview')previewUpdateOverlay();else productionUpdateOverlay();
}
function previewExportSRT(){
 try{const segments=previewValidateSegments();
  const srt=segments.map((x,i)=>`${i+1}\n${subtitleTimestamp(x.start_seconds)} --> ${subtitleTimestamp(x.end_seconds)}\n${x.text}\n`).join('\n');
  downloadText('shorts-studio-captions.srt',srt);notice('SRT captions exported');
 }catch(err){notice(err.message)}
}
function previewExportJSON(){
 try{downloadJSON('shorts-studio-timed-captions.json',previewValidateSegments());notice('Timed captions exported')}
 catch(err){notice(err.message)}
}
async function previewImport(file){
 if(!file)return;
 try{const raw=await file.text();const list=parseSubtitleFile(raw,file.name);
  previewSegments=parseTimedCaptions(JSON.stringify(list),previewDuration());previewPaintCues();
  notice(`Imported ${list.length} accurately timed cue${list.length===1?'':'s'}. Review the words before saving.`);
 }catch(err){notice(`Subtitle import failed: ${err.message}`)}
}
function renderBlockers(p){
 const issues=[];
 if(!p.rights) issues.push('Permission to use footage/audio not confirmed');
 if(p.kind!=='original' && !p.sourcePath && !p.sourceUrl) issues.push('No source footage selected');
 if(p.sourceUrl && !/^https:\/\//i.test(p.sourceUrl)) issues.push('Media link must be a direct HTTPS URL');
 if(p.sourceUrl && /youtube\.com|youtu\.be|instagram\.com|tiktok\.com/i.test(p.sourceUrl)) issues.push('A social watch-page URL cannot be rendered');
 if(p.voiceMode==='file'&&!p.audioPath) issues.push('Narration audio file missing');
 if(['basic','kokoro'].includes(p.voiceMode)&&!p.script?.trim()) issues.push('Narration script missing');
 if(p.kind==='original' && /\[(RESEARCH|EXAMPLE|PAYOFF|HOOK|MAIN|END)\]/i.test(p.script||'')) issues.push('Replace research placeholders in the script');
 if(p.kind==='original' && ['storyboard','illustrated'].includes(p.visualMode) && (p.sourcePath||p.sourceUrl)) issues.push('Storyboard needs generated background: click Use generated background in Production flow');
 if(p.kind==='original' && ['storyboard','illustrated'].includes(p.visualMode) && p.visualScenes?.length && Number(p.duration)/p.visualScenes.length<1.2) issues.push('Storyboard scenes too short: use fewer scenes or a longer video');
 if(p.kind==='original' && p.visualMode==='illustrated'){
  const scenes=p.visualScenes||[];
  if(scenes.length<2) issues.push('Illustrated story needs a cover image and at least one story image');
  if(scenes.some(s=>!s.image_path)) issues.push('Add a separate licensed/AI-created illustration for every scene, including the opening cover');
  const times=scenes.slice(1).map(s=>s.start_seconds);
  if(times.some(x=>x!=null) && (times.some(x=>x==null)||Number(times[0])!==0))
    issues.push('For timed image beats, set all story scene start times beginning at 0');
  if(times.length && times.every(x=>x!=null)&&times.some((x,i)=>i&&Number(x)-Number(times[i-1])<1.2))
    issues.push('Give each illustrated scene at least 1.2 seconds');
 }
 try{parseTimedCaptions(p.timedCaptions,p.duration)}catch(err){issues.push(err.message)}
 if(p.aiReview?.required && (!p.aiReview.confirmed || !p.aiReview.claims?.length)) issues.push('Review AI script facts and supporting sources');
 if(!channel(p.channelId)) issues.push('Channel no longer exists');
 const duration=Number(p.duration),start=Number(p.start||0);
 if(!Number.isFinite(duration)||duration<3||duration>(p.kind==='original'?600:180)||!Number.isFinite(start)||start<0) issues.push('Duration exceeds the allowed limit for this video type');
 return issues;
}
function createRenderJob(p){return {version:1,id:p.id,title:p.ytTitle||p.title,kind:p.kind,channel:channel(p.channelId)?.name||'Unassigned',duration:p.duration,source:{path:p.sourcePath||null,url:p.sourceUrl||null,start_seconds:p.start||0},narration:{mode:p.voiceMode||'none',voice:p.voiceName||'af_heart',speed:0.96,sync_captions:true,audio_path:p.audioPath||null},script:p.script||'',caption_segments:parseTimedCaptions(p.timedCaptions,p.duration),captions:Boolean(p.script||p.timedCaptions||p.captionStyle==='hook'),rights_confirmed:true,editing:{caption_style:p.captionStyle||'classic',crop_focus:p.cropFocus||'center',motion:p.motion||'none',background:p.background||'midnight',hook_text:p.hookText||p.title,caption_x:captionPosition(p,p.captionStyle||'classic').x,caption_y:captionPosition(p,p.captionStyle||'classic').y},visuals:{mode:p.visualMode||'classic',intro_seconds:2,theme:p.visualTheme||'aurora',transition:p.visualTransition||'fade',scenes:p.visualScenes||[]},description:p.description||'',generated_at:new Date().toISOString()}}
function latestRender(p){
 if(!p||!p.lastRender||p.lastRender.fingerprint!==renderFingerprint(p))return null;
 if(!/^\/output\/[0-9a-f]{32}\/[a-z0-9-]{1,50}\.mp4$/.test(p.lastRender.url||''))return null;
 return p.lastRender;
}
function renderFingerprint(p){return JSON.stringify([p.kind||'',p.title||'',p.ytTitle||'',p.sourcePath||'',p.sourceUrl||'',Number(p.start||0),Number(p.duration),p.script||'',p.timedCaptions||'',p.voiceMode||'',p.audioPath||'',p.voiceName||'',p.hookText||'',p.captionX??50,p.captionY??75,p.channelId,p.captionStyle||'classic',p.cropFocus||'center',p.motion||'none',p.background||'midnight',p.visualMode||'classic',p.visualTheme||'aurora',p.visualTransition||'fade',JSON.stringify(p.visualScenes||[])]);}
function exportRenderBatch(){
 const candidates=state.projects.filter(p=>['ready','scheduled'].includes(p.status));
 const good=candidates.filter(p=>renderBlockers(p).length===0);
 const unique=new Map();for(const p of good){const key=renderFingerprint(p);if(!unique.has(key))unique.set(key,p)}
 const jobs=[...unique.values()].slice(0,10).map(createRenderJob);
 if(!jobs.length){notice('No render-ready projects. Check the list for blockers.');return}
 const excluded=candidates.length-jobs.length;
 downloadJSON('production-batch.json',{batch_version:1,created_at:new Date().toISOString(),note:'Render only; no videos are uploaded or posted automatically.',jobs});
 notice(`Exported ${jobs.length} approved job${jobs.length===1?'':'s'}.${excluded?` ${excluded} excluded (blocked, duplicate or above 10 limit).`:''}`);
}
function queuePage(){const q=state.projects.filter(p=>['ready','scheduled','published'].includes(p.status));
 const planned=q.filter(p=>p.status!=='published');
 const good=planned.filter(p=>renderBlockers(p).length===0);
 const blockers=planned.filter(p=>renderBlockers(p).length>0);
 const unique=new Set(good.map(renderFingerprint)).size;
 return `${heading('PUBLISHING PIPELINE','Publishing queue','Prepare approved jobs for free cloud rendering; publishing is still manual.',`<button class="button button-primary" data-action="export-batch" ${unique?'':'disabled'}>⇩ Export render batch (${Math.min(10,unique)})</button>`)}
 <div class="notice warn" style="margin-bottom:21px">⚠ This queue produces render instructions, <strong>not published posts</strong>. The MP4 source footage must be in your private GitHub repository (or available from an authorised direct HTTPS file URL). Each batch holds at most 10 distinct jobs.</div>
 <div class="grid-main" style="margin-bottom:20px">
 <section class="panel"><div class="panel-head"><h2>Production readiness</h2><span class="tiny-muted">PRE-FLIGHT CHECK</span></div>
 <div class="kpi-value" style="font-size:33px">${unique} <span style="font-size:15px;color:var(--text-muted, #9ba4b5)">ready</span></div>
 <p class="secondary-note">${blockers.length} project${blockers.length===1?'':'s'} need attention. ${good.length-unique} duplicate${good.length-unique===1?'':'s'} will be skipped automatically.</p>
 ${blockers.slice(0,8).map(p=>`<div class="metric-list"><button class="eyelink" data-action="edit-content" data-id="${esc(p.id)}">${esc(p.title)}</button><span class="tiny-muted" title="${esc(renderBlockers(p).join('; '))}">${esc(renderBlockers(p)[0])}</span></div>`).join('')}
 ${!planned.length?'<p class="secondary-note">Move a project to Ready or Scheduled to see render checks.</p>':''}
 </section>
 <section class="panel"><div class="panel-head"><h2>One-file cloud handoff</h2></div>
 <div class="step"><div class="step-number">1</div><div><div class="step-title">Export batch JSON</div><div class="step-text">The dashboard checks rights, source links, narration details and duplicates.</div></div></div>
 <div class="step"><div class="step-number">2</div><div><div class="step-title">Upload to private GitHub repo</div><div class="step-text">Put the file at <code>jobs/production-batch.json</code> with your authorised media under <code>assets/</code>.</div></div></div>
 <div class="step"><div class="step-number">3</div><div><div class="step-title">Run cloud batch</div><div class="step-text">In GitHub Actions choose <strong>Render approved batch</strong>, enter <code>jobs/production-batch.json</code> as manifest and download MP4 artifacts.</div></div></div>
 </section></div>
 ${q.length?tableProjects(q):empty('◷','Your queue is empty','Mark a content project Ready or Scheduled to see it here.','Go to studio','go-studio')}
 <h2 class="section-title">Before publishing</h2><div class="panel"><p class="secondary-note">Review the completed MP4 for quality, rights, captions and platform policies. Exporting a batch does not upload or publish videos to YouTube or Instagram. GitHub rendering is available only after you set up your account and workflow.</p></div>`;
}
function analyticsPage(){
 const published=state.projects.filter(p=>p.status==='published');
 const platforms=[['YT','YouTube Shorts'],['IG','Instagram Reels'],['TT','TikTok'],['FB','Facebook Reels']];
 const totalBy=k=>published.reduce((sum,p)=>sum+Number(p['views'+k]||0),0);
 const totals=platforms.map(([k,n])=>({k,n,views:totalBy(k),earned:published.reduce((sum,p)=>sum+Math.max(0,Number(p['revenue'+k]||0)),0)}));
 const allViews=totals.reduce((sum,p)=>sum+p.views,0);
 const channelViews=c=>projectsFor(c.id).reduce((sum,p)=>sum+platforms.reduce((n,[k])=>n+Number(p['views'+k]||0),0),0);
 const max=Math.max(1,...state.channels.map(channelViews));
 return `${heading('MULTI-PLATFORM PERFORMANCE','Analytics','Compare YouTube Shorts, Instagram Reels, TikTok and Facebook Reels. Figures are manual until accounts are connected.')}
 <div class="kpis">${[{a:'Total recorded views',v:compact(allViews),f:'All four platforms'},{a:'YouTube Shorts',v:compact(totalBy('YT')),f:'Views'},{a:'Facebook Reels',v:compact(totalBy('FB')),f:'Views'},{a:'Instagram Reels',v:compact(totalBy('IG')),f:'Views'},{a:'TikTok',v:compact(totalBy('TT')),f:'Views'},{a:'Published projects',v:published.length,f:'Across all brands'}].map(k=>`<div class="kpi"><div class="kpi-head">${k.a}</div><div class="kpi-value">${esc(k.v)}</div><div class="kpi-foot">${k.f}</div></div>`).join('')}</div>
 <div class="grid-main"><div class="panel"><div class="panel-head"><h2>Views by channel</h2><span class="tiny-muted">MANUAL METRICS</span></div>${state.channels.length?state.channels.map(c=>{const v=channelViews(c);return `<div style="margin:18px 0"><div class="metric-list" style="padding:0 0 5px;border:0"><span>${esc(c.name)}</span><strong>${num(v)}</strong></div><div class="progress-track"><div class="progress-fill" style="width:${(v/max)*100}%"></div></div></div>`}).join(''):empty('◩','No figures yet','Record each platform’s video views to start comparing.','','')}</div>
 <div class="panel"><div class="panel-head"><h2>Recorded earnings by platform</h2><span class="tiny-muted">EUR · SELF-REPORTED</span></div>
 ${totals.map(p=>`<div class="metric-list"><span>${esc(p.n)} <small>${num(p.views)} views</small></span><strong>€${p.earned.toFixed(2)}</strong></div>`).join('')}
 <p class="footnote">Recorded earnings are your own figures, not platform estimates or guaranteed rates. Legacy unallocated income appears in Growth Lab.</p></div></div>
 <div style="margin:16px 0"><button class="button button-primary small" data-nav="growth">↗ Open Growth lab</button></div>
 <h2 class="section-title">Published projects</h2>${published.length?tableProjects(published):empty('▥','Nothing published yet','Mark a project Published and enter its performance to start tracking.','','')}`;
}
function growthPage(){
 const published=state.projects.filter(p=>p.status==='published');
 const totalViews=p=>['YT','IG','TT','FB'].reduce((sum,k)=>sum+Math.max(0,Number(p['views'+k]||0)),0);
 const total=published.reduce((a,p)=>a+totalViews(p),0);
 const likes=published.reduce((a,p)=>a+Math.max(0,Number(p.likesYT||0))+Math.max(0,Number(p.likesIG||0)),0);
 const followers=published.reduce((a,p)=>a+Math.max(0,Number(p.followersGained||0)),0);
 const projectRevenue=p=>['YT','IG','TT','FB'].reduce((sum,k)=>sum+Math.max(0,Number(p['revenue'+k]||0)),Math.max(0,Number(p.revenueEur||0)));
 const revenue=published.reduce((a,p)=>a+projectRevenue(p),0);
 const rpm=total>0?(revenue/total*1000):null;
 const ranked=published.filter(p=>totalViews(p)>0).sort((a,b)=>totalViews(b)-totalViews(a));
 const ret=[];for(const p of published){for(const [v,r] of [[p.viewsYT,p.retentionYT],[p.viewsIG,p.retentionIG]]){if(v>0 && r!==null && r!==undefined && r!=='' && Number.isFinite(Number(r)))ret.push({weight:Number(v),pct:Number(r)})}}
 const averageRetention=ret.length?ret.reduce((a,x)=>a+x.weight*x.pct,0)/ret.reduce((a,x)=>a+x.weight,0):null;
 const paid=published.filter(p=>projectRevenue(p)>0).length;
 return `${heading('MEASURE WHAT ACTUALLY WORKS','Growth lab','Compare your published videos using views, audience retention and real recorded earnings.')}
 <div class="notice" style="margin-bottom:18px">All figures are <strong>entered manually</strong> into published projects. No social accounts are connected, and nothing here predicts income. Revenue is gross, not profit. Averages from small samples can mislead.</div>
 <div class="kpis">
 ${[{a:'Recorded views',v:compact(total),f:'Published videos only'},{a:'Views-weighted retention',v:averageRetention===null?'—':averageRetention.toFixed(1)+'%',f:ret.length?'Only videos with entered retention':'Add retention from your analytics'},{a:'Followers gained',v:num(followers),f:'Combined manual count'},{a:'Revenue recorded',v:'€'+revenue.toFixed(2),f:paid+' earning projects'}].map(k=>`<div class="kpi"><div class="kpi-head">${k.a}</div><div class="kpi-value">${esc(k.v)}</div><div class="kpi-foot">${esc(k.f)}</div></div>`).join('')}</div>
 <div class="grid-main" style="margin-bottom:22px">
 <section class="panel"><div class="panel-head"><h2>Growth signals</h2><span class="tiny-muted">YOUR ACTUAL DATA</span></div>
 <div class="metric-list"><span>Likes per 1,000 views</span><strong>${total?(likes/total*1000).toFixed(1):'—'}</strong></div>
 <div class="metric-list"><span>Followers per 1,000 views</span><strong>${total?(followers/total*1000).toFixed(2):'—'}</strong></div>
 <div class="metric-list"><span>Recorded revenue per 1,000 views</span><strong>${rpm===null?'—':'€'+rpm.toFixed(3)}</strong></div>
 <div class="metric-list"><span>Published videos tracked</span><strong>${published.length}</strong></div>
 <p class="footnote">These are descriptive ratios of the information you enter, not advertising RPM or platform-verified earnings. Retention averages weight only known figures by the corresponding platform view counts.</p></section>
 <section class="panel"><div class="panel-head"><h2>How to use this page</h2></div>
 <div class="step"><div class="step-number">1</div><div><div class="step-title">Publish a video yourself</div><div class="step-text">Publishing is not connected yet. Change its project status to Published after posting.</div></div></div>
 <div class="step"><div class="step-number">2</div><div><div class="step-title">Record real metrics</div><div class="step-text">Edit the project and add views, average percentage viewed, likes and any revenue received.</div></div></div>
 <div class="step"><div class="step-number">3</div><div><div class="step-title">Compare formats over time</div><div class="step-text">Review several videos, not just one viral outlier, before paying for tools or changing your niche.</div></div></div>
 <button class="button button-ghost small" data-action="export-growth" ${!published.length?'disabled':''}>⇩ Export growth report</button></section></div>
 <h2 class="section-title">Growth assistant · evidence-based suggestions</h2><div style="margin-bottom:22px">${growthAdvice(published)}</div>
 <h2 class="section-title">Published video leaderboard <span class="tiny-muted">${ranked.length} with views</span></h2>
 ${ranked.length?`<div class="tablewrap"><table class="data-table"><thead><tr><th>Video</th><th>Views</th><th>YouTube retention</th><th>Instagram retention</th><th>Revenue</th><th></th></tr></thead><tbody>${ranked.map(p=>`<tr><td class="title-cell">${esc(p.title)}<span class="subcell">${esc(channel(p.channelId)?.name||'Unassigned')} · ${esc(p.kind)}</span></td><td><strong>${num(totalViews(p))}</strong></td><td>${p.retentionYT===null||p.retentionYT===undefined?'—':esc(Number(p.retentionYT).toFixed(1))+'%'}</td><td>${p.retentionIG===null||p.retentionIG===undefined?'—':esc(Number(p.retentionIG).toFixed(1))+'%'}</td><td>€${projectRevenue(p).toFixed(2)}</td><td><button class="kebab" data-action="edit-content" data-id="${esc(p.id)}">Edit</button></td></tr>`).join('')}</tbody></table></div>`:empty('▥','No published results yet','Mark videos Published and enter real view counts to see which topics and formats perform best.','Go to content studio','go-studio')}
 <p class="footnote">The numbers are never invented. Empty retention is shown as missing, not 0%. Use consistent time windows to compare performance across videos.</p>`;
}
function growthAdvice(projects){
 const measured=projects.filter(p=>['YT','IG','TT','FB'].reduce((sum,k)=>sum+Number(p['views'+k]||0),0)>0);
 if(measured.length<3)return `<div class="notice">Record results from at least three published videos to unlock useful comparisons. Current sample: ${measured.length}/3.</div>`;
 const byChannel=new Map();for(const p of measured){if(!byChannel.has(p.channelId))byChannel.set(p.channelId,[]);byChannel.get(p.channelId).push(p)}
 let html='';
 for(const [id,items] of byChannel){if(items.length<3)continue;
  const ranked=items.map(p=>({p,v:['YT','IG','TT','FB'].reduce((sum,k)=>sum+Number(p['views'+k]||0),0)})).sort((a,b)=>b.v-a.v);
  const median=[...ranked].sort((a,b)=>a.v-b.v)[Math.floor((ranked.length-1)/2)].v;
  const winner=ranked[0];
  const formatCount={clip:items.filter(p=>p.kind==='clip').length,original:items.filter(p=>p.kind==='original').length};
  const sample=items.filter(p=>p.retentionYT!==null&&p.retentionYT!==undefined&&p.retentionYT!==''&&Number(p.viewsYT||0)>0).map(p=>({title:p.title,ret:Number(p.retentionYT)})).sort((a,b)=>b.ret-a.ret);
  html+=`<div class="idea-card"><div class="eyebrow">${esc(channel(id)?.name||'Channel')}</div><h3>Investigate “${esc(winner.p.title)}”</h3><p class="secondary-note">${num(winner.v)} recorded views; your sample median is ${num(median)} across ${items.length} published videos. Examine its opening, pacing and topic before making another.</p><p class="secondary-note">Formats tracked: ${formatCount.clip} clips, ${formatCount.original} originals. ${sample.length>=2?`Highest entered YouTube retention: ${esc(sample[0].title)} (${sample[0].ret.toFixed(1)}%).`:'More retention data needed for comparisons.'}</p></div>`;
 }
 return html?`<div class="idea-grid">${html}</div>`:`<div class="notice">You have ${measured.length} measured published videos, but fewer than three per channel. Record more videos on the same channel for a useful comparison.</div>`;
}
function exportGrowth(){
 const data={version:1,generated_at:new Date().toISOString(),measurement:'manual_unverified',currency:'EUR',projects:state.projects.filter(p=>p.status==='published').map(p=>({title:p.title,channel:channel(p.channelId)?.name||'Unassigned',kind:p.kind,views_youtube:Number(p.viewsYT||0),views_instagram:Number(p.viewsIG||0),average_percentage_viewed_youtube:p.retentionYT??null,average_percentage_viewed_instagram:p.retentionIG??null,likes_youtube:Number(p.likesYT||0),likes_instagram:Number(p.likesIG||0),followers_gained:Number(p.followersGained||0),views_tiktok:Number(p.viewsTT||0),views_facebook:Number(p.viewsFB||0),earnings_youtube_eur:Number(p.revenueYT||0),earnings_instagram_eur:Number(p.revenueIG||0),earnings_tiktok_eur:Number(p.revenueTT||0),earnings_facebook_eur:Number(p.revenueFB||0),revenue_eur:Number(p.revenueEur||0)+['YT','IG','TT','FB'].reduce((a,k)=>a+Number(p['revenue'+k]||0),0)}))};
 downloadJSON('shorts-studio-growth-report.json',data);notice('Manual growth report downloaded.');
}
function scriptSignals(script,title){
 const clean=str(script).replace(/\[[^\]]+\]/g,' ').trim();const words=clean.split(/\s+/).filter(Boolean);const opening=words.slice(0,22).join(' ');
 const checks=[['Hook in opening',/(why|how|what if|but|never|surpris|\?|!|secret|mistake|actually|here.s)/i.test(opening)],['Clear topic',str(title).length>=7],['Useful length',words.length>=25&&words.length<=400],['Specific angle',/\d|because|example|step|reason|first|second|finally/i.test(clean)],['Ending or payoff',/\?|try|remember|result|lesson|learn|finally/i.test(words.slice(-30).join(' '))]];
 return {checks,score:checks.filter(x=>x[1]).length*20,words:words.length,estimate:Math.round(words.length/2.4)};
}
// ChatGPT Pro is a conversational tool, not a bundled API. This explicit manual handoff
// never sends data silently or stores credentials. Its imported response is untrusted data.
const aiSourceUrl = input => {try{const u=new URL(str(input));return u.protocol==='https:'&&u.hostname.includes('.')&& !u.username&&!u.password?u.href:null}catch(_){return null}};
function aiInput(id){return str(document.getElementById(id)?.value||'')}
function aiDeskPage(){
 const pre=aiPrefill||{};aiPrefill=null;
 const channelOpts=state.channels.map(c=>`<option value="${esc(c.id)}" ${pre.channelId===c.id?'selected':''}>${esc(c.name)}</option>`).join('');
 const projectOpts=state.projects.map(p=>`<option value="${esc(p.id)}" ${pre.projectId===p.id?'selected':''}>${esc(p.title.slice(0,75))}</option>`).join('');
 return `${heading('CHATGPT PRO · MANUAL HANDOFF','ChatGPT script desk','Research an original idea in ChatGPT, then bring a structured script back into Shorts Studio. No API key or extra payment.')}
 <div class="notice" style="margin-bottom:18px"><strong>How it works:</strong> Build a prompt → copy it into ChatGPT → paste its JSON response here → check each source and approve before rendering. The app cannot communicate directly with your ChatGPT account or independently verify sources.</div>
 <div class="grid-main"><section class="panel"><div class="panel-head"><h2>1 · Build a research brief</h2><span class="tiny-muted">NO ACCOUNT CONNECTION</span></div>
 <div class="form-field" style="margin-bottom:13px"><label for="ai-topic">Topic or story</label><input class="field" id="ai-topic" maxlength="180" value="${esc(pre.topic||'')}" placeholder="e.g. Why do octopuses solve puzzles?"></div>
 <div class="form-grid">
 <div class="form-field"><label for="ai-channel">Target channel</label><select class="field" id="ai-channel">${channelOpts||'<option value="">Create a channel first</option>'}</select></div>
 <div class="form-field"><label for="ai-mode">Video format</label><select class="field" id="ai-mode"><option value="original" ${pre.mode==='clip'?'':'selected'}>Original narrated Short</option><option value="clip" ${pre.mode==='clip'?'selected':''}>Original commentary on licensed clip</option></select></div>
 <div class="form-field"><label for="ai-length">Target duration</label><select class="field" id="ai-length"><option value="30">30 seconds</option><option value="45" selected>45 seconds</option><option value="60">60 seconds</option><option value="90">90 seconds</option></select></div>
 <div class="form-field"><label for="ai-tone">Voice / tone</label><select class="field" id="ai-tone"><option value="curious and clear">Curious explainer</option><option value="engaging, conversational">Conversational</option><option value="energetic, concise">Fast & energetic</option><option value="calm documentary">Calm documentary</option></select></div>
 </div>
 <div class="form-field" style="margin:12px 0"><label for="ai-project">Optional: base on an existing project</label><select class="field" id="ai-project"><option value="">New idea (no existing project)</option>${projectOpts}</select></div>
 <button class="button button-ghost small" data-action="ai-load-project">↳ Use selected project's details</button>
 <div class="form-field" style="margin:13px 0"><label for="ai-audience">Audience and creative angle</label><textarea class="field" id="ai-audience" rows="3" maxlength="800" placeholder="Audience, hook, constraints and tone...">${esc(pre.angle||'')}</textarea></div>
 <div class="form-field" style="margin-bottom:13px"><label for="ai-sources">Trusted research links / context (optional)</label><textarea class="field" id="ai-sources" rows="3" maxlength="1800" placeholder="One source URL or relevant note per line"></textarea></div>
 <div class="split-buttons"><button class="button button-primary" data-action="ai-build-prompt">✧ Build ChatGPT prompt</button><button class="button" data-action="ai-download-prompt">⇩ Download prompt</button></div>
 </section>
 <section class="panel"><div class="panel-head"><h2>2 · Ask ChatGPT Pro</h2><span class="tiny-muted">COPY / PASTE</span></div>
 <p class="secondary-note">Build your prompt, copy it and use it in a normal ChatGPT conversation. Ask ChatGPT to research the facts and return the JSON format shown in the prompt. This is not a direct API integration.</p>
 <div class="form-field"><label for="ai-prompt">Research and writing prompt</label><textarea class="field ai-code" id="ai-prompt" rows="15" spellcheck="false" readonly placeholder="Your research prompt appears here..."></textarea></div>
 <div class="split-buttons" style="margin-top:12px"><button class="button button-primary" data-action="ai-copy-prompt">Copy prompt</button><a class="button button-ghost" href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer">Open ChatGPT ↗</a></div>
 <p class="footnote">ChatGPT Pro cannot be called from this offline dashboard for free. Research citations and factual claims still require your own verification.</p></section></div>
 <section class="panel" style="margin-top:20px"><div class="panel-head"><h2>3 · Import and review the script</h2><span class="tiny-muted">JSON ONLY · UNDER 80 KB</span></div>
 <div class="form-field"><label for="ai-response">Paste ChatGPT's JSON response</label><textarea id="ai-response" class="field ai-code" rows="10" spellcheck="false" placeholder='{"schema_version":1,"title":"...","narration_script":"...", "claims":[{"claim":"...","source_url":"https://..."}]}...'></textarea></div>
 <div class="split-buttons" style="margin-top:12px"><button class="button" data-action="ai-preview">Preview and validate</button><button class="button button-ghost" data-action="ai-import-file">⇧ Import JSON file</button><input id="ai-file" type="file" accept=".json,application/json,.txt,text/plain" hidden></div>
 <div id="ai-preview" style="margin-top:16px"><div class="empty-mini">No script imported yet. Create a research prompt above or use the example JSON included in the ZIP.</div></div>
 </section>
 <p class="footnote">Security: scripts and source references remain in local browser storage only if you choose Save draft. Do not paste API keys or passwords. The narration, cited claims and originality must be checked before publishing.</p>`;
}
function buildAiPrompt(){
 const topic=aiInput('ai-topic').slice(0,180),channelId=aiInput('ai-channel'),ch=channel(channelId);
 if(topic.length<6){notice('Enter a specific topic first (at least six characters).');return null}
 if(!ch){notice('Create a channel first so the video has a destination.');return null}
 const mode=aiInput('ai-mode')==='clip'?'clip':'original',duration=Number(aiInput('ai-length'))||45,tone=aiInput('ai-tone'),angle=aiInput('ai-audience').slice(0,800),sources=aiInput('ai-sources').slice(0,1800);
 const base=state.projects.find(x=>x.id===aiInput('ai-project'));
 const prompt=`You are helping me create an original, factual, engaging vertical video for a content channel. Use web research where available; never invent a citation, source URL, quotation, statistic or certainty. If key claims cannot be substantiated, tell me what must be verified instead of filling gaps with guesses.\\n\\nCHANNEL: ${ch.name} (${ch.niche||'general'})\\nFORMAT: ${mode==='original'?'Original narrated video':'Original commentary on footage I own or have licensed (do not recreate copyrighted dialogue or use others’ footage without permission)'}\\nTOPIC: ${topic}\\nAUDIENCE / ANGLE: ${angle||'A curious general audience'}\\nTONE: ${tone}\\nTARGET: ${duration} seconds, roughly ${Math.round(duration*2.1)}-${Math.round(duration*2.5)} spoken words (adjust for clarity).\\nBRAND NOTES: ${(ch.notes||'Not supplied').slice(0,700)}\\nEXISTING PROJECT CONTEXT: ${base?base.title+'; '+(base.notes||'').slice(0,350):'None'}\\nSOURCES TO CONSIDER (NOT AUTOMATICALLY VERIFIED): ${sources||'Find credible first-party sources with working links.'}\\n\\nTASKS:\\n1. Propose a clear and distinctive original angle; research supporting facts from primary or reputable sources.\\n2. Write one complete narration script with a strong first 2 seconds, concise explanation, specific payoff and engaging ending. No stage directions in the narration text, no placeholders.\\n3. List 1-6 specific material claims with direct source URLs; use only links you have actually checked. If you cannot substantiate a material claim, leave it out of the narration.\\n4. Provide platform-specific title, description, Instagram caption, and 3-5 relevant hashtags; avoid exaggerated or misleading claims.\\n5. All text must be your original writing. Do not quote copyrighted media at length.\\n6. Output ONLY one valid JSON object (no Markdown fence, no commentary) using this exact structure:\\n{\\n  "schema_version": 1,\\n  "title": "Internal project name",\\n  "narration_script": "Complete spoken words only",\\n  "youtube_title": "YouTube Shorts title",\\n  "youtube_description": "Description in original wording",\\n  "instagram_caption": "Instagram Reel caption",\\n  "hashtags": ["#example", "#shorts"],\\n  "suggested_duration_seconds": ${duration},\\n  "claims": [{"claim": "One specific factual statement made in narration", "source_url": "https://credible-source.example/path"}],\\n  "editor_notes": "Suggested safe visuals, pacing and transition cues"\\n}\\n\\nIMPORTANT: Do not fabricate a URL to satisfy this schema. If no verified source is available, return an empty claims list; the app will block publication until research is complete. Never include credentials or account access details.`.replaceAll('\\n','\n');
 aiBrief={topic,channelId,mode,duration,angle,baseId:base?.id||null,createdAt:new Date().toISOString()};
 const out=$('#ai-prompt');out.value=prompt;aiDraft=null;return prompt;
}
function parseAiResponse(text){
 if(typeof text!=='string'||text.length>80000)throw Error('Response must be under 80 KB');
 let raw=text.trim();if(raw.startsWith('```'))raw=raw.replace(/^```(?:json)?\s*\n?/i,'').replace(/\s*```$/,'').trim();
 let x;try{x=JSON.parse(raw)}catch(_){throw Error('Response is not valid JSON. Ask ChatGPT to output JSON only.')}
 if(!x||typeof x!=='object'||Array.isArray(x)||x.schema_version!==1)throw Error('Expected schema_version 1 and a JSON object');
 const plain=(v,max)=>typeof v==='string'?v.trim().slice(0,max):'';
 const title=plain(x.title,150),script=plain(x.narration_script,6000),words=script.split(/\s+/).filter(Boolean).length;
 if(title.length<5)throw Error('A video title (5+ characters) is required');
 if(words<25||words>700)throw Error('Narration should be 25–700 words');
 if(/\[(RESEARCH|EXAMPLE|HOOK|END|MAIN|PAYOFF)\]/i.test(script))throw Error('Script contains research placeholders');
 if(!Array.isArray(x.claims)||x.claims.length>12)throw Error('Claims must be an array of at most 12 items');
 const claims=[];for(const item of x.claims){if(!item||typeof item!=='object')throw Error('Each claim needs a statement and source URL');const claim=plain(item.claim,350),url=aiSourceUrl(item.source_url);if(!claim||!url)throw Error('Each claim requires a statement and a valid HTTP(S) source URL');claims.push({claim,source_url:url})}
 if(!claims.length)throw Error('At least one cited factual claim is required; ask ChatGPT to provide real sources, then verify them yourself.');
 const hashtags=Array.isArray(x.hashtags)?x.hashtags.filter(t=>typeof t==='string'&&/^#[\w]{2,40}$/.test(t.trim())).slice(0,7):[];
 const dur=Number(x.suggested_duration_seconds);let duration=Number.isFinite(dur)&&dur>=3&&dur<=180?Math.round(dur):Math.max(15,Math.min(180,Math.round(words/2.3)));
 return {title,script,claims,hashtags,description:plain(x.youtube_description,900),ytTitle:plain(x.youtube_title,140)||title,igCaption:plain(x.instagram_caption,1000),editorNotes:plain(x.editor_notes,1500),duration,words};
}
function previewAiReply(){
 const target=$('#ai-preview');if(!target)return;
 try{
  const response=parseAiResponse(aiInput('ai-response'));aiDraft=response;
  const brief=aiBrief;
  const lengthNote=brief&&Math.abs(response.duration-brief.duration)>20?`<div class="notice warn">The returned duration differs substantially from your selected target. Review pacing.</div>`:'';
  target.innerHTML=`<div class="notice good"><strong>Valid draft structure ✓</strong> · ${response.words} spoken words · estimated ${Math.round(response.words/2.3)}s at 138 WPM. <strong>Facts are NOT verified.</strong></div>${lengthNote}
  <h3 style="margin:16px 0 8px">${esc(response.title)}</h3><div class="secondary-note">YouTube: ${esc(response.ytTitle)}</div><pre class="creative-script ai-script-preview">${esc(response.script)}</pre><h3 style="margin-top:16px">Claims to verify (${response.claims.length})</h3>
  <div class="claim-list">${response.claims.map((c,i)=>`<p><strong>${i+1}.</strong> ${esc(c.claim)} <a href="${esc(c.source_url)}" target="_blank" rel="noopener noreferrer">Check source ↗</a></p>`).join('')}</div>
  <p class="footnote">Links have only been checked for valid URL syntax. This dashboard cannot confirm that they exist or support the claims. Save as a Draft, then review them in the project editor before marking Ready.</p>
  <button class="button button-primary" data-action="ai-save-draft" ${!channel(brief?.channelId)?'disabled':''}>＋ Save as draft in Content studio</button>`;
  notice('Valid JSON structure. Sources still require human verification.');
 }catch(e){aiDraft=null;target.innerHTML=`<div class="notice warn">${esc(e.message||'Cannot import this response.')}</div>`;notice('Please correct the ChatGPT response.');}
}
function saveAiDraft(){
 if(!aiDraft||!channel(aiBrief?.channelId)){notice('Generate a prompt and validate its JSON response first.');return}
 const c=aiDraft,b=aiBrief,now=new Date().toISOString(),base=state.projects.find(p=>p.id===b.baseId);
 const project={id:uid(),title:c.title,kind:b.mode,channelId:b.channelId,status:'draft',sourcePath:b.mode==='clip'?base?.sourcePath||'':'',sourceUrl:b.mode==='clip'?base?.sourceUrl||'':'',start:b.mode==='clip'?base?.start||0:0,duration:c.duration,captionStyle:'word-pop',cropFocus:'center',motion:'none',background:'ocean',voiceMode:'basic',audioPath:'',script:c.script,ytTitle:c.ytTitle,igCaption:c.igCaption,description:[c.description,c.hashtags.join(' ')].filter(Boolean).join('\n\n'),schedule:'',viewsYT:0,viewsIG:0,rights:false,notes:`ChatGPT-assisted draft. Topic: ${b.topic}. ${c.editorNotes}\n\nDo not publish until factual claims, URLs and media rights are personally reviewed.`,aiReview:{required:true,confirmed:false,claims:c.claims,origin:'Manual ChatGPT JSON import',createdAt:now,reviewedAt:null},createdAt:now,updatedAt:now};
 state.projects.push(project);save();aiDraft=null;navigate('studio');notice('Draft created. Review its claims and permission before rendering.');
}
function loadAiProject(){let p=state.projects.find(p=>p.id===aiInput('ai-project'));if(!p){notice('Choose an existing project first.');return}
 $('#ai-topic').value=p.title;$('#ai-channel').value=p.channelId;$('#ai-mode').value=p.kind;$('#ai-audience').value=(p.notes||'').slice(0,800);$('#ai-length').value=[30,45,60,90].reduce((a,b)=>Math.abs(b-p.duration)<Math.abs(a-p.duration)?b:a,45).toString();notice('Loaded project details. Add or review your trusted source URLs.');
}
function importAiFile(file){if(!file)return;if(file.size>80000){notice('Response file is too large (80 KB max).');return}const fr=new FileReader();fr.onload=()=>{$('#ai-response').value=String(fr.result);previewAiReply();};fr.readAsText(file);}

const creativeHooks=(topic,angle)=>{
 const subject=topic.slice(0,1).toLowerCase()+topic.slice(1);
 return [`What might surprise you about ${subject}?`,
  `The thing most people miss about ${subject}`,
  `Let's explore ${subject} in 30 seconds`];
};
function creativePage(){const choices=state.channels.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
 return `${heading('ORIGINAL CONTENT · NO PAID AI API','Creative lab','Generate research-ready scripts, compare three hooks and create original projects using free templates.')}<div class="notice" style="margin-bottom:20px">This is an offline idea-and-outline generator, not a fact-checking language model. Replace research placeholders with verified facts before publishing. It does not download anyone else’s videos.</div>
 <div class="grid-main"><section class="panel"><div class="panel-head"><h2>Build a video concept</h2></div><div class="form-field" style="margin-bottom:12px"><label for="creative-topic">Topic</label><input id="creative-topic" class="field" maxlength="120" placeholder="e.g. why octopuses are intelligent"></div><div class="form-field" style="margin-bottom:12px"><label for="creative-angle">Specific angle</label><input id="creative-angle" class="field" maxlength="160" placeholder="e.g. surprising abilities supported by research"></div><div class="form-grid"><div class="form-field"><label for="creative-channel">Channel</label><select id="creative-channel" class="field">${choices||'<option value="">Create a channel first</option>'}</select></div><div class="form-field"><label for="creative-voice">Style</label><select id="creative-voice" class="field"><option value="curious">Curious explainer</option><option value="story">Storytelling</option><option value="fast">Fast and energetic</option></select></div></div><p style="margin-top:15px"><button class="button button-primary" data-action="generate-concept">✧ Generate outline and hooks</button></p></section>
 <section class="panel"><div class="panel-head"><h2>Creator workflow</h2></div><div class="step"><div class="step-number">1</div><div><div class="step-title">Choose a focused topic</div><div class="step-text">Use Viral Radar and competitor insights as inspiration only.</div></div></div><div class="step"><div class="step-number">2</div><div><div class="step-title">Pick a hook and verify facts</div><div class="step-text">Review the generated research placeholders and replace them with your findings.</div></div></div><div class="step"><div class="step-number">3</div><div><div class="step-title">Render an original draft</div><div class="step-text">Optional no-footage animated grid background, captions and basic free narration.</div></div></div></section></div>
 <div class="notice" style="margin-top:18px"><strong>Want a real researched narration script?</strong> <button class="button button-ghost small" data-nav="ai">Open ChatGPT script desk ↗</button> No paid API needed — copy a prompt and paste the structured result.</div>
 <section class="panel" id="creative-results" style="margin-top:20px"><div class="empty-mini">Enter a topic and generate three hook variations.</div></section>`;
}
function generateConcept(){const topic=str($('#creative-topic')?.value).slice(0,120),angle=str($('#creative-angle')?.value).slice(0,160);if(topic.length<4){notice('Enter a more specific topic first.');return}
 const style=$('#creative-voice')?.value||'curious',channelId=$('#creative-channel')?.value||'';
 const hooks=creativeHooks(topic,angle);
 const script=hooks[0]+`\n[RESEARCH] Explain ${angle||'the key idea'} using an independently verified fact and original wording.\n[EXAMPLE] Give a concrete, verifiable example about ${topic}.\n[PAYOFF] Explain why this matters.\n[END] What should we explore next?`;
 const result=$('#creative-results');result.innerHTML=`<div class="panel-head"><h2>Three hook variations</h2><span class="tiny-muted">OFFLINE DRAFT · NOT FACT-CHECKED</span></div><div class="idea-grid">${hooks.map((x,i)=>`<div class="idea-card"><div class="eyebrow">HOOK 0${i+1}</div><h3>${esc(x)}</h3><p class="secondary-note">${i===0?'Question':i===1?'Curiosity gap':'Explanatory hook'}</p><button class="button button-ghost small" data-action="save-concept" data-index="${i}" ${!channelId?'disabled':''}>＋ Create draft</button></div>`).join('')}</div><div class="separator"></div><h2>Script structure</h2><pre class="creative-script">${esc(script)}</pre><div class="footnote">This sample has research placeholders. No facts have been invented. The idea score is not a virality forecast.</div>`;
 window.__shortsConcept={topic,angle,style,channelId,hooks};
}
function saveConcept(index){const c=window.__shortsConcept;if(!c||!channel(c.channelId)||!c.hooks[index])return;
 const script=c.hooks[index]+`\n[RESEARCH] Verify a key fact about ${c.angle||c.topic}.\n[EXAMPLE] Add a sourced example in your own words.\n[PAYOFF] Explain the real-world implication.\n[END] What should we explore next?`;
 const now=new Date().toISOString();state.projects.push({id:uid(),title:c.hooks[index],kind:'original',channelId:c.channelId,status:'idea',sourcePath:'',sourceUrl:'',start:0,duration:35,captionStyle:'word-pop',cropFocus:'center',motion:'none',background:'ocean',voiceMode:'basic',audioPath:'',script,ytTitle:c.hooks[index],igCaption:'',description:'',schedule:'',viewsYT:0,viewsIG:0,rights:false,notes:`Original outline generated in Creative lab. Research and replace placeholder lines before confirming rights or marking Ready.`,createdAt:now,updatedAt:now});save();navigate('studio');notice('Draft created. Verify claims before producing.');
}
function competitorsPage(){const items=state.discovery?.items||[],byCreator=new Map();for(const x of items){const key=x.creator||'Unknown';if(!byCreator.has(key))byCreator.set(key,[]);byCreator.get(key).push(x)}
 const groups=[...byCreator].map(([creator,rows])=>{const ordered=rows.map(x=>x.views).sort((a,b)=>a-b),median=ordered[Math.floor((ordered.length-1)/2)]||0;return {creator,rows,median,peak:rows.reduce((a,x)=>x.views>a.views?x:a,rows[0])}}).sort((a,b)=>b.peak.views-a.peak.views).slice(0,50);
 return `${heading('CHANNEL BENCHMARKS','Competitor intelligence','Compare public videos in your imported YouTube discovery data against the same creator’s sampled uploads.')}<div class="notice warn" style="margin-bottom:18px">Scores are only meaningful with several comparable uploads from one creator. One imported video is not enough to assess outperformance. No live accounts or content scraping.</div>${groups.length?`<div class="tablewrap"><table class="data-table"><thead><tr><th>Creator</th><th>Sampled videos</th><th>Sample median views</th><th>Best sampled video</th><th>Relative performance</th></tr></thead><tbody>${groups.map(g=>`<tr><td class="title-cell">${esc(g.creator)}</td><td>${g.rows.length}</td><td>${num(g.median)}</td><td><a class="link" target="_blank" rel="noopener noreferrer" href="${esc(g.peak.url)}">${esc(g.peak.title)}</a><span class="subcell">${num(g.peak.views)} views</span></td><td>${g.rows.length<3?'Insufficient sample':g.median?`${(g.peak.views/g.median).toFixed(1)}× sample median`:'Insufficient data'}</td></tr>`).join('')}</tbody></table></div>`:empty('⌕','No imported discovery results','Import a YouTube discovery report first to compare creators.','','')}<p class="footnote">Creator baselines use this imported sample, not all uploads. View count and video age also matter; no guarantees of future performance.</p>`;
}
function qualityPage(){const rows=[...state.projects].sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));
 return `${heading('PRE-PUBLICATION SAFETY','Quality gate','Audit each project before rendering, then run technical MP4 checks before posting.')}<div class="notice" style="margin-bottom:20px">Open <strong>Production flow</strong> to render a local MP4, inspect its automatic technical quality report, correct captions and approve the actual video. Technical checks cannot determine copyright legality, factual accuracy or whether an edit is entertaining.</div><div class="panel" style="margin-bottom:20px"><div class="panel-head"><h2>Illustrated story rendering</h2><span class="tiny-muted">TESTED · NO VIDEO UPLOAD</span></div><p class="secondary-note">The image-first engine supports a brief title over an opening illustration followed by full-screen pictures that change as the narration progresses. No extra scene headlines compete with the subtitles. Every scene needs an original/licensed image and the finished result needs visual review; the automated test uses synthetic art solely to verify rendering.</p><a class="button button-ghost small" href="https://github.com/dclipsentertainment/shorts-studio-app/actions/workflows/test-illustrated-story.yml" target="_blank" rel="noopener noreferrer">View image-first renderer tests ↗</a></div>${rows.length?`<div class="tablewrap"><table class="data-table"><thead><tr><th>Project</th><th>Preflight</th><th>Final video review</th><th>Creative outline score*</th><th>Estimated speech</th><th>Action</th></tr></thead><tbody>${rows.map(p=>{const issues=renderBlockers(p);const q=scriptSignals(p.script,p.title);return `<tr><td class="title-cell">${esc(p.title)}<span class="subcell">${esc(p.kind)} · ${esc(channel(p.channelId)?.name||'Unassigned')}</span></td><td>${issues.length?`<span class="status scheduled">${issues.length} issue(s)</span><span class="subcell">${esc(issues.slice(0,2).join('; '))}</span>`:'<span class="status ready">Render-ready</span>'}</td><td>${latestRender(p)?.approved?'<span class="status ready">✓ Approved</span>':latestRender(p)?'<span class="status scheduled">Needs review</span>':'<span class="tiny-muted">Not rendered</span>'}</td><td><span class="score-chip">${q.score}/100</span><span class="subcell">${q.checks.filter(x=>x[1]).length}/5 writing cues</span></td><td>${q.words?`${q.estimate}s (${q.words} words)`:'—'}</td><td><button class="kebab" data-action="edit-content" data-id="${esc(p.id)}">Review</button></td></tr>`}).join('')}</tbody></table></div>`:empty('✓','No projects yet','Create or import content to see preflight and writing checks.','','')}<p class="footnote">*Creative score checks only writing cues (hook, topic, length, specifics and closing); it is not AI taste, audience retention or predicted viral probability. Always review claims, exact subtitles and rights.</p>`;
}
function setupPage(){return `${heading('PREFERENCES & CONNECTIONS','Setup & backups','Keep your content plans safe while you create accounts and set up hosting.')}
 <div class="grid-main"><section class="panel"><div class="panel-head"><h2>Your next setup steps</h2></div><div class="setup-list"><div class="setup-item"><div class="check">1</div><div><strong>Dedicated Google account</strong><p>Create the login that will own your YouTube channels.</p><a href="https://accounts.google.com/signup" target="_blank" rel="noopener noreferrer">Open Google signup ↗</a></div></div><div class="setup-item"><div class="check">2</div><div><strong>Instagram Professional accounts</strong><p>Make separate niche profiles (Creator or Business) under your business setup.</p><a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer">Open Instagram ↗</a></div></div><div class="setup-item"><div class="check">3</div><div><strong>GitHub account</strong><p>Your public app and private production repositories are already created and running on GitHub.</p><a href="https://github.com/signup" target="_blank" rel="noopener noreferrer">Open GitHub signup ↗</a></div></div></div></section><section class="panel"><div class="panel-head"><h2>Local data and backups</h2></div><p class="secondary-note">Projects and channel profiles live in this browser's local storage. They do not automatically sync between computers, browsers or private windows. Do not put passwords or API keys into any dashboard field.</p><div class="split-buttons" style="margin:17px 0"><button class="button" data-action="backup">⇩ Export backup</button><button class="button" data-action="import">⇧ Import backup</button></div><input id="import-file" type="file" accept=".json,application/json" hidden><div class="separator"></div><h2>Local recovery checkpoints</h2>
 <p class="secondary-note">Recent edits preserve up to five prior workspace versions in this same browser. This can help undo mistakes, but will NOT survive clearing browser storage. Export backups regularly.</p>
 ${recoveryEntries().length?`<div class="recovery-list">${recoveryEntries().map((r,i)=>{let detail='Workspace snapshot';try{const x=JSON.parse(r.data);detail=`${x.channels.length} channels · ${x.projects.length} projects`}catch(_){}return `<div class="recovery-item"><span>${esc(dateStr(r.savedAt))} · ${esc(detail)}</span><button class="button tiny" data-action="restore-recovery" data-index="${i}">Restore</button></div>`}).reverse().join('')}</div>`:'<p class="footnote">Recovery points appear after you make changes. Nothing has been saved yet.</p>'}
 <div class="separator"></div><h2>Try the interface</h2><p class="secondary-note">Load sample channels and video ideas. Example figures are fictional and will be marked as demonstration data.</p><button class="button button-ghost small" data-action="demo">＋ Add sample data</button><div class="separator"></div><h2>Reset workspace</h2><p class="secondary-note">Delete local channels and projects. Export a backup first if you might need them again.</p><button class="button button-danger small" data-action="reset">Delete local data</button></section></div>
 <h2 class="section-title">Your Cloudflare website</h2><section class="panel">
 <div class="panel-head"><h2>Free web hosting · GitHub auto-deploy</h2><span class="tiny-muted">ONE-TIME ACCOUNT CONNECTION</span></div>
 <p class="secondary-note">This app is prepared for Cloudflare Pages but must first be connected to your Cloudflare account. Once connected, new versions of DClips appear on the website automatically when GitHub changes are deployed. You can use it on any device without downloading a ZIP.</p>
 <div class="setup-list">
 <div class="setup-item"><div class="check">1</div><div><strong>Open Cloudflare</strong><p>Workers &amp; Pages → Create application → Pages → Connect to Git.</p><a href="https://dash.cloudflare.com/" target="_blank" rel="noopener noreferrer">Open Cloudflare dashboard ↗</a></div></div>
 <div class="setup-item"><div class="check">2</div><div><strong>Connect only the public DClips app repository</strong><p>Choose dclipsentertainment/shorts-studio-app. Keep the private video-production repository separate.</p></div></div>
 <div class="setup-item"><div class="check">3</div><div><strong>Use these build settings</strong><p>Branch: main · Command: <code>bash scripts/build_cloudflare_pages.sh</code> · Output: <code>dist-cloudflare</code> · Preset: None.</p></div></div>
 </div>
 <p class="footnote">Cloudflare Pages is public by default. It stores no YouTube tokens or private production files in its deployed assets. Your browser data remains local unless secure syncing is added later. The hosted website cannot yet initiate private video rendering or social uploads.</p></section>
 <h2 class="section-title">App updates · v${APP_VERSION}</h2><section class="panel"><div class="panel-head"><h2>GitHub-managed auto updates</h2><span class="tiny-muted">ON BY DEFAULT · NO SETUP</span></div>
 <div class="notice good">✓ Download the app once. Every time you open OPEN-DASHBOARD.cmd it checks for the latest verified DClips GitHub release and updates app code automatically. No Git, new ZIP, or administrator access required.</div>
 <div class="setup-list" style="margin-top:14px">
 <div class="setup-item"><div class="check">1</div><div><strong>One download</strong><p>Download the latest Windows ZIP from the DClips public GitHub repository and extract it into a folder you can write to.</p><a href="https://github.com/dclipsentertainment/shorts-studio-app/releases/latest" target="_blank" rel="noopener noreferrer">Download latest app ↗</a></div></div>
 <div class="setup-item"><div class="check">2</div><div><strong>Run OPEN-DASHBOARD.cmd</strong><p>Each launch checks GitHub, verifies the release SHA-256 digest, installs any newer stable app release and opens your dashboard. It falls back to the installed version if offline.</p></div></div>
 <div class="setup-item"><div class="check">3</div><div><strong>All your pages are here</strong><p>Content Studio, Production, Viral Radar, Analytics, GitHub Usage and other pages are in this application, each accessible from the sidebar. Your media and local data are preserved.</p></div></div>
 </div><p class="footnote">Updates come only from your pinned <a href="https://github.com/dclipsentertainment/shorts-studio-app" target="_blank" rel="noopener noreferrer">public DClips repository</a>. Private YouTube credentials and render workflows remain in your <a href="https://github.com/dclipsentertainment/shorts-studio-production" target="_blank" rel="noopener noreferrer">private production repository</a>. Code updates do not sync browser-local projects between computers. See README-RELEASES.md.</p>
 <div class="split-buttons" style="margin-top:15px"><a href="https://github.com/dclipsentertainment/shorts-studio-app/releases/latest" target="_blank" rel="noopener noreferrer" class="button button-ghost">View latest GitHub version ↗</a><a href="https://github.com/dclipsentertainment/shorts-studio-app/actions" target="_blank" rel="noopener noreferrer" class="button button-ghost">See update builds ↗</a></div>
 </section>
 <h2 class="section-title">What's working, and what's next</h2><div class="panel"><div class="setup-list"><div class="setup-item"><div class="check">✓</div><div><strong>Ready now</strong><p>Channel planning, content briefs, schedule tracking, manual performance tracking in Growth lab, Viral radar watchlist and YouTube metrics-import option, backups, job JSON export, local and GitHub Actions FFmpeg rendering.</p></div></div><div class="setup-item"><div class="check">⌛</div><div><strong>Needs connection or further development</strong><p>Automated Instagram third-party metrics (restricted by Meta), AI topic research, transcription and semantic clip understanding, remote project sync, direct GitHub workflow controls from the browser, public posting automation and analytics synchronisation.</p></div></div></div><p class="footnote">Cloud workflows are separate from the browser dashboard. Export a render job, add it to the GitHub repository with source media, then run its workflow. See README-FIRST.md in the download.</p></div>`}
// Viral Radar deliberately does not scrape video websites, download other creators' media,
// or infer that popularity grants rights to re-use footage. All source stats are labeled.
const originOk=(url)=>{
 try {const u=new URL(url);if(u.protocol!=='https:')return null;
  const h=u.hostname.toLowerCase();if(['youtube.com','www.youtube.com','m.youtube.com'].includes(h)){
   if(u.pathname.startsWith('/shorts/')||u.pathname==='/watch'&&u.searchParams.get('v'))return 'YouTube';
  }
  if(['youtu.be','www.youtu.be'].includes(h)&&u.pathname.length>1)return 'YouTube';
  if(['instagram.com','www.instagram.com'].includes(h)&&u.pathname.startsWith('/reel/'))return 'Instagram';
 }catch(e){}return null;
};
const normUrl=(url)=>{try{const u=new URL(url);const p=originOk(url);if(p==='YouTube'){
   const id=(u.hostname.includes('youtu.be')?u.pathname.split('/')[1]:u.pathname.startsWith('/shorts/')?u.pathname.split('/')[2]:u.searchParams.get('v'));
   if(id&&/^[a-zA-Z0-9_-]{11}$/.test(id))return `https://www.youtube.com/shorts/${id}`;
  }
  u.hash='';u.search='';return u.href.replace(/\/$/,'')
 }catch(e){return str(url)}};
function latestView(t){return Math.max(0,Number(t.snapshots?.at(-1)?.views||0))}
function velocity(t){let x=t.snapshots||[];if(x.length<2)return null;let a=x.at(-2),b=x.at(-1),days=(Date.parse(b.date)-Date.parse(a.date))/86400000;return days>=1/24 ? Math.round((b.views-a.views)/days):null}
const viralTag=(t)=>latestView(t)>=state.viralThreshold?`<span class="status ready">🔥 High views</span>`:`<span class="tiny-muted">Monitoring</span>`;
function discoverPage(){
 const report=state.discovery;
 const items=report?.items||[];
 const niches=[...new Set(items.flatMap(i=>i.niches||[]))].sort();
 const visible=discoveryNiche==='all'?items:items.filter(i=>i.niches.includes(discoveryNiche));
 const lead=visible.filter(i=>i.views>=state.viralThreshold).length;
 const generated=report?.generated_at?dateStr(report.generated_at):'No live report imported';
 return `${heading('AUTOMATIC YOUTUBE NICHE SCOUT','Trend discovery','Find new short-form video ideas in gaming, podcasts, facts and custom niches.',`<button class="button button-primary" data-action="import-discovery">⇧ Import discovery results</button>`)}
 <div class="notice" style="margin-bottom:21px">🔎 Searches run automatically in GitHub Actions after you add a free YouTube API key. <strong>The dashboard does not run live searches by itself.</strong> Download the latest workflow report and import it here. Instagram discovery is not automatically supported. The API filters by duration, not by Shorts format or vertical orientation.</div>
 <div class="kpis">
 ${[{a:'Candidates found',v:items.length,ic:'◉',f:'Deduplicated across searches'},{a:'High-view candidates',v:items.filter(i=>i.views>=state.viralThreshold).length,ic:'↗',f:`≥ ${compact(state.viralThreshold)} views`},{a:'Niches covered',v:niches.length||0,ic:'▦',f:'Can be customised in JSON'},{a:'Last discovery report',v:report?esc(report.generated_at.slice(0,10)):'—',ic:'◷',f:report?'Report imported':'Needs API key + workflow'}].map(k=>`<div class="kpi"><div class="kpi-head"><span>${k.a}</span><span class="kpi-icon">${k.ic}</span></div><div class="kpi-value">${k.v}</div><div class="kpi-foot">${k.f}</div></div>`).join('')}</div>
 <div class="grid-main" style="margin-bottom:22px"><section class="panel"><div class="panel-head"><h2>Enable daily niche discovery</h2></div>
 <div class="step"><div class="step-number">1</div><div><div class="step-title">Choose your niches</div><div class="step-text">Edit <code>reports/discovery-niches.json</code> in your future private GitHub repository. Default: gaming, podcasts, science & facts.</div></div></div>
 <div class="step"><div class="step-number">2</div><div><div class="step-title">Add an API key securely</div><div class="step-text">Google Cloud → YouTube Data API v3 → create an API key. Save it as GitHub repository secret <code>YOUTUBE_API_KEY</code>. Never paste credentials into this dashboard.</div></div></div>
 <div class="step"><div class="step-number">3</div><div><div class="step-title">Run the free cloud scout</div><div class="step-text">GitHub Actions → Discover YouTube short-form trends → Run workflow. Future runs are scheduled daily (best-effort; free limits apply).</div></div></div>
 <div class="step"><div class="step-number">4</div><div><div class="step-title">Import, shortlist, research</div><div class="step-text">Download <code>viral-discovery-results</code>, unzip the JSON, import here, and send interesting ideas to Viral radar or your content library.</div></div></div>
 </section><section class="panel"><div class="panel-head"><h2>Your latest report</h2></div><div class="metric-list"><span>Generated</span><strong>${esc(generated)}</strong></div><div class="metric-list"><span>Matching videos</span><strong>${items.length}</strong></div><div class="metric-list"><span>Scanned niches</span><strong>${niches.join(', ').slice(0,100)||'Not yet scanned'}</strong></div><div class="metric-list"><span>High-view items in current filter</span><strong>${lead}</strong></div>
 <div style="margin-top:16px" class="split-buttons"><button class="button button-primary small" data-action="import-discovery">⇧ Import JSON report</button><button class="button small" data-action="export-discovery" ${!items.length?'disabled':''}>⇩ Export ranked list</button></div>
 <input type="file" id="discovery-file" accept=".json,application/json" hidden>
 <p class="footnote">${esc(report?.note||'No report yet. No sample views are presented as genuine data.')} YouTube views/day is an age-based estimate, not growth measured over time. The score is our simple ranking formula, not a prediction of virality.</p>
 </section></div>
 <h2 class="section-title">Discovered short-form candidates <span class="tiny-muted">${visible.length} shown</span></h2>
 <div class="filters"><button class="filter ${discoveryNiche==='all'?'active':''}" data-discovery-niche="all">All (${items.length})</button>${niches.map(n=>`<button class="filter ${discoveryNiche===n?'active':''}" data-discovery-niche="${esc(n)}">${esc(n)} (${items.filter(i=>i.niches.includes(n)).length})</button>`).join('')}</div>
 ${visible.length?`<div class="tablewrap"><table class="data-table"><thead><tr><th>Rank / Short-form candidate</th><th>Views</th><th>Avg views/day</th><th>Score</th><th>Actions</th></tr></thead><tbody>${visible.map(item=>`<tr><td class="title-cell"><span class="tiny-muted">#${esc(item.rank||'—')} · ${esc((item.niches||[]).join(', '))}</span><div style="margin-top:5px">${esc(item.title)}</div><span class="subcell">${esc(item.creator)} · ${esc(item.published_at)} · ${item.duration_seconds}s · <a class="radar-link" href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">Watch on YouTube ↗</a></span></td><td><strong>${num(item.views)}</strong></td><td><strong>${num(item.estimated_views_per_day)}</strong><span class="subcell">Estimated since upload</span></td><td><span class="score-chip">${esc(item.discovery_score)}/100</span></td><td><div class="inline-actions"><button class="kebab" data-action="track-discovery" data-id="${esc(item.id)}">Track</button><button class="kebab" data-action="idea-discovery" data-id="${esc(item.id)}" ${state.channels.length?'':'disabled'}>Idea</button></div></td></tr>`).join('')}</tbody></table></div>`:empty('⌕',report?'No results for this niche':'No discovery report yet',report?'Choose another niche or adjust the search settings.':'When the GitHub workflow runs, import its discovery-results.json here.',null,null)}
 <p class="footnote">The scout does not retrieve footage, verify that videos are actually Shorts, or grant reuse permission. Use these as research references; create your own version or obtain appropriate rights.</p>`;
}
function importDiscovery(file){
 if(!file)return;
 if(file.size>2*1024*1024){notice('Discovery file exceeds 2 MB.');return}
 const reader=new FileReader();reader.onload=()=>{try{
  const report=JSON.parse(reader.result);
  if(report.discovery_version!==1 || !Array.isArray(report.items) || report.items.length>500 || report.method!=='official_youtube_data_api' || !report.generated_at)throw Error('Invalid discovery report');
  const valid=[];const seen=new Set();
  for(const item of report.items){
   if(!item || item.platform!=='YouTube' || !/^https:\/\/(?:www\.)?youtube\.com\/watch\?v=[A-Za-z0-9_-]{11}$/.test(item.url) || seen.has(item.url))continue;
   if(!Number.isSafeInteger(item.views)||item.views<0||!Number.isSafeInteger(item.estimated_views_per_day)||item.estimated_views_per_day<0||!Number.isFinite(item.discovery_score)||item.discovery_score<0||item.discovery_score>100||!Number.isSafeInteger(item.duration_seconds)||item.duration_seconds<3||item.duration_seconds>180)continue;
   if(!Array.isArray(item.niches)||item.niches.length>8 || !item.niches.every(n=>typeof n==='string'&&n.length<61))continue;
   seen.add(item.url);
   valid.push({id:item.url.split('v=')[1],url:item.url,title:str(item.title||'Untitled').slice(0,150),creator:str(item.creator).slice(0,100),views:item.views,estimated_views_per_day:item.estimated_views_per_day,discovery_score:item.discovery_score,rank:valid.length+1,published_at:str(item.published_at).slice(0,10),duration_seconds:item.duration_seconds,niches:item.niches,likes:Number.isSafeInteger(item.likes)?item.likes:0});
  }
  if(!valid.length)throw Error('No valid candidates');
  state.discovery={generated_at:String(report.generated_at).slice(0,40),note:String(report.note||'').slice(0,500),items:valid};discoveryNiche='all';save();render();notice(`Imported ${valid.length} YouTube short-form candidates.`);
 }catch(err){notice('Unable to import discovery report. Use the GitHub workflow JSON.')}};reader.readAsText(file);
}
function trackDiscovery(id,createIdea=false){
 const x=state.discovery?.items.find(item=>item.id===id);if(!x)return;
 const url=`https://www.youtube.com/shorts/${id}`,now=new Date().toISOString();
 let saved=state.trends.find(t=>normUrl(t.url)===normUrl(url));
 if(!saved){saved={id:uid(),url,platform:'YouTube',title:x.title,creator:x.creator,publishedAt:x.published_at,permission:'reference',notes:`Found by Trend discovery in niches: ${x.niches.join(', ')}. Research inspiration only; do not republish without rights.`,createdAt:now,updatedAt:now,snapshots:[{date:now,views:x.views,source:'YouTube API discovery'}]};state.trends.push(saved)}
 else if(latestView(saved)!==x.views){saved.snapshots.push({date:now,views:x.views,source:'YouTube API discovery'});saved.snapshots=saved.snapshots.slice(-100);saved.updatedAt=now}
 if(createIdea && state.channels.length){
  const projectExists=state.projects.some(p=>p.notes?.includes(`Inspiration: ${saved.url}`));
  if(!projectExists){state.projects.push({id:uid(),title:`Original take: ${x.title}`.slice(0,150),kind:'original',channelId:state.channels[0].id,status:'idea',sourcePath:'',sourceUrl:'',start:0,duration:35,voiceMode:'basic',audioPath:'',script:'',ytTitle:'',igCaption:'',description:'',schedule:'',viewsYT:0,viewsIG:0,rights:false,notes:`Inspiration: ${saved.url}\nNiche: ${x.niches.join(', ')}\nStudy the hook and build original visuals/script. This video is NOT licensed for reuse.`,createdAt:now,updatedAt:now})}
  save();navigate('studio');notice('Original-content brief added.');return;
 }
 save();navigate('radar');notice('Added to Viral radar (research only).');
}
function radarPage(){
 const trends=state.trends||[];
 const sorted=[...trends].sort((a,b)=>latestView(b)-latestView(a));
 const hits=trends.filter(t=>latestView(t)>=state.viralThreshold).length;
 const rising=trends.filter(t=>velocity(t)!==null&&velocity(t)>0).length;
 return `${heading('TREND RESEARCH · YOUTUBE & INSTAGRAM','Viral radar','Save popular Shorts and Reels, track their views and identify content angles worth researching.',`<button class="button button-primary" data-action="new-trend">＋ Save a video</button>`)}
 <div class="kpis">
 ${[{a:'Watched videos',v:trends.length,ic:'↗',f:'Unique YouTube / Instagram URLs'},{a:'Above threshold',v:hits,ic:'🔥',f:`≥ ${compact(state.viralThreshold)} views`},{a:'Growing since last check',v:rising,ic:'↑',f:'Requires checks at least 1h apart'},{a:'Top recorded views',v:compact(sorted.length?latestView(sorted[0]):0),ic:'◉',f:'Reference figures, not verified live'}].map(k=>`<div class="kpi"><div class="kpi-head"><span>${k.a}</span><span class="kpi-icon">${k.ic}</span></div><div class="kpi-value">${k.v}</div><div class="kpi-foot">${k.f}</div></div>`).join('')}</div>
 <div class="grid-main" style="margin-bottom:23px"><section class="panel"><div class="panel-head"><h2>How the tracker works</h2></div><div class="step"><div class="step-number">1</div><div><div class="step-title">Save the link and view count</div><div class="step-text">Paste a YouTube Short or Instagram Reel URL; enter the publicly displayed views manually to begin.</div></div></div><div class="step"><div class="step-number">2</div><div><div class="step-title">Update views or import a YouTube report</div><div class="step-text">Our optional YouTube API workflow can refresh saved Shorts' public views. Instagram third-party counts must be entered manually until an approved integration supports them.</div></div></div><div class="step"><div class="step-number">3</div><div><div class="step-title">Compare winners and create original briefs</div><div class="step-text">Flag videos over your chosen threshold. Compare dated growth snapshots, export a report, and plan your own take on a topic.</div></div></div><div class="notice warn">Research links are not downloadable footage or a licence to repost. Reused clips may fail copyright or monetisation rules even with subtitles.</div></section>
 <section class="panel"><div class="panel-head"><h2>Threshold & reports</h2></div><form id="radar-settings"><div class="form-field"><label for="views-threshold">Flag any video with at least this many views</label><input id="views-threshold" class="field" type="number" name="threshold" min="1" max="100000000000" step="1" value="${state.viralThreshold}" required></div><div style="margin:12px 0"><button class="button button-primary small" type="submit">Apply threshold</button></div></form><div class="separator"></div><div class="split-buttons"><button class="button small" data-action="import-trends">⇧ Import YouTube metrics</button><button class="button small" data-action="export-trends">⇩ Download report</button></div><input type="file" id="trend-file" accept=".json,application/json" hidden><p class="footnote">The free <code>Get YouTube trend metrics</code> GitHub workflow uses an API key stored as a GitHub secret, not in your browser. Without it, use the manual watchlist today.</p></section></div>
 <h2 class="section-title">Tracked Shorts and Reels <span class="tiny-muted">${trends.length} saved</span></h2>
 ${trends.length?`<div class="tablewrap"><table class="data-table"><thead><tr><th>Video / source</th><th>Views</th><th>Since last check</th><th>Trend flag</th><th>Actions</th></tr></thead><tbody>${sorted.map(t=>{const v=velocity(t);return `<tr><td class="title-cell">${esc(t.title)}<span class="subcell">${esc(t.platform)} · ${esc(t.creator||'Creator not specified')} · <a href="${esc(t.url)}" target="_blank" rel="noopener noreferrer" class="radar-link">Open original ↗</a></span></td><td><strong>${num(latestView(t))}</strong><span class="subcell">${esc(t.snapshots?.at(-1)?.source||'Manual')} · ${esc(t.snapshots?.at(-1)?.date?.slice(0,10)||'')}</span></td><td>${v===null?'<span class="tiny-muted">Need checks 1h apart</span>':`<strong style="color:${v>0?'#59ddb3':'#b1bed3'}">${v>0?'+':''}${num(v)}/day</strong>`}</td><td>${viralTag(t)}</td><td><div class="inline-actions"><button class="kebab" data-action="edit-trend" data-id="${esc(t.id)}">Update</button><button class="kebab" data-action="idea-trend" data-id="${esc(t.id)}" ${state.channels.length?'':'disabled'}>Idea</button><button class="kebab" data-action="delete-trend" data-id="${esc(t.id)}">×</button></div></td></tr>`}).join('')}</tbody></table></div>`:empty('↗','No viral references saved','Paste a Reel or Short and its view count to start spotting patterns.','Save first video','new-trend')}
 <p class="footnote">A high view count is not proof of growth or future performance. Views can differ by platform and measurement method; cross-platform rankings are only indicative. Snapshots are stored locally in this browser.</p>`;
}
function openTrend(id){const t=id?state.trends.find(x=>x.id===id):null;const co=t||{title:'',url:'',creator:'',publishedAt:'',notes:'',permission:'reference',snapshots:[]};
 showModal(modalFrame(t?'Update viral reference':'Save viral reference',`<div class="form-grid">
 ${input('title','Video title or descriptive label',co.title,'e.g. Funny gaming reaction','text','required maxlength="150"')}
 ${input('creator','Original creator (optional)',co.creator,'@creator')}
 ${input('url','Short or Reel link',co.url,'https://www.youtube.com/shorts/...','url','required')}
 ${input('views','Current public view count',t?latestView(t):'', 'e.g. 850000','number','required min="0" step="1"')}
 ${input('publishedAt','Date posted (optional)',co.publishedAt||'','','date')}
 ${select('permission','Footage usage status',co.permission||'reference',[['reference','Research only — no reuse permission'],['permission','Permission/licence obtained'],['owned','I own the footage']])}
 ${textarea('notes','Why this video works / your original angle',co.notes,'What is the hook? How could you make a distinct, original version?',4)}
 </div><p class="footnote">Only the link, manually entered metrics and notes are stored. Updating a view count creates a dated snapshot; repeat checks can estimate growth. This does not download or copy the video.</p>`,t?'Save updated metrics':'Save reference'));
 $('#editor-form').dataset.entity='trend';$('#editor-form').dataset.id=id||'';
}
function submitTrend(form){const fd=new FormData(form),get=k=>str(fd.get(k)),url=get('url');const platform=originOk(url);const views=Number(get('views'));const today=new Date().toISOString();
 if(!platform){notice('Use a valid HTTPS YouTube or Instagram URL.');return}
 if(!get('title')){notice('Enter a video label.');return}
 if(!Number.isSafeInteger(views)||views<0){notice('Views must be a whole number.');return}
 const id=form.dataset.id;const existing=id?state.trends.find(t=>t.id===id):null;const normalized=normUrl(url);
 if(state.trends.some(t=>t.id!==id&&normUrl(t.url)===normalized)){notice('Already tracking this video. Update the existing entry.');return}
 const data={url:normalized,platform,title:get('title').slice(0,150),creator:get('creator').slice(0,100),publishedAt:get('publishedAt'),permission:get('permission'),notes:get('notes').slice(0,2500),updatedAt:today};
 if(existing){Object.assign(existing,data);if(latestView(existing)!==views){existing.snapshots.push({date:today,views,source:'Manual'});existing.snapshots=existing.snapshots.slice(-100)}}
 else state.trends.push({id:uid(),...data,createdAt:today,snapshots:[{date:today,views,source:'Manual'}]});
 $('#modal').close();save();render();notice(existing?'Reference updated.':'Reference saved.');
}
function deleteTrend(id){if(!confirm('Remove this saved viral reference and its snapshots?'))return;state.trends=state.trends.filter(t=>t.id!==id);save();render();notice('Reference removed.')}
function ideaTrend(id){const t=state.trends.find(x=>x.id===id);if(!t||!state.channels.length){notice('Create a channel first.');return}
 const now=new Date().toISOString();state.projects.push({id:uid(),title:`Original take: ${t.title}`.slice(0,150),kind:'original',channelId:state.channels[0].id,status:'idea',sourcePath:'',sourceUrl:'',start:0,duration:35,voiceMode:'basic',audioPath:'',script:'',ytTitle:'',igCaption:'',description:'',schedule:'',viewsYT:0,viewsIG:0,rights:false,notes:`Inspiration: ${t.url}\nOriginal creator: ${t.creator||'unspecified'}\nCreate an original script/angle, original assets and voiceover. Do not copy source footage without rights.\nTrend notes: ${t.notes||'Review the hook and format.'}`,createdAt:now,updatedAt:now});save();render();notice('Original video idea added to Content studio.');}
function exportTrends(){const data={report_version:1,generated_at:new Date().toISOString(),threshold:state.viralThreshold,items:[...state.trends].sort((a,b)=>latestView(b)-latestView(a)).map(t=>({platform:t.platform,title:t.title,creator:t.creator,url:t.url,views:latestView(t),above_threshold:latestView(t)>=state.viralThreshold,views_per_day_since_previous_snapshot:velocity(t),published_at:t.publishedAt,usage_status:t.permission,notes:t.notes,last_checked:t.snapshots?.at(-1)?.date}))};downloadJSON(`viral-radar-report-${new Date().toISOString().slice(0,10)}.json`,data);notice('Trend report downloaded.');}
function importTrends(file){if(!file)return;if(file.size>1024*1024){notice('Trend report is too large.');return}const reader=new FileReader();reader.onload=()=>{try{
  const r=JSON.parse(reader.result);if(r.report_version!==1||!Array.isArray(r.items)||r.items.length>300)throw Error('Unsupported trend format');
  let count=0,added=0;for(const item of r.items){if(!item||!originOk(item.url)||!Number.isSafeInteger(item.views)||item.views<0)continue;
   const url=normUrl(item.url),date=new Date().toISOString();const existing=state.trends.find(t=>normUrl(t.url)===url);
   if(existing){if(latestView(existing)!==item.views){existing.snapshots.push({date,views:item.views,source:item.source==='youtube_api'?'YouTube API':'Imported'});existing.snapshots=existing.snapshots.slice(-100)}if(!existing.title&&item.title)existing.title=str(item.title).slice(0,150);existing.updatedAt=date;count++}
   else{state.trends.push({id:uid(),platform:originOk(url),url,title:str(item.title||'Untitled Short').slice(0,150),creator:str(item.creator||'').slice(0,100),publishedAt:str(item.published_at||'').slice(0,10),notes:'Imported reference — check rights before reusing content.',permission:'reference',createdAt:date,updatedAt:date,snapshots:[{date,views:item.views,source:item.source==='youtube_api'?'YouTube API':'Imported'}]});count++;added++}
  }
  if(!count)throw Error('No valid entries');state.trends=state.trends.slice(-1000);save();render();notice(`Imported ${count} entries (${added} new).`);
 }catch(e){notice('Could not import. Choose a valid Viral Radar report.')}};reader.readAsText(file)}

function navigate(next){page=next;location.hash=next;filter='all';render();$('.sidebar').classList.remove('show');window.scrollTo({top:0,behavior:'instant'});}
function showModal(content){$('#modal-body').innerHTML=content;$('#modal').showModal()}
function modalFrame(title,body,save='Save changes'){return `<form id="editor-form"><div class="modal-top"><h2>${esc(title)}</h2><button type="button" data-action="close-modal" aria-label="Close">×</button></div><div class="modal-body">${body}</div><div class="modal-footer"><button type="button" class="button button-ghost" data-action="close-modal">Cancel</button><button class="button button-primary" type="submit">${esc(save)}</button></div></form>`}
function input(name,label,value='',placeholder='',type='text',extra=''){return `<div class="form-field"><label for="field-${name}">${label}</label><input class="field" id="field-${name}" name="${name}" value="${esc(value)}" placeholder="${esc(placeholder)}" type="${type}" ${extra}></div>`}
function select(name,label,value,options){return `<div class="form-field"><label for="field-${name}">${label}</label><select class="field" id="field-${name}" name="${name}">${options.map(([v,l])=>`<option value="${esc(v)}" ${value===v?'selected':''}>${esc(l)}</option>`).join('')}</select></div>`}
function textarea(name,label,value='',help='',rows=4){return `<div class="form-field span2"><label for="field-${name}">${label}</label><textarea class="field" name="${name}" id="field-${name}" rows="${rows}">${esc(value)}</textarea>${help?`<div class="field-help">${esc(help)}</div>`:''}</div>`}
function openChannel(id){const c=id?channel(id):null;const co=c||{name:'',niche:'',color:palettes[0],youtubeHandle:'',instagramHandle:'',tiktokHandle:'',facebookHandle:'',notes:''};showModal(modalFrame(c?'Edit channel':'Create channel',`<div class="form-grid">${input('name','Channel / brand name',co.name,'e.g. Pixel Highlights','text','required maxlength="80"')}${input('niche','Content niche',co.niche,'Gaming clips, AI stories, podcasts')}${input('youtubeHandle','YouTube handle (optional)',co.youtubeHandle,'@mybrand')}${input('instagramHandle','Instagram handle (optional)',co.instagramHandle,'@mybrand')}${input('tiktokHandle','TikTok username (optional)',co.tiktokHandle,'@mybrand')}${input('facebookHandle','Facebook Page (optional)',co.facebookHandle,'Page name')}${select('color','Channel colour',co.color,palettes.map((v,i)=>[v,['Violet','Pink','Teal','Orange','Green','Blue'][i]]))}${textarea('notes','Brand notes',co.notes,'Target audience, editorial tone, posting ideas.')}</div><p class="footnote">Handles are labels only. No accounts are linked in this version.</p>${c?`<button type="button" class="button button-danger tiny" data-action="delete-channel" data-id="${c.id}">Delete channel and projects</button>`:``}`,c?'Save channel':'Create channel'));$('#editor-form').dataset.entity='channel';$('#editor-form').dataset.id=id||''}
function openProject(id,opts={}){
 if(!state.channels.length){notice('Add a channel first so the project has somewhere to go.');openChannel();return}
 const p=id?state.projects.find(x=>x.id===id):null;
 const co=p||{title:'',kind:opts.kind||'clip',channelId:opts.channelId||state.channels[0].id,status:'idea',sourcePath:'',sourceUrl:'',start:0,duration:35,script:'',voiceMode:'none',audioPath:'',ytTitle:'',description:'',igCaption:'',schedule:'',viewsYT:0,viewsIG:0,viewsTT:0,viewsFB:0,revenueYT:0,revenueIG:0,revenueTT:0,revenueFB:0,rights:false,notes:''};
 showModal(modalFrame(p?'Edit content project':'Create content project',`<div class="form-grid">
 ${input('title','Internal project title',co.title,'e.g. Funniest last-minute win','text','required maxlength="150"')}
 ${select('channelId','Channel',co.channelId,state.channels.map(c=>[c.id,c.name]))}
 ${select('kind','Content type',co.kind,[['clip','Clip from licensed footage'],['original','Original narrated video']])}
 ${select('status','Workflow status',co.status,[['idea','Idea'],['draft','Draft'],['ready','Ready for review'],['scheduled','Scheduled (plan only)'],['published','Published (manual record)']])}
 ${input('sourcePath','Source media path (rendering)',co.sourcePath,'assets/my-video.mp4')}
 ${input('sourceUrl','Direct HTTPS media URL (optional)',co.sourceUrl,'https://example.com/my-video.mp4','url')}
 ${input('start','Clip start · seconds',co.start,'0','number','min="0" step="0.1"')}
 ${input('duration','Video duration · seconds',co.duration,'35','number','min="3" max="'+(co.kind==='original'?600:180)+'" step="1" required')}
 ${select('captionStyle','Caption style',co.captionStyle||'classic',[['classic','Classic subtitles'],['word-pop','Animated word-group captions (approximate)'],['kinetic','Kinetic pop captions (best with timed subtitles)'],['hook','Headline at top only — keep streamer audio'],['none','No captions or text']])}
 ${select('cropFocus','Crop focus',co.cropFocus||'center',[['center','Center'],['left','Left side'],['right','Right side'],['smart-face','Track visible face (optional OpenCV; falls back to centre)']])}
 ${select('motion','Motion preset',co.motion||'none',[['none','Steady'],['gentle-pan','Gentle horizontal pan']])}
 ${select('background','Original video background (if no footage)',co.background||'midnight',[['midnight','Midnight grid'],['ocean','Ocean grid'],['plum','Plum grid']])}
 ${select('voiceMode','Narration',co.voiceMode,[['none','No voice-over — keep streamer audio'],['kokoro','AI narrator (choose below)'],['basic','Basic robotic voice (Flite)'],['file','Upload my own voice recording']])}
 ${select('voiceName','AI narrator voice',co.voiceName||'af_heart',[['af_heart','Heart — American female'],['bf_emma','Emma — British female'],['am_michael','Michael — American male'],['bm_george','George — British male']])}
 ${input('audioPath','Optional narration audio path',co.audioPath,'assets/voiceover.mp3')}
 ${input('hookText','Optional opening hook / headline',co.hookText||'','What happens next is unbelievable...')}
 ${textarea('script','Script / subtitles',co.script,'Used for caption overlays. For clips, enter an accurate transcript or your commentary; import automatic timed subtitles from Preview & subtitles, or enter a script.',6)}
 ${textarea('timedCaptions','Timed captions JSON (optional)',co.timedCaptions||'', 'Use [{"start_seconds":0,"end_seconds":1.5,"text":"Hello"}]. Times are relative to the rendered clip and must not overlap. When supplied, these replace approximate word-count captions.',4)}
 <div class="form-field span2"><button type="button" class="button tiny button-ghost" data-action="script-starter">✧ Insert starter script outline</button> <button type="button" class="button tiny button-ghost" data-action="ai-existing" data-id="${esc(co.id||'')}">✧ Write with ChatGPT Pro</button></div>
 ${p?.aiReview?.required?`<div class="form-field span2"><div class="notice warn"><strong>AI-generated narration — manual claim review required.</strong><p>${p.aiReview.claims.length} source${p.aiReview.claims.length===1?'':'s'} supplied by ChatGPT (not verified by Shorts Studio). Check each link and claim before confirming.</p><div class="claim-list">${p.aiReview.claims.map(q=>`<p><a target="_blank" rel="noopener noreferrer" href="${esc(q.source_url)}">Source ↗</a> · ${esc(q.claim)}</p>`).join('')}</div></div><label class="checkbox-row"><input type="checkbox" name="aiReviewed" ${p.aiReview.confirmed?'checked':''}><span>I personally verified the claims against the linked sources and reviewed the script. Editing the narration again will require another review.</span></label></div>`:''}
 ${input('ytTitle','YouTube title (optional)',co.ytTitle,'Defaults to project title')}
 ${input('igCaption','Instagram caption (optional)',co.igCaption,'Optional separate caption')}
 ${textarea('description','Description / hashtags',co.description,'Example: #shorts #gaming',3)}
 ${input('schedule','Planned publishing time',co.schedule||'','','datetime-local')}
 ${input('viewsYT','YouTube views · manually entered',co.viewsYT||0,'0','number','min="0" step="1"')}
 ${input('viewsIG','Instagram views · manually entered',co.viewsIG||0,'0','number','min="0" step="1"')}
 ${input('viewsTT','TikTok views · manually entered',co.viewsTT||0,'0','number','min="0" step="1"')}
 ${input('viewsFB','Facebook Reels views · manually entered',co.viewsFB||0,'0','number','min="0" step="1"')}
 <div class="form-field span2"><h3 style="margin:12px 0 0">Optional performance metrics</h3><p class="secondary-note">Only enter real figures from your own platform analytics. Leave retention empty if it is not available.</p></div>
 ${input('retentionYT','YouTube average percentage viewed',co.retentionYT??'','e.g. 72.5','number','min="0" max="1000" step="0.1"')}
 ${input('retentionIG','Instagram average percentage viewed',co.retentionIG??'','e.g. 65','number','min="0" max="1000" step="0.1"')}
 ${input('likesYT','YouTube likes',co.likesYT||0,'0','number','min="0" step="1"')}
 ${input('likesIG','Instagram likes',co.likesIG||0,'0','number','min="0" step="1"')}
 ${input('followersGained','New followers/subscribers · combined',co.followersGained||0,'0','number','min="0" step="1"')}
 ${input('revenueYT','YouTube earnings (€)',co.revenueYT||0,'0','number','min="0" step="0.01"')}
 ${input('revenueIG','Instagram earnings (€)',co.revenueIG||0,'0','number','min="0" step="0.01"')}
 ${input('revenueTT','TikTok earnings (€)',co.revenueTT||0,'0','number','min="0" step="0.01"')}
 ${input('revenueFB','Facebook earnings (€)',co.revenueFB||0,'0','number','min="0" step="0.01"')}
 ${input('revenueEur','Other / previously recorded earnings (€)',co.revenueEur||0,'0','number','min="0" step="0.01"')}

 ${textarea('notes','Editing notes',co.notes,'Hook, transitions, credit or creative notes',2)}
 <label class="checkbox-row" style="grid-column:1/-1"><input type="checkbox" name="rights" ${co.rights?'checked':''}><span>I own or have appropriate permission to use the source footage and any music. I will review the output before publishing.</span></label>
 </div><p class="footnote">Original narrated projects can render a simple generated background without supplied footage. Clips require owned/licensed footage. YouTube watch URLs cannot be rendered. Enter a direct MP4 link or a media path. No source video is transferred or saved in this browser.</p>${p?`<button type="button" class="button button-danger tiny" data-action="delete-project" data-id="${p.id}">Delete project</button>`:``}`,p?'Save project':'Create project'));
 $('#editor-form').dataset.entity='project';$('#editor-form').dataset.id=id||'';
}
function submitEditor(form){let fd=new FormData(form),raw=k=>str(fd.get(k));let id=form.dataset.id;let now=new Date().toISOString();
 if(form.dataset.entity==='trend'){submitTrend(form);return}
 if(form.dataset.entity==='channel'){
  const data={name:raw('name').slice(0,80),niche:raw('niche'),youtubeHandle:raw('youtubeHandle'),instagramHandle:raw('instagramHandle'),tiktokHandle:raw('tiktokHandle').slice(0,100),facebookHandle:raw('facebookHandle').slice(0,100),color:raw('color'),notes:raw('notes')};
  if(!data.name){notice('Enter a channel name.');return}
  if(id){let existing=channel(id);if(!existing)return;Object.assign(existing,data)}else state.channels.push({id:uid(),...data,createdAt:now});
  notice(id?'Channel updated.':'Channel created.');
 }else{
  const start=Number(raw('start')||0),duration=Number(raw('duration')||35),vYT=Number(raw('viewsYT')||0),vIG=Number(raw('viewsIG')||0),vTT=Number(raw('viewsTT')||0),vFB=Number(raw('viewsFB')||0);
  const ytRetention=raw('retentionYT')===''?null:Number(raw('retentionYT')),igRetention=raw('retentionIG')===''?null:Number(raw('retentionIG'));
  const likesYT=Number(raw('likesYT')||0),likesIG=Number(raw('likesIG')||0),followersGained=Number(raw('followersGained')||0),revenueEur=Number(raw('revenueEur')||0),revenues=Object.fromEntries(['YT','IG','TT','FB'].map(k=>[k,Number(raw('revenue'+k)||0)]));
  if(!raw('title')){notice('Enter a title.');return}
  if(!Number.isFinite(start)||start<0||!Number.isFinite(duration)||duration<3||duration>(raw('kind')==='original'?600:180)){notice('Video duration must be 3–600 seconds for original stories or 3–180 seconds for clips.');return}
  if(![vYT,vIG,vTT,vFB,likesYT,likesIG,followersGained].every(v=>Number.isSafeInteger(v)&&v>=0)){notice('Views, likes and followers must be non-negative whole numbers.');return}
  if(![ytRetention,igRetention].every(v=>v===null||(Number.isFinite(v)&&v>=0&&v<=1000))){notice('Percentage viewed must be 0–1000%, or left blank.');return}
  if(![revenueEur,...Object.values(revenues)].every(n=>Number.isFinite(n)&&n>=0&&n<=100000000)){notice('Revenue must be a non-negative euro amount.');return}
  const data={title:raw('title').slice(0,150),kind:raw('kind'),captionStyle:raw('captionStyle'),cropFocus:raw('cropFocus'),motion:raw('motion'),background:raw('background'),channelId:raw('channelId'),status:raw('status'),sourcePath:raw('sourcePath'),sourceUrl:raw('sourceUrl'),start,duration,voiceMode:raw('voiceMode'),voiceName:raw('voiceName'),hookText:raw('hookText').slice(0,95),audioPath:raw('audioPath'),script:raw('script'),timedCaptions:raw('timedCaptions'),ytTitle:raw('ytTitle'),igCaption:raw('igCaption'),description:raw('description'),schedule:raw('schedule'),viewsYT:vYT,viewsIG:vIG,viewsTT:vTT,viewsFB:vFB,revenueYT:revenues.YT,revenueIG:revenues.IG,revenueTT:revenues.TT,revenueFB:revenues.FB,retentionYT:ytRetention,retentionIG:igRetention,likesYT,likesIG,followersGained,revenueEur,notes:raw('notes'),rights:fd.has('rights'),updatedAt:now};
  if(!channel(data.channelId)){notice('Please select a valid channel.');return}
  if(id){const existing=state.projects.find(p=>p.id===id);if(!existing)return;
   if(existing.aiReview?.required){const changed=str(existing.script)!==data.script;existing.aiReview.confirmed = !changed && fd.has('aiReviewed') && existing.aiReview.claims.length>0;existing.aiReview.reviewedAt=existing.aiReview.confirmed?now:null;}
   Object.assign(existing,data)}else state.projects.push({id:uid(),createdAt:now,...data});
  notice(id?'Project updated.':'Project created.');
 }
 $('#modal').close();save();render();
}
function downloadJSON(filename,obj){let blob=new Blob([JSON.stringify(obj,null,2)+'\n'],{type:'application/json'});let link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=filename;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(link.href),3000)}
function jobExport(id){const p=state.projects.find(p=>p.id===id);if(!p)return;
 const issues=renderBlockers(p);if(issues.length){notice(`Cannot export: ${issues[0]}`);return}
 const job=createRenderJob(p);
 const name=(p.title||'video').replace(/[^a-zA-Z0-9-]/g,'-').replace(/-+/g,'-').slice(0,45).toLowerCase();
 downloadJSON(`render-job-${name}.json`,job);notice('Render job exported. Add it to your private GitHub repository jobs/ folder.');
}
function doDemo(){const now=new Date().toISOString();const c=[{id:uid(),name:'Pixel Highlights',niche:'Gaming clips',color:palettes[0],youtubeHandle:'',instagramHandle:'',notes:'Fast edits and humour',createdAt:now},{id:uid(),name:'The Conversation Cut',niche:'Podcast highlights',color:palettes[1],youtubeHandle:'',instagramHandle:'',notes:'Engaging interviews',createdAt:now},{id:uid(),name:'Curiosity Daily',niche:'Original narrated facts',color:palettes[2],youtubeHandle:'',instagramHandle:'',notes:'Science and history',createdAt:now}];state.channels.push(...c);
 state.projects.push({id:uid(),title:'The moment everything changed',kind:'clip',channelId:c[0].id,status:'draft',sourcePath:'assets/example-background.mp4',sourceUrl:'',start:0,duration:8,voiceMode:'none',audioPath:'',script:'This is just a demo caption.\nReplace it with your own licensed footage.',ytTitle:'',igCaption:'',description:'#gaming #shorts',schedule:'',viewsYT:0,viewsIG:0,notes:'Sample only · fictional project',rights:false,createdAt:now,updatedAt:now},{id:uid(),title:'3 things you did not know about space',kind:'original',channelId:c[2].id,status:'idea',sourcePath:'assets/example-background.mp4',sourceUrl:'',start:0,duration:15,voiceMode:'basic',audioPath:'',script:'Space is full of surprises.\nLight from the sun takes about eight minutes to reach Earth.\nWhat would you like to learn next?',ytTitle:'',igCaption:'',description:'#space #facts #shorts',schedule:'',viewsYT:0,viewsIG:0,notes:'Sample only · fictional project',rights:true,createdAt:now,updatedAt:now});state.demo=true;save();render();notice('Added example channels and projects. They are sample data only.')}
function importBackup(file){if(!file)return; if(file.size>2*1024*1024){notice('Backup file is too large.');return}const fr=new FileReader();fr.onload=()=>{try{const data=JSON.parse(fr.result);if(data.version!==1||!Array.isArray(data.channels)||!Array.isArray(data.projects)||data.channels.length>1000||data.projects.length>10000|| (data.scoutReports && (!Array.isArray(data.scoutReports)||data.scoutReports.length>20)) || (data.trends && (!Array.isArray(data.trends)||data.trends.length>1000)) || (data.discovery && (!Array.isArray(data.discovery.items)||data.discovery.items.length>500)))throw Error('Invalid backup format');if(!confirm(`Replace local workspace with ${data.channels.length} channels and ${data.projects.length} projects?`))return;state=data;if(!Array.isArray(state.scoutReports))state.scoutReports=[];if(!Array.isArray(state.trends))state.trends=[];if(!state.discovery || !Array.isArray(state.discovery.items))state.discovery=null;if(!Number.isSafeInteger(state.viralThreshold)||state.viralThreshold<1)state.viralThreshold=100000;save();render();notice('Backup imported.')}catch(err){notice('Cannot import: invalid Shorts Studio backup.')}};fr.readAsText(file)}
// A simple script starter — explicitly not presented as a connected AI service.
function suggestScript(){const title=str($('#field-title')?.value)||'your topic';const target=$('#field-script');if(!target)return;if(target.value.trim()&&!confirm('Replace the existing script with a starter outline?'))return;
 target.value=`[HOOK] Here is something interesting about ${title}.\n\n[MAIN] Explain the most surprising fact in your own words. Include a verifiable source and an example.\n\n[END] What do you think?`;
 notice('Starter outline added. Replace the placeholders with a researched, original script.');}
function downloadText(filename,text){const blob=new Blob([text],{type:'text/plain;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),3000)}
async function copyText(text){try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);notice('Copied.');return}throw Error('fallback')}catch(e){const t=$('#ai-prompt');if(t&&t.value===text){t.focus();t.select();notice('Prompt selected. Press Ctrl+C to copy.')}else notice('Clipboard unavailable: select and copy the text manually.')}}
// v0.12 · Unified production flow. Optional loopback-only Python bridge.
let productionProjectId='';
let productionCues=[];
let productionVideoUrl='';
let productionVideoBlobUrl='';
let productionVideoFile=null;
let productionRenderUrl='';
let productionTask='';
let productionBusy=false;
let productionStoryboardTime=0;
let productionStoryboardTimer=null;
let productionBackend={local:false,ffmpeg:false,transcriber:false};

function productionProject(){return state.projects.find(p=>p.id===productionProjectId)||null}
function productionMediaPath(p){return String(p?.sourcePath||'')}
function productionPreviewUrl(p){
 if(productionVideoUrl)return productionVideoUrl;
 const source=productionMediaPath(p);
 if(source==='assets/example-background.mp4')return source;
 const match=source.match(/^user-data\/media\/([a-f0-9]{32}\.(?:mp4|mov|m4v|webm|mp3|m4a|wav))$/);
 return productionBackend.local&&match?`/local-media/${match[1]}`:'';
}
function productionLoadProject(id){
 productionStopStoryboard();
 if(productionVideoBlobUrl)URL.revokeObjectURL(productionVideoBlobUrl);
 productionProjectId=id||'';productionVideoUrl='';productionVideoBlobUrl='';productionVideoFile=null;productionRenderUrl='';productionTask='';
 try{productionCues=parseTimedCaptions(productionProject()?.timedCaptions,productionProject()?.duration||30)}catch(_){productionCues=[]}
 render();productionCheckBackend();
}
function productionPage(){
 const p=productionProject()||state.projects[0]||null;
 if(p&&!productionProjectId){productionProjectId=p.id;try{productionCues=parseTimedCaptions(p.timedCaptions,p.duration)}catch(_){productionCues=[]}}
 const current=productionProject()||p;
 const src=productionPreviewUrl(current);
 const checks=current?renderBlockers(current):[];
 const last=current?latestRender(current):null;
 const outputUrl=(last&&productionBackend.local?last.url:productionRenderUrl);
 return `${heading('ONE WORKFLOW · v0.14','Production flow','Script → narration → timed captions → preview → MP4, from one page.',`<button class="button button-primary" data-action="production-save" ${!current?'disabled':''}>✓ Save progress</button>`)}
 <div class="production-steps"><div><span>01</span> Prepare</div><div><span>02</span> Subtitles</div><div><span>03</span> Preview</div><div><span>04</span> Export</div></div>
 <div class="notice production-status" id="production-backend">Checking local render engine. The planning editor also works without Python or FFmpeg.</div>
 ${!state.projects.length?`<div class="panel" style="margin:15px 0">${empty('✧','No projects yet','Create a channel and project in Content Studio first, or load demo data to try this production flow.','Create a project','new-content')}<button class="button small" data-action="demo">Load sample channels & projects</button></div>`:''}
 <div class="production-grid"><section class="panel production-editor">
   <div class="panel-head"><h2>1. Prepare your Short</h2><span class="tiny-muted">Saves into your existing project</span></div>
   <div class="form-field"><label for="production-project">Choose a project</label><select class="field" id="production-project">${state.projects.map(x=>`<option value="${esc(x.id)}" ${x.id===current?.id?'selected':''}>${esc(x.title)} · ${esc(channel(x.channelId)?.name||'Unassigned')}</option>`).join('')}</select></div>
   ${current?`<div class="form-field"><label for="production-title">Video title</label><input class="field" id="production-title" maxlength="150" value="${esc(current.title)}"></div>
    <div class="production-pair"><div class="form-field"><label for="production-length">Duration (${current.kind==='original'?'3–600':'3–180'} sec)</label><input class="field" id="production-length" type="number" min="3" max="${current.kind==='original'?600:180}" step=".1" value="${Number(current.duration||30)}"></div>
    <div class="form-field"><label for="production-start">Source start (seconds)</label><input class="field" id="production-start" type="number" min="0" step=".1" value="${Number(current.start||0)}"></div></div>
    <div class="form-field"><label for="production-script">Narration script / spoken words</label><textarea class="field production-script" id="production-script" rows="7" maxlength="10000" placeholder="Paste your researched, original script here…">${esc(current.script||'')}</textarea></div>
    <div class="production-pair"><div class="form-field"><label for="production-voice">Narration</label><select class="field" id="production-voice"><option value="kokoro" ${current.voiceMode==='kokoro'?'selected':''}>Natural AI narrator (four voice choices)</option><option value="basic" ${current.voiceMode==='basic'?'selected':''}>Free basic voice (if FFmpeg supports Flite)</option><option value="none" ${current.voiceMode==='none'?'selected':''}>Original audio / no added voice</option><option value="file" ${current.voiceMode==='file'?'selected':''}>My own narration audio file</option></select></div>
    <div class="form-field"><label for="production-caption-style">Caption style</label><select class="field" id="production-caption-style"><option value="word-pop" ${current.captionStyle==='word-pop'?'selected':''}>Word-pop</option><option value="classic" ${current.captionStyle==='classic'?'selected':''}>Classic</option><option value="kinetic" ${current.captionStyle==='kinetic'?'selected':''}>Kinetic pop</option><option value="hook" ${current.captionStyle==='hook'?'selected':''}>Headline at top only (keep source audio)</option><option value="none" ${current.captionStyle==='none'?'selected':''}>None</option></select></div></div>
    <div class="form-field"><button type="button" class="button button-ghost" data-action="production-remove-commentary">✕ Remove AI commentary — keep streamer audio</button><p class="field-help">One click changes narration to None. If this is an AI story without original audio, output may be silent.</p></div>
    <div class="form-field"><label for="production-voice-name">AI narrator voice</label><select class="field" id="production-voice-name">${[['af_heart','Heart — American female'],['bf_emma','Emma — British female'],['am_michael','Michael — American male'],['bm_george','George — British male']].map(([id,label])=>`<option value="${id}" ${(current.voiceName||'af_heart')===id?'selected':''}>${label}</option>`).join('')}</select><div class="field-help">For AI Stories, generated audio is transcribed to estimate actual spoken-word timing before captions are burned into the video. Voice models run in private GitHub production workflows; the browser preview does not generate them.</div></div>
    <div class="form-field"><label for="production-crop-focus">Framing</label><select class="field" id="production-crop-focus"><option value="center" ${current.cropFocus==='center'?'selected':''}>Center (default)</option><option value="left" ${current.cropFocus==='left'?'selected':''}>Left</option><option value="right" ${current.cropFocus==='right'?'selected':''}>Right</option><option value="smart-face" ${current.cropFocus==='smart-face'?'selected':''}>Follow visible face (requires optional OpenCV)</option></select><div class="field-help">Face tracking only affects the rendered MP4; the browser preview shows unmodified footage. If no face is detected, the renderer uses center crop.</div></div>
    ${current.kind==='original'?`<div class="visuals-editor" id="visuals-editor">
      <div class="panel-head"><h3>Original video visuals</h3><span class="tiny-muted">NEW · v0.14</span></div>
      <div class="form-field"><label for="production-visual-mode">Visual treatment</label>
      <select class="field" id="production-visual-mode"><option value="illustrated" ${(current.visualMode||'illustrated')==='illustrated'?'selected':''}>Illustrated story — cover image, then pictures + captions only</option><option value="storyboard" ${current.visualMode==='storyboard'?'selected':''}>Legacy headline cards</option><option value="classic" ${current.visualMode==='classic'?'selected':''}>Classic single background / supplied footage</option></select></div>
      <div class="production-pair"><div class="form-field"><label for="production-visual-theme">Scene colour palette</label><select class="field" id="production-visual-theme">${[['aurora','Aurora teal'],['ember','Ember orange'],['cosmos','Cosmic violet']].map(([v,l])=>`<option value="${v}" ${current.visualTheme===v?'selected':''}>${l}</option>`).join('')}</select></div>
      <div class="form-field"><label for="production-visual-transition">Scene transitions</label><select class="field" id="production-visual-transition"><option value="fade" ${current.visualTransition!=='cut'?'selected':''}>Soft crossfade</option><option value="cut" ${current.visualTransition==='cut'?'selected':''}>Clean cut</option></select></div></div>
      <div class="form-field"><label for="production-scenes">Story image beats — opening cover first, one picture per next beat</label><textarea class="field" id="production-scenes" rows="5" maxlength="1600" placeholder="How it all started
A surprising discovery
What happened next
Why it matters">${esc((current.visualScenes||[]).map(x=>(x.start_seconds==null?'':x.start_seconds+'@')+x.headline+(x.image_path?' | '+x.image_path:'')).join('\n'))}</textarea>
      <div class="field-help">Use 2–8 scenes: first is a 2-second cover image with the story title, followed by full-screen scene images with NO repeated headlines. Add <code> | user-data/media/image.jpg</code> for each uploaded picture. Optional scene timing: <code>0@Caesar as a child | image.jpg</code>, <code>5@Caesar becomes a soldier | image2.jpg</code>. Starts are seconds into the spoken narration (after the cover). Images must be original or licensed; the app does not generate them yet.</div></div>
      <div class="production-upload"><input type="file" id="production-scene-image" accept="image/png,image/jpeg,image/webp"><label for="production-scene-number">Scene #</label><input class="field" id="production-scene-number" type="number" min="1" max="8" value="1" style="width:70px"><button class="button small" type="button" data-action="production-upload-scene">Attach image to scene #</button><button class="button small button-ghost" type="button" data-action="production-auto-scenes">Suggest scenes from script</button></div>
      <div class="visual-scene-summary" id="visual-scene-summary">Image-first mode: cover title once, then pictures only with spoken-word captions. Use licensed images; actual transition timing and visuals appear in the rendered MP4.</div>
    </div>`:''}
    <div class="form-field"><label>Source video (optional for an original)</label><div class="production-upload"><input id="production-file" type="file" accept="video/*,.mp4,.mov,.webm,.m4v"><button class="button small" data-action="production-upload-video" type="button">Use selected video</button><button class="button small button-ghost" data-action="production-demo" type="button">Use demo footage</button>${current.kind==='original'?'<button class="button small button-ghost" data-action="production-generated" type="button">Use generated background</button>':''}</div><div id="production-source" class="tiny-muted">${esc(productionMediaPath(current)||'No source: original videos use a generated background.')}</div></div>
    <div class="form-field"><label>Optional voice recording (WAV/MP3/M4A)</label><div class="production-upload"><input id="production-audio" type="file" accept="audio/*,.wav,.mp3,.m4a"><button class="button small" data-action="production-upload-audio">Use recording</button></div><div class="tiny-muted" id="production-audio-path">${esc(current.audioPath||'None selected')}</div></div>
    <label class="checkbox-row"><input id="production-rights" type="checkbox" ${current.rights?'checked':''}> I confirm that I have the necessary rights to use this footage, audio and script.</label>
    ${current.aiReview?.required?`<div class="notice warn">This AI-assisted draft needs its claims and cited sources reviewed in the project editor before rendering. <button class="button small" data-action="edit-content" data-id="${esc(current.id)}">Review script sources</button></div>`:''}
    <div class="preview-actions"><button class="button button-primary" data-action="production-save">✓ Save script & settings</button><button class="button" data-action="production-estimate">✦ Estimate caption timings</button></div>
    `:''}
 </section><section class="panel production-timing"><div class="panel-head"><h2>2. Subtitles & preview</h2><span class="tiny-muted" id="production-cue-count">${productionCues.length} cues</span></div>
 <div class="production-video" id="production-stage"><div class="production-backdrop" id="production-backdrop" ${!src&&current?.kind==='original'?'':'hidden'}><img id="production-scene-photo" alt="Uploaded illustration for this part of the story" hidden><div class="production-sky"></div><span id="production-scene-preview">STORYBOARD PREVIEW</span></div><video id="production-video" controls playsinline preload="metadata" src="${esc(src||'')}"></video><div id="production-live-caption" class="preview-caption" role="button" tabindex="0" aria-label="Drag caption to reposition" title="Drag caption to move it" hidden></div><div id="production-video-empty" ${src||current?.kind==='original'?'hidden':''}>Select your video, or preview the included demo.</div></div>
 <div class="preview-actions"><button class="button button-primary small" data-action="production-play">▶ Play preview</button><button class="button small" data-action="production-stop">■ Stop</button><button class="button small" data-action="production-transcribe" ${!current?'disabled':''}>✧ Transcribe source audio</button><button class="button small" data-action="production-import-cues" ${!current?'disabled':''}>⇧ Import subtitles</button><input type="file" id="production-cue-file" hidden accept=".srt,.vtt,.json"></div>
 <div class="panel caption-edit-panel"><h3>Caption text and position</h3><p class="secondary-note">Seek to a caption, edit its wording, then drag it on the preview. Position is preserved in the rendered video.</p>
 <div class="form-field"><label for="production-caption-text">Current subtitle / headline</label><textarea id="production-caption-text" class="field" rows="2" maxlength="160" placeholder="Edit text, then click Apply"></textarea></div>
 <div class="preview-actions"><button class="button small" data-action="production-apply-text">✓ Apply text</button><button class="button small button-ghost" data-action="production-center-text">↔ Reset position</button></div>
 <div class="form-grid">
 <div class="form-field"><label for="production-caption-x">Horizontal (%)</label><input class="field" id="production-caption-x" type="number" min="20" max="80" value="${captionPosition(current,current?.captionStyle).x}"></div>
 <div class="form-field"><label for="production-caption-y">Vertical (%)</label><input class="field" id="production-caption-y" type="number" min="12" max="85" value="${captionPosition(current,current?.captionStyle).y}"></div></div>
 </div>
 <p class="secondary-note">"Estimate" creates approximate captions from your script, not precise speech alignment. "Transcribe" uses optional free faster-whisper and requires the local engine plus uploaded source audio.</p>
 <div id="production-cues" class="production-cues">${productionCues.length?productionCues.map((c,i)=>`<div class="production-cue"><button class="preview-jump" data-action="production-seek" data-index="${i}">${formatPreviewTime(c.start_seconds)}s</button><input class="field" aria-label="Start time" data-production-cue="start_seconds" data-index="${i}" type="number" min="0" step=".01" value="${c.start_seconds}"><input class="field" aria-label="End time" data-production-cue="end_seconds" data-index="${i}" type="number" min="0" step=".01" value="${c.end_seconds}"><input class="field" aria-label="Subtitle text" data-production-cue="text" data-index="${i}" maxlength="160" value="${esc(c.text)}"><button class="kebab" title="Remove cue" data-action="production-remove-cue" data-index="${i}">×</button></div>`).join(''):'<div class="empty-mini">Generate, transcribe or import subtitles to edit them here.</div>'}</div>
 <div class="preview-actions"><button class="button small" data-action="production-add-cue" ${!current?'disabled':''}>＋ Add cue</button><button class="button small" data-action="production-save" ${!current?'disabled':''}>✓ Save cues</button></div>
 </section></div>
 <section class="panel production-final"><div class="panel-head"><h2>3. Produce finished video</h2><span class="tiny-muted">9:16 · MP4</span></div>
 <div class="production-final-grid"><div><p class="secondary-note">Save your changes, review the footage and rights, then render locally. Output is a vertical MP4 saved under <code>user-data/renders/</code>, with a preview below.</p>
 <label class="checkbox-row"><input id="production-autoalign" type="checkbox" checked> If faster-whisper is installed, align generated narration subtitles after rendering (slower, optional)</label>
 <div class="preview-actions"><button class="button button-primary" data-action="production-render" ${!current?'disabled':''}>▶ Render finished MP4</button><button class="button" data-action="production-export" ${!current?'disabled':''}>⇩ Export job JSON</button></div>
 <p class="secondary-note" id="production-progress">${last?(last.approved?'✓ Render reviewed and approved for handoff.':'Rendered MP4 available: finish the review checklist.'):productionRenderUrl?'Video ready below.':'No finished video for this version of the project. No platform publishing occurs here.'}</p>
 ${checks.length?`<div class="notice warn">Current project blockers: ${esc(checks.slice(0,3).join(' · '))}</div>`:''}
 </div><div class="production-output"><video id="production-output-video" controls playsinline ${outputUrl?`src="${esc(outputUrl)}"`:''}></video>${outputUrl?`<a class="button button-primary small" id="production-download" href="${esc(outputUrl)}" download>⇩ Save rendered MP4</a>`:'<p class="tiny-muted">Your rendered MP4 will appear here.</p>'}</div></div>

 <section class="panel production-review" style="margin-top:18px">
  <div class="panel-head"><h2>4. Final quality & rights review</h2><span class="tiny-muted">MANUAL APPROVAL · NEVER AUTO-POST</span></div>
  ${last?
  `<div class="notice ${last.approved?'good':last.quality?.status==='fail'?'warn':''}"><strong>${last.approved?'Approved for manual publishing handoff':'Rendered — awaiting your approval'}</strong> · Technical check: ${esc(last.quality?.status||'not available')} · Rendered ${esc(dateStr(last.renderedAt))}</div>
   <div class="review-quality">
   ${[['Resolution',last.quality?.width&&last.quality?.height?`${last.quality.width} × ${last.quality.height}`:'Unknown'],['Duration',last.quality?.duration_seconds!=null?`${last.quality.duration_seconds}s`:'Unknown'],['Audio',last.quality?.audio_codec||'None'],['File integrity',last.quality?.sha256?'SHA-256 recorded':'Unavailable']].map(([k,v])=>`<div><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join('')}
   </div>
   ${(last.quality?.errors||[]).map(e=>`<p class="review-error">✕ ${esc(e)}</p>`).join('')}
   ${(last.quality?.warnings||[]).map(w=>`<p class="secondary-note">⚠ ${esc(w)}</p>`).join('')}
   ${!last.approved?`<p class="secondary-note">Watch the finished MP4 above, not just the editing preview. Confirm each item before approval:</p>
   <div class="review-checks">
    <label class="checkbox-row"><input type="checkbox" id="review-watched"> I watched and listened to the completed MP4, including the beginning and ending.</label>
    <label class="checkbox-row"><input type="checkbox" id="review-captions"> All spoken words, captions, headline and scene changes are accurate and timed correctly.</label>
    <label class="checkbox-row"><input type="checkbox" id="review-rights"> I checked footage, streamer consent/licence, music, voices and any visible people; I have appropriate usage rights.</label>
    <label class="checkbox-row"><input type="checkbox" id="review-final"> I reviewed factual claims and platform-specific originality requirements. I approve this specific video for manual handoff.</label>
   </div>
   <button type="button" class="button button-primary" data-action="production-approve" ${last.quality?.status==='fail'?'disabled':''}>✓ Approve reviewed video</button>`:
   `<p class="secondary-note">This specific MP4 has been approved. Editing the project invalidates this approval and requires another render and review.</p>`}
   `:
   `<div class="notice warn">No verified finished MP4 for these project settings. Render a video to see its technical report and approval checklist. Exporting job JSON does not count as approving a video.</div>`}
 </section> </section>`;
}
function productionPaint(){const host=$('#production-cues');if(!host)return;
 host.innerHTML=productionCues.length?productionCues.map((c,i)=>`<div class="production-cue"><button class="preview-jump" data-action="production-seek" data-index="${i}">${formatPreviewTime(c.start_seconds)}s</button><input class="field" aria-label="Start time" data-production-cue="start_seconds" data-index="${i}" type="number" min="0" step=".01" value="${c.start_seconds}"><input class="field" aria-label="End time" data-production-cue="end_seconds" data-index="${i}" type="number" min="0" step=".01" value="${c.end_seconds}"><input class="field" aria-label="Subtitle text" data-production-cue="text" data-index="${i}" maxlength="160" value="${esc(c.text)}"><button class="kebab" title="Remove cue" data-action="production-remove-cue" data-index="${i}">×</button></div>`).join(''):'<div class="empty-mini">No timed captions yet.</div>';
 const count=$('#production-cue-count');if(count)count.textContent=`${productionCues.length} cues`;
 productionUpdateOverlay();
}
function productionUpdateScenePreview(){
 const target=$('#production-scene-preview'),bg=$('#production-backdrop'),photo=$('#production-scene-photo');
 if(!target||!bg)return;
 const illustrated=$('#production-visual-mode')?.value==='illustrated';
 bg.dataset.mode=illustrated?'illustrated':'legacy';
 const raw=($('#production-scenes')?.value||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
 const rows=raw.map(line=>{
  const p=line.indexOf(' | ');const head=(p<0?line:line.slice(0,p)).trim();
  const mt=head.match(/^([0-9]+(?:\.[0-9]+)?)@(.+)$/);
  return {headline:mt?mt[2].trim():head,start:mt?Number(mt[1]):null,image:p<0?'':line.slice(p+3).trim()};
 });
 const script=($('#production-script')?.value||'').split(/(?<=[.!?])\s+|\n+/).map(x=>x.trim()).filter(Boolean);
 const current=productionStoryboardTime, duration=Number($('#production-length')?.value)||30;
 let index=0;
 if(illustrated&&rows.length>1){
  const t=Math.max(0,current-2),beats=rows.slice(1);
  const explicit=beats.every(s=>s.start!==null)&&beats[0]?.start===0;
  index=current<2?0:1+(explicit?Math.max(0,beats.findLastIndex(x=>t>=x.start)):Math.min(beats.length-1,Math.floor(t/Math.max(.01,(duration-2)/beats.length))));
 }else{
  const num=rows.length||Math.min(script.length,5)||1;
  index=Math.min(num-1,Math.max(0,Math.floor(current/Math.max(.01,duration/num))));
 }
 const scene=rows[index],label=scene?.headline||script[index]?.slice(0,90)||'STORYBOARD PREVIEW';
 target.textContent=illustrated?(index===0?($('#production-title')?.value||label):''):label;
 bg.dataset.theme=$('#production-visual-theme')?.value||'aurora';
 if(photo){
  const match=scene?.image?.match(/^user-data\/media\/([a-f0-9]{32}\.(?:jpg|jpeg|png|webp))$/);
  const url=match&&productionBackend.local?'/local-media/'+match[1]:'';
  if(url){if(photo.getAttribute('src')!==url)photo.src=url;photo.hidden=false}
  else{photo.hidden=true;photo.removeAttribute('src')}
 }
}
function productionUpdateOverlay(){
 const v=$('#production-video'),caption=$('#production-live-caption');if(!v||!caption)return;
 const p=productionProject(),mode=$('#production-caption-style')?.value||p?.captionStyle||'classic';
 const current=v.getAttribute('src')?(v.currentTime||0)-Number($('#production-start')?.value||0):productionStoryboardTime;
 const i=productionCues.findIndex(x=>current>=x.start_seconds&&current<x.end_seconds);
 const active=i>=0?productionCues[i]:null;
 const words=mode==='hook'?(p?.hookText||p?.title||''):active?.text||'';
 caption.textContent=mode==='none'?'':words;
 caption.hidden=mode==='none'||!words||(mode==='hook'&&current>5.2);
 caption.classList.toggle('caption-is-hook',mode==='hook');
 const coords=captionPosition(p,mode);
 const xEl=$('#production-caption-x'),yEl=$('#production-caption-y');
 overlayPlace(caption,xEl?Math.min(80,Math.max(20,Number(xEl.value)||50)):coords.x,
                       yEl?Math.min(85,Math.max(12,Number(yEl.value)||75)):coords.y);
 const field=$('#production-caption-text');
 if(field&&document.activeElement!==field){
  if(mode==='hook')field.value=p?.hookText||p?.title||'';
  else if(active)field.value=active.text;
 }
 productionUpdateScenePreview();
}
function productionRestoreDisplay(){
 const v=$('#production-video');if(!v)return;
 const url=productionPreviewUrl(productionProject());if(url){v.src=url;v.load()}else{v.pause();v.removeAttribute('src');v.load();}
 const backdrop=$('#production-backdrop');if(backdrop)backdrop.hidden=!!url||productionProject()?.kind!=='original';
 const empty=$('#production-video-empty');if(empty)empty.hidden=!!url||productionProject()?.kind==='original';
 productionUpdateOverlay();
}
function productionStopStoryboard(){if(productionStoryboardTimer){clearInterval(productionStoryboardTimer);productionStoryboardTimer=null;}const v=$('#production-video');if(v)v.pause();productionStoryboardTime=0;productionUpdateOverlay();}
function productionPlayStoryboard(){
 productionStopStoryboard();const v=$('#production-video'),start=Number($('#production-start')?.value||0),duration=Number($('#production-length')?.value||30);
 if(v&&v.getAttribute('src')){v.currentTime=start;v.play().catch(()=>notice('Cannot preview this media in your browser.'));return}
 if(!productionProject()){notice('Choose a project first.');return}
 const began=performance.now();productionStoryboardTimer=setInterval(()=>{productionStoryboardTime=(performance.now()-began)/1000;productionUpdateOverlay();if(productionStoryboardTime>=duration)productionStopStoryboard();},80);
}
async function productionCheckBackend(){
 if(page!=='production')return;
 const node=$('#production-backend');if(!node)return;
 if(!/^https?:$/.test(location.protocol)||!['127.0.0.1','localhost'].includes(location.hostname)){node.textContent='Browser-only mode: planning and exporting jobs work, but one-click MP4 rendering needs OPEN-PRODUCTION-STUDIO.cmd and Python + FFmpeg. No admin access is required if these tools are already available.';return}
 try{
  const response=await fetch('/api/status',{cache:'no-store'});if(!response.ok)throw Error('Unavailable');productionBackend=await response.json();
  node.textContent=productionBackend.ffmpeg?'✓ Local engine ready: you can upload footage and render MP4s on this computer. '+(productionBackend.transcriber?'Speech recognition is available.':'For real speech transcription, optional faster-whisper must be installed.')+' '+(productionBackend.face_tracking?'Face-aware framing is available.':'Optional OpenCV is needed for face-aware framing; otherwise center crop is used.'):'Local server connected, but FFmpeg/ffprobe are missing. You can edit and export jobs; rendering requires FFmpeg.';
  productionRestoreDisplay();
  const last=latestRender(productionProject());
  if(last){
   const player=$('#production-output-video');
   if(player&&!player.getAttribute('src')){player.src=last.url;player.load()}
   let link=$('#production-download');
   if(!link){
    link=document.createElement('a');link.id='production-download';
    link.className='button button-primary small';link.textContent='⇩ Save rendered MP4';
    document.querySelector('.production-output')?.appendChild(link);
   }
   link.href=last.url;link.download='';
  }
 }catch(_){node.textContent='Local rendering engine not connected. Open via OPEN-PRODUCTION-STUDIO.cmd, or export a job JSON for later.'}
}
function productionDraftSave(){
 const p=productionProject();if(!p)throw Error('Choose a project first.');
 const title=str($('#production-title')?.value).slice(0,150);
 const script=$('#production-script')?.value||'';
 const duration=Number($('#production-length')?.value);
 const start=Number($('#production-start')?.value);
 if(!title)throw Error('Enter a video title.');
 if(!Number.isFinite(duration)||duration<3||duration>(p.kind==='original'?600:180)||!Number.isFinite(start)||start<0)throw Error('Original stories allow up to 600 seconds; clips allow up to 180 seconds.');
 const cues=productionCues.length?parseTimedCaptions(JSON.stringify(productionCues),duration):[];
 const changes=p.script!==script||p.duration!==duration||Number(p.start||0)!==start||p.title!==title;
 if(p.aiReview?.required && changes)p.aiReview.confirmed=false;
 p.title=title;p.script=script;p.duration=duration;p.start=start;
 if(p.kind==='original'){
  const sceneLines=($('#production-scenes')?.value||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  if(sceneLines.length>8)throw Error('Use 1–8 scene headlines.');
  p.visualScenes=sceneLines.map(line=>{const pos=line.indexOf(' | ');let headline=(pos<0?line:line.slice(0,pos)).trim();const image_path=pos<0?'':line.slice(pos+3).trim();let start_seconds=null;const match=headline.match(/^([0-9]+(?:\.[0-9]+)?)@(.+)$/);if(match){start_seconds=Number(match[1]);headline=match[2].trim();}if(!headline||headline.length>95)throw Error('Scene descriptions must be 1–95 characters.');if(image_path&&!/^(user-data\/media\/|assets\/)[A-Za-z0-9._/-]+\.(jpg|jpeg|png|webp)$/i.test(image_path))throw Error('Image paths must be project-relative JPG, PNG or WebP files.');return {headline,image_path,start_seconds};});
  p.visualMode=$('#production-visual-mode')?.value||'illustrated';p.visualTheme=$('#production-visual-theme')?.value||'aurora';p.visualTransition=$('#production-visual-transition')?.value||'fade';
 }
 p.voiceMode=$('#production-voice')?.value||'none';p.voiceName=$('#production-voice-name')?.value||'af_heart';p.captionStyle=$('#production-caption-style')?.value||'classic';p.captionX=captionPosition({captionX:$('#production-caption-x')?.value},p.captionStyle).x;p.captionY=captionPosition({captionY:$('#production-caption-y')?.value},p.captionStyle).y;p.cropFocus=$('#production-crop-focus')?.value||'center';
 p.rights=Boolean($('#production-rights')?.checked);
 p.timedCaptions=cues.length?JSON.stringify(cues):'';p.updatedAt=new Date().toISOString();
 if(!save())throw Error('Cannot save project in this browser. Export a backup.');
 return p;
}
function productionRemoveCommentary(){
 const dropdown=$('#production-voice');
 if(!dropdown){notice('Open a project in Production flow first.');return;}
 dropdown.value='none';
 try{
  productionDraftSave();
  notice('Added voice-over removed. Original stream audio stays if available.');
 }catch(err){notice('Voice set to None but not saved: '+err.message);}
}
function productionApplyText(){
 const p=productionProject();if(!p)return;
 const mode=$('#production-caption-style')?.value||'classic';
 const box=$('#production-caption-text'),value=(box?.value||'').trim();
 if(!value){notice('Enter replacement text.');return;}
 if(mode==='hook'){p.hookText=value.slice(0,95);productionUpdateOverlay();productionSave();return;}
 const v=$('#production-video');
 const now=v?.getAttribute('src')?(v.currentTime||0)-Number($('#production-start')?.value||0):productionStoryboardTime;
 const i=productionCues.findIndex(x=>now>=x.start_seconds&&now<x.end_seconds);
 if(i<0){notice('Move the playhead to a timed caption to replace its text.');return;}
 productionCues[i].text=value.slice(0,160);productionPaint();productionSave();
}
function productionSave(){try{productionDraftSave();notice('Script, timings and settings saved to this project.')}catch(e){notice(e.message)}}
function productionEstimate(){
 const script=$('#production-script')?.value||'';
 const duration=Number($('#production-length')?.value)||30;
 if(!script.trim()||/\[(RESEARCH|EXAMPLE|PAYOFF|HOOK|MAIN|END)\]/i.test(script)){notice('Write a complete script first; research placeholders cannot be timed.');return}
 const words=script.trim().replace(/\s+/g,' ').split(' ').filter(Boolean);
 if(!words.length)return;
 const groups=[];for(let i=0;i<words.length;i+=4)groups.push(words.slice(i,i+4).join(' '));
 if(groups.length>900){notice('Script too long for this caption style.');return}
 const weight=groups.map(c=>Math.max(1,c.split(' ').length));const total=weight.reduce((a,b)=>a+b,0);
 let at=0;productionCues=groups.map((text,i)=>{const start=at;at=i===groups.length-1?duration:at+duration*weight[i]/total;return {start_seconds:+start.toFixed(3),end_seconds:+at.toFixed(3),text}});
 productionPaint();notice('Estimated timings created. These are NOT speech-synchronised; review or run transcription.');
}
async function productionAPI(path,body,filename){
 const headers={'X-Shorts-Studio':'local-0.12'};
 if(!filename)headers['Content-Type']='application/json';else headers['X-Media-Name']=encodeURIComponent(filename);
 const response=await fetch(path,{method:'POST',headers,body:filename?body:JSON.stringify(body)});
 const payload=await response.json();if(!response.ok)throw Error(payload.error||`HTTP ${response.status}`);return payload;
}
async function productionUpload(which){
 const file=$(`#production-${which}`)?.files?.[0];if(!file){notice('Select a local file first.');return}
 if(file.size>600*1024*1024){notice('Files larger than 600 MiB are not supported by the local bridge.');return}
 if(!productionBackend.local){notice('Start the local engine with OPEN-PRODUCTION-STUDIO.cmd before uploading.');return}
 try{
  const p=productionDraftSave();notice(`Saving ${file.name} locally…`);
  const result=await productionAPI('/api/upload',file,file.name);
  if(which==='file'){
   p.sourcePath=result.path;p.sourceUrl='';productionVideoUrl=result.preview_url;
   if($('#production-source'))$('#production-source').textContent=result.path;
   productionRestoreDisplay();
  }else{p.audioPath=result.path;p.voiceMode='file';$('#production-voice').value='file';if($('#production-audio-path'))$('#production-audio-path').textContent=result.path}
  p.updatedAt=new Date().toISOString();save();notice('Media stored locally in user-data/media.');
 }catch(e){notice(`Cannot use media: ${e.message}`)}
}
function productionAutoScenes(){
 const p=productionProject();if(!p||p.kind!=='original')return;
 const text=$('#production-script')?.value||'';
 const sentences=text.split(/(?<=[.!?])\s+|\n+/).map(x=>x.trim()).filter(Boolean);
 if(!sentences.length){notice('Add a narration script first.');return}
 const count=Math.min(5,Math.max(2,sentences.length));
 const headlines=Array.from({length:count},(_,i)=>sentences[Math.min(sentences.length-1,Math.round(i*(sentences.length-1)/Math.max(1,count-1)))].slice(0,90));
 $('#production-scenes').value=['Opening cover — '+($('#production-title')?.value||'Our story').slice(0,60),...headlines].slice(0,8).join('\n');$('#production-visual-mode').value='illustrated';
 notice('Story beats suggested. Attach one original or licensed illustration to EACH line and review the visual accuracy.');
}
async function productionUploadScene(){
 const file=$('#production-scene-image')?.files?.[0];if(!file){notice('Select a JPG, PNG or WebP first.');return}
 if(!productionBackend.local){notice('Open the local rendering engine to upload images.');return}
 if(file.size>25*1024*1024){notice('Scene images must be under 25 MiB.');return}
 if(!/\.(png|jpg|jpeg|webp)$/i.test(file.name)){notice('Use a JPG, PNG or WebP image.');return}
 try{
  const result=await productionAPI('/api/upload',file,file.name);
  const input=$('#production-scenes');const lines=input.value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  if(!lines.length){lines.push('Visual scene');}
  const selected=Number($('#production-scene-number')?.value||1)-1;
  if(!Number.isInteger(selected)||selected<0||selected>=lines.length)throw Error('Choose an existing scene number.');
  lines[selected]=lines[selected].split(' | ')[0]+' | '+result.path;
  input.value=lines.join('\n');$('#production-visual-mode').value='illustrated';
  notice('Image attached to scene '+(selected+1)+'. Save your project next.');
 }catch(e){notice('Could not upload scene image: '+e.message)}
}
function productionGenerated(){const p=productionProject();if(!p||p.kind!=='original')return;productionStopStoryboard();p.sourcePath='';p.sourceUrl='';productionVideoUrl='';save();if($('#production-source'))$('#production-source').textContent='No source: generated background will be used.';productionRestoreDisplay();notice('Generated background selected for this original video.');}
function productionDemo(){const p=productionProject();if(!p)return;
 p.sourcePath='assets/example-background.mp4';p.sourceUrl='';save();productionVideoUrl='assets/example-background.mp4';
 if($('#production-source'))$('#production-source').textContent=p.sourcePath;
 productionRestoreDisplay();notice('Included sample selected. Its licence covers the included test footage only.');
}
async function productionImport(file){if(!file)return;try{if(file.size>400000)throw Error('Subtitle file too large.');const text=await file.text();productionCues=parseTimedCaptions(JSON.stringify(parseSubtitleFile(text,file.name)),Number($('#production-length')?.value));productionPaint();notice(`Imported ${productionCues.length} subtitle cues. Review them before saving.`)}catch(e){notice(`Cannot import subtitles: ${e.message}`)}}
async function productionPoll(id){
 for(let step=0;step<600;step++){
  await new Promise(r=>setTimeout(r,1100));
  const res=await fetch(`/api/task/${encodeURIComponent(id)}`,{cache:'no-store'});
  if(!res.ok)throw Error('Local render status is unavailable.');
  const obj=await res.json();if(page==='production'){$('#production-progress').textContent=obj.message||obj.status;}
  if(obj.status==='done')return obj;
  if(obj.status==='failed')throw Error(obj.message||'Task failed');
 }
 throw Error('Render timed out; check the local server window.');
}
async function productionTranscribe(){const p=productionProject();if(!p)return;
 if(!productionBackend.local){notice('Open the local production engine to transcribe.');return}
 if(!productionBackend.transcriber){notice('faster-whisper is optional and is not installed. Import subtitles or use estimated timings.');return}
 const source=productionMediaPath(p);
 if(!source.startsWith('user-data/media/')){notice('Upload your source video or narration audio through this page first.');return}
 if(productionBusy)return;productionBusy=true;
 try{
  productionDraftSave();const result=await productionAPI('/api/transcribe',{media:p.voiceMode==='file'&&p.audioPath||p.sourcePath,start:p.voiceMode==='file'?0:p.start,duration:p.duration,model:'tiny'});
  const completed=await productionPoll(result.task_id);productionCues=parseTimedCaptions(JSON.stringify(completed.caption_segments),p.duration);productionPaint();notice('Speech transcription complete. Check every word and time before rendering.');
 }catch(e){notice(`Transcription failed: ${e.message}`)}finally{productionBusy=false}
}
async function productionRender(){
 if(productionBusy)return;
 let p;try{p=productionDraftSave();const blockers=renderBlockers(p);if(blockers.length)throw Error(blockers.join(' · '));}catch(e){notice(e.message);return}
 if(!productionBackend.local||!productionBackend.ffmpeg){notice('Rendering needs the local engine plus Python and FFmpeg. Export the job JSON instead.');return}
 if(p.sourcePath&&p.sourcePath!=='assets/example-background.mp4'&&!p.sourcePath.startsWith('user-data/media/')){notice('Select and upload the source video using this page first.');return}
 if(p.voiceMode==='file'&&!p.audioPath.startsWith('user-data/media/')){notice('Upload the voice recording through this page.');return}
 if(p.sourceUrl){notice('The local renderer cannot import social-platform links. Upload authorised media instead.');return}
 productionBusy=true;const prog=$('#production-progress');if(prog)prog.textContent='Sending job to local renderer…';
 try{
  const job=createRenderJob(p);
  job.auto_align=Boolean($('#production-autoalign')?.checked&&productionBackend.transcriber&&p.voiceMode==='basic');
  const result=await productionAPI('/api/render',job);
  const done=await productionPoll(result.task_id);
  productionRenderUrl=done.video_url;
  // Auto-aligned cues are the ones already rendered into this MP4.
  // Save them before computing the render fingerprint, otherwise the
  // final review would incorrectly think the newly rendered video is stale.
  if(Array.isArray(done.caption_segments)){
   productionCues=parseTimedCaptions(JSON.stringify(done.caption_segments),p.duration);
   productionPaint();
   productionDraftSave();
  }
  p.lastRender={url:done.video_url,fingerprint:renderFingerprint(p),quality:done.quality_report||null,renderedAt:new Date().toISOString(),approved:false};
  if(!save())throw Error('Video rendered but could not save review status. Export your workspace backup.');
  const vid=$('#production-output-video');if(vid){vid.src=productionRenderUrl;vid.load()}
  let link=$('#production-download');if(!link){link=document.createElement('a');link.id='production-download';link.className='button button-primary small';link.textContent='⇩ Save rendered MP4';document.querySelector('.production-output')?.appendChild(link)}
  link.href=productionRenderUrl;link.download='';
  if(prog)prog.textContent='✓ MP4 ready locally. Watch the full output before uploading to any platform.'+(done.warning?' Note: '+done.warning:'');
  render();notice('Finished MP4 created. Watch it, then complete the approval checklist.');
 }catch(e){if(prog)prog.textContent=`Render failed: ${e.message}`;notice(`Render failed: ${e.message}`)}finally{productionBusy=false}
}
function productionApprove(){
 let p;try{p=productionDraftSave()}catch(e){notice('Save your changes before approval: '+e.message);return}
 const last=latestRender(p);
 if(!p||!last){notice('Render the current version of your video before approving.');return}
 if(!productionBackend.local){notice('The local renderer must be open to review the actual MP4.');return}
 if(last.quality?.status==='fail'||!last.quality){notice('A passing technical quality report is required.');return}
 const issues=renderBlockers(p);
 if(issues.length){notice('Review blocked: '+issues[0]);return}
 const ids=['review-watched','review-captions','review-rights','review-final'];
 if(!ids.every(id=>document.getElementById(id)?.checked)){notice('Complete all four review checks first.');return}
 last.approved=true;last.approvedAt=new Date().toISOString();
 if(!save()){last.approved=false;notice('Review could not be saved.');return}
 render();notice('Approved for manual handoff. No video has been published.');
}
function productionExport(){try{const p=productionDraftSave();const blockers=renderBlockers(p);if(blockers.length)throw Error(blockers.join(' · '));downloadJSON(`production-${p.id}.json`,createRenderJob(p));notice('Render job exported. Actual MP4 requires Python/FFmpeg or GitHub later.')}catch(e){notice(e.message)}}

function handleClick(ev){let nav=ev.target.closest('[data-nav]');if(nav){navigate(nav.dataset.nav);return}let btn=ev.target.closest('[data-action]');if(!btn)return;let action=btn.dataset.action,id=btn.dataset.id;
 switch(action){case 'series-preview':seriesPreviewAction();break;case 'series-create':seriesCreate();break;case 'series-example':seriesExample();break;case 'series-show-drafts':seriesShowDrafts(id);break;case 'production-approve':productionApprove();break;case 'live-plan':livePlan(id);break;case 'live-delete':state.streamers=(state.streamers||[]).filter(w=>w.id!==id);save();render();notice('Streamer removed.');break;case 'production-remove-commentary':productionRemoveCommentary();break;case 'production-apply-text':productionApplyText();break;case 'production-center-text':moveTextInput('production',true);break;case 'production-play':productionPlayStoryboard();break;case 'production-stop':productionStopStoryboard();break;case 'production-save':productionSave();break;case 'production-estimate':productionEstimate();break;case 'production-upload-video':productionUpload('file');break;case 'production-upload-audio':productionUpload('audio');break;case 'production-demo':productionDemo();break;case 'production-auto-scenes':productionAutoScenes();break;case 'production-upload-scene':productionUploadScene();break;case 'production-generated':productionGenerated();break;case 'production-transcribe':productionTranscribe();break;case 'production-import-cues':$('#production-cue-file')?.click();break;case 'production-add-cue':{const t=productionCues.at(-1)?.end_seconds||0;const len=Number($('#production-length')?.value)||30;if(t<len-.1){productionCues.push({start_seconds:t,end_seconds:Math.min(t+1.5,len),text:'New caption'});productionPaint()}break;}case 'production-remove-cue':productionCues.splice(Number(btn.dataset.index),1);productionPaint();break;case 'production-seek':{const vid=$('#production-video');const cue=productionCues[Number(btn.dataset.index)];if(vid&&cue)vid.currentTime=(Number($('#production-start')?.value)||0)+cue.start_seconds;break;}case 'production-render':productionRender();break;case 'production-export':productionExport();break;case 'new-channel':openChannel();break;case 'edit-channel':openChannel(id);break;case 'new-content':openProject(null,{channelId:btn.dataset.channel,kind:btn.dataset.kind});break;case 'edit-content':openProject(id);break;case 'preview-project':previewSelectProject(id);navigate('preview');break;case 'preview-demo':previewDemo();break;case 'preview-add':previewAddCue();break;case 'preview-seek-start':{let v=$('#preview-video');if(v&&v.readyState)v.currentTime=previewStart();break;}case 'preview-jump':{let v=$('#preview-video'),c=previewSegments[Number(btn.dataset.index)];if(v?.readyState&&c)v.currentTime=previewStart()+c.start_seconds;break;}case 'preview-remove':previewSegments.splice(Number(btn.dataset.index),1);previewPaintCues();break;case 'preview-apply-text':previewApplyText();break;case 'preview-center-text':moveTextInput('preview',true);break;case 'preview-remove-voice':previewRemoveCommentary();break;case 'preview-save':previewSave();break;case 'preview-export-srt':previewExportSRT();break;case 'preview-export-json':previewExportJSON();break;case 'preview-export-job':{if(previewProject())jobExport(previewProjectId);break;}case 'close-modal':$('#modal').close();break;case 'go-studio':navigate('studio');break;case 'export-job':jobExport(id);break;case 'export-batch':exportRenderBatch();break;case 'restore-recovery':restoreRecovery(Number(btn.dataset.index));break;case 'backup':downloadJSON(`shorts-studio-backup-${new Date().toISOString().slice(0,10)}.json`,state);notice('Backup downloaded.');break;case 'import':$('#import-file').click();break;case 'import-scout':$('#scout-file').click();break;case 'import-trends':$('#trend-file').click();break;case 'import-discovery':$('#discovery-file').click();break;case 'export-discovery':if(state.discovery)downloadJSON('youtube-discovery-ranked.json',state.discovery);break;case 'track-discovery':trackDiscovery(id);break;case 'idea-discovery':trackDiscovery(id,true);break;case 'new-trend':openTrend();break;case 'edit-trend':openTrend(id);break;case 'delete-trend':deleteTrend(id);break;case 'idea-trend':ideaTrend(id);break;case 'export-trends':exportTrends();break;case 'export-growth':exportGrowth();break;case 'add-candidate':addCandidate(id,Number(btn.dataset.index));break;case 'demo':doDemo();break;case 'reset':if(confirm('Delete all channels, projects, trend watchlists and manual stats in this browser? This cannot be undone.')){state=initial();save();render();notice('Local workspace reset.')}break;case 'delete-channel':if(confirm('Delete this channel and all its projects?')){state.channels=state.channels.filter(x=>x.id!==id);state.projects=state.projects.filter(x=>x.channelId!==id);$('#modal').close();save();render()}break;case 'delete-project':if(confirm('Delete this project?')){state.projects=state.projects.filter(x=>x.id!==id);$('#modal').close();save();render()}break;case 'script-starter':suggestScript();break;case 'generate-concept':generateConcept();break;case 'ai-load-project':loadAiProject();break;case 'ai-existing':{if($('#modal').open)$('#modal').close();let p=state.projects.find(x=>x.id===id);aiPrefill=p?{topic:p.title,angle:(p.notes||'').slice(0,600),mode:p.kind,channelId:p.channelId,projectId:p.id}:null;navigate('ai');break;}case 'ai-build-prompt':buildAiPrompt();break;case 'ai-copy-prompt':{const t=aiInput('ai-prompt')||buildAiPrompt();if(t)copyText(t);break;}case 'ai-download-prompt':{const t=aiInput('ai-prompt')||buildAiPrompt();if(t)downloadText('chatgpt-shorts-prompt.txt',t);break;}case 'ai-preview':previewAiReply();break;case 'ai-save-draft':saveAiDraft();break;case 'ai-import-file':$('#ai-file').click();break;case 'save-concept':saveConcept(Number(btn.dataset.index));break;case 'copy-caption':{let p=state.projects.find(x=>x.id===id);if(p)copyText([p.ytTitle||p.title,p.description].filter(Boolean).join('\n\n'));break;}}
}
// Drag caption text directly on the video. Save coordinates with each project's final render job.
document.addEventListener('pointerdown',ev=>{
 const target=ev.target.closest('#preview-caption,#production-live-caption');
 if(!target||target.hidden)return;
 const kind=target.id==='preview-caption'?'preview':'production';
 const stage=$('#'+(kind==='preview'?'preview-stage':'production-stage'));
 if(!stage)return;
 captionDragging={kind,target,stage,pointerId:ev.pointerId};
 try{target.setPointerCapture(ev.pointerId)}catch(_){}
 ev.preventDefault();
});
document.addEventListener('pointermove',ev=>{
 if(!captionDragging||ev.pointerId!==captionDragging.pointerId)return;
 const d=captionDragging,rect=d.stage.getBoundingClientRect();
 if(!rect.width||!rect.height)return;
 const x=Math.round(Math.max(20,Math.min(80,(ev.clientX-rect.left)/rect.width*100)));
 const y=Math.round(Math.max(12,Math.min(85,(ev.clientY-rect.top)/rect.height*100)));
 const xEl=$('#'+d.kind+'-caption-x'),yEl=$('#'+d.kind+'-caption-y');
 if(xEl)xEl.value=x;if(yEl)yEl.value=y;
 if(d.kind==='preview')previewUpdateOverlay();else productionUpdateOverlay();
 ev.preventDefault();
});
document.addEventListener('pointerup',ev=>{
 if(!captionDragging||ev.pointerId!==captionDragging.pointerId)return;
 const kind=captionDragging.kind;captionDragging=null;
 if(kind==='preview'){const p=previewProject();if(p){
   const x=Number($('#preview-caption-x')?.value||50),y=Number($('#preview-caption-y')?.value||75);
   p.captionX=x;p.captionY=y;p.updatedAt=new Date().toISOString();save();
   notice('Caption position saved.');}}
 else {try{productionDraftSave();notice('Caption position saved.')}catch(err){notice(err.message)}}
});
document.addEventListener('pointercancel',ev=>{if(captionDragging?.pointerId===ev.pointerId)captionDragging=null;});
document.addEventListener('click',handleClick);
document.addEventListener('submit',ev=>{if(ev.target.id==='live-add-form'){ev.preventDefault();liveAdd(ev.target);return}if(ev.target.id==='editor-form'){ev.preventDefault();submitEditor(ev.target)}if(ev.target.id==='radar-settings'){ev.preventDefault();let n=Number(new FormData(ev.target).get('threshold'));if(Number.isSafeInteger(n)&&n>=1&&n<=100000000000){state.viralThreshold=n;save();render();notice('View threshold updated.')}else notice('Enter a valid views threshold.');}});
document.addEventListener('input',ev=>{if(ev.target.id==='studio-search')applyStudioFilters();
 if(['preview-caption-x','preview-caption-y'].includes(ev.target.id))moveTextInput('preview');
 if(['production-caption-x','production-caption-y'].includes(ev.target.id))moveTextInput('production');if(ev.target.dataset.productionCue){const cue=productionCues[Number(ev.target.dataset.index)];if(cue){const field=ev.target.dataset.productionCue;cue[field]=field==='text'?ev.target.value:Number(ev.target.value);productionUpdateOverlay();}}if(ev.target.dataset.cueField){let s=previewSegments[Number(ev.target.dataset.index)];if(s){let v=ev.target.dataset.cueField;s[v]=v==='text'?ev.target.value:Number(ev.target.value);previewUpdateOverlay();}}});
document.addEventListener('change',ev=>{if(['studio-channel','studio-status','studio-sort'].includes(ev.target.id))applyStudioFilters();if(ev.target.id==='production-caption-style'){const pos=$('#production-caption-y');if(pos){const p=productionProject();if(!p||!Number.isFinite(Number(p.captionY)))pos.value=ev.target.value==='hook'?19:75;}productionUpdateOverlay();}
 if(ev.target.id==='production-project')productionLoadProject(ev.target.value);if(ev.target.id==='production-cue-file'){productionImport(ev.target.files[0]);ev.target.value=''}if(ev.target.id==='preview-overlay-mode'){const p=previewProject();if(p){p.captionStyle=ev.target.value;const y=$('#preview-caption-y');if(y&&!Number.isFinite(Number(p.captionY)))y.value=ev.target.value==='hook'?19:75;previewUpdateOverlay();}}
 if(ev.target.id==='preview-remove-commentary'&&ev.target.checked)previewRemoveCommentary();
 if(ev.target.id==='preview-project')previewSelectProject(ev.target.value);if(ev.target.id==='preview-file')previewSetFile(ev.target.files[0]);if(ev.target.id==='preview-subtitle-file')previewImport(ev.target.files[0]);if(ev.target.dataset.cueField){let s=previewSegments[Number(ev.target.dataset.index)];if(s){s[ev.target.dataset.cueField]=ev.target.dataset.cueField==='text'?ev.target.value:Number(ev.target.value);previewUpdateOverlay();}}if(ev.target.id==='import-file'){importBackup(ev.target.files[0]);ev.target.value=''}if(ev.target.id==='scout-file'){importScout(ev.target.files[0]);ev.target.value=''}if(ev.target.id==='trend-file'){importTrends(ev.target.files[0]);ev.target.value=''}if(ev.target.id==='discovery-file'){importDiscovery(ev.target.files[0]);ev.target.value=''}if(ev.target.id==='ai-file'){importAiFile(ev.target.files[0]);ev.target.value=''}});
document.addEventListener('click',ev=>{let b=ev.target.closest('[data-filter]');if(b){filter=b.dataset.filter;render()}let n=ev.target.closest('[data-discovery-niche]');if(n){discoveryNiche=n.dataset.discoveryNiche;render()}});
document.addEventListener('loadedmetadata',ev=>{if(ev.target.id==='preview-video'){previewFileDuration=ev.target.duration; if(Number.isFinite(previewFileDuration)){let start=previewStart();if(start<previewFileDuration)ev.target.currentTime=start;} }},true);
document.addEventListener('timeupdate',ev=>{if(ev.target.id==='production-video'){productionUpdateOverlay();const v=ev.target,limit=(Number($('#production-start')?.value)||0)+(Number($('#production-length')?.value)||30);if(v.currentTime>=limit)v.pause();}if(ev.target.id==='preview-video'){previewUpdateOverlay();let v=ev.target;if(v.currentTime>=previewStart()+previewDuration()&&v.currentTime>0)v.pause();}},true);
$('#mobile-menu').addEventListener('click',()=>$('.sidebar').classList.toggle('show'));
window.addEventListener('hashchange',()=>{let next=location.hash.slice(1);if(next in views && next!==page){page=next;render()}});
render();
})();
