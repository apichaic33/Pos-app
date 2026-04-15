/* 
 DATA STORE
 */
let DB = {
 shopName: '', // ← ชื่อร้าน
 shopSub: '', // ← คำอธิบายร้าน
 posId: 'POS-01', // ← หมายเลข POS
 otpEmail: '', // ← email สำหรับ OTP recovery
 appConfig: {theme:'warm',locale:'th-TH',dateFormat:'short'}, // ← app settings
 menus: [],
 promos: [],
 orders: [],
 staffLogs: [],
 recipes: [],
 ingredients: [],
 packages: [],
 equipment: [],
 useLogs: [],
 purchaseOrders: [],
 blends: [],
 blendBatches: [],
 employees: [],
 auditLog: [],
 pendingVoids: [],
 nextId: 1,
 customOptions: [], // global custom options pool: [{id, key, label, price, active}]
 optionSets: {
  sizes:    {label:'ขนาด',       default:'200ml',      items:[{label:'200ml',price:0},{label:'1000ml',price:30}]},
  ice:      {label:'น้ำแข็ง',    default:'มีน้ำแข็ง', items:[{label:'มีน้ำแข็ง',price:0},{label:'ไม่มีน้ำแข็ง',price:0}]},
  sweet:    {label:'ความหวาน',   default:'50%',        items:[{label:'0%',price:0},{label:'25%',price:0},{label:'50%',price:0},{label:'75%',price:0},{label:'100%',price:0}]},
  strength: {label:'ความเข้ม',   default:'50%',        items:[{label:'25%',price:0},{label:'50%',price:0},{label:'75%',price:0},{label:'100%',price:0}]}
 }
};

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
let activeCat='coffee';

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
 const promo=i.autoPromoId?DB.promos.find(x=>x.id===i.autoPromoId):null;
 const noteParts=(i.note||'').split(' · ');
 const customTags=Object.values(CUST_LABELS).filter(v=>noteParts.includes(v));
 const otherNote=noteParts.filter(p=>!Object.values(CUST_LABELS).includes(p)).join(' · ');
 const metaLine=[i.size||'',i.ice||'',i.sweet?'หวาน '+i.sweet:'',i.strength?'เข้ม '+i.strength:'',otherNote].filter(Boolean).join(' · ');
 const icePrice2   = getOptItemPrice('ice', i.ice);
 const sweetPrice2 = getOptItemPrice('sweet', i.sweet);
 const strPrice2   = getOptItemPrice('strength', i.strength);
 const sizePrice2  = getOptItemPrice('sizes', i.size);
 const optExtra    = icePrice2+sweetPrice2+strPrice2+sizePrice2;
 const disc=i.autoPromoDisc||0;
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
 id:'ORD-TMP-'+Date.now(),
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
 const discount=orderItems.reduce((s,i)=>s+(i.promoDisc||0),0);
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
 MANAGE PAGE
 */
let mgCat='all';
function switchMgTab(btn,cat){
 btn.closest('.tab-bar').querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
 btn.classList.add('active');mgCat=cat;renderManage(cat);
}
function renderManage(cat){
 const list=cat==='all'?DB.menus:DB.menus.filter(m=>m.cat===cat);
 document.getElementById('mgSub').textContent=list.length+'เมนู';
 const customLabels = {extraShot:'เพิ่มช็อต',extraMatcha:'เพิ่มมัทฉะ',extraCocoa:'เพิ่มโกโก้'};
 document.getElementById('mgList').innerHTML = (list.length ? list.map(m=>{
 const custOpts = (m.customOptions||[]).map(k=>customLabels[k]||(k.startsWith('dyn:')?k.slice(4):k)).join(' · ');
 return`
 <div style="margin:0 16px 12px;background:var(--bg);border-radius:var(--r4);box-shadow:var(--neu-out-sm);overflow:hidden"> <div style="display:flex;align-items:center;gap:12px;padding:12px 14px"> <div style="width:46px;height:46px;border-radius:var(--r3);background:${m.color};flex-shrink:0;display:flex;align-items:center;justify-content:center;box-shadow:var(--neu-out-xs)"> <span style="font-size:20px;font-weight:900;color:rgba(255,255,255,.9);font-family:var(--fh)">${m.icon}</span> </div> <div style="flex:1;min-width:0"> <div style="font-size:14px;font-weight:700;color:var(--t1);font-family:var(--fh)">${m.name}</div> <div style="font-size:10px;color:var(--t4);margin-top:2px"> ${catLabel(m.cat)} · ${m.vol}ml · ต้นทุน ฿${m.cost}
 ${(()=>{const mg=m.price>0?Math.round((m.price-m.cost)/m.price*100):0;const c=mg>=50?'var(--green)':mg>=30?'var(--gold)':'var(--red)';return `<span style="color:${c};font-weight:700">· Margin ${mg}%</span>`})()}
 · ขาย ${m.sold}
 </div> ${custOpts?`<div style="font-size:9px;color:var(--blue);margin-top:3px;font-weight:600"> ${custOpts}</div>`:''}
 </div> <div style="text-align:right;flex-shrink:0"> <div style="display:flex;align-items:center;gap:6px"> <div style="font-size:16px;font-weight:800;color:var(--cara);font-family:var(--fh)">฿${m.price}</div> ${m.recipeId?'<span style="font-size:9px;background:var(--blue-lt);color:var(--blue);border-radius:var(--rf);padding:2px 6px;font-weight:700"> มีสูตร</span>':''}
 </div> <span class="badge ${m.status==='active'?'badge-green':'badge-gray'}" style="font-size:9px">${m.status==='active'?'เปิด':'ปิด'}</span> </div> </div> <div style="display:flex;border-top:1px solid rgba(176,154,133,.12)"> <button class="btn btn-secondary" style="flex:1;border-radius:0;padding:10px;font-size:12px;font-weight:600;border-right:1px solid rgba(176,154,133,.12)"
 onclick="editMenu(${m.id})"> แก้ไข</button> <button class="btn btn-danger" style="flex:1;border-radius:0;padding:10px;font-size:12px;font-weight:600"
 onclick="delMenu(${m.id})"> ลบ</button> </div> </div>`}).join('') : '<div class="empty-state"><div class="e-icon"><span class="mi" style="font-size:40px;opacity:.4">emoji_food_beverage</span></div><div class="e-title">ยังไม่มีเมนู</div></div>');
}
function catLabel(c){return{coffee:'กาแฟ',tea:'ชา',cocoa:'โกโก้',custom:'Custom',other:'อื่นๆ'}[c]||c;}
function addCustomOption(){
 const list = document.getElementById('customDynamicOptions');
 if(!list) return;
 const id = 'customDyn_' + Date.now();
 const row = document.createElement('div');
 row.style = 'display:flex;align-items:center;gap:6px;padding:4px 0';
 row.innerHTML = `<input type="checkbox" id="${id}" checked>
  <input class="f-input" placeholder="ชื่อตัวเลือก เช่น เพิ่มซีรัป"
   style="flex:1;padding:5px 8px;font-size:12px" maxlength="20"
   oninput="document.getElementById('${id}').setAttribute('data-label',this.value)">
  <button onclick="this.parentNode.remove()" style="background:var(--red-lt);color:var(--red);border:none;border-radius:var(--rf);padding:4px 7px;cursor:pointer;flex-shrink:0"><span class="mi" style="font-size:14px">delete</span></button>`;
 list.appendChild(row);
 row.querySelector('input[type=text],input.f-input:not([type=checkbox])').focus();
}
function toggleCustomFields(){
 document.getElementById('customFieldsSection').style.display='block';
 renderMenuCustomCheckboxes();
 renderSizeCheckboxGroup();
}

function renderSizeCheckboxGroup(selectedSizes){
 const grp = document.getElementById('sizeCheckboxGroup');
 if(!grp) return;
 const pool = (DB.optionSets&&DB.optionSets.sizes&&DB.optionSets.sizes.items.length)
   ? DB.optionSets.sizes.items : ['200ml','1000ml'];
 // เก็บ hidden inputs ไว้
 const hidden = grp.querySelectorAll('input[type=hidden]');
 grp.innerHTML = '';
 hidden.forEach(h=>grp.appendChild(h));
 pool.forEach((s,i)=>{
  const sl = getOptLabel(s);
  const sp = getOptPrice(s);
  const isChecked = selectedSizes ? selectedSizes.includes(sl) : (i===0);
  const lbl = document.createElement('label');
  lbl.style.cssText='display:flex;align-items:center;gap:6px;font-size:13px;background:var(--bg);border-radius:var(--r2);padding:6px 10px;box-shadow:var(--neu-out-xs);cursor:pointer';
  lbl.innerHTML=`<input type="checkbox" class="size-dynamic-cb" data-size="${sl}" ${isChecked?'checked':''}> ${sl}${sp>0?' <span style="font-size:10px;color:var(--gold);font-weight:700">+฿'+sp+'</span>':''}`;
  grp.appendChild(lbl);
 });
}

function renderMenuCustomCheckboxes(selectedKeys){
 const el = document.getElementById('menuCustomCheckboxList');
 if(!el) return;
 const opts = (DB.customOptions||[]);
 if(!opts.length){
  el.innerHTML='<div style="font-size:12px;color:var(--t4);padding:4px 0">ยังไม่มี Custom Options — <a href="#" onclick="event.preventDefault();closeModal(\"modal-add-menu\");drawerGo(\"custom\")" style="color:var(--blue)">ไปเพิ่มได้เลย</a></div>';
  return;
 }
 el.innerHTML = opts.map(o=>{
  const checked = selectedKeys ? selectedKeys.includes(o.key) : false;
  return `<label style="display:flex;align-items:center;gap:8px;padding:5px 0;font-size:13px;color:var(--t2);border-bottom:1px solid rgba(43,94,167,.08)">
   <input type="checkbox" class="custom-opt-cb" data-key="${o.key}" ${checked?'checked':''} ${!o.active?'style="opacity:.4"':''}>
   <span style="flex:1">${o.label}${!o.active?' <span style=\"font-size:10px;color:var(--t4)\">(ปิดอยู่)</span>':''}</span>
   <span style="font-size:10px;color:var(--gold);font-weight:700">+฿${o.price||10}</span>
  </label>`;
 }).join('');
}
function openNewMenuModal(){
 // reset form
 document.getElementById('menuEditId').value='';
 document.getElementById('menuModalTitle').innerHTML='<span class="mi" style="font-size:18px;color:var(--cara)">restaurant_menu</span>เพิ่มเมนูใหม่';
 document.getElementById('menuName').value='';
 document.getElementById('menuPrice').value='';
 document.getElementById('menuCost').value='';
 document.getElementById('menuDesc').value='';
 document.getElementById('menuIcon').value='';
 document.getElementById('menuStatus').value='active';
 document.getElementById('menuCat').value='coffee';
 document.getElementById('menuVol').value='200';
 document.getElementById('menuColor').value='#2C1810';
 document.getElementById('menuRecipeId').value='';
 switchMenuTab('info');
 toggleCustomFields();
 renderSizeCheckboxGroup([]);  // แสดง pool ทั้งหมด ไม่มีอะไรติ๊ก
 renderMenuCustomCheckboxes([]);
 const dynList=document.getElementById('customDynamicOptions');
 if(dynList) dynList.innerHTML='';
 openModal('modal-add-menu');
}
function editMenu(id){
 const m=DB.menus.find(x=>x.id===id);if(!m)return;
 document.getElementById('menuModalTitle').textContent='แก้ไขเมนู';
 document.getElementById('menuEditId').value=m.id;
 document.getElementById('menuName').value=m.name;
 document.getElementById('menuCat').value=m.cat;
 document.getElementById('menuPrice').value=m.price;
 document.getElementById('menuCost').value=m.cost;
 document.getElementById('menuVol').value=m.vol;
 document.getElementById('menuIcon').value=m.icon;
 document.getElementById('menuColor').value=m.color;
 document.getElementById('menuDesc').value=m.desc;
 document.getElementById('menuStatus').value=m.status;
 renderSizeCheckboxGroup(m.sizes||[]);
 
 const co=m.customOptions||[];
 toggleCustomFields();
 renderMenuCustomCheckboxes(co);
 renderSizeCheckboxGroup(m.sizes||[]);
 // legacy hidden inputs (backward compat)
 const dynList=document.getElementById('customDynamicOptions');
 if(dynList){ dynList.innerHTML='';
  co.filter(k=>k.startsWith('dyn:')).forEach(k=>{
   const label=k.slice(4);
   const id='customDyn_'+Date.now()+'_'+Math.random().toString(36).slice(2);
   const row=document.createElement('div');
   row.style='display:flex;align-items:center;gap:6px;padding:4px 0';
   row.innerHTML=`<input type="checkbox" id="${id}" checked data-label="${label}">
    <input class="f-input" placeholder="ชื่อตัวเลือก" value="${label}"
     style="flex:1;padding:5px 8px;font-size:12px" maxlength="20"
     oninput="document.getElementById('${id}').setAttribute('data-label',this.value)">
    <button onclick="this.parentNode.remove()" style="background:var(--red-lt);color:var(--red);border:none;border-radius:var(--rf);padding:4px 7px;cursor:pointer;flex-shrink:0"><span class="mi" style="font-size:14px">delete</span></button>`;
   dynList.appendChild(row);
  });
 }
 toggleCustomFields();
 document.querySelectorAll('.color-dot').forEach(d=>{d.classList.toggle('selected',d.style.backgroundColor===m.color||d.getAttribute('onclick')?.includes(m.color));});
 fillPromoSelect('menuPromo',m.promoId);
 // load recipe
 menuRecipeIngredients = [];
 const rec = DB.recipes.find(r=>r.menuId===m.id);
 if(rec){ menuRecipeIngredients = (rec.ingredients||rec.ings||[]).map(i=>({...i})); document.getElementById('menuRecipeId').value=rec.id; }
 else { document.getElementById('menuRecipeId').value=''; }
 switchMenuTab('info');
 openModal('modal-add-menu');
}
function delMenu(id){
 if(!confirm('ลบเมนูนี้?'))return;
 DB.menus=DB.menus.filter(m=>m.id!==id);renderManage(mgCat);toast('ลบเมนูแล้ว');
}
// Menu Recipe helpers 
let menuRecipeIngredients = []; // [{ingId, qty}]

function switchMenuTab(tab){
 ['info','recipe'].forEach(t=>{
 document.getElementById('menuSection-'+t).style.display = t===tab?'':'none';
 document.getElementById('menuTab-'+t).classList.toggle('active', t===tab);
 });
 if(tab==='recipe'){ renderMenuRecipeRows(); showCostModSection(); }
}


// ─── normalize blend: ถ้า ings เป็น null ให้ fallback จาก method ───
// ── คำนวณราคาต่อหน่วยวัตถุดิบ (ไม่เปลี่ยนตาม stock คงเหลือ) ──
function getIngUnitCost(ing){
 if(!ing) return 0;
 // ใช้ unitCost ที่คำนวณตอน save (ราคาซื้อ/จำนวนทั้งหมด)
 if(ing.unitCost) return ing.unitCost;
 // fallback: cost/qty (ใช้ได้ถ้ายังไม่ถูกหักสต็อก)
 if(ing.cost && ing.qty) return ing.cost / ing.qty;
 return ing.cost || 0;
}

function getBlendIngs(b){
 const raw = b.ings || b.ingredients || [];
 if(!Array.isArray(raw)) return [];
 return raw;
}
function getBlendYield(b){
 if(b.yieldPerBatch) return b.yieldPerBatch;
 return getBlendIngs(b).reduce((s,ig)=>s+(ig.qty||0),0) || 1;
}
function getBlendCost(b){
 if(b.totalCostPerBatch) return b.totalCostPerBatch;
 return getBlendIngs(b).reduce((sum,ig)=>{
  const ing=[...DB.ingredients,...DB.packages].find(x=>x.id===ig.ingId);
  if(!ing) return sum;
  return sum + getIngUnitCost(ing)*ig.qty;
 },0);
}
function renderMenuRecipeRows(){
 // รวม ingredients + blends เป็นตัวเลือกเดียวกัน
 const allItems = [
  ...DB.ingredients.map(i=>({id:'ing_'+i.id, label:i.name+' (฿'+getIngUnitCost(i).toFixed(2)+'/'+i.unit+')', type:'ing', ref:i, unit:i.unit})),
  ...(DB.blends||[]).map(b=>{
   const stock=(b.stock||[]).reduce((s,x)=>s+x.qty,0);
   const realCost = getBlendCost(b);
   const realYield = getBlendYield(b);
   const costPerUnit = realYield>0 ? realCost/realYield : 0;
   return {id:'blend_'+b.id, label:'[เบลนด์] '+b.name+' (฿'+costPerUnit.toFixed(2)+'/'+b.unit+') คงเหลือ '+stock+b.unit, type:'blend', ref:b, costPerUnit, unit:b.unit};
  })
 ];
 const html = menuRecipeIngredients.map((row,i)=>{
  const opts = allItems.map(item=>`<option value="${item.id}" ${item.id===row.itemKey?'selected':''}>${item.label}</option>`).join('');
  const selItem = allItems.find(x=>x.id===row.itemKey);
  const unitLabel = selItem ? selItem.unit : '';
  return `<div style="display:flex;gap:6px;align-items:flex-end;margin-bottom:8px">
   <div style="flex:2">${i===0?'<div style="font-size:9px;color:var(--t4);font-weight:700;margin-bottom:3px">วัตถุดิบ / เบลนด์</div>':''}
    <select class="f-select" style="font-size:12px" onchange="menuRecipeIngredients[${i}].itemKey=this.value;renderMenuRecipeRows();recalcMenuCost()">
     <option value="">-- เลือก --</option>${opts}
    </select>
   </div>
   <div style="width:90px">${i===0?'<div style="font-size:9px;color:var(--t4);font-weight:700;margin-bottom:3px">ปริมาณ</div>':''}
    <div style="position:relative">
     <input class="f-input" type="number" value="${row.qty||''}" placeholder="0" style="font-size:12px;padding:8px ${unitLabel?'40px':'10px'} 8px 10px"
      oninput="menuRecipeIngredients[${i}].qty=parseFloat(this.value)||0;recalcMenuCost()">
     ${unitLabel?`<span style="position:absolute;right:8px;top:50%;transform:translateY(-50%);font-size:10px;color:var(--t4);font-weight:600;pointer-events:none">${unitLabel}</span>`:''}
    </div>
   </div>
   <div style="width:32px;padding-bottom:2px">
    <button onclick="menuRecipeIngredients.splice(${i},1);renderMenuRecipeRows();recalcMenuCost()"
     style="width:28px;height:34px;border:none;border-radius:var(--r2);background:var(--red-lt);color:var(--red);font-size:14px;cursor:pointer">−</button>
   </div>
  </div>`;
 }).join('');
 document.getElementById('menuRecipeRows').innerHTML = html || '<div style="font-size:11px;color:var(--t4);padding:6px 0">กด + เพิ่มวัตถุดิบ</div>';
}

function addRecipeRow(){
 menuRecipeIngredients.push({itemKey:'', ingId:0, qty:0});
 renderMenuRecipeRows();
}

// ═══════════════════════════════════════════
// Dynamic Cost Engine v2
// คำนวณต้นทุนจริงตาม option ที่เลือก
// ═══════════════════════════════════════════

// recipe.costModifiers = {
//   size: { "200ml": 1.0, "1000ml": 1.3 },      // multiplier on base recipe ingredients
//   sweet: { "0%":0, "25%":0.25, "50%":0.5, "75%":0.75, "100%":1.0 },  // multiplier on sweetener ingredient
//   strength: { "25%":0.5, "50%":1.0, "75%":1.5, "100%":2.0 }           // multiplier on primary ingredient
// }
// recipe.sweetIngId = "ing_5"   — which ingredient is the sweetener
// recipe.primaryIngId = "ing_3" — which ingredient is the primary (tea/coffee)

