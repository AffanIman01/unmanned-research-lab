import {levelingRate} from '../../dist/rov-level.mjs';
// Visual pool controls only; limits are provisional, not CHASING specifications.
export type RovStage='docked'|'stopping'|'lowering'|'unlocking'|'descending'|'free'|'clearance'|'returning'|'docking'|'locking'|'raising';
export const stageLabels:Record<RovStage,string>={docked:'Docked · USV controls',stopping:'1 / 4 · Holding USV position',lowering:'2 / 4 · Lowering lift',unlocking:'3 / 4 · Opening mechanical lock',descending:'4 / 4 · Descending to 1 m',free:'ROV deployed · manual control',clearance:'Recovery · setting approach depth',returning:'Recovery · returning below mount',docking:'Recovery · aligning with ring',locking:'Recovery · closing mechanical lock',raising:'Recovery · raising to 47.6%'};
export const ease=(t:number)=>{const p=Math.max(0,Math.min(1,t));return p*p*p*(p*(p*6-15)+10);};
export type RovPose={x:number;y:number;z:number;heading:number;speed:number;vertical:number;yaw:number;roll:number;rollRate:number;pitch?:number;pitchRate?:number;vx?:number;vz?:number};
export const ROV_MIN_DEPTH=.55,ROV_MAX_DEPTH=1.65,TETHER_REACH=8;
export function stepRov(s:RovPose,throttle:number,steer:number,heave:number,seconds:number,anchor:{x:number;y:number;z:number},environment?:{sea:boolean;maxDepth?:number;water:{height:number;vx:number;vy:number;vz:number;dVyDx?:number;dVyDz?:number}},rollInput=0,strafeInput=0,pitchInput=0,speedScale=1,stabilize=false){
 const dt=Math.max(0,Math.min(.05,seconds));const clamp=(n:number)=>Math.max(-1,Math.min(1,n));
 const sea=environment?.sea??false,flow=environment?.water??{height:0,vx:0,vy:0,vz:0};
 const gain=Math.max(.25,Math.min(1,speedScale));
 const wet=Math.max(0,Math.min(1,(flow.height-s.y)/.2));
 const yaw=s.yaw+(clamp(steer)*.65*gain-s.yaw)*Math.min(1,dt*4);
 const heading=s.heading+yaw*dt;
 // Damped manual roll-rate control about the longitudinal axis. Releasing the
 // key brakes rotation and retains the attitude; recovery levels automatically.
 // The provisional 0.9 rad/s limit is not a manufacturer performance claim.
 // Differential water velocity across the frame creates a bounded attitude
 // disturbance. Gradients are sampled from the same rendered wave field at
 // vehicle depth; phase and attenuation therefore stay coupled to that field.
 const gx=flow.dVyDx??0,gz=flow.dVyDz??0;
 const waveRollRate=clamp(gx*Math.cos(heading)-gz*Math.sin(heading))*.8*wet;
 const wavePitchRate=-clamp(gx*Math.sin(heading)+gz*Math.cos(heading))*.8*wet;
 const targetRollRate=(stabilize?levelingRate(s.roll)*wet:clamp(rollInput)*.9*wet*gain)+waveRollRate;
 const response=1-Math.exp(-5*dt);
 const rollRate=s.rollRate+(targetRollRate-s.rollRate)*response;
 const angle=s.roll+targetRollRate*dt+(s.rollRate-targetRollRate)*response/5;
 const roll=Math.atan2(Math.sin(angle),Math.cos(angle));
 const targetPitchRate=(stabilize?levelingRate(s.pitch??0)*wet:-clamp(pitchInput)*.9*wet*gain)+wavePitchRate;
 const oldPitchRate=s.pitchRate??0;
 const pitchRate=oldPitchRate+(targetPitchRate-oldPitchRate)*response;
 const pitchAngle=(s.pitch??0)+targetPitchRate*dt+(oldPitchRate-targetPitchRate)*response/5;
 const pitch=Math.atan2(Math.sin(pitchAngle),Math.cos(pitchAngle));
 // Forward and sideways commands stay in the heading-relative horizontal plane.
 // Heave is world vertical, independent of pitch/roll.
 const length=Math.max(1,Math.hypot(clamp(throttle),clamp(strafeInput)));
 const forward=clamp(throttle)/length,strafe=clamp(strafeInput)/length;
 let vx=s.vx??Math.sin(s.heading)*s.speed,vz=s.vz??Math.cos(s.heading)*s.speed;
 const drag=(v:number)=>-(12+35*Math.abs(v))*v;
 vx+=(40*gain*(forward*Math.sin(heading)+strafe*Math.cos(heading))*wet+drag(vx-flow.vx))*dt/32;
 vz+=(40*gain*(forward*Math.cos(heading)-strafe*Math.sin(heading))*wet+drag(vz-flow.vz))*dt/32;
 const relativeVertical=s.vertical-flow.vy;
 const vertical=s.vertical+(22*clamp(heave)*wet*gain-(22+40*Math.abs(relativeVertical))*relativeVertical-20*9.81*(1-wet))*dt/32;
 const speed=vx*Math.sin(heading)+vz*Math.cos(heading);
 let x=s.x+vx*dt,z=s.z+vz*dt,y=s.y+vertical*dt;
 let hit='';
 const maxDepth=environment?.maxDepth??(sea?7:ROV_MAX_DEPTH);
 if(y> -ROV_MIN_DEPTH||y< -maxDepth){y=Math.max(-maxDepth,Math.min(-ROV_MIN_DEPTH,y));hit='Depth limit';}
 const bx=sea?46:6.45,bz=sea?46:11.25;
 if(Math.abs(x)>bx||Math.abs(z)>bz){x=Math.max(-bx,Math.min(bx,x));z=Math.max(-bz,Math.min(bz,z));hit='Pool boundary';}
 if(y<anchor.y-TETHER_REACH+.1){y=anchor.y-TETHER_REACH+.1;hit='8 m tether reach';}
 const dx=x-anchor.x,dz=z-anchor.z;const horizontal=Math.hypot(dx,dz);
 const reach=Math.sqrt(Math.max(0,TETHER_REACH*TETHER_REACH-(y-anchor.y)**2));
 if(horizontal>reach){x=anchor.x+dx*reach/horizontal;z=anchor.z+dz*reach/horizontal;hit='8 m tether reach';}
 return {state:{x,y,z,heading,speed:hit?0:speed,vertical:hit?0:vertical,yaw,roll,rollRate,pitch,pitchRate,vx:hit?0:vx,vz:hit?0:vz},hit};
}
