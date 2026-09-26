from PIL import Image, ImageEnhance, ImageDraw, ImageFilter
from pathlib import Path

ROOT=Path("assets/growroom/backgrounds")

def add_light_progression(im, level):
    w,h=im.size
    out=im.convert("RGBA")
    # increasingly wider and brighter illumination while keeping room geometry untouched
    overlay=Image.new("RGBA",(w,h),(0,0,0,0))
    d=ImageDraw.Draw(overlay)
    cx=w//2
    top=int(h*.15)
    bottom=int(h*.84)
    topw=int(w*(.17 + (level-3)*.025))
    botw=int(w*(.48 + (level-3)*.045))
    alpha={3:24,4:37,5:52}[level]
    poly=[(cx-topw//2,top),(cx+topw//2,top),(cx+botw//2,bottom),(cx-botw//2,bottom)]
    d.polygon(poly,fill=(255,231,165,alpha))
    overlay=overlay.filter(ImageFilter.GaussianBlur(42 + level*5))
    out=Image.alpha_composite(out,overlay)

    # Boost only the lamp/top-light region, preserving the tent itself.
    top_region=out.crop((0,0,w,int(h*.34))).convert("RGB")
    top_region=ImageEnhance.Brightness(top_region).enhance({3:1.06,4:1.13,5:1.21}[level])
    top_region=ImageEnhance.Contrast(top_region).enhance({3:1.02,4:1.04,5:1.06}[level])
    out.alpha_composite(top_region.convert("RGBA"),(0,0))
    return out.convert("RGB")

for vent in range(1,6):
    src=ROOT/f"growroom-l2-v{vent}.webp"
    if not src.exists():
        raise SystemExit(f"missing source {src}")
    base=Image.open(src).convert("RGB")
    for light in range(3,6):
        out=add_light_progression(base,light)
        dst=ROOT/f"growroom-l{light}-v{vent}.webp"
        out.save(dst,"WEBP",quality=82,method=6)
        print(dst)
