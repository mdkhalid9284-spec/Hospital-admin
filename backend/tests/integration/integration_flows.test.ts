import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { db } from '../../src/database/index.js';
import { AuthService } from '../../src/services/auth.service.js';

describe('Integration Testing: Multi-Module Cross-Flow Verification (IT-01 to IT-08)', () => {
  let app: any;
  let adminToken: string;
  let doctorToken: string;
  let patientToken: string;
  let billingToken: string;

  beforeEach(async () => {
    await db.resetForTesting();
    app = createApp();

    const adminAuth = await AuthService.login('admin@hospitalcare.demo', 'Admin@123');
    adminToken = adminAuth.token;

    const docAuth = await AuthService.login('doctor@hospitalcare.demo', 'Doctor@123');
    doctorToken = docAuth.token;

    const patAuth = await AuthService.login('patient@hospitalcare.demo', 'Patient@123');
    patientToken = patAuth.token;

    const billAuth = await AuthService.login('billing@hospitalcare.demo', 'Billing@123');
    billingToken = billAuth.token;
  });

  // IT-01: Authentication -> Patient Flow
  it('IT-01: Authentication -> Patient: Token authentication securely loads patient profile', async () => {
    const res = await request(app)
      .get('/api/patients/pat-001')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.patient.id).toBe('pat-001');
    expect(res.body.data.patient.fullName).toBe('James Harrison');
  });

  // IT-02: Patient -> Admission Flow
  it('IT-02: Patient -> Admission: Creating an admission associates it with patient', async () => {
    const res = await request(app)
      .post('/api/admissions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        patientId: 'pat-002',
        doctorId: 'doc-002',
        wardId: 'ward-gen-a',
        roomNumber: 'GEN-201',
        bedNumber: 'GEN-201-A',
        reason: 'Severe migraine observation',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.admission.patientId).toBe('pat-002');
  });

  // IT-03: Admission -> Bed Flow
  it('IT-03: Admission -> Bed: Admission immediately updates bed state to Occupied', async () => {
    await request(app)
      .post('/api/admissions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        patientId: 'pat-002',
        doctorId: 'doc-002',
        wardId: 'ward-gen-a',
        roomNumber: 'GEN-201',
        bedNumber: 'GEN-201-B',
        reason: 'Observation',
      });

    const boardRes = await request(app)
      .get('/api/beds/board')
      .set('Authorization', `Bearer ${adminToken}`);

    const ward = boardRes.body.data.wards.find((w: any) => w.id === 'ward-gen-a');
    const bed = ward.rooms.find((r: any) => r.roomNumber === 'GEN-201').beds.find((b: any) => b.bedNumber === 'GEN-201-B');
    expect(bed.status).toBe('Occupied');
  });

  // IT-04: Admission -> Doctor Flow
  it('IT-04: Admission -> Doctor: Doctor is linked to the admitted patient', async () => {
    await request(app)
      .post('/api/admissions')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        patientId: 'pat-002',
        doctorId: 'doc-001',
        wardId: 'ward-gen-a',
        roomNumber: 'GEN-201',
        bedNumber: 'GEN-201-C',
        reason: 'Cardiac monitoring',
      });

    const doctor = db.doctors.find((d) => d.id === 'doc-001');
    expect(doctor?.assignedPatientIds).toContain('pat-002');
  });

  // IT-05: Admission -> Patient Record History
  it('IT-05: Admission -> Patient Record: Admissions query accurately lists patient history', async () => {
    const res = await request(app)
      .get('/api/admissions?patientId=pat-001')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.admissions.length).toBeGreaterThan(0);
    expect(res.body.data.admissions[0].patientId).toBe('pat-001');
  });

  // IT-06: Doctor -> Medical Record Flow
  it('IT-06: Doctor -> Medical Record: Doctor writes clinical note and it is stored with doctor attribution', async () => {
    const res = await request(app)
      .post('/api/records/clinical-note')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        patientId: 'pat-001',
        title: 'Morning Rounds Update',
        notes: 'Blood pressure stabilised to 125/80. Telemetry shows regular sinus rhythm.',
        vitalSigns: { bloodPressure: '125/80', heartRate: 72, temperature: 98.4, spo2: 99 },
      });

    expect(res.status).toBe(201);
    expect(res.body.data.record.doctorName).toContain('Dr. Alexander Reed');
  });

  // IT-07: Patient -> Documents Flow
  it('IT-07: Patient -> Documents: Patient uploads previous record and queries own documents', async () => {
    const fakePdf = Buffer.from('%PDF-1.4 dummy scan content %%EOF');

    const uploadRes = await request(app)
      .post('/api/documents/upload')
      .set('Authorization', `Bearer ${patientToken}`)
      .field('patientId', 'pat-001')
      .field('category', 'Report')
      .field('title', 'External Blood Panel')
      .field('isExternalRecord', 'true')
      .attach('file', fakePdf, 'blood_test.pdf');

    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body.data.document.title).toBe('External Blood Panel');

    const listRes = await request(app)
      .get('/api/documents')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.documents.some((d: any) => d.title === 'External Blood Panel')).toBe(true);
  });

  // IT-08: Billing -> Discharge Flow
  it('IT-08: Billing -> Discharge: Discharge updates admission status and frees the bed', async () => {
    // adm-001 is admitted in bed ICU-101-A
    const dischargeRes = await request(app)
      .post('/api/admissions/adm-001/discharge')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        diagnosis: 'Acute angina resolved under therapy',
        treatmentGiven: 'Beta-blockers, telemetry monitoring, low-salt diet',
        adviceOnDischarge: 'Continue Metoprolol 50mg daily. Review in outpatient clinic in 2 weeks.',
      });

    expect(dischargeRes.status).toBe(200);
    expect(dischargeRes.body.data.admission.status).toBe('Discharged');

    // Verify bed is released to Available
    const ward = db.wards.find((w) => w.id === 'ward-icu');
    const bed = ward?.rooms.find((r) => r.roomNumber === 'ICU-101')?.beds.find((b) => b.bedNumber === 'ICU-101-A');
    expect(bed?.status).toBe('Available');
    expect(bed?.currentPatientId).toBeNull();
  });
});
