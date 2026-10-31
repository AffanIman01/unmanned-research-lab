'use client';
import {bindHoldCommand} from '../../dist/hold-command.mjs';
import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {BoatWake,createWakeVisual} from '@/lib/boat-wake';
import {attachStudioME120} from '@/lib/studio-me120';
import {Button} from '@/components/ui/button';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from '@/components/ui/select';
import {Slider} from '@/components/ui/slider';
import {initialWaves,wavePresets,sampleWave,waveSignal,linearWaveProperties,sampleLinearWater,type WaveSettings,type WaveGenerator,type WavePattern} from '@/lib/pool-waves';
import {freshPoolState} from '@/lib/pool-motion';
import {seaStates,defaultSea,makeSpectrum,sampleAdvectedSea,MarineBody,defaultBody,type SeaSettings,type WaterField} from '@/lib/sea-physics';
import {oceanSurface} from '@/lib/ocean-water';
import {ease,stepRov,stageLabels,type RovStage,type RovPose} from '@/lib/rov-motion';
import {createFreeCamera} from '../../dist/free-camera.mjs';
import VehicleDashboard from '@/components/vehicle-dashboard';
import HeadingCompass from '@/components/heading-compass';
import RC3Controls from '@/components/rc3-controls';
import {rovCameraPose} from '../../dist/rov-camera.mjs';
import {isLevel} from '../../dist/rov-level.mjs';
import {nextLight,changeSpeed,pilotAxes,toggleManualArm,hasPilotThrust} from '@/lib/pilot-controls';
import {attachRovEffects} from '../../dist/rov-effects.mjs';
import {usvCameraPose,type USVView} from '@/lib/usv-camera';
import RovAccessoryPanel from '@/components/rov-accessory-panel';
import {createAccessoryState,setAccessoryEnabled,accessoryAction,stepAccessories} from '../../dist/rov-accessory-data.mjs';
import {attachRovAccessories,createAccessoryTestTarget} from '../../dist/rov-accessories.mjs';
import USVOperationsPanel,{initialUSVOptions,initialUSVSensing,type USVOptions} from '@/components/usv-operations-panel';
import {initialPTZ,updateUSVPTZ,type PTZSettings} from '@/lib/usv-ptz';
import {getUSVObstacles,trainingBuoys,applyUSVAvoidance,resolveBuoyCollision} from '@/lib/usv-avoidance';
import {createBridgeScene} from '@/lib/bridge-scene';
import {BRIDGE_DEPTH,BRIDGE_LAUNCH,BRIDGE_STATION,BRIDGE_ROUTE,inspectionTargets,inspectionGate,resolveBridgeCollision,segmentBlocked,initialBridgeTelemetry,type InspectionRecord} from '@/lib/bridge-inspection';
import BridgeInspectionPanel,{initialBridgeSettings,type BridgeSettings} from '@/components/bridge-inspection-panel';
import {LIFT_MIN,LIFT_MAX,ringTranslation,antennaTranslation,rovY,WATER_Y} from '@/lib/lift-state';
type DriveAxis='throttle'|'steer'|'heave'|'roll'|'strafe'|'pitch';
function HoldControl({axis,value,onInput,disabled,children}:{axis:DriveAxis;value:number;onInput:(axis:DriveAxis,value:number)=>void;disabled:boolean;children:React.ReactNode}){
 return <Button disabled={disabled} onPointerDown={event=>{event.currentTarget.setPointerCapture(event.pointerId);onInput(axis,value);}} onPointerUp={()=>onInput(axis,0)} onPointerCancel={()=>onInput(axis,0)} onLostPointerCapture={()=>onInput(axis,0)}>{children}</Button>;
}
export default function PoolSimulation(){
 const recoveryButton=useRef<HTMLButtonElement>(null);
 const [holdProgress,setHoldProgress]=useState(0),[accessoriesOpen,setAccessoriesOpen]=useState(false);
 const host=useRef<HTMLDivElement>(null),input=useRef({throttle:0,steer:0,heave:0,roll:0,strafe:0,pitch:0,stabilize:false,reset:false,stop:false,top:false,focus:false,capture:false,armToggle:false,disarm:false,overview:false,recenter:false,transit:'' as ''|'station'|'coast',command:'' as ''|'deploy'|'recover'|'resume'});
 const [environment,setEnvironment]=useState<'pool'|'sea'|'bridge'>('sea'),[seaState,setSeaState]=useState(2),[sea,setSea]=useState<SeaSettings>(defaultSea),[mass,setMass]=useState(defaultBody.mass);
 const environmentRef=useRef<'pool'|'sea'|'bridge'>('sea'),seaRef=useRef({...defaultSea}),bodyParams=useRef({...defaultBody});
 const flowRef=useRef({speed:0,direction:90}),[flow,setFlow]=useState({speed:0,direction:90});
 const changeFlow=(patch:Partial<{speed:number;direction:number}>)=>{flowRef.current={...flowRef.current,...patch};setFlow(flowRef.current);input.current.reset=true;};
 const bridgeRef=useRef<BridgeSettings>({...initialBridgeSettings});
 const [bridgeSettings,setBridgeSettings]=useState<BridgeSettings>(initialBridgeSettings);
 const [bridgeTelemetry,setBridgeTelemetry]=useState(initialBridgeTelemetry);
 const [inspectionRecords,setInspectionRecords]=useState<InspectionRecord[]>([]);
 const noteRef=useRef(''),[inspectionNote,setInspectionNote]=useState('');
 const ptzRef=useRef<PTZSettings>({...initialPTZ}),[ptz,setPTZ]=useState(initialPTZ);
 const usvOptionsRef=useRef<USVOptions>({...initialUSVOptions}),[usvOptions,setUSVOptions]=useState(initialUSVOptions);
 const [usvSensing,setUSVSensing]=useState(initialUSVSensing);
 const changeUSVOptions=(patch:Partial<USVOptions>)=>{usvOptionsRef.current={...usvOptionsRef.current,...patch};setUSVOptions(usvOptionsRef.current);};
 const rovViewRef=useRef<'orbit'|'first'|'close'|'third'|'free'>('orbit'),[rovView,setRovView]=useState<'orbit'|'first'|'close'|'third'|'free'>('orbit');
 const [leveling,setLeveling]=useState(false);
 const armedRef=useRef(false),[armed,setArmed]=useState(false);
 const cameraVehicleRef=useRef<'usv'|'rov'>('usv'),[cameraVehicle,setCameraVehicle]=useState<'usv'|'rov'>('usv');
 const usvViewRef=useRef<USVView>('third'),[usvView,setUsvView]=useState<USVView>('third');
 const changePTZ=(patch:Partial<PTZSettings>)=>{ptzRef.current={...ptzRef.current,...patch};setPTZ(ptzRef.current);if(patch.view){cameraVehicleRef.current='usv';setCameraVehicle('usv');usvViewRef.current='orbit';setUsvView('orbit');rovViewRef.current='orbit';setRovView('orbit');bridgeRef.current={...bridgeRef.current,camera:false};setBridgeSettings(bridgeRef.current);}};
 const changeBridge=(patch:Partial<BridgeSettings>)=>{if(patch.camera!==undefined&&(patch.camera||rovViewRef.current==='first')){rovViewRef.current=patch.camera?'first':'orbit';setRovView(rovViewRef.current);}if(patch.current!==undefined&&patch.current!==bridgeRef.current.current)input.current.reset=true;if(patch.camera){cameraVehicleRef.current='rov';setCameraVehicle('rov');usvViewRef.current='orbit';setUsvView('orbit');ptzRef.current={...ptzRef.current,view:false};setPTZ(ptzRef.current);}bridgeRef.current={...bridgeRef.current,...patch};setBridgeSettings(bridgeRef.current);};
 const chooseRovView=(view:'orbit'|'first'|'close'|'third'|'free')=>{cameraVehicleRef.current='rov';setCameraVehicle('rov');usvViewRef.current='orbit';setUsvView('orbit');changePTZ({view:false});changeBridge({camera:view==='first'});rovViewRef.current=view;setRovView(view);};
 const chooseUsvView=(view:USVView)=>{changePTZ({view:false});changeBridge({camera:false});rovViewRef.current='orbit';setRovView('orbit');usvViewRef.current=view;setUsvView(view);cameraVehicleRef.current='usv';setCameraVehicle('usv');};
 const accessoryRef=useRef(createAccessoryState()),[accessories,setAccessories]=useState(createAccessoryState);
 const accessoryContext=useRef({armed:false,depth:0,speed:0,position:{x:0,y:0,z:0}});
 const publishAccessories=()=>setAccessories({...accessoryRef.current,enabled:{...accessoryRef.current.enabled}});
 const toggleAccessory=(id:'grabber'|'laser'|'sampler'|'sonar',enabled:boolean)=>{setAccessoryEnabled(accessoryRef.current,id,enabled);publishAccessories();};
 const operateAccessory=(action:string)=>{accessoryAction(accessoryRef.current,action,{...accessoryContext.current,armed:armedRef.current&&accessoryContext.current.armed});publishAccessories();};
 const lightsRef=useRef(0),speedRef=useRef(25);
 const [lightLevel,setLightLevel]=useState(0),[speedPercent,setSpeedPercent]=useState(25);
 const lightsOn=lightLevel>0;
 const toggleLights=()=>{lightsRef.current=nextLight(lightsRef.current);setLightLevel(lightsRef.current);};
 const setSpeed=(direction:number)=>{speedRef.current=changeSpeed(speedRef.current,direction);setSpeedPercent(speedRef.current);};
 const [physics,setPhysics]=useState({roll:0,pitch:0,heave:0,acceleration:0,warning:''});
 const changeEnvironment=(next:'pool'|'sea'|'bridge')=>{environmentRef.current=next;setEnvironment(next);if(next==='bridge'){seaRef.current={...defaultSea,hs:.1,tp:3.5,direction:80,spread:15};setSea(seaRef.current);setSeaState(2);}changeBridge({camera:false});changePTZ({view:false});input.current.reset=true;};
 const changeSea=(patch:Partial<SeaSettings>)=>{seaRef.current={...seaRef.current,...patch};seaRef.current.tp=Math.max(seaRef.current.tp,Math.ceil(Math.sqrt(seaRef.current.hs*2*Math.PI/(9.81*.06))*10)/10);setSea(seaRef.current);input.current.reset=true;};
 const selectSea=(id:number)=>{const p=seaStates.find(p=>p.id===id)!;setSeaState(id);changeSea({hs:p.hs,tp:p.tp,enabled:true});changeEnvironment('sea');};
 const [waveSettings,setWaveSettings]=useState<WaveSettings>(initialWaves),[preset,setPreset]=useState('regular');
 const waveConfig=useRef<WaveSettings>({...initialWaves});
 const changeWaves=(patch:Partial<WaveSettings>)=>{const next={...waveConfig.current,...patch};if(next.pattern==='linear'&&patch.direction!==undefined&&next.direction!==0)next.generator='segmented';if(next.generator!=='segmented')next.direction=0;waveConfig.current=next;setWaveSettings(next);setPreset('custom');};
 const selectLinear=()=>{const next={...wavePresets.find(p=>p.id==='linear')!.settings};waveConfig.current=next;setWaveSettings(next);setPreset('linear');};
 const linearInfo=linearWaveProperties(waveSettings);
 const [status,setStatus]=useState('Loading integrated vessel…'),[ready,setReady]=useState(false);
 const [deployment,setDeployment]=useState({stage:'docked' as RovStage,paused:false,lift:LIFT_MIN,depth:0,tether:0,roll:0,pitch:0,limit:''});
 const manual=armed&&ready&&!physics.warning.startsWith('Model limit')&&!deployment.paused&&(deployment.stage==='docked'||deployment.stage==='free');
 const [viewTelemetry,setViewTelemetry]=useState({usv:{speed:0,heading:0,level:0,pitch:0,roll:0,vertical:0,x:0,z:0},rov:{speed:0,heading:0,level:0,pitch:0,roll:0,vertical:0,x:0,z:0}});
 const [telemetry,setTelemetry]=useState({speed:0,heading:0,x:0,z:0,hit:false});
 useEffect(()=>{
  if(!host.current)return;const el=host.current;let disposed=false,frame=0,state=freshPoolState(),last=0,report=0,loaded=false,waveTime=0,waveStrength=0;
  let spectrum=makeSpectrum(seaRef.current),seaSignature='';const body=new MarineBody();let transit:false|'station'|'coast'=false,waypoint=0,dwell=0,lastTarget='',bridgeNotice='',tetherWarning='';
  let avoidanceTurn=0;
  let accumulator=0,holdPosition:{x:number;z:number;heading:number}|null=null;
  const scene=new THREE.Scene();
  const poolBackground=new THREE.Color('#102631'),daylightSky=new THREE.Color('#b9dff5');
  // Restore the daylight horizon; retain the newer wave, wake and reflection model.
  const seaHaze=new THREE.Fog('#7da7bb',65,115);
  scene.background=poolBackground;
  let renderer:THREE.WebGLRenderer;try{renderer=new THREE.WebGLRenderer({antialias:true});}catch{const failed=requestAnimationFrame(()=>{setStatus('3D unavailable. Enable WebGL and reload.');if(window.parent!==window)window.parent.postMessage({type:'water-simulation-error'},window.location.origin);});return()=>cancelAnimationFrame(failed);}
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;el.appendChild(renderer.domElement);
  const room=new RoomEnvironment(),pmrem=new THREE.PMREMGenerator(renderer),reflection=pmrem.fromScene(room,.045);scene.environment=reflection.texture;scene.environmentIntensity=.65;room.dispose();pmrem.dispose();
  const bridgeMap=createBridgeScene();bridgeMap.root.visible=false;scene.add(bridgeMap.root);
  const inspectionCamera=new THREE.PerspectiveCamera(70,1,.025,100),rovViewCamera=new THREE.PerspectiveCamera(52,1,.025,250),usvViewCamera=new THREE.PerspectiveCamera(52,1,.025,250);
  const ptzCamera=new THREE.PerspectiveCamera(68,1,.025,250);let mast:THREE.Object3D|undefined;
  const buoyGroups=new Map<string,THREE.Group>();
  const buoyMaterial=new THREE.MeshStandardMaterial({color:0xffb92d,roughness:.4}),buoyBand=new THREE.MeshStandardMaterial({color:0x1b2730,roughness:.6});
  for(const env of ['pool','sea','bridge'] as const){const group=new THREE.Group();group.visible=false;scene.add(group);buoyGroups.set(env,group);for(const b of trainingBuoys(env)){
   const buoy=new THREE.Group();buoy.position.set(b.x,0,b.z);group.add(buoy);
   const float=new THREE.Mesh(new THREE.CylinderGeometry(b.radius*.72,b.radius,.55,20),buoyMaterial);float.position.y=.12;buoy.add(float);
   const band=new THREE.Mesh(new THREE.CylinderGeometry(b.radius*.8,b.radius*.9,.08,20),buoyBand);band.position.y=.1;buoy.add(band);
   const pole=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.8,10),buoyBand);pole.position.y=.65;buoy.add(pole);
   const marker=new THREE.Mesh(new THREE.SphereGeometry(.1,12,8),buoyMaterial);marker.position.y=1.05;buoy.add(marker);
  }}
  const eye=new THREE.Vector3(),look=new THREE.Vector3(),forward=new THREE.Vector3();
  const underwaterBackground=new THREE.Color('#183e44'),underwaterFog=new THREE.Fog('#183e44',.4,8);
  const camera=new THREE.PerspectiveCamera(45,1,.1,250);camera.position.set(6,4.2,7.5);
  const freeCamera=createFreeCamera(renderer.domElement),freeViewCamera=new THREE.PerspectiveCamera(52,1,.025,250);
  const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,0,0);controls.enableDamping=true;controls.maxPolarAngle=Math.PI*.85;controls.minDistance=4;controls.maxDistance=90;
  scene.add(new THREE.HemisphereLight(0xdce7f0,0x10131b,1.65));const sun=new THREE.DirectionalLight(0xf2f6ff,2.5);sun.position.set(8,20,10);scene.add(sun);
  const poolStructure=new THREE.Group();scene.add(poolStructure);
  const box=(w:number,h:number,d:number,x:number,y:number,z:number,color:number)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:.65}));m.position.set(x,y,z);poolStructure.add(m);return m;};
  box(19,.25,29,0,-2.3,0,0x657580);box(15,.15,25,0,-2.075,0,0x8dc6d2);
  for(const x of [-7.65,7.65])box(.3,2.25,25.6,x,-.875,0,0xb9d2d6);
  for(const z of [-12.65,12.65])box(15.6,2.25,.3,0,-.875,z,0xb9d2d6);
  for(const x of [-8.35,8.35])box(1.1,.18,27.8,x,.15,0,0xc9c8bb);
  for(const z of [-13.35,13.35])box(17.8,.18,1.1,0,.15,z,0xc9c8bb);
  const grid=new THREE.GridHelper(25,50,0x4c9eae,0x74b3bf);grid.scale.x=.6;grid.position.y=-1.993;poolStructure.add(grid);
  for(const x of [-5,-2.5,0,2.5,5]){box(.09,.008,22,x,-1.987,0,0x27596b);for(const z of [-11,11])box(.8,.008,.09,x,-1.981,z,0x27596b);}
  // Segmented paddle bank at the far end; passive slatted absorbers on the other edges.
  const paddles:THREE.Group[]=[];
  for(let i=0;i<15;i++){
   const x=-7+i;const pivot=new THREE.Group();pivot.position.set(x,-1.8,-12.15);poolStructure.add(pivot);paddles.push(pivot);
   const paddle=new THREE.Mesh(new THREE.BoxGeometry(.91,2.15,.13),new THREE.MeshStandardMaterial({color:0x607e89,metalness:.65,roughness:.35}));paddle.position.y=1.075;pivot.add(paddle);
   box(.55,.32,.6,x,.43,-12.8,0x354958);box(.08,.08,.65,x,.4,-12.35,0xe4b849);
  }
  for(const x of [-7.18,7.18])for(let i=0;i<25;i++){
   const panel=box(.17,1.8,.82,x,-.8,-11.7+i*.975,0x365660);panel.rotation.z=x<0?-.15:.15;
   box(.12,.08,.82,x,.15,-11.7+i*.975,0xdab74f);
  }
  for(let i=0;i<15;i++){const panel=box(.88,1.9,.18,-7+i,-.8,12.1,0x365660);panel.rotation.x=.18;box(.88,.08,.14,-7+i,.19,12.1,0xdab74f);}
  const water=new THREE.Mesh(new THREE.PlaneGeometry(15,25,60,100),new THREE.MeshPhysicalMaterial({color:0x39bfd8,transparent:true,opacity:.32,roughness:.25,metalness:.12,depthWrite:false,side:THREE.DoubleSide}));water.rotation.x=-Math.PI/2;scene.add(water);
  const wake=new BoatWake(),wakeVisual=createWakeVisual(wake);scene.add(wakeVisual.group);
  const ocean=oceanSurface(spectrum,wake);ocean.mesh.visible=false;scene.add(ocean.mesh);
  const waterVertices=water.geometry.attributes.position as THREE.BufferAttribute;
  const waterCurrent=()=>{if(environmentRef.current==='bridge')return {vx:bridgeRef.current.current,vz:0};if(environmentRef.current==='pool')return {vx:0,vz:0};const angle=flowRef.current.direction*Math.PI/180;return {vx:flowRef.current.speed*Math.sin(angle),vz:flowRef.current.speed*Math.cos(angle)};};
  const baseField:WaterField=(x,y,z)=>{if(environmentRef.current!=='pool')return sampleAdvectedSea(spectrum,x,y,z,waveTime,waveStrength,environmentRef.current==='bridge'?BRIDGE_DEPTH:50,waterCurrent());if(waveConfig.current.pattern==='linear')return sampleLinearWater(x,y,z,waveTime,waveConfig.current,waveStrength);const height=sampleWave(x,z,waveTime,waveConfig.current,waveStrength);const vy=(sampleWave(x,z,waveTime+.01,waveConfig.current,waveStrength)-sampleWave(x,z,waveTime-.01,waveConfig.current,waveStrength))/.02;return {height,vx:0,vy,vz:0};};
  // Exclude the boat's own wake from USV force feedback. ROV and markers receive
  // the combined incident field and emitted gravity-wave packets.
  const field:WaterField=(x,y,z)=>{const base=baseField(x,y,z),local=wake.sample(x,y,z,waveTime);return {height:base.height+local.height,vx:base.vx+local.vx,vy:base.vy+local.vy,vz:base.vz+local.vz};};
  const waveHeight=(x:number,z:number)=>field(x,0,z).height;
  const vessel=new THREE.Group();vessel.position.y=-WATER_Y;scene.add(vessel);
  const loader=new GLTFLoader();const assets:[string,number[],number][]=[['me120-reference.glb?revision=studio-aq',[0,0,0],1],['chasing-m2-pro-max-reference.glb?revision=1',[0,rovY(LIFT_MIN),.04],1],['chasing-e-reel-reference.glb?revision=2',[0,.835,-.615],.8],['starlink-mini-concept.glb',[.54,1.03,-.80],1],['compute-enclosure-concept.glb',[.54,.46,.54],1]];
  const disposeTree=(o:THREE.Object3D)=>o.traverse(n=>{const m=n as THREE.Mesh;if(m.geometry)m.geometry.dispose();if(m.material)(Array.isArray(m.material)?m.material:[m.material]).forEach(t=>{const texture=(t as THREE.MeshStandardMaterial).map;texture?.dispose();t.dispose();});});
  let rov:THREE.Object3D|undefined;
  let rovEffects:ReturnType<typeof attachRovEffects>|undefined;
  let accessoryRig:ReturnType<typeof attachRovAccessories>|undefined;
  const accessoryTarget=createAccessoryTestTarget(scene);accessoryTarget.root.visible=false;
  const rollOffset=new THREE.Vector3();
  const liftNodes:{node:THREE.Object3D;base:number;mast:boolean}[]=[];
  let stabilizing=false;
  let stage:RovStage='docked',paused=false,lift=LIFT_MIN,elapsed=0,duration=1,follow=false;
  let rovState:RovPose={x:0,y:-1,z:0,heading:0,speed:0,vertical:0,yaw:0,roll:0,rollRate:0,pitch:0,pitchRate:0},limit='';
  const startPosition=new THREE.Vector3(),startRotation=new THREE.Quaternion();
  const previousHudRov=new THREE.Vector3(),hudRovVelocity=new THREE.Vector3();let hudRovInitialized=false;
  const worldRov=new THREE.Vector3(),dockPosition=new THREE.Vector3(),dockRotation=new THREE.Quaternion();
  const neutralRotation=new THREE.Quaternion();
  const setStage=(next:RovStage,seconds=1)=>{setArm(false);if(next==='free'){chooseRovView('third');accessoryTarget.root.position.set(rovState.x+2.5*Math.sin(rovState.heading),rovState.y+.1,rovState.z+2.5*Math.cos(rovState.heading));accessoryTarget.root.rotation.y=rovState.heading+Math.PI;accessoryTarget.root.updateMatrixWorld(true);}if(next==='docked')chooseUsvView('third');stabilizing=false;stage=next;elapsed=0;duration=seconds;limit='';if(rov){rov.getWorldPosition(startPosition);rov.getWorldQuaternion(startRotation);}keys.clear();input.current.throttle=0;input.current.steer=0;input.current.heave=0;input.current.roll=0;input.current.strafe=0;input.current.pitch=0;};
  Promise.all(assets.map(async([url,pos,scale],i)=>{const g=(await loader.loadAsync('./models/'+url)).scene;if(disposed){disposeTree(g);return;}g.position.set(pos[0],pos[1],pos[2]);g.scale.setScalar(scale);if(i===0){mast=attachStudioME120(g).mast;for(const name of ['payload_lifter_moving','payload_mounting_ring','antenna']){const node=g.getObjectByName(name);if(node)liftNodes.push({node,base:node.position.y,mast:name==='antenna'});}}if(i===1){rov=g;rovEffects=attachRovEffects(g);accessoryRig=attachRovAccessories(g);}vessel.add(g);})).then(()=>{if(!disposed){loaded=true;setReady(true);setStatus('Ready · Space to arm');if(window.parent!==window)window.parent.postMessage({type:'water-simulation-ready'},window.location.origin);}}).catch(()=>{if(!disposed){setStatus('A model could not load. Reload to retry.');if(window.parent!==window)window.parent.postMessage({type:'water-simulation-error'},window.location.origin);}});
  // Orange tether is drawn in world space so its ends remain attached during release/recovery.
  const tetherGeometry=new THREE.BufferGeometry();const tetherPoints=new Float32Array(65*3);tetherGeometry.setAttribute('position',new THREE.BufferAttribute(tetherPoints,3));
  const tether=new THREE.Line(tetherGeometry,new THREE.LineBasicMaterial({color:0xffa34c}));tether.frustumCulled=false;scene.add(tether);
  const fairlead=new THREE.Vector3(),exit=new THREE.Vector3(),plug=new THREE.Vector3();
  const post=new THREE.Mesh(new THREE.CylinderGeometry(.016,.016,.51,12),new THREE.MeshStandardMaterial({color:0x8e9b9b,metalness:.7,roughness:.4}));post.position.set(.54,.69,-.80);vessel.add(post);
  // Proposed lock preview: two jaws at the mounting ring, not a production mechanism.
  const lock=new THREE.Group();vessel.add(lock);
  const jaws=[-1,1].map(sign=>{const jaw=new THREE.Mesh(new THREE.BoxGeometry(.025,.05,.09),new THREE.MeshStandardMaterial({color:0xe4b849,metalness:.6,roughness:.35}));jaw.position.x=sign*.07;lock.add(jaw);return jaw;});
  const resize=new ResizeObserver(()=>{const w=el.clientWidth,h=el.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();freeViewCamera.aspect=w/h;freeViewCamera.updateProjectionMatrix();usvViewCamera.aspect=w/h;usvViewCamera.updateProjectionMatrix();rovViewCamera.aspect=w/h;rovViewCamera.updateProjectionMatrix();inspectionCamera.aspect=w/h;inspectionCamera.updateProjectionMatrix();ptzCamera.aspect=w/h;ptzCamera.updateProjectionMatrix();});resize.observe(el);
  const keys=new Set<string>();
  const release=()=>{stabilizing=false;input.current.stabilize=false;keys.clear();input.current.throttle=0;input.current.steer=0;input.current.heave=0;input.current.roll=0;input.current.strafe=0;input.current.pitch=0;};
  const setArm=(value:boolean)=>{armedRef.current=value;setArmed(value);release();if(!value){accessoryContext.current.armed=false;stepAccessories(accessoryRef.current,0,accessoryContext.current);publishAccessories();}};
  const clear=()=>{recoveryHold?.cancel();input.current.command='';input.current.armToggle=false;setArm(false);input.current.stop=true;};
  const armAllowed=()=>document.hasFocus()&&!document.hidden&&loaded&&!body.failed&&!paused&&(stage==='docked'||stage==='free');
  const toggleArm=()=>setArm(toggleManualArm(armedRef.current,false,armAllowed()));
  const recoveryHold=bindHoldCommand({button:recoveryButton.current,onProgress:setHoldProgress,getCommand:()=>{if(document.hidden||!document.hasFocus()||!loaded||body.failed||paused||input.current.reset||input.current.stop)return null;if(stage==='free')return 'recover';if(stage==='docked'&&(environmentRef.current!=='bridge'||(!transit&&Math.hypot(body.position.x-BRIDGE_STATION.x,body.position.z-BRIDGE_STATION.z)<2&&body.velocity.length()<.2)))return 'deploy';return null;},onFire:(command:'deploy'|'recover')=>{input.current.command=command;}});
  const captureKeys=(e:KeyboardEvent)=>{if((e.target as HTMLElement)?.closest('input,textarea,select,[contenteditable="true"],[role="slider"],[role="combobox"],[role="option"]')||e.altKey||e.ctrlKey||e.metaKey)return;if(e.code==='Space'||e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();if(e.type==='keydown'&&!e.repeat){if(e.code==='Space')toggleArm();else clear();}}};

  const key=(e:KeyboardEvent,down:boolean)=>{if(!down)keys.delete(e.key.toLowerCase());if((e.target as HTMLElement)?.closest('input,textarea,select,[contenteditable="true"],[role="slider"],[role="combobox"],[role="option"]'))return;const k=e.key.toLowerCase();if(!['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','q','e','r','c','f','t','v','b','z','x','k','j','p','0','1','2','3','4','[',']',' ','escape'].includes(k))return;if(e.altKey||e.ctrlKey||e.metaKey)return;e.preventDefault();if(['1','2','3','4'].includes(k)){if(down&&!e.repeat&&loaded){const view=(['first','close','third','free'] as const)[Number(k)-1];if(cameraVehicleRef.current==='usv')chooseUsvView(view);else chooseRovView(view);}return;}if(k==='0'){if(down&&!e.repeat&&loaded&&armedRef.current&&stage==='free'&&!paused)input.current.stabilize=true;return;}if(k==='p'){if(down&&!e.repeat&&loaded)changePTZ({view:!ptzRef.current.view});return;}if(k==='b'){if(down&&!e.repeat&&loaded)changeBridge({camera:!bridgeRef.current.camera});return;}if(k==='k'){if(down&&!e.repeat)setAccessoriesOpen(open=>!open);return;}if(k==='j'&&environmentRef.current==='bridge'){if(down&&!e.repeat&&loaded)input.current.capture=true;return;}if(k==='['||k===']'){if(down&&!e.repeat&&loaded)setSpeed(k==='['?-1:1);return;}if(k==='f'){if(down&&!e.repeat&&loaded)toggleLights();return;}if(k===' '||k==='escape')return;if(down&&armedRef.current)keys.add(k);else keys.delete(k);};
  const kd=(e:KeyboardEvent)=>key(e,true),ku=(e:KeyboardEvent)=>key(e,false),hidden=()=>{if(document.hidden)clear();};window.addEventListener('keydown',captureKeys,true);window.addEventListener('keyup',captureKeys,true);window.addEventListener('keydown',kd);window.addEventListener('keyup',ku);window.addEventListener('blur',clear);document.addEventListener('visibilitychange',hidden);
  const tick=(now:number)=>{const dt=last?Math.min((now-last)/1000,.05):0;last=now;const c=input.current;
   if(armedRef.current&&(body.failed||paused))setArm(false);if(c.armToggle){c.armToggle=false;toggleArm();}if(c.disarm){c.disarm=false;setArm(false);}
   if(c.reset){hudRovInitialized=false;const enabled={...accessoryRef.current.enabled};accessoryRef.current={...createAccessoryState(),enabled};publishAccessories();chooseRovView('orbit');stabilizing=false;wake.reset();avoidanceTurn=0;changePTZ({...initialPTZ});lightsRef.current=0;setLightLevel(0);speedRef.current=25;setSpeedPercent(25);body.reset();transit=false;waypoint=0;dwell=0;bridgeNotice='';tetherWarning='';if(environmentRef.current==='bridge'){body.position.set(BRIDGE_LAUNCH.x,0,BRIDGE_LAUNCH.z);body.rotation.setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI/2);camera.position.set(-16,24,-30);controls.target.set(7,0,7);}accumulator=0;holdPosition=null;state=freshPoolState();waveTime=0;waveStrength=0;clear();c.stop=false;c.command='';c.transit='';c.capture=false;paused=false;follow=false;lift=LIFT_MIN;setStage('docked');if(rov){vessel.add(rov);rov.position.set(0,rovY(lift),.04);rov.quaternion.identity();}c.reset=false;}
   if(c.stop){setArm(false);stabilizing=false;c.stabilize=false;transit=false;keys.clear();c.throttle=0;c.steer=0;c.heave=0;c.roll=0;c.strafe=0;c.pitch=0;state.speed=0;state.yaw=0;rovState.speed=0;rovState.vx=0;rovState.vz=0;rovState.vertical=0;rovState.yaw=0;rovState.rollRate=0;rovState.pitchRate=0;if(stage!=='docked')paused=true;c.stop=false;}
   if(c.command){const command=c.command;c.command='';if(command==='resume')paused=false;if(loaded&&!body.failed&&!paused&&command==='deploy'&&stage==='docked'&&(environmentRef.current!=='bridge'||(!transit&&Math.hypot(body.position.x-BRIDGE_STATION.x,body.position.z-BRIDGE_STATION.z)<2&&body.velocity.length()<.2))){paused=false;holdPosition={x:state.x,z:state.z,heading:state.heading};setStage('stopping',1.2);}if(loaded&&!body.failed&&!paused&&command==='recover'&&stage==='free'){if(environmentRef.current==='bridge'&&segmentBlocked({x:rovState.x,y:-3,z:rovState.z},{x:body.position.x,y:-3,z:body.position.z},.4)){bridgeNotice='Recovery corridor blocked · return to the exposed pier face first.';}else{paused=false;setStage('clearance',2.5);}}}
   if(c.overview){chooseUsvView('orbit');follow=false;camera.position.set(-16,24,-30);controls.target.set(7,0,7);c.overview=false;}
   if(c.transit&&stage==='docked'&&!paused){transit=transit?false:c.transit;waypoint=0;holdPosition=null;bridgeNotice='';c.transit='';}
   if(c.top){if(cameraVehicleRef.current==='usv')chooseUsvView('orbit');else chooseRovView('orbit');follow=false;camera.position.set(environmentRef.current==='bridge'?7:0,environmentRef.current==='bridge'?50:30,.01);controls.target.set(environmentRef.current==='bridge'?7:0,0,0);c.top=false;}
   if(c.focus&&rov){chooseRovView('third');follow=false;c.focus=false;}
   if(c.stabilize){c.stabilize=false;if(armedRef.current&&stage==='free'&&!paused&&!body.failed){for(const key of ['q','e','t','v','z','x'])keys.delete(key);c.roll=0;c.pitch=0;c.steer=0;rovState.yaw=0;stabilizing=true;}}
   const axes=pilotAxes(keys,stage==='free',armedRef.current&&armAllowed());
   const manualGain=armedRef.current&&armAllowed()?1:0;
   let throttle=c.throttle*manualGain+axes.throttle;
   let steer=c.steer*manualGain+axes.steer;
   const heave=c.heave*manualGain+axes.heave,roll=c.roll*manualGain+axes.roll,strafe=c.strafe*manualGain+axes.strafe,pitch=c.pitch*manualGain+axes.pitch;
   if(roll||pitch||steer)stabilizing=false;
   rovEffects?.update({lightLevel:lightsRef.current,thrusters:stage==='free'&&!paused&&hasPilotThrust(armedRef.current,{throttle,steer,heave,roll,strafe,pitch},stabilizing)});rovEffects?.tick(dt);
   const drive=loaded&&stage==='docked'&&!paused;
   const isBridge=environmentRef.current==='bridge',isSea=environmentRef.current!=='pool';
   if(isBridge&&stage==='docked'&&(throttle||steer)){transit=false;holdPosition=null;}
   if(isBridge&&transit&&stage==='docked'&&!paused){
    const route=transit==='station'?BRIDGE_ROUTE:[...BRIDGE_ROUTE.slice(0,-1).reverse(),BRIDGE_LAUNCH];
    const point=route[waypoint],dx=point.x-body.position.x,dz=point.z-body.position.z,distance=Math.hypot(dx,dz);
    const yaw=new THREE.Euler().setFromQuaternion(body.rotation,'YXZ').y;
    const error=Math.atan2(Math.sin(Math.atan2(dx,dz)-yaw),Math.cos(Math.atan2(dx,dz)-yaw));
    steer=THREE.MathUtils.clamp(error*2.6-body.omega.y*2,-1,1);
    throttle=Math.abs(error)<.6?Math.min(.85,distance*.5):0;
    if(distance<(waypoint===route.length-1?.65:1.2)){if(waypoint<route.length-1)waypoint++;else{holdPosition={x:point.x,z:point.z,heading:transit==='station'?0:Math.PI/2};bridgeNotice=transit==='station'?'Station acquired · wait for the USV to settle, then deploy.':'Coastal launch reached.';transit=false;throttle=0;steer=0;}}
   }
   const obstacles=getUSVObstacles(environmentRef.current,usvOptionsRef.current.buoys);
   const avoidance=applyUSVAvoidance({position:body.position,velocity:body.velocity,heading:state.heading,yawRate:body.omega.y,throttle,steer,obstacles,mode:usvOptionsRef.current.mode,canAssist:stage==='docked',preferredTurn:avoidanceTurn});
   avoidanceTurn=avoidance.turn;if(drive){throttle=avoidance.throttle;steer=avoidance.steer;}
   for(const [env,group] of buoyGroups)group.visible=env===environmentRef.current&&usvOptionsRef.current.buoys;
   const signature=JSON.stringify([seaRef.current,isBridge]);if(signature!==seaSignature){seaSignature=signature;spectrum=makeSpectrum(seaRef.current,isBridge?BRIDGE_DEPTH:50);ocean.update(waveTime,waveStrength,spectrum);}
   bridgeMap.root.visible=isBridge;bridgeMap.setTarget(bridgeRef.current.target);
   poolStructure.visible=!isSea;water.visible=!isSea;ocean.mesh.visible=isSea;
   scene.background=isSea?daylightSky:poolBackground;scene.fog=isSea?seaHaze:null;
   const wc=waveConfig.current;
   const running=!paused&&!body.failed,current=waterCurrent();
   bridgeMap.updateTraffic(isBridge&&running?dt:0,usvOptionsRef.current.traffic);
   if(running){
    accumulator+=dt;
    while(accumulator>=1/120){
     waveTime+=1/120;waveStrength+=(((isSea?seaRef.current.enabled:wc.enabled)?1:0)-waveStrength)/360;
     body.step(1/120,baseField,drive?throttle:0,drive?steer:0,bodyParams.current,!isSea,stage==='docked'&&!isBridge?null:holdPosition,rov?rov.parent===vessel:true);
     resolveBuoyCollision(body.position,body.velocity,obstacles);
     if(isBridge){const hit=resolveBridgeCollision(body.position,1.35);if(hit){body.velocity.x=0;body.velocity.z=0;bridgeNotice=hit;transit=false;}}
     if(loaded)wake.update(1/120,waveTime,{x:body.position.x,z:body.position.z,heading:new THREE.Euler().setFromQuaternion(body.rotation,'YXZ').y,vx:body.velocity.x,vz:body.velocity.z},{x:current.vx,z:current.vz});
     accumulator-=1/120;
    }
   }
   const angles=new THREE.Euler().setFromQuaternion(body.rotation,'YXZ');
   state={x:body.position.x,z:body.position.z,heading:angles.y,speed:body.velocity.x*Math.sin(angles.y)+body.velocity.z*Math.cos(angles.y),yaw:body.omega.y};
   const next={hit:body.boundary};
   ocean.update(waveTime,waveStrength,undefined,current,body.position);
   wakeVisual.update(waveTime,baseField,isSea?undefined:{x:7.5,z:12.5});
   for(const group of buoyGroups.values())if(group.visible)for(const buoy of group.children)buoy.position.y=waveHeight(buoy.position.x,buoy.position.z);
   for(const paddle of paddles){
    const signal=waveSignal(wc.generator==='segmented'?paddle.position.x:0,-12.1,waveTime,wc);
    const stroke=waveStrength*wc.height*.7*signal;
    paddle.rotation.x=wc.generator==='piston'?0:stroke;
    paddle.position.z=-12.15+(wc.generator==='piston'?stroke:0);
   }
   if(!isSea){for(let i=0;i<waterVertices.count;i++){const x=waterVertices.getX(i),z=-waterVertices.getY(i);waterVertices.setZ(i,waveHeight(x,z));}waterVertices.needsUpdate=true;water.geometry.computeVertexNormals();}
   vessel.position.copy(body.position).add(new THREE.Vector3(0,-WATER_Y,0).applyQuaternion(body.rotation));vessel.quaternion.copy(body.rotation);
   if(rov&&loaded){
    // All moving parts share the calibrated lift offset. The E-Reel stays on deck.
    if(!paused&&!body.failed)elapsed+=dt;
    const t=ease(elapsed/duration);
    if(stage==='lowering')lift=THREE.MathUtils.lerp(LIFT_MIN,LIFT_MAX,t);
    if(stage==='raising')lift=THREE.MathUtils.lerp(LIFT_MAX,LIFT_MIN,t);
    for(const item of liftNodes)item.node.position.y=item.base+(item.mast?antennaTranslation(lift):ringTranslation(lift));
    lock.position.set(0,rovY(lift)+.28,.04);
    const open=stage==='unlocking'?t:stage==='locking'?1-t:['descending','free','clearance','returning','docking'].includes(stage)?1:0;
    jaws.forEach((jaw,i)=>jaw.position.x=(i===0?-1:1)*(.07+open*.07));
    if(rov.parent===vessel){rov.position.set(0,rovY(lift),.04);rov.quaternion.identity();}
    vessel.updateMatrixWorld(true);
    dockPosition.set(0,rovY(lift),.04);vessel.localToWorld(dockPosition);vessel.getWorldQuaternion(dockRotation);
    fairlead.set(0,.96,-.48);vessel.localToWorld(fairlead);
    exit.set(.19,0,-.3);vessel.localToWorld(exit);
    if(!paused&&!body.failed){
     if(stage==='descending'||stage==='clearance'||stage==='returning'||stage==='docking'){
      const target=stage==='clearance'?new THREE.Vector3(startPosition.x,isSea?-3:-1,startPosition.z):stage==='docking'?dockPosition:new THREE.Vector3(dockPosition.x,isSea?-3:-1,dockPosition.z);
      rov.position.lerpVectors(startPosition,target,t);
      neutralRotation.setFromAxisAngle(new THREE.Vector3(0,1,0),state.heading);
      rov.quaternion.slerpQuaternions(startRotation,stage==='docking'?dockRotation:neutralRotation,t);
     }
     if(stage==='free'){
      const previousRov={...rovState};
      const localWater={...field(rovState.x,rovState.y,rovState.z),dVyDx:(field(rovState.x+.15,rovState.y,rovState.z).vy-field(rovState.x-.15,rovState.y,rovState.z).vy)/.3,dVyDz:(field(rovState.x,rovState.y,rovState.z+.15).vy-field(rovState.x,rovState.y,rovState.z-.15).vy)/.3};
      const result=stepRov(rovState,throttle,steer,heave,dt,exit,{sea:isSea,water:localWater,maxDepth:isBridge?5.7:undefined},roll,strafe,pitch,speedRef.current/100,stabilizing);rovState=result.state;limit=result.hit;if(stabilizing&&isLevel(rovState.roll,rovState.pitch??0,rovState.rollRate,rovState.pitchRate)){rovState.roll=0;rovState.pitch=0;rovState.rollRate=0;rovState.pitchRate=0;stabilizing=false;}
      tetherWarning='';
      resolveBuoyCollision(body.position,body.velocity,obstacles);
     if(isBridge){const hit=resolveBridgeCollision(rovState,.4);if(hit){limit=hit;rovState.vx=0;rovState.vz=0;rovState.speed=0;}if(segmentBlocked(exit,{x:rovState.x,y:rovState.y+.18,z:rovState.z},.12)){rovState={...previousRov,speed:0,vx:0,vz:0,vertical:0};tetherWarning='Tether corridor blocked · retreat; recover before changing pier faces.';limit=tetherWarning;}}
      rov.rotation.set(rovState.pitch??0,rovState.heading,rovState.roll,'YXZ');
      // Rotate around the middle of the 0.196 m body, retaining the depth reference.
      rov.position.set(rovState.x,rovState.y+.098,rovState.z).add(rollOffset.set(0,-.098,0).applyQuaternion(rov.quaternion));
     }
     if(elapsed>=duration){
      if(stage==='stopping'){state.speed=0;state.yaw=0;setStage('lowering',4);}
      else if(stage==='lowering')setStage('unlocking',1.2);
      else if(stage==='unlocking'){scene.attach(rov);setStage('descending',3.5);}
      else if(stage==='descending'){rovState={x:rov.position.x,y:rov.position.y,z:rov.position.z,heading:state.heading,speed:0,vertical:0,yaw:0,roll:0,rollRate:0,pitch:0,pitchRate:0};setStage('free');}
      else if(stage==='clearance')setStage('returning',Math.max(3,rov.position.distanceTo(new THREE.Vector3(dockPosition.x,isSea?-3:-1,dockPosition.z))/.45));
      else if(stage==='returning')setStage('docking',4);
      else if(stage==='docking'){vessel.attach(rov);rov.position.set(0,rovY(lift),.04);rov.quaternion.identity();setStage('locking',1.2);}
      else if(stage==='locking')setStage('raising',4);
      else if(stage==='raising'){holdPosition=isBridge?{x:body.position.x,z:body.position.z,heading:state.heading}:null;setStage('docked');}
     }
    }
    rov.updateMatrixWorld(true);rov.getWorldPosition(worldRov);
    plug.set(.068,.18,-.339);rov.localToWorld(plug);
    // Deck fairlead -> clear side of the well -> ROV. Modest slack stays above the floor.
    const slack=exit.clone().lerp(plug,.5);slack.y=Math.max(isBridge?-5.8:isSea?-48:-1.8,slack.y-.15);
    const curve=new THREE.CatmullRomCurve3([fairlead,exit,slack,plug]);
    for(let i=0;i<=64;i++){const pt=curve.getPoint(i/64);tetherPoints[i*3]=pt.x;tetherPoints[i*3+1]=pt.y;tetherPoints[i*3+2]=pt.z;}
    tetherGeometry.attributes.position.needsUpdate=true;
    if(follow){const delta=worldRov.clone().sub(controls.target);camera.position.add(delta);controls.target.copy(worldRov);}
   }
   if(hudRovInitialized&&dt>0)hudRovVelocity.copy(worldRov).sub(previousHudRov).divideScalar(dt);else hudRovVelocity.set(0,0,0);previousHudRov.copy(worldRov);hudRovInitialized=!!rov;
   accessoryContext.current={armed:armedRef.current&&stage==='free'&&!paused&&!body.failed,depth:Math.max(0,-worldRov.y),speed:Math.hypot(rovState.vx??0,rovState.vz??0,rovState.vertical),position:{x:worldRov.x,y:worldRov.y,z:worldRov.z}};
   stepAccessories(accessoryRef.current,paused?0:dt,accessoryContext.current);
   accessoryTarget.root.visible=stage==='free'&&accessoryRef.current.enabled.laser;
   accessoryRig?.update(accessoryRef.current,{dt:paused?0:dt,targets:accessoryTarget.targets});
   let gate=initialBridgeTelemetry.gate;
   const ptzView=ptzRef.current.view&&!!mast;
   const ptzPose=mast?updateUSVPTZ(ptzCamera,mast,ptzRef.current):{height:0,fov:68};
   const bridgeView=bridgeRef.current.camera&&!!rov&&!ptzView;
   if(rov){
    eye.set(0,.104,.325);rov.localToWorld(eye);
    const tilt=THREE.MathUtils.degToRad(bridgeRef.current.tilt),rotation=rov.getWorldQuaternion(new THREE.Quaternion());
    forward.set(0,Math.sin(tilt),Math.cos(tilt)).applyQuaternion(rotation).normalize();
    inspectionCamera.position.copy(eye);inspectionCamera.up.set(0,1,0).applyQuaternion(rotation);inspectionCamera.lookAt(look.copy(eye).add(forward));
   }
   const freeView=loaded&&!ptzView&&(cameraVehicleRef.current==='usv'?usvViewRef.current:rovViewRef.current)==='free';
   const freeAnchor=cameraVehicleRef.current==='rov'&&rov?rovCameraPose('third',rov.localToWorld(new THREE.Vector3(0,.098,0)).toArray(),rov.getWorldQuaternion(new THREE.Quaternion())):usvCameraPose('third',vessel.position.toArray(),vessel.quaternion);
   if(c.recenter){freeCamera.recenter();c.recenter=false;}
   const freeRig=freeCamera.update(freeView?cameraVehicleRef.current:null,freeAnchor);
   if(freeView){freeViewCamera.position.fromArray(freeRig.eye);freeViewCamera.up.fromArray(freeRig.up);freeViewCamera.lookAt(new THREE.Vector3(...freeRig.target));if(freeViewCamera.fov!==freeRig.fov){freeViewCamera.fov=freeRig.fov;freeViewCamera.updateProjectionMatrix();}}
   const usvFollow=loaded&&!ptzView&&!freeView&&usvViewRef.current!=='orbit';
   if(usvFollow){if(usvViewRef.current==='first'&&mast)updateUSVPTZ(usvViewCamera,mast,{...initialPTZ});else {const rig=usvCameraPose(usvViewRef.current==='close'?'close':'third',vessel.position.toArray(),vessel.quaternion);usvViewCamera.position.fromArray(rig.eye);usvViewCamera.up.fromArray(rig.up);usvViewCamera.lookAt(new THREE.Vector3(...rig.target));if(usvViewCamera.fov!==rig.fov){usvViewCamera.fov=rig.fov;usvViewCamera.updateProjectionMatrix();}}}
   const followView=!!rov&&!ptzView&&!usvFollow&&!freeView&&['close','third'].includes(rovViewRef.current);
   if(rov&&followView){const center=rov.localToWorld(new THREE.Vector3(0,.098,0));const rig=rovCameraPose(rovViewRef.current,center.toArray(),rov.getWorldQuaternion(new THREE.Quaternion()));rovViewCamera.position.fromArray(rig.eye);rovViewCamera.up.fromArray(rig.up);rovViewCamera.lookAt(new THREE.Vector3(...rig.target));if(rovViewCamera.fov!==rig.fov){rovViewCamera.fov=rig.fov;rovViewCamera.updateProjectionMatrix();}}
   if(isBridge&&rov){
    const target=inspectionTargets.find(t=>t.id===bridgeRef.current.target)!;
    // Stop the visibility ray just short of the face, avoiding the target surface itself.
    const rayEnd=new THREE.Vector3(...target.position).addScaledVector(new THREE.Vector3(...target.normal),.1);
    gate=inspectionGate(target,eye,forward,Math.max(Math.hypot(rovState.vx??0,rovState.vz??0,rovState.vertical),Math.abs(rovState.rollRate)*.3,Math.abs(rovState.yaw)*.3,Math.abs(rovState.pitchRate??0)*.3),lightsRef.current>0,bridgeRef.current.visibility,stage==='free',!!tetherWarning||segmentBlocked(eye,rayEnd,0));
    if(!bridgeView)gate={...gate,ready:false,reason:'Switch to ROV camera · B'};
    if(lastTarget!==target.id){dwell=0;lastTarget=target.id;}
    dwell=gate.ready&&!paused?Math.min(1.2,dwell+dt):0;
   }
   if(now-report>100){setLeveling(stabilizing);publishAccessories();
    setUSVSensing({contacts:avoidance.contacts,message:avoidance.message,active:avoidance.active,height:ptzPose.height,fov:ptzPose.fov,heading:((state.heading*180/Math.PI)%360+360)%360});
    const rovRotation=rov?.getWorldQuaternion(new THREE.Quaternion())??neutralRotation,rovAngles=new THREE.Euler().setFromQuaternion(rovRotation,'YXZ');
    setViewTelemetry({usv:{speed:Math.hypot(body.velocity.x,body.velocity.y,body.velocity.z),heading:state.heading*180/Math.PI,level:body.position.y,pitch:angles.x*180/Math.PI,roll:angles.z*180/Math.PI,vertical:body.velocity.y,x:body.position.x,z:body.position.z},rov:{speed:hudRovVelocity.length(),heading:rovAngles.y*180/Math.PI,level:Math.max(0,-worldRov.y),pitch:-rovAngles.x*180/Math.PI,roll:rovAngles.z*180/Math.PI,vertical:hudRovVelocity.y,x:worldRov.x,z:worldRov.z}});
    setPhysics({roll:angles.z*180/Math.PI,pitch:angles.x*180/Math.PI,heave:body.position.y,acceleration:body.heaveAcceleration,warning:body.warning});
    const isRov=stage==='free';setTelemetry({speed:isRov?Math.hypot(rovState.vx??0,rovState.vz??0):state.speed,heading:(((isRov?rovState.heading:state.heading)*180/Math.PI)%360+360)%360,x:isRov?rovState.x:state.x,z:isRov?rovState.z:state.z,hit:stage==='docked'&&next.hit});
    setDeployment({stage,paused,lift,depth:Math.max(0,-worldRov.y),tether:exit.distanceTo(worldRov),roll:new THREE.Euler().setFromQuaternion(rov?.quaternion??neutralRotation,'YXZ').z*180/Math.PI,pitch:-new THREE.Euler().setFromQuaternion(rov?.quaternion??neutralRotation,'YXZ').x*180/Math.PI,limit});
    if(isBridge)setBridgeTelemetry({usvX:body.position.x,usvZ:body.position.z,rovX:worldRov.x,rovZ:worldRov.z,stationDistance:Math.hypot(body.position.x-BRIDGE_STATION.x,body.position.z-BRIDGE_STATION.z),transit:!!transit,gate,dwell,tetherWarning,notice:bridgeNotice});report=now;
   }
   controls.enabled=!bridgeView&&!ptzView&&!followView&&!usvFollow&&!freeView;
   if(bridgeView){scene.background=underwaterBackground;underwaterFog.far=bridgeRef.current.visibility;scene.fog=underwaterFog;}else if(!ptzView&&!followView&&!usvFollow&&!freeView)controls.update();
   renderer.render(scene,freeView?freeViewCamera:ptzView?ptzCamera:bridgeView?inspectionCamera:followView?rovViewCamera:usvFollow?usvViewCamera:camera);
   if(c.capture){c.capture=false;if(isBridge&&bridgeView&&dwell>=1.2&&gate.ready&&!paused){
    const target=inspectionTargets.find(t=>t.id===bridgeRef.current.target)!;
    bridgeMap.setTarget('');renderer.render(scene,inspectionCamera);const image=renderer.domElement.toDataURL('image/png');bridgeMap.setTarget(target.id);
    const record:InspectionRecord={id:target.id,target:target.name,kind:target.kind,time:new Date().toISOString(),depth:-eye.y,distance:gate.distance,heading:rovState.heading*180/Math.PI,roll:rovState.roll*180/Math.PI,cameraTilt:bridgeRef.current.tilt,visibility:bridgeRef.current.visibility,current:bridgeRef.current.current,image,note:noteRef.current.trim()||(target.kind==='growth'?'Surface obscured; underlying concrete not assessed.':'Simulated visual indication recorded; dimensions and structural significance unmeasured.')};
    setInspectionRecords(records=>[...records,record]);bridgeNotice=target.id+' observation recorded.';
   }}frame=requestAnimationFrame(tick);};frame=requestAnimationFrame(tick);
  return()=>{disposed=true;recoveryHold.dispose();cancelAnimationFrame(frame);clear();resize.disconnect();window.removeEventListener('keydown',captureKeys,true);window.removeEventListener('keyup',captureKeys,true);window.removeEventListener('keydown',kd);window.removeEventListener('keyup',ku);window.removeEventListener('blur',clear);document.removeEventListener('visibilitychange',hidden);controls.dispose();freeCamera.dispose();wakeVisual.dispose();wakeVisual.group.removeFromParent();bridgeMap.dispose();accessoryRig?.dispose();accessoryTarget.dispose();disposeTree(scene);reflection.dispose();renderer.dispose();renderer.domElement.remove();};
 },[]);
 const setDrive=(axis:DriveAxis,value:number)=>{input.current[axis]=armedRef.current?value:0;};
 const closeView=(cameraVehicle==='usv'?usvView:rovView)==='close',freeView=(cameraVehicle==='usv'?usvView:rovView)==='free';
 const viewManual=cameraVehicle==='usv'?deployment.stage==='docked':deployment.stage==='free';
 const dashboardData={...viewTelemetry[cameraVehicle],vehicle:cameraVehicle.toUpperCase(),armed:armed&&viewManual,status:deployment.paused?'PAUSED':viewManual?(armed?'ARMED':'DISARMED'):cameraVehicle==='usv'?'STATION HOLD':deployment.stage==='docked'?'DOCKED':'SEQUENCE',drive:cameraVehicle==='usv'?100:speedPercent,acceleration:cameraVehicle==='usv'?physics.acceleration:undefined,lights:lightLevel,tether:deployment.tether,lift:deployment.lift,note:physics.warning||deployment.limit||(leveling&&cameraVehicle==='rov'?'Self-leveling':'')};
 return <section className={'pool-sim '+(closeView?'close-follow-active':'')}><div className="pool-heading"><div><span className="eyebrow">WATER OPERATION</span><h2>{environment==='bridge'?'Bridge inspection':environment==='sea'?'Open sea':'Wave tank'}</h2></div><span className="reference-badge">Uncalibrated simulation</span></div><div className="sim-modes"><div className="sea-toolbar"><div className="sea-mode"><Button variant={environment==='pool'?'default':'outline'} onClick={()=>changeEnvironment('pool')}>Wave tank · 2 m</Button><Button variant={environment==='sea'?'default':'outline'} onClick={()=>changeEnvironment('sea')}>Open sea · 50 m</Button><Button variant={environment==='bridge'?'default':'outline'} onClick={()=>changeEnvironment('bridge')}>Bridge inspection</Button></div><span>WAVES + WAKE · 120 Hz</span></div></div><div className={'pool-viewport '+(environment==='bridge'?'bridge-viewport':'')}><div className="pool-canvas" ref={host}/><HeadingCompass heading={viewTelemetry[cameraVehicle].heading} vehicle={cameraVehicle.toUpperCase()}/>{closeView&&<VehicleDashboard data={dashboardData}/>}
 {freeView&&<div className="free-camera-help"><span>Drag · orbit &nbsp; Right-drag · pan &nbsp; Scroll · zoom</span><button onClick={()=>{input.current.recenter=true;}}>Recenter {cameraVehicle.toUpperCase()}</button></div>}
 <div className="pilot-camera-toggle" role="group" aria-label="Vehicle camera views"><div className="camera-vehicle"><button aria-pressed={cameraVehicle==='usv'} onClick={()=>chooseUsvView('third')}>USV</button><button aria-pressed={cameraVehicle==='rov'} onClick={()=>chooseRovView('third')}>ROV</button></div>{(['first','close','third','free'] as const).map((view,i)=><Button key={view} variant={(cameraVehicle==='usv'?usvView:rovView)===view?'default':'outline'} aria-pressed={(cameraVehicle==='usv'?usvView:rovView)===view} disabled={!ready} onClick={()=>cameraVehicle==='usv'?chooseUsvView(view):chooseRovView(view)}>{i+1} · {['First person','Close follow','Third person','Free view'][i]}</Button>)}</div>
 {deployment.stage==='free'&&<><div className="pilot-attitude"><span className="attitude-symbol" style={{transform:`rotate(${-deployment.roll}deg)`}}>─◆─</span><div><b>{deployment.depth.toFixed(2)} m</b><small>Roll {deployment.roll.toFixed(0)}° · Pitch {deployment.pitch.toFixed(0)}°</small></div></div><div className="pilot-levels"><span>LIGHT <b>{lightLevel}%</b></span><span>DRIVE <b>{speedPercent}%</b></span></div></>}{ptz.view&&<div className="usv-ptz-hud"><span>USV PTZ · SIMULATED VIDEO</span><strong>Pan {ptz.pan}° / Tilt {ptz.tilt}° / {ptz.zoom.toFixed(1)}×</strong><small>Lens {usvSensing.height.toFixed(2)} m above mean water · FOV {usvSensing.fov.toFixed(0)}°</small><Button variant="outline" onClick={()=>changePTZ({view:false})}>Orbit view · P</Button></div>}{environment==='bridge'&&!ptz.view&&<div className="bridge-camera-hud"><div><span>{bridgeSettings.camera?'ROV OPTICAL VIEW':'COASTAL OVERVIEW'}</span><strong>{bridgeSettings.target} · {bridgeSettings.camera?`${deployment.depth.toFixed(2)} m depth`:'Penang-inspired sector'}</strong><small>{bridgeSettings.camera?bridgeTelemetry.gate.reason:'Drive from the coastal launch or use transit assist.'}</small></div><div><Button variant="outline" disabled={!ready} onClick={()=>changeBridge({camera:!bridgeSettings.camera})}>{bridgeSettings.camera?'Overview · B':'ROV camera · B'}</Button><Button disabled={!ready} variant={lightsOn?'default':'outline'} onClick={toggleLights}>Lights · F</Button><Button disabled={bridgeTelemetry.dwell<1.2||deployment.paused||deployment.stage!=='free'} onClick={()=>{input.current.capture=true;}}>Capture · K</Button></div></div>}{(ptz.view||bridgeSettings.camera)&&<div className="bridge-crosshair" aria-hidden="true">+</div>}</div><div className="pool-hud"><span>{deployment.limit|| (telemetry.hit?'Pool boundary · stopped':ready?(deployment.stage==='descending'&&environment!=='pool'?'Descending to 3 m':stageLabels[deployment.stage]):status)}</span><strong>{Math.abs(telemetry.speed).toFixed(2)} m/s</strong><span>Heading {telemetry.heading.toFixed(0)}°</span><span>X {telemetry.x.toFixed(1)} / Z {telemetry.z.toFixed(1)} m</span></div><div className="physics-hud"><span>Heave <b>{physics.heave.toFixed(2)} m</b></span><span>Roll <b>{physics.roll.toFixed(1)}°</b></span><span>Pitch <b>{physics.pitch.toFixed(1)}°</b></span><span>Vertical acceleration <b>{physics.acceleration.toFixed(2)} m/s²</b></span><span className="physics-warning">{physics.warning|| (environment==='sea'&&seaState>=4?'High sea-state experiment · vessel response uncalibrated':'Uncalibrated engineering approximation')}</span></div><div className="deployment-panel">
 <div className="deployment-state" role="status" aria-live="polite"><span className="eyebrow">CHASING M2 PRO MAX</span><h3>{deployment.paused?'Paused · ':''}{deployment.stage==='descending'&&environment!=='pool'?'4 / 4 · Descending to 3 m':stageLabels[deployment.stage]}</h3><p>{deployment.stage==='docked'?(environment==='bridge'&&bridgeTelemetry.stationDistance>=2?'Sail to the marked offshore station before deploying. Keep the USV on the exposed side of the pier.':'Ready to deploy. The lift lowers from 47.6% to 53% before the lock opens.'):'USV station holding is active; waves still move the vessel. The antenna and ring move with the lift.'}</p></div>
 <div className="deployment-actions"><Button className="manual-arm" variant={armed?'default':'outline'} aria-pressed={armed} disabled={!ready||deployment.paused||!['docked','free'].includes(deployment.stage)} onClick={()=>{input.current.armToggle=true;}}>Space · {armed?'Disarm':'Arm'} {deployment.stage==='docked'?'USV':'ROV'}</Button><Button ref={recoveryButton} className="recovery-hold" aria-label={'Hold L for 1.5 seconds to '+(deployment.stage==='free'?'retrieve':'deploy')+' ROV'} disabled={!ready||deployment.paused||physics.warning.startsWith('Model limit')||!['docked','free'].includes(deployment.stage)||(deployment.stage==='docked'&&environment==='bridge'&&(bridgeTelemetry.stationDistance>=2||bridgeTelemetry.transit||Math.abs(telemetry.speed)>=.2))} style={{'--hold-progress':holdProgress} as React.CSSProperties}><span className="hold-fill"/><kbd>L</kbd><span>{holdProgress>0&&holdProgress<1?'Hold… '+Math.ceil((1-holdProgress)*15)/10+'s':holdProgress===1?'Sequence started':deployment.stage==='docked'?'Hold to deploy':deployment.stage==='free'?'Hold to retrieve':'Sequence active'}</span><small>1.5s</small></Button><Button variant="outline" aria-expanded={accessoriesOpen} aria-controls="water-accessories" onClick={()=>setAccessoriesOpen(open=>!open)}>K · Accessories</Button>{deployment.paused?<Button onClick={()=>{input.current.command='resume';}}>Resume</Button>:<Button variant="outline" disabled={!ready||deployment.stage==='docked'} onClick={()=>{input.current.stop=true;}}>Pause sequence / ROV</Button>}<Button variant="outline" disabled={!ready} onClick={()=>{input.current.focus=true;}}>Focus ROV</Button></div>
 <div className="deployment-metrics"><span>Lift <b>{deployment.lift.toFixed(1)}%</b></span><span>ROV depth <b>{deployment.depth.toFixed(2)} m</b></span><span>ROV roll <b>{deployment.roll.toFixed(1)}°</b></span><span>ROV lights <b>{lightLevel}%</b></span><span>ROV range <b>{deployment.tether.toFixed(1)} / 8 m</b></span><span>Control <b>{deployment.stage==='docked'?'USV':deployment.stage==='free'?'ROV':'Automatic sequence'}</b></span></div>
 </div><div className="pool-controls">{deployment.stage==='docked'?<div className="pool-pad"><HoldControl disabled={!manual} axis="throttle" value={1} onInput={setDrive}>↑ Forward</HoldControl><div><HoldControl disabled={!manual} axis="steer" value={1} onInput={setDrive}>← Turn left</HoldControl><Button variant="destructive" onClick={()=>{input.current.stop=true;}}>■ Stop</Button><HoldControl disabled={!manual} axis="steer" value={-1} onInput={setDrive}>Turn right →</HoldControl></div><HoldControl disabled={!manual} axis="throttle" value={-1} onInput={setDrive}>↓ Reverse</HoldControl><div><HoldControl disabled={!manual||deployment.stage!=='free'} axis="heave" value={1} onInput={setDrive}>R · Ascend</HoldControl><HoldControl disabled={!manual||deployment.stage!=='free'} axis="heave" value={-1} onInput={setDrive}>C · Descend</HoldControl></div><div><HoldControl disabled={!manual||deployment.stage!=='free'} axis="roll" value={1} onInput={setDrive}>Q · Roll left</HoldControl><HoldControl disabled={!manual||deployment.stage!=='free'} axis="roll" value={-1} onInput={setDrive}>E · Roll right</HoldControl></div><Button variant={lightsOn?'default':'outline'} aria-pressed={lightsOn} disabled={!ready} onClick={toggleLights}>F · Lights {lightLevel}%</Button></div>:<RC3Controls onStabilize={()=>{input.current.stabilize=true;}} leveling={leveling} manual={manual&&deployment.stage==='free'} lightLevel={lightLevel} speedPercent={speedPercent} onInput={setDrive} onStop={()=>{input.current.stop=true;}} onLights={toggleLights} onSpeed={setSpeed}/>}<div className="sim-quick-guide"><h3>{deployment.stage==='docked'?'Pilot ME120':deployment.stage==='free'?'Pilot M2 PRO MAX':'Automatic sequence'}</h3><p>{deployment.stage==='docked'?'WASD · Drive & turn':'WASD · Linear movement'}<br/>Q / E · Roll &nbsp; R / C · Rise / dive<br/>T / V · Pitch up / down<br/>F · Light 0 / 50 / 100%<br/>[ / ] · Drive 25 / 50 / 75 / 100%<br/>Z / X · Yaw &nbsp; 0 · Self-stabilize<br/>1 / 2 / 3 / 4 · Camera views<br/>Space · Arm / disarm &nbsp; Esc · Stop<br/>Hold L · Deploy / retrieve &nbsp; K · Accessories</p><div className="sim-view-actions"><Button variant="outline" onClick={()=>{input.current.reset=true;}}>Reset trial</Button> <Button variant="outline" onClick={()=>{input.current.top=true;}}>Top view</Button></div><details className="sim-help"><summary>Controls & recovery guide</summary><h3>{deployment.stage==='docked'?'Drive the integrated ME120':deployment.stage==='free'?'Pilot the ROV':'Deployment & recovery control'}</h3><p>For the deployed ROV, W/S moves forward/back and A/D moves sideways relative to heading. Q/E rolls left/right; T/V pitches up/down; R/C ascends/descends in world vertical. Z/X controls yaw left/right. Press 0 to smoothly level pitch and roll while keeping the current heading; rotational input cancels leveling. Keys 1, 2, 3 and 4 select first person, close follow, third person and free view for the selected camera vehicle. The USV first-person preset uses its forward PTZ lens. Release rotation keys to stop commanded rotation; water disturbances still affect attitude. F cycles light 0% → 50% → 100% → 0%. Brackets decrease/increase the command limit through 25%, 50%, 75%, 100%; endpoints do not wrap. These are custom simulator bindings, not OEM RC3 assignments. The docked USV retains WASD steering. Space toggles the selected vehicle’s manual propulsion. Arming starts fresh; disarming clears commands while waves and currents keep moving the vehicle. Esc disarms and pauses ROV operations; use Resume, then arm again. Automatic USV station holding and scripted deployment/recovery remain separate.</p><p>ROV depth: {environment==='bridge'?'0.55–5.7 m':environment==='sea'?'0.55–7 m':'0.55–1.65 m'} below the mean surface, measured at the model origin. Simulated range from the tether guide: 8 m. Hold L or the deployment button for 1.5 seconds to start; releasing early cancels. K opens accessories. J captures a bridge observation. Recovery sets a {environment!=='pool'?'3':'1'} m approach depth, returns beneath the ring, captures the ROV and raises the lift.</p><p>Press P for the USV PTZ view; use its pan, tilt and zoom controls above. Drive commands remain vessel-relative when looking sideways. Free view: drag to orbit, right-drag or Shift-drag to pan, scroll to zoom. Touch: one finger orbits; two fingers pan and pinch. Recenter returns to the selected vehicle. Free view is independent of vehicle motion. Focus ROV selects third person. Close follow keeps the camera just behind the vehicle; first person uses its optical viewpoint. Changing tabs resets this trial.</p></details><div id="water-accessories" hidden={!accessoriesOpen}><RovAccessoryPanel state={accessories} onToggle={toggleAccessory} onAction={operateAccessory}/></div></div></div><details className="sim-disclosure"><summary>Waves & model settings<span>{environment==='pool'?'Wave tank':environment==='bridge'?'Bridge scenario':'Sea state '+seaState}</span></summary><div className="sea-panel"><div className="sea-presets" hidden={environment==='bridge'}>{seaStates.map(p=><Button key={p.id} variant="outline" aria-pressed={environment==='sea'&&seaState===p.id} onClick={()=>selectSea(p.id)}><b>Sea state {p.id}</b><span>{p.name}</span><small>{p.min}–{p.max} m</small></Button>)}</div>{environment==='sea'&&<><div className="wave-sliders"><label>Significant height Hs · {sea.hs.toFixed(2)} m<Slider aria-label="Significant wave height" min={Math.max(.01,seaStates[seaState-1].min+.001)} max={seaStates[seaState-1].max} step={.01} value={[sea.hs]} onValueChange={([hs])=>changeSea({hs})}/></label><label>Peak period Tp · {sea.tp.toFixed(1)} s<Slider aria-label="Peak wave period" min={Math.max(1.5,Math.ceil(Math.sqrt(sea.hs*2*Math.PI/(9.81*.06))*10)/10)} max={12} step={.1} value={[sea.tp]} onValueChange={([tp])=>changeSea({tp})}/></label><label>Travel direction · {sea.direction}°<Slider aria-label="Sea wave direction" min={-180} max={180} step={5} value={[sea.direction]} onValueChange={([direction])=>changeSea({direction})}/></label></div><div className="sea-toolbar"><Button variant="outline" onClick={()=>{seaRef.current={...seaRef.current,enabled:!sea.enabled};setSea(seaRef.current);}}>{sea.enabled?'Ease waves to calm':'Start sea waves'}</Button><Button variant="outline" onClick={()=>changeSea({seed:sea.seed+1})}>New wave realization</Button><span>Seed {sea.seed} · 32 components · JONSWAP γ 3.3</span></div><div className="wave-sliders"><label>Current · {flow.speed.toFixed(2)} m/s<Slider aria-label="Open sea current speed" min={0} max={1.5} step={.05} value={[flow.speed]} onValueChange={([speed])=>changeFlow({speed})}/></label><label>Current direction · {flow.direction}°<Slider aria-label="Current travel direction" min={-180} max={180} step={5} value={[flow.direction]} onValueChange={([direction])=>changeFlow({direction})}/></label><span className="water-current-note">Current changes restart the trial.</span></div><p>Hs is a statistical height, not a maximum: individual waves can be larger. Peak period is an independent trial setting; very steep height/period combinations are excluded. Direction 0° travels along +Z. Changing a sea setting restarts the trial; waves build gradually. Steady current advects waves and wake; drag uses velocity relative to water.</p></>}<details className="physics-details"><summary>Physics model, assumptions & sources</summary><p>Gravity, eight buoyancy stations across both hulls, six rigid-body degrees of freedom, relative-water drag, rotational inertia and differential thrust. The sea uses a repeatable JONSWAP spectrum normalized to Hs, finite-depth dispersion and depth-dependent orbital velocities. Waves and physics share the same spectrum.</p><label>Assumed loaded mass · {mass} kg<Slider aria-label="Assumed loaded vessel mass" min={100} max={300} step={5} value={[mass]} onValueChange={([value])=>{setMass(value);bodyParams.current.mass=value;input.current.reset=true;}}/></label><p>Provisional parameters: 0.18 m equilibrium draft; inertia = mass × (0.35, 0.45, 0.25) m²; 120 N total drive thrust; 60 N·m yaw command; 20 kg released ROV; neutral underwater buoyancy. Mass changes rescale the assumed waterplane. These are model inputs, not verified ME120 or CHASING specifications.</p><p>Station holding is an idealized horizontal controller limited to ±250 N per axis; it does not suppress heave, pitch or roll. ROV recovery remains scripted and levels the ROV before docking. Manual roll and pitch use provisional damped rate controllers (0.9 rad/s maximum), with depth commands referenced to world vertical. ROV drag and attitude disturbances use the same depth-dependent water velocity field as the visible waves. Propeller spin indicates commanded thrust, including rotational commands; it is not calibrated RPM or real motor allocation. Headlight brightness and beam shafts are visual approximations. No CFD, measured hull geometry, radiation/diffraction, added-mass coupling, breaking waves, flooding, slamming or validated capsize prediction. Pool absorbers are visual; open-sea waves do not reflect from tank walls. Crest whitening is a visual cue.</p><p><a href="https://www.nodc.noaa.gov/gtspp/document/codetbls/wmocodes/table3700.html" target="_blank" rel="noreferrer">NOAA / WMO sea-state bands</a> · <a href="https://www.orcina.com/webhelp/OrcaFlex/Content/html/Waves,Wavespectra.htm" target="_blank" rel="noreferrer">JONSWAP spectrum reference</a> · <a href="https://www.orcina.com/webhelp/OrcaFlex/Content/html/Waves,Kinematicstretching.htm" target="_blank" rel="noreferrer">Wave kinematics</a></p></details></div><div className="wave-settings" hidden={environment!=='pool'}>
 <div className="linear-wave-control"><Button variant={waveSettings.pattern==='linear'?'default':'outline'} aria-pressed={waveSettings.pattern==='linear'} onClick={selectLinear}>Linear · one direction</Button><span>Wave-tank observation · straight, parallel wave fronts</span></div>
 <div className="wave-selects"><label>Wave state<Select value={preset} onValueChange={id=>{const p=wavePresets.find(p=>p.id===id);if(p){const next={...p.settings};waveConfig.current=next;setWaveSettings(next);setPreset(id);}}}><SelectTrigger aria-label="Wave state"><SelectValue/></SelectTrigger><SelectContent>{wavePresets.map(p=><SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}{preset==='custom'&&<SelectItem value="custom">Custom</SelectItem>}</SelectContent></Select></label>
 <label>Generator<Select value={waveSettings.generator} onValueChange={v=>changeWaves({generator:v as WaveGenerator})}><SelectTrigger aria-label="Wave generator"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="flap">Hinged flap bank</SelectItem><SelectItem value="piston">Piston bank</SelectItem><SelectItem value="segmented">Segmented directional bank</SelectItem></SelectContent></Select></label>
 <label>Pattern<Select value={waveSettings.pattern} onValueChange={v=>changeWaves({pattern:v as WavePattern})}><SelectTrigger aria-label="Wave pattern"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="linear">Linear · one direction</SelectItem><SelectItem value="regular">Regular</SelectItem><SelectItem value="irregular">Irregular</SelectItem><SelectItem value="crossing">Crossing</SelectItem><SelectItem value="standing">Standing</SelectItem></SelectContent></Select></label>
 <Button variant="outline" aria-pressed={waveSettings.enabled} onClick={()=>changeWaves({enabled:!waveSettings.enabled,height:waveSettings.height||.14})}>{waveSettings.enabled?'Stop waves':'Start waves'}</Button></div>
 <div className="wave-sliders"><label>{waveSettings.pattern==='linear'?'Wave height H':'Height envelope'} · {waveSettings.height.toFixed(2)} m<Slider aria-label="Wave height envelope in metres" min={0} max={.4} step={.01} value={[waveSettings.height]} onValueChange={([height])=>changeWaves({height})}/></label><label>Base period · {waveSettings.period.toFixed(1)} s<Slider aria-label="Base wave period in seconds" min={1} max={5} step={.1} value={[waveSettings.period]} onValueChange={([period])=>changeWaves({period})}/></label><label>Direction · {waveSettings.direction}°<Slider aria-label="Wave direction in degrees" disabled={waveSettings.generator!=='segmented'&&waveSettings.pattern!=='linear'} min={-45} max={45} step={5} value={[waveSettings.direction]} onValueChange={([direction])=>changeWaves({direction})}/></label></div>
 {waveSettings.pattern==='linear'&&<p className="linear-wave-readout"><strong>Single direction · {waveSettings.direction}°</strong> · wavelength λ {linearInfo.wavelength.toFixed(2)} m · travel speed {linearInfo.speed.toFixed(2)} m/s · steepness H/λ {(waveSettings.height/linearInfo.wavelength).toFixed(3)} · water depth 2 m. At 0°, every paddle moves in phase and waves travel from the far end toward the near end. An angled setting phases the segmented bank but still produces one wave direction. The last 2 m fades the wave out; no reflected waves are added. Use Top view to observe crest travel. {waveSettings.height/linearInfo.wavelength>.05?'Large wave steepness: the small-amplitude linear approximation may be poor. Reduce H or increase the period.':''}</p>}
 <p>{wavePresets.find(p=>p.id===preset)?.description??'Custom wave settings.'} {waveSettings.pattern==='linear'?'Adjust H, period and direction independently.':waveSettings.generator==='segmented'?'Direction 0° travels from the far end toward the near end.':'Select the segmented bank to adjust direction.'}</p>
 <p>Far end: {waveSettings.generator==='piston'?'translating piston paddles':waveSettings.generator==='flap'?'hinged flap paddles':'independently phased flap paddles'} · three edges: passive absorber panels · mean depth 2 m.</p></div><p className="pool-note">Imported trial lift: 47.6–53%, using its original model datum. Studio lift settings are separate. These percentages are visual parameters, not measured hardware stroke.</p><p className="pool-note">Gravity-wave spectrum, buoyancy, current-relative drag and a decaying twin-hull wake. The wake uses approximate deep-water wave packets and visual foam; it is not a propeller or wave-resistance solver. Force-based engineering approximation, not a verified ME120 seakeeping model. Sea states use WMO 3700 height bands, not Beaufort wind force. Hs presets and periods are selected scenarios. Deployment and recovery are guided animations; tether limits are geometric, without cable tension or entanglement physics. Results cannot establish safe operating conditions for the real vessel.</p></details><details className="sim-disclosure"><summary>PTZ camera & surface sensing<span>Virtual sensors</span></summary><USVOperationsPanel ptz={ptz} onPTZ={changePTZ} options={usvOptions} onOptions={changeUSVOptions} sensing={usvSensing} ready={ready} deployed={deployment.stage!=='docked'} bridge={environment==='bridge'}/></details>{environment==='bridge'&&<details className="sim-disclosure"><summary>Bridge mission & inspection evidence<span>Training scenario</span></summary>{environment==='bridge'&&<BridgeInspectionPanel settings={bridgeSettings} onChange={changeBridge} telemetry={bridgeTelemetry} records={inspectionRecords} ready={ready} stage={deployment.stage} paused={deployment.paused} onTransit={()=>{input.current.transit='station';}} onReturn={()=>{input.current.transit='coast';}} onCapture={()=>{input.current.capture=true;}} onOverview={()=>{input.current.overview=true;}} note={inspectionNote} onNote={note=>{noteRef.current=note;setInspectionNote(note);}}/>}</details>}</section>;
}