function getRecipeBaseCost(recipe){
 if(!recipe) return 0;
 const ings = recipe.ingredients || recipe.ings || [];
 let cost = 0;
 ings.forEach(row => {
  if(!row.qty) return;
  const key = row.itemKey || ('ing_'+(row.ingId||''));
  if(key.startsWith('blend_')){
   const blendId = parseInt(key.replace('blend_',''));
   const blend = (DB.blends||[]).find(x=>x.id===blendId);
   if(blend){
    const rc = getBlendCost(blend);
    const ry = getBlendYield(blend);
    if(ry>0) cost += (rc/ry) * row.qty;
   }
  } else {
   const ingId = parseInt(key.replace('ing_','')) || row.ingId;
   const ing = DB.ingredients.find(x=>x.id===ingId);
   if(!ing) return;
   cost += getIngUnitCost(ing) * row.qty;
  }
 });
 return Math.round(cost * 10) / 10;
}

function calcDynamicCost(menuId, size, sweet, strength){
 const menu = DB.menus.find(m=>m.id===menuId);
 if(!menu) return 0;
 const recipe = DB.recipes.find(r=>r.menuId===menuId);
 if(!recipe) return Number(menu.cost)||0;

 const mod = recipe.costModifiers;
 if(!mod) return getRecipeBaseCost(recipe);

 const ings = recipe.ingredients || recipe.ings || [];
 let cost = 0;

 // size multiplier (applies to ALL ingredients)
 const sizeMul = (mod.size && mod.size[size]) || 1.0;

 ings.forEach(row => {
  if(!row.qty) return;
  const key = row.itemKey || ('ing_'+(row.ingId||''));
  let unitCost = 0;

  if(key.startsWith('blend_')){
   const blendId = parseInt(key.replace('blend_',''));
   const blend = (DB.blends||[]).find(x=>x.id===blendId);
   if(blend){
    const rc = getBlendCost(blend);
    const ry = getBlendYield(blend);
    if(ry>0) unitCost = rc/ry;
   }
  } else {
   const ingId = parseInt(key.replace('ing_','')) || row.ingId;
   const ing = DB.ingredients.find(x=>x.id===ingId);
   if(!ing) return;
   unitCost = getIngUnitCost(ing);
  }

  let qty = row.qty * sizeMul;

  // sweet multiplier (only for sweetener ingredient)
  if(recipe.sweetIngId && key === recipe.sweetIngId && mod.sweet){
   const sweetMul = mod.sweet[sweet];
   if(sweetMul !== undefined) qty = row.qty * sizeMul * sweetMul;
  }

  // strength multiplier (only for primary ingredient)
  if(recipe.primaryIngId && key === recipe.primaryIngId && mod.strength){
   const strMul = mod.strength[strength];
   if(strMul !== undefined) qty = row.qty * sizeMul * strMul;
  }

  cost += unitCost * qty;
 });

 return Math.round(cost * 10) / 10;
}

// Get default cost modifiers template based on current optionSets
function getDefaultCostModifiers(){
 const os = DB.optionSets || {};
 const mod = {};

 // Size modifiers — auto from items
 if(os.sizes && os.sizes.items){
  mod.size = {};
  const base = os.sizes.default || os.sizes.items[0]?.label || '200ml';
  os.sizes.items.forEach(item => {
   const lbl = typeof item==='string' ? item : item.label;
   mod.size[lbl] = lbl === base ? 1.0 : 1.0; // default all to 1.0, user adjusts
  });
 }

 // Sweet modifiers — percent-based
 if(os.sweet && os.sweet.items){
  mod.sweet = {};
  os.sweet.items.forEach(item => {
   const lbl = typeof item==='string' ? item : item.label;
   const pct = parseInt(lbl) || 0;
   mod.sweet[lbl] = pct / 100;
  });
 }

 // Strength modifiers — percent-based
 if(os.strength && os.strength.items){
  mod.strength = {};
  const basePct = parseInt(os.strength.default) || 50;
  os.strength.items.forEach(item => {
   const lbl = typeof item==='string' ? item : item.label;
   const pct = parseInt(lbl) || 50;
   mod.strength[lbl] = pct / basePct;
  });
 }

 return mod;
}

function recalcMenuCost(){
 let cost = 0;
 menuRecipeIngredients.forEach(row=>{
  if(!row.qty) return;
  const key = row.itemKey || ('ing_'+(row.ingId||''));
  if(key.startsWith('blend_')){
   // ต้นทุนจาก blend — คำนวณ real cost จากวัตถุดิบ (fallback ถ้า totalCostPerBatch=0)
   const blendId = parseInt(key.replace('blend_',''));
   const blend = (DB.blends||[]).find(x=>x.id===blendId);
   if(blend){
    const realCost = getBlendCost(blend);
    const realYield = getBlendYield(blend);
    if(realYield>0) cost += (realCost/realYield) * row.qty;
   }
  } else {
   const ingId = parseInt(key.replace('ing_','')) || row.ingId;
   const ing = DB.ingredients.find(x=>x.id===ingId);
   if(!ing) return;
   cost += getIngUnitCost(ing) * row.qty;
  }
 });
 cost = Math.round(cost * 10) / 10;
 document.getElementById('menuCost').value = cost || '';
 document.getElementById('recipeCostCalc').textContent = '฿'+(cost||0).toLocaleString(undefined,{minimumFractionDigits:1,maximumFractionDigits:1});
 const price = parseFloat(document.getElementById('menuPrice').value)||0;
 document.getElementById('recipePriceRef').textContent = '฿'+(price||0).toLocaleString();
 const margin = price>0 ? Math.round((price-cost)/price*100) : 0;
 const marginEl = document.getElementById('recipeMarginCalc');
 marginEl.textContent = margin+'%';
 marginEl.style.color = margin>=50?'var(--green)':margin>=30?'var(--gold)':'var(--red)';
}

// ── Cost Modifier UI ──
function showCostModSection(){
 const hasIngs = menuRecipeIngredients.some(r=>(r.itemKey||r.ingId)&&r.qty);
 const section = document.getElementById('costModSection');
 if(section) section.style.display = hasIngs ? 'block' : 'none';
 if(hasIngs) populateCostModDropdowns();
}

function populateCostModDropdowns(){
 const primarySel = document.getElementById('recipePrimaryIng');
 const sweetSel = document.getElementById('recipeSweetIng');
 if(!primarySel||!sweetSel) return;

 const opts = menuRecipeIngredients.filter(r=>(r.itemKey||r.ingId)&&r.qty).map(row=>{
  const key = row.itemKey || ('ing_'+(row.ingId||''));
  let name = key;
  if(key.startsWith('ing_')){
   const ing = DB.ingredients.find(x=>x.id===parseInt(key.replace('ing_','')));
   if(ing) name = ing.name;
  } else if(key.startsWith('blend_')){
   const b = (DB.blends||[]).find(x=>x.id===parseInt(key.replace('blend_','')));
   if(b) name = '[เบลนด์] '+b.name;
  }
  return `<option value="${key}">${name}</option>`;
 }).join('');

 primarySel.innerHTML = '<option value="">-- ไม่ระบุ --</option>' + opts;
 sweetSel.innerHTML = '<option value="">-- ไม่ระบุ --</option>' + opts;

 // Load existing values from recipe
 const editId = parseInt(document.getElementById('menuEditId').value)||null;
 if(editId){
  const rec = DB.recipes.find(r=>r.menuId===editId);
  if(rec){
   if(rec.primaryIngId) primarySel.value = rec.primaryIngId;
   if(rec.sweetIngId) sweetSel.value = rec.sweetIngId;
  }
 }
 updateCostModPreview();
}

function toggleCostModDetail(){
 const el = document.getElementById('costModDetail');
 const btn = document.getElementById('costModToggle');
 if(el.style.display==='none'){
  el.style.display='block'; btn.textContent='ซ่อน';
  populateCostModDropdowns();
 } else {
  el.style.display='none'; btn.textContent='แก้ไข';
 }
}

function updateCostModPreview(){
 const el = document.getElementById('costModPreview');
 if(!el) return;
 const primaryKey = document.getElementById('recipePrimaryIng').value;
 const sweetKey = document.getElementById('recipeSweetIng').value;
 const mod = getDefaultCostModifiers();
 let html = '';

 if(mod.size && Object.keys(mod.size).length>1){
  html += '<div style="margin-bottom:6px"><strong style="color:var(--t2)">ขนาด:</strong> ';
  html += Object.entries(mod.size).map(([k,v])=>`${k} = x${v}`).join(', ');
  html += '</div>';
 }
 if(sweetKey && mod.sweet){
  html += '<div style="margin-bottom:6px"><strong style="color:var(--t2)">ความหวาน:</strong> ';
  html += Object.entries(mod.sweet).map(([k,v])=>`${k} = x${v}`).join(', ');
  html += '</div>';
 }
 if(primaryKey && mod.strength){
  html += '<div style="margin-bottom:6px"><strong style="color:var(--t2)">ความเข้ม:</strong> ';
  html += Object.entries(mod.strength).map(([k,v])=>`${k} = x${v.toFixed(1)}`).join(', ');
  html += '</div>';
 }
 if(!html) html = '<span style="color:var(--t5)">เลือกวัตถุดิบด้านบนเพื่อดู preview</span>';
 el.innerHTML = html;
}

function saveMenu(){
 const id=parseInt(document.getElementById('menuEditId').value)||null;
 const sizes=[];
 document.querySelectorAll('.size-dynamic-cb').forEach(cb=>{ if(cb.checked&&cb.dataset.size) sizes.push(cb.dataset.size); });
 if(!sizes.length) sizes.push((DB.optionSets&&DB.optionSets.sizes&&DB.optionSets.sizes.default)||'200ml');
 const customOptions=[];
 // อ่านจาก dynamic checkbox list (DB.customOptions)
 document.querySelectorAll('.custom-opt-cb').forEach(cb=>{
  if(cb.checked && cb.dataset.key) customOptions.push(cb.dataset.key);
 });
 const data={
 name:document.getElementById('menuName').value.trim(),
 cat:document.getElementById('menuCat').value,
 price:parseFloat(document.getElementById('menuPrice').value)||0,
 cost:parseFloat(document.getElementById('menuCost').value)||0,
 vol:parseFloat(document.getElementById('menuVol').value)||0,
 icon:document.getElementById('menuIcon').value.trim()||'?',
 color:document.getElementById('menuColor').value,
 desc:document.getElementById('menuDesc').value,
 sizes,status:document.getElementById('menuStatus').value,
 promoId:document.getElementById('menuPromo').value||null,
 customOptions
 };
 if(!data.name){toast('กรุณาใส่ชื่อเมนู');return;}
 // save/update recipe
 const recipeEditId = parseInt(document.getElementById('menuRecipeId').value)||null;
 const hasIngredients = menuRecipeIngredients.some(r=>(r.itemKey||r.ingId)&&r.qty);
 if(id){
 const m=DB.menus.find(x=>x.id===id);
 Object.assign(m,data);
 if(hasIngredients){
 const existRec = DB.recipes.find(r=>r.menuId===id);
 if(existRec){ existRec.ingredients=[...menuRecipeIngredients]; existRec.primaryIngId=document.getElementById('recipePrimaryIng').value||null; existRec.sweetIngId=document.getElementById('recipeSweetIng').value||null; existRec.costModifiers=getDefaultCostModifiers(); }
 else{ const rid=DB.nextId++; DB.recipes.push({id:rid,menuId:id,name:data.name+'Recipe',cupsPerBatch:1,ingredients:[...menuRecipeIngredients],primaryIngId:document.getElementById('recipePrimaryIng').value||null,sweetIngId:document.getElementById('recipeSweetIng').value||null,costModifiers:getDefaultCostModifiers()}); m.recipeId=rid; }
 }
 toast('อัพเดตเมนูแล้ว');
 } else {
 const newId=DB.nextId++;
 const menuObj={...data,id:newId,sold:0};
 if(hasIngredients){
 const rid=DB.nextId++; DB.recipes.push({id:rid,menuId:newId,name:data.name+'Recipe',cupsPerBatch:1,ingredients:[...menuRecipeIngredients],primaryIngId:document.getElementById('recipePrimaryIng').value||null,sweetIngId:document.getElementById('recipeSweetIng').value||null,costModifiers:getDefaultCostModifiers()}); menuObj.recipeId=rid;
 }
 DB.menus.push(menuObj);
 toast('เพิ่มเมนูใหม่แล้ว');
 }
 addAudit('menu', id?'แก้ไขเมนู':'เพิ่มเมนู', data.name+' ฿'+data.price, '', 'rgba(44,24,16,.06)', 'low');
 closeModal('modal-add-menu');renderManage(mgCat);
 document.getElementById('menuModalTitle').textContent='เพิ่มเมนูใหม่';
 document.getElementById('menuEditId').value='';
 document.getElementById('menuRecipeId').value='';
 menuRecipeIngredients=[];
 switchMenuTab('info');
 ['menuName','menuPrice','menuVol','menuIcon','menuDesc'].forEach(i=>document.getElementById(i).value='');
 document.getElementById('menuCost').value='';
 scheduleSync();
}
function selectColor(hex,el){
 document.querySelectorAll('.color-dot').forEach(d=>d.classList.remove('selected'));
 el.classList.add('selected');
 document.getElementById('menuColor').value=hex;
}
function fillPromoSelect(selId,selectedId){
 const sel=document.getElementById(selId);
 sel.innerHTML='<option value="">-- ไม่มี --</option>'+DB.promos.map(p=>`<option value="${p.id}"${p.id==selectedId?'selected':''}>${p.name}</option>`).join('');
}

/* 
 PROMO PAGE
 */
let promoFilterTab='all';
function switchPromoTab(btn,type){
 btn.closest('.tab-bar').querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
 btn.classList.add('active');promoFilterTab=type;renderPromos(type);
}
function getPromoDesc(p){
 if(p.type==='pct')return`ลด ${p.val}%`;
 if(p.type==='fixed')return`ลด ฿${(p.val||0).toLocaleString()}`;
 if(p.type==='buy')return`ซื้อ ${p.val} แถม ${p.val2}`;
 if(p.type==='freeN')return`ซื้อ ${p.val} ฟรี 1 (ราคาต่ำสุด)`;
 if(p.type==='min')return`ซื้อครบ ฿${(p.val||0).toLocaleString()} ลด ${p.val2}%`;
 return '';
}
function getPromoTag(p){
 if(p.type==='pct')return`-${p.val}%`;
 if(p.type==='fixed')return`-฿${(p.val||0).toLocaleString()}`;
 if(p.type==='buy')return`${p.val}+${p.val2}`;
 if(p.type==='freeN')return`${p.val}+1`;
 return '';
}
function renderPromos(type){
 const list=type==='all'?DB.promos:DB.promos.filter(p=>p.type===type);
 document.getElementById('promoCount').textContent=DB.promos.filter(p=>p.active).length+'ใช้งาน / '+DB.promos.length+'ทั้งหมด';
 const typeInfo={pct:{label:'%',bg:'#FEF8E4',col:'#B8860B'},fixed:{label:'฿',bg:'var(--green-lt)',col:'var(--green)'},buy:{label:'X+Y',bg:'var(--blue-lt)',col:'var(--blue)'},freeN:{label:'N+1',bg:'rgba(200,130,106,.15)',col:'var(--cara)'},min:{label:'MIN',bg:'var(--purple-lt)',col:'var(--purple)'},bundle:{label:'PKG',bg:'rgba(45,122,79,.15)',col:'var(--green)'}};
 const today=new Date().toISOString().split('T')[0];
 document.getElementById('promoList').innerHTML=list.map(p=>{
 const ti=typeInfo[p.type]||typeInfo.pct;
 const expired=p.end&&p.end<today;
 return`<div class="promo-card"> <div class="pc-head"> <div class="pc-icon" style="background:${ti.bg};color:${ti.col}">${ti.label}</div> <div class="pc-info"> <div class="pc-name">${p.name}</div> <div class="pc-desc">${getPromoDesc(p)} · ${p.note||''}</div> <div style="margin-top:5px;display:flex;gap:5px;flex-wrap:wrap"> <span class="badge ${p.active?'badge-green':'badge-gray'}">${p.active?'ใช้งาน':'ปิด'}</span> ${expired?'<span class="badge badge-red">หมดอายุ</span>':''}
 <span class="badge badge-blue">${p.start} — ${p.end||'ไม่จำกัด'}</span> </div> </div> <label class="toggle"><input type="checkbox" ${p.active?'checked':''} onchange="togglePromo(${p.id},this.checked)"><span class="toggle-slider"></span></label> </div> <div class="pc-foot"> <div class="pc-stats">ใช้แล้ว <strong>${p.used}</strong> ครั้ง · ลดรวม <strong>฿${p.discount.toLocaleString()}</strong></div> </div> <div style="display:flex;border-top:1px solid rgba(176,154,133,.12)"> <button class="btn btn-secondary" style="flex:1;border-radius:0;padding:10px;font-size:12px;font-weight:600;border-right:1px solid rgba(176,154,133,.12)"
 onclick="editPromo(${p.id})"> แก้ไข</button> <button class="btn btn-danger" style="flex:1;border-radius:0;padding:10px;font-size:12px;font-weight:600"
 onclick="delPromo(${p.id})"> ลบ</button> </div> </div>`;
 }).join('')||'<div class="empty-state"><div class="e-icon"><span class="mi" style="font-size:40px;opacity:.4">sell</span></div><div class="e-title">ยังไม่มีโปรโมชั่น</div></div>';
}
function togglePromo(id,val){
 const p=DB.promos.find(x=>x.id===id);
 if(p){p.active=val;renderPromos(promoFilterTab);renderPromoRibbon();toast(val?'เปิดโปรโมชั่นแล้ว':'ปิดโปรโมชั่นแล้ว');scheduleSync();}
}
function editPromo(id){
 const p=DB.promos.find(x=>x.id===id);if(!p)return;
 document.getElementById('promoModalTitle').textContent='แก้ไขโปรโมชั่น';
 document.getElementById('promoEditId').value=p.id;
 document.getElementById('promoName').value=p.name;
 document.getElementById('promoType').value=p.type;
 document.getElementById('promoVal').value=p.val;
 document.getElementById('promoVal2').value=p.val2||'';
 document.getElementById('promoNoExpiry').checked=!!p.noExpiry;
 document.getElementById('promoDatesRow').style.display=p.noExpiry?'none':'';
 document.getElementById('promoStart').value=p.start||'';
 document.getElementById('promoEnd').value=p.end||'';
 document.getElementById('promoScope').value=p.scope;
 document.getElementById('promoNote').value=p.note;
 updatePromoFields();openModal('modal-add-promo');
}
function delPromo(id){
 if(!confirm('ลบโปรโมชั่นนี้?'))return;
 DB.promos=DB.promos.filter(p=>p.id!==id);renderPromos(promoFilterTab);toast('ลบโปรโมชั่นแล้ว');
}
function togglePromoExpiry(){
 const noExp = document.getElementById('promoNoExpiry').checked;
 document.getElementById('promoDatesRow').style.display = noExp ? 'none' : '';
}
function updatePromoFields(){
 const type=document.getElementById('promoType').value;
 const labels={pct:'ส่วนลด (%)',fixed:'ลดราคา (฿)',buy:'ซื้อ (แก้ว)',freeN:'ซื้อกี่แก้ว (N)',min:'ยอดขั้นต่ำ (฿)',bundle:'ซื้อจำนวน (ชิ้น)'};
 const labels2={buy:'แถมฟรี (แก้ว)',min:'ลด (%)',bundle:'ราคารวม (฿)'};
 document.getElementById('promoValLabel').textContent=labels[type]||'ค่า';
 const g2=document.getElementById('promoVal2Group');
 if(type==='buy'||type==='min'||type==='bundle'){
   g2.style.display='block';
   document.getElementById('promoVal2Label').textContent=labels2[type];
 } else g2.style.display='none';
}
function savePromo(){
 const id=parseInt(document.getElementById('promoEditId').value)||null;
 const data={
 name:document.getElementById('promoName').value.trim(),
 type:document.getElementById('promoType').value,
 val:parseFloat(document.getElementById('promoVal').value)||0,
 val2:parseFloat(document.getElementById('promoVal2').value)||null,
 noExpiry:document.getElementById('promoNoExpiry').checked,
 start:document.getElementById('promoNoExpiry').checked?'':document.getElementById('promoStart').value,
 end:document.getElementById('promoNoExpiry').checked?'':document.getElementById('promoEnd').value,
 scope:document.getElementById('promoScope').value,
 note:document.getElementById('promoNote').value
 };
 if(!data.name){toast('กรุณาใส่ชื่อโปรโมชั่น');return;}
 if(id){const p=DB.promos.find(x=>x.id===id);Object.assign(p,data);toast('อัพเดตแล้ว');}
 else{DB.promos.push({...data,id:DB.nextId++,active:false,used:0,discount:0});toast('สร้างโปรโมชั่นแล้ว');}
 addAudit('promo', id?'แก้ไขโปรโมชั่น':'สร้างโปรโมชั่น', data.name, '', 'rgba(184,134,11,.08)', 'low');
 closeModal('modal-add-promo');renderPromos(promoFilterTab);
 document.getElementById('promoModalTitle').textContent='สร้างโปรโมชั่น';
 document.getElementById('promoEditId').value='';
 scheduleSync();
}

