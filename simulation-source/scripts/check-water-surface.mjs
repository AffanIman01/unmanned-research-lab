// Validate shader inputs against CPU equations; GPU compilation is separate.
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,n){try{return n(s,c);}catch(e){if(s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return n(s+'.ts',c);throw e;}}});
import assert from 'node:assert/strict';
import * as THREE from 'three';
const {oceanSurface}=await import('../lib/ocean-water.ts');
const {BoatWake}=await import('../lib/boat-wake.ts');
const {makeSpectrum,defaultSea,sampleAdvectedSea}=await import('../lib/sea-physics.ts');
const waves=makeSpectrum(defaultSea),wake=new BoatWake(),ocean=oceanSurface(waves,wake);
const time=3.7,current={vx:.35,vz:-.2};
ocean.update(time,.72,undefined,current,{x:7.3,z:-5.8});
const shader={uniforms:{},vertexShader:THREE.ShaderLib.physical.vertexShader,fragmentShader:THREE.ShaderLib.physical.fragmentShader};
ocean.mesh.material.onBeforeCompile(shader,{});
assert(shader.vertexShader.includes('vec2(position.x,-position.y)+seaOrigin'));
assert(shader.vertexShader.includes('wakeSample(world,seaTime)'));
assert.equal(shader.uniforms.wakeCount,wake.uniforms.wakeCount);
for(let i=0;i<100;i++){
 const localX=-8+i*.16,localY=-4+(i%17)*.5,x=localX+ocean.mesh.position.x,z=-localY+ocean.mesh.position.z;
 const u=ocean.uniforms;let h=0,dx=0,dz=0;
 for(let k=0;k<waves.length;k++){const w=u.seaWaves.value[k],phase=w.x*(x-u.seaCurrent.value.x*time)+w.y*(z-u.seaCurrent.value.y*time)-w.z*time+u.seaPhase.value[k];h+=w.w*.72*Math.cos(phase);dx-=w.w*.72*Math.sin(phase)*w.x;dz-=w.w*.72*Math.sin(phase)*w.y;}
 const cpu=sampleAdvectedSea(waves,x,0,z,time,.72,50,current);assert(Math.abs(cpu.height-h)<1e-10);
 const eps=1e-5,height=(xx,zz)=>sampleAdvectedSea(waves,xx,0,zz,time,.72,50,current).height;
 assert(Math.abs(dx-(height(x+eps,z)-height(x-eps,z))/(2*eps))<1e-6);
 assert(Math.abs(dz-(height(x,z+eps)-height(x,z-eps))/(2*eps))<1e-6);
 const normal=new THREE.Vector3(-dx,dz,1).applyAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2).normalize();
 assert(normal.distanceTo(new THREE.Vector3(-dx,1,-dz).normalize())<1e-10);
}
assert(ocean.mesh.geometry.attributes.position.count<=60000);
assert([...ocean.mesh.geometry.attributes.position.array].every(Number.isFinite));
ocean.mesh.geometry.dispose();ocean.mesh.material.dispose();
console.log('PASS: CPU/render wave height, current, origin and normal mapping; bounded geometry. Browser GPU compilation not run.');
