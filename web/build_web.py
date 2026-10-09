"""Build web/dist/index.html from ../product-ingredient.html + shim.js (Supabase backend)."""
import re,os,sys
here=os.path.dirname(os.path.abspath(__file__))
url=os.environ.get("SB_URL","https://oaoedrenioyezaxiyqyu.supabase.co")
key=os.environ.get("SB_KEY","sb_publishable_2lOfapUdi4JD2w19ogYVRg_VR8E1fWr")
h=open(os.path.join(here,"..","product-ingredient.html"),encoding="utf8").read()
shim=open(os.path.join(here,"shim.js"),encoding="utf8").read().replace("__SB_URL__",url).replace("__SB_KEY__",key)
tag='<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js"></script>\n<script>'+shim+'</script>\n'
assert h.count("<body>\n")==1
h=h.replace("<body>\n","<body>\n"+tag,1)
os.makedirs(os.path.join(here,"dist"),exist_ok=True)
open(os.path.join(here,"dist","index.html"),"w",encoding="utf8").write(h)
print("built",len(h))
