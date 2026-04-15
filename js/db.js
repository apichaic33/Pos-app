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