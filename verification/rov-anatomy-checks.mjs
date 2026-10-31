import {registerHooks} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
registerHooks({resolve(spec,context,next){return spec==='three'?{url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:next(spec,context);}});
const {GLTFLoader}=await import('../dist/vendor/GLTFLoader.js');
const {enrichRovModel,createRovAnatomy}=await import('../dist/rov-anatomy.mjs');
const {attachRovEffects}=await import('../dist/rov-effects.mjs');
const {accessoryComponents}=await import('../dist/accessory-data.mjs');
const {createComponentInspector}=await import('../dist/component-inspector.mjs');
const {getHardwareBounds}=await import('../dist/model-framing.mjs');
const bytes=await readFile(new URL('../dist/models/chasing-m2-pro-max-reference.glb',import.meta.url));
const rov=(await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'')).scene;
const original=getHardwareBounds(rov),checks=[];
const check=(name,fn)=>{fn();checks.push(name);console.log('PASS '+name);};
enrichRovModel(rov);const effects=attachRovEffects(rov);rov.rotation.y=Math.PI/2;
const anatomy=createRovAnatomy(rov,accessoryComponents.find(d=>d.id==='rov-ports'));
check('14 component owners have finite nonempty geometry and training links',()=>{
 assert.equal(anatomy.components.length,14);
 for(const d of anatomy.components){assert(d.at.every(Number.isFinite));assert(d.size.every(v=>v>0&&Number.isFinite(v)));assert(d.sources.length);assert(d.trainingSection);assert(!getHardwareBounds(anatomy.owners[d.owner]).isEmpty());}
});
check('all five capped ports sit below the main cabin centerline',()=>{
 const ports=rov.getObjectByName('rov_accessory_interfaces');const b=getHardwareBounds(ports);assert(b.max.y<.055);assert(b.min.y>0);
 assert.equal(ports.children.filter(n=>n.material?.name===''&&n.geometry.type==='CylinderGeometry').length,5);
});
check('eight propellers and two lamps remain animated',()=>{effects.update({lights:true,thrusters:true});effects.tick(.1);const i=effects.info();assert.equal(i.propellers,8);assert.equal(i.lamps,2);assert(i.angles.every(a=>Math.abs(a)>0));effects.update({lights:false,thrusters:false});});
check('overall reference envelope is unchanged by service details',()=>{
 rov.rotation.y=0;const b=getHardwareBounds(rov);assert(b.min.distanceTo(original.min)<1e-7);assert(b.max.distanceTo(original.max)<1e-7);rov.rotation.y=Math.PI/2;
});
check('component enrichment is idempotent',()=>{const before=rov.getObjectByName('rov_service_sd');enrichRovModel(rov);assert.equal(rov.getObjectByName('rov_service_sd'),before);});
class Element {
 constructor(tag){this.tag=tag;this.children=[];this.style={};this.attrs={};this.dataset={};this.classes=new Set();this.handlers={};this.classList={add:n=>this.classes.add(n),remove:n=>this.classes.delete(n),contains:n=>this.classes.has(n),toggle:(n,y)=>y?this.classes.add(n):this.classes.delete(n)};}
 append(...items){this.children.push(...items);}
 replaceChildren(...items){this.children=items;}
 setAttribute(k,v){this.attrs[k]=v;}
 addEventListener(k,fn){(this.handlers[k]||=[]).push(fn);}
 dispatchEvent(e){for(const fn of this.handlers[e.type]||[])fn(e);}
 querySelectorAll(tag){return this.children.flatMap(c=>[...((tag==='[data-effect]'?!!c.dataset?.effect:c.tag===tag)?[c]:[]),...(c.querySelectorAll?.(tag)||[])]);}
 querySelector(tag){return this.querySelectorAll(tag)[0]||null;}
 set innerHTML(value){if(value.includes('<select'))this.children=[new Element('span'),new Element('select')];}
 focus(){}
 getBoundingClientRect(){return {left:0,top:0,width:this.clientWidth,height:this.clientHeight};}
}
const docEvents={};globalThis.document={createElement:tag=>new Element(tag),createTextNode:text=>({textContent:text}),querySelector:()=>null,addEventListener:(k,fn)=>{docEvents[k]=fn;}};
globalThis.window={matchMedia:()=>({matches:false})};globalThis.requestAnimationFrame=fn=>fn();globalThis.CustomEvent=class{constructor(type,options={}){this.type=type;Object.assign(this,options);}};

