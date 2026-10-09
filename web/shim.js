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

/* ---------- login gate (email + password; users sign up themselves) ---------- */
const TH_ERR=m=>/signups? not allowed/i.test(m)?"ตอนนี้ระบบยังปิดการสมัครใหม่ ติดต่อผู้ดูแล":/email not confirmed/i.test(m)?"บัญชียังไม่ได้ยืนยันอีเมล ติดต่อผู้ดูแล":/invalid login/i.test(m)?"อีเมลหรือรหัสผ่านไม่ถูกต้อง":/rate limit|too many/i.test(m)?"ลองบ่อยเกินไป รอสักครู่แล้วลองใหม่":/banned|disabled/i.test(m)?"บัญชีนี้ถูกปิดการใช้งาน ติดต่อผู้ดูแล":m;
function showLogin(){
  const run=()=>{
    const o=document.createElement("div");o.id="loginGate";
    o.style.cssText="position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;overflow:auto;background:radial-gradient(900px 380px at 85% -60px,rgba(61,92,160,.25),transparent 70%),linear-gradient(180deg,#e9edf6,#f3f4f8);font-family:Sarabun,'Noto Sans Thai',Tahoma,sans-serif";
    const inp="width:100%;padding:13px 16px;font:inherit;font-size:16px;border:1px solid #d9dce5;border-radius:999px;margin-bottom:12px";
    const tab="flex:1;padding:10px;font:inherit;font-size:14px;font-weight:700;border:0;border-radius:999px;cursor:pointer;background:transparent;color:#6b6860";
    o.innerHTML=`<form id="lgForm" style="background:#fff;border-radius:28px;box-shadow:0 2px 4px rgba(19,32,60,.06),0 18px 40px rgba(19,32,60,.16);padding:28px;max-width:400px;width:100%;color:#1a1916">
      <div style="font-size:13px;font-weight:700;color:#13203c">📋 Product Ingredient</div>
      <div style="display:flex;gap:4px;background:#eef1f7;border-radius:999px;padding:4px;margin:14px 0 18px" role="tablist">
        <button type="button" id="tbIn" role="tab" style="${tab}">เข้าสู่ระบบ</button><button type="button" id="tbUp" role="tab" style="${tab}">สมัครใช้งาน</button></div>
      <h2 id="lgTitle" style="font-size:24px;margin:0 0 4px;color:#13203c"></h2>
      <p id="lgSub" style="font-size:14px;color:#6b6860;margin-bottom:16px"></p>
      <input id="lgName" type="text" autocomplete="name" placeholder="ชื่อที่แสดง (เช่น ชื่อ-นามสกุล)" style="${inp}">
      <input id="lgEmail" type="email" required autocomplete="username" placeholder="อีเมล" style="${inp}">
      <input id="lgPw" type="password" required autocomplete="current-password" placeholder="รหัสผ่าน" style="${inp}">
      <input id="lgPw2" type="password" autocomplete="new-password" placeholder="พิมพ์รหัสผ่านอีกครั้ง" style="${inp}">
      <button id="lgBtn" type="submit" style="width:100%;padding:13px;font:inherit;font-size:15px;font-weight:700;color:#fff;background:linear-gradient(180deg,#2a4278,#13203c);border:0;border-radius:999px;box-shadow:0 6px 16px rgba(19,32,60,.3);cursor:pointer"></button>
      <p id="lgMsg" role="status" style="font-size:13px;margin-top:14px;min-height:20px;color:#c0392b"></p></form>`;
    document.body.appendChild(o);
    const $$=s=>o.querySelector(s),m=$$("#lgMsg"),b=$$("#lgBtn");let mode="in";
    const setMode=md=>{mode=md;const up=md==="up";
      $$("#tbIn").style.background=up?"transparent":"#fff";$$("#tbIn").style.color=up?"#6b6860":"#13203c";$$("#tbIn").style.boxShadow=up?"none":"0 2px 6px rgba(19,32,60,.12)";
      $$("#tbUp").style.background=up?"#fff":"transparent";$$("#tbUp").style.color=up?"#13203c":"#6b6860";$$("#tbUp").style.boxShadow=up?"0 2px 6px rgba(19,32,60,.12)":"none";
      $$("#lgTitle").textContent=up?"สมัครใช้งาน":"เข้าสู่ระบบ";$$("#lgSub").textContent=up?"ใช้อีเมลของคุณ และตั้งรหัสผ่านอย่างน้อย 8 ตัวอักษร":"ใช้อีเมลและรหัสผ่านที่สมัครไว้";
      $$("#lgName").style.display=up?"":"none";$$("#lgPw2").style.display=up?"":"none";$$("#lgPw2").required=up;
      $$("#lgPw").autocomplete=up?"new-password":"current-password";b.textContent=up?"สมัครและเข้าใช้งาน":"เข้าสู่ระบบ";m.textContent=""};
    $$("#tbIn").onclick=()=>setMode("in");$$("#tbUp").onclick=()=>setMode("up");setMode("in");
    o.querySelector("#lgForm").onsubmit=async ev=>{ev.preventDefault();m.style.color="#c0392b";m.textContent="";
      const email=$$("#lgEmail").value.trim(),pw=$$("#lgPw").value;
      if(mode==="up"){if(pw.length<8){m.textContent="รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร";return}if(pw!==$$("#lgPw2").value){m.textContent="รหัสผ่านสองช่องไม่ตรงกัน";return}}
      b.disabled=true;const old=b.textContent;b.textContent="กำลังดำเนินการ…";
      let r;if(mode==="up")r=await sb.auth.signUp({email,password:pw,options:{data:{name:$$("#lgName").value.trim()}}});
      else r=await sb.auth.signInWithPassword({email,password:pw});
      if(r.error){m.textContent=/already registered|already exists/i.test(r.error.message)?"อีเมลนี้สมัครไว้แล้ว กด “เข้าสู่ระบบ”":TH_ERR(r.error.message);b.disabled=false;b.textContent=old;return}
      if(mode==="up"&&!(r.data&&r.data.session)){m.style.color="#1d6f42";m.textContent="สมัครแล้ว กรุณายืนยันอีเมลจากกล่องจดหมาย แล้วกลับมาเข้าสู่ระบบ";b.disabled=false;b.textContent=old;setMode("in");return}
      location.reload()};
  };
  document.body?run():document.addEventListener("DOMContentLoaded",run);
}
async function fn(name,body){const{data:s}=await sb.auth.getSession();if(!s.session)throw new Error("not signed in");
  const r=await fetch(SB_URL+"/functions/v1/"+name,{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+s.session.access_token,apikey:SB_KEY},body:JSON.stringify(body)});
  const j=await r.json().catch(()=>({}));if(!r.ok){const e=new Error(j.error||"error");e.code=j.error;throw e}return j}
