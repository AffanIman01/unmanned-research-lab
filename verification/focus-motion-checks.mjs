// Mock-DOM behavior checks only; no browser layout or GIF decoder is exercised.
import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {createFocusMotion} from '../dist/focus-motion.mjs';

class Element{
 constructor(){this.dataset={};this.events=new Map();this.attrs={};this.children=[];this.selectors=new Map();this.classes=new Set();this.srcWrites=[];this.classList={toggle:(key,on)=>on?this.classes.add(key):this.classes.delete(key)};}
 addEventListener(type,listener){if(!this.events.has(type))this.events.set(type,new Set());this.events.get(type).add(listener);}
 removeEventListener(type,listener){this.events.get(type)?.delete(listener);}
 dispatch(type,extra={}){for(const listener of this.events.get(type)||[])listener({type,target:this,...extra});}
 querySelector(selector){return this.selectors.get(selector)||null;}
 querySelectorAll(selector){return this.selectors.get(selector)||[];}
 setAttribute(key,value){this.attrs[key]=String(value);}
 contains(target){return !!target&&(target===this||this.children.some(child=>child.contains(target)));}
 set src(value){this._src=value;this.srcWrites.push(value);}
 get src(){return this._src;}
}
function fixture({reduced=false,observer=true,media=true,incomplete=false}={}){
 const document=new Element(),root=new Element(),preference=new Element();
 document.hidden=false;document.getElementById=id=>id==='overviewPanel'?root:null;preference.matches=reduced;
 const cards=['teleoperation','recovery'].map(id=>{
  const element=new Element(),image=new Element(),button=new Element(),heading=new Element(),inside=new Element();
  element.dataset.capability=id;heading.textContent=id==='teleoperation'?'Teleoperation':'Recovery';image.dataset={animation:`${id}.gif`,poster:`${id}.png`};
  element.children=[image,button,inside];element.selectors.set('img.ov-focus-animation',image);element.selectors.set('button.ov-preview-toggle',button);element.selectors.set('h3',heading);
  return {element,image,button,inside};
 });
 if(incomplete)cards[1].element.selectors.delete('img.ov-focus-animation');
 root.selectors.set('.ov-capability, [data-capability]',cards.map(card=>card.element));
 let intersection;
 class Observer{
  constructor(callback){this.callback=callback;this.targets=[];this.disconnected=false;intersection=this;}
  observe(target){this.targets.push(target);}
  disconnect(){this.disconnected=true;}
  visible(index,value){this.callback([{target:cards[index].element,isIntersecting:value}]);}
 }
 const window={...(observer?{IntersectionObserver:Observer}:{}),...(media?{matchMedia:()=>preference}:{})};
 const api=createFocusMotion({document,window});
 const visibleAll=()=>cards.forEach((_,index)=>intersection?.visible(index,true));
 return {document,root,cards,preference,window,api,get observer(){return intersection;},visibleAll};
}
const results=[];
function check(name,fn){fn();results.push({name,passed:true});console.log(`PASS ${name}`);}

