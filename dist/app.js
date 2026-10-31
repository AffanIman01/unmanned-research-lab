import {createAccessoryShowroomUI} from './accessory-showroom.mjs?v=tools-az';
import './m2-training.mjs?v=training-as';
import {createHardwareLesson} from './hardware-lesson.mjs?v=antennas-ae';
import {bindVisionControls} from './vision-controls.mjs?v=vision-k';
import {MAX_LIFT_FRACTION,clampLift} from './lift.mjs?v=vision-k';
import {createDocking,stepDocking,magneticOffGate,postMagnetOffLiftGate} from './docking.mjs?v=vision-k';
import {magneticState,magneticReleaseGate,pulseEnergy} from './magnetic.mjs?v=vision-k';
import {createScene} from './scene.js?v=tools-az';
import {calculate,defaults} from './calculations.mjs?v=vision-k';
import {recoveryGate,assessFault,guidance} from './supervisor.mjs?v=vision-k';

const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const concepts={
 D:{name:'Magnet + mechanical lock',accent:'#ffb35b',intent:'Your ring → compact pulse-switched EPM head → two mechanical pins → removable ROV yoke. Guide pins carry side load. The steel target and support yoke stay on the ROV. A separate stern fairlead routes the tether; its sweep and bend radius need validation.'},
};
const state={concept:'D',subject:'me120',accessoryMode:false,cameraMode:'orbit',lights:false,thrusters:false,usvThrusters:false,usvLift:0,usvLiftTarget:0,usvLiftCycling:false,progress:0,explode:0,playing:false,blocked:false,fault:'none',docking:null,phase:'',overrides:{},conceptOverrides:{D:{}},results:null};
let studioActive=true,studioViewRequest=0,lesson,viewer;try{viewer=createScene($('#viewport'));}catch(e){$('#loadError').hidden=false;$('#exportGLB').disabled=true;console.error(e);}
viewer?.ready.then(()=>{$('#modelStatus').hidden=true;$('#exportGLB').disabled=false;render();if(state.cameraMode==='orbit')viewer.view('catch');}).catch(()=>{$('#modelStatus').hidden=true;$('#loadError').hidden=false;$('#exportGLB').disabled=true;});
$('#exportGLB').disabled=true;
const galleryUI=createAccessoryShowroomUI($('#accessoryGalleryHost'),{onSelect:id=>viewer?.accessoryGallery.select(id),onPlay:on=>viewer?.accessoryGallery.play(on),onClose:()=>toggleAccessoryGallery(false)});
function toggleAccessoryGallery(force){if(state.subject!=='rov')return;lesson?.close();viewer?.components.close({restore:false,instant:true});state.accessoryMode=force??!state.accessoryMode;state.cameraMode='orbit';state.explode=0;$('#explode').value=0;render();galleryUI.show(state.accessoryMode);viewer?.view('iso');}
$('#rovAccessories').onclick=()=>toggleAccessoryGallery();
const entries=[];
function log(message){entries.unshift(`${new Date().toLocaleTimeString([], {hour12:false})}  ${message}`);$('#log').textContent=entries.slice(0,14).join('\n');}
const phases=[
 [0,'STOWED','Transport locked','The ROV is retained in its cradle; a separate transport restraint carries the stowed load.'],
 [.08,'PRECHECK','Check station & tether','Confirm the motion window, local command lease, unobstructed travel and tether routing.'],
 [.12,'LOWER','Move to docking depth','Illustrative motion only. Keep capture dogs and the rear gate closed while lowering.'],
 [.32,'WET_VERIFY','Verify full immersion','Pause at depth. Confirm the configured ROV is submerged before opening retention.'],
 [.35,'RELEASE','Open the catch','Open the gate and retract the dogs only after immersion and tether checks.'],
 [.38,'SWIM_OUT','Piloted departure','The ROV swims astern; this demo assumes supervised manual E-Reel payout.'],
 [.52,'MISSION','Underwater mission','Carrier stays at docking depth. Tether management and USV motion limits remain active.'],
 [.60,'APPROACH','Return through the funnel','Use relative pose and bounded approach speed. The reel must not drag the ROV into the cradle.'],
 [.76,'SEAT','Verify both seat sensors','Keep the carrier still while both seat observations remain stable.'],
 [.81,'CAPTURED','Close gate & capture dogs','Require two locks, two seat confirmations, gate closed and neutral ROV thrust.'],
 [.845,'VERIFY','Verify load transfer','The illustrative local lift gate needs stable capture, fresh observations, clear tether and operator authorization.'],
 [.86,'LIFT_DRAIN','Recover & drain','Retain all locks while lifting. Monitor load, travel and tether; pause on disagreement.'],
 [.98,'STOW_LOCK','Engage transport lock','Transfer the stowed weight to structural supports and the independent transport restraint.']
];
function currentPhase(t=state.progress){return [...phases].reverse().find(p=>t>=p[0])||phases[0];}
function sensors(){const t=state.progress,m=magneticState(t),closed=state.concept==='D'?m.pinsClosed:t<.35||t>=.81,seated=state.concept==='D'?m.contact:t<.38||t>=.76;return{
 seatA:seated,seatB:seated,lockA:closed,lockB:closed&&state.fault!=='latch',gateClosed:closed,
 rovNeutralConfirmed:closed,tetherClear:state.fault!=='tether',loadNormal:state.fault!=='tether',relativeMotionOk:state.fault!=='pose',brakeReady:true,travelClear:true,operatorAuthorised:true,leaseValid:state.fault!=='link',noDisagreement:state.fault!=='latch',
 sensorAgeMs:state.fault==='pose'?500:20,leaseAgeMs:state.fault==='link'?600:20,stableDwellMs:closed?600:0,rearmRequired:state.blocked,leaseEpoch:'demo',armedEpoch:'demo'
};}
function stopForFault(code){if(state.blocked)return;if(state.docking){state.docking.active=false;state.docking.stage='HOLD';state.docking.integral=[0,0,0];state.docking.reason='Fault — explicit review required';}const action=assessFault(code,state.concept==='D'&&state.progress>=.77&&state.progress<.81?'PARTIAL_CAPTURE':currentPhase()[1]);state.blocked=true;state.playing=false;$('#faultBanner').hidden=false;$('#faultBanner').textContent=`FAULT HOLD · ${action.reason}. Mechanism stopped; preserve engaged restraints. Explicit acknowledgment required.`;log(`${code}: motion blocked; no automatic retrieval or reel take-up.`);}
function faultCheck(next){
 if(state.concept==='D'&&state.fault==='magnet'&&next>=.34)stopForFault('MAGNET_UNCONFIRMED');
 if(state.concept==='D'&&!state.blocked&&state.progress<.36&&next>=.36){const result=magneticReleaseGate({fullySubmerged:true,loadUnloaded:true,rovReady:true,tetherClear:state.fault!=='tether',magnetOffConfirmed:state.fault!=='magnet',pinsClosed:true,sensorsFresh:state.fault!=='pose',operatorAuthorised:true});if(!result.allowed)stopForFault('MAGNET_UNCONFIRMED');}
 if(state.concept==='D'&&!state.blocked&&state.progress<.835&&next>=.835){const g=magneticOffGate(handoverSensors());if(!g.allowed)stopForFault('LATCH_DISAGREEMENT');}
 if(state.concept==='D'&&!state.blocked&&state.progress<.86&&next>=.86){const g=postMagnetOffLiftGate({...handoverSensors(),magnetOffConfirmed:state.fault!=='magnet',postOffDwellStable:state.fault!=='slip'});if(!g.allowed)stopForFault('LATCH_DISAGREEMENT');}
 if(state.fault==='slip'&&next>=.82)stopForFault('LATCH_DISAGREEMENT');
 if(state.fault==='link')stopForFault('STALE_LEASE');
 if(state.fault==='tether')stopForFault('HIGH_TENSION');
 if(state.fault==='pose'&&next>=.12)stopForFault('POSE_STALE');
 if(state.fault==='latch'&&next>=.81)stopForFault('LATCH_DISAGREEMENT');
 if(!state.blocked&&state.progress<.86&&next>=.86){const before=state.progress;state.progress=.855;const gate=recoveryGate(sensors());state.progress=before;if(!gate.allowed)stopForFault('LATCH_DISAGREEMENT');else log('Lift gate passed · synthetic confirmations, 600 ms capture dwell.');}
}
function handoverSensors(){return{seatA:true,seatB:true,pinAFull:true,pinBFull:state.fault!=='latch',loadTransferChecked:state.fault!=='slip',noSlip:state.fault!=='slip',loadNormal:state.fault!=='tether',thrustersNeutral:true,sensorsFresh:state.fault!=='pose',operatorAuthorised:true};}
function canSpin(){if(lesson?.mode)return false;if(state.subject==='me120'||state.explode||state.blocked)return false;if(state.subject==='rov')return true;return state.concept==='D'?state.progress>=.38&&state.progress<.77:state.progress>=.38&&state.progress<.76;}
function render(){
 $('#rovAccessories').hidden=state.subject!=='rov';$('#rovAccessories').classList.toggle('active',state.accessoryMode);$('#rovAccessories').setAttribute('aria-pressed',String(state.accessoryMode));
 $('#m2TrainingButton').hidden=state.subject!=='rov';
 $('#usvTools').hidden=state.subject!=='me120';const usvPaused=state.explode>0||state.blocked||!!lesson?.mode;for(const id of ['usvPropellers','usvLiftUp','usvLiftDown','usvLiftCycle','usvLift'])$('#'+id).disabled=usvPaused;$('#usvPropellers').classList.toggle('active',state.usvThrusters&&!usvPaused);$('#usvPropellers').setAttribute('aria-pressed',String(state.usvThrusters&&!usvPaused));$('#usvLiftCycle').classList.toggle('active',state.usvLiftCycling);$('#usvLiftCycle').setAttribute('aria-pressed',String(state.usvLiftCycling));$('#usvLiftCycle').innerHTML=(state.usvLiftCycling?'Pause':'Cycle')+' <kbd>H</kbd>';$('#usvLift').value=Math.round(state.usvLift*100);$('#usvLiftValue').textContent=state.usvLift<.001?'Raised':state.usvLift>=MAX_LIFT_FRACTION-.00001?'65% down · max':Math.round(state.usvLift*100)+'% down';
 const spinAllowed=canSpin();$('#rovTools').hidden=state.subject==='me120';$('#rovLights').disabled=state.explode>0;$('#rovLights').classList.toggle('active',state.lights);$('#rovLights').setAttribute('aria-pressed',String(state.lights));$('#rovThrusters').disabled=!spinAllowed;$('#rovThrusters').classList.toggle('active',state.thrusters&&spinAllowed);$('#rovThrusters').setAttribute('aria-pressed',String(state.thrusters&&spinAllowed));$('#rovThrusters').title=spinAllowed?'Visual propeller spin (T)':'Held while captured, blocked or exploded. Use M2 PRO MAX view for preview.';$('#rovEffectStatus').textContent=state.explode?'Exploded · effects paused':!spinAllowed?'Thrusters held':state.thrusters?'Propellers spinning · visual':'Visual preview';
 const p=currentPhase();if(p[1]!==state.phase){state.phase=p[1];log(p[2]);}
 $('#progress').value=Math.round(state.progress*1000);$('#explodeValue').textContent=Math.round(state.explode*100)+'%';
 $('#viewName').textContent=state.explode?'EXPLODED':state.blocked?'FAULT HOLD':'ASSEMBLED';
 $('#phaseTitle').textContent=state.explode?'Exploded':state.concept==='D'?(state.docking?.active?state.docking.stage:state.docking?.stage==='HOLD'?'Demo paused · review approach':magneticState(state.progress).phase):p[2];$('#phaseDetail').textContent=p[3];
 $('#play').textContent=state.playing?'Ⅱ Pause':'▶ Play';$('#play').disabled=state.blocked||state.explode>0||state.docking?.stage==='HOLD';$('#dockTrial').disabled=state.blocked||state.explode>0;$('#dockTrial').hidden=state.subject!=='system'||state.concept!=='D';$('#flowDemo').hidden=state.subject!=='system'||state.concept!=='D';$('#flowValue').textContent=Number($('#flowCurrent').value).toFixed(2)+' m/s';const ds=state.docking;$('#dockReadout').textContent=ds?`${ds.stage} · side ${Math.round(ds.p[1]*1000)} mm · yaw ${(ds.yaw*180/Math.PI).toFixed(1)}° · speed margin ${Math.round(ds.reserve*100)}%${ds.stage==='HOLD'?' · '+ds.reason:''}`:'Correct position → match motion → insert · kinematic demo';
 const s=sensors();const m=magneticState(state.progress);$('#magneticStatus').hidden=state.subject!=='system'||state.concept!=='D';$('#magneticStatus').textContent=`${m.pulsing?'Coil: switching pulse':'Coil: 0 W hold'} · ${m.magnetOn?'Magnet ON':'Magnet OFF'} · ${m.pinsClosed?'Pins locked':'Pins open'}`;$('#tetherStatus').textContent=m.tether+' · illustrative flow';$('#epmDetails').hidden=state.concept!=='D';$('#tetherStatus').hidden=state.subject!=='system'||state.concept!=='D';$('#sensorList').innerHTML=[['Two seat observations',s.seatA&&s.seatB],['Two capture dogs',s.lockA&&s.lockB],[state.concept==='D'?'Guide engagement': 'Rear gate closed',state.concept==='D'?s.seatA&&s.seatB:s.gateClosed],['Tether / load normal',s.tetherClear&&s.loadNormal],['Pose & motion fresh',s.relativeMotionOk],['Local command lease',s.leaseValid]].map(([name,ok])=>`<div class="sensor"><span>${name}</span><b class="${ok?'':'bad'}">${ok?'Confirmed':'Not confirmed'}</b></div>`).join('');
 $('#cycleBlock').hidden=state.subject!=='system';$('#metricBlock').hidden=state.subject!=='system';$$('.systemonly').forEach(x=>x.hidden=state.subject!=='system');$$('.modelonly').forEach(x=>x.hidden=state.subject==='system');$('#dimensions').disabled=state.explode>0;
 $('#oceanalphaLogo').hidden=state.subject!=='me120';$('#chasingLogo').hidden=state.subject!=='rov';$('#vehicleTitleDivider').hidden=state.subject==='system';
 $('#conceptTitle').textContent=state.subject==='me120'?'ME120':state.subject==='rov'?'M2 PRO MAX':concepts[state.concept].name;
 $('#vehicleDescription').hidden=state.subject==='system';$('#vehicleDescription').textContent=state.subject==='me120'?'Multi-Payload USV for Inland and Nearshore Survey Operations':state.subject==='rov'?'Industrial ROV':'';
 $('#conceptTitle').setAttribute('aria-label',state.subject==='me120'?'OceanAlpha ME120':state.subject==='rov'?'CHASING M2 PRO MAX':concepts[state.concept].name);
 $('#scaleNote').textContent=state.subject==='system'?('Your round mount · dimensions unverified'):state.subject==='rov'?'608 × 294 × 196 mm · excl. lights':'2.50 × 1.40 m · nominal hull';
 viewer?.update({subject:state.subject,accessoryMode:state.accessoryMode,cameraMode:state.cameraMode,dimensions:$('#dimensions').checked,progress:state.progress,explode:state.explode,hulls:$('#hulls').checked,water:$('#water').checked,focus:$('#focus').checked,magnet:$('#magnet').checked,tether:$('#tether').checked,lights:state.lights,usvThrusters:state.usvThrusters&&!state.blocked,usvLift:state.usvLift,thrusters:state.thrusters&&spinAllowed,guidance:$('#guidance').checked,playing:state.playing,blocked:state.blocked,poseStale:state.fault==='pose',dockMotion:state.docking&&(state.docking.active||state.docking.stage==='HOLD'||state.progress<.78)?state.docking:null,dockPose:state.docking&&(state.docking.active||state.docking.stage==='HOLD')?{p:state.docking.p,yaw:state.docking.yaw}:null});
 renderPositioning();renderVision();
}
function renderPositioning(){
 const g=viewer?.getGeometry()?.guidance;const show=!!g?.visible;$('#positionHud').hidden=!show;$('#motionLegend').hidden=!show;if(!show)return;
 const stale=g.poseStale,ds=state.docking,live=state.playing&&!state.blocked&&ds?.active;
 const value=(v,unit,d=0)=>stale?'—':`${Number(v.toFixed(d))===0?(0).toFixed(d):v.toFixed(d)} ${unit}`;
 ['X','Y','Z'].forEach((axis,i)=>$('#pose'+axis).textContent=value(g.offset[i]*1000,'mm'));
 $('#poseYaw').textContent=value(g.yaw*180/Math.PI,'°',1);$('#poseRange').textContent=value(Math.hypot(...g.offset),'m',3);
 $('#poseSpeed').textContent=stale||g.frozen?'—':value(Math.hypot(...g.actual),'m/s',3);
 $('#speedFrame').textContent=g.frame==='mount-relative'?'Relative speed':'World speed';$('#motionFrame').textContent=g.frame==='mount-relative'?'Mount relative':'Animation · world';
 $('#poseSource').textContent=stale?'Pose unavailable':live?'Model pose + velocity':g.source==='kinematic model'?'Last model sample':'Animation pose';
 $('#poseFreshness').textContent=stale?'STALE':state.blocked||ds?.stage==='HOLD'?'HOLD':live?'LIVE SIM':state.playing?'ANIMATING':ds?'PAUSED':'PREVIEW';
 $('#positionHud').classList.toggle('stale',stale);$('#positionHud').classList.toggle('frozen',g.frozen&&!stale);
}
function reset(){visionControls.clear();state.docking=null;state.progress=0;state.playing=false;state.phase='';render();}
function selectConcept(c='D'){
 if(c!=='D')return;state.docking=null;state.concept='D';state.progress=0;state.playing=false;state.phase='';
 document.documentElement.style.setProperty('--accent',concepts.D.accent);
 $('#conceptIntent').textContent=concepts.D.intent;$('#cadLink').href='./downloads/D_Magnetic_Capture.step';$('#cadLink').textContent='Magnetic head + yoke · STEP';
 $('#catchParts').innerHTML=['Your round mount','Pulse-switched EPM head','Two mechanical locking pins','Steel target + support yoke','Separate stern tether guide'].map(x=>'<li>'+x+'</li>').join('');
 viewer?.setConcept('D');buildInputs();recalculate();render();
}
function setCameraMode(mode){
 if(state.accessoryMode){state.accessoryMode=false;galleryUI.show(false);}
 lesson?.close();
 viewer?.components.close({restore:false,instant:true});
 if(!viewer?.getGeometry().loaded)return;
 visionControls.clear();state.cameraMode=mode;state.explode=0;$('#explode').value=0;
 render();if(mode==='orbit')viewer.view('iso');
}
function renderVision(){
 const onboard=state.cameraMode!=='orbit',ptz=state.cameraMode==='usv',v=viewer?.vision.info();
 $('#viewport').classList.toggle('onboard',onboard);$('#cameraHud').hidden=!onboard;$('#ptzControls').hidden=!ptz;
 $('#usvCamera').hidden=state.subject==='rov';$('#rovCamera').hidden=state.subject==='me120';
 $('#usvCamera').classList.toggle('active',ptz);$('#rovCamera').classList.toggle('active',state.cameraMode==='rov');
 $('#usvCamera').setAttribute('aria-pressed',String(ptz));$('#rovCamera').setAttribute('aria-pressed',String(state.cameraMode==='rov'));
 $('#usvCamera').disabled=$('#rovCamera').disabled=!viewer?.getGeometry().loaded;
 $('#exitCamera').hidden=!onboard;$('#explode').disabled=onboard;$('#dimensions').disabled=onboard||state.explode>0;
 $('#cameraLabel').textContent=ptz?'USV · PTZ':'ROV · FRONT';
 $('#cameraHint').textContent=ptz?'WASD · aim camera':'Fixed view · follows ROV';
 $('#cameraData').textContent=ptz?`PAN ${v?.yaw.toFixed(0)||0}° / TILT ${v?.pitch.toFixed(0)||0}° / ${v?.zoom.toFixed(1)||'1.0'}×`:'80° FOV · simulated';
 $('#ptzReadout').textContent=ptz?`${v?.yaw.toFixed(0)||0}° pan · ${v?.pitch.toFixed(0)||0}° tilt`:'';
 $('.viewhelp').textContent=onboard?'Esc · return to orbit':'Drag to orbit · scroll to zoom';
 if(onboard){$('#positionHud').hidden=true;$('#motionLegend').hidden=true;}
}
const visionControls=bindVisionControls({getMode:()=>state.cameraMode,getViewer:()=>viewer,onExit:()=>setCameraMode('orbit'),onChange:renderVision});
$('#viewport').addEventListener('componentselect',()=>{visionControls.clear();state.usvLiftCycling=false;state.usvLiftTarget=state.usvLift;state.usvThrusters=false;render();});
$('#viewport').addEventListener('componentcamera',e=>setCameraMode(e.detail?.mode==='rov'?'rov':'usv'));
$('#viewport').addEventListener('componenteffect',e=>{if(state.subject!=='rov')return;const id=e.detail?.effect==='lights'?'rovLights':e.detail?.effect==='thrusters'?'rovThrusters':null;if(id)$('#'+id).click();});
lesson=createHardwareLesson({host:$('#hardwareLesson'),onOpen(mode){
 visionControls.clear();viewer?.components.close({restore:false,instant:true});
 state.subject='me120';state.cameraMode='orbit';state.explode=0;state.playing=false;state.docking=null;
 state.usvThrusters=false;state.thrusters=false;state.usvLiftCycling=false;state.usvLiftTarget=state.usvLift;
 $('#explode').value=0;$$('[data-subject]').forEach(b=>b.classList.toggle('active',b.dataset.subject==='me120'));
 render();if(!viewer?.hardware.info().mode)viewer?.view('iso');viewer?.hardware.setMode(mode);
 $('#howHardwareWorks').classList.add('active');$('#howHardwareWorks').setAttribute('aria-expanded','true');
},onClose(){if($('#hardwareLesson').contains(document.activeElement))$('#howHardwareWorks').focus({preventScroll:true});viewer?.hardware.stop();$('#howHardwareWorks').classList.remove('active');$('#howHardwareWorks').setAttribute('aria-expanded','false');render();},onDistance(value){viewer?.hardware.setDistance(value);}});
$('#howHardwareWorks').disabled=!viewer?.getGeometry().loaded;
viewer?.ready.then(()=>{$('#howHardwareWorks').disabled=false;}).catch(()=>{});
$('#howHardwareWorks').onclick=()=>{if(lesson.mode)lesson.close();else lesson.open('stereo');};
$('#viewport').addEventListener('hardwarelesson',e=>lesson.open(e.detail.mode));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&lesson.mode&&!document.querySelector('dialog[open]')){e.preventDefault();lesson.close();$('#howHardwareWorks').focus({preventScroll:true});}});

