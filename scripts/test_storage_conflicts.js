const assert=require('node:assert/strict'),h=require('./audit_harness.cjs')();
h.api.setState({version:1,channels:[],projects:[]});assert(h.api.save());
const external=JSON.stringify({version:1,channels:[{id:'other',name:'Other tab'}],projects:[]});h.values.set('shorts_studio_state_v1',external);
assert.equal(h.api.save(),false);assert.equal(h.values.get('shorts_studio_state_v1'),external);
console.log('PASS: another tab cannot be silently overwritten');
