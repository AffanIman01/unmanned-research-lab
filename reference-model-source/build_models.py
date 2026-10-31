"""ME120 visual discussion model. Metres, Y up, bow +Z. Not measured CAD.
Geometry proportions referenced to Affan's September 2026 hardware photos and published overall dimensions.
"""
from pathlib import Path
import math, json, struct
import numpy as np
from scipy.spatial import ConvexHull
from collections import defaultdict
from PIL import Image, ImageDraw, ImageFont

OUT=Path(__file__).parent
MATS={
 'yellow':([1.0,.61,.025,1],.12,.32),
 'yellow_top':([1.0,.69,.07,1],.12,.34),
 'carbon':([.045,.060,.074,1],.28,.38),
 'rubber':([.012,.019,.024,1],.0,.69),
 'silver':([.58,.65,.69,1],.78,.23),
 'white':([.87,.91,.91,1],.15,.35),
 'blueglass':([.022,.105,.15,1],.48,.14),
 'red':([.8,.035,.04,1],.10,.25),
 'green':([.025,.56,.24,1],.10,.25),
 'orange':([1.0,.28,.025,1],.10,.33),
 'teal':([.025,.52,.57,1],.22,.32),
 'gray':([.19,.26,.30,1],.38,.39),
 'actuator_metal':([.76,.80,.83,1],.65,.27),
}

class Model:
 def __init__(self,name): self.name=name; self.groups=defaultdict(lambda:defaultdict(list)); self.bounds={}
 def add(self,g,m,v,f,smooth=False):
  v=np.array(v,dtype=float); f=np.array(f,dtype=int)
  if not len(f): return
  if smooth:
   n=np.zeros_like(v); face=np.cross(v[f[:,1]]-v[f[:,0]],v[f[:,2]]-v[f[:,0]])
   for j in range(3):np.add.at(n,f[:,j],face)
   n/=np.maximum(np.linalg.norm(n,axis=1)[:,None],1e-12)
  else:
   v=v[f.reshape(-1)]; f=np.arange(len(v)).reshape(-1,3)
   n=np.cross(v[f[:,1]]-v[f[:,0]],v[f[:,2]]-v[f[:,0]])
   n/=np.maximum(np.linalg.norm(n,axis=1)[:,None],1e-12); n=np.repeat(n,3,axis=0)
  self.groups[g][m].append((v.astype('float32'),f.astype('uint32'),n.astype('float32')))
 def export(self,name):
  doc={'asset':{'version':'2.0','generator':'Procedural ME120 visual engineering discussion model; not measured CAD'},'scene':0,'scenes':[{'nodes':[]}],'nodes':[],'meshes':[],'materials':[],'buffers':[{'byteLength':0}],'bufferViews':[],'accessors':[],'extras':{'units':'metres','upAxis':'+Y','bowAxis':'+Z','accuracy':'Reference-based visualization only; not measured CAD, not a load or stability model.'}}
  matids={}
  for k,(color,metal,rough) in MATS.items():
   matids[k]=len(doc['materials']);doc['materials'].append({'name':k,'pbrMetallicRoughness':{'baseColorFactor':color,'metallicFactor':metal,'roughnessFactor':rough},'doubleSided':True})
  blob=bytearray(); stats={}; self.bounds={}
  def acc(arr,typ,component,target):
   while len(blob)%4:blob.append(0)
   offset=len(blob);blob.extend(arr.tobytes());view=len(doc['bufferViews']);doc['bufferViews'].append({'buffer':0,'byteOffset':offset,'byteLength':arr.nbytes,'target':target})
   a={'bufferView':view,'componentType':component,'count':len(arr),'type':typ}
   if typ=='VEC3': a.update(min=arr.min(axis=0).tolist(),max=arr.max(axis=0).tolist())
   idx=len(doc['accessors']);doc['accessors'].append(a);return idx
  for group,materials in self.groups.items():
   prims=[];tri=0;points=[]
   for mat,chunks in materials.items():
    vs=[];fs=[];ns=[];off=0
    for v,f,n in chunks:vs.append(v);fs.append(f+off);ns.append(n);off+=len(v)
    v=np.vstack(vs);f=np.vstack(fs).ravel();n=np.vstack(ns);points.append(v);tri+=len(f)//3
    pa=acc(v,'VEC3',5126,34962);na=acc(n,'VEC3',5126,34962);ia=acc(f,'SCALAR',5125,34963)
    prims.append({'attributes':{'POSITION':pa,'NORMAL':na},'indices':ia,'material':matids[mat]})
   idx=len(doc['meshes']);doc['meshes'].append({'name':group,'primitives':prims});doc['nodes'].append({'name':group,'mesh':idx,'extras':{'component':group,'conceptual':self.name!='ME120'}});doc['scenes'][0]['nodes'].append(len(doc['nodes'])-1)
   p=np.vstack(points);self.bounds[group]={'min':p.min(axis=0).tolist(),'max':p.max(axis=0).tolist()};stats[group]=tri
  doc['buffers'][0]['byteLength']=len(blob);j=json.dumps(doc,separators=(',',':')).encode();j+=b' '*((-len(j))%4);blob+=b'\0'*((-len(blob))%4)
  glb=struct.pack('<4sII',b'glTF',2,12+8+len(j)+8+len(blob))+struct.pack('<I4s',len(j),b'JSON')+j+struct.pack('<I4s',len(blob),b'BIN\0')+blob
  (OUT/name).write_bytes(glb);print(name,len(glb),'bytes',sum(stats.values()),'triangles',flush=True)
  return {'name':self.name,'file':name,'triangles':sum(stats.values()),'bytes':len(glb),'nodes':stats,'bounds':self.bounds}

