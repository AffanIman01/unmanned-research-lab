import * as THREE from 'three';

// Visual traffic on the finite training segment. These are not live bridge
// traffic data, vehicle dynamics or loads applied to the bridge structure.
export const BRIDGE_ROAD_Y=10.31;
export const TRAFFIC_START_X=-40;
export const TRAFFIC_END_X=129;
export const TRAFFIC_VEHICLES_PER_LANE=4;
export const trafficLanes=[
 {z:8.05,direction:1,speed:12.5,offset:0},
 {z:11.95,direction:1,speed:15,offset:19},
 {z:18.05,direction:-1,speed:14,offset:8},
 {z:21.95,direction:-1,speed:11,offset:27},
] as const;
export type TrafficVehicle={lane:number,index:number,kind:'car'|'van',color:number};
export const trafficVehicles:TrafficVehicle[]=trafficLanes.flatMap((_,lane)=>
 Array.from({length:TRAFFIC_VEHICLES_PER_LANE},(_,index)=>({
  lane,index,kind:(lane===0&&index===1)||(lane===3&&index===2)?'van':'car',color:(lane*3+index)%8,
 }))
);
export function trafficPose(vehicle:TrafficVehicle,time:number){
 const lane=trafficLanes[vehicle.lane],length=TRAFFIC_END_X-TRAFFIC_START_X;
 const distance=lane.offset+vehicle.index*length/TRAFFIC_VEHICLES_PER_LANE+lane.direction*lane.speed*time;
 return {x:TRAFFIC_START_X+((distance%length)+length)%length,y:BRIDGE_ROAD_Y,z:lane.z,yaw:lane.direction===1?0:Math.PI,speed:lane.speed};
}

export function createBridgeTraffic(){
 const root=new THREE.Group();root.name='Simulated bridge road traffic';
 const bodyColors=[0xf0eee5,0x283747,0xb3362f,0x97a7ad,0x2f6171,0xd2c4a4,0x31544d,0x9397a1].map(color=>new THREE.MeshStandardMaterial({color,metalness:.35,roughness:.36}));
 const glass=new THREE.MeshStandardMaterial({color:0x244956,metalness:.45,roughness:.18});
 const rubber=new THREE.MeshStandardMaterial({color:0x1b2124,roughness:.98});
 const chrome=new THREE.MeshStandardMaterial({color:0xbac4c9,metalness:.8,roughness:.3});
 const headlamp=new THREE.MeshStandardMaterial({color:0xfff3ce,emissive:0xffe9b0,emissiveIntensity:.6,roughness:.22});
 const tailLamp=new THREE.MeshStandardMaterial({color:0xcc3028,emissive:0x9b1712,emissiveIntensity:.35,roughness:.25});
 const plate=new THREE.MeshStandardMaterial({color:0x111619,roughness:.8});
 const boxGeometry=new THREE.BoxGeometry(1,1,1);
 const wheelGeometry=new THREE.CylinderGeometry(1,1,1,12);wheelGeometry.rotateX(Math.PI/2);
 const cabinShape=new THREE.Shape();cabinShape.moveTo(-1.22,.91);cabinShape.lineTo(-.77,1.46);cabinShape.lineTo(.65,1.46);cabinShape.lineTo(1.13,.91);cabinShape.closePath();
 const cabinGeometry=new THREE.ExtrudeGeometry(cabinShape,{depth:1.43,bevelEnabled:false,steps:1});cabinGeometry.translate(0,0,-.715);
 const objects=trafficVehicles.map(vehicle=>{
  const car=new THREE.Group();car.name=`Traffic ${vehicle.kind} / lane ${vehicle.lane+1} / ${vehicle.index+1}`;root.add(car);
  const paint=bodyColors[vehicle.color];
  const box=(w:number,h:number,d:number,x:number,y:number,z:number,material:THREE.Material)=>{const part=new THREE.Mesh(boxGeometry,material);part.scale.set(w,h,d);part.position.set(x,y,z);car.add(part);return part;};
  const van=vehicle.kind==='van',length=van?5.1:4.35,width=van?1.95:1.8,radius=van?.35:.31,wheelbase=van?3.12:2.64;
  box(length-.12,.46,width,0,.72,0,paint);
  box(length,.14,width-.02,0,.44,0,rubber);
  if(van){
   box(4.7,1.38,1.91,-.08,1.62,0,paint);
   // Front screen, two cab windows and a closed cargo body.
   box(.032,.76,1.64,2.288,1.76,0,glass);
   for(const side of [-1,1]){box(1.0,.73,.035,1.47,1.76,side*.963,glass);box(.12,1.2,.042,.88,1.60,side*.97,paint);box(.20,.04,.045,.98,1.10,side*.979,chrome);}
   box(.025,.65,1.60,-2.446,1.83,0,glass);box(.06,1.14,.06,-2.463,1.60,0,paint);
  }else{
   const cabin=new THREE.Mesh(cabinGeometry,glass);car.add(cabin);
   box(1.54,.105,1.50,-.07,1.485,0,paint);
   for(const side of [-1,1]){box(.105,.51,.055,-.08,1.205,side*.738,paint);box(2.4,.06,.055,-.05,.955,side*.755,chrome);box(.20,.025,.026,-.57,.90,side*.92,chrome);}
   box(1.13,.12,1.72,1.53,.96,0,paint);box(.72,.11,1.70,-1.79,.96,0,paint);
  }
  for(const side of [-1,1]){
   box(.16,.14,.22,van?1.82:.92,van?1.49:1.13,side*(width/2+.07),paint);
   box(.025,.19,.43,length/2-.01,.77,side*width*.33,headlamp);
   box(.025,.20,.32,-length/2+.01,.76,side*width*.36,tailLamp);
  }
  box(.025,.14,.56,length/2+.004,.50,0,plate);box(.025,.14,.56,-length/2-.004,.52,0,plate);
  const wheels:THREE.Group[]=[];
  for(const x of [-wheelbase/2,wheelbase/2])for(const side of [-1,1]){
   const wheel=new THREE.Group();wheel.position.set(x,radius,side*(width/2-.06));car.add(wheel);wheels.push(wheel);
   const tyre=new THREE.Mesh(wheelGeometry,rubber);tyre.scale.set(radius,radius,.21);wheel.add(tyre);
   const rim=new THREE.Mesh(wheelGeometry,chrome);rim.scale.set(radius*.60,radius*.60,.22);wheel.add(rim);
   // A dark hub stripe makes rolling visible from the side without extra lights.
   const hub=new THREE.Mesh(boxGeometry,rubber);hub.scale.set(radius*.95,.045,.226);wheel.add(hub);
  }
  car.userData.traffic={...vehicle,length,width,wheelRadius:radius};
  return {car,wheels,radius,vehicle};
 });
 let elapsed=0;
 const update=(dt:number,enabled:boolean)=>{
  root.visible=enabled;
  if(enabled&&Number.isFinite(dt))elapsed+=Math.max(0,dt);
  for(const {car,wheels,radius,vehicle} of objects){
   const pose=trafficPose(vehicle,elapsed);car.position.set(pose.x,pose.y,pose.z);car.rotation.y=pose.yaw;
   for(const wheel of wheels)wheel.rotation.z=-elapsed*pose.speed/radius;
  }
 };
 update(0,true);
 return {root,count:trafficVehicles.length,update};
}
