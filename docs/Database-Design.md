# HospitalCare — Database Schema & Entity Relationship Design

## 1. Domain Data Model Architecture

HospitalCare uses a hybrid reconciled database pattern:
- **MongoDB**: Document-oriented schema for dynamic patient profiles, hierarchical wards/beds, clinical records, digital prescriptions, appointments, and medical document references.
- **Relational / SQL Engine (PostgreSQL / SQLite)**: Strictly structured financial ledgers (Invoices, Bill Items, Payments, Insurance Claims) and append-only immutable audit trail tables.

---

## 2. MongoDB Document Schemas

### 1. `users`
```typescript
interface IUser {
  _id: string; // ObjectId or UUID
  email: string; // unique, indexed
  passwordHash: string; // Argon2 / bcrypt hash
  role: 'admin' | 'doctor' | 'patient' | 'billing';
  fullName: string;
  phone?: string;
  avatarUrl?: string;
  isActive: boolean;
  failedLoginAttempts: number;
  lockUntil?: Date;
  lastLoginAt?: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

### 2. `patients`
```typescript
interface IPatient {
  _id: string;
  userId: string; // ref -> users._id
  patientCode: string; // unique, e.g. "PAT-1001"
  fullName: string;
  dob: string; // YYYY-MM-DD
  gender: 'male' | 'female' | 'other';
  bloodGroup?: string;
  phone: string;
  email: string;
  address: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  assignedDoctorId?: string; // ref -> doctors._id
  currentAdmissionId?: string; // ref -> admissions._id
  insurancePolicyId?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### 3. `doctors`
```typescript
interface IDoctor {
  _id: string;
  userId: string; // ref -> users._id
  doctorCode: string; // e.g. "DOC-201"
  fullName: string;
  specialization: string;
  department: string;
  qualification: string;
  phone: string;
  email: string;
  consultationFee: number;
  availableDays: string[];
  slotDurationMinutes: number;
  isActive: boolean;
}
```

### 4. `wards_rooms_beds`
```typescript
interface IWard {
  _id: string;
  name: string; // "ICU", "General Ward A", "Maternity"
  type: 'General' | 'ICU' | 'Semi-Private' | 'Emergency';
  totalBeds: number;
  availableBeds: number;
  rooms: {
    roomNumber: string;
    beds: {
      bedNumber: string;
      status: 'Available' | 'Occupied' | 'Reserved';
      currentPatientId?: string;
      currentAdmissionId?: string;
    }[];
  }[];
}
```

### 5. `admissions`
```typescript
interface IAdmission {
  _id: string;
  admissionCode: string; // "ADM-8001"
  patientId: string;
  doctorId: string;
  wardId: string;
  roomNumber: string;
  bedNumber: string;
  reason: string;
  admissionDate: Date;
  dischargeDate?: Date;
  status: 'Pending' | 'Admitted' | 'Discharged';
  dischargeSummary?: {
    diagnosis: string;
    treatmentGiven: string;
    adviceOnDischarge: string;
    dischargedBy: string;
    dischargedAt: Date;
  };
  createdAt: Date;
}
```

### 6. `appointments`
```typescript
interface IAppointment {
  _id: string;
  patientId: string;
  doctorId: string;
  appointmentDate: string; // YYYY-MM-DD
  timeSlot: string; // "10:00 - 10:30"
  reason: string;
  status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
  notes?: string;
  createdAt: Date;
}
```

### 7. `medical_records` & `prescriptions`
```typescript
interface IMedicalRecord {
  _id: string;
  patientId: string;
  doctorId: string;
  recordType: 'ClinicalNote' | 'Consultation' | 'LabReport';
  title: string;
  notes: string;
  vitalSigns?: {
    bloodPressure?: string;
    heartRate?: number;
    temperature?: number;
    spo2?: number;
  };
  createdAt: Date;
}

interface IPrescription {
  _id: string;
  patientId: string;
  doctorId: string;
  diagnosis: string;
  medicines: {
    medicineName: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions: string;
  }[];
  generalAdvice?: string;
  prescribedAt: Date;
}
```

### 8. `medical_documents`
```typescript
interface IMedicalDocument {
  _id: string;
  patientId: string;
  uploadedBy: string;
  category: 'Prescription' | 'Report' | 'Scan' | 'Bill' | 'Insurance' | 'Other';
  title: string;
  originalFilename: string;
  safeStorageKey: string;
  mimeType: string;
  fileSizeBytes: number;
  isExternalRecord: boolean;
  createdAt: Date;
}
```

---

## 3. Relational SQL Schemas (Financial & Audit Tables)

```sql
CREATE TABLE bills (
  id VARCHAR(64) PRIMARY KEY,
  patient_id VARCHAR(64) NOT NULL,
  admission_id VARCHAR(64),
  subtotal NUMERIC(12, 2) NOT NULL,
  discount NUMERIC(12, 2) DEFAULT 0,
  tax NUMERIC(12, 2) DEFAULT 0,
  total NUMERIC(12, 2) NOT NULL,
  amount_paid NUMERIC(12, 2) DEFAULT 0,
  balance NUMERIC(12, 2) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('Pending', 'Partially Paid', 'Paid')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bill_items (
  id VARCHAR(64) PRIMARY KEY,
  bill_id VARCHAR(64) REFERENCES bills(id) ON DELETE CASCADE,
  description VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL,
  quantity INT NOT NULL,
  unit_price NUMERIC(10, 2) NOT NULL,
  amount NUMERIC(10, 2) NOT NULL
);

CREATE TABLE insurance_claims (
  id VARCHAR(64) PRIMARY KEY,
  patient_id VARCHAR(64) NOT NULL,
  bill_id VARCHAR(64) REFERENCES bills(id),
  provider VARCHAR(100) NOT NULL,
  policy_number VARCHAR(100) NOT NULL,
  claim_amount NUMERIC(12, 2) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('Submitted', 'Approved', 'Rejected')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actor_id VARCHAR(64) NOT NULL,
  actor_role VARCHAR(50) NOT NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id VARCHAR(64) NOT NULL,
  status VARCHAR(20) NOT NULL,
  ip_address VARCHAR(45),
  details TEXT
);
```
