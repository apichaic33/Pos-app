---
title: "TD-006: SPA แทน Multi-Page App"
type: decision
tags: [architecture, spa, pwa, navigation]
updated: 2026-04-15
status: active
---

# TD-006: SPA (Single Page App) แทน Multi-Page App

## การตัดสินใจ
ทุกหน้าเป็น `<div class="page">` ใน HTML เดียว สลับกันด้วย JS (`_goPageDirect`)

## เหตุผล
- `DB` object แชร์กันทุกหน้า — MPA ต้องส่งผ่าน localStorage ทุก navigation
- `currentOperator` (session) ต้องคงอยู่ข้ามหน้า
- PWA บน iOS — page reload ทำให้ state หาย
- functions อ้างอิงกันข้ามหน้ามาก (~5,900 บรรทัด ไม่มี module boundary)

## ผลกระทบ
- HTML โหลดครั้งเดียว — navigation ไม่มี network request
- Back button ของ browser ไม่ทำงานตามธรรมชาติ (ใช้ drawer navigation แทน)
- ทุก "หน้า" render ด้วย JS — SEO ไม่มีความหมาย (internal tool)

## ทางเลือกที่ปฏิเสธ
- MPA เต็มรูปแบบ — ต้อง refactor ทั้งหมด, session management ซับซ้อน
- Hybrid (บางหน้าแยก) — ซับซ้อนกว่าที่ได้ประโยชน์

→ ดู [TD-002](002-plain-script-modules.md) สำหรับการตัดสินใจ module structure
