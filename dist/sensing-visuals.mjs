import * as T from 'three';

// Educational overlays only. No device model, calibration, scan rate, channel
// count, measurement, or live sensor connection is inferred from photographs.
const BASELINE_M = .12;
const EXAMPLE_FOCAL_PX = 320;
const SCAN_SECONDS = 8;
const SLICES = 360;
const ELEVATIONS = [-.14, -.07, 0, .07, .14];
const MAX_POINTS = SLICES * ELEVATIONS.length;
const TAU = Math.PI * 2;

export function exampleStereoDisparity(distanceM) {
  return Number.isFinite(distanceM) && distanceM > 0 ? EXAMPLE_FOCAL_PX * BASELINE_M / distanceM : null;
}

/** First positive entry into an axis-aligned box, or null for no intersection. */
export function rayBoxDistance(origin, direction, min, max) {
  let near = 0, far = Infinity;
  for (const axis of ['x', 'y', 'z']) {
    if (Math.abs(direction[axis]) < 1e-10) {
      if (origin[axis] < min[axis] || origin[axis] > max[axis]) return null;
      continue;
    }
    let a = (min[axis] - origin[axis]) / direction[axis];
    let b = (max[axis] - origin[axis]) / direction[axis];
    if (a > b) [a, b] = [b, a];
    near = Math.max(near, a); far = Math.min(far, b);
    if (near > far) return null;
  }
  return far > 0 && Number.isFinite(near) ? near : null;
}

/** Closed vertical cylinder, used for the same posts drawn by the overlay. */
export function rayPostDistance(origin, direction, post) {
  const ox = origin.x - post.x, oz = origin.z - post.z;
  const a = direction.x ** 2 + direction.z ** 2;
  const b = 2 * (ox * direction.x + oz * direction.z);
  const c = ox ** 2 + oz ** 2 - post.radius ** 2;
  const hits = [];
  const discriminant = b * b - 4 * a * c;
  if (a > 1e-10 && discriminant >= 0) {
    const q = Math.sqrt(discriminant);
    for (const t of [(-b - q) / (2 * a), (-b + q) / (2 * a)]) {
      const y = origin.y + t * direction.y;
      if (t > 1e-6 && y >= post.minY && y <= post.maxY) hits.push(t);
    }
  }
  if (Math.abs(direction.y) > 1e-10) {
    for (const y of [post.minY, post.maxY]) {
      const t = (y - origin.y) / direction.y;
      if (t > 1e-6 && (ox + t * direction.x) ** 2 + (oz + t * direction.z) ** 2 <= post.radius ** 2) hits.push(t);
    }
  }
  return hits.length ? Math.min(...hits) : null;
}

