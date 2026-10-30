'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const planner=require('../story-series.js');
const sample=Array.from({length:87},(_,i)=>'Caesar studied Rome and faced many political decisions in life.').join(' ');
const words=planner.wordCount(sample);
assert.equal(words,870,'Synthetic six-minute script should have 870 words');
const plan=planner.plan({title:'Caesar: a life',script:sample,wpm:145,platforms:['IG','YT','TT','FB']});
const expected={IG:8,YT:6,TT:6,FB:1};
for(const v of plan.platforms){
 assert.equal(v.partCount,expected[v.id],v.id+' part count');
 assert.equal(v.parts.reduce((n,x)=>n+x.words,0),words,v.id+' script words lost');
 assert(v.parts.every((p,i)=>p.number===i+1&&p.total===v.partCount&&p.script.length>0));
 assert(v.parts.every(p=>p.seconds>0&&p.seconds<=v.max),v.id+' render max exceeded');
}
assert.throws(()=>planner.plan({title:'',script:sample}),/title/);
assert.throws(()=>planner.plan({title:'X',script:'Hello'}),/12 spoken words/);
assert.throws(()=>planner.plan({title:'X',script:sample,platforms:[]}),/Select at least/);


const forced=planner.plan({title:'Caesar: a life',script:sample,wpm:145,platforms:['YT'],config:{YT:{parts:4,target:90}}}).platforms[0];
assert.equal(forced.partCount,4);
assert.equal(forced.parts.reduce((n,p)=>n+p.words,0),words,'Rebalancing must preserve the complete story');
assert(forced.parts.every(p=>/[.!?]$/.test(p.script)),'Rebalanced cuts must end on sentences');
assert.throws(()=>planner.plan({title:'X',script:sample,platforms:['YT'],config:{YT:{parts:0}}}),/whole number/);
const extremelyLong=Array(120).fill('one extended sentence that cannot be split safely').join(' ') + '.';
const longPlan=planner.plan({title:'One long sentence',script:extremelyLong,platforms:['YT'],config:{YT:{parts:8,target:60}}}).platforms[0];
assert.equal(longPlan.partCount,1,'Must not split single sentences to satisfy a part count');
assert(longPlan.warnings.some(w=>/complete sentence groups/.test(w)),'Warn when natural breaks are insufficient');

const app=fs.readFileSync('app.js','utf8'),html=fs.readFileSync('index.html','utf8');
assert(html.includes('data-nav="series"') && html.indexOf('story-series.js')<html.indexOf('app.js'));
const elements={},inputs={};
for(const id of ['main','nav-channel-count','today-date','crumb-current','mobile-menu','toast'])
 elements[id]={textContent:'',innerHTML:'',classList:{toggle(){},remove(){},add(){}},addEventListener(){}};
for(const [id,value] of Object.entries({'series-title':'Caesar: a life','series-script':sample,
 'series-wpm':'145','series-channel':'ch','series-mode-IG':'parts','series-mode-YT':'parts',
 'series-mode-TT':'parts','series-mode-FB':'full','series-target-IG':'45',
 'series-target-YT':'60','series-target-TT':'70','series-target-FB':'360'}))inputs[id]={value};
for(const id of ['IG','YT','TT','FB'])inputs['series-enabled-'+id]={checked:true};
const document={querySelector(s){return s.startsWith('#')?(inputs[s.slice(1)]||elements[s.slice(1)]||null):null},
 querySelectorAll(){return []},addEventListener(){},activeElement:null};
let saved=JSON.stringify({version:1,channels:[{id:'ch',name:'History',color:'#aabbcc'}],
 projects:[],seriesPlans:[],scoutReports:[],trends:[],streamers:[]});
