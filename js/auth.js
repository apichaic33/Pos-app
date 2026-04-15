let loginPin = '';
let _loginLookupLoading = false;
function loginLookup(){
 const id = document.getElementById('loginEmpId').value.trim().toUpperCase();
 const preview = document.getElementById('loginNamePreview');
 loginPin = ''; updateLoginDots();
 document.getElementById('loginError').textContent = '';
 if(!id){
   preview.textContent = '—';
   preview.style.color = 'var(--t4)';
   preview.style.fontWeight = '400';
   return;
 }
 // ถ้า DB ยังว่างอยู่ — auto-retry โหลดจาก Sheets
 if(!DB.employees || DB.employees.length === 0){
   if(isOnline && !_loginLookupLoading){
     _loginLookupLoading = true;
     preview.textContent = '⏳ กำลังโหลดข้อมูลพนักงาน...';
     preview.style.color = 'var(--gold)';
     preview.style.fontWeight = '600';
     loadFromSheet().then(()=>{
       _loginLookupLoading = false;
       loginLookup(); // retry
     }).catch(()=>{
       _loginLookupLoading = false;
       preview.textContent = '⚠️ โหลดไม่ได้ ลองใหม่';
       preview.style.color = 'var(--red)';
     });
   } else if(!isOnline){
     preview.textContent = '⚠️ ออฟไลน์ — ไม่สามารถโหลดข้อมูลได้';
     preview.style.color = 'var(--red)';
     preview.style.fontWeight = '400';
   } else {
     preview.textContent = '⏳ กำลังโหลด...';
     preview.style.color = 'var(--gold)';
   }
   return;
 }
 const emp = DB.employees.find(e=>String(e.id)===String(id));
 if(emp){
   preview.textContent = emp.name;
   preview.style.color = 'var(--t1)';
   preview.style.fontWeight = '700';
 } else {
   preview.textContent = 'ไม่พบรหัสพนักงาน "'+id+'"';
   preview.style.color = 'var(--red)';
   preview.style.fontWeight = '400';
 }
}
function loginPinKey(k){
 if(loginPin.length>=4) return;
 loginPin+=k;
 updateLoginDots();
 if(loginPin.length===4) setTimeout(loginSubmit,200);
}
function loginPinClear(){
 loginPin=loginPin.slice(0,-1);
 updateLoginDots();
}
function updateLoginDots(){
 for(let i=0;i<4;i++){
 const dot=document.getElementById('dot'+i);
 if(dot) dot.classList.toggle('filled', i<loginPin.length);
 }
}
async function loginSubmit(){
 const id=document.getElementById('loginEmpId').value.trim().toUpperCase();
 const errEl=document.getElementById('loginError');
 // ถ้ายังไม่มีพนักงาน → ลอง reload จาก Sheets ก่อน (1 ครั้ง)
 if(!DB.employees.length && isOnline){
   errEl.textContent='กำลังโหลดข้อมูลพนักงาน...';
   await loadFromSheet();
 }
 const emp=DB.employees.find(e=>String(e.id)===String(id));
 if(!DB.employees.length){ errEl.textContent='ไม่มีข้อมูลพนักงาน — ตรวจสอบการเชื่อมต่อ'; loginPinReset(); return; }
 if(!emp){ errEl.textContent='ไม่พบรหัสพนักงาน "'+id+'"'; loginPinReset(); return; }
 // ─── Brute Force Check ───────────────────────
 const failRec = _loginFailMap[id] || {count:0, lockedUntil:0};
 if(Date.now() < failRec.lockedUntil){
   const secsLeft = Math.ceil((failRec.lockedUntil - Date.now()) / 1000);
   const mins = Math.floor(secsLeft/60), secs = secsLeft%60;
   errEl.textContent = `บัญชีถูกล็อค กรุณารอ ${mins}:${String(secs).padStart(2,'0')} นาที`;
   loginPinReset(); return;
 }
 // PIN check — default PIN = last 4 digits of empId padded, or use stored pin
 const expectedPin = isHashed(String(emp.pin||"")) ? String(emp.pin) : await hashPin(String(emp.pin||"1234"));
 const inputHash = await hashPin(loginPin);
 if(inputHash !== expectedPin){
   failRec.count = (failRec.count||0) + 1;
   _loginFailMap[id] = failRec;
   const remaining = LOGIN_MAX_FAIL - failRec.count;
   if(remaining <= 0){
     failRec.lockedUntil = Date.now() + LOGIN_LOCK_MS;
     _loginFailMap[id] = failRec;
     errEl.textContent = 'กรอก PIN ผิดหลายครั้งเกินไป บัญชีถูกล็อค 5 นาที';
   } else {
     errEl.textContent = `รหัส PIN ไม่ถูกต้อง (เหลือ ${remaining} ครั้ง)`;
   }
   loginPinReset(); return;
 }
 // Success — reset fail counter
 _loginFailMap[id] = {count:0, lockedUntil:0};
 // ตรวจ mustChangePin — บังคับเปลี่ยน PIN ก่อนเข้าระบบ
 if(emp.mustChangePin){
   document.getElementById('loginScreen').classList.add('hidden');
   showForcePinChange(emp);
   return;
 }
 // Success
 currentOperator={id:emp.id,name:emp.name,role:emp.role};
 lastOperator=currentOperator;
 document.getElementById('loginScreen').classList.add('hidden');
 errEl.textContent='';
 updateDrawerForRole();
 goPage('order');
 renderOrder();
 loadOrderItems(); // restore pending order items
 toast('ยินดีต้อนรับ '+emp.name);
 addAudit('login','เข้าสู่ระบบ','พนักงาน '+emp.id+' / '+emp.name,'','rgba(43,94,167,.1)','low',emp);
 updateDrawerUser();
 // sync ข้อมูลล่าสุดจาก Sheet ทันทีหลัง login
 if(isOnline) loadFromSheet().then(()=>{ initAppCfg(); }); // re-apply theme/locale หลัง sync
}
function showForcePinChange(emp){
 // แสดง overlay บังคับเปลี่ยน PIN
 const overlay = document.createElement('div');
 overlay.id = 'forcePinOverlay';
 overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:var(--bg);display:flex;align-items:center;justify-content:center;padding:20px';
 overlay.innerHTML = `
  <div style="background:var(--bg);border-radius:var(--r4);padding:24px;max-width:340px;width:100%;text-align:center">
   <span class="mi" style="font-size:48px;color:var(--blue)">lock_reset</span>
   <div style="font-size:16px;font-weight:800;color:var(--t1);margin:10px 0 4px;font-family:var(--fh)">ต้องเปลี่ยน PIN ใหม่</div>
   <div style="font-size:12px;color:var(--t4);margin-bottom:20px">สวัสดี <b>${emp.name}</b> — PIN ของคุณถูก Reset<br>กรุณาตั้ง PIN ใหม่ก่อนเข้าใช้งาน</div>
   <div class="f-group" style="margin-bottom:10px;text-align:left">
    <label class="f-label">PIN ใหม่ (4 หลัก)</label>
    <input class="f-input" id="forcePinNew" type="password" inputmode="numeric" maxlength="4" placeholder="••••" style="text-align:center;font-size:24px;letter-spacing:8px">
   </div>
   <div class="f-group" style="margin-bottom:16px;text-align:left">
    <label class="f-label">ยืนยัน PIN ใหม่</label>
    <input class="f-input" id="forcePinConfirm" type="password" inputmode="numeric" maxlength="4" placeholder="••••" style="text-align:center;font-size:24px;letter-spacing:8px">
   </div>
   <div id="forcePinError" style="font-size:12px;color:var(--red);min-height:18px;font-weight:600;margin-bottom:10px"></div>
   <button onclick="submitForcePinChange('${emp.id}')"
    style="width:100%;padding:14px;background:var(--blue);color:#fff;border:none;border-radius:var(--r3);font-size:14px;font-weight:700;font-family:var(--fh);cursor:pointer">
    ยืนยัน PIN ใหม่
   </button>
  </div>`;
 document.body.appendChild(overlay);
}

