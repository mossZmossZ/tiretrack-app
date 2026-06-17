# TireTrack — Pending Tasks


## 2. Improve Migration Tools (CSV Import / Export)
**Goal:** Robust, predictable import and export of service and inventory data via CSV.

- Audit current import/export paths in `csv.service.js` and `inventory.service.js`
- Identify known failure modes (encoding, column order, missing fields, etc.)
- Improve error reporting so bad rows are reported, not silently dropped
- Verify: round-trip export → import produces identical data

---

# Goal Features
> Designed 2026-06-17. Full spec: `docs/superpowers/specs/2026-06-17-goal-features-design.md`
> Implement in order — each feature unblocks the next.

---

## G1. Auth + RBAC + Session Management
**Goal:** Replace two shared global PINs with per-user accounts, persistent sessions, and admin session control.

- Create `users` collection: name + bcrypt-hashed numeric PIN (4–8 digits) + role
- Create `sessions` collection: replaces in-memory Map — survives server restarts
- 3 roles: `admin` (full), `tech` (QuickInput + RecentEntries + Queue), `viewer` (Dashboard + TV, read-only)
- Bootstrap: if no users exist on boot, seed "Admin" from `ADMIN_PIN` env var
- Security: `SESSION_SECRET` signs tokens, max 5 login attempts then cooldown, lockout timer shown on UI
- Build `/admin/users` — CRUD users, assign roles, activate/deactivate
- Build `/admin/sessions` — list active sessions, force logout, ban user
- Multiple sessions per user allowed (one per device)
- Verify: server restart → all devices stay logged in; 6th wrong PIN → cooldown shown

---

## G2. Lazy Load / Code Split
**Goal:** Split the Vite bundle by route and role so tech phones never download admin code.

- Replace eager imports in `App.jsx` with `React.lazy()` per route
- Wrap each lazy route in `<Suspense fallback={<LoadingSpinner />}>`
- Chunk strategy: `login`, `admin/*` (per page), `tech/*`, `viewer/*`
- Verify: Chrome DevTools Network tab shows separate chunks loading per route

---

## G3. Backup Improvement
**Goal:** Give admin full visibility into backup health, safe restore verification, and automatic retention cleanup.

- Add health dashboard to `/admin/backup`: last backup time + status + file size + next scheduled
- Restore dry-run: download → parse → insert into temp collections → show row-count diff → require admin confirm before live wipe
- Retention policy: admin sets "keep last N backups" (default 30), auto-delete oldest from S3 on each new backup
- Store retention config in `backup-config.json` alongside existing cron settings
- Verify: trigger restore → see diff summary → confirm → live data replaced correctly

---

## G4. POS Device Integration
**Goal:** Browser-based main POS triggers USB receipt printer and USB cash drawer; Sunmi V2 Pro used as mobile stock-count scanner.

**Main POS (Windows/Android Box + Chrome):**
- Build `usePrinter()` hook: Web Serial API → ESC/POS commands → USB thermal printer
- Build `useDrawer()` hook: Web Serial API → cash drawer open command → USB
- Build `/admin/printer` setup page: connect devices, test print, test drawer open
- Wire printer to service completion; wire drawer to payment confirmation
- Replaces `window.print()` receipt flow

**Sunmi V2 Pro (mobile stock endpoint):**
- Build `/tech/stock` page: barcode scan field (keyboard emulation) → SKU lookup → show stock → update quantity
- No Sunmi SDK required
- Verify: scan tire barcode → stock count updates in MongoDB

---

## G5. Coupon System
**Goal:** Admin generates and tracks coupons; cashier inputs code at POS checkout; coupons print on receipts or standalone.

- Create `coupons` collection: code, campaign name, type (฿ / % / free service), category, value, max uses, validity dates
- Admin UI at `/admin/coupons`: create campaign, set quantity (batch generate N unique codes), view redemption stats, deactivate
- Batch generation: N unique codes created in one operation, all sharing campaign settings
- Multi-use codes: `max_uses > 1` with `uses_count` counter
- POS cashier input: coupon code field at checkout → validate (active, not expired, uses remaining, min total) → apply discount
- Print mode 1: coupon code + QR printed at bottom of service receipt
- Print mode 2: standalone coupon sheet (admin generates batch → prints separately)
- Verify: generate 30 codes → redeem one at POS → discount applied → code marked used

---

## G6. Queue System + TV Display + LINE Notification
**Goal:** Walk-in customers get a queue number; status displays on a TV with promotion slides; LINE notification sent when car is ready.

**Queue stages:** รับรถ → เปลี่ยนยาง → ถ่วงล้อ → ติดตั้งยาง → ตั้งศูนย์ล้อ → รอชำระเงิน → เสร็จแล้ว

**Tech UI (`/tech/queue`):**
- Create queue: license plate, customer name, phone number, service type
- One-tap status advancement buttons; skip irrelevant stages
- Close queue on completion

**TV display (`/viewer/queue`):**
- Split screen: left 60% active queue list (number + plate + status + elapsed time), right 40% promotion slides
- Auto-refresh every 5 seconds (polling or WebSocket)
- Viewer role token stored persistently on TV browser (365-day expiry)

**Admin (`/admin/queue`, `/admin/promotions`):**
- View and override any queue status
- Upload images/videos for promotion slide loop; set duration per slide
- Files stored in `server/data/promotions/`

**POS integration:**
- Payment confirmed → `PUT /api/queues/:id/status` → `completed` automatically

**LINE notification:**
- Status moves to `รอชำระเงิน` → server calls LINE Messaging API → message sent to customer phone
- Message: "คุณลูกค้าครับ รถของท่าน [plate] พร้อมแล้ว กรุณามาชำระเงินที่เคาน์เตอร์"

**New API endpoints:** `GET/POST /api/queues`, `PUT /api/queues/:id/status`, `GET/POST/DELETE /api/promotions`

- Verify: create queue → advance to รอชำระเงิน → LINE message received → confirm payment → queue shows เสร็จแล้ว on TV
