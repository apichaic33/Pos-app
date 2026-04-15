---
title: Menu Management
type: feature
tags: [manage, menu, recipe, cost, margin, promo]
updated: 2026-04-15
source_files: [../../../js/manage.js, ../../../js/promo.js]
---

# Menu Management

## หมวดเมนู
`coffee` / `tea` / `cocoa` / `custom` / `other`

## Menu Schema
```js
{
  id, name, cat, price, cost,    // ราคาขาย, ต้นทุน (คำนวณจากสูตร)
  vol: 200 | 1000,               // ml
  icon,                          // ตัวย่อ 1-2 ตัว
  color,                         // hex color
  sizes: [],                     // ขนาดที่มี
  status: 'active' | 'inactive',
  promoId,                       // โปรโมชั่นที่ผูกไว้
  recipeId,                      // สูตรที่ผูกไว้
  customOptions: [],             // custom option keys
  sold: 0,                       // จำนวนที่ขาย (auto-increment)
  desc
}
```

## การคำนวณต้นทุน
2 วิธี:
1. **กรอกเอง** — กรอก `cost` ตรงๆ ในฟอร์ม
2. **คำนวณจากสูตร** — tab "สูตร/ต้นทุน"
   - `getRecipeBaseCost()` — รวมต้นทุนวัตถุดิบในสูตร
   - `calcDynamicCost()` — ต้นทุนตาม option (ขนาด/ความหวาน)
   - `recalcMenuCost()` — อัปเดตต้นทุนหลังแก้สูตร

## Margin แสดงผล
```
Margin = (ราคาขาย - ต้นทุน) / ราคาขาย × 100
≥ 50% → สีเขียว
≥ 30% → สีทอง
< 30% → สีแดง
```

## Dynamic Cost Modifiers
ต้นทุนเปลี่ยนตาม option ที่ลูกค้าเลือก:
- วัตถุดิบหลัก (ชา/กาแฟ) — ต้นทุนต่างตามขนาด
- ตัวให้ความหวาน — ต้นทุนต่างตามระดับ

## โปรโมชั่น (promo.js)
| ประเภท | คำอธิบาย |
|--------|---------|
| `pct` | ลด % จากราคา |
| `fixed` | ลดราคาคงที่ (฿) |
| `buy` | ซื้อ X แถม Y |
| `freeN` | ซื้อ N ฟรี 1 (ราคาต่ำสุด) |
| `min` | ซื้อครบขั้นต่ำลด |
| `bundle` | ซื้อจำนวนราคาพิเศษ |

โปรโมชั่นมี:
- `active` flag — เปิด/ปิด
- `expiry` — วันหมดอายุ (optional)
- ผูกกับเมนูใดก็ได้ หรือทุกเมนู
