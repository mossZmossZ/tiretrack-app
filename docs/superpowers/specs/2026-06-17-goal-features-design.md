# TireTrack — Goal Features Design Spec

**Date:** 2026-06-17  
**Author:** Staff Software Engineer (AI) + CEO  
**Status:** Approved — ready for implementation planning

---

## Overview

Six feature areas designed and approved. Implementation order follows foundation-first principle: auth before product features, infrastructure before new UX.

| Priority | Feature | Complexity |
|----------|---------|------------|
| 1 | Auth + RBAC + Session Management | Medium |
| 2 | Lazy Load / Code Split | Small |
| 3 | Backup Improvement | Small–Medium |
| 4 | POS Device Integration (drawer + printer + Sunmi) | Large |
| 5 | Coupon System | Medium |
| 6 | Queue System + TV Display + LINE | Very Large |

---

## Feature A — Auth + RBAC + Session Management

### Problem
Current auth uses two shared global PINs (`ADMIN_PIN`, `TECH_PIN`) stored in `.env`. Sessions live in an in-memory `Map` — lost on every server restart. This caused mid-transaction logouts in the shop.

### Design

**User model** (new MongoDB collection: `users`)
```json
{
  "_id": "uuid",
  "name": "สมชาย",
  "pin_hash": "$2b$10$...",
  "role": "tech",
  "is_active": true,
  "failed_attempts": 0,
  "locked_until": null,
  "created_at": "ISO8601"
}
```

**Session model** (new MongoDB collection: `sessions`)
```json
{
  "_id": "uuid-token",
  "user_id": "uuid",
  "role": "tech",
  "device_hint": "iPhone — Safari",
  "created_at": "ISO8601",
  "expires_at": "ISO8601",
  "is_banned": false
}
```

**Roles and page access**

| Role | Pages |
|------|-------|
| `admin` | All pages |
| `tech` | QuickInput, RecentEntries, Queue (create/update) |
| `viewer` | Dashboard (read-only), TV Queue display |

**Security**
- PIN stored as **bcrypt hash** (never plaintext)
- Session tokens signed with `SESSION_SECRET` env var (HMAC)
- PIN format: numeric only, 4–8 digits
- **Max retries**: 5 failed attempts → account locked
- **Cooldown**: lockout duration shown on login screen (e.g. 15 minutes)
- Multiple sessions per user allowed (one per device)

**Bootstrap**
On first server boot, if `users` collection is empty → auto-create one admin user named "Admin" with PIN from `ADMIN_PIN` env var. After that, all user management is through the admin UI.

**Admin UI additions**
- `/admin/users` — User management page: create, edit, delete users; assign role; activate/deactivate
- `/admin/sessions` — Session dashboard: list all active sessions (user name, device hint, login time), force logout any session, ban a user

**Migration from current system**
`ADMIN_PIN` and `TECH_PIN` env vars remain for bootstrap only. Existing sessions are invalidated on upgrade (one-time logout for all devices). Admin creates named user accounts from the new UI.

---

## Feature B — Lazy Load / Code Split

### Problem
Vite bundles everything into one chunk. As features grow, initial load on tech phones (4G, garage) gets slower.

### Design
- Replace eager imports in `App.jsx` with `React.lazy()` per route
- Wrap each lazy route in `<Suspense fallback={<LoadingSpinner />}>`
- Vite automatically splits each lazy import into its own chunk
- Role-based splitting: admin pages never downloaded by tech devices, viewer pages are separate

**Chunk strategy**
```
chunk: login          → LoginPage
chunk: admin          → all /admin/* pages (lazy per page)
chunk: tech           → QuickInput, RecentEntries
chunk: viewer         → Dashboard (read-only), TV Queue
```

No config changes to Vite needed — dynamic imports trigger automatic splitting.

---

## Feature C — Backup Improvement

### Problem
Current S3/MinIO backup works but is opaque — admin has no visibility into backup health, restore is destructive with no verification step, and old backups accumulate indefinitely.

### Design

