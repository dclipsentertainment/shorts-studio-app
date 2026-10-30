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
   await page.goto(base+'/#production');await page.waitForSelector('#production-title');
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
  console.log('PASS: real-browser render race, duration reconciliation, reload and persistent image assignment');
 }finally{if(browser)await browser.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
