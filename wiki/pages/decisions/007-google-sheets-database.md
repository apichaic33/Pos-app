---
title: "TD-007: Google Sheets เป็น Database"
type: decision
tags: [database, google-sheets, gas, backend]
updated: 2026-04-15
status: active
---

# TD-007: Google Sheets เป็น Database

## การตัดสินใจ
ใช้ Google Sheets เป็น backend database ผ่าน Google Apps Script (GAS) API

## เหตุผล
- เจ้าของร้านดู/แก้ข้อมูลจาก Google Sheets ได้โดยตรง ไม่ต้องมี admin panel
- ไม่มีค่าใช้จ่าย (Google Workspace ฟรี)
- Export CSV/Excel ได้ทันที
- ไม่ต้องดูแล server / database

## ข้อจำกัด
- GAS มี quota: 6 นาที/execution, 20,000 reads/day
- Latency สูงกว่า database จริง (~500-2000ms)
- ไม่รองรับ concurrent writes อย่างปลอดภัย — แก้ด้วย single-device policy
- Schema เปลี่ยนยาก (column order sensitive)

## Sync Strategy
- **Write-through** ไม่ได้ใช้ — เขียน localStorage ก่อน, sync ทีหลัง (eventual consistency)
- `LS_DIRTY` flag บอกว่ามีข้อมูลรอ sync
- `recalcNextId()` หลัง sync — ให้ `DB.nextId` ใหญ่กว่า ID สูงสุดจาก Sheet

## ทางเลือกที่ปฏิเสธ
- Firebase/Supabase — มีค่าใช้จ่าย, setup ซับซ้อน
- SQLite/PocketBase — ต้องมี server
