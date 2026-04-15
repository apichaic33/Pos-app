---
title: "TD-001: ใช้ Cloudflare Worker เป็น Proxy หน้า GAS"
type: decision
tags: [backend, security, cloudflare, api]
updated: 2026-04-15
status: active
---

# TD-001: ใช้ Cloudflare Worker เป็น Proxy หน้า Google Apps Script

## การตัดสินใจ
เรียก API ผ่าน Cloudflare Worker แทนที่จะเรียก GAS URL โดยตรงจาก client

```
PWA → Cloudflare Worker → Google Apps Script → Google Sheets
```

## เหตุผล
- **APP_SECRET ต้องไม่อยู่ใน client-side JS** — ใครก็ดู source code ได้
- Worker เก็บ secret ใน Environment Variables (ไม่ expose)
- Worker ทำ CORS headers ให้ด้วย (GAS มี CORS ปัญหา)

## ผลกระทบ
- ต้อง deploy Worker ก่อนใช้งาน
- URL อยู่ใน `sync.js` บรรทัด 6: `const SCRIPT_URL = '...'`
- ถ้า Worker ล่ม → แอปยังใช้งานได้จาก localStorage (offline mode)

## ทางเลือกที่ปฏิเสธ
- เรียก GAS โดยตรง — expose secret ใน source
- Backend server เต็มรูปแบบ — ซับซ้อนเกินความจำเป็น
