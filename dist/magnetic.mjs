// Illustrative sequence only. Boolean confirmations never imply hardware feedback.
const clamp=x=>Math.max(0,Math.min(1,x));
export function magneticState(t){
 t=clamp(t);const offPulse=t>=.835&&t<.845,onPulse=t>=.78&&t<.79;
 const pinsClosed=t<.36||t>=.81,magnetOn=t>=.78&&t<.845;
 const out=t<.42?0:t<.52?(t-.42)/.10:t<.60?1:t<.72?1-(t-.60)/.12:0;
 const gap=t<.38?0:t<.42?(t-.38)/.04*.14:t<.72?.14:t<.77?(1-(t-.72)/.05)*.14:0;
 let phase='Raised · wet yoke';
 if(t>=.12&&t<.32)phase='Lower · pins locked';else if(t>=.32&&t<.34)phase='Confirm submerged & supported';else if(t>=.34&&t<.35)phase='Confirm magnet OFF';else if(t>=.35&&t<.36)phase='Verify magnet released';else if(t>=.36&&t<.38)phase='Retract locking pins';else if(t>=.38&&t<.42)phase='Separate below head';else if(t>=.42&&t<.52)phase='Swim out · pay out';else if(t>=.52&&t<.60)phase='Mission · guide tether';else if(t>=.60&&t<.72)phase='Return below head';else if(t>=.72&&t<.77)phase='Rise into guides';else if(t>=.77&&t<.78)phase='Confirm contact';else if(onPulse)phase='Pulse ON · seat target';else if(t>=.79&&t<.81)phase='Verify magnetic state';else if(t>=.81&&t<.82)phase='Verify both locking pins';else if(t>=.82&&t<.835)phase='Check load transfer · no slip';else if(offPulse)phase='Pulse OFF · mechanical retention';else if(t>=.845&&t<.86)phase='Recheck pins & seat · magnet OFF';else if(t>=.86&&t<.98)phase='Lift · mechanical retention';
 return {phase,magnetOn,pinsClosed,offPulse,onPulse,pulsing:offPulse||onPulse,contact:gap<1e-6&&out===0,out:clamp(out),gap,tether:t>=.12&&t<.52?'Pay out / allow slack':t>=.60&&t<.98?'Take up slack only':'Hold / monitor',idleCoilWatts:0};
}
export function magneticReleaseGate(s){const keys=['fullySubmerged','loadUnloaded','rovReady','tetherClear','magnetOffConfirmed','pinsClosed','sensorsFresh','operatorAuthorised'];const reasons=keys.filter(k=>s?.[k]!==true);return{allowed:!reasons.length,reasons};}
export function pulseEnergy({voltage=24,current=3,pulseSeconds=.2,pulses=2}={}){for(const n of [voltage,current,pulseSeconds,pulses])if(!Number.isFinite(n)||n<0)throw new RangeError('Finite nonnegative energy assumptions required');return voltage*current*pulseSeconds*pulses/3600;}
