# TireTrack — Pending Tasks

## 1. Remove Tire Brand Autocomplete
**Goal:** Input `bs` stays as `bs` — no expansion to `bridgestone` or any other brand.

- Find where autocomplete/suggestion logic runs on the tire brand field
- Delete or disable it entirely (do not replace with a different behavior)
- Verify: typing `bs` in the brand field submits `bs` as-is

---

## 2. Improve Migration Tools (CSV Import / Export)
**Goal:** Robust, predictable import and export of service and inventory data via CSV.

- Audit current import/export paths in `csv.service.js` and `inventory.service.js`
- Identify known failure modes (encoding, column order, missing fields, etc.)
- Improve error reporting so bad rows are reported, not silently dropped
- Verify: round-trip export → import produces identical data

---

## 3. Mobile POS Connection — Sunmi V2 Pro
**Goal:** Understand and document how TireTrack will communicate with the Sunmi V2 Pro device.

- Clarify protocol: USB serial, Bluetooth, or LAN?
- Identify which Sunmi SDK or ESC/POS library to use
- Decide whether integration lives in the server (Node.js) or client (browser/WebUSB)
- Define success: a test print or status ping from TireTrack to the device

---

## 4. Deploy on POS Client + Cash Drawer + Receipt Printer
**Goal:** TireTrack runs on the Sunmi V2 Pro and can trigger the cash drawer and receipt printer.

- Choose deployment target: Sunmi Android app (WebView) or PWA in Chrome?
- Wire receipt printing to service completion event
- Wire cash drawer open to payment confirmation event
- Verify: end-to-end flow — complete a service → receipt prints → drawer opens
