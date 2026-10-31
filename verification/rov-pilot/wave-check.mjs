import assert from 'node:assert/strict';
import {tankWave,tankWaveProperties,sampleRovTankWater,tankPaddleOffset} from '../../dist/rov-wave-field.mjs';
import {createPose,step} from '../../dist/rov-simulator/physics.mjs';
import {stepRov} from '../../simulation-source/lib/rov-motion.ts';
const neutral={forward:0,strafe:0,yaw:0,vertical:0,pitch:0,roll:0};
let checks=0;function check(name,fn){fn();checks++;console.log('PASS '+name);}
const near=(a,b,tol=1e-6)=>assert(Math.abs(a-b)<tol,`${a} != ${b}`);
check('finite-depth dispersion and surface vertical velocity agree',()=>{
 const {k,omega}=tankWaveProperties;near(omega*omega,9.81*k*Math.tanh(k*tankWave.depth));
 const dt=1e-5,now=.43,w=sampleRovTankWater(.4,0,-1,now);
 near(w.vy,(sampleRovTankWater(.4,0,-1,now+dt).height-sampleRovTankWater(.4,0,-1,now-dt).height)/(2*dt));
});
check('rendered surface gradients and orbital gradients share phase',()=>{
 const p={x:.7,y:-1.2,z:-2.3,t:1.17},h=1e-5,w=sampleRovTankWater(p.x,p.y,p.z,p.t);
 near(w.slopeX,(sampleRovTankWater(p.x+h,p.y,p.z,p.t).height-sampleRovTankWater(p.x-h,p.y,p.z,p.t).height)/(2*h));
 near(w.slopeZ,(sampleRovTankWater(p.x,p.y,p.z+h,p.t).height-sampleRovTankWater(p.x,p.y,p.z-h,p.t).height)/(2*h));
 near(w.dVyDx,(sampleRovTankWater(p.x+h,p.y,p.z,p.t).vy-sampleRovTankWater(p.x-h,p.y,p.z,p.t).vy)/(2*h));
 near(w.dVyDz,(sampleRovTankWater(p.x,p.y,p.z+h,p.t).vy-sampleRovTankWater(p.x,p.y,p.z-h,p.t).vy)/(2*h));
});
check('orbital flow decays with depth and cannot penetrate the floor',()=>{
 let shallow=0,deep=0;
 for(let i=0;i<100;i++){const a=sampleRovTankWater(0,-.4,0,i*.03),b=sampleRovTankWater(0,-2.7,0,i*.03);shallow+=a.vx*a.vx+a.vy*a.vy+a.vz*a.vz;deep+=b.vx*b.vx+b.vy*b.vy+b.vz*b.vz;near(sampleRovTankWater(0,-3,0,i*.03).vy,0);}
 assert(deep<shallow*.3);assert.equal(tankPaddleOffset(0,1,false),0);
});
check('calm idle stays still; waves move an unpowered ROV in position and attitude',()=>{
 const calm=createPose(),wet=createPose();let maxMove=0,maxTilt=0;
 for(let i=0;i<750;i++){step(calm,neutral,.02,false);step(wet,neutral,.02,true);maxMove=Math.max(maxMove,Math.hypot(wet.x,wet.z,wet.depth-1.2));maxTilt=Math.max(maxTilt,Math.hypot(wet.roll,wet.pitch));}
 near(calm.x,0);near(calm.z,0);near(calm.depth,1.2);near(calm.roll,0);near(calm.pitch,0);assert(maxMove>.08);assert(maxTilt>1);near(wet.yaw,0);
 // Motion is passive: water drift does not increase the motor-effort battery term.
 near(calm.battery,wet.battery);
});
check('depth hold rejects disturbance without freezing the simulated body',()=>{
 const free=createPose(),held=createPose();let freeError=0,heldError=0;
 for(let i=0;i<750;i++){step(free,neutral,.02,true,false);step(held,neutral,.02,true,true);freeError=Math.max(freeError,Math.abs(free.depth-1.2));heldError=Math.max(heldError,Math.abs(held.depth-1.2));}
 assert(heldError>.01);assert(heldError<freeError*.8);assert.equal(held.holdDepth,1.2);
});
check('self-level counters attitude disturbance without cancelling wave translation',()=>{
 const free=createPose(),leveled=createPose();let freeTilt=0,levelTilt=0;
 for(let i=0;i<750;i++){step(free,neutral,.02,true,false,false);step(leveled,neutral,.02,true,false,true);freeTilt=Math.max(freeTilt,Math.hypot(free.roll,free.pitch));levelTilt=Math.max(levelTilt,Math.hypot(leveled.roll,leveled.pitch));}
 assert(levelTilt<freeTilt*.6);assert(Math.hypot(leveled.x,leveled.z)>.01);
});
check('water-operation ROV receives the same sampled velocity/gradient disturbance',()=>{
 const initial=()=>({x:0,y:-1,z:0,heading:.2,speed:0,vertical:0,yaw:0,roll:0,rollRate:0,pitch:0,pitchRate:0});
 let wet=initial(),calm=initial(),move=0,tilt=0;
 for(let i=0;i<750;i++){const time=i*.02;wet=stepRov(wet,0,0,0,.02,{x:0,y:0,z:0},{sea:true,water:sampleRovTankWater(wet.x,wet.y,wet.z,time)}).state;calm=stepRov(calm,0,0,0,.02,{x:0,y:0,z:0},{sea:true,water:sampleRovTankWater(0,-1,0,time,false)}).state;move=Math.max(move,Math.hypot(wet.x,wet.z,wet.y+1));tilt=Math.max(tilt,Math.hypot(wet.roll,wet.pitch));}
 assert(move>.03);assert(tilt>.01);near(calm.x,0);near(calm.y,-1);near(calm.roll,0);near(wet.heading,.2);
});
check('tank limits remain enforced with waves and sustained commands',()=>{
 const p=createPose(),a={forward:1,strafe:1,yaw:1,vertical:1,pitch:1,roll:1};
 for(let i=0;i<1500;i++)step(p,a,.02,true);
 assert(Math.abs(p.x)<=2.55&&Math.abs(p.z)<=5.55&&p.depth>=.3&&p.depth<=2.7);assert(Math.abs(p.roll)<=35&&Math.abs(p.pitch)<=35);
});
console.log(checks+' coherent wave response checks passed');
