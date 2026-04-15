

// ── Service Worker ───────────────────────────────────────────
(function registerSW(){
 if(!('serviceWorker' in navigator)) return;
 // blob URL ไม่ทำงานบน HTTPS — ใช้ไฟล์ sw.js จริงถ้ามี, ถ้าไม่มีก็ skip
 if(location.protocol==='https:'){
  navigator.serviceWorker.register('./sw.js',{scope:'./'})
   .then(()=>console.log('[SW] registered (file)'))
   .catch(()=>console.log('[SW] sw.js not found — offline mode disabled'));
  return;
 }
 // localhost/file: ใช้ blob ได้
 const swCode = `
  const CACHE='nalincha-pos-v1';
  self.addEventListener('install',e=>{ self.skipWaiting(); });
  self.addEventListener('activate',e=>{ self.clients.claim(); });
  self.addEventListener('fetch',e=>{
   if(e.request.method!=='GET') return;
   e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));
  });
 `;
 const blob = new Blob([swCode],{type:'application/javascript'});
 const url  = URL.createObjectURL(blob);
 navigator.serviceWorker.register(url,{scope:location.pathname})
  .then(()=>console.log('[SW] registered (blob)'))
  .catch(e=>console.warn('[SW] register failed:',e.message));
})();

window.addEventListener('error',e=>{console.error('JS Error:',e.message);});
(async function init(){
 // 0. Apply theme + locale จาก localStorage ก่อนเลย (ก่อน paint)
 initAppCfg();
 // 0. Migrate plain-text PINs → SHA-256 hashes (once)
 const hasCache = loadLocal();
 await migratePins();
 migrateSizes();
 // migrate recipe field: ings → ingredients
 if(DB.recipes) DB.recipes.forEach(r=>{ if(r.ings&&!r.ingredients){ r.ingredients=r.ings; delete r.ings; } });
 // migrate blend IDs: 'tmp-...' → numeric nextId (fixes NaN in batch modal)
 if(DB.blends) DB.blends.forEach(b=>{
  if(typeof b.id==='string' && b.id.startsWith('tmp-')){
   b.id = DB.nextId++;
   if(!b.stock) b.stock=[];
  }
 });
 if(hasCache){ showSyncStatus('Cache'); }

 // 2. โหลดจาก Sheets (รวม employees) — รอให้เสร็จก่อนแสดง login
 if(isOnline && !SCRIPT_URL.includes('YOUR_SUBDOMAIN') && !SCRIPT_URL.includes('YOUR_APPS_SCRIPT')){
   showSyncStatus('กำลังเชื่อมต่อ...');
   // ─── load data (CORS must be enabled on Worker) ────────────
   try {
     console.log('[init] Connecting to Worker:', SCRIPT_URL);
     await loadFromSheet();
   } catch(e) {
     console.error('[init] loadFromSheet exception:', e.message, e);
     showSyncStatus('เชื่อมต่อไม่ได้');
     toast(e.message);
   }
 } else if(!isOnline){
   showSyncStatus('ออฟไลน์');
 }
 updateSyncUI();
 document.getElementById('reportDate').textContent='วันนี้';
 updateSalesBadge();

 // 3. แสดง/ซ่อน UI ตามสถานะพนักงาน
 const _hint   = document.getElementById('loginFirstRunHint');
 const _numpad = document.getElementById('loginNumpad');
 const _dots   = document.getElementById('loginPinDots');
 // numpad & dots แสดงเสมอ — ไม่มี race condition
 if(_numpad) _numpad.style.display = 'grid';
 if(_dots)   _dots.style.display   = 'flex';
 // hint แสดงเฉพาะเมื่อไม่มีพนักงานในระบบ
 if(_hint)   _hint.style.display   = (!DB.employees || DB.employees.length === 0) ? 'block' : 'none';
})();

function showUpdateBanner(){
 if(document.getElementById('sw-update-banner'))return;
 const b=document.createElement('div');
 b.id='sw-update-banner';
 b.style.cssText='position:fixed;bottom:90px;left:50%;transform:translateX(-50%);z-index:99999;background:var(--esp,#2A1810);color:#fff;border-radius:50px;padding:12px 20px;display:flex;align-items:center;gap:12px;box-shadow:0 8px 32px rgba(0,0,0,.35);font-family:var(--fh,Kanit),sans-serif;font-size:13px;font-weight:600;animation:slideUpIn .35s cubic-bezier(.34,1.56,.64,1);white-space:nowrap;';
 b.innerHTML='<span style="font-size:18px">🆕</span><span>มีเวอร์ชันใหม่พร้อมใช้</span><button id="sw-reload-btn" style="background:var(--cara,#C8826A);color:#fff;border:none;border-radius:50px;padding:6px 16px;font-size:12px;font-weight:700;font-family:inherit;cursor:pointer">อัปเดตเลย</button><button onclick="this.closest(\'#sw-update-banner\').remove()" style="background:rgba(255,255,255,.15);color:#fff;border:none;border-radius:50%;width:24px;height:24px;font-size:14px;cursor:pointer">×</button>';
 document.body.appendChild(b);
 document.getElementById('sw-reload-btn').addEventListener('click',()=>{
  navigator.serviceWorker.getRegistration().then(reg=>{
   if(reg?.waiting)reg.waiting.postMessage({type:'SKIP_WAITING'});
   else window.location.reload();
  });
 });
}

