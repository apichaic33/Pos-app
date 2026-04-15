const SESSION_ID = Date.now().toString(36).toUpperCase(); // ประจำ session นี้
let currentOperator = null; // {id, name} ของพนักงานที่ login ใน session

function addAudit(type, action, detail, icon='•', bg='rgba(176,154,133,.1)', severity='low', empOverride=null){
 const emp = empOverride || currentOperator;
 DB.auditLog.unshift({
 id: 'AUD-TMP-'+Date.now(),
 type, action, detail, icon, bg, severity,
 empId: emp ? emp.id : '—',
 empName: emp ? emp.name : 'ไม่ระบุ',
 sessionId: SESSION_ID,
 ts: Date.now()
 });
 if(DB.auditLog.length > 1000) DB.auditLog = DB.auditLog.slice(0, 1000);
}

/* shortcut helpers */
const AUD = {
 itemAdd: (name,size,qty,price) => addAudit('item_add', `เพิ่มเมนู`, `${name} (${size}) x${qty} · ฿${((price||0)*(qty||0)).toLocaleString()}`, '', 'rgba(45,122,79,.12)', 'low'),
 itemEdit: (name,size,from,to,price) => addAudit('item_edit', `แก้จำนวน`, `${name} (${size}) ${from}→${to} · ฿${((price||0)*(to||0)).toLocaleString()}`, '', 'rgba(184,134,11,.11)', 'low'),
 itemDel: (name,size,qty,price) => addAudit('item_remove', `ลบเมนูออก`, `${name} (${size}) x${qty} · ฿${((price||0)*(qty||0)).toLocaleString()}`, '', 'rgba(184,50,40,.12)', 'med'),
 orderNew: (id,total,items) => addAudit('order_confirm', `ยืนยันบิล`, `#${id} · ${items} รายการ · ฿${(total||0).toLocaleString()}`, '', 'rgba(45,122,79,.12)', 'low'),
 orderVoid: (id,reason,by) => addAudit('order_void', `ยกเลิกบิล`, `#${id} · เหตุผล: ${reason}`, '', 'rgba(184,50,40,.14)', 'high', by),
 voidReq: (id,reason) => addAudit('void_request', `ขอยกเลิกบิล`, `#${id} · เหตุผล: ${reason}`, '', 'rgba(184,134,11,.12)', 'med'),
 voidApprove:(id,by) => addAudit('void_approve', `อนุมัติยกเลิกบิล`, `#${id}`, '', 'rgba(184,50,40,.14)', 'high', by),
 voidReject: (id,by) => addAudit('void_reject', `ปฏิเสธยกเลิกบิล`, `#${id}`, '', 'rgba(184,50,40,.12)', 'med', by),
 preVoid: (summary) => addAudit('order_void', `ยกเลิก (ก่อนบันทึก)`, `รายการ: ${summary}`, '', 'rgba(184,50,40,.14)', 'high'),
 welfare: (name,qty,empId,empName,type) => addAudit('welfare', `สวัสดิการ`, `${name} x${qty} · ${type}`, '', 'rgba(43,94,167,.12)', 'low', {id:empId,name:empName}),
 login: (emp) => addAudit('login', `เข้าสู่ระบบ`, `Session ${SESSION_ID}`, '', 'rgba(43,94,167,.12)', 'low', emp),
 approvalFail: (id,who) => addAudit('auth_fail', `รหัสอนุมัติผิด`, `ใช้รหัส: ${who} · ไม่มีในระบบหรือไม่มีสิทธิ์`, '', 'rgba(184,50,40,.14)', 'high'),
};

let auditFilter='all';
function switchAuditFilter(btn, filter){
 const bar=btn.closest('.tab-bar')||btn.closest('.audit-tab-bar')||btn.parentElement;
 bar.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
 btn.classList.add('active'); auditFilter=filter; renderAuditLog(filter);
}
function renderAuditLog(filter){
 const FILTER = {
 order: e=>['order_confirm'].includes(e.type),
 void: e=>['order_void','void_request','void_approve','void_reject'].includes(e.type),
 edit: e=>['item_add','item_edit','item_remove','welfare'].includes(e.type),
 auth: e=>['login','auth_fail','void_approve','void_reject'].includes(e.type),
 };
 const list = filter==='all' ? DB.auditLog : DB.auditLog.filter(FILTER[filter]||(() => true));
 document.getElementById('auditSub').textContent = `${list.length} รายการ`;
 const el = document.getElementById('auditList');
 if(!list.length){
 el.innerHTML='<div class="empty-state"><div class="e-icon"><span class="mi" style="font-size:40px;opacity:.4">list_alt</span></div><div class="e-title">ยังไม่มีประวัติ</div></div>'; return;
 }
 el.innerHTML = list.map(e=>{
 const d = new Date(e.ts);
 const time = d.toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
 const date = d.toLocaleDateString('th-TH',{day:'numeric',month:'short'});
 const sevClass = e.severity==='high' ? 'audit-severity-high' : e.severity==='med' ? 'audit-severity-med' : '';
 return `
 <div class="audit-item ${sevClass}"> <div class="audit-icon" style="background:${e.bg||'rgba(176,154,133,.1)'}"> <span>${e.icon||'•'}</span> </div> <div class="audit-info"> <div class="audit-action">${e.action}</div> <div class="audit-detail">${e.detail||'—'}</div> <div class="audit-emp"> ${e.empName||'—'} ${e.empId&&e.empId!=='—'?`(${e.empId})`:''}
 <span style="opacity:.5;margin:0 3px">·</span> <span style="opacity:.6">${e.sessionId||''}</span> </div> </div> <div class="audit-time">${time}<br><span style="font-size:8px">${date}</span></div> </div>`;
 }).join('');
}

/* 
 APPROVAL SYSTEM — Employee ID (ไม่ใช่ PIN)
 mode: 'manager' = เฉพาะ role:manager
 'any' = พนักงานคนใดก็ได้
 */
let approvalCallback = null;
let approvalMode = 'manager';

