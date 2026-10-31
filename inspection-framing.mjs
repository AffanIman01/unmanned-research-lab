import * as T from 'three';

// Fit the equipment into the part of the viewport left clear by its information card.
export function fitInspectionFrame({bounds,direction,camera,width,height,panelWidth=304,panelHeight=320}) {
 if(bounds.isEmpty())return null;
 const mobile=width<650,d=direction.clone().normalize();
 const right=new T.Vector3().crossVectors(new T.Vector3(0,1,0),d).normalize();
 const up=new T.Vector3().crossVectors(d,right).normalize();
 const center=bounds.getCenter(new T.Vector3());
 const x0=-.92,x1=mobile?.92:Math.max(-.05,1-2*(panelWidth+42)/width);
 const y0=mobile?Math.min(.5,-1+2*(panelHeight+26)/height):-.88,y1=.90;
 const cx=(x0+x1)/2,cy=(y0+y1)/2;
 const ty=Math.tan(T.MathUtils.degToRad(camera.fov/2)),tx=ty*camera.aspect;
 let distance=.2;
 for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
  const delta=new T.Vector3(x,y,z).sub(center),px=delta.dot(right),py=delta.dot(up),pz=delta.dot(d);
  distance=Math.max(distance,pz+camera.near+.1,
   (px+x1*pz*tx)/((x1-cx)*tx),(-px-x0*pz*tx)/((cx-x0)*tx),
   (py+y1*pz*ty)/((y1-cy)*ty),(-py-y0*pz*ty)/((cy-y0)*ty));
 }
 distance*=1.07;
 const target=center.clone().addScaledVector(right,-cx*distance*tx).addScaledVector(up,-cy*distance*ty);
 return {target,position:target.clone().addScaledVector(d,distance),distance};
}