def box(M,g,mat,c,s,bevel=0):
 c=np.array(c);s=np.array(s)/2
 if bevel:
  b=min(bevel,min(s)*.8);pts=[]
  for i in [-1,1]:
   for j in [-1,1]:
    for k in [-1,1]:
     p=np.array([i,j,k])*s
     for d in range(3):q=p.copy();q[d]-=[i,j,k][d]*b;pts.append(q+c)
  hull=ConvexHull(pts);v=np.array(pts);f=hull.simplices.copy()
  for n,face in enumerate(f):
   if np.dot(np.cross(v[face[1]]-v[face[0]],v[face[2]]-v[face[0]]),v[face].mean(axis=0)-c)<0:f[n]=face[::-1]
 else:
  v=np.array([[i,j,k] for i in [-1,1] for j in [-1,1] for k in [-1,1]])*s+c
  f=ConvexHull(v).simplices.copy()
  for n,face in enumerate(f):
   if np.dot(np.cross(v[face[1]]-v[face[0]],v[face[2]]-v[face[0]]),v[face].mean(axis=0)-c)<0:f[n]=face[::-1]
 M.add(g,mat,v,f)

def cyl(M,g,mat,a,b,r,n=20,r2=None):
 a=np.array(a,float);b=np.array(b,float);d=b-a;d/=np.linalg.norm(d)
 u=np.cross(d,[0,1,0] if abs(d[1])<.9 else [0,0,1]);u/=np.linalg.norm(u);w=np.cross(d,u)
 r2=r if r2 is None else r2
 v=[a+r*(math.cos(t)*u+math.sin(t)*w) for t in np.arange(n)*2*math.pi/n]+[b+r2*(math.cos(t)*u+math.sin(t)*w) for t in np.arange(n)*2*math.pi/n]
 f=[]
 for i in range(n):j=(i+1)%n;f.extend([(i,j,n+j),(i,n+j,n+i)])
 M.add(g,mat,v,f,True)
 for center,base,flip in [(a,0,True),(b,n,False)]:
  vv=[center]+v[base:base+n]; ff=[(0,(i+1)%n+1,i+1) if flip else (0,i+1,(i+1)%n+1) for i in range(n)];M.add(g,mat,vv,ff)

def tube(M,g,mat,a,b,outer,inner,n=32):
 a=np.array(a,float);b=np.array(b,float);d=b-a;d/=np.linalg.norm(d)
 u=np.cross(d,[0,1,0] if abs(d[1])<.9 else [0,0,1]);u/=np.linalg.norm(u);w=np.cross(d,u)
 v=[]
 for p,r in [(a,outer),(b,outer),(a,inner),(b,inner)]:
  v.extend([p+r*(math.cos(t)*u+math.sin(t)*w) for t in np.arange(n)*2*math.pi/n])
 f=[]
 for i in range(n):
  j=(i+1)%n
  f.extend([(i,j,n+j),(i,n+j,n+i),(2*n+i,3*n+j,2*n+j),(2*n+i,3*n+i,3*n+j),(i,2*n+j,j),(i,2*n+i,2*n+j),(n+i,n+j,3*n+j),(n+i,3*n+j,3*n+i)])
 M.add(g,mat,v,f,True)

def line(M,g,mat,points,r,n=12):
 for a,b in zip(points[:-1],points[1:]):cyl(M,g,mat,a,b,r,n)

def horizontal_mounting_ring(M,g,mat,c,outer,inner,thickness,n=72):
 # Separate normals at machined edges: smooth cylindrical walls, planar faces.
 x,y,z=c;angles=np.arange(n)*2*math.pi/n
 loops=[]
 for r,dy in [(outer,-thickness/2),(outer,thickness/2),(inner,-thickness/2),(inner,thickness/2)]:
  loops.append(np.array([[x+r*math.cos(a),y+dy,z+r*math.sin(a)] for a in angles]))
 for low,high,inward in [(loops[0],loops[1],False),(loops[2],loops[3],True)]:
  v=np.vstack([low,high]);f=[]
  for i in range(n):
   j=(i+1)%n;f.extend([(i,n+j,j),(i,n+i,n+j)])
  if inward:f=[tuple(reversed(t)) for t in f]
  M.add(g,mat,v,f,True)
 for outside,inside,flip in [(loops[1],loops[3],True),(loops[0],loops[2],False)]:
  v=np.vstack([outside,inside]);f=[]
  for i in range(n):
   j=(i+1)%n;f.extend([(i,j,n+j),(i,n+j,n+i)])
  if flip:f=[tuple(reversed(t)) for t in f]
  M.add(g,mat,v,f)