function openPinModal(title, sub, mode, callback){
 approvalCallback = callback;
 approvalMode = mode;
 document.getElementById('pinTitle').textContent = title;
 document.getElementById('pinSub').textContent = sub + (mode==='manager' ? '\n(ต้องเป็นรหัสผู้จัดการ)' : '');
 document.getElementById('pinError').textContent = '';
 document.getElementById('approvalEmpId').value = '';
 document.getElementById('approvalEmpName').textContent = '';
 _approvalPin=''; updateApprovalDots();
 document.getElementById('pinOverlay').classList.add('open');
 setTimeout(()=>document.getElementById('approvalEmpId').focus(), 200);
}
function closePinModal(){
 document.getElementById('pinOverlay').classList.remove('open');
 approvalCallback = null;
}
function clearApprovalError(){
 document.getElementById('pinError').textContent = '';
 // live name lookup while typing
 const id = document.getElementById('approvalEmpId').value.trim().toUpperCase();
 const emp = DB.employees.find(e=>String(e.id)===String(id));
 const nameEl = document.getElementById('approvalEmpName');
 if(emp){ nameEl.textContent = ' '+emp.name; nameEl.style.color='var(--green)'; }
 else if(id.length>=2){ nameEl.textContent = 'ไม่พบรหัสนี้'; nameEl.style.color='var(--t5)'; }
 else { nameEl.textContent = ''; }
}
let _approvalPin = '';
function approvalPinKey(k){
 if(_approvalPin.length>=4) return;
 _approvalPin += k;
 updateApprovalDots();
 if(_approvalPin.length===4) setTimeout(submitApproval, 200);
}
function approvalPinClear(){
 _approvalPin = _approvalPin.slice(0,-1);
 updateApprovalDots();
}
function updateApprovalDots(){
 for(let i=0;i<4;i++){
  const d=document.getElementById('apd'+i);
  if(d) d.classList.toggle('filled', i<_approvalPin.length);
 }
}
function submitApproval(){
 const id = document.getElementById('approvalEmpId').value.trim().toUpperCase();
 const emp = DB.employees.find(e=>String(e.id)===String(id));
 const errEl = document.getElementById('pinError');
 if(!emp){
  errEl.textContent = 'ไม่พบรหัสพนักงาน กรุณาลองใหม่';
  AUD.approvalFail('—', id);
  _approvalPin=''; updateApprovalDots(); return;
 }
 if(approvalMode==='manager' && emp.role!=='manager'){
  errEl.textContent = `${emp.name} ไม่มีสิทธิ์ผู้จัดการ`;
  AUD.approvalFail('—', `${id} (${emp.name}) ไม่ใช่ผู้จัดการ`);
  _approvalPin=''; updateApprovalDots(); return;
 }
 if(!_approvalPin || _approvalPin.length!==4){
  errEl.textContent = 'กรุณากรอก PIN 4 หลัก';
  return;
 }
 const expectedPin = isHashed(String(emp.pin||'')) ? String(emp.pin) : null;
 hashPin(_approvalPin).then(async inputHash=>{
  // ถ้า pin ยังเป็น plain text → hash แล้วเปรียบเทียบ
  let match = false;
  if(expectedPin){
   match = (inputHash === expectedPin);
  } else {
   // plain text pin — hash it first then compare
   const plainHash = await hashPin(String(emp.pin||'1234'));
   match = (inputHash === plainHash);
  }
  if(!match){
   errEl.textContent = 'PIN ไม่ถูกต้อง';
   _approvalPin=''; updateApprovalDots(); return;
  }
  // success
  _approvalPin=''; updateApprovalDots();
  document.getElementById('pinOverlay').classList.remove('open');
  const cb = approvalCallback; approvalCallback = null;
  if(cb) cb(true, emp);
 });
}
// allow Enter key to submit
document.addEventListener('keydown', e=>{
 if(e.key==='Enter' && document.getElementById('pinOverlay').classList.contains('open')) submitApproval();
 if(e.key==='Escape' && document.getElementById('pinOverlay').classList.contains('open')) closePinModal();
});

/* 
 STAFF MANAGEMENT
 */
/* SETUP MODE */
function openSetupMode(){
 ['setupEmpId','setupName','setupPin','setupPinConfirm','setupShopName','setupShopSub']
 .forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
 document.getElementById('setupError').textContent='';
 // เปลี่ยน title ตาม context
 const titleEl = document.getElementById('setupModalTitle');
 if(titleEl) titleEl.textContent = DB.employees.length ? '<span class="mi" style="font-size:12px;vertical-align:-2px">settings</span> เพิ่ม Manager' : '⚙️ ตั้งค่าระบบครั้งแรก';
 // ซ่อน shopName fields ถ้ามีร้านอยู่แล้ว
 const shopFields = document.getElementById('setupShopFields');
 if(shopFields) shopFields.style.display = DB.employees.length ? 'none' : '';
 openModal('modal-setup');
}

async function submitSetup(){
 const id = document.getElementById('setupEmpId').value.trim().toUpperCase();
 const name = document.getElementById('setupName').value.trim();
 const pin = document.getElementById('setupPin').value.trim();
 const pin2 = document.getElementById('setupPinConfirm').value.trim();
 const shop = document.getElementById('setupShopName').value.trim();
 const sub = document.getElementById('setupShopSub').value.trim();
 const errEl = document.getElementById('setupError');
 errEl.textContent='';

 if(!id) { errEl.textContent='กรุณาใส่รหัสพนักงาน'; return; }
 if(!name){ errEl.textContent='กรุณาใส่ชื่อ'; return; }
 if(!pin || pin.length!==4){ errEl.textContent='PIN ต้องมี 4 หลัก'; return; }
 if(pin!==pin2){ errEl.textContent='PIN ไม่ตรงกัน'; return; }
 if(!DB.employees.length && !shop){ errEl.textContent='กรุณาใส่ชื่อร้าน'; return; }

 // บันทึก
 const setupEmail = (document.getElementById('setupEmail')||{}).value||'';
 const hashedPin = await hashPin(pin);
 DB.employees.push({id, name, role:'manager', pin:hashedPin, email:setupEmail});
 if(shop){ DB.shopName = shop; DB.shopSub = sub || shop; }

 closeModal('modal-setup');

 // ซ่อน hint + แสดง numpad คืนมา
 const hint   = document.getElementById('loginFirstRunHint');
 const numpad = document.getElementById('loginNumpad');
 const dots   = document.getElementById('loginPinDots');
 if(hint)   hint.style.display   = 'none';
 if(numpad) numpad.style.display = 'grid';
 if(dots)   dots.style.display   = 'flex';

 // pre-fill รหัสพนักงานที่เพิ่งสร้าง
 const empInput = document.getElementById('loginEmpId');
 if(empInput){ empInput.value = id; loginLookup(); }

 addAudit('setup','ตั้งค่าระบบครั้งแรก','สร้าง Manager: '+name+' ('+id+') · ร้าน: '+shop,'','rgba(43,94,167,.1)','high',{id,name,role:'manager'});
 scheduleSync();
 toast('ตั้งค่าสำเร็จ! กรุณากรอก PIN เพื่อเข้าระบบ');
}

