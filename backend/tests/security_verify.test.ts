import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { db } from '../src/database/index.js';
import { AuthService } from '../src/services/auth.service.js';

describe('Direct Security Verification: manipulated requests & IDOR probes', () => {
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

  it('SEC-01: Patient cannot call admin-only admission endpoint (403)', async () => {
    const res = await request(app)
      .post('/api/admissions')
      .set('Authorization', `Bearer ${patient1Token}`)
      .send({ patientId: 'pat-002', doctorId: 'doc-001', wardId: 'ward-gen-a', roomNumber: 'GEN-201', bedNumber: 'GEN-201-A', reason: 'x' });
    expect(res.status).toBe(403);
  });

  it('SEC-02: Doctor cannot access unassigned patient profile via guessed ID (403 IDOR)', async () => {
    // doctor doc-001 assigned to pat-001; try pat-002
    const res = await request(app)
      .get('/api/patients/pat-002')
      .set('Authorization', `Bearer ${doctorToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('IDOR_FORBIDDEN');
  });

  it('SEC-03: Doctor CAN access their own assigned patient (200)', async () => {
    const res = await request(app)
      .get('/api/patients/pat-001')
      .set('Authorization', `Bearer ${doctorToken}`);
    expect(res.status).toBe(200);
  });

  it('SEC-04: Patient cannot access another patient record (403 IDOR)', async () => {
    const res = await request(app)
      .get('/api/records/patient/pat-002')
      .set('Authorization', `Bearer ${patient1Token}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('IDOR_FORBIDDEN');
  });

  it('SEC-05: Billing staff cannot access clinical notes (403 - records route is doctor/patient/admin)', async () => {
    const res = await request(app)
      .get('/api/records/patient/pat-001')
      .set('Authorization', `Bearer ${billingToken}`);
    expect(res.status).toBe(403);
  });

  it('SEC-06: Billing staff cannot create clinical note (doctor-only, 403)', async () => {
    const res = await request(app)
      .post('/api/records/clinical-note')
      .set('Authorization', `Bearer ${billingToken}`)
      .send({ patientId: 'pat-001', title: 'x', notes: 'y' });
    expect(res.status).toBe(403);
  });

  it('SEC-07: Admin cannot update clinical note (doctor-only after hardening, 403)', async () => {
    const res = await request(app)
      .patch('/api/records/rec-001')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ notes: 'tampered' });
    expect(res.status).toBe(403);
  });

  it('SEC-08: Logout revokes token — subsequent protected call returns 401', async () => {
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(logoutRes.status).toBe(200);
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_REVOKED');
  });

  it('SEC-09: Guessed record IDs are rejected without auth (401)', async () => {
    const res = await request(app).get('/api/patients/pat-001');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('SEC-10: Role is server-authoritative — login returns DB role even if client expects otherwise', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'patient@hospitalcare.demo', password: 'Patient@123' });
    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('patient');
  });
});
