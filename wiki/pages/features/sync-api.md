---
title: Sync & API
type: feature
tags: [sync, cloudflare, api, localStorage, offline, themes]
updated: 2026-04-15
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
```js
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

### `loadFromSheet()`
- GET `?action=getAll` → ดึงข้อมูลทั้งหมดจาก Sheets
- Override `DB` object ทุก key
- เรียก `recalcNextId()` เพื่อ sync ID counter

### `syncToSheet()`  
- POST `{action:'syncAll', db:DB}` → ส่งข้อมูลทั้งหมดไป Sheets
- หลัง sync สำเร็จ → GET `getAll` อีกครั้งเพื่อดึง ID จริงจาก GAS

### `saveLocal()` / `loadLocal()`
- Offline fallback ใช้ localStorage
- `loadLocal()` ทำ deep merge สำหรับ `optionSets`

## Offline Support
- `let isOnline = navigator.onLine` — ติดตาม network status
- ถ้า offline → ข้าม sync, แสดง "ออฟไลน์" ใน status bar
- ข้อมูลเก็บใน localStorage ใช้งานได้ปกติ

## Themes (5 theme)
| Key | ชื่อ |
|-----|------|
| `warm` | 🤎 Warm Brown (default) |
| `forest` | 🌿 Forest Green |
| `ocean` | 🌊 Ocean Blue |
| `rose` | 🌸 Rose Pink |
| `dark` | 🖤 Dark Mode |

`applyTheme(key)` — inject CSS variables ลงใน `:root`

## App Settings ที่เก็บใน localStorage
```js
{
  theme: 'warm',       // theme key
  locale: 'th-TH',    // th-TH | en-US
  dateFormat: 'short'  // short | long | relative
}
```
