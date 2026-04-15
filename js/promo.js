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