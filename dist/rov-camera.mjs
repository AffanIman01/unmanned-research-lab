// Shared virtual camera rig. Offsets are metres, relative to the ROV body centre.
export const ROV_VIEWS=['first','close','third','free'];
export const ROV_VIEW_LABELS={first:'First person',close:'Close follow',third:'Third person',free:'Free view'};
const rotate=([x,y,z],q)=>{
 const tx=2*(q.y*z-q.z*y),ty=2*(q.z*x-q.x*z),tz=2*(q.x*y-q.y*x);
 return [x+q.w*tx+q.y*tz-q.z*ty,y+q.w*ty+q.z*tx-q.x*tz,z+q.w*tz+q.x*ty-q.y*tx];
};
export function rovCameraPose(mode,center,q,tilt=0){
 const add=v=>v.map((n,i)=>n+center[i]);
 const yaw=Math.atan2(2*(q.x*q.z+q.w*q.y),1-2*(q.x*q.x+q.y*q.y));
 const horizontal={x:0,y:Math.sin(yaw/2),z:0,w:Math.cos(yaw/2)};
 if(mode==='first'){
  const offset=rotate([0,.025,.36],q),direction=rotate([0,Math.sin(tilt),Math.cos(tilt)],q);
  return {eye:add(offset),target:add(offset.map((n,i)=>n+direction[i]*3)),up:rotate([0,1,0],q),fov:70};
 }
 if(mode==='close')return {eye:add(rotate([0,.23,-.72],horizontal)),target:add(rotate([0,.025,2],q)),up:[0,1,0],fov:70};
 return {eye:add(rotate([1.2,.85,-2.3],horizontal)),target:add([0,.03,0]),up:[0,1,0],fov:52};
}
