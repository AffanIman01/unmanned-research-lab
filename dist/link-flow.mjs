// Illustrative control/data topology. Packet positions are advanced only by update(dt).
// Solid equipment chains are physical references; dashed network/control links are proposed.
const NS = 'http://www.w3.org/2000/svg';
const commonEdges = [
  {id:'gateway',points:[[620,140],[664,140],[664,243],[702,243]],proposed:true,both:true},
  {id:'vessel-control',points:[[702,243],[649,243],[649,335],[620,335]],proposed:true,both:true},
  {id:'rov-control',points:[[788,282],[788,332]],proposed:true,both:true},
  {id:'stereo-depth',points:[[741,140],[741,175],[747,175],[747,204]],dataOnly:true,proposed:true},
  {id:'lidar-points',points:[[883,140],[883,175],[851,175],[851,204]],dataOnly:true,proposed:true},
  {id:'controller-reel',points:[[844,368],[874,368]],both:true},
  {id:'retained-tether',points:[[914,404],[914,468],[866,468],[866,499]],both:true},
];
const routeEdges = {
  radio:[
    {id:'shore-radio',points:[[130,300],[130,249]],both:true},
    {id:'radio-uplink',points:[[230,180],[310,180],[354,140],[490,140]],both:true,wireless:true},
    {id:'oem-radio',points:[[549,180],[549,300]],both:true},
  ],
  internet:[
    {id:'shore-internet',points:[[130,300],[130,249]],both:true,proposed:true},
    {id:'internet-uplink',points:[[230,180],[310,180],[354,140],[490,140]],both:true,wireless:true,proposed:true},
  ]
};

function geometry(points){
  const lengths=points.slice(1).map((point,index)=>Math.hypot(point[0]-points[index][0],point[1]-points[index][1]));
  const total=lengths.reduce((sum,length)=>sum+length,0);
  return {points,lengths,total,d:points.map((point,index)=>`${index?'L':'M'}${point[0]} ${point[1]}`).join(' ')};
}

function sample(path,t){
  let distance=Math.max(0,Math.min(1,t))*path.total;
  for(let index=0;index<path.lengths.length;index++){
    const length=path.lengths[index];
    if(distance<=length||index===path.lengths.length-1){
      const amount=length?distance/length:0;
      return path.points[index].map((value,axis)=>value+(path.points[index+1][axis]-value)*amount);
    }
    distance-=length;
  }
  return path.points[0];
}

function tripod(x){
  return `<g class="lf-tripod" transform="translate(${x} 0)">
    <path class="lf-antenna" d="M0 121V184"/>
    <path class="lf-stand" d="M0 184V218M0 207L-18 233M0 207L18 233M0 207V237"/>
    <path class="lf-connector" d="M-4 183H4M-4 193H4M-4 207H4"/>
    <path class="lf-coax" d="M3 192C20 207 3 216 16 221"/>
  </g>`;
}

