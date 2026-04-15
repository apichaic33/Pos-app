function getOptLabel(item){ return typeof item==='object' ? item.label : item; }
function getOptPrice(item){ return typeof item==='object' ? (item.price||0) : 0; }
function getOptDefault(set){ return set.default||''; }
// หา price ของ option ที่เลือก
function getOptItemPrice(setKey, selectedLabel){
 const set = DB.optionSets&&DB.optionSets[setKey];
 if(!set) return 0;
 const found = (set.items||[]).find(i=>getOptLabel(i)===selectedLabel);
 return found ? getOptPrice(found) : 0;
}

const OPTSET_META = {
 sizes:    {label:'ขนาด',      icon:'straighten', color:'var(--cara)'},
 ice:      {label:'น้ำแข็ง',   icon:'ac_unit',    color:'var(--blue)'},
 sweet:    {label:'ความหวาน',  icon:'water_drop',  color:'var(--gold)'},
 strength: {label:'ความเข้ม',  icon:'coffee',      color:'var(--esp)'},
};

function renderOptionSets(){
 if(!DB.optionSets) DB.optionSets={
  sizes:    {label:'ขนาด',       default:'200ml',      items:[{label:'200ml',price:0},{label:'1000ml',price:30}]},
  ice:      {label:'น้ำแข็ง',    default:'มีน้ำแข็ง', items:[{label:'มีน้ำแข็ง',price:0},{label:'ไม่มีน้ำแข็ง',price:0}]},
  sweet:    {label:'ความหวาน',   default:'50%',        items:[{label:'0%',price:0},{label:'25%',price:0},{label:'50%',price:0},{label:'75%',price:0},{label:'100%',price:0}]},
  strength: {label:'ความเข้ม',   default:'50%',        items:[{label:'25%',price:0},{label:'50%',price:0},{label:'75%',price:0},{label:'100%',price:0}]}
 };
 const el = document.getElementById('optSetsContent');
 if(!el) return;
 el.innerHTML = Object.keys(OPTSET_META).map(key=>{
  const meta = OPTSET_META[key];
  const set  = DB.optionSets[key]||{label:meta.label,default:'',items:[]};
  const items = set.items||[];
  return `<div style="background:var(--bg);border-radius:var(--r4);box-shadow:var(--neu-out-sm);padding:16px;margin-bottom:16px">
   <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
    <div style="width:40px;height:40px;border-radius:var(--r2);background:var(--bg-dk);display:flex;align-items:center;justify-content:center">
     <span class="mi" style="font-size:22px;color:${meta.color}">${meta.icon}</span>
    </div>
    <div style="flex:1">
     <div style="font-size:14px;font-weight:800;color:var(--t1);font-family:var(--fh)">${meta.label}</div>
     <div style="font-size:10px;color:var(--t4)">ค่า default: <strong>${set.default||'-'}</strong></div>
    </div>
    <button onclick="addOptSetItem('${key}')" style="display:flex;align-items:center;gap:4px;background:var(--cara);color:#fff;border:none;border-radius:var(--rf);padding:6px 12px;font-size:11px;font-weight:700;cursor:pointer;box-shadow:0 3px 10px var(--cara-glow)">
     <span class="mi" style="font-size:14px">add</span>เพิ่ม
    </button>
   </div>
   <div id="optset-list-${key}" style="display:flex;flex-direction:column;gap:6px">
    ${items.map((item,idx)=>`
     <div style="display:flex;align-items:center;gap:8px;background:var(--bg-dk);border-radius:var(--r2);padding:8px 12px">
      <span class="mi" style="font-size:14px;color:var(--t4);cursor:pointer" onclick="moveOptSetItem('${key}',${idx},-1)" title="ขึ้น">arrow_upward</span>
      <span class="mi" style="font-size:14px;color:var(--t4);cursor:pointer" onclick="moveOptSetItem('${key}',${idx},1)" title="ลง">arrow_downward</span>
      <div style="flex:1;font-size:13px;font-weight:600;color:var(--t1)">${getOptLabel(item)}</div>
      <span style="font-size:10px;font-weight:700;color:${getOptPrice(item)>0?'var(--gold)':'var(--t5)'}">+฿${getOptPrice(item)}</span>
      <span style="font-size:9px;font-weight:700;padding:2px 8px;border-radius:var(--rf);background:${set.default===getOptLabel(item)?'var(--green-lt)':'var(--bg)'};color:${set.default===getOptLabel(item)?'var(--green)':'var(--t4)'};border:${set.default===getOptLabel(item)?'':'1px solid rgba(176,154,133,.2)'};cursor:pointer" onclick="setOptSetDefault('${key}','${getOptLabel(item)}')">${set.default===getOptLabel(item)?'✓ default':'default'}</span>
      <button onclick="editOptSetItem('${key}',${idx})" style="background:var(--blue-lt);color:var(--blue);border:none;border-radius:var(--rf);padding:4px 8px;font-size:10px;font-weight:700;cursor:pointer">แก้ไข</button>
      <button onclick="delOptSetItem('${key}',${idx})" style="background:var(--red-lt);color:var(--red);border:none;border-radius:var(--rf);padding:4px 8px;font-size:10px;font-weight:700;cursor:pointer"><span class="mi" style="font-size:13px">delete</span></button>
     </div>`).join('')}
   </div>
  </div>`;
 }).join('');
}

