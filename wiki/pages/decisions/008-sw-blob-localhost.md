---
title: "TD-008: Service Worker ใช้ Blob บน localhost"
type: decision
tags: [service-worker, pwa, offline, development]
updated: 2026-04-15
status: active
---

# TD-008: Service Worker Blob Strategy สำหรับ localhost

## การตัดสินใจ
SW registration ใน `init.js` แยกสองเส้นทางตาม protocol:

```js
if (location.protocol === 'https:') {
  // Production: ใช้ sw.js ไฟล์จริง
  navigator.serviceWorker.register('./sw.js');
} else {
  // localhost/file: สร้าง SW จาก Blob (ไม่ต้องมี sw.js)
  const blob = new Blob([swCode], {type:'application/javascript'});
  navigator.serviceWorker.register(URL.createObjectURL(blob));
}
```

## เหตุผล
- Blob URL ไม่ทำงานบน HTTPS (browser บล็อก security policy)
- Development บน localhost ต้องการ SW สำหรับทดสอบ offline mode
- Blob SW มี caching strategy ง่าย (network-first fallback cache)

## iOS PWA Edge Case
SW registration ใน `index.html` (inline script) มี check พิเศษ:
```js
if (isIOS && isStandalone) { return; } // skip SW
```
Safari iOS standalone mode บล็อก "non app-bound domain" — SW จะ error ถ้า register

→ SW ใน `init.js` จะ register อีกครั้ง (fallback) แต่ไม่ conflict เพราะ HTTPS path ใช้ไฟล์เดิม
