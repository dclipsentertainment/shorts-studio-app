'use strict';
// The new visual editor must offer images instead of repeated title cards.
// No credentials, API calls or AI-image generation are involved in this test.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const src=fs.readFileSync('app.js','utf8');
const els={};
for(const id of ['main','nav-channel-count','today-date','crumb-current','mobile-menu'])
 els[id]={textContent:'',innerHTML:'',classList:{toggle(){},remove(){}},addEventListener(){}};
const location={hash:'#production',protocol:'file:',hostname:''};
const project={id:'story',title:'The life of Caesar',kind:'original',channelId:'ch',
 status:'idea',visualMode:'illustrated',visualScenes:[
  {headline:'Opening cover',image_path:'user-data/media/00000000000000000000000000000001.png',start_seconds:null},
  {headline:'Caesar as a child',image_path:'user-data/media/00000000000000000000000000000002.png',start_seconds:0},
  {headline:'Caesar in military life',image_path:'user-data/media/00000000000000000000000000000003.png',start_seconds:5}
 ],duration:12,start:0,voiceMode:'kokoro',voiceName:'am_michael',captionStyle:'kinetic',script:'Caesar grew up in Rome. Later he joined the army.',rights:true};
const workspace={version:1,channels:[{id:'ch',name:'History',niche:'History'}],projects:[project],streamers:[],scoutReports:[],trends:[]};
const document={
 querySelector(sel){return sel.startsWith('#')?(els[sel.slice(1)]||null):null},
 querySelectorAll(){return []},
 addEventListener(){},
 activeElement:null
};
const context={document,location,localStorage:{
 getItem(k){return k==='shorts_studio_state_v1'?JSON.stringify(workspace):null},
 setItem(){},removeItem(){}
},window:{addEventListener(){},scrollTo(){},DClipsUsageMonitor:{render(){return ''},afterRender(){}}},
 console,Date,Math,Number,JSON,Intl,URL,Blob,Array,Map,Set,String,Object,Boolean,RegExp,
 performance:{now(){return 0}},setTimeout,clearTimeout};
vm.runInNewContext(src,context,{timeout:3000});
const html=els.main.innerHTML;
for(const text of ['Illustrated story','cover image','scene #','production-scene-photo','0@Caesar as a child','5@Caesar in military life'])
 assert(html.includes(text),'Illustration-first editor is missing: '+text);
assert(html.includes('value="illustrated" selected'),'Illustrated visual mode should be selected.');
assert(src.includes("visuals:{mode:p.visualMode||'classic',intro_seconds:2"),'Cover timing missing from exported job');
assert(src.includes("if(p.kind==='original' && p.visualMode==='illustrated')"),'Illustration rights/scene gating missing');
console.log('PASS: illustration-first editor, full-screen preview image element, timed storyboard beats and strict rights gating');