def loft(M,g,mat,rings,closed=True,smooth=False):
 v=np.vstack(rings);n=len(rings[0]);f=[]
 for k in range(len(rings)-1):
  for i in range(n):j=(i+1)%n;a=k*n+i;b=k*n+j;c=(k+1)*n+j;d=(k+1)*n+i;f.extend([(a,b,c),(a,c,d)])
 if closed:
  for k,flip in [(0,True),(len(rings)-1,False)]:
   cc=len(v);v=np.vstack([v,np.mean(rings[k],axis=0)])
   for i in range(n):j=(i+1)%n;f.append((cc,k*n+j,k*n+i) if flip else (cc,k*n+i,k*n+j))
 M.add(g,mat,v,f,smooth)

def rounded_loop(x,z0,z1,r,y,steps=6):
 out=[]
 # viewed from above, CCW x/z; Y-facing normal corrected by two-sided materials
 for cx,cz,start in [(x-r,z1-r,0),(-x+r,z1-r,90),(-x+r,z0+r,180),(x-r,z0+r,270)]:
  for deg in np.linspace(start,start+90,steps,endpoint=False):
   t=math.radians(deg);out.append([cx+r*math.cos(t),y,cz+r*math.sin(t)])
 return np.array(out)

def ring_surface(M,g,mat,outer,inner):
 n=len(outer);v=np.vstack([outer,inner]);f=[]
 for i in range(n):j=(i+1)%n;f.extend([(i,j,n+j),(i,n+j,n+i)])
 M.add(g,mat,v,f)

def propeller(M,g,center,r):
 x,y,z=center;cyl(M,g,'silver',(x,y,z-.035),(x,y,z+.035),r*.22,20,r2=r*.15)
 for t in [0,2*math.pi/3,4*math.pi/3]:
  u=np.array([math.cos(t),math.sin(t),0]);w=np.array([-math.sin(t),math.cos(t),0]);c=np.array(center)
  pts=[c+u*r*.18-w*r*.15+[0,0,-.012],c+u*r*.92-w*r*.23+[0,0,.025],c+u*r*.92+w*r*.10+[0,0,.02],c+u*r*.28+w*r*.20+[0,0,-.012]]
  M.add(g,'silver',pts,[(0,1,2),(0,2,3)])

