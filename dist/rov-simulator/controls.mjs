// Custom project bindings; separate from manufacturer stick modes.
export const movementCodes=new Set(['KeyW','KeyS','KeyA','KeyD','KeyQ','KeyE','KeyR','KeyC','KeyT','KeyV','KeyZ','KeyX']);
export const lightLevels=[0,50,100],speedLevels=[25,50,75,100];
export const cycleLight=v=>lightLevels[(lightLevels.indexOf(v)+1)%3];
export const stepSpeed=(v,d)=>speedLevels[Math.max(0,Math.min(3,speedLevels.indexOf(v)+Math.sign(d)))];
export const normalizeHeading=v=>((v%360)+360)%360;
export function readPilotKeys(pressed,active,speed=25){
 const k=(p,n)=>active?(Number(pressed.has(p))-Number(pressed.has(n)))*speed/100:0;
 return {forward:k('KeyW','KeyS'),strafe:k('KeyD','KeyA'),yaw:k('KeyX','KeyZ'),vertical:k('KeyR','KeyC'),pitch:k('KeyT','KeyV'),roll:k('KeyQ','KeyE'),armed:active};
}
