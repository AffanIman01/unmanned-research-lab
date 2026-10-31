// Visual limits: the reference stroke is unmeasured; 65% is the user-set lower stop.
export const REFERENCE_STROKE_M = 0.418;
export const MAX_LIFT_FRACTION = 0.65;
export const MAX_LIFT_TRAVEL_M = REFERENCE_STROKE_M * MAX_LIFT_FRACTION;
export const clampLift = value => Number.isFinite(value) ? Math.max(0, Math.min(MAX_LIFT_FRACTION, value)) : 0;
