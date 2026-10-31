import {createAccessoryShowroom} from './accessory-showroom.mjs?v=tools-az';
import {createSensingVisuals} from './sensing-visuals.mjs?v=hardware-z';
import {createAccessoryDisplays} from './accessory-display.mjs?v=rc3-au';
import {createSensorRack} from './sensor-rack.mjs?v=identification-al';
import {sensorComponents} from './sensor-data.mjs?v=sensors-y';
import {accessoryComponents} from './accessory-data.mjs?v=rc3-au';
import {enrichRovModel,createRovAnatomy} from './rov-anatomy.mjs?v=rov-at';
import {createComponentInspector} from './component-inspector.mjs?v=tools-az';
import {getHardwareBounds,fitModelFrame} from './model-framing.mjs?v=research-v';
import {createVision} from './vision.mjs?v=vision-k';
import {REFERENCE_STROKE_M,MAX_LIFT_FRACTION,MAX_LIFT_TRAVEL_M,clampLift} from './lift.mjs?v=vision-k';
import {magneticState} from './magnetic.mjs?v=vision-k';
import * as T from 'three';
import {attachUsvEffects} from './usv-effects.mjs?v=vision-k';
import {attachRovEffects} from './rov-effects.mjs?v=rc3-au';
import { OrbitControls } from './vendor/OrbitControls.js';
import { GLTFExporter } from './vendor/GLTFExporter.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';