def make_me120():
 M=Model('ME120')
 # Two chine hulls, photo-referenced upper shell and pointed bow profile.
 stations=[(-1.25,.143,.045,.365),(-1.10,.160,.015,.385),(-.75,.160,0,.395),(-.15,.160,.004,.400),(.40,.157,.028,.407),(.72,.128,.079,.415),(.96,.086,.140,.405),(1.12,.044,.209,.382),(1.25,.002,.307,.345)]
 for side,x0 in [('port',-.54),('starboard',.54)]:
  g='hull_'+side;dark=[];cap=[];seam=[]
  for z,w,keel,deck in stations:
   top=deck-.155
   dark.append([[x0-w,top,z],[x0-w*.97,top-.080,z],[x0-w*.70,keel+.043,z],[x0,keel,z],[x0+w*.70,keel+.043,z],[x0+w*.97,top-.080,z],[x0+w,top,z]])
   cap.append([[x0-w,top,z],[x0-w,deck-.038,z],[x0-w*.79,deck,z],[x0+w*.79,deck,z],[x0+w,deck-.038,z],[x0+w,top,z]])
   seam.append([[x0-w*1.008,top-.018,z],[x0-w*1.016,top+.008,z],[x0+w*1.016,top+.008,z],[x0+w*1.008,top-.018,z]])
  loft(M,g,'carbon',dark);loft(M,g,'yellow',cap);loft(M,g,'rubber',seam)
  for z in [-.85,-.43,-.01]:
   box(M,g,'rubber',(x0,.400,z),(.260,.018,.356),.012)
   box(M,g,'yellow_top',(x0,.413,z),(.250,.026,.343),.014)
   for dx in [-.094,.094]:
    for dz in [-.131,.131]:cyl(M,g,'silver',(x0+dx,.426,z+dz),(x0+dx,.432,z+dz),.0075,8)
   for dx in [-.070,.070]:box(M,g,'silver',(x0+dx,.432,z-.152),(.03,.006,.018),.002)
  cyl(M,g,'rubber',(x0,.404,.733),(x0,.414,.733),.107,36)
  cyl(M,g,'silver',(x0,.414,.733),(x0,.423,.733),.098,36)
  for z in [-1.105,-1.21]:
   box(M,g,'carbon',(x0,.397,z),(.058,.010,.030),.005)
  # External stern hose and connectors.
  line(M,g,'rubber',[(x0,.397,-1.10),(x0,.50,-1.08),(x0*.92,.66,-.97),(x0*.66,.69,-.92)],.010)
  cyl(M,g,'blueglass',(x0,.396,-1.1),(x0,.435,-1.1),.014,12)
  # Slim upper deck tow eye.
  tube(M,g,'silver',(x0-.012,.402,.980),(x0+.012,.402,.980),.025,.018,20)
 # Support chassis and photo-visible triangulated stents.
 for z in [-.86,.47]:
  box(M,'bridge_frame','carbon',(0,.455,z),(1.105,.065,.07),.010)
  for s in [-1,1]:
   x=s*.405
   box(M,'bridge_frame','silver',(x,.424,z),(.065,.035,.34),.006)
   line(M,'bridge_frame','silver',[(x,.44,z-.15),(s*.324,.693,z),(x,.44,z+.15)],.010,14)
   cyl(M,'bridge_frame','silver',(x,.44,z),(s*.324,.693,z),.012,14)
   for dz in [-.13,.13]:cyl(M,'bridge_frame','silver',(x,.442,z+dz),(x,.451,z+dz),.008,8)
 # Raised removable equipment shell with genuine open center well.
 outer0=rounded_loop(.315,-.975,.695,.10,.472)
 outer1=rounded_loop(.342,-.985,.705,.115,.531)
 outer2=rounded_loop(.337,-.968,.688,.125,.644)
 outer3=rounded_loop(.279,-.910,.630,.112,.792)
 loft(M,'equipment_cabin','carbon',[outer0,outer1],False)
 loft(M,'equipment_cabin','yellow',[outer1,outer2,outer3],False)
 inside=rounded_loop(.207,-.322,.282,.032,.792)
 ring_surface(M,'equipment_cabin','yellow_top',outer3,inside)
 inside_bottom=inside.copy();inside_bottom[:,1]=.472
 loft(M,'equipment_cabin','yellow',[inside,inside_bottom],False)
 ring_surface(M,'equipment_cabin','carbon',outer0,inside_bottom)
 # Side stripe follows angular cabin flank.
 for s in [-1,1]:
  v=[[s*.341,.569,-.84],[s*.338,.626,-.55],[s*.328,.663,.38],[s*.315,.648,.58],[s*.337,.618,.24],[s*.342,.574,-.48]]
  M.add('equipment_cabin','carbon',v,[(0,1,5),(1,2,4),(1,4,5),(2,3,4)])
 for z in [-.646,.475]:
  box(M,'equipment_cabin','rubber',(0,.795,z),(.420,.013,.276),.018)
  box(M,'equipment_cabin','yellow_top',(0,.810,z),(.414,.026,.266),.018)
  for dx in [-.173,.173]:
   for dz in [-.094,.094]:cyl(M,'equipment_cabin','silver',(dx,.824,z+dz),(dx,.831,z+dz),.008,8)
  for dx in [-.110,.110]:box(M,'equipment_cabin','silver',(dx,.827,z+.130),(.033,.009,.028),.003)
 # Deck-mounted GNSS pucks remain on the equipment shell, not the moving mast.
 for z in [-.806,.558]:
  cyl(M,'equipment_cabin','silver',(0,.812,z),(0,.866,z),.016,20)
  cyl(M,'equipment_cabin','white',(0,.866,z),(0,.884,z),.068,40,r2=.076)
  cyl(M,'equipment_cabin','white',(0,.884,z),(0,.899,z),.076,40,r2=.045)
 # Carry handles, hatch tethers, side fasteners visible in supplied photographs.
 for z,sgn in [(-.984,-1),(.702,1)]:
  line(M,'equipment_cabin','rubber',[[-.11,.605,z],[-.11,.50,z+sgn*.025],[-.075,.476,z+sgn*.03],[.075,.476,z+sgn*.03],[.11,.50,z+sgn*.025],[.11,.605,z]],.013,16)
  for x in [-.21,.21]:
   cyl(M,'equipment_cabin','carbon',(x,.655,z),(x,.655,z+sgn*.035),.019,20)
 for x in [-.54,.54]:
  for z in [-.85,-.43,-.01]:
   line(M,'hull_port' if x<0 else 'hull_starboard','rubber',[(x-.087,.441,z-.12),(x,.45,z),(x+.087,.441,z+.12)],.0025,8)
 # Photo-based lower frame: rectangular steel rails, white guide plates,
 # four broad diagonal braces and exposed fasteners (17:04 close-ups).
 for x in [-.143,.143]:
  box(M,'payload_lifter_fixed','silver',(x,.555,-.012),(.027,.19,.27),.003)
 for y in [.465,.65]:
  for z in [-.14,.116]:
   box(M,'payload_lifter_fixed','silver',(0,y,z),(.313,.024,.023),.003)
  # Two white guide blocks with square clearance openings for the tube pair.
  for z in [-.073,.049]:
   for x in [-.050,.050]:
    box(M,'payload_lifter_fixed','white',(x,y,z),(.073,.025,.080),.002)
   for dz in [-.027,.027]:
    box(M,'payload_lifter_fixed','white',(0,y,z+dz),(.028,.025,.026),.001)
   cyl(M,'payload_lifter_fixed','silver',(.036,y+.013,z),(.036,y+.023,z),.0035,12)
  for x in [-.13,.13]:
   for z in [-.12,.095]:
    cyl(M,'payload_lifter_fixed','silver',(x,y-.02,z),(x,y+.018,z),.005,12)
    cyl(M,'payload_lifter_fixed','silver',(x,y-.026,z),(x,y-.019,z),.009,6)
 for x in [-.117,.117]:
  box(M,'payload_lifter_fixed','white',(x,.743,-.012),(.099,.047,.142),.005)
  for dx in [-.035,.035]:
   cyl(M,'payload_lifter_fixed','silver',(x+dx,.766,.037),(x+dx,.772,.037),.005,10)
 # Flat diagonal support straps, attached to the well corners.
 for x in [-.143,.143]:
  for z in [-.14,.116]:
   endx=(.195 if x>0 else -.195);endz=(-.305 if z<0 else .265)
   v=[[x-.012,.48,z],[x+.012,.48,z],[endx+.015,.58,endz],[endx-.015,.58,endz]]
   M.add('bridge_frame','silver',v,[(0,1,2),(0,2,3)])
   cyl(M,'bridge_frame','silver',(endx,.576,endz),(endx,.591,endz),.008,12)
 # Removed the two unsupported outboard rods and their cross-clamps per Affan.
 # Paired fore/aft support tubes visible in the September 20 underside photos.
 for z in [-.073,.049]:
  cyl(M,'payload_lifter_moving','actuator_metal',(0,-.057,z),(0,1.080,z),.0125,32)
  tube(M,'payload_lifter_fixed','silver',(0,.445,z),(0,.477,z),.018,.013,32)
  box(M,'payload_lifter_fixed','silver',(0,.471,z),(.067,.008,.040),.004)
  for x in [-.026,.026]:
   cyl(M,'payload_lifter_fixed','silver',(x,.454,z),(x,.478,z),.0035,12)
   cyl(M,'payload_lifter_fixed','silver',(x,.451,z),(x,.456,z),.006,6)
 # Black actuator casing and ribs behind the guide assembly.
 for x in [-.098,.098]:
  box(M,'payload_lifter_fixed','carbon',(x,.60,-.012),(.025,.29,.20),.003)
  for y in [.49,.54,.59,.64,.69]:
   box(M,'payload_lifter_fixed','rubber',(x,y,-.012),(.031,.007,.20),.001)
 # Flange annotation appears to read OD170 / ID74 mm; provisional photo-read size.
 horizontal_mounting_ring(M,'payload_mounting_ring','actuator_metal',(0,-.060,-.012),.085,.037,.004,96)
 for angle in np.arange(8)*math.pi/4:
  x=.068*math.cos(angle);z=-.012+.068*math.sin(angle)
  cyl(M,'payload_mounting_ring','carbon',(x,-.0622,z),(x,-.0578,z),.003,16)
  # Hand-marked radial layout strokes visible on the underside.
  line(M,'payload_mounting_ring','gray',[(.039*math.cos(angle),-.0623,-.012+.039*math.sin(angle)),(.062*math.cos(angle),-.0623,-.012+.062*math.sin(angle))],.00045,6)
 for angle in [2.35,2.95]:
  x=.068*math.cos(angle);z=-.012+.068*math.sin(angle)
  cyl(M,'payload_mounting_ring','silver',(x,-.086,z),(x,-.054,z),.003,20)
  cyl(M,'payload_mounting_ring','silver',(x,-.069,z),(x,-.063,z),.0055,6)
  tube(M,'payload_mounting_ring','silver',(x,-.063,z),(x,-.062,z),.0065,.003,20)
  for y in np.linspace(-.085,-.072,10):
   tube(M,'payload_mounting_ring','gray',(x,y,z),(x,y+.00045,z),.0033,.0029,16)
 # Four aligned grey antennas, per Affan's latest correction.
 box(M,'antenna','silver',(0,1.85,-.012),(.94,.022,.066),.004)
 for side in [-1,1]:
  cyl(M,'antenna','carbon',(0,2.01,-.012),(side*.395,1.857,-.012),.006,12)
 for x,top,mat in [(-.365,2.605,'gray'),(-.08,2.605,'gray'),(.16,2.605,'gray'),(.365,2.605,'gray')]:
  box(M,'antenna','silver',(x,1.861,-.012),(.055,.013,.070),.003)
  cyl(M,'antenna','silver',(x,1.867,-.012),(x,1.91,-.012),.013,24)
  cyl(M,'antenna','rubber',(x,1.91,-.012),(x,1.96,-.012),.010,24)
  cyl(M,'antenna','silver',(x,1.96,-.012),(x,1.995,-.012),.010,24)
  cyl(M,'antenna',mat,(x,1.995,-.012),(x,top,-.012),.009 if mat=='white' else .0075,24)
  cyl(M,'antenna',mat,(x,top,-.012),(x,top+.013,-.012),.010 if mat=='white' else .009,24)
 # Matching devices at the extreme left and right; identity not yet confirmed.
 for side in [-1,1]:
  x=side*.465
  box(M,'antenna','carbon',(x,1.869,-.012),(.055,.012,.055),.003)
  box(M,'antenna','white',(x,1.914,-.012),(.042,.079,.036),.005)
  box(M,'antenna','carbon',(x,1.915,.007),(.027,.058,.004),.002)
  box(M,'antenna','silver',(x,1.915,.010),(.012,.031,.003),.001)
  line(M,'antenna','rubber',[(x,1.88,-.03),(x-side*.025,1.859,-.049),(x-side*.07,1.85,-.05)],.003,10)
 # Affan correction: centred PTZ on a short forward standoff, dome downward.
 box(M,'antenna','silver',(0,1.831,.05),(.115,.014,.15),.003)
 cyl(M,'antenna','silver',(0,1.811,.108),(0,1.831,.108),.026,28)
 cyl(M,'antenna','white',(0,1.757,.108),(0,1.811,.108),.065,40,r2=.059)
 cyl(M,'antenna','carbon',(0,1.735,.108),(0,1.757,.108),.056,40,r2=.065)
 rings=[]
 for t in np.linspace(0,math.pi/2-.02,12):
  r=.048*math.cos(t);y=1.735-.048*math.sin(t)
  rings.append([[r*math.cos(a),y,.108+r*math.sin(a)] for a in np.arange(40)*2*math.pi/40])
 loft(M,'antenna','blueglass',rings)
 # Adjacent white enclosure retained, now carried beside the centred camera.
 box(M,'antenna','white',(.104,1.774,.12),(.066,.082,.032),.008)
 # Long external mast cable and its clips removed at Affan's request.
 for z in [-.318,.278]:
  box(M,'equipment_cabin','carbon',(0,.637,z),(.32,.17,.012),.005)
  for x in [-.11,-.036,.036,.11]:
   end=z+(.035 if z<0 else -.035)
   cyl(M,'equipment_cabin','silver',(x,.65,z),(x,.65,end),.014,16)
   cyl(M,'equipment_cabin','gray',(x,.65,end),(x,.65,end+(.018 if z<0 else -.018)),.018,16)
   line(M,'payload_lifter_fixed','rubber',[(x,.65,end),(x,.60,end*.7),(x*.8,.52,end*.4),(0,.51,.07)],.006,12)
 # Stern motor cradle, nozzle flange, bolts, hub and blade guards (148727–148732).
 for x in [-.54,.54]:
  g='thrusters'
  box(M,g,'silver',(x,.26,-1.13),(.085,.16,.062),.008)
  cyl(M,g,'silver',(x,.20,-1.13),(x,.405,-1.13),.026,28)
  cyl(M,g,'red',(x,.385,-1.13),(x,.409,-1.13),.026,24)
  line(M,g,'white',[(x,.401,-1.13),(x+.05,.465,-1.11),(x+.06,.49,-1.18),(x+.03,.41,-1.21),(x,.31,-1.20)],.008,14)
  tube(M,g,'actuator_metal',(x,.105,-1.285),(x,.105,-1.075),.117,.107,64)
  tube(M,g,'silver',(x,.105,-1.293),(x,.105,-1.277),.126,.106,64)
  cyl(M,g,'gray',(x,.105,-1.19),(x,.105,-.985),.043,28,r2=.031)
  propeller(M,g,(x,.105,-1.243),.099)
  for a in np.arange(8)*math.pi/4:
   xx=x+.119*math.cos(a);yy=.105+.119*math.sin(a)
   cyl(M,g,'carbon',(xx,yy,-1.296),(xx,yy,-1.293),.006,12)
   cyl(M,g,'silver',(xx,yy,-1.299),(xx,yy,-1.296),.0035,8)
  for a in [0,math.pi/2,math.pi,3*math.pi/2]:
   cyl(M,g,'silver',(x,.105,-1.28),(x+.107*math.cos(a),.105+.107*math.sin(a),-1.28),.003,10)
  for side in [-1,1]:
   box(M,g,'silver',(x+side*.027,.284,-1.163),(.015,.035,.01),.002)
 return M

