"""Concept CAD; millimetre STEP output from metre parameters. No mounting holes."""
from pathlib import Path
import json, math, csv
import cadquery as cq

ROOT = Path(__file__).resolve().parent
P = json.loads((ROOT/'mount_parameters.json').read_text())
C = {k:v*1000 for k,v in P['cradle'].items() if isinstance(v,(int,float))}
M = {k:v*1000 for k,v in P['mount'].items() if isinstance(v,(int,float))}
parts=[]
colors={'reference':(0.38,0.44,0.49,0.42),'metal':(0.68,0.72,0.74,1),'guide':(0.12,0.17,0.21,1),'pad':(.10,.12,.13,1),'shoe':(.98,.66,.1,1),'gate':(.86,.34,.14,1),'rov':(.9,.71,.14,.25)}

def add(name, shape, group, note='', color='metal'):
    parts.append({'name':name,'shape':shape,'group':group,'note':note,'color':colors[color]})

def box(x,y,z, center):
    return cq.Workplane('XY').box(x,y,z).translate(center).val()

def beam(p0,p1,width=20,depth=None):
    a,b=cq.Vector(*p0),cq.Vector(*p1); v=b-a; L=v.Length
    n=v.normalized(); seed=cq.Vector(0,0,1) if abs(n.z)<.9 else cq.Vector(1,0,0)
    xd=seed.cross(n).normalized()
    return cq.Workplane(cq.Plane(origin=a,normal=n,xDir=xd)).rect(width,depth or width).extrude(L).val()

def ring(od,id_,height,zbase):
    return cq.Workplane('XY').circle(od/2).circle(id_/2).extrude(height).translate((0,0,zbase)).val()

# Ring is a reference solid only. Adapter has no inferred holes or bolt pattern.
add('00_OEM_RING_REFERENCE',ring(M['ring_od'],M['ring_id'],M['ring_thickness'],C['adapter_top_height']),'reference','Photo-derived ring; not an OEM CAD or load rating','reference')
add('01_BLANK_ANNULAR_ADAPTER',ring(M['ring_od'],M['ring_id'],M['adapter_thickness'],C['adapter_top_height']-M['adapter_thickness']),'adapter','Interface holes omitted; verify ring and fastening before fabrication')
# Four radial members meet the adapter underside; section sizes are provisional.
for i,(sx,sy) in enumerate([(1,1),(1,-1),(-1,1),(-1,-1)],1):
    radius=60; den=math.hypot(C['hanger_x'],C['hanger_y'])
    a=(sx*radius*C['hanger_x']/den,sy*radius*C['hanger_y']/den,442)
    b=(sx*C['hanger_x'],sy*C['hanger_y'],C['roof_height'])
    add(f'02_SPIDER_{i}',beam(a,b,16),'spider','16 mm solid envelope; actual member section and joints require sizing')
    add(f'03_DROP_HANGER_{i}',beam((b[0],b[1],20),b,16),'hangers','Existing ME120 lifter drives the assembly; no separate mast')

L,W=C['length'],C['outer_width']; section=(W-C['inner_width'])/2
for sign,side in [(-1,'PORT'),(1,'STARBOARD')]:
    add(f'04_SIDE_RAIL_{side}',box(L,section,20,(0,sign*(W-section)/2,10)),'cradle','Open drain frame; clear width 520 mm')
for sign,end in [(-1,'STERN'),(1,'BOW')]:
    add(f'05_END_RAIL_{end}',box(20,W-2*section,20,(sign*(L-20)/2,0,10)),'cradle','No retained-water pan')
# Shoe lands on two bolsters. Pads support approved body areas, never a thruster.
for x in [-230,230]:
    tag='AFT' if x<0 else 'FORE'
    add(f'06_SUPPORT_BOLSTER_{tag}',box(30,C['inner_width'],25,(x,0,32.5)),'cradle','Support bolster 20 to 45 mm above datum')
    for y in [-105,105]:
        tag2='P' if y<0 else 'S'
        add(f'07_SHOE_FOOT_{tag}_{tag2}',box(45,45,25,(x,y,57.5)),'shoe','Removable shoe; load contacts require configured vehicle survey','shoe')
        add(f'08_BODY_PAD_{tag}_{tag2}',box(65,50,15,(x,y,77.5)),'pads','Body contact top at 85 mm; EPDM envelope only','pad')
for sign in [-1,1]:
    add(f'09_SHOE_LONGITUDINAL_{sign}',box(525,20,10,(0,sign*105,65)),'shoe','Cradle shoe rail','shoe')
# Rear posts tie the elevated funnel and hinge bearings to the bottom frame.
for sign in [-1,1]:
    add(f'09B_GATE_POST_{sign}',beam((-390,sign*270,20),(-390,sign*270,390),20),'cradle','Hinge reaction posts connect directly to frame')
    add(f'09C_HINGE_BRIDGE_{sign}',beam((-390,sign*270,390),(-410,sign*252,390),20),'cradle','Short hinge support bridge')
