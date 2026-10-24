# HospitalCare — Requirements Traceability Matrix (RTM)

## Functional Requirements Traceability Matrix

| Req ID | Requirement Description | Module / Component | Implementation Code | Test Case ID | Verification Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **FR1** | User Login & Authentication | Auth Module | `auth.controller.ts`, `auth.service.ts` | FT1, ST-10, IT-01 | Verified |
| **FR1.1** | Patient Login | Auth Module | `auth.controller.ts` | FT1.1, IT-01 | Verified |
| **FR1.2** | Admin Login | Auth Module | `auth.controller.ts` | FT1.2, ST-01 | Verified |
| **FR1.3** | Doctor Login | Auth Module | `auth.controller.ts` | FT1.3, ST-03 | Verified |
| **FR1.4** | Invalid Login Handling & Rate Limit | Security Middleware | `rateLimiter.ts`, `auth.service.ts` | FT1.4, ST-10 | Verified |
| **FR2** | Registration Input Validation | Validation Layer | `auth.schema.ts`, `zod` | FT2, TC-EP-03 | Verified |
| **FR3** | Role-Based Access Control (RBAC) | Auth Middleware | `rbac.middleware.ts` | NFT1, ST-07 | Verified |
| **FR4** | Secure Password Reset Tokens | Auth Module | `auth.service.ts` | FT4 | Verified |
| **FR5** | Secure Session Logout | Auth Module | `auth.controller.ts` | FT5 | Verified |
| **FR6** | Patient Profile Management | Patient Module | `patient.controller.ts` | FT6, IT-02 | Verified |
| **FR7** | Hospital Admission Management | Admission Module | `admission.service.ts` | TC-EP-01, ST-01, IT-02 | Verified |
| **FR7.1** | Admission History Tracking | Admission Module | `admission.controller.ts` | FT7.1, IT-05 | Verified |
| **FR8** | Bed Allocation | Bed & Room Module | `bed.service.ts` | TC-EP-01, IT-03 | Verified |
| **FR8.1** | Real-Time Bed Availability Board | Bed & Room Module | `bed.controller.ts`, `sse.service.ts` | FT8.1, TC-BVA-01 | Verified |
| **FR8.2** | Bed Status Transitions | Bed & Room Module | `bed.service.ts` | TC-EP-04, ST-02 | Verified |
| **FR9** | Discharge Processing & Bed Release | Discharge Module | `discharge.service.ts` | ST-09, IT-08 | Verified |
| **FR10** | Doctor Assignment to Patient | Doctor Module | `doctor.service.ts` | IT-04, TC-DT-01 | Verified |
| **FR11** | View Assigned Patients (Doctor) | Doctor Portal | `doctor.controller.ts` | ST-03, IT-04 | Verified |
| **FR12** | View Patient Medical History | Medical Records | `record.controller.ts` | ST-03, IT-06 | Verified |
| **FR13** | Digital Prescription Generator | Clinical Module | `prescription.service.ts` | ST-04 | Verified |
| **FR14** | Clinical Medical Notes | Clinical Module | `record.service.ts` | ST-04, IT-06 | Verified |
| **FR15** | Upload Medical Documents | Document Storage | `document.service.ts` | IT-07, ST-06 | Verified |
| **FR16** | View Authorized Documents | Document Storage | `document.controller.ts` | ST-05, ST-07 | Verified |
| **FR17** | Download Authorized Documents | Document Storage | `document.service.ts` | ST-05, ST-07 | Verified |
| **FR18** | Upload External Records (Patient)| Document Storage | `document.controller.ts` | ST-06, IT-07 | Verified |
| **FR19** | Document Categorization | Document Storage | `document.schema.ts` | FT19, ST-06 | Verified |
| **FR20** | Authorized Edit/Delete Document | Document Storage | `document.controller.ts` | FT20 | Verified |
| **FR21** | Authoritative Bill Generation | Billing Module | `bill.service.ts` | ST-08, IT-08 | Verified |
| **FR22** | Insurance Policy Management | Insurance Module | `insurance.service.ts` | FT22 | Verified |
| **FR23** | Insurance Claim Tracking | Insurance Module | `insurance.controller.ts`| FT23 | Verified |
| **FR24** | Payment Status Management | Billing Module | `bill.controller.ts` | ST-08, IT-08 | Verified |
| **FR25** | Appointment Booking & Slots | Appointment Module | `appointment.service.ts`| FT25 | Verified |
| **FR26** | Double Booking Prevention | Appointment Module | `appointment.service.ts`| FT26 | Verified |
| **FR27** | Notification System | Notification Module| `notification.service.ts`| FT27 | Verified |
| **FR28** | Role-Sanitized Patient Search | Search Module | `patient.service.ts` | FT28 | Verified |
| **FR29** | Immutable Audit Logging | Audit Module | `audit.middleware.ts` | FT29, NFT3 | Verified |

---

## Non-Functional Requirements Traceability Matrix

| NFR ID | Requirement Description | Implementation Mechanism | Test Case ID | Status |
| :--- | :--- | :--- | :--- | :--- |
| **NFR1** | Performance & 500-User Workload | Efficient indexing, lean payloads, async I/O | NFT-PERF-01 | Verified |
| **NFR2** | RBAC & IDOR Security | Server-side role guard + resource ownership validator | NFT-SEC-01, ST-07 | Verified |
| **NFR3** | Usability & Accessible UI | WCAG compliant colors, responsive layout, intuitive navigation | NFT-UI-01 | Verified |
| **NFR4** | Reliability & Zero Data Loss | Database atomic transactions, strict error handling | NFT-REL-01, ST-09 | Verified |
