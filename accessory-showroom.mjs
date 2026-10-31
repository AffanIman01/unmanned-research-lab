import * as T from 'three';
import {attachRovAccessories} from './rov-accessories.mjs';
import {createAccessoryState,ACCESSORY_CATALOG} from './rov-accessory-data.mjs';

export const SHOWROOM_TOOLS=['grabber','laser','sampler','sonar'];
export const SHOWROOM_LABELS={grabber:'Open → grip → release',laser:'Twin beams → 10 cm reference',sampler:'Intake → fill → retain',sonar:'Rotate → ping → echo'};
// Separate explanatory plinths; not four tools mounted simultaneously on the ROV.
export function createAccessoryShowroom(){
 const root=new T.Group();root.name='ROV_accessory_function_gallery';root.visible=false;
 const slots=new Map();let selected='all',playing=true,time=0;
 const metal=new T.MeshStandardMaterial({color:0x302c37,metalness:.55,roughness:.42});
 const trim=new T.MeshStandardMaterial({color:0x9c718d,metalness:.65,roughness:.35,emissive:0x342435,emissiveIntensity:.3});
 const offsets={grabber:[0,.22,-.27],laser:[0,.16,-.28],sampler:[.17,.21,.02],sonar:[0,0,.17]};
 function label(text){
  if(typeof document==='undefined')return null;
  const c=document.createElement('canvas');c.width=512;c.height=100;const x=c.getContext('2d');if(!x)return null;
  x.fillStyle='#d4c7d7';x.font='500 42px -apple-system, sans-serif';x.textAlign='center';x.fillText(text,256,61);
  const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;
  const p=new T.Mesh(new T.PlaneGeometry(.61,.119),new T.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false}));p.rotation.x=-Math.PI/2;p.position.set(0,.044,.36);return p;
 }
 for(const [i,id]of SHOWROOM_TOOLS.entries()){
  const group=new T.Group();group.name='Accessory_plinth_'+id;group.position.set((i%2===0?-.65:.65),0,1.85+Math.floor(i/2)*1.30);root.add(group);
  const plinth=new T.Mesh(new T.CylinderGeometry(.48,.50,.055,64),metal);plinth.position.y=.01;plinth.receiveShadow=true;group.add(plinth);
  const ring=new T.Mesh(new T.TorusGeometry(.473,.003,8,80),trim);ring.rotation.x=Math.PI/2;ring.position.y=.041;group.add(ring);
  const words=label(ACCESSORY_CATALOG.find(t=>t.id===id).short);if(words)group.add(words);
  const mount=new T.Group();mount.position.fromArray(offsets[id]);group.add(mount);
  const rig=attachRovAccessories(mount),state=createAccessoryState();state.enabled[id]=true;
  let target=null;
  if(id==='laser'){
   target=new T.Mesh(new T.BoxGeometry(.28,.18,.008),new T.MeshStandardMaterial({color:0x708284,roughness:.8}));target.position.set(0,.16,.29);group.add(target);
   const ruler=new T.LineSegments(new T.BufferGeometry().setFromPoints([new T.Vector3(-.05,.19,.284),new T.Vector3(.05,.19,.284),new T.Vector3(-.05,.18,.284),new T.Vector3(-.05,.20,.284),new T.Vector3(.05,.18,.284),new T.Vector3(.05,.20,.284)]),new T.LineBasicMaterial({color:0xe2ce9c}));group.add(ruler);
  }
  const halo=new T.Mesh(new T.RingGeometry(.50,.508,80),new T.MeshBasicMaterial({color:0xddba74,transparent:true,opacity:.5,side:T.DoubleSide,depthWrite:false}));halo.rotation.x=-Math.PI/2;halo.position.y=.044;group.add(halo);
  const box=new T.Box3(new T.Vector3(-.59,-.03,-.59).add(group.position),new T.Vector3(.59,.48,.59).add(group.position));
  slots.set(id,{group,rig,state,target,halo,box});
 }
 function update(dt){
  if(!root.visible)return;if(playing)time+=Math.max(0,Math.min(.1,dt));
  for(const [id,s]of slots){
   const phase=(time%6)/6;s.state.grabberAperture=.5+.5*Math.cos(time*1.5);s.state.grabberClosed=s.state.grabberAperture<.5;
   s.state.laserOn=true;s.state.sampleFill=phase<.7?phase/.7:1;s.state.sonarOn=true;s.state.sonarPhase=time*.9;
   s.rig.update(s.state,{targets:s.target?[s.target]:[]});s.halo.visible=selected===id;s.halo.material.opacity=.3+.15*Math.sin(time*2);
  }
 }
 return {root,update,select(id){selected=SHOWROOM_TOOLS.includes(id)?id:'all';update(0);},play(on){playing=!!on;},restart(){time=0;update(0);},bounds(id=selected){if(slots.has(id))return slots.get(id).box.clone();const b=new T.Box3();for(const s of slots.values())b.union(s.box);return b;},info(){return {selected,playing,time,ids:[...slots.keys()],units:'metres',source:'illustrative',separateDisplay:true};}};
}

export function createAccessoryShowroomUI(host,{onSelect,onPlay,onClose}){
 const panel=document.createElement('section');panel.className='accessory-gallery';panel.hidden=true;panel.setAttribute('aria-label','ROV accessory showroom');
 panel.innerHTML='<div class="accessory-gallery-heading"><div><small>PAYLOAD COLLECTION · 04</small><b>Explore the tools.</b></div><button data-close aria-label="Close accessories">×</button></div><div class="accessory-gallery-tabs" role="group" aria-label="Accessory selection"></div><div class="accessory-gallery-caption"><span data-flow></span><div><button data-play>Ⅱ Pause</button><a data-source target="_blank" rel="noreferrer">CHASING ↗</a></div></div><small class="accessory-gallery-note">Illustrative geometry & function · not live sensor data</small>';
 const tabs=panel.querySelector('.accessory-gallery-tabs');let selected='all',playing=true;
 for(const id of ['all',...SHOWROOM_TOOLS]){const b=document.createElement('button');b.dataset.tool=id;b.textContent=id==='all'?'All tools':ACCESSORY_CATALOG.find(t=>t.id===id).short;b.onclick=()=>select(id);tabs.append(b);}
 function select(id){selected=id;for(const b of tabs.children)b.setAttribute('aria-pressed',String(b.dataset.tool===id));panel.querySelector('[data-flow]').textContent=SHOWROOM_LABELS[id]||'Choose a tool · watch it work';const link=panel.querySelector('[data-source]');link.hidden=id==='all';if(id!=='all')link.href=ACCESSORY_CATALOG.find(t=>t.id===id).source;onSelect(id);}
 panel.querySelector('[data-play]').onclick=e=>{playing=!playing;e.currentTarget.textContent=playing?'Ⅱ Pause':'▶ Play';e.currentTarget.setAttribute('aria-pressed',String(!playing));onPlay(playing);};panel.querySelector('[data-close]').onclick=onClose;host.append(panel);
 return {show(open){panel.hidden=!open;if(open)select('all');},get selected(){return selected;}};
}