/* 
 REPORT PAGE — v3 Redesign
 */
let reportDays=1;
let reportDateOffset=0; // 0=today, -1=yesterday, etc

function switchReportPill(btn,days){
 const bar=btn.parentElement;
 bar.querySelectorAll('.pill-tab').forEach(b=>b.classList.remove('active'));
 btn.classList.add('active');reportDays=days;reportDateOffset=0;renderReport(days);
}
function switchReportPeriod(btn,days){ switchReportPill(btn,days); }

function navReportDate(dir){
 reportDateOffset+=dir;
 if(reportDateOffset>0) reportDateOffset=0;
 renderReport(reportDays);
}

function _getReportRange(days,offset){
 offset=offset||0;
 const d=new Date();
 if(days===1){
  d.setDate(d.getDate()+offset);d.setHours(0,0,0,0);
  return {since:d.getTime(), until:d.getTime()+86400000};
 }
 const end=new Date();end.setDate(end.getDate()+offset);end.setHours(23,59,59,999);
 const start=new Date(end);start.setDate(start.getDate()-days+1);start.setHours(0,0,0,0);
 return {since:start.getTime(), until:end.getTime()+1};
}

function _filterOrdersRange(since,until){
 return DB.orders.filter(o=>{
  if(o.status==='voided'||o.status==='void') return false;
  const t=_ts(o.ts);
  return t>=since&&t<until;
 });
}
// ══════════════════════════════════════════════════════════════════════════
// REPORT ENGINE — v2
// ══════════════════════════════════════════════════════════════════════════

// ── helper: normalize timestamp → ms ────────────────────────────────────
function _ts(v){ return typeof v==='number' ? v : new Date(v).getTime(); }

// ── helper: กรองออเดอร์ตามช่วงเวลา (ไม่นับที่ void) ───────────────────
function _filterOrders(days){
 const now  = Date.now();
 const d    = new Date(); d.setHours(0,0,0,0);
 const since = days===1 ? d.getTime() : now - days*86400000;
 return DB.orders.filter(o=>{
  if(o.status==='voided'||o.status==='void') return false; // void/voided both excluded
  return _ts(o.ts) >= since;
 });
}

// ── helper: คำนวณยอดขาย / กำไร / จำนวนแก้ว ────────────────────────────
function _calcOrderStats(orders){
 let sales=0, profit=0, cups=0, discount=0;
 orders.forEach(o=>{
  sales   += o.total||0;
  discount+= o.discount||0;
  cups    += o.items.reduce((s,i)=>s+i.qty,0);
  profit  += o.items.reduce((ss,i)=>{
   const m = DB.menus.find(x=>x.id===i.menuId);
   const cost = i.costPerItem!=null ? i.costPerItem : (m ? (Number(m.cost)||0) : 0);
   return ss + (i.price - cost)*i.qty - (i.autoPromoDisc||i.promoDisc||0);
  },0);
 });
 return {sales, profit:Math.round(profit), cups, discount, count:orders.length};
}

function renderReport(days){
 try{
 days = days||reportDays||1;
 const range  = _getReportRange(days, reportDateOffset);
 const orders = _filterOrdersRange(range.since, range.until);
 const s      = _calcOrderStats(orders);
 console.log('[Report] days=',days,'offset=',reportDateOffset,'orders=',orders.length,'sales=',s.sales);

 // prev period for trend
 const pOff = reportDateOffset - (days===1?1:days);
 const pr   = _getReportRange(days, pOff);
 const prevOrders= _filterOrdersRange(pr.since, pr.until);
 const ps   = _calcOrderStats(prevOrders);

 // ── Date Navigator ──
 _updateDateNav(days, range);

 // ── Donut Chart (SVG) ──
 _renderDonut(s);

 // ── Stat Cards v2 with trend ──
 const elSales=document.getElementById('rTotalSales');
 const elProfit=document.getElementById('rProfit');
 const elDisc=document.getElementById('rDiscount');
 const elCups=document.getElementById('rCups');
 console.log('[Report] stat card els:', !!elSales, !!elProfit, !!elDisc, !!elCups);
 if(elSales) elSales.textContent = '฿'+s.sales.toLocaleString();
 if(elProfit) elProfit.textContent = '฿'+s.profit.toLocaleString();
 if(elDisc) elDisc.textContent = '-฿'+s.discount.toLocaleString();
 if(elCups) elCups.textContent = s.cups;

 _setTrend('trendSales', s.sales, ps.sales);
 _setTrend('trendNet',   s.profit, ps.profit);
 _setTrend('trendDisc',  s.discount, ps.discount, true);
 _setTrend('trendCups',  s.cups, ps.cups);

 // ── sub header ──
 const subEl=document.getElementById('reportDate');
 if(subEl) subEl.textContent = days===1 ? s.count+' ออเดอร์' : days+'วัน · '+s.count+' ออเดอร์';

 // ── Line Chart ──
 _renderLineChart(days);

 // ── keep existing sub-renders ──
 renderTopProducts(orders);
 renderHourlySales(orders);
 renderStaffLogSummary();
 renderPromoPerf(orders);
 renderVoidReport(days);
 }catch(e){ console.error('[renderReport] ERROR:',e.message,e.stack); }
}

function _updateDateNav(days, range){
 const thOpts={year:'numeric',month:'long',day:'numeric'};
 const thOptsShort={month:'short',day:'numeric'};
 const label=document.getElementById('dateNavLabel');
 const sub=document.getElementById('dateNavSub');
 if(days===1){
  const d=new Date(range.since);
  const isToday=reportDateOffset===0;
  const isYesterday=reportDateOffset===-1;
  label.textContent=isToday?'วันนี้':isYesterday?'เมื่อวาน':d.toLocaleDateString('th-TH',{weekday:'long'});
  sub.textContent=d.toLocaleDateString('th-TH',thOpts);
 } else {
  const s=new Date(range.since), e=new Date(range.until-1);
  label.textContent=days===7?'สัปดาห์นี้':'เดือนนี้';
  sub.textContent=s.toLocaleDateString('th-TH',thOptsShort)+' — '+e.toLocaleDateString('th-TH',thOptsShort);
 }
}

function _renderDonut(s){
 try{
 const wrap=document.getElementById('donutSvgWrap');
 if(!wrap) { console.warn('[Donut] wrapper not found'); return; }
 const total=s.sales||1;
 const profit=Math.max(s.profit,0);
 const disc=s.discount;
 const cost=total-profit-disc;
 const segments=[
  {val:profit, color:'var(--green)'},
  {val:disc,   color:'var(--red)'},
  {val:Math.max(cost,0), color:'var(--bg-dk)'}
 ].filter(sg=>sg.val>0);
 const cx=90,cy=90,r=72,stroke=14;
 const circ=2*Math.PI*r;
 let offset=0;
 let arcs='';
 if(!segments.length||s.sales===0){
  arcs=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--bg-dk)" stroke-width="${stroke}" opacity=".5"/>`;
 } else {
  arcs=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--bg-dk)" stroke-width="${stroke}" opacity=".18"/>`;
  segments.forEach(sg=>{
   const pct=sg.val/total;
   const dash=pct*circ;
   const gap=circ-dash;
   arcs+=`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${sg.color}" stroke-width="${stroke}" stroke-dasharray="${dash} ${gap}" stroke-dashoffset="${-offset}" stroke-linecap="round" transform="rotate(-90 ${cx} ${cy})" style="transition:stroke-dasharray .6s,stroke-dashoffset .6s"/>`;
   offset+=dash;
  });
 }
 // Use wrapper innerHTML for reliable re-render
 wrap.innerHTML=`<svg class="donut-svg" viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg" id="donutSvg">${arcs}</svg>`;
 const da=document.getElementById('donutAmount');
 if(da) da.textContent='฿'+s.sales.toLocaleString();
 console.log('[Donut] rendered, sales=',s.sales);
 }catch(e){ console.error('[_renderDonut] ERROR:',e); }
}

function _setTrend(elId, curr, prev, invertColor){
 const el=document.getElementById(elId);
 if(!el) return;
 if(!prev||prev===0){
  if(curr>0){
   el.style.display='';el.className='scv2-trend up';
   el.innerHTML='<span class="mi">fiber_new</span>ใหม่';
  } else { el.className='scv2-trend';el.innerHTML='';el.style.display='none'; }
  return;
 }
 el.style.display='';
 const pct=Math.round(((curr-prev)/prev)*100);
 const isUp=pct>=0;
 const arrow=isUp?'trending_up':'trending_down';
 let cls=isUp?'up':'dn';
 if(invertColor) cls=isUp?'dn':'up';
 el.className='scv2-trend '+cls;
 el.innerHTML=`<span class="mi">${arrow}</span>${Math.abs(pct)}%`;
}

function scrollToReportDetail(){
 const el=document.getElementById('lineChartWrap');
 if(el) el.scrollIntoView({behavior:'smooth',block:'start'});
}

function _renderLineChart(days){
 try{
 const lineWrap=document.getElementById('lineChartSvgWrap');
 if(!lineWrap) { console.warn('[LineChart] wrapper not found'); return; }
 days=days||1;
 const numDays=Math.min(days===1?7:days,30);
 const dayNames=['อา','จ','อ','พ','พฤ','ศ','ส'];
 const data=[];
 for(let i=numDays-1;i>=0;i--){
  const d=new Date();d.setDate(d.getDate()+reportDateOffset-i);d.setHours(0,0,0,0);
  const ds=d.getTime(),de=ds+86400000;
  const dayOrders=DB.orders.filter(o=>o.status!=='voided'&&o.status!=='void'&&_ts(o.ts)>=ds&&_ts(o.ts)<de);
  const st=_calcOrderStats(dayOrders);
  data.push({label:dayNames[d.getDay()],date:d.getDate(),val:st.sales});
 }
 const W=320,H=100,padL=30,padR=10,padT=10,padB=22;
 const plotW=W-padL-padR,plotH=H-padT-padB;
 const maxVal=Math.max(...data.map(d=>d.val),1);
 const stepX=data.length>1?plotW/(data.length-1):0;

 let pathD='',areaD='',dots='',labels='';
 data.forEach((d,i)=>{
  const x=padL+i*stepX;
  const y=padT+plotH-(d.val/maxVal)*plotH;
  if(i===0){pathD=`M${x},${y}`;areaD=`M${x},${padT+plotH} L${x},${y}`;}
  else {pathD+=` L${x},${y}`;areaD+=` L${x},${y}`;}
  if(i===data.length-1) areaD+=` L${x},${padT+plotH} Z`;
  if(i===data.length-1) dots+=`<circle cx="${x}" cy="${y}" r="4" fill="var(--cara)" stroke="var(--bg)" stroke-width="2"/>`;
  labels+=`<text x="${x}" y="${H-2}" text-anchor="middle" fill="var(--t4)" font-size="8" font-family="var(--fh)">${d.label}${data.length<=7?' '+d.date:''}</text>`;
 });

 const ySteps=4;
 let yLines='';
 for(let i=0;i<=ySteps;i++){
  const y=padT+(plotH/ySteps)*i;
  const val=Math.round(maxVal-maxVal/ySteps*i);
  yLines+=`<line x1="${padL}" y1="${y}" x2="${W-padR}" y2="${y}" stroke="var(--bg-dk)" stroke-width=".5" opacity=".5"/>`;
  if(i%2===0) yLines+=`<text x="${padL-4}" y="${y+3}" text-anchor="end" fill="var(--t4)" font-size="7" font-family="var(--fh)">${val>=1000?(val/1000).toFixed(1)+'k':val}</text>`;
 }

 const inner=`${yLines}<defs><linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--cara)" stop-opacity=".18"/><stop offset="100%" stop-color="var(--cara)" stop-opacity="0"/></linearGradient></defs><path d="${areaD}" fill="url(#areaGrad)"/><path d="${pathD}" fill="none" stroke="var(--cara)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>${dots}${labels}`;
 lineWrap.innerHTML=`<svg class="line-chart-svg" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" id="lineChartSvg">${inner}</svg>`;
 console.log('[LineChart] rendered, days=',numDays);
 }catch(e){ console.error('[_renderLineChart] ERROR:',e); }
}

// inject stat card (legacy compat — redirects to hidden container)
function _upsertStatCard(id, label, val, colorClass){
 const container = document.getElementById('statCards');
 if(!container) return;
 let card = document.getElementById(id);
 if(!card){
  card = document.createElement('div');
  card.className='stat-card';
  const cls=colorClass?'sc-val '+colorClass:'sc-val';
  card.innerHTML=`<div class="sc-label">${label}</div><div class="${cls}" id="${id}-val">—</div>`;
  container.appendChild(card);
 }
 const v = document.getElementById(id+'-val');
 if(v) v.textContent = val;
}

function renderTopProducts(orders){
 orders=orders||_filterOrders(reportDays||1);
 const sold={}, revenue={};
 orders.forEach(o=>o.items.forEach(i=>{
  sold[i.menuId]=(sold[i.menuId]||0)+i.qty;
  // revenue = ราคาจริงหักส่วนลดที่แจกจ่ายแล้ว
  const net=(i.price*i.qty)-(i.autoPromoDisc||i.promoDisc||0);
  revenue[i.menuId]=(revenue[i.menuId]||0)+net;
 }));
 const ranked=DB.menus
  .map(m=>({...m, totalSold:sold[m.id]||0, totalRev:revenue[m.id]||0}))
  .filter(m=>m.totalSold>0)
  .sort((a,b)=>b.totalSold-a.totalSold).slice(0,5);
 if(!ranked.length){
  document.getElementById('topList').innerHTML='<div style="padding:0 16px 8px;font-size:12px;color:var(--t4)">ยังไม่มีข้อมูลการขาย</div>';
  return;
 }
 const medals=['1','2','3'];
 const colors=['var(--gold)','var(--t3)','var(--cara)','var(--t4)','var(--t4)'];
 const maxSold=ranked[0].totalSold||1;
 document.getElementById('topList').innerHTML='<div style="padding:0 16px 8px">'+ranked.map((m,idx)=>{
  const pct=Math.round(m.totalSold/maxSold*100);
  const profit=orders.reduce((s,o)=>s+o.items.filter(i=>i.menuId===m.id).reduce((ss,i)=>{
   const menu=DB.menus.find(x=>x.id===i.menuId);
   const cost=i.costPerItem!=null?i.costPerItem:(menu?(Number(menu.cost)||0):0);
   return ss+(i.price-cost)*i.qty-(i.autoPromoDisc||i.promoDisc||0);
  },0),0);
  return `<div style="background:var(--bg);border-radius:var(--r3);box-shadow:var(--neu-out-xs);padding:12px 14px;margin-bottom:8px">
   <div style="display:flex;align-items:center;gap:10px">
    <div style="width:28px;height:28px;border-radius:50%;background:${idx<3?'linear-gradient(135deg,'+colors[idx]+','+colors[idx]+'88)':'var(--bg-dk)'};display:flex;align-items:center;justify-content:center;font-size:${idx<3?'13':'11'}px;font-weight:800;color:${idx<3?'#fff':'var(--t3)'};">${idx<3?medals[idx]:idx+1}</div>
    <div style="flex:1;min-width:0">
     <div style="font-size:13px;font-weight:700;color:var(--t1);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${m.name}</div>
     <div style="margin-top:5px;height:4px;border-radius:2px;background:var(--bg-dk)">
      <div style="height:4px;border-radius:2px;background:${colors[idx]};width:${pct}%;transition:width .6s"></div>
     </div>
     <div style="display:flex;gap:8px;margin-top:4px">
      <span style="font-size:10px;color:var(--t4)">รายได้ ฿${m.totalRev.toLocaleString()}</span>
      <span style="font-size:10px;color:var(--green)">กำไร ฿${Math.round(profit).toLocaleString()}</span>
     </div>
    </div>
    <div style="text-align:right;flex-shrink:0">
     <div style="font-size:14px;font-weight:800;color:var(--cara)">${m.totalSold}<span style="font-size:9px;font-weight:400;color:var(--t4)"> แก้ว</span></div>
    </div>
   </div>
  </div>`;
 }).join('')+'</div>';
}

// ── สรุปการชำระเงิน (placeholder — เพิ่ม payment type ได้ทีหลัง) ────────
function renderPaymentSummary(){ /* removed — no-op */ }

// ── ยอดขายรายชั่วโมง ─────────────────────────────────────────────────────
function renderHourlySales(orders){
 const el=document.getElementById('hourlySales');
 if(!el) return;
 const hourly=Array(24).fill(0);
 orders.forEach(o=>{ const h=new Date(_ts(o.ts)).getHours(); hourly[h]+=o.total||0; });
 const maxH=Math.max(...hourly,1);
 const peak=hourly.indexOf(Math.max(...hourly));
 // แสดงแค่ช่วง 7-22
 const slots=[];
 for(let h=7;h<=22;h++) slots.push({h,v:hourly[h]});
 el.innerHTML=`
  <div style="padding:0 16px 4px;font-size:11px;color:var(--t4)">ชั่วโมงที่ขายดีที่สุด: <strong style="color:var(--cara)">${peak}:00 น.</strong></div>
  <div style="display:flex;align-items:flex-end;gap:3px;padding:0 16px 8px;height:56px;overflow-x:auto">
   ${slots.map(s=>`
    <div style="display:flex;flex-direction:column;align-items:center;flex:1;min-width:18px">
     <div style="width:100%;border-radius:3px 3px 0 0;background:${s.h===peak?'var(--cara)':'var(--bg-dk)'};height:${s.v?Math.round(s.v/maxH*40)+4:2}px;transition:.4s"></div>
     <span style="font-size:8px;color:var(--t4);margin-top:2px">${s.h}</span>
    </div>`).join('')}
  </div>`;
}

function renderStaffLogSummary(){
 const el=document.getElementById('staffLog');
 if(!DB.staffLogs||!DB.staffLogs.length){el.innerHTML='<div style="padding:0 16px 8px;font-size:12px;color:var(--t4)">ยังไม่มีบันทึก</div>';return;}
 const typeColor={drink:'var(--blue)',test:'var(--gold)',waste:'var(--red)'};
 const typeBg={drink:'var(--blue-lt)',test:'var(--gold-lt)',waste:'var(--red-lt)'};
 const typeLabel={drink:'พนักงาน',test:'ทดลอง',waste:'ทิ้ง'};
 el.innerHTML='<div style="padding:0 16px 8px">'+DB.staffLogs.slice(-8).reverse().map(l=>`
  <div style="background:var(--bg);border-radius:var(--r3);box-shadow:var(--neu-out-xs);padding:10px 14px;margin-bottom:8px;display:flex;align-items:center;gap:10px">
   <div style="width:32px;height:32px;border-radius:50%;background:${typeBg[l.type]||'var(--bg-dk)'};display:flex;align-items:center;justify-content:center;flex-shrink:0">
    <span class="mi" style="font-size:16px;color:${typeColor[l.type]||'var(--t3)'}">local_cafe</span></div>
   <div style="flex:1;min-width:0">
    <div style="font-size:12px;font-weight:700;color:var(--t1)">${l.menuName} <span style="font-weight:400">×${l.qty}</span></div>
    <div style="font-size:10px;color:var(--t4);margin-top:1px">${l.staff}</div></div>
   <div style="text-align:right;flex-shrink:0">
    <span style="font-size:9px;font-weight:700;background:${typeBg[l.type]||'var(--bg-dk)'};color:${typeColor[l.type]||'var(--t3)'};padding:2px 7px;border-radius:var(--rf)">${typeLabel[l.type]||l.type}</span>
    <div style="font-size:10px;color:var(--t4);margin-top:3px">${new Date(_ts(l.ts)).toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'})}</div></div>
  </div>`).join('')+'</div>';
}

