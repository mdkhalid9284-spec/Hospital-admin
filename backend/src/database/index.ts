import fs from 'fs';
import path from 'path';
import { connectMongo } from './mongo.js';
import { UserModel } from '../models/User.model.js';
import { persistenceModels, stripMongoFields } from '../models/persistence.models.js';
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
  INotification,
  IConversation,
  IMessage,
  ITeleconsultation,
} from '../models/types.js';
import { generateSeedData } from './seedData.js';
import { alignSampleDocumentsForBlob, ensureLocalSampleDocumentFiles, ensureSampleDocumentFiles } from './sampleDocuments.js';
import { assertBlobStorageConfigured } from '../services/fileStorage.service.js';
import { config } from '../config/index.js';
import { patientIdentityKey } from '../utils/identity.js';

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
  conversations: IConversation[];
  messages: IMessage[];
  teleconsultations: ITeleconsultation[];
}

type StoreKey = keyof IDatabaseStore;
type PersistenceMode = 'memory' | 'mongo' | 'file';

const emptyStore = (): IDatabaseStore => ({
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
  notifications: [],
  conversations: [],
  messages: [],
  teleconsultations: [],
});

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const sameDocument = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

const collectionNames: Record<Exclude<StoreKey, never>, string> = {
  users: 'users',
  doctors: 'doctors',
  patients: 'patients',
  wards: 'wards',
  admissions: 'admissions',
  appointments: 'appointments',
  medicalRecords: 'medical_records',
  prescriptions: 'prescriptions',
  documents: 'medical_documents',
  bills: 'bills',
  insuranceClaims: 'insurance_claims',
  insurancePolicies: 'insurance_policies',
  auditLogs: 'audit_logs',
  notifications: 'notifications',
  conversations: 'conversations',
  messages: 'messages',
  teleconsultations: 'teleconsultations',
};

class HospitalDatabase {
  private data: IDatabaseStore = emptyStore();
  private baseline: IDatabaseStore = emptyStore();
  private mode: PersistenceMode = 'memory';
  private isInitialized = false;
  private writeQueue: Promise<void> = Promise.resolve();

  /* ------------------------------------------------------------------ */
  /* Initialisation                                                      */
  /* ------------------------------------------------------------------ */

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    if (config.nodeEnv === 'production' && !(process.env.STORAGE_DRIVER ?? '').trim()) {
      throw new Error(
        'STORAGE_DRIVER is required in production. Set STORAGE_DRIVER=vercel-blob on the backend service and provide BLOB_READ_WRITE_TOKEN from the connected private Blob store. Medical documents are not written to the serverless filesystem.'
      );
    }

    assertBlobStorageConfigured();
    // Local uploads are created only when STORAGE_DRIVER=local. Blob mode never mkdir's the upload directory.
    await ensureSampleDocumentFiles();

    const seed: IDatabaseStore = { ...emptyStore(), ...(await generateSeedData()) };
    this.data = seed;
    this.ensureDerivedFields();

    const hasConfiguredUri = Boolean(config.database.mongoUri);

    if (!hasConfiguredUri && config.nodeEnv === 'production' && process.env.ALLOW_EPHEMERAL_STORAGE !== 'true') {
      throw new Error(
        'Persistent storage is required in production but MONGODB_URI is not configured. ' +
          'Set MONGODB_URI in the backend Vercel project before deploying. ' +
          'Local JSON snapshots are not durable on Vercel serverless functions.'
      );
    }

    if (hasConfiguredUri) {
      // When MONGODB_URI is set, Atlas is required. Do not silently fall back
      // to a local JSON file — that hides authentication failures and desyncs data.
      try {
        await connectMongo();
        await this.ensureMongoIndexes();
        await this.seedMongoFoundation(seed);
        await this.loadFromMongo();
        this.mode = 'mongo';
        console.log('[Database] MongoDB Atlas connected; all collections are persistent.');
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('[Database] MongoDB Atlas connection failed. Server will not start.');
        console.error(`[Database] ${message.replace(/mongodb(?:\+srv)?:\/\/\S+/gi, '[redacted]')}`);
        throw error;
      }
    } else {
      await this.loadLocalSnapshot(seed);
      this.mode = 'file';
      console.warn(
        '[Database] MONGODB_URI is not configured. Using storage/hospitalcare_db.json for local development. ' +
          'This file is not durable on Vercel; configure MongoDB Atlas for production.'
      );
    }

