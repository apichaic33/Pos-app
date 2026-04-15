# Wiki Log — POS-App

Append-only record of all wiki operations.

---

## [2026-04-15] update | Feature: Kitchen Display (ครัว) — NAV page 3

### Feature
- เพิ่มปุ่ม **"ครัว"** ใน bottom nav bar (ปุ่มที่ 3) พร้อม badge แจ้งจำนวนออเดอร์รอทำ
- หน้า `pg-kitchen` แสดงออเดอร์วันนี้ทั้งหมด (active, ไม่รวม voided) เรียง FIFO (เก่าสุดขึ้นก่อน)
- แต่ละออเดอร์: ชื่อ/เวลา/จำนวนแก้ว + ตัวเลือก (size/ice/หวาน/เข้ม) + วัตถุดิบจากสูตร
- Tab: รอทำ / เสร็จแล้ว / ทั้งหมด
- ปุ่ม **"ทำเสร็จแล้ว"** → set `order.kitchenDone=true` → บันทึก + re-render

### Files
- `index.html` — เพิ่ม `#pg-kitchen` page + `#nav-kitchen` button
- `css/app.css` — เพิ่ม kitchen styles (card/header/item/ingredient/done-btn)
- `js/order.js` — เพิ่ม `renderKitchen()`, `markKitchenDone()`, `switchKitchenTab()`, `updateKitchenBadge()` + `kitchenDone:false` ใน `confirmOrder`
- `js/auth.js` — เพิ่ม `renderKitchen()` ใน `_goPageDirect`
- `sw.js` version `5.1.2 → 5.1.3`

---

## [2026-04-15] update | Bug fix: Discount display inconsistency in Order Panel + Receipt

### ปัญหา
- `renderOrderPanel()` แสดงส่วนลดต่อรายการจาก `autoPromoDisc` เท่านั้น แต่ `updateOrderSummary()` รวมยอดจาก `autoPromoDisc||promoDisc` → ยอดส่วนลดรวมไม่ตรงกับที่แสดงต่อรายการ
- `openReceiptPreview()` คำนวณส่วนลดจาก `promoDisc` เท่านั้น → ใบเสร็จ preview แสดงส่วนลดผิดเมื่อ auto-promo ทำงาน

### แก้ไข (`js/order.js`)
- `renderOrderPanel()`: `disc = i.autoPromoDisc||i.promoDisc||0` (เหมือนกับ summary)
- `renderOrderPanel()`: เพิ่ม `manualPromo` fallback เพื่อแสดง badge โปรโมชั่นสำหรับ manual promo ด้วย
- `openReceiptPreview()`: `discount = autoPromoDisc||promoDisc||0`

### อัปเดต
- `sw.js` version `5.1.1 → 5.1.2` (cache bust)

---

## [2026-04-15] create | Technical Decisions — 8 รายการ

- TD-001: Cloudflare Worker proxy
- TD-002: Plain script modules
- TD-003: localStorage offline store
- TD-004: SHA-256 PIN hash
- TD-005: html2canvas receipt
- TD-006: SPA vs MPA
- TD-007: Google Sheets database
- TD-008: SW Blob on localhost

## [2026-04-15] ingest | Source code — JS modules ทั้งหมด

อ่านและสรุปจาก: db.js, order.js, manage.js, promo.js, report.js, options.js, staff.js, inventory.js, sync.js, auth.js, init.js

หน้าที่สร้าง:
- `pages/features/order.md` — POS flow, receipt, welfare
- `pages/features/menu-management.md` — เมนู, ต้นทุน, margin, โปรโมชั่น
- `pages/features/inventory.md` — stock, blend, recipe, PO
- `pages/features/auth.md` — login, manager gate, OTP recovery
- `pages/features/staff-audit.md` — พนักงาน, audit log, void flow
- `pages/features/sync-api.md` — Cloudflare Worker, GAS, offline, themes

## [2026-04-15] update | Refactor: แยก app.js เป็น 11 modules

