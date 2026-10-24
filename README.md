# HospitalCare — Integrated Hospital & Patient Management System

HospitalCare is a centralized, production-grade healthcare management web platform engineered for Hospital Administrators, Medical Doctors, In-Patients/Out-Patients, and Billing & Insurance Officers.

---

## 1. System Features & Modules

- **Multi-Role Authentication & Access Control:**
  - Admin, Doctor, Patient, and Billing Staff portals.
  - Server-side role validation and resource-level IDOR protection guards.
  - Progressive backoff rate-limiting on authentication routes.
- **Patient Profile Management:**
  - Registration, search filtering with field-level role-based sanitization.
  - Demographic tracking, contact details, and emergency contacts.
- **Bed & Room Management:**
  - Real-time visual bed matrix across Wards (ICU, General, Semi-Private, Maternity).
  - Status tracking (`Available`, `Occupied`, `Reserved`) with atomic allocation and concurrency locking.
- **Hospital Admission & Discharge Workflow:**
  - Complete admission lifecycle engine verified against Basis Path testing ($V(G) = 4$).
  - Clinical discharge summary generation with automatic atomic bed release.
- **Doctor Clinical Portal:**
  - Assigned patients overview, medical record viewer.
  - Clinical observation notes recorder with vital signs ($BP, Pulse, Temp, SpO_2$).
  - Multi-drug digital prescription generator with dosage, frequency, and instructions.
- **Patient Portal:**
  - Self-service consultation booking, active admission status, medical history.
  - External hospital/OPD record uploader, invoice viewer, and insurance claim tracking.
- **Authoritative Billing & Insurance:**
  - Server-side authoritative charge calculation with line items, tax, and discounts.
  - Multi-state payment processing (`Pending`, `Partially Paid`, `Paid`).
  - Insurance claim lifecycle (`Submitted`, `Approved`, `Rejected`).
- **Secure Medical Document Management:**
  - PDF & Image storage with MIME type, file size, extension, and **magic-byte verification**.
  - Tokenized, authorized file streaming endpoints and audit-logged deletion.
- **Operational Analytics & Security Audit Trail:**
  - Non-clinical dashboards (bed occupancy rate, admission trends, realized revenue).
  - Tamper-evident, immutable security audit log stream.

---

## 2. Technology Stack & Reconciled Architecture

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, React Router, Axios.
- **Backend:** Node.js, Express, TypeScript, REST API, Zod Schema Validation, Helmet, Rate-Limiters.
- **Databases:**
  - **MongoDB (Authoritative Store):** Operational healthcare records, patient profiles, hierarchical wards/beds, clinical notes, prescriptions, and medical documents.
  - **Relational SQL Component (PostgreSQL / SQLite):** Financial billing ledgers, invoice items, payments, and immutable audit logs.
- **File Storage:** Isolated local & cloud object storage with magic-byte verification.

---

## 3. Quick Start & Setup

### Prerequisites
- Node.js (v18+)
- npm (v9+)

### Installation
```bash
# Clone or navigate to the repository root
cd d:/HOSPITAL

# Install all workspace dependencies
npm install
```

### Environment Configuration
Copy `.env.example` to `.env` (or run with defaults):
```bash
cp .env.example .env
```

### Running in Development
```bash
# Start both backend and frontend concurrently
npm run dev

# Or start services individually:
# Backend (Port 5000):
npm run dev --workspace=backend

# Frontend (Port 5173):
npm run dev --workspace=frontend
```

Open your browser at: `http://localhost:5173`

---

## 4. Demo Test Accounts (Development Only)

The platform includes pre-configured demo test accounts with Argon2/Bcrypt hash verification. These are **development-only credential conveniences** — they prefill legitimate accounts on the Login page but cannot select or assert an arbitrary server-side role. The authenticated role is always determined server-side from the database. This convenience is disabled in production.

| Role | Email | Password | Scope |
| :--- | :--- | :--- | :--- |
| **Hospital Admin** | `admin@hospitalcare.demo` | `Admin@123` | Full hospital operational control, bed board, admissions, audits |
| **Medical Doctor** | `doctor@hospitalcare.demo` | `Doctor@123` | Assigned patients, clinical notes, digital prescriptions |
| **Patient** | `patient@hospitalcare.demo` | `Patient@123` | Own records, appointments, document uploads, bills |
| **Billing Staff** | `billing@hospitalcare.demo` | `Billing@123` | Invoicing, payment receipts, insurance claim processing |

**No role switching exists in authenticated navigation.** Persona is fixed per authenticated session and enforced server-side via JWT + RBAC + IDOR guards.

---

## 5. Automated Verification & Test Suite

Run the full automated test suite containing unit, integration, black-box, and system tests:

```bash
# Run backend test suite (35 automated tests across 4 suites)
npm test --workspace=backend

# Run with test coverage
npm run test:coverage --workspace=backend
```

### Test Coverage Highlights:
- **Unit Basis Path Tests (`V(G) = 4`):** Verifies all 4 independent branches of the Patient Admission engine.
- **Black-Box Tests (`TC-EP-01..05`, `TC-BVA-01..03`, `TC-DT-01..05`):** Equivalence Partitioning, Boundary Value Analysis, and Decision Table execution.
- **Integration Tests (`IT-01` to `IT-08`):** Multi-module transactions from Authentication to Bed Allocation and Discharge.
- **System E2E Tests (`ST-01` to `ST-10`):** Full end-to-end user journeys including IDOR guard validation and rate-limit backoffs.

---

## 6. Project Documentation
Comprehensive architectural and engineering documentation is available in `/docs`:
- [`/docs/PRD.md`](./docs/PRD.md)
- [`/docs/Architecture.md`](./docs/Architecture.md)
- [`/docs/Rules.md`](./docs/Rules.md)
- [`/docs/Phases.md`](./docs/Phases.md)
- [`/docs/Design.md`](./docs/Design.md)
- [`/docs/Memory.md`](./docs/Memory.md)
- [`/docs/Security-Audit.md`](./docs/Security-Audit.md)
- [`/docs/Test-Strategy.md`](./docs/Test-Strategy.md)
- [`/docs/Test-Plan.md`](./docs/Test-Plan.md)
- [`/docs/Requirements-Traceability-Matrix.md`](./docs/Requirements-Traceability-Matrix.md)
- [`/docs/Database-Design.md`](./docs/Database-Design.md)
- [`/docs/API-Specification.md`](./docs/API-Specification.md)
