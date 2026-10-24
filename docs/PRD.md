# HospitalCare — Product Requirements Document (PRD)

## 1. Document Overview
- **Project Name:** Integrated Hospital & Patient Management System (HospitalCare)
- **Version:** 1.0.0
- **Classification:** Production-Quality Healthcare Enterprise Prototype
- **Target Audience:** Hospital Administrators, Medical Doctors, In-Patients/Out-Patients, Billing & Insurance Officers.

---

## 2. Problem Statement & Motivation
Modern hospitals face operational bottlenecks caused by disjointed systems: fragmented medical records, non-transparent bed allocation resulting in double bookings or delays, delayed discharges, vulnerable document storage, and error-prone billing.
**HospitalCare** addresses these challenges by delivering a secure, centralized, role-based platform that unifies patient lifecycle management, real-time bed & room allocation, clinical workflows (prescriptions, medical notes), document management, appointment booking, authoritative billing, and comprehensive audit tracking.

---

## 3. Scope & System Boundaries

### In Scope
1. **Multi-Role Authentication & Access Control:** Admin, Doctor, Patient, Billing Staff with server-side enforcement.
2. **Patient Management:** Registration, profiles, demographic history, emergency contacts, search filtering.
3. **Hospital Admission & Real-Time Bed Management:** Multi-ward/room bed allocation with atomic reservation and concurrency locks.
4. **Doctor Clinical Portal:** Patient assignment, electronic prescriptions, clinical notes, medical records access.
5. **Patient Portal:** Medical history access, appointment booking, document upload/download, billing & insurance review.
6. **Billing & Insurance:** Authoritative server-side cost calculation, multi-state payment processing, insurance claim lifecycle.
7. **Discharge Management:** Clinical discharge summary generation, automated atomic bed release.
8. **Secure Document Management:** Categorized medical document storage with MIME/magic-byte validation and tokenized streaming.
9. **Audit Logging & Analytics:** Tamper-evident logging of sensitive actions, operational dashboards (occupancy, revenue, admissions).
10. **Notification Engine:** Event-driven notification dispatch for appointments, admissions, discharge, and bills (with mockable dev provider).

### Explicitly Out of Scope
- Automatic AI clinical diagnosis or treatment recommendation.
- Automated radiological scan interpretation (X-Ray/CT/MRI).
- Online pharmacy fulfillment / medicine dispatch.
- Direct external hospital EHR federations.
- Live video telemedicine.
- Blood bank, ambulance dispatch, and full hospital physical inventory.

---

## 4. User Personas & Permissions

| Role | Primary Responsibilities | Scope of Data Access |
| :--- | :--- | :--- |
| **Hospital Admin** | Hospital operations, user provisioning, admissions, bed/room allocations, doctor assignments, audits, analytics. | Global hospital operational data. Restricted from altering clinical notes/prescriptions directly. |
| **Doctor** | Consultation, clinical notes recording, digital prescriptions, document review, assigned patient history. | Assigned patients only. Restricted from modifying billing or system configurations. |
| **Patient** | Appointment scheduling, personal medical history review, external records upload, bills & insurance tracking. | Strictly own records. Zero access to other patients' data. |
| **Billing Staff** | Invoice generation, line-item charge addition, payment updates, insurance claim tracking. | Patient billing and insurance records. No access to private clinical notes. |

---

## 5. Functional Requirements Summary (FR1 - FR29)
- **FR1 - FR5:** User Login (multi-role, progressive backoff rate-limiting, failed attempts logging), Registration Validation, RBAC Server-side enforcement, Password Reset (single-use, short-lived tokens), Secure Session Termination (Logout).
- **FR6:** Patient Profile Management (demographics, emergency contacts, role-restricted field exposure).
- **FR7 - FR7.1:** Hospital Admission & History (lifecycle: Pending -> Admitted -> Discharged).
- **FR8 - FR8.2:** Bed/Room Allocation (states: Available, Occupied, Reserved; atomic concurrency protection).
- **FR9:** Discharge Processing (discharge summary generation, atomic bed release).
- **FR10 - FR14:** Doctor Management, Assignment, Assigned Patient List, Medical History View, Digital Prescriptions, Clinical Notes.
- **FR15 - FR20:** Medical Document Upload/View/Download, External Record Upload, Document Categorization (Prescription, Report, Scan, Bill, Insurance, Other), Authorized File Deletion & Audit.
- **FR21 - FR24:** Authoritative Server-Side Bill Generation, Payment Status (Pending, Partially Paid, Paid), Insurance Details & Claim Tracking (Submitted, Approved, Rejected).
- **FR25 - FR27:** Appointment Booking, Double-booking Prevention, Status Management, Notification Dispatch.
- **FR28:** Patient Search with role-based field sanitization.
- **FR29:** Security & Operational Audit Logging (actor, action, resource, result, timestamp, IP, correlation ID).

---

## 6. Non-Functional Requirements (NFR1 - NFR4)
- **NFR1: Performance & Scalability:** Standard pages and queries respond under 500ms (P95) and full patient profile loads well under 10 seconds under concurrent load of 500 simulated users.
- **NFR2: Security & Privacy:** Zero IDOR vulnerabilities, all endpoints protected by RBAC + ownership checks, OWASP Top 10 compliance, input validation via Zod schemas, secure password hashing (Argon2/bcrypt), strict Helmet headers, CSP, and CORS policies.
- **NFR3: Usability & Accessibility:** Clean, responsive healthcare UI conforming to WCAG AA contrast standards, intuitive navigation across all four portals.
- **NFR4: Reliability & Data Integrity:** ACID transactions for financial and bed allocation operations, zero data loss, safe error handling without stack trace leakage.