function graphics(route){
  const radio=route==='radio';
  return `<svg class="lf-diagram" xmlns="${NS}" viewBox="0 0 1000 586" role="img" aria-labelledby="lf-title lf-desc">
    <title id="lf-title">${radio?'Radio':'Internet / Starlink'} control and data flow</title>
    <desc id="lf-desc">Conceptual architecture: the shore laptop reaches the USV through ${radio?'1.4 GHz ground radio and two tripod antennas matched to USV antennas 1 and 4':'the Internet and Starlink'}. ZED stereo depth and RoboSense LiDAR data feed a proposed Jetson gateway. Dashed interfaces to the USV control system and CHASING controller need OEM validation. The CHASING controller, E-Reel and underwater ROV remain connected by a physical tether. Gold packets show commands; cyan packets show returning data. This is an animation, not live telemetry.</desc>
    <defs>
      <linearGradient id="lf-water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#72d8da" stop-opacity=".065"/><stop offset="1" stop-color="#72d8da" stop-opacity="0"/></linearGradient>
    </defs>
    <rect class="lf-zone" x="20" y="65" width="225" height="362" rx="18"/>
    <rect class="lf-zone lf-vessel-zone" x="474" y="45" width="501" height="393" rx="18"/>
    <text class="lf-zone-label" x="39" y="88">SHORE</text>
    <text class="lf-zone-label" x="495" y="68">OCEANALPHA ME120</text>
    <path d="M20 454C95 448 141 460 215 454S343 448 417 454S550 460 627 454S752 448 831 454S929 460 980 454V580H20Z" fill="url(#lf-water)"/>
    <path class="lf-waterline" d="M20 454C95 448 141 460 215 454S343 448 417 454S550 460 627 454S752 448 831 454S929 460 980 454"/>
    <text class="lf-water-label" x="40" y="480">UNDERWATER</text>
    <g class="lf-path-layer"></g>

    <g class="lf-node lf-laptop" aria-label="Operator laptop">
      <rect x="49" y="300" width="162" height="104" rx="12"/>
      <rect class="lf-icon" x="99" y="317" width="61" height="36" rx="3"/>
      <path class="lf-icon" d="M94 357H165L160 362H99Z"/>
      <path class="lf-screen-chart" d="M108 341L117 336L126 342L137 327L150 332"/>
      <text class="lf-name" x="130" y="383">Operator laptop</text>
    </g>

    ${radio?`<g class="lf-node lf-uplink">
      <rect x="30" y="103" width="200" height="146" rx="12"/>
      ${tripod(76)}${tripod(181)}
      <rect class="lf-radio-device" x="107" y="204" width="45" height="22" rx="3"/>
      <circle class="lf-led" cx="116" cy="216" r="2"/>
      <path class="lf-icon" d="M134 211H145M134 216H145M134 221H145"/>
      <text class="lf-small" x="130" y="119">2 × 1.4 GHz antennas</text>
      <text class="lf-small" x="130" y="242">Ground radio</text>
    </g>`:`<g class="lf-node lf-uplink">
      <rect x="30" y="103" width="200" height="146" rx="12"/>
      <path class="lf-cloud" d="M87 190C67 190 67 159 86 157C86 131 127 126 137 148C161 139 184 170 167 187C162 192 153 193 146 193H87Z"/>
      <path class="lf-icon" d="M118 184V160M110 168L118 160L126 168M139 165V187M131 179L139 187L147 179"/>
      <text class="lf-name" x="130" y="223">Internet</text>
      <text class="lf-small" x="130" y="241">Proposed backhaul</text>
    </g>`}

    <g class="lf-node lf-ingress">
      <rect x="490" y="100" width="130" height="80" rx="11"/>
      ${radio?`<path class="lf-icon" d="M530 121V138M574 121V138M526 119H534M570 119H578"/>
      <rect class="lf-icon" x="524" y="138" width="56" height="17" rx="3"/>
      <circle class="lf-led" cx="533" cy="146" r="2"/>
      <text class="lf-name" x="555" y="170">USV radio · A1 / A4</text>`:`<path class="lf-icon" d="M531 117L573 125L566 146L524 138ZM549 143V151M538 151H560"/>
      <text class="lf-name" x="555" y="170">Starlink Mini</text>`}
    </g>

    <g class="lf-node lf-control">
      <rect x="490" y="300" width="130" height="70" rx="11"/>
      <path class="lf-icon" d="M528 315H580M528 322H563M528 329H580"/>
      <text class="lf-name" x="555" y="348">USV control</text>
      <text class="lf-small" x="555" y="362">OEM system</text>
    </g>

    <g class="lf-node lf-sensor">
      <rect x="678" y="75" width="126" height="65" rx="11"/>
      <rect class="lf-icon" x="707" y="87" width="67" height="21" rx="7"/>
      <circle class="lf-lens" cx="718" cy="97" r="6"/><circle class="lf-lens" cx="763" cy="97" r="6"/>
      <text class="lf-name" x="741" y="126">ZED stereo</text>
    </g>
    <g class="lf-node lf-sensor">
      <rect x="820" y="75" width="126" height="65" rx="11"/>
      <path class="lf-icon" d="M870 90C870 84 896 84 896 90V108C896 114 870 114 870 108Z"/>
      <path class="lf-icon" d="M870 91C870 97 896 97 896 91M870 106H896"/>
      <text class="lf-name" x="883" y="128">RoboSense</text>
    </g>
    <text class="lf-edge-label" x="788" y="182">Depth + 3D points</text>

    <g class="lf-node lf-compute">
      <rect x="702" y="204" width="196" height="78" rx="12"/>
      <rect class="lf-chip" x="719" y="225" width="29" height="29" rx="5"/>
      <path class="lf-chip" d="M724 220V225M734 220V225M744 220V225M724 254V259M734 254V259M744 254V259M714 231H719M714 241H719M714 251H719M748 231H753M748 241H753M748 251H753"/>
      <text class="lf-name lf-start" x="764" y="237">Jetson Orin NX</text>
      <text class="lf-small lf-start" x="764" y="257">Proposed gateway</text>
    </g>
    <text class="lf-pending" x="798" y="309">OEM interface pending</text>

    <g class="lf-node lf-chasing">
      <rect x="688" y="332" width="156" height="72" rx="11"/>
      <path class="lf-icon" d="M744 345H788L796 363H736Z"/>
      <circle class="lf-icon" cx="749" cy="354" r="4"/><circle class="lf-icon" cx="782" cy="354" r="4"/>
      <text class="lf-name" x="766" y="383">CHASING controller</text>
      <text class="lf-small" x="766" y="397">Retained</text>
    </g>
    <g class="lf-node lf-reel">
      <rect x="874" y="332" width="80" height="72" rx="11"/>
      <circle class="lf-icon" cx="914" cy="354" r="12"/><circle class="lf-icon" cx="914" cy="354" r="7"/>
      <path class="lf-icon" d="M900 348L897 370H931L928 348M925 354H934"/>
      <text class="lf-name" x="914" y="391">E-Reel</text>
    </g>
    <text class="lf-edge-label lf-tether-label" x="951" y="477">Tether</text>

    <g class="lf-node lf-rov">
      <rect x="785" y="499" width="162" height="66" rx="12"/>
      <path class="lf-rov-body" d="M844 509H888L898 530H834Z"/>
      <circle class="lf-rov-thruster" cx="844" cy="522" r="8"/><circle class="lf-rov-thruster" cx="887" cy="522" r="8"/>
      <circle class="lf-lens" cx="866" cy="522" r="5"/>
      <text class="lf-name" x="866" y="552">M2 PRO MAX</text>
    </g>
    <text class="lf-bottom-note" x="40" y="551">The underwater connection stays wired.</text>
    <g class="lf-packet-layer" aria-hidden="true"></g>
  </svg>`;
}