function openOptSetItemModal(key, idx){
 const meta = OPTSET_META[key]||{label:key,icon:'tune',color:'var(--t3)'};
 document.getElementById('optsetItemKey').value = key;
 document.getElementById('optsetItemIdx').value = idx===null||idx===undefined ? -1 : idx;
 document.getElementById('optsetItemIcon').textContent = meta.icon;
 document.getElementById('optsetItemIcon').style.color = meta.color;
 document.getElementById('optsetItemError').textContent = '';
 const isEdit = idx!==null && idx!==undefined && idx>=0;
 document.getElementById('optsetItemTitle').textContent = isEdit ? 'แก้ไขตัวเลือก '+meta.label : 'เพิ่มตัวเลือก '+meta.label;
 if(isEdit){
  const cur = DB.optionSets[key].items[idx];
  document.getElementById('optsetItemLabel').value = getOptLabel(cur);
  document.getElementById('optsetItemPrice').value = getOptPrice(cur);
 } else {
  document.getElementById('optsetItemLabel').value = '';
  document.getElementById('optsetItemPrice').value = '0';
 }
 openModal('modal-optset-item');
 setTimeout(()=>document.getElementById('optsetItemLabel').focus(),200);
}

function saveOptSetItem(){
 const key   = document.getElementById('optsetItemKey').value;
 const idx   = parseInt(document.getElementById('optsetItemIdx').value);
 const label = document.getElementById('optsetItemLabel').value.trim();
 const price = parseInt(document.getElementById('optsetItemPrice').value)||0;
 const errEl = document.getElementById('optsetItemError');
 if(!label){ errEl.textContent='กรุณาใส่ชื่อตัวเลือก'; return; }
 const set = DB.optionSets[key];
 if(!set){ errEl.textContent='ไม่พบ option set'; return; }
 const isEdit = idx>=0;
 if(!isEdit && set.items.find(i=>getOptLabel(i)===label)){
  errEl.textContent='มีตัวเลือกนี้อยู่แล้ว'; return;
 }
 const newItem = price>0 ? {label, price} : label;
 if(isEdit){
  const oldLabel = getOptLabel(set.items[idx]);
  set.items[idx] = newItem;
  if(set.default===oldLabel) set.default = label;
 } else {
  set.items.push(newItem);
 }
 closeModal('modal-optset-item');
 saveLocal(); scheduleSync();
 renderOptionSets();
 // อัปเดต popup ถ้าเปิดอยู่
 if(document.getElementById('modal-product')&&document.getElementById('modal-product').classList.contains('open')){
  const _os=DB.optionSets||{};
  const _ice=_os.ice||{items:['มีน้ำแข็ง','ไม่มีน้ำแข็ง'],default:'มีน้ำแข็ง'};
  const _sweet=_os.sweet||{items:['0%','25%','50%','75%','100%'],default:'50%'};
  const _str=_os.strength||{items:['25%','50%','75%','100%'],default:'50%'};
  if(key==='ice')      document.getElementById('pdIce').innerHTML      = _neuToggleHtml(_ice.items,'ice',pdIce);
  if(key==='sweet')    document.getElementById('pdSweet').innerHTML    = _neuToggleHtml(_sweet.items,'sweet',pdSweet);
  if(key==='strength') document.getElementById('pdStrength').innerHTML = _neuToggleHtml(_str.items,'strength',pdStrength);
 }
 toast((isEdit?'แก้ไข':'เพิ่ม')+' "'+label+'" แล้ว'+(price>0?' (+฿'+(price||0).toLocaleString()+')':''));
}