async function submitForcePinChange(empId){
 const newPin = document.getElementById('forcePinNew').value.trim();
 const confirm = document.getElementById('forcePinConfirm').value.trim();
 const errEl = document.getElementById('forcePinError');
 errEl.textContent='';
 // ─── Brute Force Check ───────────────────────
 const fpFail = _forcePinFailMap[empId] || {count:0, lockedUntil:0};
 if(Date.now() < fpFail.lockedUntil){
   const secsLeft = Math.ceil((fpFail.lockedUntil - Date.now()) / 1000);
   const mins = Math.floor(secsLeft/60), secs = secsLeft%60;
   errEl.textContent = `ลองผิดบ่อยเกินไป กรุณารอ ${mins}:${String(secs).padStart(2,'0')} นาที`;
   return;
 }
 if(!newPin || newPin.length !== 4){
   fpFail.count = (fpFail.count||0) + 1;
   _forcePinFailMap[empId] = fpFail;
   if(fpFail.count >= LOGIN_MAX_FAIL){
     fpFail.lockedUntil = Date.now() + LOGIN_LOCK_MS;
     errEl.textContent = 'ลองผิดหลายครั้งเกินไป บัญชีถูกล็อค 5 นาที';
   } else {
     errEl.textContent = `PIN ต้องมี 4 หลัก (เหลือ ${LOGIN_MAX_FAIL - fpFail.count} ครั้ง)`;
   }
   return;
 }
 if(newPin !== confirm){
   fpFail.count = (fpFail.count||0) + 1;
   _forcePinFailMap[empId] = fpFail;
   if(fpFail.count >= LOGIN_MAX_FAIL){
     fpFail.lockedUntil = Date.now() + LOGIN_LOCK_MS;
     errEl.textContent = 'ลองผิดหลายครั้งเกินไป บัญชีถูกล็อค 5 นาที';
   } else {
     errEl.textContent = `PIN ไม่ตรงกัน (เหลือ ${LOGIN_MAX_FAIL - fpFail.count} ครั้ง)`;
   }
   return;
 }
 // reset fail counter
 _forcePinFailMap[empId] = {count:0, lockedUntil:0};
 const emp = DB.employees.find(e=>String(e.id)===String(empId));
 if(!emp){ errEl.textContent='ไม่พบพนักงาน'; return; }
 emp.pin = await hashPin(newPin);
 emp.mustChangePin = false;
 saveLocal();
 scheduleSync();
 // ลบ overlay
 const overlay = document.getElementById('forcePinOverlay');
 if(overlay) overlay.remove();
 // เข้าระบบ
 currentOperator={id:emp.id,name:emp.name,role:emp.role};
 lastOperator=currentOperator;
 updateDrawerForRole();
 goPage('order');
 renderOrder();
 toast('เปลี่ยน PIN สำเร็จ! ยินดีต้อนรับ '+emp.name);
 addAudit('login','เปลี่ยน PIN บังคับ','พนักงาน '+emp.id+' / '+emp.name+' เปลี่ยน PIN ใหม่สำเร็จ','','rgba(43,94,167,.1)','medium',emp);
 updateDrawerUser();
}

