// Decorative pathway sweep only. Never changes the project's assessed TRL.
export function createReadinessSpectrum({document,window}){
 const root=document.getElementById('researchReadiness');
 const button=document.getElementById('replayTrlSpectrum');
 if(!root||!button)return null;
 const media=window.matchMedia?.('(prefers-reduced-motion: reduce)');
 let pageVisible=true,inView=!window.IntersectionObserver,played=false,running=false;
 const allowed=()=>pageVisible&&inView&&!document.hidden&&!media?.matches;
 function stop(){running=false;root.classList.remove('is-spectrum-playing');}
 function play(){
  if(!allowed())return;
  stop();void root.offsetWidth;
  played=true;running=true;root.classList.add('is-spectrum-playing');
 }
 function sync(){
  button.disabled=!!media?.matches;
  if(!allowed())stop();
  else if(!played)play();
 }
 const onEnd=event=>{if(event.animationName==='trl-spectrum-sweep')stop();};
 root.addEventListener('animationend',onEnd);
 button.addEventListener('click',play);
 document.addEventListener('visibilitychange',sync);
 media?.addEventListener?.('change',sync);
 let observer=null;
 if(window.IntersectionObserver){
  observer=new window.IntersectionObserver(entries=>{
   inView=entries.some(entry=>entry.isIntersecting);sync();
  },{threshold:.25});
  observer.observe(root.querySelector('.ov-trl-scale')||root);
 }
 sync();
 return {
  setPage(page){pageVisible=page==='overview';sync();},
  info:()=>({running,played,pageVisible,inView,reducedMotion:!!media?.matches}),
  dispose(){stop();observer?.disconnect();root.removeEventListener('animationend',onEnd);button.removeEventListener('click',play);document.removeEventListener('visibilitychange',sync);media?.removeEventListener?.('change',sync);}
 };
}
