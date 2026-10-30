const assert=require('node:assert/strict'),{api}=require('./audit_harness.cjs')();
const clean={version:1,channels:[{id:'ch',name:'Brand'}],projects:[{id:'p',title:'Story',kind:'original',status:'draft',duration:30,channelId:'ch'}]};
assert.equal(api.validateWorkspace(clean).projects[0].id,'p');
for(const mutate of [x=>x.projects[0].id='x"><img src=x onerror=alert(1)>',x=>x.projects[0].status={},x=>x.channels.push(x.channels[0]),x=>x.projects[0].sourceUrl='javascript:alert(1)',x=>x.projects[0].script={},x=>x.projects[0].visualScenes={}]){const x=structuredClone(clean);mutate(x);assert.throws(()=>api.validateWorkspace(x));}
assert.throws(()=>api.validateWorkspace(JSON.parse('{"version":1,"channels":[],"projects":[],"__proto__":{"polluted":true}}')));
api.setState(clean);const html=api.tableProjects([{...clean.projects[0],id:'x"><img src=x onerror=alert(1)>'}]);assert(!html.includes('<img src=x'));assert(html.includes('&lt;img'));
assert.equal({}.polluted,undefined);
console.log('PASS: malformed backups, dangerous URLs, duplicate IDs, prototype keys and HTML IDs rejected/escaped');

assert.equal(api.validateWorkspace({...clean,projects:[{...clean.projects[0],status:'idea'}]}).projects[0].status,'idea');
