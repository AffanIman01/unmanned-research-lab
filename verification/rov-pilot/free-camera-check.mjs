import assert from 'node:assert/strict';
import {freeCameraState,freeCameraPose,moveFreeCamera,createFreeCamera} from '../../dist/free-camera.mjs';
import {rovCameraPose} from '../../dist/rov-camera.mjs';
import {usvCameraPose} from '../../simulation-source/lib/usv-camera.ts';
import {hudValues} from '../../dist/vehicle-hud.mjs';
const q={x:0,y:0,z:0,w:1};let checks=0;const check=(label,fn)=>{fn();checks++;console.log('PASS '+label);};
check('both vehicle camera seeds round-trip, then orbit without changing range',()=>{
 for(const rig of [rovCameraPose('third',[2,-1,4],q),usvCameraPose('third',[2,0,4],q)]){const s=freeCameraState(rig),original=freeCameraPose(s);assert(Math.hypot(...original.eye.map((v,i)=>v-rig.eye[i]))<1e-9);const radius=s.radius;moveFreeCamera(s,'orbit',150,80);assert.equal(s.radius,radius);assert.notDeepEqual(freeCameraPose(s).eye,rig.eye);assert.deepEqual(s.target,rig.target);}
});
check('pan translates eye and target equally; zoom and pole limits stay finite',()=>{
 const s=freeCameraState(rovCameraPose('third',[0,0,0],q)),before=freeCameraPose(s);moveFreeCamera(s,'pan',100,-50,500);const after=freeCameraPose(s);for(let i=0;i<3;i++)assert(Math.abs((after.eye[i]-before.eye[i])-(after.target[i]-before.target[i]))<1e-9);for(let i=0;i<100;i++){moveFreeCamera(s,'zoom',0,-1000);moveFreeCamera(s,'orbit',10,1000);}assert.equal(s.radius,.15);assert.equal(s.pitch,1.5);assert(freeCameraPose(s).eye.every(Number.isFinite));
});
const handlers={},canvas={clientHeight:600,style:{touchAction:'auto'},addEventListener:(type,fn)=>handlers[type]=fn,removeEventListener:type=>delete handlers[type],setPointerCapture(){},hasPointerCapture:()=>false};
const camera=createFreeCamera(canvas),anchor=rovCameraPose('third',[0,-1,0],q),moved=rovCameraPose('third',[4,-1,8],q);
check('free view stays fixed while vehicle moves; recenter and vehicle switch reset correctly',()=>{
 const initial=camera.update('rov',anchor);assert.deepEqual(camera.update('rov',moved),initial);camera.recenter();const reset=camera.update('rov',moved);assert(Math.abs(reset.eye[0]-initial.eye[0]-4)<1e-9);const usv=usvCameraPose('third',[2,0,1],q);assert.deepEqual(camera.update('usv',usv).target,usv.target);
});
check('real pointer handlers orbit, pan and zoom; inactive presets reject free movement',()=>{
 const e=(extra={})=>({pointerId:1,button:0,clientX:50,clientY:50,preventDefault(){},...extra});camera.update('rov',anchor);let a=camera.update('rov',anchor);handlers.pointerdown(e());handlers.pointermove(e({clientX:150}));handlers.pointerup(e());let b=camera.update('rov',anchor);assert.notDeepEqual(a.eye,b.eye);assert.deepEqual(a.target,b.target);handlers.pointerdown(e({button:2}));handlers.pointermove(e({clientY:100}));handlers.pointerup(e());let c=camera.update('rov',anchor);assert.notDeepEqual(c.target,b.target);handlers.wheel(e({deltaY:150,deltaMode:0}));assert.notDeepEqual(camera.update('rov',anchor).eye,c.eye);camera.update(null,anchor);handlers.pointerdown(e());handlers.pointermove(e({clientX:500}));assert.deepEqual(camera.update(null,anchor),anchor);camera.dispose();assert.equal(Object.keys(handlers).length,0);assert.equal(canvas.style.touchAction,'auto');
});
check('dashboard keeps units and heading wrap; reverse speeds remain positive; no invented battery',()=>{
 const v=hudValues({vehicle:'USV',speed:-1.5,heading:359.8,level:.13,pitch:3,roll:-2,drive:100,vertical:.2,x:1,z:2});assert.equal(v.speed,1.5);assert.equal(v.max,5);assert.equal(v.stats[0][1],'000°');assert(v.stats.some(([k])=>k==='heave'));assert(!v.stats.some(([k])=>k==='battery'));assert(v.angle>-120&&v.angle<120);const rov=hudValues({vehicle:'ROV',speed:8,heading:-10,battery:84});assert.equal(rov.max,8);assert.equal(rov.angle,120);assert.equal(rov.stats[0][1],'350°');assert(rov.stats.some(([k,v])=>k==='battery'&&v==='84%'));
});
console.log(checks+' free camera and telemetry checks passed');
