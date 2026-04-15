---
title: "TD-003: localStorage เป็น Offline Store หลัก"
type: decision
tags: [offline, pwa, localstorage, sync]
updated: 2026-04-15
status: active
---

# TD-003: localStorage เป็น Offline Store หลัก

## การตัดสินใจ
serialize `DB` object ทั้งหมดลง `localStorage` ทุกครั้งที่มีการเปลี่ยนแปลง

```js
// saveLocal() — เรียกหลังทุก write operation
localStorage.setItem('pos_db_v5', JSON.stringify(DB));
localStorage.setItem('pos_dirty_v5', 'true'); // flag รอ sync
```

## เหตุผล
- ใช้งานได้ทันทีไม่ต้องตั้งค่า — ไม่ต้องการ IndexedDB หรือ Service Worker cache
- PWA ร้านกาแฟใช้ data ไม่ใหญ่ (เมนู/พนักงาน/ออเดอร์ไม่เกิน 1,000 รายการ)
- Sync Pattern ง่าย: dirty flag → sync เมื่อ online → clear flag

## ข้อจำกัด
- localStorage จำกัด ~5-10MB — ถ้า `DB.orders` โตมากอาจเต็ม
- Serialize/deserialize ทั้ง DB ทุกครั้ง — อาจช้าถ้า DB ใหญ่
- ไม่รองรับ concurrent writes (single-device เท่านั้น)

## Data Keys
| Key | ข้อมูล |
|-----|--------|
| `pos_db_v5` | DB object ทั้งหมด |
| `pos_dirty_v5` | flag มีข้อมูลรอ sync |
| `pos_lastsync_v5` | timestamp sync ล่าสุด |
| `pos_order_v5` | pending order (กันหาย) |
| `pos_receipt_cfg_v1` | receipt settings |
| `pos_app_cfg_v1` | theme + locale |
