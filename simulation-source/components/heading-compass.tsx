import {headingDegrees} from '@/lib/pilot-controls';
export default function HeadingCompass({heading,vehicle}:{heading:number;vehicle:string}){
 const h=headingDegrees(heading*Math.PI/180),base=Math.floor(h/5)*5;
 const labels:Record<number,string>={0:'N',45:'NE',90:'E',135:'SE',180:'S',225:'SW',270:'W',315:'NW'};
 return <div className="heading-compass" role="img" aria-label={`${vehicle} heading ${h.toFixed(1)} degrees. North 0, East 90, South 180, West 270.`}>
  <div className="compass-tape">{Array.from({length:23},(_,i)=>{const angle=base+(i-11)*5,n=((angle%360)+360)%360;return <span key={angle} className={'compass-tick '+(n%45===0?'cardinal':'')} style={{left:`${50+(angle-h)*.85}%`}}><i/>{labels[n]??n}</span>;})}</div>
  <span className="compass-pointer">▾</span><strong>{String(Math.round(h)%360).padStart(3,'0')}°</strong><small>{vehicle} · SIM</small>
 </div>;
}
