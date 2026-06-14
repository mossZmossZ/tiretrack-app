# TireTrack — Project Instructions

> **This document is the single source of truth for the TireTrack project.**
> Read this file first before making any code changes.

---

## 1. What is TireTrack?

TireTrack is an **internal SaaS web application** for a small tire shop business in Thailand.
It replaces manual logbooks and Google Sheets with a streamlined digital service-recording system.

### Core Purpose

- **Record** all tire shop services (tire changes, wheel balance, alignment, etc.)
- **Search** vehicle history by license plate (ทะเบียนรถ)
- **Analyze** business data via admin dashboard
- **Backup** data from MongoDB to S3 (CSV-formatted snapshots), with import/export to CSV for manual fallback

### Service Types

| Service (EN)      | Service (TH)     | Data Detail Level |
| ----------------- | ---------------- | ----------------- |
| Tire Change       | เปลี่ยนยาง      | Full (brand, model, size, price/unit, qty) |
| Wheel Balance     | ถ่วงล้อ          | Minimal (date, plate, price, notes) |
| Wheel Alignment   | ตั้งศูนย์ล้อ     | Minimal (date, plate, price, notes) |
| Tire Switch       | สลับยาง          | Minimal (date, plate, price, notes) |
| Tire Pressure     | เช็คลมยาง        | Minimal (date, plate, price, notes) |
| Part Change       | เปลี่ยนอะไหล่   | Line-items (multiple parts per service, each with name, qty, price_per_unit) |

### Users

| Role       | Access                                          | Device     |
| ---------- | ----------------------------------------------- | ---------- |
| Admin (CEO) | Full: input, view, dashboard, analyze, import/export | Desktop PC & Mobile (responsive) |
| Technician | Input data, view recent entries, undo last input | Mobile phone (responsive) |

### Authentication

Simple **PIN code** per role. PINs are stored in `.env` server-side.
No user accounts, no OAuth. Small business — keep it simple.

---

## 2. Tech Stack

### Frontend

| Technology    | Version | Purpose                     |
| ------------- | ------- | --------------------------- |
| React         | 18+     | UI framework                |
| Vite          | 5+      | Build tool & dev server     |
| React Router  | 6+      | Client-side routing         |
| TailwindCSS   | 3+      | Utility-first CSS           |
| Material Symbols | —    | Icon set (Google Fonts CDN) |
| Recharts      | 2+      | Dashboard charts            |

### Backend

| Technology  | Version | Purpose                      |
| ----------- | ------- | ---------------------------- |
| Node.js     | 20+     | Runtime                      |
| Express.js  | 4+      | HTTP server & API framework  |
| MongoDB     | 7       | Primary data store           |
| mongodb (driver) | 6+ | Native Node Mongo driver     |
| dotenv      | —       | Environment config           |

### Data Layer

| Layer        | Storage       | Purpose                                |
| ------------ | ------------- | -------------------------------------- |
| Primary      | MongoDB 7     | Live data store (services, inventory)  |
| Import/Export| CSV (in-app)  | Admin upload/download for spreadsheet workflows |
| Backup       | MinIO S3      | CSV snapshots produced from MongoDB, restore via CSV reload |

### Design System

| Token       | Value                                  |
| ----------- | -------------------------------------- |
| Primary     | `#F97316` (Orange)                     |
| Background  | `#FFFFFF` (White)                      |
| Surface     | `#F8F9FF` (Light blue-gray)           |
| Text        | `#0D1C2F` (Dark navy)                 |
| Font Heading| Manrope (700, 800)                     |
| Font Body   | Inter (400, 500, 600)                  |
| Style       | Modern SaaS (Vercel/Stripe/Linear)    |
| UI Language | Thai (ภาษาไทย)                         |
| Border Radius | Rounded-lg to Rounded-xl            |

---

## 3. Folder Structure

