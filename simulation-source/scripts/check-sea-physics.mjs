// Run: node --experimental-strip-types scripts/check-sea-physics.mjs
import assert from 'node:assert/strict';
import {MarineBody,makeSpectrum,sampleSea,sampleAdvectedSea,seaStates,defaultSea,defaultBody} from '../lib/sea-physics.ts';
import {stepRov} from '../lib/rov-motion.ts';
import {Euler} from 'three';
const flat=()=>({height:0,vx:0,vy:0,vz:0});
const finiteBody=body=>assert([...body.position.toArray(),...body.velocity.toArray(),...body.rotation.toArray(),...body.omega.toArray()].every(Number.isFinite));
const close=(a,b,tolerance=1e-10)=>assert(Math.abs(a-b)<=tolerance,`${a} differs from ${b}`);
const resting=new MarineBody();for(let i=0;i<7200;i++)resting.step(1/120,flat,0,0,defaultBody,false,null);assert(resting.position.length()<1e-8);
const disturbed=new MarineBody();disturbed.position.y=.2;disturbed.rotation.setFromEuler(new Euler(.12,0,.15));for(let i=0;i<7200;i++)disturbed.step(1/120,flat,0,0,defaultBody,false,null);
// No horizontal mooring: the test requires decay of velocity and tilt, not return to x=z=0.
assert(Math.abs(disturbed.position.y)<.01);assert(disturbed.velocity.length()<.001);const relaxed=new Euler().setFromQuaternion(disturbed.rotation,'YXZ');assert(Math.abs(relaxed.x)<.01&&Math.abs(relaxed.z)<.01);
// Cut thrust while moving: inertia retains motion and water drag dissipates
// speed, rather than teleporting the boat into a stationary state.
const coast=new MarineBody();coast.velocity.z=1;
for(let i=0;i<3600;i++){const before=coast.velocity.lengthSq();coast.step(1/120,flat,0,0,defaultBody,false,null);finiteBody(coast);assert(coast.velocity.lengthSq()<=before+1e-12);if(i===0)assert(coast.velocity.z>.95&&coast.velocity.z<1);}
assert(coast.position.z>.1&&coast.position.z<10);assert(coast.velocity.length()<.003);
// A body comoving with a uniform current has no horizontal relative-flow drag.
// An initially resting body approaches that flow velocity without self-drive.
const current={vx:.4,vz:-.2},flow=()=>({height:0,vx:current.vx,vy:0,vz:current.vz});
const drifting=new MarineBody(),comoving=new MarineBody();comoving.velocity.set(current.vx,0,current.vz);
for(let i=0;i<3600;i++){drifting.step(1/120,flow,0,0,defaultBody,false,null);comoving.step(1/120,flow,0,0,defaultBody,false,null);finiteBody(drifting);finiteBody(comoving);}
close(comoving.velocity.x,current.vx);close(comoving.velocity.z,current.vz);
assert(drifting.position.x>0&&drifting.position.z<0);close(drifting.velocity.x,current.vx,.002);close(drifting.velocity.z,current.vz,.002);
// Check transport in the water frame in both finite and deep water, including
// the zero-current identity and the current-only result after waves ease out.
for(const depth of [2,50]){const waves=makeSpectrum(defaultSea,depth);for(const time of [0,1.3,17]){
 const x=2.7,y=-.4,z=-1.6,strength=.7;
 const base=sampleSea(waves,x,y,z,time,strength,depth);
 const transported=sampleAdvectedSea(waves,x+current.vx*time,y,z+current.vz*time,time,strength,depth,current);
 close(transported.height,base.height);close(transported.vx,base.vx+current.vx);close(transported.vy,base.vy);close(transported.vz,base.vz+current.vz);
 assert.deepEqual(sampleAdvectedSea(waves,x,y,z,time,strength,depth),base);
 assert.deepEqual(sampleAdvectedSea(waves,x,y,z,time,0,depth,current),{height:0,vx:current.vx,vy:0,vz:current.vz});
}}
for(const preset of seaStates){const c={...defaultSea,...preset},waves=makeSpectrum(c);const hs=4*Math.sqrt(waves.reduce((n,p)=>n+p.a*p.a/2,0));assert(Math.abs(hs-preset.hs)<1e-9);assert.deepEqual(waves,makeSpectrum(c));
 for(const w of waves)assert(Math.abs(9.81*w.k*Math.tanh(w.k*50)-w.w*w.w)<1e-8);
 let sum=0,sum2=0;for(let i=0;i<18000;i++){const h=sampleSea(waves,0,0,0,i*.1).height;sum+=h;sum2+=h*h;}const measured=4*Math.sqrt(sum2/18000-(sum/18000)**2);assert(Math.abs(measured/hs-1)<.06);
 const body=new MarineBody();let maxRoll=0,maxPitch=0,maxHeave=0;
 for(let i=0;i<7200;i++){const t=i/120,field=(x,y,z)=>sampleSea(waves,x,y,z,t,1-Math.exp(-t/3));body.step(1/120,field,0,0,defaultBody,false,null);const angles=new Euler().setFromQuaternion(body.rotation,'YXZ');maxRoll=Math.max(maxRoll,Math.abs(angles.z)*180/Math.PI);maxPitch=Math.max(maxPitch,Math.abs(angles.x)*180/Math.PI);maxHeave=Math.max(maxHeave,Math.abs(body.position.y));finiteBody(body);}
 console.log(JSON.stringify({seaState:preset.id,hs,measuredHs:measured,maxRoll,maxPitch,maxHeave,modelLimit:body.failed}));
}
for(const sea of [false,true]){let s={x:0,y:-1,z:0,heading:0,speed:0,vertical:0,yaw:0,roll:0,rollRate:0};const anchor={x:0,y:-.25,z:0};for(let i=0;i<6000;i++){const r=stepRov(s,1,.1,i<3000?-1:1,1/60,anchor,{sea,water:flat()});s=r.state;assert(Object.values(s).every(Number.isFinite));assert(s.y<=-.55+1e-8&&s.y>=-(sea?7:1.65)-1e-8);assert(Math.hypot(s.x,s.y+.25,s.z)<=8+1e-8);}}
console.log('PASS: calm equilibrium, tilt decay, coast-down drag, current drift, Galilean wave advection, repeatable spectral energy, 30-minute Hs statistics, dispersion, finite rigid-body and ROV poses, and ROV bounds.');
