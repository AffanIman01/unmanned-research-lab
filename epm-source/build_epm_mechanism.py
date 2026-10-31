"""Concept D: EPM capture / positive locking pins; CadQuery, mm, Z up.
No OEM hole pattern. No magnet structural credit. Never fabrication CAD.
"""
from pathlib import Path
import json, csv, math
import cadquery as cq
ROOT=Path(__file__).resolve().parent
P=json.loads((ROOT/'parameters.json').read_text())
mm=lambda x:float(x)*1000
A=P['adapter']; H=P['head']; Y=P['rov_yoke']; G=P['guides']; T=P['tether']
parts=[]
colors={'ref':(.42,.49,.56,.35),'metal':(.69,.74,.78,1),'head':(.16,.23,.28,1),'epm':(.25,.35,.48,1),'yoke':(.95,.63,.13,1),'pad':(.07,.10,.12,1),'pin':(.77,.36,.16,1),'rov':(.94,.73,.14,.23),'tether':(.14,.2,.24,1)}
def box(x,y,z,p): return cq.Workplane('XY').box(x,y,z).translate(p).val()
def cyl(r,h,p,axis=(0,0,1)): return cq.Solid.makeCylinder(r,h,cq.Vector(*p),cq.Vector(*axis))
def ring(ro,ri,h,p,axis=(0,0,1)): return cyl(ro,h,p,axis).cut(cyl(ri,h,p,axis))
def beam(a,b,w=16,d=None):
 a,b=cq.Vector(*a),cq.Vector(*b); v=b-a; n=v.normalized(); seed=cq.Vector(0,0,1) if abs(n.z)<.9 else cq.Vector(1,0,0)
 return cq.Workplane(cq.Plane(origin=a,normal=n,xDir=seed.cross(n).normalized())).rect(w,d or w).extrude(v.Length).val()
def add(name,shape,group,note='',color='metal',side=0):
 parts.append(dict(name=name,shape=shape,group=group,note=note,color=colors[color],side=side))
# Visible original ring remains a no-hole reference; 4 mm reference thickness.
add('00_OEM_RING_REFERENCE_NO_HOLES',ring(mm(A['od'])/2,mm(A['id'])/2,4,(0,0,mm(A['top_z']))),'mount','Photo-derived reference only; interface fastening unmeasured','ref')
add('01_BLANK_ANNULAR_ADAPTER',ring(mm(A['od'])/2,mm(A['id'])/2,mm(A['thickness']),(0,0,mm(A['top_z']-A['thickness']))),'adapter','No mounting bolt pattern; verify all interface dimensions')
# Mechanical spine carries pin and guide loads to the annular adapter. Magnet is capture only.
add('02_UPPER_SPINE',box(250,42,20,(0,0,mm(H['upper_spine_z']))),'head','Section is illustrative; requires stress and moment sizing','head')
for sign in [-1,1]:
 add(f'03_ADAPTER_RIB_{sign}',beam((sign*60,0,450),(sign*100,0,430),16),'head','Mount connection and central bore engagement unresolved')
 add(f'04_TRANSVERSE_HEAD_ARM_{sign}',beam((0,0,430),(0,sign*145,430),18),'head','Connect pin-module hanger to structural spine','head')
 add(f'05_PIN_MODULE_DROP_{sign}',beam((0,sign*145,430),(0,sign*145,mm(H['pin_axis_z'])+24),18),'head','Braced hanger envelope, actual stiffness requires calculation','head')
 # Hanger arms above EPM attach to its flange but no magnetic force is structural credit.
 add(f'06_EPM_FLANGE_SUPPORT_{sign}',beam((sign*47,0,430),(sign*47,0,406),14),'head','Support EPM housing, not armature load','head')
