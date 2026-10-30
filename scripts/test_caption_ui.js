'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const script=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
assert(html.includes('data-nav="live"'), 'Stream monitor navigation missing');
const controls={};
const elements={};
for(const id of ['main','nav-channel-count','today-date','crumb-current','mobile-menu']){
 elements[id]={textContent:'',innerHTML:'',classList:{toggle(){},remove(){}},addEventListener(){}};
}
const document={
 querySelector(selector){return selector.startsWith('#')?elements[selector.slice(1)]||null:null;},
 querySelectorAll(){return [];},
 addEventListener(type,fn){controls[type]=fn;},
 activeElement:null
};
const events={};
const location={hash:'#preview',protocol:'file:',hostname:''};
const saved={version:1,channels:[{id:'c1',name:'Test creator',niche:'Gaming',color:'#8c7aff'}],
 projects:[{id:'p1',title:'Candidate clip',kind:'clip',channelId:'c1',status:'draft',
  duration:25,start:0,script:'Interesting gameplay',captionStyle:'classic',
  voiceMode:'kokoro',voiceName:'af_heart',timedCaptions:'',rights:true}],
 scoutReports:[],trends:[],streamers:[],discovery:null,viralThreshold:100000,createdAt:'2026-10-30T00:00:00Z'};
const localStorage={getItem(key){return key==='shorts_studio_state_v1'?JSON.stringify(saved):null;},setItem(){},removeItem(){}};
const context={document,location,localStorage,window:{
 DClipsUsageMonitor:{render(){return 'usage';},afterRender(){}},
 addEventListener(name,fn){events[name]=fn;},
 scrollTo(){}
},console,setTimeout,clearTimeout,Date,Math,Number,JSON,Intl,URL,Blob,Array,Map,Set,String,Object,Boolean,RegExp,performance:{now(){return 0}}};
vm.runInNewContext(script,context,{timeout:2500});
const preview=elements.main.innerHTML;
for(const text of ['preview-caption-text','preview-caption-x','preview-caption-y',
 'preview-remove-commentary','preview-apply-text','preview-center-text',
 'Drag caption'])assert(preview.includes(text),'Preview missing '+text);
location.hash='#production';events.hashchange();
const production=elements.main.innerHTML;
for(const text of ['production-remove-commentary','production-caption-text',
 'production-caption-x','production-caption-y','production-apply-text',
 'production-live-caption'])assert(production.includes(text),'Production missing '+text);
location.hash='#live';events.hashchange();
assert(elements.main.innerHTML.includes('Live stream monitor'),'Stream monitor unavailable');
assert(script.includes('caption_x:captionPosition('),'Caption x not exported to render');
assert(script.includes('caption_y:captionPosition('),'Caption y not exported to render');
assert(script.includes("p.voiceMode='none'"),'Removal of narration is not connected');
assert(typeof controls.pointerdown==='function' && typeof controls.pointermove==='function',
 'Drag interactions not installed');
console.log('PASS: caption overwrite, drag placement and voice removal controls render in both editors');
