const assert=require('node:assert/strict'),series=require('../story-series.js');
for(const opening of ['Dr. Smith went to the old harbour to investigate the unusual event.','Mr. J. R. Smith paid 3.14 euros to enter the old harbour.','“Dr. Smith has arrived,” she said.']){
 const script=opening+' He returned home with all the answers that the villagers had requested.';
 const plan=series.plan({title:'History',script,platforms:['YT'],config:{YT:{parts:10,target:60}}});
 const parts=plan.platforms[0].parts;
 assert.equal(parts.map(x=>x.script).join(' '),script);
 assert(parts.every(x=>!['Dr.','Mr.','J.','R.'].includes(x.script)));
 assert.equal(parts[0].script,opening);
}
console.log('PASS: honorifics, initials, decimals and quoted sentences remain intact');
