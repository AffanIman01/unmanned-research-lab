import * as T from 'three';
import {createRC3Model} from './rc3-model.mjs?v=rc3-au';

// Display geometry is a provisional layout. Only the supplied reel preserves its source scale.
export function createAccessoryDisplays({reelSource} = {}) {
  const usv = new T.Group(); usv.name = 'ME120_ground_station_provisional'; usv.visible = false;
  const rov = new T.Group(); rov.name = 'CHASING_accessories_provisional'; rov.visible = false;
  const owners = {};
  const materials = {
    dark: new T.MeshStandardMaterial({color:0x202826,metalness:.28,roughness:.46}),
    edge: new T.MeshStandardMaterial({color:0x495047,metalness:.7,roughness:.3}),
    rubber: new T.MeshStandardMaterial({color:0x121817,metalness:0,roughness:.86}),
    silver: new T.MeshStandardMaterial({color:0xabb5ac,metalness:.75,roughness:.29}),
    gold: new T.MeshStandardMaterial({color:0xc2a06b,metalness:.7,roughness:.33}),
    ivory: new T.MeshStandardMaterial({color:0xe8e6de,metalness:.08,roughness:.42}),
    keys: new T.MeshStandardMaterial({color:0x343d39,metalness:.1,roughness:.7}),
    black: new T.MeshStandardMaterial({color:0x050b0b,metalness:.05,roughness:.27}),
    cyan: new T.MeshStandardMaterial({color:0x9fe0cb,emissive:0x78bea9,emissiveIntensity:.3,roughness:.4}),
    red: new T.MeshStandardMaterial({color:0xc96b52,roughness:.6}),
    tripodYellow: new T.MeshStandardMaterial({color:0xe4b521,metalness:.2,roughness:.43}),
    antennaGrey: new T.MeshStandardMaterial({color:0x535b60,metalness:.24,roughness:.4}),
  };
  const v = a => new T.Vector3(...a);
  function mesh(parent, geometry, material, name) {
    const m = new T.Mesh(geometry, typeof material === 'string' ? materials[material] : material);
    m.name = name || ''; m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
  }
  function box(parent, w,h,d, x,y,z, material='dark', name='') {
    const m=mesh(parent,new T.BoxGeometry(w,h,d),material,name);m.position.set(x,y,z);return m;
  }
  function round(parent,w,h,d,r,x,y,z,material='dark',name='') {
    r=Math.min(r,w/2,d/2);const s=new T.Shape(),a=-w/2,b=-d/2;
    s.moveTo(a+r,b);s.lineTo(a+w-r,b);s.quadraticCurveTo(a+w,b,a+w,b+r);
    s.lineTo(a+w,b+d-r);s.quadraticCurveTo(a+w,b+d,a+w-r,b+d);
    s.lineTo(a+r,b+d);s.quadraticCurveTo(a,b+d,a,b+d-r);
    s.lineTo(a,b+r);s.quadraticCurveTo(a,b,a+r,b);
    const geo=new T.ExtrudeGeometry(s,{depth:h,bevelEnabled:false,curveSegments:5});geo.rotateX(-Math.PI/2);geo.translate(0,-h/2,0);
    const m=mesh(parent,geo,material,name);m.position.set(x,y,z);return m;
  }
  function cyl(parent,r,h,x,y,z,material='dark',name='',rTop=r) {
    const m=mesh(parent,new T.CylinderGeometry(rTop,r,h,24),material,name);m.position.set(x,y,z);return m;
  }
  function beam(parent,a,b,r=.009,material='edge',name='') {
    const p=v(a),q=v(b),delta=q.clone().sub(p),m=mesh(parent,new T.CylinderGeometry(r,r,delta.length(),12),material,name);
    m.position.copy(p.add(q).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return m;
  }
  function cable(parent,points,r=.0035,material='rubber',name='cable') {
    const curve=new T.CatmullRomCurve3(points.map(v));return mesh(parent,new T.TubeGeometry(curve,32,r,8,false),material,name);
  }
  function group(name,parent,x=0,y=0,z=0) {
    const g=new T.Group();g.name=name;g.position.set(x,y,z);parent.add(g);owners[name]=g;return g;
  }
  function screenTexture(kind) {
    if(typeof document==='undefined'||typeof document.createElement!=='function')return null;
    const c=document.createElement('canvas');c.width=768;c.height=448;
    const ctx=c.getContext?.('2d');if(!ctx)return null;
    ctx.fillStyle='#091b1d';ctx.fillRect(0,0,768,448);
    ctx.fillStyle='#132c2e';ctx.fillRect(0,0,768,52);ctx.fillStyle='#c4cbb8';ctx.font='bold 22px system-ui,sans-serif';
    ctx.fillText(kind==='rov'?'CHASING · ROV':'ME120 · GROUND STATION',24,34);
    ctx.strokeStyle='#294441';ctx.lineWidth=1;
    for(let x=24;x<556;x+=32){ctx.beginPath();ctx.moveTo(x,76);ctx.lineTo(x,416);ctx.stroke();}
    for(let y=76;y<416;y+=32){ctx.beginPath();ctx.moveTo(24,y);ctx.lineTo(556,y);ctx.stroke();}
    ctx.fillStyle='#183b39';ctx.beginPath();ctx.moveTo(24,76);ctx.lineTo(172,76);ctx.lineTo(134,171);ctx.lineTo(181,249);ctx.lineTo(100,353);ctx.lineTo(110,416);ctx.lineTo(24,416);ctx.fill();
    ctx.strokeStyle='#d6ae71';ctx.lineWidth=3;ctx.setLineDash([10,7]);ctx.beginPath();ctx.moveTo(241,360);ctx.lineTo(350,310);ctx.lineTo(312,205);ctx.lineTo(420,134);ctx.stroke();ctx.setLineDash([]);
    ctx.save();ctx.translate(350,310);ctx.rotate(-.35);ctx.fillStyle='#a3decb';ctx.beginPath();ctx.moveTo(0,-18);ctx.lineTo(10,13);ctx.lineTo(0,6);ctx.lineTo(-10,13);ctx.closePath();ctx.fill();ctx.restore();
    ctx.strokeStyle='#668d7e';ctx.lineWidth=1;ctx.beginPath();ctx.arc(350,310,44,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='#182d2c';ctx.fillRect(578,76,168,340);ctx.fillStyle='#91ac9e';ctx.font='17px system-ui,sans-serif';
    ['LINK','MISSION','TELEMETRY','CAMERA'].forEach((text,i)=>{const y=104+i*72;ctx.fillText(text,592,y);ctx.fillStyle='#668b7d';ctx.fillRect(592,y+13,126,4);ctx.fillStyle='#91ac9e';});
    ctx.fillStyle='#c6ad82';ctx.font='15px system-ui,sans-serif';ctx.fillText('DISPLAY CONCEPT',24,435);
    const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;return texture;
  }
  function planeDisplay(parent,w,h,x,y,z,kind='usv') {
    const texture=screenTexture(kind),m=mesh(parent,new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color:texture?0xffffff:0x174343,map:texture,side:T.FrontSide}),'illustrative_display');m.position.set(x,y,z);return m;
  }
  function textPlate(parent,text,w,h,x,y,z) {
    if(typeof document==='undefined'||typeof document.createElement!=='function')return;
    const c=document.createElement('canvas');c.width=512;c.height=100;const ctx=c.getContext?.('2d');if(!ctx)return;
    ctx.clearRect(0,0,512,100);ctx.fillStyle='#526059';ctx.font='600 58px system-ui,sans-serif';ctx.textAlign='center';ctx.fillText(text,256,73);
    const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;
    const p=mesh(parent,new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false}),'wordmark');p.rotation.x=-Math.PI/2;p.position.set(x,y,z);
  }
  function gimbal(parent,x,y,z,size=1,ivory=false) {
    cyl(parent,.036*size,.006*size,x,y,z,'edge','gimbal_ring');
    cyl(parent,.030*size,.007*size,x,y+.002*size,z,'rubber','gimbal_well');
    const boot=mesh(parent,new T.SphereGeometry(.020*size,18,12),'black','gimbal_boot');boot.scale.y=.4;boot.position.set(x,y+.005*size,z);
    cyl(parent,.0038*size,.026*size,x,y+.017*size,z,'silver','control_stick');
    cyl(parent,.009*size,.009*size,x,y+.032*size,z,ivory?'gold':'silver','knurled_stick_grip');
    for(let i=0;i<4;i++){const ring=mesh(parent,new T.TorusGeometry(.009*size,.0007*size,4,16),'edge','grip_ring');ring.rotation.x=Math.PI/2;ring.position.set(x,y+(.029+i*.002)*size,z);}
  }
  function switchLever(parent,x,y,z) {cyl(parent,.006,.006,x,y,z,'silver');beam(parent,[x,y+.003,z],[x,y+.027,z-.004],.0025,'silver','toggle_switch');}
  function bindInspection(g,distance=1.1,view=[-.5,.7,1]) {
    g.updateWorldMatrix(true,true);const world=new T.Box3().setFromObject(g);const min=g.worldToLocal(world.min.clone()),max=g.worldToLocal(world.max.clone());
    const bounds=new T.Box3(min,max),center=bounds.getCenter(new T.Vector3()),size=bounds.getSize(new T.Vector3());
    g.userData.inspect={at:center.toArray(),size:size.toArray().map(n=>Math.max(n,.04)),distance,view};
    g.userData.provisional=true;
  }

  // Foldable tabletop is kept clear of the boat, on its starboard display side.
  const table=group('gcs-table',usv,0,0,1.65);
  round(table,1.60,.038,.70,.025,0,.48,0,'dark','folding_tabletop');
  round(table,1.60,.010,.70,.025,0,.502,0,'rubber','table_work_surface');
  for(const x of[-.77,.77])box(table,.016,.04,.60,x,.463,0,'edge','table_edge_trim');
  box(table,1.53,.020,.014,0,.478,.351,'gold','front_edge_inlay');
  for(const z of[-.26,.26]) {
    beam(table,[-.63,-.26,z],[.55,.448,z],.016,'edge','folding_cross_leg');
    beam(table,[.63,-.26,z],[-.55,.448,z],.016,'edge','folding_cross_leg');
    const pivot=cyl(table,.026,.030,0,.12,z,'gold','folding_pivot');pivot.rotation.x=Math.PI/2;
    for(const x of[-.63,.63])round(table,.115,.025,.07,.012,x,-.267,z,'rubber','non_slip_foot');
  }
  for(const x of[-.63,.63])beam(table,[x,-.25,-.28],[x,-.25,.28],.014,'edge','lower_crossbar');
  for(const x of[-.55,.55])beam(table,[x,.44,-.29],[x,.44,.29],.018,'edge','table_hinge_crossbar');
  beam(table,[-.39,.19,-.265],[.39,.19,.265],.008,'gold','locking_brace');
  for(const x of[-.68,.68])for(const z of[-.25,.25])cyl(table,.003,.003,x,.509,z,'silver','table_fastener');

  // Photo-matched floor stands: yellow telescopic masts, black clamps and three
  // braced legs. The 2.45 m deployed height is a visual estimate, not a survey.
  const antennaLayout={heightM:2.45,footRadiusM:.52,floorY:-.28,centers:[[-1.46,1.85],[1.46,1.85]]};
  for(let i=0;i<2;i++) {
    const sign=i===0?-1:1,[x,z]=antennaLayout.centers[i];
    const g=group('gcs-antenna-'+(i+1),usv,x,antennaLayout.floorY,z);
    g.userData.photoReference='159596.heic';
    g.userData.estimatedHeightM=antennaLayout.heightM;
    g.userData.dimensionStatus='Photo estimate; measure actual deployed height and footprint';
    // Main yellow stand and exposed telescoping section.
    cyl(g,.020,1.065,0,.6425,0,'tripodYellow','yellow_tripod_mast');
    cyl(g,.013,.151,0,1.2135,0,'silver','telescoping_upper_section');
    cyl(g,.027,.045,0,.143,0,'rubber','tripod_leg_hub');
    cyl(g,.028,.032,0,.387,0,'rubber','tripod_brace_slider');
    for(const y of[1.045,1.164]) {
      cyl(g,.029,.057,0,y,0,'rubber','telescoping_lock_collar');
      box(g,.032,.025,.015,0,y,.032,'dark','clamp_body');
      const bolt=cyl(g,.005,.037,0,y,.046,'silver','clamp_screw');bolt.rotation.x=Math.PI/2;
      const knob=cyl(g,.016,.014,0,y,.065,'rubber','clamp_knob');knob.rotation.x=Math.PI/2;
      beam(g,[-.036,y+.029,.004],[.036,y+.029,.004],.004,'dark','clamp_lock_handle');
    }
    // Three spread legs with yellow tie braces, hinges and black rubber feet.
    for(let leg=0;leg<3;leg++) {
      const angle=leg*Math.PI*2/3+(i===0?Math.PI/6:-Math.PI/6);
      const dx=Math.cos(angle),dz=Math.sin(angle),tip=[dx*.52,.025,dz*.52];
      beam(g,[dx*.012,.158,dz*.012],tip,.014,'tripodYellow','tripod_spread_leg_'+(leg+1));
      beam(g,[dx*.012,.374,dz*.012],[dx*.35,.069,dz*.35],.006,'tripodYellow','tripod_tie_brace_'+(leg+1));
      const foot=round(g,.066,.030,.047,.011,tip[0],.015,tip[2],'rubber','tripod_rubber_foot_'+(leg+1));foot.rotation.y=-angle;
      const hinge=box(g,.018,.036,.035,dx*.026,.149,dz*.026,'dark','tripod_hinge_'+(leg+1));hinge.rotation.y=-angle;
      const pin=cyl(g,.006,.034,dx*.026,.149,dz*.026,'silver','hinge_pin_'+(leg+1));pin.rotation.z=Math.PI/2;pin.rotation.y=-angle;
    }
    // Silver feed ferrule and long grey-black fiberglass aerial, as photographed.
    cyl(g,.014,.065,0,1.289,0,'silver','antenna_feed_ferrule');
    cyl(g,.012,.048,0,1.334,0,'dark','antenna_base_collar');
    cyl(g,.0095,1.074,0,1.892,0,'antennaGrey','long_fiberglass_antenna',.0065);
    cyl(g,.0094,.040,0,1.427,0,'ivory','antenna_identification_wrap');
    cyl(g,.007,.022,0,2.439,0,'rubber','antenna_tip_cap');
    // Feed leaves the back of the upper collar; cable is secured down the mast.
    const feed=cyl(g,.005,.026,0,1.298,-.018,'gold','antenna_coax_feed');feed.rotation.x=Math.PI/2;
    for(const y of[.26,.64,.92]) {
      const tie=mesh(g,new T.TorusGeometry(.022,.0014,5,24),'rubber','coax_retaining_tie');tie.rotation.x=Math.PI/2;tie.position.set(0,y,0);
    }
    bindInspection(g,3.8,[sign*.45,.23,1]);
  }

  const laptop=group('gcs-laptop',usv,-.23,.511,1.58);
  round(laptop,.382,.017,.265,.013,0,.0085,0,'edge','laptop_base');
  round(laptop,.358,.003,.159,.006,0,.018,-.035,'rubber','keyboard_tray');
  for(let row=0;row<5;row++)for(let col=0;col<13;col++)round(laptop,.022,.003,.017,.002,-.158+col*.0263,.021,-.094+row*.025,'keys','keyboard_key');
  round(laptop,.120,.003,.015,.002,-.012,.021,.031,'keys','spacebar');
  round(laptop,.119,.001,.061,.006,0,.019,.087,'dark','trackpad');
  for(const x of[-.176,.176])for(let i=0;i<8;i++)box(laptop,.006,.001,.001,x,.019,-.07+i*.014,'rubber','speaker_slot');
  const lid=new T.Group();lid.position.set(0,.02,-.123);lid.rotation.x=-.18;laptop.add(lid);
  const lidBack=round(lid,.382,.014,.235,.012,0,0,0,'dark','screen_housing');lidBack.rotation.x=Math.PI/2;lidBack.position.y=.1175;
  box(lid,.355,.206,.003,0,.118,.009,'black','screen_bezel');planeDisplay(lid,.335,.186,0,.118,.011,'usv');
  const webcam=mesh(lid,new T.SphereGeometry(.002,8,8),'black','webcam');webcam.position.set(0,.223,.009);
  for(const x of[-.139,.139]){const h=cyl(laptop,.01,.061,x,.02,-.123,'silver','laptop_hinge');h.rotation.z=Math.PI/2;}
  box(laptop,.002,.007,.026,.192,.008,-.04,'rubber','side_usb_port');
  bindInspection(laptop,.9,[-.45,.6,1]);

  const radio=group('gcs-radio',usv,.23,.511,1.79);
  round(radio,.260,.074,.147,.011,0,.037,0,'dark','radio_link_enclosure');
  box(radio,.255,.040,.004,0,.036,.076,'edge','radio_front_panel');
  for(const x of[-.116,.116])for(const z of[-.058,.058])cyl(radio,.003,.004,x,.076,z,'gold','case_screw');
  for(let i=0;i<8;i++)box(radio,.124,.002,.003,-.025,.075,-.044+i*.012,'rubber','cooling_slot');
  for(const x of[-.04,-.024,-.008]){const led=mesh(radio,new T.SphereGeometry(.003,10,8),'cyan','status_led');led.position.set(x,.049,.079);}
  box(radio,.029,.016,.006,.061,.035,.078,'rubber','ethernet_port');box(radio,.018,.013,.006,.097,.035,.078,'rubber','power_port');
  for(const x of[-.086,.086]){const c=cyl(radio,.009,.022,x,.041,-.084,'gold','radio_antenna_connector');c.rotation.x=Math.PI/2;}
  // Coax stays behind the stands and table, with a floor service loop at each foot.
  cable(usv,[[-1.46,1.018,1.819],[-1.46,.73,1.823],[-1.46,.27,1.823],[-1.46,-.12,1.82],[-1.50,-.259,1.96],[-1.39,-.259,2.18],[-1.08,-.259,2.20],[-.89,-.18,2.09],[-.79,.17,2.027],[-.73,.48,1.997],[-.39,.52,1.971],[.08,.52,1.91],[.144,.552,1.695]],.0037,'rubber','antenna_1_coax');
  cable(usv,[[1.46,1.018,1.819],[1.46,.73,1.823],[1.46,.27,1.823],[1.46,-.12,1.82],[1.50,-.259,1.96],[1.39,-.259,2.18],[1.09,-.259,2.20],[.91,-.18,2.09],[.81,.17,2.027],[.76,.48,1.997],[.52,.52,1.96],[.38,.53,1.88],[.316,.552,1.695]],.0037,'rubber','antenna_2_coax');
  cable(usv,[[.29,.546,1.87],[.27,.518,1.91],[.08,.518,1.94],[-.01,.518,1.73],[-.037,.52,1.54]],.003,'dark','laptop_data_link');
  bindInspection(radio,.65,[-.4,.55,1]);

  const handset=group('usv-controller',usv,.49,.513,1.46);
  round(handset,.274,.050,.169,.035,0,.025,0,'dark','USV_controller_concept');
  round(handset,.257,.014,.147,.025,0,.052,0,'edge','controller_face');
  for(const x of[-.109,.109])round(handset,.055,.061,.112,.024,x,.027,.028,'rubber','controller_grip');
  gimbal(handset,-.071,.062,-.015,.78);gimbal(handset,.071,.062,-.015,.78);
  for(const x of[-.099,.099])switchLever(handset,x,.061,-.057);
  box(handset,.055,.006,.030,0,.064,.027,'black','controller_screen');
  box(handset,.047,.001,.020,0,.0678,.027,'cyan','controller_status_display');
  cyl(handset,.007,.007,-.049,.063,.055,'red','controller_power');
  cyl(handset,.007,.007,.049,.063,.055,'rubber','controller_function');
  for(const x of[-.064,.064])beam(handset,[x,.039,-.076],[x,.079,-.147],.006,'dark','controller_antenna');
  bindInspection(handset,.66,[-.45,.8,1]);
  bindInspection(table,2.5,[-.55,.65,1]);

  const reel=group('rov-ereel',rov,-.62,-.02,.32);
  if(reelSource) {
    const model=reelSource.clone(true);model.position.set(0,0,0);model.rotation.set(0,0,0);model.scale.set(1,1,1);model.updateMatrixWorld(true);
    const bounds=new T.Box3().setFromObject(model),center=bounds.getCenter(new T.Vector3());
    model.position.set(-center.x,-bounds.min.y,-center.z);model.name='CHASING_E_REEL_original_reference_full_scale';reel.add(model);
  } else {
    // No substitute reel geometry: the source must be supplied by the scene loader.
    reel.userData.sourceMissing=true;
  }
  if(reelSource)bindInspection(reel,1.05,[-.65,.45,1]);

  const remote=group('rov-controller',rov,.10,-.02,.60);
  const body=createRC3Model();remote.add(body);
  remote.userData.bodyEnvelopeReferenceM=[.188,.058,.174];
  remote.userData.reference='User yellow controller photograph; dimensions unmeasured';
  bindInspection(remote,.60,[-.55,.8,1]);
  usv.updateMatrixWorld(true);rov.updateMatrixWorld(true);
  const boundsOf=g=>{const b=new T.Box3().setFromObject(g);return {min:b.min.toArray(),max:b.max.toArray(),size:b.getSize(new T.Vector3()).toArray()};};
  function info(){return {provisional:true,groundAntennaLayout:{...antennaLayout,estimated:true,source:'159596.heic'},sourceReelPresent:!!reelSource,usv:boundsOf(usv),rov:boundsOf(rov),owners:Object.fromEntries(Object.entries(owners).map(([name,g])=>[name,{...boundsOf(g),inspect:g.userData.inspect}]))};}
  return {usv,rov,owners,info};
}
