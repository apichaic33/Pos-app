---
title: "TD-005: html2canvas สำหรับใบเสร็จ"
type: decision
tags: [receipt, print, share, html2canvas]
updated: 2026-04-15
status: active
---

# TD-005: html2canvas สำหรับ Receipt Image

## การตัดสินใจ
ใช้ `html2canvas` (โหลด CDN แบบ lazy) แปลง HTML receipt → PNG canvas → แชร์/บันทึก

```js
// โหลด CDN เฉพาะเมื่อต้องการ (ไม่ block initial load)
const s = document.createElement('script');
s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
document.head.appendChild(s);
```

## เหตุผล
- Web Share API ต้องการ File/Blob — ไม่สามารถ share HTML โดยตรง
- Print API (`window.print`) บน iOS PWA ไม่ reliable
- PNG ใบเสร็จส่งผ่าน LINE/WhatsApp ได้ทันที

## Pre-render Strategy
canvas render เริ่มทันทีหลัง `confirmOrder()` (400ms delay) — ไม่รอ user กด Share:
```js
setTimeout(async () => {
  window._pendingReceiptCanvas = await html2canvas(wrap, {scale:3});
}, 400);
```
เมื่อ user กด Share → canvas พร้อมแล้ว ไม่มี lag

## ข้อจำกัด
- ต้องการ internet ครั้งแรก (โหลด CDN) — หลังจากนั้น SW cache ไว้
- `scale:3` ให้ความละเอียดสูง (3x) — ไฟล์ใหญ่ขึ้นแต่คมชัด
- CSS บางอย่าง html2canvas render ไม่ได้ (เช่น CSS variables) — ต้องใช้ค่าจริง
