import {MathUtils,Object3D,PerspectiveCamera,Quaternion,Vector3} from 'three';

export type PTZSettings={view:boolean;pan:number;tilt:number;zoom:number};
export const initialPTZ:PTZSettings={view:false,pan:0,tilt:0,zoom:1};
// Lens datum in the authored antenna group. Camera optics and movement limits
// are trial settings, not verified Hikvision specifications.
export const PTZ_LENS=new Vector3(0,1.735,.108);
const rotation=new Quaternion(),direction=new Vector3(),eye=new Vector3(),up=new Vector3();
export function updateUSVPTZ(camera:PerspectiveCamera,mast:Object3D,settings:PTZSettings){
 mast.updateWorldMatrix(true,false);
 const pan=MathUtils.degToRad(settings.pan),tilt=MathUtils.degToRad(settings.tilt);
 direction.set(Math.sin(pan)*Math.cos(tilt),Math.sin(tilt),Math.cos(pan)*Math.cos(tilt));
 // Offset just outside the virtual dome to avoid clipping its own glass shell.
 eye.copy(PTZ_LENS).addScaledVector(direction,.060);mast.localToWorld(eye);
 mast.getWorldQuaternion(rotation);direction.applyQuaternion(rotation);up.set(0,1,0).applyQuaternion(rotation);
 camera.position.copy(eye);camera.up.copy(up);camera.lookAt(eye.clone().add(direction));
 const fov=MathUtils.radToDeg(2*Math.atan(Math.tan(MathUtils.degToRad(68)/2)/MathUtils.clamp(settings.zoom,1,6)));
 if(Math.abs(camera.fov-fov)>.001){camera.fov=fov;camera.updateProjectionMatrix();}
 return {height:eye.y,fov};
}
