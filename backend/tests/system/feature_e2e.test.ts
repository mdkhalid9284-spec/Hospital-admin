import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { createApp } from '../../src/app.js';
import { db } from '../../src/database/index.js';
import { AuthService } from '../../src/services/auth.service.js';
import { calculateAge, rangeStartDate, toISODate } from '../../src/utils/date.js';
import { config } from '../../src/config/index.js';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const addDays = (base: Date, days: number): Date => {
  const copy = new Date(base);
  copy.setDate(copy.getDate() + days);
  return copy;
};

const nextDateMatching = (allowedDays: number[]): string => {
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  for (let offset = 1; offset <= 21; offset += 1) {
    const candidate = addDays(cursor, offset);
    if (allowedDays.includes(candidate.getDay())) return toISODate(candidate);
  }
  throw new Error('Could not find a matching weekday within three weeks');
};

const PDF_BYTES = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n',
  'utf8'
);

describe('Feature end-to-end verification (appointments, analytics, documents, prescriptions, finance, insurance)', () => {
  let app: any;
  let adminToken: string;
  let doctorToken: string;
  let patient1Token: string;
  let patient2Token: string;
  let billingToken: string;

  beforeEach(async () => {
    await db.resetForTesting();
    app = createApp();

    adminToken = (await AuthService.login('admin@hospitalcare.demo', 'Admin@123')).token;
    doctorToken = (await AuthService.login('doctor@hospitalcare.demo', 'Doctor@123')).token;
    patient1Token = (await AuthService.login('patient@hospitalcare.demo', 'Patient@123')).token;
    patient2Token = (await AuthService.login('patient2@hospitalcare.demo', 'Patient@123')).token;
    billingToken = (await AuthService.login('billing@hospitalcare.demo', 'Billing@123')).token;
  });

  // ---------------------------------------------------------------------------
  // Appointments
  // ---------------------------------------------------------------------------
  describe('Appointment conflict prevention', () => {
    it('allows exactly one of two concurrent bookings for the same doctor/date/slot', async () => {
      // doc-001 works Monday-Friday.
      const date = nextDateMatching([1, 2, 3, 4, 5]);
      const slotsRes = await request(app)
        .get(`/api/appointments/available-slots?doctorId=doc-001&date=${date}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(slotsRes.status).toBe(200);
      expect(slotsRes.body.data.isDoctorAvailable).toBe(true);
      const slot = slotsRes.body.data.availableSlots[0];
      expect(slot).toBeTruthy();

      const payload = {
        doctorId: 'doc-001',
        appointmentDate: date,
        timeSlot: slot,
        reason: 'Concurrency verification',
      };

      const [first, second] = await Promise.all([
        request(app)
          .post('/api/appointments')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ ...payload, patientId: 'pat-001' }),
        request(app)
          .post('/api/appointments')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ ...payload, patientId: 'pat-003' }),
      ]);

      const statuses = [first.status, second.status].sort();
      expect(statuses).toEqual([201, 409]);

      const conflict = first.status === 409 ? first : second;
      expect(conflict.body.error.code).toBe('SLOT_UNAVAILABLE');
      expect(conflict.body.error.message).toMatch(/no longer available/i);

      const matching = db.appointments.filter(
        (appointment) =>
          appointment.doctorId === 'doc-001' &&
          appointment.appointmentDate === date &&
          appointment.timeSlot === slot &&
          appointment.status !== 'Cancelled'
      );
      expect(matching).toHaveLength(1);
    });

    it('releases a slot when an appointment is cancelled and permits rebooking', async () => {
      const date = nextDateMatching([1, 2, 3, 4, 5]);
      const slotsRes = await request(app)
        .get(`/api/appointments/available-slots?doctorId=doc-001&date=${date}`)
        .set('Authorization', `Bearer ${adminToken}`);
      const slot = slotsRes.body.data.availableSlots[0];

      const booked = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          patientId: 'pat-001',
          doctorId: 'doc-001',
          appointmentDate: date,
          timeSlot: slot,
          reason: 'Cancellation verification',
        });
      expect(booked.status).toBe(201);

      const cancelled = await request(app)
        .patch(`/api/appointments/${booked.body.data.appointment.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Cancelled' });
      expect(cancelled.status).toBe(200);
      expect(cancelled.body.data.appointment.status).toBe('Cancelled');

      const rebooked = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          patientId: 'pat-003',
          doctorId: 'doc-001',
          appointmentDate: date,
          timeSlot: slot,
          reason: 'Rebooking after cancellation',
        });
      expect(rebooked.status).toBe(201);
    });

    it('lets different doctors hold the same date and time slot', async () => {
      // Intersection of doc-001 (Mon-Fri) and doc-002 (Tue/Wed/Thu/Sat).
      const date = nextDateMatching([2, 3, 4]);

      const [doc1Slots, doc2Slots] = await Promise.all([
        request(app)
          .get(`/api/appointments/available-slots?doctorId=doc-001&date=${date}`)
          .set('Authorization', `Bearer ${adminToken}`),
        request(app)
          .get(`/api/appointments/available-slots?doctorId=doc-002&date=${date}`)
          .set('Authorization', `Bearer ${adminToken}`),
      ]);

      const sharedSlot = doc1Slots.body.data.availableSlots.find((slot: string) =>
        doc2Slots.body.data.availableSlots.includes(slot)
      );
      expect(sharedSlot).toBeTruthy();

      const [doc1Booking, doc2Booking] = await Promise.all([
        request(app)
          .post('/api/appointments')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            patientId: 'pat-001',
            doctorId: 'doc-001',
            appointmentDate: date,
            timeSlot: sharedSlot,
            reason: 'Parallel clinic A',
          }),
        request(app)
          .post('/api/appointments')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({
            patientId: 'pat-002',
            doctorId: 'doc-002',
            appointmentDate: date,
            timeSlot: sharedSlot,
            reason: 'Parallel clinic B',
          }),
      ]);

      expect(doc1Booking.status).toBe(201);
      expect(doc2Booking.status).toBe(201);
    });

    it('rejects past dates, non-standard slots and unavailable weekdays', async () => {
      const validDate = nextDateMatching([1, 2, 3, 4, 5]);

      const past = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          patientId: 'pat-001',
          doctorId: 'doc-001',
          appointmentDate: '2020-01-02',
          timeSlot: '09:00 - 09:30',
          reason: 'Past date',
        });
      expect(past.status).toBe(400);
      expect(past.body.error.code).toBe('DATE_IN_PAST');

      const invalidSlot = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          patientId: 'pat-001',
          doctorId: 'doc-001',
          appointmentDate: validDate,
          timeSlot: '08:15 - 08:45',
          reason: 'Invalid slot',
        });
      expect(invalidSlot.status).toBe(400);
      expect(invalidSlot.body.error.code).toBe('INVALID_TIME_SLOT');

      // doc-001 does not hold a Sunday clinic.
      const sunday = nextDateMatching([0]);
      const unavailable = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          patientId: 'pat-001',
          doctorId: 'doc-001',
          appointmentDate: sunday,
          timeSlot: '09:00 - 09:30',
          reason: 'Unavailable weekday',
        });
      expect(unavailable.status).toBe(409);
      expect(unavailable.body.error.code).toBe('DOCTOR_NOT_AVAILABLE');
    });
  });

  // ---------------------------------------------------------------------------
  // Analytics
  // ---------------------------------------------------------------------------
  describe('Range-aware analytics', () => {
    it('applies 7d and 1y ranges to KPIs, trends and breakdowns', async () => {
      const seven = await request(app)
        .get('/api/analytics/summary?range=7d')
        .set('Authorization', `Bearer ${adminToken}`);
      const year = await request(app)
        .get('/api/analytics/summary?range=1y')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(seven.status).toBe(200);
      expect(year.status).toBe(200);

      expect(seven.body.data.range).toMatchObject({ key: '7d', days: 7 });
      expect(year.body.data.range).toMatchObject({ key: '1y', days: 365 });
      expect(seven.body.data.range.fromDate).toBe(
        toISODate(rangeStartDate('7d').from)
      );
      expect(year.body.data.range.fromDate).toBe(
        toISODate(rangeStartDate('1y').from)
      );

      expect(seven.body.data.revenueTrend).toHaveLength(7);
      expect(year.body.data.revenueTrend.length).toBeGreaterThanOrEqual(12);

      expect(year.body.data.appointmentsInRange).toBeGreaterThanOrEqual(
        seven.body.data.appointmentsInRange
      );
      expect(year.body.data.grossBilled).toBeGreaterThanOrEqual(
        seven.body.data.grossBilled
      );
      expect(Array.isArray(seven.body.data.consultationBreakdown)).toBe(true);
      expect(seven.body.data.consultationBreakdown.length).toBeGreaterThan(0);
      expect(seven.body.data.bedOccupancyTrend).toHaveLength(7);
      expect(seven.body.data.appointmentStatusBreakdown).toHaveLength(4);
      expect(seven.body.data.averageOccupancyRate).toBeGreaterThanOrEqual(0);
    });

    it('rejects unsupported ranges and non-privileged callers', async () => {
      const invalid = await request(app)
        .get('/api/analytics/summary?range=14d')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(invalid.status).toBe(400);
      expect(invalid.body.error.code).toBe('INVALID_ANALYTICS_RANGE');

      const forbidden = await request(app)
        .get('/api/analytics/summary?range=30d')
        .set('Authorization', `Bearer ${patient1Token}`);
      expect(forbidden.status).toBe(403);
    });

    it('reconciles analytics financial KPIs with persisted bills and claims', async () => {
      const [analytics, billsRes, claimsRes] = await Promise.all([
        request(app)
          .get('/api/analytics/summary?range=1y')
          .set('Authorization', `Bearer ${adminToken}`),
        request(app)
          .get('/api/bills')
          .set('Authorization', `Bearer ${billingToken}`),
        request(app)
          .get('/api/insurance/claims')
          .set('Authorization', `Bearer ${billingToken}`),
      ]);

      const bills = billsRes.body.data.bills;
      const claims = claimsRes.body.data.claims;

      const gross = bills.reduce((sum: number, bill: any) => sum + bill.total, 0);
      const realised = bills.reduce((sum: number, bill: any) => sum + bill.amountPaid, 0);
      const receivables = bills.reduce((sum: number, bill: any) => sum + bill.balance, 0);
      const recoveries = claims
        .filter((claim: any) => claim.status === 'Approved')
        .reduce((sum: number, claim: any) => sum + (claim.approvedAmount ?? 0), 0);

      expect(analytics.body.data.grossBilled).toBeCloseTo(gross, 2);
      expect(analytics.body.data.totalRevenue).toBeCloseTo(realised, 2);
      expect(analytics.body.data.pendingRevenue).toBeCloseTo(receivables, 2);
      expect(analytics.body.data.insurerRecoveries).toBeCloseTo(recoveries, 2);
    });
  });

  // ---------------------------------------------------------------------------
  // Documents
  // ---------------------------------------------------------------------------
  describe('Document lifecycle and authorization', () => {
    it('uploads, lists, downloads and persists a real document', async () => {
      const upload = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${patient1Token}`)
        .field('patientId', 'pat-001')
        .field('category', 'Report')
        .field('title', 'E2E Synthetic Discharge Summary')
        .attach('file', PDF_BYTES, 'discharge-summary.pdf');

      expect(upload.status).toBe(201);
      const document = upload.body.data.document;
      expect(document.patientId).toBe('pat-001');
      expect(document.mimeType).toBe('application/pdf');
      expect(document.fileSizeBytes).toBe(PDF_BYTES.length);
      expect(document.title).toBe('E2E Synthetic Discharge Summary');
      expect(fs.existsSync(path.join(config.storage.localPath, document.safeStorageKey))).toBe(
        true
      );

      const list = await request(app)
        .get('/api/documents/patient/pat-001')
        .set('Authorization', `Bearer ${patient1Token}`);
      expect(list.status).toBe(200);
      expect(
        list.body.data.documents.some((item: any) => item.id === document.id)
      ).toBe(true);

      const download = await request(app)
        .get(`/api/documents/${document.id}/download`)
        .set('Authorization', `Bearer ${patient1Token}`);
      expect(download.status).toBe(200);
      expect(download.headers['content-type']).toContain('application/pdf');
      expect(download.headers['content-disposition']).toContain('attachment');
      expect(Buffer.from(download.body).subarray(0, 4).toString()).toBe('%PDF');
    });

    it('blocks cross-patient and unassigned-doctor downloads', async () => {
      const crossPatient = await request(app)
        .get('/api/documents/doc-med-001/download')
        .set('Authorization', `Bearer ${patient2Token}`);
      expect(crossPatient.status).toBe(403);
      expect(crossPatient.body.error.code).toBe('FORBIDDEN_DOCUMENT_ACCESS');

      const unassignedDoctor = await request(app)
        .get('/api/documents/doc-med-001/download')
        .set('Authorization', `Bearer ${doctorToken}`);
      expect(unassignedDoctor.status).toBe(200);

      // doc-002 is not assigned to pat-001, whose ECG this is.
      const doc2Token = (await AuthService.login('doctor2@hospitalcare.demo', 'Doctor@123')).token;
      const forbiddenDoctor = await request(app)
        .get('/api/documents/doc-med-001/download')
        .set('Authorization', `Bearer ${doc2Token}`);
      expect(forbiddenDoctor.status).toBe(403);
      expect(forbiddenDoctor.body.error.code).toBe('FORBIDDEN_DOCUMENT_ACCESS');
    });

    it('validates MIME type, magic bytes, size and missing files', async () => {
      const badMime = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${patient1Token}`)
        .field('patientId', 'pat-001')
        .field('category', 'Report')
        .field('title', 'Executable upload')
        .attach('file', Buffer.from('plain text'), 'notes.txt');
      expect(badMime.status).toBe(400);
      expect(badMime.body.error.code).toBe('INVALID_MIME_TYPE');

      const badSignature = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${patient1Token}`)
        .field('patientId', 'pat-001')
        .field('category', 'Report')
        .field('title', 'Spoofed PDF')
        .attach('file', Buffer.from('not really a pdf'), {
          filename: 'spoof.pdf',
          contentType: 'application/pdf',
        });
      expect(badSignature.status).toBe(400);
      expect(badSignature.body.error.code).toBe('INVALID_FILE_SIGNATURE');

      const missingFile = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${patient1Token}`)
        .field('patientId', 'pat-001')
        .field('category', 'Report')
        .field('title', 'No file provided');
      expect(missingFile.status).toBe(400);
      expect(missingFile.body.error.code).toBe('FILE_MISSING');

      const oversized = Buffer.concat([
        Buffer.from('%PDF-1.4', 'utf8'),
        Buffer.alloc(10 * 1024 * 1024 + 8, 0x20),
      ]);
      const tooLarge = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${patient1Token}`)
        .field('patientId', 'pat-001')
        .field('category', 'Report')
        .field('title', 'Oversized PDF')
        .attach('file', oversized, {
          filename: 'oversized.pdf',
          contentType: 'application/pdf',
        });
      expect(tooLarge.status).toBe(413);
      expect(tooLarge.body.error.code).toBe('FILE_TOO_LARGE');
    }, 30000);

    it('returns a clear 404 when the stored file is missing from disk', async () => {
      const upload = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${patient1Token}`)
        .field('patientId', 'pat-001')
        .field('category', 'Report')
        .field('title', 'Temporary storage document')
        .attach('file', PDF_BYTES, 'temporary.pdf');
      expect(upload.status).toBe(201);

      const document = upload.body.data.document;
      fs.unlinkSync(path.join(config.storage.localPath, document.safeStorageKey));

      const download = await request(app)
        .get(`/api/documents/${document.id}/download`)
        .set('Authorization', `Bearer ${patient1Token}`);
      expect(download.status).toBe(404);
      expect(download.body.error.code).toBe('FILE_MISSING');
    });

    it('denies the billing role access to clinical documents', async () => {
      const res = await request(app)
        .get('/api/documents')
        .set('Authorization', `Bearer ${billingToken}`);
      expect(res.status).toBe(403);
    });
  });

  // ---------------------------------------------------------------------------
  // Prescriptions
  // ---------------------------------------------------------------------------
  describe('Prescription persistence and authorization', () => {
    it('persists patient identity, birthday-aware age, date and doctor', async () => {
      const before = Date.now();
      const res = await request(app)
        .post('/api/prescriptions')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          patientId: 'pat-001',
          diagnosis: 'Stable angina follow-up',
          medicines: [
            {
              medicineName: 'Aspirin',
              dosage: '75mg',
              frequency: 'Once daily',
              duration: '30 days',
              instructions: 'Take after food',
            },
          ],
          generalAdvice: 'Return if chest pain worsens.',
        });

      expect(res.status).toBe(201);
      const prescription = res.body.data.prescription;
      expect(prescription.patientName).toBe('James Harrison');
      expect(prescription.patientCode).toBe('PAT-1001');
      expect(prescription.patientDob).toBe('1985-06-14');
      expect(prescription.patientAge).toBe(
        calculateAge('1985-06-14', new Date(prescription.prescribedAt))
      );
      expect(new Date(prescription.prescribedAt).getTime()).toBeGreaterThanOrEqual(before - 1000);
      expect(prescription.doctorName).toContain('Alexander Reed');
      expect(prescription.doctorId).toBe('doc-001');
      expect(prescription.diagnosis).toBe('Stable angina follow-up');

      const patientView = await request(app)
        .get('/api/prescriptions/patient/pat-001')
        .set('Authorization', `Bearer ${patient1Token}`);
      expect(patientView.status).toBe(200);
      expect(
        patientView.body.data.prescriptions.some(
          (item: any) => item.id === prescription.id
        )
      ).toBe(true);
    });

    it('prevents prescribing for or reading unassigned patients', async () => {
      const unassigned = await request(app)
        .post('/api/prescriptions')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          patientId: 'pat-002',
          diagnosis: 'Not my patient',
          medicines: [
            {
              medicineName: 'Paracetamol',
              dosage: '500mg',
              frequency: 'Twice daily',
              duration: '3 days',
              instructions: '',
            },
          ],
        });
      expect(unassigned.status).toBe(403);
      expect(unassigned.body.error.code).toBe('NOT_ASSIGNED_PATIENT');

      const idor = await request(app)
        .get('/api/prescriptions/patient/pat-002')
        .set('Authorization', `Bearer ${patient1Token}`);
      expect(idor.status).toBe(403);
      expect(idor.body.error.code).toBe('IDOR_FORBIDDEN');
    });
  });

  // ---------------------------------------------------------------------------
  // Financial reports
  // ---------------------------------------------------------------------------
  describe('Financial report filtering', () => {
    it('filters bills and claims by the requested start date', async () => {
      const from = toISODate(rangeStartDate('30d').from);

      const [billsRes, claimsRes] = await Promise.all([
        request(app)
          .get(`/api/bills?from=${from}`)
          .set('Authorization', `Bearer ${billingToken}`),
        request(app)
          .get(`/api/insurance/claims?from=${from}`)
          .set('Authorization', `Bearer ${billingToken}`),
      ]);

      expect(billsRes.status).toBe(200);
      expect(claimsRes.status).toBe(200);
      expect(billsRes.body.data.bills.length).toBeGreaterThan(0);
      expect(
        billsRes.body.data.bills.every(
          (bill: any) => bill.createdAt.slice(0, 10) >= from
        )
      ).toBe(true);
      expect(
        claimsRes.body.data.claims.every(
          (claim: any) => claim.submittedAt.slice(0, 10) >= from
        )
      ).toBe(true);
      expect(billsRes.body.data.total).toBe(billsRes.body.data.bills.length);
      expect(claimsRes.body.data.total).toBe(claimsRes.body.data.claims.length);
    });

    it('serves the canonical insurance and billing routes', async () => {
      const canonical = await request(app)
        .get('/api/insurance/claims')
        .set('Authorization', `Bearer ${billingToken}`);
      expect(canonical.status).toBe(200);

      const statusFiltered = await request(app)
        .get('/api/insurance/claims?status=Submitted')
        .set('Authorization', `Bearer ${billingToken}`);
      expect(statusFiltered.status).toBe(200);
      expect(
        statusFiltered.body.data.claims.every(
          (claim: any) => claim.status === 'Submitted'
        )
      ).toBe(true);

      // The SPA previously called a non-existent /api/billing router.
      const removedRoute = await request(app)
        .get('/api/billing')
        .set('Authorization', `Bearer ${billingToken}`);
      expect(removedRoute.status).toBe(404);
    });
  });

  // ---------------------------------------------------------------------------
  // Insurance claims lifecycle
  // ---------------------------------------------------------------------------
  describe('Insurance claim lifecycle', () => {
    const claimPayload = {
      patientId: 'pat-006',
      billId: 'bill-006',
      provider: 'Aetna Health Plans',
      policyNumber: 'AET-9902-MA',
      claimAmount: 183.75,
      remarks: 'E2E claim submission',
    };

    it('creates, lists and approves a claim with validated transitions', async () => {
      const created = await request(app)
        .post('/api/insurance/claims')
        .set('Authorization', `Bearer ${billingToken}`)
        .send(claimPayload);

      expect(created.status).toBe(201);
      expect(created.body.data.claim.status).toBe('Submitted');
      expect(created.body.data.claim.claimCode).toMatch(/^CLM-/);
      expect(created.body.data.claim.submittedAt).toBeTruthy();

      const listed = await request(app)
        .get('/api/insurance/claims')
        .set('Authorization', `Bearer ${billingToken}`);
      expect(
        listed.body.data.claims.some(
          (claim: any) => claim.id === created.body.data.claim.id
        )
      ).toBe(true);

      const duplicate = await request(app)
        .post('/api/insurance/claims')
        .set('Authorization', `Bearer ${billingToken}`)
        .send(claimPayload);
      expect(duplicate.status).toBe(409);
      expect(duplicate.body.error.code).toBe('DUPLICATE_CLAIM');

      const overApproved = await request(app)
        .patch(`/api/insurance/claims/${created.body.data.claim.id}/status`)
        .set('Authorization', `Bearer ${billingToken}`)
        .send({ status: 'Approved', approvedAmount: 500 });
      expect(overApproved.status).toBe(400);
      expect(overApproved.body.error.code).toBe('INVALID_APPROVED_AMOUNT');

      const approved = await request(app)
        .patch(`/api/insurance/claims/${created.body.data.claim.id}/status`)
        .set('Authorization', `Bearer ${billingToken}`)
        .send({
          status: 'Approved',
          approvedAmount: 150,
          remarks: 'Approved at 150.00',
        });
      expect(approved.status).toBe(200);
      expect(approved.body.data.claim.status).toBe('Approved');
      expect(approved.body.data.claim.approvedAmount).toBe(150);
      expect(approved.body.data.claim.adjudicatedBy).toBeTruthy();

      const terminal = await request(app)
        .patch(`/api/insurance/claims/${created.body.data.claim.id}/status`)
        .set('Authorization', `Bearer ${billingToken}`)
        .send({ status: 'Rejected', remarks: 'Attempted second adjudication' });
      expect(terminal.status).toBe(409);
      expect(terminal.body.error.code).toBe('INVALID_STATUS_TRANSITION');
    });

    it('requires rejection notes and permits correction/re-submission', async () => {
      const created = await request(app)
        .post('/api/insurance/claims')
        .set('Authorization', `Bearer ${billingToken}`)
        .send({
          patientId: 'pat-001',
          billId: 'bill-007',
          provider: 'Blue Cross Comprehensive Healthcare',
          policyNumber: 'BCBS-9948201-IL',
          claimAmount: 157.5,
        });
      expect(created.status).toBe(201);

      const noNotes = await request(app)
        .patch(`/api/insurance/claims/${created.body.data.claim.id}/status`)
        .set('Authorization', `Bearer ${billingToken}`)
        .send({ status: 'Rejected' });
      expect(noNotes.status).toBe(400);
      expect(noNotes.body.error.code).toBe('REJECTION_NOTES_REQUIRED');

      const rejected = await request(app)
        .patch(`/api/insurance/claims/${created.body.data.claim.id}/status`)
        .set('Authorization', `Bearer ${billingToken}`)
        .send({
          status: 'Rejected',
          remarks: 'Coverage exhausted for this policy year.',
        });
      expect(rejected.status).toBe(200);
      expect(rejected.body.data.claim.status).toBe('Rejected');
      expect(rejected.body.data.claim.approvedAmount).toBe(0);

      const resubmitted = await request(app)
        .post('/api/insurance/claims')
        .set('Authorization', `Bearer ${billingToken}`)
        .send({
          patientId: 'pat-001',
          billId: 'bill-007',
          provider: 'Blue Cross Comprehensive Healthcare',
          policyNumber: 'BCBS-9948201-IL',
          claimAmount: 157.5,
          remarks: 'Corrected resubmission after rejection.',
        });
      expect(resubmitted.status).toBe(201);
      expect(resubmitted.body.data.claim.status).toBe('Submitted');
    });

    it('rejects mismatched, excessive and unauthorised claims', async () => {
      const mismatched = await request(app)
        .post('/api/insurance/claims')
        .set('Authorization', `Bearer ${billingToken}`)
        .send({ ...claimPayload, patientId: 'pat-001' });
      expect(mismatched.status).toBe(400);
      expect(mismatched.body.error.code).toBe('BILL_PATIENT_MISMATCH');

      const excessive = await request(app)
        .post('/api/insurance/claims')
        .set('Authorization', `Bearer ${billingToken}`)
        .send({ ...claimPayload, claimAmount: 9999 });
      expect(excessive.status).toBe(400);
      expect(excessive.body.error.code).toBe('CLAIM_EXCEEDS_BILL');

      const crossPolicy = await request(app)
        .post('/api/insurance/claims')
        .set('Authorization', `Bearer ${billingToken}`)
        .send({
          ...claimPayload,
          policyNumber: 'BCBS-9948201-IL',
        });
      expect(crossPolicy.status).toBe(403);
      expect(crossPolicy.body.error.code).toBe('POLICY_PATIENT_MISMATCH');

      const doctorForbidden = await request(app)
        .post('/api/insurance/claims')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send(claimPayload);
      expect(doctorForbidden.status).toBe(403);

      const patientAdjudication = await request(app)
        .patch('/api/insurance/claims/clm-001/status')
        .set('Authorization', `Bearer ${patient1Token}`)
        .send({ status: 'Approved', approvedAmount: 100 });
      expect(patientAdjudication.status).toBe(403);
    });

    it('scopes claim listings to the authenticated patient', async () => {
      const patient1Claims = await request(app)
        .get('/api/insurance/claims')
        .set('Authorization', `Bearer ${patient1Token}`);
      expect(patient1Claims.status).toBe(200);
      expect(
        patient1Claims.body.data.claims.every(
          (claim: any) => claim.patientId === 'pat-001'
        )
      ).toBe(true);

      const patient2Claims = await request(app)
        .get('/api/insurance/claims')
        .set('Authorization', `Bearer ${patient2Token}`);
      expect(patient2Claims.status).toBe(200);
      expect(
        patient2Claims.body.data.claims.every(
          (claim: any) => claim.patientId === 'pat-002'
        )
      ).toBe(true);
    });
  });
});
