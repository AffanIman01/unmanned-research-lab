// Exercise the actual pilot event handlers against a minimal DOM, without WebGL.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {movementCodes,cycleLight,stepSpeed,normalizeHeading,readPilotKeys} from '../../dist/rov-simulator/controls.mjs';
import {createPose,step} from '../../dist/rov-simulator/physics.mjs';
import {createAccessoryState,setAccessoryEnabled,accessoryAction,stepAccessories} from '../../dist/rov-accessory-data.mjs';
class Element {
 constructor(dataset={}){this.dataset=dataset;this.children=[];this.attrs={};this.handlers={};this.style={};this.disabled=false;this.textContent='';this.classList={toggle(){},add(){},remove(){}};this.lastChild={textContent:''};}
 setAttribute(k,v){this.attrs[k]=v;}
 append(child){this.children.push(child);}
 addEventListener(k,fn){(this.handlers[k]??=[]).push(fn);}
 closest(){return null;}
 setPointerCapture(){}
}
const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};
const yaw=[new Element({yaw:'-1'}),new Element({yaw:'1'})],views=['first','close','third','free'].map(view=>new Element({view}));
const handlers={},docHandlers={},frames=[],draws=[];let panelHandlers,panelState;
const document={getElementById:get,createElement:()=>new Element(),hasFocus:()=>true,hidden:false,querySelectorAll:selector=>selector==='[data-yaw]'?yaw:selector==='[data-view]'?views:[],addEventListener:(key,fn)=>{docHandlers[key]=fn;}};
const window={addEventListener:(key,fn,capture=false)=>(handlers[key]??=[]).push({fn,capture}),parent:{postMessage(){} }};
const context=vm.createContext({console,document,window,createVehicleHUD:()=>({update(){},dispose(){}}),location:{origin:'http://test'},performance:{now:()=>0},localStorage:{getItem:()=>null,setItem(){}},requestAnimationFrame:fn=>frames.push(fn),setTimeout,Date,Math,Number,String,Set,Array,JSON,createPose,step,createAccessoryState,setAccessoryEnabled,accessoryAction,stepAccessories,createAccessoryPanel:(host,handlers)=>{panelHandlers=handlers;return {update:state=>{panelState=state;},dispose(){}};},movementCodes,cycleLight,stepSpeed,normalizeHeading,readPilotKeys,createTank:()=>({draw:(pose,options)=>draws.push({pose:{...pose},options:{...options}}),recenter(){},dispose(){}})});
let source=fs.readFileSync(new URL('../../dist/rov-simulator/rov.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
vm.runInContext(source,context);
let now=0;
function frame(){const fn=frames.shift();assert(fn);fn(now+=20);return draws.at(-1);}
function event(type,code,repeat=false,target=new Element()){
 const e={code,repeat,target,ctrlKey:false,metaKey:false,altKey:false,stopped:false,preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;}};
 for(const capture of[true,false])for(const h of handlers[type]??[]){if(h.capture!==capture)continue;if(e.stopped&&!capture)break;h.fn(e);}
 return e;
}
const check=(label,fn)=>{fn();console.log('PASS '+label);};
check('starts disarmed; movement cannot spin fans',()=>{event('keydown','KeyW');assert.equal(frame().options.thrusters,false);assert.match(get('unlock').textContent,/Disarmed/);});
check('Space toggles once; repeat cannot toggle again',()=>{event('keydown','Space');event('keydown','Space',true);event('keyup','Space');frame();assert.match(get('unlock').textContent,/Armed/);assert.equal(frame().options.thrusters,false);});
check('all rotational commands spin fans without Space held',()=>{for(const key of ['KeyZ','KeyX','KeyQ','KeyE','KeyT','KeyV']){event('keydown',key);assert.equal(frame().options.thrusters,true,key);event('keyup',key);assert.equal(frame().options.thrusters,false,key+' released');}});
check('Z/X oppose yaw; arrow keys no longer command ROV yaw',()=>{assert.equal(readPilotKeys(new Set(['KeyZ']),true,100).yaw,-1);assert.equal(readPilotKeys(new Set(['KeyX']),true,100).yaw,1);assert.equal(readPilotKeys(new Set(['ArrowLeft','ArrowRight']),true,100).yaw,0);});
check('disarm clears held commands; passive wave drift has no fan power',()=>{event('keydown','KeyW');assert(frame().options.thrusters);event('keydown','Space');for(let i=0;i<30;i++)frame();const last=draws.at(-1);assert.equal(last.options.thrusters,false);assert.match(get('unlock').textContent,/Disarmed/);assert(Math.hypot(last.pose.vx,last.pose.vz,last.pose.vd)>0);event('keyup','KeyW');});
check('blur disarms and requires explicit rearming',()=>{event('keydown','Space');event('keydown','KeyW');for(const h of handlers.blur??[])h.fn({});frame();assert.match(get('unlock').textContent,/Disarmed/);assert.equal(draws.at(-1).options.thrusters,false);});
check('Space from focused button is captured, preventing alternate activation',()=>{const e=event('keydown','Space',false,get('waves'));assert.equal(e.prevented,true);assert.equal(e.stopped,true);const up=event('keyup','Space',false,get('waves'));assert.equal(up.prevented,true);assert.equal(up.stopped,true);});
check('Space disarm immediately stops an active sampler and preserves partial fill',()=>{
 // The prior focused-button Space test leaves propulsion armed. Let motion settle
 // in calm water so the genuine low-speed sample gate can be satisfied.
 get('waves').onclick();for(let i=0;i<150;i++)frame();
 if(!get('unlock').textContent.startsWith('● Armed'))event('keydown','Space');
 panelHandlers.onToggle('sampler',true);panelHandlers.onAction('sample-start');
 assert.equal(panelState.sampling,true);for(let i=0;i<20;i++)frame();
 assert(panelState.sampleFill>0&&panelState.sampleFill<1);
 event('keydown','Space');assert.equal(panelState.sampling,false);
 const fill=panelState.sampleFill;for(let i=0;i<20;i++)frame();
 assert.equal(panelState.sampleFill,fill);assert.equal(panelState.samples,0);
});
check('four camera shortcuts select the view without arming propulsion',()=>{for(const [key,view]of [['Digit1','first'],['Digit2','close'],['Digit3','third'],['Digit4','free']]){event('keydown',key);assert.equal(frame().options.view,view);assert.equal(frame().options.thrusters,false);}get('free-recenter').onclick();});
console.log('9 pilot arming, fan and accessory integration checks passed');
