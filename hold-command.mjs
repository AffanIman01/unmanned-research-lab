// A hold is bound to one command and one physical press. Losing eligibility
// cancels it; a key repeat or changed stage cannot start another command.
export const HOLD_MS=1500;
export function createHoldCommand({getCommand,onFire,onProgress=()=>{},duration=HOLD_MS}){
 let source=null,start=0,command=null,fired=false;
 const reset=()=>{source=null;command=null;fired=false;onProgress(0);};
 return {
  press(id,now){if(source!==null)return false;source=id;start=now;command=getCommand();fired=false;onProgress(0);return !!command;},
  release(id){if(id===source)reset();},
  cancel(){command=null;onProgress(0);},
  reset,
  tick(now){if(source===null||!command||fired)return;if(getCommand()!==command){command=null;onProgress(0);return;}const p=Math.max(0,Math.min(1,(now-start)/duration));onProgress(p);if(p===1){fired=true;const action=command;command=null;onFire(action);}},
  get held(){return source!==null;}
 };
}
export function bindHoldCommand({button,getCommand,onFire,onProgress=()=>{},key='l'}){
 let frame=0,disposed=false;
 const hold=createHoldCommand({getCommand,onFire,onProgress});
 const tick=now=>{hold.tick(now);if(!disposed&&hold.held)frame=requestAnimationFrame(tick);else frame=0;};
 const start=id=>{hold.press(id,performance.now());if(!frame)frame=requestAnimationFrame(tick);};
 const editable=e=>e.target?.closest?.('input,textarea,select,[contenteditable],[role="slider"],[role="combobox"]');
 const down=e=>{if(e.key?.toLowerCase()!==key||editable(e)||e.ctrlKey||e.metaKey||e.altKey)return;e.preventDefault();if(!e.repeat)start('key');};
 const up=e=>{if(e.key?.toLowerCase()===key)hold.release('key');};
 const pointer=e=>{if(e.button!==0||button.disabled)return;e.preventDefault();button.setPointerCapture(e.pointerId);start('pointer');};
 const release=()=>hold.release('pointer');
 const cancel=()=>{hold.reset();cancelAnimationFrame(frame);frame=0;};
 const hidden=()=>{if(document.hidden)cancel();};
 const focus=e=>{if(editable(e))hold.cancel();};
 window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',cancel);document.addEventListener('visibilitychange',hidden);document.addEventListener('focusin',focus);
 button?.addEventListener('pointerdown',pointer);for(const event of ['pointerup','pointercancel','lostpointercapture','pointerleave'])button?.addEventListener(event,release);
 return {cancel:()=>hold.cancel(),dispose(){disposed=true;cancel();window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',cancel);document.removeEventListener('visibilitychange',hidden);document.removeEventListener('focusin',focus);button?.removeEventListener('pointerdown',pointer);for(const event of ['pointerup','pointercancel','lostpointercapture','pointerleave'])button?.removeEventListener(event,release);}};
}
