/* Web build: provides window.claude (db / user / sample / downloads) on top of Supabase,
   so the same app code runs outside claude.ai. Public key only; access is enforced by RLS. */
(function(){
const SB_URL="__SB_URL__",SB_KEY="__SB_KEY__";
const sb=window.supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
window.__sb=sb;
let ME=null,PROF=null;
const safe=s=>String(s).replace(/[^A-Za-z0-9_\-]/g,"_");
const fail=e=>{if(e)throw new Error(e.message||String(e))};
const ready=(async()=>{
  try{const{data}=await sb.auth.getSession();if(!data.session)return false;ME=data.session.user;
    const{data:p}=await sb.from("profiles").select("name,email,role").eq("id",ME.id).maybeSingle();PROF=p||{};return true}catch(e){return false}
})();
ready.then(ok=>{if(!ok)showLogin()});
sb.auth.onAuthStateChange(ev=>{if(ev==="SIGNED_IN"&&!ME){try{history.replaceState(null,"",location.pathname)}catch(e){}location.reload()}});

/* ---------- login gate ---------- */
function showLogin(){
  const run=()=>{
    const o=document.createElement("div");o.id="loginGate";
    o.style.cssText="position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;background:radial-gradient(900px 380px at 85% -60px,rgba(61,92,160,.25),transparent 70%),linear-gradient(180deg,#e9edf6,#f3f4f8);font-family:Sarabun,'Noto Sans Thai',Tahoma,sans-serif";
    o.innerHTML=`<form id="lgForm" style="background:#fff;border-radius:28px;box-shadow:0 2px 4px rgba(19,32,60,.06),0 18px 40px rgba(19,32,60,.16);padding:32px 28px;max-width:400px;width:100%;color:#1a1916">
      <div style="font-size:13px;font-weight:700;color:#13203c">📋 Product Ingredient</div>
      <h2 style="font-size:26px;margin:6px 0 4px;color:#13203c">เข้าสู่ระบบ</h2>
      <p style="font-size:14px;color:#6b6860;margin-bottom:18px">ใส่อีเมล ระบบจะส่งลิงก์เข้าสู่ระบบให้ ไม่ต้องจำรหัสผ่าน</p>
      <input id="lgEmail" type="email" required autocomplete="email" placeholder="you@company.com" style="width:100%;padding:13px 16px;font:inherit;font-size:16px;border:1px solid #d9dce5;border-radius:999px;margin-bottom:12px">
      <button id="lgBtn" type="submit" style="width:100%;padding:13px;font:inherit;font-size:15px;font-weight:700;color:#fff;background:linear-gradient(180deg,#2a4278,#13203c);border:0;border-radius:999px;box-shadow:0 6px 16px rgba(19,32,60,.3);cursor:pointer">ส่งลิงก์เข้าสู่ระบบ</button>
      <p id="lgMsg" role="status" style="font-size:13px;margin-top:14px;min-height:20px;color:#6b6860"></p></form>`;
    document.body.appendChild(o);
    const f=o.querySelector("#lgForm"),m=o.querySelector("#lgMsg"),b=o.querySelector("#lgBtn");
    f.onsubmit=async ev=>{ev.preventDefault();b.disabled=true;m.style.color="#6b6860";m.textContent="กำลังส่งลิงก์…";
      const email=o.querySelector("#lgEmail").value.trim();
      const{error}=await sb.auth.signInWithOtp({email,options:{emailRedirectTo:location.origin+location.pathname}});
      if(error){m.style.color="#c0392b";m.textContent="ส่งไม่สำเร็จ: "+error.message;b.disabled=false;return}
      m.style.color="#1d6f42";m.textContent="ส่งลิงก์ไปที่ "+email+" แล้ว เปิดอีเมลและกดลิงก์เพื่อเข้าใช้งาน (ถ้าไม่เห็น ลองดูในสแปม)";b.textContent="ส่งอีกครั้ง";setTimeout(()=>{b.disabled=false},30000)};
  };
  document.body?run():document.addEventListener("DOMContentLoaded",run);
}
document.addEventListener("DOMContentLoaded",()=>{ready.then(ok=>{if(!ok)return;const ft=document.querySelector(".hm-ft");if(!ft)return;
  const b=document.createElement("button");b.className="btn";b.textContent="ออกจากระบบ";b.onclick=async()=>{await sb.auth.signOut();try{sessionStorage.clear()}catch(e){}location.reload()};ft.insertBefore(b,ft.querySelector("[data-go=form]"))})});

/* ---------- db shim (document/collection API over tables) ---------- */
const P=p=>String(p).split("/");
const snap=(id,data)=>({exists:data!=null,id,data:()=>data});
function applyWhere(q,wh){for(const[f,o,v]of wh||[]){const col=f==="t"?"t":null;if(!col)continue;
  const m={"<":"lt","<=":"lte",">":"gt",">=":"gte","==":"eq","!=":"neq"}[o];if(m)q=q[m](col,v)}return q}
const DB={
  async get(path){const p=P(path);
    if(p[0]==="ingredients"&&p.length===2){const{data,error}=await sb.from("ingredients").select("meta").eq("id",p[1]).maybeSingle();fail(error);return snap(p[1],data?data.meta:null)}
    if(p[0]==="ingredients"&&p[2]==="data"){const{data,error}=await sb.from("ingredients").select("json").eq("id",p[1]).maybeSingle();fail(error);return snap("main",data&&data.json!=null?{json:data.json}:null)}
    if(p[0]==="usage"&&p.length===2){const{data,error}=await sb.from("usage_summary").select("*").eq("user_id",p[1]).maybeSingle();fail(error);return snap(p[1],data?{counts:data.counts||{},lastSeen:data.last_seen,lastAction:data.last_action}:null)}
    if(p[0]==="data"&&p.length===4&&p[3]==="draft"){const{data,error}=await sb.from("drafts").select("json,t,h").eq("user_id",ME.id).maybeSingle();fail(error);return snap("draft",data?{json:data.json,t:Number(data.t),h:data.h}:null)}
    return snap(p[p.length-1],null)},
  async set(path,d){const p=P(path);
    if(p[0]==="ingredients"&&p.length===2){const{error}=await sb.from("ingredients").upsert({id:p[1],meta:d,updated_at:d.updated||0,editor:d.editor||null});fail(error);return}
    if(p[0]==="ingredients"&&p[2]==="data"){const{error}=await sb.from("ingredients").update({json:d.json}).eq("id",p[1]);fail(error);return}
    if(p[0]==="ingredients"&&p[2]==="photos"){const{error}=await sb.from("ingredient_photos").upsert({ingredient_id:p[1],slot:p[3],src:d.src});fail(error);return}
    if(p[0]==="brandlogos"){const{error}=await sb.from("brand_logos").upsert({name:d.name,src:d.src});fail(error);return}
    if(p[0]==="usage"&&p.length===2){const{error}=await sb.from("usage_summary").upsert({user_id:ME.id,counts:d.counts||{},last_seen:d.lastSeen||null,last_action:d.lastAction||null});fail(error);return}
    if(p[0]==="usage"&&p[2]==="events"){const{error}=await sb.from("usage_events").insert({id:p[3],user_id:ME.id,t:d.t,a:d.a,d:d.d||{}});fail(error);return}
    if(p[0]==="data"&&p.length===4&&p[3]==="draft"){const{error}=await sb.from("drafts").upsert({user_id:ME.id,json:d.json,t:d.t,h:d.h});fail(error);return}
    if(p[0]==="data"&&p[3]==="draft"&&p[4]==="photos"){const{error}=await sb.from("draft_photos").upsert({user_id:ME.id,slot:p[5],src:d.src});fail(error);return}
    throw new Error("unsupported path "+path)},
  async del(path){const p=P(path);let r;
    if(p[0]==="ingredients"&&p.length===2)r=await sb.from("ingredients").delete().eq("id",p[1]);
    else if(p[0]==="ingredients"&&p[2]==="data")r=await sb.from("ingredients").update({json:null}).eq("id",p[1]);
    else if(p[0]==="ingredients"&&p[2]==="photos")r=await sb.from("ingredient_photos").delete().eq("ingredient_id",p[1]).eq("slot",p[3]);
    else if(p[0]==="brandlogos"){const{data}=await sb.from("brand_logos").select("name");const hit=(data||[]).find(x=>safe(x.name)===p[1]);if(hit)r=await sb.from("brand_logos").delete().eq("name",hit.name)}
    else if(p[0]==="usage"&&p[2]==="events")r=await sb.from("usage_events").delete().eq("id",p[3]).eq("user_id",ME.id);
    else if(p[0]==="data"&&p[4]==="photos")r=await sb.from("draft_photos").delete().eq("user_id",ME.id).eq("slot",p[5]);
    if(r)fail(r.error)},
  async list(path,q){const p=P(path);let docs=[];
    if(path==="ingredients"){const{data,error}=await sb.from("ingredients").select("id,meta").order("updated_at",{ascending:false});fail(error);docs=(data||[]).map(r=>({id:r.id,d:r.meta}))}
    else if(p[0]==="ingredients"&&p[2]==="photos"){const{data,error}=await sb.from("ingredient_photos").select("slot,src").eq("ingredient_id",p[1]);fail(error);docs=(data||[]).map(r=>({id:r.slot,d:{src:r.src}}))}
    else if(path==="brandlogos"){const{data,error}=await sb.from("brand_logos").select("name,src");fail(error);docs=(data||[]).map(r=>({id:safe(r.name),d:{name:r.name,src:r.src}}))}
    else if(path==="usage"){const{data,error}=await sb.from("usage_summary").select("*");fail(error);docs=(data||[]).map(r=>({id:r.user_id,d:{counts:r.counts||{},lastSeen:r.last_seen,lastAction:r.last_action}}))}
    else if(p[0]==="usage"&&p[2]==="events"){let s=sb.from("usage_events").select("id,t,a,d").eq("user_id",p[1]);s=applyWhere(s,q.where);s=s.order("t",{ascending:!(q.order&&q.order[1]==="desc")});s=s.limit(q.limit||1000);const{data,error}=await s;fail(error);docs=(data||[]).map(r=>({id:r.id,d:{t:Number(r.t),a:r.a,d:r.d}}));return{docs:docs.map(x=>({id:x.id,data:()=>x.d}))}}
    else if(p[0]==="data"&&p[3]==="draft"&&p[4]==="photos"){const{data,error}=await sb.from("draft_photos").select("slot,src").eq("user_id",ME.id);fail(error);docs=(data||[]).map(r=>({id:r.slot,d:{src:r.src}}))}
    if(q&&q.limit)docs=docs.slice(0,q.limit);
    return{docs:docs.map(x=>({id:x.id,data:()=>x.d}))}}
};
const mkq=(path,q)=>({where(f,o,v){return mkq(path,{...q,where:[...(q.where||[]),[f,o,v]]})},orderBy(f,d){return mkq(path,{...q,order:[f,d||"asc"]})},limit(n){return mkq(path,{...q,limit:n})},get(){return DB.list(path,q)}});
const doc=p=>({get:()=>DB.get(p),set:d=>DB.set(p,d),delete:()=>DB.del(p)});
const dbApi={doc,collection:p=>Object.assign(mkq(p,{}),{doc:id=>doc(p+"/"+id)})};

/* ---------- user shim ---------- */
const userApi={
  async me(){return{id:ME?ME.id:null,name:(PROF&&PROF.name)||"",email:ME?ME.email:null,avatarUrl:"",color:"#13203c",isOwner:!!(PROF&&PROF.role==="admin"),canEdit:!!(PROF&&PROF.role==="admin")}},
  async isOwner(){return !!(PROF&&PROF.role==="admin")},
  async canEdit(){return !!(PROF&&PROF.role==="admin")},
  async id(){return ME?ME.id:null},
  async can(){return null},
  async profiles(ids){const out={};(Array.isArray(ids)?ids:[ids]).forEach(i=>out[i]={id:i,name:"",email:null,avatarUrl:"",color:"#13203c",isMe:ME&&i===ME.id,guest:false});
    try{if(PROF&&PROF.role==="admin"){const{data}=await sb.from("profiles").select("id,name,email").in("id",Object.keys(out));(data||[]).forEach(r=>{out[r.id].name=r.name||"";out[r.id].email=r.email})}
      else{const{data}=await sb.rpc("display_names",{ids:Object.keys(out)});(data||[]).forEach(r=>{out[r.id].name=r.name||""})}}catch(e){}
    return out}
};

/* ---------- sample shim (Claude via Edge Function) ---------- */
const toDataUrl=b=>new Promise((res,rej)=>{if(typeof b==="string")return res(b);const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(b)});
async function sample(input,opts){opts=opts||{};
  const images=await Promise.all((opts.images||[]).map(toDataUrl));
  const{data:s}=await sb.auth.getSession();if(!s.session){const e=new Error("not signed in");e.code="not_granted";throw e}
  const r=await fetch(SB_URL+"/functions/v1/ai",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+s.session.access_token,apikey:SB_KEY},signal:opts.signal,body:JSON.stringify({input,images,modelTier:opts.modelTier||"default"})});
  const j=await r.json().catch(()=>({}));
  if(!r.ok){const e=new Error(j.error==="ai_not_configured"?"ยังไม่ได้ตั้งค่า Claude API บนเซิร์ฟเวอร์":(j.message||j.error||"error"));e.code=r.status===429?"rate_limited":"error";throw e}
  if(opts.onText)opts.onText({text:j.text,delta:j.text});
  return{text:j.text,truncated:!!j.truncated}}
sample.json=async(input,opts)=>{const r=await sample(input,opts),t=r.text.trim();
  const m=/```(?:json)?\s*([\s\S]*?)```/.exec(t),body=m?m[1]:t;
  try{return JSON.parse(body)}catch(e){const a=body.search(/[\[{]/),z=Math.max(body.lastIndexOf("}"),body.lastIndexOf("]"));if(a>=0&&z>a)return JSON.parse(body.slice(a,z+1));throw e}};
sample.limits=async()=>({images:{maxCount:10,maxBytes:5*1024*1024}});

const dlApi={async save({filename,data}){const b=data instanceof Blob?data:new Blob([data]);const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000)}};

window.claude={use:async n=>{const ok=await ready;if(!ok)return null;return n==="db"?dbApi:n==="user"?userApi:n==="sample"?sample:n==="downloads"?dlApi:null}};
})();