function renderPromoPerf(orders){
 orders=orders||_filterOrders(reportDays||1);
 const el=document.getElementById('promoPerf');
 if(!DB.promos||!DB.promos.length){el.innerHTML='<div style="padding:0 16px 8px;font-size:12px;color:var(--t4)">ยังไม่มีโปรโมชั่น</div>';return;}
 const stats={};
 orders.forEach(o=>{
  const ids=[...new Set(o.items.map(i=>i.promoId||i.autoPromoId).filter(Boolean))];
  ids.forEach(pid=>{
   if(!stats[pid]) stats[pid]={used:0,discount:0,cups:0};
   stats[pid].used++;
   stats[pid].cups+=o.items.filter(i=>(i.promoId===pid||i.autoPromoId===pid)).reduce((s,i)=>s+i.qty,0);
   stats[pid].discount+=o.items.filter(i=>(i.promoId===pid||i.autoPromoId===pid)).reduce((s,i)=>s+(i.promoDisc||i.autoPromoDisc||0),0);
  });
 });
 const maxUsed=Math.max(...DB.promos.map(p=>(stats[p.id]||{}).used||0),1);
 el.innerHTML='<div style="padding:0 16px 8px">'+DB.promos.map(p=>{
  const st=stats[p.id]||{used:0,discount:0,cups:0};
  const pct=Math.round(st.used/maxUsed*100);
  return `<div style="background:var(--bg);border-radius:var(--r3);box-shadow:var(--neu-out-xs);padding:12px 14px;margin-bottom:8px">
   <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
    <span style="font-size:9px;font-weight:700;padding:2px 8px;border-radius:var(--rf);background:${p.active?'var(--green-lt)':'var(--bg-dk)'};color:${p.active?'var(--green)':'var(--t4)'}">${p.active?'ใช้งาน':'ปิด'}</span>
    <div style="flex:1;font-size:12px;font-weight:700;color:var(--t1)">${p.name}</div>
    <div style="font-size:13px;font-weight:800;color:var(--cara)">${st.used}<span style="font-size:9px;font-weight:400;color:var(--t4)"> ครั้ง</span></div>
   </div>
   <div style="display:flex;align-items:center;gap:8px">
    <div style="flex:1;height:4px;border-radius:2px;background:var(--bg-dk)">
     <div style="height:4px;border-radius:2px;background:var(--cara);width:${pct}%;transition:width .6s"></div>
    </div>
    <div style="font-size:10px;color:var(--red);font-weight:700;flex-shrink:0">-฿${st.discount.toLocaleString()}</div>
   </div>
   <div style="display:flex;gap:16px;margin-top:6px">
    <span style="font-size:10px;color:var(--t4)">${st.cups} แก้ว</span>
    <span style="font-size:10px;color:var(--t4)">เฉลี่ย ฿${st.used?Math.round(st.discount/st.used):0}/ครั้ง</span>
   </div>
  </div>`;
 }).join('')+'</div>';
}
// ── รายการยกเลิก ──────────────────────────────────────────────────────────
function renderVoidReport(days){
 days=days||reportDays||1;
 const el=document.getElementById('voidReport');
 if(!el) return;
 const range=_getReportRange(days, reportDateOffset);
 const voided=DB.orders.filter(o=>(o.status==='voided'||o.status==='void')&&_ts(o.voidTs||o.ts)>=range.since&&_ts(o.voidTs||o.ts)<range.until);
 if(!voided.length){
  el.innerHTML='<div style="font-size:12px;color:var(--t4)">ไม่มีรายการยกเลิกในช่วงนี้</div>';
  return;
 }
 const typeCfg={
  customer:{label:'ลูกค้ายกเลิก',color:'var(--red)',bg:'var(--red-lt)',icon:'cancel'},
  staff:{label:'ข้อผิดพลาดร้าน',color:'var(--orange,#e8770a)',bg:'rgba(232,119,10,.12)',icon:'warning'},
  test:{label:'ทดสอบระบบ',color:'var(--gold)',bg:'var(--gold-lt,rgba(255,198,0,.12))',icon:'science'}
 };
 // normalize old voidType values: 'shop' → 'staff', missing → 'customer'
 function _normVoidType(o){
  const t=o.voidType||'customer';
  if(t==='shop') return 'staff';
  if(typeCfg[t]) return t;
  return 'customer';
 }
 const counts={customer:0,staff:0,test:0};
 let totalLoss=0;
 voided.forEach(o=>{
  const t=_normVoidType(o);
  counts[t]=(counts[t]||0)+1;
  if(t!=='test') totalLoss+=o.total||0;
 });
 const realVoids=counts.customer+counts.staff;
 const voidRate=DB.orders.filter(o=>_ts(o.ts||0)>=range.since&&_ts(o.ts||0)<range.until).length;
 const rate=voidRate>0?Math.round(realVoids/voidRate*100):0;
 // summary row
 const summaryHtml=`
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:10px">
   <div style="background:var(--red-lt);border-radius:var(--r3);padding:9px 10px;text-align:center">
    <div style="font-size:16px;font-weight:800;color:var(--red)">${counts.customer}</div>
    <div style="font-size:9px;color:var(--t4)">ลูกค้ายกเลิก</div>
   </div>
   <div style="background:rgba(232,119,10,.12);border-radius:var(--r3);padding:9px 10px;text-align:center">
    <div style="font-size:16px;font-weight:800;color:var(--orange,#e8770a)">${counts.staff}</div>
    <div style="font-size:9px;color:var(--t4)">ข้อผิดพลาดร้าน</div>
   </div>
   <div style="background:var(--gold-lt,rgba(255,198,0,.12));border-radius:var(--r3);padding:9px 10px;text-align:center">
    <div style="font-size:16px;font-weight:800;color:var(--gold)">${counts.test}</div>
    <div style="font-size:9px;color:var(--t4)">ทดสอบระบบ</div>
   </div>
  </div>
  <div style="display:flex;gap:8px;margin-bottom:10px;font-size:11px">
   <div style="flex:1;background:var(--bg);border-radius:var(--r3);box-shadow:var(--neu-out-xs);padding:8px 10px">
    <span style="color:var(--t4)">Void Rate จริง</span>
    <strong style="float:right;color:${rate>10?'var(--red)':'var(--t1)'}">${rate}%</strong>
   </div>
   <div style="flex:1;background:var(--bg);border-radius:var(--r3);box-shadow:var(--neu-out-xs);padding:8px 10px">
    <span style="color:var(--t4)">มูลค่าที่เสีย</span>
    <strong style="float:right;color:var(--red)">฿${totalLoss.toLocaleString()}</strong>
   </div>
  </div>`;
 // รายการ
 const listHtml=voided.sort((a,b)=>_ts(b.voidTs||b.ts)-_ts(a.voidTs||a.ts)).map(o=>{
  const t=_normVoidType(o);
  const cfg=typeCfg[t]||typeCfg.customer;
  const dt=new Date(_ts(o.voidTs||o.ts));
  const timeStr=dt.toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'});
  return `<div style="background:var(--bg);border-radius:var(--r3);box-shadow:var(--neu-out-xs);padding:10px 12px;margin-bottom:7px;display:flex;align-items:center;gap:10px;border-left:3px solid ${cfg.color}">
   <span class="mi" style="color:${cfg.color};font-size:18px">${cfg.icon}</span>
   <div style="flex:1;min-width:0">
    <div style="font-size:12px;font-weight:700;color:var(--t1)">บิล #${o.id}</div>
    <div style="font-size:10px;color:var(--t4);margin-top:1px">${o.voidReason&&isNaN(o.voidReason)?o.voidReason:'ไม่ระบุเหตุผล'}</div>
   </div>
   <div style="text-align:right;flex-shrink:0">
    <div style="font-size:11px;font-weight:700;color:${t==='test'?'var(--t4)':`${cfg.color}`};text-decoration:${t==='test'?'line-through':'none'}">฿${(o.total||0).toLocaleString()}</div>
    <span style="font-size:9px;font-weight:700;background:${cfg.bg};color:${cfg.color};padding:1px 6px;border-radius:var(--rf)">${cfg.label}</span>
    <div style="font-size:9px;color:var(--t4);margin-top:1px">${timeStr}</div>
   </div>
  </div>`;
 }).join('');
 el.innerHTML=summaryHtml+listHtml;
}


/* ══════════════════════════════════════════════
   OPTION SETS MANAGER
   จัดการ น้ำแข็ง / ความหวาน / ความเข้ม
   ══════════════════════════════════════════ */

// helper: optionSets item อาจเป็น string (เก่า) หรือ {label,price} (ใหม่)
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
let storeTab='ingredient';
function switchStoreTab(btn,tab){
 document.querySelectorAll('.s-tab').forEach(b=>b.classList.remove('active'));
 btn.classList.add('active');storeTab=tab;renderStores(tab);
 // อัปเดต BAB label และ icon ตาม tab
 const babStores = document.getElementById('bab-stores');
 if(!babStores) return;
 const addBtn = babStores.querySelectorAll('.bab-btn')[1];
 if(!addBtn) return;
 const labels={ingredient:'เพิ่มวัตถุดิบ',package:'เพิ่มบรรจุภัณฑ์',equipment:'เพิ่มอุปกรณ์',blend:'สร้างสูตรเบลนด์',recipe:'คำนวณสูตร',uselog:'บันทึกการใช้',po:'สั่งซื้อ',alert:''};
 const icons={ingredient:'add',package:'add',equipment:'add',blend:'science',recipe:'calculate',uselog:'edit_note',po:'local_shipping',alert:'notifications'};
 const label=labels[tab]||'เพิ่ม';
 if(tab==='alert'){babStores.style.display='none';return;}
 else{babStores.classList.add('show');}
 addBtn.innerHTML=`<span class="mi" style="font-size:16px">${icons[tab]||'add'}</span>${label}`;
}
function openStoreAdd(){
 if(storeTab==='blend'){openBlendModal();return;}
 if(storeTab==='recipe'){openRecipeModal();return;}
 if(storeTab==='uselog'){fillUseLogSelect();openModal('modal-use-log');return;}
 if(storeTab==='po'){openManualPO();return;}
 if(storeTab==='alert'){toast('แจ้งเตือนถูกสร้างอัตโนมัติ');return;}
 document.getElementById('storeModalTitle').textContent={ingredient:'เพิ่มวัตถุดิบ',package:'เพิ่มบรรจุภัณฑ์',equipment:'เพิ่มอุปกรณ์'}[storeTab]||'เพิ่มรายการ';
 document.getElementById('storeEditId').value='';
 document.getElementById('storeEditType').value=storeTab;
 ['storeItemName','storeItemQty','storeItemUnit','storeItemCost','storeItemExpiry','storeItemMin','storeItemNote'].forEach(i=>document.getElementById(i).value='');
 document.getElementById('storeItemStatus').value='active';
 document.getElementById('storeExpiryGroup').style.display=storeTab==='equipment'?'none':'block';
 document.getElementById('storeStatusGroup').style.display=storeTab!=='ingredient'?'block':'none';
 openModal('modal-store-item');
}
function renderStores(tab){
 const el=document.getElementById('storeContent');
 document.getElementById('storesSub').textContent={ingredient:'วัตถุดิบ',package:'บรรจุภัณฑ์',equipment:'อุปกรณ์',blend:'ส่วนผสมพิเศษ',recipe:'สูตรเมนู',uselog:'บันทึกการใช้',po:'รายการสั่งซื้อ',alert:'แจ้งเตือนสต็อก'}[tab]||'';
 if(tab==='blend'){el.innerHTML=renderBlendTab();return;}
 if(tab==='recipe'){el.innerHTML=renderRecipeTab();return;}
 if(tab==='uselog'){el.innerHTML=renderUseLogTab();return;}
 if(tab==='po'){el.innerHTML=renderPOTab();return;}
 if(tab==='alert'){el.innerHTML=renderAlertTab();return;}
 const data={ingredient:DB.ingredients,package:DB.packages,equipment:DB.equipment}[tab]||[];
 const today=new Date().toISOString().split('T')[0];
 const soon=new Date();soon.setDate(soon.getDate()+7);const soonStr=soon.toISOString().split('T')[0];
 if(!data.length){el.innerHTML=`<div class="empty-state"><div class="e-icon"><span class="mi" style="font-size:40px;opacity:.4">inventory_2</span></div><div class="e-title">ยังไม่มีรายการ</div><div class="e-sub">กดปุ่ม + เพิ่มรายการ</div></div>`;return;}
 el.innerHTML='<div style="padding:14px 16px 80px">'+data.map(item=>{
 const lowStock=item.qty<=item.min;
 const expiring=item.expiry&&item.expiry<=soonStr;
 const expired=item.expiry&&item.expiry<today;
 const isDamaged=item.status==='damaged';
 const isRetired=item.status==='retired';
 const iconBg=expired||isDamaged?'var(--red-lt)':lowStock||expiring?'var(--gold-lt)':isRetired?'rgba(140,123,107,.12)':'rgba(61,155,96,.1)';
 const iconColor=expired||isDamaged?'var(--red)':lowStock||expiring?'var(--gold)':isRetired?'var(--t4)':'var(--green)';
 const iconName=tab==='equipment'?'blender':tab==='package'?'package_2':'eco';
 const qtyColor=lowStock?'var(--red)':'var(--esp)';
 const badges=[];
 if(expired) badges.push(`<span class="si-status-badge expired">หมดอายุ</span>`);
 else if(expiring) badges.push(`<span class="si-status-badge soon">ใกล้หมดอายุ</span>`);
 if(lowStock) badges.push(`<span class="si-status-badge low">สต็อกต่ำ</span>`);
 if(isDamaged) badges.push(`<span class="si-status-badge dmg">เสียหาย</span>`);
 if(isRetired) badges.push(`<span class="si-status-badge dmg">เลิกใช้</span>`);
 return`<div class="si-card">
  <div class="si-card-body">
   <div class="si-card-icon" style="background:${iconBg}">
    <span style='font-family:"Material Symbols Outlined";font-size:20px;font-weight:normal;color:${iconColor}'>${iconName}</span>
   </div>
   <div class="si-card-info">
    <div class="si-card-name">${item.name}</div>
    <div class="si-card-meta">
     <span>฿${(item.unitCost||item.cost||0).toLocaleString()}/${item.unit}</span>
     ${item.expiry?`<span>· ${item.expiry}</span>`:''}
     ${badges.join('')}
    </div>
   </div>
   <div class="si-card-qty">
    <div class="si-card-qty-val" style="color:${qtyColor}">${item.qty}<span style="font-size:11px;font-weight:400;color:var(--t4)"> ${item.unit}</span></div>
    <div class="si-card-qty-unit">min ${item.min||0}</div>
   </div>
  </div>
  <div class="si-card-footer">
   <button class="si-card-edit" onclick="editStoreItem('${tab}',${item.id})">
    <span style='font-family:"Material Symbols Outlined";font-size:14px;font-weight:normal'>edit</span> แก้ไข
   </button>
   <button class="si-card-del" onclick="delStoreItem('${tab}',${item.id})">
    <span style='font-family:"Material Symbols Outlined";font-size:14px;font-weight:normal'>delete</span>
   </button>
  </div>
 </div>`;
 }).join('')+'</div>';
}
function calcRecipeCostPerCup(rec){
 if(!rec) return 0;
 const rows=rec.ingredients||rec.ings||[];
 if(!rows.length) return 0;
 let cost=0;
 rows.forEach(row=>{
 if(!row.ingId||!row.qty)return;
 const ing=DB.ingredients.find(x=>x.id===row.ingId);
 if(!ing)return;
 cost+=getIngUnitCost(ing)*row.qty;
 });
 return Math.round(cost*10)/10;
}
function renderRecipeTab(){
 // แสดง linked recipes (ผูกกับเมนู)
 const linked = DB.recipes.filter(r=>r.menuId);
 const standalone = DB.recipes.filter(r=>!r.menuId);
 const allRecs = [...linked,...standalone];
 if(!allRecs.length)return`<div class="empty-state"><div class="e-icon"><span class="mi" style="font-size:40px;opacity:.4">description</span></div><div class="e-title">ยังไม่มีสูตร</div><div class="e-sub">เพิ่มสูตรผ่านหน้าจัดการเมนู</div></div>`;
 return`<div style="padding:12px 16px 80px">`+allRecs.map(rec=>{
 const menu=rec.menuId?DB.menus.find(m=>m.id===rec.menuId):null;
 const cost=calcRecipeCostPerCup(rec);
 const recIngs=rec.ingredients||rec.ings||[];
 const margin=menu&&menu.price>0?Math.round((menu.price-cost)/menu.price*100):null;
 const mc=margin!==null?(margin>=50?'var(--green)':margin>=30?'var(--gold)':'var(--red)'):'var(--t4)';
 return`<div class="store-item" style="flex-direction:column;align-items:stretch;gap:6px;padding:10px 14px"> <div style="display:flex;align-items:center;gap:8px"> <div style="width:28px;height:28px;border-radius:6px;background:${menu?menu.color:'var(--bg-dk)'};display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:700;flex-shrink:0">${menu?menu.icon:''}</div> <div style="flex:1"> <div class="si-name">${rec.name}${menu?` <span style="font-size:9px;color:var(--t4);font-weight:400">→ ${menu.name}</span>`:''}</div> <div class="si-meta">${recIngs.length} วัตถุดิบ · ต้นทุน <strong style="color:var(--cara)">฿${cost}</strong>/แก้ว${margin!==null?` · <span style="color:${mc};font-weight:700">Margin ${margin}%</span>`:''}</div> </div> </div> <div style="display:flex;flex-wrap:wrap;gap:4px;padding-left:36px">${recIngs.map(row=>{const ing=DB.ingredients.find(x=>x.id===row.ingId);return ing?`<span style="font-size:9px;background:var(--bg-dk);border-radius:var(--rf);padding:2px 7px;color:var(--t3)">${ing.name} ${row.qty}${ing.unit}</span>`:''}).join('')}</div> </div>`;
 }).join('')+'</div>';
}
function renderUseLogTab(){
 if(!DB.useLogs.length)return`<div class="empty-state"><div class="e-icon"><span class="mi" style="font-size:40px;opacity:.4">edit_note</span></div><div class="e-title">ยังไม่มีบันทึก</div><div class="e-sub">กดปุ่ม + บันทึกการใช้</div></div>`;
 return`<div style="padding:12px 0 80px">`+DB.useLogs.slice().reverse().map(l=>`
 <div class="store-item"> <span class="badge badge-blue">${{staff:'พนักงาน',test:'ทดลอง',expired:'หมดอายุ',damaged:'เสียหาย',other:'อื่นๆ'}[l.reason]||l.reason}</span> <div class="si-info" style="margin-left:4px"><div class="si-name">${l.itemName}</div><div class="si-meta">${l.note||''}</div></div> <div style="text-align:right"><div style="font-size:12px;font-weight:700;color:var(--red)">-${l.qty} ${l.unit}</div><div style="font-size:9px;color:var(--t4)">${new Date(l.ts).toLocaleDateString('th-TH')}</div></div> </div>`
 ).join('')+'</div>';
}
function editStoreItem(type,id){
 const arr={ingredient:DB.ingredients,package:DB.packages,equipment:DB.equipment}[type];
 const item=arr.find(x=>x.id===id);if(!item)return;
 document.getElementById('storeModalTitle').textContent='แก้ไขรายการ';
 document.getElementById('storeEditId').value=item.id;
 document.getElementById('storeEditType').value=type;
 document.getElementById('storeItemName').value=item.name;
 document.getElementById('storeItemQty').value=item.qty;
 document.getElementById('storeItemUnit').value=item.unit;
 document.getElementById('storeItemCost').value=item.cost;
 document.getElementById('storeItemExpiry').value=item.expiry||'';
 document.getElementById('storeItemMin').value=item.min;
 document.getElementById('storeItemStatus').value=item.status;
 document.getElementById('storeItemNote').value=item.note||'';
 document.getElementById('storeExpiryGroup').style.display=type==='equipment'?'none':'block';
 document.getElementById('storeStatusGroup').style.display=type!=='ingredient'?'block':'none';
 openModal('modal-store-item');
}
function delStoreItem(type,id){
 if(!confirm('ลบรายการนี้?'))return;
 if(type==='ingredient')DB.ingredients=DB.ingredients.filter(x=>x.id!==id);
 else if(type==='package')DB.packages=DB.packages.filter(x=>x.id!==id);
 else if(type==='equipment')DB.equipment=DB.equipment.filter(x=>x.id!==id);
 renderStores(type);toast('ลบแล้ว');
}
function saveStoreItem(){
 const id=parseInt(document.getElementById('storeEditId').value)||null;
 const type=document.getElementById('storeEditType').value;
 const arr={ingredient:DB.ingredients,package:DB.packages,equipment:DB.equipment}[type];
 const data={
 name:document.getElementById('storeItemName').value.trim(),
 qty:parseFloat(document.getElementById('storeItemQty').value)||0,
 unit:document.getElementById('storeItemUnit').value.trim()||'ชิ้น',
 cost:parseFloat(document.getElementById('storeItemCost').value)||0,
 expiry:document.getElementById('storeItemExpiry').value||null,
 min:parseFloat(document.getElementById('storeItemMin').value)||0,
 status:document.getElementById('storeItemStatus').value||'active',
 note:document.getElementById('storeItemNote').value
 };
 if(!data.name){toast('กรุณาใส่ชื่อ');return;}
 // คำนวณ unitCost ตอนบันทึก (ราคาต่อ 1 หน่วย ไม่เปลี่ยนตาม stock)
 if(data.qty>0 && data.cost>0) data.unitCost = Math.round((data.cost/data.qty)*10000)/10000;
 if(id){const item=arr.find(x=>x.id===id); if(!item.unitCost && data.qty>0 && data.cost>0) data.unitCost=Math.round((data.cost/data.qty)*10000)/10000; Object.assign(item,data);toast('อัพเดตแล้ว');}
 else{arr.push({...data,id:DB.nextId++});toast('เพิ่มรายการแล้ว');}
 closeModal('modal-store-item');
 // อัปเดต cost ของเมนูที่ใช้วัตถุดิบนี้
 if(type==='ingredient'){
 DB.menus.forEach(m=>{
 if(!m.recipeId)return;
 const rec=DB.recipes.find(x=>x.id===m.recipeId);
 if(!rec)return;
 const uses=(rec.ingredients||rec.ings||[]).some(row=>row.ingId===parseInt(document.getElementById('storeEditId').value)||false);
 if(uses||true){ // recalc all menus with recipes
 const newCost=calcRecipeCostPerCup(rec);
 if(newCost>0) m.cost=newCost;
 }
 });
 }
 addAudit('store', id?'แก้ไขคลัง':'เพิ่มคลัง', `${data.name} · ${data.qty}${data.unit}`, '', 'rgba(44,24,16,.06)', 'low');
 renderStores(type);scheduleSync();
}
let recipeIngs=[];
function openRecipeModal(){recipeIngs=[];document.getElementById('recipeName').value='';document.getElementById('recipeCups').value='1';document.getElementById('recipeIngList').innerHTML='';document.getElementById('recipeResult').style.display='none';openModal('modal-recipe');}
function addRecipeIng(){
 const idx=recipeIngs.length;recipeIngs.push({ingId:'',qty:0});
 const row=document.createElement('div');row.className='recipe-ing-row';row.id=`ring-${idx}`;
 row.innerHTML=`<div class="f-group" style="flex:2"><label class="f-label">วัตถุดิบ</label><select class="f-select" id="ring-ing-${idx}" onchange="calcRecipe()"><option value="">เลือก...</option>${DB.ingredients.map(i=>`<option value="${i.id}">${i.name} (${i.unit})</option>`).join('')}</select></div><div class="f-group"><label class="f-label">ปริมาณ</label><input class="f-input" id="ring-qty-${idx}" type="number" placeholder="0" oninput="calcRecipe()"></div><button class="btn btn-danger btn-sm btn-icon" onclick="removeRing(${idx})" style="align-self:flex-end"></button>`;
 document.getElementById('recipeIngList').appendChild(row);
}
function removeRing(idx){document.getElementById(`ring-${idx}`)?.remove();calcRecipe();}
function calcRecipe(){
 const cups=parseInt(document.getElementById('recipeCups').value)||1;let total=0;const rows=[];
 document.querySelectorAll('[id^="ring-"]').forEach(row=>{
 if(!row.id.match(/^ring-\d+$/)||!row.querySelector)return;
 const idx=row.id.split('-')[1];
 const ingId=parseInt(document.getElementById(`ring-ing-${idx}`)?.value);
 const qty=parseFloat(document.getElementById(`ring-qty-${idx}`)?.value)||0;
 if(!ingId||!qty)return;
 const ing=DB.ingredients.find(i=>i.id===ingId);if(!ing)return;
 const cost=(ing.cost/1000)*qty*cups;total+=cost;
 rows.push({name:ing.name,qty:qty*cups,unit:ing.unit,cost:cost.toFixed(2)});
 });
 if(rows.length){
 document.getElementById('recipeResult').style.display='block';
 document.getElementById('recipeResultRows').innerHTML=rows.map(r=>`<div class="rr-row"><span>${r.name} (${r.qty}${r.unit})</span><span>฿${r.cost}</span></div>`).join('')+`<div class="rr-row"><span>ต้นทุนรวม ${cups} แก้ว</span><span>฿${total.toFixed(2)}</span></div><div class="rr-row"><span>ต้นทุน/แก้ว</span><span>฿${(total/cups).toFixed(2)}</span></div>`;
 }
}
function saveRecipe(){
 const name=document.getElementById('recipeName').value.trim();const cups=parseInt(document.getElementById('recipeCups').value)||1;
 if(!name){toast('กรุณาใส่ชื่อสูตร');return;}
 const ings=[];
 document.querySelectorAll('[id^="ring-"]').forEach(row=>{
 if(!row.id.match(/^ring-\d+$/))return;
 const idx=row.id.split('-')[1];
 const ingId=parseInt(document.getElementById(`ring-ing-${idx}`)?.value);
 const qty=parseFloat(document.getElementById(`ring-qty-${idx}`)?.value)||0;
 if(ingId&&qty)ings.push({ingId,qty});
 });
 let totalCost=0;ings.forEach(r=>{const ing=DB.ingredients.find(i=>i.id===r.ingId);if(ing)totalCost+=(ing.cost/1000)*r.qty;});
 DB.recipes.push({id:DB.nextId++,name,cups,ingredients:ings,costPerCup:Math.round(totalCost*100)/100,ts:Date.now()});
 closeModal('modal-recipe');renderStores('recipe');toast('บันทึกสูตรแล้ว');scheduleSync();
}

