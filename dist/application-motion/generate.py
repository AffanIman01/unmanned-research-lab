#!/usr/bin/env python3
"""Reproducible CPU 3D renders of research application concepts (not field footage)."""
from pathlib import Path
import struct,json,math,subprocess,tempfile
import numpy as np
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parent
MODELS=ROOT.parent/'models'
W,H=960,600
N=40
FPS=10
BG=(24,23,34)
LIGHT=np.array([-.5,-.8,1.0]); LIGHT/=np.linalg.norm(LIGHT)
EYE=np.array([8.,-12.,9.]); AIM=np.array([0.,0.,-0.7]); F=(AIM-EYE); F/=np.linalg.norm(F)
RIGHT=np.cross(F,[0,0,1.]);RIGHT/=np.linalg.norm(RIGHT);UP=np.cross(RIGHT,F)
SCALE=65

def project(p):
 p=np.asarray(p); return np.stack([W/2+p@RIGHT*SCALE,H/2-24-(p-AIM)@UP*SCALE],axis=-1)

def mesh(v,f,col,alpha=255):
 v=np.asarray(v,float);f=np.asarray(f,int);c=np.tile(np.array([*col,alpha]),(len(f),1));return v[f],c

def box(pos,size,col):
 x,y,z=pos;a,b,c=np.array(size)/2
 v=[[x+i*a,y+j*b,z+k*c]for i,j,k in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
 f=[[0,2,1],[0,3,2],[4,5,6],[4,6,7],[0,1,5],[0,5,4],[1,2,6],[1,6,5],[2,3,7],[2,7,6],[3,0,4],[3,4,7]]
 return mesh(v,f,col)

def cylinder(p1,p2,r,col,n=14):
 a,b=np.array(p1,float),np.array(p2,float);z=(b-a);z/=np.linalg.norm(z)
 ref=np.array([0.,0.,1.]) if abs(z[2])<.95 else np.array([1.,0.,0.]);u=np.cross(z,ref);u/=np.linalg.norm(u);v=np.cross(z,u)
 verts=[p+r*(math.cos(t)*u+math.sin(t)*v)for p in [a,b]for t in np.arange(n)*2*math.pi/n]+[a,b]
 f=[]
 for i in range(n):
  j=(i+1)%n;f.extend([[i,j,j+n],[i,j+n,i+n],[2*n,j,i],[2*n+1,i+n,j+n]])
 return mesh(verts,f,col)

def glb(name):
 b=(MODELS/name).read_bytes();le=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+le]);binary=b[28+le:]
 def acc(i):
  ac=g['accessors'][i];view=g['bufferViews'][ac['bufferView']];dtype={5126:'<f4',5123:'<u2',5125:'<u4'}[ac['componentType']];dims={'SCALAR':1,'VEC3':3,'VEC2':2,'VEC4':4}[ac['type']];offset=view.get('byteOffset',0)+ac.get('byteOffset',0);return np.frombuffer(binary,dtype=dtype,count=ac['count']*dims,offset=offset).reshape(ac['count'],dims)
 parts=[]
 for m in g['meshes']:
  for p in m['primitives']:
   verts=acc(p['attributes']['POSITION']).copy();verts=verts[:,[0,2,1]]
   # Axis swap reverses handedness; reverse winding as well.
   f=acc(p['indices']).reshape(-1,3)[:,[0,2,1]]
   color=np.array(g['materials'][p['material']]['pbrMetallicRoughness']['baseColorFactor'][:3])*255
   parts.append(mesh(verts,f,color.astype(int)))
 return np.concatenate([p[0] for p in parts]),np.concatenate([p[1] for p in parts])
USV=glb('me120-reference.glb');ROV=glb('chasing-m2-pro-max-reference.glb')
# Standalone reference omits its adjustable scene mast; connect its antenna crossbar for this illustration.
_mast=cylinder((0,.06,1.03),(0,.06,1.72),.035,(101,116,125),12)
USV=(np.concatenate([USV[0],_mast[0]]),np.concatenate([USV[1],_mast[1]]))

