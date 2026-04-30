
/* 
 DRAWER NAV
 */
function openDrawer(){
 document.getElementById('drawer').classList.add('open');
 document.getElementById('drawerOverlay').classList.add('open');
}
function closeDrawer(){
 document.getElementById('drawer').classList.remove('open');
 document.getElementById('drawerOverlay').classList.remove('open');
}
function updateDrawerForRole(){
 const isMgr = currentOperator && currentOperator.role==='manager';
 // เมนูหลังบ้าน — แสดงเฉพาะ Manager
 const backOfficeMenus = ['dnav-promo','dnav-manage','dnav-bills','dnav-staff-mgmt','dnav-audit','dnav-report','dnav-stores','dnav-optsets','dnav-custom'];
 backOfficeMenus.forEach(id=>{
   const el=document.getElementById(id);
   if(el) el.style.display = isMgr ? '' : 'none';
 });
 // drawer separator
 const sep = document.querySelector('.drawer-sep');
 if(sep) sep.style.display = isMgr ? '' : 'none';
 // update user info
 const info = document.getElementById('drawerUserInfo');
 if(info && currentOperator) info.textContent = currentOperator.id+' · '+currentOperator.name+' ('+(isMgr?'ผู้จัดการ':'แคชเชียร์')+')';
}
function drawerGo(p){
 closeDrawer();
 goPage(p);
}

let currentPage = 'order';
function goPage(p){
 if(PROTECTED_PAGES.includes(p)){
   // Manager ที่ login อยู่ข้าม gate ได้เลย
   if(currentOperator && currentOperator.role==='manager'){
     _goPageDirect(p);
   } else {
     mgrGate(p);
   }
 } else {
   _goPageDirect(p);
 }
}

/* 
 MODAL
 */
function openModal(id){document.getElementById(id).classList.add('open');}
function closeModal(id){document.getElementById(id).classList.remove('open');}
document.querySelectorAll('.modal-overlay').forEach(el=>{
 el.addEventListener('click',e=>{if(e.target===el)el.classList.remove('open');});
});

/* 
 TOAST
 */
let _tt;
function toast(msg){
 const t=document.getElementById('toast');
 t.textContent=msg;t.classList.add('show');
 clearTimeout(_tt);_tt=setTimeout(()=>t.classList.remove('show'),2200);
}

/* 
 ORDER PAGE
 */
let orderItems=[];
let activeCat='all';

function renderOrder(){
 renderCatPills();
 renderProductGrid(activeCat);
 updateCartFab();
}

function renderCatPills(){
 const cats=[['all','ทั้งหมด'],['coffee','กาแฟ'],['tea','ชา'],['cocoa','โกโก้'],['other','อื่นๆ']];
 const icons={all:'apps',coffee:'coffee',tea:'local_cafe',cocoa:'emoji_food_beverage',other:'more_horiz'};
 document.getElementById('catRow').innerHTML=cats.map(([v,l])=>
   `<button class="cat-pill ${activeCat===v?'active':''}" onclick="filterCat(this,'${v}')">
     <span style='font-family:"Material Symbols Outlined";font-size:14px;font-weight:normal;vertical-align:-2px;margin-right:3px'>${icons[v]||'circle'}</span>${l}</button>`
 ).join('');
}

function filterCat(btn,cat){
 activeCat=cat;
 document.querySelectorAll('.cat-pill').forEach(b=>b.classList.remove('active'));
 btn.classList.add('active');
 renderProductGrid(cat);
}

function renderPromoRibbon(){
 const active=DB.promos.find(p=>p.active);
 const el=document.getElementById('promoRibbon');
 if(!active){el.innerHTML='';return;}
 el.innerHTML=`<div class="promo-ribbon"><div class="pr-icon">%</div><div class="pr-text"><strong>${active.name}</strong><span>${active.note||getPromoDesc(active)}</span></div><span class="pr-tag">${getPromoTag(active)}</span></div>`;
}

function renderProductGrid(cat){
 const list=cat==='all'?DB.menus.filter(m=>m.status==='active'):DB.menus.filter(m=>m.cat===cat&&m.status==='active');
 const grid=document.getElementById('orderGrid');
 if(!list.length){grid.innerHTML=`<div class="empty-state" style="grid-column:span 2"><div class="e-icon"><span class="mi" style="font-size:40px;opacity:.4">coffee</span></div><div class="e-title">ไม่มีเมนูในหมวดนี้</div></div>`;return;}
 grid.innerHTML=list.map(m=>`
 <div class="prod-card fade-up" style="position:relative">
   <div class="prod-img" style="background:${m.color};border-radius:var(--r3) var(--r3) 0 0;font-size:28px">${m.icon}</div>
   <div class="prod-body">
     <div class="prod-name" style="font-size:12px;font-weight:700;line-height:1.3">${m.name}</div>
     ${m.sold>0?`<div style="font-size:9px;color:var(--t4);margin-top:1px">${m.sold} แก้ว</div>`:'<div style="font-size:9px;color:var(--t5);margin-top:1px">฿${m.cost||0} ต้นทุน</div>'}
     <div class="prod-footer" style="margin-top:6px">
       <span class="prod-price" style="font-size:14px;font-weight:800">฿${m.price}</span>
       <button class="prod-add" onclick="openProductModal(${m.id})" style="width:28px;height:28px;font-size:18px">+</button>
     </div>
   </div>
 </div>`).join('');
}

/* Product Detail Modal */
let pdItem=null,pdQtyVal=1,pdSize='',pdSweet='50%',pdIce='มีน้ำแข็ง',pdStrength='50%',pdCustom={};

