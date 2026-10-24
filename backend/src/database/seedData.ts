import bcrypt from 'bcryptjs';
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
import { SAMPLE_DOCUMENT_FILES } from './sampleDocuments.js';
import { DAY_NAMES, addDays, toISODate, calculateAge } from '../utils/date.js';

// ---------------------------------------------------------------------------
// Seed-specific date helpers
// ---------------------------------------------------------------------------
const startOfToday = (): Date => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

const isoDaysAgo = (days: number, hour = 10, minute = 0): string => {
  const d = addDays(startOfToday(), -days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

/** Finds the nearest date (on/after `offset` for future, on/before for past) when the doctor works. */
const findAvailableDate = (doctor: IDoctor, offset: number): string => {
  const step = offset >= 0 ? 1 : -1;
  let cursor = addDays(startOfToday(), offset);
  for (let i = 0; i < 14; i += 1) {
    if (doctor.availableDays.includes(DAY_NAMES[cursor.getDay()])) {
      return toISODate(cursor);
    }
    cursor = addDays(cursor, step);
  }
  return toISODate(addDays(startOfToday(), offset));
};

const sampleFileByKey = new Map(SAMPLE_DOCUMENT_FILES.map((file) => [file.safeStorageKey, file]));
const sampleSize = (key: string): number => sampleFileByKey.get(key)?.buffer.length ?? 0;

// ---------------------------------------------------------------------------
// Seed generator
// ---------------------------------------------------------------------------
export const generateSeedData = async () => {
  const salt = await bcrypt.genSalt(10);
  const adminPassword = await bcrypt.hash('Admin@123', salt);
  const doctorPassword = await bcrypt.hash('Doctor@123', salt);
  const patientPassword = await bcrypt.hash('Patient@123', salt);
  const billingPassword = await bcrypt.hash('Billing@123', salt);

  const users: IUser[] = [
    {
      id: 'usr-admin-01',
      email: 'admin@hospitalcare.demo',
      passwordHash: adminPassword,
      role: 'admin',
      fullName: 'Dr. Sarah Mitchell (Administrator)',
      phone: '+1 (555) 019-2831',
      isActive: true,
      failedLoginAttempts: 0,
      createdAt: new Date('2026-01-10T08:00:00Z').toISOString(),
      updatedAt: new Date('2026-01-10T08:00:00Z').toISOString()
    },
    {
      id: 'usr-doc-01',
      email: 'doctor@hospitalcare.demo',
      passwordHash: doctorPassword,
      role: 'doctor',
      fullName: 'Dr. Alexander Reed, MD',
      phone: '+1 (555) 014-9923',
      isActive: true,
      failedLoginAttempts: 0,
      createdAt: new Date('2026-01-12T09:00:00Z').toISOString(),
      updatedAt: new Date('2026-01-12T09:00:00Z').toISOString()
    },
    {
      id: 'usr-doc-02',
      email: 'doctor2@hospitalcare.demo',
      passwordHash: doctorPassword,
      role: 'doctor',
      fullName: 'Dr. Elena Rostova, MD',
      phone: '+1 (555) 017-8841',
      isActive: true,
      failedLoginAttempts: 0,
      createdAt: new Date('2026-01-12T09:00:00Z').toISOString(),
      updatedAt: new Date('2026-01-12T09:00:00Z').toISOString()
    },
    {
      id: 'usr-pat-01',
      email: 'patient@hospitalcare.demo',
      passwordHash: patientPassword,
      role: 'patient',
      fullName: 'James Harrison',
      phone: '+1 (555) 018-7712',
      isActive: true,
      failedLoginAttempts: 0,
      createdAt: new Date('2026-02-01T10:00:00Z').toISOString(),
      updatedAt: new Date('2026-02-01T10:00:00Z').toISOString()
    },
    {
      id: 'usr-pat-02',
      email: 'patient2@hospitalcare.demo',
      passwordHash: patientPassword,
      role: 'patient',
      fullName: 'Emma Watson-Clarke',
      phone: '+1 (555) 012-3344',
      isActive: true,
      failedLoginAttempts: 0,
      createdAt: new Date('2026-02-05T11:00:00Z').toISOString(),
      updatedAt: new Date('2026-02-05T11:00:00Z').toISOString()
    },
    {
      id: 'usr-pat-03',
      email: 'patient3@hospitalcare.demo',
      passwordHash: patientPassword,
      role: 'patient',
      fullName: 'Sofia Ramirez',
      phone: '+1 (555) 013-5566',
      isActive: true,
      failedLoginAttempts: 0,
      createdAt: new Date('2026-03-01T09:00:00Z').toISOString(),
      updatedAt: new Date('2026-03-01T09:00:00Z').toISOString()
    },
    {
      id: 'usr-pat-04',
      email: 'patient4@hospitalcare.demo',
      passwordHash: patientPassword,
      role: 'patient',
      fullName: 'Daniel Okafor',
      phone: '+1 (555) 015-7788',
      isActive: true,
      failedLoginAttempts: 0,
      createdAt: new Date('2026-03-04T10:00:00Z').toISOString(),
      updatedAt: new Date('2026-03-04T10:00:00Z').toISOString()
    },
    {
      id: 'usr-pat-05',
      email: 'patient5@hospitalcare.demo',
      passwordHash: patientPassword,
      role: 'patient',
      fullName: 'Aisha Rahman',
      phone: '+1 (555) 016-9900',
      isActive: true,
      failedLoginAttempts: 0,
      createdAt: new Date('2026-03-08T11:00:00Z').toISOString(),
      updatedAt: new Date('2026-03-08T11:00:00Z').toISOString()
    },
    {
      id: 'usr-pat-06',
      email: 'patient6@hospitalcare.demo',
      passwordHash: patientPassword,
      role: 'patient',
      fullName: 'Liam Chen',
      phone: '+1 (555) 011-2233',
      isActive: true,
      failedLoginAttempts: 0,
      createdAt: new Date('2026-03-10T12:00:00Z').toISOString(),
      updatedAt: new Date('2026-03-10T12:00:00Z').toISOString()
    },
    {
      id: 'usr-bill-01',
      email: 'billing@hospitalcare.demo',
      passwordHash: billingPassword,
      role: 'billing',
      fullName: 'Marcus Vance (Finance Officer)',
      phone: '+1 (555) 019-4455',
      isActive: true,
      failedLoginAttempts: 0,
      createdAt: new Date('2026-01-15T08:30:00Z').toISOString(),
      updatedAt: new Date('2026-01-15T08:30:00Z').toISOString()
    }
  ];

  const doctors: IDoctor[] = [
    {
      id: 'doc-001',
      userId: 'usr-doc-01',
      doctorCode: 'DOC-101',
      fullName: 'Dr. Alexander Reed, MD',
      specialization: 'Cardiology',
      department: 'Cardiovascular Sciences',
      qualification: 'MBBS, MD (Cardiology), FACC',
      phone: '+1 (555) 014-9923',
      email: 'doctor@hospitalcare.demo',
      consultationFee: 150.0,
      availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      slotDurationMinutes: 30,
      isActive: true,
      assignedPatientIds: ['pat-001', 'pat-003', 'pat-005']
    },
    {
      id: 'doc-002',
      userId: 'usr-doc-02',
      doctorCode: 'DOC-102',
      fullName: 'Dr. Elena Rostova, MD',
      specialization: 'Neurology',
      department: 'Neurological Sciences',
      qualification: 'MBBS, DM (Neurology)',
      phone: '+1 (555) 017-8841',
      email: 'doctor2@hospitalcare.demo',
      consultationFee: 175.0,
      availableDays: ['Tuesday', 'Wednesday', 'Thursday', 'Saturday'],
      slotDurationMinutes: 30,
      isActive: true,
      assignedPatientIds: ['pat-002', 'pat-004', 'pat-006']
    }
  ];

  const patients: IPatient[] = [
    {
      id: 'pat-001',
      userId: 'usr-pat-01',
      patientCode: 'PAT-1001',
      fullName: 'James Harrison',
      dob: '1985-06-14',
      gender: 'male',
      bloodGroup: 'O+',
      phone: '+1 (555) 018-7712',
      email: 'patient@hospitalcare.demo',
      address: '742 Evergreen Terrace, Springfield, IL 62704',
      emergencyContact: {
        name: 'Martha Harrison',
        relationship: 'Spouse',
        phone: '+1 (555) 018-7713'
      },
      assignedDoctorId: 'doc-001',
      currentAdmissionId: 'adm-001',
      createdAt: new Date('2026-02-01T10:00:00Z').toISOString(),
      updatedAt: new Date('2026-02-01T10:00:00Z').toISOString()
    },
    {
      id: 'pat-002',
      userId: 'usr-pat-02',
      patientCode: 'PAT-1002',
      fullName: 'Emma Watson-Clarke',
      dob: '1992-11-23',
      gender: 'female',
      bloodGroup: 'A+',
      phone: '+1 (555) 012-3344',
      email: 'patient2@hospitalcare.demo',
      address: '12 Grimmauld Place, Boston, MA 02108',
      emergencyContact: {
        name: 'Arthur Clarke',
        relationship: 'Brother',
        phone: '+1 (555) 012-3345'
      },
      assignedDoctorId: 'doc-002',
      createdAt: new Date('2026-02-05T11:00:00Z').toISOString(),
      updatedAt: new Date('2026-02-05T11:00:00Z').toISOString()
    },
    {
      id: 'pat-003',
      userId: 'usr-pat-03',
      patientCode: 'PAT-1003',
      fullName: 'Sofia Ramirez',
      dob: '1978-03-09',
      gender: 'female',
      bloodGroup: 'B+',
      phone: '+1 (555) 013-5566',
      email: 'patient3@hospitalcare.demo',
      address: '88 Mission Street, San Francisco, CA 94105',
      emergencyContact: {
        name: 'Carlos Ramirez',
        relationship: 'Spouse',
        phone: '+1 (555) 013-5567'
      },
      assignedDoctorId: 'doc-001',
      createdAt: new Date('2026-03-01T09:00:00Z').toISOString(),
      updatedAt: new Date('2026-03-01T09:00:00Z').toISOString()
    },
    {
      id: 'pat-004',
      userId: 'usr-pat-04',
      patientCode: 'PAT-1004',
      fullName: 'Daniel Okafor',
      dob: '2001-12-02',
      gender: 'male',
      bloodGroup: 'AB+',
      phone: '+1 (555) 015-7788',
      email: 'patient4@hospitalcare.demo',
      address: '31 Harbour View Road, Seattle, WA 98101',
      emergencyContact: {
        name: 'Grace Okafor',
        relationship: 'Mother',
        phone: '+1 (555) 015-7789'
      },
      assignedDoctorId: 'doc-002',
      createdAt: new Date('2026-03-04T10:00:00Z').toISOString(),
      updatedAt: new Date('2026-03-04T10:00:00Z').toISOString()
    },
    {
      id: 'pat-005',
      userId: 'usr-pat-05',
      patientCode: 'PAT-1005',
      fullName: 'Aisha Rahman',
      dob: '1969-07-21',
      gender: 'female',
      bloodGroup: 'O-',
      phone: '+1 (555) 016-9900',
      email: 'patient5@hospitalcare.demo',
      address: '19 Cedar Lane, Austin, TX 78701',
      emergencyContact: {
        name: 'Imran Rahman',
        relationship: 'Son',
        phone: '+1 (555) 016-9901'
      },
      assignedDoctorId: 'doc-001',
      createdAt: new Date('2026-03-08T11:00:00Z').toISOString(),
      updatedAt: new Date('2026-03-08T11:00:00Z').toISOString()
    },
    {
      id: 'pat-006',
      userId: 'usr-pat-06',
      patientCode: 'PAT-1006',
      fullName: 'Liam Chen',
      dob: '1990-01-15',
      gender: 'male',
      bloodGroup: 'A-',
      phone: '+1 (555) 011-2233',
      email: 'patient6@hospitalcare.demo',
      address: '7 Orchard Crescent, Denver, CO 80202',
      emergencyContact: {
        name: 'Mei Chen',
        relationship: 'Sister',
        phone: '+1 (555) 011-2234'
      },
      assignedDoctorId: 'doc-002',
      createdAt: new Date('2026-03-10T12:00:00Z').toISOString(),
      updatedAt: new Date('2026-03-10T12:00:00Z').toISOString()
    }
  ];

  const wards: IWard[] = [
    {
      id: 'ward-icu',
      name: 'Intensive Care Unit (ICU)',
      type: 'ICU',
      totalBeds: 4,
      availableBeds: 3,
      occupiedBeds: 1,
      rooms: [
        {
          roomNumber: 'ICU-101',
          beds: [
            {
              bedNumber: 'ICU-101-A',
              status: 'Occupied',
              currentPatientId: 'pat-001',
              currentPatientName: 'James Harrison',
              currentAdmissionId: 'adm-001',
              allocatedAt: isoDaysAgo(5, 9, 30)
            },
            {
              bedNumber: 'ICU-101-B',
              status: 'Available',
              currentPatientId: null,
              currentPatientName: null,
              currentAdmissionId: null,
              allocatedAt: null
            }
          ]
        },
        {
          roomNumber: 'ICU-102',
          beds: [
            {
              bedNumber: 'ICU-102-A',
              status: 'Available',
              currentPatientId: null,
              currentPatientName: null,
              currentAdmissionId: null,
              allocatedAt: null
            },
            {
              bedNumber: 'ICU-102-B',
              status: 'Available',
              currentPatientId: null,
              currentPatientName: null,
              currentAdmissionId: null,
              allocatedAt: null
            }
          ]
        }
      ]
    },
    {
      id: 'ward-gen-a',
      name: 'General Medical Ward A',
      type: 'General',
      totalBeds: 6,
      availableBeds: 6,
      occupiedBeds: 0,
      rooms: [
        {
          roomNumber: 'GEN-201',
          beds: [
            { bedNumber: 'GEN-201-A', status: 'Available' },
            { bedNumber: 'GEN-201-B', status: 'Available' },
            { bedNumber: 'GEN-201-C', status: 'Available' }
          ]
        },
        {
          roomNumber: 'GEN-202',
          beds: [
            { bedNumber: 'GEN-202-A', status: 'Available' },
            { bedNumber: 'GEN-202-B', status: 'Available' },
            { bedNumber: 'GEN-202-C', status: 'Available' }
          ]
        }
      ]
    },
    {
      id: 'ward-semi-p',
      name: 'Semi-Private Suite Wing',
      type: 'Semi-Private',
      totalBeds: 4,
      availableBeds: 4,
      occupiedBeds: 0,
      rooms: [
        {
          roomNumber: 'SP-301',
          beds: [
            { bedNumber: 'SP-301-A', status: 'Available' },
            { bedNumber: 'SP-301-B', status: 'Available' }
          ]
        },
        {
          roomNumber: 'SP-302',
          beds: [
            { bedNumber: 'SP-302-A', status: 'Available' },
            { bedNumber: 'SP-302-B', status: 'Available' }
          ]
        }
      ]
    }
  ];

  const admissions: IAdmission[] = [
    {
      id: 'adm-001',
      admissionCode: 'ADM-8001',
      patientId: 'pat-001',
      patientName: 'James Harrison',
      doctorId: 'doc-001',
      doctorName: 'Dr. Alexander Reed, MD',
      wardId: 'ward-icu',
      wardName: 'Intensive Care Unit (ICU)',
      roomNumber: 'ICU-101',
      bedNumber: 'ICU-101-A',
      reason: 'Acute angina and hypertensive observation',
      admissionDate: isoDaysAgo(5, 9, 30),
      status: 'Admitted',
      dischargeDate: null,
      dischargeSummary: null,
      createdAt: isoDaysAgo(5, 9, 30),
      updatedAt: isoDaysAgo(5, 9, 30)
    },
    {
      id: 'adm-002',
      admissionCode: 'ADM-8002',
      patientId: 'pat-002',
      patientName: 'Emma Watson-Clarke',
      doctorId: 'doc-002',
      doctorName: 'Dr. Elena Rostova, MD',
      wardId: 'ward-gen-a',
      wardName: 'General Medical Ward A',
      roomNumber: 'GEN-202',
      bedNumber: 'GEN-202-A',
      reason: 'Migraine with aura - short inpatient observation',
      admissionDate: isoDaysAgo(45, 14, 0),
      dischargeDate: isoDaysAgo(42, 11, 0),
      status: 'Discharged',
      dischargeSummary: {
        diagnosis: 'Migraine with aura, resolved with IV therapy',
        treatmentGiven: 'IV fluids, antiemetics and analgesia',
        adviceOnDischarge: 'Neurology follow-up in 2 weeks; maintain headache diary.',
        dischargedBy: 'Dr. Elena Rostova, MD',
        dischargedAt: isoDaysAgo(42, 11, 0)
      },
      createdAt: isoDaysAgo(45, 14, 0),
      updatedAt: isoDaysAgo(42, 11, 0)
    }
  ];

  const appointments: IAppointment[] = [
    {
      id: 'apt-001',
      appointmentCode: 'APT-9001',
      patientId: 'pat-001',
      patientName: 'James Harrison',
      doctorId: 'doc-001',
      doctorName: 'Dr. Alexander Reed, MD',
      appointmentDate: findAvailableDate(doctors[0], 1),
      timeSlot: '09:00 - 09:30',
      reason: 'Hypertension and angina follow-up',
      status: 'Confirmed',
      notes: 'Bring home blood-pressure readings.',
      createdAt: isoDaysAgo(2, 14, 0)
    },
    {
      id: 'apt-002',
      appointmentCode: 'APT-9002',
      patientId: 'pat-002',
      patientName: 'Emma Watson-Clarke',
      doctorId: 'doc-002',
      doctorName: 'Dr. Elena Rostova, MD',
      appointmentDate: findAvailableDate(doctors[1], 1),
      timeSlot: '09:00 - 09:30',
      reason: 'Persistent migraine and aura evaluation',
      status: 'Confirmed',
      notes: 'Initial neurology consultation.',
      createdAt: isoDaysAgo(2, 15, 0)
    },
    {
      id: 'apt-003',
      appointmentCode: 'APT-9003',
      patientId: 'pat-003',
      patientName: 'Sofia Ramirez',
      doctorId: 'doc-001',
      doctorName: 'Dr. Alexander Reed, MD',
      appointmentDate: findAvailableDate(doctors[0], -4),
      timeSlot: '10:00 - 10:30',
      reason: 'Lipid profile review',
      status: 'Completed',
      notes: 'Completed consultation; repeat lipids in 3 months.',
      createdAt: isoDaysAgo(10, 10, 0)
    },
    {
      id: 'apt-004',
      appointmentCode: 'APT-9004',
      patientId: 'pat-004',
      patientName: 'Daniel Okafor',
      doctorId: 'doc-002',
      doctorName: 'Dr. Elena Rostova, MD',
      appointmentDate: findAvailableDate(doctors[1], -3),
      timeSlot: '14:00 - 14:30',
      reason: 'Migraine medication review',
      status: 'Cancelled',
      notes: 'Cancelled by patient; slot released.',
      createdAt: isoDaysAgo(9, 11, 0)
    },
    {
      id: 'apt-005',
      appointmentCode: 'APT-9005',
      patientId: 'pat-005',
      patientName: 'Aisha Rahman',
      doctorId: 'doc-001',
      doctorName: 'Dr. Alexander Reed, MD',
      appointmentDate: findAvailableDate(doctors[0], 5),
      timeSlot: '15:00 - 15:30',
      reason: 'Stable angina review',
      status: 'Pending',
      notes: 'Awaiting patient confirmation.',
      createdAt: isoDaysAgo(1, 9, 0)
    },
    {
      id: 'apt-006',
      appointmentCode: 'APT-9006',
      patientId: 'pat-006',
      patientName: 'Liam Chen',
      doctorId: 'doc-002',
      doctorName: 'Dr. Elena Rostova, MD',
      appointmentDate: findAvailableDate(doctors[1], 6),
      timeSlot: '11:00 - 11:30',
      reason: 'Tension headache assessment',
      status: 'Confirmed',
      notes: 'New patient neurology referral.',
      createdAt: isoDaysAgo(1, 10, 0)
    }
  ];

  const medicalRecords: IMedicalRecord[] = [
    {
      id: 'rec-001',
      patientId: 'pat-001',
      doctorId: 'doc-001',
      doctorName: 'Dr. Alexander Reed, MD',
      recordType: 'ClinicalNote',
      title: 'Post-Admission Cardiac Examination',
      notes:
        'Patient presented with resting chest discomfort. ECG indicates sinus tachycardia. Blood pressure elevated at 155/95. Commenced on beta-blockers and telemetry monitoring.',
      vitalSigns: {
        bloodPressure: '155/95',
        heartRate: 98,
        temperature: 98.6,
        spo2: 97
      },
      createdAt: isoDaysAgo(5, 11, 0)
    },
    {
      id: 'rec-002',
      patientId: 'pat-002',
      doctorId: 'doc-002',
      doctorName: 'Dr. Elena Rostova, MD',
      recordType: 'Consultation',
      title: 'Neurology Consultation - Migraine With Aura',
      notes:
        'Recurrent visual aura followed by unilateral throbbing headache. No focal deficit. Started on abortive therapy and advised trigger diary.',
      vitalSigns: {
        bloodPressure: '118/76',
        heartRate: 72,
        temperature: 98.2,
        spo2: 99
      },
      createdAt: isoDaysAgo(2, 11, 30)
    },
    {
      id: 'rec-003',
      patientId: 'pat-003',
      doctorId: 'doc-001',
      doctorName: 'Dr. Alexander Reed, MD',
      recordType: 'Diagnosis',
      title: 'Hyperlipidaemia Review',
      notes:
        'LDL elevated at 3.1 mmol/L. Cardiovascular risk discussed. Lifestyle modification and statin therapy initiated.',
      vitalSigns: {
        bloodPressure: '132/84',
        heartRate: 76,
        temperature: 98.4,
        spo2: 98
      },
      createdAt: isoDaysAgo(6, 10, 45)
    },
    {
      id: 'rec-004',
      patientId: 'pat-004',
      doctorId: 'doc-002',
      doctorName: 'Dr. Elena Rostova, MD',
      recordType: 'ClinicalNote',
      title: 'Migraine Medication Tolerance Review',
      notes:
        'Patient reports good tolerance of triptan therapy. No chest pain or palpitations. Continue as required dosing.',
      vitalSigns: {
        bloodPressure: '122/78',
        heartRate: 68,
        temperature: 98.1,
        spo2: 99
      },
      createdAt: isoDaysAgo(9, 15, 20)
    },
    {
      id: 'rec-005',
      patientId: 'pat-005',
      doctorId: 'doc-001',
      doctorName: 'Dr. Alexander Reed, MD',
      recordType: 'ClinicalNote',
      title: 'Stable Angina Outpatient Review',
      notes:
        'No rest pain. Exercise tolerance stable. Continue antiplatelet and statin therapy; review in 6 months.',
      vitalSigns: {
        bloodPressure: '128/80',
        heartRate: 74,
        temperature: 98.3,
        spo2: 98
      },
      createdAt: isoDaysAgo(70, 9, 45)
    }
  ];

  const patientById = new Map(patients.map((patient) => [patient.id, patient]));
  const ageOf = (patientId: string, onDate: string): number => {
    const patient = patientById.get(patientId);
    return patient ? calculateAge(patient.dob, onDate) : 0;
  };

  const prescriptions: IPrescription[] = [
    {
      id: 'rx-001',
      prescriptionCode: 'RX-5001',
      patientId: 'pat-001',
      patientName: 'James Harrison',
      patientCode: 'PAT-1001',
      patientDob: '1985-06-14',
      patientAge: ageOf('pat-001', isoDaysAgo(12)),
      doctorId: 'doc-001',
      doctorName: 'Dr. Alexander Reed, MD',
      diagnosis: 'Hypertension & Unstable Angina pectoris',
      medicines: [
        {
          medicineName: 'Metoprolol Tartrate',
          dosage: '50mg',
          frequency: 'Twice daily (after meals)',
          duration: '14 days',
          instructions: 'Take with morning and evening meals. Monitor heart rate.'
        },
        {
          medicineName: 'Aspirin (Enteric Coated)',
          dosage: '81mg',
          frequency: 'Once daily',
          duration: '30 days',
          instructions: 'Take in the morning with water.'
        },
        {
          medicineName: 'Atorvastatin',
          dosage: '40mg',
          frequency: 'Once daily (at night)',
          duration: '30 days',
          instructions: 'Take at bedtime.'
        }
      ],
      generalAdvice: 'Low sodium diet, maintain bed rest during ICU stay, avoid strenuous activity.',
      prescribedAt: isoDaysAgo(12, 11, 30)
    },
    {
      id: 'rx-002',
      prescriptionCode: 'RX-5002',
      patientId: 'pat-002',
      patientName: 'Emma Watson-Clarke',
      patientCode: 'PAT-1002',
      patientDob: '1992-11-23',
      patientAge: ageOf('pat-002', isoDaysAgo(2)),
      doctorId: 'doc-002',
      doctorName: 'Dr. Elena Rostova, MD',
      diagnosis: 'Migraine without aura',
      medicines: [
        {
          medicineName: 'Sumatriptan',
          dosage: '50mg',
          frequency: 'As needed at migraine onset',
          duration: '6 doses',
          instructions: 'Maximum two doses in 24 hours. Do not drive after use.'
        },
        {
          medicineName: 'Propranolol',
          dosage: '20mg',
          frequency: 'Twice daily',
          duration: '30 days',
          instructions: 'Take with food; monitor pulse.'
        }
      ],
      generalAdvice: 'Maintain a headache diary and avoid known triggers such as dehydration and poor sleep.',
      prescribedAt: isoDaysAgo(2, 12, 0)
    },
    {
      id: 'rx-003',
      prescriptionCode: 'RX-5003',
      patientId: 'pat-003',
      patientName: 'Sofia Ramirez',
      patientCode: 'PAT-1003',
      patientDob: '1978-03-09',
      patientAge: ageOf('pat-003', isoDaysAgo(6)),
      doctorId: 'doc-001',
      doctorName: 'Dr. Alexander Reed, MD',
      diagnosis: 'Hyperlipidaemia',
      medicines: [
        {
          medicineName: 'Rosuvastatin',
          dosage: '10mg',
          frequency: 'Once daily at night',
          duration: '90 days',
          instructions: 'Report muscle pain promptly.'
        }
      ],
      generalAdvice: 'Mediterranean-style diet and 150 minutes of moderate exercise per week.',
      prescribedAt: isoDaysAgo(6, 11, 0)
    },
    {
      id: 'rx-004',
      prescriptionCode: 'RX-5004',
      patientId: 'pat-004',
      patientName: 'Daniel Okafor',
      patientCode: 'PAT-1004',
      patientDob: '2001-12-02',
      patientAge: ageOf('pat-004', isoDaysAgo(9)),
      doctorId: 'doc-002',
      doctorName: 'Dr. Elena Rostova, MD',
      diagnosis: 'Migraine with aura',
      medicines: [
        {
          medicineName: 'Ibuprofen',
          dosage: '400mg',
          frequency: 'Three times daily with food',
          duration: '3 days',
          instructions: 'Take only during acute episodes.'
        }
      ],
      generalAdvice: 'Hydration, regular sleep and trigger avoidance.',
      prescribedAt: isoDaysAgo(9, 15, 45)
    },
    {
      id: 'rx-005',
      prescriptionCode: 'RX-5005',
      patientId: 'pat-005',
      patientName: 'Aisha Rahman',
      patientCode: 'PAT-1005',
      patientDob: '1969-07-21',
      patientAge: ageOf('pat-005', isoDaysAgo(70)),
      doctorId: 'doc-001',
      doctorName: 'Dr. Alexander Reed, MD',
      diagnosis: 'Stable angina pectoris',
      medicines: [
        {
          medicineName: 'Aspirin',
          dosage: '75mg',
          frequency: 'Once daily',
          duration: '180 days',
          instructions: 'Take after breakfast.'
        },
        {
          medicineName: 'Bisoprolol',
          dosage: '5mg',
          frequency: 'Once daily',
          duration: '180 days',
          instructions: 'Do not stop abruptly.'
        }
      ],
      generalAdvice: 'Seek urgent care for chest pain at rest or lasting more than 15 minutes.',
      prescribedAt: isoDaysAgo(70, 10, 15)
    }
  ];

  const documents: IMedicalDocument[] = [
    {
      id: 'doc-med-001',
      patientId: 'pat-001',
      patientName: 'James Harrison',
      uploadedBy: 'usr-doc-01',
      uploaderRole: 'doctor',
      category: 'Report',
      title: '12-Lead Electrocardiogram (ECG) Report',
      originalFilename: 'ECG_Harrison_James_Synthetic.pdf',
      safeStorageKey: 'sample_ecg_report.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: sampleSize('sample_ecg_report.pdf'),
      isExternalRecord: false,
      createdAt: isoDaysAgo(12, 10, 15)
    },
    {
      id: 'doc-med-002',
      patientId: 'pat-001',
      patientName: 'James Harrison',
      uploadedBy: 'usr-pat-01',
      uploaderRole: 'patient',
      category: 'Other',
      title: 'Previous OPD Health Summary',
      originalFilename: 'OPD_Summary_Synthetic.pdf',
      safeStorageKey: 'sample_opd_summary.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: sampleSize('sample_opd_summary.pdf'),
      isExternalRecord: true,
      createdAt: isoDaysAgo(25, 12, 0)
    },
    {
      id: 'doc-med-003',
      patientId: 'pat-002',
      patientName: 'Emma Watson-Clarke',
      uploadedBy: 'usr-doc-02',
      uploaderRole: 'doctor',
      category: 'Report',
      title: 'Diagnostic Laboratory Panel',
      originalFilename: 'Diagnostic_Panel_Synthetic.pdf',
      safeStorageKey: 'sample_diagnostic_report.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: sampleSize('sample_diagnostic_report.pdf'),
      isExternalRecord: false,
      createdAt: isoDaysAgo(2, 9, 30)
    },
    {
      id: 'doc-med-004',
      patientId: 'pat-003',
      patientName: 'Sofia Ramirez',
      uploadedBy: 'usr-doc-01',
      uploaderRole: 'doctor',
      category: 'Report',
      title: 'Lipid Profile & Cardiac Risk Panel',
      originalFilename: 'Lipid_Profile_Synthetic.pdf',
      safeStorageKey: 'sample_lab_panel.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: sampleSize('sample_lab_panel.pdf'),
      isExternalRecord: false,
      createdAt: isoDaysAgo(6, 13, 0)
    },
    {
      id: 'doc-med-005',
      patientId: 'pat-004',
      patientName: 'Daniel Okafor',
      uploadedBy: 'usr-pat-04',
      uploaderRole: 'patient',
      category: 'Prescription',
      title: 'External Prescription Scan',
      originalFilename: 'External_Prescription_Synthetic.pdf',
      safeStorageKey: 'sample_prescription_scan.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: sampleSize('sample_prescription_scan.pdf'),
      isExternalRecord: true,
      createdAt: isoDaysAgo(9, 16, 0)
    }
  ];

  const bills: IBill[] = [
    {
      id: 'bill-001',
      billCode: 'INV-3001',
      patientId: 'pat-001',
      patientName: 'James Harrison',
      admissionId: 'adm-001',
      items: [
        {
          id: 'item-001-1',
          description: 'ICU Day 1 Room & Care Charge',
          category: 'Room Charges',
          quantity: 1,
          unitPrice: 500.0,
          amount: 500.0
        },
        {
          id: 'item-001-2',
          description: 'Emergency Cardiologist Consultation',
          category: 'Consultation',
          quantity: 1,
          unitPrice: 200.0,
          amount: 200.0
        },
        {
          id: 'item-001-3',
          description: '12-Lead ECG & Cardiac Enzyme Panel',
          category: 'Diagnostics',
          quantity: 1,
          unitPrice: 180.0,
          amount: 180.0
        }
      ],
      subtotal: 880.0,
      tax: 44.0,
      discount: 0.0,
      total: 924.0,
      amountPaid: 300.0,
      balance: 624.0,
      status: 'Partially Paid',
      createdAt: isoDaysAgo(12, 16, 0),
      updatedAt: isoDaysAgo(12, 16, 30)
    },
    {
      id: 'bill-002',
      billCode: 'INV-3002',
      patientId: 'pat-002',
      patientName: 'Emma Watson-Clarke',
      admissionId: null,
      items: [
        {
          id: 'item-002-1',
          description: 'Neurology Consultation',
          category: 'Consultation',
          quantity: 1,
          unitPrice: 175.0,
          amount: 175.0
        },
        {
          id: 'item-002-2',
          description: 'Neurology Baseline Blood Panel',
          category: 'Diagnostics',
          quantity: 1,
          unitPrice: 95.0,
          amount: 95.0
        }
      ],
      subtotal: 270.0,
      tax: 13.5,
      discount: 0.0,
      total: 283.5,
      amountPaid: 283.5,
      balance: 0,
      status: 'Paid',
      createdAt: isoDaysAgo(3, 11, 0),
      updatedAt: isoDaysAgo(3, 11, 30)
    },
    {
      id: 'bill-003',
      billCode: 'INV-3003',
      patientId: 'pat-003',
      patientName: 'Sofia Ramirez',
      admissionId: null,
      items: [
        {
          id: 'item-003-1',
          description: 'General Ward Bed Charge',
          category: 'Room Charges',
          quantity: 2,
          unitPrice: 250.0,
          amount: 500.0
        },
        {
          id: 'item-003-2',
          description: 'Nursing & Monitoring Fee',
          category: 'Nursing',
          quantity: 1,
          unitPrice: 120.0,
          amount: 120.0
        }
      ],
      subtotal: 620.0,
      tax: 31.0,
      discount: 0.0,
      total: 651.0,
      amountPaid: 0,
      balance: 651.0,
      status: 'Pending',
      createdAt: isoDaysAgo(45, 9, 0),
      updatedAt: isoDaysAgo(45, 9, 0)
    },
    {
      id: 'bill-004',
      billCode: 'INV-3004',
      patientId: 'pat-004',
      patientName: 'Daniel Okafor',
      admissionId: null,
      items: [
        {
          id: 'item-004-1',
          description: 'Neurology Follow-up Consultation',
          category: 'Consultation',
          quantity: 1,
          unitPrice: 175.0,
          amount: 175.0
        },
        {
          id: 'item-004-2',
          description: 'Inflammatory Marker Panel',
          category: 'Diagnostics',
          quantity: 1,
          unitPrice: 60.0,
          amount: 60.0
        }
      ],
      subtotal: 235.0,
      tax: 11.75,
      discount: 0.0,
      total: 246.75,
      amountPaid: 100.0,
      balance: 146.75,
      status: 'Partially Paid',
      createdAt: isoDaysAgo(8, 15, 0),
      updatedAt: isoDaysAgo(8, 15, 30)
    },
    {
      id: 'bill-005',
      billCode: 'INV-3005',
      patientId: 'pat-005',
      patientName: 'Aisha Rahman',
      admissionId: null,
      items: [
        {
          id: 'item-005-1',
          description: 'Cardiology Consultation',
          category: 'Consultation',
          quantity: 1,
          unitPrice: 150.0,
          amount: 150.0
        },
        {
          id: 'item-005-2',
          description: 'Cardiac Stress Test',
          category: 'Diagnostics',
          quantity: 1,
          unitPrice: 180.0,
          amount: 180.0
        }
      ],
      subtotal: 330.0,
      tax: 16.5,
      discount: 0.0,
      total: 346.5,
      amountPaid: 346.5,
      balance: 0,
      status: 'Paid',
      createdAt: isoDaysAgo(80, 10, 0),
      updatedAt: isoDaysAgo(80, 10, 30)
    },
    {
      id: 'bill-006',
      billCode: 'INV-3006',
      patientId: 'pat-006',
      patientName: 'Liam Chen',
      admissionId: null,
      items: [
        {
          id: 'item-006-1',
          description: 'Neurology New Patient Consultation',
          category: 'Consultation',
          quantity: 1,
          unitPrice: 175.0,
          amount: 175.0
        }
      ],
      subtotal: 175.0,
      tax: 8.75,
      discount: 0.0,
      total: 183.75,
      amountPaid: 0,
      balance: 183.75,
      status: 'Pending',
      createdAt: isoDaysAgo(150, 11, 0),
      updatedAt: isoDaysAgo(150, 11, 0)
    },
    {
      id: 'bill-007',
      billCode: 'INV-3007',
      patientId: 'pat-001',
      patientName: 'James Harrison',
      admissionId: null,
      items: [
        {
          id: 'item-007-1',
          description: 'Post-Discharge Cardiology Check',
          category: 'Consultation',
          quantity: 1,
          unitPrice: 150.0,
          amount: 150.0
        }
      ],
      subtotal: 150.0,
      tax: 7.5,
      discount: 0.0,
      total: 157.5,
      amountPaid: 157.5,
      balance: 0,
      status: 'Paid',
      createdAt: isoDaysAgo(1, 14, 0),
      updatedAt: isoDaysAgo(1, 14, 30)
    }
  ];

  const insurancePolicies: IInsurancePolicy[] = [
    {
      id: 'pol-001',
      patientId: 'pat-001',
      provider: 'Blue Cross Comprehensive Healthcare',
      policyNumber: 'BCBS-9948201-IL',
      policyHolderName: 'James Harrison',
      coverageAmount: 50000,
      validUntil: '2027-12-31',
      createdAt: isoDaysAgo(200, 9, 0)
    },
    {
      id: 'pol-002',
      patientId: 'pat-002',
      provider: 'Aetna Health Plans',
      policyNumber: 'AET-4420-MA',
      policyHolderName: 'Emma Watson-Clarke',
      coverageAmount: 25000,
      validUntil: '2027-06-30',
      createdAt: isoDaysAgo(200, 9, 5)
    },
    {
      id: 'pol-003',
      patientId: 'pat-003',
      provider: 'UnitedHealthcare',
      policyNumber: 'UHC-7781-IL',
      policyHolderName: 'Sofia Ramirez',
      coverageAmount: 30000,
      validUntil: '2027-09-30',
      createdAt: isoDaysAgo(200, 9, 10)
    },
    {
      id: 'pol-004',
      patientId: 'pat-004',
      provider: 'Cigna Healthcare',
      policyNumber: 'CIG-3390-MA',
      policyHolderName: 'Daniel Okafor',
      coverageAmount: 20000,
      validUntil: '2027-03-31',
      createdAt: isoDaysAgo(200, 9, 15)
    },
    {
      id: 'pol-005',
      patientId: 'pat-005',
      provider: 'Blue Cross Comprehensive Healthcare',
      policyNumber: 'BCBS-1180-IL',
      policyHolderName: 'Aisha Rahman',
      coverageAmount: 45000,
      validUntil: '2027-11-30',
      createdAt: isoDaysAgo(200, 9, 20)
    },
    {
      id: 'pol-006',
      patientId: 'pat-006',
      provider: 'Aetna Health Plans',
      policyNumber: 'AET-9902-MA',
      policyHolderName: 'Liam Chen',
      coverageAmount: 22000,
      validUntil: '2027-08-31',
      createdAt: isoDaysAgo(200, 9, 25)
    }
  ];

  const insuranceClaims: IInsuranceClaim[] = [
    {
      id: 'clm-001',
      claimCode: 'CLM-7001',
      patientId: 'pat-001',
      patientName: 'James Harrison',
      billId: 'bill-001',
      provider: 'Blue Cross Comprehensive Healthcare',
      policyNumber: 'BCBS-9948201-IL',
      claimAmount: 624.0,
      status: 'Submitted',
      remarks: 'Inpatient ICU cardiac care coverage claim submitted.',
      submittedAt: isoDaysAgo(10, 17, 0),
      adjudicatedAt: null
    },
    {
      id: 'clm-002',
      claimCode: 'CLM-7002',
      patientId: 'pat-002',
      patientName: 'Emma Watson-Clarke',
      billId: 'bill-002',
      provider: 'Aetna Health Plans',
      policyNumber: 'AET-4420-MA',
      claimAmount: 283.5,
      approvedAmount: 240.0,
      status: 'Approved',
      remarks: 'Approved at 85% of billed neurology package.',
      submittedAt: isoDaysAgo(2, 13, 0),
      adjudicatedAt: isoDaysAgo(1, 10, 0)
    },
    {
      id: 'clm-003',
      claimCode: 'CLM-7003',
      patientId: 'pat-004',
      patientName: 'Daniel Okafor',
      billId: 'bill-004',
      provider: 'Cigna Healthcare',
      policyNumber: 'CIG-3390-MA',
      claimAmount: 146.75,
      approvedAmount: 0,
      status: 'Rejected',
      remarks: 'Rejected: waiting-period exclusion applies to this policy year.',
      submittedAt: isoDaysAgo(7, 14, 0),
      adjudicatedAt: isoDaysAgo(6, 9, 30)
    },
    {
      id: 'clm-004',
      claimCode: 'CLM-7004',
      patientId: 'pat-005',
      patientName: 'Aisha Rahman',
      billId: 'bill-005',
      provider: 'Blue Cross Comprehensive Healthcare',
      policyNumber: 'BCBS-1180-IL',
      claimAmount: 346.5,
      approvedAmount: 300.0,
      status: 'Approved',
      remarks: 'Approved with standard co-payment deduction.',
      submittedAt: isoDaysAgo(70, 12, 0),
      adjudicatedAt: isoDaysAgo(65, 16, 0)
    },
    {
      id: 'clm-005',
      claimCode: 'CLM-7005',
      patientId: 'pat-003',
      patientName: 'Sofia Ramirez',
      billId: 'bill-003',
      provider: 'UnitedHealthcare',
      policyNumber: 'UHC-7781-IL',
      claimAmount: 651.0,
      status: 'Submitted',
      remarks: 'Awaiting payer review for inpatient observation stay.',
      submittedAt: isoDaysAgo(40, 11, 0),
      adjudicatedAt: null
    }
  ];

  const auditLogs: IAuditLog[] = [
    {
      id: 'aud-001',
      timestamp: isoDaysAgo(5, 9, 30),
      actorId: 'usr-admin-01',
      actorName: 'Dr. Sarah Mitchell (Administrator)',
      actorRole: 'admin',
      action: 'PATIENT_ADMISSION',
      resourceType: 'Admission',
      resourceId: 'adm-001',
      status: 'SUCCESS',
      ipAddress: '127.0.0.1',
      details: { patientId: 'pat-001', bedNumber: 'ICU-101-A', doctorId: 'doc-001' }
    },
    {
      id: 'aud-002',
      timestamp: isoDaysAgo(2, 13, 0),
      actorId: 'usr-bill-01',
      actorName: 'Marcus Vance (Finance Officer)',
      actorRole: 'billing',
      action: 'INSURANCE_CLAIM_SUBMITTED',
      resourceType: 'InsuranceClaim',
      resourceId: 'clm-002',
      status: 'SUCCESS',
      ipAddress: '127.0.0.1',
      details: { claimCode: 'CLM-7002', provider: 'Aetna Health Plans' }
    },
    {
      id: 'aud-003',
      timestamp: isoDaysAgo(12, 16, 0),
      actorId: 'usr-bill-01',
      actorName: 'Marcus Vance (Finance Officer)',
      actorRole: 'billing',
      action: 'BILL_GENERATED',
      resourceType: 'Bill',
      resourceId: 'bill-001',
      status: 'SUCCESS',
      ipAddress: '127.0.0.1',
      details: { billCode: 'INV-3001', total: 924 }
    },
    {
      id: 'aud-004',
      timestamp: isoDaysAgo(1, 8, 15),
      actorId: 'usr-doc-01',
      actorName: 'Dr. Alexander Reed, MD',
      actorRole: 'doctor',
      action: 'USER_LOGIN',
      resourceType: 'User',
      resourceId: 'usr-doc-01',
      status: 'SUCCESS',
      ipAddress: '127.0.0.1'
    },
    {
      id: 'aud-005',
      timestamp: isoDaysAgo(6, 13, 0),
      actorId: 'usr-doc-01',
      actorName: 'Dr. Alexander Reed, MD',
      actorRole: 'doctor',
      action: 'DOCUMENT_UPLOADED',
      resourceType: 'MedicalDocument',
      resourceId: 'doc-med-004',
      status: 'SUCCESS',
      ipAddress: '127.0.0.1',
      details: { patientId: 'pat-003', category: 'Report' }
    },
    {
      id: 'aud-006',
      timestamp: isoDaysAgo(100, 10, 0),
      actorId: 'usr-admin-01',
      actorName: 'Dr. Sarah Mitchell (Administrator)',
      actorRole: 'admin',
      action: 'PATIENT_CREATED',
      resourceType: 'Patient',
      resourceId: 'pat-006',
      status: 'SUCCESS',
      ipAddress: '127.0.0.1',
      details: { patientCode: 'PAT-1006' }
    }
  ];

  const notifications: INotification[] = [
    {
      id: 'notif-001',
      recipientId: 'usr-pat-01',
      recipientRole: 'patient',
      title: 'Admission Confirmed',
      message: 'You have been admitted to ICU-101 (Bed ICU-101-A) under Dr. Alexander Reed.',
      type: 'INFO',
      isRead: false,
      link: '/portal/patient/admissions',
      createdAt: isoDaysAgo(5, 9, 30)
    },
    {
      id: 'notif-002',
      recipientId: 'usr-doc-01',
      recipientRole: 'doctor',
      title: 'New Patient Assigned',
      message: 'Patient James Harrison (PAT-1001) has been assigned to your clinical care.',
      type: 'ALERT',
      isRead: false,
      link: '/portal/doctor/patients',
      createdAt: isoDaysAgo(5, 9, 30)
    },
    {
      id: 'notif-003',
      recipientId: 'usr-pat-02',
      recipientRole: 'patient',
      title: 'Insurance Claim Approved',
      message: 'Claim CLM-7002 has been approved for $240.00.',
      type: 'SUCCESS',
      isRead: false,
      link: '/portal/patient/billing',
      createdAt: isoDaysAgo(1, 10, 0)
    }
  ];

  return {
    users,
    doctors,
    patients,
    wards,
    admissions,
    appointments,
    medicalRecords,
    prescriptions,
    documents,
    bills,
    insuranceClaims,
    insurancePolicies,
    auditLogs,
    notifications
  };
};
