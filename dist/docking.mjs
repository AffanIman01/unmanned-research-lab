// Reduced kinematic demonstration. Gains/limits are illustrative, not hardware operating limits.
const clamp=(v,l,h)=>Math.max(l,Math.min(h,v));
const mag=v=>Math.hypot(...v),cap=(v,m)=>{const n=mag(v);return n>m?v.map(x=>x*m/n):v;};
export const dockLimits=Object.freeze({waterSpeed:.25,kp:.75,ki:.18,integral:.35,entryXY:.018,exitXY:.035,entryYaw:.04,exitYaw:.075,dwell:1,finalSpeed:.015,maxRetries:2,maxTime:100});
export function createDocking(){return {active:true,stage:'STANDOFF',p:[-.90,.18,-.18],v:[0,0,0],u:[0,0,0],intended:[0,0,0],yaw:.22,integral:[0,0,0],time:0,dwell:0,retries:0,saturatedFor:0,reserve:1,reason:'',history:[]};}
export function stepDocking(previous,dt,{current=.08,mountMotion=true,poseFresh=true,tetherClear=true,corridorClear=true}={}){
 const s=structuredClone(previous);if(!s.active)return s;dt=clamp(dt,0,.05);s.time+=dt;
 const stop=reason=>{s.active=false;s.stage='HOLD';s.intended=[0,0,0];s.reason=reason;s.integral=[0,0,0];return s;};
 if(!poseFresh||!tetherClear)return stop(!poseFresh?'Pose lost — no blind insertion':'Tether not clear — stop approach');
 if(!corridorClear)return stop('Approach corridor unverified');
 if(!Number.isFinite(current)||Math.abs(current)>.18)return stop('Model current limit exceeded');
 if(s.time>dockLimits.maxTime)return stop('Approach timeout — operator review');
 const mountV=mountMotion?[.012*Math.cos(s.time*.6),.018*Math.cos(s.time*.8),.012*Math.cos(s.time*.7)]:[0,0,0];
 const mountYawRate=mountMotion?.012*Math.cos(s.time*.5):0;
 // Velocity at the ROV includes the rotating mount frame (omega cross r).
 mountV[0]-=mountYawRate*s.p[1];mountV[1]+=mountYawRate*s.p[0];
 const target=s.stage==='STANDOFF'?[-.55,0,-.18]:s.stage==='INSERT'?[0,0,0]:[0,0,-.18];
 const error=target.map((x,i)=>x-s.p[i]);
 const sideways=Math.hypot(s.p[0],s.p[1]);
 if(s.stage==='INSERT'&&(sideways>dockLimits.exitXY||Math.abs(s.yaw)>dockLimits.exitYaw)){
  if(!corridorClear)return stop('Alignment lost — retreat corridor unverified');
  if(++s.retries>dockLimits.maxRetries)return stop('Retry limit reached');
  s.stage='ALIGN';s.dwell=0;s.integral=[0,0,0];return s;
 }
 let rel=error.map((e,i)=>dockLimits.kp*e+dockLimits.ki*s.integral[i]);
 if(s.stage==='INSERT'){const xy=cap([rel[0],rel[1]],.08);const stable=sideways<dockLimits.entryXY&&Math.abs(s.yaw)<dockLimits.entryYaw;rel=[...xy,stable?clamp(rel[2],-.015,dockLimits.finalSpeed):0];}else rel=cap(rel,.11);
 s.intended=[...rel];
 // Synthetic 80%-accurate current estimate; PI removes residual drift. Mount velocity feedforward.
 const ff=[mountV[0],mountV[1]-.8*current,mountV[2]];
 let raw=rel.map((x,i)=>x+ff[i]),cmd=cap(raw,dockLimits.waterSpeed),sat=mag(raw)>dockLimits.waterSpeed;
 s.saturatedFor=sat?s.saturatedFor+dt:0;s.reserve=Math.max(0,1-mag(cmd)/dockLimits.waterSpeed);
 if(s.saturatedFor>2)return stop('Sustained model command saturation');
 if(!sat)s.integral=s.integral.map((v,i)=>clamp(v+error[i]*dt,-dockLimits.integral,dockLimits.integral));
 s.u=s.u.map((u,i)=>u+(cmd[i]-u)*Math.min(1,dt/.25));
 s.v=s.u.map((u,i)=>u+(i===1?current:0)-mountV[i]);s.p=s.p.map((p,i)=>p+s.v[i]*dt);
 const yawCmd=clamp(-1.1*s.yaw+mountYawRate,-.15,.15);s.yaw+=dt*(yawCmd-mountYawRate);
 const arrived=mag(target.map((x,i)=>x-s.p[i]))<.025&&mag(s.v)<.025&&Math.abs(s.yaw)<dockLimits.entryYaw;
 const aligned=Math.hypot(s.p[0],s.p[1])<dockLimits.entryXY&&Math.abs(s.p[2]+.18)<.025&&mag(s.v)<.025&&Math.abs(s.yaw)<dockLimits.entryYaw&&s.reserve>.15;
 if((s.stage==='STANDOFF'&&arrived)||(s.stage==='ALIGN'&&aligned)){s.dwell+=dt;if(s.dwell>=dockLimits.dwell){s.stage=s.stage==='STANDOFF'?'ALIGN':'INSERT';s.dwell=0;}}
 else s.dwell=0;
 if(s.stage==='INSERT'&&Math.abs(s.p[2])<.004&&Math.hypot(s.p[0],s.p[1])<.012&&Math.abs(s.yaw)<.04&&mag(s.v)<.025){s.stage='CONTACT';s.active=false;s.intended=[0,0,0];s.v=[0,0,0];s.p=[0,0,0];s.yaw=0;s.integral=[0,0,0];s.reason='Contact confirmed — hand over to capture checks';}
 if(s.history.length===0||s.time-s.history.at(-1).t>.5)s.history.push({t:s.time,p:[...s.p],stage:s.stage});
 return s;
}
export function magneticOffGate(s={}){const reasons=['seatA','seatB','pinAFull','pinBFull','loadTransferChecked','noSlip','loadNormal','thrustersNeutral','sensorsFresh','operatorAuthorised'].filter(k=>s[k]!==true);return{allowed:reasons.length===0,reasons};}
export function postMagnetOffLiftGate(s={}){const base=magneticOffGate(s);if(s.magnetOffConfirmed!==true)base.reasons.push('magnetOffConfirmed');if(s.postOffDwellStable!==true)base.reasons.push('postOffDwellStable');return{allowed:base.reasons.length===0,reasons:base.reasons};}
