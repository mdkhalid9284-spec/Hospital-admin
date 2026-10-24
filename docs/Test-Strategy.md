# HospitalCare — Comprehensive Test Strategy

## 1. Testing Objectives
The HospitalCare test strategy ensures full requirement validation, high test coverage, multi-layered security verification, and predictable failure-handling across all healthcare operational workflows.

## 2. Test Levels & Methods

### Unit Testing
- **Scope:** Pure functions, validators, financial calculators, schema rules, encryption/token utilities, and state transition machines.
- **Framework:** Vitest / Jest.

### Integration Testing
- **Scope:** API routes, multi-module transactions (Admission -> Bed -> Doctor link), DB persistence, storage stream authorization, and audit interceptors.
- **Tools:** Supertest with in-memory / local test database.

### System & End-to-End Testing (ST-01 to ST-10)
- **Scope:** End-to-end user journeys simulating real browser interactions across Admin, Doctor, Patient, and Billing staff roles.

### Security & Penetration Testing
- **Scope:** IDOR vulnerability probes, injection payloads, rate-limit threshold validation, malicious file upload attempts.

---

## 3. Black-Box Test Design Techniques

### 1. Equivalence Partitioning (EP)
- Inputs partitioned into valid and invalid equivalence classes (e.g. Valid Registered Patient vs. Unregistered ID; Valid Available Bed vs. Occupied/Reserved Bed).

### 2. Boundary Value Analysis (BVA)
- Boundary checks on numerical and size limits:
  - Bed availability count: 0 (boundary), 1 (boundary), N.
  - File upload size: 10MB - 1 byte, 10MB exact, 10MB + 1 byte.
  - Rate limiting count: 5 attempts (allowed), 6th attempt (throttled).

### 3. Decision Table Testing (DT)
- Truth table modeling all conditions required for patient admission ($C_1$ Patient Registered, $C_2$ Details Valid, $C_3$ Bed Available, $C_4$ Doctor Available).

### 4. State Transition Testing
- Verifying strict lifecycle transitions for:
  - Admission: `Pending` -> `Admitted` -> `Discharged`.
  - Bed: `Available` -> `Occupied` -> `Available`.
  - Bill: `Pending` -> `Partially Paid` -> `Paid`.
  - Claim: `Submitted` -> `Approved` / `Rejected`.

---

## 4. White-Box Test Design Techniques

### Cyclomatic Complexity & Basis Path Testing
- For Patient Admission validation engine ($V(G) = 4$), the test suite guarantees 100% decision/branch coverage over all 4 basis paths:
  - **Path 1:** All validations pass -> Bed allocated -> Doctor assigned -> Admission recorded.
  - **Path 2:** Patient validation fails -> Admission rejected (HTTP 400).
  - **Path 3:** Bed unavailable / occupied -> Admission rejected (HTTP 409).
  - **Path 4:** Doctor unavailable -> Admission rejected (HTTP 409).