def move(m,pos,scale=1.,yaw=0.,bob=0):
 p,c=m;a=yaw;R=np.array([[math.cos(a),-math.sin(a),0],[math.sin(a),math.cos(a),0],[0,0,1]])
 p=(p@R.T)*scale+np.array(pos)+[0,0,bob];return p,c

def render(parts):
 tri=np.concatenate([x[0]for x in parts]);color=np.concatenate([x[1]for x in parts]).astype(float)
 normal=np.cross(tri[:,1]-tri[:,0],tri[:,2]-tri[:,0]);length=np.linalg.norm(normal,axis=1);normal/=np.maximum(length[:,None],1e-8)
 # Soft studio light, with a warm key and cool fill.
 key=np.maximum(0,normal@LIGHT);fill=np.maximum(0,normal@(-LIGHT))
 intensity=.57+.45*key+.12*fill;color[:,:3]*=intensity[:,None]
 projected=project(tri);depth=tri.mean(axis=1)@F
 edge1=projected[:,1]-projected[:,0];edge2=projected[:,2]-projected[:,0]
 area=np.abs(edge1[:,0]*edge2[:,1]-edge1[:,1]*edge2[:,0])
 visible=np.where((area>.08)&(np.max(projected[:,:,0],axis=1)>0)&(np.min(projected[:,:,0],axis=1)<W)&(np.max(projected[:,:,1],axis=1)>0)&(np.min(projected[:,:,1],axis=1)<H))[0]
 order=visible[np.argsort(depth[visible])[::-1]]
 yy,xx=np.mgrid[0:H,0:W]; glow=np.exp(-(((xx-W*.52)/(W*.6))**2+((yy-H*.49)/(H*.66))**2)*2)
 arr=np.zeros((H,W,3),dtype=np.uint8)
 for k in range(3):arr[:,:,k]=BG[k]+glow*([9,12,18][k])
 im=Image.fromarray(arr);d=ImageDraw.Draw(im,'RGBA')
 for i in order:d.polygon([tuple(x)for x in projected[i]],fill=tuple(np.clip(color[i],0,255).astype(int)))
 return im

def water():
 parts=[box((0,0,-3.28),(7.8,5.3,.25),(48,61,65))]
 # Cutaway block has translucent water top and front/right faces, leaving inspection volume readable.
 verts=[[-3.9,-2.65,0],[3.9,-2.65,0],[3.9,2.65,0],[-3.9,2.65,0],[-3.9,-2.65,-3.2],[3.9,-2.65,-3.2],[3.9,2.65,-3.2]]
 parts += [mesh(verts,[[0,1,2],[0,2,3]],(38,136,155),62),mesh(verts,[[0,4,5],[0,5,1],[1,5,6],[1,6,2]],(37,120,143),57)]
 # Layered seabed strips and low-profile survey grid.
 for x in np.arange(-3.8,4,.8):parts.append(cylinder((x,-2.5,-3.13),(x,2.5,-3.13),.007,(91,106,104),6))
 for y in np.arange(-2.4,2.6,.8):parts.append(cylinder((-3.8,y,-3.13),(3.8,y,-3.13),.007,(91,106,104),6))
 return parts