function loginPinReset(){
 loginPin='';
 updateLoginDots();
 // shake animation
 const card=document.getElementById('loginNumpad');
 if(card){card.style.transition='transform .1s';card.style.transform='translateX(8px)';setTimeout(()=>{card.style.transform='translateX(-8px)';setTimeout(()=>{card.style.transform='';},100);},100);}
}
function updateDrawerUser(){
 const el=document.getElementById('drawerUserInfo');
 if(el&&currentOperator) el.textContent=currentOperator.id+' · '+currentOperator.name;
 const topEl=document.getElementById('topEmpInfo');
 if(topEl&&currentOperator){
 topEl.textContent=currentOperator.id+' '+currentOperator.name;
 topEl.style.display='block';
 }
 const btn=document.getElementById('topRefreshBtn');
 if(btn) btn.style.display=currentOperator?'flex':'none';
}
async function manualSync(){
 const icon=document.getElementById('topRefreshIcon');
 const btn=document.getElementById('topRefreshBtn');
 if(!isOnline){toast('ออฟไลน์ ไม่สามารถรีเฟรชได้');return;}
 if(icon) icon.style.animation='spin 0.8s linear infinite';
 if(btn) btn.style.pointerEvents='none';
 const ok = await loadFromSheet(); // ✅ delegate ให้ loadFromSheet ทำทั้งหมด
 if(ok){
   const ing=DB.ingredients.length, pkg=DB.packages.length, eq=DB.equipment.length;
   toast('รีเฟรชแล้ว ✓  วัตถุดิบ '+ing+' / บรรจุ '+pkg+' / อุปกรณ์ '+eq);
 } else {
   toast('รีเฟรชไม่สำเร็จ ลองใหม่อีกครั้ง');
 }
 if(icon) icon.style.animation='';
 if(btn) btn.style.pointerEvents='auto';
}
function logoutUser(){
 currentOperator=null;
 loginPin='';
 document.getElementById('loginEmpId').value='';
 document.getElementById('loginNamePreview').textContent='—';
 document.getElementById('loginNamePreview').style.color='var(--t4)';
 document.getElementById('loginError').textContent='';
 updateLoginDots();
 document.getElementById('loginScreen').classList.remove('hidden');
 closeDrawer();
}

