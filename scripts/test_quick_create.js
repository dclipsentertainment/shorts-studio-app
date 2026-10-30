'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const quick=require('../quick-create.js');
const series=require('../story-series.js');
const sentences=[
 'A young cartographer discovered an old map beneath the floorboards of his family home.',
 'The map showed a lighthouse that had disappeared from every modern atlas decades earlier.',
 'He travelled across the stormy coastline searching for the abandoned building before the winter tides arrived.',
 'At night a faint light shone across the bay even though nobody lived near the lighthouse.',
 'Inside he found a journal describing a sailor who had once saved his grandfather during a terrible storm.',
 'The final page revealed the coordinates of a hidden rescue shelter that was still stocked with supplies.',
 'He realised the old beacon was a warning for sailors instead of an invitation into danger.',
 'At dawn he restored the lamp and shared the journal with the coastal village so the shelter would never be forgotten.'
];
const script=sentences.join(' ');
const response=JSON.stringify({
 schema_version:1,story_title:'The Lost Lighthouse',story_type:'fiction',narration_script:script,
 illustration_style:'Cinematic coastal watercolour with consistent protagonist and no lettering',
 scenes:[
  {narration_quote:'A young cartographer discovered an old map',visual:'An old hand-drawn map uncovered beneath wooden floorboards'},
  {narration_quote:'At night a faint light shone across the bay',visual:'A lonely beacon shining through storm clouds over the sea'},
  {narration_quote:'At dawn he restored the lamp',visual:'A young cartographer lighting the lighthouse beacon at sunrise'}
 ],claims:[],review_notes:'Review all images and narration timing.'
});
const p=quick.parse(response);
assert(p.words>=60);
assert.equal(p.scenes.length,3);
assert(/lower third/i.test(quick.prompt('The Lost Lighthouse','A coastal mystery')));
assert.throws(()=>quick.prompt('Hi'),/title/);
assert.throws(()=>quick.parse(response.replace('At dawn he restored the lamp','A nonexistent scene from another story')),/quote does not appear/i);
assert.throws(()=>quick.parse(JSON.stringify({...JSON.parse(response),narration_script:script.replace(/\.$/,'')})),/complete sentence/i);
const plan=series.plan({title:p.title,script:p.script,wpm:145,platforms:['YT','IG','TT','FB']});
assert.equal(plan.platforms.length,4);
assert(plan.platforms.every(v=>v.parts.every(part=>/[.!?]$/.test(part.script))));
for(const v of plan.platforms){
 for(const part of v.parts){
  const scenes=quick.scenesForPart(p,part,part.label);
  assert(scenes.length>=2&&scenes.length<=8);
  assert.equal(scenes[0].start_seconds,null);
  assert.equal(scenes[1].start_seconds,0);
  assert(scenes.every(x=>!x.image_path),'Never pretend ChatGPT images already exist');
 }
}
const html=fs.readFileSync('index.html','utf8');
assert(html.includes('data-nav="quick"')&&html.includes('quick-create.js'));
const app=fs.readFileSync('app.js','utf8'),inputs={},elements={};
for(const id of ['main','nav-channel-count','today-date','crumb-current','mobile-menu','toast'])
 elements[id]={innerHTML:'',textContent:'',classList:{toggle(){},add(){},remove(){}},addEventListener(){}};
inputs['quick-title']={value:'The Lost Lighthouse'};
inputs['quick-description']={value:'A mysterious beacon and a family secret'};
inputs['quick-json']={value:response};
const document={
 querySelector(sel){return sel.startsWith('#')?inputs[sel.slice(1)]||elements[sel.slice(1)]||null:null;},
 getElementById(id){return inputs[id]||elements[id]||null;},
 querySelectorAll(){return []},addEventListener(){},activeElement:null
};
let saved=JSON.stringify({version:1,channels:[],projects:[],seriesPlans:[],scoutReports:[],trends:[],streamers:[]});
const w={DClipsQuick:quick,DClipsSeries:series,DClipsUsageMonitor:{render(){return ''},afterRender(){}},addEventListener(){},scrollTo(){}};
const context={document,window:w,location:{hash:'#quick',protocol:'file:',hostname:''},
 localStorage:{getItem(k){return k==='shorts_studio_state_v1'?saved:null},setItem(k,v){if(k==='shorts_studio_state_v1')saved=v},removeItem(){}},
 navigator:{clipboard:{writeText(){return Promise.resolve()}}},confirm:()=>true,
 console,setTimeout(){return 1},clearTimeout(){},Date,Math,Number,JSON,Intl,URL,Blob,Array,Map,Set,String,Object,Boolean,RegExp,
 performance:{now(){return 0}}};
const instrument=app.replace(/}\)\(\);\s*$/, 'window.__testQuick={quickPrepare,quickReview,quickCreate,getState(){return state;}};})();');
assert.notEqual(instrument,app);
vm.runInNewContext(instrument,context,{timeout:6000});
assert(elements.main.innerHTML.includes('ONLY THE TITLE IS REQUIRED'));
w.__testQuick.quickPrepare();
assert(elements.main.innerHTML.includes('Paste completed story package'));
inputs['quick-json']={value:response};
w.__testQuick.quickReview();
assert(elements.main.innerHTML.includes('Automatic platform recommendations'));
w.__testQuick.quickCreate();
const st=JSON.parse(saved),expect=plan.platforms.reduce((n,v)=>n+v.partCount,0);
assert.equal(st.channels.length,1,'Quick creator should create default brand automatically');
assert.equal(st.projects.length,expect);
assert.equal(st.seriesPlans.length,1);
assert(st.projects.every(x=>x.status==='draft'&&!x.rights&&x.aiReview?.confirmed===false));
assert(st.projects.every(x=>x.visualMode==='illustrated'&&x.visualScenes.length>=2&&x.visualScenes.every(s=>!s.image_path)));
assert(st.projects.every(x=>x.series?.total>=1&&x.voiceMode==='kokoro'));
console.log('PASS: Title + optional description -> manual ChatGPT handoff -> safe automatic multi-platform draft review; no images or video falsely claimed.');
