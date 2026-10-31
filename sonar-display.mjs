import * as T from 'three';
// Ping360 with CHASING integration kit: explanatory geometry, not measured CAD.
// The sweep is a visual principle demo, not acoustic propagation or live returns.
export function createSonarDisplay(parent){
 const root=new T.Group();root.name='Ping360_sonar_illustrative';parent.add(root);
 const mats=[new T.MeshStandardMaterial({color:0x1e333e,metalness:.45,roughness:.45}),new T.MeshStandardMaterial({color:0x4f92ba,metalness:.4,roughness:.4}),new T.MeshBasicMaterial({color:0x71d9dd,transparent:true,opacity:.14,side:T.DoubleSide,depthWrite:false})];
 const base=new T.Mesh(new T.CylinderGeometry(.055,.064,.065,32),mats[0]);base.position.y=.033;root.add(base);
 const head=new T.Group();head.position.y=.095;root.add(head);
 const drum=new T.Mesh(new T.CylinderGeometry(.054,.054,.06,32),mats[1]);head.add(drum);
 const face=new T.Mesh(new T.BoxGeometry(.046,.036,.008),mats[0]);face.position.z=.052;head.add(face);
 const beam=new T.Mesh(new T.CircleGeometry(.60,48,-.13,.26),mats[2]);beam.rotation.x=-Math.PI/2;beam.rotation.z=-Math.PI/2;head.add(beam);
 const echoes=new T.Group();root.add(echoes);
 for(let i=0;i<6;i++){const dot=new T.Mesh(new T.SphereGeometry(.013,8,8),new T.MeshBasicMaterial({color:0xa8fbdf,transparent:true,opacity:0}));const a=i*1.07+.3,r=.28+(i%3)*.10;dot.position.set(Math.sin(a)*r,.095,Math.cos(a)*r);dot.userData.angle=a;echoes.add(dot);}
 return {root,update(on,phase){head.rotation.y=phase;beam.visible=on;echoes.visible=on;echoes.children.forEach(d=>{const delta=((phase-d.userData.angle)%(Math.PI*2)+Math.PI*2)%(Math.PI*2);d.material.opacity=Math.max(0,1-delta/1.4)*.8;});},dispose(){root.removeFromParent();root.traverse(o=>{o.geometry?.dispose();if(o.isMesh)o.material.dispose();});}};
}