add('07_SUBSEA_EPM_ENVELOPE',cyl(mm(H['epm_radius']),mm(H['epm_height']),(0,0,mm(H['epm_bottom_z']))),'epm','Pulse-switched module placeholder; subsea-qualified product not selected','epm')
add('08_EPM_TOP_FLANGE',cyl(69,6,(0,0,404)),'epm','Illustrative sealed housing flange','epm')
# Positive cross-pins pass through new steel keeper ears; never assume ROV frame ferromagnetic.
keeper_shapes=[]; pin_shapes=[]
for s in [-1,1]:
 py=s*mm(H['pin_housing_y']); pz=mm(H['pin_axis_z'])
 housing=box(46,50,48,(0,py,pz)).cut(cyl(7,54,(0,py-27,pz),(0,1,0)))
 add(f'09_SEALED_PIN_ACTUATOR_{s}',housing,'pin_housing','Spring-engaged / mechanically retained candidate; actuator and sensing not specified','head',s)
 closed_y=s*mm(H['closed_pin_center_y'])
 pin=cyl(mm(H['pin_diameter'])/2,mm(H['pin_length']),(0,closed_y-mm(H['pin_length'])/2,pz),(0,1,0))
 pin_shapes.append(pin)
 add(f'10_RETRACTABLE_LOCK_PIN_{s}',pin,'pins','12 mm illustrative pin; 74 mm retract travel; independently verify full engagement','pin',s)
 # Whole lug has clearance bore; hole is NEW mechanism only, not inferred original mount hole.
 ky=s*mm(Y['keeper_lug_y']); kz=mm(Y['keeper_lug_z'])
 lug=box(34,20,36,(0,ky,kz)).cut(cyl(mm(Y['pin_hole_diameter'])/2,24,(0,ky-12,kz),(0,1,0)))
 keeper_shapes.append(lug)
 add(f'11_NEW_KEEPER_LUG_{s}',lug,'yoke','14 mm hole along Y, for new mechanism only; bearing / tear-out unverified','yoke',s)
 add(f'12_ARMATURE_EAR_BRIDGE_{s}',box(34,64,12,(0,s*87,352)),'yoke','Bridge armature to load keeper; joint details not established','yoke',s)
# Yoke surrounds bare-body envelope. Four support pads and lower rails; no thruster contacts claimed.
px=mm(Y['post_x']); py=mm(Y['post_y']); zl=mm(Y['post_lower_z']); zt=mm(Y['post_top_z'])
for sx in [-1,1]:
 for sy in [-1,1]:
  add(f'13_YOKE_POST_{sx}_{sy}',beam((sx*px,sy*py,zl),(sx*px,sy*py,zt),16),'yoke','Removable new yoke; configured lamps and accessories require clearance survey','yoke')
for s in [-1,1]:
 add(f'14_YOKE_LOWER_LONG_RAIL_{s}',beam((-px,s*py,65),(px,s*py,65),16),'yoke','Open-frame sled; no water-retaining tray','yoke')
 add(f'15_YOKE_SUPPORT_CROSSMEMBER_{s}',beam((s*px,-py,65),(s*px,py,65),16),'yoke','Transfer load from pads to posts','yoke')
 add(f'16_YOKE_UPPER_LONG_RAIL_{s}',beam((-px,s*py,zt),(px,s*py,zt),16),'yoke','Cross-member layout provisional','yoke')
 for sy in [-1,1]:
  add(f'17_BODY_PAD_{s}_{sy}',box(65,48,12,(s*px,sy*105,mm(Y['pad_z'])-6)),'pads','EPDM concept pad; verify manufacturer-approved contact regions','pad')
# Upper load bridge connects post pairs to armature and guide receivers without relying on magnet.
for sx in [-1,1]:
 add(f'18_YOKE_TOP_CROSSMEMBER_{sx}',beam((sx*px,-py,zt),(sx*px,py,zt),16),'yoke','Illustrative top bridge; actual floodlight envelope omitted','yoke')
 add(f'19_YOKE_CROWN_ARM_{sx}',beam((sx*px,0,zt),(sx*45,0,340),50,18),'yoke','Carries yoke load to ferromagnetic armature and keeper ears','yoke')
