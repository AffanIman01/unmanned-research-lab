"""CHASING M2 PRO MAX visual discussion model. Metres, Y up, bow +Z. Not measured CAD.
Geometry proportions approximated from the manufacturer manual and product images.
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
  doc={'asset':{'version':'2.0','generator':'Procedural CHASING M2 PRO MAX reference visualization; not measured CAD'},'scene':0,'scenes':[{'nodes':[]}],'nodes':[],'meshes':[],'materials':[],'buffers':[{'byteLength':0}],'bufferViews':[],'accessors':[],'extras':{'units':'metres','upAxis':'+Y','bowAxis':'+Z','accuracy':'Reference-based visualization only; not measured CAD, not a load or stability model.'}}
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
   idx=len(doc['meshes']);doc['meshes'].append({'name':group,'primitives':prims});doc['nodes'].append({'name':group,'mesh':idx,'extras':{'component':group,'conceptual':False,'accuracy':'Reference-based approximate geometry'}});doc['scenes'][0]['nodes'].append(len(doc['nodes'])-1)
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
 loops=[]
 for p,r in [(a,outer),(b,outer),(a,inner),(b,inner)]:
  loops.append(np.array([p+r*(math.cos(t)*u+math.sin(t)*w) for t in np.arange(n)*2*math.pi/n]))
 for low,high,inside in [(loops[0],loops[1],False),(loops[2],loops[3],True)]:
  vv=np.vstack([low,high]);ff=[]
  for i in range(n):
   j=(i+1)%n;ff.extend([(i,j,n+j),(i,n+j,n+i)])
  if inside:ff=[tuple(reversed(f)) for f in ff]
  M.add(g,mat,vv,ff,True)
 for out,ins,flip in [(loops[0],loops[2],False),(loops[1],loops[3],True)]:
  vv=np.vstack([out,ins]);ff=[]
  for i in range(n):
   j=(i+1)%n;ff.extend([(i,n+j,j),(i,n+i,n+j)])
  if flip:ff=[tuple(reversed(f)) for f in ff]
  M.add(g,mat,vv,ff)

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

def render(M,filename,width=1500,height=1100,camera=None,target=None,title=None):
 # Deterministic orthographic CPU rendering of the actual triangle geometry.
 camera=np.array([.70,.48,.85] if camera is None else camera,dtype=float);target=np.array([0,.10,0] if target is None else target,dtype=float);fw=target-camera;fw/=np.linalg.norm(fw)
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
 draw.text((42,35),title or 'CHASING M2 PRO MAX | Reference-based 3D model',fill='#24343c',font=big)
 draw.text((42,height-44),'Metres · +Y up · Bow +Z  |  Visual proportions; not measured CAD',fill='#60747c',font=small)
 im.save(OUT/filename)

def thruster(M,c,axis):
 c=np.array(c,float);d=np.array(axis,float);d/=np.linalg.norm(d)
 u=np.cross(d,[0,1,0]);u/=np.linalg.norm(u);v=np.cross(d,u)
 # Black motor duct, machined grey end rim, orange three-blade screw.
 tube(M,'rov_thrusters','carbon',c-d*.032,c+d*.032,.048,.042,40)
 tube(M,'rov_frame','silver',c+d*.028,c+d*.036,.051,.045,40)
 tube(M,'rov_thrusters','rubber',c-d*.034,c-d*.028,.049,.042,40)
 cyl(M,'rov_thrusters','carbon',c-d*.020,c+d*.031,.017,28,r2=.014)
 cyl(M,'rov_thrusters','orange',c-d*.009,c+d*.010,.0155,28)
 for a in [0,2*math.pi/3,4*math.pi/3]:
  rr=math.cos(a)*u+math.sin(a)*v;tt=-math.sin(a)*u+math.cos(a)*v
  blade=[c+rr*.012-tt*.006-d*.009,c+rr*.039-tt*.012+d*.002,c+rr*.042+tt*.002+d*.009,c+rr*.020+tt*.012+d*.003]
  M.add('rov_thrusters','orange',blade,[(0,1,2),(0,2,3)])
  cyl(M,'rov_thrusters','carbon',c+d*.028,c+d*.028+rr*.043,.0023,10)
  cyl(M,'rov_thrusters','silver',c+d*.032+rr*.011,c+d*.035+rr*.011,.002,8)

def make_chasing():
 M=Model('CHASING M2 PRO MAX')
 # Main pressure housing and rear removable battery use the same longitudinal axis.
 cyl(M,'rov_body','carbon',(0,.104,-.012),(0,.104,.255),.060,56)
 cyl(M,'rov_body','silver',(0,.104,.248),(0,.104,.279),.062,48,r2=.053)
 cyl(M,'rov_body','gray',(0,.104,-.027),(0,.104,-.010),.063,40)
 cyl(M,'rov_battery','carbon',(0,.104,-.277),(0,.104,-.029),.059,56)
 cyl(M,'rov_battery','silver',(0,.104,-.286),(0,.104,-.270),.061,48)
 cyl(M,'rov_battery','rubber',(0,.104,-.034),(0,.104,-.026),.061,48)
 # Visible longitudinal housing seams, battery tie rods and upper mounting rails.
 for s in [-1,1]:
  cyl(M,'rov_body','gray',(s*.052,.137,-.023),(s*.052,.137,.251),.0035,12)
  cyl(M,'rov_battery','silver',(s*.049,.138,-.273),(s*.049,.138,-.034),.0036,12)
  box(M,'rov_frame','carbon',(s*.031,.169,-.004),(.012,.012,.498),.002)
  for z in np.linspace(-.218,.222,13):box(M,'rov_frame','gray',(s*.031,.176,z),(.006,.002,.011),.001)
  # Integrated side frame has two rails and an open center hand grip area.
  for y in [.041,.153]:
   line(M,'rov_frame','gray',[(s*.110,y,-.271),(s*.135,y,-.203),(s*.137,y,.172),(s*.105,y,.265)],.0048,16)
   box(M,'rov_frame','silver',(s*.137,y,-.016),(.014,.027,.234),.006)
  for z in [-.239,.232]:
   line(M,'rov_frame','silver',[(s*.102,.014,z),(s*.129,.036,z),(s*.141,.098,z),(s*.130,.158,z),(s*.102,.185,z)],.0075,18)
  # Rail grips and small retaining screws are visibly separate from the core body.
  for z in [-.107,.077]:
   for y in [.041,.153]:cyl(M,'rov_frame','carbon',(s*.147,y,z),(s*.151,y,z),.0025,8)
 # Camera integrated into the front main cabin end plate.
 cyl(M,'rov_camera','rubber',(0,.104,.270),(0,.104,.295),.035,48)
 tube(M,'rov_camera','silver',(0,.104,.290),(0,.104,.298),.034,.028,48)
 cyl(M,'rov_camera','blueglass',(0,.104,.296),(0,.104,.299),.0275,48)
 cyl(M,'rov_camera','carbon',(0,.104,.299),(0,.104,.300),.018,40)
 cyl(M,'rov_camera','blueglass',(0,.104,.300),(0,.104,.302),.014,40)
 for a in np.arange(6)*math.pi/3:
  x=.042*math.cos(a);y=.104+.042*math.sin(a)
  cyl(M,'rov_body','carbon',(x,y,.276),(x,y,.280),.0027,8)
 # Eight corner thrusters form the observed upper/lower, fore/aft vectored layout.
 # Exact duct angles and fastener positions are approximations, not manufacturer CAD.
 for sx in [-1,1]:
  for sz in [-1,1]:
   for sy in [-1,1]:
    c=[sx*.092,.104+sy*.053,sz*.244]
    d=[sx*.26,sy*.53,sz*.81]
    thruster(M,c,d)
 # Accessory interface collar (manual lists five peripheral ports).
 box(M,'rov_body','gray',(0,.174,.024),(.074,.028,.070),.006)
 for side,zlist in [(-1,[-.003,.024,.051]),(1,[.005,.044])]:
  for z in zlist:
   cyl(M,'rov_body','carbon',(side*.037,.174,z),(side*.049,.174,z),.009,18)
   tube(M,'rov_body','silver',(side*.047,.174,z),(side*.051,.174,z),.009,.006,18)
 for s in [-1,1]:
  # Battery twist locks and rear pull-ring latch.
  cyl(M,'rov_battery','carbon',(s*.056,.105,-.036),(s*.069,.105,-.036),.010,20)
  box(M,'rov_battery','silver',(s*.070,.105,-.036),(.007,.026,.007),.002)
 line(M,'rov_battery','carbon',[(-.024,.103,-.292),(-.024,.143,-.301),(.024,.143,-.301),(.024,.103,-.292)],.004,14)
 box(M,'rov_battery','gray',(0,.069,-.292),(.073,.025,.012),.004)
 # Base envelope is anchored to the published dimensions EXCLUDING floodlights.
 points=np.vstack([v for mats in M.groups.values() for chunks in mats.values() for v,_,_ in chunks])
 lo=points.min(axis=0);hi=points.max(axis=0);scale=np.array([.294,.196,.608])/(hi-lo);offset=np.array([-(lo[0]+hi[0])/2,-lo[1],-(lo[2]+hi[2])/2])
 for mats in M.groups.values():
  for chunks in mats.values():
   for vv,ff,nn in chunks:
    vv[:]=(vv+offset)*scale;nn[:]=nn/scale;nn[:]/=np.maximum(np.linalg.norm(nn,axis=1)[:,None],1e-12)
 def P(p):return (np.array(p)+offset)*scale
 # User manual common working state: lights outside and obliquely above handles.
 for s in [-1,1]:
  base=P([s*.137,.153,.117]);head=P([s*.192,.240,.150]);axis=np.array([s*.075,-.055,1]);axis/=np.linalg.norm(axis)
  cyl(M,'rov_lights','carbon',base,head-axis*.020,.011,24,r2=.015)
  cyl(M,'rov_lights','silver',base-[.009,0,0],base+[.009,0,0],.017,24)
  cyl(M,'rov_lights','carbon',base+[s*.007,0,0],base+[s*.015,0,0],.015,24)
  cyl(M,'rov_lights','carbon',head-axis*.027,head+axis*.029,.028,36)
  for d in [-.013,-.009,.013,.018]:tube(M,'rov_lights','orange',head+axis*d,head+axis*(d+.0015),.0283,.0272,36)
  tube(M,'rov_lights','gray',head+axis*.027,head+axis*.034,.029,.023,36)
  cyl(M,'rov_lights','white',head+axis*.031,head+axis*.035,.022,32)
  cyl(M,'rov_lights','lamp_core',head+axis*.035,head+axis*.036,.011,28)
  line(M,'rov_lights','rubber',[head-axis*.029,P([s*.180,.190,.070]),P([s*.136,.166,.025]),P([s*.052,.169,.025])],.0025,12)
 # Supported rear tether/charging connector and a short illustrative tether segment.
 cyl(M,'rov_tether','carbon',P([0,.105,-.285]),P([0,.105,-.318]),.012,24)
 for z in [-.298,-.304,-.310]:tube(M,'rov_tether','gray',P([0,.105,z-.002]),P([0,.105,z+.002]),.013,.011,24)
 line(M,'rov_tether','tether_yellow',[P([0,.105,-.321]),P([0,.107,-.337]),P([.012,.13,-.352]),P([.044,.174,-.355]),P([.070,.20,-.340])],.0028,14)
 return M

if __name__=='__main__':
 MATS['carbon']=([.075,.090,.105,1],.35,.32)
 MATS['silver']=([.65,.70,.73,1],.70,.27)
 MATS['gray']=([.22,.27,.30,1],.55,.32)
 MATS['orange']=([1,.22,.015,1],.1,.30)
 MATS['lamp_core']=([1.0,.91,.54,1],.1,.2)
 MATS['tether_yellow']=([1.0,.58,.025,1],.05,.42)
 M=make_chasing();report=M.export('chasing-m2-pro-max-reference.glb')
 render(M,'chasing-m2-pro-max-preview.png',title='CHASING M2 PRO MAX | Reference-based 3D model')
 render(M,'chasing-m2-pro-max-front.png',camera=[.001,.155,1],target=[0,.13,0],title='M2 PRO MAX | Front, external lights deployed')
 render(M,'chasing-m2-pro-max-underside.png',camera=[.7,-.45,.9],target=[0,.10,0],title='M2 PRO MAX | Underside and frame')
 manifest={'coordinateSystem':{'units':'metres','up':'+Y','front':'+Z','origin':'x0/z0 body envelope centre, y0 lowest frame point excluding lights and tether'},'publishedEnvelope':{'x':.294,'y':.196,'z':.608,'excludes':'External floodlights; the modeled short tether also extends beyond the envelope'},'model':report,'configuration':'Standard ROV with two external floodlights in the manual common deployed working position. No optional cage, manipulator or sonar.','facts':{'thrusterCount':8,'thrusterDescription':'Eight vectored C-MOTOR 2.0 thrusters; shown as fore/aft upper/lower corner pairs. Angles approximated from imagery.','battery':'Rear removable battery compartment; website nominal 300Wh, manual 302.4Wh.','lights':'Two external folding LED floodlights, 2 x 4000 lumens total 8000 lumens.','camera':'Forward integrated camera; 4K and 12MP claimed in official overview.','maxDepthMetres':200,'nominalMassKg':8,'accessoryPortCount':5},'references':[{'url':'https://www.chasing.com/en/chasing-m2pro-max-specs.html','supports':'Dimensions excluding floodlights, 300Wh battery, depth and lights.'},{'url':'https://www.chasing.com/en/chasing-m2pro-max-overview.html','supports':'Camera, external folding lights and motor family.'},{'url':'https://na-file.chasing.com/ltWgw4lZoQ7OvgSnLHiGc5Yeku2-','supports':'Manufacturer User Manual V1.0: PDF page3 component layout and eight thrusters; page6 removable battery; page7 deployed/folded lamps; page8 dimensions.'},{'url':'https://na-file.chasing.com/1789714450610/img/max_fenzu7_img_1_pc.052c111.webp','supports':'Official motor, silver frame and orange screw visual detail.'},{'url':'https://na-file.chasing.com/1789714450610/img/max_fenzu4_img_1_pc.0a935bd.webp','supports':'Official mounting rail and sideframe visual detail.'},{'url':'https://na-file.chasing.com/1789714450610/img/max_fenzu5_img_1_pc.bfbc10c.webp','supports':'Official ROV whole assembly and rear interface visual reference; optional shore power/reel omitted.'}],'limitations':['Reference-based procedural visualization, not manufacturer CAD.','Published no-light overall envelope is the only dimensional anchor. Individual parts, motor axes, lamp spacing, battery split and fasteners are visually approximated.','Lamp brightness is metadata only, not a calibrated lighting simulation.','Removable battery is represented as a selectable group, without verified internal geometry or service clearances.']}
 manifest['nodePositions']={name:((np.array(bounds['min'])+np.array(bounds['max']))/2).tolist() for name,bounds in report['bounds'].items()}
 (OUT/'chasing-model-manifest.json').write_text(json.dumps(manifest,indent=2))