const host=new Element('div'),equipmentHost=new Element('div');host.clientWidth=1100;host.clientHeight=700;host.append(new Element('canvas'));
const scene=new T.Scene();scene.add(rov);const camera=new T.PerspectiveCamera(40,1100/700,.02,100);camera.position.set(1,.7,1);
const controls={target:new T.Vector3(0,.1,0),minDistance:.15,maxDistance:12,update(){camera.lookAt(this.target);camera.updateMatrixWorld(true);}};controls.update();
const settings={subject:'rov',cameraMode:'orbit',explode:0,lights:false,thrusters:false};
const inspector=createComponentInspector({host,scene,camera,controls,getSettings:()=>settings,equipmentHost});
inspector.init(new T.Group(),{extraComponents:[...accessoryComponents.filter(d=>d.id==='rov-body'),...anatomy.components],owners:{...anatomy.owners,'rov-reference':rov}});inspector.tick(.016);
const panel=()=>host.querySelector('aside');
check('every ROV part opens with a finite close-up and matching title',()=>{for(const d of anatomy.components){inspector.open(d.id);inspector.tick(.7);assert.equal(inspector.active,d.id);assert.equal(panel().querySelector('h2').textContent,d.title);assert(camera.position.toArray().every(Number.isFinite));assert(controls.target.toArray().every(Number.isFinite));assert(panel().querySelectorAll('button').some(b=>b.dataset.m2Guide===d.trainingSection));}});
check('small parts are framed closer than the full vehicle',()=>{inspector.open('rov-body');inspector.tick(.7);const full=camera.position.distanceTo(controls.target);inspector.open('rov-sd');inspector.tick(.7);assert(camera.position.distanceTo(controls.target)<full*.55);});
check('lights and rotor buttons dispatch the intended visual effect',()=>{
 let event;host.addEventListener('componenteffect',e=>event=e.detail);
 for(const [id,effect]of[['rov-lights','lights'],['rov-thrusters','thrusters']]){inspector.open(id);inspector.tick(.7);const button=panel().querySelector('[data-effect]');assert(button);button.onclick();assert.equal(event.effect,effect);settings[effect]=true;inspector.tick(.016);assert.equal(button.attrs['aria-pressed'],'true');settings[effect]=false;}
});
check('ROV camera action opens ROV camera mode',()=>{let mode;host.addEventListener('componentcamera',e=>mode=e.detail.mode);inspector.open('rov-camera');panel().querySelectorAll('button').find(b=>b.textContent==='Open camera view').onclick();assert.equal(mode,'rov');assert.equal(inspector.active,null);});
function clickAt(target,view){
 inspector.close({restore:false,instant:true});const p=target.clone();controls.target.copy(p);camera.position.copy(p).add(view);controls.update();inspector.tick(.016);const q=p.project(camera),canvas=host.querySelector('canvas'),e={type:'pointerdown',pointerId:1,clientX:(q.x+1)*host.clientWidth/2,clientY:(1-q.y)*host.clientHeight/2};canvas.dispatchEvent(e);canvas.dispatchEvent({...e,type:'pointerup'});
}
check('direct lens click resolves camera, not full-body box',()=>{clickAt(rov.localToWorld(new T.Vector3(0,.098,.301)),new T.Vector3(.5,0,0));assert.equal(inspector.active,'rov-camera');});
check('direct service-cap click resolves microSD over main cabin',()=>{clickAt(rov.localToWorld(new T.Vector3(0,.1633,.038)),new T.Vector3(0,.5,0));assert.equal(inspector.active,'rov-sd');});
check('underside interface click resolves the accessory port group',()=>{const ports=rov.getObjectByName('rov_accessory_interfaces'),p=ports.children.at(-1).getWorldPosition(new T.Vector3());clickAt(p,new T.Vector3(0,-.5,.5));assert.equal(inspector.active,'rov-ports');});
check('battery parts follow their parent in exploded position',()=>{const ring=rov.getObjectByName('rov_battery_pull_ring'),battery=rov.getObjectByName('rov_battery'),before=getHardwareBounds(ring).getCenter(new T.Vector3());battery.position.z-=.3;const after=getHardwareBounds(ring).getCenter(new T.Vector3());assert(Math.abs(after.distanceTo(before)-.3)<1e-7);battery.position.z+=.3;});
check('explode and onboard modes hide component inspection',()=>{inspector.open('rov-camera');settings.explode=1;inspector.sync();assert.equal(inspector.active,null);assert.equal(inspector.info().available,false);settings.explode=0;settings.cameraMode='rov';inspector.sync();assert.equal(inspector.info().available,false);settings.cameraMode='orbit';inspector.sync();assert.equal(inspector.info().available,true);});
check('closing a part restores the saved orbit view',()=>{camera.position.set(1,.8,1);controls.target.set(0,.1,0);controls.update();const before=camera.position.clone();inspector.open('rov-camera');inspector.tick(.7);inspector.close();inspector.tick(.7);assert(camera.position.distanceTo(before)<1e-8);});
const result={passed:true,checks,componentCount:anatomy.components.length,scope:'Actual reference GLB, geometry, ray picking, card actions and camera framing. Browser WebGL rendering not verified.'};
await writeFile(new URL('./rov-anatomy-results.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({passed:checks.length,components:anatomy.components.length}));
// Temporary geometry dump for a CPU visual review; excludes light cones.
rov.rotation.y=0;rov.updateMatrixWorld(true);const parts=[];
rov.traverse(n=>{if(!n.isMesh||n.name==='ROV_light_beam_visual')return;const p=n.geometry.attributes.position,a=n.geometry.attributes.normal,vertices=[],normals=[],normalMatrix=new T.Matrix3().getNormalMatrix(n.matrixWorld);for(let i=0;i<p.count;i++){vertices.push(new T.Vector3().fromBufferAttribute(p,i).applyMatrix4(n.matrixWorld).toArray());normals.push(new T.Vector3().fromBufferAttribute(a,i).applyMatrix3(normalMatrix).normalize().toArray());}parts.push({vertices,normals,faces:Array.from(n.geometry.index?.array||Array.from({length:p.count},(_,i)=>i)),color:n.material.color.toArray()});});
await writeFile('/workspace/scratch/9b78400e6318/rov-detail-geometry.json',JSON.stringify(parts));
