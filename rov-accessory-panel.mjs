import {ACCESSORY_CATALOG,ACCESSORY_PANEL_CSS,accessoryReadout} from './rov-accessory-data.mjs';
// Passive UI: callbacks own mutations; update(state) refreshes visible state.
export function createAccessoryPanel(host,{onToggle,onAction}){
 const style=document.createElement('style');style.textContent=ACCESSORY_PANEL_CSS;
 const root=document.createElement('section');root.className='rov-tools';root.setAttribute('aria-label','Selectable CHASING ROV accessories');
 const head=document.createElement('div');head.className='rov-tools-head';head.innerHTML='<b>ROV accessories</b><small>SIMULATED TOOLS</small>';root.append(head);
 const rows=new Map();
 for(const item of ACCESSORY_CATALOG){
  const row=document.createElement('div');row.className='rov-tool-row';const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.onchange=()=>onToggle(item.id,input.checked);label.append(input,document.createTextNode(item.short));
  const actions=document.createElement('div');actions.className='rov-tool-actions';const readout=document.createElement('span');readout.className='rov-tool-readout';actions.append(readout);
  const buttons=[];for(const action of item.id==='grabber'?['grabber-toggle']:item.id==='laser'?['laser-toggle']:item.id==='sonar'?['sonar-toggle']:['sample-start','sample-reset']){const b=document.createElement('button');b.type='button';b.onclick=()=>onAction(action);actions.append(b);buttons.push({action,b});}
  const source=document.createElement('a');source.href=item.source;source.target='_blank';source.rel='noreferrer';source.textContent='↗';source.className='rov-tool-source';source.setAttribute('aria-label','Official '+item.name+' information');actions.append(source);row.append(label,actions);root.append(row);rows.set(item.id,{input,readout,buttons});
 }
 const message=document.createElement('p');message.className='rov-tool-message';message.setAttribute('role','status');root.append(message);
 const limits=document.createElement('details');limits.innerHTML='<summary>Simulation limits</summary><p>Official compatible accessories; illustrative mounts. Grabber animates jaws only. Lasers use the marked reference plate; range is computed from scene geometry. Sampler filling, sonar sweep/echoes and recorded depth are synthetic. Tool timing, fit and control gates are not hardware validation.</p>';root.append(limits);host.append(style,root);
 return {update(state){for(const [id,row]of rows){row.input.checked=state.enabled[id];row.readout.textContent=state.enabled[id]?accessoryReadout(state,id):'Not mounted';for(const {action,b}of row.buttons){b.disabled=!state.enabled[id]||(action==='sample-start'&&(state.sampling||state.sampleFill>=1));b.textContent=action==='grabber-toggle'?(state.grabberClosed?'Open':'Close'):action==='laser-toggle'?(state.laserOn?'Laser off':'Laser on'):action==='sonar-toggle'?(state.sonarOn?'Stop scan':'Scan'):action==='sample-start'?'Collect':'Empty';}}message.textContent=state.message;},dispose(){root.remove();style.remove();}};
}
