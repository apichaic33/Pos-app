---
title: Inventory & Stores
type: feature
tags: [inventory, ingredients, blend, recipe, purchase-order, stock]
updated: 2026-04-15
source_files: [../../../js/inventory.js]
---

# Inventory & Stores

## Tabs ในหน้า Stores
| Tab | ข้อมูล | Array ใน DB |
|-----|--------|------------|
| `ingredient` | วัตถุดิบ | `DB.ingredients` |
| `package` | บรรจุภัณฑ์ | `DB.packages` |
| `equipment` | อุปกรณ์ | `DB.equipment` |
| `blend` | สูตรเบลนด์ | `DB.blends` |
| `recipe` | สูตรเมนู | `DB.recipes` |
| `uselog` | บันทึกการใช้ | `DB.useLogs` |
| `po` | ใบสั่งซื้อ | `DB.purchaseOrders` |
| `alert` | แจ้งเตือนสต็อก | (computed) |

## Stock Alerts
ระบบแสดง badge อัตโนมัติ:
- **สต็อกต่ำ** — `item.qty <= item.min`
- **ใกล้หมดอายุ** — วันหมดอายุ ≤ 7 วัน
- **หมดอายุ** — วันหมดอายุ < วันนี้
- **เสียหาย** — `item.status === 'damaged'`

## สูตรเบลนด์ (Blend)
สูตรผสมวัตถุดิบสำเร็จรูป เช่น ซีรัปเฉพาะ, เบส, ฯลฯ
- สร้าง/แก้ไขด้วย `openBlendModal()`
- `calcBlendCost()` — คำนวณต้นทุนต่อ batch
- `confirmBatch()` — ผลิต batch → **หักวัตถุดิบจาก stock**
- เก็บใน `DB.blends` + `DB.blendBatches`

## สูตรเมนู (Recipe)
เชื่อมวัตถุดิบกับเมนู:
- สร้างด้วย `openRecipeModal()`
- เมื่อขายเมนู → `confirmOrder()` หักวัตถุดิบอัตโนมัติ
- `calcRecipeCostPerCup()` — คำนวณต้นทุนต่อแก้ว

## Use Log (บันทึกการใช้วัตถุดิบ)
บันทึกการใช้นอกระบบขาย:
- เครื่องดื่มพนักงาน
- ทดลองสูตร
- หมดอายุ / ทิ้ง
- เสียหาย

## Purchase Order (PO)
Flow:
```
สร้าง PO (openManualPO) → สถานะ 'pending'
→ receivePO() → เพิ่มจำนวนใน stock + สถานะ 'received'
→ cancelPO() → สถานะ 'cancelled'
```
- `quickCreatePO()` — สร้าง PO จาก alert (สต็อกต่ำ)
- เก็บใน `DB.purchaseOrders`

## Item Schema (ingredients)
```js
{
  id, name, qty, unit, cost,   // ราคา/หน่วย
  min,                          // จุดสั่งซื้อ (alert threshold)
  expiry,                       // วันหมดอายุ (YYYY-MM-DD)
  status: 'active'|'damaged'|'retired',
  note
}
```
