import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../src/database/index.js';
import { AdmissionService } from '../../src/services/admission.service.js';

describe('White-Box Basis Path Testing: Patient Admission Engine [V(G) = 4]', () => {
  const adminActor = {
    id: 'usr-admin-01',
    name: 'Dr. Sarah Mitchell',
    role: 'admin' as const,
  };

  beforeEach(async () => {
    await db.resetForTesting();
  });

  // Path 1: C1=Y, C2=Y, C3=Y, C4=Y -> All validations pass
  it('Path 1 (Independent Path 1): All checks pass -> Bed allocated, doctor assigned, admission created', async () => {
    // Bed ICU-101-B is Available, Patient pat-002 has no active admission, Doctor doc-001 is active
    const result = await AdmissionService.admitPatient(
      {
        patientId: 'pat-002',
        doctorId: 'doc-001',
        wardId: 'ward-icu',
        roomNumber: 'ICU-101',
        bedNumber: 'ICU-101-B',
        reason: 'Post-operative monitoring',
      },
      adminActor
    );

    expect(result).toBeDefined();
    expect(result.status).toBe('Admitted');
    expect(result.bedNumber).toBe('ICU-101-B');

    // Verify bed state changed to Occupied
    const ward = db.wards.find((w) => w.id === 'ward-icu');
    const bed = ward?.rooms.find((r) => r.roomNumber === 'ICU-101')?.beds.find((b) => b.bedNumber === 'ICU-101-B');
    expect(bed?.status).toBe('Occupied');
    expect(bed?.currentPatientId).toBe('pat-002');
  });

  // Path 2: C1=N -> Patient invalid / not found
  it('Path 2 (Independent Path 2): Patient does not exist -> Rejects with 404', async () => {
    await expect(
      AdmissionService.admitPatient(
        {
          patientId: 'pat-non-existent-999',
          doctorId: 'doc-001',
          wardId: 'ward-icu',
          roomNumber: 'ICU-101',
          bedNumber: 'ICU-101-B',
          reason: 'Observation',
        },
        adminActor
      )
    ).rejects.toThrowError(/does not exist/);
  });

  // Path 3: C3=N -> Bed unavailable / already occupied
  it('Path 3 (Independent Path 3): Bed is already occupied -> Rejects with 409 Conflict', async () => {
    // Bed ICU-101-A is already Occupied by pat-001 in seed data
    await expect(
      AdmissionService.admitPatient(
        {
          patientId: 'pat-002',
          doctorId: 'doc-001',
          wardId: 'ward-icu',
          roomNumber: 'ICU-101',
          bedNumber: 'ICU-101-A',
          reason: 'Emergency observation',
        },
        adminActor
      )
    ).rejects.toThrowError(/is currently Occupied/);
  });

  // Path 4: C4=N -> Doctor unavailable or inactive
  it('Path 4 (Independent Path 4): Doctor does not exist or is inactive -> Rejects with 409 Conflict', async () => {
    await expect(
      AdmissionService.admitPatient(
        {
          patientId: 'pat-002',
          doctorId: 'doc-inactive-or-missing',
          wardId: 'ward-icu',
          roomNumber: 'ICU-101',
          bedNumber: 'ICU-101-B',
          reason: 'General checkup',
        },
        adminActor
      )
    ).rejects.toThrowError(/Doctor with ID 'doc-inactive-or-missing' is not found/);
  });
});
