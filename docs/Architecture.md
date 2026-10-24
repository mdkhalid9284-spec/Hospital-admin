# HospitalCare — System Architecture & Technology Reconciliation

## 1. Architecture Overview
HospitalCare is built as a multi-tier, decoupled, full-stack web application designed for high security, data integrity, and role separation.

```
+-----------------------------------------------------------------------+
|                           CLIENT TIER                                 |
|   React 18 + TypeScript + Vite + Tailwind CSS + Lucide Icons         |
|   - Admin Portal    - Doctor Portal   - Patient Portal   - Billing    |
+-----------------------------------+-----------------------------------+
                                    | HTTPS / JSON REST / SSE
                                    v
+-----------------------------------------------------------------------+
|                        API & BUSINESS LOGIC TIER                      |
|   Node.js + Express + TypeScript                                      |
|   - Helmet Security Headers & CORS Guard                              |
|   - Progressive Backoff Rate Limiter                                  |
|   - JWT & Session Auth Middleware                                     |
|   - Role-Based Access Control (RBAC) & IDOR Resource Guard            |
|   - Zod Schema Validation Pipeline                                    |
|   - Centralized Error Handler & Audit Log Interceptor                 |
+-------------------+-------------------+-------------------+-----------+
                    |                   |                   |
                    v                   v                   v
+-----------------------+ +-----------------------+ +-------------------+
|      PRIMARY DB       | |    RELATIONAL / SQL   | |  SECURE STORAGE   |
|   MongoDB (Mongoose)  | | PostgreSQL / SQLite   | | Isolated Object   |
| - Users & Auth        | | - Financial Ledgers   | | Storage Engine    |
| - Patients & History  | | - Invoices & Items    | | - Magic Bytes     |
| - Beds & Admissions   | | - Insurance Claims    | | - MIME Validation |
| - Clinical Records    | | - Transaction Audits  | | - Token Streaming |
+-----------------------+ +-----------------------+ +-------------------+
```

---

## 2. Requirements & Database Reconciliation

### Problem Statement & Requirements Conflict
1. Project instructions specify a MERN stack (MongoDB).
2. Handwritten instructions specify "one traditional database (SQL)".
3. HLD/SRS mention Firebase Authentication / Firestore & Firebase Storage.

### Architectural Decision & Authority Boundary
To avoid redundant duplication and inconsistent state across multiple databases, the system establishes strict domain boundaries:

| Domain / Entity | Authoritative Store | Rationale |
| :--- | :--- | :--- |
| **Users, Auth, Roles, Patient Profiles** | **MongoDB** | Fast, flexible demographic documents, profile expansion, hierarchical data. |
| **Wards, Rooms, Beds, Admissions** | **MongoDB** (with atomic operations) | Document nesting for ward hierarchies and embedded admission status. |
| **Medical Records, Prescriptions, Notes** | **MongoDB** | Rich, non-uniform clinical observations, dynamic medication arrays. |
| **Document Metadata & Safe Keys** | **MongoDB** | Storage key mapping, metadata, tags, and category indexing. |
| **Billing Ledgers, Invoices, Line Items** | **PostgreSQL / SQL Adapter** | Strict relational consistency, ACID financial guarantees, transactional balance. |
| **Insurance Policies & Claims** | **PostgreSQL / SQL Adapter** | Multi-table relational integrity linking policies, claims, adjudications. |
| **Immutable Security Audit Log** | **PostgreSQL / SQL & MongoDB stream** | Relational append-only ledger for non-repudiation and regulatory compliance. |
| **Medical Files / Binary Blobs** | **Object Storage Engine** | Isolated filesystem / Firebase Storage adapter with tokenized signed proxying. |

---

## 3. Real-Time Data Architecture
Real-time state synchronization (bed occupancy changes, appointment confirmations, and user alerts) is driven by **Server-Sent Events (SSE) / WebSocket notifications** backed by database change listeners and event emitters, ensuring live updates on the Admin bed board and Doctor dashboard without polling.

---

## 4. Hardware Interface Adapters
Clean software abstractions (`IBarcodeScanner`, `IDocumentScanner`, `ILabelPrinter`) are provided in the architecture to allow future hardware connectivity without touching core business logic.

---

## 5. Security & Isolation Model
1. **Zero Client Trust:** All authorization and calculations are verified server-side.
2. **Layered Defense:** Network filtering, Rate limiting, Token verification, Role check, Resource Ownership check.
3. **Storage Isolation:** Uploaded files are renamed with safe UUID keys and stored outside the web root. Files are served exclusively through authorized streaming routes after permission verification.
