import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../src/database/index.js';
import { PatientService } from '../../src/services/patient.service.js';
import { PrescriptionService } from '../../src/services/prescription.service.js';
import { AppointmentService } from '../../src/services/appointment.service.js';

describe('Doctor Patient Visibility & Prescription Creation', () => {
  const doctorActor = {
    id: 'usr-doc-01',
    name: 'Dr. Alexander Reed, MD',
    role: 'doctor' as const,
  };
  const doctorId = 'doc-001';

  beforeEach(async () => {
    await db.resetForTesting();
  });

  it('allows doctor to see a patient assigned via appointment in getAll', async () => {
    // Create a new patient Sarah
    const sarah = await PatientService.create(
      {
        fullName: 'Sarah Jenkins',
        dob: '1995-04-12',
        gender: 'female',
        phone: '+1 (555) 789-0123',
        email: 'sarah.jenkins@example.com',
        bloodGroup: 'A+',
        address: '123 Pine St',
        emergencyContact: {
          name: 'Bob Jenkins',
          relationship: 'Father',
          phone: '+1 (555) 789-0124',
        },
      },
      { id: 'usr-admin-01', name: 'Admin', role: 'admin' }
    );

    // Prior to appointment or assignment, doctor doc-001 does not see Sarah
    const beforeAppt = await PatientService.getAll({}, 'doctor', doctorId);
    expect(beforeAppt.patients.some((p) => p.id === sarah.id)).toBe(false);

    // Book an appointment for Sarah with doc-001
    await AppointmentService.bookAppointment(
      {
        patientId: sarah.id,
        doctorId: doctorId,
        appointmentDate: '2026-11-20',
        timeSlot: '10:00 - 10:30',
        reason: 'General consultation',
      },
      doctorActor
    );

    // Now Sarah must appear in doctor's My Patients / patient list
    const afterAppt = await PatientService.getAll({}, 'doctor', doctorId);
    expect(afterAppt.patients.some((p) => p.id === sarah.id)).toBe(true);

    // Compose a prescription for Sarah
    const prescription = await PrescriptionService.createPrescription(
      {
        patientId: sarah.id,
        doctorId: doctorId,
        diagnosis: 'Seasonal Allergies',
        medicines: [
          {
            medicineName: 'Cetirizine',
            dosage: '10mg',
            frequency: 'Once daily',
            duration: '7 days',
            instructions: 'Take before sleep',
          },
        ],
        generalAdvice: 'Avoid allergens and drink water.',
      },
      doctorActor
    );

    expect(prescription).toBeDefined();
    expect(prescription.patientId).toBe(sarah.id);
    expect(prescription.doctorId).toBe(doctorId);

    // Prescriptions list for Sarah should now include this prescription
    const prescriptions = await PrescriptionService.getByPatientId(sarah.id);
    expect(prescriptions.length).toBeGreaterThan(0);
    expect(prescriptions[0].prescriptionCode).toBe(prescription.prescriptionCode);
  });

  it('preserves RBAC: doctor cannot create prescription for unassigned patient without appointment', async () => {
    // pat-002 is assigned to doc-002 and has no appointment with doc-001
    const unassignedPatientId = 'pat-002';

    await expect(
      PrescriptionService.createPrescription(
        {
          patientId: unassignedPatientId,
          doctorId: doctorId,
          diagnosis: 'Unauthorized condition',
          medicines: [
            {
              medicineName: 'Aspirin',
              dosage: '100mg',
              frequency: 'Once daily',
              duration: '3 days',
              instructions: 'Take after meals',
            },
          ],
        },
        doctorActor
      )
    ).rejects.toThrow('Forbidden');
  });
});
