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
- **Backup** data to CSV files (Phase 1) and Google Sheets (Phase 2) for manual fallback

### Service Types

| Service (EN)      | Service (TH)     | Data Detail Level |
| ----------------- | ---------------- | ----------------- |
| Tire Change       | เปลี่ยนยาง      | Full (brand, model, size, price/unit, qty) |
| Wheel Balance     | ถ่วงล้อ          | Minimal (date, plate, price, notes) |
| Wheel Alignment   | ตั้งศูนย์ล้อ     | Minimal (date, plate, price, notes) |
| Tire Switch       | สลับยาง          | Minimal (date, plate, price, notes) |
| Tire Pressure     | เช็คลมยาง        | Minimal (date, plate, price, notes) |

### Users

| Role       | Access                                          | Device     |
| ---------- | ----------------------------------------------- | ---------- |
| Admin (CEO) | Full: input, view, dashboard, analyze, import/export | Desktop PC |
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
| csv-parser / csv-writer | — | CSV read/write          |
| dotenv      | —       | Environment config           |

### Data Layer

| Phase   | Storage       | Purpose                        |
| ------- | ------------- | ------------------------------ |
| Phase 1 | CSV files     | Local flat-file, easy to debug |
| Phase 2 | Google Sheets | Cloud sync, manual fallback    |

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
│   │   ├── auth.routes.js       # POST /api/auth/login
│   │   └── service.routes.js    # CRUD /api/services
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   └── service.controller.js
│   ├── services/
│   │   └── csv.service.js       # CSV read/write/append logic
│   ├── middleware/
│   │   └── auth.middleware.js   # PIN session token check
│   ├── data/                    # CSV data storage (gitignored)
│   │   ├── services.csv         # Main service records
│   │   └── legacy/              # Imported legacy data
│   ├── index.js                 # Express entry point
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
│  │   Routes → Controllers  │                         │
│  └────────────┬────────────┘                         │
│               │                                      │
│  ┌────────────▼────────────┐                         │
│  │   CSV Service Layer     │  ← Phase 1              │
│  │   (Google Sheets Layer) │  ← Phase 2              │
│  └────────────┬────────────┘                         │
│               │                                      │
│  ┌────────────▼────────────┐                         │
│  │   /server/data/*.csv    │  ← Flat-file storage    │
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
| GET    | `/api/inventory`          | Any      | List all inventory (used by Tech input) |
| POST   | `/api/inventory`          | Admin    | Create new tire model/cost price |
| PUT    | `/api/inventory/:id`      | Admin    | Edit tire model or price       |
| DELETE | `/api/inventory/:id`      | Admin    | Delete tire model              |
| POST   | `/api/inventory/import`   | Admin    | Bulk Import tire inventory     |
| GET    | `/api/inventory/export`   | Admin    | Export tire inventory          |

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

- See `docs/csv-design.md` for the complete CSV schema and data dictionary
- Legacy data format reference is documented there with mapping rules

---

## 9. Phase Roadmap

| Phase | Scope | Status |
| ----- | ----- | ------ |
| Phase 1 | CSV storage, PIN auth, Tech input, Admin log, Basic dashboard, Import/Export | ✅ Done |
| Phase 2 | Optional license plate feature, Data Edit features, UX improvements | ✅ Done |
| Phase 3 | SweetAlert confirmations, Resilient API timeouts, UI polish | ✅ Done |
| Phase 4 | Tire Inventory System, Dynamic Cost & Net Profit tracking, Inventory Import/Export | ✅ Done |
| Phase 5 | Google Sheets integration, Advanced analytics | 📋 Planned |
| Phase 6 | Docker/K8s deployment, Performance optimization | 📋 Planned |

---

*Last updated: 2026-04-18*
*Maintainer: Staff Software Engineer (AI)*
