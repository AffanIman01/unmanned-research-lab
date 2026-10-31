// One finite-depth linear wave field drives both the tank surface and the ROV.
// These are demonstration inputs, not identified CHASING hydrodynamic parameters.
export const tankWave=Object.freeze({depth:3,amplitude:.12,period:3,directionDeg:18,paddleZ:-5.9});
const g=9.81,omega=2*Math.PI/tankWave.period;
let lo=0,hi=Math.max(1,omega*omega/g*2);
while(g*hi*Math.tanh(hi*tankWave.depth)<omega*omega)hi*=2;
for(let i=0;i<70;i++){const mid=(lo+hi)/2;if(g*mid*Math.tanh(mid*tankWave.depth)<omega*omega)lo=mid;else hi=mid;}
const k=(lo+hi)/2,angle=tankWave.directionDeg*Math.PI/180,nx=Math.sin(angle),nz=Math.cos(angle),den=Math.sinh(k*tankWave.depth);
export const tankWaveProperties=Object.freeze({omega,k,wavelength:2*Math.PI/k,phaseSpeed:omega/k});
export function sampleRovTankWater(x,y,z,time,enabled=true){
 if(!enabled)return {height:0,vx:0,vy:0,vz:0,slopeX:0,slopeZ:0,dVyDx:0,dVyDz:0};
 const phase=k*(x*nx+(z-tankWave.paddleZ)*nz)-omega*time;
 const a=tankWave.amplitude,s=Math.sin(phase),c=Math.cos(phase);
 const ky=k*(tankWave.depth+Math.max(-tankWave.depth,Math.min(0,y)));
 const horizontal=a*omega*Math.cosh(ky)/den*s;
 const verticalScale=a*omega*Math.sinh(ky)/den;
 return {height:a*s,vx:horizontal*nx,vy:-verticalScale*c,vz:horizontal*nz,
  slopeX:a*k*nx*c,slopeZ:a*k*nz*c,dVyDx:verticalScale*k*nx*s,dVyDz:verticalScale*k*nz*s};
}
export function tankPaddleOffset(x,time,enabled=true){
 // A phase-linked illustrative piston, not a calibrated wavemaker transfer model.
 return enabled ? .11*Math.cos(k*x*nx-omega*time):0;
}