def make_rov():
 M=Model('Conceptual CHASING M2 Pro Max and protective cage')
 # Body 0.608 L x 0.294 W x 0.196 H, bow +Z. Stylized, not vendor CAD.
 box(M,'rov_body_concept','yellow',(0,.106,0),(.242,.163,.537),.040)
 box(M,'rov_body_concept','carbon',(0,.077,0),(.247,.055,.565),.016)
 box(M,'rov_body_concept','carbon',(0,.187,0),(.085,.031,.430),.012)
 for x in [-.125,.125]:
  for z in [-.175,.175]:
   tube(M,'rov_thrusters_concept','carbon',(x,.138,z-.048),(x,.138,z+.048),.038,.031,24)
   propeller(M,'rov_thrusters_concept',(x,.138,z),.028)
 for x in [-.09,.09]:
  for z in [-.115,.115]:tube(M,'rov_thrusters_concept','carbon',(x,.165,z),(x,.211,z),.037,.031,24)
 cyl(M,'rov_camera_concept','carbon',(0,.109,.265),(0,.109,.304),.040,28)
 cyl(M,'rov_camera_concept','blueglass',(0,.109,.304),(0,.109,.307),.030,28)
 for x in [-.081,.081]:
  cyl(M,'rov_camera_concept','silver',(x,.114,.263),(x,.114,.285),.025,20)
  cyl(M,'rov_camera_concept','white',(x,.114,.285),(x,.114,.288),.020,20)
 # Normalize the full vehicle envelope to the requested published approximation.
 # Keep protective cage independent, as its clearances are a design proposal.
 for materials in M.groups.values():
  for chunks in materials.values():
   for v,f,n in chunks:
    v[:,0]*=.294/.326
    v[:,1]=(v[:,1]-.0245)*(.196/.1865)
    v[:,2]=(v[:,2]-.01225)*(.608/.5895)
    n[:,0]/=.294/.326;n[:,1]/=.196/.1865;n[:,2]/=.608/.5895
    n/=np.maximum(np.linalg.norm(n,axis=1)[:,None],1e-12)
 # External cage is conceptual and deliberately a separate named node.
 for x in [-.193,.193]:
  for y in [-.014,.256]:cyl(M,'rov_cage_concept','silver',(x,y,-.343),(x,y,.343),.010,12)
  for z in [-.343,.343]:cyl(M,'rov_cage_concept','silver',(x,-.014,z),(x,.256,z),.010,12)
 for y in [-.014,.256]:
  for z in [-.343,.343]:cyl(M,'rov_cage_concept','silver',(-.193,y,z),(.193,y,z),.010,12)
 return M