add('20_FERROMAGNETIC_ARMATURE',cyl(mm(Y['armature_radius']),mm(Y['armature_thickness']),(0,0,mm(Y['armature_top_z']-Y['armature_thickness']))),'yoke','Ferromagnetic corrosion-protected target; grade and magnetic gap unresolved','yoke')
for s in [-1,1]:
 x=s*mm(G['pin_x']); za=mm(G['guide_lower_z']); zb=mm(G['guide_upper_z'])
 add(f'21_HEAD_ALIGNMENT_PIN_{s}',cyl(mm(G['guide_radius']),zb-za,(x,0,za)),'head','10 mm radius concept pin; guide engagement limits need sensor confirmation','metal')
 add(f'22_ALIGNMENT_PIN_MOUNT_{s}',box(30,30,12,(x,0,424)),'head','Alignment load enters spine','head')
 # receiver is a separate ring above crown; crown cut clears guidance pin everywhere it overlaps.
 receiver=ring(21,mm(G['receiver_inner_radius']),28,(x,0,mm(G['receiver_z'])-14))
 add(f'23_YOKE_GUIDE_RECEIVER_{s}',receiver,'yoke','26 mm bore for 20 mm guide; entry taper omitted','yoke')
 # Remove pin clearance from load arms beneath receiver (new mechanism machining only).
 for p in parts:
  if p['name'].startswith('19_YOKE_CROWN_ARM_'):
   p['shape']=p['shape'].cut(cyl(mm(G['receiver_inner_radius']),60,(x,0,295)))
# Reference body stays translucent and not part of structural CAD.
body=[mm(v) for v in Y['body_reference']]
add('24_M2_PRO_MAX_BODY_ENVELOPE_EXCLUDES_LIGHTS',box(*body,(0,0,mm(Y['rov_base_z'])+body[2]/2)),'rov','608 x 294 x 196 published body envelope; lights/tether/tools omitted','rov')
# Captive stern fairlead is a separate vehicle-fixed subassembly, not hung from the EPM.
x,y,z=[mm(v) for v in T['exit_center']]; rr=mm(T['illustrative_sheave_radius'])
add('25_STERN_FAIRLEAD_GROOVED_SHEAVE',cyl(rr-5,12,(x,y-6,z),(0,1,0)).fuse(cyl(rr,3,(x,y-9,z),(0,1,0))).fuse(cyl(rr,3,(x,y+6,z),(0,1,0))),'tether','80 mm outside radius illustrative only; tether bend radius requires CHASING confirmation','tether')
add('26_FAIRLEAD_AXLE',cyl(8,50,(x,y-25,z),(0,1,0)),'tether','Bearing and axle sizing not selected','metal')
for s in [-1,1]:
 cheek=ring(rr+12,rr-28,4,(x,y+s*16-2,z),(0,1,0))
 # radial spoke transfers shaft to cheek, not a solid disk hiding cable.
 cheek=cheek.fuse(box(20,4,rr*2,(x,y+s*16,z)))
 cheek=cheek.cut(cyl(8.5,8,(x,y+s*16-4,z),(0,1,0)))
 add(f'27_CAPTIVE_FAIRLEAD_CHEEK_{s}',cheek,'tether','Captive cheeks and three keeper rollers; inspect tether gap against OEM diameter','tether')
for i,a in enumerate([25,145,265],1):
 rad=math.radians(a); xr=x+(rr+7)*math.cos(rad); zr=z+(rr+7)*math.sin(rad)
 add(f'28_FAIRLEAD_KEEPER_{i}',cyl(5,28,(xr,-14,zr),(0,1,0)),'tether','Illustrative captive keeper; no pinch clearance established','metal')
