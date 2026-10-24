import fs from 'fs';
import {
  IUser,
  IPatient,
  IDoctor,
  IWard,
  IAdmission,
  IAppointment,
  IMedicalRecord,
  IPrescription,
  IMedicalDocument,
  IBill,
  IInsuranceClaim,
  IInsurancePolicy,
  IAuditLog,
  INotification
} from '../models/types.js';
import { generateSeedData } from './seedData.js';
import { ensureSampleDocumentFiles } from './sampleDocuments.js';
import { config } from '../config/index.js';

export interface IDatabaseStore {
  users: IUser[];
  doctors: IDoctor[];
  patients: IPatient[];
  wards: IWard[];
  admissions: IAdmission[];
  appointments: IAppointment[];
  medicalRecords: IMedicalRecord[];
  prescriptions: IPrescription[];
  documents: IMedicalDocument[];
  bills: IBill[];
  insuranceClaims: IInsuranceClaim[];
  insurancePolicies: IInsurancePolicy[];
  auditLogs: IAuditLog[];
  notifications: INotification[];
}

class HospitalDatabase {
  private data: IDatabaseStore = {
    users: [],
    doctors: [],
    patients: [],
    wards: [],
    admissions: [],
    appointments: [],
    medicalRecords: [],
    prescriptions: [],
    documents: [],
    bills: [],
    insuranceClaims: [],
    insurancePolicies: [],
    auditLogs: [],
    notifications: []
  };

  private isInitialized = false;

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Ensure the private storage folder exists and the synthetic demo files
    // referenced by the seed dataset are present.
    const storageDir = config.storage.localPath;
    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }
    ensureSampleDocumentFiles();

    // Load initial seed dataset
    const seed = await generateSeedData();
    this.data = seed;
    this.isInitialized = true;
    console.log('[Database] HospitalCare In-Memory / Hybrid Document & Relational Engine initialized successfully.');
  }

  // Generic collection accessors
  public get users(): IUser[] { return this.data.users; }
  public get doctors(): IDoctor[] { return this.data.doctors; }
  public get patients(): IPatient[] { return this.data.patients; }
  public get wards(): IWard[] { return this.data.wards; }
  public get admissions(): IAdmission[] { return this.data.admissions; }
  public get appointments(): IAppointment[] { return this.data.appointments; }
  public get medicalRecords(): IMedicalRecord[] { return this.data.medicalRecords; }
  public get prescriptions(): IPrescription[] { return this.data.prescriptions; }
  public get documents(): IMedicalDocument[] { return this.data.documents; }
  public get bills(): IBill[] { return this.data.bills; }
  public get insuranceClaims(): IInsuranceClaim[] { return this.data.insuranceClaims; }
  public get insurancePolicies(): IInsurancePolicy[] { return this.data.insurancePolicies; }
  public get auditLogs(): IAuditLog[] { return this.data.auditLogs; }
  public get notifications(): INotification[] { return this.data.notifications; }

  // Atomic state reset helper for automated test isolation
  public async resetForTesting(): Promise<void> {
    // Tests do not call initialize(), so ensure the synthetic private files
    // exist before any document download assertion runs.
    ensureSampleDocumentFiles();
    const seed = await generateSeedData();
    this.data = seed;
  }
}

export const db = new HospitalDatabase();
