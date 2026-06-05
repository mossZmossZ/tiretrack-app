# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run both client and server in development (from root)
npm run dev

# Run only the server (port 3001)
npm run dev:server

# Run only the client (port 5173)
npm run dev:client

# Build the frontend for production
npm run build

# Lint the frontend
npm run lint --workspace=client
```

There are no automated tests. No test runner is configured.

## Architecture

This is an npm workspaces monorepo with two packages: `client/` (React + Vite) and `server/` (Express + Node.js).

**Data layer**: All persistence is flat CSV files at `server/data/services.csv` and `server/data/inventory.csv`. There is no database. The `csv.service.js` and `inventory.service.js` files implement all CRUD directly on these files using custom CSV parsing (not a library). The entire file is rewritten on every update or delete.

**Auth**: PIN-based only. Two PINs (`ADMIN_PIN`, `TECH_PIN`) from `.env`. On login, the server creates a UUID token stored in an in-memory `Map` in `auth.middleware.js` (sessions are lost on server restart). The token is stored in `localStorage` on the client and sent as `Authorization: Bearer <token>`.

**Two user roles**:
- `admin` — full access to all routes; uses `AdminLayout` (sidebar + top header)
- `tech` — limited to QuickInput and RecentEntries; uses `TechLayout` (mobile-first, bottom nav)

**Routing**: React Router v7 with `ProtectedRoute` wrapper in `App.jsx`. Admins land at `/admin/dashboard`, techs at `/tech/input`. Unknown roles redirect to the appropriate default.

**API client** (`client/src/services/api.js`): thin wrapper over `fetch` with a 10-second timeout. All calls go to `/api/*` which Vite proxies to `http://localhost:3001` in development.

**Backup**: S3-compatible (MinIO) backup of both CSV files via `backup.service.js`. Supports manual trigger and cron-based auto-backup. Config is persisted to `server/data/backup-config.json`.

## API Response Shape

All API responses follow `{ success: boolean, data?: any, error?: string }`.

## Coding Conventions

- JavaScript ES modules (`import`/`export`) throughout — no TypeScript, no CommonJS
- React components: PascalCase filenames; variables/functions: camelCase
- UI strings are in Thai (ภาษาไทย); code comments in English
- Git commits follow Conventional Commits (`feat:`, `fix:`, `chore:`, etc.)

## Design System

- Primary color: `#F97316` (orange)
- Background: `#F8F9FF` (`bg-surface` Tailwind token)
- Text: `#0D1C2F`
- Icons: Google Material Symbols (loaded via CDN in `index.html`)
- Fonts: Manrope (headings), Inter (body)
- UI style: modern SaaS (Vercel/Linear aesthetic), rounded-lg/xl borders

## Key Constants

`client/src/utils/constants.js` defines the canonical lists used across the app:
- `SERVICE_TYPES` — the 5 service types with Thai labels and icon names
- `TIRE_BRANDS` — brand codes and display labels
- `TIRE_SIZES`, `CAR_COLORS`, `PROVINCES` — dropdown options

`client/src/utils/formatters.js` — date formatting uses Buddhist Era (CE + 543), currency uses Thai Baht (฿).

## Coding Guidelines (Karpathy)

### Think Before Coding
- State assumptions explicitly. If uncertain, ask — don't silently pick an interpretation.
- If multiple approaches exist, present them rather than choosing without saying so.
- If something is unclear, stop and name what's confusing before proceeding.

### Simplicity First
- Write the minimum code that solves the problem. No speculative features, no unrequested abstractions.
- No error handling for impossible scenarios. No "flexibility" that wasn't asked for.
- If a solution is 200 lines and could be 50, rewrite it.

### Surgical Changes
- Touch only what the task requires. Don't improve adjacent code, comments, or formatting.
- Match existing style even if you'd do it differently.
- Remove imports/variables/functions that *your* changes made unused — but leave pre-existing dead code alone unless asked.
- Every changed line should trace directly to the user's request.

### Goal-Driven Execution
- Transform vague tasks into verifiable outcomes before starting.
- For multi-step tasks, state a brief plan with a verification check per step.

## Environment Setup

Copy `.env.example` to `.env` at the root. Required variables:
- `ADMIN_PIN` / `TECH_PIN` — login PINs
- `PORT` — server port (default 3001)
- `SESSION_EXPIRY_HOURS` — session lifetime (default 24)
- `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` — only needed for backup/restore features
