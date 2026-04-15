---
title: Authentication & Authorization
type: feature
tags: [auth, login, pin, manager, security, otp]
updated: 2026-04-15
source_files: [../../../js/auth.js, ../../../js/staff.js]
---

# Authentication & Authorization

## ระบบ Role
| Role | สิทธิ์ |
|------|--------|
| `cashier` | หน้า Order เท่านั้น |
| `manager` | ทุกหน้า + อนุมัติ void + reset PIN |

## Login Flow
```
กรอก Employee ID → lookup ชื่อ (real-time)
→ กรอก 4-digit PIN → SHA-256 hash → เปรียบเทียบกับ DB
→ สำเร็จ: set currentOperator + updateDrawerForRole()
→ ล้มเหลว: นับ fail count (brute-force protection)
```

### Brute Force Protection
- ผิดได้ 5 ครั้ง → ล็อค 5 นาที (per employee ID)
- ใช้ `_loginFailMap{}` เก็บ in-memory

### PIN Security
- PIN เก็บเป็น SHA-256 hash (`PIN_SALT + PIN`)
- `migratePins()` ใน `init.js` — migrate PIN plain-text เก่า → hash ครั้งเดียว

## Manager Gate (`mgrGate`)
หน้าที่ต้องการ Manager (`PROTECTED_PAGES`):
`promo, manage, report, stores, bills, audit, staff-mgmt, optsets, custom, app-settings`

Flow:
```
goPage(protectedPage) → currentOperator เป็น manager? → ผ่านทันที
                      → ไม่ใช่? → เปิด Manager Gate modal
                        → กรอก Manager ID + PIN
                        → สำเร็จ → set mgrSession (timeout 10 นาที)
```

`mgrSession` หมดอายุใน 10 นาที (`MGR_TIMEOUT = 10 * 60 * 1000`)

## Approval System (PIN Modal)
ใช้สำหรับขออนุมัติ action เฉพาะ (เช่น void บิล):
- `openPinModal(title, sub, mode, callback)` — เปิด modal ขอ PIN
- `mode: 'manager'` — ต้องเป็น Manager เท่านั้น
- `mode: 'any'` — พนักงานคนใดก็ได้

## OTP Recovery (ลืม Manager PIN)
Flow:
```
เลือก Manager → ระบบส่ง OTP 6 หลัก → Email ของ Manager
→ กรอก OTP → ยืนยันภายใน X นาที → Reset PIN ใหม่
```
- OTP เก็บ in-memory: `_recoveryOTP`, `_recoveryOTPExp`
- ผิดได้ 5 ครั้ง (`OTP_MAX_ATTEMPTS`) → ล็อค

## Session Management
```js
let currentOperator = null;  // {id, name, role} — staff.js
let mgrSession = null;       // {emp, expiry} — auth.js
const SESSION_ID = Date.now().toString(36).toUpperCase(); // unique per session
```

## Audit Log Integration
ทุก auth event บันทึกลง audit log:
- `AUD.login(emp)` — เข้าสู่ระบบ
- `AUD.approvalFail(id, who)` — รหัสผิด