function addOptSetItem(key){
 openOptSetItemModal(key, null);
}
function editOptSetItem(key, idx){ openOptSetItemModal(key, idx); }

function delOptSetItem(key, idx){
 const item = DB.optionSets[key].items[idx];
 const lbl = getOptLabel(item);
 if(!confirm('ลบ "'+lbl+'" ?')) return;
 DB.optionSets[key].items.splice(idx,1);
 if(DB.optionSets[key].default===lbl) DB.optionSets[key].default=getOptLabel(DB.optionSets[key].items[0]||'');
 saveLocal(); scheduleSync(); renderOptionSets();
}

function moveOptSetItem(key, idx, dir){
 const items = DB.optionSets[key].items;
 const newIdx = idx+dir;
 if(newIdx<0||newIdx>=items.length) return;
 [items[idx],items[newIdx]]=[items[newIdx],items[idx]];
 saveLocal(); scheduleSync(); renderOptionSets();
}

function setOptSetDefault(key, val){
 DB.optionSets[key].default = val;
 saveLocal(); scheduleSync(); renderOptionSets();
 toast('"'+val+'" เป็นค่า default แล้ว');
}

/* ══════════════════════════════════════════════
   CUSTOM OPTIONS MANAGER
   ══════════════════════════════════════════ */
let customMgrFilter = 'all';

function renderCustomMgr(){
 if(!DB.customOptions) DB.customOptions = [];
 const el = document.getElementById('customMgrList');
 if(!el) return;
 // นับว่าแต่ละ option ถูกใช้กี่เมนู
 const usageMap = {};
 DB.menus.forEach(m=>{
  (m.customOptions||[]).forEach(k=>{
   usageMap[k] = (usageMap[k]||[]);
   usageMap[k].push(m.name);
  });
 });
 let opts = DB.customOptions;
 if(customMgrFilter==='used')   opts = opts.filter(o=>usageMap[o.key]&&usageMap[o.key].length>0);
 if(customMgrFilter==='unused') opts = opts.filter(o=>!usageMap[o.key]||usageMap[o.key].length===0);
 document.getElementById('customMgrSub').textContent = opts.length+' รายการ';
 if(!opts.length){
  el.innerHTML=`<div class="empty-state"><div class="e-icon"><span class="mi" style="font-size:40px;opacity:.4">tune</span></div><div class="e-title">ยังไม่มี Custom Options</div><div class="e-sub">กดปุ่ม + เพิ่มตัวเลือกใหม่</div></div>`;
  return;
 }
 el.innerHTML = '<div style="padding:0 16px 8px">' + opts.map(o=>{
  const usage = usageMap[o.key]||[];
  const usedIn = usage.length ? `<div style="font-size:10px;color:var(--t4);margin-top:3px;display:flex;align-items:center;gap:3px"><span class="mi" style="font-size:11px">restaurant_menu</span>${usage.slice(0,3).join(', ')}${usage.length>3?' +'+( usage.length-3)+'':''}</div>` : `<div style="font-size:10px;color:var(--t5);margin-top:3px">ยังไม่ได้ใช้กับเมนูใด</div>`;
  return `<div style="background:var(--bg);border-radius:var(--r3);box-shadow:var(--neu-out-sm);padding:12px 14px;margin-bottom:10px">
   <div style="display:flex;align-items:center;gap:10px">
    <div style="width:38px;height:38px;border-radius:var(--r2);background:${o.active?'var(--blue-lt)':'var(--bg-dk)'};display:flex;align-items:center;justify-content:center;flex-shrink:0">
     <span class="mi" style="font-size:20px;color:${o.active?'var(--blue)':'var(--t5)'}">tune</span>
    </div>
    <div style="flex:1;min-width:0">
     <div style="font-size:13px;font-weight:700;color:var(--t1)">${o.label}</div>
     <div style="display:flex;align-items:center;gap:6px;margin-top:2px">
      <span style="font-size:9px;font-weight:700;padding:1px 7px;border-radius:var(--rf);background:${o.active?'var(--green-lt)':'var(--bg-dk)'};color:${o.active?'var(--green)':'var(--t4)'}">${o.active?'ใช้งาน':'ปิด'}</span>
      <span style="font-size:10px;color:var(--gold);font-weight:700">+฿${o.price||10}</span>
      <span style="font-size:9px;color:var(--t4)">${usage.length} เมนู</span>
     </div>
     ${usedIn}
    </div>
    <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">
     <button onclick="toggleCustomOption('${o.key}')" style="background:${o.active?'var(--green-lt)':'var(--bg-dk)'};color:${o.active?'var(--green)':'var(--t4)'};border:none;border-radius:var(--rf);padding:5px 10px;font-size:10px;font-weight:700;cursor:pointer">${o.active?'ปิด':'เปิด'}</button>
     <button onclick="editCustomOption('${o.key}')" style="background:var(--blue-lt);color:var(--blue);border:none;border-radius:var(--rf);padding:5px 10px;font-size:10px;font-weight:700;cursor:pointer">แก้ไข</button>
     <button onclick="deleteCustomOption('${o.key}')" style="background:var(--red-lt);color:var(--red);border:none;border-radius:var(--rf);padding:5px 10px;font-size:10px;font-weight:700;cursor:pointer">ลบ</button>
    </div>
   </div>
  </div>`;
 }).join('') + '</div>';
}

