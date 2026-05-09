# TireTrack — ระบบจัดการร้านยาง

A lightweight, full-stack service management application for Thai tire shops. Built for daily use by shop owners and technicians — no database required, just a CSV file.

---

## Features

### Admin
| Feature | Description |
|---|---|
| **Dashboard** | Stats cards, monthly revenue area chart, recent service table |
| **Service Log** | Full searchable history of all service records |
| **Inventory** | Tire stock database with brand, size, model, and cost |
| **Import / Export** | Bulk import legacy CSV data, export all records |
| **Backup** | Manual and scheduled auto-backup to S3-compatible storage |
| **Receipt Settings** | Configure shop name and tax ID for printed receipts |

### Technician
| Feature | Description |
|---|---|
| **Quick Input** | 4-step guided form: service type → license plate → details → confirm |
| **Print Receipt** | Generate and print ใบกำกับภาษีอย่างย่อ (simplified tax invoice) before saving |
| **Recent Entries** | View and undo recent service records (within 30 minutes) |

---

## Tech Stack

**Frontend**
- [React 19](https://react.dev) + [Vite 8](https://vite.dev)
- [Tailwind CSS v4](https://tailwindcss.com)
- [React Router v7](https://reactrouter.com)
- [Recharts](https://recharts.org) — area chart, bar chart, pie chart
- [React Select](https://react-select.com) — searchable dropdowns
- Google Fonts: Manrope, Inter + Material Symbols Outlined

**Backend**
- [Express](https://expressjs.com) on Node.js (ESM)
- CSV flat-file storage — no database setup needed
- JWT-based PIN authentication
- [node-cron](https://github.com/node-cron/node-cron) — scheduled auto-backup
- [AWS SDK v3](https://github.com/aws/aws-sdk-js-v3) — S3-compatible backup (works with MinIO)

---

## Project Structure

```
tiretrack-app/
├── client/                     # React frontend
│   └── src/
│       ├── components/
│       │   ├── layout/         # Sidebar, TopHeader, MobileNav
│       │   └── ReceiptDocument.jsx
│       ├── pages/
│       │   ├── admin/          # Dashboard, ServiceLog, Inventory,
│       │   │                   # ImportExport, BackupSettings, ReceiptSettings
│       │   └── tech/           # QuickInput, RecentEntries
│       ├── contexts/           # AuthContext (JWT session)
│       ├── services/           # api.js (fetch wrapper)
│       └── utils/              # constants, formatters, receiptStorage
│
├── server/                     # Express backend
│   ├── routes/                 # auth, services, inventory, backup
│   ├── services/               # csv.service, backup.service
│   ├── middleware/             # auth.middleware
│   └── data/                   # services.csv, inventory.csv (auto-created)
│
├── .env.example
└── package.json                # npm workspaces root
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+

### 1. Clone and install

```bash
git clone https://github.com/your-username/tiretrack-app.git
cd tiretrack-app
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
PORT=3001
NODE_ENV=development

# PIN codes for login
ADMIN_PIN=9999
TECH_PIN=1234

# Session
SESSION_SECRET=change-me-to-something-random
SESSION_EXPIRY_HOURS=24

# S3 backup (optional — MinIO or AWS S3)
S3_ENDPOINT=https://s3.example.com
S3_BUCKET=tiretrack-app
S3_ACCESS_KEY=your_access_key
S3_SECRET_KEY=your_secret_key
S3_REGION=us-east-1
```

### 3. Run in development

```bash
npm run dev
```

This starts both servers concurrently:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3001`

### 4. Production build

```bash
npm run build    # builds client into client/dist
npm start        # starts the Express server
```

---

## User Roles

| Role | PIN (default) | Access |
|---|---|---|
| **Admin** | `9999` | Full access — dashboard, service log, inventory, backup, receipt settings |
| **Tech** | `1234` | Quick input and recent entries only |

> Change the PIN values in `.env` before deploying to production.

---

## Receipt Printing (ใบกำกับภาษีอย่างย่อ)

1. Go to **Operations → ใบเสร็จ** and fill in your shop name and 13-digit tax ID
2. Toggle VAT display on or off
3. On the technician **Quick Input** page, reach Step 4 (confirm) and click **พิมพ์ใบเสร็จ**
4. A receipt preview appears — click **พิมพ์** to send to any printer
5. The receipt is sized for **80 mm thermal paper** automatically via `@media print` CSS

---

## Backup to S3

- Configure S3 credentials in `.env`
- Go to **Operations → สำรองข้อมูล** to trigger a manual backup or enable auto-backup
- Compatible with AWS S3, MinIO, and any S3-compatible object storage

---

## Data Storage

All service and inventory records are stored as plain CSV files in `server/data/`. The files are created automatically on first run.

```
server/data/
├── services.csv    # all service records
└── inventory.csv   # tire stock
```

This makes it easy to open, edit, or migrate data with any spreadsheet tool.

---

## License

MIT
