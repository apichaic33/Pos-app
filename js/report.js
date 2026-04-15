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