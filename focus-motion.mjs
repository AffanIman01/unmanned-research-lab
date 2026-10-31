// Small, opt-in GIF previews. The existing capability accordion owns selection
// and layout; this module only controls motion and its accessible play button.
export function createFocusMotion({document,window}){
 const root=document.getElementById('overviewPanel');
 if(!root)return null;
 const cards=[...root.querySelectorAll('.ov-capability, [data-capability]')].map((element,index)=>{
  const image=element.querySelector('img.ov-focus-animation'),button=element.querySelector('button.ov-preview-toggle');
  if(!image||!button||!image.dataset.animation||!image.dataset.poster)return null;
  return {element,image,button,id:element.dataset.capability||String(index),label:element.querySelector('h3')?.textContent?.trim()||'Research focus',mode:'auto',hover:false,focus:false,inView:!window.IntersectionObserver,current:null,pointerIntent:null,moving:false};
 }).filter(Boolean);
 if(!cards.length)return null;
 const media=window.matchMedia?.('(prefers-reduced-motion: reduce)'),cleanups=[];
 let reduced=!!media?.matches,selected=null,pageVisible=true,disposed=false,observer=null;
 const wantsPlay=card=>card.mode==='play'||(card.mode==='auto'&&!reduced&&(card.hover||card.focus));
 function listen(target,type,listener){target.addEventListener(type,listener);cleanups.push(()=>target.removeEventListener?.(type,listener));}
 function render(){
  for(const card of cards){
   card.moving=!disposed&&card===selected&&wantsPlay(card)&&pageVisible&&card.inView&&!document.hidden;
   const source=card.moving?card.image.dataset.animation:card.image.dataset.poster;
   if(source!==card.current){card.image.src=source;card.current=source;}
   card.element.classList.toggle('is-previewing',card.moving);
   card.element.classList.toggle('is-preview-focused',card.focus);
   card.button.setAttribute('aria-pressed',String(card.moving));
   card.button.setAttribute('aria-label',`${card.moving?'Pause':'Play'} ${card.label} animation`);
   card.button.dataset.motionState=card.moving?'playing':'paused';
  }
 }
 function select(card){selected=card;render();}
 for(const card of cards){
  listen(card.element,'pointerenter',event=>{if(event.pointerType==='touch')return;card.hover=true;select(card);});
  listen(card.element,'pointerleave',()=>{card.hover=false;render();});
  listen(card.element,'focusin',()=>{card.focus=true;select(card);});
  listen(card.element,'focusout',event=>{if(card.element.contains(event.relatedTarget))return;card.focus=false;render();});
  // A touch focuses before it clicks. Remember pre-focus intent so the first
  // tap starts a preview instead of instantly pausing an automatic focus play.
  listen(card.button,'pointerdown',()=>{card.pointerIntent=card===selected&&wantsPlay(card);});
  listen(card.button,'pointercancel',()=>{card.pointerIntent=null;});
  listen(card.button,'pointerleave',()=>{card.pointerIntent=null;});
  listen(card.button,'click',()=>{
   const wasPlaying=card.pointerIntent??(card===selected&&wantsPlay(card));
   card.pointerIntent=null;card.mode=wasPlaying?'pause':'play';select(card);
  });
 }
 listen(document,'visibilitychange',render);
 const preferenceChanged=event=>{
  reduced=!!event.matches;
  if(reduced)for(const card of cards)if(card.moving||card.mode==='play')card.mode='pause';
  render();
 };
 if(media?.addEventListener)listen(media,'change',preferenceChanged);
 else if(media?.addListener){media.addListener(preferenceChanged);cleanups.push(()=>media.removeListener?.(preferenceChanged));}
 if(window.IntersectionObserver){
  observer=new window.IntersectionObserver(entries=>{
   for(const entry of entries){const card=cards.find(item=>item.element===entry.target);if(card)card.inView=entry.isIntersecting;}
   render();
  },{threshold:0.05});
  for(const card of cards)observer.observe(card.element);
 }
 render();
 return {
  setPage(page){
   if(disposed)return;pageVisible=page==='overview';
   if(!pageVisible)for(const card of cards){card.hover=false;card.focus=false;card.pointerIntent=null;}
   render();
  },
  info:()=>({selected:selected?.id||null,pageVisible,reducedMotion:reduced,disposed,cards:cards.map(card=>({id:card.id,intent:card.mode,moving:card.moving,inView:card.inView}))}),
  dispose(){if(disposed)return;disposed=true;for(const cleanup of cleanups)cleanup();observer?.disconnect();for(const card of cards){card.focus=false;card.hover=false;}render();},
 };
}
