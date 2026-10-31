import {registerHooks} from 'node:module';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
registerHooks({resolve(spec,context,next){return spec==='three'?{url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:next(spec,context);}});
const {createSensingVisuals,exampleStereoDisparity,rayBoxDistance,rayPostDistance}=await import('../dist/sensing-visuals.mjs');
const {createSensorRack}=await import('../dist/sensor-rack.mjs');
let checks=0;const check=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
check('example stereo disparity is inverse depth and rejects invalid depth',()=>{
 assert.equal(exampleStereoDisparity(2),19.2);assert.equal(exampleStereoDisparity(8),4.8);
 assert.equal(exampleStereoDisparity(0),null);assert.equal(exampleStereoDisparity(NaN),null);
});
check('ray-box first entry is on surface and parallel misses are rejected',()=>{
 const min=new T.Vector3(-1,-1,4),max=new T.Vector3(1,1,4.04);
 assert.equal(rayBoxDistance(new T.Vector3(),new T.Vector3(0,0,1),min,max),4);
 assert.equal(rayBoxDistance(new T.Vector3(2,0,0),new T.Vector3(0,0,1),min,max),null);
 assert.equal(rayBoxDistance(new T.Vector3(),new T.Vector3(0,0,-1),min,max),null);
});
check('cylinder ray returns the nearer surface and misses above the post',()=>{
 const post={x:0,z:2,radius:.1,minY:-1,maxY:1};
 assert(Math.abs(rayPostDistance(new T.Vector3(),new T.Vector3(0,0,1),post)-1.9)<1e-9);
 assert.equal(rayPostDistance(new T.Vector3(0,2,0),new T.Vector3(0,0,1),post),null);
});
const scene=new T.Scene(),assets=new T.Group(),anchorFrame=new T.Group();
scene.add(assets);assets.add(anchorFrame);anchorFrame.rotation.y=Math.PI/2;anchorFrame.position.set(.1,.3,-.2);
const rack=createSensorRack();anchorFrame.add(rack.root);
let anchors=null;const demo=createSensingVisuals({scene,getAnchors:()=>anchors});
check('preload lifecycle safely defers missing anchors',()=>{demo.setMode('stereo');demo.update(.1);assert.equal(demo.info().ready,false);assert(demo.getBounds().isEmpty());});
anchors={zed:rack.owners['zed-camera'],lidar:rack.owners['robosense-lidar']};
check('overlay follows real rack anchors outside exported asset hierarchy',()=>{
 demo.update(0);const overlay=scene.getObjectByName('Illustrative_sensing_overlay_NOT_EXPORTED');
 assert(overlay.visible);assert.equal(overlay.parent,scene);assert.equal(assets.getObjectByName(overlay.name),undefined);
 const actual=anchors.zed.localToWorld(new T.Vector3(-.06,0,.0202));
 const rendered=overlay.getObjectByName('Left_lens_origin').getWorldPosition(new T.Vector3());
 assert(actual.distanceTo(rendered)<1e-9);
});
check('stereo rays share exactly one corresponding target and remain static',()=>{
 const overlay=scene.getObjectByName('Illustrative_sensing_overlay_NOT_EXPORTED');
 demo.setDistance(7);
 const a=overlay.getObjectByName('Left_passive_sightline').geometry.attributes.position.array;
 const b=overlay.getObjectByName('Right_passive_sightline').geometry.attributes.position.array;
 assert.deepEqual([...a.slice(3)],[...b.slice(3)]);assert.equal(a[5],7);
 demo.update(.2);assert.equal(demo.info().phase,0);assert.equal(demo.info().pointCount,0);
});
check('LiDAR accumulation is finite, surface bound and does not rotate hardware',()=>{
 const before=anchors.lidar.quaternion.clone();demo.setMode('lidar');demo.setDistance(4);
 for(let i=0;i<31;i++)demo.update(.25);
 const info=demo.info();assert(info.pointCount>20);assert(info.pointCount<=1800);assert(anchors.lidar.quaternion.equals(before));
 const geo=scene.getObjectByName('Synthetic_first_hit_point_cloud').geometry;
 assert.equal(geo.drawRange.count,info.pointCount);
 for(const n of geo.attributes.position.array.slice(0,info.pointCount*3))assert(Number.isFinite(n));
 const posts=[[-1.8,1.2,.105],[2.15,.85,.115],[-1.55,-1.65,.12],[1.55,-1.85,.105]];
 for(let i=0;i<info.pointCount;i++){
  const a=geo.attributes.position.array,x=a[i*3],y=a[i*3+1],z=a[i*3+2];
  const board=Math.abs(z-4)<1e-5&&Math.abs(x)<=.72001&&Math.abs(y)<=.58001;
  const post=posts.some(([px,pz,r])=>Math.abs(Math.hypot(x-px,z-pz)-r)<1e-5);
  assert(board||post,'point must lie on a drawn first-hit target surface');
 }
 demo.update(.25);assert(demo.info().pointCount<info.pointCount);
});
check('range clamp, transform following, bounds and reset are finite',()=>{
 for(const d of [-10,2,8,999]){demo.setDistance(d);assert(demo.info().distance>=2&&demo.info().distance<=8);const b=demo.getBounds();assert(!b.isEmpty());assert([...b.min.toArray(),...b.max.toArray()].every(Number.isFinite));}
 const before=demo.getBounds().getCenter(new T.Vector3());anchorFrame.position.y+=.4;demo.update(0);const after=demo.getBounds().getCenter(new T.Vector3());assert(Math.abs(after.y-before.y-.4)<1e-9);
 demo.stop();assert.equal(demo.info().mode,null);assert.equal(demo.info().pointCount,0);assert.equal(scene.getObjectByName('Illustrative_sensing_overlay_NOT_EXPORTED').visible,false);
});
console.log(JSON.stringify({checks,passed:checks,scope:'Geometry and lifecycle only. No browser rendering.'}));
