import {Vector3,Quaternion,Euler} from 'three';
// WMO 3700 height bands; Hs and Tp below are chosen trial inputs, not a WMO period mapping.
export const seaStates=[
 {id:1,name:'Calm · rippled',min:0,max:.1,hs:.05,tp:2},
 {id:2,name:'Smooth · wavelets',min:.1,max:.5,hs:.3,tp:3},
 {id:3,name:'Slight',min:.5,max:1.25,hs:.875,tp:4.5},
 {id:4,name:'Moderate',min:1.25,max:2.5,hs:1.875,tp:6},
 {id:5,name:'Rough',min:2.5,max:4,hs:3.25,tp:8}
];
export type SeaSettings={hs:number;tp:number;direction:number;spread:number;seed:number;enabled:boolean};
export const defaultSea:SeaSettings={hs:.3,tp:3,direction:0,spread:25,seed:120,enabled:true};
export const G=9.81,SEA_DEPTH=50,COMPONENTS=32;
export type WaveComponent={a:number;k:number;w:number;dx:number;dz:number;phase:number};
export type WaterSample={height:number;vx:number;vy:number;vz:number};
export type WaterField=(x:number,y:number,z:number)=>WaterSample;
export function dispersion(w:number,depth:number){
 let k=Math.max(w*w/G,w/Math.sqrt(G*depth));
 for(let i=0;i<12;i++){const t=Math.tanh(k*depth);k-=(G*k*t-w*w)/(G*(t+k*depth*(1-t*t)));}return k;
}
export function makeSpectrum(c:SeaSettings,depth=SEA_DEPTH):WaveComponent[]{
 let seed=c.seed>>>0;const random=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
 const fp=1/Math.max(1,c.tp),df=2.8*fp/COMPONENTS;
 const waves=Array.from({length:COMPONENTS},(_,i)=>{
  // Stratified frequency sampling avoids artificial harmonic repetition.
  const f=.4*fp+(i+.15+.7*random())*df,r=f/fp,sigma=f<=fp?.07:.09;
  const shape=f**-5*Math.exp(-1.25*r**-4)*3.3**Math.exp(-.5*((r-1)/sigma)**2);
  const angle=(c.direction+(random()+random()-1)*c.spread)*Math.PI/180;
  const w=2*Math.PI*f;
  return {a:Math.sqrt(2*shape*df),k:dispersion(w,depth),w,dx:Math.sin(angle),dz:Math.cos(angle),phase:random()*Math.PI*2};
 });
 const variance=waves.reduce((sum,p)=>sum+p.a*p.a/2,0),scale=Math.max(0,c.hs)/(4*Math.sqrt(variance));
 return waves.map(p=>({...p,a:p.a*scale}));
}
export function sampleSea(waves:WaveComponent[],x:number,y:number,z:number,time:number,strength=1,depth=SEA_DEPTH):WaterSample{
 let height=0,vx=0,vy=0,vz=0;
 // Vertical stretching: above mean level, use surface orbital velocity.
 const level=Math.max(-depth,Math.min(0,y));
 for(const p of waves){const phase=p.k*(p.dx*x+p.dz*z)-p.w*time+p.phase,cs=Math.cos(phase),sn=Math.sin(phase),a=p.a*strength;
  height+=a*cs;
  const kd=p.k*depth,ky=p.k*(depth+level);
  const ch=kd>30?Math.exp(p.k*level):Math.cosh(ky)/Math.sinh(kd);
  const sh=kd>30?Math.exp(p.k*level):Math.sinh(ky)/Math.sinh(kd);
  const u=a*p.w*ch*cs;vx+=u*p.dx;vz+=u*p.dz;vy+=a*p.w*sh*sn;
 }
 return {height,vx,vy,vz};
}
// Uniform, steady-current Galilean transform. The spectrum is specified in the
// water frame; current changes require a trial reset so phase stays continuous.
export function sampleAdvectedSea(waves:WaveComponent[],x:number,y:number,z:number,time:number,strength=1,depth=SEA_DEPTH,current:{vx:number;vz:number}={vx:0,vz:0}):WaterSample{
 const water=sampleSea(waves,x-current.vx*time,y,z-current.vz*time,time,strength,depth);
 return {...water,vx:water.vx+current.vx,vz:water.vz+current.vz};
}
export type BodyParams={mass:number;drag:number};
export const defaultBody:BodyParams={mass:180,drag:1};
// Reduced-order rigid body: 8 prismatic buoyancy stations, diagonal inertia,
// gravity, submerged relative-flow drag and differential thrust. No BEM/CFD.
export class MarineBody{
 position=new Vector3();velocity=new Vector3();rotation=new Quaternion();omega=new Vector3();
 failed=false;warning='';boundary=false;heaveAcceleration=0;
 reset(){this.failed=false;this.position.set(0,0,0);this.velocity.set(0,0,0);this.rotation.identity();this.omega.set(0,0,0);this.warning='';this.boundary=false;}
 step(dt:number,field:WaterField,throttle:number,steer:number,params:BodyParams,pool:boolean,hold:{x:number;z:number;heading:number}|null,attached=true){
  if(this.failed)return;
  const mass=Math.max(60,params.mass-(attached?0:20));
  const force=new Vector3(0,-mass*G,0),torque=new Vector3();const inv=this.rotation.clone().invert();
  const inertia=new Vector3(mass*.35,mass*.45,mass*.25);
  const apply=(f:Vector3,r:Vector3)=>{force.add(f);torque.add(new Vector3().crossVectors(r,f));};
  const area=params.mass/(1025*.18*8);
  for(const x of [-.52,.52])for(const z of [-.9,-.3,.3,.9]){
   const r=new Vector3(x,0,z).applyQuaternion(this.rotation),p=r.clone().add(this.position),water=field(p.x,p.y-.12,p.z);
   const immersion=Math.max(0,Math.min(.55,.18+water.height-p.y));
   apply(new Vector3(0,1025*G*area*immersion,0),r);
   if(immersion>0){
    const worldOmega=this.omega.clone().applyQuaternion(this.rotation);
    const relative=new Vector3().crossVectors(worldOmega,r).add(this.velocity).sub(new Vector3(water.vx,water.vy,water.vz)).applyQuaternion(inv);
    const wet=Math.min(1,immersion/.18)*params.drag;
    const drag=new Vector3(-wet*(9+14*Math.abs(relative.x))*relative.x,-wet*(40+20*Math.abs(relative.y))*relative.y,-wet*(4+5*Math.abs(relative.z))*relative.z).applyQuaternion(this.rotation);
    apply(drag,r);
   }
  }
  force.add(new Vector3(0,0,Math.max(-1,Math.min(1,throttle))*120).applyQuaternion(this.rotation));
  torque.add(new Vector3(0,Math.max(-1,Math.min(1,steer))*60,0).applyQuaternion(this.rotation));
  if(hold){force.x+=Math.max(-250,Math.min(250,180*(hold.x-this.position.x)-160*this.velocity.x));force.z+=Math.max(-250,Math.min(250,180*(hold.z-this.position.z)-160*this.velocity.z));const yaw=new Euler().setFromQuaternion(this.rotation,'YXZ').y;torque.y+=Math.max(-100,Math.min(100,70*Math.atan2(Math.sin(hold.heading-yaw),Math.cos(hold.heading-yaw))-65*this.omega.y));}
  this.heaveAcceleration=force.y/mass;this.velocity.addScaledVector(force,dt/mass);this.position.addScaledVector(this.velocity,dt);
  torque.applyQuaternion(inv).sub(new Vector3().crossVectors(this.omega,new Vector3().copy(this.omega).multiply(inertia)));
  torque.sub(this.omega.clone().multiply(new Vector3(20,35,20)).multiplyScalar(params.drag));
  this.omega.addScaledVector(torque.divide(inertia),dt);
  const speed=this.omega.length();if(speed>1e-8)this.rotation.multiply(new Quaternion().setFromAxisAngle(this.omega.clone().divideScalar(speed),speed*dt)).normalize();
  const angles=new Euler().setFromQuaternion(this.rotation,'YXZ');
  this.warning=Math.max(Math.abs(angles.x),Math.abs(angles.z))>.52?'Large attitude · reduced-order accuracy limited':'';
  // End this approximation before interpreting a capsizing solution as a real prediction.
  if(Math.max(Math.abs(angles.x),Math.abs(angles.z))>1.05||Math.abs(this.position.y)>8){this.failed=true;this.warning='Model limit reached · reset trial';this.velocity.set(0,0,0);this.omega.set(0,0,0);}
  const bx=pool?5.75:45,bz=pool?10.75:45;this.boundary=Math.abs(this.position.x)>bx||Math.abs(this.position.z)>bz;
  if(this.boundary){this.position.x=Math.max(-bx,Math.min(bx,this.position.x));this.position.z=Math.max(-bz,Math.min(bz,this.position.z));this.velocity.x=0;this.velocity.z=0;}
 }
}
