import * as T from 'three';
import {DEMO_HALF_ANGLE,DEMO_REACH_M,radarPhase,illustrativeReturn} from './radar-principle.mjs?v=single-radar-correction';

export function createRadarDemo({scene,host,camera}) {
 const group=new T.Group();group.name='illustrative_forward_radar_not_exported';group.visible=false;scene.add(group);
 const color=0xffb35b,sensors=[];
 function arc(radius){const points=[];for(let i=0;i<=40;i++){const a=-DEMO_HALF_ANGLE+2*DEMO_HALF_ANGLE*i/40;points.push(new T.Vector3(Math.sin(a)*radius,0,Math.cos(a)*radius));}return new T.BufferGeometry().setFromPoints(points);}
 { // One forward sensor, attached to the center radar housing.
  const root=new T.Group();group.add(root);const vertices=[];
  for(let j=0;j<40;j++){const a=-DEMO_HALF_ANGLE+2*DEMO_HALF_ANGLE*j/40,b=-DEMO_HALF_ANGLE+2*DEMO_HALF_ANGLE*(j+1)/40;vertices.push(0,0,0,Math.sin(a)*DEMO_REACH_M,0,Math.cos(a)*DEMO_REACH_M,Math.sin(b)*DEMO_REACH_M,0,Math.cos(b)*DEMO_REACH_M);}
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
  const fan=new T.Mesh(geo,new T.MeshBasicMaterial({color,transparent:true,opacity:.055,side:T.DoubleSide,depthWrite:false}));root.add(fan);
  const rim=new T.Line(arc(DEMO_REACH_M),new T.LineBasicMaterial({color,transparent:true,opacity:.24,depthWrite:false}));root.add(rim);
  const wave=new T.Line(arc(1),new T.LineBasicMaterial({color,transparent:true,opacity:.8,depthWrite:false}));root.add(wave);
  const ring=new T.Mesh(new T.TorusGeometry(.055,.004,6,32),new T.MeshBasicMaterial({color,transparent:true,opacity:.8,depthWrite:false}));ring.position.z=.026;root.add(ring);
  const link=new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(),new T.Vector3()]),new T.LineDashedMaterial({color,transparent:true,opacity:.6,dashSize:.05,gapSize:.035,depthWrite:false}));group.add(link);
  const echo=new T.Mesh(new T.SphereGeometry(.035,10,8),new T.MeshBasicMaterial({color}));group.add(echo);
  sensors.push({root,fan,rim,wave,ring,link,echo,origin:new T.Vector3(),forward:new T.Vector3(),result:null});
 }
 const target=new T.Group();group.add(target);
 const head=new T.Mesh(new T.SphereGeometry(.16,20,14),new T.MeshStandardMaterial({color:0xe2d7c4,emissive:0xffb35b,emissiveIntensity:0,roughness:.4}));target.add(head);
 const pole=new T.Mesh(new T.CylinderGeometry(.018,.018,1,10),new T.MeshStandardMaterial({color:0x929e9f,metalness:.5,roughness:.5}));target.add(pole);
 const base=new T.Mesh(new T.CylinderGeometry(.19,.23,.13,24),new T.MeshStandardMaterial({color:0xc38c41,roughness:.45}));target.add(base);
 const label=document.createElement('div');label.className='radar-obstacle-label';label.textContent='Demo obstacle';label.hidden=true;host.append(label);
 const state={active:false,paused:false,time:0,distance:3,lateral:0,enabled:[true]};let ui=null,ownerCard=null,onReframe=()=>{},anchors=[];
 function stop(){state.active=false;group.visible=false;label.hidden=true;host.classList.remove('radar-demonstrating');ownerCard?.classList.remove('radar-active');if(ui){ui.content.hidden=true;ui.toggle.textContent='Show how it works';ui.toggle.setAttribute('aria-expanded','false');}}
 function mount(card,{onView}){
  stop();ownerCard=card;onReframe=onView;
  const section=document.createElement('section');section.className='radar-explanation';
  const toggle=document.createElement('button');toggle.type='button';toggle.className='radar-demo-toggle';toggle.textContent='Show how it works';toggle.setAttribute('aria-expanded','false');
  const content=document.createElement('div');content.className='radar-demo-controls';content.hidden=true;
  const caption=document.createElement('p');caption.className='radar-demo-caption';caption.textContent='ILLUSTRATIVE · NOT LIVE DATA';content.append(caption);
  const steps=document.createElement('div');steps.className='radar-steps';for(const text of['Transmit','Echo','Distance']){const span=document.createElement('span');span.textContent=text;steps.append(span);}content.append(steps);
  const explanation=document.createElement('p');explanation.className='radar-step-description';content.append(explanation);
  function slider(labelText,min,max,value,property){const wrapper=document.createElement('label');wrapper.className='radar-slider';const row=document.createElement('span'),name=document.createElement('span'),valueText=document.createElement('output');name.textContent=labelText;valueText.textContent=value.toFixed(1)+' m';row.append(name,valueText);const input=document.createElement('input');input.type='range';input.min=min;input.max=max;input.step=.1;input.value=value;input.setAttribute('aria-label',labelText);input.oninput=()=>{state[property]=Number(input.value);valueText.textContent=state[property].toFixed(1)+' m';state.time=0;};wrapper.append(row,input);content.append(wrapper);return input;}
  const distance=slider('Obstacle ahead',1,6,state.distance,'distance'),lateral=slider('Side offset',-3,3,state.lateral,'lateral');
  const result=document.createElement('div');result.className='radar-readouts';const outputs=[];for(const title of['Forward radar']){const row=document.createElement('div'),name=document.createElement('span'),value=document.createElement('output');name.textContent=title;value.textContent='Awaiting echo';row.append(name,value);result.append(row);outputs.push(value);}content.append(result);
  const actions=document.createElement('div');actions.className='radar-actions';const pause=document.createElement('button'),replay=document.createElement('button');pause.type=replay.type='button';pause.textContent='Pause';replay.textContent='Replay';pause.onclick=()=>{state.paused=!state.paused;pause.textContent=state.paused?'Play':'Pause';};replay.onclick=()=>{state.time=0;state.paused=false;pause.textContent='Pause';};actions.append(pause,replay);content.append(actions);
  const note=document.createElement('p');note.className='radar-demo-note';note.textContent='Waves slowed for clarity. Shaded coverage is a sketch; actual beam width is unknown.';content.append(note);
  section.append(toggle,content);card.append(section);ui={content,toggle,steps,explanation,outputs,pause,distance,lateral};
  toggle.onclick=()=>{if(state.active){stop();onReframe(false);return;}state.active=true;state.time=0;state.paused=window.matchMedia('(prefers-reduced-motion: reduce)').matches;content.hidden=false;toggle.textContent='Back to sensor';toggle.setAttribute('aria-expanded','true');pause.textContent=state.paused?'Play':'Pause';card.classList.add('radar-active');host.classList.add('radar-demonstrating');onReframe(true);card.scrollTop=0;};
 }
 function update(nextAnchors,dt){anchors=nextAnchors;if(!state.active||anchors.length!==1){group.visible=false;label.hidden=true;return;}group.visible=true;if(!state.paused)state.time+=dt;const phase=radarPhase(state.time),center=anchors[0].position.clone(),forward=new T.Vector3(0,0,1).applyQuaternion(anchors[0].quaternion),side=new T.Vector3(1,0,0).applyQuaternion(anchors[0].quaternion);
  target.position.copy(center).addScaledVector(forward,state.distance).addScaledVector(side,state.lateral);const height=target.position.y+.15;pole.scale.y=height;pole.position.y=-height/2;base.position.y=-height;head.material.emissiveIntensity=phase.step===1?.7:phase.step===2?.2:0;
  sensors.forEach((s,i)=>{s.origin.copy(anchors[i].position);s.forward.set(0,0,1).applyQuaternion(anchors[i].quaternion);s.root.position.copy(s.origin);s.root.quaternion.copy(anchors[i].quaternion);s.root.visible=state.enabled[i];s.result=illustrativeReturn(s.origin.toArray(),target.position.toArray(),s.forward.toArray(),state.enabled[i]);s.wave.visible=state.enabled[i]&&phase.step===0;s.wave.scale.setScalar(Math.max(.01,phase.travel*(s.result.inside?s.result.range:DEMO_REACH_M)));s.echo.visible=s.result.inside&&phase.step===1;if(s.echo.visible)s.echo.position.lerpVectors(target.position,s.origin,phase.travel);s.link.visible=s.result.inside&&phase.step>0;const pos=s.link.geometry.getAttribute('position');pos.setXYZ(0,s.origin.x,s.origin.y,s.origin.z);pos.setXYZ(1,target.position.x,target.position.y,target.position.z);pos.needsUpdate=true;s.link.geometry.computeBoundingSphere();s.link.computeLineDistances();s.fan.material.opacity=phase.step===2&&s.result.inside?.085:.045;});
  head.material.emissiveIntensity=sensors.some(s=>s.result?.inside)?(phase.step===1?.7:phase.step===2?.2:0):0;
  const descriptions=['The forward radar sends radio waves outward.','The object reflects some energy back to the radar.','Echo processing estimates distance. These data help the navigation controller avoid obstacles.'];if(ui){[...ui.steps.children].forEach((s,i)=>s.classList.toggle('active',i===phase.step));ui.explanation.textContent=descriptions[phase.step];sensors.forEach((s,i)=>ui.outputs[i].textContent=!state.enabled[i]?'Off':phase.step<2?'Awaiting echo':s.result.inside?s.result.range.toFixed(2)+' m · demo':'No echo in sketch');}
  const projected=target.position.clone().add(new T.Vector3(0,.25,0)).project(camera);label.hidden=projected.z>1||projected.z< -1||Math.abs(projected.x)>1||Math.abs(projected.y)>1;if(!label.hidden)label.style.transform=`translate(${(projected.x+1)*host.clientWidth/2}px,${(1-projected.y)*host.clientHeight/2}px) translate(-50%,-50%)`;
 }
 function framing(){if(anchors.length!==1)return null;const center=anchors[0].position.clone(),forward=new T.Vector3(0,0,1).applyQuaternion(anchors[0].quaternion);return {center,forward};}
 return {mount,stop,update,framing,get active(){return state.active;},info(){return {...state,enabled:[...state.enabled],phase:radarPhase(state.time).name,returns:sensors.map(s=>s.result),illustrative:true};}};
}