/* MANAGER GATE */
let mgrSession = null; // {emp, expiry(timestamp)}
const MGR_TIMEOUT = 10 * 60 * 1000; // 10 นาที

// หน้าที่ต้องการสิทธิ์ manager (ยกเว้น order, sales)
const PROTECTED_PAGES = ['promo','manage','report','stores','bills','audit','staff-mgmt','optsets','custom','app-settings'];

function isMgrActive(){
 return mgrSession && Date.now() < mgrSession.expiry;
}

function mgrGate(targetPage){
 // ถ้า session ยังมีอยู่ → เข้าเลย
 if(isMgrActive()){
 _goPageDirect(targetPage);
 return;
 }
 // แสดง overlay gate
 document.getElementById('mgrGateTarget').value = targetPage;
 document.getElementById('mgrGateError').textContent = '';
 document.getElementById('mgrGateEmpId').value = '';
 document.getElementById('mgrGatePin').value = '';
 document.getElementById('mgrGateEmpName').textContent = '';
 document.getElementById('mgrGateOverlay').classList.add('open');
 setTimeout(()=>document.getElementById('mgrGateEmpId').focus(), 250);
}

function mgrGateLookup(){
 const id = document.getElementById('mgrGateEmpId').value.trim().toUpperCase();
 const emp = DB.employees.find(e=>String(e.id)===String(id));
 const el = document.getElementById('mgrGateEmpName');
 if(emp && emp.role==='manager'){ el.textContent=' '+emp.name; el.style.color='var(--green)'; }
 else if(emp){ el.textContent=' '+emp.name+' (ไม่มีสิทธิ์ Manager)'; el.style.color='var(--gold)'; }
 else if(id.length>=2){ el.textContent='ไม่พบรหัสนี้'; el.style.color='var(--red)'; }
 else { el.textContent=''; }
 document.getElementById('mgrGatePin').value='';
}

async function mgrGateSubmit(){
 const id = document.getElementById('mgrGateEmpId').value.trim().toUpperCase();
 const pin = document.getElementById('mgrGatePin').value.trim();
 const errEl = document.getElementById('mgrGateError');
 const emp = DB.employees.find(e=>String(e.id)===String(id));
 if(!emp){ errEl.textContent='ไม่พบรหัสพนักงาน'; shakeGate(); return; }
 if(emp.role!=='manager'){ errEl.textContent=emp.name+' ไม่มีสิทธิ์ผู้จัดการ'; shakeGate(); return; }
 // ─── Brute Force Check ───────────────────────
 const mgrFail = _mgrFailMap[id] || {count:0, lockedUntil:0};
 if(Date.now() < mgrFail.lockedUntil){
   const secsLeft = Math.ceil((mgrFail.lockedUntil - Date.now()) / 1000);
   const mins = Math.floor(secsLeft/60), secs = secsLeft%60;
   errEl.textContent = `บัญชีถูกล็อค กรุณารอ ${mins}:${String(secs).padStart(2,'0')} นาที`;
   shakeGate(); return;
 }
 const pinHash = await hashPin(pin);
 if(pinHash !== emp.pin){
   mgrFail.count = (mgrFail.count||0) + 1;
   _mgrFailMap[id] = mgrFail;
   const remaining = LOGIN_MAX_FAIL - mgrFail.count;
   if(remaining <= 0){
     mgrFail.lockedUntil = Date.now() + LOGIN_LOCK_MS;
     _mgrFailMap[id] = mgrFail;
     errEl.textContent = 'กรอก PIN ผิดหลายครั้งเกินไป บัญชีถูกล็อค 5 นาที';
     addAudit('security','Manager Gate ถูกล็อค','กรอก PIN ผิด 5 ครั้ง: '+id,'','rgba(217,79,68,.1)','high',emp);
   } else {
     errEl.textContent = `รหัส PIN ไม่ถูกต้อง (เหลือ ${remaining} ครั้ง)`;
   }
   shakeGate(); return;
 }
 // success — reset fail counter
 _mgrFailMap[id] = {count:0, lockedUntil:0};
 mgrSession = {emp, expiry: Date.now()+MGR_TIMEOUT};
 document.getElementById('mgrGateOverlay').classList.remove('open');
 const target = document.getElementById('mgrGateTarget').value;
 addAudit('mgr_access','เข้าหน้าจัดการ','Manager: '+emp.name+' → '+target,'','rgba(43,94,167,.08)','low',emp);
 updateMgrBadge();
 _goPageDirect(target);
 toast('ยินดีต้อนรับ '+emp.name+' เข้าสู่โหมด Manager (10 นาที)');
}

