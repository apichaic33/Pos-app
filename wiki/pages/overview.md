---
title: Project Overview
type: overview
tags: [pwa, pos, coffee-shop, architecture]
updated: 2026-04-15
source_files: [../index.html, ../manifest.json, ../sw.js]
---

# POS-App — Project Overview

## คืออะไร
ระบบ Point of Sale (POS) สำหรับร้านกาแฟ พัฒนาเป็น Progressive Web App (PWA) ที่ติดตั้งและใช้งานได้บนมือถือโดยไม่ต้องผ่าน App Store

## เวอร์ชันปัจจุบัน
`v5.1.0`

## เทคโนโลยีหลัก
| Layer | Technology |
|-------|-----------|
| Frontend | HTML + CSS + JavaScript (single-file) |
| Offline support | Service Worker (sw.js) |
| Install | PWA Manifest (manifest.json) |
| Backend/API | Cloudflare Workers (`*.workers.dev`) และ/หรือ Google Apps Script (`script.google.com`) |

## โครงสร้างไฟล์
```
Pos-app/
├── index.html        ← แอปหลักทั้งหมด (~475KB, single-file)
├── manifest.json     ← PWA config (ชื่อ, ไอคอน, theme สีเขียว #6DB89F)
├── sw.js             ← Service Worker v5.1.0
├── icon-192.png      ← App icon
├── icon-512.png      ← App icon
└── wiki/             ← เอกสาร wiki นี้
```

## Caching Strategy (sw.js)
Service Worker แบ่งการจัดการ request เป็น 3 ประเภท:

1. **API requests** (workers.dev, script.google.com) → **Network Only** — ไม่ cache, fallback เป็น `{error: 'offline'}`
2. **HTML (index.html)** → **Network-First** — โหลดใหม่เสมอ, cache เป็น backup สำหรับ offline
3. **Static assets** → **Cache-First** — เร็ว, โหลดจาก cache ก่อน

## วิธีอัปเดตแอป
เปลี่ยน `APP_VERSION` ใน `sw.js` ทุกครั้งที่ deploy — SW จะ detect cache name ใหม่, ลบ cache เก่า, และโหลดใหม่อัตโนมัติ (สำคัญสำหรับ iPhone)

## Theme
- Background: `#000000` (ดำ)
- Theme color: `#6DB89F` (เขียวมิ้นต์)
- Orientation: portrait-primary

## สิ่งที่ยังไม่รู้ (ต้องการ ingest index.html)
- รายการเมนูและฟีเจอร์ทั้งหมด
- โครงสร้าง UI components
- การเชื่อมต่อ API endpoints
- ระบบจัดการออเดอร์, สต็อก, รายงาน