def make_reel():
 M=Model('Conceptual tether reel')
 for x in [-.172,.172]:
  box(M,'reel_frame_concept','carbon',(x,.026,0),(.045,.051,.400),.010)
  cyl(M,'reel_frame_concept','silver',(x,.04,-.16),(x,.225,0),.013,14)
  cyl(M,'reel_frame_concept','silver',(x,.04,.16),(x,.225,0),.013,14)
  cyl(M,'reel_drum_concept','teal',(x-.008,.232,0),(x+.008,.232,0),.168,40)
 cyl(M,'reel_drum_concept','rubber',(-.146,.232,0),(.146,.232,0),.124,40)
 for x in np.linspace(-.14,.14,22):tube(M,'reel_tether_concept','orange',(x-.003,.232,0),(x+.003,.232,0),.128,.121,32)
 cyl(M,'reel_frame_concept','silver',(-.193,.232,0),(.228,.232,0),.018,20)
 box(M,'reel_motor_concept','gray',(.226,.195,0),(.065,.126,.126),.017)
 return M

def make_starlink():
 M=Model('Conceptual Starlink Mini mounting')
 box(M,'starlink_panel_concept','white',(0,.023,0),(.259,.038,.299),.011)
 box(M,'starlink_panel_concept','gray',(0,.003,0),(.232,.012,.272),.012)
 for x in [-.077,.077]:cyl(M,'starlink_mount_concept','silver',(x,-.082,-.072),(x,.002,.066),.007,12)
 cyl(M,'starlink_mount_concept','silver',(-.096,-.082,-.072),(.096,-.082,-.072),.007,12)
 return M