function closeMgrGate(){
 document.getElementById('mgrGateOverlay').classList.remove('open');
}

function shakeGate(){
 const el=document.getElementById('mgrGateCard');
 el.style.transition='transform .08s';
 el.style.transform='translateX(8px)';
 setTimeout(()=>{el.style.transform='translateX(-8px)';setTimeout(()=>{el.style.transform='';},80);},80);
}

function mgrLogout(){
 mgrSession=null;
 updateMgrBadge();
 goPage('order');
 toast('ออกจากโหมด Manager แล้ว');
}

function updateMgrBadge(){
 const badge = document.getElementById('mgrSessionBadge');
 if(!badge) return;
 if(isMgrActive()){
 badge.style.display='flex';
 badge.querySelector('#mgrBadgeName').textContent = mgrSession.emp.name;
 // countdown
 clearInterval(badge._timer);
 badge._timer = setInterval(()=>{
 const left = Math.max(0, mgrSession.expiry - Date.now());
 const m = Math.floor(left/60000), s = Math.floor((left%60000)/1000);
 const timeEl = badge.querySelector('#mgrBadgeTime');
 if(timeEl) timeEl.textContent = m+':'+(s<10?'0':'')+s;
 if(left<=0){ clearInterval(badge._timer); mgrLogout(); }
 }, 1000);
 } else {
 badge.style.display='none';
 clearInterval(badge._timer);
 }
}

// override goPage ให้ตรวจสิทธิ์
// หน้าที่ซ่อน nav-bar (ล่าง) + ใช้ BAB แทน
const NO_NAV_PAGES = ['promo','manage','stores','staff-mgmt'];
// หน้าที่ซ่อน nav-bar ไม่แสดง BAB ด้วย
const HIDE_NAV_PAGES = ['bills','audit','report'];
// map page → BAB id
const PAGE_BAB = {promo:'bab-promo',manage:'bab-manage',stores:'bab-stores','staff-mgmt':'bab-staff'};

function _goPageDirect(p){
 currentPage = p;
 // ซ่อน/แสดง pages
 document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
 const pgEl = document.getElementById('pg-'+p);
 if(pgEl) pgEl.classList.add('active');
 // nav-it active
 document.querySelectorAll('.nav-it').forEach(el => el.classList.remove('active'));
 const navEl = document.getElementById('nav-'+p);
 if(navEl) navEl.classList.add('active');
 // drawer active
 document.querySelectorAll('.drawer-item').forEach(el => el.classList.remove('active'));
 const dnavEl = document.getElementById('dnav-'+p);
 if(dnavEl) dnavEl.classList.add('active');
 // nav-bar และ BABs
 const navBar = document.querySelector('.nav-bar');
 const cartFab = document.getElementById('cartFab');
 // ซ่อน BAB ทั้งหมดก่อน
 document.querySelectorAll('.bottom-action-bar').forEach(b=>b.classList.remove('show'));
 if(NO_NAV_PAGES.includes(p)){
   if(navBar) navBar.style.display='none';
   if(cartFab) cartFab.style.display='none';
   const bab=document.getElementById(PAGE_BAB[p]);
   if(bab) bab.classList.add('show');
 } else if(HIDE_NAV_PAGES.includes(p)){
   if(navBar) navBar.style.display='none';
   if(cartFab) cartFab.style.display='none';
 } else {
   if(navBar) navBar.style.display='';
   if(cartFab) cartFab.style.display='';
 }
 // render
 if(p==='order') renderOrder();
 if(p==='manage') renderManage(mgCat||'all');
 if(p==='promo') renderPromos('all');
 if(p==='report') renderReport(reportDays||1);
 if(p==='stores') renderStores(storeTab||'ingredient');
 if(p==='sales') renderSalesToday();
 if(p==='bills') renderBillManagement('today');
 if(p==='audit') renderAuditLog(auditFilter||'all');
 if(p==='staff-mgmt') renderStaffMgmt();
 if(p==='custom') renderCustomMgr();
 if(p==='optsets') renderOptionSets();
 if(p==='app-settings') renderAppSettings();
}