const ADM_ERR={weak_password:"รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร",bad_email:"อีเมลไม่ถูกต้อง",forbidden:"ไม่มีสิทธิ์ (เฉพาะผู้ดูแล)",cannot_self:"ทำกับบัญชีของตัวเองไม่ได้"};
const genPw=()=>{const c="abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";const a=new Uint32Array(12);crypto.getRandomValues(a);return Array.from(a,x=>c[x%c.length]).join("")};
function modal(html){const o=document.createElement("div");o.className="ov";o.style.zIndex=60;o.innerHTML=`<div class="md" role="dialog" aria-modal="true" style="max-width:760px">${html}</div>`;document.body.appendChild(o);o.addEventListener("click",e=>{if(e.target===o||e.target.closest("[data-x]"))o.remove()});return o}
const E=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
function openPassword(){
  const o=modal(`<div class="mdh"><b>🔑 เปลี่ยนรหัสผ่านของฉัน</b><button class="btn" data-x>ปิด</button></div><div class="mdb"><label>รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)</label><input type="password" id="pwA" autocomplete="new-password"><label>พิมพ์ซ้ำอีกครั้ง</label><input type="password" id="pwB" autocomplete="new-password"><div class="bar"><button class="btn p" id="pwGo">บันทึกรหัสผ่านใหม่</button></div><div class="note" id="pwMsg" role="status"></div></div>`);
  o.querySelector("#pwGo").onclick=async()=>{const a=o.querySelector("#pwA").value,b=o.querySelector("#pwB").value,m=o.querySelector("#pwMsg");
    if(a.length<8){m.textContent="รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร";m.style.color="#c0392b";return}if(a!==b){m.textContent="รหัสผ่านสองช่องไม่ตรงกัน";m.style.color="#c0392b";return}
    const{error}=await sb.auth.updateUser({password:a});m.style.color=error?"#c0392b":"#1d6f42";m.textContent=error?TH_ERR(error.message):"เปลี่ยนรหัสผ่านแล้ว"}}
