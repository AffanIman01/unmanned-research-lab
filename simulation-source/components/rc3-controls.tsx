import {useId,useState} from 'react';
import './rc3-controls.css';
export type RC3Axis='throttle'|'strafe'|'heave'|'roll'|'pitch'|'steer';
type Props={onInput:(axis:RC3Axis,value:number)=>void;onStop:()=>void;onStabilize:()=>void;leveling:boolean;onLights:()=>void;onSpeed:(delta:number)=>void;manual:boolean;lightLevel:number;speedPercent:number;ready?:boolean};
function Hold({axis,value,label,shortcut,onInput,disabled}:{axis:RC3Axis;value:number;label:string;shortcut:string;onInput:Props['onInput'];disabled:boolean}){
 const [held,setHeld]=useState(false);
 const release=()=>{onInput(axis,0);setHeld(false);};
 return <button type="button" className={'rc3-key '+(held?'held':'')} disabled={disabled} aria-label={`${label} · ${shortcut}`} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);onInput(axis,value);setHeld(true);}} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release} onBlur={release} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();e.stopPropagation();if(!e.repeat){onInput(axis,value);setHeld(true);}}}} onKeyUp={e=>{if(e.key==='Enter'){e.preventDefault();e.stopPropagation();release();}}}><kbd>{shortcut}</kbd><span>{label}</span></button>;
}
export default function RC3Controls(p:Props){
 const id=useId().replace(/:/g,''),shell=id+'shell',well=id+'well';
 const hold=(axis:RC3Axis,value:number,label:string,key:string)=><Hold axis={axis} value={value} label={label} shortcut={key} onInput={p.onInput} disabled={!p.manual}/>;
 return <div className="rc3-console">
  <div className="rc3-console-head"><strong>CHASING <span>RC3</span></strong><small>SIMULATION CONTROLS</small></div>
  <div className="rc3-face">
   <svg viewBox="0 0 360 235" role="img" aria-label="Yellow CHASING controller reference with dual joysticks, mode, lock, light, Wi-Fi and power controls">
    <defs><linearGradient id={shell} x1="0" y1="0" x2=".7" y2="1"><stop stopColor="#fff377"/><stop offset=".4" stopColor="#f6d823"/><stop offset="1" stopColor="#c6a916"/></linearGradient><radialGradient id={well}><stop stopColor="#333b3b"/><stop offset=".72" stopColor="#11191b"/><stop offset="1" stopColor="#03080b"/></radialGradient></defs>
    <path d="M69 26C84 9 127 10 180 12C233 10 276 9 291 26C311 48 312 170 294 201C281 224 248 225 180 225C112 225 79 224 66 201C48 170 49 48 69 26Z" fill={`url(#${shell})`} stroke="#dec42f" strokeWidth="2"/>
    <path d="M66 201C80 220 118 220 180 220C242 220 280 220 294 201" fill="none" stroke="#8c7a26" opacity=".45"/>
    <path d="M174 4H186L184 63H176Z" fill="#141c1f"/>
    {[117,243].map((x,i)=><g key={x}><circle cx={x} cy="72" r="39" fill="#c8af1d"/><circle cx={x} cy="72" r="34" fill={`url(#${well})`} stroke="#fff178" strokeWidth="2"/><rect x={x-27} y="67" width="54" height="10" rx="3" fill="#333c3d"/><rect x={x-6} y="44" width="12" height="56" rx="3" fill="#333c3d"/><ellipse cx={x} cy="73" rx="14" ry="10" fill="#181f21"/><rect x={x-4} y="43" width="8" height="31" rx="2" fill="#8e9591"/><rect x={x-7} y="32" width="14" height="21" rx="5" fill="#c7cbc1"/><path d={`M${x-6} 37H${x+6}M${x-6} 42H${x+6}M${x-6} 47H${x+6}`} stroke="#6f7776"/><text x={x} y="106" textAnchor="middle" fontSize="6" fill="#675e29">{i?'RIGHT STICK':'LEFT STICK'}</text></g>)}
    <ellipse cx="180" cy="115" rx="8" ry="7" fill="#202726"/><rect x="177" y="103" width="6" height="11" rx="2" fill="#202726"/>
    {[112,180,248].map(x=><circle key={x} cx={x} cy="143" r="14" fill="#ebd237" stroke="#b8a02b" strokeWidth="1.5"/>)}
    <path d="M104 143H120M112 134V137M112 149V152" stroke="#4d4c25" strokeWidth="2"/><circle cx="112" cy="143" r="3" fill="none" stroke="#4d4c25"/>
    <rect x="175" y="141" width="10" height="8" rx="1" fill="none" stroke="#4d4c25" strokeWidth="1.5"/><path d="M177 141V138a3 3 0 0 1 6 0V141" fill="none" stroke="#4d4c25" strokeWidth="1.5"/>
    <circle cx="248" cy="143" r="4" fill="none" stroke="#4d4c25" strokeWidth="1.5"/>{Array.from({length:8},(_,i)=>{const a=i*Math.PI/4;return <path key={i} d={`M${248+Math.cos(a)*7} ${143+Math.sin(a)*7}L${248+Math.cos(a)*10} ${143+Math.sin(a)*10}`} stroke="#4d4c25" strokeWidth="1.5"/>;})}
    <circle cx="180" cy="166" r="3.5" fill={p.manual?'#7dc654':'#64725a'}/><rect x="162" y="182" width="36" height="14" rx="5" fill="#b5a02f"/><rect x="164" y="183" width="16" height="12" rx="4" fill="#f8df4a"/>
    {[94,107,120].map((x,i)=><g key={x}><circle cx={x} cy="189" r="2.5" fill={p.ready?'#6a934d':'#5e6549'}/><text x={x} y="201" textAnchor="middle" fontSize="5" fill="#56552c">{['ROV','2.4G','5G'][i]}</text></g>)}<circle cx="141" cy="189" r="7" fill="#f0d73f" stroke="#baa32d"/><text x="169" y="204" fontSize="5" fill="#56552c">ON</text><text x="187" y="204" fontSize="5" fill="#56552c">OFF</text><text x="222" y="194" fontWeight="700" fontSize="10" fill="#333b2d">CHASING</text>
   </svg>
   <button type="button" className="rc3-face-lock" onClick={p.onStop} aria-label="Stop simulation" title="Stop simulation">■</button>
   <button type="button" className="rc3-face-light" onClick={p.onLights} disabled={p.ready===false} aria-label={`Cycle lights · currently ${p.lightLevel}%`} title="Cycle lights · F">☼</button>
  </div>
  <div className="rc3-drive-keys"><div>{hold('throttle',1,'Forward','W')}{hold('throttle',-1,'Back','S')}</div><div>{hold('strafe',-1,'Left','A')}{hold('strafe',1,'Right','D')}</div></div>
  <div className="rc3-axis-keys"><div>{hold('roll',1,'Roll left','Q')}{hold('roll',-1,'Roll right','E')}</div><div>{hold('heave',1,'Ascend','R')}{hold('heave',-1,'Descend','C')}</div><div>{hold('pitch',1,'Pitch up','T')}{hold('pitch',-1,'Pitch down','V')}</div></div>
  <div className="rc3-yaw">{hold('steer',-1,'Yaw left','Z')}<button className="rc3-key" type="button" disabled={!p.manual} aria-pressed={p.leveling} onClick={p.onStabilize}><kbd>0</kbd><span>{p.leveling?'Leveling…':'Self-stabilize'}</span></button>{hold('steer',1,'Yaw right','X')}</div>
  <div className="rc3-settings"><button type="button" disabled={p.ready===false} onClick={p.onLights}><kbd>F</kbd> Light <strong>{p.lightLevel}%</strong></button><div><button type="button" disabled={p.ready===false||p.speedPercent<=25} onClick={()=>p.onSpeed(-1)} aria-label="Speed down · left bracket">[</button><span>Speed <strong>{p.speedPercent}%</strong></span><button type="button" disabled={p.ready===false||p.speedPercent>=100} onClick={()=>p.onSpeed(1)} aria-label="Speed up · right bracket">]</button></div></div>
 </div>;
}
