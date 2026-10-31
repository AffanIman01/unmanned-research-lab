import * as THREE from 'three';
import type {WaterField, WaterSample} from './sea-physics';

// Reduced-order, deep-water gravity-wave packets. This is a Kelvin-inspired
// visual/interaction approximation, not a resistance, propeller or CFD model.
// Heading 0 points +Z; the two fixed propulsor/stern origins are x=±.52,z=-1 m.
export const MAX_WAKE_PACKETS = 32;
export const WAKE_LIFETIME = 6;
const G = 9.81, EMISSION_PERIOD = .4, SPEED_THRESHOLD = .12;
export type WakePose = {x:number;z:number;heading:number;vx:number;vz:number};
export type WakeCurrent = {x:number;z:number};
export type WakePacket = {
  x:number;z:number;birth:number;amplitude:number;dx:number;dz:number;
  k:number;omega:number;speed:number;cx:number;cz:number;side:number;
};
const smooth = (a:number,b:number,x:number) => {const t=THREE.MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};

/** Height and exact spatial derivatives; the formula below is shared with GLSL. */
export function sampleWakePacket(p:WakePacket,x:number,z:number,time:number) {
  const age=time-p.birth;
  if(age<=0||age>=WAKE_LIFETIME)return {height:0,sx:0,sz:0,amplitude:0,phase:0,rx:0,rz:0};
  const qx=x-p.x-p.cx*age,qz=z-p.z-p.cz*age;
  const r=Math.sqrt(qx*qx+qz*qz+.04),rx=qx/r,rz=qz/r;
  const cg=.5*p.omega/p.k,sigma=.23+.11*age+.05*p.speed;
  const band=r-cg*age,spread=Math.exp(-.5*band*band/(sigma*sigma));
  const alignment=(qx*p.dx+qz*p.dz)/r;
  const u=THREE.MathUtils.clamp((alignment+.25)/.6,0,1),gate=u*u*(3-2*u);
  const gatePrime=u>0&&u<1?6*u*(1-u)/.6:0;
  const envelope=p.amplitude*smooth(0,.12,age)*(1-smooth(4.8,6,age))*Math.exp(-age/2.1)/Math.sqrt(1+age);
  const amplitude=envelope*spread*gate,phase=p.k*r-p.omega*age,cs=Math.cos(phase),sn=Math.sin(phase);
  const radial=-band/(sigma*sigma);
  const gx=(p.dx-alignment*rx)/r,gz=(p.dz-alignment*rz)/r;
  const ax=envelope*spread*(gate*radial*rx+gatePrime*gx);
  const az=envelope*spread*(gate*radial*rz+gatePrime*gz);
  return {height:amplitude*cs,sx:ax*cs-amplitude*sn*p.k*rx,sz:az*cs-amplitude*sn*p.k*rz,amplitude,phase,rx,rz};
}

// xz are WORLD coordinates. For a PlaneGeometry rotated -PI/2 about X,
// pass vec2(position.x,-position.y); returned slopes are world dH/dx,dH/dz.
export const wakeGLSL = /* glsl */`
#define MAX_WAKE_PACKETS ${MAX_WAKE_PACKETS}
uniform int wakeCount;
uniform vec4 wakeOrigins[MAX_WAKE_PACKETS]; // x,z,birth,amplitude
uniform vec4 wakePropagation[MAX_WAKE_PACKETS]; // trailing dx,dz,k,omega
uniform vec4 wakeDrift[MAX_WAKE_PACKETS]; // current x,z,speed,side
vec3 wakeSample(vec2 worldXZ,float time){
  vec3 value=vec3(0.0);
  for(int i=0;i<MAX_WAKE_PACKETS;i++){
    if(i>=wakeCount)break;
    vec4 origin=wakeOrigins[i],prop=wakePropagation[i],drift=wakeDrift[i];
    float age=time-origin.z;
    if(age<=0.0||age>=6.0)continue;
    vec2 q=worldXZ-origin.xy-drift.xy*age;
    float r=sqrt(dot(q,q)+0.04); vec2 ray=q/r;
    float cg=0.5*prop.w/prop.z,sigma=0.23+0.11*age+0.05*drift.z;
    float band=r-cg*age,spread=exp(-0.5*band*band/(sigma*sigma));
    float alignment=dot(q,prop.xy)/r;
    float u=clamp((alignment+0.25)/0.6,0.0,1.0),gate=u*u*(3.0-2.0*u);
    float gatePrime=(u>0.0&&u<1.0)?6.0*u*(1.0-u)/0.6:0.0;
    float envelope=origin.w*smoothstep(0.0,0.12,age)*(1.0-smoothstep(4.8,6.0,age))*exp(-age/2.1)/sqrt(1.0+age);
    float amplitude=envelope*spread*gate,phase=prop.z*r-prop.w*age;
    vec2 gradient=envelope*spread*(gate*(-band/(sigma*sigma))*ray+gatePrime*(prop.xy-alignment*ray)/r);
    value.x+=amplitude*cos(phase);
    value.yz+=gradient*cos(phase)-amplitude*sin(phase)*prop.z*ray;
  }
  return value;
}
`;

