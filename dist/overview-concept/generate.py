"""Reproducible, intentionally schematic research concept animation (Pillow)."""
from pathlib import Path
import math
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parent
W, H, S = 1000, 560, 2
BG = (32, 24, 43)
GOLD = (255, 184, 28)
CYAN = (92, 210, 224)
INK = (17, 19, 30)
F = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
FB = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'

def smooth(a): return max(0, min(1, a)) ** 2 * (3 - 2 * max(0, min(1, a)))
def mix(a,b,t): return a+(b-a)*t
def point(p): return tuple(int(round(v*S)) for v in p)

def draw_frame(t):
    im = Image.new('RGB', (W*S,H*S), BG)
    d = ImageDraw.Draw(im)
    def line(ps, fill, width=1): d.line([point(p) for p in ps], fill=fill, width=max(1,round(width*S)), joint='curve')
    def poly(ps, fill, outline=None): d.polygon([point(p) for p in ps], fill=fill); line(ps+[ps[0]],outline,1) if outline else None
    def ell(b,fill,outline=None,width=1): d.ellipse(point(b),fill=fill,outline=outline,width=round(width*S))
    def rect(b,fill,r=0,outline=None,width=1): d.rounded_rectangle(point(b),round(r*S),fill=fill,outline=outline,width=round(width*S))
    def txt(p,s,fill,size=12,bold=False): d.text(point(p),s,font=ImageFont.truetype(FB if bold else F,round(size*S)),fill=fill)
    def bez(ps,fill,width=1):
        p=[]
        for i in range(61):
            u=i/60; v=1-u
            p.append((v**3*ps[0][0]+3*v*v*u*ps[1][0]+3*v*u*u*ps[2][0]+u**3*ps[3][0],v**3*ps[0][1]+3*v*v*u*ps[1][1]+3*v*u*u*ps[2][1]+u**3*ps[3][1]))
        line(p,fill,width)
    # Quiet underwater field, contour guides and a continuous surface.
    for y in range(271,510):
        a=(y-271)/240
        line([(28,y),(972,y)],(round(27+3*a),round(30-4*a),round(45-3*a)),1)
    for y in (317,377,437,497):
        line([(38,y),(962,y)],(38,41,57),.55)
    for x in (118,238,358,478,598,718,838,958):
        line([(x,291),(x,498)],(37,38,54),.45)
    for i in range(3):
        wave=[(x,273+i*6+1.9*math.sin(x*.018+2*math.pi*t+i*.5)) for x in range(27,974,5)]
        line(wave,[(70,107,125),(46,65,82),(37,46,64)][i],1)
    line([(961,306),(961,491)],(65,68,85),1)
    for y in range(307,492,23): line([(955,y),(961,y)],(80,79,100),1)
    txt((887,253),'SURFACE',(136,144,164),9)
    txt((886,480),'SUBSEA',(88,107,132),9)

    # Nominal cycle. The ROV swims independently; tether remains visibly slack.
    lower = smooth((t-.07)/.18) if t < .83 else 1-smooth((t-.83)/.14)
    py = mix(214,355,lower)
    rx, ry = 498, py+33
    if .31 <= t < .53:
        s=smooth((t-.31)/.22); rx=mix(498,790,s); ry=mix(388,419,s)+10*math.sin(s*math.pi)
    elif .53 <= t < .76:
        s=smooth((t-.53)/.23); rx=mix(790,498,s); ry=mix(419,388,s)-13*math.sin(s*math.pi)
    locked = t < .275 or t >= .8
    magnet = .765 <= t < .815
    swimming = .31 < t < .76
    phases = [(0,'READY'),(.07,'LOWER'),(.275,'RELEASE'),(.31,'INSPECT'),(.53,'RETURN'),(.765,'CAPTURE'),(.83,'STOW')]
    active=max(i for i,(start,_) in enumerate(phases) if start <= t)

    # Far pontoon and upper deck are deliberately schematic, not OEM geometry.
    poly([(316,194),(592,194),(652,212),(634,233),(322,228),(305,211)],(44,44,59),(88,79,97))
    poly([(316,194),(333,184),(601,184),(652,212),(592,204),(323,204)],(70,67,80),(116,100,119))
    line([(330,210),(601,215),(636,217)],(195,143,32),3)
    # Raised cross deck and starboard trim.
    poly([(354,202),(577,208),(587,227),(357,220)],(54,53,65),(93,85,103))
    # Mast and sensor rack.
    line([(495,192),(495,107)],(158,162,175),5)
    line([(497,194),(497,108)],(79,85,107),2)
    line([(408,147),(590,149)],(131,132,150),3)
    line([(426,146),(495,125),(575,149)],(78,80,98),2)
    for x,y in ((417,72),(463,58),(542,64),(582,79)):
        line([(x,147),(x,y)],(149,154,169),3)
        line([(x,147),(x,132)],(48,47,61),4)
        ell((x-4,145,x+4,149),(126,128,144))
    rect((480,125,517,136),(16,19,28),3,(121,127,146))
    for x in (488,509): ell((x-3,128,x+3,134),(41,78,93),(125,164,177))
    rect((487,100,509,123),(20,25,36),3,(115,126,142))
    ell((487,99,509,104),(144,147,160))
    ell((487,120,509,125),(88,93,110))
    ell((488,153,509,173),(120,126,143))
    ell((490,159,507,174),(23,35,50),(116,130,148))
    # Satellite terminal and fixed deck reel.
    line([(560,199),(560,180)],(88,93,116),3)
    poly([(548,171),(578,173),(569,184),(539,181)],(176,178,190),(213,211,221))
    ell((373,184,405,214),(114,118,137),(157,153,174))
    ell((379,188,399,209),(38,43,59),(142,131,154))
    ell((386,196,392,202),GOLD)
    # Lifter line and magnetic pickup; thin guides contain no swinging A-frame.
    line([(495,190),(495,py)],(135,142,158),5)
    line([(497,190),(497,py)],(225,220,228),1)
    line([(472,207),(472,py-4)],(85,97,118),2)
    line([(524,209),(524,py-4)],(85,97,118),2)
    ell((463,py-7,533,py+7),(67,72,91),(136,146,165))
    rect((465,py-1,531,py+6),(55,62,80),2)
    ell((463,py-7,533,py+4),(110,117,134),(186,182,196))
    ell((482,py-4,514,py+3),GOLD if magnet else (87,91,107))
    # Passive guidance from marker lights (illustrative, no range claim).
    if .55 < t < .765:
        line([(527,py+15),(rx-69,ry-4)],(58,93,109),.8)
        ell((524,py+12,530,py+18),CYAN)

    # Slack communications tether, distinct from the lift mast.
    sag=55+25*math.sin(math.pi*max(0,(rx-498)/292))
    bez([(389,207),(342,ry+sag),(rx-122,ry+sag),(rx-70,ry-5)],(47,49,66),5)
    bez([(389,207),(342,ry+sag),(rx-122,ry+sag),(rx-70,ry-5)],(164,129,71),1.8)
    # ROV with protective cage, yellow buoyancy fairing and visible thrusters.
    # Soft shadow is an illustration cue, not a measured footprint.
    ell((rx-70,ry+31,rx+83,ry+39),(28,31,44))
    line([(rx-64,ry+23),(rx+61,ry+23)],(92,97,112),4)
    poly([(rx-64,ry-14),(rx+38,ry-14),(rx+65,ry-2),(rx+53,ry+16),(rx-61,ry+14)],(217,152,16),(255,194,59))
    poly([(rx-64,ry-14),(rx-49,ry-22),(rx+39,ry-22),(rx+65,ry-2),(rx+40,ry-7),(rx-55,ry-7)],(248,182,35),(255,208,98))
    rect((rx-43,ry-4,rx+42,ry+17),(25,29,42),4,(88,93,113))
    for x in (-50,38):
        ell((rx+x-13,ry-5,rx+x+13,ry+21),(20,25,38),(121,129,144),2)
        ell((rx+x-9,ry-1,rx+x+9,ry+17),(42,51,65),(63,71,90))
        ang=2*math.pi*t*7 if swimming else 0
        for n in range(3):
            a=ang+n*math.pi*2/3
            line([(rx+x,ry+8),(rx+x+8*math.cos(a),ry+8+8*math.sin(a))],(124,137,151),2)
        ell((rx+x-2,ry+6,rx+x+2,ry+10),(173,177,187))
    # Front camera / work light, with restrained light in survey phases.
    ell((rx+53,ry-3,rx+65,ry+9),(15,26,39),(166,177,187))
    ell((rx+57,ry,rx+62,ry+5),(145,206,214))
    for dx in (-33,27):
        line([(rx+dx,ry-18),(rx+dx,ry-28)],(111,120,136),3)
        ell((rx+dx-4,ry-32,rx+dx+4,ry-25),(243,232,188),(174,161,116))
    for dx in (-64,61): line([(rx+dx,ry-9),(rx+dx,ry+21)],(108,113,132),3)
    if swimming:
        for i in range(3):
            xx=rx-83-i*12
            line([(xx,ry+9),(xx-7,ry+9)],(58+8*i,94+7*i,111+7*i),1)
    # Positive mechanical dogs close after contact; magnet switches off again.
    span=33 if locked else 50
    line([(498-span,py+3),(498-span,py+21),(498-span+9,py+21)],GOLD if locked else (138,142,158),3)
    line([(498+span,py+3),(498+span,py+21),(498+span-9,py+21)],GOLD if locked else (138,142,158),3)
    ell((529,py-1,534,py+4),GOLD if magnet else (67,70,82))
    # Near hull masks the central mechanism naturally while it is stowed.
    poly([(309,232),(595,233),(658,251),(637,271),(322,266),(297,249)],(23,26,38),(73,77,96))
    poly([(309,232),(329,220),(599,221),(658,251),(597,243),(317,244)],(50,49,66),(105,95,116))
    line([(320,248),(598,253),(638,256)],GOLD,3)
    line([(326,261),(598,266)],(60,67,87),1)
    txt((374,232),'ME120',(164,160,174),10,True)
    # One small phase indicator and no marketing quotations.
    txt((38,522),'CONCEPT CYCLE',(120,115,140),9,True)
    startx=380
    for i,(_,name) in enumerate(phases):
        x=startx+i*26
        ell((x,525,x+5,530),GOLD if i==active else (76,69,92))
    txt((584,520),phases[active][1],(230,222,239),11,True)
    return im.resize((W,H),Image.Resampling.LANCZOS)

if __name__ == '__main__':
    # Begin with both vehicles visible, retaining a continuous ten-second loop.
    frames=[draw_frame((i/80+.425)%1) for i in range(80)]
    frames[0].save(OUT/'poster.png',optimize=True)
    # Shared palette prevents shimmer in static geometry and gradients.
    palette=Image.new('RGB',(W,H*4))
    for j,i in enumerate((0,22,42,62)): palette.paste(frames[i],(0,j*H))
    palette=palette.quantize(colors=128,method=Image.Quantize.MEDIANCUT)
    indexed=[frame.quantize(palette=palette,dither=Image.Dither.NONE) for frame in frames]
    indexed[0].save(OUT/'concept.gif',save_all=True,append_images=indexed[1:],duration=125,loop=0,optimize=True,disposal=1)
    sheet=Image.new('RGB',(1000,840),BG)
    for j,i in enumerate((0,18,29,42,57,65)):
        sheet.paste(frames[i].resize((500,280)),((j%2)*500,(j//2)*280))
    sheet.save(OUT/'contact-sheet.jpg',quality=90)
    print('Saved concept.gif', (OUT/'concept.gif').stat().st_size, 'bytes; 80 frames; 10-second loop')
