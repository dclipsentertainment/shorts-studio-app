/* Original, zero-external-API ASMR brief: title + optional description only. */
(function(root,factory){
 const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DClipsASMR=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const profiles={
  slime:{name:'Slime squishing',visual:'Macro-style glossy translucent gel, micro-bubbles, softer compression and subtle camera push-ins.',sound:'Layered stereo wet squishes and tiny pop details synchronized to each press.'},
  bubbles:{name:'Bubble popping',visual:'Macro iridescent bubbles with coloured reflections, airy drifting and expanding burst particles.',sound:'Stereo bubble pops and gentle plinks timed to visible bursts.'},
  sand:{name:'Kinetic sand slicing',visual:'Fine-grained sand material with moving cuts, scattered grains and slow camera motion.',sound:'Fine textured stereo scrapes and small granular clicks following the blade.'},
  soap:{name:'Soap shaving',visual:'Shiny sculpted soap and smooth carving passes with layered soap curls.',sound:'Delicate layered shaving and crisp cutting textures, matched to the movement.'}
 };
 function profileFor(title,description=''){
  const text=(title+' '+description).toLowerCase();
  if(/kinetic.sand|\bsand\b|sand.cutt|sand.slic|sand.crush/.test(text))return 'sand';
  if(/soap|shav|carv|peel/.test(text))return 'soap';
  if(/bubble|pop|foam|balloon/.test(text))return 'bubbles';
  if(/slime|squish|squeeze|squash|jelly|gel|goo|soft.crush/.test(text))return 'slime';
  return 'slime'; // Gentle default for vague "satisfying" titles.
 }
 function colorway(title,description=''){
  const text=(title+' '+description).toLowerCase();
  if(/purple|violet|lavender|lilac|blueberry|indigo/.test(text))return 'lavender';
  if(/pink|rose|red|strawberry|cherry|peach/.test(text))return 'rose';
  if(/gold|yellow|orange|caramel|honey|amber|brown|sand/.test(text))return 'amber';
  return 'mint';
 }
 function soundIntensity(title,description=''){
  const text=(title+' '+description).toLowerCase();
  if(/soft|gentle|calm|quiet|sleep|relax|peace|whisper/.test(text))return 'gentle';
  if(/crunch|crispy|crisp|snapp|strong|hard|loud|sharp/.test(text))return 'crisp';
  return 'balanced';
 }
 function prepare(title,description='',options={}){
  if(typeof title!=='string'||typeof description!=='string')throw Error('Title and description must be text.');
  title=title.trim();description=description.trim();
  if(title.length<3||title.length>150)throw Error('Enter a title between 3 and 150 characters.');
  if(description.length>600)throw Error('Optional description must be under 600 characters.');
  const duration=Number(options.duration??16),variation=Number(options.variation??0);
  if(!Number.isInteger(duration)||duration<8||duration>32)throw Error('Duration must be 8–32 whole seconds.');
  if(!Number.isInteger(variation)||variation<0||variation>9999)throw Error('Variation must be 0–9999.');
  const profile=profileFor(title,description);
  return {
   version:3,kind:'asmr',title,description,profile,
   duration,variation,visual_style:'asmr-pro-shot-sequencer-v3',
   audio_style:'action-synced-foley-v3',colorway:colorway(title,description),
   sound_intensity:soundIntensity(title,description),review_required:true
  };
 }
 function describe(job){
  if(!job||!Object.prototype.hasOwnProperty.call(profiles,job.profile))throw Error('Unknown ASMR style.');
  return {...profiles[job.profile],duration:job.duration,profile:job.profile,colorway:job.colorway||'mint',
   soundIntensity:job.sound_intensity||'balanced',
   sequence:[
    {title:'Material reveal',start:0,end:3,description:'See the surface before the first satisfying movement.'},
    {title:'First action',start:3,end:7,description:'A clear squish, slice, shave or pop with matched audio.'},
    {title:'Texture close-up',start:7,end:11,description:'A closer view of material detail and a different rhythm.'},
    {title:'Payoff and reset',start:11,end:16,description:'The strongest action, then a clean return for a repeatable ending.'}
   ].map(s=>({...s,start:s.start*job.duration/16,end:s.end*job.duration/16}))};
 }
 function filename(now=new Date(),suffix){
  if(!(now instanceof Date)||!Number.isFinite(now.getTime()))throw Error('Invalid time.');
  const stamp=now.toISOString().replace(/\D/g,'').slice(0,14);
  const random=suffix||Math.random().toString(36).slice(2,8).padEnd(6,'0');
  if(!/^[a-z0-9]{6}$/.test(random))throw Error('Invalid export identifier.');
  return 'cloud-asmr-'+stamp+'-'+random+'.json';
 }
 return {prepare,describe,profileFor,colorway,soundIntensity,filename,profiles};
});
