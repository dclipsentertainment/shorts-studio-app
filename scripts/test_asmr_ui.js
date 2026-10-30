'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const asmr=require('../asmr.js');
const samples={
 slime:'Squishing slime ASMR',bubbles:'Bubble popping relaxing',
 sand:'Cutting kinetic sand',soap:'Soap shaving ASMR'
};
for(const [profile,title] of Object.entries(samples)){
 const job=asmr.prepare(title);
 assert.equal(job.profile,profile);
 assert.equal(job.duration,16);
 assert.equal(job.kind,'asmr');
 assert.equal(job.review_required,true);
 assert.equal(job.audio_style,'original-synthesised');
 assert.equal(job.visual_style,'stylised-animated-original');
 assert.equal(asmr.describe(job).profile,profile);
}
assert.equal(asmr.prepare('A relaxing satisfying loop').profile,'slime');
assert.equal(asmr.prepare('Watch something satisfying','Soft soap carving').profile,'soap');
assert.throws(()=>asmr.prepare('Hi'),/title/);
assert.throws(()=>asmr.prepare('Test ASMR','x'.repeat(601)),/under 600/);
assert.equal(asmr.filename(new Date('2026-10-30T16:50:00Z'),'a1b2c3'),'cloud-asmr-20261030165000-a1b2c3.json');
const html=fs.readFileSync('index.html','utf8'),app=fs.readFileSync('app.js','utf8');
assert(html.includes('data-nav="asmr"')&&html.includes('asmr.js'));
assert(app.includes("case 'asmr-export':asmrExport()"));
assert(app.includes("cloud-asmr-")||app.includes("window.DClipsASMR.filename"));
assert(app.includes('videoFromArtifactZip'),'ASMR should reuse GitHub artifact video importer');
const vm=require('node:vm');
const input={},elements={};
for(const id of ['main','nav-channel-count','today-date','crumb-current','mobile-menu','toast'])
 elements[id]={innerHTML:'',textContent:'',classList:{toggle(){},add(){},remove(){}},addEventListener(){}};
input['asmr-title']={value:'Gentle bubbly ASMR'};
input['asmr-description']={value:'Soft bubbles popping'};
const document={
 querySelector(sel){return sel.startsWith('#')?input[sel.slice(1)]||elements[sel.slice(1)]||null:null;},
 getElementById(id){return input[id]||elements[id]||null;},
 querySelectorAll(){return []},addEventListener(){},activeElement:null
};
let stored=JSON.stringify({version:1,channels:[],projects:[],seriesPlans:[],scoutReports:[],trends:[],streamers:[]});
const w={DClipsASMR:asmr,DClipsQuick:require('../quick-create.js'),
 DClipsSeries:require('../story-series.js'),
 DClipsCloudPack:require('../cloud-pack.js'),
 DClipsUsageMonitor:{render(){return ''},afterRender(){}},addEventListener(){},scrollTo(){}};
const ctx={
 document,window:w,location:{hash:'#asmr',protocol:'file:',hostname:''},
 localStorage:{getItem(k){return k==='shorts_studio_state_v1'?stored:null},setItem(k,v){if(k==='shorts_studio_state_v1')stored=v},removeItem(){}},
 navigator:{clipboard:{writeText(){return Promise.resolve()}}},
 confirm:()=>true,console,setTimeout(){return 1},clearTimeout(){},Date,Math,Number,JSON,Intl,URL,Blob,Array,Map,Set,String,Object,Boolean,RegExp,performance:{now(){return 0}}};
const altered=app.replace(/}\)\(\);\s*$/,'window.__testASMR={asmrPage,asmrPlanAction,readPlan(){return asmrPlan;}};})();');
assert.notEqual(app,altered);
vm.runInNewContext(altered,ctx,{timeout:8000});
assert(elements.main.innerHTML.includes('TITLE ONLY REQUIRED'));
w.__testASMR.asmrPlanAction();
assert.equal(w.__testASMR.readPlan().profile,'bubbles');
assert(elements.main.innerHTML.includes('Approve concept'));
assert(elements.main.innerHTML.includes('Original')||elements.main.innerHTML.includes('original'));
assert.equal(JSON.parse(stored).projects.length,0,'ASMR generation should not silently publish or modify story drafts');
console.log('PASS: 4 ASMR styles auto-selected from title, review stage, cloud job schema and no forced extra fields.');
