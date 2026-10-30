const fs=require('node:fs'),vm=require('node:vm');
module.exports=function(){
 const els={},listeners={};
 for(const id of ['main','nav-channel-count','today-date','crumb-current','mobile-menu','toast'])els[id]={innerHTML:'',textContent:'',classList:{toggle(){},remove(){},add(){}},addEventListener(){}};
 const values=new Map();const context={document:{querySelector(s){return s.startsWith('#')?els[s.slice(1)]||null:null},querySelectorAll(){return []},addEventListener(k,f){(listeners[k]||=[]).push(f)}},localStorage:{getItem(k){return values.get(k)||null},setItem(k,v){values.set(k,v)},removeItem(k){values.delete(k)}},location:{hash:'#overview',protocol:'file:',hostname:''},window:{addEventListener(){},DClipsUsageMonitor:{render(){return ''},afterRender(){}},scrollTo(){}},console,Date,Math,Number,JSON,Array,Intl,URL,Blob,Map,Set,String,Object,Boolean,RegExp,setTimeout,clearTimeout,performance:{now(){return 0}}};
 let src=fs.readFileSync('app.js','utf8');const at=src.lastIndexOf('})();');
 src=src.slice(0,at)+`window.testApi={save,captionNarrationKey,captionsAreStale,validateWorkspace,completeProductionRender,renderFingerprint,latestRender,parseTimedCaptions,tableProjects,createRenderJob,productionDraftSave,renderBlockers,
 setState(s){state=s},getState(){return state},select(id){productionProjectId=id;page='production'},edit(){productionEditRevision++},setCues(c){productionCues=c}};`+src.slice(at);
 vm.runInNewContext(src,context);return {api:context.window.testApi,els,context,values,listeners};
};