export class BoatWake {
  readonly packets:WakePacket[]=[];
  readonly uniforms={
    wakeCount:{value:0},
    wakeOrigins:{value:Array.from({length:MAX_WAKE_PACKETS},()=>new THREE.Vector4())},
    wakePropagation:{value:Array.from({length:MAX_WAKE_PACKETS},()=>new THREE.Vector4())},
    wakeDrift:{value:Array.from({length:MAX_WAKE_PACKETS},()=>new THREE.Vector4())},
  };
  private elapsed=EMISSION_PERIOD;
  private lastTime=-Infinity;
  get count(){return this.packets.length;}
  reset(){this.packets.length=0;this.elapsed=EMISSION_PERIOD;this.lastTime=-Infinity;this.sync();}
  /** Call with simulated time and dt, never wall time. dt=0 freezes everything. */
  update(dt:number,time:number,pose:WakePose,current:WakeCurrent={x:0,z:0}){
    if(![dt,time,pose.x,pose.z,pose.heading,pose.vx,pose.vz,current.x,current.z].every(Number.isFinite)||dt<=0)return;
    if(time<this.lastTime)this.reset();
    if(time===this.lastTime)return;
    this.lastTime=time;
    for(let i=this.packets.length-1;i>=0;i--)if(time-this.packets[i].birth>=WAKE_LIFETIME)this.packets.splice(i,1);
    const vx=pose.vx-current.x,vz=pose.vz-current.z,speed=Math.hypot(vx,vz);
    if(speed>SPEED_THRESHOLD){
      this.elapsed+=dt;
      if(this.elapsed>=EMISSION_PERIOD){
        this.elapsed=0;
        const sin=Math.sin(pose.heading),cos=Math.cos(pose.heading);
        const k=G/Math.max(.8,speed)**2,omega=Math.sqrt(G*k);
        for(const side of [-1,1]){
          this.packets.push({x:pose.x+side*.52*cos-sin,z:pose.z-side*.52*sin-cos,
            birth:time,amplitude:.022*Math.min(speed*speed,4),dx:-vx/speed,dz:-vz/speed,
            k,omega,speed:Math.min(speed,8),cx:current.x,cz:current.z,side});
        }
        if(this.packets.length>MAX_WAKE_PACKETS)this.packets.splice(0,this.packets.length-MAX_WAKE_PACKETS);
      }
    }else this.elapsed=EMISSION_PERIOD; // A new departure starts at its real stern.
    this.sync();
  }
  private sync(){
    this.uniforms.wakeCount.value=this.packets.length;
    for(let i=0;i<this.packets.length;i++){
      const p=this.packets[i];
      this.uniforms.wakeOrigins.value[i].set(p.x,p.z,p.birth,p.amplitude);
      this.uniforms.wakePropagation.value[i].set(p.dx,p.dz,p.k,p.omega);
      this.uniforms.wakeDrift.value[i].set(p.cx,p.cz,p.speed,p.side);
    }
  }
  sample(x:number,y:number,z:number,time:number):WaterSample{
    let height=0,vx=0,vy=0,vz=0;
    for(const p of this.packets){
      const v=sampleWakePacket(p,x,z,time);height+=v.height;
      // Narrow-band Airy orbital velocities, attenuated with depth.
      const a=v.amplitude*p.omega*Math.exp(p.k*Math.min(0,y));
      vx+=a*Math.cos(v.phase)*v.rx;vz+=a*Math.cos(v.phase)*v.rz;vy+=a*Math.sin(v.phase);
    }
    return {height,vx,vy,vz};
  }
}

/** Lightweight transparent foam ribbons: four divergent crests + two propwash
 * trails. History stays in world space through turns; no hull-attached wake decal.
 * Heights follow the exact same base+packet field used by the water surface. */
