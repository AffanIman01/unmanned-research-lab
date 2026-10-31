import {registerHooks} from 'node:module';
import assert from 'node:assert/strict';
import * as T from '../../dist/vendor/three.module.js';
import {createAccessoryState,setAccessoryEnabled,accessoryAction,stepAccessories} from '../../dist/rov-accessory-data.mjs';
registerHooks({resolve(spec,context,next){return spec==='three'?{url:new URL('../../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:next(spec,context);}});
const {attachRovAccessories,createAccessoryTestTarget}=await import('../../dist/rov-accessories.mjs');
let checks=0;
const check=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const wet={armed:true,depth:1.2,speed:0,position:{x:1,z:2}};
check('tools require mounting, arming and submersion',()=>{
 const s=createAccessoryState();
 assert(!accessoryAction(s,'grabber-toggle',wet).ok);
 for(const id of ['grabber','laser','sampler','sonar'])setAccessoryEnabled(s,id,true);
 for(const action of ['grabber-toggle','laser-toggle','sample-start','sonar-toggle']){
  assert(!accessoryAction(s,action,{...wet,armed:false}).ok);
  assert(!accessoryAction(s,action,{...wet,depth:.1}).ok);
 }
 assert(!s.grabberMoving);assert(!s.laserOn);assert(!s.sampling);
});
check('grabber moves gradually, halts on disarm and never resumes stale motion',()=>{
 const s=createAccessoryState();setAccessoryEnabled(s,'grabber',true);
 assert(accessoryAction(s,'grabber-toggle',wet).ok);stepAccessories(s,.05,wet);
 const aperture=s.grabberAperture;assert(aperture>0&&aperture<1);
 stepAccessories(s,.05,{...wet,armed:false});assert.equal(s.grabberAperture,aperture);
 stepAccessories(s,.05,wet);assert.equal(s.grabberAperture,aperture);assert(!s.grabberMoving);
});
check('sampler speed gate pauses collection; completion retains simulated depth and position',()=>{
 const s=createAccessoryState();setAccessoryEnabled(s,'sampler',true);
 assert(!accessoryAction(s,'sample-start',{...wet,speed:.4}).ok);
 assert(accessoryAction(s,'sample-start',wet).ok);
 for(let i=0;i<20;i++)stepAccessories(s,.05,wet);
 const fill=s.sampleFill;assert(fill>0&&fill<1);
 stepAccessories(s,.05,{...wet,speed:.4});assert.equal(s.sampleFill,fill);
 for(let i=0;i<60;i++)stepAccessories(s,.05,wet);
 assert.equal(s.samples,1);assert.equal(s.sampleFill,1);assert(!s.sampling);
 assert.deepEqual(s.lastSample,{number:1,depth:1.2,position:{x:1,z:2}});
 assert(!accessoryAction(s,'sample-start',wet).ok);
 accessoryAction(s,'sample-reset',wet);assert.equal(s.sampleFill,0);
});
check('disarm stops sampler and lasers; re-arm does not restart them',()=>{
 const s=createAccessoryState();for(const id of ['laser','sampler'])setAccessoryEnabled(s,id,true);
 accessoryAction(s,'laser-toggle',wet);accessoryAction(s,'sample-start',wet);
 stepAccessories(s,.05,wet);stepAccessories(s,.05,{...wet,armed:false});
 const fill=s.sampleFill;assert(!s.sampling);assert(!s.laserOn);assert.equal(s.laserRange,null);
 stepAccessories(s,.05,wet);assert.equal(s.sampleFill,fill);assert(!s.sampling);assert(!s.laserOn);
});
const scene=new T.Scene(),rov=new T.Group();rov.position.y=-1.2;rov.rotation.y=Math.PI;scene.add(rov);
const target=createAccessoryTestTarget(scene,{position:[0,-1.2,-3.5]}),rig=attachRovAccessories(rov),s=createAccessoryState();
for(const id of ['grabber','laser','sampler','sonar'])setAccessoryEnabled(s,id,true);
accessoryAction(s,'laser-toggle',wet);scene.updateMatrixWorld(true);rig.update(s,{dt:.02,targets:target.targets});
check('all four accessory models have finite transforms and nonempty geometry',()=>{
 let meshes=0;
 rig.root.traverse(o=>{if(!o.isMesh)return;meshes++;assert(o.geometry.attributes.position.count>0);assert(o.matrixWorld.elements.every(Number.isFinite));});
 assert(meshes>=17);assert(rig.root.getObjectByName('Ping360_sonar_illustrative'));
});
check('two laser rays hit reference plate; target range changes exactly with vehicle translation',()=>{
 const dots=rig.root.getObjectByName('Laser_Scaler_illustrative').children.filter(o=>o.isMesh&&o.geometry.type==='SphereGeometry');
 assert.equal(dots.length,2);assert(dots.every(o=>o.visible));
 assert(s.laserRange>3&&s.laserRange<3.3);const before=s.laserRange;
 rov.position.z=-1;scene.updateMatrixWorld(true);rig.update(s,{dt:.02,targets:target.targets});
 assert(Math.abs(s.laserRange-(before-1))<1e-6);
 assert(Math.abs(dots[0].position.distanceTo(dots[1].position)-.1)<1e-6);
});
check('laser miss clears target range and accessory disposal removes only owned objects',()=>{
 rig.update(s,{dt:.02,targets:[]});assert.equal(s.laserRange,null);
 rig.dispose();target.dispose();assert.equal(scene.children.length,1);assert.equal(rov.children.length,0);
});
check('sonar preview runs only when mounted, armed and submerged',()=>{
 const s=createAccessoryState();setAccessoryEnabled(s,'sonar',true);assert(accessoryAction(s,'sonar-toggle',wet).ok);stepAccessories(s,.1,wet);assert(s.sonarPhase>0);stepAccessories(s,.1,{...wet,armed:false});const phase=s.sonarPhase;assert(!s.sonarOn);stepAccessories(s,.1,wet);assert.equal(s.sonarPhase,phase);
});
const {createAccessoryShowroom}=await import('../../dist/accessory-showroom.mjs');
check('four separated display stations have finite animated geometry and pause correctly',()=>{
 const gallery=createAccessoryShowroom();gallery.root.visible=true;gallery.update(.05);assert.equal(gallery.info().ids.length,4);assert(gallery.bounds().min.z>1);assert(!gallery.bounds('grabber').intersectsBox(gallery.bounds('laser')));assert(!gallery.bounds('grabber').intersectsBox(gallery.bounds('sampler')));gallery.root.updateMatrixWorld(true);
 gallery.root.traverse(o=>{if(o.isMesh){assert(o.geometry.attributes.position.count>0);assert(o.matrixWorld.elements.every(Number.isFinite));}});
 const time=gallery.info().time;gallery.play(false);gallery.update(.1);assert.equal(gallery.info().time,time);gallery.play(true);gallery.update(.1);assert(gallery.info().time>time);
 const jaws=gallery.root.getObjectByName('Grabber_Arm_2_illustrative').children.at(-1);const angle=jaws.rotation.y;gallery.update(.1);assert.notEqual(jaws.rotation.y,angle);
});
console.log(checks+' accessory checks passed');
