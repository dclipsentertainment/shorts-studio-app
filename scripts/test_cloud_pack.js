'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const pack=require('../cloud-pack.js');
const png=Uint8Array.from([137,80,78,71,13,10,26,10,...Array(100).fill(0)]);
const jpg=Uint8Array.from([255,216,255,...Array(90).fill(1)]);
const file=(name,data)=>({name,size:data.length,arrayBuffer:async()=>data.buffer.slice(data.byteOffset,data.byteOffset+data.length)});
async function run(){
 const files=[file('02-scene.jpg',jpg),file('01-cover.png',png)];
 const mapped=pack.assign(files,2);
 assert.equal(mapped.missing.length,0);
 assert.equal(mapped.slots[0].name,'01-cover.png');
 assert.equal(mapped.slots[1].name,'02-scene.jpg');
 assert.deepEqual(pack.assign([file('beacon.jpg',jpg),file('cover.png',png)],2).slots.map(f=>f.name),['beacon.jpg','cover.png']);
 assert.deepEqual(pack.assign([file('01-cover.png',png)],2).missing,[2]);
 assert.throws(()=>pack.assign([file('01-one.png',png),file('01-two.png',png)],2),/both use scene/);
 assert.throws(()=>pack.assign([file('other.gif',png)],2),/PNG/);
 const job={version:1,id:'test-episode',title:'Lighthouse',kind:'original',channel:'DClips',
  duration:20,source:{path:null,url:null,start_seconds:0},narration:{mode:'basic',voice:'am_michael',speed:0.96},
  rights_confirmed:true,script:'A lighthouse shines in a storm. The keeper saves the sailors.',
  captions:true,editing:{caption_style:'kinetic',crop_focus:'center',motion:'none',background:'plum'},
  visuals:{mode:'illustrated',theme:'cosmos',transition:'fade',intro_seconds:2,scene_timing_reference_seconds:18,
   scenes:[{headline:'Cover',image_path:'',start_seconds:null},{headline:'Keeper',image_path:'',start_seconds:0}]}};
 const z=await pack.packageJob(job,mapped.slots);
 assert(z instanceof Uint8Array);
 assert.equal(String.fromCharCode(...z.slice(0,4)),'PK'+String.fromCharCode(3,4));
 assert(z.length>png.length+jpg.length);
 assert(!JSON.stringify(job).includes('scene-01.png'),'Must not mutate original draft');
 assert.throws(()=>pack.detect(Uint8Array.from([1,2,3])),/not a genuine/);
 await assert.rejects(()=>pack.packageJob({...job,rights_confirmed:false},mapped.slots),/rights-confirmed/);
 await assert.rejects(()=>pack.packageJob(job,[file('02-wrong.png',jpg),files[0]]),/extension does not match/);

 // A ChatGPT-generated image archive can now be selected without extracting it.
 const zipFile=data=>new File([data],'chatgpt-images.zip',{type:'application/zip'});
 const artwork=pack.zip([{name:'01-cover.png',data:png},{name:'images/02-scene.jpg',data:jpg}]);
 const decoded=await pack.imagesFromArchive(zipFile(artwork));
 assert.deepEqual(decoded.map(f=>f.name),['01-cover.png','02-scene.jpg']);
 assert.deepEqual(pack.assign(decoded,2).missing,[]);
 // Python zipfile's standard DEFLATE format also works; no extra JS ZIP library.
 const {deflateRawSync}=require('node:zlib');
 const first=pack.zip([{name:'01-cover.png',data:png}]);
 const view=new DataView(first.buffer,first.byteOffset,first.byteLength);
 const u16=(b,i)=>b[i]|(b[i+1]<<8),wr16=(b,i,n)=>{b[i]=n&255;b[i+1]=(n>>>8)&255;};
 const wr32=(b,i,n)=>{wr16(b,i,n&65535);wr16(b,i+2,(n>>>16)&65535);};
 const cdpos=view.getUint32(first.length-6,true),cdlen=view.getUint32(first.length-10,true);
 const lhlen=30+u16(first,26),compressed=deflateRawSync(Buffer.from(png));
 const header=Uint8Array.from(first.slice(0,lhlen)),center=Uint8Array.from(first.slice(cdpos,cdpos+cdlen)),tail=Uint8Array.from(first.slice(-22));
 wr16(header,8,8);wr32(header,18,compressed.length);
 wr16(center,10,8);wr32(center,20,compressed.length);
 wr32(tail,16,header.length+compressed.length);
 const deflated=Uint8Array.from(Buffer.concat([header,compressed,center,tail]));
 assert.deepEqual((await pack.imagesFromArchive(zipFile(deflated))).map(f=>f.name),['01-cover.png']);
 const sneaky=Uint8Array.from(pack.zip([{name:'01-cover.png',data:png}]));
 const badPath=new TextEncoder().encode('../foo00.png');
 const localLen=30,cdAt=new DataView(sneaky.buffer).getUint32(sneaky.length-6,true);
 sneaky.set(badPath,localLen);sneaky.set(badPath,cdAt+46);
 await assert.rejects(()=>pack.imagesFromArchive(zipFile(sneaky)),/unsafe filenames/);
 await assert.rejects(()=>pack.imagesFromArchive(zipFile(pack.zip([{name:'story.json',data:png}]))),/only contain PNG/);
 const tampered=Uint8Array.from(artwork);tampered[45]^=1;
 await assert.rejects(()=>pack.imagesFromArchive(zipFile(tampered)),/integrity|invalid|format/i);

 const app=fs.readFileSync('app.js','utf8'),html=fs.readFileSync('index.html','utf8');
 assert(app.includes('data-action="cloud-export"')&&app.includes('data-action="cloud-clear"'));
 assert(html.includes('cloud-pack.js'));
 assert(app.includes('cloudImagesSelected')&&app.includes('cloudSwitchScene'));
 const extracted=[];
 // ZIP stored entries retain literal UTF-8 filenames for external GitHub runner.
 for(const str of ['render-job.json','user-data/media/scene-01.png','user-data/media/scene-02.jpg'])
  assert(Buffer.from(z).includes(Buffer.from(str)),str+' missing');
 console.log('PASS: bulk scene matching, manual swaps, image-type validation, sealed private render ZIP, no network or API costs.');
}
run().catch(e=>{console.error(e);process.exitCode=1});
