// Geometry and interaction checks against actual local GLBs; no browser rendering.
import {registerHooks} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
registerHooks({resolve(spec,context,next){return spec==='three'?{url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:next(spec,context);}});
const {GLTFLoader}=await import('../dist/vendor/GLTFLoader.js');
const {createAccessoryDisplays}=await import('../dist/accessory-display.mjs');
const {createSensorRack}=await import('../dist/sensor-rack.mjs');
const {sensorComponents}=await import('../dist/sensor-data.mjs');
const {accessoryComponents}=await import('../dist/accessory-data.mjs');
const {createComponentInspector}=await import('../dist/component-inspector.mjs');
const inspectionDefinitions=[...accessoryComponents,...sensorComponents];
const loader=new GLTFLoader();
const glb=async name=>{const b=await readFile(new URL('../dist/models/'+name,import.meta.url));return (await loader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'')).scene;};
const [vessel,reel,rov,star]=await Promise.all(['me120-reference.glb','chasing-e-reel-reference.glb','chasing-m2-pro-max-reference.glb','starlink-mini-concept.glb'].map(glb));
const scene=new T.Scene(),frame=new T.Group();frame.rotation.y=Math.PI/2;frame.position.y=-.25;scene.add(frame);frame.add(vessel,star);vessel.scale.x=1.4/1.4051200151443482;star.position.set(.54,1.03,-.80);vessel.getObjectByName('antenna').position.y-=.342;
rov.rotation.y=Math.PI/2;scene.add(rov);reel.position.set(0,.835,-.615);reel.scale.setScalar(.8);frame.add(reel);
const displays=createAccessoryDisplays({reelSource:reel});scene.add(displays.usv,displays.rov);
const sensorRack=createSensorRack();vessel.getObjectByName('antenna').add(sensorRack.root);
let checks=0;const check=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
check('eight accessory owners and finite inspection geometry',()=>{assert.equal(Object.keys(displays.owners).length,8);for(const g of Object.values(displays.owners)){assert(g.userData.inspect);assert(g.userData.inspect.at.every(Number.isFinite));assert(g.userData.inspect.size.every(x=>x>0&&Number.isFinite(x)));}});
check('table is beside hull and rests on the ground',()=>{const b=displays.info().owners['gcs-table'];assert(b.min[2]>1.29);assert(Math.abs(b.min[1]+.28)<.001);assert.equal(displays.usv.visible,false);assert.equal(displays.rov.visible,false);});
check('two antenna cables and laptop link exist',()=>{for(const n of ['antenna_1_coax','antenna_2_coax','laptop_data_link'])assert(displays.usv.getObjectByName(n));});
check('reel preserves source geometry without deck scale or translation',()=>{const g=displays.owners['rov-ereel'].children[0];assert.deepEqual(g.scale.toArray(),[1,1,1]);const b=new T.Box3().setFromObject(g);assert(Math.abs(b.min.y+.02)<1e-6);assert(Math.abs(b.getSize(new T.Vector3()).y-.4)<1e-6);assert.deepEqual(reel.scale.toArray(),[.8,.8,.8]);assert.deepEqual(reel.position.toArray(),[0,.835,-.615]);});
check('ROV controller has a separate phone holder',()=>{assert(displays.owners['rov-controller'].getObjectByName('illustrative_phone_on_holder'));assert(displays.owners['rov-controller'].getObjectByName('phone_mount_arm'));});