function filterCustomMgr(btn, filter){
 customMgrFilter = filter;
 document.querySelectorAll('#customMgrFilterRow .tab-btn').forEach(b=>b.classList.remove('active'));
 btn.classList.add('active');
 renderCustomMgr();
}

function openAddCustomOption(editKey){
 if(!DB.customOptions) DB.customOptions=[];
 if(!DB.optionSets) DB.optionSets={
  sizes:    {label:'ขนาด',       default:'200ml',      items:[{label:'200ml',price:0},{label:'1000ml',price:30}]},
  ice:      {label:'น้ำแข็ง',    default:'มีน้ำแข็ง', items:[{label:'มีน้ำแข็ง',price:0},{label:'ไม่มีน้ำแข็ง',price:0}]},
  sweet:    {label:'ความหวาน',   default:'50%',        items:[{label:'0%',price:0},{label:'25%',price:0},{label:'50%',price:0},{label:'75%',price:0},{label:'100%',price:0}]},
  strength: {label:'ความเข้ม',   default:'50%',        items:[{label:'25%',price:0},{label:'50%',price:0},{label:'75%',price:0},{label:'100%',price:0}]}
 };
 const existing = editKey ? DB.customOptions.find(o=>o.key===editKey) : null;
 const title = existing ? 'แก้ไข Custom Option' : 'เพิ่ม Custom Option ใหม่';
 openModal('modal-custom-opt');
 document.getElementById('customOptModalTitle').textContent = title;
 document.getElementById('customOptEditKey').value = editKey||'';
 document.getElementById('customOptLabel').value = existing ? existing.label : '';
 document.getElementById('customOptPrice').value = existing ? (existing.price||10) : 10;
 document.getElementById('customOptActive').checked = existing ? !!existing.active : true;
}

function editCustomOption(key){ openAddCustomOption(key); }

function saveCustomOption(){
 if(!DB.customOptions) DB.customOptions=[];
 const editKey = document.getElementById('customOptEditKey').value;
 const label = document.getElementById('customOptLabel').value.trim();
 const price = parseInt(document.getElementById('customOptPrice').value)||10;
 const active = document.getElementById('customOptActive').checked;
 const errEl = document.getElementById('customOptError');
 if(!label){ errEl.textContent='กรุณาใส่ชื่อตัวเลือก'; return; }
 errEl.textContent='';
 if(editKey){
  // แก้ไข
  const opt = DB.customOptions.find(o=>o.key===editKey);
  if(opt){ opt.label=label; opt.price=price; opt.active=active; }
  // อัปเดต label ในเมนูทั้งหมดที่ใช้ dyn: key นี้
  const oldDynKey = 'dyn:'+( DB.customOptions.find(o=>o.key===editKey)?.label||'');
  DB.menus.forEach(m=>{
   if(m.customOptions){
    m.customOptions = m.customOptions.map(k=> k===editKey||k===oldDynKey ? editKey : k);
   }
  });
  toast('แก้ไขแล้ว: '+label);
 } else {
  // เพิ่มใหม่
  const key = 'copt_'+Date.now();
  if(DB.customOptions.find(o=>o.label===label)){ errEl.textContent='มีตัวเลือกชื่อนี้แล้ว'; return; }
  DB.customOptions.push({key, label, price, active});
  toast('เพิ่มแล้ว: '+label);
 }
 closeModal('modal-custom-opt');
 scheduleSync();
 renderCustomMgr();
 // อัปเดตหน้า order grid ด้วย
 if(currentPage==='order') renderOrder();
}

