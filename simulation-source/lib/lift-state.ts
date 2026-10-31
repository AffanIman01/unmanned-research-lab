export type LiftMotion = 'stopped' | 'raising' | 'lowering';
export const LIFT_MIN = 47.6;
export const LIFT_MAX = 53;
export const WATER_PERCENT = 50;
export const LIFT_RATE = 1.5; // Percentage points per second, for the visual preview only.
export const WATER_Y = .25; // Lower visual waterline per Affan; ring still crosses at 50%. Not measured draught.
const METRES_PER_POINT = .045; // Illustrative spacing; real stroke has not been measured.
export const clampLift = (value:number) => Math.min(LIFT_MAX,Math.max(LIFT_MIN,Number.isFinite(value)?value:LIFT_MIN));
export const ringY = (percent:number) => WATER_Y+(WATER_PERCENT-clampLift(percent))*METRES_PER_POINT;
export const ringTranslation = (percent:number) => ringY(percent)+.06;
// GLB mast was authored 0.76 m above the neutral moving-tube assembly.
// Keep this geometry datum independent of the user-adjustable travel limits.
export const antennaTranslation = (percent:number) => ringTranslation(percent)-.76;
export const rovY = (percent:number) => ringY(percent)-.35;
export function advanceLift(position:number,motion:LiftMotion,seconds:number):{lift:number;motion:LiftMotion}{
 const lift=clampLift(position);
 if(motion==='stopped')return {lift,motion};
 const next=clampLift(lift+(motion==='raising'?-1:1)*Math.max(0,seconds)*LIFT_RATE);
 return {lift:next,motion:(motion==='raising'&&next===LIFT_MIN)||(motion==='lowering'&&next===LIFT_MAX)?'stopped':motion};
}