$('#usvCamera').onclick=()=>setCameraMode(state.cameraMode==='usv'?'orbit':'usv');
$('#rovCamera').onclick=()=>setCameraMode(state.cameraMode==='rov'?'orbit':'rov');
$('#exitCamera').onclick=()=>setCameraMode('orbit');
function setSubject(subject){state.accessoryMode=false;galleryUI.show(false);lesson?.close();viewer?.components.close({restore:false,instant:true});visionControls.clear();state.cameraMode='orbit';state.usvLiftCycling=false;state.usvLiftTarget=state.usvLift;state.docking=null;state.subject=subject;state.playing=false;state.explode=0;$('#explode').value=0;$$('[data-subject]').forEach(b=>b.classList.toggle('active',b.dataset.subject===subject));render();viewer?.view('iso');}
$$('[data-subject]').forEach(b=>b.addEventListener('click',()=>setSubject(b.dataset.subject)));
function details(open){$('#inspector').hidden=!open;$('main').classList.toggle('with-details',open);$('#details').classList.toggle('active',open);$('#details').setAttribute('aria-expanded',open);}
$('#details').onclick=()=>details($('#inspector').hidden);$('#closeDetails').onclick=()=>details(false);
$$('[data-camera]').forEach(b=>b.addEventListener('click',()=>{lesson?.close();visionControls.clear();state.cameraMode='orbit';render();$$('[data-camera]').forEach(x=>x.classList.toggle('active',x===b));if(b.dataset.camera==='tether'){$('#tether').checked=true;$('#focus').checked=false;$('#hulls').checked=true;render();}if(b.dataset.camera==='mount'){$('#focus').checked=true;render();}viewer?.view(b.dataset.camera);}));
$$('[data-tab]').forEach(b=>b.addEventListener('click',()=>{$$('[data-tab]').forEach(x=>{x.classList.toggle('active',x===b);x.setAttribute('aria-selected',x===b);});['assembly','loads','logic'].forEach(id=>$('#'+id+'Panel').hidden=id!==b.dataset.tab);}));
$('#usvPropellers').onclick=()=>{state.usvThrusters=!state.usvThrusters;render();};
$('#usvLiftUp').onclick=()=>{state.usvLiftCycling=false;state.usvLiftTarget=0;render();};
$('#usvLiftDown').onclick=()=>{state.usvLiftCycling=false;state.usvLiftTarget=MAX_LIFT_FRACTION;render();};
$('#usvLiftCycle').onclick=()=>{state.usvLiftCycling=!state.usvLiftCycling;state.usvLiftTarget=state.usvLiftCycling?(state.usvLift>MAX_LIFT_FRACTION/2?0:MAX_LIFT_FRACTION):state.usvLift;render();};
$('#usvLift').oninput=e=>{state.usvLiftCycling=false;state.usvLift=clampLift(Number(e.target.value)/100);state.usvLiftTarget=state.usvLift;render();};
$('#rovLights').onclick=()=>{state.lights=!state.lights;render();};
$('#rovThrusters').onclick=()=>{if(!canSpin())return;state.thrusters=!state.thrusters;render();};
document.addEventListener('keydown',e=>{if(!studioActive||e.repeat||e.ctrlKey||e.altKey||e.metaKey||e.target.closest('input,textarea,select,[contenteditable]')||document.querySelector('dialog[open]')||viewer?.components.active||lesson?.mode)return;const key=e.key.toLowerCase();if(key==='k'&&state.subject==='rov'){e.preventDefault();toggleAccessoryGallery();return;}if(state.subject==='me120'){if(key==='t'&&!state.explode&&!state.blocked){e.preventDefault();$('#usvPropellers').click();}if(key==='h'&&!state.explode&&!state.blocked){e.preventDefault();$('#usvLiftCycle').click();}return;}if(key==='f'&&!state.explode){e.preventDefault();$('#rovLights').click();}if(key==='t'&&canSpin()){e.preventDefault();$('#rovThrusters').click();}});
$('#play').addEventListener('click',()=>{if(state.blocked||state.explode)return;if(state.progress>=1)state.progress=0;faultCheck(state.progress);if(!state.blocked)state.playing=!state.playing;render();});
$('#reset').addEventListener('click',reset);
$('#dockTrial').onclick=()=>{if(state.blocked||state.explode)return;visionControls.clear();state.cameraMode='orbit';state.docking=createDocking();state.progress=.60;state.playing=true;$('#focus').checked=true;render();viewer?.view('iso');};
$('#flowCurrent').oninput=render;$('#mountMotion').onchange=render;
$('#progress').addEventListener('input',e=>{state.playing=false;if(state.blocked){render();return;}state.docking=null;const next=Number(e.target.value)/1000;faultCheck(next);if(!state.blocked)state.progress=next;render();});
$('#explode').addEventListener('input',e=>{state.accessoryMode=false;galleryUI.show(false);lesson?.close();visionControls.clear();state.cameraMode='orbit';state.explode=Number(e.target.value)/100;state.usvLiftCycling=false;state.usvLiftTarget=state.usvLift;state.playing=false;render();});
['hulls','water','focus','magnet','dimensions','tether','guidance'].forEach(id=>$('#'+id).addEventListener('change',render));
$('#fault').addEventListener('change',e=>{state.fault=e.target.value;log(state.fault==='none'?'Fault input removed; acknowledge to rearm.':`Fault injected: ${e.target.selectedOptions[0].textContent}`);faultCheck(state.progress);render();});
$('#ack').addEventListener('click',()=>{if(state.fault!=='none'){$('#faultBanner').hidden=false;$('#faultBanner').textContent='Remove the injected fault first, then acknowledge. The demonstrator will remain paused.';return;}state.blocked=false;state.playing=false;$('#faultBanner').hidden=true;log('Operator acknowledgment · rearmed; use Play to resume.');render();});
['sourceButton','openSources'].forEach(id=>$('#'+id).onclick=()=>$('#sources').showModal());$('#closeSources').onclick=()=>$('#sources').close();$('#sources').addEventListener('click',e=>{if(e.target===$('#sources')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),20000);}
$('#exportGLB').onclick=async()=>{lesson?.close();const button=$('#exportGLB');button.disabled=true;button.textContent='Exporting…';try{download(await viewer.exportGLB(),`${state.subject}_${state.concept}_${state.explode?'exploded':'pose'}.glb`);}catch(e){log('3D export failed: '+e.message);}finally{button.disabled=false;button.textContent='GLB ↓';}};
$('#exportCalc').onclick=()=>{if(!state.results)return;download(new Blob([JSON.stringify({title:'ME120–CHASING preliminary demand calculation',created:new Date().toISOString(),defaults,overrides:{...state.overrides,concept:state.conceptOverrides[state.concept]},result:state.results},null,2)],{type:'application/json'}),`Concept_${state.concept}_load_calculation.json`);};