# Stern (-X) funnel, polymer guides on an open frame.
for sign,side in [(-1,'PORT'),(1,'STARBOARD')]:
    for z,level in [(45,'LOW'),(295,'UP')]:
        add(f'10_FUNNEL_{side}_{level}',beam((-L/2,sign*C['inner_width']/2,z),(-L/2-C['funnel_length'],sign*C['funnel_half_width'],z),18),'funnel','580 mm mouth; 220 mm extension','guide')
    add(f'11_FUNNEL_MOUTH_{side}',beam((-L/2-C['funnel_length'],sign*C['funnel_half_width'],45),(-L/2-C['funnel_length'],sign*C['funnel_half_width'],295),18),'funnel','Provisional polymer guide','guide')
# Top-hinged open gate: two leaves with central tether passage, lower closure rail.
# Gate rotates around Y at x=-410,z=390. Closed pose shown.
for sign in [-1,1]:
    add(f'12_GATE_SIDE_{sign}',beam((-410,sign*240,45),(-410,sign*240,390),16),'gate','Top hinge axis Y; opens upward','gate')
    add(f'13_GATE_TOP_{sign}',beam((-410,sign*35,390),(-410,sign*240,390),16),'gate','70 mm central open notch; tether must remain free','gate')
add('14_GATE_LOWER_RAIL',beam((-410,-240,45),(-410,240,45),16),'gate','Retains shoe; never clamp the tether','gate')
# Two bearing supports flank the slot; no continuous rod crosses the tether notch.
for sign in [-1,1]:
    add(f'15_GATE_HINGE_SUPPORT_{sign}',box(35,25,30,(-410,sign*252,390)),'cradle','Hinge representation only; bearing/pin hardware not specified')
    # Capture dogs engage the shoe, not the ROV plastic frame.
    add(f'16_CAPTURE_DOG_{sign}',box(55,28,18,(-230,sign*122,72)),'dogs','Independently sensed capture dogs; detail/actuation unresolved','gate')
add('17_ROV_ENVELOPE_REFERENCE',box(608,294,196,(0,0,C['rov_base_height']+98)),'rov','Bare envelope excludes floodlights, tools and tether; reference only','rov')

EXP={'reference':(0,0,260),'adapter':(0,0,185),'spider':(0,0,105),'hangers':(0,0,45),'cradle':(0,0,0),'shoe':(0,0,80),'pads':(0,0,110),'funnel':(-180,0,0),'gate':(-100,0,80),'dogs':(-100,0,80),'rov':(0,0,580)}
def assembly(exploded=False):
    a=cq.Assembly(name='ME120_Ring_Adapter_Exploded' if exploded else 'ME120_Ring_Adapter_Concept')
    for p in parts:
        loc=cq.Location(cq.Vector(*(EXP[p['group']] if exploded else (0,0,0))))
        a.add(p['shape'],name=p['name'],loc=loc,color=cq.Color(*p['color']))
    return a

files=[]
for name,exp in [('ME120_Ring_Adapter_Concept.step',False),('ME120_Ring_Adapter_Exploded.step',True)]:
    path=ROOT/name; assembly(exp).save(str(path)); files.append(path)
# Independent views for the direct mounting interface and the removable shoe.
for filename,groups in [('Mount_Interface_Blank.step',{'reference','adapter','spider'}),('ROV_Support_Shoe.step',{'shoe','pads'})]:
    a=cq.Assembly(name=filename.removesuffix('.step'))
    for p in parts:
        if p['group'] in groups: a.add(p['shape'],name=p['name'],color=cq.Color(*p['color']))
    path=ROOT/filename; a.save(str(path)); files.append(path)

with (ROOT/'BOM.csv').open('w',newline='') as f:
    w=csv.writer(f);w.writerow(['Part','Quantity','Group','Status / note'])
    for p in parts: w.writerow([p['name'],1,p['group'],p['note']])
checks={'revision':P['revision'],'units':'mm','parts':len(parts),'source_parameters':'mount_parameters.json','all_generated_solids_valid':all(p['shape'].isValid() for p in parts),'reopened_files':{},'envelope_mm':{'frame':[L,W],'clear_width':C['inner_width'],'adapter_top':C['adapter_top_height'],'ring_lower_face':C['adapter_top_height'],'rov_base':C['rov_base_height'],'funnel_mouth':C['funnel_half_width']*2},'fit_status':'Concept only; does not verify vehicle, structure, fasteners, original mounting dimensions or collisions.'}
for path in files:
    imported=cq.importers.importStep(str(path)); solids=imported.solids().vals()
    checks['reopened_files'][path.name]={'solids':len(solids),'valid':all(s.isValid() for s in solids),'bytes':path.stat().st_size}
assert checks['all_generated_solids_valid']
assert all(x['valid'] and x['solids']>0 for x in checks['reopened_files'].values())
(ROOT/'CAD_Validation.json').write_text(json.dumps(checks,indent=2)+'\n')
print(json.dumps(checks,indent=2))
