---
title: Development Roadmap
type: overview
tags: [roadmap, planning, phases]
updated: 2026-04-30
---

# Development Roadmap — POS-App v2

แผนพัฒนาต่อจาก Firestore migration (เสร็จ 2026-04-30)

## เป้าหมาย

ระบบ POS ครบวงจรสำหรับร้านกาแฟ ใช้ได้ทุก device รองรับทั้ง หน้าร้าน + เดลิเวอรี่

---

## Phase 1 — Recipe Engine ✅ (In Progress)

**เป้าหมาย:** ให้ระบบรู้ว่าทำเครื่องดื่มแต่ละแก้วต้องใช้วัตถุดิบอะไรเท่าไร

| งาน | รายละเอียด |
|-----|-----------|
| Recipe Schema | สูตรต่อเมนู + size + sweet/strength modifier |
| UI กรอกสูตร | modal ใน manage page — กรอก ingredient + qty |
| calcRecipeAmounts() | engine คำนวณ qty จริงตาม option |
| Kitchen Display | แสดงสัดส่วนต่อแก้วใน kitchen view |
| Auto Stock Deduct | ตัดสต็อกอัตโนมัติเมื่อ confirm order |
| Stock Alert | badge + toast เมื่อวัตถุดิบ ≤ minStock |
| Cost per cup | คำนวณต้นทุน → Gross Margin per menu |

---

## Phase 2 — Kitchen Display Redesign

**เป้าหมาย:** จอครัว dark mode + real-time + แสดงสูตรจริง

| งาน | รายละเอียด |
|-----|-----------|
| Dark UI | redesign kitchen page ตาม mockup |
| Timer per order | นับเวลาแต่ละออเดอร์ตั้งแต่สั่ง |
| Status flow | รอ → ทำ → เสร็จ |
| onSnapshot real-time | อัปเดตทันทีไม่ต้อง refresh |
| Display mode | จอโชว์ลูกค้า (order status) |

---

## Phase 3 — Delivery System

**เป้าหมาย:** จัดการออเดอร์เดลิเวอรี่ในแอพเดียว

| งาน | รายละเอียด |
|-----|-----------|
| Order type | เพิ่ม field: channel (store/delivery/grab/lineman) |
| Delivery queue | หน้าจัดการออเดอร์เดลิเวอรี่ |
| Status flow | รับ → ทำ → พร้อมส่ง → กำลังส่ง → ถึงแล้ว |
| Customer info | ชื่อ/เบอร์/ที่อยู่ต่อออเดอร์ |
| Delivery fee | ค่าส่งแยกจากราคาสินค้า |
| Print label | พิมพ์ label ชื่อ/ที่อยู่/ออเดอร์ |

---

## Phase 4 — Manager Dashboard

**เป้าหมาย:** ข้อมูลครบ ตัดสินใจได้จากแอพเดียว

| งาน | รายละเอียด |
|-----|-----------|
| Sales chart | ยอดขายรายชั่วโมง/วัน/สัปดาห์ |
| Top menu | เมนูขายดี + กำไรต่อเมนู |
| Staff performance | ยอดขายต่อพนักงาน |
| Stock forecast | คาดการณ์วันหมดจากยอดขายเฉลี่ย |
| Export | PDF / CSV รายงาน |

---

## Phase 5 — Customer Loyalty

| งาน | รายละเอียด |
|-----|-----------|
| Customer profiles | เบอร์โทร + ประวัติออเดอร์ |
| Points system | สะสมแต้ม แลกส่วนลด |
| Line OA integration | ส่งโปรโมชั่นถึงลูกค้าประจำ |

---

## Tech Stack Notes

| Component | ปัจจุบัน | แผนอนาคต |
|-----------|---------|---------|
| Frontend | Pure HTML/JS | คงไว้ (ไม่เปลี่ยน framework) |
| Database | Firestore | คงไว้ + Cloud Functions |
| Auth | Firebase Anonymous | เพิ่ม Phone Auth สำหรับลูกค้า |
| Print | html2canvas | เพิ่ม Web Bluetooth (Android) |
