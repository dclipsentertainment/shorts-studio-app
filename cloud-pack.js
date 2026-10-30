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

 // Open ZIP image packs entirely in the browser. Accept the stored and normal
 // deflated ZIP formats; never trust archive filenames or claimed sizes.
 async function imagesFromArchive(file){
  if(!file||!/\.(zip)$/i.test(file.name||'')||!Number.isFinite(file.size)||
     file.size<22||file.size>42*1024*1024)
   throw Error('Choose an image ZIP smaller than 42 MiB.');
  const bytes=new Uint8Array(await file.arrayBuffer());
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const u16=i=>view.getUint16(i,true),u32=i=>view.getUint32(i,true);
  if(u32(0)!==0x04034b50)throw Error('This is not a ZIP archive.');
  let eocd=-1;
  for(let p=bytes.length-22;p>=Math.max(0,bytes.length-65557);p--){
   if(u32(p)===0x06054b50&&p+22+u16(p+20)===bytes.length){eocd=p;break;}
  }
  if(eocd<0)throw Error('ZIP has no valid central directory.');
  const count=u16(eocd+10),size=u32(eocd+12),offset=u32(eocd+16);
  if(u16(eocd+4)||u16(eocd+6)||u16(eocd+8)!==count||
     count<1||count>16||size===0xffffffff||offset===0xffffffff||offset+size>eocd)
   throw Error('ZIP entry count or directory is unsupported.');
  const decoder=new TextDecoder('utf-8',{fatal:true});
  let cursor=offset,total=0;const result=[],names=new Set();
  for(let index=0;index<count;index++){
   if(cursor+46>bytes.length||u32(cursor)!==0x02014b50)throw Error('Invalid ZIP directory entry.');
   const flags=u16(cursor+8),method=u16(cursor+10),crc=u32(cursor+16),
    compressed=u32(cursor+20),uncompressed=u32(cursor+24),
    nameLength=u16(cursor+28),extraLength=u16(cursor+30),commentLength=u16(cursor+32),
    external=u32(cursor+38),local=u32(cursor+42);
   const end=cursor+46+nameLength+extraLength+commentLength;
   if(end>bytes.length||compressed===0xffffffff||uncompressed===0xffffffff||
      (flags&1)||!([0,8].includes(method))||local>=offset)
    throw Error('ZIP contains an unsupported or encrypted entry.');
   const mode=external>>>16;
   if((mode&0xf000)===0xa000)throw Error('ZIP symbolic links are not allowed.');
   const entryName=decoder.decode(bytes.subarray(cursor+46,cursor+46+nameLength));
   cursor=end;
   if(entryName.endsWith('/'))continue;
   if(entryName.startsWith('/')||entryName.includes('\\')||
      entryName.split('/').some(x=>!x||x==='.'||x==='..')||entryName.split('/').length>3)
    throw Error('ZIP contains unsafe filenames.');
   const basename=entryName.split('/').at(-1);
   const ext=extension(basename);
   if(!ext)throw Error('Image ZIP can only contain PNG, JPG or WebP images.');
   if(names.has(basename.toLowerCase()))throw Error('Two ZIP images have the same filename.');
   names.add(basename.toLowerCase());
   if(uncompressed<17||uncompressed>MAX_IMAGE||compressed>MAX_IMAGE||total+uncompressed>MAX_TOTAL)
    throw Error('ZIP pictures exceed the image size allowance.');
   if(local+30>bytes.length||u32(local)!==0x04034b50)throw Error('Invalid ZIP local image header.');
   const localFlags=u16(local+6),localMethod=u16(local+8),
     localNameLength=u16(local+26),localExtraLength=u16(local+28);
   if(localFlags!==flags||localMethod!==method||local+30+localNameLength+localExtraLength+compressed>offset)
    throw Error('ZIP image header does not match directory.');
   const localName=decoder.decode(bytes.subarray(local+30,local+30+localNameLength));
   if(localName!==entryName)throw Error('ZIP image filename mismatch.');
   const start=local+30+localNameLength+localExtraLength;
   const payload=bytes.subarray(start,start+compressed);
   let raw;
   if(method===0){raw=new Uint8Array(payload);}
   else{
    if(typeof DecompressionStream!=='function')
     throw Error('Your browser cannot unpack compressed ZIPs. Extract the ZIP and select all images instead.');
    try{
     const input=new Blob([payload]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
     const reader=input.getReader(),chunks=[];let seen=0;
     try{
      while(true){
       const step=await reader.read();if(step.done)break;
       seen+=step.value.length;
       if(seen>uncompressed||seen>MAX_IMAGE)throw Error('ZIP image decompressed beyond its declared safe size.');
       chunks.push(step.value);
      }
     }catch(err){await reader.cancel().catch(()=>{});throw err;}
     raw=concat(chunks);
    }catch(_){throw Error('Could not decompress ZIP images. Extract the ZIP and select images instead.');}
   }
   if(raw.length!==uncompressed||crc32(raw)!==crc||detect(raw)!==(ext==='jpeg'?'jpg':ext))
    throw Error('An image in the ZIP failed its integrity or format check.');
   total+=raw.length;
   result.push(new File([raw],basename,{type:ext==='png'?'image/png':ext==='webp'?'image/webp':'image/jpeg'}));
  }
  if(cursor!==offset+size||result.length<1||result.length>8)
   throw Error('An image ZIP must contain 1–8 valid pictures and no other files.');
  return result;
 }


 // GitHub Actions downloads one video artifact ZIP. Open it locally in the
 // browser so the user does not need to install an unzip tool or extract files.
 async function videoFromArtifactZip(file){
  const MAX_VIDEO=200*1024*1024,MAX_ZIP=210*1024*1024;
  if(!file||!/\.zip$/i.test(file.name||'')||!Number.isFinite(file.size)||file.size<22||file.size>MAX_ZIP)
   throw Error('Choose a GitHub Actions video artifact ZIP under 210 MiB.');
  const bytes=new Uint8Array(await file.arrayBuffer()),v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const rd16=i=>v.getUint16(i,true),rd32=i=>v.getUint32(i,true);
  if(rd32(0)!==0x04034b50)throw Error('This file is not a ZIP archive.');
  let eocd=-1;
  for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--){
   if(rd32(i)===0x06054b50&&i+22+rd16(i+20)===bytes.length){eocd=i;break;}
  }
  if(eocd<0||rd16(eocd+4)||rd16(eocd+6)||rd16(eocd+8)!==rd16(eocd+10))
   throw Error('Invalid or multi-disk GitHub artifact ZIP.');
  const count=rd16(eocd+10),len=rd32(eocd+12),start=rd32(eocd+16);
  if(count<1||count>5||start===0xffffffff||len===0xffffffff||start+len>eocd)
   throw Error('Unexpected files in GitHub artifact.');
  const decoder=new TextDecoder('utf-8',{fatal:true});
  let pos=start,mp4=null;
  for(let idx=0;idx<count;idx++){
   if(pos+46>bytes.length||rd32(pos)!==0x02014b50)throw Error('Corrupt ZIP file table.');
   const flags=rd16(pos+8),method=rd16(pos+10),crc=rd32(pos+16),
    clen=rd32(pos+20),ulen=rd32(pos+24),nameLen=rd16(pos+28),
    extraLen=rd16(pos+30),commentLen=rd16(pos+32),mode=rd32(pos+38)>>>16,local=rd32(pos+42);
   const end=pos+46+nameLen+extraLen+commentLen;
   if(end>bytes.length||(flags&1)||!([0,8].includes(method))||(mode&0xf000)===0xa000||clen===0xffffffff||ulen===0xffffffff)
    throw Error('Encrypted or unsupported video archive entry.');
   const name=decoder.decode(bytes.subarray(pos+46,pos+46+nameLen));
   pos=end;
   if(name.endsWith('/'))continue;
   const components=name.split('/');
   if(components.length>3||components.some(x=>!x||x==='..'||x==='.'))throw Error('Unsafe artifact ZIP path.');
   const basename=components.at(-1);
   const isVideo=/\.mp4$/i.test(basename),isQuality=basename==='quality-report.json';
   if(!isVideo&&!isQuality)throw Error('GitHub artifact contains an unexpected file.');
   if(isVideo&&mp4)throw Error('GitHub artifact must contain exactly one MP4.');
   const max=isVideo?MAX_VIDEO:100000;
   if(clen>max||ulen>max||(!isVideo&&ulen<2)||local>=start||local+30>bytes.length||rd32(local)!==0x04034b50)
    throw Error('Video artifact file is oversized or damaged.');
   const lname=rd16(local+26),lextra=rd16(local+28),dataStart=local+30+lname+lextra;
   if(dataStart+clen>start||rd16(local+6)!==flags||rd16(local+8)!==method||
      decoder.decode(bytes.subarray(local+30,local+30+lname))!==name)
    throw Error('Artifact ZIP file header mismatch.');
   if(!isVideo)continue; // Quality report remains informational; never auto-approves content.
   const payload=bytes.subarray(dataStart,dataStart+clen);
   let output;
   if(method===0)output=new Uint8Array(payload);
   else{
    if(typeof DecompressionStream!=='function')throw Error('Browser cannot open compressed artifact ZIPs. Extract and select MP4 instead.');
    try{
     const stream=new Blob([payload]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
     const reader=stream.getReader(),chunks=[];let size=0;
     try{
      while(true){
       const piece=await reader.read();if(piece.done)break;
       size+=piece.value.length;
       if(size>ulen||size>MAX_VIDEO)throw Error('ZIP video exceeds its declared size.');
       chunks.push(piece.value);
      }
     }catch(err){await reader.cancel().catch(()=>{});throw err;}
     output=concat(chunks);
    }catch(_){throw Error('Cannot decompress video artifact. Extract ZIP and choose MP4 instead.');}
   }
   if(output.length!==ulen||crc32(output)!==crc||output.length<1024||
      String.fromCharCode(...output.subarray(4,8))!=='ftyp')
    throw Error('GitHub video artifact is corrupt or is not an MP4.');
   mp4=new File([output],basename,{type:'video/mp4'});
  }
  if(pos!==start+len||!mp4)throw Error('GitHub ZIP has no valid rendered MP4.');
  return mp4;
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
 return {assign,packageJob,imagesFromArchive,videoFromArtifactZip,zip,detect,MAX_IMAGE,MAX_TOTAL};
});