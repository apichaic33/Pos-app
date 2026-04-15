# Wiki Log — POS-App

Append-only record of all wiki operations.

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

## [2026-04-15] create | Wiki initialized

- สร้าง wiki structure ครั้งแรก
- ไฟล์ที่สร้าง: `CLAUDE.md`, `index.md`, `log.md`, `pages/overview.md`
- โปรเจค: POS-App v5.1.0 — ระบบจัดการร้านกาแฟ (PWA)
