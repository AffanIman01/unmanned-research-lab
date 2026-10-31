import * as T from 'three';
// Matched to the supplied yellow controller photograph and training slides 6–8.
// Overall size and service positions are visual estimates, not manufacturer CAD.
export function createRC3Model(){
 const root=new T.Group();root.name='CHASING_RC3_photo_reference';root.userData.accuracy='Photo matched; dimensions unmeasured';
 const mat={yellow:new T.MeshStandardMaterial({color:0xf6d91b,roughness:.34,metalness:.07}),seam:new T.MeshStandardMaterial({color:0x9f8914,roughness:.55}),black:new T.MeshStandardMaterial({color:0x111617,roughness:.6}),metal:new T.MeshStandardMaterial({color:0xb3b6b3,metalness:.8,roughness:.25}),green:new T.MeshStandardMaterial({color:0x7ed957,emissive:0x4c9a36,emissiveIntensity:.35}),glass:new T.MeshStandardMaterial({color:0x23292a,roughness:.25})};
 const mesh=(geo,m,name,parent=root)=>{const n=new T.Mesh(geo,mat[m]);n.name=name;n.castShadow=n.receiveShadow=true;parent.add(n);return n;};
 const box=(w,h,d,x,y,z,m,name,parent=root)=>{const n=mesh(new T.BoxGeometry(w,h,d),m,name,parent);n.position.set(x,y,z);return n;};
 const cyl=(r,h,x,y,z,m,name,parent=root)=>{const n=mesh(new T.CylinderGeometry(r,r,h,40),m,name,parent);n.position.set(x,y,z);return n;};
 const ring=(r,t,x,y,z,m,name,parent=root)=>{const n=mesh(new T.TorusGeometry(r,t,8,48),m,name,parent);n.rotation.x=Math.PI/2;n.position.set(x,y,z);return n;};
 function silhouette(){const s=new T.Shape();s.moveTo(-.077,-.064);s.bezierCurveTo(-.093,-.045,-.094,.046,-.074,.071);s.bezierCurveTo(-.050,.086,.050,.086,.074,.071);s.bezierCurveTo(.094,.046,.093,-.045,.077,-.064);s.bezierCurveTo(.058,-.081,-.058,-.081,-.077,-.064);return s;}
 const shell=silhouette(),base=new T.ExtrudeGeometry(shell,{depth:.031,bevelEnabled:true,bevelSize:.004,bevelThickness:.005,bevelSegments:3,curveSegments:20});base.rotateX(Math.PI/2);base.translate(0,.042,0);mesh(base,'yellow','yellow_moulded_shell');
 const top=silhouette();for(const x of[-.044,.044]){const hole=new T.Path();hole.absarc(x,-.029,.025,0,Math.PI*2,true);top.holes.push(hole);}
 const face=new T.ExtrudeGeometry(top,{depth:.009,bevelEnabled:true,bevelSize:.002,bevelThickness:.002,bevelSegments:2,curveSegments:24});face.rotateX(Math.PI/2);face.translate(0,.053,0);mesh(face,'yellow','yellow_face_with_recessed_gimbals');
 const seam=new T.EdgesGeometry(base,50),seamLine=new T.LineSegments(seam,new T.LineBasicMaterial({color:0x9e8c1c,transparent:true,opacity:.17}));seamLine.name='shell_seam';root.add(seamLine);
 for(const [side,x]of[['left',-.044],['right',.044]]){
  cyl(.024,.005,x,.042,-.029,'black',side+'_gimbal_well');ring(.025,.002,x,.054,-.029,'yellow',side+'_gimbal_rim');
  box(.036,.007,.006,x,.047,-.029,'glass',side+'_gimbal_axis_x');box(.006,.007,.036,x,.047,-.029,'glass',side+'_gimbal_axis_z');
  const stick=new T.Group();stick.name=side+'_control_stick';stick.position.set(x,.045,-.029);root.add(stick);
  cyl(.003,.023,0,.014,0,'metal','stick_shaft',stick);cyl(.006,.012,0,.030,0,'metal','knurled_stick_cap',stick);
  for(let i=0;i<4;i++)ring(.006,.0006,0,.026+i*.0025,0,'black','stick_grip_ring',stick);
 }
 // Item 9 is a safety buckle, not a power switch (the slide switch is below).
 cyl(.006,.008,0,.056,-.004,'black','safety_buckle_base');const buckle=mesh(new T.TorusGeometry(.004,.0018,8,20),'black','safety_buckle_eye');buckle.position.set(0,.064,-.004);
 const keys=[['level_mode',-.047,'level'],['thruster_lock',0,'lock'],['led_brightness',.047,'sun']];
 for(const [name,x,icon]of keys){cyl(.010,.004,x,.055,.021,'seam',name+'_rim');cyl(.009,.004,x,.057,.021,'yellow',name+'_button');label(icon,.015,.015,x,.0593,.021,true);}
 cyl(.0028,.002,0,.055,.040,'metal','power_indicator_bezel');cyl(.0018,.002,0,.056,.040,'green','power_indicator');
 box(.030,.003,.012,0,.055,.059,'seam','power_switch_track');box(.013,.005,.011,-.006,.058,.059,'yellow','power_on_off_slider');
 label('ON   OFF',.031,.005,0,.057,.070);
 for(const [i,name]of ['ROV','2.4G','5G'].entries()){const x=-.060+i*.011;cyl(.0019,.0015,x,.055,.061,'green','indicator_'+name);label(name,.010,.004,x,.056,.070);}
 cyl(.005,.003,-.023,.056,.060,'seam','wifi_band_switch_rim');cyl(.004,.003,-.023,.058,.060,'yellow','wifi_band_switch');label('CHASING',.041,.008,.051,.056,.059);
 // Rear shoulder buttons and knurled wheels follow the supplied rear view.
 for(const [side,x,name]of[['left',-.066,'photo_video'],['right',.066,'grabber_light']]){
  box(.025,.006,.017,x,.047,-.069,'yellow',name+'_shoulder_button');label(name==='photo_video'?'●':'GRIP',.018,.006,x,.051,-.068);
  const wheel=cyl(.010,.008,x,.029,-.076,'black',side+'_control_wheel');wheel.rotation.x=Math.PI/2;
  for(let i=0;i<14;i++){const a=i*Math.PI/7;box(.002,.003,.009,x+Math.cos(a)*.009,.029+Math.sin(a)*.009,-.076,'glass',side+'_wheel_knurl');}
 }
 box(.010,.005,.003,-.032,.031,-.081,'black','usb_c_port');box(.018,.006,.004,-.010,.031,-.081,'metal','hdmi_socket_rim');box(.014,.003,.004,-.010,.031,-.083,'black','hdmi_socket');
 const socket=cyl(.012,.006,.030,.031,-.080,'black','tether_charging_socket');socket.rotation.x=Math.PI/2;
 const seal=mesh(new T.TorusGeometry(.008,.001,8,32),'metal','tether_socket_ring');seal.position.set(.030,.031,-.084);
 // Empty tablet clamp: a detachable device is not an integrated controller display.
 box(.010,.085,.008,0,.092,-.063,'black','phone_mount_arm');const holder=new T.Group();holder.name='tablet_clamp';holder.position.set(0,.142,-.073);holder.rotation.x=-.25;root.add(holder);
 box(.196,.095,.008,0,0,0,'black','tablet_backplate',holder);box(.178,.080,.002,0,0,.005,'glass','empty_tablet_pad',holder);
 for(const x of[-.096,.096]){box(.009,.102,.015,x,0,.004,'black','tablet_side_clamp',holder);for(const y of[-.029,.029])box(.013,.018,.011,x,y,.012,'black','tablet_grip_pad',holder);}
 for(const x of[-.051,.051])box(.016,.012,.021,x,-.047,.008,'black','tablet_lower_support',holder);
 root.userData.controls=['left_control_stick','right_control_stick','level_mode_button','thruster_lock_button','led_brightness_button','wifi_band_switch','power_on_off_slider','photo_video_shoulder_button','grabber_light_shoulder_button','left_control_wheel','right_control_wheel'];
 root.userData.reference='User photograph + supplied training slides 6–8';
 return root;
 function label(text,w,h,x,y,z,icon=false){
  if(typeof document==='undefined')return;const c=document.createElement('canvas');c.width=512;c.height=icon?512:128;const ctx=c.getContext?.('2d');if(!ctx)return;
  ctx.fillStyle=ctx.strokeStyle='#34351d';ctx.lineWidth=22;ctx.lineCap='round';
  if(icon){
   if(text==='sun'){ctx.beginPath();ctx.arc(256,256,73,0,Math.PI*2);ctx.stroke();for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.beginPath();ctx.moveTo(256+Math.cos(a)*120,256+Math.sin(a)*120);ctx.lineTo(256+Math.cos(a)*166,256+Math.sin(a)*166);ctx.stroke();}}
   if(text==='lock'){ctx.strokeRect(160,240,192,150);ctx.beginPath();ctx.arc(256,239,65,Math.PI,0);ctx.stroke();ctx.fillRect(245,285,22,53);}
   if(text==='level'){ctx.beginPath();ctx.moveTo(112,256);ctx.lineTo(400,256);ctx.stroke();for(const p of[[256,140],[256,372]]){ctx.beginPath();ctx.arc(...p,28,0,Math.PI*2);ctx.fill();}ctx.beginPath();ctx.arc(256,256,30,0,Math.PI*2);ctx.stroke();}
  }else{ctx.font='700 66px -apple-system,Arial,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,66);}
  const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;const plane=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false}));plane.name='label_'+text;plane.rotation.x=-Math.PI/2;plane.position.set(x,y,z);root.add(plane);
 }
}