```
tiretrack-app/
├── client/                     # Vite + React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/         # Sidebar, Header, MobileNav
│   │   │   └── common/         # Button, Input, Badge, Modal, etc.
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx   # PIN entry (shared)
│   │   │   ├── admin/          # Admin-only pages
│   │   │   │   ├── Dashboard.jsx
│   │   │   │   ├── ServiceLog.jsx
│   │   │   │   └── ImportExport.jsx
│   │   │   └── tech/           # Technician pages
│   │   │       ├── QuickInput.jsx
│   │   │       └── RecentEntries.jsx
│   │   │   ├── admin/
│   │   │   │   ├── PartsInventory.jsx  # คลังอะไหล่ CRUD page
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx  # PIN auth state
│   │   ├── services/
│   │   │   └── api.js           # Axios/fetch API client
│   │   ├── utils/
│   │   │   ├── constants.js     # Dropdown options, service types
│   │   │   └── formatters.js    # Date, currency, plate formatting
│   │   ├── hooks/
│   │   │   └── useServices.js   # Data fetching hook
│   │   ├── App.jsx              # Routes + layout
│   │   ├── main.jsx             # Entry point
│   │   └── index.css            # Tailwind directives + custom
│   ├── index.html
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── vite.config.js
│   └── package.json
│
├── server/                      # Node.js + Express backend
│   ├── routes/
│   │   ├── auth.routes.js              # POST /api/auth/login
│   │   ├── service.routes.js           # CRUD /api/services
│   │   ├── inventory.routes.js         # CRUD /api/inventory
│   │   ├── parts-inventory.routes.js   # CRUD /api/parts-inventory
│   │   └── backup.routes.js            # Backup/restore endpoints
│   ├── services/
│   │   ├── service.service.js          # MongoDB ops for `services` collection
│   │   ├── inventory.service.js        # MongoDB ops for `inventory` collection
│   │   ├── parts-inventory.service.js  # MongoDB ops for `parts_inventory` collection
│   │   └── backup.service.js           # Mongo → CSV → S3 backup & restore
│   ├── db/
│   │   └── mongo.js             # Connection lifecycle (connect/getDb/close)
│   ├── lib/
│   │   └── csv.js               # Shared CSV serialize/parse helpers
│   ├── middleware/
│   │   └── auth.middleware.js   # PIN session token check
│   ├── data/                    # On-disk config only
│   │   └── backup-config.json   # Auto-backup cron settings & status
│   ├── index.js                 # Express entry point (connects Mongo on boot)
│   └── package.json
│
├── docs/
│   ├── INSTRUCTIONS.md          # THIS FILE — project context
│   └── csv-design.md            # CSV schema & data design
│
├── .env.example                 # Environment variable template
├── .gitignore
├── Dockerfile                   # Production container
├── docker-compose.yml           # Local dev with hot-reload
├── package.json                 # Root workspace (npm workspaces)
└── README.md
```

---

## 4. App Architecture Layers

```
┌─────────────────────────────────────────────────────┐
│                    CLIENT (React)                     │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │  Admin    │  │   Tech   │  │   Shared          │  │
│  │  Pages    │  │   Pages  │  │   Components      │  │
│  └────┬─────┘  └────┬─────┘  └───────────────────┘  │
│       │              │                                │
│  ┌────┴──────────────┴─────┐                         │
│  │   AuthContext + Hooks    │                         │
│  └────────────┬────────────┘                         │
│               │  API calls (fetch)                   │
├───────────────┼──────────────────────────────────────┤
│               ▼                                      │
│           EXPRESS API                                 │
│  ┌─────────────────────────┐                         │
│  │   Routes (async)        │                         │
│  └────────────┬────────────┘                         │
│               │                                      │
│  ┌────────────▼────────────┐                         │
│  │   Service Modules       │  service / inventory    │
│  │   (Mongo driver calls)  │  + CSV import/export    │
│  └────────────┬────────────┘                         │
│               │                                      │
│  ┌────────────▼────────────┐                         │
│  │   MongoDB (Docker)      │  ← Primary store        │
│  │   tiretrack DB:         │                         │
│  │     services / inventory│                         │
│  └────────────┬────────────┘                         │
│               │  CSV snapshots                       │
│  ┌────────────▼────────────┐                         │
│  │   MinIO / S3            │  ← Backup target        │
│  └─────────────────────────┘                         │
└─────────────────────────────────────────────────────┘
```