// ════════════════════════════════════════════════
// EMERGENCY RECOVERY SYSTEM
// ════════════════════════════════════════════════
let _recoveryOTP = null;      // OTP 6 หลัก (เก็บใน memory)
let _recoveryOTPExp = 0;      // expiry timestamp
let _recoveryTargetId = null; // empId ที่จะ reset
let _recoveryOTPAttempts = 0; // นับครั้งที่กรอก OTP ผิด
const OTP_MAX_ATTEMPTS = 5;   // ล็อคหลังผิด 5 ครั้ง

// ─── Brute Force — PIN Login ───────────────────
// key: empId → { count, lockedUntil }
const _loginFailMap = {};
const LOGIN_MAX_FAIL  = 5;    // ผิดได้สูงสุด 5 ครั้ง
const LOGIN_LOCK_MS   = 5 * 60 * 1000; // ล็อค 5 นาที
const _mgrFailMap = {};       // Brute Force สำหรับ Manager Gate
const _forcePinFailMap = {};  // Brute Force สำหรับ Force PIN Change

// ════════════════════════════════════════════════
// PIN HASHING — Web Crypto API (SHA-256)
// ════════════════════════════════════════════════
const PIN_SALT = 'POS_APP_SALT_2025'; // fixed salt per app instance

async function hashPin(pin){
  const msgBuffer = new TextEncoder().encode(PIN_SALT + String(pin));
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2,'0')).join('');
}

// Migration helper — ตรวจว่า pin เป็น hash แล้วหรือยัง (hash = 64 hex chars)
function isHashed(pin){ return typeof pin === 'string' && /^[0-9a-f]{64}$/.test(pin); }

// Migrate existing plain-text PINs → hashed (run once on load)
async function migratePins(){
  let changed = false;
  for(const emp of DB.employees){
    const pinStr = String(emp.pin ?? "");
    if(pinStr && !isHashed(pinStr)){
      emp.pin = await hashPin(pinStr);
      changed = true;
    }
  }
  if(changed){ saveLocal(); console.log('[POS] PIN migration done'); }
}

function migrateSizes(){
  // แปลง S/M/L → 200ml/1000ml ให้เมนูเก่า
  const MAP = {'S':'200ml','M':'200ml','L':'1000ml'};
  // แปลง optionSets.items string → object ถ้ายังเป็น string อยู่
  if(DB.optionSets){
    Object.keys(DB.optionSets).forEach(k=>{
      const set = DB.optionSets[k];
      if(set&&set.items){
        set.items = set.items.map(i=> typeof i==='string' ? {label:i,price:0} : i);
      }
    });
  }
  let changed = false;
  for(const m of DB.menus){
    if(!m.sizes || !m.sizes.length){ m.sizes=['200ml']; changed=true; continue; }
    const newSizes = [...new Set(m.sizes.map(s => MAP[s]||s))];
    if(JSON.stringify(newSizes) !== JSON.stringify(m.sizes)){
      m.sizes = newSizes; changed = true;
    }
  }
  if(changed){ saveLocal(); console.log('[POS] Size migration done'); }
}

function maskEmail(email){
  if(!email) return '';
  const [user, domain] = email.split('@');
  if(!domain) return email;
  const masked = user.length <= 2 ? user[0]+'***' : user.slice(0,2)+'***'+user.slice(-1);
  return masked + '@' + domain;
}

function updateRecoveryEmailHint(){
  const selEl   = document.getElementById('recoveryEmpSel');
  const hintEl  = document.getElementById('recoveryEmailHint');
  const noEmailEl = document.getElementById('recoveryNoEmail');
  const sendBtn = document.getElementById('sendOtpBtn');
  // null guard — modal อาจยังไม่ถูก render
  if(!selEl || !hintEl || !noEmailEl || !sendBtn) return;
  const empId = selEl.value;
  const emp = DB.employees.find(e=>String(e.id)===String(empId));
  if(emp && emp.email){
    hintEl.style.display  = 'flex';
    noEmailEl.style.display = 'none';
    const maskedEl = document.getElementById('recoveryEmailMasked');
    if(maskedEl) maskedEl.textContent = maskEmail(emp.email);
    sendBtn.disabled = false;
  } else {
    hintEl.style.display  = 'none';
    noEmailEl.style.display = 'block';
    sendBtn.disabled = true;
  }
}

function goRecoveryStep1(){
  document.getElementById('recoveryStep1').style.display='block';
  document.getElementById('recoveryStep2').style.display='none';
  document.getElementById('recoveryStep3').style.display='none';
  document.getElementById('recoveryOtpInput').value='';
  document.getElementById('recoveryOtpError').textContent='';
}