const basic=[
 ['ROV base mass','rov_base_mass_kg','kg',.1],['ROV accessory allowance','rov_accessory_allowance_kg','kg',.1],['Docking shoe','rov_docking_shoe_mass_kg','kg',.1],['Moving carrier','moving_carrier_mass_kg','kg',.1,'concept'],['Retained water','retained_water_allowance_kg','kg',.1],['Supported tether share','supported_tether_segment_kg','kg',.1],['Fixed mechanism','fixed_mechanism_mass_kg','kg',.1,'concept'],['Reel + remaining tether','ereel_and_remaining_stored_tether_allowance','kg',.1,'aux'],['Starlink + mount','starlink_and_mount_allowance','kg',.1,'aux'],['Computer + enclosure','computer_and_dry_enclosure_allowance','kg',.1,'aux'],['Other power / brackets','power_cables_and_other_brackets_allowance','kg',.1,'aux'],['Existing payload (unknown if blank)','existing_payload_kg','kg',.1],['Payload comparison reference','reference_payload_capacity_kg','kg',1]
];
const advanced=[
 ['Dynamic multiplier','dynamic_multiplier','×',.1],['Friction allowance','friction_force_n','N',1],['Screening strength factor','strength_factor','×',.1],['Mount load offset','load_offset_from_mount_m','m',.01,'concept'],['Guide reaction spacing','guide_reaction_spacing_m','m',.01,'concept'],['Vertical equivalent speed','lift_speed_m_s','m/s',.01],['Separate lift-drive efficiency','winch_efficiency','0–1',.01],['Motor efficiency','motor_efficiency','0–1',.01],['Maximum drum radius','drum_max_radius_m','m',.005],['Relative water speed','relative_water_speed_m_s','m/s',.1],['Projected area','projected_area_m2','m²',.01],['Drag coefficient','drag_coefficient','—',.1],['Ready vessel baseline (illustrative)','illustrative_baseline_vessel_mass_kg','kg',1]
];
function valueFor(key,scope){if(scope==='concept')return Object.hasOwn(state.conceptOverrides[state.concept],key)?state.conceptOverrides[state.concept][key]:defaults.concepts[state.concept][key];if(scope==='aux')return Object.hasOwn(state.overrides.fixed_auxiliary_items_kg||{},key)?state.overrides.fixed_auxiliary_items_kg[key]:defaults.fixed_auxiliary_items_kg[key];return Object.hasOwn(state.overrides,key)?state.overrides[key]:(key==='rov_docking_shoe_mass_kg'&&defaults.concepts[state.concept][key]!==undefined?defaults.concepts[state.concept][key]:defaults[key]);}
function field([label,key,unit,step,scope='global']){const wrap=document.createElement('label');wrap.className='field inputrow';const caption=document.createElement('span');caption.textContent=label;const cell=document.createElement('span');const input=document.createElement('input');input.type='number';input.step=step;input.min=0;input.value=valueFor(key,scope)??'';input.placeholder='Unknown';input.setAttribute('aria-label',`${label} (${unit})`);input.dataset.key=key;const small=document.createElement('small');small.textContent=unit;cell.append(input,small);wrap.append(caption,cell);input.addEventListener('input',()=>{const value=input.value===''?null:Number(input.value);if(scope==='concept')state.conceptOverrides[state.concept][key]=value;else if(scope==='aux'){state.overrides.fixed_auxiliary_items_kg??={};state.overrides.fixed_auxiliary_items_kg[key]=value;}else state.overrides[key]=value;recalculate();});return wrap;}
function buildInputs(){$('#inputs').replaceChildren(...basic.map(field));$('#advancedInputs').replaceChildren(...advanced.map(field));}
const num=(n,d=1)=>Number(n).toLocaleString(undefined,{maximumFractionDigits:d,minimumFractionDigits:d});
function row(label,value,unit=''){return `<div class="resultrow"><span>${label}</span><strong>${value} <small>${unit}</small></strong></div>`;}
function recalculate(){try{
 const required=[...basic,...advanced].filter(x=>x[1]!=='existing_payload_kg');for(const [,key,,,scope]of required){const n=valueFor(key,scope);if(n===null||!Number.isFinite(n))throw new Error('Complete all numeric assumptions; only existing payload may remain unknown.');}
 const r=calculate(state.concept,{...state.overrides,concept:state.conceptOverrides[state.concept]});state.results=r;
 $('#massMetric').innerHTML=`${num(r.moving_recovery_mass_kg)} <span>kg</span>`;$('#forceMetric').innerHTML=`${num(r.operational_lift_force_n,0)} <span>N</span>`;$('#targetMetric').innerHTML=`${num(r.screening_strength_resistance_n,0)} <span>N</span>`;
 let html='<h3>Demand, not capacity</h3>'+row('New payload · dry',num(r.added_dry_payload_kg),'kg')+row('New payload · recovery',num(r.added_wet_recovery_payload_kg),'kg')+row('Moving wet mass',num(r.moving_recovery_mass_kg),'kg')+row('Operational lift demand',num(r.operational_lift_force_n,0),'N')+row('Resistance screening target',num(r.screening_strength_resistance_n,0),'N')+row('Mount moment · service',num(r.service_mount_moment_nm),'Nm')+row('Mount moment · target',num(r.screening_mount_resistance_nm),'Nm')+row('Lateral drag · separate case',num(r.drag_screening_separate_lateral_load_n),'N');
 html+=row('Equivalent electrical lift power',num(r.electrical_lift_power_w),'W')+row('Illustrative aft CG shift',num(r.illustrative_horizontal_cg_shift_m*1000),'mm')+row('Arithmetic payload balance',r.remaining_payload_kg===null?'Unknown':num(r.remaining_payload_kg),'kg')+'<p class="calcsmall">Payload balance uses the selected reference and your existing payload entry. The vessel revision, loading definition, stability and lifter capacity remain unconfirmed. Power excludes startup and the rest of the system.</p><div class="formula">F = m × 9.81 × dynamic multiplier + friction<br>Resistance target = F × strength factor<br>Mount moment = F × offset<br>Drag = ½ × 1025 × Cᵈ × area × speed²</div>';
 $('#loadResults').innerHTML=html;$('#exportCalc').disabled=false;
 }catch(e){state.results=null;$('#loadResults').textContent=e.message;['massMetric','forceMetric','targetMetric'].forEach(id=>$('#'+id).textContent='—');$('#exportCalc').disabled=true;}}