let staffMgmtTab = 'list';
function renderStaffMgmt(tab){
 if(tab) staffMgmtTab=tab;
 const list = DB.employees;
 document.getElementById('staffMgmtSub').textContent = list.length+'คน';

 const tabBar = `<div class="tab-bar" style="margin-bottom:14px"> <button class="tab-btn ${staffMgmtTab==='list'?'active':''}" onclick="renderStaffMgmt('list')">รายชื่อ</button> <button class="tab-btn ${staffMgmtTab==='history'?'active':''}" onclick="renderStaffMgmt('history')">ประวัติเข้าระบบ</button> </div>`;

 if(staffMgmtTab==='history'){
 document.getElementById('staffMgmtContent').innerHTML = tabBar + renderStaffLoginHistory();
 return;
 }

 // TAB: รายชื่อ
 if(!list.length){
 document.getElementById('staffMgmtContent').innerHTML = tabBar +
 `<div class="empty-state"><div class="e-icon"><span class="mi" style="font-size:40px;opacity:.4">group</span></div><div class="e-title">ยังไม่มีพนักงาน</div><div class="e-sub">กดปุ่ม + เพิ่มพนักงานคนแรก</div></div>`;
 return;
 }
 const roleLabel={cashier:'แคชเชียร์',manager:'ผู้จัดการ'};
 const roleColor={cashier:'var(--t4)',manager:'var(--blue)'};

 // นับ login ล่าสุดของแต่ละคน
 const lastLogin = {};
 DB.auditLog.filter(a=>a.type==='login').forEach(a=>{
 if(a.empId && (!lastLogin[a.empId] || a.ts > lastLogin[a.empId])) lastLogin[a.empId]=a.ts;
 });

 document.getElementById('staffMgmtContent').innerHTML = tabBar + list.map(e=>{
 const last = lastLogin[e.id];
 const lastStr = last ? new Date(last).toLocaleString('th-TH',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : 'ยังไม่เคยเข้า';
 const loginCount = DB.auditLog.filter(a=>a.type==='login'&&a.empId===e.id).length;
 return `
 <div style="background:var(--bg);border-radius:var(--r3);box-shadow:var(--neu-out-xs);padding:12px 14px;margin-bottom:10px"> <div style="display:flex;align-items:center;gap:12px"> <div style="width:40px;height:40px;border-radius:50%;background:${e.role==='manager'?'var(--blue-lt)':'var(--bg-dk)'};display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0"><span style='font-family:"Material Symbols Outlined";font-size:20px;font-weight:normal;color:${e.role==="manager"?"var(--blue)":"var(--t3)"}'>${e.role==="manager"?"manage_accounts":"person"}</span>
 </div> <div style="flex:1;min-width:0"> <div style="font-size:13px;font-weight:700;color:var(--t1)">${e.name}</div> <div style="font-size:11px;color:var(--t4);margin-top:2px;display:flex;gap:6px;flex-wrap:wrap"> <span style="background:var(--bg-dk);border-radius:var(--rf);padding:1px 7px">${e.id}</span> <span style="color:${roleColor[e.role]};font-weight:600">${roleLabel[e.role]||e.role}</span> </div> </div> <div style="display:flex;gap:5px"> <button class="btn btn-secondary btn-xs" onclick="openStaffModal(String('${e.id}'))" title="แก้ไข" style="padding:6px 10px"><span style='font-family:"Material Symbols Outlined";font-size:14px;font-weight:normal'>edit</span></button> <button class="btn btn-danger btn-xs" onclick="deleteStaff('${e.id}')" title="ลบ" style="padding:6px 10px"><span style='font-family:"Material Symbols Outlined";font-size:14px;font-weight:normal'>delete</span></button> </div> </div> <div style="margin-top:8px;padding-top:8px;border-top:1px solid rgba(176,154,133,.15);display:flex;justify-content:space-between;align-items:center"> <div style="font-size:10px;color:var(--t4)"> <span> เข้าล่าสุด: <strong style="color:var(--t3)">${lastStr}</strong></span> </div> <div style="font-size:10px;color:var(--t4)"> เข้าระบบ <strong style="color:var(--t3)">${loginCount}</strong> ครั้ง
 <button onclick="viewStaffHistory('${e.id}')" style="margin-left:6px;font-size:9px;background:var(--bg-dk);border:none;border-radius:var(--rf);padding:2px 7px;cursor:pointer;color:var(--blue)">ดูประวัติ</button> </div> </div> </div>`;
 }).join('');
}

function renderStaffLoginHistory(filterEmpId, dateFrom, dateTo){
 let loginLogs = DB.auditLog.filter(a=> a.type==='login' && (!filterEmpId || String(a.empId)===String(filterEmpId)));
 if(dateFrom){ const from=new Date(dateFrom).setHours(0,0,0,0); loginLogs=loginLogs.filter(a=>a.ts>=from); }
 if(dateTo)  { const to  =new Date(dateTo).setHours(23,59,59,999); loginLogs=loginLogs.filter(a=>a.ts<=to); }
 loginLogs=loginLogs.slice(0,200);

 const empFilter = filterEmpId ? DB.employees.find(e=>String(e.id)===String(filterEmpId)) : null;
 const filterBadge = empFilter
 ? `<div style="display:flex;align-items:center;gap:8px;padding:8px 0 12px"> <span style="font-size:11px;font-weight:700;color:var(--blue)">${empFilter.name}</span> <button onclick="renderStaffMgmt('history')" style="font-size:9px;background:var(--bg-dk);border:none;border-radius:var(--rf);padding:2px 7px;cursor:pointer;color:var(--t3)">ล้างตัวกรอง</button> </div>` : '';

 const today=new Date().toISOString().slice(0,10);
 const defFrom=new Date(Date.now()-6*86400000).toISOString().slice(0,10);
 const dateFilter=`<div style="display:flex;gap:8px;margin-bottom:12px;align-items:center">
   <div style="flex:1"><div style="font-size:9px;color:var(--t4);margin-bottom:2px">จาก</div>
   <input type="date" id="histFrom" value="${dateFrom||defFrom}" style="width:100%;font-family:var(--fb);font-size:11px;padding:6px 8px;border-radius:var(--r2);border:1px solid var(--bg-dk);background:var(--bg)" onchange="applyHistFilter()"></div>
   <div style="flex:1"><div style="font-size:9px;color:var(--t4);margin-bottom:2px">ถึง</div>
   <input type="date" id="histTo" value="${dateTo||today}" style="width:100%;font-family:var(--fb);font-size:11px;padding:6px 8px;border-radius:var(--r2);border:1px solid var(--bg-dk);background:var(--bg)" onchange="applyHistFilter()"></div>
 </div>`;

 if(!loginLogs.length) return filterBadge + dateFilter +
 `<div class="empty-state"><div class="e-icon"><span class="mi" style="font-size:40px;opacity:.4">list_alt</span></div><div class="e-title">ยังไม่มีประวัติ</div></div>`;

 const rows = loginLogs.map(a=>{
 const emp = DB.employees.find(e=>String(e.id)===String(a.empId));
 const dt = new Date(a.ts).toLocaleString('th-TH',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
 return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(176,154,133,.12)"> <span style='font-family:"Material Symbols Outlined";font-size:18px;font-weight:normal;flex-shrink:0;color:${emp?.role==="manager"?"var(--blue)":"var(--t4)"}'>${emp?.role==="manager"?"manage_accounts":"person"}</span> <div style="flex:1"> <div style="font-size:12px;font-weight:600;color:var(--t1)">${a.empName||a.empId||'—'}</div> <div style="font-size:10px;color:var(--t4)">${a.empId||''}</div> </div> <div style="text-align:right;font-size:10px;color:var(--t4)">${dt}</div> </div>`;
 }).join('');

 return filterBadge + dateFilter + `<div style="padding:0 2px">${rows}</div>`;
}

function applyHistFilter(){
 const from=document.getElementById('histFrom')?.value;
 const to=document.getElementById('histTo')?.value;
 // หา filterEmpId จาก element ถ้ามี
 document.getElementById('staffMgmtContent').innerHTML =
   `<div class="tab-bar" style="margin-bottom:14px"> <button class="tab-btn" onclick="renderStaffMgmt('list')">รายชื่อ</button> <button class="tab-btn active" onclick="renderStaffMgmt('history')">ประวัติเข้าระบบ</button> </div>` +
   renderStaffLoginHistory(null, from, to);
}
function viewStaffHistory(empId){
 staffMgmtTab='history';
 document.getElementById('staffMgmtContent').innerHTML =
 `<div class="tab-bar" style="margin-bottom:14px"> <button class="tab-btn" onclick="renderStaffMgmt('list')">รายชื่อ</button> <button class="tab-btn active" onclick="renderStaffMgmt('history')">ประวัติเข้าระบบ</button> </div>` + renderStaffLoginHistory(empId);
}

function toggleResetPinForm(){
 const form = document.getElementById('empResetPinForm');
 const btn  = document.getElementById('empResetPinBtn');
 const isOpen = form.style.display !== 'none';
 form.style.display = isOpen ? 'none' : 'block';
 btn.style.background = isOpen ? 'var(--blue-lt)' : 'rgba(43,94,167,.18)';
 // reset ค่า inputs เมื่อปิด
 if(isOpen){
   document.getElementById('empPinNew').value='';
   document.getElementById('empPinNewConfirm').value='';
 }
}
function openStaffModal(editId){
 if(editId) editId=String(editId);
 const isEdit = !!editId;
 document.getElementById('empModalTitle').textContent = isEdit?'แก้ไขพนักงาน':'เพิ่มพนักงาน';
 document.getElementById('empEditId').value = editId||'';
 document.getElementById('empFormError').textContent='';
 document.getElementById('empPin').value='';
 document.getElementById('empPinConfirm').value='';
 const pn=document.getElementById('empPinNew'); if(pn) pn.value='';
 const pnc=document.getElementById('empPinNewConfirm'); if(pnc) pnc.value='';
 // Add mode: แสดง PIN inputs ปกติ
 // Edit mode: ซ่อน PIN inputs แสดงปุ่ม Reset PIN แทน
 document.getElementById('empPinAddSection').style.display = isEdit ? 'none' : 'block';
 document.getElementById('empResetSection').style.display  = isEdit ? 'block' : 'none';
 // ซ่อน reset form เสมอเมื่อเปิด modal
 const rf = document.getElementById('empResetPinForm');
 if(rf) rf.style.display='none';
 const rb = document.getElementById('empResetPinBtn');
 if(rb) rb.style.background='var(--blue-lt)';
 // toggle reset block ตาม role
 const rpr = document.getElementById('empRandomPinResult');
 if(rpr) { rpr.style.display='none'; }
 if(isEdit){
 const e=DB.employees.find(x=>String(x.id)===String(editId));if(!e)return;
 document.getElementById('empId').value=e.id;
 document.getElementById('empId').readOnly=true;
 document.getElementById('empName').value=e.name;
 document.getElementById('empRole').value=e.role;
 document.getElementById('empEmail').value=e.email||'';
 } else {
 document.getElementById('empId').value='';
 document.getElementById('empId').readOnly=false;
 document.getElementById('empName').value='';
 document.getElementById('empRole').value='cashier';
 document.getElementById('empEmail').value='';
 }
 toggleEmpEmailField();
 openModal('modal-emp');
}

function toggleEmpEmailField(){
  const role = document.getElementById('empRole').value;
  const emailGroup = document.getElementById('empEmailGroup');
  if(emailGroup) emailGroup.style.display = role === 'manager' ? 'flex' : 'none';
  if(role !== 'manager') {
    const empEmail = document.getElementById('empEmail');
    if(empEmail) empEmail.value = '';
  }
  // toggle reset PIN block ตาม role (เฉพาะ edit mode)
  const mgrBlock = document.getElementById('empResetMgrBlock');
  const staffBlock = document.getElementById('empResetStaffBlock');
  if(mgrBlock) mgrBlock.style.display = role === 'manager' ? 'block' : 'none';
  if(staffBlock) staffBlock.style.display = role !== 'manager' ? 'block' : 'none';
}

async function doRandomResetPin(){
  const editId = document.getElementById('empEditId').value;
  const emp = DB.employees.find(e=>String(e.id)===String(editId));
  if(!emp) return;
  // สุ่ม PIN 4 หลัก
  const randomPin = String(Math.floor(1000 + Math.random()*9000));
  emp.pin = await hashPin(randomPin);
  emp.mustChangePin = true; // บังคับเปลี่ยน PIN ตอน login ครั้งถัดไป
  saveLocal();
  scheduleSync();
  // แสดง PIN ชั่วคราวบนหน้าจอ
  document.getElementById('empRandomPinDisplay').textContent = randomPin;
  document.getElementById('empRandomPinResult').style.display = 'block';
  document.getElementById('empRandomResetBtn').style.background = 'rgba(43,94,167,.18)';
  addAudit('staff','Random PIN Reset','Reset PIN (random): '+emp.name+' ('+emp.id+')','','rgba(43,94,167,.08)','medium',emp);
  toast('สุ่ม PIN ใหม่ให้ '+emp.name+' แล้ว');
}

function saveStaff(){
 const editId = document.getElementById('empEditId').value;
 const isEdit = !!editId;
 const id = document.getElementById('empId').value.trim().toUpperCase();
 const name = document.getElementById('empName').value.trim();
 const role = document.getElementById('empRole').value;
 // ตรวจว่า reset form เปิดอยู่ไหม
 const resetFormOpen = isEdit && document.getElementById('empResetPinForm').style.display !== 'none';
 const pin = resetFormOpen ? document.getElementById('empPinNew').value.trim() : '';
 const pinConfirm = resetFormOpen ? document.getElementById('empPinNewConfirm').value.trim() : '';
 const errEl = document.getElementById('empFormError');
 errEl.textContent='';

 if(!id){errEl.textContent='กรุณาใส่รหัสพนักงาน';return;}
 if(!name){errEl.textContent='กรุณาใส่ชื่อ';return;}
 if(!isEdit && DB.employees.find(e=>String(e.id)===String(id))){errEl.textContent='รหัส '+id+'มีอยู่แล้ว';return;}
 if(!isEdit && !document.getElementById('empPin').value.trim()){errEl.textContent='กรุณากำหนด PIN';return;}
 if(!isEdit){
   const p=document.getElementById('empPin').value.trim();
   const pc=document.getElementById('empPinConfirm').value.trim();
   if(p.length!==4){errEl.textContent='PIN ต้องมี 4 หลัก';return;}
   if(p!==pc){errEl.textContent='PIN ไม่ตรงกัน';return;}
 }
 if(resetFormOpen){
   if(!pin){errEl.textContent='กรุณากรอก PIN ใหม่';return;}
   if(pin.length!==4){errEl.textContent='PIN ใหม่ต้องมี 4 หลัก';return;}
   if(pin!==pinConfirm){errEl.textContent='PIN ใหม่ไม่ตรงกัน';return;}
 }

 const doSave = async ()=>{
 if(isEdit){
 const e=DB.employees.find(x=>String(x.id)===String(editId));
 const editEmail = role==='manager' ? document.getElementById('empEmail').value.trim() : '';
 e.name=name; e.role=role; e.email=editEmail;
 if(pin) e.pin=await hashPin(pin);
 toast('อัพเดตข้อมูล '+name+'แล้ว');
 } else {
 const newPin=document.getElementById('empPin').value.trim();
 const empEmail = role==='manager' ? document.getElementById('empEmail').value.trim() : '';
 const hashedNewPin = await hashPin(newPin||'0000');
   DB.employees.push({id,name,role,pin:hashedNewPin,email:empEmail});
 toast('เพิ่ม '+name+'แล้ว');
 }
 closeModal('modal-emp');
 renderStaffMgmt();
 scheduleSync();
 };

 // ถ้าแก้ PIN — Manager ที่ login อยู่ข้าม pinModal ได้เลย
 if(isEdit && pin){
   if(currentOperator && currentOperator.role==='manager'){
     addAudit('pin_reset','รีเซ็ต PIN',name+' ('+id+') โดย '+currentOperator.name,'','rgba(184,134,11,.08)','medium',currentOperator);
     doSave();
   } else {
     openPinModal('ยืนยันรีเซ็ต PIN','ต้องการรีเซ็ต PIN ของ '+name,'manager',(ok,mgr)=>{
       if(ok){ addAudit('pin_reset','รีเซ็ต PIN',name+' ('+id+') โดย '+mgr.name,'','rgba(184,134,11,.08)','medium',mgr); doSave(); }
     });
   }
 } else {
   doSave();
 }
}

function deleteStaff(id){
 const e=DB.employees.find(x=>String(x.id)===String(id));if(!e)return;
 if(e.role==='manager'&&DB.employees.filter(x=>x.role==='manager').length<=1){
 toast('ต้องมี Manager อย่างน้อย 1 คน'); return;
 }
 openPinModal('ยืนยันลบพนักงาน','ลบ '+e.name+'ออกจากระบบ','manager',(ok,mgr)=>{
 if(ok){
 DB.employees=DB.employees.filter(x=>x.id!==id);
 addAudit('staff_delete','ลบพนักงาน',e.name+' ('+id+') โดย '+mgr.name,'','rgba(184,50,40,.08)','high',mgr);
 renderStaffMgmt(); toast('ลบ '+e.name+'แล้ว'); scheduleSync();
 }
 });
}

/* 
 VOID ORDER (ยกเลิกรายการก่อนบันทึก) — ต้องใช้รหัสผู้จัดการ
 */
function requestVoidOrder(){
 if(!orderItems.length){toast('ไม่มีรายการ');return;}
 openPinModal(
 'ยกเลิกออเดอร์',
 'ใส่รหัสพนักงานผู้อนุมัติ',
 'manager',
 (ok, approver)=>{
 if(ok){
 const summary = orderItems.map(i=>`${i.name} x${i.qty}`).join(', ');
 AUD.preVoid(summary);
 // override empName with approver
 DB.auditLog[0].empId = approver.id;
 DB.auditLog[0].empName = approver.name;
 orderItems=[]; orderDiscount=0;
 localStorage.removeItem(LS_ORDER);
 renderOrderPanel(); updateCartFab(); closeOrderPanel();
 toast(`ยกเลิกแล้ว อนุมัติโดย ${approver.name}`);
 }
 }
 );
}

/* 
 BILL MANAGEMENT
 */
let billFilter='today';
function switchBillTab(btn, filter){
 btn.closest('.tab-bar').querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
 btn.classList.add('active'); billFilter=filter; renderBillManagement(filter);
}
function renderBillManagement(filter){
 let orders = filter==='today' ? getTodayOrders() : DB.orders;
 orders = orders.slice().reverse();
 document.getElementById('billMgSub').textContent = `${orders.length} บิล`;

 // Pending void banners
 const pendingVoids = DB.pendingVoids.filter(v=>v.status==='pending');
 const pvEl = document.getElementById('pendingVoidsList');
 if(pendingVoids.length){
 pvEl.innerHTML = pendingVoids.map(v=>`
 <div class="void-pending-banner"> <div class="vpb-title"> รอการอนุมัติยกเลิกบิล #${v.orderId}</div> <div class="vpb-sub">เหตุผล: ${v.reason}${v.requestBy?' · ขอโดย: '+v.requestBy:''}</div> <div class="vpb-actions"> <button class="btn btn-dark btn-sm" onclick="approveVoid('${v.id}')"> อนุมัติ (รหัสผู้จัดการ)</button> <button class="btn btn-secondary btn-sm" onclick="rejectVoid('${v.id}')"> ปฏิเสธ</button> </div> </div>`).join('');
 } else { pvEl.innerHTML=''; }

 const el = document.getElementById('billMgList');
 if(!orders.length){
 el.innerHTML='<div class="empty-state"><div class="e-icon"><span class="mi" style="font-size:40px;opacity:.4">receipt_long</span></div><div class="e-title">ยังไม่มีบิล</div></div>'; return;
 }
 el.innerHTML = orders.map(o=>{
 const t = new Date(o.ts).toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'});
 const hasPending = DB.pendingVoids.some(v=>String(v.orderId)===String(o.id)&&v.status==='pending');
 const statusClass = o.status==='voided' ? 'voided' : hasPending ? 'pending' : 'active';
 const statusLabel = o.status==='voided' ? 'ยกเลิกแล้ว' : hasPending ? 'รออนุมัติ' : 'ปกติ';
 return `
 <div class="bill-item" onclick="openOrderDetail('${o.id}')"> <div class="bill-head"> <div class="bill-status-dot ${statusClass}"></div> <div class="bill-info"> <div class="bill-id">บิล #${o.id} · ${t}</div> <div class="bill-meta">${o.items.reduce((s,i)=>s+i.qty,0)} แก้ว · ${statusLabel}${o.voidApprovedBy?' · ผู้อนุมัติ: '+o.voidApprovedBy:''}</div> </div> <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px"> <div class="bill-amt ${o.status==='voided'?'voided':''}">฿${o.total.toLocaleString()}</div> ${o.status==='active'&&!hasPending
 ?`<button class="btn btn-danger btn-xs" onclick="event.stopPropagation();requestBillVoid('${o.id}')">ยกเลิกบิล</button>`:''}
 </div> </div> </div>`;
 }).join('');
}

function requestBillVoid(orderId){
 const order = DB.orders.find(o=>o.id===orderId);
 if(!order||order.status==='voided') return;
 openVoidModal(orderId);
}

function openVoidModal(orderId){
 let existing=document.getElementById('modal-void-reason');
 if(existing) existing.remove();
 const modal=document.createElement('div');
 modal.id='modal-void-reason';
 modal.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9500;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box';
 const nums=[1,2,3,4,5,6,7,8,9,'',0,''];
 const numBtns=nums.map((k,i)=>{
  if(i===9) return `<button class="numpad-btn" onclick="voidPinClear()"><span class="mi" style="font-size:20px">backspace</span></button>`;
  if(i===11) return `<button class="numpad-btn" style="background:var(--cara);color:#fff;box-shadow:0 4px 14px var(--cara-glow)" onclick="submitVoidRequest('${orderId}')">ยืนยัน</button>`;
  return `<button class="numpad-btn" onclick="voidPinKey('${k}')">${k}</button>`;
 }).join('');
 modal.innerHTML=`<div style="background:var(--bg);border-radius:var(--r4);box-shadow:var(--neu-out);padding:22px;width:100%;max-width:340px;max-height:90vh;overflow-y:auto">
  <div style="font-size:16px;font-weight:800;color:var(--t1);font-family:var(--fh);margin-bottom:4px">ยกเลิกออเดอร์</div>
  <div style="font-size:11px;color:var(--t4);margin-bottom:14px">ต้องใช้ PIN ผู้จัดการเท่านั้น</div>
  <div class="f-group" style="margin-bottom:10px">
   <label class="f-label">ประเภทการยกเลิก</label>
   <select class="f-input" id="voidTypeSelect" onchange="voidTypeChanged()" style="font-size:13px">
    <option value="customer">🔴 ลูกค้ายกเลิก</option>
    <option value="staff">🟠 ข้อผิดพลาดร้าน</option>
    <option value="test">🟡 ทดสอบระบบ</option>
   </select>
  </div>
  <div class="f-group" style="margin-bottom:10px">
   <label class="f-label">เหตุผล</label>
   <input class="f-input" id="voidReasonInput" placeholder="ระบุเหตุผลการยกเลิก">
  </div>
  <div class="f-group" style="margin-bottom:8px">
   <label class="f-label">รหัสพนักงาน (Manager)</label>
   <input class="f-input" id="voidMgrId" placeholder="เช่น 690001" type="tel" inputmode="numeric"
    style="font-size:18px;font-weight:700;text-align:center;letter-spacing:3px" oninput="voidMgrLookup()">
   <div id="voidMgrName" style="font-size:12px;color:var(--green);font-weight:700;min-height:16px;margin-top:4px;text-align:center"></div>
  </div>
  <label class="f-label" style="text-align:center;display:block;margin-bottom:6px">รหัส PIN (4 หลัก)</label>
  <div style="display:flex;justify-content:center;gap:10px;margin-bottom:10px" id="voidPinDots">
   <div class="pin-dot" id="vpd0"></div><div class="pin-dot" id="vpd1"></div>
   <div class="pin-dot" id="vpd2"></div><div class="pin-dot" id="vpd3"></div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:8px">${numBtns}</div>
  <div style="color:var(--red);font-size:12px;min-height:16px;text-align:center;margin-bottom:6px" id="voidPinError"></div>
  <button class="btn btn-secondary" style="width:100%" onclick="document.getElementById('modal-void-reason').remove();_voidPin=''">ยกเลิก</button>
 </div>`;
 document.body.appendChild(modal);
 setTimeout(()=>{ const el=document.getElementById('voidReasonInput'); if(el)el.focus(); },200);
}

let _voidPin='';
function voidTypeChanged(){
 const t=document.getElementById('voidTypeSelect');
 const r=document.getElementById('voidReasonInput');
 if(!t||!r)return;
 const hints={customer:'เช่น ลูกค้าเปลี่ยนใจ',staff:'เช่น กดเมนูผิด',test:'ทดสอบระบบ POS'};
 r.placeholder=hints[t.value]||'ระบุเหตุผลการยกเลิก';
 if(t.value==='test')r.value=r.value||'ทดสอบระบบ';
}
function voidPinKey(k){ if(_voidPin.length>=4)return; _voidPin+=String(k); updateVoidDots(); }
function voidPinClear(){ _voidPin=_voidPin.slice(0,-1); updateVoidDots(); }
function updateVoidDots(){ for(let i=0;i<4;i++){const d=document.getElementById('vpd'+i);if(d)d.classList.toggle('filled',i<_voidPin.length);} }
function voidMgrLookup(){
 const id=document.getElementById('voidMgrId').value.trim().toUpperCase();
 const emp=DB.employees.find(e=>String(e.id)===String(id));
 const el=document.getElementById('voidMgrName');
 _voidPin=''; updateVoidDots();
 if(emp&&emp.role==='manager'){el.textContent='✓ '+emp.name;el.style.color='var(--green)';}
 else if(id.length>=2){el.textContent=emp?'ไม่มีสิทธิ์ผู้จัดการ':'ไม่พบรหัสนี้';el.style.color='var(--red)';}
 else el.textContent='';
}
async function submitVoidRequest(orderId){
 const reason=(document.getElementById('voidReasonInput')||{}).value||'';
 const mgrId=(document.getElementById('voidMgrId')||{}).value||'';
 const errEl=document.getElementById('voidPinError');
 if(!reason.trim()){if(errEl)errEl.textContent='กรุณาระบุเหตุผล';return;}
 if(!mgrId.trim()){if(errEl)errEl.textContent='กรุณาใส่รหัสพนักงาน';return;}
 if(_voidPin.length!==4){if(errEl)errEl.textContent='กรุณากรอก PIN 4 หลัก';return;}
 const mgr=DB.employees.find(e=>String(e.id)===String(mgrId.trim().toUpperCase())&&e.role==='manager');
 if(!mgr){if(errEl)errEl.textContent='ไม่พบรหัสผู้จัดการ';return;}
 const inputHash=await hashPin(_voidPin);
 const storedPin=String(mgr.pin||'');
 const expectedPin=isHashed(storedPin)?storedPin:null;
 let match=false;
 if(expectedPin){match=(inputHash===expectedPin);}
 else{const ph=await hashPin(storedPin||'1234');match=(inputHash===ph);}
 if(!match){if(errEl)errEl.textContent='PIN ไม่ถูกต้อง';_voidPin='';updateVoidDots();return;}
 const order=DB.orders.find(o=>String(o.id)===String(orderId));
 if(order){
  order.status='voided';order.voidReason=reason.trim();
  order.voidType=(document.getElementById('voidTypeSelect')||{}).value||'customer';
  order.voidTs=Date.now();order.voidApprovedBy=mgr.name+' ('+mgr.id+')';
  // คืน sold count + คืน stock วัตถุดิบ
  order.items.forEach(i=>{
   const m=DB.menus.find(x=>x.id===i.menuId);
   if(m) m.sold=Math.max(0,m.sold-i.qty);
   if(m&&m.recipeId){
    const rec=DB.recipes.find(x=>x.id===m.recipeId);
    if(rec&&(rec.ingredients||rec.ings)){
     (rec.ingredients||rec.ings).forEach(row=>{
      if(!row.ingId||!row.qty)return;
      const ing=DB.ingredients.find(x=>x.id===row.ingId);
      if(ing) ing.qty=Math.round((ing.qty+row.qty*i.qty)*1000)/1000;
     });
    }
   }
  });
 }
 AUD.voidReq(orderId,reason.trim());
 _voidPin='';
 document.getElementById('modal-void-reason').remove();
 toast('ยกเลิกออเดอร์แล้ว');
 renderBillManagement(billFilter);
 updateSalesBadge();
 if(currentPage==='sales') renderSalesToday();
 scheduleSync();
}


function approveVoid(voidId){
 openPinModal(
 'อนุมัติยกเลิกบิล',
 'ใส่รหัสพนักงานผู้จัดการ',
 'manager',
 (ok, approver)=>{
 if(ok){
 const voidReq = DB.pendingVoids.find(v=>v.id===voidId); if(!voidReq) return;
 voidReq.status = 'approved'; voidReq.approvedBy = `${approver.name} (${approver.id})`;
 const order = DB.orders.find(o=>o.id===voidReq.orderId);
 if(order){
 order.status = 'voided';
 order.voidReason = voidReq.reason;
 order.voidType = voidReq.voidType || 'customer';
 order.voidTs = Date.now();
 order.voidApprovedBy = `${approver.name} (${approver.id})`;
 order.items.forEach(i=>{
  const m=DB.menus.find(x=>x.id===i.menuId);
  if(m) m.sold=Math.max(0,m.sold-i.qty);
  // คืน stock วัตถุดิบที่ถูกหักตอนสั่ง
  if(m&&m.recipeId){
   const rec=DB.recipes.find(x=>x.id===m.recipeId);
   if(rec&&(rec.ingredients||rec.ings)){
    (rec.ingredients||rec.ings).forEach(row=>{
     if(!row.ingId||!row.qty)return;
     const ing=DB.ingredients.find(x=>x.id===row.ingId);
     if(ing) ing.qty=Math.round((ing.qty+row.qty*i.qty)*1000)/1000;
    });
   }
  }
 });
 AUD.voidApprove(order.id, approver);
 toast(`ยกเลิกบิล #${order.id} · อนุมัติโดย ${approver.name}`);
 }
 renderBillManagement(billFilter); scheduleSync(); updateSalesBadge();
 }
 }
 );
}

function rejectVoid(voidId){
 openPinModal(
 'ปฏิเสธคำขอยกเลิก',
 'ใส่รหัสพนักงานผู้จัดการ',
 'manager',
 (ok, approver)=>{
 if(ok){
 const voidReq = DB.pendingVoids.find(v=>v.id===voidId); if(!voidReq) return;
 voidReq.status = 'rejected'; voidReq.rejectedBy = `${approver.name} (${approver.id})`;
 AUD.voidReject(voidReq.orderId, approver);
 toast(`ปฏิเสธคำขอยกเลิกบิล #${voidReq.orderId}`);
 renderBillManagement(billFilter); scheduleSync();
 }
 }
 );
}

/* 
 ORDER DETAIL (view only)
 */
function openOrderDetail(orderId){
 const order = DB.orders.find(o=>String(o.id)===String(orderId)); if(!order) return;
 document.getElementById('odTitle').textContent = `บิล #${order.id}`;
 const isVoided = order.status==='voided';
 const hasPending = DB.pendingVoids.some(v=>String(v.orderId)===String(order.id)&&v.status==='pending');
 const badgeEl = document.getElementById('odStatusBadge');
 if(isVoided) badgeEl.innerHTML=`<span class="od-badge voided">ยกเลิกแล้ว</span>`;
 else if(hasPending)badgeEl.innerHTML=`<span class="od-badge" style="background:var(--gold-lt);color:var(--gold)">รออนุมัติ</span>`;
 else badgeEl.innerHTML=`<span class="od-badge normal">ปกติ</span>`;

 // audit trail ของบิลนี้
 const billAudit = DB.auditLog.filter(e=>e.detail&&e.detail.includes(`#${order.id}`)).slice(0,10);

 const dateStr = new Date(order.ts).toLocaleString('th-TH',{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
 document.getElementById('odBody').innerHTML=`
 <div style="padding:14px 16px;border-bottom:1px solid var(--bg-dk);display:flex;justify-content:space-between"> <span style="font-size:11px;color:var(--t4)">วันที่-เวลา</span> <span style="font-size:11px;font-weight:600;color:var(--t2)">${dateStr}</span> </div> <div style="padding:12px 16px"> ${order.items.map(i=>`
 <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:8px 0;border-bottom:1px solid rgba(176,154,133,.12)"> <div style="flex:1"> <div style="font-size:13px;font-weight:600;color:var(--t1);font-family:var(--fh)">${i.name}
 <span style="font-size:10px;color:var(--t4)">(${i.size})</span></div> <div style="font-size:10px;color:var(--t4);margin-top:2px"> ${[i.size||'',i.ice||'',i.sweet?'หวาน '+i.sweet:'',i.strength?'เข้ม '+i.strength:'',i.note].filter(Boolean).join(' · ')||'ปกติ'}</div> </div> <div style="text-align:right;flex-shrink:0"> <div style="font-size:12px;color:var(--t3)">x${i.qty}</div> <div style="font-size:13px;font-weight:700;color:var(--cara);font-family:var(--fh)">฿${(i.price*i.qty).toLocaleString()}</div> </div> </div>`).join('')}
 </div> <div style="margin:0 16px;background:var(--bg);border-radius:var(--r4);padding:12px 14px;box-shadow:var(--neu-in-sm)"> <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--t3);padding:3px 0"> <span>ยอดรวม</span><span>฿${order.subTotal.toLocaleString()}</span></div> ${order.discount>0?`<div style="display:flex;justify-content:space-between;font-size:12px;color:var(--red);padding:3px 0"><span>ส่วนลด</span><span>-฿${order.discount.toLocaleString()}</span></div>`:''}
 <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:700;padding-top:8px;border-top:1px solid var(--bg-dk);margin-top:4px;font-family:var(--fh)"> <span>ยอดสุทธิ</span> <span style="color:${isVoided?'var(--t5)':'var(--cara)'}">${isVoided?`<s>฿${order.total.toLocaleString()}</s>`:`฿${order.total.toLocaleString()}`}</span> </div> </div> ${isVoided?`
 <div style="margin:12px 16px;padding:10px 14px;background:var(--red-lt);border-radius:var(--r3)"> <div style="font-size:11px;color:var(--red);font-weight:700"> ยกเลิกแล้ว</div> <div style="font-size:11px;color:var(--t3);margin-top:3px">เหตุผล: ${order.voidReason||'—'}</div> ${order.voidApprovedBy?`<div style="font-size:10px;color:var(--t4);margin-top:2px">อนุมัติโดย: ${order.voidApprovedBy}</div>`:''}
 </div>`:''}
 ${billAudit.length?`
 <div style="margin:8px 16px 0"> <div style="font-size:10px;font-weight:700;color:var(--t4);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Audit Trail</div> ${billAudit.map(e=>`
 <div style="display:flex;gap:8px;align-items:flex-start;padding:5px 0;border-top:1px solid rgba(176,154,133,.1)"> <span style="font-size:13px;flex-shrink:0">${e.icon}</span> <div style="flex:1"> <div style="font-size:11px;color:var(--t2);font-weight:600">${e.action}</div> <div style="font-size:9px;color:var(--t4)"> ${e.empName} · ${new Date(e.ts).toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}</div> </div> </div>`).join('')}
 </div>`:''}
 <div style="margin:12px 16px;font-size:10px;color:var(--t5);text-align:center">บิลนี้ดูได้เท่านั้น — ไม่สามารถแก้ไขได้</div>`;
 document.getElementById('orderDetailPage').classList.add('open');
}
function closeOrderDetail(){ document.getElementById('orderDetailPage').classList.remove('open'); }



/* 
 STORES PAGE
 */