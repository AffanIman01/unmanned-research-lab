import * as THREE from 'three';
import {createSensorRack} from '../../dist/sensor-rack.mjs';
import {components as studioComponents} from '../../dist/component-data.mjs';

// The simulation and Studio load the same original GLB. Reuse the Studio's
// procedural rack directly so the two views cannot drift to different designs.
// This adapter changes appearance only: mass, hull forces and lift travel remain
// the simulation's explicitly provisional parameters.
export function attachStudioME120(model:THREE.Object3D) {
 const antenna=model.getObjectByName('antenna');
 if(!antenna)throw new Error('ME120 reference is missing its antenna assembly');
 if(antenna.getObjectByName('ME120_photo_sensor_stack'))throw new Error('ME120 sensor rack already attached');
 model.scale.x=1.4/1.4051200151443482;
 model.traverse(node=>{
  const mesh=node as THREE.Mesh;
  if(!mesh.isMesh)return;
  mesh.castShadow=true;mesh.receiveShadow=true;
  for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material]){
   const surface=material as THREE.MeshStandardMaterial;
   surface.roughness=Math.max(surface.roughness||.3,.3);
   surface.metalness=Math.min(surface.metalness||0,.65);
  }
 });
 const rack=createSensorRack();antenna.add(rack.root);
 // Same per-triangle colour assignment as Studio matchAerialColours(): the
 // inner-left 4G aerial is ivory; original GLB geometry is retained intact.
 const rod=antenna.children.find(node=>(node as THREE.Mesh).isMesh&&(node as THREE.Mesh).material?.name==='gray') as THREE.Mesh|undefined;
 if(rod){
  rod.geometry=rod.geometry.clone();
  const geometry=rod.geometry,positions=geometry.attributes.position,index=geometry.index,count=index?index.count:positions.count;
  const base=rod.material as THREE.MeshStandardMaterial,ivory=base.clone();ivory.name='photo_ivory_aerial';ivory.color.setHex(0xe5e4d7);
  rod.material=[base,ivory];geometry.clearGroups();
  let start=0,last=-1;
  for(let i=0;i<count;i+=3){let x=0;for(let j=0;j<3;j++)x+=positions.getX(index?index.getX(i+j):i+j)/3;const which=Math.abs(x+.08)<.025?1:0;if(last!==which){if(last>=0)geometry.addGroup(start,i-start,last);start=i;last=which;}}
  if(last>=0)geometry.addGroup(start,count-start,last);
 }
 // Four original aerials, the original PTZ dome and both side-light housings
 // already exist in the GLB. Record the Studio's latest identification without
 // adding duplicate geometry or relabelling the side lights as radars.
 antenna.userData.components=studioComponents
  .filter((item:{id:string})=>item.id==='ptz'||item.id.startsWith('nav-light-')||item.id.startsWith('antenna-'))
  .map((item:{id:string;title:string;at:number[]})=>({id:item.id,title:item.title,at:[...item.at]}));
 return {mast:antenna,rack};
}