function toggleCustomOption(key){
 if(!DB.customOptions) return;
 const opt = DB.customOptions.find(o=>o.key===key);
 if(opt){ opt.active=!opt.active; scheduleSync(); renderCustomMgr(); }
}

function deleteCustomOption(key){
 if(!confirm('ลบตัวเลือกนี้? จะถูกลบออกจากทุกเมนูที่ใช้ด้วย')) return;
 DB.customOptions = (DB.customOptions||[]).filter(o=>o.key!==key);
 // ลบออกจากเมนูทั้งหมด
 DB.menus.forEach(m=>{
  if(m.customOptions) m.customOptions = m.customOptions.filter(k=>k!==key);
 });
 scheduleSync();
 renderCustomMgr();
 if(currentPage==='order') renderOrder();
 toast('ลบตัวเลือกแล้ว');
}

// เรียกหลัง popup order เปิด — ดึง options จาก DB.customOptions
function getMenuCustomOptions(menuItem){
 if(!DB.customOptions) return [];
 const menuOptKeys = menuItem.customOptions||[];
 // filter เฉพาะที่ active และ เมนูนี้มีอยู่ใน list
 return DB.customOptions.filter(o=>o.active && menuOptKeys.includes(o.key));
}

/* 
 EMPLOYEE LOOKUP
 */
function lookupEmployee(){
 const id = document.getElementById('pdEmpId').value.trim().toUpperCase();
 const emp = DB.employees.find(e=>String(e.id)===String(id));
 const el = document.getElementById('empLookupResult');
 if(emp){el.textContent=emp.name;el.style.color='var(--green)';}
 else if(id){el.textContent='ไม่พบ';el.style.color='var(--red)';}
 else{el.textContent='—';el.style.color='var(--t4)';}
}

/* 
 STAFF DRINK TOGGLE
 */
