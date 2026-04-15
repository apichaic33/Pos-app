---
title: JavaScript Architecture
type: overview
tags: [architecture, modules, javascript, refactoring]
updated: 2026-04-15
source_files: [../js/db.js, ../js/order.js, ../js/manage.js, ../js/promo.js, ../js/report.js, ../js/options.js, ../js/staff.js, ../js/inventory.js, ../js/sync.js, ../js/auth.js, ../js/init.js]
---

# JavaScript Architecture

## แนวทาง: Plain Script Modules (Global Scope)

ไม่ใช้ ES Modules (`type="module"`) เพื่อให้:
- `onclick="..."` ใน HTML ทำงานได้ปกติ
- ตัวแปร global (`DB`, `currentOperator`, ฯลฯ) เข้าถึงได้ทุก module
- ไม่ต้องเปลี่ยน architecture เดิม

โหลดลำดับใน `index.html`:

```html
<script src="js/db.js"></script>        <!-- 1. ต้องโหลดก่อนสุด -->
<script src="js/order.js"></script>
<script src="js/manage.js"></script>
<script src="js/promo.js"></script>
<script src="js/report.js"></script>
<script src="js/options.js"></script>
<script src="js/staff.js"></script>
<script src="js/inventory.js"></script>
<script src="js/sync.js"></script>      <!-- ต้องมาก่อน auth -->
<script src="js/auth.js"></script>
<script src="js/init.js"></script>      <!-- ต้องโหลดหลังสุด -->
```

## Module Map

| ไฟล์ | บรรทัด | หน้าที่ | Functions หลัก |
|------|--------|---------|----------------|
| [db.js](../../js/db.js) | 33 | DB schema + initial state | `let DB = {...}` |
| [order.js](../../js/order.js) | 1,479 | Navigation + POS order + receipt | `openDrawer`, `renderOrder`, `confirmOrder`, `renderReceipt` |
| [manage.js](../../js/manage.js) | 546 | จัดการเมนู + ต้นทุน | `renderManage`, `saveMenu`, `calcDynamicCost` |
| [promo.js](../../js/promo.js) | 99 | โปรโมชั่น | `renderPromos`, `savePromo`, `calcAutoPromo` |
| [report.js](../../js/report.js) | 480 | รายงานยอดขาย | `renderReport`, `_calcOrderStats`, `_renderDonut` |
| [options.js](../../js/options.js) | 411 | Option sets + Custom options | `renderOptionSets`, `saveOptSetItem`, `renderCustomMgr` |
| [staff.js](../../js/staff.js) | 742 | Audit log + PIN approval + พนักงาน + Bills | `renderStaffMgmt`, `approveVoid`, `addAudit` |
| [inventory.js](../../js/inventory.js) | 792 | คลังวัตถุดิบ + สูตร + Blend + PO | `renderStores`, `saveBlendFormula`, `receivePO` |
| [sync.js](../../js/sync.js) | 489 | SCRIPT_URL + LS keys + themes + sync | `syncToSheet`, `loadLocal`, `saveLocal`, `renderAppSettings` |
| [auth.js](../../js/auth.js) | 681 | Login + Manager Gate + OTP recovery | `loginLookup`, `mgrGate`, `verifyRecoveryOTP` |
| [init.js](../../js/init.js) | 164 | SW registration + App init + Debug | `init()` IIFE, `showUpdateBanner`, `openDebugPanel` |

## Key Global Variables

| ตัวแปร | ไฟล์ที่นิยาม | ความหมาย |
|--------|-------------|---------|
| `DB` | db.js | ข้อมูลทั้งหมดของแอป |
| `SCRIPT_URL` | sync.js | Cloudflare Worker URL |
| `LS_KEY`, `LS_DIRTY`, ... | sync.js | localStorage keys |
| `currentOperator` | staff.js | พนักงานที่ login อยู่ |
| `mgrSession` | auth.js | Manager session + timeout |
| `orderItems` | order.js | รายการออเดอร์ปัจจุบัน |
| `isOnline` | sync.js | สถานะ network |
| `PROTECTED_PAGES` | auth.js | หน้าที่ต้องการ Manager |

## กฎสำคัญเมื่อแก้โค้ด

1. **แก้ DB schema** → `db.js` เท่านั้น
2. **แก้ sync/API** → `sync.js`
3. **เพิ่ม `LS_*` constant ใหม่** → ต้องเพิ่มใน `sync.js` (บรรทัดต้นไฟล์)
4. **เพิ่มหน้าใหม่ที่ต้องการ Manager** → เพิ่มใน `PROTECTED_PAGES` ใน `auth.js`
5. **init.js โหลดหลังสุดเสมอ** — IIFE `init()` เรียกฟังก์ชันจากทุก module

## ประวัติการ Refactor

| วันที่ | การเปลี่ยนแปลง |
|--------|--------------|
| 2026-04-15 | แยก `index.html` (7,698 บรรทัด) → `css/app.css` + `js/app.js` + `index.html` |
| 2026-04-15 | แยก `js/app.js` (5,916 บรรทัด) → 11 module files |