export function createLinkFlow(host){
  if(!host)throw new TypeError('createLinkFlow needs a host element');
  let route='radio',playing=true,phase=0,packets=[];
  const document=host.ownerDocument||globalThis.document;
  host.classList.add('link-flow');

  function paint(){
    for(const packet of packets){
      const t=(phase*packet.speed+packet.offset)%1;
      const [x,y]=sample(packet.path,packet.reverse?1-t:t);
      packet.node.setAttribute('cx',x.toFixed(2));
      packet.node.setAttribute('cy',y.toFixed(2));
      packet.node.setAttribute('opacity',(0.3+0.7*Math.sin(Math.PI*t)**0.3).toFixed(2));
    }
  }

  function render(){
    host.innerHTML=`<div class="lf-heading"><span>Control &amp; data</span><span class="lf-proposed">Proposed integration</span></div>
      <div class="lf-scroll" tabindex="0" role="region" aria-label="Animated hardware signal paths. Scroll horizontally on a small screen.">${graphics(route)}</div>
      <div class="lf-legend"><span><i class="lf-command-key"></i>Commands</span><span><i class="lf-data-key"></i>Video / data</span><span><i class="lf-dashed-key"></i>Proposed interface</span><small>Illustration · no live connection</small></div>
      <p class="lf-mobile-hint">Swipe to explore →</p>`;
    host.setAttribute('data-route',route);
    host.setAttribute('data-playing',String(playing));
    const lineLayer=host.querySelector('.lf-path-layer');
    const packetLayer=host.querySelector('.lf-packet-layer');
    packets=[];
    for(const [index,edge] of [...routeEdges[route],...commonEdges].entries()){
      const path=geometry(edge.points);
      const line=document.createElementNS(NS,'path');
      line.setAttribute('d',path.d);
      line.setAttribute('class',`lf-edge${edge.proposed?' lf-proposed-edge':''}${edge.dataOnly?' lf-data-edge':''}${edge.wireless?' lf-wireless-edge':''}${edge.id==='retained-tether'?' lf-tether-edge':''}`);
      line.setAttribute('data-edge',edge.id);
      lineLayer.appendChild(line);
      const modes=edge.dataOnly?['data']:['command','data'];
      for(const [modeIndex,mode] of modes.entries()){
        const node=document.createElementNS(NS,'circle');
        node.setAttribute('r',mode==='command'?'3.4':'3');
        node.setAttribute('class',`lf-packet lf-${mode}-packet`);
        packetLayer.appendChild(node);
        packets.push({node,path,reverse:mode==='data'&&!edge.dataOnly,speed:Math.min(.68,90/Math.max(1,path.total)),offset:(index*.19+modeIndex*.43)%1});
      }
    }
    paint();
  }

  render();
  return {
    setRoute(value){
      if(value!=='radio'&&value!=='internet')throw new RangeError('Route must be radio or internet');
      if(route!==value){route=value;render();}
    },
    setPlaying(value){playing=Boolean(value);host.setAttribute('data-playing',String(playing));},
    update(dt){if(!playing||!Number.isFinite(dt)||dt<=0)return;phase+=Math.min(dt,.1);paint();},
    info(){return {route,playing,phase,packetCount:packets.length,illustrative:true,oemInterface:'pending',underwaterLink:'retained tether'};},
    stop(){playing=false;host.setAttribute('data-playing','false');}
  };
}
