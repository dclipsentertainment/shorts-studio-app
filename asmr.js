/* Original, zero-external-API ASMR brief: title + optional description only. */
(function(root,factory){
 const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DClipsASMR=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const profiles={
  slime:{name:'Slime squishing',visual:'Glowing translucent squishy slime repeatedly compresses, spreads and rebounds.',sound:'Original low wet squish pulses and soft pops.'},
  bubbles:{name:'Bubble popping',visual:'Blue iridescent bubbles expand and burst into delicate particles.',sound:'Original gentle popping and delicate plink sounds.'},
  sand:{name:'Kinetic sand slicing',visual:'A pastel textured sand block is sliced in smooth repeated strokes.',sound:'Original crunchy, grainy scraping sounds.'},
  soap:{name:'Soap shaving',visual:'Soft blue soap is peeled in smooth ribbon-like curls.',sound:'Original delicate slicing and shaving sounds.'}
 };
 function profileFor(title,description=''){
  const text=(title+' '+description).toLowerCase();
  if(/kinetic.sand|\bsand\b|sand.cutt|sand.slic|sand.crush/.test(text))return 'sand';
  if(/soap|shav|carv|peel/.test(text))return 'soap';
  if(/bubble|pop|foam|balloon/.test(text))return 'bubbles';
  if(/slime|squish|squeeze|squash|jelly|gel|goo|soft.crush/.test(text))return 'slime';
  return 'slime'; // Gentle default for vague "satisfying" titles.
 }
 function prepare(title,description=''){
  if(typeof title!=='string'||typeof description!=='string')throw Error('Title and description must be text.');
  title=title.trim();description=description.trim();
  if(title.length<3||title.length>150)throw Error('Enter a title between 3 and 150 characters.');
  if(description.length>600)throw Error('Optional description must be under 600 characters.');
  const profile=profileFor(title,description);
  return {
   version:1,kind:'asmr',title,description,profile,
   duration:16,visual_style:'stylised-animated-original',
   audio_style:'original-synthesised',review_required:true
  };
 }
 function describe(job){
  if(!job||!Object.prototype.hasOwnProperty.call(profiles,job.profile))throw Error('Unknown ASMR style.');
  return {...profiles[job.profile],duration:16,profile:job.profile};
 }
 function filename(now=new Date(),suffix){
  if(!(now instanceof Date)||!Number.isFinite(now.getTime()))throw Error('Invalid time.');
  const stamp=now.toISOString().replace(/\D/g,'').slice(0,14);
  const random=suffix||Math.random().toString(36).slice(2,8).padEnd(6,'0');
  if(!/^[a-z0-9]{6}$/.test(random))throw Error('Invalid export identifier.');
  return 'cloud-asmr-'+stamp+'-'+random+'.json';
 }
 return {prepare,describe,profileFor,filename,profiles};
});