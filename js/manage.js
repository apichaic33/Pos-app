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