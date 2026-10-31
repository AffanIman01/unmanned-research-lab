import * as T from 'three';
// Visual effects only. Reuse the reference model's original rotor faces and lamp positions.
// Rotation is illustrative; it is not thrust allocation or calibrated RPM/photometry.
const S=[.9735099783508815,.8497885496304035,.9999202388779301];
const O=[0,.011322807520627975,.0009757578372955322];
export function attachRovEffects(model){
 const rotors=[],lamps=[],lensMaterials=[];
 const thrusters=model.getObjectByName('rov_thrusters');let source;
 thrusters?.traverse(n=>{if(n.isMesh&&n.material?.name==='orange')source=n;});
 if(source){
  const p=source.geometry.getAttribute('position'),n=source.geometry.getAttribute('normal'),ix=source.geometry.getIndex();
  if(p.count!==1936||ix?.count!==2832)throw new Error('Unexpected reference propeller topology');
  let k=0;
  for(const sx of[-1,1])for(const sz of[-1,1])for(const sy of[-1,1]){
   const centre=[sx*.092,.104+sy*.053,sz*.244].map((v,i)=>(v+O[i])*S[i]);
   const pos=new Float32Array(242*3),normal=new Float32Array(242*3),indices=new Uint16Array(354);
   for(let j=0;j<242;j++){const q=k*242+j;for(let a=0;a<3;a++){pos[j*3+a]=(p.array[q*3+a]-centre[a])/S[a];normal[j*3+a]=n.array[q*3+a]*S[a];}const nn=Math.hypot(...normal.subarray(j*3,j*3+3));for(let a=0;a<3;a++)normal[j*3+a]/=nn;}
   for(let j=0;j<354;j++)indices[j]=ix.array[k*354+j]-k*242;
   const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(pos,3));geometry.setAttribute('normal',new T.BufferAttribute(normal,3));geometry.setIndex(new T.BufferAttribute(indices,1));
   // Two parents preserve T * scale * rotation, matching the baked nonuniform duct scale.
   const outer=new T.Group();outer.name=`thruster_${k+1}_rotor_mount`;outer.position.fromArray(centre);outer.scale.fromArray(S);source.parent.add(outer);
   const spin=new T.Group();spin.name=`thruster_${k+1}_propeller`;outer.add(spin);
   const blade=new T.Mesh(geometry,source.material.clone());blade.castShadow=true;blade.receiveShadow=true;spin.add(blade);
   rotors.push({spin,axis:new T.Vector3(sx*.26,sy*.53,sz*.81).normalize(),angle:0,sign:k%2?1:-1});k++;
  }
  source.parent.remove(source);source.geometry.dispose();source.material.dispose();
 }
 const lampGroup=model.getObjectByName('rov_lights');
 lampGroup?.traverse(n=>{if(n.isMesh&&['white','lamp_core'].includes(n.material?.name)){n.material.emissive=new T.Color(0xffedc1);n.material.emissiveIntensity=0;lensMaterials.push(n.material);}});
 if(lampGroup)for(const side of[-1,1]){
  const centre=new T.Vector3(side*.18960231355916443,.2115997524337457,.1868090187187142),axis=new T.Vector3(side*.07467771432764402,-.054763657173605616,.9957028577019204);
  const light=new T.SpotLight(0xfff0d3,0,3.2,.36,.65,2);light.name='ROV_floodlight_visual';light.position.copy(centre);const target=new T.Object3D();target.position.copy(centre).add(axis);lampGroup.add(light,target);light.target=target;
  const geom=new T.ConeGeometry(.42,1.4,32,1,true);geom.translate(0,-.7,0);
  const beam=new T.Mesh(geom,new T.MeshBasicMaterial({color:0xdcefff,transparent:true,opacity:.045,blending:T.AdditiveBlending,depthWrite:false,side:T.DoubleSide}));beam.name='ROV_light_beam_visual';beam.position.copy(centre);beam.quaternion.setFromUnitVectors(new T.Vector3(0,-1,0),axis);beam.visible=false;lampGroup.add(beam);lamps.push({light,beam});
 }
 let lightOn=false,spinning=false;
 return {update({lights=false,thrusters=false,lightLevel=lights?100:0}={}){const level=Math.max(0,Math.min(100,lightLevel))/100;lights=level>0;lightOn=lights;spinning=thrusters;for(const m of lensMaterials)m.emissiveIntensity=3.5*level;for(const l of lamps){l.light.intensity=14*level;l.beam.visible=lights;l.beam.material.opacity=.045*level;}},tick(dt){if(spinning)for(const r of rotors){r.angle=(r.angle+r.sign*dt*12)%(Math.PI*2);r.spin.quaternion.setFromAxisAngle(r.axis,r.angle);}},info(){return{lamps:lamps.length,propellers:rotors.length,lightsOn:lightOn,spinning,angles:rotors.map(r=>r.angle),visualOnly:true};}};
}
