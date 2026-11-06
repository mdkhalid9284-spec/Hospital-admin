import mongoose, { Schema, Model } from 'mongoose';

/**
 * Generic Mongo schemas for the HospitalCare domain collections.
 *
 * `strict: false` is intentional: the existing TypeScript domain objects are
 * the source of truth for their shape, and this persistence layer must not
 * silently drop newly added fields. Only the fields that need database-level
 * integrity constraints are declared explicitly.
 */

const flagged = (unique = false) => ({
  type: String,
  ...(unique ? { unique: true, sparse: true } : {}),
});

const baseSchema = (collection: string, extra: Record<string, unknown> = {}): Schema =>
  new Schema(
    {
      id: { type: String, required: true, unique: true, index: true },
      ...extra,
    },
    {
      strict: false,
      versionKey: false,
      minimize: false,
      collection,
    }
  );

const models = new Map<string, Model<any>>();

const getModel = (name: string, collection: string, extra: Record<string, unknown> = {}): Model<any> => {
  const existing = models.get(collection);
  if (existing) return existing;

  const cached = mongoose.models[name] as Model<any> | undefined;
  const model = (cached ??
    mongoose.model<any>(name, baseSchema(collection, extra))) as Model<any>;
  models.set(collection, model);
  return model;
};

export const persistenceModels = {
  patients: () =>
    getModel('HcPatient', 'patients', {
      patientCode: { type: String, unique: true, sparse: true, index: true },
      identityKey: flagged(true),
    }),
  doctors: () => getModel('HcDoctor', 'doctors', { doctorCode: flagged(true) }),
  wards: () => getModel('HcWard', 'wards'),
  admissions: () => getModel('HcAdmission', 'admissions', { admissionCode: flagged(true) }),
  appointments: () =>
    getModel('HcAppointment', 'appointments', {
      appointmentCode: { type: String, unique: true, sparse: true, index: true },
      doctorSlotKey: flagged(true),
      patientSlotKey: flagged(true),
    }),
  medicalRecords: () => getModel('HcMedicalRecord', 'medical_records'),
  prescriptions: () => getModel('HcPrescription', 'prescriptions', {
    prescriptionCode: { type: String, unique: true, sparse: true, index: true },
  }),
  documents: () => getModel('HcMedicalDocument', 'medical_documents'),
  bills: () => getModel('HcBill', 'bills', { billCode: flagged(true) }),
  insuranceClaims: () => getModel('HcInsuranceClaim', 'insurance_claims', { claimCode: flagged(true) }),
  insurancePolicies: () => getModel('HcInsurancePolicy', 'insurance_policies'),
  auditLogs: () => getModel('HcAuditLog', 'audit_logs'),
  notifications: () => getModel('HcNotification', 'notifications'),
  conversations: () => getModel('HcConversation', 'conversations'),
  messages: () => getModel('HcMessage', 'messages'),
  teleconsultations: () => getModel('HcTeleconsultation', 'teleconsultations'),
};

/** Strip Mongo's internal `_id` before placing documents in the domain store. */
export const stripMongoFields = <T>(document: any): T => {
  if (!document || typeof document !== 'object') return document as T;
  const { _id, __v, ...rest } = document;
  return rest as T;
};