def environment(kind):
 p=water()
 if kind=='ports':
  for x in [1.25,2.85]:
   for y in [.9,2.0]:p.append(cylinder((x,y,-3.15),(x,y,.68),.16,(132,143,147),18))
  p += [box((2.08,1.45,.70),(2.8,2,.26),(144,149,153)),box((2.08,2.30,.93),(2.8,.15,.25),(79,83,99))]
  for x in [1.0,2.0,3.0]:
   p.append(cylinder((x,.48,.78),(x,.48,.96),.085,(198,164,90),12))
  for z in np.arange(-2.8,-.2,.45):p.append(cylinder((1.18,.89,z),(1.34,.89,z+.14),.028,(93,131,108),8))
 elif kind=='reservoir':
  p += [box((2.72,1,-.98),(.5,3.6,4.9),(135,144,145)),box((2.38,1,.97),(1.2,3.6,.20),(183,187,180))]
  for y in [-.20,1.3]:
   p.append(cylinder((2.45,y,-2),(1.55,y,-2),.50,(62,78,82),28))
   p.append(cylinder((1.48,y,-2),(1.54,y,-2),.45,(24,45,52),24))
   for a in [-.3,-.15,0,.15,.3]:p.append(cylinder((1.46,y+a,-2-.36),(1.46,y+a,-2+.36),.018,(144,162,157),8))
  for y in np.arange(-.6,2.5,.45):p.append(cylinder((2.05,y,1.04),(2.05,y,1.38),.025,(175,183,177),8))
  p.append(cylinder((2.05,-.7,1.38),(2.05,2.5,1.38),.025,(175,183,177),8))
 elif kind=='aquaculture':
  cx,cy,r=1.8,1.,1.23
  for i in range(40):
   a,b=2*math.pi*i/40,2*math.pi*(i+1)/40
   for z in [.04,-.08]:p.append(cylinder((cx+r*math.cos(a),cy+r*math.sin(a),z),(cx+r*math.cos(b),cy+r*math.sin(b),z),.065,(208,163,77),10))
  for i in range(28):
   a=2*math.pi*i/28;p.append(cylinder((cx+r*math.cos(a),cy+r*math.sin(a),-.10),(cx+.85*r*math.cos(a),cy+.85*r*math.sin(a),-2.8),.011,(105,151,153),5))
  for z in np.arange(-.35,-2.9,-.34):
   rr=r*(1+z*.055)
   for i in range(32):
    a,b=2*math.pi*i/32,2*math.pi*(i+1)/32;p.append(cylinder((cx+rr*math.cos(a),cy+rr*math.sin(a),z),(cx+rr*math.cos(b),cy+rr*math.sin(b),z),.009,(105,151,153),5))
  for x,y,z in [(1.5,.9,-1.5),(2.1,.7,-2),(1.7,1.6,-1.9),(2.3,1.4,-1.2)]:
   p.append(cylinder((x-.14,y,z),(x+.14,y,z),.05,(166,178,168),8))
 elif kind=='energy':
  p.append(cylinder((2.1,1.,-3.15),(2.1,1.,1.0),.36,(198,164,89),30))
  p.append(cylinder((2.1,1.,.8),(2.1,1.,2.6),.19,(197,209,207),24))
  p.append(cylinder((2.1,.7,2.55),(2.1,1.2,2.55),.20,(206,216,212),16))
  for theta in [0,2*math.pi/3,4*math.pi/3]:
   center=np.array([2.1,.67,2.55]);u=np.array([math.sin(theta),0,math.cos(theta)]);v=np.array([math.cos(theta),0,-math.sin(theta)]);verts=[center+u*.1-v*.11,center+u*.15+v*.11,center+u*1.12+v*.08,center+u*1.5-v*.02];p.append(mesh(verts,[[0,1,2],[0,2,3]],(216,225,217)))
  for i in range(9):
   a=i*2*math.pi/9;x=2.1+.70*math.cos(a);y=1.+.70*math.sin(a);p.append(box((x,y,-3.06),(.28,.26,.16),(91,103,103)))
 return p

def line3d(draw,pts,fill,width=2):draw.line([tuple(p)for p in project(np.asarray(pts))],fill=fill,width=width,joint='curve')

