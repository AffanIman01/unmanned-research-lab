const finite=v=>Number.isFinite(v),fmt=(v,n=1)=>finite(v)?v.toFixed(n):'—';
export const normalizedHeading=v=>((v%360)+360)%360;
export function hudValues(d){
 const speed=finite(d.speed)?Math.abs(d.speed):0,max=Math.max(d.vehicle==='USV'?5:3,Math.ceil(speed));
 const stats=[['heading',String(Math.round(normalizedHeading(d.heading??0))%360).padStart(3,'0')+'°'],[d.vehicle==='USV'?'heave':'depth',fmt(d.level,2)+' m'],['pitch',fmt(d.pitch)+'°'],['roll',fmt(d.roll)+'°'],['vertical',fmt(d.vertical,2)+' m/s'],['limit',fmt(d.drive,0)+'%']];
 if(finite(d.acceleration))stats.push(['vertical accel.',fmt(d.acceleration,2)+' m/s²']);
 if(d.vehicle==='ROV')stats.push(['light',fmt(d.lights,0)+'%']);
 if(finite(d.battery))stats.push(['battery',fmt(d.battery,0)+'%']);
 if(finite(d.tether))stats.push(['tether',fmt(d.tether,2)+' m']);
 if(finite(d.lift))stats.push(['lift',fmt(d.lift)+'%']);
 stats.push(['X / Z',fmt(d.x)+' / '+fmt(d.z)+' m']);
 return {speed,max,angle:-120+Math.min(1,speed/max)*240,stats};
}
export function createVehicleHUD(host){
 host.classList.add('vehicle-dashboard');host.setAttribute('role','group');host.setAttribute('aria-label','Simulated vehicle telemetry');
 const ticks=Array.from({length:25},(_,i)=>{const a=(-120+i*10)*Math.PI/180,r=i%4===0?65:70;return `<line x1="${90+Math.sin(a)*r}" y1="${88-Math.cos(a)*r}" x2="${90+Math.sin(a)*76}" y2="${88-Math.cos(a)*76}" class="${i%4===0?'major':''}"/>`;}).join('');
 host.innerHTML=`<div class="dash-title"><b data-hud="vehicle"></b><span data-hud="status"></span><small>SIM</small></div><div class="dash-core"><div class="dash-dial"><svg viewBox="0 0 180 156" aria-hidden="true"><path class="dash-track" d="M24.18 126 A76 76 0 1 1 155.82 126"/><g class="dash-ticks">${ticks}</g><g data-hud="needle" class="dash-needle"><path d="M87 87 L90 20 L93 87 Z"/><circle cx="90" cy="88" r="4"/></g></svg><div class="dash-speed"><strong data-hud="speed">0.00</strong><span>m/s</span><small data-hud="knots"></small></div><div class="dash-scale"><span>0</span><span data-hud="max"></span></div></div><dl class="dash-primary"></dl></div><dl class="dash-secondary"></dl><div class="dash-note" data-hud="note"></div>`;
 const get=name=>host.querySelector(`[data-hud="${name}"]`),primary=host.querySelector('.dash-primary'),secondary=host.querySelector('.dash-secondary');let signature='';
 const cells=new Map();
 return {update(d){const v=hudValues(d);get('vehicle').textContent=d.vehicle;get('status').textContent=d.status??(d.armed?'ARMED':'DISARMED');host.classList.toggle('is-armed',!!d.armed);get('speed').textContent=v.speed.toFixed(2);get('knots').textContent=(v.speed*1.943844).toFixed(2)+' kn';get('max').textContent=v.max.toFixed(0);get('needle').setAttribute('transform',`rotate(${v.angle} 90 88)`);get('note').textContent=d.note||'';const next=v.stats.map(x=>x[0]).join('|');if(next!==signature){primary.replaceChildren();secondary.replaceChildren();cells.clear();v.stats.forEach(([label],i)=>{const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;row.append(dt,dd);(i<4?primary:secondary).append(row);cells.set(label,dd);});signature=next;}v.stats.forEach(([k,value])=>cells.get(k).textContent=value);},dispose(){host.replaceChildren();}};
}