- `js/db.js` — DB schema (33 บรรทัด)
- `js/order.js` — Navigation + POS + Receipt (1,479 บรรทัด)
- `js/manage.js` — จัดการเมนู (546 บรรทัด)
- `js/promo.js` — โปรโมชั่น (99 บรรทัด)
- `js/report.js` — รายงาน (480 บรรทัด)
- `js/options.js` — Option sets + Custom options (411 บรรทัด)
- `js/staff.js` — Audit + PIN + พนักงาน + Bills (742 บรรทัด)
- `js/inventory.js` — คลัง + สูตร + Blend + PO (792 บรรทัด)
- `js/sync.js` — API + LS keys + Themes + Sync (489 บรรทัด)
- `js/auth.js` — Login + Manager Gate + OTP (681 บรรทัด)
- `js/init.js` — SW + Init IIFE + Debug (164 บรรทัด)
- อัปเดต `sw.js` PRECACHE ให้ครอบคลุมทุก module
- สร้างหน้า wiki: `pages/architecture.md`

## [2026-04-15] update | Refactor: แยก index.html เป็น 3 ไฟล์

- `css/app.css` — CSS ทั้งหมด (965 บรรทัด)
- `js/app.js` — JavaScript ทั้งหมด (5,915 บรรทัด)
- `index.html` — HTML structure เพียว (813 บรรทัด, ลดจาก 7,698)
- `sw.js` — เพิ่ม `./css/app.css` และ `./js/app.js` ใน PRECACHE

## [2026-04-15] update | Feature updates — Inventory, Order, Recipe Slip, UX

### Inventory (inventory.js + app.js)
- เพิ่ม field `unitQty` (ปริมาณ 1 หน่วย / package size) ใน ingredient schema
- แก้ไขสูตร `unitCost`: ถ้ามี `unitQty` → `cost/unitQty`, fallback → `cost/qty`
- `unitQty` ไม่กระทบ stock เพิ่ม/ลด — ใช้คำนวณต้นทุนต่อหน่วยย่อยเท่านั้น
- อัปเดต `openStoreAdd`, `editStoreItem`, `saveStoreItem`, `renderStores`

### Order — Bill List (order.js)
- `renderBillList()` เพิ่ม preview รายการต่อบิล: ชื่อเมนู × qty + ตัวเลือก (น้ำแข็ง/หวาน/เข้ม/หมายเหตุ)

### Order — Recipe Slip (order.js)
- จัดกลุ่มรายการตามหมวดหมู่เมนู (กาแฟ/ชา/โกโก้/Custom/อื่นๆ)
- แสดงตัวเลือกครบทุกรายการ (ขนาด · น้ำแข็ง · **เข้ม · หวาน** · หมายเหตุ)
- ขยาย blend → วัตถุดิบจริง (สัดส่วนตาม yield)
- เพิ่มส่วน "สรุปวัตถุดิบรวมทั้งออเดอร์" ท้ายหน้า

### Order UX (index.html + css/app.css)
- Product Detail Modal: เปลี่ยนเป็น full-page (class `full-page`)
- `activeCat` default: `'coffee'` → `'all'` (แสดงทุกเมนูตอนเปิด)

### Service Worker (sw.js)
- เพิ่ม version `5.1.0 → 5.1.1` เพื่อบังคับ cache bust

หน้า wiki ที่อัปเดต:
- `pages/features/inventory.md` — เพิ่ม unitQty schema + Stock Movement table
- `pages/features/order.md` — เพิ่ม Product Detail Modal, Recipe Slip, Bill List, ปรับ Key Variables

---

## [2026-04-15] create | Wiki initialized

- สร้าง wiki structure ครั้งแรก
- ไฟล์ที่สร้าง: `CLAUDE.md`, `index.md`, `log.md`, `pages/overview.md`
- โปรเจค: POS-App v5.1.0 — ระบบจัดการร้านกาแฟ (PWA)