**Backup health dashboard** (add to existing `/admin/backup` page)
- Last backup: timestamp + status (success / failed) + file sizes
- Next scheduled backup: countdown
- Total backups stored: count + total size on S3

**Restore verification (dry-run)**
- Before wiping live data, download backup → parse → insert into temp collections (`services_restore_preview`, `inventory_restore_preview`)
- Compare row counts: preview vs current live
- Show diff summary to admin: "Backup has 1,240 records, current has 1,255 — restoring will lose 15 records"
- Admin must confirm before actual restore proceeds
- Temp collections dropped after restore or cancellation

**Retention policy**
- Admin sets "keep last N backups" (default: 30)
- On each new backup: list S3 objects by date, delete oldest beyond N
- Policy stored in `backup-config.json` alongside existing cron settings

**Backup format**
- CSV remains the default format (unchanged wire format on S3)
- No new format needed — CSV is already human-readable and Excel-compatible

---

## Feature D — POS Device Integration

### Devices
| Device | Role | Connection |
|--------|------|------------|
| Main POS (Windows PC or Android Box + touchscreen) | Browser-based POS terminal | Local network |
| Receipt printer | Thermal receipt printing | USB → Web Serial API |
| Cash drawer | Open on payment | USB → Web Serial API |
| Sunmi V2 Pro | Mobile stock-count endpoint | Browser (barcode scanner = keyboard emulation) |

### Main POS — Receipt Printer + Cash Drawer
- TireTrack runs in Chrome/Edge on the main POS machine (no native app, no install)
- **Receipt printer**: USB → Web Serial API → ESC/POS commands sent directly from browser
  - Replaces current `window.print()` flow
  - Fires on service completion event
- **Cash drawer**: USB → Web Serial API → ESC/POS cash drawer open command
  - Fires on payment confirmation event
- User grants Web Serial permission once in Chrome; permission persists

**New server-side endpoint**: none required. All hardware communication is client-side via Web Serial API.

**New client components**:
- `usePrinter()` hook — manages Web Serial connection to printer
- `useDrawer()` hook — manages Web Serial connection to drawer
- `PrinterSetup` page (`/admin/printer`) — connect devices, test print, test drawer open

### Sunmi V2 Pro — Mobile Stock Count
- Runs TireTrack in Chrome on the Sunmi's Android browser
- Barcode scanner built into Sunmi emits keystrokes (keyboard emulation) → browser input field captures them
- New dedicated page: `/tech/stock` — scan a barcode → lookup SKU → show current stock → update quantity
- No Sunmi SDK required

---

## Feature E — Coupon System

### Design

**Coupon model** (new MongoDB collection: `coupons`)
```json
{
  "_id": "uuid",
  "code": "TT-A3X9K2",
  "campaign_name": "โปรโมชั่นหน้าฝน",
  "category": "promotion",
  "type": "percentage",
  "value": 10,
  "min_total": 500,
  "max_uses": 1,
  "uses_count": 0,
  "valid_from": "ISO8601",
  "valid_until": "ISO8601",
  "is_active": true,
  "created_at": "ISO8601"
}
```

**Coupon types**
| Type | Field | Example |
|------|-------|---------|
| Fixed amount | `value` in ฿ | ลด 100฿ |
| Percentage | `value` as % | ลด 10% |
| Free service | `value` = 0, `free_service_type` | ตรวจลมฟรี |

**Coupon categories** (label only, no logic difference)
- `bill` — attached to a specific service bill
- `promotion` — general promotional campaign
- `special` — VIP / special occasion
- `discount` — standard discount

**Batch generation**
Admin creates a campaign with count N → system generates N unique codes in one operation → all codes share same campaign settings → codes stored individually in `coupons` collection.

**Multi-use codes**
`max_uses > 1` → code can be redeemed multiple times up to the limit. `uses_count` incremented on each redemption.

**POS cashier input**
- Coupon code field added to the service completion / payment step
- On submit: validate code (exists, active, not expired, uses remaining) → apply discount to total
- Rejected codes show reason: expired / already used / minimum total not met