const P=(x,y,z)=>new T.Vector3(x,z,y);
const C={metal:0xa4b7c6,black:0x15232c,orange:0xff812e,cyan:0x65d9e7,gold:0xe9c987,pad:0x263640,light:0xd5f4f5};
export function createScene(host){
 const uiFont=getComputedStyle(document.documentElement).getPropertyValue("--font-ui").trim()||"system-ui,sans-serif";
 const renderer=new T.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(0x000000,0);renderer.outputColorSpace=T.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;host.appendChild(renderer.domElement);
 const scene=new T.Scene();const camera=new T.PerspectiveCamera(40,1,.02,100);let activeView='iso',renderActive=true;camera.position.set(-3.6,2.6,3.4);
 const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(-.35,0,0);controls.enableDamping=true;controls.minDistance=.7;controls.maxDistance=10;controls.maxPolarAngle=Math.PI*.94;
 scene.add(new T.HemisphereLight(0xf5f4ef,0x32302c,2.4));
 const key=new T.DirectionalLight(0xfff0dd,3);key.position.set(3,6,4);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-4;key.shadow.camera.right=4;key.shadow.camera.top=4;key.shadow.camera.bottom=-4;scene.add(key);
 const rim=new T.DirectionalLight(0xd7dcdf,1.25);rim.position.set(-4,2,-4);scene.add(rim);
 const assets=new T.Group();scene.add(assets);
 const showroom=createAccessoryShowroom();assets.add(showroom.root);
 const ground=new T.Mesh(new T.PlaneGeometry(20,20),new T.MeshStandardMaterial({color:0x2a2431,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-1.08;ground.receiveShadow=true;scene.add(ground);
 const grid=new T.GridHelper(10,50,0x695972,0x44394b);grid.position.y=-1.075;scene.add(grid);
 const water=new T.Mesh(new T.PlaneGeometry(12,12),new T.MeshPhysicalMaterial({color:0x3bafc6,transparent:true,opacity:.12,roughness:.45,side:T.DoubleSide,depthWrite:false}));water.rotation.x=-Math.PI/2;water.position.y=0;scene.add(water);
 const watergrid=new T.GridHelper(8,16,0x33798a,0x204e60);watergrid.material.transparent=true;watergrid.material.opacity=.15;watergrid.material.depthWrite=false;scene.add(watergrid);
 // Direction overlays stay outside exported geometry and never receive ROV yaw twice.
 // Camera test chart only: excluded from exported hardware geometry.
 const chartCanvas=document.createElement('canvas');chartCanvas.width=768;chartCanvas.height=512;
 const chartCtx=chartCanvas.getContext('2d');chartCtx.fillStyle='#f0e9d9';chartCtx.fillRect(0,0,768,512);
 for(let row=0;row<6;row++)for(let col=0;col<10;col++){chartCtx.fillStyle=(row+col)%2?'#ede8dc':'#292e2e';chartCtx.fillRect(44+col*68,46+row*66,68,66);}
 chartCtx.fillStyle='#252423';chartCtx.fillRect(0,456,768,56);chartCtx.fillStyle='#ffbc79';chartCtx.font=`24px ${uiFont}`;chartCtx.textAlign='center';chartCtx.fillText('CAMERA TEST TARGET',384,493);
 const chart=new T.Mesh(new T.PlaneGeometry(1.5,1),new T.MeshBasicMaterial({map:new T.CanvasTexture(chartCanvas),side:T.DoubleSide}));chart.position.set(3.2,.3,0);chart.rotation.y=-Math.PI/2;chart.visible=false;scene.add(chart);
 const motionOverlay=new T.Group();motionOverlay.name='simulated_motion_overlay';scene.add(motionOverlay);
 function motionArrow(color,opacity){const g=new T.Group(),mat=new T.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,depthTest:false});
  const shaft=new T.Mesh(new T.CylinderGeometry(.008,.008,1,12),mat),tip=new T.Mesh(new T.ConeGeometry(.03,.085,20),mat);g.add(shaft,tip);g.userData={shaft,tip};g.renderOrder=8;shaft.renderOrder=8;tip.renderOrder=9;motionOverlay.add(g);return g;}
 const intendedArrow=motionArrow(0xffb35b,.18),movingArrow=motionArrow(0x76e5f0,.22);let motionData=null;
 function pointArrow(arrow,origin,vector){const direction=P(...vector),speed=direction.length();arrow.visible=speed>.001;if(!arrow.visible)return;const length=Math.min(.8,Math.max(.12,speed*5));arrow.position.copy(origin);arrow.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),direction.normalize());arrow.userData.shaft.scale.y=length-.085;arrow.userData.shaft.position.y=(length-.085)/2;arrow.userData.tip.position.y=length-.0425;}
 const mats={};for(const [k,v]of Object.entries(C))mats[k]=new T.MeshStandardMaterial({color:v,metalness:['metal','cyan','gold'].includes(k)?.65:.15,roughness:k==='pad'?.9:.37});
 function mesh(geo,mat,parent,name){const m=new T.Mesh(geo,mats[mat]||mat);m.castShadow=true;m.receiveShadow=true;if(name)m.name=name;parent.add(m);return m;}
 function box(g,x,y,z,dx,dy,dz,mat='metal',name=''){const m=mesh(new T.BoxGeometry(dx,dz,dy),mat,g,name);m.position.copy(P(x,y,z));return m;}
 function cyl(g,x,y,z,r,h,mat='metal',axis='z',name=''){const m=mesh(new T.CylinderGeometry(r,r,h,32),mat,g,name);m.position.copy(P(x,y,z));if(axis==='x')m.rotation.z=Math.PI/2;if(axis==='y')m.rotation.x=Math.PI/2;return m;}
 function beam(g,a,b,r=.018,mat='metal',name=''){const m=mesh(new T.CylinderGeometry(r,r,1,12),mat,g,name);setBeam(m,a,b);return m;}
 function setBeam(m,a,b){const p=P(...a),q=P(...b),d=q.clone().sub(p);m.position.copy(p.add(q).multiplyScalar(.5));m.scale.set(1,d.length(),1);m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());}
 const boat=new T.Group();boat.name='ME120_restored_reference';assets.add(boat);
 const originalFrame=new T.Group();originalFrame.rotation.y=Math.PI/2;originalFrame.position.y=-.25;boat.add(originalFrame);
 const isolatedROV=new T.Group();isolatedROV.name='M2_PRO_MAX_restored_reference';assets.add(isolatedROV);isolatedROV.visible=false;
 let mechanism,carrier,rov,shoe,gate,dogs=[],arms=[],magnetGroup,plateFixed,rope,concept='D';
 let vesselModel,mountDatum,oemMoving=[],mountContext,mountPlate,spider,epmFace,tetherHardware,flowMarkers=[];const MOUNT_STROKE=MAX_LIFT_TRAVEL_M,ADAPTER_TOP=.458;
 let settings={progress:0,explode:0,hulls:true,water:false,focus:false,magnet:true,subject:'me120',dimensions:false,tether:true,dockPose:null,dockMotion:null,playing:false,blocked:false,poseStale:false,guidance:true,lights:false,thrusters:false,usvThrusters:false,usvLift:0,cameraMode:'orbit'};
 let currentEffects=null,standaloneEffects=null,usvEffects=null,accessoryDisplays=null,sensorRack=null;
 let loaded=false,reelTemplate=null,rovTemplate=null,standaloneModel=null,modelStats=null;const vesselParts=[],rovParts=[];
 const vision=createVision({getUsvAnchor:()=>vesselModel?.getObjectByName('antenna'),getRovAnchor:()=>settings.subject==='rov'?standaloneModel:rov?.children[0]});
 const components=createComponentInspector({host,scene,camera,controls,getSettings:()=>settings,equipmentHost:document.getElementById('equipmentBar')});
 const sensing=createSensingVisuals({scene,getAnchors:()=>sensorRack?{zed:sensorRack.owners['zed-camera'],lidar:sensorRack.owners['robosense-lidar']}:null});
 let hardwareView=null;
 function frameHardware(){
  if(!settings.hardwareMode||settings.hardwareMode==='links'||!loaded||host.clientWidth<1||host.clientHeight<1)return;
  sensing.update(0);const bounds=sensing.getBounds().clone().union(getHardwareBounds(boat));
  const frame=fitModelFrame({bounds,direction:new T.Vector3(.62,.66,1),camera,width:host.clientWidth,height:host.clientHeight,safeArea:{left:24,right:24,top:28,bottom:35},margin:1.04});
  if(frame){controls.minDistance=.35;controls.maxDistance=Math.max(24,frame.distance*2);camera.position.copy(frame.position);controls.target.copy(frame.target);controls.update();}
 }
 const hardware={
  setMode(mode){
   if(!['stereo','lidar','links'].includes(mode))return this.stop();
   components.close({restore:false,instant:true});
   if(!settings.hardwareMode)hardwareView={position:camera.position.clone(),target:controls.target.clone(),min:controls.minDistance,max:controls.maxDistance};
   settings.hardwareMode=mode;sensing.setMode(mode==='links'?null:mode);update({});frameHardware();
  },
  setDistance(distance){sensing.setDistance(distance);frameHardware();},
  update(dt){sensing.update(dt);},
  reframe:frameHardware,
  info(){return {...sensing.info(),mode:settings.hardwareMode||null};},
  stop(){
   if(!settings.hardwareMode)return;
   settings.hardwareMode=null;sensing.stop();update({});
   if(hardwareView){camera.position.copy(hardwareView.position);controls.target.copy(hardwareView.target);controls.minDistance=hardwareView.min;controls.maxDistance=hardwareView.max;controls.update();}
   hardwareView=null;
  }
 };
 const loader=new GLTFLoader();
 function prepare(root){root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;const ms=Array.isArray(o.material)?o.material:[o.material];for(const m of ms){m.roughness=Math.max(m.roughness||.3,.3);m.metalness=Math.min(m.metalness||0,.65);}}});return root;}
 function matchAerialColours(antenna){
  const rod=antenna.children.find(n=>n.isMesh&&n.material?.name==='gray');if(!rod)return;
  rod.geometry=rod.geometry.clone();const geo=rod.geometry,pos=geo.attributes.position,idx=geo.index,count=idx?idx.count:pos.count;
  const ivory=rod.material.clone();ivory.name='photo_ivory_aerial';ivory.color.setHex(0xe5e4d7);rod.material=[rod.material,ivory];geo.clearGroups();
  let start=0,last=-1;for(let i=0;i<count;i+=3){let x=0;for(let j=0;j<3;j++)x+=pos.getX(idx?idx.getX(i+j):i+j)/3;const which=Math.abs(x+.08)<.025?1:0;if(last!==which){if(last>=0)geo.addGroup(start,i-start,last);start=i;last=which;}}if(last>=0)geo.addGroup(start,count-start,last);
 }
 function cloneReference(root){const c=root.clone(true);c.traverse(o=>{if(o.isMesh){o.geometry=o.geometry.clone();o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();}});return c;}
 function makeROV(){const g=new T.Group();g.name='M2_PRO_MAX_original_detailed_reference';if(rovTemplate){const model=cloneReference(rovTemplate);model.rotation.y=Math.PI/2;model.position.y=.095;g.add(model);currentEffects=attachRovEffects(model);}return g;}
 const ready=Promise.all(['me120-reference.glb','chasing-m2-pro-max-reference.glb','chasing-e-reel-reference.glb','starlink-mini-concept.glb'].map(n=>loader.loadAsync('./models/'+n))).then(([v,r,reel,star])=>{
  const vessel=prepare(v.scene);vesselModel=vessel;vessel.scale.x=1.4/1.4051200151443482;originalFrame.add(vessel);usvEffects=attachUsvEffects(vessel);
  // Preserve the earlier studio's raised visual pose. Mounting/stroke remain unmeasured.
  for(const name of ['payload_lifter_moving','payload_mounting_ring']){const n=vessel.getObjectByName(name);if(n)n.position.y+=.418;}
  const antenna=vessel.getObjectByName('antenna');if(antenna){antenna.position.y-=.342;sensorRack=createSensorRack();antenna.add(sensorRack.root);matchAerialColours(antenna);}
  for(const node of vessel.children){vesselParts.push({node,base:node.position.clone()});}
  for(const name of ['payload_lifter_moving','payload_mounting_ring','antenna']){const node=vessel.getObjectByName(name);if(node)oemMoving.push({node,base:node.position.clone()});}
  mountDatum=new T.Object3D();mountDatum.name='existing_ring_underside_datum';mountDatum.position.set(0,-.062,-.012);vessel.getObjectByName('payload_mounting_ring').add(mountDatum);
  reel.scene.position.set(0,.835,-.615);reel.scene.scale.setScalar(.8);originalFrame.add(prepare(reel.scene));reelTemplate=cloneReference(reel.scene);
  star.scene.position.set(.54,1.03,-.80);originalFrame.add(prepare(star.scene));
  beam(boat,[-.80,-.54,.18],[-.80,-.54,.78],.016,'metal','Starlink_support_concept');
  rovTemplate=enrichRovModel(prepare(r.scene));const standalone=cloneReference(rovTemplate);standalone.rotation.y=Math.PI/2;isolatedROV.add(standalone);standaloneModel=standalone;standaloneEffects=attachRovEffects(standalone);
  for(const node of standalone.children)rovParts.push({node,base:node.position.clone()});
  boat.updateMatrixWorld(true);rovTemplate.updateMatrixWorld(true);
  const hb=new T.Box3();for(const name of ['hull_port','hull_starboard']){const n=vessel.getObjectByName(name);if(n)hb.expandByObject(n);}
  const rb=new T.Box3();for(const name of ['rov_body','rov_battery','rov_frame','rov_camera','rov_thrusters']){const n=rovTemplate.getObjectByName(name);if(n)rb.expandByObject(n);}
  const hs=hb.getSize(new T.Vector3()),rs=rb.getSize(new T.Vector3());modelStats={metresPerUnit:1,hull:{length:hs.x,beam:hs.z},rovNoLights:{length:rs.z,width:rs.x,height:rs.y},oemCad:false};
  accessoryDisplays=createAccessoryDisplays({reelSource:reel.scene});assets.add(accessoryDisplays.usv,accessoryDisplays.rov);
  const anatomy=createRovAnatomy(standalone,accessoryComponents.find(d=>d.id==='rov-ports'));
  components.init(vessel,{extraComponents:[...accessoryComponents.filter(d=>d.id!=='rov-ports'),...anatomy.components,...sensorComponents],owners:{...anatomy.owners,...sensorRack?.owners,'sensor-rack':sensorRack?.root,...accessoryDisplays.owners,'gcs-display':accessoryDisplays.usv,'starlink-mini':star.scene,'usv-ereel':reel.scene,'rov-reference':standalone}});
  loaded=true;host.dataset.loaded='true';build(concept);view('iso');host.dispatchEvent(new Event('modelsready'));return true;
 }).catch(e=>{host.dataset.loaded='error';host.dispatchEvent(new CustomEvent('modelerror',{detail:e.message}));throw e;});
 const vesselDims=new T.Group(),rovDims=new T.Group();scene.add(vesselDims,rovDims);
 function dimension(parent,a,b,text){const points=[P(...a),P(...b)];parent.add(new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:0xc9cfbb})));const c=document.createElement('canvas');c.width=384;c.height=80;const cx=c.getContext('2d');cx.fillStyle='#252423';cx.fillRect(0,0,384,80);cx.fillStyle='#d5eac0';cx.font=`34px ${uiFont}`;cx.textAlign='center';cx.fillText(text,192,53);const sprite=new T.Sprite(new T.SpriteMaterial({map:new T.CanvasTexture(c),depthTest:false}));sprite.position.copy(points[0].clone().add(points[1]).multiplyScalar(.5));sprite.scale.set(text.includes('mm')?.24:.5,text.includes('mm')?.05:.104,1);parent.add(sprite);}
 dimension(vesselDims,[-1.25,.85,-.26],[1.25,.85,-.26],'Hull 2.50 m');dimension(vesselDims,[1.42,-.70,-.26],[1.42,.70,-.26],'Beam 1.40 m');
 dimension(rovDims,[-.304,.28,-.02],[.304,.28,-.02],'608 mm');dimension(rovDims,[.38,-.147,-.02],[.38,.147,-.02],'294 mm');dimension(rovDims,[-.4,-.2,0],[-.4,-.2,.196],'196 mm');

 function annulus(parent,r,R,h,z,name){const shape=new T.Shape();shape.absarc(0,0,R,0,Math.PI*2,false);const hole=new T.Path();hole.absarc(0,0,r,0,Math.PI*2,true);shape.holes.push(hole);const m=mesh(new T.ExtrudeGeometry(shape,{depth:h,bevelEnabled:false,curveSegments:64}),'gold',parent,name);m.rotation.x=-Math.PI/2;m.position.y=z-h/2;return m;}
 function buildMagnetic(){
  carrier.name='compact_EPM_head_on_OEM_round_mount';
  mountPlate=new T.Group();mountPlate.name='blank_adapter';carrier.add(mountPlate);annulus(mountPlate,.037,.085,.008,.454,'blank_adapter_NO_MOUNT_HOLES');
  spider=new T.Group();spider.name='head_structural_spine';carrier.add(spider);
  box(spider,0,0,.425,.27,.05,.035,'metal','rigid_head_spine');box(spider,0,0,.430,.050,.32,.022,'metal','crossarm_to_lock_housings');
  for(const y of[-.145,.145]){beam(spider,[0,y,.337],[0,y,.430],.015,'metal','pin_housing_support');box(spider,0,y,.337,.065,.09,.052,'black','sealed_latch_housing_CONCEPT');box(spider,.039,y,.345,.014,.025,.022,'light','latch_sensor');}
  for(const y of[-.050,.050])beam(spider,[0,y,.410],[0,y,.452],.013,'metal');
  magnetGroup=new T.Group();magnetGroup.name='sealed_pulse_switched_EPM_CONCEPT';carrier.add(magnetGroup);
  cyl(magnetGroup,0,0,.381,.060,.046,'black','z','EPM_housing_UNSPECIFIED');
  epmFace=cyl(magnetGroup,0,0,.362,.062,.008,'gold','z','EPM_pole_face');epmFace.material=epmFace.material.clone();
  box(magnetGroup,.12,0,.418,.060,.080,.038,'black','pulse_driver_enclosure_CONCEPT');
  for(const x of[-.100,.100]){cyl(spider,x,0,.3615,.010,.113,'metal','z','guide_pin_shear_key');const cone=mesh(new T.ConeGeometry(.010,.022,24),'gold',spider,'tapered_guide_tip');cone.rotation.z=Math.PI;cone.position.copy(P(x,0,.300));}
  gate=new T.Group();plateFixed=new T.Group();
  for(const sign of[-1,1]){const g=new T.Group();g.name='spring_engaged_pin_'+sign;g.position.copy(P(0,sign*.103,.337));carrier.add(g);cyl(g,0,0,0,.006,.085,'gold','y','positive_lock_pin');dogs.push(g);}
  rov=makeROV();if(rov.children[0])rov.children[0].position.y=.085;carrier.add(rov);
  shoe=new T.Group();shoe.name='ROV_load_spreading_yoke_stays_with_vehicle';rov.add(shoe);
  for(const y of[-.105,.105])box(shoe,0,y,.058,.51,.025,.02,'cyan','underside_sled_runner');
  for(const x of[-.215,.215]){box(shoe,x,0,.072,.042,.365,.020,'cyan','load_spreader');for(const y of[-.105,.105])box(shoe,x,y,.085,.062,.05,.016,'pad','body_pad_CONTACT_UNVERIFIED');}
  for(const x of[-.215,.215])for(const y of[-.172,.172])beam(shoe,[x,y,.065],[x,y,.320],.010,'cyan','yoke_post');
  for(const y of[-.172,.172]){beam(shoe,[-.215,y,.320],[.215,y,.320],.010,'cyan');beam(shoe,[0,y,.320],[0,0,.335],.012,'cyan','armature_load_spreader');}
  for(const [x,w]of[[-.124,.022],[0,.174],[.124,.022]])box(shoe,x,0,.325,w,.050,.018,'metal','guide_receiver_crossbar');
  for(const x of[-.100,.100])for(const y of[-.019,.019])box(shoe,x,y,.325,.026,.012,.018,'metal','bore_side_bridge');
  cyl(shoe,0,0,.342,.040,.018,'metal','z','armature_load_boss');
  cyl(shoe,0,0,.352,.075,.012,'metal','z','ferromagnetic_strike_plate');
  for(const x of[-.100,.100]){const g=mesh(new T.TorusGeometry(.016,.003,10,32),'gold',shoe,'guide_socket');g.rotation.x=Math.PI/2;g.position.copy(P(x,0,.332));}
  for(const sign of[-1,1]){const lug=mesh(new T.TorusGeometry(.012,.005,12,32),'gold',shoe,'cross_pin_keeper_lug');lug.position.copy(P(0,sign*.103,.337));}
  mountContext=new T.Group();mountContext.name='OEM_mount_context';mountContext.rotation.y=Math.PI/2;mountContext.position.y=-.25;mechanism.add(mountContext);
  if(vesselModel)for(const name of ['payload_lifter_fixed','payload_lifter_moving','payload_mounting_ring']){const n=cloneReference(vesselModel.getObjectByName(name));n.userData.base=n.position.clone();mountContext.add(n);}
  tetherHardware=new T.Group();tetherHardware.name='separate_stern_tether_guide';mechanism.add(tetherHardware);
  if(reelTemplate){const ref=new T.Group();ref.rotation.y=Math.PI/2;ref.position.y=-.25;ref.add(cloneReference(reelTemplate));tetherHardware.add(ref);tetherHardware.userData.reel=ref;}
  for(const y of[-.14,.14]){box(tetherHardware,-.88,y,.38,.12,.07,.03,'metal','deck_bracket_LOCATION_UNVERIFIED');beam(tetherHardware,[-.88,y,.40],[-1.46,y*.65,.38],.015,'cyan','aft_guide_boom');}
  box(tetherHardware,-1.47,0,.37,.05,.25,.04,'metal','fairlead_crosshead');
  const wheel=mesh(new T.TorusGeometry(.080,.010,12,48),'gold',tetherHardware,'stern_captive_sheave_RADIUS_UNVERIFIED');wheel.position.copy(P(-1.48,0,.34));
  for(const y of[-.035,.035]){const guard=mesh(new T.TorusGeometry(.095,.008,10,48),'metal',tetherHardware,'captive_sheave_cheek');guard.position.copy(P(-1.48,y,.34));}
  cyl(tetherHardware,-1.48,0,.34,.009,.11,'metal','y','fairlead_axle');
  box(tetherHardware,-1.19,0,.50,.09,.07,.05,'gold','tether_tension_sensor');
  beam(tetherHardware,[-1.19,0,.41],[-1.19,0,.50],.010,'metal','load_sensor_bracket');
  for(const x of[-.98,-1.10])cyl(tetherHardware,x,0,.52,.030,.065,'pad','y','dancer_roller');
  // Flow markers illustrate cable direction, not a powered stock payout capability.
  flowMarkers=[];for(let i=0;i<4;i++){const m=mesh(new T.SphereGeometry(.012,10,8),'light',tetherHardware,'tether_flow_marker');flowMarkers.push(m);}
 }

 function build(which='D'){
  if(which!=='D')throw new Error('Only the magnetic mechanism is available');
  concept='D';if(mechanism){assets.remove(mechanism);mechanism.traverse(o=>{if(o.geometry)o.geometry.dispose();});}
  mechanism=new T.Group();mechanism.name='Magnetic_capture';assets.add(mechanism);dogs=[];
  carrier=new T.Group();mechanism.add(carrier);
  mountContext=null;mountPlate=null;spider=null;tetherHardware=null;epmFace=null;flowMarkers=[];
  buildMagnetic();update(settings);return concept;
 }
 function pose(t){
  // Full illustrative sequence; not physical validation.
  const lower=t<.12?0:t<.32?(t-.12)/.20:t<.86?1:t<.98?1-(t-.86)/.12:0;
  const out=t<.38?0:t<.52?(t-.38)/.14:t<.60?1:t<.76?1-(t-.60)/.16:0;
  return{lower:Math.max(0,Math.min(1,lower)),out:Math.max(0,Math.min(1,out)),released:t>=.35&&t<.81};
 }
 function timelinePosition(t){const k=pose(t),m=magneticState(t);let x=-.05,z=.20-.92*k.lower;
  if(concept==='D'&&carrier){const now=pose(settings.progress);x=carrier.position.x;z=carrier.position.y+MOUNT_STROKE*now.lower-MOUNT_STROKE*k.lower;}
  return [x-1.28*(concept==='D'?m.out:k.out),0,z-(concept==='D'?m.gap:0)];
 }
 function updateMotion(){
  const active=settings.subject==='system'&&settings.explode===0&&settings.guidance;
  motionOverlay.visible=active;const dm=settings.dockMotion,relative=!!dm;
  let intended=[0,0,0],actual=[0,0,0];
  if(relative){intended=dm.intended||[0,0,0];actual=dm.stage==='CONTACT'?[0,0,0]:dm.v;}
  else{const t=settings.progress,h=.0001,a=timelinePosition(Math.max(0,t-h)),b=timelinePosition(Math.min(1,t+h));const span=(Math.min(1,t+h)-Math.max(0,t-h))*42;actual=b.map((v,i)=>(v-a[i])/span);const next=Math.min(1,t+.012),c=timelinePosition(t),d=timelinePosition(next);intended=next===t?[0,0,0]:d.map((v,i)=>(v-c[i])/((next-t)*42));}
  const frozen=!settings.playing||settings.blocked||settings.poseStale||dm?.stage==='HOLD';
  const origin=rov.getWorldPosition(new T.Vector3()).add(P(0,0,.14));
  pointArrow(intendedArrow,origin.clone().add(P(0,-.05,0)),intended);pointArrow(movingArrow,origin.clone().add(P(0,.05,0)),actual);
  if(frozen){intendedArrow.visible=false;movingArrow.visible=false;}
  motionData={visible:active,frame:relative?'mount-relative':'world',offset:[rov.position.x,rov.position.z,rov.position.y],yaw:dm?.yaw||0,intended:[...intended],actual:[...actual],frozen,poseStale:settings.poseStale,arrows:{intended:active&&intendedArrow.visible,moving:active&&movingArrow.visible},opacity:{intended:.18,moving:.22},source:relative?'kinematic model':'animation timeline'};
 }
 function update(s){
  const previousExplode=settings.explode;settings={...settings,...s};components.sync();settings.usvLift=clampLift(settings.usvLift);if(vision.info().mode!==settings.cameraMode)vision.setMode(settings.cameraMode);controls.enabled=settings.cameraMode==='orbit';if(!carrier)return;const ex=settings.explode;
  if(ex>0&&previousExplode===0)view('iso');
  if(ex===0&&previousExplode>0)view('iso');
  const t=ex>0?0:settings.progress;const k=pose(t);const mk=magneticState(t);if(concept==='D'){k.out=mk.out;k.released=!mk.pinsClosed;}
  for(const p of oemMoving){p.node.position.copy(p.base);if(settings.subject==='me120')p.node.position.y-=REFERENCE_STROKE_M*(ex===0?settings.usvLift:0);else if(concept==='D'&&settings.subject==='system')p.node.position.y-=MOUNT_STROKE*k.lower;}
  boat.updateMatrixWorld(true);
  let x=-.05,z=.20-.92*k.lower;
  if(concept==='D'&&mountDatum){const pt=mountDatum.getWorldPosition(new T.Vector3());x=pt.x;z=pt.y-ADAPTER_TOP;}
  carrier.position.copy(P(x,0,z));
  // Explode functional modules without changing their assigned mating pose.
  carrier.position.y+=ex*.25;rov.position.copy(P(-1.28*k.out,ex*.15,ex*.63));shoe.position.y=ex*.30;magnetGroup.position.y=ex*.25;plateFixed.position.y=ex*.13+(k.released?.075:0);
  magnetGroup.visible=false;plateFixed.visible=false;
  gate.rotation.z=k.released?-Math.PI/2:0;gate.position.y=.38+ex*.35;
  dogs.forEach((d,i)=>{const sign=i===0?-1:1;d.position.z=sign*(.245+(k.released?.065:0)+ex*.20);});
  if(concept==='D'){
   carrier.position.y=z-ex*.16;rov.position.copy(P(-1.28*mk.out-ex*.45,0,-mk.gap-ex*.50));shoe.position.y=0;
   mountPlate.position.y=ex*.10;spider.position.y=0;magnetGroup.visible=true;magnetGroup.position.y=-ex*.10;
   epmFace.material.color.setHex(mk.magnetOn?0xffa24e:0x747f88);epmFace.material.emissive.setHex(mk.pulsing?0xff7820:0x000000);epmFace.material.emissiveIntensity=mk.pulsing?.6:0;
   dogs.forEach((d,i)=>d.position.copy(P(0,(i===0?-1:1)*(mk.pinsClosed?.103:.177)+ (i===0?-1:1)*ex*.10,.337)));
   mountContext.visible=settings.cameraMode==='orbit'&&settings.subject==='system'&&(settings.focus||!settings.hulls);for(const n of mountContext.children){n.position.copy(n.userData.base);if(n.name!=='payload_lifter_fixed')n.position.y-=MOUNT_STROKE*k.lower;}
   tetherHardware.visible=settings.subject==='system'&&settings.tether;if(tetherHardware.userData.reel)tetherHardware.userData.reel.visible=settings.cameraMode==='orbit'&&(settings.focus||!settings.hulls);
   if(rov.children[0])rov.children[0].position.y=.085-ex*.25;
   rov.rotation.y=0;if(settings.dockPose&&ex===0){rov.position.copy(P(...settings.dockPose.p));rov.rotation.y=-settings.dockPose.yaw;}
  }
  boat.visible=settings.subject!=='rov'&&(settings.cameraMode!=='orbit'||settings.subject==='me120'||(settings.hulls&&!settings.focus));
  mechanism.visible=settings.subject==='system';isolatedROV.visible=settings.subject==='rov';
  if(accessoryDisplays){accessoryDisplays.usv.visible=settings.subject==='me120'&&settings.cameraMode==='orbit'&&ex===0;accessoryDisplays.rov.visible=!settings.accessoryMode&&settings.subject==='rov'&&settings.cameraMode==='orbit'&&ex===0;}
  showroom.root.visible=settings.subject==='rov'&&settings.accessoryMode&&settings.cameraMode==='orbit'&&ex===0;
  water.visible=settings.water&&(settings.cameraMode!=='orbit'||(settings.subject!=='rov'&&!settings.focus));watergrid.visible=water.visible;
  ground.position.y=settings.cameraMode!=='orbit'?-1.4:settings.subject==='rov'?-.02:settings.subject==='me120'?-.28:-1.4;grid.position.y=ground.position.y+.005;
  grid.scale.setScalar(settings.subject==='rov'&&settings.cameraMode==='orbit'?.15:1);
  vesselDims.visible=settings.cameraMode==='orbit'&&settings.dimensions&&ex===0&&settings.subject==='me120';rovDims.visible=settings.cameraMode==='orbit'&&settings.dimensions&&ex===0&&settings.subject==='rov';
  const offsets={hull_port:[-.18,0,0],hull_starboard:[.18,0,0],bridge_frame:[0,.15,0],equipment_cabin:[0,.34,0],payload_lifter_fixed:[0,.47,0],payload_lifter_moving:[0,.47,0],payload_mounting_ring:[0,-.2,0],antenna:[0,.75,0],thrusters:[0,0,-.3]};
  for(const p of vesselParts){if(!((settings.subject==='me120'||(concept==='D'&&settings.subject==='system'))&&oemMoving.some(o=>o.node===p.node)))p.node.position.copy(p.base);const o=offsets[p.node.name]||[0,0,0];if(settings.subject==='me120')p.node.position.add(new T.Vector3(...o).multiplyScalar(ex));}
  const ro={rov_body:[0,.08,0],rov_frame:[0,.27,0],rov_thrusters:[.14,0,0],rov_battery:[0,0,-.30],rov_camera:[0,0,.15],rov_lights:[-.1,.33,0],rov_tether:[0,0,-.23]};
  for(const p of rovParts){p.node.position.copy(p.base);p.node.position.add(new T.Vector3(...(ro[p.node.name]||[0,0,0])).multiplyScalar(ex));}

  if(rope){rope.parent?.remove(rope);rope.geometry.dispose();rope.material.dispose();}
  if(settings.subject==='system'&&ex===0&&settings.tether){
   let pts;{
    const end=rov.localToWorld(P(-.34,.015,.27));
    const bend=P(-1.58,0,.12),slack=P(-1.69,0,Math.min(end.y-.12,-.32));
    pts=[P(-.64,0,.66),P(-.98,0,.56),P(-1.19,0,.54),P(-1.42,0,.43),P(-1.56,0,.35),bend,slack,end];
   }
   const curve=new T.CatmullRomCurve3(pts);rope=new T.Mesh(new T.TubeGeometry(curve,90,.004,6,false),new T.MeshBasicMaterial({color:0xeab46e}));rope.name='tether_route_concept_NOT_TOW_LINE';assets.add(rope);
   if(concept==='D')flowMarkers.forEach((m,i)=>{const flow=mk.tether.startsWith('Take')?-1:mk.tether.startsWith('Pay')?1:0;const f=((i/4+flow*t*8)%1+1)%1;m.position.copy(curve.getPoint(f));m.visible=flow!==0;});
  }else{rope=null;for(const m of flowMarkers)m.visible=false;}

  sensorRack?.updateExplode(settings.subject==='me120'?ex:0);scene.updateMatrixWorld(true);updateMotion();if(settings.cameraMode!=='orbit')motionOverlay.visible=false;else motionOverlay.visible=true;usvEffects?.update(settings.usvThrusters&&settings.subject==='me120'&&ex===0);
  currentEffects?.update({lights:settings.lights&&settings.subject==='system'&&ex===0,thrusters:settings.thrusters&&settings.subject==='system'&&ex===0});standaloneEffects?.update({lights:settings.lights&&settings.subject==='rov'&&ex===0,thrusters:settings.thrusters&&settings.subject==='rov'&&ex===0});
  if(settings.hardwareMode){if(accessoryDisplays){accessoryDisplays.usv.visible=false;accessoryDisplays.rov.visible=false;}vesselDims.visible=false;rovDims.visible=false;motionOverlay.visible=false;water.visible=false;watergrid.visible=false;}
 }
 function view(which){
  if(components.active)components.close({restore:false,instant:true});
  activeView=which;const subject=settings.subject,ex=settings.explode>0;
  if(subject==='rov'&&!ex&&settings.accessoryMode){frameAccessories();return;}
  if(subject==='rov'&&!ex&&standaloneModel){
   const directions={iso:new T.Vector3(1.35,.75,1.6),side:new T.Vector3(0,.15,1),stern:new T.Vector3(-1,.15,.05),catch:new T.Vector3(1,.3,-.45)};
   const title=host.querySelector('.viewtag'),tools=host.querySelector('.viewtools');
   const safeArea={top:Math.max(96,(title?.offsetTop||0)+(title?.offsetHeight||0)+16),bottom:32};
   if(tools&&tools.offsetTop>host.clientHeight/2)safeArea.bottom=host.clientHeight-tools.offsetTop+16;
   else if(tools)safeArea.top=Math.max(safeArea.top,tools.offsetTop+tools.offsetHeight+16);
   const frame=fitModelFrame({bounds:getHardwareBounds(standaloneModel),direction:directions[which]||directions.iso,camera,width:host.clientWidth,height:host.clientHeight,safeArea});
   if(frame){controls.minDistance=.25;controls.maxDistance=6;camera.position.copy(frame.position);controls.target.copy(frame.target);controls.update();return;}
  }
  if(subject==='me120'&&!ex&&vesselModel&&['iso','side','stern'].includes(which)){
   const bounds=getHardwareBounds(boat);if(accessoryDisplays)bounds.union(getHardwareBounds(accessoryDisplays.usv));
   const directions={iso:new T.Vector3(1,.55,1.05),side:new T.Vector3(0,.15,1),stern:new T.Vector3(-1,.2,.05)};
   const title=host.querySelector('.viewtag'),tools=host.querySelector('.viewtools');const safeArea={top:Math.max(100,(title?.offsetTop||0)+(title?.offsetHeight||0)+16),bottom:32};
   if(tools&&tools.offsetTop>host.clientHeight/2)safeArea.bottom=host.clientHeight-tools.offsetTop+16;
   else if(tools)safeArea.top=Math.max(safeArea.top,tools.offsetTop+tools.offsetHeight+16);
   const frame=fitModelFrame({bounds,direction:directions[which],camera,width:host.clientWidth,height:host.clientHeight,safeArea});
   if(frame){controls.minDistance=.35;controls.maxDistance=Math.max(16,frame.distance*1.6);camera.position.copy(frame.position);controls.target.copy(frame.target);controls.update();return;}
  }
  let target,positions;
  if(subject==='system'&&which==='tether'){target=P(-.85,0,-.1);positions={tether:P(-3.1,-2.2,1.45)};controls.minDistance=.5;controls.maxDistance=10;}else if(subject==='rov'){
   target=ex?P(0,0,.2):P(-.20,.23,.18);controls.minDistance=.25;controls.maxDistance=6;
   positions={iso:P(ex?1.3:1.3,ex?-1.35:1.5,ex?.85:1.10),side:P(0,ex?-1.8:2.0,.40),stern:P(-1.9,.18,.50),catch:P(1.15,-.5,.42)};
  }else if(subject==='system'&&settings.focus&&which!=='mount'){
   const cp=carrier?.position.clone()||P(0,0,-.35);target=cp.clone().add(P(0,0,.38));controls.minDistance=.25;controls.maxDistance=8;
   if(ex)target=P(-.35,0,.1);
   positions={iso:target.clone().add(ex?P(-2.6,-2.5,1.4):P(-1.9,-1.8,1.15)),side:target.clone().add(P(0,-2.1,.10)),stern:target.clone().add(P(-2.1,0,.12)),catch:cp.clone().add(P(-1.15,-1.10,.85))};
  }else if(subject==='system'&&which==='mount'){
   target=mountDatum?.getWorldPosition(new T.Vector3())||P(0,0,.1);controls.minDistance=.2;controls.maxDistance=8;positions={mount:target.clone().add(P(-.85,-.8,.35))};
  }else{
   target=subject==='me120'?P(0,ex?0:.55,ex?1.15:.78):P(-.25,0,.55);controls.minDistance=.55;controls.maxDistance=12;
   positions={iso:subject==='me120'?P(ex?4.9:4.2,ex?-3.3:4.3,ex?3.6:3.0):P(-4.5,4.0,2.6),side:P(-.1,5.6,.9),stern:P(-5.3,0,.9),catch:(carrier?.position.clone()||new T.Vector3()).add(P(-1.1,-1.0,.8))};
   if(which==='catch'&&subject==='system'){target=carrier.position.clone().add(P(-.05,0,.20));}
  }
  camera.position.copy(positions[which]||positions.iso);camera.position.sub(target).multiplyScalar(Math.max(1,1.12/camera.aspect)).add(target);controls.target.copy(target);controls.update();
 }
 function frameAccessories(){
  if(!showroom.root.visible)return;
  const bounds=showroom.bounds();if(showroom.info().selected==='all')bounds.union(getHardwareBounds(isolatedROV));
  const frame=fitModelFrame({bounds,direction:new T.Vector3(.6,.8,1),camera,width:host.clientWidth,height:host.clientHeight,safeArea:{top:125,bottom:35,left:30,right:30},margin:1.1});
  if(frame){controls.minDistance=.22;controls.maxDistance=12;camera.position.copy(frame.position);controls.target.copy(frame.target);controls.update();}
 }
 const accessoryGallery={select(id){showroom.select(id);frameAccessories();},play(on){showroom.play(on);},info:()=>showroom.info()};
 function resize(){const w=host.clientWidth,h=host.clientHeight;if(w<1||h<1)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();if(settings.hardwareMode)frameHardware();else if(components.active)components.reframe();else view(activeView);}new ResizeObserver(resize).observe(host);resize();
 let effectLast=performance.now();function render(now=performance.now()){requestAnimationFrame(render);const dt=Math.max(0,Math.min(.05,(now-effectLast)/1000));effectLast=now;if(!renderActive||document.hidden)return;if(!document.hidden){showroom.update(dt);usvEffects?.tick(dt);currentEffects?.tick(dt);standaloneEffects?.tick(dt);}scene.updateMatrixWorld(true);const onboard=vision.update(document.hidden?0:dt,camera.aspect);chart.visible=!!onboard&&settings.subject!=='system';if(!onboard){controls.update();components.tick(document.hidden?0:dt);}if(settings.hardwareMode!=='links'&&!document.hidden)renderer.render(scene,onboard||camera);}render();build('D');
 return{ready,vision,components,hardware,accessoryGallery,setActive(active){renderActive=Boolean(active);if(renderActive)resize();},setConcept:build,update,view,pose,scene,renderer,camera,async exportGLB(){components.close({restore:false,instant:true});const exporter=new GLTFExporter();const result=await exporter.parseAsync(assets,{binary:true,onlyVisible:true});return new Blob([result],{type:'model/gltf-binary'});},getGeometry(){const mount=mountDatum?.getWorldPosition(new T.Vector3());const adapter=carrier?.localToWorld(new T.Vector3(0,ADAPTER_TOP,0));return{hardware:hardware.info(),accessoryGallery:showroom.info(),sensorRack:sensorRack?.info()||null,accessories:accessoryDisplays?.info()||null,components:components.info(),vision:vision.info(),usvEffects:usvEffects?.info()||null,usvLift:{fraction:settings.usvLift,maxFraction:MAX_LIFT_FRACTION,referenceStrokeM:REFERENCE_STROKE_M,strokeM:MOUNT_STROKE,movingParts:oemMoving.map(p=>({name:p.node.name,position:p.node.position.toArray(),base:p.base.toArray()})),fixedPosition:vesselModel?.getObjectByName('payload_lifter_fixed')?.position.toArray()},rovEffects:(settings.subject==='rov'?standaloneEffects:currentEffects)?.info()||null,guidance:motionData,magnetic:concept==='D'?magneticState(settings.explode?0:settings.progress):null,tether:concept==='D'?{fairlead:[-1.48,0,.34],routeVisible:!!rope,automaticStockPayout:false}:null,mountConnection:concept==='D'&&mount&&adapter?{ringUnderside:mount.toArray(),adapterTop:adapter.toArray(),assembledGapM:settings.explode===0?mount.distanceTo(adapter):null,strokeM:MOUNT_STROKE,measured:false}:null,concept,loaded,subject:settings.subject,carrier:carrier.position.toArray(),parts:mechanism.children.length,units:'metres',nominalHull:[2.5,1.4],nominalRov:[.608,.294,.196],modelStats};}};
}
