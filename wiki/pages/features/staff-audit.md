---
title: Staff Management & Audit Log
type: feature
tags: [staff, employee, audit, void, bills]
updated: 2026-04-15
source_files: [../../../js/staff.js]
---

# Staff Management & Audit Log

## Employee Schema
```js
{
  id,           // รหัสพนักงาน (uppercase)
  name,
  role: 'cashier' | 'manager',
  pin,          // SHA-256 hash
  email,        // สำหรับ OTP recovery (manager)
  active: true | false
}
```

## Staff Management
- เพิ่ม/แก้ไข/ลบพนักงาน (Manager เท่านั้น)
- Reset PIN (Manager gate + OTP สำหรับ self-reset)
- ดูประวัติการ login ของแต่ละคน

## Audit Log
บันทึกทุก action ที่สำคัญ เก็บใน `DB.auditLog` (max 1,000 รายการ)

### Event Types
| type | ความหมาย |
|------|---------|
| `order_confirm` | ยืนยันบิล |
| `order_void` | ยกเลิกบิล |
| `void_request` | ขอยกเลิกบิล |
| `void_approve` | อนุมัติการยกเลิก |
| `void_reject` | ปฏิเสธการยกเลิก |
| `item_add/edit/remove` | แก้รายการในตะกร้า |
| `welfare` | เครื่องดื่มพนักงาน |
| `login` | เข้าสู่ระบบ |
| `auth_fail` | รหัสผิด |

### Severity
- `low` — ทั่วไป (เพิ่มรายการ, login)
- `med` — ต้องสังเกต (ลบรายการ, void request)
- `high` — สำคัญมาก (void บิล, auth fail)

## Bill Management & Void
Flow การ void บิล:
```
แคชเชียร์ → requestVoidOrder(orderId) → สถานะ 'pending_void'
Manager → openVoidModal() → กรอก PIN อนุมัติ
→ approveVoid() → order.status = 'void', คืน stock
→ rejectVoid() → ลบออกจาก pendingVoids
```

### Void Types
- `cashier_error` — คีย์ผิด
- `customer_cancel` — ลูกค้ายกเลิก
- `test` — ทดสอบระบบ

### `pendingVoids[]`
รายการ void ที่รอ Manager อนุมัติ เก็บใน `DB.pendingVoids`