function openUsers(){
  const o=modal(`<div class="mdh"><b>👤 จัดการผู้ใช้</b><button class="btn" data-x>ปิด</button></div><div class="mdb"><div class="hm-sec" style="box-shadow:none;margin-bottom:12px"><b style="font-size:14px">เพิ่มผู้ใช้ใหม่</b>
    <div class="row" style="margin-top:8px"><input type="text" id="nuName" placeholder="ชื่อที่แสดง"><input type="email" id="nuEmail" placeholder="อีเมล"></div>
    <div class="row"><input type="text" id="nuPw" placeholder="รหัสผ่านเริ่มต้น (8 ตัวขึ้นไป)"><button class="btn" id="nuGen" type="button">สุ่มรหัส</button><button class="btn p" id="nuAdd" type="button">เพิ่มผู้ใช้</button></div>
    <div class="note" id="nuMsg" role="status"></div></div><div id="usList"><p class="note">กำลังโหลด…</p></div></div>`);
  const msg=(t,bad)=>{const m=o.querySelector("#nuMsg");m.textContent=t;m.style.color=bad?"#c0392b":"#1d6f42"};
  const load=async()=>{const L=o.querySelector("#usList");try{const{users}=await fn("admin-users",{action:"list"});
    L.innerHTML=`<table style="width:100%;border-collapse:collapse;font-size:13px"><tr><th align=left>ผู้ใช้</th><th align=left>เข้าล่าสุด</th><th></th></tr>${users.map(u=>`<tr style="border-top:1px solid #e2e0d8"><td><b>${E(u.name)}</b>${u.role==="admin"?" · ผู้ดูแล":""}${u.disabled?' · <span style="color:#c0392b">ปิดใช้งาน</span>':""}<div class="note" style="margin:0">${E(u.email)}</div></td><td>${u.last_sign_in_at?E(new Date(u.last_sign_in_at).toLocaleString("th-TH",{dateStyle:"short",timeStyle:"short"})):"-"}</td><td style="text-align:right;white-space:nowrap"><button class="btn" data-rs="${u.id}">ตั้งรหัสใหม่</button> <button class="btn" data-ds="${u.id}" data-v="${u.disabled?0:1}">${u.disabled?"เปิดใช้งาน":"ปิดใช้งาน"}</button> <button class="btn del" data-dl="${u.id}">ลบ</button></td></tr>`).join("")}</table>`}catch(e){L.innerHTML='<p class="note">โหลดไม่สำเร็จ: '+E(ADM_ERR[e.code]||e.message)+"</p>"}};
  o.querySelector("#nuGen").onclick=()=>{o.querySelector("#nuPw").value=genPw()};
  o.querySelector("#nuAdd").onclick=async()=>{const email=o.querySelector("#nuEmail").value.trim(),pw=o.querySelector("#nuPw").value,name=o.querySelector("#nuName").value.trim();
    try{await fn("admin-users",{action:"create",email,password:pw,name});msg("เพิ่มผู้ใช้แล้ว แจ้งอีเมลและรหัสผ่านให้ผู้ใช้ (ให้เปลี่ยนรหัสเองภายหลังได้)");o.querySelector("#nuEmail").value="";o.querySelector("#nuName").value="";load()}catch(e){msg(ADM_ERR[e.code]||(e.code==="409"?"":e.message),true)}};
  o.addEventListener("click",async ev=>{const t=ev.target.closest("button[data-rs],button[data-ds],button[data-dl]");if(!t)return;
    try{if(t.dataset.rs){const pw=genPw();await fn("admin-users",{action:"reset",id:t.dataset.rs,password:pw});msg("ตั้งรหัสใหม่แล้ว: "+pw+"  (แจ้งผู้ใช้ รหัสนี้แสดงครั้งเดียว)")}
      else if(t.dataset.ds){await fn("admin-users",{action:"disable",id:t.dataset.ds,disabled:t.dataset.v==="1"});load()}
      else if(t.dataset.dl){if(!t.dataset.sure){t.dataset.sure="1";t.textContent="ยืนยันลบ?";setTimeout(()=>{if(t.isConnected){delete t.dataset.sure;t.textContent="ลบ"}},4000);return}await fn("admin-users",{action:"delete",id:t.dataset.dl});load()}}
    catch(e){msg(ADM_ERR[e.code]||e.message,true)}});
  load()}
document.addEventListener("DOMContentLoaded",()=>{ready.then(ok=>{if(!ok)return;const ft=document.querySelector(".hm-ft");if(!ft)return;const go=ft.querySelector("[data-go=form]");
  const mk=(t,fnc)=>{const b=document.createElement("button");b.className="btn";b.textContent=t;b.onclick=fnc;ft.insertBefore(b,go);return b};
  if(PROF&&PROF.role==="admin")mk("👤 จัดการผู้ใช้",openUsers);
  mk("🔑 รหัสผ่าน",openPassword);
  mk("ออกจากระบบ",async()=>{await sb.auth.signOut();try{sessionStorage.clear()}catch(e){}location.reload()})})});

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
