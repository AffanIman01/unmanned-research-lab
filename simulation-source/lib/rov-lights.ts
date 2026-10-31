import * as THREE from 'three';

// Mount to the reference model's actual lamp-core geometry so both beams follow
// heading and roll. Intensity and the faint shafts are visual approximations.
export function addRovLights(rov:THREE.Object3D){
 const rig=new THREE.Group();rig.name='rov_headlights';rig.visible=false;
 const lamps:THREE.SpotLight[]=[],beams:THREE.MeshBasicMaterial[]=[];
 const lenses:THREE.MeshStandardMaterial[]=[];
 const origins=[new THREE.Vector3(),new THREE.Vector3()],counts=[0,0];
 rov.updateMatrixWorld(true);
 rov.getObjectByName('rov_lights')?.traverse(node=>{
  const mesh=node as THREE.Mesh;
  if(!mesh.isMesh||Array.isArray(mesh.material))return;
  const material=mesh.material as THREE.MeshStandardMaterial;
  if(material.name!=='lamp_core')return;
  const lens=material.clone();mesh.material=lens;lens.emissive.set(0xfff4db);lens.emissiveIntensity=0;lenses.push(lens);
  const positions=mesh.geometry.attributes.position;
  for(let i=0;i<positions.count;i++){
   const p=new THREE.Vector3().fromBufferAttribute(positions,i);
   mesh.localToWorld(p);rov.worldToLocal(p);
   const side=p.x<0?0:1;origins[side].add(p);counts[side]++;
  }
 });
 origins.forEach((origin,i)=>{
  if(!counts[i])return;
  origin.divideScalar(counts[i]);
  const direction=new THREE.Vector3(i===0?-.075:.075,-.055,1).normalize();
  const lamp=new THREE.SpotLight(0xfff4db,65,7,Math.PI/7,.6,1.5);
  lamp.position.copy(origin);lamp.target.position.copy(origin).add(direction);
  rig.add(lamp,lamp.target);lamps.push(lamp);
  const length=3;
  const geometry=new THREE.ConeGeometry(.65,length,32,1,true);
  geometry.translate(0,-length/2,0);geometry.rotateX(-Math.PI/2);
  const beam=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:0xd9f7ff,transparent:true,opacity:.045,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending}));
  beam.position.copy(origin);beam.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),direction);rig.add(beam);beams.push(beam.material);
 });
 rov.add(rig);
 function setLevel(percent:number){const level=Math.max(0,Math.min(100,percent))/100;rig.visible=level>0;for(const lens of lenses)lens.emissiveIntensity=4*level;for(const lamp of lamps)lamp.intensity=65*level;for(const beam of beams)beam.opacity=.045*level;}
 return {setLevel,setEnabled(enabled:boolean){setLevel(enabled?100:0);}};
}
