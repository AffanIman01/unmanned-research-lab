// Compatibility verified from the official M2 PRO MAX fittingList on 2026-10-30.
// Primary product pages were fetched read-only after the search service was unavailable.
// Geometry, action timing and gates below are illustrative simulator settings, not OEM ratings.
export const ACCESSORY_PLATFORM_SOURCE='https://www.chasing.com/en/chasing-m2pro-max.html';
export const ACCESSORY_CATALOG=[
 {id:'grabber',name:'CHASING Grabber Arm 2',short:'Grabber Arm 2',function:'Open / close two jaws',source:'https://www.chasing.com/en/grabber-arm-2.html',basis:'Official two-jaw clamp with interchangeable tool heads; listed for M2 PRO MAX.'},
 {id:'laser',name:'CHASING Laser Scaler',short:'Laser Scaler',function:'10 cm reference beams',source:'https://www.chasing.com/en/laser-scaler.html',basis:'Official dual 10 cm laser reference for underwater size estimation; listed for M2 PRO MAX.'},
 {id:'sonar',name:'Ping360 + CHASING kit',short:'Ping360 Sonar',function:'Rotating acoustic scan',source:'https://www.chasing.com/en/chasing-ping-360-sonar-kit.html',basis:'Listed CHASING Ping 360 integration kit; schematic sweep only, not an acoustic model.'},
 {id:'sampler',name:'CHASING Water Sampler',short:'Water Sampler',function:'Collect at selected depth',source:'https://www.chasing.com/en/chasing-water-sampler.html',basis:'Official water sampler for samples at a specified depth; listed for M2 PRO MAX.'}
];
export function createAccessoryState(){return {enabled:{grabber:false,laser:false,sampler:false,sonar:false},sonarOn:false,sonarPhase:0,grabberClosed:false,grabberAperture:1,grabberMoving:false,laserOn:false,sampleFill:0,sampling:false,samples:0,lastSample:null,laserRange:null,message:'Select a tool · simulated functions'};}
export function setAccessoryEnabled(state,id,enabled){
 if(!ACCESSORY_CATALOG.some(a=>a.id===id))return state;
 state.enabled[id]=!!enabled;
 if(!enabled&&id==='sonar')state.sonarOn=false;
 if(!enabled&&id==='laser'){state.laserOn=false;state.laserRange=null;}
 if(!enabled&&id==='sampler')state.sampling=false;
 if(!enabled&&id==='grabber'){state.grabberClosed=false;state.grabberAperture=1;state.grabberMoving=false;}
 state.message=enabled?'Mounted · illustrative fit':'Tool removed';return state;
}
export function accessoryAction(state,action,ctx={}){
 const finish=(ok,message)=>{state.message=message;return {ok,message};};
 if(action==='sample-reset'){state.sampleFill=0;state.sampling=false;return finish(true,'Sampler emptied · SIM');}
 const id=action==='grabber-toggle'?'grabber':action==='laser-toggle'?'laser':action==='sample-start'?'sampler':action==='sonar-toggle'?'sonar':null;
 if(!id)return finish(false,'Unknown action');
 if(!state.enabled[id])return finish(false,'Mount the tool first');
 if(!ctx.armed)return finish(false,'Arm the deployed ROV to operate tools');
 if(!(ctx.depth>=.3))return finish(false,'Submerge below 0.3 m · simulation gate');
 if(id==='sonar'){state.sonarOn=!state.sonarOn;return finish(true,state.sonarOn?'Sweep preview · synthetic echoes':'Sonar off');}
 if(id==='grabber'){state.grabberClosed=!state.grabberClosed;state.grabberMoving=true;return finish(true,state.grabberClosed?'Jaws closed · SIM':'Jaws open · SIM');}
 if(id==='laser'){state.laserOn=!state.laserOn;if(!state.laserOn)state.laserRange=null;return finish(true,state.laserOn?'10 cm reference · aim at the marked plate':'Laser off');}
 if(Math.abs(ctx.speed??0)>.25)return finish(false,'Slow below 0.25 m/s to collect · SIM');
 if(state.sampling)return finish(false,'Collection in progress');
 if(state.sampleFill>=1)return finish(false,'Empty sampler before a new collection');
 state.sampleFill=0;state.sampling=true;return finish(true,'Collecting water · SIM');
}
export function stepAccessories(state,dt,ctx={}){
 const wet=ctx.depth>=.3;
 if(!ctx.armed||!wet){
  if(state.sampling)state.message='Collection stopped · arm and submerge to retry';
  state.sampling=false;state.grabberMoving=false;state.laserOn=false;state.sonarOn=false;state.laserRange=null;return state;
 }
 if(state.sonarOn&&state.enabled.sonar)state.sonarPhase=(state.sonarPhase+Math.max(0,Math.min(.1,dt))*.9)%(2*Math.PI);
 if(state.grabberMoving&&state.enabled.grabber){const target=state.grabberClosed?0:1;state.grabberAperture+=(target-state.grabberAperture)*(1-Math.exp(-Math.max(0,Math.min(.1,dt))*8));if(Math.abs(state.grabberAperture-target)<.002){state.grabberAperture=target;state.grabberMoving=false;}}
 if(state.sampling&&state.enabled.sampler){
  if(Math.abs(ctx.speed??0)>.25){state.message='Collection paused · slow below 0.25 m/s';return state;}
  state.message='Collecting water · SIM';
  state.sampleFill=Math.min(1,state.sampleFill+Math.max(0,Math.min(.1,dt))/3);
  if(state.sampleFill>=1){state.sampling=false;state.samples++;state.lastSample={number:state.samples,depth:ctx.depth,position:ctx.position?{...ctx.position}:null};state.message='Sample '+state.samples+' collected at '+ctx.depth.toFixed(2)+' m · SIM';}
 }
 return state;
}
export function accessoryReadout(state,id){
 if(id==='grabber')return state.grabberMoving?(state.grabberClosed?'Closing…':'Opening…'):state.grabberAperture<.01?'Closed':state.grabberAperture>.99?'Open':'Stopped';
 if(id==='sonar')return state.sonarOn?'Scanning · demo':'Off';
 if(id==='laser')return state.laserOn?(state.laserRange==null?'10 cm · no target':'10 cm · target '+state.laserRange.toFixed(2)+' m'):'Off';
 return Math.round(state.sampleFill*100)+'%'+(state.lastSample?' · last '+state.lastSample.depth.toFixed(2)+' m':'');
}
export const ACCESSORY_PANEL_CSS=`.rov-tools{border:1px solid #52616b70;border-radius:9px;background:#17232b8c;padding:12px;color:#e0e8eb;font:12px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}.rov-tools-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:8px}.rov-tools-head b{font-size:13px}.rov-tools-head small{font-size:9px;color:#9dafbb;letter-spacing:1px}.rov-tool-row{display:flex;gap:10px;align-items:center;border-top:1px solid #72869530;padding:9px 0;flex-wrap:wrap}.rov-tool-row label{display:flex;align-items:center;gap:7px;flex:1;min-width:140px}.rov-tool-row input{accent-color:#e0bc55}.rov-tool-actions{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.rov-tool-actions button{font-family:inherit;font-size:11px;padding:5px 8px;border:1px solid #7c8d9b65;border-radius:5px;background:#21313b;color:#e4eced;cursor:pointer}.rov-tool-actions button:disabled{opacity:.4;cursor:default}.rov-tool-readout{font-size:10px;color:#e3c980;min-width:50px}.rov-tool-source{color:#a8bdc9;font-size:10px;text-decoration:none}.rov-tool-message{margin:7px 0 0;color:#afc2cd;font-size:10px;min-height:14px}.rov-tools details{margin-top:8px;color:#92a6b2;font-size:10px}.rov-tools details p{line-height:1.5;margin:5px 0}.rov-tools button:focus-visible,.rov-tools input:focus-visible{outline:2px solid #e6c564;outline-offset:2px}`;
