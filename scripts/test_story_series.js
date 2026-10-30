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

const app=fs.readFileSync('app.js','utf8'),html=fs.readFileSync('index.html','utf8');
assert(html.includes('data-nav="series"') && html.indexOf('story-series.js')<html.indexOf('app.js'));
const elements={},inputs={};
for(const id of ['main','nav-channel-count','today-date','crumb-current','mobile-menu'])
 elements[id]={textContent:'',innerHTML:'',classList:{toggle(){},remove(){}},addEventListener(){}};
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
 console,setTimeout,clearTimeout,Date,Math,Number,JSON,Intl,URL,Blob,Array,Map,Set,String,Object,Boolean,RegExp,performance:{now(){return 0}}};
const instrumented=app.replace(/}\)\(\);\s*$/,"window.__seriesTest={seriesPreviewAction,seriesCreate};})();");
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
console.log('PASS: one six-minute story -> 8 Instagram, 6 YouTube, 6 TikTok and one Facebook draft; rights not auto-approved.');
