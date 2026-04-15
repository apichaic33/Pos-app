---
title: "TD-002: แยก JS เป็น Plain Script Modules (ไม่ใช้ ES Modules)"
type: decision
tags: [architecture, javascript, modules, refactoring]
updated: 2026-04-15
status: active
---

# TD-002: Plain Script Modules แทน ES Modules

## การตัดสินใจ
แยก `app.js` เป็น 11 ไฟล์ โหลดด้วย `<script src="...">` ธรรมดา ไม่ใช้ `type="module"`

## เหตุผล
HTML มี `onclick="functionName()"` อยู่หลายร้อยจุด — ถ้าใช้ ES Modules ทุก function จะไม่เป็น global scope และ onclick จะพังทั้งหมด การแก้ทุก event handler ใน HTML เสี่ยงและใช้เวลามาก

## ผลกระทบ
- ตัวแปรทุกตัวยังเป็น global (ไม่มี encapsulation)
- ลำดับการโหลด script มีความสำคัญ (`db.js` ก่อน, `init.js` หลังสุด)
- `onclick="..."` ใน HTML ทำงานได้ปกติ ไม่ต้องแตะ HTML เลย

## ข้อจำกัด
- ยังมี global scope pollution — ตัวแปรชื่อซ้ำกันอาจขัดแย้งกัน
- ไม่ได้ประโยชน์ด้าน tree-shaking หรือ lazy loading

## ทางเลือกที่ปฏิเสธ
- ES Modules — ต้องแก้ HTML ทุก onclick handler (high risk)
- Webpack/Vite build — เพิ่ม complexity มาก, ไม่จำเป็นสำหรับขนาดนี้
