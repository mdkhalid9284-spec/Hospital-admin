# HospitalCare — Development & Delivery Phases

## Phase 0: Requirement Analysis & Specification
- Deliverables: All specification docs (`PRD.md`, `Architecture.md`, `Rules.md`, `Phases.md`, `Design.md`, `Memory.md`, `Security-Audit.md`, `Test-Strategy.md`, `Test-Plan.md`, `Requirements-Traceability-Matrix.md`, `Database-Design.md`, `API-Specification.md`).

## Phase 1: Project Foundation & Environment Setup
- Initialize root workspace, TypeScript configurations, backend (`Node.js/Express/TypeScript`), frontend (`React/Vite/Tailwind/TypeScript`), and environment templates.

## Phase 2: Authentication & Multi-Role RBAC Engine
- Argon2/bcrypt password hashing, JWT token issuance, refresh flow, progressive backoff rate-limiting, and server-side RBAC middleware.

## Phase 3: Patient Profile Management & Search
- Patient creation, update, profile retrieval, and role-filtered search API.

## Phase 4: Bed & Room Management with Atomic Concurrency
- Ward/Room/Bed models, real-time availability tracking, atomic allocation/release locks.

## Phase 5: Doctor Management & Specializations
- Doctor profiles, schedules, specialization tracking, doctor-patient assignment relations.

## Phase 6: Appointments & Double-Booking Prevention
- Slot reservation, double-booking prevention locks, appointment status lifecycle.

## Phase 7: Medical Records, Clinical Notes & Prescriptions
- Patient history, clinical observations, digital prescription builder with dosage, frequency, and instructions.

## Phase 8: Medical Document Management & Isolated Secure Storage
- Secure upload with magic-byte/MIME validation, categorization, authorized token streaming, and deletion audit.

## Phase 9: Billing, Payments & Insurance Claims
- Server-side authoritative charge calculation, payment status transitions, insurance claim lifecycle.

## Phase 10: Patient Admission & Discharge Lifecycles
- Complete admission workflow (validations, doctor/bed availability check, atomic binding) and discharge workflow (summary generation, bed release).

## Phase 11: Notification Engine & Real-Time Synchronization
- Event-driven notifications (email/SMS adapter with mock dev provider) and SSE real-time state broadcasts.

## Phase 12: Reports, Analytics & Audit Logging
- Operational metrics (bed occupancy, revenue, admissions) and immutable audit log streams.

## Phase 13: Frontend Multi-Portal UI
- Implement modern, accessible healthcare UI with dedicated portals:
  - Admin Portal
  - Doctor Portal
  - Patient Portal
  - Billing Staff Portal

## Phase 14: Verification, Automated Testing & Traceability
- Unit tests, integration tests, black-box tests (EP/BVA/DT), white-box tests (`V(G)=4`), E2E API tests (`ST-01..10`), and RTM matrix verification.

## Phase 15: Security Passes & Final Release
- 5-pass security audit (secret leak, PII flow, pre-deployment, deep vulnerability, attacker perspective), final build, and release packaging.