let last=performance.now();function tick(now){const dt=Math.min((now-last)/1000,.05);last=now;if(!studioActive){requestAnimationFrame(tick);return;}if(lesson?.mode){const step=document.hidden||!lesson.playing?0:dt;viewer?.hardware.update(step);lesson.update(step,viewer?.hardware.info());}if(state.subject==='me120'&&!state.explode&&!state.blocked&&!document.hidden){const error=state.usvLiftTarget-state.usvLift;if(Math.abs(error)>.00001){state.usvLift=clampLift(state.usvLift+Math.sign(error)*Math.min(Math.abs(error),dt*.25));render();}else if(state.usvLiftCycling){state.usvLiftTarget=state.usvLift>MAX_LIFT_FRACTION/2?0:MAX_LIFT_FRACTION;}}if(state.playing&&!document.hidden){
 if(state.docking?.active){faultCheck(state.progress);if(!state.blocked){state.docking=stepDocking(state.docking,dt,{current:Number($('#flowCurrent').value),mountMotion:$('#mountMotion').checked,poseFresh:state.fault!=='pose',tetherClear:state.fault!=='tether'});const ds=state.docking;state.progress=ds.stage==='STANDOFF'?.60:ds.stage==='ALIGN'?.70:ds.stage==='INSERT'?.735:ds.stage==='CONTACT'?.77:state.progress;if(ds.stage==='HOLD'){state.playing=false;log(ds.reason);}if(ds.stage==='CONTACT')log('Synthetic relative contact; begin magnetic capture sequence.');}}
 else{const next=Math.min(1,state.progress+dt/42);faultCheck(next);if(!state.blocked)state.progress=next;if(state.progress>=1)state.playing=false;}render();}if(state.cameraMode!=='orbit')renderVision();requestAnimationFrame(tick);}requestAnimationFrame(tick);
