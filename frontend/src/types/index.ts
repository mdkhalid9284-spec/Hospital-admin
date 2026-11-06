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
  updatedAt?: string;
}

export interface IConversation {
  id: string;
  patientId: string;
  patientName: string;
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

export interface ITeleconsultation {
  id: string;
  patientId: string;
  patientName: string;
  doctorId: string;
  doctorName: string;
  roomName: string;
  joinUrl: string;
  provider: string;
  status: 'Active' | 'Ended';
  startedBy: string;
  startedAt: string;
  endedAt?: string | null;
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
  patientAge: number;
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

export interface IAnalyticsRange {
  key: '7d' | '30d' | '90d' | '1y';
  fromDate: string;
  toDate: string;
  days: number;
}

export interface IRevenueTrendPoint {
  label: string;
  date: string;
  billed: number;
  collected: number;
}

export interface IOccupancyTrendPoint {
  label: string;
  date: string;
  occupiedBeds: number;
  totalBeds: number;
  occupancyRate: number;
}

export interface IBreakdownItem {
  label: string;
  count: number;
  percentage: number;
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
  range: IAnalyticsRange;
  newPatientsInRange: number;
  averageOccupancyRate: number;
  appointmentsInRange: number;
  grossBilled: number;
  insurerRecoveries: number;
  revenueTrend: IRevenueTrendPoint[];
  bedOccupancyTrend: IOccupancyTrendPoint[];
  consultationBreakdown: IBreakdownItem[];
  appointmentStatusBreakdown: IBreakdownItem[];
}