function _neuToggleHtml(items, type, defaultVal){
 return items.map(v=>{
  const lbl = typeof v==='object' ? v.label : v;
  const prc = typeof v==='object' ? (v.price||0) : 0;
  const isOn = lbl===defaultVal;
  const safeId = lbl.replace(/[^a-z0-9]/gi,'_');
  return `<label class="neu-tog-row${isOn?' on':''}" id="neut_${type}_${safeId}" onclick="selectNeuOpt(this,'${type}','${lbl}')">
   <div class="neu-tog-track"><div class="neu-tog-thumb"></div></div>
   <span class="neu-tog-name">${lbl}${prc>0?`<span style="font-size:9px;color:var(--gold);margin-left:4px;font-weight:700">+฿${prc}</span>`:''}
   </span>
  </label>`;
 }).join('');
}
function openProductModal(id){
 pdItem=DB.menus.find(m=>m.id===id);if(!pdItem)return;
 pdQtyVal=1;pdSize=pdItem.sizes[0]||'200ml';pdSweet=(DB.optionSets&&DB.optionSets.sweet?DB.optionSets.sweet.default:'50%');pdIce=(DB.optionSets&&DB.optionSets.ice?DB.optionSets.ice.default:'มีน้ำแข็ง');pdStrength=(DB.optionSets&&DB.optionSets.strength?DB.optionSets.strength.default:'50%');pdCustom={};
 document.getElementById('pdName').childNodes[1].textContent=pdItem.name;
 document.getElementById('pdImg').style.background=pdItem.color;
 document.getElementById('pdImg').style.color='rgba(255,255,255,.9)';
 document.getElementById('pdImg').textContent=pdItem.icon;
 document.getElementById('pdDesc').textContent=pdItem.desc;
 document.getElementById('pdMeta').textContent=`${pdItem.vol}ml · ฿${(pdItem.price||0).toLocaleString()}`;
 document.getElementById('pdQty').textContent='1';
 document.getElementById('pdNote').value='';
 const unitEl2=document.getElementById('pdUnitPrice');
 if(unitEl2) unitEl2.textContent='฿'+(pdItem.price||0).toLocaleString();
 document.getElementById('pdPrice').textContent='฿'+(pdItem.price||0).toLocaleString();
 // Reset staff toggle
 document.getElementById('pdIsStaff').checked=false;
 document.getElementById('staffFields').style.display='none';
 const promoChk=document.getElementById('pdIsPromo');
 if(promoChk){
  const autoPromo = pdItem.promoId ? DB.promos.find(p=>p.id==pdItem.promoId&&p.active) : null;
  promoChk.checked = !!autoPromo;
  document.getElementById('promoFields').style.display = autoPromo ? 'block' : 'none';
  const pt=document.getElementById('pdPromoThumb');const ps=document.getElementById('pdPromoSlider');
  if(autoPromo){
   fillPromoSelect('pdPromoSel', pdItem.promoId);
   if(pt){pt.style.display='block';pt.style.transform='translateX(17px)';pt.style.background='var(--gold)';}
   if(ps) ps.style.background='var(--gold)';
   setTimeout(applySelectedPromo,0);
  } else {
   if(pt){pt.style.transform='';pt.style.background='';pt.style.boxShadow='';pt.style.display='none';}
   if(ps) ps.style.background='';
   const pd=document.getElementById('pdPromoDesc');if(pd)pd.style.display='none';
  }
 }
 document.getElementById('pdAddBtn').textContent='+ เพิ่มลงออเดอร์';
 if(document.getElementById('pdEmpId')) document.getElementById('pdEmpId').value='';
 if(document.getElementById('empLookupResult')) {document.getElementById('empLookupResult').textContent='—';document.getElementById('empLookupResult').style.color='var(--t4)';}
 const slider=document.getElementById('pdStaffSlider');
 if(slider) slider.style.background='';
 // ── Render Neumorphic radio toggles ──
 const _sizes_pool = (DB.optionSets&&DB.optionSets.sizes&&DB.optionSets.sizes.items.length) ? DB.optionSets.sizes.items : [{label:'200ml',price:0}];
 const _sizes_labels = _sizes_pool.map(getOptLabel);
 // per-menu sizes: กรองเฉพาะที่อยู่ใน pool
 const _menu_sizes = (pdItem.sizes&&pdItem.sizes.length) ? pdItem.sizes.filter(s=>_sizes_labels.includes(s)) : [];
 const _sizes_use  = _menu_sizes.length ? _menu_sizes : _sizes_labels;
 const _sizes_def  = (DB.optionSets&&DB.optionSets.sizes) ? DB.optionSets.sizes.default : '200ml';
 pdSize = _sizes_use.includes(_sizes_def) ? _sizes_def : _sizes_use[0];
 document.getElementById('pdSizes').innerHTML = _neuToggleHtml(_sizes_use, 'size', pdSize);
 const _os = DB.optionSets||{};
 const _sweet = _os.sweet||{items:[],default:'50%'};
 const _ice   = _os.ice||{items:[],default:'มีน้ำแข็ง'};
 const _str   = _os.strength||{items:[],default:'50%'};
 pdSweet=_sweet.default; pdIce=_ice.default; pdStrength=_str.default;
 // แปลง items → labels สำหรับ _neuToggleHtml
 const sweetLabels = (_sweet.items||[]).map(getOptLabel);
 const iceLabels   = (_ice.items||[]).map(getOptLabel);
 const strLabels   = (_str.items||[]).map(getOptLabel);
 document.getElementById('pdSweet').innerHTML    = _neuToggleHtml(sweetLabels.length?sweetLabels:['0%','25%','50%','75%','100%'],'sweet',_sweet.default);
 document.getElementById('pdIce').innerHTML      = _neuToggleHtml(iceLabels.length?iceLabels:['มีน้ำแข็ง','ไม่มีน้ำแข็ง'],'ice',_ice.default);
 document.getElementById('pdStrength').innerHTML = _neuToggleHtml(strLabels.length?strLabels:['25%','50%','75%','100%'],'strength',_str.default);
 // Custom options
 pdCustom={};
 const custEl=document.getElementById('pdCustomSection');
 custEl.style.display='block';
 // ดึง custom options จาก DB.customOptions (global pool) + static fallback
 const STATIC_CUSTOM={extraShot:'เพิ่มช็อตกาแฟ',extraMatcha:'เพิ่มผงมัทฉะ',extraCocoa:'เพิ่มผงโกโก้'};
 const menuOptKeys = pdItem.customOptions||[];
 const ALL_CUSTOM = menuOptKeys.map(k=>{
  // ตรวจใน DB.customOptions ก่อน (global pool)
  const global = (DB.customOptions||[]).find(o=>o.key===k);
  if(global && global.active) return {key:k, label:global.label, price:global.price||10};
  // fallback: static หรือ dyn:
  if(k.startsWith('dyn:')) return {key:k, label:k.slice(4), price:10};
  if(STATIC_CUSTOM[k]) return {key:k, label:STATIC_CUSTOM[k], price:10};
  return null;
 }).filter(Boolean);
 if(!ALL_CUSTOM.length){document.getElementById('pdCustomSection').style.display='none';}
 document.getElementById('pdCustomOptions').innerHTML=ALL_CUSTOM.map(o=>`
  <label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding:6px 0;border-bottom:1px solid rgba(43,94,167,.1)">
   <div style="position:relative;width:40px;height:23px;flex-shrink:0">
    <input type="checkbox" id="cust_${o.key.replace(/[^a-zA-Z0-9_]/g,'_')}" onchange="toggleCustomOpt('${o.key}',this)" style="opacity:0;width:0;height:0;position:absolute">
    <span id="cust_slider_${o.key.replace(/[^a-zA-Z0-9_]/g,'_')}" style="position:absolute;inset:0;border-radius:23px;background:var(--bg-dk);box-shadow:var(--neu-in-sm);transition:background .35s;cursor:pointer">
     <span id="cust_thumb_${o.key.replace(/[^a-zA-Z0-9_]/g,'_')}" style="position:absolute;width:17px;height:17px;border-radius:50%;left:3px;top:3px;background:#fff;transition:transform .4s cubic-bezier(.4,0,.2,1),background .35s,opacity .3s;box-shadow:3px 3px 8px rgba(43,94,167,.35),-1px -1px 4px rgba(255,255,255,.9);display:none"></span>
    </span>
   </div>
   <div style="flex:1"><div style="font-size:13px;font-weight:600;color:var(--t2);font-family:var(--fh)">${o.label}</div></div>
   <span style="font-size:11px;color:var(--green);font-weight:700;flex-shrink:0">+฿10</span>
  </label>`).join('');
 openModal('modal-product');
}
function selectNeuOpt(label, type, val){
 // OFF ทุก row ใน group เดียวกัน
 const group = label.parentElement;
 group.querySelectorAll('.neu-tog-row').forEach(row=>{
  if(row === label) return;
  row.classList.remove('on');
 });
 // ON row ที่กด
 label.classList.add('on');
 if(type==='size')    pdSize=val;
 if(type==='sweet')   pdSweet=val;
 if(type==='ice')     pdIce=val;
 if(type==='strength')pdStrength=val;
 updatePdPrice(); // อัปเดตราคาทุกครั้งที่เปลี่ยน option
}
function toggleCustomOpt(key, checkbox){
 if(checkbox.checked) pdCustom[key]=true; else delete pdCustom[key];
 const safeKey = key.replace(/[^a-zA-Z0-9_]/g,'_');
 const slider = document.getElementById('cust_slider_'+safeKey);
 const thumb = document.getElementById('cust_thumb_'+safeKey);
 if(checkbox.checked){
 if(thumb){
 thumb.style.opacity='0'; thumb.style.transform='translateX(0)';
 thumb.style.background='var(--t2)'; thumb.style.boxShadow='3px 3px 8px rgba(140,123,107,.4),-1px -1px 4px rgba(255,255,255,.9)';
 thumb.style.display='';
 requestAnimationFrame(()=>{ requestAnimationFrame(()=>{
 thumb.style.opacity='1'; thumb.style.transform='translateX(17px)';
 }); });
 }
 if(slider) slider.style.background='var(--bg-dk)';
 } else {
 if(thumb){ thumb.style.opacity='0'; thumb.style.transform='translateX(0)'; setTimeout(()=>{ thumb.style.display='none'; thumb.style.opacity=''; },400); }
 if(slider) slider.style.background='var(--bg-dk)';
 }
 updatePdPrice();
}
function calcOptionSurcharge(){
 // รวมราคาเพิ่มจาก ice/sweet/strength/size
 return getOptItemPrice('sizes', pdSize)
      + getOptItemPrice('ice', pdIce)
      + getOptItemPrice('sweet', pdSweet)
      + getOptItemPrice('strength', pdStrength);
}
function updatePdPrice(){
 if(!pdItem)return;
 const extraCount=Object.keys(pdCustom).length;
 const customExtraPrice2 = Object.keys(pdCustom).reduce((s,k)=>{
  const g=(DB.customOptions||[]).find(o=>o.key===k);
  return s+(g?g.price:10);
 },0);
 const optSurcharge = calcOptionSurcharge();
 const unitPrice = pdItem.price + customExtraPrice2 + optSurcharge;
 const total=unitPrice * pdQtyVal;
 const unitEl=document.getElementById('pdUnitPrice');
 if(unitEl) unitEl.textContent='฿'+(unitPrice||0).toLocaleString()+(optSurcharge>0?` (+฿${optSurcharge.toLocaleString()} option)`:'');
 document.getElementById('pdPrice').textContent='฿'+total.toLocaleString();
}
function changePdQty(d){
 pdQtyVal=Math.max(1,pdQtyVal+d);
 document.getElementById('pdQty').textContent=pdQtyVal;
 updatePdPrice();
 // animate button press
 const btnId = d>0?'pdBtnPlus':'pdBtnMinus';
 const btn=document.getElementById(btnId);
 if(btn){
 btn.style.transform='scale(.78)';
 btn.style.background='rgba(165,141,112,.18)';
 setTimeout(()=>{btn.style.transform='';btn.style.background='transparent';},160);
 }
}
function addFromModal(){
 if(!pdItem)return;
 const isStaff = document.getElementById('pdIsStaff').checked;
 if(isStaff){
 const empId = document.getElementById('pdEmpId').value.trim().toUpperCase();
 const emp = DB.employees.find(e=>String(e.id)===String(empId));
 if(!empId){toast('กรุณาใส่รหัสพนักงาน');return;}
 if(!emp){toast('ไม่พบรหัส'+empId);return;}
 const staffType = document.getElementById('pdStaffType').value;
 const logEntry = {
 id:'sl-'+(DB.nextId++),menuId:pdItem.id,menuName:pdItem.name,
 staff:emp.name,empId:emp.id,type:staffType,qty:pdQtyVal,
 ts:Date.now(),note:document.getElementById('pdNote').value,
 isWelfare:true
 };
 DB.staffLogs.push(logEntry);
 // หักสต็อกวัตถุดิบตาม recipe (เหมือน confirmOrder)
 if(pdItem.recipeId){
  const rec=DB.recipes.find(x=>x.id===pdItem.recipeId);
  if(rec&&(rec.ingredients||rec.ings)){
   (rec.ingredients||rec.ings).forEach(row=>{
    if(!row.ingId||!row.qty)return;
    const ing=DB.ingredients.find(x=>x.id===row.ingId);
    if(ing) ing.qty=Math.max(0,Math.round((ing.qty-row.qty*pdQtyVal)*1000)/1000);
   });
  }
 }
 AUD.welfare(pdItem.name, pdQtyVal, emp.id, emp.name, staffType);
 closeModal('modal-product');
 toast(`บันทึกสวัสดิการ ${emp.name}: ${pdItem.name} x${pdQtyVal}`);
 scheduleSync();
 return;
 }
 // Regular order item — calculate final price with custom extras
 const extraCount = Object.keys(pdCustom).length;
 // คำนวณราคา custom (ต้อง declare ก่อนใช้)
 const customExtraPrice = Object.keys(pdCustom).reduce((s,k)=>{
  const g=(DB.customOptions||[]).find(o=>o.key===k);
  return s+(g?g.price:10);
 },0);
 const optSurcharge2 = calcOptionSurcharge();
 const finalPrice = pdItem.price + customExtraPrice + optSurcharge2;
 const CUST_LABELS_LOCAL={extraShot:'เพิ่มช็อต',extraMatcha:'เพิ่มมัทฉะ',extraCocoa:'เพิ่มโกโก้'};
 const customNote = Object.keys(pdCustom).map(k=>{
  const g=(DB.customOptions||[]).find(o=>o.key===k);
  if(g) return g.label;
  return CUST_LABELS_LOCAL[k]||(k.startsWith('dyn:')?k.slice(4):k);
 }).join(', ');
 const noteVal = [document.getElementById('pdNote').value, customNote].filter(Boolean).join(' · ');
 // capture promo if selected
 const isPromo = document.getElementById('pdIsPromo').checked;
 const promoSelEl = document.getElementById('pdPromoSel');
 const selPromoId = isPromo && promoSelEl ? parseInt(promoSelEl.value)||0 : 0;
 const selPromo = selPromoId ? DB.promos.find(p=>p.id===selPromoId) : null;
 let itemPromoDisc = 0;
 if(selPromo){
 if(selPromo.type==='pct'){
 // ส่วนลดต่อหน่วย × qty
 itemPromoDisc=Math.round(finalPrice*selPromo.val/100)*pdQtyVal;
 } else if(selPromo.type==='fixed'){
 itemPromoDisc=selPromo.val;
 } else if(selPromo.type==='freeN'){
 // ซื้อ N ฟรี 1: จำนวนฟรี = floor(qty/N), ส่วนลด = freeCount × unitPrice (ราคาต่ำสุด = finalPrice ต่อหน่วย)
 const n=Math.max(1,selPromo.val||2);
 const freeCount=Math.floor(pdQtyVal/n);
 itemPromoDisc=freeCount*finalPrice;
 }
 }
 addToOrder(pdItem.id,pdItem.name,pdSize,pdQtyVal,finalPrice,noteVal,pdSweet,pdIce,pdItem.color,pdItem.icon,selPromoId,itemPromoDisc,pdStrength);
 closeModal('modal-product');
 toast(`+ ${pdItem.name} (${pdSize}) x${pdQtyVal}${extraCount?' +Custom':''}`);
}
function quickAdd(id){
 const m=DB.menus.find(x=>x.id===id);if(!m)return;
 const os=DB.optionSets||{};
 const defSweet=(os.sweet&&os.sweet.default)||'50%';
 const defIce=(os.ice&&os.ice.default)||'มีน้ำแข็ง';
 const defStr=(os.strength&&os.strength.default)||'50%';
 addToOrder(m.id,m.name,m.sizes[0]||'200ml',1,m.price,'',defSweet,defIce,m.color,m.icon,0,0,defStr);
 toast(`+ ${m.name}`);
}

function addToOrder(menuId,name,size,qty,price,note,sweet,ice,color,icon,promoId,promoDisc,strength){
 const key=`${menuId}-${size}-${sweet}-${ice}-${strength||'50%'}-${note}`;
 // Dynamic cost per item
 const dynCost = calcDynamicCost(menuId, size, sweet, strength||'50%');
 const ex=orderItems.find(i=>i.key===key);
 if(ex){
 const prev=ex.qty; ex.qty+=qty;
 if(promoDisc && qty){
 const discPerUnit=Math.round(promoDisc/qty);
 ex.promoDisc=(ex.promoDisc||0)+discPerUnit*qty;
 }
 ex.costPerItem=dynCost; // update in case ingredients changed
 AUD.itemEdit(name,size,prev,ex.qty,price);
 } else {
 orderItems.push({key,menuId,name,size,qty,price,note,sweet,ice,strength:strength||'50%',color:color||'#2C1810',icon:icon||'?',promoId:promoId||0,promoDisc:promoDisc||0,costPerItem:dynCost});
 AUD.itemAdd(name,size,qty,price);
 }
 updateCartFab();
 updateOrderPanelIfOpen();
}