def overlays(im,kind,t,rov,boat):
 d=ImageDraw.Draw(im,'RGBA')
 # Clean edge of water cutaway, wavelets and surface wake.
 for a,b in [((-3.9,-2.65,0),(3.9,-2.65,0)),((3.9,-2.65,0),(3.9,2.65,0)),((-3.9,-2.65,0),(-3.9,-2.65,-3.2)),((3.9,-2.65,0),(3.9,-2.65,-3.2))]:line3d(d,[a,b],(99,188,199,75),1)
 for j in range(11):
  xx=-3.55+j*.67;yy=-2.15+.08*math.sin(t*2*math.pi+j);line3d(d,[(xx,yy,0),(xx+.26,yy+.04,0)],(153,221,220,75),1)
 # Slack catenary-like tether between reel and moving ROV, intentionally never tensioned.
 a=np.array(boat)+[.10,.05,.3];b=np.array(rov)+[0,-.15,.15]
 pts=[]
 for s in np.linspace(0,1,55):pts.append(a*(1-s)+b*s+[.20*math.sin(math.pi*s),-.25*math.sin(math.pi*s),-.48*math.sin(math.pi*s)])
 line3d(d,pts,(237,182,81,215),2)
 # Beam from ROV toward the inspected structure, correctly projected from 3D.
 origin=np.array(rov)+[.14,.22,.12];target={'ports':(1.2,.9,rov[2]+.1),'reservoir':(1.46,-.2,-2),'aquaculture':(.57,1,rov[2]),'energy':(1.75,1.,rov[2])}[kind]
 endpoint=np.array(target);beam=project(np.array([origin,endpoint+[-.02,0,.40],endpoint+[-.02,0,-.40]]));d.polygon([tuple(x)for x in beam],fill=(255,219,133,29))
 lit=project(origin);d.ellipse((lit[0]-5,lit[1]-5,lit[0]+5,lit[1]+5),fill=(250,224,155,240))
 hit=project(endpoint);rr=9+2*math.sin(t*math.pi*4);d.ellipse((hit[0]-rr,hit[1]-rr*.6,hit[0]+rr,hit[1]+rr*.6),outline=(255,222,148,80),width=1)
 # Gentle bubbles indicate motion, never simulation measurements.
 for j in range(5):
  q=np.array(rov)+[-.25+j*.05,-.12,.25+((t+j*.16)%1)*.65];x,y=project(q);r=1.5+(j%2);d.ellipse((x-r,y-r,x+r,y+r),outline=(165,213,212,90),width=1)
 return im

def main():
 contacts=[]
 for kind in ['ports','reservoir','aquaculture','energy']:
  static=environment(kind);frames=[]
  for i in range(N):
   t=i/N;phase=t*math.pi*2;boat=(-1.75,-1.0,-.10)
   # Slow closed route keeps loop seamless while illustrating a repeatable inspection pass.
   rov=(-.33+.32*math.sin(phase),-.18+.12*math.cos(phase),-1.73+.35*math.cos(phase))
   if kind=='aquaculture':rov=(-.05+.20*math.sin(phase),-.18+.16*math.cos(phase),-1.70+.38*math.cos(phase))
   parts=static+[move(USV,boat,.82,yaw=-.25,bob=.025*math.sin(phase)),move(ROV,rov,1.85,yaw=.15*math.sin(phase))]
   im=render(parts);im=overlays(im,kind,t,rov,boat)
   im=im.resize((720,450),Image.Resampling.LANCZOS);frames.append(im)
   if i==0:im.save(ROOT/f'{kind}-poster.png')
  pal=frames[0].quantize(colors=160,method=Image.Quantize.MEDIANCUT)
  indexed=[x.quantize(palette=pal,dither=Image.Dither.NONE)for x in frames]
  indexed[0].save(ROOT/f'{kind}.gif',save_all=True,append_images=indexed[1:],duration=100,loop=0,optimize=False,disposal=2)
  with tempfile.TemporaryDirectory(prefix='research-render-')as tmp:
   for i,im in enumerate(frames):im.save(Path(tmp)/f'{i:03d}.png')
   subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-framerate',str(FPS),'-i',tmp+'/%03d.png','-c:v','libx264','-pix_fmt','yuv420p','-crf','20','-movflags','+faststart',str(ROOT/f'{kind}.mp4')],check=True)
  contacts.append(frames[8]);print(kind,'complete',flush=True)
 sheet=Image.new('RGB',(1440,900),BG)
 for i,im in enumerate(contacts):sheet.paste(im,((i%2)*720,(i//2)*450))
 sheet.save(ROOT/'contact-sheet.jpg',quality=92)

if __name__=='__main__':main()
