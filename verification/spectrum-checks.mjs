import assert from 'node:assert/strict';
import {createReadinessSpectrum} from '../dist/readiness-spectrum.mjs';
import {SYSTEM_TRL} from '../dist/readiness.mjs';
class Element{
 constructor(){this.handlers={};this.classes=new Set();this.classList={add:n=>this.classes.add(n),remove:n=>this.classes.delete(n)};}
 addEventListener(n,fn){(this.handlers[n]??=new Set()).add(fn);}
 removeEventListener(n,fn){this.handlers[n]?.delete(fn);}
 fire(n,event={}){for(const fn of this.handlers[n]||[])fn(event);}
 querySelector(){return this;}
}
function fixture(reduced=false){
 const root=new Element(),button=new Element(),document=new Element(),media=new Element();media.matches=reduced;document.hidden=false;
 document.getElementById=id=>id==='researchReadiness'?root:button;
 let observer;
 class Observer{constructor(fn){this.fn=fn;observer=this;}observe(){}disconnect(){this.disconnected=true;}visible(value){this.fn([{isIntersecting:value}]);}}
 const api=createReadinessSpectrum({document,window:{matchMedia:()=>media,IntersectionObserver:Observer}});
 return{root,button,document,media,observer,api};
}
const f=fixture();
assert.equal(f.api.info().running,false);f.observer.visible(true);assert.equal(f.api.info().running,true);
f.root.fire('animationend',{animationName:'trl-spectrum-sweep'});assert.equal(f.api.info().running,false);
f.observer.visible(false);f.observer.visible(true);assert.equal(f.api.info().running,false);
f.button.fire('click');assert.equal(f.api.info().running,true);f.api.setPage('studio');assert.equal(f.api.info().running,false);f.api.setPage('overview');assert.equal(f.api.info().running,false);
f.button.fire('click');f.document.hidden=true;f.document.fire('visibilitychange');assert.equal(f.api.info().running,false);f.document.hidden=false;f.document.fire('visibilitychange');assert.equal(f.api.info().running,false);
f.button.fire('click');f.media.matches=true;f.media.fire('change');assert.equal(f.api.info().running,false);assert.equal(f.button.disabled,true);
f.api.dispose();assert.equal(f.observer.disconnected,true);assert.equal(f.button.handlers.click.size,0);
const r=fixture(true);r.observer.visible(true);r.button.fire('click');assert.equal(r.api.info().running,false);assert.equal(r.api.info().played,false);
assert.equal(SYSTEM_TRL,2);
console.log('PASS finite entry/replay; offscreen, tab and hidden-page gating; reduced motion; disposal; rating unchanged.');