/* Use Log */
function fillUseLogSelect(){
 const sel=document.getElementById('useLogItem');
 sel.innerHTML=DB.ingredients.map(i=>`<option value="${i.id}" data-unit="${i.unit}">${i.name}</option>`).join('');
 sel.onchange=()=>{const opt=sel.options[sel.selectedIndex];document.getElementById('useLogUnit').value=opt.dataset.unit||'';};
 if(sel.options.length)document.getElementById('useLogUnit').value=sel.options[0].dataset.unit||'';
}
function saveUseLog(){
 const ingId=parseInt(document.getElementById('useLogItem').value);
 const ing=DB.ingredients.find(x=>x.id===ingId);if(!ing)return;
 const qty=parseFloat(document.getElementById('useLogQty').value)||0;
 if(!qty){toast('กรุณาใส่จำนวน');return;}
 const reason=document.getElementById('useLogReason').value;
 const note=document.getElementById('useLogNote').value;
 ing.qty=Math.max(0,ing.qty-qty);
 DB.useLogs.push({id:DB.nextId++,ingId,itemName:ing.name,unit:ing.unit,qty,reason,note,ts:Date.now()});
 addAudit('store','บันทึกใช้วัตถุดิบ',`${ing.name} -${qty}${ing.unit} (${reason})`, '', 'rgba(217,79,68,.06)', 'low');
 closeModal('modal-use-log');renderStores('uselog');updateSalesBadge();toast(`บันทึก ${ing.name} -${qty}${ing.unit}`);scheduleSync();
}

/* BLEND TAB */
let blendIngArr=[];
function openBlendModal(id){
 blendIngArr=[];
 document.getElementById('blendIngList').innerHTML='';
 document.getElementById('blendModalTitle').textContent=id?'แก้ไขสูตรเบลนด์':'สร้างสูตรเบลนด์';
 document.getElementById('blendEditId').value=id||'';
 if(id){
  const b=DB.blends.find(x=>String(x.id)===String(id));if(!b)return;
  document.getElementById('blendName').value=b.name||'';
  document.getElementById('blendType').value=b.type||'syrup';
  document.getElementById('blendUnit').value=b.unit||'';
  document.getElementById('blendShelf').value=b.shelfDays||'';
  document.getElementById('blendMethod').value=Array.isArray(b.method)?'':(b.method||'');
  document.getElementById('blendYield').value=b.yieldPerBatch||'';
  document.getElementById('blendCost').value=b.totalCostPerBatch||'';
  // โหลดวัตถุดิบที่มีอยู่ — clone เพื่อไม่กระทบ DB โดยตรง
  blendIngArr=getBlendIngs(b).map(x=>({...x}));
  blendIngArr.forEach((_,i)=>renderBlendIngRow(i));
 } else {
  ['blendName','blendUnit','blendShelf','blendMethod','blendYield','blendCost']
   .forEach(id=>document.getElementById(id).value='');
 }
 openModal('modal-blend');
}
function addBlendIng(){const idx=blendIngArr.length;blendIngArr.push({ingId:'',qty:0,note:''});renderBlendIngRow(idx);}
function calcBlendCost(){
 const costEl=document.getElementById('blendCost');
 const yieldEl=document.getElementById('blendYield');
 if(!costEl) return;
 let totalCost=0, totalQty=0;
 document.querySelectorAll('#blendIngList .blend-ing-row').forEach(row=>{
   const ingId=parseInt(row.querySelector('.bing-ing-sel')?.value);
   const qty=parseFloat(row.querySelector('.bing-qty-inp')?.value)||0;
   totalQty+=qty;
   if(!ingId||!qty) return;
   const ing=[...DB.ingredients,...DB.packages].find(x=>x.id===ingId);
   if(ing) totalCost+=getIngUnitCost(ing)*qty;
 });
 costEl.value=totalCost>0?Math.round(totalCost*100)/100:'';
 // yield = ผลรวม qty วัตถุดิบทั้งหมด (คำนวณอัตโนมัติ)
 if(yieldEl) yieldEl.value=totalQty>0?Math.round(totalQty*100)/100:'';
}
function renderBlendIngRow(idx){
 const existing=blendIngArr[idx]||{};
 const row=document.createElement('div');
 row.className='blend-ing-row';
 row.id=`bing-${idx}`;
 row.style.cssText='display:flex;gap:8px;align-items:flex-end;margin-bottom:8px;';
 // dropdown เฉพาะชื่อ ไม่มีราคา
 const opts=[...DB.ingredients,...DB.packages].map(i=>
  `<option value="${i.id}"${i.id===existing.ingId?'selected':''}>${i.name}</option>`
 ).join('');
 row.innerHTML=`
  <div class="f-group" style="flex:2;margin:0">
   <label class="f-label" style="font-size:10px">วัตถุดิบ</label>
   <select class="f-select bing-ing-sel" onchange="calcBlendCost()">
    <option value="">— เลือก —</option>${opts}
   </select>
  </div>
  <div class="f-group" style="flex:1;margin:0">
   <label class="f-label" style="font-size:10px">ปริมาณ</label>
   <input class="f-input bing-qty-inp" type="number" value="${existing.qty||''}" placeholder="0" oninput="calcBlendCost()">
  </div>
  <button onclick="removeBlendIngRow(${idx})" style="flex-shrink:0;padding:8px 10px;border-radius:var(--r2);background:var(--red-lt);border:none;cursor:pointer;align-self:flex-end;margin-bottom:0">
   <span class="material-symbols-outlined" style="font-size:16px;color:var(--red);display:block">delete</span>
  </button>`;
 document.getElementById('blendIngList').appendChild(row);
 calcBlendCost();
}
function removeBlendIngRow(idx){
 // ลบ row แล้ว re-render ใหม่เพื่อ sync index
 const rows=document.querySelectorAll('#blendIngList .blend-ing-row');
 // เก็บข้อมูลปัจจุบันก่อนลบ
 const current=[];
 rows.forEach((r,i)=>{
  if(i===idx)return;
  current.push({
   ingId:parseInt(r.querySelector('.bing-ing-sel')?.value)||'',
   qty:parseFloat(r.querySelector('.bing-qty-inp')?.value)||0,
   note:''
  });
 });
 blendIngArr=current;
 document.getElementById('blendIngList').innerHTML='';
 blendIngArr.forEach((_,i)=>renderBlendIngRow(i));
}
function saveBlendFormula(){
 const rawId=document.getElementById('blendEditId').value;
 const id=rawId||null;
 // อ่านวัตถุดิบจาก DOM โดยตรง
 const ings=[];
 document.querySelectorAll('#blendIngList .blend-ing-row').forEach(row=>{
  const ingIdRaw=row.querySelector('.bing-ing-sel')?.value;
  const ingId=ingIdRaw?parseInt(ingIdRaw):null;
  const qty=parseFloat(row.querySelector('.bing-qty-inp')?.value)||0;
  if(ingId&&qty) ings.push({ingId,qty,note:''});
 });
 const name=document.getElementById('blendName').value.trim();
 if(!name){toast('กรุณาใส่ชื่อสูตร');return;}
 if(!ings.length){toast('กรุณาเพิ่มวัตถุดิบอย่างน้อย 1 รายการ');return;}
 const data={
  name,
  type:document.getElementById('blendType').value,
  unit:document.getElementById('blendUnit').value||'ml',
  shelfDays:parseInt(document.getElementById('blendShelf').value)||14,
  ings, // primary field — GAS sheet col: ings
  method:document.getElementById('blendMethod').value, // วิธีทำ (text)
  yieldPerBatch:parseFloat(document.getElementById('blendYield').value)||0,
  totalCostPerBatch:parseFloat(document.getElementById('blendCost').value)||0,
 };
 if(id){
  const b=DB.blends.find(x=>String(x.id)===String(id));
  if(b){Object.assign(b,data);toast('อัปเดตสูตรแล้ว');}
 } else {
  DB.blends.push({...data,id:DB.nextId++,stock:[]});
  toast('✅ สร้างสูตรเบลนด์แล้ว');
 }
 addAudit('store', id?'แก้ไขสูตรเบลนด์':'สร้างสูตรเบลนด์', data.name, '', 'rgba(43,94,167,.06)', 'low');
 closeModal('modal-blend');renderStores('blend');scheduleSync();
}
function renderBlendTab(){
 if(!DB.blends.length)return`<div class="empty-state"><div class="e-icon"><span class="mi" style="font-size:32px">science</span></div><div class="e-title">ยังไม่มีสูตรเบลนด์</div><div class="e-sub">กดปุ่ม + เพื่อสร้างสูตรแรก</div></div>`;
 const today=new Date().toISOString().split('T')[0];
 const soon=new Date();soon.setDate(soon.getDate()+3);const soonStr=soon.toISOString().split('T')[0];
 const typeEmoji={syrup:'<span class="mi">water_drop</span>',base_ingredient:'<span class="mi">grass</span>',sauce:'<span class="mi">opacity</span>',tea_base:'<span class="mi">local_cafe</span>',other:'<span class="mi">category</span>'};
 const typeLabelMap={syrup:'ไซรัป',base_ingredient:'วัตถุดิบหลัก',sauce:'ซอส',tea_base:'ฐานชา',other:'อื่นๆ'};
 let html='<div style="padding:12px 16px 80px">';
 DB.blends.forEach(b=>{
  const totalStock=(b.stock||[]).reduce((s,x)=>s+x.qty,0);
  const tLabel=typeLabelMap[b.type]||b.type;
  const tEmoji=typeEmoji[b.type]||'<span class="mi">category</span>';
  const stockColor=totalStock===0?'var(--red)':totalStock<b.yieldPerBatch?'var(--gold)':'var(--green)';
  const ingNames=getBlendIngs(b).map(ig=>{
   const ing=[...DB.ingredients,...DB.packages].find(x=>x.id===ig.ingId);
   return ing?`<span class="bc-ing-chip">${ing.name}</span>`:'';
  }).join('');
  const batchRows=(b.stock||[]).map(s=>{
   const exp=s.expiry<today;const sn=s.expiry>=today&&s.expiry<=soonStr;
   const dotCls=exp?' expired':sn?' soon':'';
   return`<div class="blend-batch-row"><div class="bbl-dot${dotCls}"></div><span style="flex:1">Batch #${s.batchId} · ${s.qty} ${b.unit}</span><span style="font-size:10px;color:${exp?'var(--red)':sn?'var(--gold)':'var(--t4)'}">หมด ${s.expiry}</span></div>`;
  }).join('');
  const ingDetail=getBlendIngs(b).map(ig=>{
   const ing=[...DB.ingredients,...DB.packages].find(x=>x.id===ig.ingId);
   if(!ing)return'';
   return`<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--t2);padding:3px 0;border-bottom:1px dashed rgba(176,154,133,.15)"><span>${ing.name}</span><span style="font-weight:700">${ig.qty} ${ing.unit}</span></div>`;
  }).join('');
  html+=`<div class="blend-card" style="margin-bottom:12px">
   <div class="bc-head" onclick="toggleBlendDetail('${b.id}')" style="cursor:pointer">
    <div class="bc-type-icon" style="font-size:20px;background:var(--bg-lt)">${tEmoji}</div>
    <div class="bc-info">
     <div class="bc-name">${b.name}</div>
     <div class="bc-meta">${tLabel} · อายุ ${b.shelfDays} วัน · ได้ ${b.yieldPerBatch} ${b.unit}/batch</div>
     <div class="bc-meta" style="margin-top:2px;color:var(--cara)">฿${b.totalCostPerBatch||0}/batch · แตะเพื่อดูรายละเอียด</div>
    </div>
    <div class="bc-stock">
     <div class="bc-stock-val" style="color:${stockColor}">${totalStock}</div>
     <div class="bc-stock-unit">${b.unit} คงเหลือ</div>
     <span class="material-symbols-outlined" style="font-size:14px;color:var(--t4);margin-top:4px" id="blend-chev-${b.id}">expand_more</span>
    </div>
   </div>
   ${batchRows}
   <div id="blend-detail-${b.id}" style="display:none;padding:10px 14px;border-top:1px solid rgba(176,154,133,.12)">
    <div style="font-size:10px;font-weight:700;color:var(--t4);margin-bottom:6px"><span class="mi" style="font-size:13px;vertical-align:-2px">inventory_2</span> วัตถุดิบต่อ 1 Batch</div>
    ${ingDetail}
    ${b.method&&!Array.isArray(b.method)?`<div style="margin-top:8px;font-size:10px;color:var(--t3);background:var(--bg-dk);border-radius:var(--r2);padding:8px;line-height:1.7"><span class="mi" style="font-size:13px;vertical-align:-2px">description</span> ${b.method}</div>`:''}
   </div>
   <div class="bc-foot" style="justify-content:flex-end">
    <div class="bc-actions">
     <button class="btn btn-success btn-xs" onclick="event.stopPropagation();openBatchModal('${b.id}')"><span class="material-symbols-outlined" style="font-size:13px;vertical-align:-2px">science</span> ผลิต</button>
     <button class="btn btn-secondary btn-xs" onclick="event.stopPropagation();openBlendModal('${b.id}')"><span class="material-symbols-outlined" style="font-size:13px;vertical-align:-2px">edit</span> แก้ไข</button>
     <button class="btn btn-xs" style="background:var(--red-lt);color:var(--red)" onclick="event.stopPropagation();delBlend('${b.id}')"><span class="material-symbols-outlined" style="font-size:13px;vertical-align:-2px">delete</span></button>
    </div>
   </div>
  </div>`;
 });
 html+='</div>';
 return html;
}
function toggleBlendDetail(id){
 const el=document.getElementById(`blend-detail-${id}`);
 const chev=document.getElementById(`blend-chev-${id}`);
 if(!el)return;
 const open=el.style.display==='none';
 el.style.display=open?'block':'none';
 if(chev)chev.textContent=open?'expand_less':'expand_more';
}
function delBlend(id){
 if(!confirm('ลบสูตรนี้?'))return;
 DB.blends=DB.blends.filter(x=>String(x.id)!==String(id));
 renderStores('blend');scheduleSync();toast('ลบสูตรแล้ว');
}
function openBatchModal(blendId){
 const bid=String(blendId);
 document.getElementById('batchBlendId').value=bid;
 document.getElementById('batchMultiplier').value='1';
 const b=DB.blends.find(x=>String(x.id)===bid);
 if(!b){toast('ไม่พบสูตรเบลนด์');return;}
 document.getElementById('batchModalTitle').textContent='ผลิต: '+b.name;
 updateBatchPreview();
 openModal('modal-batch');
}
function updateBatchPreview(){
 const bid=String(document.getElementById('batchBlendId').value);
 const b=DB.blends.find(x=>String(x.id)===bid);if(!b)return;
 const mult=parseFloat(document.getElementById('batchMultiplier').value)||1;
 const expDate=new Date();expDate.setDate(expDate.getDate()+(b.shelfDays||14));
 const ings=getBlendIngs(b);
 if(!ings.length){
  document.getElementById('batchPreview').innerHTML=`<div style="background:rgba(184,134,11,.1);border-radius:var(--r3);padding:12px;margin-top:10px;font-size:12px;color:var(--gold)">⚠️ สูตรนี้ยังไม่มีวัตถุดิบ — แก้ไขสูตรก่อนผลิต</div>`;
  return;
 }
 const canMake=ings.map(ig=>{
  const ing=[...DB.ingredients,...DB.packages].find(x=>String(x.id)===String(ig.ingId));
  if(!ing) return{name:'ไม่พบ: '+ig.ingId,ok:false,need:ig.qty*mult,have:0,unit:''};
  const need=ig.qty*mult;
  return{name:ing.name,ok:ing.qty>=need,need,have:ing.qty,unit:ing.unit};
 });
 const yieldAmt=(b.yieldPerBatch||0)*mult;
 const costAmt=Math.round((b.totalCostPerBatch||getBlendCost(b))*mult*100)/100;
 const allOk=canMake.every(r=>r.ok);
 document.getElementById('batchPreview').innerHTML=`
 <div style="background:var(--bg);border-radius:var(--r3);padding:12px;box-shadow:var(--neu-in-sm);margin-top:10px">
  <div style="font-size:12px;font-weight:700;color:var(--t2);margin-bottom:8px">ตรวจสอบวัตถุดิบ ×${mult} batch</div>
  ${canMake.map(r=>`<div class="batch-ing-row">
   <span>${r.name}</span>
   <span class="${r.ok?'ok':'no'}">${r.ok?'✓ พอ':'✗ ขาด'} (ต้องการ ${r.need} ${r.unit}, มี ${r.have})</span>
  </div>`).join('')}
  <div style="margin-top:10px;padding-top:8px;border-top:1px dashed rgba(140,123,107,.2);font-size:11px;color:var(--t3)">
   จะได้ <strong style="color:var(--green)">${yieldAmt} ${b.unit}</strong> ·
   หมดอายุ <strong>${expDate.toLocaleDateString('th-TH')}</strong> ·
   ต้นทุน <strong style="color:var(--cara)">฿${costAmt}</strong>
  </div>
  ${!allOk?`<div style="margin-top:8px;font-size:11px;color:var(--red);font-weight:600">⚠️ วัตถุดิบบางรายการไม่พอ — ตรวจสอบคลังก่อนผลิต</div>`:''}
 </div>`;
}
function confirmBatch(){
 const bid=String(document.getElementById('batchBlendId').value);
 const b=DB.blends.find(x=>String(x.id)===bid);if(!b)return;
 const mult=parseFloat(document.getElementById('batchMultiplier').value)||1;
 const ings=getBlendIngs(b);
 // ตรวจสอบก่อนผลิต
 const missing=ings.filter(ig=>{
  const ing=[...DB.ingredients,...DB.packages].find(x=>String(x.id)===String(ig.ingId));
  return !ing || ing.qty < ig.qty*mult;
 });
 if(missing.length){
  toast('วัตถุดิบไม่พอ กรุณาตรวจสอบคลังก่อนผลิต');return;
 }
 // หักวัตถุดิบ
 ings.forEach(ig=>{
  const ing=[...DB.ingredients,...DB.packages].find(x=>String(x.id)===String(ig.ingId));
  if(ing) ing.qty=Math.max(0, Math.round((ing.qty - ig.qty*mult)*1000)/1000);
 });
 const expDate=new Date();expDate.setDate(expDate.getDate()+(b.shelfDays||14));
 const batchId=DB.nextId++;
 const yieldAmt=(b.yieldPerBatch||0)*mult;
 const costAmt=Math.round((b.totalCostPerBatch||getBlendCost(b))*mult*100)/100;
 if(!b.stock) b.stock=[];
 b.stock.push({batchId,qty:yieldAmt,produced:new Date().toISOString().split('T')[0],expiry:expDate.toISOString().split('T')[0],cost:costAmt});
 DB.blendBatches.push({id:batchId,blendId:b.id,multiplier:mult,qty:yieldAmt,produced:new Date().toISOString().split('T')[0],expiry:expDate.toISOString().split('T')[0],totalCost:costAmt,ts:Date.now()});
 addAudit('store','ผลิตเบลนด์','ผลิต '+b.name+' x'+mult+' batch → ได้ '+yieldAmt+' '+b.unit,'','rgba(43,94,167,.08)','low');
 closeModal('modal-batch');renderStores('blend');toast('✅ ผลิต '+b.name+' x'+mult+' batch สำเร็จ → ได้ '+yieldAmt+' '+b.unit);scheduleSync();
}