---

## 5. API Endpoints

| Method | Endpoint                  | Auth     | Description                    |
| ------ | ------------------------- | -------- | ------------------------------ |
| POST   | `/api/auth/login`         | Public   | Verify PIN, return session token + role |
| GET    | `/api/auth/me`            | Any      | Check current session          |
| GET    | `/api/services`           | Any      | List services (paginated, filterable) |
| GET    | `/api/services/:id`       | Any      | Get single service record      |
| POST   | `/api/services`           | Any      | Create new service record      |
| DELETE | `/api/services/:id`       | Tech+    | Undo/delete (tech: own recent only) |
| GET    | `/api/services/search`    | Any      | Search by license plate        |
| GET    | `/api/services/stats`     | Admin    | Dashboard statistics           |
| POST   | `/api/services/import`    | Admin    | Import legacy CSV              |
| GET    | `/api/services/export`    | Admin    | Export all data as CSV         |
| GET    | `/api/inventory`               | Any      | List all tire inventory (used by Tech input) |
| POST   | `/api/inventory`               | Admin    | Create new tire model/cost price |
| PUT    | `/api/inventory/:id`           | Admin    | Edit tire model or price       |
| DELETE | `/api/inventory/:id`           | Admin    | Delete tire model              |
| POST   | `/api/inventory/import`        | Admin    | Bulk Import tire inventory     |
| GET    | `/api/inventory/export`        | Admin    | Export tire inventory          |
| GET    | `/api/parts-inventory`         | Any      | List all spare parts (used by Tech input) |
| POST   | `/api/parts-inventory`         | Admin    | Create new spare part          |
| PUT    | `/api/parts-inventory/:id`     | Admin    | Edit spare part                |
| DELETE | `/api/parts-inventory/:id`     | Admin    | Delete spare part              |

---

## 6. Team Roles & Working Agreement

### CEO (You)
- Assigns work and priorities
- Approves implementation plans
- Makes business decisions
- Deploys to Docker/Kubernetes

### Staff Software Engineer (AI Assistant)
- Designs architecture and data models
- Plans and analyzes requirements
- Writes production-quality, professional code
- Applies UX/UI design skills (modern SaaS aesthetic)
- Creates documentation and tests
- Reports progress and asks clarifying questions
- **Does NOT** make business decisions or deploy without CEO approval

---

## 7. Coding Conventions

- **Language**: JavaScript (ES modules, `import/export`)
- **Naming**: camelCase for variables/functions, PascalCase for components
- **API responses**: `{ success: boolean, data: any, error?: string }`
- **Error handling**: Try-catch with meaningful error messages
- **Comments**: In English (for code), Thai strings for UI labels
- **File naming**: kebab-case for files, PascalCase for React components
- **Git commits**: Conventional commits (`feat:`, `fix:`, `docs:`, `chore:`)

---

## 8. Data Reference

- See `docs/csv-design.md` for the field-level data dictionary. The same field set is now stored as MongoDB documents — the headers in `csv-design.md` correspond 1:1 with document keys.
- The `id` field on the wire maps to MongoDB's `_id` (stored as a string UUID, preserving the original CSV-era IDs).
- All values are stored as **strings** to match the legacy CSV behaviour. Numeric coercion (`Number(total_price)`, etc.) happens at the point of use, not at the storage layer.
- Legacy data format reference (with mapping rules) remains in `docs/csv-design.md` — the admin `Import CSV` feature still ingests that format.

### Collections

| Collection        | Purpose                                        | `_id` shape       |
| ----------------- | ---------------------------------------------- | ----------------- |
| `services`        | Service records (all types incl. part_change)  | 8-char UUID slice |
| `inventory`       | Tire SKUs with brand/size/cost                 | Full UUID         |
| `parts_inventory` | Spare part catalogue (name, category, cost)    | Full UUID         |

#### `part_change` service records

When `service_type === 'part_change'`, the service document carries a `parts` array instead of tire fields:

