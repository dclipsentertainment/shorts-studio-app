'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const src = fs.readFileSync('app.js','utf8');

function project() {
 return {id:'p',kind:'clip',title:'My licensed gameplay',ytTitle:'',channelId:'ch',sourcePath:'user-data/media/demo.mp4',
  sourceUrl:'',start:0,duration:4,script:'',timedCaptions:'',voiceMode:'none',voiceName:'af_heart',
  audioPath:'',hookText:'What a comeback',captionX:50,captionY:19,captionStyle:'hook',
  cropFocus:'center',motion:'none',background:'midnight',visualMode:'classic',visualTheme:'aurora',
  visualTransition:'fade',visualScenes:[],rights:true,status:'draft'};
}
function fingerprint(p) {
 return JSON.stringify([p.kind||'',p.title||'',p.ytTitle||'',p.sourcePath||'',p.sourceUrl||'',Number(p.start||0),Number(p.duration),
  p.script||'',p.timedCaptions||'',p.voiceMode||'',p.audioPath||'',p.voiceName||'',p.hookText||'',
  p.captionX??50,p.captionY??75,p.channelId,p.captionStyle||'classic',p.cropFocus||'center',
  p.motion||'none',p.background||'midnight',p.visualMode||'classic',p.visualTheme||'aurora',
  p.visualTransition||'fade',JSON.stringify(p.visualScenes||[])]);
}
function html(p){
 const els={};
 for(const id of ['main','nav-channel-count','today-date','crumb-current','mobile-menu'])
   els[id]={innerHTML:'',textContent:'',classList:{toggle(){},remove(){}},addEventListener(){}};
 const doc={querySelector(selector){return selector.startsWith('#')?els[selector.slice(1)]||null:null;},
  querySelectorAll(){return []},addEventListener(){}};
 const save={version:1,channels:[{id:'ch',name:'My brand',color:'#808080'}],projects:[p],
  scoutReports:[],trends:[],streamers:[],viralThreshold:100000};
 const context={document:doc,localStorage:{getItem(k){return k==='shorts_studio_state_v1'?JSON.stringify(save):null;},setItem(){},removeItem(){}},
  location:{hash:'#production',protocol:'file:',hostname:''},window:{addEventListener(){},
    DClipsUsageMonitor:{render(){return ''},afterRender(){}},scrollTo(){}},console,Date,Math,Number,
    JSON,Array,Intl,URL,Blob,Map,Set,String,Object,Boolean,RegExp,setTimeout,clearTimeout,
    performance:{now(){return 0}}};
 vm.runInNewContext(src,context,{timeout:3000});
 return els.main.innerHTML;
}
const p=project();
p.lastRender={url:'/output/'+'a'.repeat(32)+'/sample.mp4',fingerprint:fingerprint(p),
  renderedAt:'2026-10-30T00:00:00Z',approved:false,
  quality:{status:'pass',duration_seconds:4,width:720,height:1280,audio_codec:'aac',sha256:'0'.repeat(64),errors:[],warnings:[]}};
const rendered=html(p);
for(const field of ['review-watched','review-captions','review-rights','review-final','production-approve','SHA-256 recorded'])
  assert(rendered.includes(field),'Review gate missing '+field);
p.title='Modified after rendering';
const outdated=html(p);
assert(!outdated.includes('id="review-watched"'),'Stale render must not be approvable');
assert(outdated.includes('No verified finished MP4'),'Stale output should require new render');
assert(src.includes('if(!productionBackend.local){notice('),'Approval must require accessible MP4');
console.log('PASS: verified render shows quality and approval; changed project invalidates approval.');
