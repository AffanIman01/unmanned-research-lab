// Project-specific keyboard map; not the manufacturer's physical RC3 mapping.
export const LIGHT_LEVELS=[0,50,100] as const;
export const SPEED_LEVELS=[25,50,75,100] as const;
export const nextLight=(level:number)=>LIGHT_LEVELS[(LIGHT_LEVELS.indexOf(level as 0|50|100)+1)%LIGHT_LEVELS.length];
export const changeSpeed=(level:number,direction:number)=>SPEED_LEVELS[Math.max(0,Math.min(3,SPEED_LEVELS.indexOf(level as 25|50|75|100)+Math.sign(direction)))];
export const headingDegrees=(radians:number)=>((radians*180/Math.PI)%360+360)%360;
export function pilotAxes(keys:Set<string>,rov:boolean,armed=true){
 const has=(...names:string[])=>armed?Number(names.some(n=>keys.has(n))):0;
 return {throttle:has('w','arrowup')-has('s','arrowdown'),
 steer:rov?has('x')-has('z'):has('a','arrowleft')-has('d','arrowright'),
 strafe:rov?has('d')-has('a'):0,heave:has('r')-has('c'),roll:has('q')-has('e'),pitch:has('t')-has('v')};
}

export function toggleManualArm(current:boolean,repeat:boolean,allowed:boolean){return repeat?current:current?false:allowed;}
export function hasPilotThrust(armed:boolean,axes:{throttle:number;steer:number;heave:number;roll:number;strafe:number;pitch:number},leveling=false){return armed&&(leveling||Object.values(axes).some(v=>Math.abs(v)>.001));}
