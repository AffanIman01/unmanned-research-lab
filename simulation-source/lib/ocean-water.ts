import * as THREE from 'three';
import {COMPONENTS,type WaveComponent} from './sea-physics';
import {BoatWake,wakeGLSL} from './boat-wake';
// World-space waves, current and wake share the CPU water field's conventions.
export function oceanSurface(waves:WaveComponent[],wake:BoatWake){
 const uniforms={seaTime:{value:0},seaStrength:{value:0},seaOrigin:{value:new THREE.Vector2()},seaCurrent:{value:new THREE.Vector2()},seaWaves:{value:waves.map(p=>new THREE.Vector4(p.k*p.dx,p.k*p.dz,p.w,p.a))},seaPhase:{value:waves.map(p=>p.phase)},...wake.uniforms};
 const material=new THREE.MeshPhysicalMaterial({color:0x164857,roughness:.17,metalness:0,ior:1.333,envMapIntensity:1.1,transparent:true,opacity:.9,side:THREE.DoubleSide,depthWrite:false});
 material.customProgramCacheKey=()=> 'current-and-wake-surface-ap';
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);
  shader.vertexShader=`uniform float seaTime;uniform float seaStrength;uniform vec2 seaOrigin;uniform vec2 seaCurrent;uniform vec4 seaWaves[${COMPONENTS}];uniform float seaPhase[${COMPONENTS}];varying vec2 seaSlope;
   ${wakeGLSL}
   vec3 seaSample(vec2 world){vec2 p=world-seaCurrent*seaTime;vec3 s=vec3(0.0);for(int i=0;i<${COMPONENTS};i++){vec4 w=seaWaves[i];float theta=dot(w.xy,p)-w.z*seaTime+seaPhase[i];float a=w.w*seaStrength;s.x+=a*cos(theta);s.yz-=a*sin(theta)*w.xy;}return s+wakeSample(world,seaTime);}
  `+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nvec3 ocean=seaSample(vec2(position.x,-position.y)+seaOrigin);objectNormal=normalize(vec3(-ocean.y,ocean.z,1.0));seaSlope=ocean.yz;').replace('#include <begin_vertex>','vec3 transformed=vec3(position.xy,ocean.x);');
  shader.fragmentShader='varying vec2 seaSlope;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat crest=smoothstep(0.18,0.5,length(seaSlope));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(0.72,0.84,0.86),crest*0.45);');
 };
 const geometry=new THREE.PlaneGeometry(120,120,240,240),positions=geometry.attributes.position;
 // Finer cells near the boat retain short wake waves at a bounded vertex count.
 for(let i=0;i<positions.count;i++){for(const axis of ['X','Y'] as const){const value=axis==='X'?positions.getX(i):positions.getY(i);const mapped=Math.sign(value)*60*Math.pow(Math.abs(value)/60,1.65);if(axis==='X')positions.setX(i,mapped);else positions.setY(i,mapped);}}
 const mesh=new THREE.Mesh(geometry,material);mesh.rotation.x=-Math.PI/2;mesh.frustumCulled=false;
 return {mesh,uniforms,update(time:number,strength:number,next?:WaveComponent[],current={vx:0,vz:0},center={x:0,z:0}){
  uniforms.seaTime.value=time;uniforms.seaStrength.value=strength;uniforms.seaCurrent.value.set(current.vx,current.vz);
  const x=Math.round(center.x),z=Math.round(center.z);mesh.position.set(x,0,z);uniforms.seaOrigin.value.set(x,z);
  if(next){for(let i=0;i<next.length;i++){const p=next[i];uniforms.seaWaves.value[i].set(p.k*p.dx,p.k*p.dz,p.w,p.a);uniforms.seaPhase.value[i]=p.phase;}}
 }};
}
