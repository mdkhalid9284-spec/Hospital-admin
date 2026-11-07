export type UserRole = 'admin' | 'doctor' | 'patient' | 'billing';

export interface IUser {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  fullName: string;
  phone?: string;
  avatarUrl?: string;
  isActive: boolean;
  failedLoginAttempts: number;
  lockUntil?: string | null;
  lastLoginAt?: string | null;
  resetPasswordToken?: string | null;
  resetPasswordExpires?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IPatient {
  id: string;
  /** Linked portal account. Empty string means the record has no portal account yet. */
  userId: string;
  patientCode: string;
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
  assignedDoctorId?: string;
  currentAdmissionId?: string;
  /**
   * Normalised name + phone key used by a unique sparse index to make
   * concurrent duplicate registrations impossible across serverless
   * instances. It is intentionally cleared when an administrator explicitly
   * confirms that two same-name/phone records are genuinely different people.
   */
  identityKey?: string;
  createdAt: string;
  updatedAt: string;
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
  updatedAt: string;
}

export type AppointmentStatus = 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';

export interface IAppointment {
  id: string;
  appointmentCode: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  appointmentDate: string; // YYYY-MM-DD
  timeSlot: string; // e.g. "09:30 - 10:00"
  startTime?: string; // e.g. "09:30"
  endTime?: string; // e.g. "10:00"
  reason: string;
  status: AppointmentStatus;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  /**
   * Unique sparse keys written only for non-cancelled appointments. The
   * database unique indexes enforce conflict-free booking even when two
   * serverless instances handle requests concurrently. Cancelling an
   * appointment clears both keys so the slot is released.
   */
  doctorSlotKey?: string;
  patientSlotKey?: string;
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
  patientCode: string;
  patientDob: string;
  patientAge: number; // age in completed years at the time of prescribing
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
  storageProvider?: 'local' | 'vercel-blob';
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
  updatedAt: string;
}

export type ClaimStatus = 'Submitted' | 'Approved' | 'Rejected';

export interface IInsurancePolicy {
  id: string;
  patientId: string;
  provider: string;
  policyNumber: string;
  policyHolderName: string;
  coverageAmount: number;
  validUntil: string;
  createdAt: string;
}

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
  adjudicatedAt?: string | null;
  adjudicatedBy?: string | null;
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

export interface INotification {
  id: string;
  recipientId: string;
  recipientRole: UserRole;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'ALERT' | 'SUCCESS';
  isRead: boolean;
  link?: string;
  createdAt: string;
}

/* -------------------------------------------------------------------------- */
/* Clinical messaging                                                          */
/* -------------------------------------------------------------------------- */

export interface IConversation {
  id: string;
  patientId: string;
  patientName: string;
  /** Clinician the conversation is routed to, when known. */
  doctorId?: string;
  participantUserIds: string[];
  participantNames: string[];
  participantRoles: UserRole[];
  subject?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string;
  lastMessagePreview?: string;
}

export interface IMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  body: string;
  createdAt: string;
  readBy: string[];
}

export type TeleconsultationStatus = 'Active' | 'Ended';

export interface ITeleconsultation {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  roomName: string;
  joinUrl: string;
  provider: string;
  status: TeleconsultationStatus;
  startedBy: string;
  startedAt: string;
  endedAt?: string | null;
}
