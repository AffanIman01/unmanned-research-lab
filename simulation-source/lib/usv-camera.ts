// Virtual chase viewpoints; offsets are metres, not calibrated camera extrinsics.
export type USVView='orbit'|'first'|'close'|'third'|'free';
type Quat={x:number;y:number;z:number;w:number};
const rotate=([x,y,z]:number[],q:Quat)=>{const tx=2*(q.y*z-q.z*y),ty=2*(q.z*x-q.x*z),tz=2*(q.x*y-q.y*x);return [x+q.w*tx+q.y*tz-q.z*ty,y+q.w*ty+q.z*tx-q.x*tz,z+q.w*tz+q.x*ty-q.y*tx];};
export function usvCameraPose(mode:'close'|'third',center:number[],q:Quat){
 const yaw=Math.atan2(2*(q.x*q.z+q.w*q.y),1-2*(q.x*q.x+q.y*q.y)),horizontal={x:0,y:Math.sin(yaw/2),z:0,w:Math.cos(yaw/2)};
 const add=(v:number[])=>v.map((n,i)=>n+center[i]);
 return {eye:add(rotate(mode==='close'?[0,1.3,-2.1]:[3.8,2.6,-5.5],horizontal)),target:add(rotate(mode==='close'?[0,.4,1.4]:[0,.35,0],horizontal)),up:[0,1,0],fov:mode==='close'?68:52};
}