function updateCartFab(){
 const count=orderItems.reduce((s,i)=>s+i.qty,0);
 const fab=document.getElementById('cartFab');
 const cnt=document.getElementById('cartFabCount');
 if(count>0){fab.classList.add('show');cnt.textContent=count;}
 else{fab.classList.remove('show');}
 saveOrderItems(); // persist pending order
}

/* 
 ORDER PANEL PAGE
 */
function openOrderPanel(){
 document.getElementById('orderPanelPage').classList.add('open');
 renderOrderPanel();
}
function closeOrderPanel(){
 document.getElementById('orderPanelPage').classList.remove('open');
}
function updateOrderPanelIfOpen(){
 if(document.getElementById('orderPanelPage').classList.contains('open')){
 renderOrderPanel();
 }
}

function renderOrderPanel(){
 const list=document.getElementById('opList');
 const itemCountEl=document.getElementById('opItemCount');
 if(!orderItems.length){
 list.innerHTML=`<div class="op-empty"><div class="e-icon"><span class="mi" style="font-size:48px;opacity:.35">shopping_cart</span></div><div class="op-empty-title">ยังไม่มีรายการ</div><div style="font-size:12px;color:var(--t4);margin-top:6px">กดเพิ่มเมนูจากหน้า ORDER</div></div>`;
 if(itemCountEl) itemCountEl.textContent='0 รายการ';
 updateOrderSummary();
 return;
 }
 // ── Auto-calculate promos ──
 calcAutoPromo();
 const totalCount=orderItems.reduce((s,i)=>s+i.qty,0);
 if(itemCountEl) itemCountEl.textContent=totalCount+' รายการ';
 const CUST_LABELS={extraShot:'เพิ่มช็อต',extraMatcha:'เพิ่มมัทฉะ',extraCocoa:'เพิ่มโกโก้'};
 list.innerHTML=orderItems.map(i=>{
 const autoPromo=i.autoPromoId?DB.promos.find(x=>x.id===i.autoPromoId):null;
 const manualPromo=(!autoPromo&&i.promoId)?DB.promos.find(x=>x.id===i.promoId):null;
 const promo=autoPromo||manualPromo;
 const noteParts=(i.note||'').split(' · ');
 const customTags=Object.values(CUST_LABELS).filter(v=>noteParts.includes(v));
 const otherNote=noteParts.filter(p=>!Object.values(CUST_LABELS).includes(p)).join(' · ');
 const metaLine=[i.size||'',i.ice||'',i.sweet?'หวาน '+i.sweet:'',i.strength?'เข้ม '+i.strength:'',otherNote].filter(Boolean).join(' · ');
 const icePrice2   = getOptItemPrice('ice', i.ice);
 const sweetPrice2 = getOptItemPrice('sweet', i.sweet);
 const strPrice2   = getOptItemPrice('strength', i.strength);
 const sizePrice2  = getOptItemPrice('sizes', i.size);
 const optExtra    = icePrice2+sweetPrice2+strPrice2+sizePrice2;
 const disc=i.autoPromoDisc||i.promoDisc||0;
 const rawTotal=i.price*i.qty;
 const netTotal=rawTotal-disc;
 return `<div class="op-item fade-up">
  <div class="op-item-icon" style="background:${i.color}">${i.icon}</div>
  <div class="op-item-info">
   <div class="op-item-name">${i.name}</div>
   <div class="op-item-meta">${metaLine}${optExtra>0?` <span style="color:var(--gold);font-weight:700">+฿${optExtra}</span>`:''}</div>
   ${customTags.length?`<div style="font-size:9px;color:var(--blue-md);font-weight:600;margin-top:1px">${customTags.map(t=>t+' +฿10').join(' · ')}</div>`:''}
   ${promo?`<div style="display:flex;align-items:center;gap:4px;margin-top:3px">
    <span style="font-size:9px;font-weight:700;padding:1px 6px;border-radius:var(--rf);background:var(--red-lt);color:var(--red)">🏷 ${promo.name}</span>
    <span style="font-size:9px;color:var(--red);font-weight:700">-฿${disc.toLocaleString()}</span>
   </div>`:''}
  </div>
  <div class="op-item-ctrl">
   <button class="op-q-btn" style="background:var(--red-lt);color:var(--red)" onclick="changeOpQty('${i.key}',-1)">−</button>
   <span class="op-qty">${i.qty}</span>
   <button class="op-q-btn" onclick="changeOpQty('${i.key}',1)">+</button>
  </div>
  <div class="op-item-price" style="text-align:right">
   ${disc>0?`<div style="font-size:9px;color:var(--t4);text-decoration:line-through;line-height:1.2">฿${rawTotal.toLocaleString()}</div>`:''}
   <div style="font-size:13px;font-weight:800;color:${disc>0?'var(--red)':'var(--t1)'}">฿${netTotal.toLocaleString()}</div>
  </div>
 </div>`;
 }).join('');
 updateOrderSummary();
}

/* ══════════════════════════════════════════════
   AUTO PROMO ENGINE
   วิเคราะห์ orderItems ทั้งหมด → apply โปรที่ดีที่สุด
   ════════════════════════════════════════════ */
function calcAutoPromo(){
 const today=new Date().toISOString().split('T')[0];
 // โปรที่ active + ไม่หมดอายุ
 const activePromos=DB.promos.filter(p=>{
  if(!p.active) return false;
  if(!p.noExpiry && p.end && p.end<today) return false;
  if(!p.noExpiry && p.start && p.start>today) return false;
  return true;
 });

 // Reset auto-promo ทุก item ก่อน
 orderItems.forEach(i=>{ i.autoPromoId=0; i.autoPromoDisc=0; });

 if(!activePromos.length) return;

 const subTotal=orderItems.reduce((s,i)=>s+i.price*i.qty,0);
 const totalQty=orderItems.reduce((s,i)=>s+i.qty,0);

 // helper: ตรวจว่า promo scope ครอบ item นี้หรือเปล่า
 function promoCovers(p, item){
  if(p.scope==='all') return true;
  if(p.scope==='item'){
   const menu=DB.menus.find(m=>m.id===item.menuId);
   return menu && menu.promoId==p.id;
  }
  if(p.scope==='cat'){
   const menu=DB.menus.find(m=>m.id===item.menuId);
   return menu && p.catTarget && menu.cat===p.catTarget;
  }
  return true;
 }

 activePromos.forEach(p=>{
  switch(p.type){

   // ─── % ลด (per item) ─────────────────────────
   case 'pct':
    orderItems.forEach(i=>{
     if(!promoCovers(p,i)) return;
     const disc=Math.round(i.price*i.qty*(p.val/100));
     if(disc>(i.autoPromoDisc||0)){ i.autoPromoId=p.id; i.autoPromoDisc=disc; }
    });
    break;

   // ─── ลดราคาคงที่ (per item) ──────────────────
   case 'fixed':
    orderItems.forEach(i=>{
     if(!promoCovers(p,i)) return;
     const disc=Math.min(p.val, i.price*i.qty);
     if(disc>(i.autoPromoDisc||0)){ i.autoPromoId=p.id; i.autoPromoDisc=disc; }
    });
    break;

   // ─── ซื้อ N แถม M (กระจายทุก item ที่ครอบ) ──
   case 'buy':{
    const n=Math.max(1,p.val||2);
    const m=Math.max(1,p.val2||1);
    const covered=orderItems.filter(i=>promoCovers(p,i));
    const coveredQty=covered.reduce((s,i)=>s+i.qty,0);
    const freeSets=Math.floor(coveredQty/(n+m));
    if(freeSets>0){
     // กระจายส่วนลดตาม qty สัดส่วน
     covered.forEach(i=>{
      const share=Math.round((i.qty/coveredQty)*freeSets*m);
      const disc=share*i.price;
      if(disc>(i.autoPromoDisc||0)){ i.autoPromoId=p.id; i.autoPromoDisc=disc; }
     });
    }
    break;
   }

   // ─── ซื้อ N ฟรี 1 (ราคาถูกสุดฟรี) ───────────
   case 'freeN':{
    const n=Math.max(1,p.val||2);
    const covered=orderItems.filter(i=>promoCovers(p,i));
    const coveredQty=covered.reduce((s,i)=>s+i.qty,0);
    const freeCount=Math.floor(coveredQty/n);
    if(freeCount>0){
     // ราคาถูกสุดของ item ที่ครอบ
     const sorted=[...covered].sort((a,b)=>a.price-b.price);
     let remaining=freeCount;
     sorted.forEach(i=>{
      if(remaining<=0) return;
      const freeQty=Math.min(remaining,i.qty);
      const disc=freeQty*i.price;
      remaining-=freeQty;
      if(disc>(i.autoPromoDisc||0)){ i.autoPromoId=p.id; i.autoPromoDisc=disc; }
     });
    }
    break;
   }

   // ─── ซื้อครบ N บาท ลด M% (ยอดรวมทั้งออเดอร์) ─
   case 'min':{
    if(subTotal<p.val) break;
    const pctDisc=p.val2||0;
    // กระจายส่วนลดตามสัดส่วนราคาแต่ละ item
    orderItems.forEach(i=>{
     if(!promoCovers(p,i)) return;
     const itemTotal=i.price*i.qty;
     const share=Math.round(itemTotal*(pctDisc/100));
     if(share>(i.autoPromoDisc||0)){ i.autoPromoId=p.id; i.autoPromoDisc=share; }
    });
    break;
   }

   // ─── Bundle: ซื้อ N ชิ้น ราคาพิเศษ X บาท ─────
   // เงื่อนไข: เป็น set เท่านั้น ขวดที่เกินจาก set คิดราคาเต็ม
   case 'bundle':{
    const n=Math.max(1,p.val||2);
    const bundlePrice=p.val2||0;
    const coveredBundle=orderItems.filter(i=>promoCovers(p,i));
    const coveredQtyBundle=coveredBundle.reduce((s,i)=>s+i.qty,0);
    if(coveredQtyBundle<n||!bundlePrice) break;
    const sets=Math.floor(coveredQtyBundle/n);
    // จำนวนชิ้นที่อยู่ใน set (ส่วนที่เกินคิดเต็ม)
    const inSetQty=sets*n;
    // ราคาปกติของชิ้นที่อยู่ใน set
    // กระจาย inSetQty ให้แต่ละ item ตามลำดับ
    let remaining=inSetQty;
    let normalSetTotal=0;
    const inSetMap={}; // itemKey → qty ที่อยู่ใน set
    orderItems.filter(i=>promoCovers(p,i)).forEach(i=>{
     if(remaining<=0){inSetMap[i.key]=0;return;}
     const take=Math.min(remaining,i.qty);
     inSetMap[i.key]=take;
     normalSetTotal+=i.price*take;
     remaining-=take;
    });
    const totalDisc=Math.max(0,normalSetTotal-bundlePrice*sets);
    if(totalDisc<=0) break;
    // กระจายส่วนลดตามสัดส่วนเฉพาะชิ้นที่อยู่ใน set
    orderItems.forEach(i=>{
     if(!promoCovers(p,i)) return;
     const qtyInSet=inSetMap[i.key]||0;
     if(!qtyInSet) return;
     const share=Math.round((i.price*qtyInSet/normalSetTotal)*totalDisc);
     if(share>(i.autoPromoDisc||0)){ i.autoPromoId=p.id; i.autoPromoDisc=share; }
    });
    break;
   }
  }
 });
}

