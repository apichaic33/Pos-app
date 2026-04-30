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
    // merge กลับออเดอร์ที่เพิ่งเพิ่มระหว่างรอ response
    const cloudIds=new Set(fresh.orders.map(o=>String(o.id)));
    const newLocal=(DB.orders||[]).filter(o=>!cloudIds.has(String(o.id)));
    DB.orders=[...fresh.orders,...newLocal];
    if(newLocal.length) localStorage.setItem(LS_DIRTY,'true');
    saveLocal();
    if(typeof updateSalesBadge==='function') updateSalesBadge();
    if(typeof renderBillManagement==='function') renderBillManagement(typeof billFilter!=='undefined'?billFilter:'today');
    if(typeof updateKitchenBadge==='function') updateKitchenBadge();
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
 // เก็บออเดอร์ local ที่ยังไม่ได้ sync ก่อน overwrite
 const localOrders = Array.isArray(DB.orders) ? [...DB.orders] : [];

 Object.keys(result).forEach(k=>{
  if(!(k in DB)) return;
  // ไม่ overwrite ด้วย null/undefined จาก GAS
  if(result[k] === null || result[k] === undefined) return;
  DB[k]=result[k];
 });

 // merge กลับออเดอร์ local ที่ cloud ยังไม่มี (ยังไม่ได้ sync)
 const cloudIds = new Set((DB.orders||[]).map(o=>String(o.id)));
 const unsynced = localOrders.filter(o=>!cloudIds.has(String(o.id)));
 if(unsynced.length){
  DB.orders = [...(DB.orders||[]), ...unsynced];
  console.log('[loadFromSheet] merged', unsynced.length, 'unsynced orders back');
 }

 if(!DB.customOptions) DB.customOptions=[];
 recalcNextId(); // ✅ sync nextId ให้ใหญ่กว่า ID สูงสุดใน Sheet
 saveLocal();
 if(unsynced.length){
  // trigger sync อัตโนมัติเพื่อ push ออเดอร์ค้างไปยัง cloud
  clearTimeout(syncTimer);syncTimer=setTimeout(syncToSheet,5000);
 } else {
  localStorage.setItem(LS_DIRTY,'');
 }
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