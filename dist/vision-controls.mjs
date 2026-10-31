export function bindVisionControls({getMode,getViewer,onExit,onChange}){
 const $=s=>document.querySelector(s),heldPointers=new Map();
 const canvas=$('#viewport canvas');if(canvas){canvas.tabIndex=0;canvas.addEventListener('pointerdown',()=>canvas.focus({preventScroll:true}));}
 const clear=()=>{getViewer()?.vision.clear();heldPointers.clear();document.querySelectorAll('[data-ptz]').forEach(b=>b.classList.remove('active'));};
 const editable=target=>target?.closest?.('input,textarea,select,[contenteditable],dialog');
 document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&getMode()!=='orbit'&&!document.querySelector('dialog[open]')){clear();onExit();return;}
  const key=e.key.toLowerCase();if(getMode()!=='usv'||!['w','a','s','d'].includes(key)||e.ctrlKey||e.altKey||e.metaKey||editable(e.target)||document.querySelector('dialog[open]'))return;
  e.preventDefault();getViewer()?.vision.hold(key,true);
 });
 document.addEventListener('keyup',e=>getViewer()?.vision.hold(e.key.toLowerCase(),false));
 window.addEventListener('blur',clear);document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
 document.addEventListener('focusin',e=>{if(editable(e.target))clear();});
 new MutationObserver(()=>{if(document.querySelector('dialog[open]'))clear();}).observe($('#sources'),{attributes:true,attributeFilter:['open']});
 for(const b of document.querySelectorAll('[data-ptz]')){
  const release=e=>{getViewer()?.vision.hold(b.dataset.ptz,false);heldPointers.delete(e.pointerId);b.classList.remove('active');};
  b.addEventListener('pointerdown',e=>{if(getMode()!=='usv')return;e.preventDefault();b.setPointerCapture(e.pointerId);heldPointers.set(e.pointerId,b.dataset.ptz);getViewer()?.vision.hold(b.dataset.ptz,true);b.classList.add('active');});
  for(const name of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(name,release);
 }
 $('#ptzHome').onclick=()=>{getViewer()?.vision.home();$('#ptzZoom').value=1;onChange();};
 $('#ptzZoom').oninput=e=>{getViewer()?.vision.setZoom(e.target.value);onChange();};
 return{clear};
}
