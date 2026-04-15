# POS-App — Claude Instructions

## โปรเจกต์
ระบบ POS สำหรับร้านกาแฟ (PWA) — ดูรายละเอียดใน `wiki/`

## ไฟล์สำคัญ
- `index.html` — HTML structure
- `css/app.css` — CSS ทั้งหมด
- `js/order.js` — หน้าออเดอร์ + receipt + recipe slip (**ไฟล์หลัก**)
- `js/app.js` — bundle สำรอง (ไม่ได้โหลดใน index.html)
- `js/inventory.js` — คลัง, blend, PO
- `js/auth.js` — login, manager gate
- `js/init.js` — SW + init
- `sw.js` — Service Worker cache (`APP_VERSION` ต้องเพิ่มทุก deploy)

## กฎสำคัญ
- แอปโหลด `js/order.js` ฯลฯ แยกไฟล์ — **ไม่ได้ใช้ `app.js`**
- แก้ไขโค้ดต้องแก้ทั้ง `order.js` (หรือไฟล์นั้นๆ) **และ** `app.js` ให้ตรงกัน
- ทุก deploy ใหม่ → เพิ่ม `APP_VERSION` ใน `sw.js` เพื่อ bust cache
- Wiki อยู่ใน `wiki/` — อัปเดต `wiki/log.md` และหน้าที่เกี่ยวข้องหลังทุก session

## Wiki
- `wiki/index.md` — catalog หน้าทั้งหมด
- `wiki/log.md` — บันทึกการเปลี่ยนแปลง
- `wiki/pages/features/order.md` — ระบบออเดอร์
- `wiki/pages/features/inventory.md` — คลังวัตถุดิบ