check('No GIF is requested before first activation, including after becoming visible',()=>{
 const f=fixture();f.visibleAll();
 assert.equal(f.api.info().selected,null);
 for(const {image,button} of f.cards){assert.deepEqual(image.srcWrites,[image.dataset.poster]);assert.equal(button.attrs['aria-pressed'],'false');assert.match(button.attrs['aria-label'],/^Play .+ animation$/);}
});
check('Hover activates only one card and repeated state avoids unnecessary image reloads',()=>{
 const f=fixture();f.visibleAll();const [a,b]=f.cards;
 a.element.dispatch('pointerenter',{pointerType:'mouse'});assert.equal(a.image.src,'teleoperation.gif');
 const writes=a.image.srcWrites.length;a.element.dispatch('pointerenter',{pointerType:'mouse'});assert.equal(a.image.srcWrites.length,writes);
 b.element.dispatch('pointerenter',{pointerType:'mouse'});assert.equal(a.image.src,'teleoperation.png');assert.equal(b.image.src,'recovery.gif');
 assert.equal(f.api.info().cards.filter(card=>card.moving).length,1);
 b.element.dispatch('pointerleave');assert.equal(b.image.src,'recovery.png');
 assert(!a.element.classes.has('is-active'));assert(!b.element.classes.has('is-active'));
});
check('Keyboard focus starts motion, survives movement within card and stops when focus leaves',()=>{
 const f=fixture();f.visibleAll();const a=f.cards[0];
 a.element.dispatch('focusin');a.element.dispatch('pointerleave');assert.equal(a.image.src,'teleoperation.gif');assert(a.element.classes.has('is-preview-focused'));
 a.element.dispatch('focusout',{relatedTarget:a.inside});assert.equal(a.image.src,'teleoperation.gif');
 a.element.dispatch('focusout',{relatedTarget:null});assert.equal(a.image.src,'teleoperation.png');assert(!a.element.classes.has('is-preview-focused'));
});
check('Manual pause remains paused across hover, focus and environmental changes',()=>{
 const f=fixture();f.visibleAll();const a=f.cards[0];
 a.element.dispatch('pointerenter',{pointerType:'mouse'});a.button.dispatch('click');
 assert.equal(f.api.info().cards[0].intent,'pause');assert.equal(a.button.attrs['aria-pressed'],'false');assert.equal(a.button.attrs['aria-label'],'Play Teleoperation animation');
 a.element.dispatch('pointerleave');a.element.dispatch('focusin');a.element.dispatch('pointerenter',{pointerType:'mouse'});
 f.document.hidden=true;f.document.dispatch('visibilitychange');f.api.setPage('studio');f.observer.visible(0,false);
 f.document.hidden=false;f.document.dispatch('visibilitychange');f.api.setPage('overview');f.observer.visible(0,true);a.element.dispatch('focusin');
 assert.equal(a.image.src,'teleoperation.png');a.button.dispatch('click');assert.equal(a.image.src,'teleoperation.gif');
});
check('A first touch tap plays despite intervening focus, and the second tap pauses',()=>{
 const f=fixture();f.visibleAll();const a=f.cards[0];
 a.element.dispatch('pointerenter',{pointerType:'touch'});assert.equal(a.image.src,'teleoperation.png');
 a.button.dispatch('pointerdown');a.element.dispatch('focusin');a.button.dispatch('click');assert.equal(a.image.src,'teleoperation.gif');assert.equal(f.api.info().cards[0].intent,'play');
 a.button.dispatch('pointerdown');a.button.dispatch('click');assert.equal(a.image.src,'teleoperation.png');
});
check('Explicit play continues after hover leaves but yields to another selected card',()=>{
 const f=fixture();f.visibleAll();const [a,b]=f.cards;
 a.button.dispatch('click');a.element.dispatch('pointerleave');a.element.dispatch('focusout',{relatedTarget:null});assert.equal(a.image.src,'teleoperation.gif');
 b.element.dispatch('focusin');assert.equal(a.image.src,'teleoperation.png');assert.equal(b.image.src,'recovery.gif');
 assert.equal(a.button.attrs['aria-pressed'],'false');assert.equal(b.button.attrs['aria-label'],'Pause Recovery animation');
});
check('Reduced motion suppresses automatic previews while allowing deliberate play',()=>{
 const f=fixture({reduced:true});f.visibleAll();const a=f.cards[0];
 a.element.dispatch('pointerenter',{pointerType:'mouse'});a.element.dispatch('focusin');assert.equal(a.image.src,'teleoperation.png');
 a.button.dispatch('click');assert.equal(a.image.src,'teleoperation.gif');
 f.preference.dispatch('change',{matches:false});assert.equal(a.image.src,'teleoperation.gif');
 f.preference.dispatch('change',{matches:true});assert.equal(a.image.src,'teleoperation.png');
 f.preference.dispatch('change',{matches:false});assert.equal(a.image.src,'teleoperation.png');
});
check('Hidden, offscreen and Studio gates pause all GIFs until every gate permits playback',()=>{
 const f=fixture();f.visibleAll();const a=f.cards[0];a.button.dispatch('click');
 f.document.hidden=true;f.document.dispatch('visibilitychange');assert.equal(a.image.src,'teleoperation.png');
 f.api.setPage('studio');f.observer.visible(0,false);f.document.hidden=false;f.document.dispatch('visibilitychange');
 assert.equal(a.image.src,'teleoperation.png');f.api.setPage('overview');assert.equal(a.image.src,'teleoperation.png');
 f.observer.visible(0,true);assert.equal(a.image.src,'teleoperation.gif');
 f.observer.visible(0,false);assert.equal(a.image.src,'teleoperation.png');f.observer.visible(0,true);assert.equal(a.image.src,'teleoperation.gif');
});
check('Leaving Overview discards stale automatic hover and keyboard focus',()=>{
 const f=fixture();f.visibleAll();const a=f.cards[0];
 a.element.dispatch('focusin');a.element.dispatch('pointerenter',{pointerType:'mouse'});assert.equal(a.image.src,'teleoperation.gif');
 f.api.setPage('studio');f.api.setPage('overview');assert.equal(a.image.src,'teleoperation.png');
 a.element.dispatch('pointerenter',{pointerType:'mouse'});assert.equal(a.image.src,'teleoperation.gif');
});
check('Canceled pointer intent cannot alter a later keyboard click',()=>{
 const f=fixture();f.visibleAll();const a=f.cards[0];
 a.button.dispatch('pointerdown');a.element.dispatch('focusin');a.button.dispatch('pointercancel');a.button.dispatch('click');
 assert.equal(a.image.src,'teleoperation.png');
 a.button.dispatch('click');assert.equal(a.image.src,'teleoperation.gif');
 a.button.dispatch('pointerdown');a.button.dispatch('pointerleave');a.button.dispatch('click');assert.equal(a.image.src,'teleoperation.png');
});
check('Disposal restores posters, removes listeners and disconnects observers',()=>{
 const f=fixture();f.visibleAll();const a=f.cards[0];a.button.dispatch('click');f.api.dispose();f.api.dispose();
 assert.equal(f.observer.disconnected,true);assert.equal(f.api.info().disposed,true);assert.equal(a.image.src,'teleoperation.png');
 a.button.dispatch('click');a.element.dispatch('focusin');f.api.setPage('overview');f.document.dispatch('visibilitychange');assert.equal(a.image.src,'teleoperation.png');
 assert.equal(a.button.events.get('click').size,0);assert.equal(f.document.events.get('visibilitychange').size,0);assert.equal(f.preference.events.get('change').size,0);
});
check('Missing optional APIs, absent Overview and incomplete cards are handled safely',()=>{
 const f=fixture({observer:false,media:false,incomplete:true});assert.equal(f.api.info().cards.length,1);
 f.cards[0].element.dispatch('focusin');assert.equal(f.cards[0].image.src,'teleoperation.gif');f.api.dispose();
 assert.equal(createFocusMotion({document:{getElementById:()=>null},window:{}}),null);
 const empty=new Element();empty.getElementById=()=>new Element();assert.equal(createFocusMotion({document:empty,window:{}}),null);
});

await writeFile(new URL('./focus-motion-results.json',import.meta.url),JSON.stringify({revision:'AC',checks:results.length,passed:results.length,scope:'Mock-DOM lazy GIF loading, exclusive previews, touch and keyboard access, reduced motion, environmental pause gates, cleanup.',browserPreview:'Not run: control-browser unavailable',results},null,2)+'\n');
console.log(`\n${results.length} focus motion checks passed.`);
