const assert=require('node:assert/strict'),h=require('./audit_harness.cjs')(),a=h.api;
const p={id:'p',kind:'original',title:'Test',script:'Old words.',duration:30,voiceMode:'kokoro',voiceName:'af_heart',timedCaptions:'[{"start_seconds":1,"end_seconds":2,"text":"Old words."}]'};
p.captionNarrationKey=a.captionNarrationKey(p);assert(!a.captionsAreStale(p));
for(const [key,value] of [['script','New words.'],['voiceName','bm_george'],['audioPath','changed.wav'],['start',3],['duration',45]]){const edited={...p,[key]:value};assert(a.captionsAreStale(edited),key);assert.equal(edited.timedCaptions,p.timedCaptions,'manual wording remains recoverable');}
assert(!a.captionsAreStale({...p,title:'Metadata edit'}));
console.log('PASS: changed script, narrator, audio and timing invalidate captions without deleting manual wording');