**Print modes**
1. **On receipt**: coupon code + QR code printed at bottom of service receipt
2. **Standalone print**: admin generates batch → prints coupon sheet (thermal or A4) — separate print dialog

**Admin UI** (`/admin/coupons`)
- List all campaigns + redemption stats
- Create campaign (type, value, category, quantity, validity dates, min total)
- View individual codes and their redemption status
- Deactivate / expire a campaign

---

## Feature F — Queue System + TV Display + LINE Notification

### Queue flow
```
Walk-in → Service sold at POS → Tech creates queue → Status steps → Payment → Done
```

**Status stages**
1. รับรถ (Car checked in)
2. เปลี่ยนยาง (Tire change)
3. ถ่วงล้อ (Wheel balance)
4. ติดตั้งยาง (Install tire)
5. ตั้งศูนย์ล้อ (Wheel alignment)
6. รอชำระเงิน (Waiting for payment) ← LINE notification sent here
7. เสร็จแล้ว (Done) ← triggered by POS payment confirmation

Not all stages apply to every service — tech skips irrelevant stages.

**Queue model** (new MongoDB collection: `queues`)
```json
{
  "_id": "uuid",
  "queue_number": 42,
  "license_plate": "กข-1234",
  "customer_name": "สมศรี",
  "customer_phone": "0812345678",
  "service_id": "uuid",
  "status": "wheel_balance",
  "status_history": [
    { "status": "checked_in", "at": "ISO8601", "by": "user_id" }
  ],
  "line_notified": false,
  "created_at": "ISO8601",
  "completed_at": null
}
```

**TV display** (`/viewer/queue`)
- Split layout: left 60% = active queue list, right 40% = promotion slide loop
- Queue list: queue number + license plate + current status badge + elapsed time
- Auto-refreshes via polling or WebSocket (every 5 seconds)
- No login interaction — viewer role token stored persistently on TV browser

**Promotion slide loop**
- Admin uploads images and/or video files (`/admin/promotions`)
- Sets display duration per slide (seconds)
- TV cycles through slides continuously alongside queue
- Files stored in server `/data/promotions/` directory

**Admin control** (`/admin/queue`)
- View all active queues
- Manually update any queue status (override)
- View completed queues history

**Tech control** (new tab in tech view or `/tech/queue`)
- Create new queue: enter license plate, customer name, phone number, select service
- Step through status with one-tap buttons
- Close queue on completion

**POS integration**
- Payment confirmed at POS → `PUT /api/queues/:id/status` → `completed`

**LINE notification**
- When status moves to `รอชำระเงิน`: server calls LINE Messaging API → sends message to `customer_phone` (mapped to LINE user ID via LINE Login, or via LINE Notify if phone mapping unavailable)
- Message: "คุณลูกค้าครับ รถของท่าน [license_plate] พร้อมแล้ว กรุณามาชำระเงินที่เคาน์เตอร์"
- `line_notified: true` set after successful send

**New API endpoints**
```
GET    /api/queues              list active queues (TV polling)
POST   /api/queues              create queue (tech)
PUT    /api/queues/:id/status   update status (tech / POS)
GET    /api/queues/history      completed queues (admin)
GET    /api/promotions          list promotion slides (TV)
POST   /api/promotions          upload image/video (admin)
DELETE /api/promotions/:id      remove slide (admin)
```

---

## Open Questions (decide before implementation)

| # | Question | Default assumption |
|---|----------|-------------------|
| F1 | LINE channel setup — use LINE Notify (deprecated) or LINE Messaging API? | Messaging API (Notify is sunset) |
| F2 | TV device — dedicated browser kiosk or any TV with Chromecast? | Dedicated browser (Chrome kiosk mode) |
| D1 | ESC/POS library for Web Serial — `escpos-buffer` npm or raw byte commands? | `escpos-buffer` — cleaner API |
| A1 | Session token expiry for viewer role (TV) — 30 days rolling? | 365 days (TV should never expire) |
