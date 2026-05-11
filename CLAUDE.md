# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Commands

### Development
```bash
npm run dev           # Start both client (Vite) and server concurrently
npm run dev:client   # Start only client at http://localhost:5173
npm run dev:server   # Start only server at http://localhost:3001
npm run build         # Build client for production
npm start             # Start production server (requires npm run build first)
```

### Client
```bash
cd client
npm run lint          # Run ESLint
npm run dev           # Start Vite dev server
npm run build         # Build for production
```

### Server
```bash
cd server
npm run dev           # Start server with --watch for hot reload
npm run start         # Start in production mode
```

### Useful for debugging
```bash
# Check API health
curl http://localhost:3001/api/health

# MongoDB connection string (in .env)
MONGODB_URI=mongodb://localhost:27017/tiretrack
```

---

## Architecture Overview

### Monorepo Structure (npm workspaces)
```
tiretrack-app/
├── client/                    # React 19 + Vite + React Router v7
├── server/                    # Express + MongoDB with Mongoose
└── package.json              # Root workspace config
```

### Frontend Stack
- **React 19** with Hooks (no context/Redux state management beyond AuthContext)
- **Vite 8** — build tool with HMR
- **React Router v7** — client-side routing (not the custom screen state from old docs)
- **Tailwind CSS v4** — utility-first styling
- **Recharts** — charts (area, bar, pie)
- **React Select** — searchable dropdowns
- **SweetAlert2** — modal dialogs

**Key locations:**
- Pages: `client/src/pages/admin/` (Dashboard, ServiceLog, Inventory, etc.) and `client/src/pages/tech/` (QuickInput, RecentEntries)
- Components: `client/src/components/` (layout, ReceiptDocument for printing)
- Contexts: `client/src/contexts/AuthContext.jsx` (JWT session + role-based access)
- Services: `client/src/services/api.js` (fetch wrapper with auth headers)
- Utils: `client/src/utils/` (constants, formatters, receipt storage logic)

### Backend Stack
- **Express** on Node.js (ESM modules)
- **MongoDB + Mongoose** — primary data store
- **node-cron** — scheduled auto-backup
- **AWS SDK v3** — S3-compatible backup (MinIO, AWS S3)
- **CSV fallback** — legacy data import/export via `csv-parser` and `csv-writer`

**Key locations:**
- Models: `server/models/` (Service, Inventory, RecycleBin with Mongoose schemas)
- Routes: `server/routes/` (auth, service, inventory, backup, recycle)
- Services: `server/services/` (csv, backup, inventory, receipt helpers)
- Middleware: `server/middleware/auth.middleware.js` (JWT verification)
- Migration: `server/scripts/migrate-csv-to-mongo.js` (one-time CSV → MongoDB migration)

### Data Flow
1. **Login:** PIN sent to `/api/auth/login` → JWT token stored in localStorage
2. **Service Records:** Tech enters via QuickInput → saved to MongoDB Service model → prints receipt
3. **Inventory:** Admin manages tire stock → CRUD operations on Inventory model
4. **Backup:** Manual or auto-backup exports MongoDB data → S3-compatible storage
5. **Recycle Bin:** Deleted records soft-deleted in RecycleBin model (soft delete pattern)

---

## Development Guidelines

### Frontend: Adding a New Admin Page
1. Create page in `client/src/pages/admin/NewPage.jsx`
2. Add route in `client/src/App.jsx` under the admin `<Route>` element
3. Add menu item in `client/src/components/layout/Sidebar.jsx`
4. Use `api.js` methods for API calls (ensures JWT in headers)
5. Style with Tailwind; use `focus-visible:ring-*` for focus states (accessibility)

### Backend: Adding a New Route
1. Create route handler in `server/routes/new.routes.js`
2. Use `authMiddleware` to protect routes (auto-extracts user role)
3. Add data validation before database operations
4. Import and register route in `server/index.js`
5. MongoDB queries use Mongoose models (Service, Inventory, RecycleBin)

### Authentication
- Routes are protected via JWT in Authorization header
- `authMiddleware` extracts user role (`admin` or `tech`) and attaches to `req.user`
- Frontend maintains JWT in localStorage via `AuthContext`
- Roles control UI visibility and API access (admin sees all, tech sees only quick input/recent entries)

### Data Validation
- Backend validates all incoming data before MongoDB operations
- Frontend can show error toasts via `SweetAlert2` on failed API calls
- Server returns 400 for validation errors, 401 for auth failures, 500 for server errors

### CSV Export/Import (Legacy Support)
- `csv.service.js` handles export/import logic
- Used by ImportExport page for bulk migrations
- Legacy CSV data can be migrated to MongoDB via `migrate-csv-to-mongo.js` script

### Backup Service
- Auto-backup runs on schedule (configured in .env via `BACKUP_SCHEDULE` cron pattern)
- Exports MongoDB data as CSV → uploads to S3
- Manual trigger available in admin Backup Settings page
- S3 endpoint can be AWS S3 or MinIO (configured in .env)

---

## Environment Setup

Create `.env` in the root (both client and server read from root `.env`):

```env
# Server
PORT=3001
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/tiretrack

# Auth
ADMIN_PIN=9999
TECH_PIN=1234
SESSION_SECRET=your-random-secret-here
SESSION_EXPIRY_HOURS=24

# S3 Backup (optional)
S3_ENDPOINT=https://s3.example.com
S3_BUCKET=tiretrack-app
S3_ACCESS_KEY=your_access_key
S3_SECRET_KEY=your_secret_key
S3_REGION=us-east-1
BACKUP_SCHEDULE=0 2 * * *  # 2 AM daily (cron format)

# Vite (frontend)
VITE_API_BASE_URL=http://localhost:3001
```

---

## Code Patterns

### Fetch with Auth (Frontend)
```javascript
// client/src/services/api.js provides a wrapper
const response = await api.post('/services', { ... });
// Automatically includes JWT from localStorage and error handling
```

### Protected Route (Frontend)
Routes in `App.jsx` use `<ProtectedRoute allowedRole="admin">` to gate access by role.

### Database Query (Backend)
```javascript
// Use Mongoose models (Service, Inventory, RecycleBin)
const service = await Service.findById(id);
await Service.deleteOne({ _id: id }); // Hard delete
```

### Soft Delete (Backend)
New records go to RecycleBin model instead of permanent deletion, allowing undo within 30 minutes.

---

## Known Constraints

- **No direct CSV storage:** App uses MongoDB. CSV is only for import/export and legacy migration.
- **Receipt printing:** Sized for 80mm thermal paper via `@media print` CSS — test on actual printer.
- **PIN auth, not password:** Users log in with a 4-digit PIN, reset via admin environment variable.
- **CORS:** API is hardcoded to accept `http://localhost:5173` in dev. Update `server/index.js` for production.
- **Timezone:** All dates stored in UTC; client formats for Thai locale via `formatters.js`.

---

## Before Submitting Changes

1. Run `npm run lint` in client directory (ESLint)
2. Test both admin and tech routes locally
3. If adding a route, verify JWT middleware is applied
4. If modifying Mongoose models, check migrations (no auto-migration)
5. Receipt printing: test on actual 80mm printer if changed
