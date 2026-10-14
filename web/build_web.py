"""Build web/dist/index.html from ../product-ingredient.html + shim.js (Supabase backend)."""
import re,os,sys
here=os.path.dirname(os.path.abspath(__file__))
url=os.environ.get("SB_URL","https://oaoedrenioyezaxiyqyu.supabase.co")
key=os.environ.get("SB_KEY","sb_publishable_2lOfapUdi4JD2w19ogYVRg_VR8E1fWr")
h=open(os.path.join(here,"..","product-ingredient.html"),encoding="utf8").read()
shim=open(os.path.join(here,"shim.js"),encoding="utf8").read().replace("__SB_URL__",url).replace("__SB_KEY__",key)
mig=os.environ.get('MIGRATE','')
app=os.environ.get('APP_URL','https://qc-product-ingredient.netlify.app/')
tag='<script>window.__APP_URL="'+app+'"</script>\n'+(('<script>window.__MIGRATE="'+mig+'"</script>\n') if mig else '')+'<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"></script>\n<script>'+shim+'</script>\n'
assert h.count("<body>\n")==1
h=h.replace("<body>\n","<body>\n"+tag,1)
os.makedirs(os.path.join(here,"dist"),exist_ok=True)
open(os.path.join(here,"dist","index.html"),"w",encoding="utf8").write(h)
ad=os.path.join(here,"assets");odd=os.path.join(here,"dist","assets")
shutil.rmtree(odd,ignore_errors=True) if False else None
if os.path.isdir(ad):
    import shutil as _sh;_sh.rmtree(odd,ignore_errors=True);_sh.copytree(ad,odd)
# login gallery: copy ./picture/* to dist/picture with a manifest
import json,shutil,glob
pd=os.path.join(here,"..","picture");od=os.path.join(here,"dist","picture")
shutil.rmtree(od,ignore_errors=True)
man=[]
if os.path.isdir(pd):
    os.makedirs(od,exist_ok=True)
    try:
        from PIL import Image
    except Exception:
        Image=None
    for f in sorted(glob.glob(os.path.join(pd,"*"))):
        ext=os.path.splitext(f)[1].lower()
        if ext not in (".jpg",".jpeg",".png",".webp"):continue
        name=os.path.basename(f);w=h2=0
        if Image:
            im=Image.open(f);w,h2=im.size
            if max(w,h2)>1100 or os.path.getsize(f)>300000:
                im=im.convert("RGB");im.thumbnail((1100,1100));name=os.path.splitext(name)[0]+".jpg";im.save(os.path.join(od,name),quality=80,optimize=True);w,h2=im.size
            else:shutil.copy(f,os.path.join(od,name))
        else:shutil.copy(f,os.path.join(od,name))
        man.append({"f":name,"w":w,"h":h2,"alt":os.path.splitext(name)[0].replace("-"," ").replace("_"," ").title()})
    json.dump(man,open(os.path.join(od,"index.json"),"w",encoding="utf8"),ensure_ascii=False)
print("built",len(h),"pictures",len(man))