let orderDiscount=0;
function updateOrderSummary(){
 const subTotal=orderItems.reduce((s,i)=>s+i.price*i.qty,0);
 const count=orderItems.reduce((s,i)=>s+i.qty,0);
 const discount=orderItems.reduce((s,i)=>s+(i.autoPromoDisc||i.promoDisc||0),0);
 const total=Math.max(0,subTotal-discount);
 orderDiscount=discount;
 document.getElementById('opCount').textContent=count+'รายการ';
 document.getElementById('opSubTotal').textContent='฿'+subTotal.toLocaleString();
 document.getElementById('opTotal').textContent='฿'+total.toLocaleString();
 const discRow=document.getElementById('discountRow');
 const promoLabelEl=document.getElementById('opPromoLabel');
 if(discRow){
  if(discount>0){
   discRow.style.display='flex';
   document.getElementById('opDiscountAmt').textContent='-฿'+discount.toLocaleString();
   // รวบชื่อโปรทั้งหมดที่ถูก apply
   const usedPromos=[...new Set(
    orderItems.filter(i=>i.autoPromoId).map(i=>{
     const p=DB.promos.find(x=>x.id===i.autoPromoId);
     return p?p.name:'';
    }).filter(Boolean)
   )];
   if(promoLabelEl) promoLabelEl.textContent=usedPromos.length?'🏷️ '+usedPromos.join(' + '):'';
  } else {
   discRow.style.display='none';
   if(promoLabelEl) promoLabelEl.textContent='';
  }
 }
}


function changeOpQty(key,d){
 const it=orderItems.find(i=>i.key===key);if(!it)return;
 const prev=it.qty; it.qty+=d;
 // scale promoDisc proportionally with qty
 if(it.promoDisc && prev>0){ it.promoDisc=Math.round(it.promoDisc/prev)*it.qty; }
 if(it.qty<=0){
 AUD.itemDel(it.name,it.size,prev,it.price);
 orderItems=orderItems.filter(i=>i.key!==key);
 } else if(d<0){
 AUD.itemEdit(it.name,it.size,prev,it.qty,it.price);
 } else {
 AUD.itemEdit(it.name,it.size,prev,it.qty,it.price);
 }
 renderOrderPanel();updateCartFab();
}

function clearOrderConfirm(){
 if(!orderItems.length)return;
 if(confirm('ล้างออเดอร์ทั้งหมด?')){
 orderItems=[]; orderDiscount=0;
 localStorage.removeItem(LS_ORDER);
 renderOrderPanel();updateCartFab();
 toast('ล้างออเดอร์แล้ว');
 }
}

function confirmOrder(){
 if(!orderItems.length){toast('ไม่มีรายการ');return;}
 // ── Final promo calc ──
 calcAutoPromo();
 const subTotal=orderItems.reduce((s,i)=>s+i.price*i.qty,0);
 const discount=orderItems.reduce((s,i)=>s+(i.autoPromoDisc||i.promoDisc||0),0);
 const total=Math.max(0,subTotal-discount);
 const order={
 id:DB.nextId++,
 empId: currentOperator ? String(currentOperator.id) : '',
 empName: currentOperator ? currentOperator.name : '',
 items:orderItems.map(i=>({
  menuId:i.menuId,name:i.name,size:i.size,qty:i.qty,price:i.price,
  sweet:i.sweet,ice:i.ice,strength:i.strength||'50%',note:i.note,
  promoId:i.autoPromoId||i.promoId||0,
  promoDisc:i.autoPromoDisc||i.promoDisc||0,
  costPerItem:i.costPerItem!=null?i.costPerItem:calcDynamicCost(i.menuId,i.size,i.sweet,i.strength||'50%')
 })),
 subTotal,discount,total,ts:Date.now(),
 status:'active',
 kitchenDone:false,
 voidReason:null, voidTs:null, voidApprovedBy:null
 };
 DB.orders.push(order);
 // update promo usage stats
 const usedPromoIds=[...new Set(order.items.map(i=>i.promoId).filter(Boolean))];
 usedPromoIds.forEach(pid=>{
  const p=DB.promos.find(x=>x.id===pid);
  if(p){
   p.used=(p.used||0)+1;
   p.discount=(p.discount||0)+order.items.filter(i=>i.promoId===pid).reduce((s,i)=>s+(i.promoDisc||0),0);
  }
 });
 orderItems.forEach(oi=>{
  const m=DB.menus.find(x=>x.id===oi.menuId);
  if(m){ m.sold+=oi.qty; }
  if(m&&m.recipeId){
   const rec=DB.recipes.find(x=>x.id===m.recipeId);
   if(rec&&(rec.ingredients||rec.ings)){
    (rec.ingredients||rec.ings).forEach(row=>{
     if(!row.ingId||!row.qty)return;
     const ing=DB.ingredients.find(x=>x.id===row.ingId);
     if(ing){ ing.qty=Math.max(0,ing.qty-row.qty*oi.qty); }
    });
   }
  }
 });
 if(typeof currentOperator!=='undefined'&&currentOperator) lastOperator=currentOperator;
 AUD.orderNew(order.id, order.total, order.items.length);
 previewOrder={id:'#'+String(order.id),items:order.items.map(i=>({...i,color:DB.menus.find(m=>m.id===i.menuId)?.color||'#2C1810'})),subTotal,discount,total,ts:new Date(),orderId:order.id};
 renderReceipt(previewOrder);
 orderItems=[]; orderDiscount=0;
 localStorage.removeItem(LS_ORDER);
 renderOrderPanel();updateCartFab();
 closeOrderPanel();
 document.getElementById('receiptPage').classList.add('open');
 updateReceiptFooter();
 renderProductGrid(activeCat);
 scheduleSync();
 updateSalesBadge();
 updateKitchenBadge();
 if(typeof currentPage!=='undefined'&&currentPage==='kitchen') renderKitchen();
 // ── Pre-render canvas ล่วงหน้า (รอ user gesture ก่อน share) ──────────────
 window._pendingReceiptCanvas = null;
 window._pendingReceiptFname  = null;
 const rcfg = getReceiptSettings();
 setTimeout(async ()=>{
  try{
   if(!window.html2canvas){
    await new Promise((res,rej)=>{
     const s=document.createElement('script');
     s.src='https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
     s.onload=res; s.onerror=rej; document.head.appendChild(s);
    });
   }
   const wrap=document.createElement('div');
   wrap.style.cssText=['position:fixed','top:-9999px','left:-9999px','width:302px','background:#fff','font-family:Sarabun,sans-serif','color:#1A0F08','padding:12px','box-sizing:border-box','line-height:1.5'].join(';');
   wrap.innerHTML=buildReceiptHTML();
   document.body.appendChild(wrap);
   const canvas=await html2canvas(wrap,{scale:3,useCORS:true,backgroundColor:'#ffffff',width:302,windowWidth:302});
   document.body.removeChild(wrap);
   const d=new Date();
   window._pendingReceiptCanvas=canvas;
   window._pendingReceiptFname=`receipt_${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}_${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}.png`;
   // autoSave เปิด → เปิดใช้ปุ่มที่ inject ไว้แล้วโดย updateReceiptFooter
   if(rcfg.autoSave) activateAutoSaveBtn();
   // Auto-print (ไม่ต้องการ user gesture)
   if(rcfg.autoPrint) autoTriggerPrint();
  }catch(e){ console.warn('receipt pre-render failed:',e); }
 }, 400);
}

/* 
 RECEIPT
 */
