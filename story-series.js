/* DClips story-series planner (pure, offline, conservative editorial defaults).
 * Platform lengths are recommendations, not guaranteed reach/earnings.
 * Public, credential-free module used by the dashboard and Node tests.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.DClipsSeries=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const PROFILES=Object.freeze({
  IG:Object.freeze({name:'Instagram Reels',target:45,mode:'parts',recommended:'35–60 seconds',max:180,why:'Short, self-contained episodes to encourage completion and discovery.'}),
  YT:Object.freeze({name:'YouTube Shorts',target:60,mode:'parts',recommended:'45–75 seconds',max:180,why:'Each episode should work as a Short. Consider a separate full-length YouTube video later.'}),
  TT:Object.freeze({name:'TikTok',target:70,mode:'parts',recommended:'45–90 seconds',max:180,why:'Hook-driven episodes. Creator Rewards requires separate country eligibility and normally 60+ seconds.'}),
  FB:Object.freeze({name:'Facebook Reels',target:360,mode:'full',recommended:'3–8 minutes',max:600,why:'Try the complete story when it holds attention; split only if it exceeds the available render budget.'})
 });
 const wordCount=s=>(String(s||'').match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu)||[]).length;
 function chunks(script){
  const paragraphs=String(script||'').split(/\n+/).map(s=>s.trim()).filter(Boolean);
  const out=[];
  for(const para of paragraphs){
   // Never split a sentence just to meet a duration. Very long sentences
   // stay intact and produce an explicit editorial warning instead.
   // A full stop inside a decimal is not a sentence boundary.
   const sentences=para.match(/.+?(?:[.!?]+(?:["'”’])?(?=\s|$)|$)/g)||[para];
   for(const sentence of sentences){
    const text=sentence.trim();if(text)out.push({text,words:wordCount(text),
     complete:/[.!?]+(?:["'”’])?$/.test(text)});
   }
  }
  return out;
 }
 function splitParts(units,count){
  if(count<=1)return [{text:units.map(x=>x.text).join(' ').trim(),words:units.reduce((a,x)=>a+x.words,0)}];
  count=Math.min(count,units.length);
  const output=[];
  let from=0,total=units.reduce((n,x)=>n+x.words,0);
  for(let part=0;part<count;part++){
   const remain=count-part;
   if(remain===1){
    const rest=units.slice(from);
    output.push({text:rest.map(x=>x.text).join(' ').trim(),words:rest.reduce((a,x)=>a+x.words,0)});
    break;
   }
   const wanted=total/remain;
   let sum=0,stop=from;
   while(stop<units.length-(remain-1)){
    const next=units[stop].words;
    if(stop>from && sum+next>wanted && Math.abs(sum-wanted)<Math.abs(sum+next-wanted))break;
    sum+=next;stop++;
    if(sum>=wanted)break;
   }
   if(stop<=from)stop=from+1;
   const take=units.slice(from,stop);
   const size=take.reduce((a,x)=>a+x.words,0);
   output.push({text:take.map(x=>x.text).join(' ').trim(),words:size});
   from=stop;total-=size;
  }
  return output;
 }
 function plan(options){
  const script=String(options?.script||'').trim();
  const title=String(options?.title||'').trim();
  if(!title||title.length>150)throw new Error('Enter a story title (up to 150 characters).');
  if(wordCount(script)<12)throw new Error('Write at least 12 spoken words before creating a series.');
  if(script.length>45000)throw new Error('Split very large scripts into separate stories (45,000-character planning limit).');
  const wpm=Number(options?.wpm??145);
  if(!Number.isFinite(wpm)||wpm<100||wpm>200)throw new Error('Narration speed must be 100–200 words per minute.');
  const platforms=options?.platforms||Object.keys(PROFILES);
  if(!Array.isArray(platforms)||!platforms.length||platforms.some(x=>!PROFILES[x]))
   throw new Error('Select at least one supported platform.');
  const words=wordCount(script),estimatedSeconds=Math.round(words/wpm*60);
  const pieces=chunks(script);
  const variants=platforms.map(id=>{
   const profile=PROFILES[id],conf=options?.config?.[id]||{};
   const mode=conf.mode==='full'?'full':conf.mode==='parts'?'parts':profile.mode;
   const target=Number(conf.target??profile.target);
   if(!Number.isFinite(target)||target<15||target>profile.max)
    throw new Error(profile.name+' episode length must be 15–'+profile.max+' seconds.');
   const maximum=profile.max;
   // Even a "full" episode gets split for extremely long stories.
   // A manually selected part count takes priority over the automatic target.
   // The same complete master story is redistributed at natural boundaries.
   const forced=conf.parts==null||conf.parts===''?null:Number(conf.parts);
   if(forced!==null&&(!Number.isInteger(forced)||forced<1||forced>60))
    throw new Error(profile.name+' part count must be a whole number from 1 to 60.');
   const requestedParts=forced??(mode==='full'?Math.max(1,Math.ceil(estimatedSeconds/maximum)):
     Math.max(1,Math.ceil(estimatedSeconds/target)));
   if(requestedParts>60)throw new Error('This script would need over 60 parts on '+profile.name+'. Divide into smaller story chapters first.');
   const split=splitParts(pieces,requestedParts);
   const parts=split.map((item,i)=>{
    const duration=Math.max(1,Math.round(item.words/wpm*60));
    const headline=item.text.split(/[.!?]/)[0].trim().slice(0,94);
    return {number:i+1,total:split.length,seconds:duration,words:item.words,
     script:item.text,hook:headline,
     label:split.length===1?title:title+' — Part '+(i+1)+'/'+split.length};
   });
   const warnings=[];
   if(requestedParts>split.length)warnings.push('Only '+split.length+' complete sentence groups are available. Add proper sentence breaks or rewrite the script to create '+requestedParts+' natural parts.');
   if(pieces.some(p=>!p.complete))warnings.push('Some narration does not end with sentence punctuation. Complete these sentences before rendering; no automatic mid-sentence cuts are allowed.');
   if(parts.some(p=>p.seconds>maximum))warnings.push('Some sentences/parts exceed the render limit. Rewrite those sentences or lower the speaking duration before exporting.');
   if(parts.some(p=>p.seconds>target*1.3)&&split.length>1)warnings.push('Some parts exceed your target by over 30%. The story was kept intact at sentence boundaries.');
   if(parts.some(p=>p.seconds<20)&&parts.length>1)warnings.push('An episode is under 20 seconds; combine or rebalance after editorial review.');
   if(mode==='full'&&split.length>1)warnings.push('Complete story exceeds DClips’ current '+maximum+'-second original-video rendering limit; multiple chapters were suggested.');
   if(id==='TT')warnings.push('TikTok Creator Rewards is not available in all countries (including Ireland at present); duration alone does not qualify a video.');
   return {id,name:profile.name,mode,target,recommended:profile.recommended,
    max:maximum,parts,partCount:parts.length,warnings,why:profile.why};
  });
  return {title,script,wpm,words,estimatedSeconds,platforms:variants,requiresReview:true,
   note:'Sentence/clause-based planning estimates. Review each part for good story boundaries, accurate facts, appropriate art, and actual spoken duration. No videos are generated or posted by planning.'};
 }
 return {PROFILES,plan,wordCount};
});