/* PO TAB */
function renderPOTab(){
 // แสดง low-stock suggestions + existing POs
 const today=new Date().toISOString().split('T')[0];
 const lowItems=[...DB.ingredients,...DB.packages].filter(i=>i.qty<=i.min&&i.status==='active');
 const pos=DB.purchaseOrders.slice().reverse();
 let html='';
 // suggestions
 if(lowItems.length){
 html+=`<div style="background:rgba(184,134,11,.08);border-radius:var(--r3);padding:10px 14px;margin:12px 16px 10px"> <div style="font-size:11px;font-weight:700;color:var(--gold);margin-bottom:8px"> แนะนำสั่งซื้อ (${lowItems.length} รายการใกล้หมด)</div> ${lowItems.map(i=>`<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid rgba(184,134,11,.12)"> <span style="font-size:12px;color:var(--t2)">${i.name}</span> <div style="display:flex;align-items:center;gap:8px"> <span style="font-size:11px;color:var(--red)">${i.qty}/${i.min} ${i.unit}</span> <button onclick="quickCreatePO(${i.id},'${i.name}',${i.min*3},${i.unitCost||i.cost||0},'${i.unit}')" style="font-size:10px;background:var(--gold-lt);color:var(--gold);border:none;border-radius:var(--rf);padding:3px 8px;font-weight:700;cursor:pointer">+ สั่ง</button> </div> </div>`).join('')}
 </div>`;
 }
 // existing POs
 if(!pos.length&&!lowItems.length) return`<div class="empty-state"><div class="e-icon"><span class="mi" style="font-size:40px;opacity:.4">local_shipping</span></div><div class="e-title">ไม่มีรายการสั่งซื้อ</div><div class="e-sub">กดปุ่ม + เพื่อสร้างใบสั่งซื้อ</div></div>`;
 if(pos.length){
 html+=`<div style="padding:0 0 80px"><div style="font-size:10px;font-weight:700;color:var(--t4);padding:6px 16px">รายการสั่งซื้อทั้งหมด</div>`;
 html+=pos.map(po=>{
 const statusCol={pending:'var(--gold)',received:'var(--green)',cancelled:'var(--red)'}[po.status]||'var(--t4)';
 const statusTh={pending:'รอรับ',received:'รับแล้ว',cancelled:'ยกเลิก'}[po.status]||po.status;
 return`<div class="store-item" style="flex-direction:column;align-items:stretch;padding:10px 14px;gap:4px"> <div style="display:flex;justify-content:space-between;align-items:center"> <span style="font-size:12px;font-weight:700">${po.itemName}</span> <span style="font-size:10px;font-weight:700;color:${statusCol}">${statusTh}</span> </div> <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--t4)"> <span>${po.qty} ${po.unit} · ฿${po.totalCost}</span> <span>${new Date(po.ts).toLocaleDateString('th-TH')}</span> </div> ${po.status==='pending'?`<div style="display:flex;gap:6px;margin-top:4px"> <button onclick="receivePO(${po.id})" style="flex:1;font-size:10px;background:var(--green-lt);color:var(--green);border:none;border-radius:var(--rf);padding:4px;font-weight:700;cursor:pointer"> รับของแล้ว</button> <button onclick="cancelPO(${po.id})" style="font-size:10px;background:var(--red-lt);color:var(--red);border:none;border-radius:var(--rf);padding:4px 8px;font-weight:700;cursor:pointer"></button> </div>`:''}
 </div>`;
 }).join('')+'</div>';
 }
 return html;
}
function openManualPO(){
 const items=[...DB.ingredients,...DB.packages].filter(i=>i.status==='active');
 if(!items.length){toast('ยังไม่มีวัตถุดิบ/บรรจุภัณฑ์ในคลัง');return;}
 document.getElementById('poItemSel').innerHTML=items.map(i=>`<option value="${i.id}" data-unit="${i.unit}" data-cost="${i.unitCost||i.cost||0}" data-name="${i.name}">${i.name} (${i.qty}${i.unit})</option>`).join('');
 const first=items[0];
 document.getElementById('poQtyInput').value=Math.max(first.min*3,1)||1;
 document.getElementById('poUnitLabel').value=first.unit;
 document.getElementById('poPriceInput').value=first.unitCost||first.cost||'';
 document.getElementById('poTotalPreview').value='';
 document.getElementById('poEditId').value='';
 document.getElementById('poNote').value='';
 updatePOPreview();
 openModal('modal-po');
}
function onPOItemChange(){
 const sel=document.getElementById('poItemSel');
 const opt=sel.options[sel.selectedIndex];
 document.getElementById('poUnitLabel').value=opt.dataset.unit||'หน่วย';
 const items=[...DB.ingredients,...DB.packages];
 const item=items.find(i=>String(i.id)===String(sel.value));
 if(item){
  document.getElementById('poQtyInput').value=Math.max(item.min*3,1)||1;
  document.getElementById('poPriceInput').value=item.unitCost||item.cost||'';
 }
 updatePOPreview();
}
function updatePOPreview(){
 const qty=parseFloat(document.getElementById('poQtyInput').value)||0;
 const price=parseFloat(document.getElementById('poPriceInput').value)||0;
 const total=qty*price;
 document.getElementById('poTotalPreview').value=total>0?'฿'+total.toLocaleString('th-TH',{minimumFractionDigits:0,maximumFractionDigits:2}):'';
}
function savePO(){
 const sel=document.getElementById('poItemSel');
 const opt=sel.options[sel.selectedIndex];
 const ingId=parseInt(sel.value);
 const name=opt.dataset.name||opt.text;
 const qty=parseFloat(document.getElementById('poQtyInput').value)||0;
 const unit=opt.dataset.unit||'หน่วย';
 const unitCost=parseFloat(document.getElementById('poPriceInput').value)||parseFloat(opt.dataset.cost)||0;
 if(!qty){toast('กรุณาใส่จำนวน');return;}
 if(!unitCost){toast('กรุณาใส่ราคาต่อหน่วย');return;}
 const po={id:DB.nextId++,ingId,itemName:name,qty,unit,unitCost,totalCost:Math.round(qty*unitCost*100)/100,status:'pending',note:document.getElementById('poNote').value||'',ts:Date.now()};
 DB.purchaseOrders.push(po);
 addAudit('store','สร้างใบสั่งซื้อ',`สั่ง ${name} x${qty}${unit} · ฿${po.totalCost}`,'','rgba(43,94,167,.08)','low');
 closeModal('modal-po');
 renderStores('po'); toast(`✅ สร้างใบสั่ง ${name} x${qty}${unit}`); scheduleSync();
}
function quickCreatePO(ingId,name,qty,unitCost,unit){
 const po={id:DB.nextId++,ingId,itemName:name,qty,unit,unitCost,totalCost:Math.round(qty*unitCost),status:'pending',note:'',ts:Date.now()};
 DB.purchaseOrders.push(po);
 addAudit('store','สร้างใบสั่งซื้อ',`สั่ง ${name} x${qty}${unit} (auto)`,'','rgba(43,94,167,.08)','low');
 renderStores('po'); toast(`✅ สร้างใบสั่ง ${name} x${qty}${unit}`); scheduleSync();
}
function receivePO(poId){
 const po=DB.purchaseOrders.find(x=>x.id===poId);if(!po)return;
 po.status='received';
 po.receivedTs=Date.now();
 // อัปเดต stock
 const ing=[...DB.ingredients,...DB.packages].find(x=>x.id===po.ingId);
 if(ing){
  ing.qty = Math.round((ing.qty + po.qty)*1000)/1000;
  // อัปเดต unitCost ใหม่ถ้า PO มีราคา (ราคาต้นทุนอาจเปลี่ยน)
  if(po.unitCost>0 && po.qty>0){
   ing.cost = po.unitCost;       // ราคาต่อ 1 หน่วยที่สั่งซื้อครั้งนี้
   ing.unitCost = po.unitCost;   // ล็อกไว้ใช้ใน recipe cost
  }
  // คำนวณต้นทุนเมนูใหม่ที่ใช้วัตถุดิบนี้
  DB.menus.forEach(m=>{
   if(!m.recipeId)return;
   const rec=DB.recipes.find(r=>r.id===m.recipeId);
   if(!rec)return;
   const usesThis=(rec.ingredients||rec.ings||[]).some(row=>row.ingId===po.ingId);
   if(usesThis){
    const newCost=calcRecipeCostPerCup(rec);
    if(newCost>0) m.cost=newCost;
   }
  });
  toast(`✅ รับ ${po.itemName} +${po.qty}${po.unit} → คลังรวม ${ing.qty}${ing.unit}`);
 } else {
  toast('รับของแล้ว (ไม่พบวัตถุดิบในคลัง)');
 }
 // บันทึก Audit Log
 addAudit('store','รับสินค้า PO',`รับ ${po.itemName} x${po.qty}${po.unit} · ฿${po.totalCost}`,'','rgba(61,155,96,.08)','low');
 // อัปเดต UI ที่เกี่ยวข้อง
 renderStores('po');
 updateSalesBadge();   // badge แจ้งเตือนสต็อกต่ำ
 scheduleSync();
}
function cancelPO(poId){
 const po=DB.purchaseOrders.find(x=>x.id===poId);if(!po)return;
 if(!confirm(`ยกเลิกใบสั่ง ${po.itemName}?`))return;
 po.status='cancelled';
 addAudit('store','ยกเลิก PO',`ยกเลิกใบสั่ง ${po.itemName} x${po.qty}${po.unit}`,'','rgba(217,79,68,.08)','low');
 renderStores('po');scheduleSync();toast(`ยกเลิกใบสั่ง ${po.itemName} แล้ว`);
}

/* ALERT TAB */
function renderAlertTab(){
 const today=new Date().toISOString().split('T')[0];
 const soon=new Date();soon.setDate(soon.getDate()+7);const soonStr=soon.toISOString().split('T')[0];
 const allItems=[...DB.ingredients,...DB.packages,...DB.equipment];
 const expired=allItems.filter(i=>i.expiry&&i.expiry<today);
 const expiring=allItems.filter(i=>i.expiry&&i.expiry>=today&&i.expiry<=soonStr);
 const lowStock=[...DB.ingredients,...DB.packages].filter(i=>i.qty<=i.min&&i.status==='active');
 const damaged=allItems.filter(i=>i.status==='damaged');
 if(!expired.length&&!expiring.length&&!lowStock.length&&!damaged.length)
 return`<div class="empty-state"><div class="e-icon"><span class="mi" style="font-size:40px;opacity:.4">check_circle</span></div><div class="e-title">ทุกอย่างปกติ</div><div class="e-sub">ไม่มีการแจ้งเตือน</div></div>`;
 const section=(icon,title,col,items,extra='')=>{
 if(!items.length)return'';
 return`<div style="margin:0 16px 12px;background:var(--bg);border-radius:var(--r3);box-shadow:var(--neu-out-xs);overflow:hidden"> <div style="padding:8px 12px;background:${col}22;border-bottom:1px solid ${col}33"> <span style="font-size:11px;font-weight:700;color:${col}">${icon} ${title} (${items.length})</span> </div> ${items.map(i=>`<div style="display:flex;justify-content:space-between;padding:8px 12px;border-bottom:1px solid rgba(140,123,107,.1)"> <span style="font-size:12px;color:var(--t2)">${i.name}</span> <span style="font-size:11px;color:${col}">${i.expiry?i.expiry:i.qty+'/'+i.min+' '+i.unit}</span> </div>`).join('')}
 ${extra}
 </div>`;
 };
 return '<div style="padding:12px 0 80px">'+section('','หมดอายุแล้ว','#B83228',expired)+
 section('','ใกล้หมดอายุ (7 วัน)','#B8860B',expiring)+
 section('','สต็อกต่ำกว่าขั้นต่ำ','#C87818',lowStock,
 `<div style="padding:6px 12px"><button onclick="switchStoreTab(document.querySelector('[onclick*=po]'),'po')" style="font-size:10px;background:var(--gold-lt);color:var(--gold);border:none;border-radius:var(--rf);padding:4px 10px;font-weight:700;cursor:pointer;width:100%" onclick="document.querySelector('.s-tab[onclick*=po]').click()">ดูรายการสั่งซื้อ</button></div>`)+
 section('','ชำรุด/เสียหาย','#8B3A3A',damaged);
}

/* 
 SALES TODAY PAGE
 */
function getTodayOrders(){
 const now=new Date();
 const todayStart=new Date(now.getFullYear(),now.getMonth(),now.getDate()).getTime();
 return DB.orders.filter(o=>o.ts>=todayStart);
}
function updateSalesBadge(){
 const count=getTodayOrders().filter(o=>o.status!=='voided').length;
 const badge=document.getElementById('navSalesBadge');
 if(!badge)return;
 if(count>0){badge.textContent=count;badge.classList.add('show');}
 else badge.classList.remove('show');
}
function renderSalesToday(){
 const allOrders=getTodayOrders();
 const activeOrders=allOrders.filter(o=>o.status!=='voided');
 const total=activeOrders.reduce((s,o)=>s+o.total,0);
 const profit=activeOrders.reduce((s,o)=>s+o.items.reduce((ss,i)=>{const m=DB.menus.find(x=>x.id===i.menuId);const cost=i.costPerItem!=null?i.costPerItem:(m?m.cost:0);return ss+(m?(i.price-cost)*i.qty-(i.promoDisc||0):0);},0),0);
 const voidedCount=allOrders.filter(o=>o.status==='voided').length;

 document.getElementById('salesTodayTotal').textContent='฿'+total.toLocaleString();
 document.getElementById('salesTodaySub').textContent=new Date().toLocaleDateString('th-TH',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
 document.getElementById('salesTodayCount').textContent=activeOrders.length;
 document.getElementById('salesTodayAmt').textContent='฿'+total.toLocaleString();
 document.getElementById('salesTodayProfit').textContent='฿'+profit.toLocaleString();

 const listEl=document.getElementById('salesTodayList');
 if(!allOrders.length){
 listEl.innerHTML='<div class="empty-state"><div class="e-icon"><span class="mi" style="font-size:40px;opacity:.4">wb_twilight</span></div><div class="e-title">ยังไม่มีออเดอร์วันนี้</div><div class="e-sub">เริ่มรับออเดอร์ได้เลย!</div></div>';
 return;
 }
 listEl.innerHTML=allOrders.slice().reverse().map(function(o){
 var timeStr=new Date(o.ts).toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'});
 var isVoided=o.status==='voided';
 var orderProfit=isVoided?0:o.items.reduce(function(ss,i){var m=DB.menus.find(function(x){return x.id===i.menuId;});var cost=i.costPerItem!=null?i.costPerItem:(m?m.cost:0);return ss+(m?(i.price-cost)*i.qty:0);},0);
 var hasPending=DB.pendingVoids.some(function(v){return String(v.orderId)===String(o.id)&&v.status==='pending';});
 var statusBadge='';
 if(isVoided) statusBadge='<span style="background:var(--red-lt);color:var(--red);font-size:9px;font-weight:700;padding:2px 6px;border-radius:var(--rf)">ยกเลิก</span>';
 else if(hasPending) statusBadge='<span style="background:var(--gold-lt);color:var(--gold);font-size:9px;font-weight:700;padding:2px 6px;border-radius:var(--rf)">รออนุมัติ</span>';
 // item rows with full detail
 var itemLines=o.items.map(function(i,n){
 var menu=DB.menus.find(function(m){return m.id===i.menuId;});
 var promo=i.promoId?DB.promos.find(function(p){return p.id===i.promoId;}):null;
 var customLabels={extraShot:'เพิ่มช็อต',extraMatcha:'เพิ่มมัทฉะ',extraCocoa:'เพิ่มโกโก้'};
 var noteParts=(i.note||'').split(' · ');
 var customTags=Object.values(customLabels).filter(function(v){return noteParts.includes(v);});
 var otherNote=noteParts.filter(function(p){return !Object.values(customLabels).includes(p);}).join(' · ');
 var opts=[i.size||'',i.ice||'',i.sweet?'หวาน '+i.sweet:'',i.strength?'เข้ม '+i.strength:'',otherNote].filter(Boolean).join(' · ');
 var html='<div style="display:flex;align-items:flex-start;gap:6px;padding:5px 0;border-bottom:1px solid rgba(176,154,133,.08)">';
 html+='<span style="width:17px;height:17px;border-radius:50%;background:var(--bg-dk);font-size:8px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;color:var(--t3)">'+(n+1)+'</span>';
 html+='<div style="flex:1;min-width:0">';
 html+='<div style="font-size:12px;font-weight:700;color:var(--t1)">'+i.name+' <span style="font-size:10px;font-weight:400;color:var(--t4)">('+i.size+') x'+i.qty+'</span></div>';
 if(opts) html+='<div style="font-size:9px;color:var(--t4);margin-top:2px">'+opts+'</div>';
 if(customTags.length) html+='<div style="font-size:9px;color:var(--blue-md);margin-top:1px">'+customTags.map(function(t){return t+' +฿10';}).join(' · ')+'</div>';
 if(promo){var disc=i.promoDisc||0;html+='<div style="font-size:9px;color:var(--gold);font-weight:600;margin-top:1px">% '+promo.name+' <span style="color:var(--red)">-฿'+disc+'</span></div>';}
 html+='</div>';
 html+='<span style="font-size:12px;font-weight:700;color:var(--cara);flex-shrink:0">฿'+(i.price*i.qty).toLocaleString()+'</span>';
 html+='</div>';
 return html;
 }).join('');
 var discLine='';
 var discHeader='';
 var totalColor=isVoided?'var(--t5)':'var(--cara)';
 var tdecor=isVoided?'text-decoration:line-through':'';
 var totalText=isVoided?'ยกเลิก':'฿'+o.total.toLocaleString();
 var profitLine=!isVoided?'<div style="font-size:10px;color:var(--green)">+฿'+orderProfit.toLocaleString()+'</div>':'';
 var bgEsp=isVoided?'var(--t5)':'var(--esp)';
 var opacity=isVoided?'0.65':'1';
 var totalItems=o.items.reduce(function(s,i){return s+i.qty;},0);
 var detailId='bill-detail-'+o.id;
 // detail section (collapsed by default)
 var detailSection='<div id="'+detailId+'" style="display:none;padding:0 14px 8px;border-top:1px solid rgba(176,154,133,.12)">'
 +itemLines+discLine
 +'<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0 2px;border-top:1px solid rgba(176,154,133,.12);margin-top:2px">'
 +'<span style="font-size:11px;font-weight:700;color:var(--t2)">รวมทั้งสิ้น</span>'
 +'<span style="font-size:14px;font-weight:800;color:var(--cara);font-family:var(--fh)">฿'+o.total.toLocaleString()+'</span>'
 +'</div>'
 +(!isVoided?'<div style="border-top:1px solid rgba(176,154,133,.12);margin-top:6px"><button class="btn btn-secondary" style="width:100%;border-radius:var(--r3);padding:9px;font-size:12px;font-weight:600;margin-top:6px" onclick="event.stopPropagation();printSalesCopy(\''+o.id+'\')" ">พิมพ์ใบเสร็จ</button></div>':'')
 +'</div>';
 return '<div style="margin:0 16px 10px;background:var(--bg);border-radius:var(--r4);box-shadow:var(--neu-out-sm);overflow:hidden;opacity:'+opacity+'">'
 +'<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer" onclick="toggleBillDetail(\''+detailId+'\')">'
 +(function(){
  // สร้าง icon stack จากสีเมนูในออเดอร์
  var icons=o.items.slice(0,3).map(function(i){
   var m=DB.menus.find(function(x){return x.id===i.menuId;});
   var col=m?m.color:i.color||'#5C3317';
   var ico=m?m.icon:i.icon||'?';
   return '<div style="width:28px;height:28px;border-radius:50%;background:'+col+';display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;color:rgba(255,255,255,.95);box-shadow:0 2px 6px rgba(0,0,0,.25);border:2px solid var(--bg)">'+ico+'</div>';
  });
  var count=o.items.reduce(function(s,i){return s+i.qty;},0);
  if(o.items.length<=1){
   // 1 เมนู → icon ใหญ่เดียว
   var m=DB.menus.find(function(x){return x.id===o.items[0].menuId;});
   var col=m?m.color:o.items[0].color||'#5C3317';
   var ico=m?m.icon:o.items[0].icon||'?';
   return '<div style="width:46px;height:46px;border-radius:var(--r3);background:'+col+';display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 3px 10px rgba(0,0,0,.2)">'
    +'<span style="font-size:18px;font-weight:900;color:rgba(255,255,255,.95)">'+ico+'</span>'
    +'</div>';
  }
  // 2-3 เมนู → stack circles
  var overlap=icons.length===2?'-8px':'-10px';
  return '<div style="width:46px;height:46px;flex-shrink:0;position:relative;display:flex;align-items:center;justify-content:center">'
   +'<div style="display:flex;align-items:center">'
   +icons.map(function(ic,idx){return '<div style="margin-left:'+(idx===0?'0':overlap)+';z-index:'+(10-idx)+'">'+ic+'</div>';}).join('')
   +'</div>'
   +'</div>';
 })()
 +'<div style="flex:1">'
 +'<div style="font-size:9px;font-weight:500;color:var(--t4);font-family:var(--fh);letter-spacing:.3px;margin-bottom:2px">'+o.id+'</div>'
 +'<div style="font-size:12px;font-weight:700;color:var(--t1);font-family:var(--fh);display:flex;align-items:center;gap:6px">'
 +o.items.length+'เมนู · '+totalItems+'แก้ว '+statusBadge
 +'</div>'
 +'<div style="font-size:10px;color:var(--t4);margin-top:1px">'+timeStr+discHeader+(currentOperator?' · '+currentOperator.id+' '+currentOperator.name:'')+'</div>'
 +'</div>'
 +'<div style="text-align:right">'
 +'<div style="font-size:15px;font-weight:800;color:'+totalColor+';font-family:var(--fh);'+tdecor+'">'+totalText+'</div>'
 +profitLine
 +'</div>'
 +'<span style="font-size:14px;color:var(--t4);margin-left:4px" id="arr-'+o.id+'">›</span>'
 +'</div>'
 +detailSection
 +'</div>';
 }).join('');
}
function toggleBillDetail(id){
 var el=document.getElementById(id);
 if(!el) return;
 var open=el.style.display!=='none';
 el.style.display=open?'none':'block';
 var orderId=id.replace('bill-detail-','');
 var arr=document.getElementById('arr-'+orderId);
 if(arr) arr.textContent=open?'›':'';
}

/* 
 GOOGLE SHEET SYNC
 */
// ชี้ไปที่ Cloudflare Worker แทน GAS โดยตรง (APP_SECRET ถูกซ่อนอยู่ใน Worker)
// ⚠️ เปลี่ยน URL นี้หลัง deploy Worker เสร็จ: https://pos-app-proxy.<your-subdomain>.workers.dev
const SCRIPT_URL='https://pos-app-proxy.laboon-pos-app.workers.dev';
// APP_SECRET ถูกย้ายไปเก็บใน Cloudflare Worker Environment Variables แล้ว ✅
const LS_KEY='pos_db_v5';const LS_DIRTY='pos_dirty_v5';const LS_LASTSYNC='pos_lastsync_v5';
const LS_ORDER='pos_order_v5'; // pending order items
const LS_RECEIPT_SETTINGS='pos_receipt_cfg_v1'; // auto-save / auto-print settings
const LS_APP_CFG='pos_app_cfg_v1'; // theme + locale

// ── THEME PRESETS ───────────────────────────────────────────────────────────
const THEMES = {
 'warm': {
  label:'🤎 Warm Brown', // ค่าเริ่มต้น
  '--bg':'#EDE8E3','--bg-dk':'#D8D0C8','--bg-lt':'#F8F4F0',
  '--cara':'#C8826A','--cara-dk':'#A56248','--cara-lt':'rgba(200,130,106,.16)','--cara-glow':'rgba(200,130,106,.45)',
  '--esp':'#2A1810','--esp2':'#3D2418',
  '--t1':'#1A0F08','--t2':'#4A2E1A','--t3':'#7B5A40','--t4':'#B09A85','--t5':'#D4C4B4',
  '--neu-out':'8px 8px 20px rgba(165,148,132,.72),-5px -5px 14px rgba(255,255,255,.95)',
  '--neu-out-sm':'4px 4px 12px rgba(165,148,132,.65),-3px -3px 8px rgba(255,255,255,.92)',
  '--neu-out-xs':'2px 2px 7px rgba(165,148,132,.55),-2px -2px 5px rgba(255,255,255,.88)',
  '--neu-in':'inset 5px 5px 12px rgba(155,138,122,.5),inset -3px -3px 8px rgba(255,255,255,.88)',
  '--neu-in-sm':'inset 3px 3px 8px rgba(155,138,122,.45),inset -2px -2px 5px rgba(255,255,255,.84)',
  '--neu-in-xs':'inset 2px 2px 5px rgba(155,138,122,.4),inset -1px -1px 4px rgba(255,255,255,.8)',
 },
 'forest': {
  label:'🌿 Forest Green',
  '--bg':'#E4EBE4','--bg-dk':'#C8D6C8','--bg-lt':'#F2F7F2',
  '--cara':'#3D8B5C','--cara-dk':'#2A6B42','--cara-lt':'rgba(61,139,92,.16)','--cara-glow':'rgba(61,139,92,.45)',
  '--esp':'#0F2418','--esp2':'#1A3825',
  '--t1':'#0A1F0F','--t2':'#1F4D2A','--t3':'#4A7A55','--t4':'#8AAE95','--t5':'#C0D8C8',
  '--neu-out':'8px 8px 20px rgba(140,165,140,.72),-5px -5px 14px rgba(255,255,255,.95)',
  '--neu-out-sm':'4px 4px 12px rgba(140,165,140,.65),-3px -3px 8px rgba(255,255,255,.92)',
  '--neu-out-xs':'2px 2px 7px rgba(140,165,140,.55),-2px -2px 5px rgba(255,255,255,.88)',
  '--neu-in':'inset 5px 5px 12px rgba(120,148,120,.5),inset -3px -3px 8px rgba(255,255,255,.88)',
  '--neu-in-sm':'inset 3px 3px 8px rgba(120,148,120,.45),inset -2px -2px 5px rgba(255,255,255,.84)',
  '--neu-in-xs':'inset 2px 2px 5px rgba(120,148,120,.4),inset -1px -1px 4px rgba(255,255,255,.8)',
 },
 'ocean': {
  label:'🌊 Ocean Blue',
  '--bg':'#E2E9F0','--bg-dk':'#C5D3DF','--bg-lt':'#F0F5FA',
  '--cara':'#2B6CB0','--cara-dk':'#1A4F8A','--cara-lt':'rgba(43,108,176,.16)','--cara-glow':'rgba(43,108,176,.45)',
  '--esp':'#0A1628','--esp2':'#142035',
  '--t1':'#08142A','--t2':'#1A3A5C','--t3':'#3A6080','--t4':'#7A9DB8','--t5':'#B8CDD8',
  '--neu-out':'8px 8px 20px rgba(130,155,180,.72),-5px -5px 14px rgba(255,255,255,.95)',
  '--neu-out-sm':'4px 4px 12px rgba(130,155,180,.65),-3px -3px 8px rgba(255,255,255,.92)',
  '--neu-out-xs':'2px 2px 7px rgba(130,155,180,.55),-2px -2px 5px rgba(255,255,255,.88)',
  '--neu-in':'inset 5px 5px 12px rgba(110,138,165,.5),inset -3px -3px 8px rgba(255,255,255,.88)',
  '--neu-in-sm':'inset 3px 3px 8px rgba(110,138,165,.45),inset -2px -2px 5px rgba(255,255,255,.84)',
  '--neu-in-xs':'inset 2px 2px 5px rgba(110,138,165,.4),inset -1px -1px 4px rgba(255,255,255,.8)',
 },
 'rose': {
  label:'🌸 Rose Pink',
  '--bg':'#EFE5E8','--bg-dk':'#DDD0D3','--bg-lt':'#FAF4F6',
  '--cara':'#C4607A','--cara-dk':'#A04060','--cara-lt':'rgba(196,96,122,.16)','--cara-glow':'rgba(196,96,122,.45)',
  '--esp':'#2A0F15','--esp2':'#3D1820',
  '--t1':'#1F080D','--t2':'#4D1E2A','--t3':'#80455A','--t4':'#B88898','--t5':'#D8B8C5',
  '--neu-out':'8px 8px 20px rgba(175,145,155,.72),-5px -5px 14px rgba(255,255,255,.95)',
  '--neu-out-sm':'4px 4px 12px rgba(175,145,155,.65),-3px -3px 8px rgba(255,255,255,.92)',
  '--neu-out-xs':'2px 2px 7px rgba(175,145,155,.55),-2px -2px 5px rgba(255,255,255,.88)',
  '--neu-in':'inset 5px 5px 12px rgba(158,128,138,.5),inset -3px -3px 8px rgba(255,255,255,.88)',
  '--neu-in-sm':'inset 3px 3px 8px rgba(158,128,138,.45),inset -2px -2px 5px rgba(255,255,255,.84)',
  '--neu-in-xs':'inset 2px 2px 5px rgba(158,128,138,.4),inset -1px -1px 4px rgba(255,255,255,.8)',
 },
 'dark': {
  label:'🖤 Dark Mode',
  '--bg':'#1E1E1E','--bg-dk':'#141414','--bg-lt':'#2A2A2A',
  '--cara':'#D4A843','--cara-dk':'#B8860B','--cara-lt':'rgba(212,168,67,.16)','--cara-glow':'rgba(212,168,67,.45)',
  '--esp':'#0A0A0A','--esp2':'#121212',
  '--t1':'#F0EDE8','--t2':'#C8C0B8','--t3':'#A09088','--t4':'#706858','--t5':'#504840',
  '--neu-out':'8px 8px 20px rgba(10,10,10,.8),-5px -5px 14px rgba(50,50,50,.6)',
  '--neu-out-sm':'4px 4px 12px rgba(10,10,10,.7),-3px -3px 8px rgba(50,50,50,.5)',
  '--neu-out-xs':'2px 2px 7px rgba(10,10,10,.6),-2px -2px 5px rgba(50,50,50,.4)',
  '--neu-in':'inset 5px 5px 12px rgba(5,5,5,.7),inset -3px -3px 8px rgba(45,45,45,.5)',
  '--neu-in-sm':'inset 3px 3px 8px rgba(5,5,5,.6),inset -2px -2px 5px rgba(45,45,45,.4)',
  '--neu-in-xs':'inset 2px 2px 5px rgba(5,5,5,.5),inset -1px -1px 4px rgba(45,45,45,.35)',
 },
};

function getAppCfg(){ try{ const r=localStorage.getItem(LS_APP_CFG); return r?JSON.parse(r):{theme:'warm',locale:'th-TH',dateFormat:'short'}; }catch(e){ return {theme:'warm',locale:'th-TH',dateFormat:'short'}; } }
function setAppCfg(cfg){ localStorage.setItem(LS_APP_CFG,JSON.stringify(cfg)); }

function applyTheme(themeKey){
 const t = THEMES[themeKey] || THEMES['warm'];
 const root = document.documentElement;
 Object.entries(t).forEach(([k,v])=>{ if(k!=='label') root.style.setProperty(k,v); });
}
function applyLocale(locale, dateFormat){
 // เก็บ locale ไว้ใน window สำหรับ toLocaleString
 window._locale = locale || 'th-TH';
 window._dateFormat = dateFormat || 'short';
}
// ── override toLocaleDate helper ────────────────────────────────────────────
function fmtDate(d){
 const date = d instanceof Date ? d : new Date(d||Date.now());
 const fmt = window._dateFormat || 'short';
 const loc = window._locale || 'th-TH';
 if(fmt==='short') return date.toLocaleString(loc,{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
 if(fmt==='numeric') return date.toLocaleString(loc,{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'});
 return date.toLocaleString(loc,{year:'numeric',month:'long',day:'numeric',weekday:'short',hour:'2-digit',minute:'2-digit'});
}
function initAppCfg(){
 // merge: localStorage (user's local choice) + DB.appConfig (synced from Sheets)
 const local = getAppCfg();
 const dbCfg = (typeof DB !== 'undefined' && DB.appConfig) || {};
 const cfg = Object.assign({theme:'warm',locale:'th-TH',dateFormat:'short'}, dbCfg, local);
 setAppCfg(cfg); // เขียนกลับเพื่อ sync local
 applyTheme(cfg.theme);
 applyLocale(cfg.locale, cfg.dateFormat);
}

// ── Receipt Settings helpers ──────────────────────────────────────────────
// ════════════════════════════════════════════════
// APP SETTINGS PAGE
// ════════════════════════════════════════════════
// ── helper: render toggle row ──────────────────────────────────────────────
function _togRow(id, icon, iconColor, label, desc, checked, onchange){
 return `<div style="background:var(--bg-lt);border-radius:var(--r3);padding:14px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px">
  <div style="flex:1;min-width:0">
   <div style="font-size:13px;font-weight:700;color:var(--t1);display:flex;align-items:center;gap:6px">
    <span class="mi" style="font-size:16px;color:${iconColor}">${icon}</span>${label}
   </div>
   <div style="font-size:11px;color:var(--t4);margin-top:3px;line-height:1.5">${desc}</div>
  </div>
  <label style="position:relative;width:48px;height:28px;flex-shrink:0;cursor:pointer">
   <input type="checkbox" id="as-${id}" ${checked?'checked':''} style="opacity:0;width:0;height:0;position:absolute" onchange="${onchange}">
   <span id="as-${id}-track" style="position:absolute;inset:0;border-radius:14px;background:${checked?'var(--gold)':'var(--bg-dk)'};transition:.2s">
    <span id="as-${id}-thumb" style="position:absolute;top:4px;left:${checked?'24px':'4px'};width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.3);transition:.2s"></span>
   </span>
  </label>
 </div>`;
}
// ── helper: render section label ───────────────────────────────────────────
function _secLabel(icon, iconColor, label){
 return `<div style="display:flex;align-items:center;gap:8px;margin:20px 0 10px">
  <span class="mi" style="font-size:18px;color:${iconColor}">${icon}</span>
  <span style="font-size:11px;font-weight:700;color:var(--t4);letter-spacing:.8px;text-transform:uppercase">${label}</span>
 </div>`;
}
// ── helper: render editable field ──────────────────────────────────────────
function _editField(id, label, value, placeholder, hint){
 return `<div style="background:var(--bg-lt);border-radius:var(--r3);padding:12px 16px;margin-bottom:10px">
  <div style="font-size:11px;color:var(--t4);margin-bottom:6px;font-weight:600">${label}</div>
  <input id="as-${id}" type="text" value="${value||''}" placeholder="${placeholder}"
   style="width:100%;border:none;background:transparent;font-size:14px;font-weight:700;color:var(--t1);font-family:var(--fh);outline:none;padding:0"
   oninput="appFieldEdit('${id}',this.value)">
  ${hint?`<div style="font-size:10px;color:var(--t5);margin-top:4px">${hint}</div>`:''}
 </div>`;
}
// ── helper: render select field ─────────────────────────────────────────────
function _selectField(id, label, options, value, onchange){
 const opts = options.map(o=>`<option value="${o.v}" ${value===o.v?'selected':''}>${o.l}</option>`).join('');
 return `<div style="background:var(--bg-lt);border-radius:var(--r3);padding:12px 16px;display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
  <span style="font-size:13px;font-weight:600;color:var(--t1)">${label}</span>
  <select id="as-${id}" style="border:none;background:var(--bg-dk);color:var(--t1);font-size:12px;font-weight:700;font-family:var(--fh);border-radius:var(--r2);padding:6px 10px;cursor:pointer;outline:none" onchange="${onchange}">
   ${opts}
  </select>
 </div>`;
}

function renderAppSettings(){
 const cfg    = getReceiptSettings();
 const appCfg = getAppCfg();
 const body   = document.getElementById('appSettingsBody');
 if(!body) return;

 // ── อ่านค่า optionSets defaults ──
 const os = DB.optionSets || {};
 const sizeDefault     = (os.sizes   ?.default) || '';
 const iceDefault      = (os.ice     ?.default) || '';
 const sweetDefault    = (os.sweet   ?.default) || '';
 const strengthDefault = (os.strength?.default) || '';
 const sizeItems     = (os.sizes   ?.items||[]).map(i=>({v:typeof i==='string'?i:i.label, l:typeof i==='string'?i:i.label}));
 const iceItems      = (os.ice     ?.items||[]).map(i=>({v:i.label||i, l:i.label||i}));
 const sweetItems    = (os.sweet   ?.items||[]).map(i=>({v:i.label||i, l:i.label||i}));
 const strengthItems = (os.strength?.items||[]).map(i=>({v:i.label||i, l:i.label||i}));

 body.innerHTML = `
  ${_secLabel('store','var(--cara)','ข้อมูลร้าน')}
  ${_editField('shopName','ชื่อร้าน',DB.shopName,'ชื่อร้านของคุณ','แสดงบนใบเสร็จ และหน้าแอพ')}
  ${_editField('shopSub','ชื่อรอง / Tagline',DB.shopSub,'เช่น ร้านชา-กาแฟ','แสดงใต้ชื่อร้านบนใบเสร็จ')}
  ${_editField('posId','POS ID',DB.posId,'เช่น POS-01','ใช้ระบุเครื่อง POS ในรายงาน')}
  ${_editField('otpEmail','Email สำหรับ OTP Recovery',DB.otpEmail||'','อีเมล Manager','ใช้รับรหัส OTP เมื่อลืม PIN')}
  <button onclick="appSaveShopInfo()"
   style="width:100%;padding:12px;border-radius:var(--r3);border:none;background:var(--cara);color:#fff;font-size:13px;font-weight:700;font-family:var(--fh);cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;margin-bottom:4px">
   <span class="mi" style="font-size:16px">save</span>บันทึกข้อมูลร้าน
  </button>
  <div style="font-size:10px;color:var(--t5);text-align:center;margin-bottom:4px">บันทึกแล้วจะ sync ขึ้น Google Sheets อัตโนมัติ</div>

  ${_secLabel('tune','var(--gold)','ค่าเริ่มต้นออเดอร์')}
  <div style="font-size:11px;color:var(--t4);margin-bottom:10px;line-height:1.6">ค่าที่ถูกเลือกอัตโนมัติเมื่อเปิด popup สั่งเมนู</div>
  ${sizeItems.length     ? _selectField('defSize',    '📦 ขนาด',    sizeItems,     sizeDefault,     "appDefaultChange('sizes','size',this.value)")    : '<div style="font-size:11px;color:var(--t5);margin-bottom:10px;padding:10px 16px;background:var(--bg-lt);border-radius:var(--r3)">⚠️ ยังไม่มีข้อมูลขนาด — ตั้งค่าใน "ตัวเลือกเมนู" ก่อน</div>'}
  ${iceItems.length      ? _selectField('defIce',     '🧊 น้ำแข็ง',  iceItems,      iceDefault,      "appDefaultChange('ice','ice',this.value)")       : ''}
  ${sweetItems.length    ? _selectField('defSweet',   '🍬 ความหวาน', sweetItems,    sweetDefault,    "appDefaultChange('sweet','sweet',this.value)")   : ''}
  ${strengthItems.length ? _selectField('defStrength','☕ ความเข้ม', strengthItems, strengthDefault, "appDefaultChange('strength','strength',this.value)") : ''}

  ${_secLabel('receipt_long','var(--blue)','ใบเสร็จ')}
  ${_togRow('autoSave','photo_library','var(--blue)','บันทึกรูปอัตโนมัติ',
    'หลังยืนยันออเดอร์ระบบเตรียมรูปรอ<br>กดปุ่มสีทองเพื่อบันทึกลง Gallery',
    cfg.autoSave, "appSettingToggle('autoSave',this.checked)")}
  ${_togRow('autoPrint','print','var(--esp)','ปริ้นอัตโนมัติ',
    'ส่งคำสั่งปริ้นทันทีหลังยืนยัน<br>ต้องเชื่อมต่อเครื่องปริ้นก่อน',
    cfg.autoPrint, "appSettingToggle('autoPrint',this.checked)")}

  ${_secLabel('palette','var(--purple)','สี Theme แอพ')}
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
   ${Object.entries(THEMES).map(([key,t])=>`
    <button onclick="appChangeTheme('${key}')"
     style="padding:12px 14px;border-radius:var(--r3);border:2px solid ${appCfg.theme===key?'var(--cara)':'transparent'};
            background:${t['--bg-lt']||'#f8f4f0'};cursor:pointer;text-align:left;transition:.15s;
            box-shadow:${appCfg.theme===key?'0 0 0 3px var(--cara-lt)':'none'}">
     <div style="font-size:13px;font-weight:700;color:${t['--t1']||'#1a0f08'};font-family:var(--fh)">${t.label}</div>
     <div style="display:flex;gap:4px;margin-top:6px">
      <div style="width:16px;height:16px;border-radius:50%;background:${t['--bg']||'#ede8e3'}"></div>
      <div style="width:16px;height:16px;border-radius:50%;background:${t['--cara']||'#c8826a'}"></div>
      <div style="width:16px;height:16px;border-radius:50%;background:${t['--esp']||'#2a1810'}"></div>
      <div style="width:16px;height:16px;border-radius:50%;background:${t['--t3']||'#7b5a40'}"></div>
     </div>
    </button>
   `).join('')}
  </div>

  ${_secLabel('language','var(--blue)','ภาษา / รูปแบบวันที่')}
  ${_selectField('locale','🌐 ภาษา',
    [{v:'th-TH',l:'🇹🇭 ภาษาไทย'},{v:'en-US',l:'🇺🇸 English'}],
    appCfg.locale||'th-TH',
    "appChangeCfg('locale',this.value)")}
  ${_selectField('dateFormat','📅 รูปแบบวันที่',
    [{v:'short',l:'19 มี.ค. 2569 22:00'},{v:'numeric',l:'19/03/2569 22:00'},{v:'long',l:'พฤหัส 19 มีนาคม 2569'}],
    appCfg.dateFormat||'short',
    "appChangeCfg('dateFormat',this.value)")}

  ${_secLabel('info','var(--t3)','ข้อมูลแอพ')}
  <div style="background:var(--bg-lt);border-radius:var(--r3);padding:14px 16px;font-size:12px;color:var(--t3);line-height:2.2">
   <div style="display:flex;justify-content:space-between"><span>เวอร์ชัน</span><span style="font-weight:700;color:var(--t1)">v5.0</span></div>
   <div style="display:flex;justify-content:space-between"><span>ชื่อร้าน</span><span style="font-weight:700;color:var(--t1)" id="as-info-shopName">${DB.shopName||'—'}</span></div>
   <div style="display:flex;justify-content:space-between"><span>POS ID</span><span style="font-weight:700;color:var(--t1)" id="as-info-posId">${DB.posId||'POS-01'}</span></div>
   <div style="display:flex;justify-content:space-between"><span>URL</span><span style="font-size:10px;color:var(--t4);word-break:break-all;max-width:60%;text-align:right">${location.hostname}</span></div>
  </div>
  <div style="height:40px"></div>
 `;
}

// ── live update ขณะพิมพ์ ────────────────────────────────────────────────────
let _shopSaveTimer = null;
function appFieldEdit(id, val){
 // อัปเดต info row live
 if(id==='shopName' && document.getElementById('as-info-shopName'))
  document.getElementById('as-info-shopName').textContent = val||'—';
 if(id==='posId' && document.getElementById('as-info-posId'))
  document.getElementById('as-info-posId').textContent = val||'POS-01';
}

// ── บันทึกข้อมูลร้าน ────────────────────────────────────────────────────────
function appSaveShopInfo(){
 const name  = (document.getElementById('as-shopName')?.value||'').trim();
 const sub   = (document.getElementById('as-shopSub')?.value||'').trim();
 const pos   = (document.getElementById('as-posId')?.value||'').trim();
 const email = (document.getElementById('as-otpEmail')?.value||'').trim();
 if(!name){ toast('กรุณากรอกชื่อร้าน'); return; }
 if(email && !/^[^@]+@[^@]+\.[^@]+$/.test(email)){ toast('รูปแบบ Email ไม่ถูกต้อง'); return; }
 DB.shopName = name;
 DB.shopSub  = sub || name;
 DB.posId    = pos || 'POS-01';
 DB.otpEmail = email;
 saveLocal(); scheduleSync();
 toast('✅ บันทึกข้อมูลร้านแล้ว — กำลัง sync...');
 // อัปเดต info row
 if(document.getElementById('as-info-shopName')) document.getElementById('as-info-shopName').textContent = name;
 if(document.getElementById('as-info-posId'))    document.getElementById('as-info-posId').textContent = DB.posId;
}

// ── เปลี่ยน default option ────────────────────────────────────────────────────
function appDefaultChange(setKey, id, val){
 if(!DB.optionSets) DB.optionSets = {};
 if(!DB.optionSets[setKey]) DB.optionSets[setKey] = {};
 DB.optionSets[setKey].default = val;
 saveLocal(); scheduleSync();
 toast('✅ ตั้งค่า Default '+id+' → '+val);
}

// ── เปลี่ยน Theme ──────────────────────────────────────────────────────────
function appChangeTheme(themeKey){
 if(!THEMES[themeKey]) return;
 const cfg = getAppCfg();
 cfg.theme = themeKey;
 setAppCfg(cfg);
 applyTheme(themeKey);
 // sync ขึ้น DB config → Sheets
 if(!DB.appConfig) DB.appConfig = {};
 DB.appConfig.theme = themeKey;
 saveLocal(); scheduleSync();
 toast('✅ เปลี่ยน Theme → '+THEMES[themeKey].label);
 // re-render หน้าตั้งค่าเพื่ออัปเดต selected state
 renderAppSettings();
}

// ── เปลี่ยน Locale / DateFormat ─────────────────────────────────────────────
function appChangeCfg(key, val){
 const cfg = getAppCfg();
 cfg[key] = val;
 setAppCfg(cfg);
 applyLocale(cfg.locale, cfg.dateFormat);
 // sync ขึ้น DB config → Sheets
 if(!DB.appConfig) DB.appConfig = {};
 DB.appConfig[key] = val;
 saveLocal(); scheduleSync();
 const labels = {locale:'ภาษา', dateFormat:'รูปแบบวันที่'};
 toast('✅ เปลี่ยน '+( labels[key]||key)+' → '+val);
}

function appSettingToggle(key, val){
 const cfg = getReceiptSettings();
 cfg[key] = val;
 setReceiptSettings(cfg);
 // อัปเดต toggle UI
 const track = document.getElementById('as-tog-'+key+'-track');
 const thumb  = document.getElementById('as-tog-'+key+'-thumb');
 if(track) track.style.background = val ? 'var(--gold)' : 'var(--bg-dk)';
 if(thumb) thumb.style.left = val ? '24px' : '4px';
 toast(key==='autoSave'
  ? (val ? '✅ บันทึกรูปอัตโนมัติ เปิดแล้ว' : 'บันทึกรูปอัตโนมัติ ปิดแล้ว')
  : (val ? '✅ ปริ้นอัตโนมัติ เปิดแล้ว' : 'ปริ้นอัตโนมัติ ปิดแล้ว'));
}

function getReceiptSettings(){
 try{
  const raw=localStorage.getItem(LS_RECEIPT_SETTINGS);
  return raw ? JSON.parse(raw) : {autoSave:false, autoPrint:false};
 }catch(e){ return {autoSave:false, autoPrint:false}; }
}
function setReceiptSettings(cfg){
 localStorage.setItem(LS_RECEIPT_SETTINGS, JSON.stringify(cfg));
}

function saveOrderItems(){
 try{
  if(orderItems.length>0){
   localStorage.setItem(LS_ORDER,JSON.stringify(orderItems));
  } else {
   localStorage.removeItem(LS_ORDER);
  }
 }catch(e){}
}
function loadOrderItems(){
 try{
  const raw=localStorage.getItem(LS_ORDER);
  if(!raw)return;
  const saved=JSON.parse(raw);
  if(Array.isArray(saved)&&saved.length>0){
   orderItems=saved;
   updateCartFab();
   toast('มีรายการออเดอร์ค้างอยู่ '+orderItems.reduce((s,i)=>s+i.qty,0)+' รายการ');
  }
 }catch(e){localStorage.removeItem(LS_ORDER);}
}
let isOnline=navigator.onLine;
window.addEventListener('online',()=>{isOnline=true;updateSyncUI();syncToSheet();});
window.addEventListener('offline',()=>{isOnline=false;updateSyncUI();});
function updateSyncUI(){
 const txt=isOnline?'ออนไลน์':'ออฟไลน์';
 const col=isOnline?'var(--green)':'var(--gold)';
 ['syncStatus','drawerSync'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=txt;});
 document.getElementById('drawerSync').style.color=col;
}
function saveLocal(){try{localStorage.setItem(LS_KEY,JSON.stringify(DB));localStorage.setItem(LS_DIRTY,'true');}catch(e){}}
function loadLocal(){
 try{const raw=localStorage.getItem(LS_KEY);if(!raw)return false;const saved=JSON.parse(raw);Object.keys(saved).forEach(k=>{
   if(!(k in DB))return;
   const v=saved[k];
   if(Array.isArray(DB[k])&&!Array.isArray(v))return;
   if(k==='nextId'&&typeof v!=='number')return;
   // deep merge objects (optionSets, customOptions)
   if(k==='optionSets'&&v&&typeof v==='object'&&!Array.isArray(v)){
    DB[k]=DB[k]||{};
    Object.keys(v).forEach(sk=>{ DB[k][sk]=v[sk]; });
    return;
   }
   DB[k]=v;
  });return true;}
 catch(e){localStorage.removeItem(LS_KEY);localStorage.removeItem(LS_DIRTY);return false;}
}
async function apiFetch(body){if(!isOnline)return null;try{const res=await fetch(SCRIPT_URL,{method:'POST',mode:'cors',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!res.ok)throw new Error('HTTP '+res.status);return await res.json();}catch(e){console.error('[apiFetch] error:',e.message,body?.action);return null;}}
async function apiGet(params={}){if(!isOnline)return null;try{const q=new URLSearchParams(params).toString();const res=await fetch(`${SCRIPT_URL}?${q}`,{mode:'cors'});if(!res.ok)throw new Error('HTTP '+res.status);return await res.json();}catch(e){console.error('[apiGet] error:',e.message,params?.action);return null;}}
async function syncToSheet(){
 const dirty=localStorage.getItem(LS_DIRTY);if(!dirty||!isOnline)return;
 showSyncStatus('กำลัง sync...');
 const result=await apiFetch({action:'syncAll',db:DB});
 if(result&&result.ok){
  localStorage.setItem(LS_DIRTY,'');
  localStorage.setItem(LS_LASTSYNC,new Date().toISOString());
  showSyncStatus('\u2714 '+new Date().toLocaleTimeString('th-TH'));
  // อัปเดต id จริงจาก GAS: reload orders หลัง sync
  const fresh=await apiGet({action:'getAll'});
  if(fresh&&Array.isArray(fresh.orders)&&fresh.orders.length){
    DB.orders=fresh.orders;
    saveLocal();
    if(typeof updateSalesBadge==='function') updateSalesBadge();
    if(typeof renderBillManagement==='function') renderBillManagement(typeof billFilter!=='undefined'?billFilter:'today');
  }
} else showSyncStatus('Sync failed');
}
async function loadFromSheet(){
 showSyncStatus('กำลังโหลด...');
 let result = null;
 try {
   result = await apiGet({action:'getAll'});
 } catch(e) {
   console.error('[loadFromSheet] fetch exception:', e);
 }
 console.log('[loadFromSheet] result:', result);

 // ─── ตรวจสอบ error detail ───────────────────────────────
 if(!result){
   showSyncStatus('ไม่มี response (network?)');
   console.error('[loadFromSheet] result is null — Worker URL หรือ network ผิดพลาด');
   toast('โหลดไม่ได้ — เปิด DevTools > Console ดู error');
   return false;
 }
 if(result.error){
   showSyncStatus('Error: '+result.error);
   console.error('[loadFromSheet] GAS error:', result.error);
   if(result.error==='Unauthorized') toast('Token ผิด — ตรวจ Worker secret');
   else toast('GAS error: '+result.error);
   return false;
 }

 // ─── โหลดสำเร็จ ─────────────────────────────────────────
  Object.keys(result).forEach(k=>{
  if(!(k in DB)) return;
  // ไม่ overwrite ด้วย null/undefined จาก GAS
  if(result[k] === null || result[k] === undefined) return;
  DB[k]=result[k];
 });
 if(!DB.customOptions) DB.customOptions=[];
 recalcNextId(); // ✅ sync nextId ให้ใหญ่กว่า ID สูงสุดใน Sheet
 saveLocal();localStorage.setItem(LS_DIRTY,'');
 showSyncStatus('✓ '+new Date().toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'}));
 console.log('[loadFromSheet] ✅ ing:',DB.ingredients.length,'pkg:',DB.packages.length,'emp:',DB.employees.length,'nextId:',DB.nextId);
 renderOrder();
 if(currentPage==='stores') renderStores(storeTab);
 else if(currentPage==='manage') renderManage(mgCat);
 else if(currentPage==='report') renderReport();
 else if(currentPage==='sales') renderSalesToday();
 return true;
}

/* recalcNextId — ensure nextId > max existing ID across all collections */
function recalcNextId(){
 let maxId=DB.nextId||1;
 ['menus','orders','promos','recipes','ingredients','packages','equipment',
  'staffLogs','useLogs','blends','blendBatches','employees','auditLog',
  'pendingVoids','customOptions','purchaseOrders'].forEach(col=>{
  if(!Array.isArray(DB[col]))return;
  DB[col].forEach(item=>{ if(item&&typeof item.id==='number'&&item.id>=maxId) maxId=item.id+1; });
 });
 DB.nextId=maxId;
}

/* โหลดข้อมูลพนักงานจาก Google Sheet แยกต่างหาก */
async function loadEmployeesFromSheet(){
 if(!isOnline) return false;
 showSyncStatus('โหลดข้อมูลพนักงาน...');
 const result = await apiGet({action:'getEmployees'});
 if(result && Array.isArray(result.employees) && result.employees.length>0){
 DB.employees = result.employees;
 saveLocal();
 showSyncStatus(`พนักงาน ${result.employees.length} คน`);
 return true;
 }
 // fallback: ใช้ข้อมูล mock ที่มีอยู่
 showSyncStatus('ใช้ข้อมูลพนักงาน (local)');
 return false;
}
function showSyncStatus(msg){
 const el=document.getElementById('syncStatus');if(el)el.textContent=msg;
 const el2=document.getElementById('drawerSync');if(el2)el2.textContent=msg;
}
let syncTimer=null;
function scheduleSync(){saveLocal();clearTimeout(syncTimer);syncTimer=setTimeout(syncToSheet,3000);}

/* 
 STARTUP
 */
/* 
 LOGIN SYSTEM
 */
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