let previewOrder=null;
let lastOperator=null;
function openReceiptPreview(){
 if(!orderItems.length){toast('ยังไม่มีรายการ');return;}
 const subTotal=orderItems.reduce((s,i)=>s+i.price*i.qty,0);
 const discount=orderItems.reduce((s,i)=>s+(i.autoPromoDisc||i.promoDisc||0),0);
 const total=Math.max(0,subTotal-discount);
 previewOrder={
 id:'#'+String(DB.nextId).padStart(4,'0'),
 items:[...orderItems],
 subTotal,discount,total,
 ts:new Date()
 };
 renderReceipt(previewOrder);
 updateReceiptFooter();
 document.getElementById('receiptPage').classList.add('open');
}
function closeReceiptPage(){
 document.getElementById('receiptPage').classList.remove('open');
}
function renderReceipt(order){
 const d = order.ts instanceof Date ? order.ts : new Date(order.ts);
 const dateStr=d.toLocaleString('th-TH',{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
 // Generate order number: DDMMYYHHmm + POS digits
 const posNum=(DB.posId||'POS-01').replace(/\D/g,'').padStart(2,'0');
 const pad=n=>String(n).padStart(2,'0');
 const orderRef=pad(d.getDate())+pad(d.getMonth()+1)+String(d.getFullYear()).slice(-2)+pad(d.getHours())+pad(d.getMinutes())+posNum;

 // Receipt item row builder 
 // Layout:
 // ชื่อเมนู (size) xN ฿base×N ← ราคาเมนูล้วน (ไม่รวม custom)
 // น้ำแข็ง · หวาน · หมายเหตุ
 // + Custom xN +฿10 ← 1 บรรทัดต่อ option
 // % PromoName -฿disc ← ถ้ามี promo (มีเส้นประคั่น)
 // 
 // รวม ฿net ← ยอดสุทธิเสมอ

 const RC={
 SHORT:['เพิ่มช็อต','เพิ่มมัทฉะ','เพิ่มโกโก้'],
 LONG: ['เพิ่มช็อตกาแฟ','เพิ่มผงมัทฉะ','เพิ่มผงโกโก้'],
 PRICE:10
 };
 RC.ALL=[...RC.SHORT,...RC.LONG];

 const itemRows = order.items.map((i,n)=>{
 const promo = i.promoId ? DB.promos.find(p=>p.id===i.promoId) : null;
 const note = i.note||'';

 // แยก custom tokens (note คั่นด้วย ", " หรือ " · ")
 const tokens = note.split(/[ ]·[ ]|,[ ]*/).map(t=>t.trim()).filter(Boolean);
 const customTags = tokens.filter(t=>RC.ALL.includes(t));
 const otherNote = tokens.filter(t=>!RC.ALL.includes(t)).join(' · ');

 const customCount = customTags.length;
 const basePerCup = i.price - customCount * RC.PRICE; // ราคาเมนูล้วน/แก้ว
 const menuTotal = basePerCup * i.qty; // ยอดเมนูล้วน
 const subTotal = i.price * i.qty; // รวมก่อน promo
 const promoDisc = i.promoDisc || 0;
 const netPrice = subTotal - promoDisc;

 // เงื่อนไขเครื่องดื่ม — แสดงทั้ง 3: น้ำแข็ง · ความหวาน · ความเข้ม
 const condParts = [
  i.ice||'',
  i.sweet ? 'หวาน '+i.sweet : '',
  i.strength ? 'เข้ม '+i.strength : '',
  otherNote
 ].filter(Boolean);
 const condLine = condParts.length
 ? `<div style="font-size:10px;color:var(--t4);padding:1px 0 2px 16px;line-height:1.5">${condParts.join(' · ')}</div>` : '';

 // custom rows
 const customRows = customTags.map(t=>{
 const label = RC.SHORT.includes(t) ? t : (RC.SHORT[RC.LONG.indexOf(t)]||t);
 return `<div style="display:flex;justify-content:space-between;align-items:center;padding:1px 0 1px 16px"> <span style="font-size:10px;color:var(--blue-md)">+ ${label}</span> <div style="display:flex;align-items:center;gap:8px"> <span style="font-size:10px;color:var(--t5)">x${i.qty}</span> <span style="font-size:10px;font-weight:700;color:var(--blue-md);min-width:40px;text-align:right">+฿${RC.PRICE*i.qty}</span> </div> </div>`;
 }).join('');

 // promo row — เส้นประคั่นบน ไม่มีเส้นล่าง
 const promoRow = promo
 ? `<div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0 2px 16px;margin-top:3px;border-top:1px dashed rgba(200,180,160,.4)"> <span style="font-size:10px;color:var(--red);font-weight:600">${promo.type==='freeN'?'ฟรี ':'% '}${promo.name}</span> <span style="font-size:10px;font-weight:700;color:var(--red)">-฿${promoDisc.toLocaleString()}</span> </div>` : '';

 // รวม — แสดงเสมอ, มีเส้นประคั่นบน
 const netRow = `<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0 2px 16px;margin-top:2px;border-top:1px dashed rgba(200,180,160,.4)"> <span style="font-size:11px;color:var(--t3);font-weight:600">รวม</span> <span style="font-size:13px;font-weight:800;color:var(--t1)">฿${netPrice.toLocaleString()}</span> </div>`;

 return `<div style="padding:8px 0 5px;border-bottom:1px solid rgba(200,180,160,.3)"> <div style="display:flex;align-items:flex-start;gap:4px"> <span style="font-size:9px;color:var(--t5);font-weight:700;margin-top:3px;flex-shrink:0;min-width:14px">${n+1}.</span> <span style="flex:1;font-weight:700;font-size:13px;line-height:1.35;font-family:var(--fh)">${i.name} <span style="font-size:10px;color:var(--t4);font-weight:400">(${i.size})</span></span> <span style="color:var(--t3);font-size:11px;padding-top:2px;flex-shrink:0;min-width:22px;text-align:center">x${i.qty}</span> <span style="min-width:52px;text-align:right;font-weight:700;font-size:13px;color:${customCount>0?'var(--t3)':'var(--t1)'}">฿${menuTotal.toLocaleString()}</span> </div> ${condLine}${customRows}${promoRow}${netRow}
 </div>`;
 }).join('');

 // ใบเสร็จปกติ — ไม่แสดงชื่อพนักงาน (แสดงเฉพาะสำเนา)
 const posId = DB.posId || 'POS-01';

 document.getElementById('receiptPaper').innerHTML=`
 <div class="receipt-shop"> <div class="receipt-shop-name">${DB.shopName}</div> <div class="receipt-shop-sub" style="font-size:13px;color:var(--t3);font-weight:600;margin-top:2px">${DB.shopSub}</div> </div> <hr class="receipt-divider"> <div class="receipt-row"><span style="font-size:11px;color:var(--t4)">เลขออเดอร์</span><span style="font-weight:700;font-size:11px;letter-spacing:.5px">${orderRef}</span></div> <div class="receipt-row"><span style="font-size:11px;color:var(--t4)">วันที่</span><span style="font-size:11px">${dateStr}</span></div>
 <div class="receipt-row"><span style="font-size:11px;color:var(--t4)">หมายเลข POS</span><span style="font-size:11px">${posId}</span></div> <hr class="receipt-divider"> ${itemRows}
 <hr class="receipt-divider"> <div class="receipt-row"><span>รวม</span><span>฿${order.subTotal.toLocaleString()}</span></div> ${order.discount>0?`<div class="receipt-row" style="color:var(--red)"><span>ส่วนลดโปรโมชั่น</span><span>-฿${order.discount.toLocaleString()}</span></div>`:''}
 <div class="receipt-row total"><span>รวมทั้งสิ้น</span><span>฿${order.total.toLocaleString()}</span></div> <div class="receipt-meta">ขอบคุณที่ใช้บริการ</div> `;
}
function printReceipt(){
 saveReceiptAsImage();
}

// ── Auto-save ใบเสร็จ (ไม่แสดง Share Sheet — บันทึก silent) ─────────────────
async function autoSaveReceiptSilent(){
 if(!window.html2canvas){
  await new Promise((res,rej)=>{
   const s=document.createElement('script');
   s.src='https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
   s.onload=res; s.onerror=rej; document.head.appendChild(s);
  });
 }
 const wrap=document.createElement('div');
 wrap.style.cssText=[
  'position:fixed','top:-9999px','left:-9999px',
  'width:302px','background:#fff',
  'font-family:Sarabun,sans-serif','color:#1A0F08',
  'padding:12px','box-sizing:border-box','line-height:1.5'
 ].join(';');
 wrap.innerHTML=buildReceiptHTML();
 document.body.appendChild(wrap);
 try{
  const canvas=await html2canvas(wrap,{
   scale:3,useCORS:true,backgroundColor:'#ffffff',
   width:302,windowWidth:302
  });
  const d=new Date();
  const fname=`receipt_${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}_${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}.png`;
  // Auto-save: ใช้ Share API (iOS) หรือ download (Android/Desktop)
  // ต้องเป็น user-gesture context → share sheet จะขึ้น
  await saveImageToGallery(canvas, fname);
 }catch(e){
  console.warn('auto-save receipt failed:',e);
 }finally{
  document.body.removeChild(wrap);
 }
}

// ── Auto-print (ถ้ามีเครื่องปริ้น) ──────────────────────────────────────────
async function autoTriggerPrint(){
 // ── iOS Safari ไม่รองรับ @page size → render เป็น PNG แล้วปริ้น ──────────
 // ขั้นตอน: html2canvas (80mm/302px) → dataURL → iframe <img width="80mm"> → print
 try{
  if(!window.html2canvas){
   await new Promise((res,rej)=>{
    const s=document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    s.onload=res; s.onerror=rej; document.head.appendChild(s);
   });
  }
  // ใช้ canvas ที่ pre-render ไว้แล้ว (ถ้ามี) หรือ render ใหม่
  let dataUrl;
  if(window._pendingReceiptCanvas){
   dataUrl = window._pendingReceiptCanvas.toDataURL('image/png');
  } else {
   const wrap=document.createElement('div');
   wrap.style.cssText='position:fixed;top:-9999px;left:-9999px;width:302px;background:#fff;font-family:Sarabun,sans-serif;color:#1A0F08;padding:12px;box-sizing:border-box;line-height:1.5';
   wrap.innerHTML=buildReceiptHTML();
   document.body.appendChild(wrap);
   const canvas=await html2canvas(wrap,{scale:3,useCORS:true,backgroundColor:'#ffffff',width:302,windowWidth:302});
   document.body.removeChild(wrap);
   dataUrl=canvas.toDataURL('image/png');
  }
  // inject ลง iframe → img width=80mm → print ขนาดตรงเสมอ
  const existIframe=document.getElementById('_printFrame');
  if(existIframe) existIframe.remove();
  const iframe=document.createElement('iframe');
  iframe.id='_printFrame';
  iframe.style.cssText='position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;opacity:0';
  document.body.appendChild(iframe);
  const doc=iframe.contentDocument||iframe.contentWindow.document;
  doc.open();
  doc.write(`<!DOCTYPE html><html><head><meta charset="UTF-8">
   <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{background:#fff;}
    img{display:block;width:80mm;height:auto;}
    @page{margin:0;size:80mm auto;}
    @media print{body{margin:0;}img{width:80mm;}}
   </style>
  </head><body><img src="${dataUrl}"></body></html>`);
  doc.close();
  iframe.onload=function(){
   setTimeout(()=>{
    try{
     iframe.contentWindow.focus();
     iframe.contentWindow.print();
     toast('🖨️ ส่งคำสั่งปริ้นแล้ว');
    }catch(e){ toast('ปริ้นไม่ได้: '+e.message); }
    setTimeout(()=>{ if(iframe.parentNode) iframe.remove(); },3000);
   },200);
  };
 }catch(e){ toast('เตรียมปริ้นไม่ได้: '+e.message); }
}

// ── Receipt Footer: inject ปุ่มตาม setting ──────────────────────────────────
function updateReceiptFooter(){
 const rcfg = getReceiptSettings();
 const footer = document.getElementById('receiptFooterActions');
 if(!footer) return;
 // ลบปุ่มเก่าออก (เก็บแค่ btn-new-order)
 Array.from(footer.querySelectorAll('.btn-print,.btn-receipt-save,.btn-receipt-settings,#btnAutoSave,#btnManualSave,#btnRecipeSlip')).forEach(b=>b.remove());
 // ปุ่มสลิปสูตร — แสดงเสมอถ้า order มีเมนูที่ link recipe
 const hasRecipe = previewOrder && previewOrder.items && previewOrder.items.some(i=>{
  const m=DB.menus.find(x=>x.id===i.menuId);
  return m && m.recipeId && DB.recipes.find(r=>r.id===m.recipeId);
 });
 if(hasRecipe){
  const slipBtn = document.createElement('button');
  slipBtn.id = 'btnRecipeSlip';
  slipBtn.className = 'btn-print';
  slipBtn.style.cssText = 'display:flex;align-items:center;gap:5px;flex-shrink:0;background:var(--blue-lt);color:var(--blue);box-shadow:none;border:1px solid rgba(43,94,167,.2)';
  slipBtn.innerHTML = '<span class="mi" style="font-size:16px">receipt_long</span>สลิปสูตร';
  slipBtn.onclick = () => openRecipeSlip(previewOrder);
  footer.insertBefore(slipBtn, footer.firstChild);
 }
 if(rcfg.autoSave){
  // autoSave เปิด → แสดงปุ่มสีทองรอ canvas
  // ปุ่มนี้จะ disabled ก่อน canvas พร้อม แล้ว enable + pulse เมื่อพร้อม
  const btn = document.createElement('button');
  btn.id = 'btnAutoSave';
  btn.className = 'btn-print';
  btn.disabled = true;
  btn.style.cssText = 'display:flex;align-items:center;gap:5px;opacity:.5;flex-shrink:0';
  btn.innerHTML = '<span class="mi" style="font-size:15px">hourglass_top</span>กำลังเตรียม...';
  btn.onclick = async function(){
   btn.disabled = true;
   btn.innerHTML = '<span class="mi" style="font-size:14px">hourglass_top</span>กำลังบันทึก...';
   await saveReceiptAsImage();
   btn.remove();
  };
  footer.appendChild(btn);
 } else {
  // autoSave ปิด → ปุ่มบันทึกรูปธรรมดา
  const btn = document.createElement('button');
  btn.className = 'btn-print';
  btn.id = 'btnManualSave';
  btn.style.cssText = 'display:flex;align-items:center;gap:5px;flex-shrink:0';
  btn.innerHTML = '<span class="mi" style="font-size:16px">download</span>บันทึกรูป';
  btn.onclick = () => saveReceiptAsImage();
  footer.appendChild(btn);
 }
}

// เรียกจาก setTimeout หลัง canvas พร้อม — เปิดใช้ปุ่ม autoSave
function activateAutoSaveBtn(){
 const btn = document.getElementById('btnAutoSave');
 if(!btn) return;
 btn.disabled = false;
 btn.style.cssText = 'display:flex;align-items:center;gap:5px;background:var(--gold);color:#fff;animation:receiptBtnPulse 1s ease-in-out 3;flex-shrink:0';
 btn.innerHTML = '<span class="mi" style="font-size:16px">photo_library</span>บันทึกรูป';
}

// ── Receipt Settings Modal ────────────────────────────────────────────────────
function openReceiptSettings(){
 const cfg = getReceiptSettings();
 const existing = document.getElementById('receipt-settings-sheet');
 if(existing) existing.remove();
 const sheet = document.createElement('div');
 sheet.id = 'receipt-settings-sheet';
 sheet.style.cssText='position:fixed;inset:0;z-index:9500;display:flex;align-items:flex-end;justify-content:center;background:rgba(20,12,6,.55);backdrop-filter:blur(4px)';
 sheet.innerHTML=`
  <div style="background:var(--bg);border-radius:var(--r4) var(--r4) 0 0;width:100%;max-width:480px;padding:0 0 max(env(safe-area-inset-bottom),24px)">
   <div style="width:36px;height:4px;background:var(--bg-dk);border-radius:2px;margin:12px auto 8px"></div>
   <div style="padding:16px 24px 4px;display:flex;align-items:center;gap:10px">
    <span class="mi" style="font-size:22px;color:var(--gold)">receipt_long</span>
    <div>
     <div style="font-size:16px;font-weight:800;color:var(--t1)">ตั้งค่าใบเสร็จ</div>
     <div style="font-size:11px;color:var(--t4);margin-top:1px">หลังยืนยันออเดอร์</div>
    </div>
   </div>
   <div style="padding:16px 24px;display:flex;flex-direction:column;gap:12px">

    <!-- Auto-save toggle -->
    <div style="background:var(--bg-lt);border-radius:var(--r3);padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px">
     <div>
      <div style="font-size:13px;font-weight:700;color:var(--t1);display:flex;align-items:center;gap:6px">
       <span class="mi" style="font-size:16px;color:var(--blue)">photo_library</span>บันทึกรูปอัตโนมัติ
      </div>
      <div style="font-size:11px;color:var(--t4);margin-top:3px">บันทึกใบเสร็จลง Gallery ทันทีหลังยืนยัน</div>
     </div>
     <label style="position:relative;width:48px;height:28px;flex-shrink:0">
      <input type="checkbox" id="tog-autoSave" ${cfg.autoSave?'checked':''} style="opacity:0;width:0;height:0;position:absolute"
       onchange="receiptSettingToggle('autoSave',this.checked)">
      <span id="tog-autoSave-track" style="position:absolute;inset:0;border-radius:14px;background:${cfg.autoSave?'var(--gold)':'var(--bg-dk)'};transition:.2s;cursor:pointer">
       <span id="tog-autoSave-thumb" style="position:absolute;top:4px;left:${cfg.autoSave?'24px':'4px'};width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.3);transition:.2s"></span>
      </span>
     </label>
    </div>

    <!-- Auto-print toggle -->
    <div style="background:var(--bg-lt);border-radius:var(--r3);padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px">
     <div>
      <div style="font-size:13px;font-weight:700;color:var(--t1);display:flex;align-items:center;gap:6px">
       <span class="mi" style="font-size:16px;color:var(--esp)">print</span>ปริ้นอัตโนมัติ
      </div>
      <div style="font-size:11px;color:var(--t4);margin-top:3px">เปิด print dialog ทันทีหลังยืนยัน (ต้องเชื่อมต่อเครื่องปริ้น)</div>
     </div>
     <label style="position:relative;width:48px;height:28px;flex-shrink:0">
      <input type="checkbox" id="tog-autoPrint" ${cfg.autoPrint?'checked':''} style="opacity:0;width:0;height:0;position:absolute"
       onchange="receiptSettingToggle('autoPrint',this.checked)">
      <span id="tog-autoPrint-track" style="position:absolute;inset:0;border-radius:14px;background:${cfg.autoPrint?'var(--gold)':'var(--bg-dk)'};transition:.2s;cursor:pointer">
       <span id="tog-autoPrint-thumb" style="position:absolute;top:4px;left:${cfg.autoPrint?'24px':'4px'};width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.3);transition:.2s"></span>
      </span>
     </label>
    </div>

    <!-- Info box -->
    <div style="background:rgba(43,94,167,.07);border-radius:var(--r3);padding:10px 14px;font-size:11px;color:var(--blue);line-height:1.7">
     <strong>📱 วิธีทำงาน:</strong><br>
     หลังยืนยันออเดอร์ → ระบบ render รูปไว้รอ<br>
     กด <em>"บันทึกรูป!"</em> (ปุ่มจะกระพริบ) → เลือก <em>"บันทึกในรูปภาพ"</em><br>
     <strong>🖨️ ปริ้นอัตโนมัติ:</strong> ส่งคำสั่งปริ้นทันที ไม่ต้องกดเพิ่ม
    </div>

    <button onclick="document.getElementById('receipt-settings-sheet').remove()"
     style="margin-top:4px;padding:14px;border-radius:var(--r3);border:none;background:var(--gold);color:#fff;font-size:14px;font-weight:700;font-family:var(--ff);width:100%;cursor:pointer">
     ปิด
    </button>
   </div>
  </div>`;
 sheet.addEventListener('click',e=>{ if(e.target===sheet) sheet.remove(); });
 document.body.appendChild(sheet);
}

function receiptSettingToggle(key, val){
 const cfg = getReceiptSettings();
 cfg[key] = val;
 setReceiptSettings(cfg);
 // อัปเดต toggle UI
 const track = document.getElementById('tog-'+key+'-track');
 const thumb = document.getElementById('tog-'+key+'-thumb');
 if(track) track.style.background = val ? 'var(--gold)' : 'var(--bg-dk)';
 if(thumb) thumb.style.left = val ? '24px' : '4px';
 toast(key==='autoSave'
  ? (val ? '✅ บันทึกรูปอัตโนมัติ เปิดแล้ว' : 'บันทึกรูปอัตโนมัติ ปิดแล้ว')
  : (val ? '✅ ปริ้นอัตโนมัติ เปิดแล้ว' : 'ปริ้นอัตโนมัติ ปิดแล้ว'));
 // sync ปุ่มบน receipt footer ถ้าหน้าใบเสร็จเปิดอยู่
 if(document.getElementById('receiptPage')?.classList.contains('open')) updateReceiptFooter();
}


async function saveImageToGallery(canvas, fname){
 return new Promise(async (resolve)=>{
  canvas.toBlob(async (blob)=>{
   if(!blob){ toast('สร้างรูปไม่ได้'); resolve(false); return; }
   // วิธีที่ 1: Web Share API (iOS Safari ≥15 / Android Chrome ≥76)
   // → เปิด Share Sheet ของ OS ให้กด "บันทึกในรูปภาพ" ได้โดยตรง
   if(navigator.canShare && navigator.canShare({files:[new File([blob],fname,{type:'image/png'})]})){
    try{
     await navigator.share({
      files:[new File([blob],fname,{type:'image/png'})],
      title:'ใบเสร็จ NALINCHa'
     });
     toast('เปิด Share Sheet แล้ว — เลือก "บันทึกในรูปภาพ" ✓');
     resolve(true); return;
    }catch(e){
     if(e.name==='AbortError'){ toast('ยกเลิก'); resolve(false); return; }
     // ถ้า share ล้มเหลวด้วยเหตุอื่น → fallback ด้านล่าง
    }
   }
   // วิธีที่ 2: Fallback — a.download (desktop / browser ที่ไม่รองรับ Share API)
   const url = URL.createObjectURL(blob);
   const a = document.createElement('a');
   a.href = url; a.download = fname; a.click();
   setTimeout(()=>URL.revokeObjectURL(url), 3000);
   toast('บันทึกรูปแล้ว ✓ (ดูที่ Downloads)');
   resolve(true);
  },'image/png');
 });
}

async function saveReceiptAsImage(){
 // ── ใช้ canvas ที่ pre-render ไว้ถ้ามี (เร็วกว่า + ทันที user gesture) ──
 if(window._pendingReceiptCanvas && window._pendingReceiptFname){
  const canvas = window._pendingReceiptCanvas;
  const fname  = window._pendingReceiptFname;
  window._pendingReceiptCanvas = null;
  window._pendingReceiptFname  = null;
  // reset ปุ่ม
  const btn=document.getElementById('btnSaveReceipt');
  if(btn){ btn.innerHTML='<span class="mi" style="font-size:16px">download</span>บันทึกรูป'; btn.style.cssText=btn.style.cssText.replace(/animation[^;]+;?/g,''); }
  await saveImageToGallery(canvas, fname);
  return;
 }
 // ── Fallback: render ใหม่ (กรณีกดช้า / canvas expired) ──
 if(!window.html2canvas){
  await new Promise((res,rej)=>{
   const s=document.createElement('script');
   s.src='https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
   s.onload=res; s.onerror=rej;
   document.head.appendChild(s);
  });
 }
 const wrap = document.createElement('div');
 wrap.style.cssText=['position:fixed','top:-9999px','left:-9999px','width:302px','background:#fff','font-family:Sarabun,sans-serif','color:#1A0F08','padding:12px','box-sizing:border-box','line-height:1.5'].join(';');
 wrap.innerHTML = buildReceiptHTML();
 document.body.appendChild(wrap);
 try {
  const canvas = await html2canvas(wrap,{scale:3,useCORS:true,backgroundColor:'#ffffff',width:302,windowWidth:302});
  const d = new Date();
  const fname = `receipt_${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}_${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}.png`;
  await saveImageToGallery(canvas, fname);
 } catch(e) {
  toast('ไม่สามารถบันทึกรูปได้: '+e.message);
 } finally {
  if(wrap.parentNode) document.body.removeChild(wrap);
 }
}

function buildReceiptHTML(){
 const paper = document.getElementById('receiptPaper');
 const order = previewOrder || {};
 const op = lastOperator;
 const posId = DB.posId||'POS-01';
 const d = order.ts instanceof Date ? order.ts : new Date(order.ts||Date.now());
 const pad = n=>String(n).padStart(2,'0');
 const posNum=(DB.posId||'POS-01').replace(/\D/g,'').padStart(2,'0');
 const orderRef=pad(d.getDate())+pad(d.getMonth()+1)+String(d.getFullYear()).slice(-2)+pad(d.getHours())+pad(d.getMinutes())+posNum;
 const dateStr=d.toLocaleString('th-TH',{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});

 const items = (order.items||[]).map((i,n)=>{
  const promo = i.promoId?DB.promos.find(p=>p.id===i.promoId):null;
  const promoDisc = i.promoDisc||0;
  const net = i.price*i.qty - promoDisc;
  const conds=[i.size||'', i.ice||'', i.sweet?'หวาน '+i.sweet:'', i.strength?'เข้ม '+i.strength:''].filter(Boolean).join(' · ');
  return `<div style="padding:6px 0;border-bottom:1px dashed #ddd">
   <div style="display:flex;justify-content:space-between;align-items:flex-start">
    <div style="flex:1"><span style="font-size:9px;color:#999">${n+1}. </span><strong style="font-size:12px">${i.name}</strong> <span style="font-size:10px;color:#888">(${i.size})</span></div>
    <div style="text-align:right;flex-shrink:0;padding-left:8px"><span style="font-size:11px">x${i.qty}</span> <strong style="font-size:12px">฿${(i.price*i.qty).toLocaleString()}</strong></div>
   </div>
   ${conds?`<div style="font-size:10px;color:#888;padding-left:14px">${conds}</div>`:''}
   ${promo?`<div style="display:flex;justify-content:space-between;padding-left:14px;border-top:1px dashed #eee;margin-top:3px;padding-top:2px"><span style="font-size:10px;color:#c0392b">% ${promo.name}</span><span style="font-size:10px;color:#c0392b;font-weight:700">-฿${promoDisc}</span></div>`:''}
   <div style="display:flex;justify-content:space-between;padding-left:14px;border-top:1px dashed #eee;margin-top:2px;padding-top:2px"><span style="font-size:10px;color:#666">รวม</span><strong style="font-size:12px">฿${net.toLocaleString()}</strong></div>
  </div>`;
 }).join('');

 return `<div style="font-family:Sarabun,sans-serif;color:#1A0F08;font-size:12px;width:100%;box-sizing:border-box">
  <div style="text-align:center;margin-bottom:10px">
   <div style="font-size:20px;font-weight:900;letter-spacing:-0.5px">${DB.shopName||'POS-APP'}</div>
   <div style="font-size:11px;color:#888">${DB.shopSub||''}</div>
  </div>
  <hr style="border:none;border-top:1px dashed #bbb;margin:8px 0">
  <div style="display:flex;justify-content:space-between;padding:2px 0"><span style="color:#888;font-size:11px">เลขออเดอร์</span><strong style="font-size:11px;letter-spacing:.5px">${orderRef}</strong></div>
  <div style="display:flex;justify-content:space-between;padding:2px 0"><span style="color:#888;font-size:11px">วันที่</span><span style="font-size:11px">${dateStr}</span></div>
  <div style="display:flex;justify-content:space-between;padding:2px 0"><span style="color:#888;font-size:11px">หมายเลข POS</span><span style="font-size:11px">${posId}</span></div>
  <hr style="border:none;border-top:1px dashed #bbb;margin:8px 0">
  ${items}
  <hr style="border:none;border-top:1px dashed #bbb;margin:8px 0">
  ${(order.discount||0)>0?`<div style="display:flex;justify-content:space-between;padding:3px 0"><span>รวม</span><span>฿${(order.subTotal||0).toLocaleString()}</span></div>
  <div style="display:flex;justify-content:space-between;padding:3px 0;color:#c0392b"><span>ส่วนลด</span><span>-฿${(order.discount||0).toLocaleString()}</span></div>`:''}
  <div style="display:flex;justify-content:space-between;padding:5px 0;border-top:2px solid #333;margin-top:4px">
   <strong style="font-size:15px">รวมทั้งสิ้น</strong>
   <strong style="font-size:18px;color:#2A1810">฿${(order.total||0).toLocaleString()}</strong>
  </div>
  <div style="text-align:center;font-size:11px;color:#aaa;margin-top:14px;padding-top:8px;border-top:1px dashed #ddd">ขอบคุณที่ใช้บริการ</div>
 </div>`;
}
function printSalesCopy(orderId){
 openPinModal('พิมพ์สำเนาใบเสร็จ','ใส่รหัส Manager เพื่อยืนยัน','manager',(ok,emp)=>{
  if(!ok||!emp) return;
  const order=DB.orders.find(o=>String(o.id)===String(orderId));
  if(!order){toast('ไม่พบออเดอร์');return;}
  showCopyOptions(order,emp);
 });
}

function buildCopyReceiptHTML(order, emp){
 const d=new Date(order.ts);
 const pad=n=>String(n).padStart(2,'0');
 const dateStr=d.toLocaleString('th-TH',{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
 const CUST={extraShot:'เพิ่มช็อต',extraMatcha:'เพิ่มมัทฉะ',extraCocoa:'เพิ่มโกโก้'};
 const itemHTML=order.items.map((i,n)=>{
  const promo=i.promoId?DB.promos.find(p=>p.id===i.promoId):null;
  const opts=[i.size||'', i.ice||'', i.sweet?'หวาน '+i.sweet:'', i.strength?'เข้ม '+i.strength:''].filter(Boolean).join(' · ');
  const net=i.price*i.qty-(i.promoDisc||0);
  return `<div style="padding:5px 0;border-bottom:1px dashed #ddd">
   <div style="display:flex;gap:4px"><span style="color:#aaa;font-size:10px">${n+1}.</span>
    <span style="flex:1;font-weight:600;font-size:12px">${i.name} (${i.size})</span>
    <span style="color:#777;font-size:11px">x${i.qty}</span>
    <strong style="min-width:50px;text-align:right;font-size:12px">฿${(i.price*i.qty).toLocaleString()}</strong></div>
   ${opts?`<div style="font-size:10px;color:#888;padding-left:12px">${opts}</div>`:''}
   ${promo?`<div style="display:flex;justify-content:space-between;padding-left:12px;font-size:10px;color:#c0392b"><span>% ${promo.name}</span><span>-฿${i.promoDisc||0}</span></div>`:''}
   <div style="display:flex;justify-content:space-between;padding-left:12px;border-top:1px dashed #eee;margin-top:2px;padding-top:2px">
    <span style="font-size:10px;color:#666">รวม</span><strong style="font-size:12px">฿${net.toLocaleString()}</strong></div>
  </div>`;
 }).join('');

 return `<div style="font-family:Sarabun,sans-serif;color:#1A0F08;font-size:12px;width:278px;box-sizing:border-box;position:relative;word-break:break-word;overflow-wrap:break-word">
  <!-- WATERMARK -->
  <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);font-size:32px;font-weight:900;color:rgba(180,50,40,.12);white-space:nowrap;pointer-events:none;z-index:0">สำเนาใบเสร็จ</div>
  <div style="position:relative;z-index:1">
   <div style="text-align:center;margin-bottom:10px">
    <div style="font-size:20px;font-weight:900">${DB.shopName||''}</div>
    <div style="font-size:11px;color:#888">${DB.shopSub||''}</div>
    <div style="font-size:10px;font-weight:700;color:#B83228;background:#fff3f3;border:1px solid #ffcccc;border-radius:4px;padding:3px 8px;margin-top:6px;display:inline-block">สำเนาใบเสร็จ</div>
   </div>
   <hr style="border:none;border-top:1px dashed #bbb;margin:8px 0">
   <div style="display:flex;justify-content:space-between;gap:8px;padding:2px 0"><span style="color:#888;font-size:11px;flex-shrink:0">เลขออเดอร์</span><strong style="font-size:10px;text-align:right;word-break:break-all">${order.id}</strong></div>
   <div style="display:flex;justify-content:space-between;padding:2px 0"><span style="color:#888;font-size:11px">วันที่</span><span style="font-size:11px">${dateStr}</span></div>
   <div style="display:flex;justify-content:space-between;padding:2px 0"><span style="color:#888;font-size:11px">ผู้ขาย</span><span style="font-size:11px;font-weight:600">${order.empId||lastOperator?.id||'—'} ${order.empName||lastOperator?.name||''}</span></div>
   <div style="display:flex;justify-content:space-between;padding:2px 0"><span style="color:#888;font-size:11px">ผู้อนุมัติสำเนา</span><span style="font-size:11px;font-weight:600;color:#B83228">${emp.id} ${emp.name}</span></div>
   <div style="display:flex;justify-content:space-between;padding:2px 0"><span style="color:#888;font-size:11px">หมายเลข POS</span><span style="font-size:11px">${DB.posId||'POS-01'}</span></div>
   <hr style="border:none;border-top:1px dashed #bbb;margin:8px 0">
   ${itemHTML}
   <hr style="border:none;border-top:1px dashed #bbb;margin:8px 0">
   ${(order.discount||0)>0?`<div style="display:flex;justify-content:space-between;padding:2px 0;color:#c0392b"><span>ส่วนลด</span><span>-฿${order.discount.toLocaleString()}</span></div>`:''}
   <div style="display:flex;justify-content:space-between;padding:5px 0;border-top:2px solid #333;margin-top:4px">
    <strong style="font-size:14px">รวมทั้งสิ้น</strong><strong style="font-size:17px">฿${order.total.toLocaleString()}</strong></div>
   <div style="text-align:center;font-size:10px;color:#aaa;margin-top:12px;padding-top:8px;border-top:1px dashed #ddd">ขอบคุณที่ใช้บริการ</div>
  </div>
 </div>`;
}

function showCopyOptions(order,emp){
 // แสดง bottom sheet เลือก Print หรือ Save Image
 let existing=document.getElementById('copy-options-sheet');
 if(existing) existing.remove();
 const sheet=document.createElement('div');
 sheet.id='copy-options-sheet';
 sheet.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9500;display:flex;align-items:flex-end;justify-content:center';
 sheet.innerHTML=`<div style="background:var(--bg);border-radius:var(--r4) var(--r4) 0 0;padding:20px 20px 40px;width:100%;max-width:480px;box-shadow:0 -8px 32px rgba(0,0,0,.2)">
  <div style="text-align:center;margin-bottom:16px">
   <div style="font-size:16px;font-weight:800;color:var(--t1)">สำเนาใบเสร็จ #${order.id}</div>
   <div style="font-size:11px;color:var(--t4)">เลือกวิธีการส่งออก</div>
  </div>
  <div style="display:flex;flex-direction:column;gap:10px">
   <button class="btn btn-dark" style="display:flex;align-items:center;justify-content:center;gap:8px;padding:14px"
    onclick="saveCopyAsImage()">
    <span class="mi" style="font-size:20px">download</span>
    บันทึกรูปลงอุปกรณ์
   </button>
   <button class="btn btn-secondary" style="display:flex;align-items:center;justify-content:center;gap:8px;padding:14px"
    onclick="printCopyReceipt()">
    <span class="mi" style="font-size:20px">print</span>
    พิมพ์ใบเสร็จ
   </button>
   <button class="btn btn-secondary" onclick="document.getElementById('copy-options-sheet').remove()">ยกเลิก</button>
  </div>
 </div>`;
 sheet.addEventListener('click',e=>{if(e.target===sheet)sheet.remove();});
 document.body.appendChild(sheet);
 // เก็บ order+emp ไว้ใช้ใน callback
 sheet._order=order; sheet._emp=emp;
}

async function saveCopyAsImage(){
 const sheet=document.getElementById('copy-options-sheet');
 if(!sheet){toast('เกิดข้อผิดพลาด');return;}
 // copy ข้อมูลออกมาก่อน remove sheet
 const order=sheet._order;
 const emp=sheet._emp;
 if(!order||!emp){toast('ไม่พบข้อมูลใบเสร็จ');return;}
 sheet.remove();
 if(!window.html2canvas){
  await new Promise((res,rej)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';s.onload=res;s.onerror=rej;document.head.appendChild(s);});
 }
 const wrap=document.createElement('div');
 wrap.style.cssText='position:absolute;top:-99999px;left:-99999px;width:302px;background:#fff;font-family:Sarabun,sans-serif;padding:12px;box-sizing:border-box;overflow:visible;white-space:normal;word-break:break-word';
 wrap.innerHTML=buildCopyReceiptHTML(order,emp);
 document.body.appendChild(wrap);
 try{
  // วัดความสูงจริงก่อน render
  await new Promise(r=>setTimeout(r,100)); // รอ layout settle
  const actualH = wrap.scrollHeight;
  const canvas=await html2canvas(wrap,{
   scale:3,useCORS:true,backgroundColor:'#ffffff',
   width:302,height:actualH,
   windowWidth:302,windowHeight:actualH,
   scrollX:0,scrollY:0
  });
  const d=new Date();
  const fname=`copy_receipt_${order.id}_${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}.png`;
  await saveImageToGallery(canvas, fname);
 }catch(e){toast('บันทึกไม่ได้: '+e.message);}
 finally{document.body.removeChild(wrap);}
}

async function printCopyReceipt(){
 const sheet=document.getElementById('copy-options-sheet');
 if(!sheet){toast('เกิดข้อผิดพลาด');return;}
 // copy ข้อมูลออกมาก่อน remove sheet
 const order=sheet._order;
 const emp=sheet._emp;
 if(!order||!emp){toast('ไม่พบข้อมูลใบเสร็จ');return;}
 sheet.remove();
 // render สำเนาเป็น PNG แล้วปริ้น width:80mm (ตรงทุก browser/OS)
 try{
  if(!window.html2canvas){
   await new Promise((res,rej)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';s.onload=res;s.onerror=rej;document.head.appendChild(s);});
  }
  const wrap=document.createElement('div');
  wrap.style.cssText='position:absolute;top:-99999px;left:-99999px;width:302px;background:#fff;font-family:Sarabun,sans-serif;padding:12px;box-sizing:border-box;overflow:visible;white-space:normal;word-break:break-word';
  wrap.innerHTML=buildCopyReceiptHTML(order,emp);
  document.body.appendChild(wrap);
  await new Promise(r=>setTimeout(r,100));
  const actualH=wrap.scrollHeight;
  const canvas=await html2canvas(wrap,{scale:3,useCORS:true,backgroundColor:'#ffffff',width:302,height:actualH,windowWidth:302,windowHeight:actualH,scrollX:0,scrollY:0});
  document.body.removeChild(wrap);
  const dataUrl=canvas.toDataURL('image/png');
  const existIframe=document.getElementById('_printFrame');
  if(existIframe) existIframe.remove();
  const iframe=document.createElement('iframe');
  iframe.id='_printFrame';
  iframe.style.cssText='position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;opacity:0';
  document.body.appendChild(iframe);
  const doc=iframe.contentDocument||iframe.contentWindow.document;
  doc.open();
  doc.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>*{margin:0;padding:0;box-sizing:border-box;}body{background:#fff;}img{display:block;width:80mm;height:auto;}@page{margin:0;size:80mm auto;}@media print{img{width:80mm;}}</style></head><body><img src="${dataUrl}"></body></html>`);
  doc.close();
  iframe.onload=function(){setTimeout(()=>{try{iframe.contentWindow.focus();iframe.contentWindow.print();toast('🖨️ ส่งคำสั่งปริ้นสำเนาแล้ว');}catch(e){toast('ปริ้นไม่ได้: '+e.message);}setTimeout(()=>{if(iframe.parentNode)iframe.remove();},3000);},200);};
 }catch(e){toast('เตรียมปริ้นไม่ได้: '+e.message);}
}


function newOrderFromReceipt(){
 closeReceiptPage();
 closeOrderPanel();
 goPage('order');
 toast('พร้อมรับออเดอร์ใหม่');
}

/* 
 RECIPE SLIP
 */
function openRecipeSlip(order){
 if(!order) return;
 // สร้างหมายเลขออเดอร์ (ดึงจาก receipt logic)
 const d = order.ts instanceof Date ? order.ts : new Date(order.ts||Date.now());
 const pad=n=>String(n).padStart(2,'0');
 const ref=pad(d.getDate())+pad(d.getMonth()+1)+String(d.getFullYear()).slice(-2)+pad(d.getHours())+pad(d.getMinutes());
 const refEl=document.getElementById('recipeSlipOrderRef');
 if(refEl) refEl.textContent='#'+ref;

 const body=document.getElementById('recipeSlipBody');
 if(!body) return;

 let html='';
 let slipIdx=0;
 order.items.forEach((item,n)=>{
  const menu=DB.menus.find(x=>x.id===item.menuId);
  const recipe=menu&&menu.recipeId ? DB.recipes.find(r=>r.id===menu.recipeId) : null;
  const ings=recipe ? (recipe.ingredients||recipe.ings||[]) : [];

  // สีพื้นหัว card ตามสีเมนู
  const hdrColor=menu&&menu.color ? menu.color : 'var(--esp)';

  // option tags
  const optTags=[];
  if(item.size) optTags.push(`<span class="recipe-slip-opt-tag">${item.size}</span>`);
  if(item.ice)  optTags.push(`<span class="recipe-slip-opt-tag">${item.ice}</span>`);
  if(item.sweet && item.sweet!=='50%') optTags.push(`<span class="recipe-slip-opt-tag sweet">หวาน ${item.sweet}</span>`);
  if(item.strength && item.strength!=='50%') optTags.push(`<span class="recipe-slip-opt-tag strength">เข้ม ${item.strength}</span>`);
  if(item.note) optTags.push(`<span class="recipe-slip-opt-tag note">${item.note}</span>`);

  // ingredient rows — ปริมาณคูณด้วย qty ของ item
  let ingsHtml='';
  if(ings.length){
   ingsHtml='<div class="recipe-slip-ings">';
   ings.forEach(row=>{
    const ing=DB.ingredients.find(x=>x.id===row.ingId);
    const bld=row.ingId&&row.ingId.startsWith('blend_') ? DB.blends.find(x=>x.id===row.ingId) : null;
    const ingName=ing ? ing.name : (bld ? bld.name+'(เบลนด์)' : (row.ingId||'?'));
    const ingUnit=ing ? (ing.unit||'') : '';
    const totalQty=((row.qty||0)*item.qty);
    const qtyDisplay=Number.isInteger(totalQty)?totalQty:totalQty.toFixed(1);
    ingsHtml+=`<div class="recipe-slip-ing-row">
     <div class="recipe-slip-ing-dot"></div>
     <div class="recipe-slip-ing-name">${ingName}</div>
     <div class="recipe-slip-ing-qty">${qtyDisplay} ${ingUnit}</div>
    </div>`;
   });
   ingsHtml+='</div>';
  } else {
   ingsHtml=`<div class="recipe-slip-no-recipe">ไม่มีสูตรบันทึกไว้ — ทำตามมาตรฐานร้าน</div>`;
  }

  slipIdx++;
  html+=`<div class="recipe-slip-card">
   <div class="recipe-slip-header" style="background:${hdrColor}">
    <div class="recipe-slip-num">${slipIdx}</div>
    <div class="recipe-slip-menu-name">${item.name}</div>
    <div class="recipe-slip-qty">×${item.qty}</div>
   </div>
   ${optTags.length?`<div class="recipe-slip-opts">${optTags.join('')}</div>`:''}
   ${ingsHtml}
  </div>`;
 });

 body.innerHTML=html||'<div style="padding:32px;text-align:center;color:var(--t4);font-size:13px">ไม่มีข้อมูลสูตรสำหรับออเดอร์นี้</div>';
 document.getElementById('recipeSlipPage').classList.add('open');
}

function closeRecipeSlip(){
 document.getElementById('recipeSlipPage').classList.remove('open');
}

function closeRecipeSlipAndNew(){
 closeRecipeSlip();
 closeReceiptPage();
 closeOrderPanel();
 goPage('order');
 toast('พร้อมรับออเดอร์ใหม่');
}

/*
 KITCHEN PAGE (ครัว)
 แสดงออเดอร์วันนี้พร้อมสูตร — พนักงานกด "เสร็จแล้ว" ต่อบิล
 */
let kitchenFilter='pending';

function switchKitchenTab(btn,filter){
 btn.closest('.tab-bar').querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
 btn.classList.add('active');
 kitchenFilter=filter;
 renderKitchen();
}

function updateKitchenBadge(){
 const count=getTodayOrders().filter(o=>o.status!=='voided'&&!o.kitchenDone).length;
 const badge=document.getElementById('navKitchenBadge');
 if(!badge)return;
 if(count>0){badge.textContent=count;badge.classList.add('show');}
 else badge.classList.remove('show');
}

function markKitchenDone(orderId){
 const order=DB.orders.find(o=>String(o.id)===String(orderId));
 if(!order)return;
 order.kitchenDone=true;
 scheduleSync();
 updateKitchenBadge();
 renderKitchen();
 toast('เสร็จแล้ว ✓');
}

function renderKitchen(){
 const allOrders=getTodayOrders().filter(o=>o.status!=='voided');
 const pendingCount=allOrders.filter(o=>!o.kitchenDone).length;
 const subEl=document.getElementById('kitchenSub');
 if(subEl) subEl.textContent=`รอทำ ${pendingCount} บิล`;
 updateKitchenBadge();

 let orders;
 if(kitchenFilter==='pending') orders=allOrders.filter(o=>!o.kitchenDone);
 else if(kitchenFilter==='done') orders=allOrders.filter(o=>!!o.kitchenDone);
 else orders=allOrders;
 // FIFO: เก่าสุดขึ้นก่อน
 orders=orders.slice().sort((a,b)=>a.ts-b.ts);

 const listEl=document.getElementById('kitchenList');
 if(!listEl)return;

 if(!orders.length){
  const emptyIcon=kitchenFilter==='done'?'check_circle':'local_cafe';
  const emptyMsg=kitchenFilter==='pending'?'ไม่มีออเดอร์รอทำ':kitchenFilter==='done'?'ยังไม่มีออเดอร์เสร็จแล้ว':'ยังไม่มีออเดอร์วันนี้';
  listEl.innerHTML=`<div class="empty-state"><div class="e-icon"><span class="mi" style="font-size:40px;opacity:.4">${emptyIcon}</span></div><div class="e-title">${emptyMsg}</div></div>`;
  return;
 }

 listEl.innerHTML=orders.map(order=>{
  const d=new Date(order.ts);
  const timeStr=d.toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'});
  const isDone=!!order.kitchenDone;
  const totalDrinks=order.items.reduce((s,i)=>s+i.qty,0);

  // ── Item cards ─────────────────────────────
  const itemsHtml=order.items.map((item,idx)=>{
   const menu=DB.menus.find(m=>m.id===item.menuId);
   const recipe=menu&&menu.recipeId?DB.recipes.find(r=>r.id===menu.recipeId):null;
   const ings=recipe?(recipe.ingredients||recipe.ings||[]):[];
   const hdrColor=menu&&menu.color?menu.color:'var(--esp)';

   // option tags
   const optTags=[];
   if(item.size) optTags.push(`<span class="kitchen-opt-tag">${item.size}</span>`);
   if(item.ice)  optTags.push(`<span class="kitchen-opt-tag">${item.ice}</span>`);
   if(item.sweet&&item.sweet!=='50%') optTags.push(`<span class="kitchen-opt-tag sweet">หวาน ${item.sweet}</span>`);
   if(item.strength&&item.strength!=='50%') optTags.push(`<span class="kitchen-opt-tag strong">เข้ม ${item.strength}</span>`);
   if(item.note) optTags.push(`<span class="kitchen-opt-tag note">${item.note}</span>`);

   // ingredient rows
   let ingsHtml='';
   if(ings.length){
    ingsHtml='<div class="kitchen-ings">'+ings.map(row=>{
     const ing=DB.ingredients.find(x=>x.id===row.ingId);
     const bld=row.ingId&&row.ingId.startsWith('blend_')?DB.blends.find(x=>x.id===row.ingId):null;
     const ingName=ing?ing.name:(bld?bld.name+' (เบลนด์)':'?');
     const ingUnit=ing?(ing.unit||''):'';
     const totalQty=(row.qty||0)*item.qty;
     const qtyDisp=Number.isInteger(totalQty)?totalQty:totalQty.toFixed(1);
     return `<div class="kitchen-ing-row">
      <div class="kitchen-ing-dot"></div>
      <div class="kitchen-ing-name">${ingName}</div>
      <div class="kitchen-ing-qty">${qtyDisp} ${ingUnit}</div>
     </div>`;
    }).join('')+'</div>';
   } else {
    ingsHtml='<div class="kitchen-no-recipe">ทำตามมาตรฐานร้าน</div>';
   }

   return `<div class="kitchen-item">
    <div class="kitchen-item-head" style="background:${hdrColor}">
     <div class="kitchen-item-num">${idx+1}</div>
     <div class="kitchen-item-name">${item.name}</div>
     <div class="kitchen-item-qty">×${item.qty}</div>
    </div>
    ${optTags.length?`<div class="kitchen-item-opts">${optTags.join('')}</div>`:''}
    ${ingsHtml}
   </div>`;
  }).join('');

  // ── Done button / badge ────────────────────
  const doneSection=isDone
   ?`<div style="padding:10px 14px;border-top:1px solid rgba(176,154,133,.12);display:flex;align-items:center;gap:6px;justify-content:center">
      <span class="mi" style="font-size:16px;color:var(--green)">check_circle</span>
      <span style="font-size:12px;font-weight:700;color:var(--green)">เสร็จแล้ว</span>
     </div>`
   :`<div style="padding:12px 14px;border-top:1px solid rgba(176,154,133,.12)">
      <button class="kitchen-done-btn" onclick="markKitchenDone('${order.id}')">
       <span class="mi" style="font-size:18px">check_circle</span> ทำเสร็จแล้ว
      </button>
     </div>`;

  return `<div class="kitchen-order-card${isDone?' done':''}">
   <div class="kitchen-order-head">
    <div style="display:flex;align-items:center">
     <span class="kitchen-order-id">บิล #${order.id}</span>
     <span class="kitchen-order-time">${timeStr} · ${totalDrinks} แก้ว</span>
    </div>
    <span class="kitchen-status ${isDone?'done':'pending'}">${isDone?'<span class="mi" style="font-size:12px">check_circle</span> เสร็จ':'รอทำ'}</span>
   </div>
   ${itemsHtml}
   ${doneSection}
  </div>`;
 }).join('');
}

/*
 MANAGE PAGE
 */