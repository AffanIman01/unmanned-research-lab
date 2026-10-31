import {createReadinessSpectrum} from './readiness-spectrum.mjs?v=readiness-aj';
import {createVideos} from './videos.mjs?v=overview-ad';
import {createFocusMotion} from './focus-motion.mjs?v=overview-ac';
import {createReadiness,createConceptAnimation} from './readiness.mjs?v=overview-ab';
import {createSimulationPanel} from './simulation-panel.mjs?v=tools-az';
// Overview is the default; 3D code and its models are loaded on first use only.
export function createPageNavigation({document,loadStudio,onPageChange=()=>{},onSimulationMode=()=>{}}){
 const overview=document.getElementById('overviewPanel'),studio=document.getElementById('studioPanel'),videos=document.getElementById('videosPanel'),simulation=document.getElementById('simulationPanel'),documentation=document.getElementById('documentationPanel');
 const tabs=[...document.querySelectorAll('[data-page-tab]')],status=document.getElementById('studioLoadState');
 let page='overview',promise=null,app=null,request=0;
 function paint(){
  overview.hidden=page!=='overview';studio.hidden=page!=='studio';if(videos)videos.hidden=page!=='videos';if(simulation)simulation.hidden=page!=='simulation';if(documentation)documentation.hidden=page!=='documentation';
  document.body.classList.toggle('overview-open',page==='overview');document.body.classList.toggle('videos-open',page==='videos');
  document.body.classList.toggle('simulation-open',page==='simulation');document.body.classList.toggle('documentation-open',page==='documentation');
  for(const tab of tabs){const selected=tab.dataset.pageTab===page;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;}
  for(const element of document.querySelectorAll('[data-studio-only]'))element.hidden=page!=='studio';
  onPageChange(page);
 }
 async function show(next,{subject=null,lesson=null}={}){
  if(!['overview','videos','studio','simulation','documentation'].includes(next)||(next==='videos'&&!videos)||(next==='simulation'&&!simulation)||(next==='documentation'&&!documentation))return;
  const token=++request;page=next;paint();
  if(next!=='studio'){app?.setStudioActive(false);return;}
  for(const video of overview.querySelectorAll('video'))video.pause();
  if(!app){status.hidden=false;status.textContent='Opening 3D studio…';}
  try{
   if(!promise)promise=loadStudio().then(value=>{app=value;return value;}).catch(error=>{promise=null;throw error;});
   const module=await promise;
   if(token!==request){if(page!=='studio')module.setStudioActive(false);return;}
   module.setStudioActive(true);status.hidden=true;
   await module.openStudioView(subject||'me120',lesson);
  }catch(error){if(token!==request)return;status.hidden=false;status.textContent='3D studio unavailable. Return to Overview or select 3D Studio to retry.';console.error(error);}
 }
 tabs.forEach((tab,index)=>{
  tab.addEventListener('click',()=>show(tab.dataset.pageTab));
  tab.addEventListener('keydown',event=>{
   if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
   event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
   tabs[next].focus();show(tabs[next].dataset.pageTab);
  });
 });
 document.querySelectorAll('[data-open-studio]').forEach(button=>button.addEventListener('click',()=>{
  const target=button.dataset.openStudio;
  const mode=button.dataset.lesson||(target==='hardware'?'stereo':null);
  show('studio',{subject:target==='hardware'?'me120':target,lesson:mode});
  document.getElementById('projectTabs')?.scrollIntoView({block:'start',behavior:'auto'});
 }));
 document.querySelectorAll('[data-open-simulation]').forEach(button=>button.addEventListener('click',()=>{
  if(['rov','water'].includes(button.dataset.openSimulation))onSimulationMode(button.dataset.openSimulation);show('simulation');document.getElementById('projectTabs')?.scrollIntoView({block:'start',behavior:'auto'});
 }));
 document.addEventListener('visibilitychange',()=>{if(document.hidden)for(const video of overview.querySelectorAll('video'))video.pause();});
 paint();
 return {show,get page(){return page;},get loaded(){return !!app;}};
}

export function createCapabilityPanels(root){
 const panels=[...root.querySelectorAll('.ov-capability')];
 function activate(panel){for(const item of panels){const selected=item===panel;item.classList.toggle('is-active',selected);item.querySelector('.ov-capability-toggle')?.setAttribute('aria-expanded',String(selected));}}
 for(const panel of panels){
  panel.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse')activate(panel);});
  panel.addEventListener('focusin',()=>activate(panel));
  panel.querySelector('.ov-capability-toggle')?.addEventListener('click',()=>activate(panel));
 }
 if(panels.length)activate(panels[0]);
 return {activate};
}

export function createMediaViewer(document){
 const dialog=document.getElementById('overviewImageDialog'),image=document.getElementById('overviewImage'),caption=document.getElementById('overviewImageCaption');
 if(!dialog)return;
 let previous=null;
 for(const button of document.querySelectorAll('[data-overview-image]'))button.addEventListener('click',()=>{
  previous=button;image.src=button.dataset.overviewImage;image.alt=button.dataset.caption||'Research hardware';caption.textContent=button.dataset.caption||'';dialog.showModal();
 });
 document.getElementById('closeOverviewImage').addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
 dialog.addEventListener('close',()=>previous?.focus({preventScroll:true}));
}

export function createProjectNotices(document){
 let previous=null;
 const dialogs=[...document.querySelectorAll('.site-notice')];
 for(const button of document.querySelectorAll('[data-site-notice]'))button.addEventListener('click',()=>{
  const dialog=document.getElementById(button.dataset.siteNotice);if(!dialog)return;previous=button;dialog.showModal();
 });
 for(const dialog of dialogs){
  dialog.querySelector('[data-close-notice]')?.addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const bounds=dialog.getBoundingClientRect();if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)dialog.close();});
  dialog.addEventListener('close',()=>previous?.focus({preventScroll:true}));
 }
}

if(typeof document!=='undefined'&&document.getElementById('overviewPanel')){
 const animation=createConceptAnimation({document,window});
 const readiness=createReadiness(document);
 const spectrum=createReadinessSpectrum({document,window});
 const focusMotion=createFocusMotion({document,window});
 const videos=createVideos({document,window});
 const simulation=createSimulationPanel({document,window});
 const navigation=createPageNavigation({document,loadStudio:()=>import('./app.js?v=tools-az'),onSimulationMode:mode=>simulation?.select(mode),onPageChange:page=>{spectrum?.setPage(page);animation?.setPage(page);focusMotion?.setPage(page);videos?.setPage(page);simulation?.setPage(page);}});
 for(const group of document.getElementById('overviewPanel').querySelectorAll('.ov-capabilities'))createCapabilityPanels(group);createMediaViewer(document);createProjectNotices(document);
 window.__overview={getPage:()=>navigation.page,isStudioLoaded:()=>navigation.loaded,readiness:()=>readiness?.info(),spectrum:()=>spectrum?.info(),animation:()=>animation?.info(),focusMotion:()=>focusMotion?.info(),videos:()=>videos?.info(),simulation:()=>simulation?.info()};
}
