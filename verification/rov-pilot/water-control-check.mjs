import assert from 'node:assert/strict';
import {pilotAxes,toggleManualArm,hasPilotThrust} from '../../simulation-source/lib/pilot-controls.ts';
import {usvCameraPose} from '../../simulation-source/lib/usv-camera.ts';
let count=0;const check=(name,fn)=>{fn();count++;console.log('PASS '+name);};
const neutral={throttle:0,steer:0,heave:0,roll:0,strafe:0,pitch:0};
check('Z and X command ROV yaw with opposite signs; arrow yaw removed',()=>{
 assert.equal(pilotAxes(new Set(['z']),true).steer,-1);assert.equal(pilotAxes(new Set(['x']),true).steer,1);
 assert.equal(pilotAxes(new Set(['arrowleft','arrowright']),true).steer,0);
 assert.equal(pilotAxes(new Set(['arrowleft']),false).steer,1);
});
check('disarmed manual input is neutral across every axis',()=>{
 assert.deepEqual(pilotAxes(new Set(['w','d','x','r','e','t']),true,false),neutral);
 assert.deepEqual(pilotAxes(new Set(['w','a']),false,false),neutral);
});
check('Space toggles once, does not rearm on repeat, cannot arm when unavailable',()=>{
 let armed=false;armed=toggleManualArm(armed,false,true);assert(armed);
 for(let i=0;i<20;i++)armed=toggleManualArm(armed,true,true);assert(armed);
 armed=toggleManualArm(armed,false,true);assert(!armed);
 for(let i=0;i<20;i++)armed=toggleManualArm(armed,true,true);assert(!armed);
 assert(!toggleManualArm(false,false,false));assert(!toggleManualArm(true,false,false));
});
check('rotational commands and stabilization animate thrust; passive motion does not',()=>{
 for(const axis of ['steer','pitch','roll'])assert(hasPilotThrust(true,{...neutral,[axis]:1}));
 assert(hasPilotThrust(true,neutral,true));assert(!hasPilotThrust(false,{...neutral,steer:1},true));assert(!hasPilotThrust(true,neutral));
});
check('USV close camera is nearer than third person and both follow heading',()=>{
 const q={x:0,y:0,z:0,w:1};const close=usvCameraPose('close',[0,0,0],q),third=usvCameraPose('third',[0,0,0],q);
 assert(Math.hypot(...close.eye)<Math.hypot(...third.eye));assert(close.eye[2]<-1.5);assert(third.eye[2]<-4);assert(close.target[2]>0);
 const turn={x:0,y:Math.sin(Math.PI/4),z:0,w:Math.cos(Math.PI/4)};
 const turned=usvCameraPose('close',[3,0,8],turn);assert(Math.abs(turned.eye[0]-3-close.eye[2])<1e-9);assert(Math.abs(turned.eye[2]-8+close.eye[0])<1e-9);assert.deepEqual(turned.up,[0,1,0]);
});
console.log(count+' Water Operation control checks passed');
