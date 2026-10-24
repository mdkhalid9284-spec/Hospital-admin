export type UserRole = 'admin' | 'doctor' | 'patient' | 'billing';

export interface IUser {
  id: string;
  email: string;
  role: UserRole;
  fullName: string;
  phone?: string;
  patientId?: string;
  doctorId?: string;
}

export interface IPatient {
  id: string;
  userId: string;
  patientCode: string;
  fullName: string;
  dob: string;
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
  assignedDoctorId?: string;
  currentAdmissionId?: string;
  createdAt: string;
}

export interface IDoctor {
  id: string;
  userId: string;
  doctorCode: string;
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
  assignedPatientIds: string[];
}

export type BedStatus = 'Available' | 'Occupied' | 'Reserved';

export interface IBed {
  bedNumber: string;
  status: BedStatus;
  currentPatientId?: string | null;
  currentPatientName?: string | null;
  currentAdmissionId?: string | null;
  allocatedAt?: string | null;
}

export interface IRoom {
  roomNumber: string;
  beds: IBed[];
}

export interface IWard {
  id: string;
  name: string;
  type: 'General' | 'ICU' | 'Semi-Private' | 'Emergency' | 'Maternity';
  totalBeds: number;
  availableBeds: number;
  occupiedBeds: number;
  rooms: IRoom[];
}

export type AdmissionStatus = 'Pending' | 'Admitted' | 'Discharged';

export interface IDischargeSummary {
  diagnosis: string;
  treatmentGiven: string;
  adviceOnDischarge: string;
  followUpDate?: string;
  dischargedBy: string;
  dischargedAt: string;
}

export interface IAdmission {
  id: string;
  admissionCode: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  wardId: string;
  wardName: string;
  roomNumber: string;
  bedNumber: string;
  reason: string;
  admissionDate: string;
  dischargeDate?: string | null;
  status: AdmissionStatus;
  dischargeSummary?: IDischargeSummary | null;
  createdAt: string;
}

export type AppointmentStatus = 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';

export interface IAppointment {
  id: string;
  appointmentCode: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  appointmentDate: string;
  timeSlot: string;
  reason: string;
  status: AppointmentStatus;
  notes?: string;
  createdAt: string;
}

export interface IMedicalRecord {
  id: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  recordType: 'ClinicalNote' | 'Consultation' | 'Diagnosis' | 'LabReport';
  title: string;
  notes: string;
  vitalSigns?: {
    bloodPressure?: string;
    heartRate?: number;
    temperature?: number;
    spo2?: number;
  };
  createdAt: string;
}

export interface IPrescriptionMedicine {
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export interface IPrescription {
  id: string;
  prescriptionCode: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  diagnosis: string;
  medicines: IPrescriptionMedicine[];
  generalAdvice?: string;
  prescribedAt: string;
}

export type DocumentCategory = 'Prescription' | 'Report' | 'Scan' | 'Bill' | 'Insurance' | 'Other';

export interface IMedicalDocument {
  id: string;
  patientId: string;
  patientName?: string;
  uploadedBy: string;
  uploaderRole: UserRole;
  category: DocumentCategory;
  title: string;
  originalFilename: string;
  safeStorageKey: string;
  mimeType: string;
  fileSizeBytes: number;
  isExternalRecord: boolean;
  createdAt: string;
}

export type BillStatus = 'Pending' | 'Partially Paid' | 'Paid';

export interface IBillItem {
  id: string;
  description: string;
  category: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface IBill {
  id: string;
  billCode: string;
  patientId: string;
  patientName: string;
  admissionId?: string | null;
  items: IBillItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  amountPaid: number;
  balance: number;
  status: BillStatus;
  createdAt: string;
}

export type ClaimStatus = 'Submitted' | 'Approved' | 'Rejected';

export interface IInsuranceClaim {
  id: string;
  claimCode: string;
  patientId: string;
  patientName: string;
  billId: string;
  provider: string;
  policyNumber: string;
  claimAmount: number;
  approvedAmount?: number;
  status: ClaimStatus;
  remarks?: string;
  submittedAt: string;
}

export interface IAuditLog {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  resourceType: string;
  resourceId: string;
  status: 'SUCCESS' | 'FAILURE';
  ipAddress?: string;
  details?: Record<string, any>;
}

export interface IAnalyticsSummary {
  totalPatients: number;
  currentAdmissions: number;
  totalBeds: number;
  availableBeds: number;
  occupiedBeds: number;
  occupancyRate: number;
  todayAppointments: number;
  totalRevenue: number;
  pendingRevenue: number;
  pendingInsuranceClaims: number;
  recentActivityCount: number;
}