export function createSensingVisuals({scene, getAnchors}) {
  const root = new T.Group();
  root.name = 'Illustrative_sensing_overlay_NOT_EXPORTED';
  root.userData = {illustrative: true, exportExcluded: true, liveSensorData: false};
  root.visible = false;
  scene.add(root);
  const stereo = new T.Group(), lidar = new T.Group(), shared = new T.Group();
  stereo.name = 'Passive_stereo_correspondence';
  lidar.name = 'Illustrative_laser_returns';
  shared.name = 'Synthetic_targets';
  root.add(stereo, lidar, shared);
  const material = {
    board: new T.MeshBasicMaterial({color:0x32323b, transparent:true, opacity:.87, side:T.DoubleSide}),
    pale: new T.MeshBasicMaterial({color:0xa5a4ac, transparent:true, opacity:.70, side:T.DoubleSide}),
    dark: new T.MeshBasicMaterial({color:0x282a35, transparent:true, opacity:.87, side:T.DoubleSide}),
    gold: new T.MeshBasicMaterial({color:0xeac477, toneMapped:false}),
    cyan: new T.MeshBasicMaterial({color:0x90dfe0, toneMapped:false}),
    base: new T.MeshBasicMaterial({color:0x77777e, transparent:true, opacity:.50}),
  };
  function mesh(parent, geometry, mat, name) {
    const obj = new T.Mesh(geometry, mat); obj.name = name; parent.add(obj); return obj;
  }
  function line(parent, count, color, opacity, name) {
    const positions = new Float32Array(count * 3);
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.BufferAttribute(positions, 3));
    const obj = new T.LineSegments(geo, new T.LineBasicMaterial({color, transparent:true, opacity, depthWrite:false}));
    obj.name = name; obj.frustumCulled = false; parent.add(obj); return obj;
  }
  function putSegments(obj, segments) {
    const a = obj.geometry.attributes.position.array;
    let n = 0;
    for (const [start, end] of segments) {start.toArray(a, n);end.toArray(a, n + 3);n += 6;}
    obj.geometry.attributes.position.needsUpdate = true;
    obj.geometry.setDrawRange(0, n / 3);
  }

  const board = new T.Group(); board.name = 'Synthetic_checker_target'; shared.add(board);
  mesh(board, new T.BoxGeometry(1.44,1.16,.04), material.board, 'Target_backing').position.z = .02;
  const square = new T.PlaneGeometry(.174,.174);
  for (let row = 0; row < 6; row++) for (let col = 0; col < 8; col++) {
    const p = mesh(board, square, (row + col) % 2 ? material.dark : material.pale, 'Feature_patch');
    p.position.set((col - 3.5) * .175, (row - 2.5) * .175, -.001);
  }
  const frame = new T.LineSegments(new T.EdgesGeometry(new T.BoxGeometry(1.44,1.16,.04)),new T.LineBasicMaterial({color:0xd5b77b,transparent:true,opacity:.58}));
  frame.position.z=.02; frame.name='Target_outline'; board.add(frame);
  for(const x of [-.52,.52]) mesh(board,new T.CylinderGeometry(.017,.017,.6,8),material.base,'Target_support').position.set(x,-.88,.025);
  mesh(board,new T.BoxGeometry(1.2,.025,.20),material.base,'Target_foot').position.set(0,-1.18,.025);
  const feature = mesh(shared,new T.SphereGeometry(.025,12,8),material.gold,'Shared_corresponding_feature');
  const featureRing = mesh(shared,new T.TorusGeometry(.065,.004,5,40),material.gold,'Shared_feature_ring');

  const leftLine = line(stereo,2,0xeac477,.52,'Left_passive_sightline');
  const rightLine = line(stereo,2,0x90dfe0,.52,'Right_passive_sightline');
  const fovLines = line(stereo,32,0xcabfec,.11,'Illustrative_passive_viewing_pyramids');
  const baselineLine = line(stereo,2,0xf0d28b,.75,'Example_stereo_baseline');
  const leftEye = mesh(stereo,new T.SphereGeometry(.007,8,6),material.gold,'Left_lens_origin');
  const rightEye = mesh(stereo,new T.SphereGeometry(.007,8,6),material.cyan,'Right_lens_origin');

  // Four synthetic marker posts. They are targets, not additions to the vessel.
  const posts = [
    {x:-1.80,z:1.20,radius:.105,minY:-1.18,maxY:.72},
    {x:2.15,z:.85,radius:.115,minY:-1.18,maxY:.82},
    {x:-1.55,z:-1.65,radius:.12,minY:-1.18,maxY:.90},
    {x:1.55,z:-1.85,radius:.105,minY:-1.18,maxY:.72},
  ];
  const postsGroup = new T.Group();postsGroup.name='Synthetic_LiDAR_marker_posts';lidar.add(postsGroup);
  for (const [i,p] of posts.entries()) {
    const pole = mesh(postsGroup,new T.CylinderGeometry(p.radius,p.radius,p.maxY-p.minY,24),material.dark,'Synthetic_post_'+i);
    pole.position.set(p.x,(p.maxY+p.minY)/2,p.z);
    const edge = mesh(postsGroup,new T.TorusGeometry(p.radius-.007,.007,5,32),material.gold,'Post_reflector_'+i);
    edge.rotation.x=Math.PI/2;edge.position.set(p.x,.1,p.z);
  }
  const scanRing = new T.LineLoop(new T.BufferGeometry().setFromPoints(Array.from({length:120},(_,i)=>new T.Vector3(Math.sin(i/120*TAU)*3.0,0,Math.cos(i/120*TAU)*3.0))),new T.LineBasicMaterial({color:0xcbb177,transparent:true,opacity:.12,depthWrite:false}));
  scanRing.name='Illustrative_scan_azimuth';lidar.add(scanRing);
  const scanRay = line(lidar,2,0xeac477,.48,'Laser_first_hit_ray');
  const pulse = mesh(lidar,new T.SphereGeometry(.026,10,8),material.gold,'Slowed_outgoing_laser_pulse');
  const returned = mesh(lidar,new T.SphereGeometry(.024,10,8),material.cyan,'Slowed_return_pulse');
  const hitGlow = mesh(lidar,new T.SphereGeometry(.033,10,8),material.cyan,'First_surface_return');
  const cloudArray = new Float32Array(MAX_POINTS*3);
  const cloudGeo = new T.BufferGeometry();
  cloudGeo.setAttribute('position',new T.BufferAttribute(cloudArray,3));cloudGeo.setDrawRange(0,0);
  const cloud = new T.Points(cloudGeo,new T.PointsMaterial({color:0x95e2db,size:.025,transparent:true,opacity:.88,depthWrite:false,sizeAttenuation:true}));
  cloud.name='Synthetic_first_hit_point_cloud';cloud.frustumCulled=false;lidar.add(cloud);

  const origin = new T.Vector3(), quaternion = new T.Quaternion();
  const left = new T.Vector3(-.06,0,0), right = new T.Vector3(.06,0,0), lidarOrigin = new T.Vector3(0,.12,-.057);
  const target = new T.Vector3(0,0,4), direction = new T.Vector3(), end = new T.Vector3();
  const bounds = new T.Box3(), boardMin = new T.Vector3(), boardMax = new T.Vector3();
  const inverse = new T.Matrix4();
  const footMin = new T.Vector3(), footMax = new T.Vector3();
  let mode=null,distance=4,elapsed=0,phase=0,count=0,lastSlice=-1,ready=false,currentHit=null;
  const supports = [-.52,.52].map(x=>({x,z:distance+.025,radius:.017,minY:-1.18,maxY:-.58}));
  const rayPosts = [...posts,...supports];
  let sampleBuckets=Array.from({length:SLICES},()=>[]);

  function hitDistance(rayOrigin, rayDirection) {
    let first=rayBoxDistance(rayOrigin,rayDirection,boardMin,boardMax);
    const foot=rayBoxDistance(rayOrigin,rayDirection,footMin,footMax);
    if(foot!==null&&(first===null||foot<first))first=foot;
    for(const p of rayPosts){const t=rayPostDistance(rayOrigin,rayDirection,p);if(t!==null&&(first===null||t<first))first=t;}
    return first;
  }
  function resetCloud() {
    count=0;lastSlice=-1;cloudGeo.setDrawRange(0,0);
  }
  function buildSamples() {
    boardMin.set(-.72,-.58,distance);boardMax.set(.72,.58,distance+.04);
    footMin.set(-.6,-1.1925,distance-.075);footMax.set(.6,-1.1675,distance+.125);
    for(const p of supports)p.z=distance+.025;
    sampleBuckets=Array.from({length:SLICES},()=>[]);
    for(let slice=0;slice<SLICES;slice++)for(const elevation of ELEVATIONS){
      const azimuth=slice/SLICES*TAU;
      direction.set(Math.sin(azimuth)*Math.cos(elevation),Math.sin(elevation),Math.cos(azimuth)*Math.cos(elevation));
      const t=hitDistance(lidarOrigin,direction);
      if(t!==null&&t>0&&t<=12)sampleBuckets[slice].push(lidarOrigin.clone().addScaledVector(direction,t));
    }
    resetCloud();
  }
  function syncAnchors() {
    const a=getAnchors?.();
    if(!a?.zed||!a?.lidar){root.visible=false;ready=false;return false;}
    a.zed.updateWorldMatrix(true,false);a.lidar.updateWorldMatrix(true,false);
    a.zed.localToWorld(origin.set(0,0,.0202));a.zed.getWorldQuaternion(quaternion);
    root.position.copy(origin);root.quaternion.copy(quaternion);root.updateWorldMatrix(true,false);
    inverse.copy(root.matrixWorld).invert();
    a.zed.localToWorld(left.set(-.060,0,.0202)).applyMatrix4(inverse);
    a.zed.localToWorld(right.set(.060,0,.0202)).applyMatrix4(inverse);
    const nextLidar=a.lidar.localToWorld(new T.Vector3(0,.0735,0)).applyMatrix4(inverse);
    const rebuild=!ready||nextLidar.distanceToSquared(lidarOrigin)>1e-10;
    lidarOrigin.copy(nextLidar);ready=true;
    if(rebuild)buildSamples();
    root.visible=!!mode;
    return true;
  }
  function stereoGeometry() {
    target.set(0,0,distance);
    board.position.z=distance;feature.position.copy(target);featureRing.position.set(0,0,distance-.004);
    leftEye.position.copy(left);rightEye.position.copy(right);
    putSegments(leftLine,[[left,target]]);putSegments(rightLine,[[right,target]]);putSegments(baselineLine,[[left,right]]);
    const corners=[new T.Vector3(-.86,-.66,distance),new T.Vector3(.86,-.66,distance),new T.Vector3(.86,.66,distance),new T.Vector3(-.86,.66,distance)];
    const segments=[];
    for(const eye of [left,right])for(let i=0;i<4;i++){segments.push([eye,corners[i]],[corners[i],corners[(i+1)%4]]);}
    putSegments(fovLines,segments);
    scanRing.position.y=lidarOrigin.y;
  }
  function setMode(next) {
    mode=next==='stereo'||next==='lidar'?next:null;
    elapsed=0;phase=0;resetCloud();
    stereo.visible=mode==='stereo';lidar.visible=mode==='lidar';
    feature.visible=featureRing.visible=mode==='stereo';
    syncAnchors();stereoGeometry();update(0);
    return info();
  }
  function setDistance(value) {
    const numeric=Number(value);
    if(!Number.isFinite(numeric))return info();
    distance=Math.max(2,Math.min(8,numeric));elapsed=0;phase=0;
    syncAnchors();stereoGeometry();buildSamples();update(0);return info();
  }
  function update(dt=0) {
    if(!mode)return;
    if(!syncAnchors())return;
    stereoGeometry();
    if(mode==='stereo')return;
    dt=Number.isFinite(dt)?Math.max(0,Math.min(.25,dt)):0;
    const oldCycle=Math.floor(elapsed/SCAN_SECONDS);
    elapsed+=dt;phase=(elapsed%SCAN_SECONDS)/SCAN_SECONDS;
    if(Math.floor(elapsed/SCAN_SECONDS)!==oldCycle)resetCloud();
    const slice=Math.min(SLICES-1,Math.floor(phase*SLICES));
    for(let i=lastSlice+1;i<=slice;i++)for(const p of sampleBuckets[i]){
      if(count>=MAX_POINTS)break;
      p.toArray(cloudArray,count*3);count++;
    }
    lastSlice=slice;cloudGeo.attributes.position.needsUpdate=true;cloudGeo.setDrawRange(0,count);
    // Central illustrative beam, with visible outgoing/return dots slowed down.
    direction.set(Math.sin(phase*TAU),0,Math.cos(phase*TAU));
    currentHit=hitDistance(lidarOrigin,direction);
    const reach=currentHit===null?3.0:currentHit;
    end.copy(lidarOrigin).addScaledVector(direction,reach);
    putSegments(scanRay,[[lidarOrigin,end]]);
    const pulsePhase=(elapsed%1.1)/1.1;
    pulse.visible=pulsePhase<.5;
    returned.visible=currentHit!==null&&pulsePhase>=.5;
    hitGlow.visible=currentHit!==null;
    pulse.position.copy(lidarOrigin).lerp(end,Math.min(1,pulsePhase*2));
    returned.position.copy(end).lerp(lidarOrigin,Math.max(0,(pulsePhase-.5)*2));
    hitGlow.position.copy(end);
  }
  function getBounds() {
    bounds.makeEmpty();
    if(!syncAnchors()||!mode)return bounds;
    root.updateWorldMatrix(true,true);
    const include=p=>bounds.expandByPoint(p.clone().applyMatrix4(root.matrixWorld));
    include(new T.Vector3(-.18,-.22,-.18));include(new T.Vector3(.18,.28,.18));
    for(const x of [-.8,.8])for(const y of [-1.22,.66])include(new T.Vector3(x,y,distance+.05));
    if(mode==='lidar'){
      for(const p of posts)for(const x of [p.x-p.radius,p.x+p.radius])for(const z of [p.z-p.radius,p.z+p.radius])for(const y of [p.minY,p.maxY])include(new T.Vector3(x,y,z));
      for(const x of [-3.05,3.05])for(const z of [-3.05,3.05])include(new T.Vector3(x,lidarOrigin.y,z));
    }
    return bounds;
  }
  function info() {
    return {mode,ready,distanceM:distance,distance,baselineM:BASELINE_M,modeledBaselineM:left.distanceTo(right),focalPx:EXAMPLE_FOCAL_PX,disparityPx:exampleStereoDisparity(distance),phase,azimuthDeg:phase*360,pointCount:count,pointcount:count,maximumPoints:MAX_POINTS,scanPeriodSeconds:SCAN_SECONDS,firstHitDistanceM:currentHit,live:false,illustrative:true};
  }
  function stop(){mode=null;elapsed=0;phase=0;currentHit=null;resetCloud();root.visible=false;return info();}
  stereoGeometry();buildSamples();
  return {setMode,setDistance,update,getBounds,info,stop};
}
