import {Vector3} from 'three';

// Local training coordinates, not surveyed Penang Bridge geometry or defects.
export const BRIDGE_DEPTH=6.5;
export const BRIDGE_LAUNCH={x:-26,z:-10};
export const BRIDGE_STATION={x:12,z:4};
export const BRIDGE_ROUTE=[{x:-18,z:-7},{x:0,z:1},BRIDGE_STATION];
export type InspectionTarget={id:string;name:string;kind:'crack'|'spall'|'joint'|'growth'|'scour';position:[number,number,number];normal:[number,number,number];description:string;task:string};
export const inspectionTargets:InspectionTarget[]=[
 {id:'P1-01',name:'Upper pier · crack',kind:'crack',position:[11.4,-1.05,8.47],normal:[0,0,-1],description:'Synthetic branching crack on the seaward face.',task:'Record an overview, then a steady close view. Note orientation and extent; image pixels alone do not establish crack width.'},
 {id:'P1-02',name:'Concrete loss · spall',kind:'spall',position:[12.65,-2.25,8.47],normal:[0,0,-1],description:'Synthetic spalled patch with exposed reinforcement.',task:'Document patch boundaries and visible steel. Visual evidence cannot determine hidden corrosion or section loss.'},
 {id:'P1-03',name:'Construction joint',kind:'joint',position:[11.4,-3.45,8.47],normal:[0,0,-1],description:'Synthetic joint discontinuity and local staining.',task:'Check continuity along the joint and capture a stable view of the change in surface.'},
 {id:'P1-04',name:'Marine growth',kind:'growth',position:[12.65,-4.55,8.47],normal:[0,0,-1],description:'Training patch showing growth that obscures concrete.',task:'Record visibility limitations. Do not mark obscured concrete as defect-free.'},
 {id:'P1-05',name:'Foundation · scour cue',kind:'scour',position:[11.65,-6.1,7.75],normal:[0,1,0],description:'Synthetic seabed depression beside the foundation.',task:'Tilt the camera down and document the bed/pier interface. A video cue is not a bathymetric scour measurement.'},
];
export type BridgeObstacle={x:number;z:number;halfX:number;halfZ:number;minY:number;maxY:number;label:string};
export const bridgeObstacles:BridgeObstacle[]=[
 {x:-48,z:0,halfX:16,halfZ:60,minY:-20,maxY:5,label:'Coastline'},
 {x:-28,z:-13.5,halfX:4,halfZ:1.5,minY:-2,maxY:.5,label:'Launch pontoon'},
 ...[12,67,122].flatMap(x=>[10,20].map(z=>({x,z,halfX:1.6,halfZ:1.5,minY:-6.5,maxY:9,label:'Bridge pier'}))),
];
export function resolveBridgeCollision(position:{x:number;y:number;z:number},radius:number){
 let hit='';
 for(const b of bridgeObstacles){
  if(position.y+radius<b.minY||position.y-radius>b.maxY)continue;
  const left=b.x-b.halfX-radius,right=b.x+b.halfX+radius,front=b.z-b.halfZ-radius,back=b.z+b.halfZ+radius;
  if(position.x>left&&position.x<right&&position.z>front&&position.z<back){
   const distances=[position.x-left,right-position.x,position.z-front,back-position.z];
   const side=distances.indexOf(Math.min(...distances));
   if(side===0)position.x=left;if(side===1)position.x=right;if(side===2)position.z=front;if(side===3)position.z=back;
   hit=b.label+' · clearance boundary';
  }
 }
 return hit;
}
export function segmentBlocked(a:{x:number;y:number;z:number},b:{x:number;y:number;z:number},padding=.05){
 for(const o of bridgeObstacles){
  let low=0,high=1;
  for(const axis of ['x','y','z'] as const){
   const lo=axis==='x'?o.x-o.halfX-padding:axis==='z'?o.z-o.halfZ-padding:o.minY-padding;
   const hi=axis==='x'?o.x+o.halfX+padding:axis==='z'?o.z+o.halfZ+padding:o.maxY+padding;
   const d=b[axis]-a[axis];
   if(Math.abs(d)<1e-8){if(a[axis]<lo||a[axis]>hi){high=-1;break;}}
   else{const t1=(lo-a[axis])/d,t2=(hi-a[axis])/d;low=Math.max(low,Math.min(t1,t2));high=Math.min(high,Math.max(t1,t2));}
  }
  if(low<=high&&high>=0&&low<=1)return true;
 }
 return false;
}
export type InspectionGate={distance:number;facing:number;speed:number;clear:boolean;ready:boolean;reason:string};
export function inspectionGate(target:InspectionTarget,camera:Vector3,forward:Vector3,speed:number,lights:boolean,visibility:number,free:boolean,blocked:boolean):InspectionGate{
 const point=new Vector3(...target.position),delta=point.clone().sub(camera),distance=delta.length();
 const facing=distance>0?forward.dot(delta.clone().normalize()):-1;
 const front=new Vector3(...target.normal).dot(camera.clone().sub(point).normalize())>.35;
 const clear=!blocked&&front;
 const reason=!free?'Deploy the ROV first':!lights?'Switch on the ROV lights · F':!clear?'Approach the exposed face; keep the tether clear':distance<.55?'Back away from the surface':distance>Math.min(2.5,visibility*.7)?'Move closer to the target':facing<Math.cos(20*Math.PI/180)?'Centre the target in the ROV camera':speed>.16?'Slow down for a steady frame':'Hold steady · ready to record';
 return {distance,facing,speed,clear,ready:reason==='Hold steady · ready to record',reason};
}
export type InspectionRecord={id:string;target:string;kind:string;time:string;depth:number;distance:number;heading:number;roll:number;cameraTilt:number;visibility:number;current:number;image:string;note:string};
export type BridgeTelemetry={usvX:number;usvZ:number;rovX:number;rovZ:number;stationDistance:number;transit:boolean;gate:InspectionGate;dwell:number;tetherWarning:string;notice:string};
export const initialBridgeTelemetry:BridgeTelemetry={usvX:BRIDGE_LAUNCH.x,usvZ:BRIDGE_LAUNCH.z,rovX:BRIDGE_LAUNCH.x,rovZ:BRIDGE_LAUNCH.z,stationDistance:40,transit:false,gate:{distance:0,facing:0,speed:0,clear:false,ready:false,reason:'Sail to the inspection station'},dwell:0,tetherWarning:'',notice:''};
