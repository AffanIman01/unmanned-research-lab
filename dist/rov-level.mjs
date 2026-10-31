// Bounded simulated attitude controller; angular inputs/outputs use radians.
export const wrapAngle=a=>Math.atan2(Math.sin(a),Math.cos(a));
export const levelingRate=angle=>Math.max(-.9,Math.min(.9,-2.8*wrapAngle(angle)));
export const isLevel=(roll,pitch,rollRate=0,pitchRate=0)=>Math.abs(wrapAngle(roll))<.004&&Math.abs(wrapAngle(pitch))<.004&&Math.abs(rollRate)<.012&&Math.abs(pitchRate)<.012;