class Element {
 constructor(tag){this.tag=tag;this.children=[];this.style={};this.attrs={};this.dataset={};this.classes=new Set();this.handlers={};this.classList={add:n=>this.classes.add(n),remove:n=>this.classes.delete(n),contains:n=>this.classes.has(n),toggle:(n,y)=>y?this.classes.add(n):this.classes.delete(n)};}
 append(...items){this.children.push(...items);}
 replaceChildren(...items){this.children=items;}
 setAttribute(k,v){this.attrs[k]=v;}
 addEventListener(k,fn){(this.handlers[k]||=[]).push(fn);}
 dispatchEvent(e){for(const fn of this.handlers[e.type]||[])fn(e);}
 querySelectorAll(tag){return this.children.flatMap(c=>[...(c.tag===tag?[c]:[]),...(c.querySelectorAll?.(tag)||[])]);}
 querySelector(tag){return this.querySelectorAll(tag)[0]||null;}
 set innerHTML(value){if(value.includes('<select'))this.children=[new Element('span'),new Element('select')];}
 focus(){}
 getBoundingClientRect(){return {left:0,top:0,width:this.clientWidth,height:this.clientHeight};}
}
const docEvents={};globalThis.document={createElement:tag=>new Element(tag),createTextNode:text=>({textContent:text}),querySelector:()=>null,addEventListener:(k,fn)=>{docEvents[k]=fn;}};
globalThis.window={matchMedia:()=>({matches:false})};globalThis.requestAnimationFrame=fn=>fn();globalThis.CustomEvent=class{constructor(type,options={}){this.type=type;Object.assign(this,options);}};
const host=new Element('div');host.clientWidth=1100;host.clientHeight=700;host.append(new Element('canvas'));
const camera=new T.PerspectiveCamera(40,1100/700,.02,100);camera.position.set(4.2,3,4.3);
const controls={target:new T.Vector3(0,.78,.55),minDistance:.55,maxDistance:12,update(){camera.lookAt(this.target);camera.updateMatrixWorld(true);}};controls.update();
const settings={subject:'me120',cameraMode:'orbit',explode:0};
const equipmentHost=new Element('div');
const inspector=createComponentInspector({host,scene,camera,controls,getSettings:()=>settings,equipmentHost});
inspector.init(vessel,{extraComponents:inspectionDefinitions,owners:{...sensorRack.owners,'sensor-rack':sensorRack.root,...displays.owners,'gcs-display':displays.usv,'starlink-mini':star,'usv-ereel':reel,'rov-reference':rov}});inspector.tick(.016);
const visibleOptions=()=>equipmentHost.querySelector('select').children.filter(o=>!o.hidden).map(o=>o.value);
check('ME120 picker includes ground station and excludes ROV equipment',()=>{assert.equal(inspector.info().items.length,29);assert(visibleOptions().includes('starlink'));assert(visibleOptions().includes('gcs-radio'));assert(!visibleOptions().includes('rov-ereel'));});
check('all new USV equipment opens and produces finite zoom targets',()=>{for(const d of inspectionDefinitions.filter(d=>d.subject==='me120')){inspector.open(d.id);inspector.tick(.7);assert.equal(inspector.active,d.id);assert(camera.position.toArray().every(Number.isFinite));assert(controls.target.toArray().every(Number.isFinite));}});
check('Starlink shows its own logo and alt text',()=>{inspector.open('starlink');const image=host.querySelector('aside').querySelector('img');assert.equal(image.alt,'Starlink');assert(image.src.endsWith('starlink-logo-white.png'));});
check('related equipment navigation opens the intended device',()=>{inspector.open('gcs-table');const panel=host.querySelector('aside'),nav=panel.querySelector('nav');nav.querySelectorAll('button').find(b=>b.textContent==='Laptop').onclick();assert.equal(inspector.active,'gcs-laptop');});
check('subject switch closes old popup and filters controls',()=>{settings.subject='rov';inspector.sync();assert.equal(inspector.active,null);assert(visibleOptions().includes('rov-ereel'));assert(!visibleOptions().includes('starlink'));inspector.open('gcs-radio');assert.equal(inspector.active,null);});
check('equipment controls are outside the 3D viewport',()=>{assert.equal(host.querySelector('select'),null);assert(equipmentHost.querySelector('select'));assert.equal(equipmentHost.hidden,false);});
check('ROV quick buttons open E-Reel and RC information',()=>{for(const label of ['E-Reel','RC controller']){const b=equipmentHost.querySelector('nav').querySelectorAll('button').find(b=>!b.hidden&&b.textContent===label);assert(b);b.onclick();assert.equal(inspector.active,label==='E-Reel'?'rov-ereel':'rov-controller');}});
check('ROV port guide opens with interfaces and accessory examples',()=>{const b=equipmentHost.querySelector('nav').querySelectorAll('button').find(b=>!b.hidden&&b.textContent==='ROV ports');b.onclick();assert.equal(inspector.active,'rov-ports');const text=host.querySelector('aside').querySelectorAll('dd').map(e=>e.textContent);assert(text.includes('10/100 Mbps'));assert(text.includes('3.3 V TTL'));assert.equal(host.querySelector('aside').querySelector('ul').children.length,6);});
check('ROV, E-Reel and controller each open',()=>{for(const id of ['rov-body','rov-ereel','rov-controller']){inspector.open(id);inspector.tick(.7);assert.equal(inspector.active,id);assert(camera.position.toArray().every(Number.isFinite));}});
check('closing restores the previous orbit view',()=>{inspector.close({restore:false,instant:true});camera.position.set(1.3,1.1,1.5);controls.target.set(-.2,.18,.23);const old=camera.position.clone();inspector.open('rov-ereel');inspector.tick(.7);inspector.close();inspector.tick(.7);assert(camera.position.distanceTo(old)<1e-9);});
check('camera and explode modes close equipment inspection',()=>{inspector.open('rov-controller');settings.cameraMode='rov';inspector.sync();assert.equal(inspector.active,null);assert.equal(inspector.info().available,false);settings.cameraMode='orbit';settings.explode=1;inspector.sync();assert.equal(inspector.info().available,false);settings.explode=0;inspector.sync();assert.equal(inspector.info().available,true);});
check('navigation lights open without radar controls; center radar is separately inspectable',()=>{settings.subject='me120';inspector.sync();for(const id of ['nav-light-port','nav-light-starboard']){inspector.open(id);inspector.tick(.7);assert.equal(inspector.active,id);assert.equal(host.querySelector('aside').querySelector('h2').textContent.includes('LALIZAS'),true);assert(!host.querySelector('aside').querySelectorAll('button').some(b=>b.textContent==='Show how it works'));}inspector.open('radar');inspector.tick(.7);assert.equal(inspector.active,'radar');assert(camera.position.toArray().every(Number.isFinite));assert(host.querySelector('aside').querySelectorAll('button').some(b=>b.textContent==='Show how it works'));const item=inspector.info().items.find(x=>x.id==='radar'),expected=sensorRack.owners['front-cover'].localToWorld(new T.Vector3(...sensorRack.owners['front-cover'].userData.inspect.at));assert(new T.Vector3(...item.world).distanceTo(expected)<1e-9);});
check('existing battery cards remain operable',()=>{inspector.open('battery-1');inspector.tick(.7);assert(inspector.info().items.find(x=>x.id==='battery-1').opening>.99);inspector.close({instant:true});assert.equal(inspector.info().items.find(x=>x.id==='battery-1').opening,0);});
const framing=[];
for(const mobile of [false,true]){
 host.clientWidth=mobile?390:1100;host.clientHeight=mobile?640:700;camera.aspect=host.clientWidth/host.clientHeight;camera.updateProjectionMatrix();
 for(const d of inspectionDefinitions){
  settings.subject=d.subject;inspector.sync();inspector.open(d.id);inspector.tick(.7);
  const owner=d.id==='sensor-mount'?sensorRack.root:sensorRack.owners[d.owner]|| (d.id==='starlink'?star:d.owner==='rov-reference'?rov:d.owner==='usv-ereel'?reel:d.id==='gcs-table'?displays.usv:displays.owners[d.owner]);
  const b=new T.Box3().setFromObject(owner),points=[];
  for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z])points.push(new T.Vector3(x,y,z).project(camera));
  framing.push({id:d.id,mobile,min:[Math.min(...points.map(p=>p.x)),Math.min(...points.map(p=>p.y))],max:[Math.max(...points.map(p=>p.x)),Math.max(...points.map(p=>p.y))]});
 }
}
check('accessory camera framing remains inside desktop and mobile frustums',()=>{assert.deepEqual(framing.filter(f=>!f.min.every(n=>n> -1)||!f.max.every(n=>n<1)),[]);});
await writeFile(new URL('./photo-equipment-results.json',import.meta.url),JSON.stringify({revision:'Y',checks,passed:checks,scope:'Actual GLB geometry, mock-DOM selection and lifecycle. No browser rendering.',browserPreview:'Not run: control-browser unavailable',framing,bounds:displays.info()},null,2)+'\n');