async function sendRecoveryOTP(){
  const errEl = document.getElementById('recoveryError');
  errEl.textContent='';
  const empId = document.getElementById('recoveryEmpSel').value;
  const emp = DB.employees.find(e=>String(e.id)===String(empId));
  if(!emp||!emp.email){ errEl.textContent='ไม่พบ Email ของ Manager นี้'; return; }

  // Generate OTP 6 หลัก
  const otp = String(Math.floor(100000+Math.random()*900000));
  _recoveryOTP = otp;
  _recoveryOTPAttempts = 0; // reset นับครั้ง
  document.getElementById('recoveryOtpInput').disabled = false;
  _recoveryOTPExp = Date.now() + 10*60*1000; // 10 นาที
  _recoveryTargetId = empId;

  // ส่งผ่าน GAS
  const btn = document.getElementById('sendOtpBtn');
  btn.disabled=true;
  btn.innerHTML='<span class="material-symbols-outlined" style="font-size:16px;vertical-align:-3px;animation:spin 1s linear infinite">progress_activity</span> กำลังส่ง...';

  try {
    const res = await fetch(SCRIPT_URL, { // POST to worker, action in body
      method:'POST',
      mode:'cors',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        action: 'sendOTP',
        email: emp.email,
        empName: emp.name,
        otp: otp,
        shopName: DB.shopName
      })
    });
    const data = await res.json();
    if(data.status==='ok'){
      // ไป Step 2
      document.getElementById('recoveryStep1').style.display='none';
      document.getElementById('recoveryStep2').style.display='block';
      document.getElementById('recoveryOtpSentTo').textContent = 'ส่งไปที่ '+maskEmail(emp.email);
    } else if(data.status==='rateLimit'){
      errEl.textContent='⚠️ ส่ง OTP บ่อยเกินไป กรุณารอ 10 นาที แล้วลองใหม่';
    } else {
      errEl.textContent='ส่ง Email ไม่สำเร็จ: '+(data.msg||'ลองใหม่');
    }
  } catch(e){
    // Fallback: GAS ส่ง Email ไม่ได้ — แสดง OTP บนหน้าจอให้ Manager เห็นโดยตรง
    showOtpFallbackAlert(otp, emp);
  } finally {
    btn.disabled=false;
    btn.innerHTML='<span class="material-symbols-outlined" style="font-size:16px;vertical-align:-3px">send</span> ส่ง OTP ไปที่ Email';
  }
}

function showOtpFallbackAlert(otp, emp){
  // แสดง OTP บนหน้าจอเมื่อ GAS ส่ง Email ไม่ได้
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.85);display:flex;align-items:center;justify-content:center;padding:20px';
  overlay.innerHTML = `
   <div style="background:var(--bg);border-radius:var(--r4);padding:24px;max-width:320px;width:100%;text-align:center">
    <span class="mi" style="font-size:40px;color:var(--gold)">wifi_off</span>
    <div style="font-size:14px;font-weight:800;color:var(--red);margin:8px 0 4px;font-family:var(--fh)">⚠️ ส่ง Email ไม่สำเร็จ</div>
    <div style="font-size:11px;color:var(--t4);margin-bottom:16px">GAS ส่ง Email ไม่ได้ — แสดง OTP ชั่วคราวบนหน้าจอนี้แทน<br>ให้ Manager อ่าน OTP นี้แล้วบอก ${emp.name} โดยตรง</div>
    <div style="background:var(--bg-dk);border:2px dashed var(--gold);border-radius:var(--r3);padding:14px;margin-bottom:12px">
     <div style="font-size:11px;color:var(--t4);margin-bottom:4px">OTP ชั่วคราว</div>
     <div style="font-size:36px;font-weight:900;font-family:monospace;letter-spacing:10px;color:var(--gold)">${otp}</div>
     <div style="font-size:10px;color:var(--t5);margin-top:4px">หมดอายุใน 10 นาที</div>
    </div>
    <div style="font-size:10px;color:var(--red);margin-bottom:16px;font-weight:600">⚠️ ห้ามให้ผู้อื่นเห็น OTP นี้ — ปิดทันทีหลังใช้งาน</div>
    <button onclick="this.closest('div[style*=fixed]').remove();
      document.getElementById('recoveryStep1').style.display='none';
      document.getElementById('recoveryStep2').style.display='block';
      document.getElementById('recoveryOtpSentTo').textContent='OTP บนหน้าจอ (Email ไม่สำเร็จ)';"
     style="width:100%;padding:12px;background:var(--esp);color:#fff;border:none;border-radius:var(--r3);font-size:14px;font-weight:700;font-family:var(--fh);cursor:pointer">
     รับทราบแล้ว ปิด
    </button>
   </div>`;
  document.body.appendChild(overlay);
}

