---
title: Recipe Engine
type: feature
tags: [recipe, ingredients, kitchen, stock, auto-deduct]
updated: 2026-04-30
source_files: [../js/order.js, ../js/inventory.js, ../js/manage.js]
---

# Recipe Engine

ระบบสูตรวัตถุดิบต่อแก้ว — คำนวณปริมาณวัตถุดิบที่ใช้จริงต่อ 1 ออเดอร์ตาม size, ความหวาน, และความเข้ม

## วัตถุประสงค์

- Kitchen เห็นปริมาณวัตถุดิบที่ต้องใช้ต่อแก้วแม่นยำ (g / ml)
- ตัดสต็อกอัตโนมัติทุกครั้งที่ยืนยันออเดอร์
- คำนวณต้นทุนต่อแก้ว → Gross Margin ต่อเมนู
- แจ้งเตือนวัตถุดิบใกล้หมดได้แม่นยำ

---

## Schema

```javascript
// DB.recipes[] — สูตรต่อเมนู+size
{
  id: 1,
  menuId: 3,          // FK → DB.menus
  size: 'L',          // 'S' | 'M' | 'L'
  ingredients: [
    { ingId: 5, qty: 8,   unit: 'g'  },   // ชาผง
    { ingId: 2, qty: 60,  unit: 'ml' },   // น้ำร้อน
    { ingId: 3, qty: 30,  unit: 'ml' },   // นมข้น
    { ingId: 1, qty: 200, unit: 'g'  },   // น้ำแข็ง
  ],
  // Modifier: ตัวคูณตามตัวเลือก (ใช้กับ ingId ที่ระบุ)
  mods: {
    sweet: {
      ingId: 6,    // น้ำตาล/น้ำเชื่อม
      '0%':   0,
      '25%':  0.5,
      '50%':  1.0,
      '75%':  1.5,
      '100%': 2.0,
    },
    strength: {
      ingId: 5,    // ชาผง/กาแฟ
      '25%':  0.75,
      '50%':  1.0,
      '75%':  1.25,
    }
  }
}
```

---

## Recipe Engine Function

```javascript
// คืน array ของ { ingId, name, qty, unit } ที่ใช้จริง
function calcRecipeAmounts(menuId, size, sweet, strength, qty=1) {
  const recipe = DB.recipes.find(r => r.menuId===menuId && r.size===size);
  if (!recipe) return [];
  return recipe.ingredients.map(ing => {
    let amount = ing.qty;
    if (recipe.mods?.sweet?.ingId === ing.ingId)
      amount *= (recipe.mods.sweet[sweet] ?? 1);
    if (recipe.mods?.strength?.ingId === ing.ingId)
      amount *= (recipe.mods.strength[strength] ?? 1);
    return { ingId: ing.ingId, qty: Math.round(amount * qty * 10) / 10, unit: ing.unit };
  });
}
```

---

## Auto Stock Deduction

เรียกเมื่อ `confirmOrder()` ใน order.js:

```javascript
function deductStockFromOrder(order) {
  order.items.forEach(item => {
    const amounts = calcRecipeAmounts(item.menuId, item.size, item.sweet, item.strength, item.qty);
    amounts.forEach(({ ingId, qty }) => {
      const ing = DB.ingredients.find(i => i.id === ingId);
      if (ing) ing.stock = Math.max(0, (ing.stock || 0) - qty);
    });
  });
  scheduleSync();
}
```

---

## Stock Alert Logic

```javascript
function getLowStockIngredients() {
  return DB.ingredients.filter(i => {
    if (!i.minStock) return false;
    return (i.stock || 0) <= i.minStock;
  });
}
```

threshold `minStock` ตั้งต่อ ingredient ใน inventory UI

---

## ต้นทุนต่อแก้ว

```javascript
function calcCostPerCup(menuId, size) {
  const recipe = DB.recipes.find(r => r.menuId===menuId && r.size===size);
  if (!recipe) return 0;
  return recipe.ingredients.reduce((sum, ing) => {
    const ingredient = DB.ingredients.find(i => i.id === ing.ingId);
    const pricePerUnit = ingredient?.costPer ?? 0; // บาท/g หรือ บาท/ml
    return sum + ing.qty * pricePerUnit;
  }, 0);
}
```

---

## Roadmap การพัฒนา

| ลำดับ | งาน | สถานะ |
|-------|-----|-------|
| 1 | ออกแบบ schema + calcRecipeAmounts() | 🔄 กำลังทำ |
| 2 | UI กรอกสูตรใน manage page | pending |
| 3 | Kitchen view แสดง recipe amounts | pending |
| 4 | Auto-deduct เมื่อยืนยันออเดอร์ | pending |
| 5 | Stock alert + badge | pending |
| 6 | Cost per cup → Gross Margin report | pending |
