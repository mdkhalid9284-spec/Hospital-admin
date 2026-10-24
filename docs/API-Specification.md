# HospitalCare — REST API Specification

## 1. Authentication & Security Endpoints (`/api/auth`)

### `POST /api/auth/register`
- **Access:** Public (Patients) / Admin (Staff & Doctors)
- **Body:** `{ "email": "...", "password": "...", "fullName": "...", "role": "patient", "phone": "..." }`
- **Response:** `201 Created` `{ "user": { "id", "email", "role", "fullName" }, "token": "..." }`

### `POST /api/auth/login`
- **Access:** Public
- **Body:** `{ "email": "...", "password": "..." }`
- **Response:** `200 OK` `{ "user": { "id", "email", "role", "fullName" }, "token": "..." }`

### `POST /api/auth/forgot-password`
- **Access:** Public
- **Body:** `{ "email": "..." }`
- **Response:** `200 OK` `{ "message": "Password reset token sent" }`

### `POST /api/auth/reset-password`
- **Access:** Public
- **Body:** `{ "token": "...", "newPassword": "..." }`
- **Response:** `200 OK` `{ "message": "Password successfully reset" }`

---

## 2. Patients API (`/api/patients`)

### `GET /api/patients`
- **Access:** Admin, Doctor (assigned only), Billing (demographics only)
- **Query:** `?search=John&page=1&limit=20`
- **Response:** `200 OK` `[ { "id", "patientCode", "fullName", "dob", "gender", "phone" } ]`

### `GET /api/patients/:id`
- **Access:** Admin, Assigned Doctor, Patient Self (IDOR Protected)
- **Response:** `200 OK` `{ "patient": { ... } }`

### `POST /api/patients`
- **Access:** Admin, Patient Registration
- **Body:** `{ "fullName", "dob", "gender", "phone", "email", "address", "emergencyContact" }`
- **Response:** `201 Created` `{ "patient": { ... } }`

---

## 3. Admissions & Bed Management API (`/api/admissions`, `/api/beds`)

### `GET /api/beds/board`
- **Access:** Admin, Doctor
- **Response:** `200 OK` `{ "wards": [ { "id", "name", "totalBeds", "availableBeds", "rooms": [ ... ] } ] }`

### `POST /api/admissions`
- **Access:** Admin
- **Body:** `{ "patientId", "doctorId", "wardId", "roomNumber", "bedNumber", "reason" }`
- **Response:** `201 Created` `{ "admission": { ... }, "bedAllocated": true }`

### `POST /api/admissions/:id/discharge`
- **Access:** Admin
- **Body:** `{ "dischargeSummary": { "diagnosis", "treatmentGiven", "adviceOnDischarge" } }`
- **Response:** `200 OK` `{ "admission": { ...status: "Discharged" }, "bedReleased": true }`

---

## 4. Doctors & Appointments API (`/api/doctors`, `/api/appointments`)

### `GET /api/doctors`
- **Access:** Authenticated Users
- **Response:** `200 OK` `[ { "id", "doctorCode", "fullName", "specialization", "department", "availableDays" } ]`

### `POST /api/appointments`
- **Access:** Admin, Patient (Self), Doctor
- **Body:** `{ "doctorId", "appointmentDate", "timeSlot", "reason" }`
- **Response:** `201 Created` `{ "appointment": { ... } }`

### `PATCH /api/appointments/:id/status`
- **Access:** Admin, Assigned Doctor
- **Body:** `{ "status": "Confirmed" | "Cancelled" | "Completed" }`
- **Response:** `200 OK` `{ "appointment": { ... } }`

---

## 5. Clinical Records & Prescriptions API (`/api/records`, `/api/prescriptions`)

### `POST /api/prescriptions`
- **Access:** Doctor Only
- **Body:** `{ "patientId", "diagnosis", "medicines": [ { "medicineName", "dosage", "frequency", "duration", "instructions" } ] }`
- **Response:** `201 Created` `{ "prescription": { ... } }`

### `POST /api/records/clinical-note`
- **Access:** Doctor Only
- **Body:** `{ "patientId", "title", "notes", "vitalSigns": { ... } }`
- **Response:** `201 Created` `{ "record": { ... } }`

---

## 6. Secure Documents API (`/api/documents`)

### `POST /api/documents/upload`
- **Access:** Authenticated (Admin, Doctor, Patient)
- **Form Data:** `file` (PDF, JPG, PNG <= 10MB), `patientId`, `category`, `title`
- **Response:** `201 Created` `{ "document": { "id", "title", "category", "fileSizeBytes", "createdAt" } }`

### `GET /api/documents/:id/download`
- **Access:** Authorized Role / Resource Owner
- **Response:** Binary Stream with safe Content-Disposition headers.

---

## 7. Billing & Insurance API (`/api/bills`, `/api/insurance`)

### `POST /api/bills`
- **Access:** Billing Staff, Admin
- **Body:** `{ "patientId", "admissionId", "items": [ { "description", "category", "quantity", "unitPrice" } ], "discount", "tax" }`
- **Response:** `201 Created` `{ "bill": { "id", "subtotal", "tax", "total", "status": "Pending" } }`

### `POST /api/bills/:id/payments`
- **Access:** Billing Staff, Admin
- **Body:** `{ "amountPaid": 250.00 }`
- **Response:** `200 OK` `{ "bill": { "amountPaid", "balance", "status": "Paid" | "Partially Paid" } }`

### `POST /api/insurance/claims`
- **Access:** Billing Staff, Admin
- **Body:** `{ "patientId", "billId", "provider", "policyNumber", "claimAmount" }`
- **Response:** `201 Created` `{ "claim": { "id", "status": "Submitted" } }`

---

## 8. Audit Logs & Analytics API (`/api/audit-logs`, `/api/analytics`)

### `GET /api/audit-logs`
- **Access:** Admin Only
- **Query:** `?page=1&limit=50&actorRole=doctor`
- **Response:** `200 OK` `[ { "id", "timestamp", "actorRole", "action", "resourceType", "status" } ]`

### `GET /api/analytics/summary`
- **Access:** Admin Only
- **Response:** `200 OK` `{ "totalPatients", "currentAdmissions", "bedOccupancyRate", "todayAppointments", "totalRevenue" }`
