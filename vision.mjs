import * as T from 'three';
// Synthetic optics; angles and FOV are preview settings, not camera specifications.
export function createVision({getUsvAnchor,getRovAnchor}){
 const camera=new T.PerspectiveCamera(70,1,.006,100);
 let mode='orbit',yaw=0,pitch=-12,zoom=1,position=[0,0,0],direction=[1,0,0];
 const keys=new Set(),rad=Math.PI/180;
 function clear(){keys.clear();}
 function setMode(next){mode=['usv','rov'].includes(next)?next:'orbit';clear();}
 function hold(key,down){if(!down){keys.delete(key);return;}if(mode==='usv'&&['w','a','s','d'].includes(key))keys.add(key);}
 function home(){yaw=0;pitch=-12;zoom=1;clear();}
 function setZoom(value){zoom=Math.min(4,Math.max(1,Number(value)||1));}
 function update(dt,aspect){
  if(mode==='orbit')return null;
  if(mode==='usv'){
   yaw+=((keys.has('a')?1:0)-(keys.has('d')?1:0))*45*dt;
   yaw=((yaw+180)%360+360)%360-180;
   pitch=T.MathUtils.clamp(pitch+((keys.has('w')?1:0)-(keys.has('s')?1:0))*35*dt,-80,0);
  }
  const anchor=mode==='usv'?getUsvAnchor():getRovAnchor();if(!anchor)return null;
  const localDirection=mode==='usv'?new T.Vector3(Math.sin(yaw*rad)*Math.cos(pitch*rad),Math.sin(pitch*rad),Math.cos(yaw*rad)*Math.cos(pitch*rad)):new T.Vector3(0,0,1);
  const localPoint=mode==='usv'?new T.Vector3(0,1.735,.108).addScaledVector(localDirection,.060):new T.Vector3(0,.098,.311);
  const origin=anchor.localToWorld(localPoint),forward=localDirection.transformDirection(anchor.matrixWorld);
  const up=new T.Vector3(0,1,0).transformDirection(anchor.matrixWorld);
  camera.position.copy(origin);camera.up.copy(up);camera.lookAt(origin.clone().add(forward));camera.aspect=aspect;camera.fov=mode==='usv'?70/zoom:80;camera.updateProjectionMatrix();
  position=origin.toArray();direction=forward.toArray();return camera;
 }
 return{camera,setMode,hold,clear,home,setZoom,update,info:()=>({mode,yaw,pitch,zoom,position,direction,pressed:[...keys],synthetic:true})};
}
