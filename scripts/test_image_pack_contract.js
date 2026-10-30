const assert=require('node:assert/strict'),q=require('../quick-create.js'),pack=require('../cloud-pack.js');
const sentences=Array.from({length:8},(_,i)=>`Chapter ${i+1} begins with a traveller discovering something unusual near the ancient harbour.`);
function payload(n){return JSON.stringify({schema_version:1,story_title:'A long journey',story_type:'fiction',narration_script:sentences.join(' '),scenes:sentences.slice(0,n).map(s=>({narration_quote:s,visual:'A detailed illustration of the traveller at the harbour.'})),claims:[]});}
assert.throws(()=>q.parse(payload(8)),/2–7/);
const story=q.parse(payload(7));assert(q.imagePrompt(story).startsWith('Create 8 SEPARATE'));
const result=pack.assign(Array.from({length:8},(_,i)=>({name:`0${i+1}-scene.png`,size:100})),8);assert.equal(result.missing.length,0);
console.log('PASS: story beats plus cover fit the eight-image importer contract');