// ─── Debug Panel ─────────────────────────────────────────────
function openDebugPanel(){
 document.getElementById('dbg-network').textContent=navigator.onLine?'Online':'Offline';
 document.getElementById('dbg-network').style.color=navigator.onLine?'var(--green)':'var(--red)';
 document.getElementById('dbg-worker').textContent='—';
 document.getElementById('dbg-gas').textContent='—';
 const d=DB;
 document.getElementById('dbg-db').innerHTML=`ing:${d.ingredients?.length||0} pkg:${d.packages?.length||0}<br>emp:${d.employees?.length||0} menu:${d.menus?.length||0}<br>ord:${d.orders?.length||0}`;
 if('serviceWorker' in navigator){
  navigator.serviceWorker.getRegistration().then(reg=>{
   if(!reg){dbgLog('⚠️ SW ไม่ได้ register (iOS PWA หรือ SW ถูกปิด)','#FFAA44');return;}
   const state=reg.active?'✅ active':reg.waiting?'⏳ waiting':'installing';
   dbgLog(`SW: ${state}`,'#88AAFF');
   if(reg.waiting)dbgLog('⚠️ มี SW ใหม่รอ activate','#FFAA44');
   const sw=reg.active||reg.installing||reg.waiting;
   if(sw){const mc=new MessageChannel();mc.port1.onmessage=e=>{if(e.data?.type==='VERSION')dbgLog(`SW version: ${e.data.version} | cache: ${e.data.cache}`,'#88CC88');};sw.postMessage({type:'GET_VERSION'},[mc.port2]);}
  });
 } else {
  dbgLog('ℹ️ iOS PWA standalone — SW ถูกข้ามเพื่อหลีกเลี่ยง error','#FFAA44');
 }
 openModal('modal-debug');
}
function dbgLog(msg,color){
 const el=document.getElementById('dbg-log');if(!el)return;
 const ts=new Date().toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
 const line=document.createElement('div');line.style.color=color||'#C8B89A';line.textContent=`[${ts}] ${msg}`;
 if(el.children[0]?.style.color==='rgb(102, 102, 102)')el.innerHTML='';
 el.appendChild(line);el.scrollTop=el.scrollHeight;
}
function dbgClearLog(){document.getElementById('dbg-log').innerHTML='<span style="color:#666">// cleared</span>';}
async function dbgPingWorker(){
 dbgLog('→ Ping Worker: '+SCRIPT_URL,'#88AAFF');
 document.getElementById('dbg-worker').textContent='⏳...';
 try{
  const t0=Date.now();const res=await fetch(SCRIPT_URL+'?action=ping',{mode:'cors'});const ms=Date.now()-t0;
  const txt=await res.text();
  dbgLog(`← HTTP ${res.status} (${ms}ms)`,res.ok?'#88CC88':'#FF8888');
  dbgLog(`   Body: ${txt}`,'#DDBB88');
  document.getElementById('dbg-worker').textContent=res.ok?`✅ ${ms}ms`:`❌ ${res.status}`;
  document.getElementById('dbg-worker').style.color=res.ok?'var(--green)':'var(--red)';
 }catch(e){
  dbgLog(`✗ ${e.message}`,'#FF6666');
  document.getElementById('dbg-worker').textContent='❌ Error';
  document.getElementById('dbg-worker').style.color='var(--red)';
 }
}
async function dbgTestGetAll(){
 dbgLog('→ GET ?action=getAll','#88AAFF');
 document.getElementById('dbg-gas').textContent='⏳...';
 try{
  const t0=Date.now();const res=await fetch(SCRIPT_URL+'?action=getAll',{mode:'cors'});const ms=Date.now()-t0;
  dbgLog(`← HTTP ${res.status} (${ms}ms)`,res.ok?'#88CC88':'#FF8888');
  if(!res.ok){document.getElementById('dbg-gas').textContent=`❌ ${res.status}`;document.getElementById('dbg-gas').style.color='var(--red)';return;}
  const txt=await res.text();dbgLog(`   length: ${txt.length} chars`,'#AAAAAA');
  try{
   const data=JSON.parse(txt);
   if(data.error){dbgLog(`   GAS error: ${data.error}`,'#FF8888');document.getElementById('dbg-gas').textContent='❌ '+data.error;document.getElementById('dbg-gas').style.color='var(--red)';}
   else{Object.keys(data).forEach(k=>{if(Array.isArray(data[k]))dbgLog(`   ${k}: ${data[k].length}`,'#AADDAA');});document.getElementById('dbg-gas').textContent='✅ OK';document.getElementById('dbg-gas').style.color='var(--green)';dbgLog('✅ getAll สำเร็จ!','#44FF88');}
  }catch(pe){dbgLog(`   JSON error: ${pe.message}`,'#FF8888');dbgLog(`   First 200: ${txt.substring(0,200)}`,'#FFAA44');}
 }catch(e){dbgLog(`✗ ${e.message}`,'#FF6666');document.getElementById('dbg-gas').textContent='❌ Error';document.getElementById('dbg-gas').style.color='var(--red)';}
}
function dbgShowDB(){
 dbgLog('── DB Snapshot ──────────','#88AAFF');
 ['menus','ingredients','packages','equipment','employees','orders','promos','recipes','blends','auditLog'].forEach(k=>{
  const arr=DB[k];if(Array.isArray(arr))dbgLog(`  ${k}: ${arr.length} ${arr.length>0?'✅':'⚠️'}`,arr.length>0?'#AADDAA':'#FFAA44');
 });
 dbgLog(`  nextId: ${DB.nextId}`,'#AAAAAA');
 dbgLog(`  shopName: ${DB.shopName||'(not set)'}`,'#AAAAAA');
 const ls=localStorage.getItem('pos_dirty_v5');
 dbgLog(`  dirty: ${ls!==null?'⚠️ dirty':'✅ clean'}`,'#AAAAAA');
}