document.addEventListener('visibilitychange',()=>{if(document.hidden){state.usvLiftCycling=false;state.usvLiftTarget=state.usvLift;if(state.playing){state.playing=false;log('Animation paused while tab is hidden.');}render();}});
selectConcept('D');
setSubject('me120');
window.__studio={hardware:()=>lesson.info(),getState:()=>structuredClone(state),getGeometry:()=>viewer?.getGeometry(),calculate,recoveryGate,guidance,magneticState,magneticReleaseGate,pulseEnergy,createDocking,stepDocking,magneticOffGate,postMagnetOffLiftGate};

// Overview loads this module only when the 3D studio is first requested.
export function setStudioActive(active){
 studioActive=Boolean(active);
 if(!studioActive){studioViewRequest++;visionControls.clear();lesson?.close();viewer?.components.close({restore:false,instant:true});state.cameraMode='orbit';state.playing=false;state.usvLiftCycling=false;state.usvLiftTarget=state.usvLift;state.usvThrusters=false;state.thrusters=false;render();}
 viewer?.setActive(studioActive);
}
export async function openStudioView(subject='me120',lessonMode=null){
 const request=++studioViewRequest;
 if(!viewer)throw new Error('3D rendering is unavailable on this device.');
 await viewer.ready;
 if(!studioActive||request!==studioViewRequest)return;
 setSubject(['me120','rov','system'].includes(subject)?subject:'me120');
 if(lessonMode)lesson.open(lessonMode);
}
