"""Four original 2-D research illustrations. Pillow only; no real media."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import math

OUT = Path(__file__).resolve().parent
W,H,S = 600,360,2
BG=(44,32,55); PANEL=(51,38,64); LINE=(133,109,157)
LIGHT=(192,164,214); DIM=(84,65,103); FAINT=(57,43,69)
GOLD=(255,184,28); CYAN=(119,202,214); WHITE=(226,215,238)
FONT='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'

def ease(t):
    t=max(0,min(1,t)); return t*t*(3-2*t)
def lerp(a,b,t): return a+(b-a)*t
def curve(ps,t):
    q=1-t
    return (q*q*q*ps[0][0]+3*q*q*t*ps[1][0]+3*q*t*t*ps[2][0]+t*t*t*ps[3][0],q*q*q*ps[0][1]+3*q*q*t*ps[1][1]+3*q*t*t*ps[2][1]+t*t*t*ps[3][1])

class Canvas:
    def __init__(self):
        self.im=Image.new('RGB',(W*S,H*S),BG); self.d=ImageDraw.Draw(self.im)
        for x in range(36,580,36):
            for y in range(36,340,36): self.dot((x,y),.65,FAINT)
        for x,y,sx,sy in ((27,27,1,1),(573,27,-1,1),(27,333,1,-1),(573,333,-1,-1)):
            self.line([(x+sx*16,y),(x,y),(x,y+sy*16)],DIM,.7)
    def p(self,p):return tuple(round(x*S) for x in p)
    def line(self,ps,c=LINE,w=1):self.d.line([self.p(p) for p in ps],fill=c,width=max(1,round(w*S)),joint='curve')
    def poly(self,ps,c=PANEL,outline=LINE,w=1):
        self.d.polygon([self.p(p) for p in ps],fill=c)
        if outline:self.line(ps+[ps[0]],outline,w)
    def rect(self,b,c=PANEL,r=0,outline=LINE,w=1):self.d.rounded_rectangle(self.p(b),round(r*S),fill=c,outline=outline,width=round(w*S))
    def ell(self,b,c=None,outline=LINE,w=1):self.d.ellipse(self.p(b),fill=c,outline=outline,width=round(w*S))
    def dot(self,p,r=3,c=GOLD):self.ell((p[0]-r,p[1]-r,p[0]+r,p[1]+r),c,c)
    def bez(self,ps,c=LINE,w=1,start=0,end=1):self.line([curve(ps,start+(end-start)*i/100) for i in range(101)],c,w)
    def text(self,p,s,c=LIGHT,size=10):self.d.text(self.p(p),s,font=ImageFont.truetype(FONT,round(size*S)),fill=c)
    def arrow(self,p,a,c=LIGHT,sz=7):
        self.line([(p[0]-sz*math.cos(a-.55),p[1]-sz*math.sin(a-.55)),p,(p[0]-sz*math.cos(a+.55),p[1]-sz*math.sin(a+.55))],c,1.5)
    def finish(self):return self.im.resize((W,H),Image.Resampling.LANCZOS)

def rov(c,x,y,s=1,thruster=0):
    def ps(points):return [(x+u*s,y+v*s) for u,v in points]
    c.poly(ps([(-43,-14),(-33,-24),(29,-24),(45,-12),(37,-5),(-37,-5)]),(107,80,88),GOLD,1.4)
    c.rect((x-42*s,y-9*s,x+42*s,y+20*s),(28,25,38),5*s,LINE,1.2)
    for dx in (-27,27):
        c.ell((x+(dx-12)*s,y-4*s,x+(dx+12)*s,y+20*s),(36,31,47),LIGHT,1.3)
        for k in range(3):
            a=thruster+k*math.pi*2/3
            c.line(ps([(dx,8),(dx+8*math.cos(a),8+8*math.sin(a))]),LINE,1.8)
        c.dot((x+dx*s,y+8*s),2*s,LIGHT)
    for dx in (-24,24):
        c.line(ps([(dx,-22),(dx,-32)]),LINE,2)
        c.dot((x+dx*s,y-32*s),3*s,WHITE)
    c.line(ps([(-48,24),(48,24)]),LIGHT,1.8)
    for dx in (-45,45): c.line(ps([(dx,-11),(dx,24)]),LIGHT,1.8)
    c.dot((x+46*s,y+1*s),3*s,CYAN)

def boat(c,x,y,s=1):
    def ps(points):return [(x+u*s,y+v*s) for u,v in points]
    c.poly(ps([(-65,-12),(-54,-25),(47,-25),(71,-9),(61,6),(-56,6)]),(47,39,59),LINE,1.4)
    c.poly(ps([(-71,10),(-62,-5),(49,-5),(80,12),(64,25),(-56,25)]),(37,30,47),LIGHT,1.4)
    c.line(ps([(-54,13),(53,13),(68,16)]),GOLD,2)
    c.line(ps([(-15,-26),(-15,-62)]),LINE,3)
    c.line(ps([(-45,-53),(34,-53)]),LINE,2)
    for dx in (-42,-20,15,33):c.line(ps([(dx,-53),(dx,-84)]),LIGHT,1.5)
    c.rect((x-23*s,y-71*s,x-6*s,y-59*s),(39,36,47),2*s,LINE)
    c.ell((x-24*s,y-53*s,x-8*s,y-39*s),(39,36,47),LINE)
    c.line(ps([(24,-25),(24,-39)]),LINE,2)
    c.poly(ps([(15,-46),(43,-43),(35,-35),(7,-38)]),(126,115,143),LIGHT)

def teleoperation(t):
    c=Canvas()
    # Water and three simple apparatus silhouettes.
    c.line([(258,190),(550,190)],DIM,.7)
    c.line([(282,195),(527,195)],FAINT,.7)
    boat(c,355,164,.84)
    c.rect((55,115,172,192),(31,29,44),7,LIGHT,1.5)
    c.rect((63,123,164,182),(39,40,57),3,DIM)
    c.poly([(53,194),(175,194),(189,208),(39,208)],(65,52,80),LIGHT,1.3)
    c.line([(90,201),(136,201)],LINE,1)
    # Pilot display is only an abstract route, not fake live telemetry.
    c.line([(77,163),(96,149),(119,156),(148,136)],CYAN,1.5)
    c.dot((119,156),3,GOLD)
    for i in range(3): c.line([(77,172-i*3),(91+i*4,172-i*3)],DIM,1)
    c.line([(178,153),(193,139),(206,151)],LINE,1.5)
    c.line([(193,139),(193,123)],LINE,1.5)
    radio=[(199,129),(242,87),(276,96),(318,123)]
    back=[(319,136),(277,114),(243,113),(198,145)]
    c.bez(radio,DIM,1); c.bez(back,DIM,1)
    for off in (0,.5):
        u=(t+off)%1
        c.dot(curve(radio,u),3,GOLD)
        c.dot(curve(back,1-u),2.8,CYAN)
    c.arrow(curve(radio,.91),.58,GOLD,6)
    c.arrow(curve(back,.9),2.62,CYAN,6)
    rx,ry=458,266
    tether=[(321,161),(296,292),(388,309),(rx-40,ry-6)]
    c.bez(tether,DIM,3)
    c.bez(tether,LINE,1)
    c.dot(curve(tether,(t*1.25)%1),3,GOLD)
    c.dot(curve(tether,1-(t*1.25+.5)%1),3,CYAN)
    rov(c,rx,ry,.8,t*math.pi*8)
    c.text((84,224),'GROUND',DIM,9);c.text((343,207),'USV',DIM,9);c.text((447,305),'ROV',DIM,9)
    c.dot((204,322),2.5,GOLD);c.text((213,316),'COMMAND',LIGHT,8)
    c.dot((326,322),2.5,CYAN);c.text((335,316),'TELEMETRY',LIGHT,8)
    return c.finish()

def perception(t):
    c=Canvas()
    # Two passive views intersect at shared scene features.
    c.rect((55,119,163,155),(25,28,40),7,LIGHT,1.5)
    for x in (76,142):
        c.ell((x-11,126,x+11,148),(43,48,63),LINE,1.5)
        c.ell((x-6,131,x+6,143),(48,74,89),CYAN,1)
    c.text((65,169),'STEREO',DIM,9)
    c.line([(109,155),(109,194),(140,206)],DIM,1)
    c.rect((250,152,331,242),(60,47,74),5,LINE,1.4)
    c.poly([(250,152),(273,137),(351,137),(331,152)],(77,59,88),LINE)
    c.poly([(331,152),(351,137),(351,227),(331,242)],(44,40,61),LINE)
    for x in range(261,327,17):
        for y in range(165,235,17):
            if ((x-261)//17+(y-165)//17)%2:c.rect((x,y,x+8,y+8),(128,98,139),1,None)
    target=(287+15*math.sin(t*math.pi*2),191)
    c.line([(76,137),target],(90,86,119),1)
    c.line([(142,137),target],(95,105,134),1)
    c.ell((target[0]-7,target[1]-7,target[0]+7,target[1]+7),None,GOLD,1.5)
    c.dot(target,2,GOLD)
    # LiDAR stationary housing, visible ray scan and synthetic returns.
    lx,ly=463,144
    c.rect((lx-23,ly-35,lx+23,ly+9),(24,30,42),5,LINE,1.5)
    c.ell((lx-23,ly-40,lx+23,ly-28),(131,121,151),LIGHT,1.2)
    c.ell((lx-23,ly+1,lx+23,ly+15),(70,67,90),LINE,1.2)
    for y in (ly-2,ly+3,ly+8):c.line([(lx-18,y),(lx+18,y)],LINE,.7)
    c.text((445,175),'LiDAR',DIM,9)
    p0=(lx,ly-7);hit=(350,152+74*(.5+.5*math.sin(t*math.pi*2)))
    c.line([p0,hit],(97,115,126),1.2)
    u=(t*5)%1
    c.dot((lerp(p0[0],hit[0],u),lerp(p0[1],hit[1],u)),3,GOLD)
    c.dot((lerp(hit[0],p0[0],u),lerp(hit[1],p0[1],u)),2.3,CYAN)
    c.dot(hit,3,GOLD)
    # Point cloud below the instrument, revealing features one sweep at a time.
    c.line([(381,279),(424,295),(520,266)],DIM,.7)
    for i in range(66):
        col=i%11;row=i//11
        x=387+col*10+row*3;y=239+row*8-col*1.8
        lit=((i/66-t)%1)<.67
        c.dot((x,y),1.9,CYAN if lit else DIM)
    c.line([(147,222),(209,252),(252,252)],DIM,1)
    for dx in (0,22,44):
        c.rect((111+dx,211,126+dx,233),(39,37,53),2,LINE,.7)
        c.line([(115+dx,225),(122+dx,219)],CYAN,1)
    c.text((207,311),'TWO VIEWS  /  3D RETURNS',LIGHT,9)
    return c.finish()

def recovery(t):
    c=Canvas()
    # Sequence repeats with a release/reset; no tether pulling.
    if t<.32:
        q=ease(t/.32);rx=lerp(422,300,q);ry=lerp(238,217,q);lock=0;mag=False;label='ALIGN'
    elif t<.48:
        q=ease((t-.32)/.16);rx=300;ry=lerp(217,204,q);lock=0;mag=True;label='MAGNET ON'
    elif t<.62:
        rx=300;ry=204;lock=ease((t-.48)/.14);mag=True;label='LOCK'
    elif t<.83:
        rx=300;ry=204;lock=1;mag=False;label='LOCKED · MAGNET OFF'
    else:
        q=ease((t-.83)/.17);rx=lerp(300,422,q);ry=lerp(204,238,q);lock=0;mag=False;label='RELEASE'
    c.line([(175,69),(425,69)],LINE,2)
    c.line([(286,69),(286,155)],DIM,4)
    c.line([(314,69),(314,155)],LINE,4)
    c.line([(300,69),(300,153)],LIGHT,5)
    c.rect((257,148,343,163),(71,65,88),4,LIGHT,1.5)
    c.ell((267,143,333,157),(102,94,116),LIGHT,1.2)
    c.ell((279,149,321,160),GOLD if mag else (67,65,84),GOLD if mag else LINE,1)
    # A slack, separately anchored communications lead.
    c.bez([(130,82),(91,294),(rx-130,315),(rx-41,ry-2)],DIM,1.6)
    # Alignment corridor and passive floor guide.
    c.line([(265,172),(265,260)],FAINT,.7);c.line([(335,172),(335,260)],FAINT,.7)
    if mag:
        for i in range(3):
            r=10+i*7+4*((t*8)%1)
            c.ell((300-r,166-r*.18,300+r,166+r*.3),None,(139+i*26,106+i*17,58),.8)
    rov(c,rx,ry,1,t*math.pi*6 if t<.48 or t>.83 else 0)
    span=lerp(65,46,lock)
    c.line([(300-span,157),(300-span,217),(300-span+15,217)],GOLD if lock>.98 else LIGHT,3)
    c.line([(300+span,157),(300+span,217),(300+span-15,217)],GOLD if lock>.98 else LIGHT,3)
    c.dot((257,155),3,GOLD if lock>.98 else DIM);c.dot((343,155),3,GOLD if lock>.98 else DIM)
    # State badges deliberately show that the magnet is no longer powered.
    c.rect((450,93,481,118),(42,35,55),5,GOLD if mag else DIM)
    c.poly([(468,97),(459,107),(466,107),(462,115),(474,104),(467,104)],GOLD if mag else DIM,None)
    c.rect((450,136,481,161),(42,35,55),5,GOLD if lock>.98 else DIM)
    c.rect((458,147,473,156),GOLD if lock>.98 else DIM,2,None)
    c.ell((461,139,470,151),None,GOLD if lock>.98 else DIM,1.8)
    c.text((165 if lock>.98 and not mag else 262,307),label,LIGHT,10)
    return c.finish()

def validation(t):
    c=Canvas()
    # Soft cross-current arrows and a transparent reference trajectory.
    for row in range(3):
        for col in range(5):
            x=70+col*106+27*((t+row*.2)%1);y=103+row*74
            c.line([(x+15,y),(x-16,y)],DIM,.8);c.arrow((x-16,y),math.pi,DIM,4)
    route=[(107,260),(249,239),(239,89),(468,111)]
    c.bez(route,LINE,1.5)
    for u in (.22,.45,.68):
        p=curve(route,u);c.ell((p[0]-8,p[1]-8,p[0]+8,p[1]+8),BG,LINE,1)
    c.ell((434,77,502,145),None,DIM,1)
    c.ell((449,92,487,130),None,LIGHT,1)
    c.line([(427,111),(441,111)],LINE,1);c.line([(495,111),(509,111)],LINE,1)
    c.line([(468,70),(468,84)],LINE,1);c.line([(468,137),(468,151)],LINE,1)
    u=min(1,t/.83)
    ref=curve(route,u)
    drift=17*math.sin(u*math.pi*5)*(1-u)
    rx,ry=ref[0]+drift,ref[1]+12*math.sin(u*math.pi*3)*(1-u)
    trail=[]
    for i in range(50):
        a=u*i/49;p=curve(route,a)
        trail.append((p[0]+17*math.sin(a*math.pi*5)*(1-a),p[1]+12*math.sin(a*math.pi*3)*(1-a)))
    c.line(trail,GOLD,2)
    rov(c,rx,ry,.52,t*math.pi*10)
    # Distance gate changes only when the synthetic vehicle reaches its target.
    passed=math.hypot(rx-468,ry-111)<19
    c.rect((407,241,526,286),(38,32,48),10,GOLD if passed else DIM,1)
    c.ell((422,251,446,275),None,GOLD if passed else LINE,1.5)
    if passed:
        c.line([(427,263),(432,268),(441,257)],GOLD,2)
    else:
        c.line([(428,257),(440,269)],LINE,1.5);c.line([(440,257),(428,269)],LINE,1.5)
    c.text((455,256),'IN GATE' if passed else 'OUTSIDE',LIGHT,9)
    c.text((79,310),'DISTURBANCE  →  CORRECTION  →  TARGET',LIGHT,9)
    return c.finish()

if __name__=='__main__':
    names={'teleoperation':teleoperation,'perception':perception,'recovery':recovery,'validation':validation}
    posters=[]
    for name,fn in names.items():
        frames=[fn(i/50) for i in range(50)]
        # Static posters show the purpose of each animation immediately.
        poster=fn({'teleoperation':.18,'perception':.17,'recovery':.70,'validation':.58}[name])
        poster.save(OUT/f'{name}-poster.png',optimize=True);posters.append(poster)
        sheet=Image.new('RGB',(W,H*4))
        for j,i in enumerate((0,13,27,39)):sheet.paste(frames[i],(0,j*H))
        pal=sheet.quantize(colors=112,method=Image.Quantize.MEDIANCUT)
        indexed=[fr.quantize(palette=pal,dither=Image.Dither.NONE) for fr in frames]
        indexed[0].save(OUT/f'{name}.gif',save_all=True,append_images=indexed[1:],duration=100,loop=0,optimize=True,disposal=1)
        print(name,(OUT/f'{name}.gif').stat().st_size,'bytes')
    contact=Image.new('RGB',(W*2,H*2),BG)
    for i,poster in enumerate(posters):contact.paste(poster,((i%2)*W,(i//2)*H))
    contact.save(OUT/'contact-sheet.jpg',quality=94)
