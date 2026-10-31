// Actual ME120 GLB + photo rack + sensing overlay; CPU geometry only, no browser.
import {registerHooks} from 'node:module';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
registerHooks({resolve(spec,context,next){return spec==='three'?{url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:next(spec,context);}});
const {GLTFLoader}=await import('../dist/vendor/GLTFLoader.js');
const {createSensorRack}=await import('../dist/sensor-rack.mjs');
const {createSensingVisuals}=await import('../dist/sensing-visuals.mjs');
const {getHardwareBounds,fitModelFrame}=await import('../dist/model-framing.mjs');
const buffer=await readFile(new URL('../dist/models/me120-reference.glb',import.meta.url));
const vessel=(await new GLTFLoader().parseAsync(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength),'')).scene;
const scene=new T.Scene(),boat=new T.Group(),frame=new T.Group();
scene.add(boat);boat.add(frame);frame.add(vessel);frame.rotation.y=Math.PI/2;frame.position.y=-.25;
vessel.scale.x=1.4/1.4051200151443482;vessel.getObjectByName('antenna').position.y-=.342;
const rack=createSensorRack();vessel.getObjectByName('antenna').add(rack.root);
const sensing=createSensingVisuals({scene,getAnchors:()=>({zed:rack.owners['zed-camera'],lidar:rack.owners['robosense-lidar']})});
scene.updateMatrixWorld(true);
const hullBounds=['hull_port','hull_starboard'].map(name=>{const owner=vessel.getObjectByName(name);assert(owner,'Expected original hull '+name);return {name,box:getHardwareBounds(owner)};});
const results=[];let checks=0;let pointsInHullBoxes=0;let cloudPointsTested=0;
for(const mode of ['stereo','lidar'])for(const distance of [2,8]){
 sensing.setMode(mode);sensing.setDistance(distance);for(let i=0;i<31;i++)sensing.update(.25);sensing.update(.20);
 const overlayBounds=sensing.getBounds().clone(),bounds=overlayBounds.clone().union(getHardwareBounds(boat));
 assert([...bounds.min.toArray(),...bounds.max.toArray()].every(Number.isFinite));
 const cloud=scene.getObjectByName('Synthetic_first_hit_point_cloud');cloud.updateWorldMatrix(true,false);
 const pointData=cloud.geometry.attributes.position.array;
 if(mode==='lidar')for(let i=0;i<cloud.geometry.drawRange.count;i++){
  const p=new T.Vector3().fromArray(pointData,i*3).applyMatrix4(cloud.matrixWorld);cloudPointsTested++;
  if(hullBounds.some(({box})=>box.containsPoint(p)))pointsInHullBoxes++;
  assert(overlayBounds.containsPoint(p),'Every displayed point return is contained by camera overlay bounds');
 }
 for(const [width,height] of [[1280,450],[390,390],[660,390]]){
  const camera=new T.PerspectiveCamera(40,width/height,.02,100);
  const fit=fitModelFrame({bounds,direction:new T.Vector3(.62,.66,1),camera,width,height,safeArea:{left:24,right:24,top:28,bottom:35},margin:1.04});
  assert(fit);camera.position.copy(fit.position);camera.lookAt(fit.target);camera.updateMatrixWorld(true);
  const projected=[];
  for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
   const p=new T.Vector3(x,y,z).project(camera);projected.push(p);
   assert([p.x,p.y,p.z].every(Number.isFinite));
   assert(p.x>=fit.region.x0-1e-9&&p.x<=fit.region.x1+1e-9,'horizontal fit');
   assert(p.y>=fit.region.y0-1e-9&&p.y<=fit.region.y1+1e-9,'vertical fit');
   assert(p.z>=-1&&p.z<=1,'near/far fit');
  }
  checks++;
  results.push({mode,distanceM:distance,viewport:[width,height],cameraDistanceM:+fit.distance.toFixed(3),ndcMin:[Math.min(...projected.map(p=>p.x)),Math.min(...projected.map(p=>p.y))],ndcMax:[Math.max(...projected.map(p=>p.x)),Math.max(...projected.map(p=>p.y))]});
  console.log(`PASS ${mode} ${distance} m ${width}×${height}`);
 }
}
assert.equal(pointsInHullBoxes,0);checks++;
console.log('PASS synthetic returns remain outside both actual hull bounding boxes');
console.log(JSON.stringify({checks,passed:checks,cloudPointsTested,pointsInHullBoxes,hullCheck:'Outside both world AABBs conservatively proves no point is inside either hull. Ray origins intentionally attach to actual sensors; lines are illustrative.',scope:'Actual GLB transform, CPU geometry and projected framing only; no browser visual verification.',results},null,2));