function verifyRecoveryOTP(){
  const errEl = document.getElementById('recoveryOtpError');
  errEl.textContent='';
  const input = document.getElementById('recoveryOtpInput').value.trim();
  if(!input){ errEl.textContent='กรุณากรอก OTP'; return; }
  // ─── OTP Attempt Limit ────────────────────────
  if(_recoveryOTPAttempts >= OTP_MAX_ATTEMPTS){
    errEl.textContent='กรอก OTP ผิดเกินกำหนด กรุณากดส่ง OTP ใหม่';
    document.getElementById('recoveryOtpInput').disabled = true;
    return;
  }
  if(Date.now() > _recoveryOTPExp){ errEl.textContent='OTP หมดอายุแล้ว กด "ส่ง OTP ใหม่"'; return; }
  if(input !== _recoveryOTP){
    _recoveryOTPAttempts++;
    const left = OTP_MAX_ATTEMPTS - _recoveryOTPAttempts;
    const inp=document.getElementById('recoveryOtpInput');
    if(left <= 0){
      errEl.textContent='OTP ไม่ถูกต้อง — ครบจำนวนครั้ง กรุณาขอ OTP ใหม่';
      inp.disabled = true;
    } else {
      errEl.textContent=`OTP ไม่ถูกต้อง (เหลือ ${left} ครั้ง)`;
    }
    inp.style.animation='shake .3s'; setTimeout(()=>inp.style.animation='',300);
    return; 
  }
  // ถูกต้อง → Step 3
  const emp = DB.employees.find(e=>String(e.id)===String(_recoveryTargetId));
  document.getElementById('recoveryEmpName').textContent = emp ? emp.name+' ('+emp.id+')' : '';
  document.getElementById('recoveryStep2').style.display='none';
  document.getElementById('recoveryStep3').style.display='block';
}

function openRecoveryModal(){
 const sel = document.getElementById('recoveryEmpSel');
 const managers = DB.employees.filter(e=>e.role==='manager');
 if(!managers.length){ toast('ไม่มี Manager ในระบบ'); return; }
 sel.innerHTML = managers.map(e=>`<option value="${e.id}">${e.name} (${e.id})</option>`).join('');
 // reset all steps
 document.getElementById('recoveryStep1').style.display='block';
 document.getElementById('recoveryStep2').style.display='none';
 document.getElementById('recoveryStep3').style.display='none';
 document.getElementById('recoveryError').textContent='';
 document.getElementById('recoveryOtpInput').value='';
 document.getElementById('recoveryOtpError').textContent='';
 document.getElementById('recoveryNewPin').value='';
 document.getElementById('recoveryNewPin2').value='';
 document.getElementById('recoveryPinError').textContent='';
 _recoveryOTP=null; _recoveryOTPExp=0; _recoveryTargetId=null; _recoveryOTPAttempts=0;
 updateRecoveryEmailHint();
 openModal('modal-recovery');
}

// verifyRecoveryCode replaced by OTP system

async function doRecoveryReset(){
 const empId = _recoveryTargetId || document.getElementById('recoveryEmpSel').value;
 const newPin = document.getElementById('recoveryNewPin').value.trim();
 const newPin2 = document.getElementById('recoveryNewPin2').value.trim();
 const errEl = document.getElementById('recoveryPinError');
 errEl.textContent='';
 if(!newPin || newPin.length!==4){ errEl.textContent='PIN ต้องมี 4 หลัก'; return; }
 if(newPin !== newPin2){ errEl.textContent='PIN ไม่ตรงกัน'; return; }
 const emp = DB.employees.find(e=>String(e.id)===String(empId));
 if(!emp){ errEl.textContent='ไม่พบพนักงาน'; return; }
 emp.pin = await hashPin(newPin);
 addAudit('recovery','Emergency PIN Reset','Reset PIN: '+emp.name+' ('+emp.id+')','','rgba(217,79,68,.08)','high',emp);
 scheduleSync();
 closeModal('modal-recovery');
 toast('Reset PIN สำเร็จ!');
}