import {ACCESSORY_CATALOG,ACCESSORY_PANEL_CSS,accessoryReadout} from '../../dist/rov-accessory-data.mjs';
type AccessoryId='grabber'|'laser'|'sampler'|'sonar';
type State={enabled:Record<AccessoryId,boolean>;grabberClosed:boolean;laserOn:boolean;sonarOn:boolean;sampleFill:number;sampling:boolean;samples:number;lastSample:null|{depth:number};laserRange:number|null;message:string};
type Props={state:State;onToggle:(id:AccessoryId,enabled:boolean)=>void;onAction:(action:string)=>void};
export default function RovAccessoryPanel({state,onToggle,onAction}:Props){
 return <section className="rov-tools" aria-label="Selectable CHASING ROV accessories">
  <style>{ACCESSORY_PANEL_CSS}</style>
  <div className="rov-tools-head"><b>ROV accessories</b><small>SIMULATED TOOLS</small></div>
  {ACCESSORY_CATALOG.map((item:{id:AccessoryId;name:string;short:string;source:string})=><div className="rov-tool-row" key={item.id}>
   <label><input type="checkbox" checked={state.enabled[item.id]} onChange={e=>onToggle(item.id,e.target.checked)}/>{item.short}</label>
   <div className="rov-tool-actions">
    <span className="rov-tool-readout">{state.enabled[item.id]?accessoryReadout(state,item.id):'Not mounted'}</span>
    {item.id==='grabber'&&<button disabled={!state.enabled.grabber} onClick={()=>onAction('grabber-toggle')}>{state.grabberClosed?'Open':'Close'}</button>}
    {item.id==='laser'&&<button disabled={!state.enabled.laser} onClick={()=>onAction('laser-toggle')}>{state.laserOn?'Laser off':'Laser on'}</button>}
    {item.id==='sonar'&&<button disabled={!state.enabled.sonar} onClick={()=>onAction('sonar-toggle')}>{state.sonarOn?'Stop scan':'Scan'}</button>}
    {item.id==='sampler'&&<><button disabled={!state.enabled.sampler||state.sampling||state.sampleFill>=1} onClick={()=>onAction('sample-start')}>Collect</button><button disabled={!state.enabled.sampler} onClick={()=>onAction('sample-reset')}>Empty</button></>}
    <a className="rov-tool-source" href={item.source} target="_blank" rel="noreferrer" aria-label={'Official '+item.name+' information'}>↗</a>
   </div>
  </div>)}
  <p className="rov-tool-message" role="status">{state.message}</p>
  <details><summary>Simulation limits</summary><p>Official compatible accessories; illustrative mounts. Grabber animates jaws only. Lasers use the marked reference plate; range is computed from scene geometry. Sampler filling, sonar sweep/echoes and recorded depth are synthetic. Tool timing, fit and control gates are not hardware validation.</p></details>
 </section>;
}
