/* DClips title-first ChatGPT handoff; no API requests or API charges. */
(function(root,factory){const a=factory();if(typeof module==='object'&&module.exports)module.exports=a;if(root)root.DClipsQuick=a;})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const wc=s=>(String(s||'').match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu)||[]).length;
 const plain=(s,max)=>typeof s==='string'?s.trim().slice(0,max):'';
 function prompt(title,description=''){
  title=plain(title,150);description=plain(description,600);
  if(title.length<3)throw Error('Enter a story title of at least 3 characters.');
  return [
  'You are the original story writer and storyboard director for DClips Entertainment.',
  'Generate a COMPLETE story package from ONLY this title and optional description. Do not ask me questions about length, voices, platforms or scenes.',
  'TITLE: '+title,
  'OPTIONAL DESCRIPTION: '+(description||'None: invent an interesting original premise from the title.'),
  'Write 250-550 spoken words, or another natural length if justified. Start with a strong hook; end with a complete satisfying sentence. Never cut off a word, thought or sentence.',
  'Choose fiction or factual. For factual stories research credible facts and give genuine working direct HTTPS citations. Do not invent historical facts, URLs or quotes. If no reliable sources, report the issue instead of making things up.',
  'Create 3-8 chronological visual beats. Each visual beat MUST include a short EXACT narration_quote copied from your narration_script, in the same order. No unrelated random imagery.',
  'For images keep recurring characters visually consistent across age and story progression. The style is vertical 9:16, no text, no logos, leave lower third clear for captions.',
  'Return ONLY one valid JSON object. No Markdown fences. Use exactly these fields:',
  '{',
  ' "schema_version":1,',
  ' "story_title":"Title of the story",',
  ' "story_type":"fiction",',
  ' "narration_script":"Complete spoken narration only with natural ending.",',
  ' "illustration_style":"One consistent visual style with character continuity",',
  ' "scenes":[{"narration_quote":"Exact excerpt from narration_script","visual":"Detailed description of image matching that moment"}],',
  ' "claims":[{"claim":"Material factual claim","source_url":"https://credible-source.example/direct-page"}],',
  ' "review_notes":"Anything the creator should verify before approval"',
  '}',
  'story_type must be fiction or factual. For fiction use claims: []. For factual stories include at least one verified source.',
  'DClips recommends episode counts, platform lengths, voice and scenes AFTER import, so never force the story into arbitrary time cuts.'
  ].join('\n');
 }
 function parse(text){
  if(typeof text!=='string'||text.length>115000)throw Error('ChatGPT response must be under 115 KB.');
  const fence=String.fromCharCode(96).repeat(3);
  let raw=text.trim();if(raw.startsWith(fence))raw=raw.replace(new RegExp('^'+fence+'(?:json)?\\s*','i'),'').replace(new RegExp('\\s*'+fence+'$'),'').trim();
  let d;try{d=JSON.parse(raw)}catch(_){throw Error('Paste the complete JSON response from ChatGPT.');}
  if(!d||typeof d!=='object'||Array.isArray(d)||d.schema_version!==1)throw Error('Story JSON must use schema_version 1.');
  const title=plain(d.story_title,150),script=plain(d.narration_script,10000),type=d.story_type;
  if(title.length<3||wc(script)<60||wc(script)>1300)throw Error('A title and complete 60–1300 word narration are required.');
  if(!/[.!?](?:["'”’])?$/.test(script))throw Error('Story must end on a complete sentence.');
  if(/\[(HOOK|MAIN|END|RESEARCH|PAYOFF|EXAMPLE)\]/i.test(script))throw Error('Replace outline placeholders in the narration.');
  if(type!=='fiction'&&type!=='factual')throw Error('Story type must be fiction or factual.');
  if(!Array.isArray(d.scenes)||d.scenes.length<2||d.scenes.length>8)throw Error('Provide 2–8 matching visual scenes.');
  const normalized=script.replace(/\s+/g,' ').toLowerCase();let last=-1;
  const scenes=d.scenes.map((scene,i)=>{
   if(!scene||typeof scene!=='object')throw Error('Scene '+(i+1)+' is invalid.');
   const quote=plain(scene.narration_quote,250).replace(/\s+/g,' '),visual=plain(scene.visual,750);
   if(quote.length<8||visual.length<15)throw Error('Scene '+(i+1)+' needs a narration quote and visual description.');
   const at=normalized.indexOf(quote.toLowerCase(),last+1);
   if(at<0)throw Error('Scene '+(i+1)+' quote does not appear in the narration in order. Ask ChatGPT to correct its exact quote.');
   last=at;return {quote,visual,offset:at};
  });
  if(!Array.isArray(d.claims)||d.claims.length>12)throw Error('Claims must be an array (0–12 items).');
  const claims=d.claims.map(x=>{
   if(!x||typeof x!=='object')throw Error('Invalid factual claim.');
   const claim=plain(x.claim,400);let u;try{u=new URL(x.source_url)}catch(_){throw Error('Invalid source URL.');}
   if(u.protocol!=='https:'||!u.hostname.includes('.')||u.username||u.password||!claim)throw Error('Claims require direct HTTPS source URLs.');
   return {claim,source_url:u.href};
  });
  if(type==='factual'&&!claims.length)throw Error('Factual stories need sources for human verification.');
  return {title,script,type,scenes,claims,words:wc(script),illustrationStyle:plain(d.illustration_style,400)||'Consistent cinematic illustration, no text',reviewNotes:plain(d.review_notes,1400),estimatedSeconds:Math.round(wc(script)/145*60)};
 }
 function scenesForPart(pack,part,title){
  const script=String(part.script||''),master=pack.script.replace(/\s+/g,' ').toLowerCase();
  const probe=script.replace(/\s+/g,' ').toLowerCase().slice(0,Math.min(60,script.length));
  const start=master.indexOf(probe),end=start<0?-1:start+script.length;
  const opening=script.match(/[^.!?]+[.!?]+/)?.[0]?.trim()||script.slice(0,95);
  let matched=start<0?[]:pack.scenes.filter(x=>x.offset>=start&&x.offset<end).slice(0,7);
  if(!matched.length)matched=[{visual:opening,offset:Math.max(start,0)}];
  const spoken=Math.max(5,wc(script)/145*60);
  const beats=matched.map((x,i)=>{
   const rel=Math.max(0,x.offset-Math.max(0,start)),prefix=master.slice(Math.max(0,start),Math.max(0,start)+rel);
   return {headline:plain(x.visual,95)||opening.slice(0,95),image_path:'',start_seconds:i===0?0:Math.round(wc(prefix)/145*600)/10};
  });
  for(let i=1;i<beats.length;i++)if(beats[i].start_seconds-beats[i-1].start_seconds<1.2)beats[i].start_seconds=beats[i-1].start_seconds+1.2;
  return [{headline:plain(title,95)||'Story cover',image_path:'',start_seconds:null},...beats.filter(x=>x.start_seconds<=spoken-1.2)];
 }
 return {prompt,parse,scenesForPart,wordCount:wc};
});