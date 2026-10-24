import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { db } from '../../src/database/index.js';
import { AuthService } from '../../src/services/auth.service.js';
import { DocumentService } from '../../src/services/document.service.js';

describe('Black-Box Testing: Equivalence Partitioning, Boundary Value & Decision Tables', () => {
  let app: any;
  let adminToken: string;

  beforeEach(async () => {
    await db.resetForTesting();
    app = createApp();
    const loginRes = await AuthService.login('admin@hospitalcare.demo', 'Admin@123');
    adminToken = loginRes.token;
  });

  // --- Equivalence Partitioning (EP) ---
  describe('Equivalence Partitioning (TC-EP-01 to TC-EP-05)', () => {
    it('TC-EP-01: Valid admission with valid patient, available bed, available doctor', async () => {
      const res = await request(app)
        .post('/api/admissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          patientId: 'pat-002',
          doctorId: 'doc-001',
          wardId: 'ward-gen-a',
          roomNumber: 'GEN-201',
          bedNumber: 'GEN-201-A',
          reason: 'Observation for pneumonia',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.admission.status).toBe('Admitted');
    });

    it('TC-EP-02: Invalid partition - Unregistered patient', async () => {
      const res = await request(app)
        .post('/api/admissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          patientId: 'pat-unknown-999',
          doctorId: 'doc-001',
          wardId: 'ward-gen-a',
          roomNumber: 'GEN-201',
          bedNumber: 'GEN-201-B',
          reason: 'Checkup',
        });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('PATIENT_NOT_FOUND');
    });

    it('TC-EP-03: Invalid partition - Missing mandatory field (reason)', async () => {
      const res = await request(app)
        .post('/api/admissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          patientId: 'pat-002',
          doctorId: 'doc-001',
          wardId: 'ward-gen-a',
          roomNumber: 'GEN-201',
          bedNumber: 'GEN-201-B',
          // reason missing
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('TC-EP-04: Invalid partition - Occupied bed', async () => {
      const res = await request(app)
        .post('/api/admissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          patientId: 'pat-002',
          doctorId: 'doc-001',
          wardId: 'ward-icu',
          roomNumber: 'ICU-101',
          bedNumber: 'ICU-101-A', // Already occupied by pat-001
          reason: 'Emergency',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('BED_NOT_AVAILABLE');
    });

    it('TC-EP-05: Invalid partition - Unavailable / Inactive doctor', async () => {
      const res = await request(app)
        .post('/api/admissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          patientId: 'pat-002',
          doctorId: 'doc-invalid-404',
          wardId: 'ward-gen-a',
          roomNumber: 'GEN-201',
          bedNumber: 'GEN-201-B',
          reason: 'Observation',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DOCTOR_UNAVAILABLE');
    });
  });

  // --- Boundary Value Analysis (BVA) ---
  describe('Boundary Value Analysis (TC-BVA-01 to TC-BVA-03)', () => {
    it('TC-BVA-01: Boundary - Zero available beds in target room/ward', async () => {
      // Occupy all beds in SP-301
      const ward = db.wards.find((w) => w.id === 'ward-semi-p');
      const room = ward?.rooms.find((r) => r.roomNumber === 'SP-301');
      room?.beds.forEach((b) => (b.status = 'Occupied'));

      const res = await request(app)
        .post('/api/admissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          patientId: 'pat-002',
          doctorId: 'doc-001',
          wardId: 'ward-semi-p',
          roomNumber: 'SP-301',
          bedNumber: 'SP-301-A',
          reason: 'Post-op observation',
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('BED_NOT_AVAILABLE');
    });

    it('TC-BVA-02: Boundary - Exactly one available bed transitions available count to 0', async () => {
      const res = await request(app)
        .post('/api/admissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          patientId: 'pat-002',
          doctorId: 'doc-001',
          wardId: 'ward-semi-p',
          roomNumber: 'SP-301',
          bedNumber: 'SP-301-A',
          reason: 'Post-op observation',
        });

      expect(res.status).toBe(201);
      const updatedWard = db.wards.find((w) => w.id === 'ward-semi-p');
      expect(updatedWard?.occupiedBeds).toBe(1);
    });

    it('TC-BVA-03: Boundary - Document magic bytes and format verification', async () => {
      // Valid PDF buffer (%PDF-)
      const validPdfBuffer = Buffer.from('%PDF-1.4 sample content %%EOF');
      expect(DocumentService.validateMagicBytes(validPdfBuffer, 'application/pdf')).toBe(true);

      // Invalid disguised file buffer (e.g. executable script disguised as PDF)
      const invalidPdfBuffer = Buffer.from('#!/bin/bash echo attack');
      expect(DocumentService.validateMagicBytes(invalidPdfBuffer, 'application/pdf')).toBe(false);
    });
  });

  // --- Decision Table Testing (DT) ---
  describe('Decision Table Testing (TC-DT-01 to TC-DT-05)', () => {
    it('TC-DT-01: Rule 1: C1=Y, C2=Y, C3=Y, C4=Y -> Admission Approved', async () => {
      const res = await request(app)
        .post('/api/admissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          patientId: 'pat-002',
          doctorId: 'doc-002',
          wardId: 'ward-gen-a',
          roomNumber: 'GEN-201',
          bedNumber: 'GEN-201-B',
          reason: 'Neurological inpatient evaluation',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.admission.status).toBe('Admitted');
    });

    it('TC-DT-02: Rule 2: C1=Y, C2=Y, C3=N (Occupied Bed), C4=Y -> Admission Rejected', async () => {
      const res = await request(app)
        .post('/api/admissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          patientId: 'pat-002',
          doctorId: 'doc-002',
          wardId: 'ward-icu',
          roomNumber: 'ICU-101',
          bedNumber: 'ICU-101-A', // Occupied
          reason: 'Observation',
        });

      expect(res.status).toBe(409);
    });

    it('TC-DT-03: Rule 3: C1=Y, C2=Y, C3=Y, C4=N (Inactive Doctor) -> Admission Rejected', async () => {
      const res = await request(app)
        .post('/api/admissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          patientId: 'pat-002',
          doctorId: 'doc-missing',
          wardId: 'ward-gen-a',
          roomNumber: 'GEN-201',
          bedNumber: 'GEN-201-B',
          reason: 'Observation',
        });

      expect(res.status).toBe(409);
    });

    it('TC-DT-04: Rule 4: C1=Y, C2=N (Missing Details), C3=Y, C4=Y -> Admission Rejected', async () => {
      const res = await request(app)
        .post('/api/admissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          patientId: 'pat-002',
          doctorId: 'doc-002',
          wardId: 'ward-gen-a',
          roomNumber: 'GEN-201',
          bedNumber: 'GEN-201-B',
          reason: '', // Invalid reason
        });

      expect(res.status).toBe(400);
    });

    it('TC-DT-05: Rule 5: C1=N (Unregistered Patient), C2=Y, C3=Y, C4=Y -> Admission Rejected', async () => {
      const res = await request(app)
        .post('/api/admissions')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          patientId: 'pat-unknown-999',
          doctorId: 'doc-002',
          wardId: 'ward-gen-a',
          roomNumber: 'GEN-201',
          bedNumber: 'GEN-201-B',
          reason: 'Observation',
        });

      expect(res.status).toBe(404);
    });
  });
});
