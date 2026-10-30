/* Browser-only private GitHub Actions render pack builder.
   Never uploads media, embeds credentials, or calls a remote endpoint. */
(function(root,make){
 const result=make();if(typeof module==='object'&&module.exports)module.exports=result;
 if(root)root.DClipsCloudPack=result;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const MAX_IMAGE=8*1024*1024,MAX_TOTAL=36*1024*1024;
 const extension=name=>{
  const ext=String(name||'').toLowerCase().match(/\.(png|jpg|jpeg|webp)$/);
  return ext?ext[1]:null;
 };
 function assign(files,count){
  if(!Number.isInteger(count)||count<2||count>8)throw Error('An illustrated video requires 2–8 prepared scenes.');
  if(!Array.isArray(files)||!files.length||files.length>8)throw Error('Choose 1–8 images for this episode.');
  let bytes=0;
  for(const f of files){
   if(!f||typeof f.name!=='string'||!extension(f.name))throw Error('Images must be PNG, JPG or WebP.');
   if(!Number.isInteger(f.size)||f.size<=16||f.size>MAX_IMAGE)throw Error(f.name+' must be no more than 8 MiB.');
   bytes+=f.size;
  }
  if(bytes>MAX_TOTAL)throw Error('Image batch exceeds 36 MiB. Export smaller image files.');
  const slots=Array(count).fill(null);
  const others=[];
  for(const file of files){
   const m=file.name.match(/^0*([1-8])(?:[-_.\s]|$)/);
   const index=m?Number(m[1])-1:null;
   if(index!==null){
    if(index>=count)throw Error(file.name+' refers to scene '+(index+1)+' but this episode has '+count+' scenes.');
    if(slots[index])throw Error('Two files both use scene '+(index+1)+'. Rename one first.');
    slots[index]=file;
   }else others.push(file);
  }
  others.sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}));
  for(const file of others){
   const i=slots.findIndex(x=>!x);if(i<0)throw Error('More images than prepared scenes.');
   slots[i]=file;
  }
  return {slots,missing:slots.map((x,i)=>x?-1:i+1).filter(x=>x>0),bytes};
 }
 const utf8=s=>new TextEncoder().encode(s);
 function crc32(a){
  let crc=0xffffffff;
  for(const n of a){crc^=n;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
  return (crc^0xffffffff)>>>0;
 }
 function write16(b,n,i){b[i]=n&255;b[i+1]=(n>>>8)&255;}
 function write32(b,n,i){write16(b,n&65535,i);write16(b,(n>>>16)&65535,i+2);}
 function concat(bytes){
  let length=0;for(const b of bytes)length+=b.length;
  const result=new Uint8Array(length);let pos=0;
  for(const b of bytes){result.set(b,pos);pos+=b.length;}
  return result;
 }
 function zip(entries){
  if(!Array.isArray(entries)||!entries.length||entries.length>10)throw Error('Invalid cloud render pack.');
  const local=[],central=[];let offset=0;const names=new Set();
  for(const e of entries){
   if(!e||typeof e.name!=='string'||!e.name||e.name.length>150||e.name.startsWith('/')||e.name.includes('..')||e.name.includes('\\')||names.has(e.name))
    throw Error('Invalid or repeated ZIP entry.');
   names.add(e.name);
   const name=utf8(e.name),data=e.data;
   if(!(data instanceof Uint8Array)||data.length>MAX_TOTAL)throw Error('Invalid ZIP data.');
   const checksum=crc32(data);
   const header=new Uint8Array(30+name.length);
   write32(header,0x04034b50,0);write16(header,20,4);
   write16(header,0x0800,6);write16(header,0,8); // UTF-8, stored, no compression
   write32(header,checksum,14);write32(header,data.length,18);write32(header,data.length,22);
   write16(header,name.length,26);header.set(name,30);
   local.push(header,data);
   const cd=new Uint8Array(46+name.length);
   write32(cd,0x02014b50,0);write16(cd,20,4);write16(cd,20,6);
   write16(cd,0x0800,8);write32(cd,checksum,16);
   write32(cd,data.length,20);write32(cd,data.length,24);write16(cd,name.length,28);
   write32(cd,offset,42);cd.set(name,46);central.push(cd);
   offset+=header.length+data.length;
  }
  const centralBytes=concat(central),end=new Uint8Array(22);
  write32(end,0x06054b50,0);write16(end,entries.length,8);write16(end,entries.length,10);
  write32(end,centralBytes.length,12);write32(end,offset,16);
  return concat([...local,centralBytes,end]);
 }
 function detect(bytes){
  if(bytes.length>=8&&[137,80,78,71,13,10,26,10].every((b,i)=>bytes[i]===b))return 'png';
  if(bytes.length>=3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'jpg';
  if(bytes.length>=12&&String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP')return 'webp';
  throw Error('One of the uploaded files is not a genuine PNG, JPG or WebP image.');
 }
 async function packageJob(job,slots){
  if(!job||job.kind!=='original'||job.rights_confirmed!==true||job.visuals?.mode!=='illustrated')
   throw Error('Only rights-confirmed original illustrated projects can be exported.');
  const scenes=job.visuals.scenes;
  if(!Array.isArray(scenes)||scenes.length<2||scenes.length>8||!Array.isArray(slots)||scenes.length!==slots.length||slots.some(x=>!x))
   throw Error('Attach exactly one image for every scene including the opening cover.');
  const out=JSON.parse(JSON.stringify(job)),entries=[];
  out.source={path:null,url:null,start_seconds:0};
  if(out.narration?.mode==='file'||out.narration?.mode==='none')
   throw Error('Online rendering needs an automatically generated narrator (Kokoro or basic).');
  if(typeof out.script!=='string'||!/[.!?](?:["'”’])?$/.test(out.script.trim()))
   throw Error('The spoken story must finish at a complete sentence.');
  let total=0;
  for(let i=0;i<slots.length;i++){
   const file=slots[i],ext=extension(file.name);
   const bytes=new Uint8Array(await file.arrayBuffer());
   const detected=detect(bytes);
   if(detected!==(ext==='jpeg'?'jpg':ext))throw Error(file.name+' extension does not match its image contents.');
   total+=bytes.length;if(bytes.length>MAX_IMAGE||total>MAX_TOTAL)throw Error('Image files are too large.');
   const relative='user-data/media/scene-'+String(i+1).padStart(2,'0')+'.'+(ext==='jpeg'?'jpg':ext);
   out.visuals.scenes[i].image_path=relative;
   entries.push({name:relative,data:bytes});
  }
  // Do not pack creator account details, browser state or API tokens.
  delete out.auto_align;
  const jobBytes=utf8(JSON.stringify(out,null,2));
  if(jobBytes.length>100000)throw Error('Render script is too long.');
  entries.unshift({name:'render-job.json',data:jobBytes});
  return zip(entries);
 }
 return {assign,packageJob,zip,detect,MAX_IMAGE,MAX_TOTAL};
});