def make_compute():
 M=Model('Conceptual sealed compute enclosure')
 box(M,'compute_case_concept','gray',(0,.067,0),(.280,.134,.210),.015)
 box(M,'compute_lid_concept','silver',(0,.137,0),(.276,.015,.207),.012)
 for x in [-.122,.122]:
  for z in [-.082,.082]:cyl(M,'compute_lid_concept','carbon',(x,.143,z),(x,.150,z),.007,8)
 for z in [-.056,0,.056]:
  cyl(M,'compute_ports_concept','carbon',(.137,.063,z),(.157,.063,z),.013,18)
  tube(M,'compute_ports_concept','silver',(.156,.063,z),(.162,.063,z),.012,.008,18)
 return M

def render(M,filename,width=1500,height=1100,camera=None,target=None,title=None):
 # Deterministic orthographic CPU rendering of the actual triangle geometry.
 camera=np.array([3.2,2.1,3.9] if camera is None else camera,dtype=float);target=np.array([0,.92,0] if target is None else target,dtype=float);fw=target-camera;fw/=np.linalg.norm(fw)
 right=np.cross(fw,[0,1,0]);right/=np.linalg.norm(right);up=np.cross(right,fw)
 verts=[]
 for mats in M.groups.values():
  for chunks in mats.values():
   for v,_,_ in chunks:verts.append(v)
 allp=np.vstack(verts);scr=np.c_[allp@right,allp@up];mn=scr.min(axis=0);mx=scr.max(axis=0)
 scale=min((width-200)/(mx[0]-mn[0]),(height-120)/(mx[1]-mn[1]));center=(mn+mx)/2
 canvas=np.ones((height,width,3),dtype=np.float32)*np.array([.946,.953,.953]);depth=np.full((height,width),-np.inf,dtype=np.float32)
 L=np.array([-.3,.85,.45]);L/=np.linalg.norm(L);L2=np.array([.7,.35,-.55]);L2/=np.linalg.norm(L2)
 for mats in M.groups.values():
  for mat,chunks in mats.items():
   col=np.array(MATS[mat][0][:3])
   for v,f,n in chunks:
    sx=(v@right-center[0])*scale+width/2;sy=height/2-(v@up-center[1])*scale;zz=-(v@fw)
    for ids in f:
     x=sx[ids];y=sy[ids];z=zz[ids];norm=n[ids].mean(axis=0);norm/=max(np.linalg.norm(norm),1e-12)
     if np.dot(norm,fw)>0:norm=-norm
     light=.45+.40*max(0,np.dot(norm,L))+.15*max(0,np.dot(norm,L2));rgb=col*light
     x0=max(0,int(np.floor(x.min())));x1=min(width-1,int(np.ceil(x.max())));y0=max(0,int(np.floor(y.min())));y1=min(height-1,int(np.ceil(y.max())))
     if x1<x0 or y1<y0:continue
     den=(y[1]-y[2])*(x[0]-x[2])+(x[2]-x[1])*(y[0]-y[2])
     if abs(den)<1e-9:continue
     xx,yy=np.meshgrid(np.arange(x0,x1+1)+.5,np.arange(y0,y1+1)+.5)
     a=((y[1]-y[2])*(xx-x[2])+(x[2]-x[1])*(yy-y[2]))/den;b=((y[2]-y[0])*(xx-x[2])+(x[0]-x[2])*(yy-y[2]))/den;c=1-a-b
     dz=a*z[0]+b*z[1]+c*z[2];region=depth[y0:y1+1,x0:x1+1];mask=(a>=-1e-5)&(b>=-1e-5)&(c>=-1e-5)&(dz>region)
     region[mask]=dz[mask];canvas[y0:y1+1,x0:x1+1][mask]=rgb
 im=Image.fromarray(np.uint8(np.clip(canvas,0,1)*255));draw=ImageDraw.Draw(im)
 font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
 try:big=ImageFont.truetype(font,25);small=ImageFont.truetype(font,16)
 except:big=small=None
 draw.text((42,35),title or 'ME120  |  Reference-based 3D discussion model',fill='#24343c',font=big)
 draw.text((42,height-44),'Metres · +Y up · Bow +Z  |  Visual proportions; not measured CAD',fill='#60747c',font=small)
 im.save(OUT/filename)

