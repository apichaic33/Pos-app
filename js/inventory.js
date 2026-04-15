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
 ['storeItemName','storeItemQty','storeItemUnitQty','storeItemUnit','storeItemCost','storeItemExpiry','storeItemMin','storeItemNote'].forEach(i=>document.getElementById(i).value='');
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
     ${item.unitQty?`<span>· 1 หน่วย = ${item.unitQty}${item.unit}</span>`:''}
     ${item.expiry?`<span>· ${item.expiry}</span>`:''}
     ${badges.join('')}
    </div>
   </div>
   <div class="si-card-qty">
    <div class="si-card-qty-val" style="color:${qtyColor}">${item.qty}<span style="font-size:11px;font-weight:400;color:var(--t4)"> ${item.unit}</span></div>
    <div class="si-card-qty-unit">${item.unitQty&&item.unitQty>0?`${Math.floor(item.qty/item.unitQty)} หน่วย · `:''}min ${item.min||0}</div>
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
 document.getElementById('storeItemUnitQty').value=item.unitQty||'';
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
 unitQty:parseFloat(document.getElementById('storeItemUnitQty').value)||0,
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
