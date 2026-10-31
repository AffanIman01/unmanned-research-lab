// Single forward radar correction. Legacy test filename retained.
// Node scene/interaction checks. No browser or WebGL rendering is implied.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import * as T from '../dist/vendor/three.module.js';
import {radarPhase,illustrativeReturn} from '../dist/radar-principle.mjs';
import {components} from '../dist/component-data.mjs';
let checks=0;
function check(name,fn){fn();checks++;console.log('PASS '+name);}
class Element {
 constructor(tag){this.tag=tag;this.children=[];this.style={};this.attrs={};this.classes=new Set();this.classList={add:n=>this.classes.add(n),remove:n=>this.classes.delete(n),contains:n=>this.classes.has(n),toggle:(n,yes)=>yes?this.classes.add(n):this.classes.delete(n)};}
 append(...items){this.children.push(...items);}
 setAttribute(k,v){this.attrs[k]=v;}
 querySelectorAll(tag){return this.children.flatMap(c=>[...(c.tag===tag?[c]:[]),...(c.querySelectorAll?.(tag)||[])]);}
}
let reduced=false;
globalThis.document={createElement:tag=>new Element(tag),createTextNode:text=>({textContent:text})};
globalThis.window={matchMedia:()=>({matches:reduced})};
const demoUrl=new URL('../dist/radar-demo.mjs',import.meta.url);
const source=(await readFile(demoUrl,'utf8')).replace("from 'three'",`from '${new URL('../dist/vendor/three.module.js',import.meta.url)}'`).replace("from './radar-principle.mjs?v=single-radar-correction'",`from '${new URL('../dist/radar-principle.mjs',import.meta.url)}'`);
const {createRadarDemo}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const scene=new T.Scene(),host=new Element('div'),camera=new T.PerspectiveCamera(50,1.6,.01,100);
host.clientWidth=1000;host.clientHeight=650;camera.position.set(6,6,8);camera.lookAt(0,1,3);camera.updateMatrixWorld(true);
const anchors=[{position:new T.Vector3(0,1.5,.05),quaternion:new T.Quaternion()}];
const radar=createRadarDemo({scene,host,camera}),card=new Element('aside');let reframes=0;
radar.update(anchors,0);radar.mount(card,{onView:()=>reframes++});
const find=(tag,text)=>card.querySelectorAll(tag).find(e=>e.textContent===text);
const toggle=find('button','Show how it works');
check('one center radar and two independent navigation lights',()=>{const r=components.filter(c=>c.radar),lights=components.filter(c=>c.id.startsWith('nav-light-'));assert.equal(r.length,1);assert.equal(components.length,14);assert.equal(r[0].id,'radar');assert.equal(r[0].owner,'front-cover');assert.equal(r[0].useOwnerBounds,true);assert.equal(lights.length,2);assert(lights.every(c=>!c.radar));assert(!components.some(c=>c.id==='radar-port'||c.id==='radar-starboard'));});
check('phase progression and wrap',()=>{assert.equal(radarPhase(0).step,0);assert.equal(radarPhase(1.5).step,1);assert.equal(radarPhase(2.7).step,2);assert.equal(radarPhase(4).step,0);});
check('range/reach/forward/disabled gates',()=>{const o=[0,0,0],f=[0,0,1];assert(illustrativeReturn(o,[0,0,3],f).inside);assert(!illustrativeReturn(o,[0,0,8],f).inside);assert(!illustrativeReturn(o,[0,0,-3],f).inside);assert(!illustrativeReturn(o,[0,0,3],f,false).inside);assert(Math.abs(illustrativeReturn(o,[0,0,3],f).roundTripNs-20.0138457)<1e-6);});
check('demo starts from the single center housing anchor',()=>{toggle.onclick();radar.update(anchors,.2);assert(radar.active);assert(scene.children[0].visible);assert.equal(scene.children[0].name,'illustrative_forward_radar_not_exported');assert.deepEqual(scene.children[0].children[0].position.toArray(),anchors[0].position.toArray());assert.equal(scene.children[0].children.length,4);assert.equal(reframes,1);});
check('forward target produces one measured range and one readout',()=>{radar.update(anchors,2.5);const r=radar.info().returns;assert.equal(r.length,1);assert(r[0].inside);assert.equal(r[0].range,3);assert(card.querySelectorAll('output').some(e=>e.textContent==='3.00 m · demo'));assert.equal(card.querySelectorAll('span').filter(e=>e.textContent==='Forward radar').length,1);});
const sliders=card.querySelectorAll('input').filter(e=>e.type==='range');
check('side radar controls are absent',()=>{assert.equal(card.querySelectorAll('input').filter(e=>e.type==='checkbox').length,0);assert(!card.querySelectorAll('span').some(e=>e.textContent==='Port'||e.textContent==='Starboard'));assert.deepEqual(radar.info().enabled,[true]);});
check('side offset leaves the illustrative forward beam',()=>{sliders[1].value='2';sliders[1].oninput();radar.update(anchors,2.7);assert.equal(radar.info().returns[0].inside,false);assert(card.querySelectorAll('output').some(e=>e.textContent==='No echo in sketch'));});
check('distance slider changes the single range',()=>{sliders[1].value='0';sliders[1].oninput();sliders[0].value='4.2';sliders[0].oninput();radar.update(anchors,2.7);assert.equal(radar.info().returns[0].range,4.2);assert(card.querySelectorAll('output').some(e=>e.textContent==='4.20 m · demo'));});
check('pause and replay control the teaching clock',()=>{find('button','Pause').onclick();const old=radar.info().time;radar.update(anchors,1);assert.equal(radar.info().time,old);find('button','Replay').onclick();assert.equal(radar.info().time,0);assert.equal(radar.info().paused,false);});
check('overlay follows the lifted and rotated center mount',()=>{const q=new T.Quaternion().setFromAxisAngle(new T.Vector3(0,1,0),Math.PI/2);const moved=anchors.map(a=>({position:a.position.clone().applyQuaternion(q).add(new T.Vector3(1,.25,2)),quaternion:q}));radar.update(moved,0);assert.deepEqual(scene.children[0].children[0].position.toArray(),moved[0].position.toArray());assert.deepEqual(radar.framing().center.toArray(),moved[0].position.toArray());assert(Math.abs(radar.framing().forward.x-1)<1e-10);assert.equal(anchors[0].position.y,1.5);assert.equal(radar.info().returns.length,1);assert(radar.info().returns[0].inside);});
check('unexpected zero or two anchors hide the overlay',()=>{for(const invalid of[[],[...anchors,...anchors]]){radar.update(invalid,0);assert(!scene.children[0].visible);assert(host.children[0].hidden);assert.equal(radar.framing(),null);}radar.update(anchors,0);assert(scene.children[0].visible);});
check('stop hides all demonstration overlays',()=>{radar.stop();assert(!radar.active);assert(!scene.children[0].visible);assert(host.children[0].hidden);assert(!host.classList.contains('radar-demonstrating'));assert(!card.classList.contains('radar-active'));});
check('reduced-motion starts paused after remount',()=>{reduced=true;const other=new Element('aside');radar.mount(other,{onView:()=>{}});other.querySelectorAll('button').find(b=>b.textContent==='Show how it works').onclick();radar.update(anchors,2);assert.equal(radar.info().time,0);assert(radar.info().paused);radar.stop();});
await writeFile(new URL('./dual-radar-results.json',import.meta.url),JSON.stringify({revision:'Single forward radar correction',checks,passed:checks,browserPreview:'Not run: required control-browser capability unavailable',scope:'Node scene math, mock-DOM interactions and lifecycle; no rendered visual verification'},null,2)+'\n');
