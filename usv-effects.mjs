import * as T from 'three';
// Original ME120 reference geometry; visual rotation only, not propulsion physics.
const ranges=[{name:'port',center:[-.54,.105,-1.243],vertexStart:612,indexStart:2004},{name:'starboard',center:[.54,.105,-1.243],vertexStart:2498,indexStart:5778}];
export function attachUsvEffects(model){
 let source;model.getObjectByName('thrusters')?.traverse(n=>{if(n.isMesh&&n.material?.name==='silver')source=n;});
 const rotors=[];
 if(source){const p=source.geometry.getAttribute('position'),n=source.geometry.getAttribute('normal'),ix=source.geometry.getIndex();
  if(p.count!==3772||ix?.count!==7548)throw new Error('Unexpected ME120 rotor topology');
  const fixed=[];for(let i=0;i<ix.count;i++)if(!ranges.some(r=>i>=r.indexStart&&i<r.indexStart+258))fixed.push(ix.array[i]);
  for(const [k,r] of ranges.entries()){
   const pos=new Float32Array(178*3),normal=new Float32Array(178*3),indices=new Uint16Array(258);
   for(let j=0;j<178;j++)for(let a=0;a<3;a++){pos[j*3+a]=p.array[(r.vertexStart+j)*3+a]-r.center[a];normal[j*3+a]=n.array[(r.vertexStart+j)*3+a];}
   for(let j=0;j<258;j++)indices[j]=ix.array[r.indexStart+j]-r.vertexStart;
   const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.BufferAttribute(pos,3));geometry.setAttribute('normal',new T.BufferAttribute(normal,3));geometry.setIndex(new T.BufferAttribute(indices,1));
   const pivot=new T.Group();pivot.name='ME120_'+r.name+'_propeller';pivot.position.fromArray(r.center);source.parent.add(pivot);
   const blade=new T.Mesh(geometry,source.material.clone());blade.castShadow=true;blade.receiveShadow=true;pivot.add(blade);rotors.push({pivot,angle:0,sign:k?1:-1});
  }
  source.geometry.setIndex(fixed);source.geometry.computeBoundingSphere();
 }
 let spinning=false;
 return{update(enabled){spinning=enabled;},tick(dt){if(spinning)for(const r of rotors){r.angle=(r.angle+dt*10*r.sign)%(Math.PI*2);r.pivot.rotation.z=r.angle;}},info(){return{propellers:rotors.length,spinning,angles:rotors.map(r=>r.angle),fixedSilverIndices:7032,visualOnly:true};}};
}