```json
{
  "service_type": "part_change",
  "parts": [
    { "part_id": "uuid", "name": "น้ำมันเครื่อง Shell Helix", "category": "น้ำมันเครื่อง", "qty": 2, "price_per_unit": "240", "cost_price": "200" }
  ],
  "total_price": "480"
}
```

`total_price` is auto-calculated server-side as `sum(price_per_unit × qty)` if not provided. Name and price are **snapshotted** onto each line item at save time so historical records are unaffected by future catalogue edits.

No secondary indexes are created — the dataset is small enough that the auto `_id` index covers the only by-key lookup pattern. Add indexes here if the dataset grows.

---

## 8.1 Database (MongoDB) — Setup

MongoDB is provisioned via `docker-compose.yml` at the repo root. The Node app connects on boot and exits if Mongo is unreachable.

### One-time setup

1. **Copy env template**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and change `MONGO_ROOT_PASSWORD` (and the password inside `MONGODB_URI` — they must match).

2. **Install deps**

   ```bash
   npm install
   ```

3. **Start MongoDB**

   ```bash
   docker compose up -d
   ```

   Wait for the container to be healthy:

   ```bash
   docker compose ps
   ```

4. **Start the app**

   ```bash
   npm run dev
   ```

   The server logs `🍃 Mongo connected` before `🚗 TireTrack API running...`.

### Day-to-day

| Action                 | Command                             |
| ---------------------- | ----------------------------------- |
| Start Mongo            | `docker compose up -d`              |
| Stop Mongo             | `docker compose stop`               |
| Tail Mongo logs        | `docker compose logs -f mongo`      |
| Shell into Mongo       | `docker compose exec mongo mongosh -u "$MONGO_ROOT_USERNAME" -p "$MONGO_ROOT_PASSWORD" --authenticationDatabase admin` |
| Wipe the database      | `docker compose down -v` (drops the named volume `mongo_data`) |

### Environment variables

| Variable               | Used by         | Purpose                                                   |
| ---------------------- | --------------- | --------------------------------------------------------- |
| `MONGO_ROOT_USERNAME`  | docker-compose  | Root user provisioned at container init                   |
| `MONGO_ROOT_PASSWORD`  | docker-compose  | Root password provisioned at container init               |
| `MONGODB_URI`          | Node server     | Full connection URI (credentials must match the two above)|
| `MONGODB_DB`           | Node server     | Database name (default `tiretrack`)                       |

### Choosing the right `MONGODB_URI` host

The host portion of `MONGODB_URI` depends on your Docker runtime:

| Runtime                          | Use                                                  |
| -------------------------------- | ---------------------------------------------------- |
| **OrbStack** (macOS)             | `tiretrack-mongo.orb.local:27017` — the container's auto-assigned DNS. The `127.0.0.1:27017` port forwarder under OrbStack breaks Mongo's wire-protocol handshake (`ECONNRESET` during SCRAM auth). |
| **Docker Desktop** / Linux       | `127.0.0.1:27017` — note: **not** `localhost`. Node 18+ resolves `localhost` to IPv6 first; Docker's IPv4-only port mapping then drops the connection. |

### CSV import/export still works

The CSV import/export feature is **not** the storage layer anymore — it's an admin convenience for spreadsheet workflows.

- **Export** (`GET /api/services/export`, `GET /api/inventory/export`) reads from Mongo and serializes to CSV (UTF-8 + BOM for Excel/Thai).
- **Import** (`POST /api/services/import`, `POST /api/inventory/import`) parses the legacy CSV format and inserts rows into Mongo.

### Backup / Restore against S3

`backup.service.js` now:

- **Backup**: reads each collection from Mongo, renders CSV, uploads `services.csv` and `inventory.csv` to S3 (same object keys as before — existing CSV backups remain restorable).
- **Restore**: downloads each `*.csv` from S3, parses it, **wipes the target collection** (`deleteMany({})`) and bulk-inserts. The wire-format on S3 is unchanged; only the post-download path is different.
- Auto-backup cron and the `backup-config.json` file on disk are unchanged.

