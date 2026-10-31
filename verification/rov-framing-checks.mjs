// Actual reference geometry + effects; no browser rendering or calibrated hardware claims.
import {registerHooks} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
registerHooks({resolve(spec,context,next){return spec==='three'?{url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:next(spec,context);}});
const {GLTFLoader}=await import('../dist/vendor/GLTFLoader.js');
const {attachRovEffects}=await import('../dist/rov-effects.mjs');
const {getHardwareBounds,fitModelFrame}=await import('../dist/model-framing.mjs');
const {fitInspectionFrame}=await import('../dist/inspection-framing.mjs');
const data=await readFile(new URL('../dist/models/chasing-m2-pro-max-reference.glb',import.meta.url));
const rov=(await new GLTFLoader().parseAsync(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength),'')).scene;
rov.rotation.y=Math.PI/2;
const original=getHardwareBounds(rov),effects=attachRovEffects(rov),checks=[],frames=[];
function check(name,fn){fn();checks.push(name);console.log('PASS '+name);}
check('physical model bounds survive attached invisible light beams',()=>{
 const hardware=getHardwareBounds(rov),inflated=new T.Box3().setFromObject(rov);
 assert(hardware.min.distanceTo(original.min)<1e-8);assert(hardware.max.distanceTo(original.max)<1e-8);
 assert(inflated.getSize(new T.Vector3()).x>original.getSize(new T.Vector3()).x*2);
});
check('turning lights and propellers on does not fit the floodlight cones',()=>{
 effects.update({lights:true,thrusters:true});effects.tick(.12);
 const hardware=getHardwareBounds(rov);assert(hardware.min.distanceTo(original.min)<1e-8);assert(hardware.max.distanceTo(original.max)<1e-8);
 assert(rov.getObjectByName('ROV_light_beam_visual').visible);
});
const bounds=getHardwareBounds(rov);
for(const [width,height] of [[1100,470],[760,420],[390,390],[390,640]]){
 const camera=new T.PerspectiveCamera(40,width/height,.02,100);
 const frame=fitModelFrame({bounds,direction:new T.Vector3(1.35,.75,1.6),camera,width,height});
 const oldDistance=new T.Vector3(1.3,1.10,1.5).distanceTo(new T.Vector3(-.20,.18,.23))*Math.max(1,1.12/camera.aspect);
 check(`ROV hero fits ${width} × ${height} with UI margins and improves zoom`,()=>{
  assert(frame);assert(frame.distance<oldDistance*.85);camera.position.copy(frame.position);camera.lookAt(frame.target);camera.updateMatrixWorld(true);
  for(const x of[bounds.min.x,bounds.max.x])for(const y of[bounds.min.y,bounds.max.y])for(const z of[bounds.min.z,bounds.max.z]){
   const p=new T.Vector3(x,y,z).project(camera);assert(p.x>=frame.region.x0-1e-8&&p.x<=frame.region.x1+1e-8);assert(p.y>=frame.region.y0-1e-8&&p.y<=frame.region.y1+1e-8);assert(p.z>=-1&&p.z<=1);
  }
 });
 frames.push({width,height,distance:frame.distance,previousDistance:oldDistance,region:frame.region});
}
for(const [width,height] of [[1100,470],[390,640]]){
 const camera=new T.PerspectiveCamera(40,width/height,.02,100),direction=new T.Vector3(1,.6,1);
 const old=fitInspectionFrame({bounds:new T.Box3().setFromObject(rov),direction,camera,width,height});
 const improved=fitInspectionFrame({bounds,direction,camera,width,height});
 check(`ROV popup at ${width}px ignores cones and is more than twice as close`,()=>assert(improved.distance<old.distance*.5));
 frames.push({popup:true,width,height,distance:improved.distance,previousDistance:old.distance});
}
check('empty or unavailable bounds produce no invalid camera',()=>{
 const camera=new T.PerspectiveCamera(40,1,.02,100);
 assert.equal(fitModelFrame({bounds:new T.Box3(),direction:new T.Vector3(1,1,1),camera,width:390,height:390}),null);
 assert.equal(fitModelFrame({bounds,direction:new T.Vector3(1,1,1),camera,width:0,height:390}),null);
});
const result={checks:checks.length,passed:true,scope:'Actual GLB geometry and camera projection; browser visual QA not run.',hardwareBoundsMetres:{min:bounds.min.toArray(),max:bounds.max.toArray()},frames};
await writeFile(new URL('./rov-framing-results.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