if __name__=='__main__':
 # Rebuild only the ME120 asset; existing integration accessories remain untouched.
 OUT=Path(__file__).resolve().parents[1]/'public'/'models'
 M=make_me120();report=M.export('me120-reference.glb')
 manifest={'revision':11,'basis':"Affan hardware photographs, September 2026; overall hull length and beam anchored to published specification",'models':[report],'units':'metres','lift':{'range':[47.6,53],'waterlinePercent':50,'waterY':.25,'movingNodes':['payload_lifter_moving','payload_mounting_ring'],'mastNode':'antenna','deckGNSS':'equipment_cabin','ringNeutralY':-.06},'limitations':'Photo-derived approximate geometry; flange dimensions, hole pattern, sensor identities, stroke and rated loads unmeasured. Not fabrication CAD.'}
 (OUT/'model-manifest.json').write_text(json.dumps(manifest,indent=2))
 # Render the same raised pose used by the web viewer; keep exported GLB neutral.
 for name in ['payload_lifter_moving','payload_mounting_ring']:
  for chunks in M.groups[name].values():
   for v,f,n in chunks:v[:,1]+=.418
 for chunks in M.groups['antenna'].values():
  for v,f,n in chunks:v[:,1]-=.342
 render(M,'me120-preview.png',width=1200,height=1100,title='ME120 | Hardware-photo reference · September 2026')
