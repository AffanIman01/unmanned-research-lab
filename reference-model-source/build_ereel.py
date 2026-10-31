"""Photo-derived CHASING E-Reel; provisional scale pending verified dimensions."""
from pathlib import Path
import math,json
import numpy as np
import build_models as b

def make_ereel():
 m=b.Model('CHASING E-Reel · photo reference · provisional scale')
 # Rounded end panels in YZ planes; drum axle along X.
 def panel(x,thickness,mat,inset=0):
  r=b.rounded_loop(.125-inset,inset,.4-inset,.025,0,10)
  rings=[np.array([[xx,p[2],p[0]] for p in r]) for xx in [x-thickness/2,x+thickness/2]]
  b.loft(m,'reel_housing',mat,rings)
 for sign in [-1,1]:
  panel(sign*.187,.02,'rubber')
  panel(sign*.198,.004,'yellow_top',.008)
 # Housing frames a real open drum window and a cut-through upper carrying grip.
 b.box(m,'reel_housing','rubber',(0,.018,0),(.38,.036,.25),.010)
 for x in [-.159,.159]:
  b.box(m,'reel_housing','rubber',(x,.28,0),(.058,.22,.25),.018)
 for z in [-.108,.108]:
  b.box(m,'reel_housing','rubber',(0,.295,z),(.30,.050,.034),.014)
  b.box(m,'reel_handle','rubber',(0,.383,z),(.29,.034,.033),.014)
 for x in [-.14,.14]:
  b.box(m,'reel_handle','rubber',(x,.351,0),(.035,.098,.25),.014)
 for x in [-.17,.17]:
  for z in [-.09,.09]:b.box(m,'reel_feet','rubber',(x,.006,z),(.037,.012,.04),.006)
 b.cyl(m,'reel_drum','carbon',(-.136,.166,0),(.136,.166,0),.119,64)
 for x in [-.14,.14]:b.cyl(m,'reel_drum','carbon',(x-.004,.166,0),(x+.004,.166,0),.147,64)
 # Closely spaced orange windings with pale companion line and red markers.
 for i,x in enumerate(np.linspace(-.13,.13,44)):
  b.tube(m,'reel_tether','orange',(x-.0024,.166,0),(x+.0024,.166,0),.140,.136,48)
  if i%4==0:b.tube(m,'reel_tether','white',(x-.0012,.166,0),(x+.0012,.166,0),.143,.140,48)
  if i%7==0:
   a=.5+i*.37;b.cyl(m,'reel_tether','red',(x,.166+.140*math.sin(a),.140*math.cos(a)),(x,.166+.140*math.sin(a+.15),.140*math.cos(a+.15)),.004,10)
 # Black crank hub and offset handgrip on one yellow face.
 b.cyl(m,'reel_crank','rubber',(-.205,.30,0),(-.218,.30,0),.057,40)
 b.cyl(m,'reel_crank','carbon',(-.218,.30,0),(-.239,.30,0),.020,28)
 b.line(m,'reel_crank','rubber',[[-.239,.30,0],[-.239,.24,.048],[-.239,.205,.06]],.011,16)
 b.cyl(m,'reel_crank','rubber',(-.239,.205,.06),(-.29,.205,.06),.013,24)
 # Circular control inset with two silver buttons and central connector.
 b.cyl(m,'reel_controls','carbon',(.205,.137,0),(.209,.137,0),.075,48)
 for z in [-.043,.043]:b.cyl(m,'reel_controls','silver',(.209,.137,z),(.215,.137,z),.009,24)
 b.cyl(m,'reel_controls','rubber',(.209,.137,0),(.219,.137,0),.008,20)
 for z in [-.013,0,.013]:b.box(m,'reel_controls','green',(.211,.105,z),(.002,.004,.005),.0005)
 return m

if __name__=='__main__':
 b.OUT=Path(__file__).resolve().parents[1]/'public/models'
 m=make_ereel();report=m.export('chasing-e-reel-reference.glb')
 (b.OUT/'chasing-e-reel-manifest.json').write_text(json.dumps({'basis':'Affan photographs, September 20 2026','dimensionsStatus':'Unverified; casing envelope is provisional, NOT a manufacturer specification','provisionalCasingMetres':{'width':.4,'depth':.25,'height':.4},'model':report,'mount':'Central aft hatch, photo-derived placement; not fit checked','integrationDisplayScale':.8},indent=2))
 b.render(m,'chasing-e-reel-preview.png',width=1100,height=1000,camera=[-1,.7,1.2],target=[0,.2,0],title='CHASING E-Reel | Photo-derived · provisional scale')
