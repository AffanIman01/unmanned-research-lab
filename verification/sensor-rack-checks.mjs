// Actual GLB + Three.js geometry verification; no browser or physical validation.
import {registerHooks} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
registerHooks({resolve(spec,context,next){return spec==='three'?{url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:next(spec,context);}});
const {GLTFLoader}=await import('../dist/vendor/GLTFLoader.js');
const {createSensorRack}=await import('../dist/sensor-rack.mjs');
const {sensorComponents}=await import('../dist/sensor-data.mjs');
const {createAccessoryDisplays}=await import('../dist/accessory-display.mjs');
const {REFERENCE_STROKE_M,MAX_LIFT_FRACTION,MAX_LIFT_TRAVEL_M}=await import('../dist/lift.mjs');
const source=await readFile(new URL('../dist/models/me120-reference.glb',import.meta.url));
const vessel=(await new GLTFLoader().parseAsync(source.buffer.slice(source.byteOffset,source.byteOffset+source.byteLength),'')).scene;
const scene=new T.Scene(),frame=new T.Group();frame.rotation.y=Math.PI/2;frame.position.y=-.25;scene.add(frame);frame.add(vessel);vessel.scale.x=1.4/1.4051200151443482;
const antenna=vessel.getObjectByName('antenna');assert(antenna);antenna.position.y-=.342;
const originalAerial=antenna.children.find(n=>n.isMesh&&n.material?.name==='gray');assert(originalAerial);
const rack=createSensorRack();antenna.add(rack.root);const displays=createAccessoryDisplays();scene.add(displays.usv,displays.rov);
const close=(a,b,tolerance=1e-6)=>assert(Math.abs(a-b)<tolerance,`${a} versus ${b}`);
const vecClose=(a,b)=>a.forEach((v,i)=>close(v,b[i]));
const inFrame=(owner,parent)=>{scene.updateMatrixWorld(true);const inverse=parent.matrixWorld.clone().invert(),bounds=new T.Box3();owner.traverse(o=>{if(!o.isMesh)return;o.geometry.computeBoundingBox();bounds.union(o.geometry.boundingBox.clone().applyMatrix4(new T.Matrix4().multiplyMatrices(inverse,o.matrixWorld)));});return bounds;};
const jsonBox=b=>({min:b.min.toArray(),max:b.max.toArray(),size:b.getSize(new T.Vector3()).toArray()});
const sceneSource=await readFile(new URL('../dist/scene.js',import.meta.url),'utf8');
const results=[],measurements={};
const check=(name,fn)=>{fn();results.push({name,passed:true});console.log('PASS '+name);};

check('sensor assembly is attached once to the actual antenna node with finite owner geometry',()=>{
 assert.equal(rack.root.parent,antenna);vecClose(rack.root.position.toArray(),[0,0,0]);vecClose(rack.root.scale.toArray(),[1,1,1]);
 assert.deepEqual(Object.keys(rack.owners).sort(),['front-cover','robosense-lidar','sensor-mount','zed-camera']);
 for(const [id,owner] of Object.entries(rack.owners)){assert.equal(owner.parent,rack.root);const b=inFrame(owner,antenna);assert([...b.min.toArray(),...b.max.toArray()].every(Number.isFinite));assert(b.getSize(new T.Vector3()).toArray().every(v=>v>0));assert(owner.userData.inspect.at.every(Number.isFinite));assert(owner.userData.inspect.size.every(v=>Number.isFinite(v)&&v>0));measurements[id]=jsonBox(b);}
 assert.match(rack.info().status,/estimated/i);
});
check('ZED is below LiDAR and the hood base rests on the reference crossbar level',()=>{
 const camera=inFrame(rack.owners['zed-camera'],antenna),lidar=inFrame(rack.owners['robosense-lidar'],antenna);
 assert(camera.max.y<lidar.min.y);const base=inFrame(rack.root.getObjectByName('sensor_mount_round_base'),antenna);close(base.min.y,1.861);
 const hoodRoof=inFrame(rack.root.getObjectByName('camera_hood_roof'),antenna);assert(camera.max.y<hoodRoof.min.y);assert(camera.min.y>1.913);measurements.cameraLidarSeparationM=lidar.min.y-camera.max.y;
});
check('both camera apertures and window face the boat forward axis',()=>{
 scene.updateMatrixWorld(true);const forward=new T.Vector3(0,0,1).transformDirection(antenna.matrixWorld);
 const front=rack.root.getObjectByName('ZED_glossy_front_window');assert(new T.Vector3(0,0,1).transformDirection(front.matrixWorld).dot(forward)>.999999);
 for(const i of[1,2]){const aperture=rack.root.getObjectByName('ZED_lens_aperture_'+i);assert(new T.Vector3(0,1,0).transformDirection(aperture.matrixWorld).dot(forward)>.999999);}
 const camera=rack.owners['zed-camera'];assert(front.position.z>0);const left=camera.getObjectByName('ZED_lens_aperture_1'),right=camera.getObjectByName('ZED_lens_aperture_2');close(right.position.x-left.position.x,.120);
});
check('inner aerial and sensor housings have nonintersecting local bounding boxes',()=>{
 scene.updateMatrixWorld(true);const p=originalAerial.geometry.attributes.position,mat=new T.Matrix4().multiplyMatrices(antenna.matrixWorld.clone().invert(),originalAerial.matrixWorld),inner=new T.Box3();let vertices=0;
 for(let i=0;i<p.count;i++){const v=new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(mat);if(v.x>-.101&&v.x<-.059){inner.expandByPoint(v);vertices++;}}
 assert(vertices>0);for(const id of['sensor-mount','zed-camera','robosense-lidar']){const b=inFrame(rack.owners[id],antenna);assert(!inner.intersectsBox(b),id+' intersects the inner aerial AABB');}
 measurements.innerAerial=jsonBox(inner);measurements.lidarAerialForeAftGapM=measurements['robosense-lidar'].min[2]-inner.max.z;
});
check('all sensors follow the existing lift by 0.2717 m at the 65% stop without local offsets',()=>{
 close(MAX_LIFT_FRACTION,.65);close(REFERENCE_STROKE_M,.418);close(MAX_LIFT_TRAVEL_M,.2717);
 const baseline=antenna.position.clone();const snapshots=Object.values(rack.owners).map(owner=>({owner,local:owner.position.clone(),world:owner.getWorldPosition(new T.Vector3())}));
 antenna.position.y-=MAX_LIFT_TRAVEL_M;scene.updateMatrixWorld(true);
 for(const s of snapshots){vecClose(s.owner.position.toArray(),s.local.toArray());vecClose(s.owner.getWorldPosition(new T.Vector3()).sub(s.world).toArray(),[0,-.2717,0]);}
 antenna.position.copy(baseline);scene.updateMatrixWorld(true);for(const s of snapshots)vecClose(s.owner.getWorldPosition(new T.Vector3()).toArray(),s.world.toArray());
});
check('exploded view separates the three components and restores exact assembly positions',()=>{
 const ids=['sensor-mount','zed-camera','robosense-lidar'],before=ids.map(id=>rack.owners[id].position.clone());rack.updateExplode(1);
 for(const [i,id] of ids.entries())close(rack.owners[id].position.y-before[i].y,[.035,.135,.270][i]);assert.equal(rack.root.getObjectByName('sensor_service_cable_loops').visible,false);
 rack.updateExplode(0);for(const [i,id] of ids.entries())vecClose(rack.owners[id].position.toArray(),before[i].toArray());assert.equal(rack.root.getObjectByName('sensor_service_cable_loops').visible,true);
 rack.updateExplode(Number.NaN);assert.equal(rack.info().exploded,0);
});
check('two 2.45 m tripod antennas stand on the floor beside and clear of the table',()=>{
 const table=new T.Box3().setFromObject(displays.owners['gcs-table']);const tripodBounds=[];
 for(const id of['gcs-antenna-1','gcs-antenna-2']){
  const owner=displays.owners[id],b=new T.Box3().setFromObject(owner);close(b.min.y,-.28);close(b.getSize(new T.Vector3()).y,2.45);assert(!b.intersectsBox(table));
  let legs=0,feet=0;owner.traverse(n=>{if(n.name.startsWith('tripod_spread_leg_'))legs++;if(n.name.startsWith('tripod_rubber_foot_'))feet++;});assert.equal(legs,3);assert.equal(feet,3);assert(owner.getObjectByName('yellow_tripod_mast'));assert(owner.getObjectByName('long_fiberglass_antenna'));tripodBounds.push(b);measurements[id]=jsonBox(b);
 }
 assert(tripodBounds[0].max.x<table.min.x);assert(tripodBounds[1].min.x>table.max.x);assert(!tripodBounds[0].intersectsBox(tripodBounds[1]));measurements.table=jsonBox(table);measurements.tableSideGapsM=[table.min.x-tripodBounds[0].max.x,tripodBounds[1].min.x-table.max.x];
});
check('ground antenna coax feeds start at each stand and finish at the table radio',()=>{
 for(const [i,id] of['gcs-antenna-1','gcs-antenna-2'].entries()){
  const owner=displays.owners[id],feed=owner.getObjectByName('antenna_coax_feed'),curve=displays.usv.getObjectByName('antenna_'+(i+1)+'_coax').geometry.parameters.path;
  const feedWorld=feed.getWorldPosition(new T.Vector3()),start=displays.usv.localToWorld(curve.getPoint(0));assert(feedWorld.distanceTo(start)<.015);
  const endpoint=displays.usv.localToWorld(curve.getPoint(1));const radio=displays.owners['gcs-radio'];const connectors=[];radio.traverse(n=>{if(n.name==='radio_antenna_connector')connectors.push(n.getWorldPosition(new T.Vector3()));});assert(connectors.some(p=>p.distanceTo(endpoint)<.015));
 }
 assert(displays.usv.getObjectByName('laptop_data_link'));
});
check('scene source imports, registers and updates sensor APIs and retains shared lift ownership',()=>{
 for(const d of sensorComponents){assert(rack.owners[d.owner]);assert.equal(d.subject,'me120');assert.equal(d.autoFrame,true);if(d.frameOwner)assert.equal(d.frameOwner,'sensor-rack');}
 assert.equal(sensorComponents.length,3);
 assert.match(sceneSource,/import\s*\{createSensorRack\}\s*from\s*['"].\/sensor-rack\.mjs/);
 assert.match(sceneSource,/antenna\.add\(sensorRack\.root\)/);
 assert.match(sceneSource,/extraComponents:\[\.\.\.accessoryComponents,\.\.\.sensorComponents\]/);
 assert.match(sceneSource,/sensorRack\?\.updateExplode\(/);
 assert.match(sceneSource,/sensorRack:sensorRack\?\.info\(\)/);
 assert.match(sceneSource,/\['payload_lifter_moving','payload_mounting_ring','antenna'\]/);
});

await writeFile(new URL('./sensor-rack-results.json',import.meta.url),JSON.stringify({revision:'Y',checks:results.length,passed:results.length,scope:'Actual GLB + Three.js geometry and source integration. Bounding-box clearances are visual-model checks, not mechanical validation.',browserPreview:'Not run: control-browser unavailable',results,measurements},null,2)+'\n');
