// Run: node --experimental-strip-types scripts/check-wake.mjs
import assert from 'node:assert/strict';
import {BoatWake,MAX_WAKE_PACKETS,WAKE_LIFETIME,sampleWakePacket,wakeGLSL,createWakeVisual} from '../lib/boat-wake.ts';
const pose=(patch={})=>({x:0,z:0,heading:0,vx:0,vz:0,...patch});
const flat=()=>({height:0,vx:0,vy:0,vz:0});
const zero={height:0,vx:0,vy:0,vz:0};
const rest=new BoatWake();
for(let i=1;i<=600;i++)rest.update(1/60,i/60,pose());
assert.equal(rest.count,0);assert.deepEqual(rest.sample(0,0,0,10),zero);
const forward=new BoatWake();
for(let i=1;i<=360;i++)forward.update(1/60,i/60,pose({z:i/60*2,vz:2}));
assert(forward.count>0&&forward.count<=MAX_WAKE_PACKETS);
for(const p of forward.packets){assert(Math.abs(p.dx)<1e-12);assert.equal(p.dz,-1);assert(Math.abs(Math.abs(p.x)-.52)<1e-10);assert(Math.abs(p.omega*p.omega-9.81*p.k)<1e-10);assert(p.birth<=6);}
assert(forward.packets.some(p=>p.side===-1)&&forward.packets.some(p=>p.side===1));
// History stays in world space through a turn.
const old=forward.packets.map(p=>({...p}));
forward.update(.1,6.1,pose({x:2,z:12,heading:Math.PI/2,vx:2}));
for(const p of forward.packets){const before=old.find(v=>v.birth===p.birth&&v.side===p.side);if(before)assert.deepEqual(p,before);}
const turned=new BoatWake();turned.update(.1,.1,pose({heading:Math.PI/2,vx:2}));
for(const p of turned.packets){assert(Math.abs(p.x+1)<1e-10);assert(Math.abs(Math.abs(p.z)-.52)<1e-10);assert.equal(p.dx,-1);assert(Math.abs(p.dz)<1e-12);}
const reverse=new BoatWake();reverse.update(.1,.1,pose({vz:-2}));
for(const p of reverse.packets){assert.equal(p.dz,1);assert.equal(p.z,-1);}
const drift=new BoatWake();for(let i=1;i<=60;i++)drift.update(1/60,i/60,pose({vx:.8}),{x:.8,z:0});assert.equal(drift.count,0);
const current=new BoatWake();current.update(.1,.1,pose(),{x:.8,z:0});assert.equal(current.count,2);assert.equal(current.packets[0].dx,1);
// Frozen simulation time changes neither history nor visible geometry.
const snapshot=JSON.stringify(forward.packets);forward.update(0,9,pose({vz:3}));assert.equal(JSON.stringify(forward.packets),snapshot);
const visual=createWakeVisual(forward);visual.update(6.1,flat);const mesh=visual.group.children[0];const coords=mesh.geometry.attributes.position.array.slice();visual.update(6.1,flat);assert.deepEqual(mesh.geometry.attributes.position.array,coords);assert(mesh.geometry.drawRange.count>0);assert(mesh.geometry.drawRange.count<=mesh.geometry.attributes.position.count);assert([...coords].every(Number.isFinite));
// Independent translation of the uniform-based GLSL. GPU rendering is separate.
const sm=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
function shaderReference(wake,x,z,time){
 const out=[0,0,0];for(let i=0;i<wake.uniforms.wakeCount.value;i++){
  const o=wake.uniforms.wakeOrigins.value[i].toArray(),p=wake.uniforms.wakePropagation.value[i].toArray(),d=wake.uniforms.wakeDrift.value[i].toArray();const age=time-o[2];if(age<=0||age>=6)continue;
  const q=[x-o[0]-d[0]*age,z-o[1]-d[1]*age],r=Math.sqrt(q[0]*q[0]+q[1]*q[1]+.04),ray=q.map(v=>v/r),cg=.5*p[3]/p[2],s=.23+.11*age+.05*d[2];
  const b=r-cg*age,spread=Math.exp(-.5*b*b/(s*s)),alignment=(q[0]*p[0]+q[1]*p[1])/r,u=Math.max(0,Math.min(1,(alignment+.25)/.6)),gate=u*u*(3-2*u),gp=u>0&&u<1?6*u*(1-u)/.6:0;
  const envelope=o[3]*sm(0,.12,age)*(1-sm(4.8,6,age))*Math.exp(-age/2.1)/Math.sqrt(1+age),amp=envelope*spread*gate,phase=p[2]*r-p[3]*age;
  out[0]+=amp*Math.cos(phase);for(let n=0;n<2;n++)out[n+1]+=envelope*spread*(gate*(-b/(s*s))*ray[n]+gp*(p[n]-alignment*ray[n])/r)*Math.cos(phase)-amp*Math.sin(phase)*p[2]*ray[n];
 }return out;
}
for(let i=0;i<80;i++){
 const x=-4+i*.1,z=4+(i%13)*.31,t=6.1,ref=shaderReference(forward,x,z,t),cpu=forward.sample(x,0,z,t);
 assert(Math.abs(cpu.height-ref[0])<1e-10);assert(Object.values(cpu).every(Number.isFinite));
 const derivatives=forward.packets.map(p=>sampleWakePacket(p,x,z,t));assert(Math.abs(derivatives.reduce((a,v)=>a+v.sx,0)-ref[1])<1e-10);assert(Math.abs(derivatives.reduce((a,v)=>a+v.sz,0)-ref[2])<1e-10);
 const eps=1e-5;const sx=(forward.sample(x+eps,0,z,t).height-forward.sample(x-eps,0,z,t).height)/(2*eps);const sz=(forward.sample(x,0,z+eps,t).height-forward.sample(x,0,z-eps,t).height)/(2*eps);
 assert(Math.abs(sx-ref[1])<1e-5);assert(Math.abs(sz-ref[2])<1e-5);assert(Object.values(forward.sample(x,-4,z,t)).every(Number.isFinite));
}
assert(wakeGLSL.includes(`MAX_WAKE_PACKETS ${MAX_WAKE_PACKETS}`));assert(wakeGLSL.includes('vec3 wakeSample(vec2 worldXZ,float time)'));
// A stop emits no packets; age attenuation has compact support.
for(let i=1;i<=420;i++)forward.update(1/60,6.1+i/60,pose({z:12}));assert.equal(forward.count,0);assert.deepEqual(forward.sample(0,0,0,13.1),zero);visual.update(13.1,flat);assert.equal(visual.group.visible,false);
reverse.reset();assert.equal(reverse.count,0);assert.equal(reverse.uniforms.wakeCount.value,0);assert.deepEqual(reverse.sample(0,0,0,2),zero);
reverse.update(.1,1,pose({vz:-2}));reverse.update(.1,.1,pose());assert.equal(reverse.count,0);
for(const bad of [NaN,Infinity])reverse.update(.1,.2,pose({vx:bad}));assert.equal(reverse.count,0);
visual.dispose();
console.log(`PASS: stationary/drifting equilibrium, twin sterns, bounded ${MAX_WAKE_PACKETS}-packet history, turns, reverse, gravity dispersion, pause, CPU/GLSL height and slopes, finite foam, ${WAKE_LIFETIME}s decay, reset.`);
