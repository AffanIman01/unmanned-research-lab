import {dispersion} from './sea-physics';
// Bounded tank wave trains with finite-depth wavelengths; no resolved reflections.
const wavenumbers=new Map<number,number>();
function tankK(w:number){if(!wavenumbers.has(w))wavenumbers.set(w,dispersion(w,2));return wavenumbers.get(w)!;}
export type WaveGenerator='flap'|'piston'|'segmented';
export type WavePattern='linear'|'regular'|'irregular'|'crossing'|'standing';
export type WaveSettings={generator:WaveGenerator;pattern:WavePattern;height:number;period:number;direction:number;enabled:boolean};
export const wavePresets:{id:string;name:string;description:string;settings:WaveSettings}[]=[
 {id:'calm',name:'Calm',description:'Flat water for steering practice.',settings:{generator:'flap',pattern:'regular',height:0,period:2.5,direction:0,enabled:false}},
 {id:'ripples',name:'Gentle ripples',description:'Small, short regular waves.',settings:{generator:'flap',pattern:'regular',height:.04,period:1.2,direction:0,enabled:true}},
 {id:'regular',name:'Regular waves',description:'Evenly spaced waves from one end.',settings:{generator:'flap',pattern:'regular',height:.14,period:2.5,direction:0,enabled:true}},
 {id:'linear',name:'Linear · one direction',description:'A single sinusoidal wave train with straight, parallel crests. One travel direction only; no crossing waves, directional spread or reflected train.',settings:{generator:'flap',pattern:'linear',height:.14,period:2.5,direction:0,enabled:true}},
 {id:'swell',name:'Long-period waves',description:'Slow, broad waves with piston motion.',settings:{generator:'piston',pattern:'regular',height:.20,period:4,direction:0,enabled:true}},
 {id:'chop',name:'Irregular chop',description:'Several frequencies with fixed phases; repeatable each reset.',settings:{generator:'segmented',pattern:'irregular',height:.24,period:1.8,direction:15,enabled:true}},
 {id:'crossing',name:'Crossing waves',description:'Two angled wave trains intersect in the pool.',settings:{generator:'segmented',pattern:'crossing',height:.20,period:2.2,direction:0,enabled:true}},
 {id:'standing',name:'Standing waves',description:'Idealised opposing wave trains form stationary nodes; not a wall-reflection calculation.',settings:{generator:'piston',pattern:'standing',height:.18,period:2.8,direction:0,enabled:true}}
];
export const initialWaves:WaveSettings={...wavePresets[2].settings};
export function waveSignal(x:number,z:number,time:number,c:WaveSettings){
 const period=Math.max(1,Math.min(5,c.period)),omega=2*Math.PI/period,k=tankK(omega);
 const angle=(c.generator==='segmented'?c.direction:0)*Math.PI/180;
 const phase=(a:number,ratio=1)=>tankK(omega*Math.sqrt(ratio))*(x*Math.sin(a)+(z+12.1)*Math.cos(a))-omega*Math.sqrt(ratio)*time;
 if(c.pattern==='irregular')return .55*Math.sin(phase(angle))+.28*Math.sin(phase(angle+.3,1.7)+1.3)+.17*Math.sin(phase(angle-.2,.65)+2.7);
 if(c.pattern==='crossing')return .5*Math.sin(phase(angle+.5))+.5*Math.sin(phase(angle-.5)+.8);
 if(c.pattern==='standing')return Math.sin(k*(z+12.1))*Math.cos(omega*time);
 return Math.sin(phase(angle));
}
export function sampleWave(x:number,z:number,time:number,c:WaveSettings,strength=1){
 const edge=Math.max(0,Math.min(1,(12.5-z)/2,c.pattern==='linear'?1:(7.5-Math.abs(x))/.6));
 return Math.max(0,Math.min(.4,c.height))*.5*strength*edge*waveSignal(x,z,time,c);
}

export function linearWaveProperties(c:WaveSettings){
 const period=Math.max(1,Math.min(5,c.period)),omega=2*Math.PI/period,k=tankK(omega);
 return {period,omega,k,wavelength:2*Math.PI/k,speed:omega/k};
}
export function sampleLinearWater(x:number,y:number,z:number,time:number,c:WaveSettings,strength=1){
 const {omega,k}=linearWaveProperties(c),angle=(c.generator==='segmented'?c.direction:0)*Math.PI/180;
 const edge=Math.max(0,Math.min(1,(12.5-z)/2)),a=Math.max(0,Math.min(.4,c.height))*.5*strength*edge;
 const phase=k*(x*Math.sin(angle)+(z+12.1)*Math.cos(angle))-omega*time;
 const ky=k*(2+Math.max(-2,Math.min(0,y))),denominator=Math.sinh(k*2);
 const u=a*omega*Math.cosh(ky)/denominator*Math.sin(phase);
 return {height:a*Math.sin(phase),vx:u*Math.sin(angle),vy:-a*omega*Math.sinh(ky)/denominator*Math.cos(phase),vz:u*Math.cos(angle)};
}
