import {createFreeCamera} from '../free-camera.mjs';
import {attachRovAccessories,createAccessoryTestTarget} from '../rov-accessories.mjs';
import {sampleRovTankWater,tankPaddleOffset} from '../rov-wave-field.mjs';
import {rovCameraPose,ROV_VIEW_LABELS} from '../rov-camera.mjs';
import * as T from 'three';
import {enrichRovModel} from '../rov-anatomy.mjs?v=rov-at';
import {attachRovEffects} from '../rov-effects.mjs?v=free-ax';
import {GLTFLoader} from '../vendor/GLTFLoader.js';
export function createTank(canvas,status){let renderer;try{renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false});}catch{const replacement=canvas.cloneNode();canvas.replaceWith(replacement);return fallback(replacement,status);}
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=T.SRGBColorSpace;const scene=new T.Scene();scene.background=new T.Color('#7896a4');scene.fog=new T.Fog('#7cabb7',18,40);scene.add(new T.HemisphereLight(0xdff8ff,0x3a575d,2.7));const sun=new T.DirectionalLight(0xffffff,3);sun.position.set(5,10,4);scene.add(sun);
const camera=new T.PerspectiveCamera(52,1,.025,200),freeCamera=createFreeCamera(canvas);
function box(w,h,d,color,x,y,z,opacity=1){const m=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshStandardMaterial({color,transparent:opacity<1,opacity,roughness:.65,depthWrite:opacity===1}));m.position.set(x,y,z);scene.add(m);return m;}
box(9,.15,15,0x607985,0,-3.18,0);box(6,.15,12,0xd0dad6,0,-3.04,0);for(const x of [-3.08,3.08]){box(.13,3.3,12.3,0x87c9d1,x,-1.45,0,.15);box(.13,.12,12.3,0xced8db,x,.18,0);}for(const z of [-6.08,6.08]){box(6.3,3.3,.13,0x87c9d1,0,-1.45,z,.15);box(6.3,.12,.13,0xced8db,0,.18,z);}
const grid=new T.GridHelper(12,24,0x637e82,0x91b3b7);grid.scale.x=.5;grid.position.y=-2.95;scene.add(grid);
for(let z=-6;z<=6;z+=1){box(.08,.04,.035,0xf0d248,-2.91,-2.91,z);box(.08,.04,.035,0xf0d248,2.91,-2.91,z);}
const waterGeo=new T.PlaneGeometry(6,12,30,60);waterGeo.rotateX(-Math.PI/2);const water=new T.Mesh(waterGeo,new T.MeshStandardMaterial({color:0x2ba8bc,transparent:true,opacity:.16,side:T.DoubleSide,roughness:.2,depthWrite:false}));scene.add(water);const waterWire=new T.LineSegments(new T.WireframeGeometry(waterGeo),new T.LineBasicMaterial({color:0xb5f3ff,transparent:true,opacity:.1}));scene.add(waterWire);
const paddle=box(5.8,2.7,.1,0x3c5865,0,-1.4,-5.9);for(let x=-2.5;x<=2.5;x+=.5){const rib=box(.025,2.5,.02,0x9bb6c2,x,-1.4,-5.82);paddle.attach(rib);}
const rov=new T.Group();scene.add(rov);const testPlate=createAccessoryTestTarget(scene,{position:[0,-1.2,-3.5]});let loaded=false,effects=null,accessoryRig=null;new GLTFLoader().load('../models/chasing-m2-pro-max-reference.glb',g=>{enrichRovModel(g.scene);const b=new T.Box3().setFromObject(g.scene),c=b.getCenter(new T.Vector3());g.scene.position.sub(c);rov.add(g.scene);effects=attachRovEffects(g.scene);accessoryRig=attachRovAccessories(g.scene);loaded=true;status.textContent='M2 PRO MAX reference model · third person';},undefined,()=>{status.textContent='ROV asset unavailable · simplified model';});
const placeholder=new T.Group();for(let x of [-.2,.2]){const m=new T.Mesh(new T.BoxGeometry(.14,.18,.55),new T.MeshStandardMaterial({color:0xf0cc2f}));m.position.x=x;placeholder.add(m);}const center=new T.Mesh(new T.BoxGeometry(.25,.15,.35),new T.MeshStandardMaterial({color:0x303841}));placeholder.add(center);rov.add(placeholder);
const lineGeo=new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3()]);const tether=new T.Line(lineGeo,new T.LineBasicMaterial({color:0xffa93b}));scene.add(tether);
const glow=new T.PointLight(0xe5fcff,2,3);rov.add(glow);glow.position.set(0,0,-.4);
return {draw(p,opts){const width=canvas.clientWidth,height=canvas.clientHeight;if(canvas.width!==Math.floor(width*renderer.getPixelRatio())||canvas.height!==Math.floor(height*renderer.getPixelRatio())){renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}placeholder.visible=!loaded;rov.position.set(p.x,-p.depth,p.z);rov.rotation.set(-p.pitch*Math.PI/180,Math.PI-p.yaw*Math.PI/180,p.roll*Math.PI/180,'YXZ');effects?.update({lightLevel:opts.lights,thrusters:!!opts.thrusters});effects?.tick(opts.dt??.016);testPlate.root.visible=!!opts.accessories?.enabled.laser;if(opts.accessories)accessoryRig?.update(opts.accessories,{dt:opts.dt,targets:testPlate.targets});const positions=waterGeo.attributes.position;for(let i=0;i<positions.count;i++){positions.setY(i,sampleRovTankWater(positions.getX(i),0,positions.getZ(i),p.t,opts.waves).height);}positions.needsUpdate=true;waterGeo.computeVertexNormals();const wire=waterWire.geometry.attributes.position;for(let i=0;i<wire.count;i++)wire.setY(i,sampleRovTankWater(wire.getX(i),0,wire.getZ(i),p.t,opts.waves).height);wire.needsUpdate=true;paddle.position.z=-5.9+tankPaddleOffset(0,p.t,opts.waves);glow.intensity=0;const points=lineGeo.attributes.position;points.setXYZ(0,-2.9,.15,5.6);points.setXYZ(1,p.x,-p.depth+.08,p.z+.15);points.needsUpdate=true;lineGeo.computeBoundingSphere();const base=rovCameraPose(opts.view,[p.x,-p.depth,p.z],rov.quaternion),rig=freeCamera.update(opts.view==='free'?'rov':null,base);camera.position.fromArray(rig.eye);camera.up.fromArray(rig.up);camera.lookAt(...rig.target);if(camera.fov!==rig.fov){camera.fov=rig.fov;camera.updateProjectionMatrix();}status.textContent=(loaded?'M2 PRO MAX reference model':'Simplified ROV')+' · '+ROV_VIEW_LABELS[opts.view];renderer.render(scene,camera);},recenter(){freeCamera.recenter();},dispose(){freeCamera.dispose();accessoryRig?.dispose();testPlate.dispose();renderer.dispose();}};
}
function fallback(canvas,status){
 const ctx=canvas.getContext('2d'),freeCamera=createFreeCamera(canvas);let rotorAngle=0;const toolScene=new T.Scene(),toolRov=new T.Group();toolScene.add(toolRov);const tools=attachRovAccessories(toolRov),testPlate=createAccessoryTestTarget(toolScene,{position:[0,-1.2,-3.5]});
 const subtract=(a,b)=>a.map((n,i)=>n-b[i]);
 const dot=(a,b)=>a.reduce((sum,n,i)=>sum+n*b[i],0);
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
 const unit=a=>a.map(n=>n/(Math.hypot(...a)||1));
 return {draw(p,o){
  const w=canvas.clientWidth,h=canvas.clientHeight;canvas.width=w;canvas.height=h;
  const q=new T.Quaternion().setFromEuler(new T.Euler(-p.pitch*Math.PI/180,Math.PI-p.yaw*Math.PI/180,p.roll*Math.PI/180,'YXZ'));
  toolRov.quaternion.copy(q);toolRov.position.set(p.x,-p.depth,p.z).add(new T.Vector3(0,-.098,0).applyQuaternion(q));testPlate.root.updateMatrixWorld(true);if(o.accessories)tools.update(o.accessories,{dt:o.dt,targets:testPlate.targets});
  const rig=freeCamera.update(o.view==='free'?'rov':null,rovCameraPose(o.view,[p.x,-p.depth,p.z],q));
  const forward=unit(subtract(rig.target,rig.eye)),right=unit(cross(forward,rig.up)),up=cross(right,forward),focal=h/(2*Math.tan(rig.fov*Math.PI/360));
  const cameraPoint=a=>{const v=subtract(a,rig.eye);return [dot(v,right),dot(v,up),dot(v,forward)];};
  const screen=a=>[w/2+a[0]*focal/a[2],h/2-a[1]*focal/a[2]];
  const bg=ctx.createLinearGradient(0,0,0,h);bg.addColorStop(0,'#4d8293');bg.addColorStop(1,'#173e50');ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
  function line(a,b,color,width=1){let x=cameraPoint(a),y=cameraPoint(b);if(x[2]<.03&&y[2]<.03)return;if(x[2]<.03){const t=(.03-x[2])/(y[2]-x[2]);x=x.map((n,i)=>n+(y[i]-n)*t);}if(y[2]<.03){const t=(.03-y[2])/(x[2]-y[2]);y=y.map((n,i)=>n+(x[i]-n)*t);}ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(...screen(x));ctx.lineTo(...screen(y));ctx.stroke();}
  for(let z=-6;z<=6;z++)line([-3,-3,z],[3,-3,z],'#8db7bc');
  for(let x=-3;x<=3;x++)line([x,-3,-6],[x,-3,6],'#8db7bc');
  for(let y of [0,-3]){line([-3,y,-6],[3,y,-6],'#d2e6df',2);line([3,y,-6],[3,y,6],'#d2e6df',2);line([3,y,6],[-3,y,6],'#d2e6df',2);line([-3,y,6],[-3,y,-6],'#d2e6df',2);}
  for(let x of [-3,3])for(let z of [-6,6])line([x,0,z],[x,-3,z],'#d2e6df',2);
  if(o.waves)for(let z=-5;z<6;z+=.5)line([-3,sampleRovTankWater(-3,0,z,p.t,true).height,z],[3,sampleRovTankWater(3,0,z,p.t,true).height,z],'#70b9ca');
  line([-2.9,.15,5.6],[p.x,-p.depth,p.z],'#ffb74e',2);
  if(o.accessories?.enabled.laser){for(let x=-.3;x<=.301;x+=.1)line([x,-1.4,-3.49],[x,-1,-3.49],'#b9e0d9',2);for(let y=-1.4;y<=-1.0+.001;y+=.1)line([-.3,y,-3.49],[.3,y,-3.49],'#b9e0d9',2);}
  if(o.accessories){tools.root.traverse(n=>{let visible=true;for(let a=n;a&&a!==toolRov;a=a.parent)visible=visible&&a.visible;if(!visible)return;if(n.isLine){const pos=n.geometry.attributes.position;for(let i=0;i+1<pos.count;i+=2)line(new T.Vector3().fromBufferAttribute(pos,i).applyMatrix4(n.matrixWorld).toArray(),new T.Vector3().fromBufferAttribute(pos,i+1).applyMatrix4(n.matrixWorld).toArray(),'#fa6962',2);}else if(n.isMesh&&o.view!=='first'){if(!n.geometry.boundingBox)n.geometry.computeBoundingBox();const b=n.geometry.boundingBox,points=[];for(const y of[b.min.y,b.max.y])for(const z of[b.min.z,b.max.z])for(const x of[b.min.x,b.max.x])points.push(new T.Vector3(x,y,z).applyMatrix4(n.matrixWorld).toArray());for(const [a,b]of[[0,1],[1,3],[3,2],[2,0],[4,5],[5,7],[7,6],[6,4],[0,4],[1,5],[2,6],[3,7]])line(points[a],points[b],'#d3b86c',1);}});}

  if(o.view!=='first'){
   const local=v=>new T.Vector3(...v).applyQuaternion(q).add(new T.Vector3(p.x,-p.depth,p.z)).toArray();
   if(o.thrusters)rotorAngle+=(o.dt??.016)*12;for(const x of[-.2,.2])for(const z of[-.24,.24]){const a=rotorAngle+(x>0?1:-1);line(local([x+Math.cos(a)*.07,.06+Math.sin(a)*.07,z]),local([x-Math.cos(a)*.07,.06-Math.sin(a)*.07,z]),'#ff944d',3);}
   const corners=[];for(let y of[-.1,.1])for(let z of[-.3,.3])for(let x of[-.22,.22])corners.push(local([x,y,z]));
   for(const [a,b]of[[0,1],[1,3],[3,2],[2,0],[4,5],[5,7],[7,6],[6,4],[0,4],[1,5],[2,6],[3,7]])line(corners[a],corners[b],'#f7cf3c',4);
   line(local([-.14,0,.305]),local([.14,0,.305]),'#e4fbff',4);
  }
  status.textContent='WebGL unavailable · '+ROV_VIEW_LABELS[o.view]+' schematic';
 },recenter(){freeCamera.recenter();},dispose(){freeCamera.dispose();tools.dispose();testPlate.dispose();}};
}