function togglePromoFields(){
 const isPromo = document.getElementById('pdIsPromo').checked;
 document.getElementById('promoFields').style.display = isPromo ? 'block' : 'none';
 const thumb = document.getElementById('pdPromoThumb');
 const slider = document.getElementById('pdPromoSlider');
 if(isPromo){
 thumb.style.opacity='0'; thumb.style.transform='translateX(0)';
 thumb.style.background='var(--gold)'; thumb.style.boxShadow='3px 3px 8px rgba(184,134,11,.45),-1px -1px 4px rgba(255,255,255,.9)';
 thumb.style.display='';
 requestAnimationFrame(()=>{ requestAnimationFrame(()=>{
 thumb.style.opacity='1'; thumb.style.transform='translateX(17px)';
 }); });
 slider.style.background='var(--gold-lt)';
 // populate promo dropdown
 const activePromos = DB.promos.filter(p=>p.active);
 const sel = document.getElementById('pdPromoSel');
 sel.innerHTML = '<option value="">— ไม่ใช้โปรโมชั่น —</option>' +
 activePromos.map(p=>`<option value="${p.id}">${p.name} (${getPromoTag(p)})</option>`).join('');
 applySelectedPromo();
 } else {
 thumb.style.opacity='0'; thumb.style.transform='translateX(0)'; setTimeout(()=>{ thumb.style.display='none'; thumb.style.opacity=''; },400);
 thumb.style.background=''; thumb.style.boxShadow='';
 slider.style.background='var(--gold-lt)';
 document.getElementById('pdPromoDesc').style.display='none';
 // reset discount
 orderDiscount=0; updateOrderSummary();
 }
}
function applySelectedPromo(){
 const selEl = document.getElementById('pdPromoSel');
 if(!selEl) return;
 const promoId = parseInt(selEl.value);
 const promo = DB.promos.find(p=>p.id===promoId);
 const descEl = document.getElementById('pdPromoDesc');
 if(promo){
 const unitPrice = pdItem ? (pdItem.price + Object.keys(pdCustom||{}).length*10) : 0;
 if(promo.type==='pct'){
 orderDiscount=Math.round(unitPrice*pdQtyVal*promo.val/100);
 } else if(promo.type==='fixed'){
 orderDiscount=promo.val;
 } else if(promo.type==='freeN'){
 // ซื้อ N ฟรี 1 ราคาต่ำสุด: จำนวนที่ฟรี = floor(qty / N), ส่วนลด = freeCount × unitPrice
 const n=Math.max(1,promo.val||2);
 const freeCount=Math.floor(pdQtyVal/n);
 orderDiscount=freeCount*unitPrice;
 } else {
 orderDiscount=0;
 }
 descEl.textContent=`${promo.name}: ลด ฿${(orderDiscount||0).toLocaleString()}`;
 descEl.style.display='block';
 } else {
 orderDiscount=0; if(descEl) descEl.style.display='none';
 }
 updateOrderSummary();
}
function toggleStaffFields(){
 const isStaff = document.getElementById('pdIsStaff').checked;
 document.getElementById('staffFields').style.display = isStaff ? 'block' : 'none';
 const thumb = document.getElementById('pdStaffThumb');
 const slider = document.getElementById('pdStaffSlider');
 if(isStaff){
 thumb.style.opacity='0'; thumb.style.transform='translateX(0)';
 thumb.style.background='var(--blue)'; thumb.style.boxShadow='3px 3px 8px rgba(43,94,167,.45),-1px -1px 4px rgba(255,255,255,.9)';
 thumb.style.display='';
 requestAnimationFrame(()=>{ requestAnimationFrame(()=>{
 thumb.style.opacity='1'; thumb.style.transform='translateX(17px)';
 }); });
 slider.style.background='var(--blue-lt)';
 document.getElementById('pdAddBtn').textContent = '+ บันทึกสวัสดิการ';
 } else {
 thumb.style.opacity='0'; thumb.style.transform='translateX(0)'; setTimeout(()=>{ thumb.style.display='none'; thumb.style.opacity=''; },400);
 thumb.style.background=''; thumb.style.boxShadow='';
 slider.style.background='var(--blue-lt)';
 document.getElementById('pdAddBtn').textContent = '+ เพิ่มลงออเดอร์';
 }
}
function logStaffDrink(){
 const menuId=parseInt(document.getElementById('staffMenuSel').value);
 const m=DB.menus.find(x=>x.id===menuId);
 const name=document.getElementById('staffName').value.trim()||'พนักงาน';
 const qty=parseInt(document.getElementById('staffQty').value)||1;
 const type=document.getElementById('staffType').value;
 const note=document.getElementById('staffNote').value;
 if(!m)return;
 DB.staffLogs.push({id:'sl-'+(DB.nextId++),menuId,menuName:m.name,staff:name,empId:currentEmp?.id||'',type,qty,ts:Date.now(),note});
 // หักสต็อกวัตถุดิบตาม recipe (เหมือน confirmOrder)
 if(m.recipeId){
  const rec=DB.recipes.find(x=>x.id===m.recipeId);
  if(rec&&(rec.ingredients||rec.ings)){
   (rec.ingredients||rec.ings).forEach(row=>{
    if(!row.ingId||!row.qty)return;
    const ing=DB.ingredients.find(x=>x.id===row.ingId);
    if(ing) ing.qty=Math.max(0,Math.round((ing.qty-row.qty*qty)*1000)/1000);
   });
  }
 }
 AUD.welfare(m.name, qty, '—', name, type);
 closeModal('modal-staff');
 toast(`บันทึก ${m.name} x${qty} (${name})`);
 document.getElementById('empName').value='';document.getElementById('staffQty').value='1';document.getElementById('staffNote').value='';
 updateSalesBadge();
 scheduleSync();
}

/* 
 AUDIT LOG — MAX DETAIL
 ทุก action บันทึก: type, action, detail, empId, empName,
 severity (low/med/high), ts (ms), sessionId
 */