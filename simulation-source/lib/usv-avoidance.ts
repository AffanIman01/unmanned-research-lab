import {bridgeObstacles} from './bridge-inspection';

// Manufacturer reference: ME120 camera + millimetre-wave radar, 50 m detection.
// This ideal 360° geometric scan and local planner are training assumptions,
// not the manufacturer's sensor field of view, firmware or collision guarantee.
export const USV_SENSOR_RANGE=50;
export const USV_HULL_RADIUS=1.35;
export type AvoidanceMode='off'|'warn'|'assist';
export type USVEnvironment='pool'|'sea'|'bridge';
export type PlanarPoint={x:number;z:number};
type ObstacleBase=PlanarPoint&{id:string;label:string;kind:'buoy'|'wall'|'pier'|'coast'|'pontoon'};
export type USVObstacle=ObstacleBase&({shape:'circle';radius:number}|{shape:'box';halfX:number;halfZ:number});
export type TrainingBuoy=ObstacleBase&{kind:'buoy';shape:'circle';radius:number};
export type USVContact=PlanarPoint&{id:string;label:string;kind:USVObstacle['kind'];distance:number;clearance:number;bearing:number};
export type AvoidanceInput={position:PlanarPoint;velocity:PlanarPoint;heading:number;yawRate:number;throttle:number;steer:number;obstacles:USVObstacle[];mode:AvoidanceMode;canAssist:boolean;preferredTurn?:number};
export type AvoidanceResult={throttle:number;steer:number;contacts:USVContact[];nearestClearance:number;forwardClearance:number;state:'off'|'clear'|'warning'|'avoiding'|'braking'|'monitor';message:string;active:boolean;turn:number};
const clamp=(n:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,n));
const wrap=(n:number)=>Math.atan2(Math.sin(n),Math.cos(n));

export function trainingBuoys(environment:USVEnvironment):TrainingBuoy[]{
 const points=environment==='pool'?[[-3,4],[3,-5]]:environment==='bridge'?[[-6,7],[23,-6]]:[[0,12],[-10,-8],[16,4]];
 return points.map(([x,z],i)=>({id:`${environment}-buoy-${i+1}`,label:`Training buoy ${i+1}`,kind:'buoy',shape:'circle',x,z,radius:environment==='pool'?.25:.45}));
}

export function getUSVObstacles(environment:USVEnvironment,includeBuoys=true):USVObstacle[]{
 const obstacles:USVObstacle[]=environment==='bridge'?bridgeObstacles.filter(b=>b.minY<=0&&b.maxY>=0).map((b,i)=>({id:`bridge-obstacle-${i}`,label:b.label,kind:b.label==='Coastline'?'coast':b.label==='Launch pontoon'?'pontoon':'pier',shape:'box',x:b.x,z:b.z,halfX:b.halfX,halfZ:b.halfZ})):environment==='pool'?[
  {id:'pool-west',label:'Pool wall',kind:'wall',shape:'box',x:-8,z:0,halfX:.5,halfZ:13},
  {id:'pool-east',label:'Pool wall',kind:'wall',shape:'box',x:8,z:0,halfX:.5,halfZ:13},
  {id:'pool-south',label:'Pool wall',kind:'wall',shape:'box',x:0,z:-13,halfX:8.5,halfZ:.5},
  {id:'pool-north',label:'Pool wall',kind:'wall',shape:'box',x:0,z:13,halfX:8.5,halfZ:.5},
 ]:[];
 return includeBuoys?[...obstacles,...trainingBuoys(environment)]:obstacles;
}

function nearestPoint(position:PlanarPoint,o:USVObstacle):PlanarPoint{
 if(o.shape==='box')return {x:clamp(position.x,o.x-o.halfX,o.x+o.halfX),z:clamp(position.z,o.z-o.halfZ,o.z+o.halfZ)};
 const dx=position.x-o.x,dz=position.z-o.z,d=Math.hypot(dx,dz);
 if(d<=o.radius)return {...position};
 return {x:o.x+dx/d*o.radius,z:o.z+dz/d*o.radius};
}

