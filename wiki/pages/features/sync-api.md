---
title: Sync & API
type: feature
tags: [sync, cloudflare, api, localStorage, offline, themes]
updated: 2026-04-29
source_files: [../../../js/sync.js]
---

# Sync & API

## สถาปัตยกรรม Backend
```
PWA (index.html)
    ↓ POST/GET (CORS)
Cloudflare Worker  ← APP_SECRET เก็บใน Worker env vars
    ↓
Google Apps Script (GAS)
    ↓
Google Sheets (database)
```

**เหตุผลที่ใช้ Cloudflare Worker เป็น proxy:** ซ่อน APP_SECRET ไม่ให้ expose ใน client-side JS

## Constants ที่สำคัญ (`sync.js` บรรทัดต้น)
```
const SCRIPT_URL = 'https://pos-app-proxy.laboon-pos-app.workers.dev';
const LS_KEY     = 'pos_db_v5';        // DB หลัก
const LS_DIRTY   = 'pos_dirty_v5';     // flag ว่ามีข้อมูลรอ sync
const LS_LASTSYNC= 'pos_lastsync_v5';  // timestamp sync ล่าสุด
const LS_ORDER   = 'pos_order_v5';     // pending order items
const LS_RECEIPT_SETTINGS = 'pos_receipt_cfg_v1';
const LS_APP_CFG = 'pos_app_cfg_v1';   // theme + locale
```
⚠️ **ถ้าเปลี่ยน Worker URL** → แก้ `SCRIPT_URL` ใน [sync.js](../../../js/sync.js) บรรทัด 6

## Sync Flow
```
เปิดแอป → loadLocal() → loadFromSheet() → แสดง UI
แก้ข้อมูล → saveLocal() + LS_DIRTY='true'
confirmOrder() → scheduleSync() → syncToSheet() (debounce 3s)
```

### `loadFromSheet()` — ⚠️ merge-safe (อัปเดต 2026-04-29)
- GET `?action=getAll` → ดึงข้อมูลทั้งหมดจาก Sheets
- **บันทึก `localOrders` ก่อน overwrite** → หลัง overwrite ให้ merge กลับออเดอร์ที่ cloud ยังไม่มี
- ถ้ามีออเดอร์ที่ยังไม่ได้ sync → auto-trigger `syncToSheet` ใน 5 วินาที
- เรียก `recalcNextId()` เพื่อ sync ID counter

> **ทำไม:** เดิม `loadFromSheet` ทับ `DB.orders` ตรงๆ → ออเดอร์ที่ยังไม่ sync หายหลัง reload

### `syncToSheet()` — ⚠️ merge-safe (อัปเดต 2026-04-29)
- POST `{action:'syncAll', db:DB}` → ส่งข้อมูลทั้งหมดไป Sheets
- หลัง sync สำเร็จ → GET `getAll` → merge กลับออเดอร์ที่เพิ่มระหว่างรอ response (race condition fix)

### `saveLocal()` / `loadLocal()`
- `saveLocal()` เขียน DB ลง localStorage และ set `LS_DIRTY='true'` เสมอ
- `loadLocal()` ทำ deep merge สำหรับ `optionSets`
- Offline fallback — แอปใช้งานได้ปกติเมื่อไม่มีอินเทอร์เน็ต

### `scheduleSync()`
- debounce 3 วินาที — ป้องกัน sync ถี่เกินไปขณะกรอกข้อมูล

## Order ID
- ตั้งแต่ version 5.2.1: Order ID ใช้ `DB.nextId++` (numeric) เหมือน entity อื่นทุกตัว
- เดิมใช้ `'ORD-TMP-'+Date.now()` (string) → ทำให้ merge logic เปรียบ ID ผิดพลาด

## Offline Support
- `let isOnline = navigator.onLine` — ติดตาม network status
- ถ้า offline → ข้าม sync, แสดง "ออฟไลน์" ใน status bar
- ข้อมูลเก็บใน localStorage ใช้งานได้ปกติ

## Themes (5 theme)
| Key | ชื่อ |
|-----|------|
| `warm` | Warm Brown (default) |
| `forest` | Forest Green |
| `ocean` | Ocean Blue |
| `rose` | Rose Pink |
| `dark` | Dark Mode |

`applyTheme(key)` — inject CSS variables ลงใน `:root`

## App Settings ที่เก็บใน localStorage
```
{
  theme: 'warm',       // theme key
  locale: 'th-TH',    // th-TH | en-US
  dateFormat: 'short'  // short | long | relative
}
```
