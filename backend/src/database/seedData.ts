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
  IAuditLog,
  INotification
} from '../models/types.js';

// Standard demo password hash for "Hospital@123" ($2a$10$w85oJ1O1o9rFv9yO4k/7Z.0dMhQh96N94l9.qK8e.O2hW6uFj7nSu)
// Generated at runtime dynamically during seed initialization for salt authenticity

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
      consultationFee: 150.00,
      availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      slotDurationMinutes: 30,
      isActive: true,
      assignedPatientIds: ['pat-001']
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
      consultationFee: 175.00,
      availableDays: ['Tuesday', 'Wednesday', 'Thursday', 'Saturday'],
      slotDurationMinutes: 30,
      isActive: true,
      assignedPatientIds: ['pat-002']
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
              allocatedAt: new Date('2026-02-15T09:30:00Z').toISOString()
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
      admissionDate: new Date('2026-02-15T09:30:00Z').toISOString(),
      status: 'Admitted',
      dischargeDate: null,
      dischargeSummary: null,
      createdAt: new Date('2026-02-15T09:30:00Z').toISOString(),
      updatedAt: new Date('2026-02-15T09:30:00Z').toISOString()
    }
  ];

  const appointments: IAppointment[] = [
    {
      id: 'apt-001',
      appointmentCode: 'APT-9001',
      patientId: 'pat-002',
      patientName: 'Emma Watson-Clarke',
      doctorId: 'doc-002',
      doctorName: 'Dr. Elena Rostova, MD',
      appointmentDate: '2026-10-05',
      timeSlot: '10:00 - 10:30',
      reason: 'Persistent migraine and aura evaluation',
      status: 'Confirmed',
      notes: 'Initial consultation request',
      createdAt: new Date('2026-02-10T14:00:00Z').toISOString()
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
      notes: 'Patient presented with resting chest discomfort. ECG indicates sinus tachycardia. Blood pressure elevated at 155/95. Commenced on beta-blockers and telemetry monitoring.',
      vitalSigns: {
        bloodPressure: '155/95',
        heartRate: 98,
        temperature: 98.6,
        spo2: 97
      },
      createdAt: new Date('2026-02-15T11:00:00Z').toISOString()
    }
  ];

  const prescriptions: IPrescription[] = [
    {
      id: 'rx-001',
      prescriptionCode: 'RX-5001',
      patientId: 'pat-001',
      patientName: 'James Harrison',
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
      prescribedAt: new Date('2026-02-15T11:30:00Z').toISOString()
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
      originalFilename: 'ECG_Harrison_James_Feb15.pdf',
      safeStorageKey: 'sample_ecg_report.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 245760,
      isExternalRecord: false,
      createdAt: new Date('2026-02-15T10:15:00Z').toISOString()
    },
    {
      id: 'doc-med-002',
      patientId: 'pat-001',
      patientName: 'James Harrison',
      uploadedBy: 'usr-pat-01',
      uploaderRole: 'patient',
      category: 'Other',
      title: 'Previous OPD Health Summary (2025)',
      originalFilename: 'OPD_Summary_2025.pdf',
      safeStorageKey: 'sample_opd_summary.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 512000,
      isExternalRecord: true,
      createdAt: new Date('2026-02-01T12:00:00Z').toISOString()
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
          id: 'item-1',
          description: 'ICU Day 1 Room & Care Charge',
          category: 'Room Charges',
          quantity: 1,
          unitPrice: 500.00,
          amount: 500.00
        },
        {
          id: 'item-2',
          description: 'Emergency Cardiologist Consultation',
          category: 'Consultation',
          quantity: 1,
          unitPrice: 200.00,
          amount: 200.00
        },
        {
          id: 'item-3',
          description: '12-Lead ECG & Cardiac Enzyme Panel',
          category: 'Diagnostics',
          quantity: 1,
          unitPrice: 180.00,
          amount: 180.00
        }
      ],
      subtotal: 880.00,
      tax: 44.00, // 5%
      discount: 0.00,
      total: 924.00,
      amountPaid: 300.00,
      balance: 624.00,
      status: 'Partially Paid',
      createdAt: new Date('2026-02-15T16:00:00Z').toISOString(),
      updatedAt: new Date('2026-02-15T16:30:00Z').toISOString()
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
      claimAmount: 624.00,
      status: 'Submitted',
      remarks: 'Inpatient ICU cardiac care coverage claim submitted.',
      submittedAt: new Date('2026-02-15T17:00:00Z').toISOString(),
      adjudicatedAt: null
    }
  ];

  const auditLogs: IAuditLog[] = [
    {
      id: 'aud-001',
      timestamp: new Date('2026-02-15T09:30:00Z').toISOString(),
      actorId: 'usr-admin-01',
      actorName: 'Dr. Sarah Mitchell (Administrator)',
      actorRole: 'admin',
      action: 'PATIENT_ADMISSION',
      resourceType: 'Admission',
      resourceId: 'adm-001',
      status: 'SUCCESS',
      ipAddress: '127.0.0.1',
      details: { patientId: 'pat-001', bedNumber: 'ICU-101-A', doctorId: 'doc-001' }
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
      createdAt: new Date('2026-02-15T09:30:00Z').toISOString()
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
      createdAt: new Date('2026-02-15T09:30:00Z').toISOString()
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
    auditLogs,
    notifications
  };
};
