import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { db } from '../../src/database/index.js';
import { AuthService } from '../../src/services/auth.service.js';

describe('System & End-to-End Testing (ST-01 to ST-10)', () => {
  let app: any;
  let adminToken: string;
  let doctorToken: string;
  let patient1Token: string;
  let patient2Token: string;
  let billingToken: string;

  beforeEach(async () => {
    await db.resetForTesting();
    app = createApp();

    const adminAuth = await AuthService.login('admin@hospitalcare.demo', 'Admin@123');
    adminToken = adminAuth.token;

    const docAuth = await AuthService.login('doctor@hospitalcare.demo', 'Doctor@123');
    doctorToken = docAuth.token;

    const pat1Auth = await AuthService.login('patient@hospitalcare.demo', 'Patient@123');
    patient1Token = pat1Auth.token;

    const pat2Auth = await AuthService.login('patient2@hospitalcare.demo', 'Patient@123');
    patient2Token = pat2Auth.token;

    const billAuth = await AuthService.login('billing@hospitalcare.demo', 'Billing@123');
    billingToken = billAuth.token;
  });

  // ST-01: Admin completes admission
  it('ST-01: Admin completes admission successfully', async () => {
    const res = await request(app)
      .post('/api/admissions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        patientId: 'pat-002',
        doctorId: 'doc-002',
        wardId: 'ward-gen-a',
        roomNumber: 'GEN-201',
        bedNumber: 'GEN-201-A',
        reason: 'Observation',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.admission.status).toBe('Admitted');
  });

  // ST-02: Admin cannot allocate occupied bed
  it('ST-02: Admin cannot allocate an already occupied bed', async () => {
    const res = await request(app)
      .post('/api/admissions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        patientId: 'pat-002',
        doctorId: 'doc-001',
        wardId: 'ward-icu',
        roomNumber: 'ICU-101',
        bedNumber: 'ICU-101-A', // Already Occupied
        reason: 'Observation',
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('BED_NOT_AVAILABLE');
  });

  // ST-03: Doctor views assigned patients
  it('ST-03: Doctor views only assigned patients', async () => {
    const res = await request(app)
      .get('/api/patients')
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res.status).toBe(200);

    const returnedIds = res.body.data.patients.map((p: any) => p.id);
    const assignedIds = db.patients
      .filter((patient) => patient.assignedDoctorId === 'doc-001')
      .map((patient) => patient.id);

    expect(returnedIds.length).toBeGreaterThan(0);
    expect(returnedIds.sort()).toEqual(assignedIds.sort());
    expect(returnedIds).toContain('pat-001');
  });

  // ST-04: Doctor creates digital prescription
  it('ST-04: Doctor creates digital prescription for assigned patient', async () => {
    const res = await request(app)
      .post('/api/prescriptions')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        patientId: 'pat-001',
        diagnosis: 'Hypertension Management',
        medicines: [
          {
            medicineName: 'Amlodipine',
            dosage: '5mg',
            frequency: 'Once daily (morning)',
            duration: '30 days',
            instructions: 'Take after breakfast',
          },
        ],
        generalAdvice: 'Check blood pressure weekly.',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.prescription.prescriptionCode).toMatch(/^RX-/);
  });

  // ST-05: Patient views own records
  it('ST-05: Patient views their own medical records', async () => {
    const res = await request(app)
      .get('/api/records/patient/pat-001')
      .set('Authorization', `Bearer ${patient1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.records.length).toBeGreaterThan(0);
  });

  // ST-06: Patient uploads external record
  it('ST-06: Patient uploads external medical record', async () => {
    const fakePdf = Buffer.from('%PDF-1.4 dummy scan content %%EOF');

    const res = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${patient1Token}`)
      .field('patientId', 'pat-001')
      .field('category', 'Report')
      .field('title', 'Previous Clinic Discharge Summary')
      .field('isExternalRecord', 'true')
      .attach('file', fakePdf, 'summary.pdf');

    expect(res.status).toBe(201);
    expect(res.body.data.document.isExternalRecord).toBe(true);
  });

  // ST-07: Unauthorized record access (IDOR Prevention)
  it('ST-07: Patient cannot access another patient’s records (IDOR Guard)', async () => {
    // Patient 1 tries to access Patient 2's medical records
    const res = await request(app)
      .get('/api/records/patient/pat-002')
      .set('Authorization', `Bearer ${patient1Token}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('IDOR_FORBIDDEN');
  });

  // ST-08: Billing / invoice calculation and payment
  it('ST-08: Billing staff generates bill and records payment', async () => {
    const billRes = await request(app)
      .post('/api/bills')
      .set('Authorization', `Bearer ${billingToken}`)
      .send({
        patientId: 'pat-001',
        items: [
          { description: 'Cardiology Followup', category: 'Consultation', quantity: 1, unitPrice: 150.0 },
          { description: 'Blood Lipid Profile', category: 'Diagnostics', quantity: 1, unitPrice: 50.0 },
        ],
        discount: 10.0,
        taxRatePercent: 5.0,
      });

    expect(billRes.status).toBe(201);
    // Subtotal: 200, Discount: 10 -> 190 + 5% tax (9.50) -> Total: 199.50
    expect(billRes.body.data.bill.total).toBe(199.5);
    expect(billRes.body.data.bill.balance).toBe(199.5);

    // Make partial payment of 100.00
    const payRes = await request(app)
      .post(`/api/bills/${billRes.body.data.bill.id}/payments`)
      .set('Authorization', `Bearer ${billingToken}`)
      .send({ amountPaid: 100.0 });

    expect(payRes.status).toBe(200);
    expect(payRes.body.data.bill.status).toBe('Partially Paid');
    expect(payRes.body.data.bill.balance).toBe(99.5);
  });

  // ST-09: Discharge releases bed
  it('ST-09: Patient discharge automatically frees the occupied bed', async () => {
    const res = await request(app)
      .post('/api/admissions/adm-001/discharge')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        diagnosis: 'Angina stabilized',
        treatmentGiven: 'Telemetry & medical therapy',
        adviceOnDischarge: 'Rest and follow-up in 2 weeks',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.admission.status).toBe('Discharged');

    const ward = db.wards.find((w) => w.id === 'ward-icu');
    const bed = ward?.rooms.find((r) => r.roomNumber === 'ICU-101')?.beds.find((b) => b.bedNumber === 'ICU-101-A');
    expect(bed?.status).toBe('Available');
  });

  // ST-10: Invalid login handling
  it('ST-10: Invalid login fails with 401 error safely', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@hospitalcare.demo',
        password: 'WrongPassword123!',
      });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });
});