export function scanUSVObstacles(position:PlanarPoint,heading:number,obstacles:USVObstacle[],range=USV_SENSOR_RANGE):USVContact[]{
 const contacts:USVContact[]=[];
 for(const o of obstacles){
  const p=nearestPoint(position,o),dx=p.x-position.x,dz=p.z-position.z,distance=Math.hypot(dx,dz);
  if(distance>range)continue;
  contacts.push({...p,id:o.id,label:o.label,kind:o.kind,distance,clearance:distance-USV_HULL_RADIUS,bearing:wrap(Math.atan2(dx,dz)-heading)});
 }
 return contacts.sort((a,b)=>a.distance-b.distance);
}

// Distance along a ray to the obstacle enlarged by the vessel's conservative
// planar radius. Inflated rectangles also conservatively include their corners.
export function obstacleRayDistance(position:PlanarPoint,heading:number,o:USVObstacle,padding=USV_HULL_RADIUS):number{
 const dx=Math.sin(heading),dz=Math.cos(heading);
 if(o.shape==='circle'){
  const x=position.x-o.x,z=position.z-o.z,r=o.radius+padding,c=x*x+z*z-r*r;
  if(c<=0)return 0;
  const b=x*dx+z*dz,disc=b*b-c;
  if(disc<0)return Infinity;
  const t=-b-Math.sqrt(disc);return t>=0?t:Infinity;
 }
 let lo=0,hi=Infinity;
 for(const axis of ['x','z'] as const){
  const direction=axis==='x'?dx:dz,half=(axis==='x'?o.halfX:o.halfZ)+padding;
  const min=o[axis]-half-position[axis],max=o[axis]+half-position[axis];
  if(Math.abs(direction)<1e-9){if(min>0||max<0)return Infinity;continue;}
  lo=Math.max(lo,Math.min(min/direction,max/direction));hi=Math.min(hi,Math.max(min/direction,max/direction));
  if(lo>hi)return Infinity;
 }
 return hi>=0?lo:Infinity;
}
function corridorDistance(position:PlanarPoint,heading:number,obstacles:USVObstacle[],padding=USV_HULL_RADIUS){
 let distance=Infinity;
 for(const o of obstacles)distance=Math.min(distance,obstacleRayDistance(position,heading,o,padding));
 return distance;
}

