import assert from 'node:assert/strict';
import {rovCameraPose} from '../../dist/rov-camera.mjs';
import {isLevel} from '../../dist/rov-level.mjs';
import {createPose,step} from '../../dist/rov-simulator/physics.mjs';
import {readPilotKeys} from '../../dist/rov-simulator/controls.mjs';
import {stepRov} from '../../simulation-source/lib/rov-motion.ts';
import {pilotAxes} from '../../simulation-source/lib/pilot-controls.ts';
let count=0;const check=(label,fn)=>{fn();count++;console.log('PASS '+label)};
const neutral=readPilotKeys(new Set(),false,100);
check('first camera outside front; close behind and substantially closer than third',()=>{
 const q={x:0,y:0,z:0,w:1},origin=[0,0,0];const first=rovCameraPose('first',origin,q),close=rovCameraPose('close',origin,q),third=rovCameraPose('third',origin,q);
 assert(first.eye[2]>.304);assert(first.target[2]>first.eye[2]);assert(close.eye[2]<-.304);assert(close.target[2]>0);assert(Math.hypot(...close.eye)<Math.hypot(...third.eye)*.4);
});
check('camera follows yaw and translation without changing distance',()=>{
 const q={x:0,y:Math.sin(Math.PI/4),z:0,w:Math.cos(Math.PI/4)};
 for(const view of ['first','close','third']){const a=rovCameraPose(view,[0,0,0],{x:0,y:0,z:0,w:1}),b=rovCameraPose(view,[5,-2,8],q);const d=b.eye.map((n,i)=>n-[5,-2,8][i]);assert(Math.abs(Math.hypot(...a.eye)-Math.hypot(...d))<1e-9);assert(Math.abs(d[0]-a.eye[2])<1e-9);}
});
check('first-person up vector tracks roll; external views keep horizon upright',()=>{
 const q={x:0,y:0,z:Math.sin(.3),w:Math.cos(.3)};assert(Math.abs(rovCameraPose('first',[0,0,0],q).up[0])>.5);assert.deepEqual(rovCameraPose('close',[0,0,0],q).up,[0,1,0]);
});
check('static yaw left/right produces opposite headings, no translation',()=>{
 for(const [code,sign]of [['KeyZ',-1],['KeyX',1]]){const p=createPose();step(p,readPilotKeys(new Set([code]),true,100),.05,false);assert(p.yaw*sign>0);assert.equal(p.x,0);assert.equal(p.z,0);}
});
check('static leveling is gradual and preserves heading/depth/position',()=>{
 const p={...createPose(),roll:30,pitch:-25,yaw:214};step(p,neutral,.02,false,false,true);assert(p.roll>0&&p.roll<30);for(let i=0;i<250;i++)step(p,neutral,.02,false,false,true);assert(isLevel(p.roll*Math.PI/180,p.pitch*Math.PI/180));assert.equal(p.yaw,214);assert.equal(p.depth,1.2);assert.equal(p.x,0);assert.equal(p.z,0);
});
const start=()=>({x:0,y:-1,z:0,heading:1.2,speed:0,vertical:0,yaw:0,roll:.7,rollRate:0,pitch:-.6,pitchRate:0});
check('water leveling settles with angular momentum; no heading or position reset',()=>{
 let p={...start(),rollRate:.5,pitchRate:-.4};for(let i=0;i<400;i++)p=stepRov(p,0,0,0,.02,{x:0,y:0,z:0},undefined,0,0,0,.25,true).state;assert(isLevel(p.roll,p.pitch,p.rollRate,p.pitchRate));assert.equal(p.heading,1.2);assert.equal(p.y,-1);assert.equal(p.x,0);assert.equal(p.z,0);
});
check('water yaw keys drive opposite heading changes without roll/pitch commands',()=>{
 for(const [key,sign]of [['z',-1],['x',1]]){const a=pilotAxes(new Set([key]),true);let p={...start(),roll:0,pitch:0};for(let i=0;i<50;i++)p=stepRov(p,0,a.steer,0,.02,{x:0,y:0,z:0}).state;assert((p.heading-1.2)*sign>0);assert.equal(p.roll,0);assert.equal(p.pitch,0);}
});
console.log(count+' camera and stabilization checks passed');
