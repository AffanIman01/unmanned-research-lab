export type PoolState={x:number;z:number;heading:number;speed:number;yaw:number};
export const freshPoolState=():PoolState=>({x:0,z:0,heading:0,speed:0,yaw:0});
// Illustrative low-speed differential thrust, not calibrated hydrodynamics.
export function stepPool(s:PoolState,throttle:number,steer:number,dt:number){
 const t=Math.min(Math.max(dt,0),.05);
 const speed=s.speed+(throttle*1.2-s.speed)*Math.min(1,t*1.8);
 const yaw=s.yaw+(steer*.65-s.yaw)*Math.min(1,t*3);
 const heading=s.heading+yaw*t;
 const x=s.x+Math.sin(heading)*speed*t,z=s.z+Math.cos(heading)*speed*t;
 const hit=Math.abs(x)>5.75||Math.abs(z)>10.75;
 return {state:{x:Math.max(-5.75,Math.min(5.75,x)),z:Math.max(-10.75,Math.min(10.75,z)),heading,speed:hit?0:speed,yaw},hit};
}