const context={document,location:{hash:'#series',protocol:'file:',hostname:''},
 localStorage:{getItem(k){return k==='shorts_studio_state_v1'?saved:null},
 setItem(k,v){if(k==='shorts_studio_state_v1')saved=v},removeItem(){}},
 window:{DClipsSeries:planner,DClipsUsageMonitor:{render(){return ''},afterRender(){}},addEventListener(){},scrollTo(){}},
 console,confirm:()=>true,setTimeout,clearTimeout,Date,Math,Number,JSON,Intl,URL,Blob,Array,Map,Set,String,Object,Boolean,RegExp,performance:{now(){return 0}}};
const instrumented=app.replace(/}\)\(\);\s*$/,"window.__seriesTest={seriesPreviewAction,seriesCreate,productionRebalanceSeries,renderFingerprint,seriesRevisionPanel,
 selectProduction(id){productionProjectId=id;page='production';},
 watch(id){const p=state.projects.find(x=>x.id===id);watchedSeriesRenderKey=id+'|'+renderFingerprint(p);},
 getState(){return state;}};})();");
assert(instrumented!==app,'Could not instrument planner UI');
vm.runInNewContext(instrumented,context,{timeout:4000});
assert(elements.main.innerHTML.includes('Story series planner'),'Series page missing');
context.window.__seriesTest.seriesPreviewAction();
assert(elements.main.innerHTML.includes('editable video drafts'),'Series recommendation preview missing');
context.window.__seriesTest.seriesCreate();
const updated=JSON.parse(saved),fb=updated.projects.filter(p=>p.series?.platform==='FB');
assert.equal(updated.seriesPlans.length,1);
assert.equal(updated.projects.length,21);
assert.equal(fb.length,1);
assert(fb[0].duration>180&&fb[0].duration<=600);
assert(updated.projects.every(p=>p.status==='draft'&&p.rights===false&&p.visualMode==='illustrated'));

const internal=context.window.__seriesTest,yt=internal.getState().projects.find(p=>p.series.platform==='YT');
assert(yt,'Need a YouTube episode to review');
yt.lastRender={url:'/output/'+ 'a'.repeat(32) +'/preview.mp4',fingerprint:internal.renderFingerprint(yt)};
internal.selectProduction(yt.id);
assert(internal.seriesRevisionPanel(yt,yt.lastRender,yt.lastRender.url).includes('Play the finished video'),'Controls should remain locked until completed playback');
internal.watch(yt.id);
assert(internal.seriesRevisionPanel(yt,yt.lastRender,yt.lastRender.url).includes('series-adjust-count'),'After preview, number inputs become editable');
for(const [id,value] of Object.entries({'production-title':yt.title,'production-script':yt.script,
 'production-length':String(yt.duration),'production-start':'0','production-scenes':'',
 'production-visual-mode':'illustrated','production-visual-theme':yt.visualTheme,
 'production-visual-transition':yt.visualTransition,'production-voice':yt.voiceMode,
 'production-voice-name':yt.voiceName,'production-caption-style':yt.captionStyle,
 'production-caption-x':'50','production-caption-y':'75','production-crop-focus':'center',
 'series-adjust-count':'4','series-adjust-seconds':'90'})) inputs[id]={value};
inputs['production-rights']={checked:false};
internal.productionRebalanceSeries();
const revised=internal.getState(),currentYT=revised.projects.filter(p=>p.series?.platform==='YT'&&!p.series.superseded);
assert.equal(currentYT.length,4,'Four revised YouTube episodes should be created');
assert.equal(revised.projects.length,25,'Earlier episodes are preserved for comparison');
assert(yt.series.superseded && yt.lastRender,'Previous rendered episode must not be deleted');
assert(currentYT.every(p=>p.series.revision===2&&!p.lastRender&&!p.rights&&!p.timedCaptions),'Revised episodes require new render and rights review');
assert(currentYT.every(p=>/[.!?]$/.test(p.script)),'Each revised video must stop at a real sentence boundary');

console.log('PASS: one six-minute story -> 8 Instagram, 6 YouTube, 6 TikTok and one Facebook draft; rights not auto-approved.');
