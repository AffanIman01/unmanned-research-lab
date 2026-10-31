// Independent inspection camera. It never writes vehicle or pilot state.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function freeCameraState(rig){
 const d=rig.eye.map((v,i)=>v-rig.target[i]),radius=Math.max(.15,Math.hypot(...d));
 return {target:[...rig.target],radius,yaw:Math.atan2(d[0],d[2]),pitch:Math.asin(clamp(d[1]/radius,-1,1)),fov:rig.fov??52};
}
export function freeCameraPose(s){const c=Math.cos(s.pitch);return {eye:[s.target[0]+s.radius*c*Math.sin(s.yaw),s.target[1]+s.radius*Math.sin(s.pitch),s.target[2]+s.radius*c*Math.cos(s.yaw)],target:[...s.target],up:[0,1,0],fov:s.fov};}
export function moveFreeCamera(s,kind,dx,dy,height=600){
 if(kind==='orbit'){s.yaw-=dx*.006;s.pitch=clamp(s.pitch+dy*.006,-1.50,1.50);}
 if(kind==='pan'){const scale=2*s.radius*Math.tan(s.fov*Math.PI/360)/Math.max(1,height),right=[Math.cos(s.yaw),0,-Math.sin(s.yaw)],up=[-Math.sin(s.yaw)*Math.sin(s.pitch),Math.cos(s.pitch),-Math.cos(s.yaw)*Math.sin(s.pitch)];s.target=s.target.map((v,i)=>v+(-dx*right[i]+dy*up[i])*scale);}
 if(kind==='zoom')s.radius=clamp(s.radius*Math.exp(clamp(dy,-1000,1000)*.0015),.15,150);
 return s;
}
export function createFreeCamera(canvas){
 let state=null,key=null,pending=false;const pointers=new Map(),listeners=[];
 const on=(type,fn,opts)=>{canvas.addEventListener(type,fn,opts);listeners.push([type,fn,opts]);};
 const clear=()=>pointers.clear();
 const down=e=>{if(!key)return;e.preventDefault();canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY,pan:e.button!==0||e.shiftKey});};
 const move=e=>{if(!key||!pointers.has(e.pointerId))return;e.preventDefault();const prev=pointers.get(e.pointerId),next={...prev,x:e.clientX,y:e.clientY},others=[...pointers.entries()].filter(([id])=>id!==e.pointerId);pointers.set(e.pointerId,next);if(others.length){const other=others[0][1],before=Math.hypot(prev.x-other.x,prev.y-other.y),after=Math.hypot(next.x-other.x,next.y-other.y);moveFreeCamera(state,'pan',(next.x-prev.x)/2,(next.y-prev.y)/2,canvas.clientHeight);if(before>1&&after>1)moveFreeCamera(state,'zoom',0,Math.log(before/after)/.0015);}else moveFreeCamera(state,prev.pan||e.shiftKey?'pan':'orbit',next.x-prev.x,next.y-prev.y,canvas.clientHeight);};
 const up=e=>{pointers.delete(e.pointerId);if(canvas.hasPointerCapture?.(e.pointerId))canvas.releasePointerCapture(e.pointerId);};
 on('pointerdown',down);on('pointermove',move);on('pointerup',up);on('pointercancel',up);on('lostpointercapture',up);
 on('wheel',e=>{if(!key)return;e.preventDefault();moveFreeCamera(state,'zoom',0,e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?canvas.clientHeight:1));},{passive:false});
 on('contextmenu',e=>{if(key)e.preventDefault();});on('dblclick',()=>{if(key)pending=true;});
 const blur=()=>clear();globalThis.addEventListener?.('blur',blur);
 const oldTouchAction=canvas.style.touchAction;
 return {update(next,rig){if(next!==key||pending){clear();state=next?freeCameraState(rig):null;pending=false;}key=next;canvas.style.touchAction=key?'none':oldTouchAction;canvas.style.cursor=key?'grab':'';return key?freeCameraPose(state):rig;},recenter(){pending=true;},dispose(){clear();for(const [type,fn,opts]of listeners)canvas.removeEventListener(type,fn,opts);globalThis.removeEventListener?.('blur',blur);canvas.style.touchAction=oldTouchAction;canvas.style.cursor='';}};
}