export function createWakeVisual(wake:BoatWake){
  const MAX_VERTICES=MAX_WAKE_PACKETS*6*6;
  const positions=new Float32Array(MAX_VERTICES*3),colors=new Float32Array(MAX_VERTICES*4),uvs=new Float32Array(MAX_VERTICES*2);
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('color',new THREE.BufferAttribute(colors,4).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('uv',new THREE.BufferAttribute(uvs,2).setUsage(THREE.DynamicDrawUsage));
  const material=new THREE.ShaderMaterial({
    transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{foamTime:{value:0},foamBounds:{value:new THREE.Vector2(1e6,1e6)}},
    vertexShader:`attribute vec4 color;varying vec4 tint;varying vec2 texCoord;varying vec2 foamWorld;void main(){tint=color;texCoord=uv;foamWorld=(modelMatrix*vec4(position,1.0)).xz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader:`precision highp float;uniform float foamTime;uniform vec2 foamBounds;varying vec4 tint;varying vec2 texCoord;varying vec2 foamWorld;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
      void main(){if(any(greaterThan(abs(foamWorld),foamBounds)))discard;float edge=pow(max(0.0,sin(texCoord.x*3.14159265)),1.4);float n=noise(vec2(texCoord.x*8.0,texCoord.y*4.0-foamTime*.18));float foam=smoothstep(.2,.68,n);float alpha=tint.a*edge*(.18+.82*foam);if(alpha<.006)discard;gl_FragColor=vec4(tint.rgb,alpha);}`,
  });
  const mesh=new THREE.Mesh(geometry,material);mesh.name='world_space_twin_stern_wake';mesh.frustumCulled=false;mesh.renderOrder=6;
  const group=new THREE.Group();group.name='gravity_wave_wake_and_propwash';group.add(mesh);
  let vertex=0;
  const write=(x:number,y:number,z:number,u:number,v:number,alpha:number)=>{
    positions.set([x,y,z],vertex*3);colors.set([.69,.87,.91,alpha],vertex*4);uvs.set([u,v],vertex*2);vertex++;
  };
  function update(time:number,baseField:WaterField,bounds?:{x:number;z:number}){
    vertex=0;material.uniforms.foamTime.value=time;
    material.uniforms.foamBounds.value.set(bounds?.x??1e6,bounds?.z??1e6);
    // Keep chronological pairs together. Different branch offsets form the V.
    for(const side of [-1,1])for(const branch of [-1,0,1]){
      const chain=wake.packets.filter(p=>p.side===side&&time>=p.birth&&time-p.birth<WAKE_LIFETIME);
      for(let i=1;i<chain.length;i++){
        const prev=chain[i-1],next=chain[i];
        // Do not draw a bridge across a stop, teleport or a discontinuous turn.
        if(next.birth-prev.birth>.7||Math.hypot(next.x-prev.x,next.z-prev.z)>4||prev.dx*next.dx+prev.dz*next.dz<.3)continue;
        const endpoints=[prev,next].map(p=>{
          const age=Math.max(0,time-p.birth),px=-p.dz,pz=p.dx;
          const cg=.5*p.omega/p.k,drift=branch?cg*age*.35:0;
          const spread=branch*cg*age*.78;
          const x=p.x+p.cx*age+p.dx*drift+px*spread,z=p.z+p.cz*age+p.dz*drift+pz*spread;
          const width=branch?.04+.025*age:.10+.045*age;
          const alpha=(branch?.30:.48)*Math.min(1,p.speed/1.1)*smooth(0,.12,age)*(1-smooth(4.8,6,age))*Math.exp(-age/(branch?2.6:1.8));
          return [-1,1].map(sign=>{
            const xx=x+px*width*sign,zz=z+pz*width*sign;
            return {x:xx,z:zz,y:baseField(xx,0,zz).height+wake.sample(xx,0,zz,time).height+.013,u:(sign+1)/2,v:p.birth*3,alpha};
          });
        });
        for(const index of [0,2,1,1,2,3]){const p=endpoints[Math.floor(index/2)][index%2];write(p.x,p.y,p.z,p.u,p.v,p.alpha);}
      }
    }
    geometry.setDrawRange(0,vertex);
    geometry.attributes.position.needsUpdate=true;geometry.attributes.color.needsUpdate=true;geometry.attributes.uv.needsUpdate=true;
    group.visible=vertex>0;
  }
  return {group,update,dispose(){geometry.dispose();material.dispose();}};
}
