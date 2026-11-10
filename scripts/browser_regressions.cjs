// Real browser coverage. Uses only localhost and mocked render completions.
const {chromium}=require('playwright'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const port=18766,base=`http://127.0.0.1:${port}`,key='shorts_studio_state_v1';
const server=spawn('python',['scripts/local_studio.py','--port',String(port)],{stdio:'ignore'});
const project={id:'p',title:'Original',kind:'original',status:'draft',channelId:'ch',duration:10,start:0,script:'This is a complete original story with a natural ending.',voiceMode:'basic',voiceName:'af_heart',visualMode:'classic',visualScenes:[],captionStyle:'classic',rights:true,timedCaptions:''};
(async()=>{
 let browser;
 try{
  for(let n=0;n<100;n++){try{if((await fetch(base)).ok)break;}catch(_){}await new Promise(r=>setTimeout(r,100));}
  browser=await chromium.launch({headless:true});
  async function setup(p=project){
   const context=await browser.newContext();const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));
   await page.goto(base);await page.evaluate(({key,p})=>localStorage.setItem(key,JSON.stringify({version:1,channels:[{id:'ch',name:'Brand'}],projects:[p]})),{key,p});
   await page.route('**/api/status',r=>r.fulfill({json:{local:true,ffmpeg:true,transcriber:false}}));
   await page.goto(base+'/#production');await page.reload();await page.waitForSelector('#production-title');
   return {page,context,errors};
  }
  let f=await setup(),done=false;
  await f.page.route('**/api/render',r=>r.fulfill({json:{task_id:'test'}}));
  await f.page.route('**/api/task/test',r=>r.fulfill({json:done?{status:'done',video_url:'/output/'+'a'.repeat(32)+'/original.mp4',quality_report:{status:'pass',duration_seconds:10}}:{status:'working'}}));
  await f.page.click('[data-action="production-render"]');await f.page.fill('#production-title','Edited while rendering');await f.page.click('[data-action="production-save"]');done=true;
  await f.page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).renderHistory?.length===1,key);
  let state=await f.page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);assert.equal(state.projects[0].title,'Edited while rendering');assert(!state.projects[0].lastRender);assert.deepEqual(f.errors,[]);await f.context.close();
  f=await setup();
  await f.page.route('**/api/render',r=>r.fulfill({json:{task_id:'test'}}));
  await f.page.route('**/api/task/test',r=>r.fulfill({json:{status:'done',video_url:'/output/'+'b'.repeat(32)+'/longer.mp4',quality_report:{status:'pass',duration_seconds:12.2},caption_segments:[{start_seconds:9,end_seconds:12,text:'Complete ending.'}]}}));
  await f.page.click('[data-action="production-render"]');await f.page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).projects[0].lastRender,key);
  state=await f.page.evaluate(key=>JSON.parse(localStorage.getItem(key)),key);assert.equal(state.projects[0].duration,12.2);assert.equal(state.projects[0].lastRender.reviewError,undefined);assert.deepEqual(f.errors,[]);
  await f.page.reload();await f.page.waitForSelector('#production-title');assert.equal(await f.page.inputValue('#production-length'),'12.2');await f.context.close();
  f=await setup({...project,visualMode:'illustrated',visualScenes:[{headline:'Cover',image_path:''},{headline:'Story',image_path:'',start_seconds:0}]});
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j5V0AAAAASUVORK5CYII=','base64');
  await f.page.setInputFiles('#production-cloud-images',[{name:'01-cover.png',mimeType:'image/png',buffer:png},{name:'02-story.png',mimeType:'image/png',buffer:png}]);
  await f.page.waitForFunction(()=>document.querySelector('#cloud-scene-list').textContent.includes('2/2 images'));
  await f.page.reload();await f.page.waitForFunction(()=>document.querySelector('#cloud-scene-list')?.textContent.includes('2/2 images'));
  assert.deepEqual(f.errors,[]);await f.context.close();
  f=await setup();await f.page.goto(base+'/#asmr');
  await f.page.fill('#asmr-title','Soap carving');await f.page.fill('#asmr-duration','24');await f.page.fill('#asmr-variation','6');
  await f.page.click('[data-action="asmr-plan"]');
  assert.equal(await f.page.inputValue('#asmr-duration'),'24');
  await f.page.reload();assert.equal(await f.page.inputValue('#asmr-duration'),'24');assert.equal(await f.page.inputValue('#asmr-variation'),'6');
  assert.deepEqual(f.errors,[]);await f.context.close();
  f=await setup({...project,visualMode:'illustrated'});
  await f.page.goto(base+'/#creator');await f.page.waitForSelector('#creator-script');
  await f.page.fill('#creator-script','The fox opened the door. A friend waited outside.');
  await f.page.fill('#creator-characters','Red fox with a blue scarf');
  await f.page.click('[data-creator="plan"]');
  await f.page.setInputFiles('#creator-images',[{name:'01-cover.png',mimeType:'image/png',buffer:png},{name:'02-story.png',mimeType:'image/png',buffer:png},{name:'03-friend.png',mimeType:'image/png',buffer:png}]);
  await f.page.waitForFunction(()=>document.querySelector('#main').textContent.includes('3/3 pictures assigned'));
  await f.page.setInputFiles('[data-scene-file="1"]',{name:'02-replacement.png',mimeType:'image/png',buffer:png});
  await f.page.waitForFunction(()=>document.querySelector('#main').textContent.includes('02-replacement.png'));
  await f.page.reload();await f.page.waitForFunction(()=>document.querySelector('#main').textContent.includes('3/3 pictures assigned'));
  assert.equal(await f.page.inputValue('#creator-characters'),'Red fox with a blue scarf');
  const download=f.page.waitForEvent('download');await f.page.click('[data-creator="backup"]');const backup=await download;
  await f.page.fill('#creator-title','Changed after backup');await f.page.click('[data-creator="save"]');
  f.page.on('dialog',d=>d.accept());
  await f.page.setInputFiles('#creator-restore',await backup.path());
  await f.page.waitForFunction(()=>document.querySelector('#creator-title').value==='Original');
  await f.page.waitForFunction(()=>document.querySelector('#main').textContent.includes('3/3 pictures assigned'));
  let uploaded=false;
  await f.page.route('https://api.github.com/**',async r=>{
   const url=r.request().url();
   if(url.includes('/contents/')){const body=r.request().postDataJSON();assert(body.content.length>100);assert.equal(body.branch,'main');uploaded=true;return r.fulfill({json:{commit:{sha:'a'.repeat(40)}}});}
   if(url.endsWith('/artifacts'))return r.fulfill({json:{artifacts:[{id:987,name:'finished-online-video',expired:false,size_in_bytes:1200}]}});
   if(url.includes('/actions/runs'))return r.fulfill({json:{workflow_runs:[{path:'.github/workflows/render-cloud-pack.yml',id:123,status:'completed',conclusion:'success'}]}});
   if(url.includes('/releases/latest'))return r.fulfill({json:{tag_name:'v0.15.0'}});
   return r.fulfill({json:{private:true,default_branch:'main'}});
  });
  await f.page.locator('details summary').click();await f.page.fill('#creator-token','test-token-never-persist');await f.page.click('[data-creator="connect"]');
  await f.page.check('#creator-rights');await f.page.check('#creator-facts');await f.page.click('[data-creator="render"]');
  await f.page.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).creatorJobs?.some(j=>j.status==='queued'),key);assert(uploaded);
  await f.page.click('[data-creator="refresh"]');await f.page.waitForFunction(()=>document.querySelector('#main').textContent.includes('success'));
  const artifactBytes=await f.page.evaluate(()=>{const video=new Uint8Array(1100);video.set([102,116,121,112],4);return Array.from(window.DClipsCloudPack.zip([{name:'finished.mp4',bytes:video}]));});
  await f.page.route('**/api/cloud-artifact?id=987',r=>r.fulfill({contentType:'application/zip',body:Buffer.from(artifactBytes)}));
  await f.page.click('[data-creator="load-preview"]');await f.page.waitForSelector('#main video');
  await f.page.selectOption('#creator-channel','ch');await f.page.selectOption('#creator-preset','history');await f.page.click('[data-creator="preset"]');
  assert.equal(await f.page.inputValue('#creator-voice'),'bm_george');await f.page.click('[data-creator="save-preset"]');
  await f.page.reload();await f.page.waitForSelector('#creator-voice');assert.equal(await f.page.inputValue('#creator-voice'),'bm_george');
  assert(!(await f.page.evaluate(()=>JSON.stringify(localStorage))).includes('test-token-never-persist'));
  await f.page.goto(base+'/#health');await f.page.click('[data-creator="health"]');
  await f.page.waitForFunction(()=>document.querySelector('#main').textContent.includes('latest release: v0.15.0'));
  assert.deepEqual(f.errors,[]);await f.context.close();
  console.log('PASS: real-browser render race, duration reconciliation, reload and persistent image assignment');
 }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
