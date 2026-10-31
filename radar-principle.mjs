// Teaching geometry only. This is not an OEM detection, waveform or coverage model.
export const DEMO_HALF_ANGLE = Math.PI / 6;
export const DEMO_REACH_M = 7;
export function radarPhase(seconds) {
 const f=((seconds%4)+4)%4/4;
 if(f<.36)return {step:0,name:'Transmit',travel:f/.36};
 if(f<.65)return {step:1,name:'Receive echo',travel:(f-.36)/.29};
 return {step:2,name:'Estimate range',travel:(f-.65)/.35};
}
export function illustrativeReturn(origin,target,forward,enabled=true) {
 const delta=target.map((x,i)=>x-origin[i]);
 const range=Math.hypot(...delta),length=Math.hypot(...forward);
 const cosine=range&&length?delta.reduce((sum,v,i)=>sum+v*forward[i],0)/(range*length):1;
 const inside=enabled&&range>0&&range<=DEMO_REACH_M&&cosine>=Math.cos(DEMO_HALF_ANGLE);
 return {range,inside,roundTripNs:2*range/299792458*1e9};
}
