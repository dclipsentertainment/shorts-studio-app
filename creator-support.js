/* Channel defaults and pre-render checks. Estimates are advisory, never billing data. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.DClipsSupport=api;})(typeof window!=='undefined'?window:null,function(){
'use strict';
const presets={history:{name:'History',voice:'bm_george',style:'Cinematic historical illustration, consistent period clothing and locations',captions:'kinetic',platform:'youtube',kind:'story'},stories:{name:'General stories',voice:'af_heart',style:'Warm cinematic illustration, consistent characters and lighting',captions:'kinetic',platform:'instagram',kind:'story'},asmr:{name:'ASMR',voice:'none',style:'Macro satisfying visuals with gentle original sounds',captions:'none',platform:'tiktok',kind:'asmr'}};
function apply(p,preset){p.voiceName=preset.voice==='none'?'af_heart':preset.voice;p.voiceMode=preset.kind==='asmr'?'none':'kokoro';p.captionStyle=preset.captions;p.continuity={...(p.continuity||{}),style:preset.style};p.platform=preset.platform;p.creatorKind=preset.kind||'story';p.factsReviewed=false;return p;}
function review(p,files=[]){const errors=[],warnings=[],words=(p.script||'').trim().split(/\s+/).filter(Boolean).length,scenes=p.visualScenes||[];
 if(!(p.title||'').trim())errors.push('Enter a title.');
 if(words<3)errors.push('Add the narration.');
 if((p.script||'').length>10000)errors.push('Split narration longer than 10,000 characters.');
 if(!/[.!?]["'”’)]?$/.test((p.script||'').trim()))errors.push('Finish the last sentence.');
 if(scenes.length<2||scenes.length>8)errors.push('Prepare a cover and 1–7 scene pictures.');
 if(files.length!==scenes.length||files.some(x=>!x))errors.push('Attach one picture for every scene.');
 if(p.creatorScenesStale)errors.push('Rebuild scene boundaries after changing narration.');
 if(!p.rights)errors.push('Confirm permission to use the script and pictures.');
 if(!p.factsReviewed)errors.push('Review factual claims and sources, or confirm the story is fictional.');
 if(/\[(?:verify|source|citation|fact.?check)[^\]]*\]|\bTODO\b/i.test(p.script||''))errors.push('Resolve verification placeholders in the narration.');
 if(!p.continuity?.characters)warnings.push('Add character/location notes for stronger visual continuity.');
 warnings.push('This check cannot verify historical accuracy or determine image rights.');
 const duration=Math.max(3,Math.ceil(words/145*60+2));
 return {errors,warnings,duration,words,minutes:{low:Math.max(2,Math.ceil(duration/60*2)),high:Math.max(6,Math.ceil(duration/60*8+4))}};
}
function estimateText(r){return `Rough planning estimate: ${r.minutes.low}–${r.minutes.high} GitHub runner minutes; queue time excluded. Actual use varies with voice setup, caching and runner speed. This is not a price quote or a check of your remaining free allowance.`;}
return {presets,apply,review,estimateText};
});
