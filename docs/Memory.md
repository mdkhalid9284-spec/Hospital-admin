# HospitalCare — Memory & Project State

## Project Status
- **Current Phase:** Phase 15 (Security Passes & Final Release) — Complete
- **Status:** Release-ready build
- **Timestamp:** 2026-10-22

## Architectural Decisions Log
1. **Database Boundaries:** MongoDB is authoritative for operational and clinical documents; SQL/PostgreSQL repository layer handles financial ledgers and transaction audit entries.
2. **Authentication:** Server-side JWT with Argon2/bcrypt password hashing, progressive rate-limiting, server-side token revocation on logout.
3. **Storage:** Isolated object storage with MIME + magic-byte validation and tokenized authorized streaming.
4. **Concurrency:** Atomic queries and locks for bed allocations and appointment booking to strictly prevent race conditions and double-occupancy.
5. **Persona Isolation:** Role derived solely from server-verified JWT; no frontend role switching; `quickSwitchDemo` removed from all authenticated interfaces.

## Completed Milestones
- [x] Initial Requirements Analysis & Reconciliation.
- [x] Implementation Plan approval.
- [x] Creation of all specification docs.
- [x] Backend foundation (Auth, RBAC, IDOR guards, all domain services).
- [x] Frontend multi-portal UI with four separate role-specific portals.
- [x] Security hardening: removed role-switching, revoked tokens on logout, restricted public registration to patient role, fixed forgot-password token leak, restricted CORS, enabled CSP/HSTS.
- [x] Backend IDOR hardening: doctors limited to assigned patients; admins blocked from altering clinical notes.
- [x] Fixed billing API endpoint mismatches (`/billing` → `/bills`, `/insurance` → `/insurance/claims`).
- [x] Replaced horizontal pill navigation with vertical left sidebar (desktop drawer + mobile drawer).
- [x] Premium 3D dimensional design system (layered surfaces, elevation, blue/cyan glow, press-depth buttons).
- [x] Responsive audit across 320–1920px breakpoints.
- [x] Accessible focus states, keyboard handling, `prefers-reduced-motion` support.

## Verification Results (Actual Runs)
- **Backend tests:** 6 files, 59 tests — ALL PASSED (unit V(G)=4, integration IT-01..08, system ST-01..10, black-box EP/BVA/DT, auth security AUTH-01..15, plus 10 direct security-verify probes: IDOR, role escalation, logout revocation, guessed IDs).
- **Frontend TypeScript:** `tsc --noEmit` — PASS (0 errors).
- **Frontend production build:** `vite build` — PASS.
- **Backend lint:** Pre-existing failure — no `eslint.config.js` for ESLint v9 (not introduced by this work).

## Remaining Blockers / Notes
- Backend lint script requires an `eslint.config.js` migration (ESLint v9) — pre-existing repository gap, unrelated to feature work.
- No live backend database credentials/object-storage cloud provider configured; in-memory/hybrid store runs locally per architecture. All workflows verified against local store.
- Frontend `dist/` output present; serve via `npm run preview` or deploy to static host pointing at `http://localhost:5000` API.

## Key Files Changed
Backend: `src/controllers/auth.controller.ts`, `src/middlewares/auth.middleware.ts`, `src/middlewares/rbac.middleware.ts`, `src/middlewares/audit.middleware.ts` (imports), `src/app.ts`, `src/routes/auth.routes.ts`, `src/routes/record.routes.ts`, `src/schemas/auth.schema.ts`
Frontend: `src/context/AuthContext.tsx`, `src/pages/Login.tsx`, `src/components/layout/AppSidebar.tsx`, `src/components/layout/PortalLayout.tsx`, `src/components/layout/Navbar.tsx`, `src/components/layout/PillNavbar.tsx`, `src/index.css`, `src/pages/admin/AdminDashboardPage.tsx`, `src/pages/doctor/DoctorDashboardPage.tsx`, `src/pages/patient/PatientDashboardPage.tsx`, `src/pages/billing/BillingDashboardPage.tsx`, `src/pages/billing/BillingReportsPage.tsx`, `src/pages/billing/BillingPatientsPage.tsx`, `src/pages/billing/BillingInvoicesPage.tsx`, `src/pages/patient/PatientBillingPage.tsx`, `src/vite-env.d.ts` (new)
Tests: `backend/tests/security_verify.test.ts` (new — 10 direct security probes)
Docs: `README.md`, `docs/Memory.md`