add('29_STERN_FIXED_BRACKET',beam((x,0,z+rr+12),(-1360,0,465),22),'tether','Attaches to verified vessel structure; exact position/propeller clearance unverified','metal')
add('29B_LOAD_CELL_CONNECTOR',box(30,30,22,(-1350,0,465)),'tether','Provisional bolted connection envelope, no bolt sizing or holes','metal')
add('30_LOAD_CELL_ENVELOPE',box(95,45,28,(-1300,0,465)),'tether','Measure tether tension with independent sensor; calibration and working limits unconfirmed','epm')
add('31_LOAD_CELL_FAIRLEAD_ROLLER',cyl(23,40,(-1280,-20,507),(0,1,0)),'tether','Sensor mounting and wrap angle illustrative; not a calibrated tension measurement design','tether')
for s in [-1,1]:
 add(f'32_SENSOR_ROLLER_BEARING_FORK_{s}',box(28,8,43,(-1280,s*25,495.5)),'tether','Bearing support envelope; sensor force path needs calibration','metal')
add('33_SENSOR_ROLLER_AXLE',cyl(6,58,(-1280,-29,507),(0,1,0)),'tether','Roller axle envelope','metal')
EXP={'mount':(0,0,200),'adapter':(0,0,130),'head':(0,0,70),'epm':(0,0,100),'pin_housing':(0,0,70),'pins':(0,0,70),'yoke':(0,0,-150),'pads':(0,0,-225),'rov':(650,0,0),'tether':(-220,0,100)}
def pose(p,mode):
 if mode=='exploded':
  base=EXP[p['group']]
  if p['group'] in {'pins','pin_housing'}:return (base[0],p['side']*(170 if p['group']=='pins' else 90),base[2])
  return base
 if mode=='released':
  if p['group']=='pins':return (0,p['side']*mm(H['open_pin_center_y']-H['closed_pin_center_y']),0)
  if p['group'] in {'yoke','pads','rov'}:return (0,0,-180)
 return (0,0,0)
def export(name,mode='assembled',groups=None):
 a=cq.Assembly(name=Path(name).stem)
 for p in parts:
  if groups is None or p['group'] in groups:a.add(p['shape'],name=p['name'],loc=cq.Location(cq.Vector(*pose(p,mode))),color=cq.Color(*p['color']))
 path=ROOT/name;a.save(str(path));return path
files=[export('ME120_EPM_Lock_Concept.step'),export('ME120_EPM_Lock_Exploded.step','exploded'),export('ME120_EPM_Lock_Released.step','released'),export('ROV_Removable_Yoke.step',groups={'yoke','pads'}),export('Mount_EPM_Pin_Head.step',groups={'mount','adapter','head','epm','pin_housing','pins'}),export('Stern_Tether_Fairlead.step',groups={'tether'})]
with (ROOT/'BOM.csv').open('w',newline='') as f:
 w=csv.writer(f);w.writerow(['Part','Qty','Group','Status / note'])
 for p in parts:w.writerow([p['name'],1,p['group'],p['note']])
checks={'revision':P['revision'],'units':'mm','coordinate_system':'X bow, Y transverse, Z up; local mechanism origin at ROV reference centre below ring','parts':len(parts),'all_solids_valid':all(p['shape'].isValid() for p in parts),'reopened':{},'nominal_mm':{'adapter_top':458,'epm_contact_plane':358,'rov_base':85,'pin_diameter':12,'new_lug_bore':14,'pin_stroke':74,'guide_diameter':20,'guide_receiver_bore':26,'fairlead_centre':[-1480,0,340]},'closed_pin_lug_material_intersection_mm3':[pin_shapes[i].intersect(keeper_shapes[i]).Volume() for i in range(2)],'released_pin_to_lug_axial_clearance_mm':21.5,'closed_pin_centre_bore_clearance_mm':23.5,'status':'Geometric construction checks only. OEM mount holes omitted. No full vehicle or accessory collision / stress / magnetic performance validation.'}
for path in files:
 solids=cq.importers.importStep(str(path)).solids().vals();checks['reopened'][path.name]={'solids':len(solids),'valid':bool(solids) and all(s.isValid() for s in solids),'bytes':path.stat().st_size}
assert checks['all_solids_valid']
assert all(v['valid'] for v in checks['reopened'].values())
assert max(checks['closed_pin_lug_material_intersection_mm3'])<1e-5
(ROOT/'CAD_Validation.json').write_text(json.dumps(checks,indent=2)+'\n')
print(json.dumps(checks,indent=2))