### Production hardening checklist

The default `docker-compose.yml` is tuned for local development. Before deploying to a shared/production host:

- [ ] Change `MONGO_ROOT_PASSWORD` to a long random value.
- [ ] Restrict the published port further (currently `127.0.0.1:27017:27017`) or remove the `ports:` mapping entirely if the backend runs on the same Docker network.
- [ ] Create a non-root application user (`db.createUser(...)`) scoped to the `tiretrack` DB and switch `MONGODB_URI` over to it.
- [ ] Enable TLS for Mongo connections if the database lives off-host.
- [ ] Schedule S3 backups via the admin UI (Phase 5 backup config).

---

---

## 9. Receipt / Bill System

Two receipt types are supported. Both are client-side only (no server involvement) — config is stored in `localStorage` and documents are printed via `window.print()`.

### ใบกำกับภาษีอย่างย่อ (Tax Invoice)

| Item | Detail |
| ---- | ------ |
| Settings route | `/admin/receipt` |
| Sidebar label | ตั้งค่าใบกำกับภาษี |
| localStorage key | `tiretrack_receipt_config` |
| Config fields | `shop_name` (required), `tax_id` (required, 13 digits), `address` (optional), `vat_registered` (bool) |
| Document heading | ใบกำกับภาษีอย่างย่อ |
| VAT breakdown | Shown when `vat_registered = true` |

### บิลเงินสด (Cash Bill)

| Item | Detail |
| ---- | ------ |
| Settings route | `/admin/cashbill` |
| Sidebar label | ตั้งค่าบิลเงินสด |
| localStorage key | `tiretrack_cashbill_config` |
| Config fields | `address` (optional only) |
| Document heading | บิลเงินสด |
| VAT breakdown | Never shown |

### Print flow (QuickInput / Tech view)

After saving a service, two buttons appear side by side:
- **พิมพ์ใบกำกับภาษี** — opens `ReceiptModal` using `tiretrack_receipt_config`
- **พิมพ์บิลเงินสด** — opens `CashBillModal` using `tiretrack_cashbill_config`

Both modals render `ReceiptDocument` with the appropriate `type` prop (`'tax_invoice'` or `'cash_bill'`).

### Key files

| File | Role |
| ---- | ---- |
| `client/src/components/ReceiptDocument.jsx` | Shared document renderer; `type` prop controls header/heading/VAT |
| `client/src/utils/receiptStorage.js` | localStorage read/write for both configs |
| `client/src/pages/admin/ReceiptSettings.jsx` | ใบกำกับภาษี settings page |
| `client/src/pages/admin/CashBillSettings.jsx` | บิลเงินสด settings page |

---

## 10. Phase Roadmap

| Phase | Scope | Status |
| ----- | ----- | ------ |
| Phase 1 | CSV storage, PIN auth, Tech input, Admin log, Basic dashboard, Import/Export | ✅ Done |
| Phase 2 | Optional license plate feature, Data Edit features, UX improvements | ✅ Done |
| Phase 3 | SweetAlert confirmations, Resilient API timeouts, UI polish | ✅ Done |
| Phase 4 | Tire Inventory System, Dynamic Cost & Net Profit tracking, Inventory Import/Export | ✅ Done |
| Phase 5 | S3 Backup & Restore, Auto-backup scheduling with MinIO | ✅ Done |
| Phase 6 | MongoDB migration (CSV → Mongo), docker-compose for local Mongo | ✅ Done |
| Phase 6.1 | Dual receipt types: ใบกำกับภาษีอย่างย่อ and บิลเงินสด | ✅ Done |
| Phase 6.2 | เปลี่ยนอะไหล่ service type with คลังอะไหล่ (spare parts inventory, line-items per service) | ✅ Done |
| Phase 7 | Google Sheets integration, Advanced analytics | 📋 Planned |
| Phase 8 | Docker/K8s deployment, Performance optimization | 📋 Planned |

---

*Last updated: 2026-06-06*
*Maintainer: Staff Software Engineer (AI)*