    this.ensureDerivedFields();
    const sampleUpdates = alignSampleDocumentsForBlob(this.data.documents);
    if (sampleUpdates.length > 0) {
      await this.commitDocumentMetadata(sampleUpdates);
      console.log(
        `[Database] Updated ${sampleUpdates.length} synthetic sample document record(s) for private Blob storage.`
      );
    }
    this.baseline = clone(this.data);
    this.isInitialized = true;
  }

  public get isReady(): boolean {
    return this.isInitialized;
  }

  public get persistenceMode(): PersistenceMode {
    return this.mode;
  }

  private async ensureMongoIndexes(): Promise<void> {
    const models: Array<[string, ReturnType<typeof persistenceModels.patients>]> = [
      ['users', UserModel as any],
      ['patients', persistenceModels.patients()],
      ['doctors', persistenceModels.doctors()],
      ['wards', persistenceModels.wards()],
      ['admissions', persistenceModels.admissions()],
      ['appointments', persistenceModels.appointments()],
      ['medicalRecords', persistenceModels.medicalRecords()],
      ['prescriptions', persistenceModels.prescriptions()],
      ['documents', persistenceModels.documents()],
      ['bills', persistenceModels.bills()],
      ['insuranceClaims', persistenceModels.insuranceClaims()],
      ['insurancePolicies', persistenceModels.insurancePolicies()],
      ['auditLogs', persistenceModels.auditLogs()],
      ['notifications', persistenceModels.notifications()],
      ['conversations', persistenceModels.conversations()],
      ['messages', persistenceModels.messages()],
      ['teleconsultations', persistenceModels.teleconsultations()],
    ];

    for (const [name, model] of models) {
      try {
        await model.createIndexes();
      } catch (error) {
        // Existing duplicate data can make a unique index fail. Log it without
        // preventing startup; the application-level conflict checks still run.
        console.warn(`[Database] Could not create indexes for ${name}:`, error);
      }
    }
  }

  private modelFor(key: StoreKey): any {
    if (key === 'users') return UserModel;
    const factories: Record<Exclude<StoreKey, 'users'>, () => any> = {
      doctors: persistenceModels.doctors,
      patients: persistenceModels.patients,
      wards: persistenceModels.wards,
      admissions: persistenceModels.admissions,
      appointments: persistenceModels.appointments,
      medicalRecords: persistenceModels.medicalRecords,
      prescriptions: persistenceModels.prescriptions,
      documents: persistenceModels.documents,
      bills: persistenceModels.bills,
      insuranceClaims: persistenceModels.insuranceClaims,
      insurancePolicies: persistenceModels.insurancePolicies,
      auditLogs: persistenceModels.auditLogs,
      notifications: persistenceModels.notifications,
      conversations: persistenceModels.conversations,
      messages: persistenceModels.messages,
      teleconsultations: persistenceModels.teleconsultations,
    };
    return factories[key]();
  }

  private async seedMongoFoundation(seed: IDatabaseStore): Promise<void> {
    // Demo accounts are inserted only when absent. Existing passwords are
    // never overwritten, so an administrator's changed password survives.
    for (const user of seed.users) {
      await UserModel.updateOne({ id: user.id }, { $setOnInsert: user }, { upsert: true });
    }

    const keys: Exclude<StoreKey, 'users'>[] = [
      'doctors',
      'patients',
      'wards',
      'admissions',
      'appointments',
      'medicalRecords',
      'prescriptions',
      'documents',
      'bills',
      'insuranceClaims',
      'insurancePolicies',
      'auditLogs',
      'notifications',
      'conversations',
      'messages',
      'teleconsultations',
    ];

    for (const key of keys) {
      const model = this.modelFor(key);
      const count = await model.estimatedDocumentCount();
      const documents = seed[key] as any[];
      if (count === 0 && documents.length > 0) {
        try {
          await model.insertMany(documents, { ordered: false });
        } catch (error) {
          // Duplicate seed inserts (a race between two cold starts) are benign.
          console.warn(`[Database] Seed insert for ${key} reported:`, error);
        }
      }
    }
  }

  private async loadFromMongo(): Promise<void> {
    const userDocs = await UserModel.find()
      .select('+passwordHash +resetPasswordToken +resetPasswordExpires')
      .lean();
    this.data.users = userDocs.map((doc) => stripMongoFields<IUser>(doc));

    const keys: Exclude<StoreKey, 'users'>[] = [
      'doctors',
      'patients',
      'wards',
      'admissions',
      'appointments',
      'medicalRecords',
      'prescriptions',
      'documents',
      'bills',
      'insuranceClaims',
      'insurancePolicies',
      'auditLogs',
      'notifications',
      'conversations',
      'messages',
      'teleconsultations',
    ];

    for (const key of keys) {
      const docs = await this.modelFor(key).find().lean();
      (this.data as any)[key] = docs.map((doc: any) => stripMongoFields(doc));
    }
  }

  private async loadLocalSnapshot(seed: IDatabaseStore): Promise<void> {
    const filePath = config.database.localSnapshotPath;
    let loaded: Partial<IDatabaseStore> | null = null;

    try {
      if (fs.existsSync(filePath)) {
        const raw = await fs.promises.readFile(filePath, 'utf8');
        loaded = JSON.parse(raw) as Partial<IDatabaseStore>;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[Database] Local snapshot could not be read (${message}); starting from seed data.`);
      loaded = null;
    }

    this.data = emptyStore();
    const keys = Object.keys(emptyStore()) as StoreKey[];
    for (const key of keys) {
      const fromFile = (loaded as any)?.[key];
      const seedValue = (seed as any)[key] as any[];
      (this.data as any)[key] = Array.isArray(fromFile) ? fromFile : clone(seedValue);
    }

    // Keep the built-in demo accounts available even if an older local
    // snapshot predates them.
    const existingUserIds = new Set(this.data.users.map((user) => user.id));
    for (const seedUser of seed.users) {
      if (!existingUserIds.has(seedUser.id)) this.data.users.push(clone(seedUser));
    }

    this.ensureDerivedFields();
  }

  /** Adds computed integrity keys to data loaded from seed/Mongo/snapshot. */
  public ensureDerivedFields(): void {
    for (const patient of this.data.patients) {
      if (!patient.userId) patient.userId = '';
      if (!patient.identityKey && !(patient as any).identityKeyExempt) {
        const key = patientIdentityKey(patient.fullName, patient.phone);
        if (key) patient.identityKey = key;
      }
    }

    for (const appointment of this.data.appointments) {
      const slot = appointment.timeSlot || '';
      const [startTime, endTime] = slot.split(' - ').map((part) => part.trim());
      if (startTime) appointment.startTime = startTime;
      if (endTime) appointment.endTime = endTime;

      if (appointment.status === 'Cancelled') {
        delete appointment.doctorSlotKey;
        delete appointment.patientSlotKey;
      } else {
        appointment.doctorSlotKey = `${appointment.doctorId}|${appointment.appointmentDate}|${appointment.timeSlot}`;
        appointment.patientSlotKey = `${appointment.patientId}|${appointment.appointmentDate}|${appointment.timeSlot}`;
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /* Refresh / persistence                                               */
  /* ------------------------------------------------------------------ */

  /** Reload latest committed data before serving a request. */
  public async refreshFromStorage(): Promise<void> {
    if (!this.isInitialized || this.mode === 'memory') return;

    if (this.mode === 'mongo') {
      await this.loadFromMongo();
    } else {
      // Do not regenerate bcrypt seed hashes on every request — that added
      // hundreds of ms per call and could stall the persistence request queue.
      await this.loadLocalSnapshot(emptyStore());
    }

    this.ensureDerivedFields();
    this.baseline = clone(this.data);
  }

  /** Persist only documents that changed since the last refresh/save. */
  public async persist(): Promise<void> {
    if (!this.isInitialized || this.mode === 'memory') return;

    // Serialise writes inside the instance. The HTTP middleware also
    // serialises requests, but this guard covers direct service-level calls.
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const prior = this.writeQueue;
    this.writeQueue = prior.then(() => gate).catch(() => undefined);
    await prior.catch(() => undefined);

    try {
      if (this.mode === 'mongo') {
        await this.persistMongoDiff();
      } else {
        await this.persistLocalSnapshot();
      }
    } finally {
      release();
    }
  }

  private computeDiff(key: StoreKey): { upserts: any[]; deletes: string[] } {
    const current = (this.data as any)[key] as any[];
    const previous = (this.baseline as any)[key] as any[];
    const previousById = new Map(previous.map((document: any) => [document.id, document]));
    const currentIds = new Set(current.map((document: any) => document.id));

    const upserts = current.filter((document: any) => {
      const before = previousById.get(document.id);
      return !before || !sameDocument(before, document);
    });
    const deletes = previous
      .filter((document: any) => !currentIds.has(document.id))
      .map((document: any) => document.id);

    return { upserts, deletes };
  }

  private async commitDocumentMetadata(documents: IMedicalDocument[]): Promise<void> {
    if (documents.length === 0) return;

    if (this.mode === 'mongo') {
      const model = this.modelFor('documents');
      await model.bulkWrite(
        documents.map((document) => ({
          updateOne: {
            filter: { id: document.id },
            update: { $set: stripMongoFields(document) },
          },
        })),
        { ordered: false }
      );
      return;
    }

    if (this.mode === 'file') {
      await this.persistLocalSnapshot();
    }
  }

  private async persistMongoDiff(): Promise<void> {
    const keys = Object.keys(this.data) as StoreKey[];

    for (const key of keys) {
      const { upserts, deletes } = this.computeDiff(key);
      if (upserts.length === 0 && deletes.length === 0) continue;

      const model = this.modelFor(key);
      if (upserts.length > 0) {
        const operations = upserts.map((document) => ({
          updateOne: {
            filter: { id: document.id },
            update: { $set: stripMongoFields(document) },
            upsert: true,
          },
        }));
        await model.bulkWrite(operations, { ordered: false });
      }

      if (deletes.length > 0) {
        await model.deleteMany({ id: { $in: deletes } });
      }

      (this.baseline as any)[key] = clone((this.data as any)[key]);
    }
  }

  private async persistLocalSnapshot(): Promise<void> {
    const filePath = config.database.localSnapshotPath;
    const directory = path.dirname(filePath);
    if (!fs.existsSync(directory)) fs.mkdirSync(directory, { recursive: true });

    const tempPath = `${filePath}.tmp`;
    await fs.promises.writeFile(tempPath, JSON.stringify(this.data, null, 2), 'utf8');
    await fs.promises.rename(tempPath, filePath);
    this.baseline = clone(this.data);
  }

  /* ------------------------------------------------------------------ */
  /* Collection accessors                                                */
  /* ------------------------------------------------------------------ */

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
  public get conversations(): IConversation[] { return this.data.conversations; }
  public get messages(): IMessage[] { return this.data.messages; }
  public get teleconsultations(): ITeleconsultation[] { return this.data.teleconsultations; }

  // Atomic state reset helper for automated test isolation
  public async resetForTesting(): Promise<void> {
    ensureLocalSampleDocumentFiles();
    const seed: IDatabaseStore = { ...emptyStore(), ...(await generateSeedData()) };
    this.data = seed;
    this.ensureDerivedFields();
    this.baseline = clone(this.data);
    this.mode = 'memory';
    this.isInitialized = false;
  }
}

export const db = new HospitalDatabase();

