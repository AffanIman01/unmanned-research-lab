import * as THREE from 'three';
import {BRIDGE_ROUTE,BRIDGE_STATION,inspectionTargets} from './bridge-inspection';
import {createBridgeTraffic} from './bridge-traffic';

// A deliberately simplified marine-approach segment, with 55 m nominal spans.
// No model element represents a surveyed location or an observed bridge defect.
export function createBridgeScene(){
 const root=new THREE.Group();root.name='Penang-inspired coastal inspection sector';
 const concrete=new THREE.MeshStandardMaterial({color:0xb7b6aa,roughness:.94});
 const wetConcrete=new THREE.MeshStandardMaterial({color:0x788e80,roughness:.96});
 const dark=new THREE.MeshStandardMaterial({color:0x42494b,roughness:.8});
 const edge=new THREE.MeshStandardMaterial({color:0xd4d6ce,roughness:.75});
 const steel=new THREE.MeshStandardMaterial({color:0x7e969a,metalness:.65,roughness:.4});
 const mesh=(g:THREE.BufferGeometry,m:THREE.Material,p:number[])=>{const o=new THREE.Mesh(g,m);o.position.set(p[0],p[1],p[2]);root.add(o);return o;};
 const box=(w:number,h:number,d:number,x:number,y:number,z:number,m=concrete)=>mesh(new THREE.BoxGeometry(w,h,d),m,[x,y,z]);
 const beam=(a:THREE.Vector3,b:THREE.Vector3,r:number,m:THREE.Material)=>{const o=mesh(new THREE.CylinderGeometry(r,r,a.distanceTo(b),8),m,a.clone().add(b).multiplyScalar(.5).toArray());o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize());return o;};
 const labels:THREE.Texture[]=[];
 const label=(text:string,p:number[],color='#d4e6e3',scale=6)=>{const c=document.createElement('canvas');c.width=512;c.height=112;const ctx=c.getContext('2d')!;ctx.fillStyle='#112b35e8';ctx.fillRect(0,0,512,112);ctx.strokeStyle='#557a81';ctx.strokeRect(2,2,508,108);ctx.fillStyle=color;ctx.font='600 34px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,56);const t=new THREE.CanvasTexture(c);labels.push(t);const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,depthTest:true}));s.position.set(p[0],p[1],p[2]);s.scale.set(scale,scale*112/512,1);root.add(s);return s;};
 // Shallow training seabed, shoreline revetment and a small launch pontoon.
 const sand=new THREE.MeshStandardMaterial({color:0x738d80,roughness:1});
 const bed=new THREE.PlaneGeometry(180,140,90,70);bed.rotateX(-Math.PI/2);
 const bp=bed.attributes.position;
 for(let i=0;i<bp.count;i++){const x=bp.getX(i),z=bp.getZ(i);const depression=.4*Math.exp(-((x-11.65)**2+(z-7.75)**2)/2);bp.setY(i,-6.1-depression+.07*Math.sin(x*.6)*Math.cos(z*.8));}bed.computeVertexNormals();mesh(bed,sand,[0,0,0]);
 box(30,10,140,-47,-2,0,new THREE.MeshStandardMaterial({color:0x637b56,roughness:1}));
 box(2,3,140,-32,.0,0,new THREE.MeshStandardMaterial({color:0x828578,roughness:1}));
 for(let i=0;i<100;i++){const rock=mesh(new THREE.DodecahedronGeometry(.5+(i%4)*.12),concrete,[-30.8-(i%3)*.36,-.5+(i%5)*.18,-60+i*1.2]);rock.scale.set(1.1,.7,1);rock.rotation.set(i*.2,i*.73,0);}
 box(8,.35,3,-28,.25,-13.5,dark);for(const x of [-31,-25])for(const z of [-14.5,-12.5])box(.16,3,.16,x,-.9,z,steel);
 label('COASTAL LAUNCH',[-27,2,-13],'#f5cf6b',7);
 // Repeated deck segments, twin carriageways, parapets and pile columns.
 for(const x of [-43,12,67,122]){
  for(const z of [10,20]){
   box(3.2,6.7,3,x,-3.15,z,wetConcrete);box(3.2,8.6,3,x,4.5,z);
   box(7,1.15,6.8,x,8.55,z);box(3.5,.14,3.3,x,.14,z,wetConcrete);
  }
 }
 for(let x=-43;x<132;x+=5){
  for(const z of [10,20]){box(4.94,1.6,8.4,x+2.5,9.4,z);box(4.94,.12,7.9,x+2.5,10.25,z,dark);}
  for(const z of [5.7,14.35,15.65,24.3])box(4.94,.75,.24,x+2.5,10.65,z,edge);
  for(const z of [10,20])box(2.2,.025,.08,x+2.5,10.325,z,edge);
  for(const z of [6.3,13.7,16.3,23.7])box(4.94,.025,.065,x+2.5,10.325,z,edge);
 }
 const traffic=createBridgeTraffic();root.add(traffic.root);
 for(let x=-38;x<120;x+=16){beam(new THREE.Vector3(x,10.5,15),new THREE.Vector3(x,15.5,15),.06,steel);for(const side of [-1,1]){beam(new THREE.Vector3(x,15.5,15),new THREE.Vector3(x,15.3,15+side*2),.05,steel);box(.65,.12,.35,x,15.25,15+side*2,edge);}}
 label('P1 / TRAINING PIER',[12,4.2,7.8],'#f7d36e',6);
 label('MARINE APPROACH / CONTINUES OFFSHORE',[49,13,15],'#e4ebea',13);
 const route=new THREE.Line(new THREE.BufferGeometry().setFromPoints(BRIDGE_ROUTE.map(p=>new THREE.Vector3(p.x,.16,p.z))),new THREE.LineDashedMaterial({color:0x84d6c7,dashSize:1,gapSize:.7,transparent:true,opacity:.65}));route.computeLineDistances();root.add(route);
 const station=mesh(new THREE.RingGeometry(1.5,1.65,64),new THREE.MeshBasicMaterial({color:0x5aebc7,side:THREE.DoubleSide,transparent:true,opacity:.8}),[BRIDGE_STATION.x,.12,BRIDGE_STATION.z]);station.rotation.x=-Math.PI/2;
 label('USV HOLD / OPEN SKY',[12,1.5,1.6],'#89ead4',6);
 // Large synthetic cues are intentionally suitable for control practice, not metrology.
 const markers=new Map<string,THREE.Mesh>();
 const crackMaterial=new THREE.MeshStandardMaterial({color:0x182f2b,roughness:1});
 const rust=new THREE.MeshStandardMaterial({color:0x804c35,roughness:.9});
 for(const target of inspectionTargets){
  const [x,y,z]=target.position;
  if(target.kind==='crack'){
   const points=[[-.2,.35],[-.08,.17],[-.12,.04],[.07,-.13],[.04,-.29],[.21,-.4]];
   for(let i=1;i<points.length;i++)beam(new THREE.Vector3(x+points[i-1][0],y+points[i-1][1],z-.013),new THREE.Vector3(x+points[i][0],y+points[i][1],z-.013),.013,crackMaterial);
   beam(new THREE.Vector3(x-.12,y+.04,z-.013),new THREE.Vector3(x-.32,y-.06,z-.013),.009,crackMaterial);
  }else if(target.kind==='spall'){
   const patch=mesh(new THREE.CircleGeometry(.36,9),rust,[x,y,z-.01]);patch.scale.x=1.3;patch.rotation.y=Math.PI;
   for(const dx of [-.2,0,.2])beam(new THREE.Vector3(x+dx,y-.27,z-.025),new THREE.Vector3(x+dx,y+.27,z-.025),.017,steel);
  }else if(target.kind==='joint'){
   box(1.18,.04,.035,x,y,z-.015,crackMaterial);box(.25,.34,.014,x+.23,y-.17,z-.02,rust);
  }else if(target.kind==='growth'){
   const growth=new THREE.MeshStandardMaterial({color:0x486047,roughness:1});
   for(let i=0;i<28;i++){const a=i*2.4,r=.08+.28*((i*7)%17)/17;mesh(new THREE.IcosahedronGeometry(.07+(i%3)*.018,0),growth,[x+Math.cos(a)*r,y+Math.sin(a)*r,z-.03]);}
  }else{
   for(let i=0;i<12;i++){const a=i*Math.PI/6;mesh(new THREE.DodecahedronGeometry(.11),concrete,[x+.65*Math.cos(a),-6.04,z+.5*Math.sin(a)]);}
  }
  const marker=mesh(new THREE.RingGeometry(.52,.54,48),new THREE.MeshBasicMaterial({color:0xf1c957,side:THREE.DoubleSide,transparent:true,opacity:.8}),[x,y,z-.06]);
  if(target.kind==='scour'){marker.rotation.x=-Math.PI/2;marker.position.y=-6.0;}
  markers.set(target.id,marker);
 }
 return {root,trafficCount:traffic.count,updateTraffic(dt:number,enabled:boolean){traffic.update(dt,enabled);},setTarget(id:string){markers.forEach((marker,key)=>marker.visible=key===id);},dispose(){labels.forEach(t=>t.dispose());}};
}
