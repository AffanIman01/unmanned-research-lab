import {createSonarDisplay} from './sonar-display.mjs';
import * as T from 'three';
// Illustrative accessory bodies. Dimensions/mounts are not a fabrication model.
// Attach to the reference ROV's original model root (+Z forward, y=0 underside).
export function attachRovAccessories(rov){
 const root=new T.Group();root.name='CHASING_accessory_simulation';rov.add(root);
 const yellow=new T.MeshStandardMaterial({color:0xdcbf27,roughness:.45,metalness:.25});
 const dark=new T.MeshStandardMaterial({color:0x202a30,roughness:.5,metalness:.5});
 const metal=new T.MeshStandardMaterial({color:0x9aa8ad,roughness:.3,metalness:.8});
 const glass=new T.MeshStandardMaterial({color:0xbbdce6,roughness:.2,transparent:true,opacity:.28,depthWrite:false});
 const water=new T.MeshStandardMaterial({color:0x43c9df,transparent:true,opacity:.75,roughness:.25});
 const box=(g,size,pos,mat)=>{const m=new T.Mesh(new T.BoxGeometry(...size),mat);m.position.set(...pos);g.add(m);return m;};
 const cyl=(g,r,h,pos,mat)=>{const m=new T.Mesh(new T.CylinderGeometry(r,r,h,16),mat);m.position.set(...pos);g.add(m);return m;};
 const grabber=new T.Group();root.add(grabber);grabber.name='Grabber_Arm_2_illustrative';
 box(grabber,[.07,.055,.25],[0,-.065,.20],dark);box(grabber,[.09,.045,.095],[0,-.07,.07],yellow);
 const shaft=cyl(grabber,.018,.17,[0,-.065,.34],metal);shaft.rotation.x=Math.PI/2;
 const jaws=[-1,1].map(sign=>{const pivot=new T.Group();pivot.position.set(sign*.034,-.065,.42);grabber.add(pivot);box(pivot,[.018,.025,.13],[0,0,.065],metal);box(pivot,[.045,.025,.022],[-sign*.014,0,.13],dark);return pivot;});
 const sampler=new T.Group();root.add(sampler);sampler.name='Water_Sampler_illustrative';sampler.position.set(-.17,-.065,-.02);
 const barrel=cyl(sampler,.046,.26,[0,0,0],glass);barrel.rotation.x=Math.PI/2;
 for(const z of[-.14,.14]){const cap=cyl(sampler,.05,.025,[0,0,z],yellow);cap.rotation.x=Math.PI/2;}
 box(sampler,[.06,.035,.21],[0,.055,0],dark);
 const fill=cyl(sampler,.041,.24,[0,0,0],water);fill.rotation.x=Math.PI/2;
 const laser=new T.Group();root.add(laser);laser.name='Laser_Scaler_illustrative';
 box(laser,[.14,.035,.04],[0,-.005,.29],dark);
 const beamMat=new T.LineBasicMaterial({color:0xff3b32,transparent:true,opacity:.65});
 const dotMat=new T.MeshBasicMaterial({color:0xff3b24,toneMapped:false});
 const beams=[-.05,.05].map(x=>{const emitter=cyl(laser,.012,.028,[x,-.005,.32],metal);emitter.rotation.x=Math.PI/2;const line=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(x,-.005,.34),new T.Vector3(x,-.005,1.8)]),beamMat);line.frustumCulled=false;laser.add(line);const dot=new T.Mesh(new T.SphereGeometry(.009,8,8),dotMat);laser.add(dot);return {x,line,dot};});
 const sonar=createSonarDisplay(root);sonar.root.position.set(0,.22,-.17);
 const ray=new T.Raycaster(),origin=new T.Vector3(),direction=new T.Vector3(),endpoint=new T.Vector3();
 function update(state,{dt=.016,targets=[]}={}){
  sonar.root.visible=!!state.enabled.sonar;sonar.update(state.sonarOn,state.sonarPhase||0);
  grabber.visible=!!state.enabled.grabber;sampler.visible=!!state.enabled.sampler;laser.visible=!!state.enabled.laser;
  const jawAngle=(state.grabberAperture??(state.grabberClosed?0:1))*.55;
  jaws.forEach((j,i)=>j.rotation.y=(i===0?-1:1)*jawAngle);
  fill.visible=state.sampleFill>0;fill.scale.y=Math.max(.001,state.sampleFill);fill.position.z=-.12+.12*state.sampleFill;
  root.updateWorldMatrix(true,true);direction.set(0,0,1).transformDirection(root.matrixWorld);
  const ranges=[];
  for(const b of beams){b.line.visible=!!state.laserOn;b.dot.visible=false;if(!state.laserOn)continue;
   origin.set(b.x,-.005,.34);root.localToWorld(origin);ray.set(origin,direction);ray.near=.01;ray.far=6;
   const hit=ray.intersectObjects(targets,true)[0];endpoint.copy(hit?hit.point:origin.clone().addScaledVector(direction,1.5));root.worldToLocal(endpoint);
   const pos=b.line.geometry.attributes.position;pos.setXYZ(0,b.x,-.005,.34);pos.setXYZ(1,endpoint.x,endpoint.y,endpoint.z);pos.needsUpdate=true;
   if(hit){b.dot.visible=true;b.dot.position.copy(endpoint);ranges.push(hit.distance);}
  }
  state.laserRange=state.laserOn&&ranges.length===2?(ranges[0]+ranges[1])/2:null;
 }
 return {root,update,dispose(){sonar.dispose();root.removeFromParent();root.traverse(o=>{if(o.geometry)o.geometry.dispose();});for(const m of[yellow,dark,metal,glass,water,beamMat,dotMat])m.dispose();}};
}
export function createAccessoryTestTarget(scene,{position=[0,-1.2,-2.5],rotationY=0}={}){
 const root=new T.Group();root.name='Accessory_reference_plate_60x40cm';root.position.set(...position);root.rotation.y=rotationY;scene.add(root);
 const plate=new T.Mesh(new T.BoxGeometry(.6,.4,.015),new T.MeshStandardMaterial({color:0x223c45,roughness:.7}));root.add(plate);
 const points=[];for(let x=-.3;x<=.301;x+=.1)points.push(new T.Vector3(x,-.2,.009),new T.Vector3(x,.2,.009));for(let y=-.2;y<=.201;y+=.1)points.push(new T.Vector3(-.3,y,.009),new T.Vector3(.3,y,.009));
 const grid=new T.LineSegments(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:0xc7dfdf}));root.add(grid);
 const foot=new T.Mesh(new T.BoxGeometry(.035,.5,.035),new T.MeshStandardMaterial({color:0x56727b}));foot.position.y=-.45;root.add(foot);
 return {root,targets:[plate],dispose(){root.removeFromParent();root.traverse(o=>{o.geometry?.dispose();if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose());});}};
}
