import {registerHooks} from 'node:module';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as THREE from 'three';
const threeURL=import.meta.resolve('three');
registerHooks({resolve(spec,context,next){return spec==='three'?{url:threeURL,shortCircuit:true}:next(spec,context);}});
const {GLTFLoader}=await import('three/examples/jsm/loaders/GLTFLoader.js');
const {attachStudioME120}=await import('../lib/studio-me120.ts');
const {LIFT_MIN,LIFT_MAX,antennaTranslation,ringTranslation}=await import('../lib/lift-state.ts');
const {PTZ_LENS,initialPTZ,updateUSVPTZ}=await import('../lib/usv-ptz.ts');
const file=await readFile(new URL('../public/models/me120-reference.glb',import.meta.url));
const studioFile=await readFile(new URL('../../dist/models/me120-reference.glb',import.meta.url));
assert(file.equals(studioFile),'Simulation must retain the identical Studio hull asset');
const model=(await new GLTFLoader().parseAsync(file.buffer.slice(file.byteOffset,file.byteOffset+file.byteLength),'')).scene;
const mastBefore=model.getObjectByName('antenna'),childrenBefore=[...mastBefore.children];
const hulls=['hull_port','hull_starboard'].map(name=>{const node=model.getObjectByName(name);let vertices=0;node.traverse(n=>{if(n.isMesh)vertices+=n.geometry.attributes.position.count;});return {node,vertices};});
const {mast,rack}=attachStudioME120(model);
assert.equal(mast,mastBefore);assert.equal(mast.children.length,childrenBefore.length+1);
assert(childrenBefore.every(child=>mast.children.includes(child)));
assert.equal(model.scale.x,1.4/1.4051200151443482);
assert.equal(mast.getObjectsByProperty('name','ME120_photo_sensor_stack').length,1);
assert.equal(mast.getObjectsByProperty('name','mmwave_radar_housing').length,1);
assert.deepEqual(mast.userData.components.filter(c=>c.id.startsWith('antenna-')).map(c=>c.title),[
 'Antenna 1 · 1.4 GHz','Antenna 2 · 4G cellular','Antenna 3 · 2.4 GHz','Antenna 4 · 1.4 GHz',
]);
assert.equal(mast.userData.components.filter(c=>c.id.startsWith('nav-light-')).length,2);
for(const {node,vertices} of hulls){let after=0;node.traverse(n=>{if(n.isMesh)after+=n.geometry.attributes.position.count;});assert.equal(after,vertices);}
const rod=mast.children.find(n=>n.isMesh&&Array.isArray(n.material)&&n.material.some(m=>m.name==='photo_ivory_aerial'));
assert(rod);assert(rod.geometry.groups.some(g=>g.materialIndex===1));
const close=(a,b)=>assert(Math.abs(a-b)<1e-9,`${a} versus ${b}`);
close(antennaTranslation(LIFT_MIN),-.342);close(ringTranslation(LIFT_MIN),.418);
const travel=antennaTranslation(LIFT_MAX)-antennaTranslation(LIFT_MIN);
const base=mast.position.y;mast.position.y=base+antennaTranslation(LIFT_MIN);model.updateMatrixWorld(true);
const snapshot=Object.values(rack.owners).map(owner=>({owner,world:owner.getWorldPosition(new THREE.Vector3())}));
for(const item of snapshot){assert(item.world.toArray().every(Number.isFinite));}
const camera=new THREE.PerspectiveCamera(68,1,.025,250);
assert.deepEqual(PTZ_LENS.toArray(),[0,1.735,.108]);
for(const tilt of [0,-12,-45]){
 const pose=updateUSVPTZ(camera,mast,{...initialPTZ,tilt});
 assert(Number.isFinite(pose.height));
 const expected=mast.localToWorld(PTZ_LENS.clone().addScaledVector(new THREE.Vector3(0,Math.sin(tilt*Math.PI/180),Math.cos(tilt*Math.PI/180)),.060));
 assert(camera.position.distanceTo(expected)<1e-9);
 const ray=new THREE.Raycaster(camera.position,camera.getWorldDirection(new THREE.Vector3()),.025,10);
 assert.equal(ray.intersectObject(rack.root,true).length,0,'Forward/downward PTZ view must clear added rack');
}
mast.position.y=base+antennaTranslation(LIFT_MAX);model.updateMatrixWorld(true);
for(const {owner,world} of snapshot)close(owner.getWorldPosition(new THREE.Vector3()).y-world.y,travel);
close(travel,-.243);
assert.throws(()=>attachStudioME120(model),/already attached/);
model.traverse(n=>{if(n.isMesh){n.geometry.dispose();for(const material of Array.isArray(n.material)?n.material:[n.material])material.dispose();}});
console.log('PASS: identical Studio GLB, shared rack once, four aerial identities, two navlights, preserved lift travel, unchanged hull topology and clear forward PTZ origins. No browser render performed.');
