---
title: Order / POS System
type: feature
tags: [order, pos, receipt, promo, cart, recipe-slip]
updated: 2026-04-15
source_files: [../../../js/order.js, ../../../js/auth.js]
---

# Order / POS System

## ภาพรวม
หน้าหลักของระบบ POS สำหรับแคชเชียร์ รับออเดอร์ คำนวณราคา และออกใบเสร็จ

## Flow การทำงาน
```
เลือกหมวดเมนู → กดสินค้า → เลือก Options (ขนาด/น้ำแข็ง/ความหวาน) 
→ ใส่ตะกร้า → ยืนยันบิล → ออกใบเสร็จ → Auto-save/Print
```

## Product Grid
- กรองตามหมวด: ทั้งหมด / กาแฟ / ชา / โกโก้ / อื่นๆ
- แสดงราคา, ต้นทุน, จำนวนที่ขาย (`m.sold`)
- ปุ่ม Quick Add (+) เพิ่มสินค้าขนาดเริ่มต้นทันที
- กดการ์ดเพื่อเปิด Product Detail Modal (เลือก options)

## Product Options
ตัวเลือกมี 2 ประเภท:
| ประเภท | ตัวอย่าง | แหล่งข้อมูล |
|--------|---------|------------|
| Standard Option Sets | ขนาด, น้ำแข็ง, ความหวาน, ความเข้ม | `DB.optionSets` |
| Custom Options | extraShot, เพิ่มซีรัป, ฯลฯ | `DB.customOptions` |

## ระบบตะกร้า (Cart)
- `orderItems[]` — รายการในตะกร้าปัจจุบัน (persist ใน localStorage `pos_order_v5`)
- `orderDiscount` — ส่วนลดรวม (จากโปรโมชั่น)
- `calcAutoPromo()` — คำนวณโปรโมชั่นอัตโนมัติ (ทุกครั้งที่แก้ตะกร้า)

## โปรโมชั่น Auto-apply
ระบบคำนวณโปรโมชั่นซ้อนได้ รองรับ 6 ประเภท:
- `pct` — ลด % จากราคา
- `fixed` — ลดราคาคงที่
- `buy` — ซื้อ X แถม Y
- `freeN` — ซื้อ N ฟรี 1 (ราคาต่ำสุด)
- `min` — ซื้อครบขั้นต่ำลด
- `bundle` — ซื้อจำนวนราคาพิเศษ

## ยืนยันบิล (`confirmOrder`)
เมื่อยืนยันบิล:
1. สร้าง order object ใส่ `DB.orders`
2. อัปเดต `m.sold` ทุก menu
3. **หักวัตถุดิบจาก stock** (ถ้ามี recipe ผูกอยู่)
4. บันทึก `AUD.orderNew()` ใน audit log
5. แสดงใบเสร็จ + render receipt canvas (html2canvas)
6. เรียก `scheduleSync()` — sync ไป Cloudflare Worker

## ใบเสร็จ (Receipt)
- Render เป็น HTML → แปลงเป็น canvas ด้วย `html2canvas` (โหลด CDN lazy)
- Auto-save: บันทึก canvas เป็นรูปภาพลงเครื่อง
- Auto-print: พิมพ์อัตโนมัติถ้าตั้งค่าไว้
- Share: แชร์ใบเสร็จเป็นรูปภาพ (Web Share API)
- Recipe Slip: พิมพ์ใบสูตรสำหรับบาริสต้า

## Employee Welfare
- `logStaffDrink()` — บันทึกเครื่องดื่มพนักงาน / ทดลองสูตร / ของเสีย
- บันทึกลง `DB.staffLogs` + audit log

## Product Detail Modal
- เปิดด้วย `openProductModal(id)` เมื่อกดการ์ดเมนู
- แสดงแบบ **full-page** (CSS class `full-page` บน `modal-overlay`)
- ตัวเลือกที่แสดง: ขนาด · น้ำแข็ง · ความเข้ม · ความหวาน · Custom Options

## Recipe Slip (สลิปสูตร)
ปุ่ม "สลิปสูตร" ปรากฏใน footer ใบเสร็จ (เฉพาะออเดอร์ที่มีเมนูผูกสูตร)

การแสดงผลใน `openRecipeSlip()`:
1. **จัดกลุ่มตามหมวดหมู่** — กาแฟ / ชา / โกโก้ / Custom / อื่นๆ
2. **ตัวเลือกต่อรายการ** — ขนาด · น้ำแข็ง · เข้ม · หวาน · หมายเหตุ (ทุกรายการ)
3. **ขยาย blend → วัตถุดิบจริง** — สัดส่วนตาม yield ของ batch
4. **สรุปวัตถุดิบรวม** — aggregate ทุกรายการท้ายหน้า

## Bill List
`renderBillList()` แสดงแต่ละบิลพร้อม preview รายการ:
- ชื่อเมนู × จำนวน
- ตัวเลือก: น้ำแข็ง · หวาน · เข้ม · หมายเหตุ (ต่อรายการ)

## Key Variables
| Variable | ความหมาย | ค่า default |
|----------|---------|------------|
| `orderItems[]` | รายการตะกร้าปัจจุบัน | `[]` |
| `activeCat` | หมวดเมนูที่เลือก | `'all'` (ทั้งหมด) |
| `orderDiscount` | ส่วนลดรวม | `0` |
| `previewOrder` | ข้อมูลบิลสำหรับใบเสร็จ | — |
| `lastOperator` | พนักงานคนสุดท้ายที่ยืนยันบิล | — |
