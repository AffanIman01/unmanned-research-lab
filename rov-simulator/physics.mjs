import {levelingRate} from '../rov-level.mjs';
import {sampleRovTankWater} from '../rov-wave-field.mjs';
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function createPose(){return {x:0,z:0,depth:1.2,yaw:0,pitch:0,roll:0,vx:0,vz:0,vd:0,pitchRate:0,rollRate:0,holdDepth:null,t:0,battery:100,boundary:false};}
export function step(p,a,dt,waves=true,hold=false,stabilize=false){
 dt=clamp(dt,0,.05);p.t+=dt;
 const r=p.yaw*Math.PI/180,water=sampleRovTankWater(p.x,-p.depth,p.z,p.t,waves);
 const response=1-Math.exp(-dt*4),norm=Math.max(1,Math.hypot(a.forward,a.strafe));
 p.yaw+=a.yaw*38*dt;
 // Drag tends toward ambient water velocity plus commanded vehicle velocity.
 // Idle/disarmed vehicles therefore drift with orbital water motion.
 const targetX=water.vx+(a.strafe*Math.cos(r)+a.forward*Math.sin(r))*.65/norm;
 const targetZ=water.vz+(-a.forward*Math.cos(r)+a.strafe*Math.sin(r))*.65/norm;
 p.vx+=(targetX-p.vx)*response;p.vz+=(targetZ-p.vz)*response;
 if(hold&&p.holdDepth==null)p.holdDepth=p.depth;
 if(!hold)p.holdDepth=null;
 const holdVelocity=hold?clamp((p.holdDepth-p.depth)*2.4,-.35,.35):0;
 const targetDepthVelocity=-water.vy+(hold?holdVelocity:-a.vertical*.45);
 p.vd+=(targetDepthVelocity-p.vd)*response;
 let x=p.x+p.vx*dt,z=p.z+p.vz*dt,d=p.depth+p.vd*dt;
 p.x=clamp(x,-2.55,2.55);p.z=clamp(z,-5.55,5.55);p.depth=clamp(d,.3,2.7);
 p.boundary=p.x!==x||p.z!==z||p.depth!==d;
 if(p.x!==x)p.vx=0;if(p.z!==z)p.vz=0;if(p.depth!==d)p.vd=0;
 // Differential vertical drag: orbital flow gradients apply an attitude torque.
 // Pitch is nose-up positive here; local forward is (sin(yaw), -cos(yaw)).
 const wavePitch=(water.dVyDx*Math.sin(r)-water.dVyDz*Math.cos(r))*180/Math.PI;
 const waveRoll=-(water.dVyDx*Math.cos(r)+water.dVyDz*Math.sin(r))*180/Math.PI;
 const pitchCommand=stabilize?levelingRate(p.pitch*Math.PI/180)*180/Math.PI:a.pitch*20;
 const rollCommand=stabilize?levelingRate(p.roll*Math.PI/180)*180/Math.PI:a.roll*20;
 p.pitchRate=(p.pitchRate??0)+(pitchCommand+wavePitch-(p.pitchRate??0))*response;
 p.rollRate=(p.rollRate??0)+(rollCommand+waveRoll-(p.rollRate??0))*response;
 p.pitch=clamp(p.pitch+p.pitchRate*dt,-35,35);p.roll=clamp(p.roll+p.rollRate*dt,-35,35);
 if(Math.abs(p.pitch)===35)p.pitchRate=0;if(Math.abs(p.roll)===35)p.rollRate=0;
 const effort=Math.hypot(a.forward,a.strafe,a.vertical,a.yaw,a.roll,a.pitch)+(stabilize?1:0)+(hold?1:0);
 p.battery=Math.max(0,p.battery-dt*(.001+.003*effort));
 return p;
}
