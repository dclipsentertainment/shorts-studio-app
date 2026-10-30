const assert=require('node:assert/strict'),harness=require('./audit_harness.cjs');
function fixture(){const h=harness();const p={id:'p',title:'Original',kind:'original',duration:10,channelId:'ch',voiceMode:'kokoro',script:'A complete story.',timedCaptions:''};h.api.setState({version:1,projects:[p],channels:[{id:'ch',name:'Brand'}]});h.api.select(p.id);return {...h,p,snapshot:JSON.parse(JSON.stringify(p)),fp:h.api.renderFingerprint(p)};}
const output={video_url:'/output/'+'a'.repeat(32)+'/original.mp4',quality_report:{status:'pass',duration_seconds:10}};
let f=fixture();f.p.title='Edited';assert.equal(f.api.completeProductionRender(f.snapshot,f.fp,output,0).current,false);assert.equal(f.api.latestRender(f.p),null);assert.equal(f.api.getState().renderHistory.length,1);
f=fixture();f.api.edit();assert.equal(f.api.completeProductionRender(f.snapshot,f.fp,output,0).current,false);assert.equal(f.api.latestRender(f.p),null);
f=fixture();const second={...f.p,id:'other',title:'Other'};f.api.getState().projects.push(second);f.api.select(second.id);assert.equal(f.api.completeProductionRender(f.snapshot,f.fp,{...output,caption_segments:[{start_seconds:1,end_seconds:3,text:'Original words.'}]},0).current,true);assert.equal(second.timedCaptions,'');assert(f.api.latestRender(f.p));
f=fixture();f.api.getState().projects=[];assert.equal(f.api.completeProductionRender(f.snapshot,f.fp,output,0).current,false);assert.equal(f.api.getState().renderHistory.length,1);
console.log('PASS: immutable render revisions, unsaved edits, project switching and deletion preserve correct output ownership');

f=fixture();let result=f.api.completeProductionRender(f.snapshot,f.fp,{...output,quality_report:{status:'pass',duration_seconds:12.2},caption_segments:[{start_seconds:9,end_seconds:12,text:'The complete ending.'}]},0);
assert(result.current);assert.equal(f.p.duration,12.2);assert.equal(f.p.requestedDuration,10);assert(f.api.latestRender(f.p));
f=fixture();result=f.api.completeProductionRender(f.snapshot,f.fp,{...output,caption_segments:[{start_seconds:9,end_seconds:14,text:'Invalid cue.'}]},0);
assert(result.current);assert(f.p.lastRender.reviewError);assert.equal(f.api.getState().renderHistory.length,1);
console.log('PASS: actual duration reconciled, invalid caption import retains MP4 with blocked approval');
