# Wiki Index — POS-App

> Catalog of all wiki pages. Updated on every ingest or page creation.

## Overview
| Page | Summary |
|------|---------|
| [Project Overview](pages/overview.md) | สถาปัตยกรรม, เทคโนโลยี, และโครงสร้างโดยรวมของ POS-App |
| [JavaScript Architecture](pages/architecture.md) | Module map, global variables, และกฎการแก้โค้ด |

## Features
| Page | Summary |
|------|---------|
| [Order / POS System](pages/features/order.md) | รับออเดอร์, คำนวณโปรโมชั่น, ออกใบเสร็จ, auto-save/print |
| [Menu Management](pages/features/menu-management.md) | จัดการเมนู, คำนวณต้นทุน/margin, โปรโมชั่น 6 ประเภท |
| [Inventory & Stores](pages/features/inventory.md) | วัตถุดิบ, สูตรเบลนด์, สูตรเมนู, PO, stock alerts |
| [Authentication](pages/features/auth.md) | Login PIN, Manager Gate, brute-force protection, OTP recovery |
| [Staff & Audit Log](pages/features/staff-audit.md) | พนักงาน, audit trail, void บิล |
| [Sync & API](pages/features/sync-api.md) | Cloudflare Worker, Google Sheets, offline, 5 themes |

## Decisions
| Page                                                     | Summary                                        |
| -------------------------------------------------------- | ---------------------------------------------- |
| [Decisions Index](pages/decisions/index.md)              | รายการ technical decisions ทั้งหมด             |
| [TD-001](pages/decisions/001-cloudflare-worker-proxy.md) | Cloudflare Worker เป็น Proxy — ซ่อน APP_SECRET |
| [TD-002](pages/decisions/002-plain-script-modules.md)    | Plain Scripts แทน ES Modules — onclick ไม่พัง  |
| [TD-003](pages/decisions/003-localstorage-offline.md)    | localStorage offline store — dirty flag sync   |
| [TD-004](pages/decisions/004-sha256-pin.md)              | SHA-256 PIN hash — Web Crypto API              |
| [TD-005](pages/decisions/005-html2canvas-receipt.md)     | html2canvas receipt — pre-render 400ms         |
| [TD-006](pages/decisions/006-spa-not-mpa.md)             | SPA แทน MPA — shared DB + session state        |
| [TD-007](pages/decisions/007-google-sheets-database.md)  | Google Sheets database — eventual consistency  |
| [TD-008](pages/decisions/008-sw-blob-localhost.md)       | SW Blob บน localhost — HTTPS ใช้ไฟล์จริง       |

---
_Last updated: 2026-04-29_