export function applyUSVAvoidance(input:AvoidanceInput):AvoidanceResult{
 const {position,velocity,heading,yawRate,obstacles,mode,canAssist}=input;
 const throttle=clamp(input.throttle,-1,1),steer=clamp(input.steer,-1,1);
 const contacts=scanUSVObstacles(position,heading,obstacles),visible=new Set(contacts.map(c=>c.id));
 const detected=obstacles.filter(o=>visible.has(o.id));
 const surge=velocity.x*Math.sin(heading)+velocity.z*Math.cos(heading),speed=Math.hypot(velocity.x,velocity.z);
 const reverse=throttle<-.03||(Math.abs(throttle)<.03&&surge<-.08),sign=reverse?-1:1;
 const travelHeading=heading+(reverse?Math.PI:0);
 const forwardClearance=corridorDistance(position,travelHeading,detected);
 const motionHeading=speed>.1?Math.atan2(velocity.x,velocity.z):travelHeading;
 const motionClearance=corridorDistance(position,motionHeading,detected);
 const nearestClearance=contacts[0]?.clearance??Infinity;
 const base:AvoidanceResult={throttle,steer,contacts,nearestClearance,forwardClearance,state:'clear',message:'Path clear',active:false,turn:0};
 if(mode==='off')return {...base,state:'off',message:'Avoidance off · pilot controls unchanged'};
 const moving=Math.abs(throttle)>.03||speed>.1;
 const lookAhead=Math.max(4,1.5+speed*2+speed*speed/(2*.45));
 const hazard=moving&&(forwardClearance<lookAhead||motionClearance<1+speed*2+speed*speed/(2*.45));
 if(!canAssist)return {...base,state:'monitor',message:nearestClearance<2?'ROV deployed · nearby obstacle, monitor station':'ROV deployed · monitor only; station hold retained'};
 if(!hazard)return {...base,state:nearestClearance<1?'warning':'clear',message:nearestClearance<1?'Close obstacle · check clearance':'Path clear'};
 if(mode==='warn')return {...base,state:'warning',message:`Obstacle ahead · ${Math.max(0,Math.min(forwardClearance,motionClearance)).toFixed(1)} m hull clearance`};

 // Score a short fan of corridors, retaining a bypass side until the original
 // direction clears. This is a local geometric planner, not a global navigator.
 const requestedHeading=travelHeading+steer*.45,previous=Math.sign(input.preferredTurn??0);
 let best={offset:0,clearance:forwardClearance,score:-Infinity};
 for(const degrees of [0,20,-20,40,-40,65,-65,90,-90,120,-120]){
  const offset=degrees*Math.PI/180,candidate=travelHeading+offset;
  const clearance=corridorDistance(position,candidate,detected,USV_HULL_RADIUS+.25);
  const free=Math.min(lookAhead+2,clearance),deviation=Math.abs(wrap(candidate-requestedHeading));
  const side=Math.sign(offset),sideBonus=previous&&side===previous?.65:0;
  const score=free-deviation*.8+sideBonus-(clearance<.75?5:0);
  if(score>best.score)best={offset,clearance,score};
 }
 const turn=best.offset===0?previous:Math.sign(best.offset);
 const commandedSteer=clamp(best.offset*1.9-yawRate*1.7,-1,1);
 const safeDistance=Math.max(0,Math.min(forwardClearance,motionClearance)-.65);
 const safeSpeed=Math.sqrt(2*.45*safeDistance);
 const desiredSpeed=Math.min(Math.abs(throttle)*1.25,safeSpeed)*Math.max(0,Math.cos(best.offset))**2;
 const signedTravelSpeed=surge*sign;
 // Retain continuous rigid-body inertia. Opposing thrust is proportional to
 // excess surge; no position or velocity changes occur in the assistance path.
 let outputThrottle=sign*clamp((desiredSpeed-signedTravelSpeed)*1.7,-1,Math.abs(throttle));
 const blocked=best.clearance<1||Math.min(forwardClearance,motionClearance)<.55;
 if(blocked)outputThrottle=-clamp(surge*1.9,-1,1);
 const braking=outputThrottle*surge<-.015||blocked;
 return {...base,throttle:outputThrottle,steer:commandedSteer,state:braking?'braking':'avoiding',message:braking?'Braking for obstacle · turning to clear water':'Avoidance assist · reduced speed and clear-corridor steering',active:true,turn};
}

// Last-resort contact response for visible training buoys. Scene walls/piers
// retain their existing collision response. Only inward velocity is removed.
export function resolveBuoyCollision(position:PlanarPoint,velocity:PlanarPoint,obstacles:USVObstacle[]):string{
 let label='';
 for(const o of obstacles){
  if(o.shape!=='circle'||o.kind!=='buoy')continue;
  const dx=position.x-o.x,dz=position.z-o.z,d=Math.hypot(dx,dz),radius=o.radius+USV_HULL_RADIUS;
  if(d>=radius)continue;
  const nx=d>1e-8?dx/d:1,nz=d>1e-8?dz/d:0;
  position.x=o.x+nx*radius;position.z=o.z+nz*radius;
  const inward=velocity.x*nx+velocity.z*nz;
  if(inward<0){velocity.x-=inward*nx;velocity.z-=inward*nz;}
  label=`${o.label} · contact boundary`;
 }
 return label;
}
