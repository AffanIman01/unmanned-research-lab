// Each simulation has its own browsing context. Leaving the tab unloads it.
export function createSimulationPanel({document,window,timeoutMs=25000}){
 const panel=document.getElementById('simulationPanel');if(!panel)return null;
 const host=document.getElementById('simulationFrameHost'),state=document.getElementById('simulationLoadState'),message=document.getElementById('simulationLoadMessage'),fallback=document.getElementById('simulationFallback'),reload=document.getElementById('simulationReload'),subheading=document.getElementById('simulationSubheading');
 const buttons=[...panel.querySelectorAll('[data-simulation-mode]')],heading=panel.querySelector('.simulation-heading h1');
 let page='overview',mode='water',frame=null,timer=null,phase='idle';
 function clearTimer(){if(timer!==null){window.clearTimeout(timer);timer=null;}}
 function unload(){clearTimer();if(frame){frame.remove();frame=null;}host.setAttribute('aria-busy','false');phase='idle';}
 function fail(){unload();phase='error';state.hidden=false;message.textContent='Simulation unavailable. Reload to try again.';fallback.hidden=false;}
 function src(){return mode==='rov'?'./rov-simulator/index.html?v=tools-az':'./water-simulation/index.html?v=tools-az';}
 function paintMode(){
  for(const button of buttons){const selected=button.dataset.simulationMode===mode;button.classList.toggle('active',selected);button.setAttribute('aria-pressed',String(selected));}
  if(heading)heading.textContent=mode==='rov'?'ROV pilot':'Water operation';
  if(subheading)subheading.textContent=mode==='rov'?'M2 PRO MAX · Third-person wave tank · GO1-style controls':'ME120 × M2 PRO MAX · Reopening starts a new trial';
  reload.setAttribute('aria-label',mode==='rov'?'Reset the ROV pilot simulation':'Reload and reset the water simulation');
  fallback.href=src();fallback.textContent=mode==='rov'?'Open ROV pilot in a new tab ↗':'Open simulation in a new tab ↗';
 }
 function load(){
  if(page!=='simulation'||document.hidden)return;
  unload();phase='loading';state.hidden=false;fallback.hidden=true;message.textContent=mode==='rov'?'Opening ROV pilot simulation…':'Opening water simulation…';host.setAttribute('aria-busy','true');
  const next=document.createElement('iframe');frame=next;
  next.title=mode==='rov'?'M2 PRO MAX browser-only pilot simulation':'USV and ROV water-operation browser simulation';next.src=src();
  next.setAttribute('allow','fullscreen');next.setAttribute('allowfullscreen','');next.setAttribute('referrerpolicy','same-origin');
  next.style.opacity='0';next.style.pointerEvents='none';
  next.addEventListener('error',()=>{if(frame===next)fail();});
  host.append(next);timer=window.setTimeout(()=>{if(frame===next)fail();},timeoutMs);
 }
 function receive(event){
  if(!frame||event.source!==frame.contentWindow||event.origin!==window.location.origin)return;
  if(event.data?.type==='water-simulation-error'||event.data?.type==='rov-simulation-error'){fail();return;}
  if(event.data?.type!==(mode==='rov'?'rov-simulation-ready':'water-simulation-ready'))return;
  clearTimer();phase='ready';frame.style.opacity='1';frame.style.pointerEvents='auto';state.hidden=true;host.setAttribute('aria-busy','false');
 }
 function setPage(next){page=next;if(page==='simulation'){if(!frame)load();}else unload();}
 function visibility(){if(page!=='simulation')return;if(document.hidden)unload();else load();}
 function select(next){if(!['water','rov'].includes(next)||next===mode)return;mode=next;paintMode();if(page==='simulation')load();}
 buttons.forEach(button=>button.addEventListener('click',()=>select(button.dataset.simulationMode)));
 reload.addEventListener('click',load);window.addEventListener('message',receive);document.addEventListener('visibilitychange',visibility);paintMode();
 return {setPage,reload:load,select,info:()=>({page,mode,phase,loaded:!!frame}),dispose(){unload();reload.removeEventListener('click',load);window.removeEventListener('message',receive);document.removeEventListener('visibilitychange',visibility);}};
}
