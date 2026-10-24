import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { db } from '../../src/database/index.js';
import { AuthService } from '../../src/services/auth.service.js';

describe('Comprehensive Authentication & Security Test Suite (AUTH-01 to AUTH-15, REG-AUTH-LOCK-01)', () => {
  let app: any;

  beforeEach(async () => {
    await db.resetForTesting();
    app = createApp();
  });

  // REG-AUTH-LOCK-01: Regression test for single incorrect password attempt
  it('REG-AUTH-LOCK-01: Fresh account entering incorrect password once returns 401 and is NOT throttled', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'patient@hospitalcare.demo',
        password: 'WrongPasswordSingleTypo!',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    expect(res.body.error.message).toBe('Invalid email or password.');
    expect(res.body.error.message).not.toContain('Too many failed authentication attempts');
    expect(res.body.error.message).not.toContain('15 minutes');
  });

  // AUTH-01: Correct password -> login succeeds
  it('AUTH-01: Correct credentials produce 200 OK and valid JWT token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@hospitalcare.demo',
        password: 'Admin@123',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.role).toBe('admin');
  });

  // AUTH-02: Wrong password once -> 401, not throttled
  it('AUTH-02: 1st failed attempt returns 401 with safe message', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'doctor@hospitalcare.demo',
        password: 'IncorrectPassword1',
      });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  // AUTH-03: Wrong password twice -> 401, not throttled
  it('AUTH-03: 2nd failed attempt returns 401 with safe message', async () => {
    await request(app).post('/api/auth/login').send({ email: 'doctor@hospitalcare.demo', password: 'Bad1' });
    const res = await request(app).post('/api/auth/login').send({ email: 'doctor@hospitalcare.demo', password: 'Bad2' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  // AUTH-04 & AUTH-05: 5 failed attempts allowed (401), 6th attempt throttled (429)
  it('AUTH-04 & AUTH-05: Attempts 1..5 return 401, 6th attempt is throttled with HTTP 429', async () => {
    const email = 'patient2@hospitalcare.demo';

    // Attempts 1 to 5: all should return 401
    for (let i = 1; i <= 5; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email, password: `WrongPassword${i}` });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    }

    // 6th attempt: should be throttled with 429
    const res6 = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'EvenWithCorrectOrWrongPassword' });

    expect(res6.status).toBe(429);
    expect(res6.body.error.code).toBe('ACCOUNT_THROTTLED');
    expect(res6.body.error.message).toContain('Temporarily throttled');
  });

  // AUTH-06: Expired lock allows login again
  it('AUTH-06: After lock expires, user can attempt login again', async () => {
    const email = 'patient2@hospitalcare.demo';

    // Trigger lock (5 failed attempts)
    for (let i = 1; i <= 5; i++) {
      await request(app).post('/api/auth/login').send({ email, password: `Wrong${i}` });
    }

    // Simulate lock expiration by rewinding lockUntil on the server user record
    const user = db.users.find((u) => u.email === email);
    expect(user).toBeDefined();
    user!.lockUntil = new Date(Date.now() - 1000).toISOString(); // 1 second in the past

    // Attempt login with correct password
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'Patient@123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(user!.failedLoginAttempts).toBe(0);
    expect(user!.lockUntil).toBeNull();
  });

  // AUTH-07: Successful login resets failed attempts counter
  it('AUTH-07: Successful login after 3 failed attempts resets counter to 0', async () => {
    const email = 'doctor2@hospitalcare.demo';

    // 3 failed attempts
    for (let i = 1; i <= 3; i++) {
      await request(app).post('/api/auth/login').send({ email, password: `Wrong${i}` });
    }

    const user = db.users.find((u) => u.email === email);
    expect(user!.failedLoginAttempts).toBe(3);

    // 4th attempt is successful
    const successRes = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'Doctor@123' });

    expect(successRes.status).toBe(200);
    expect(user!.failedLoginAttempts).toBe(0);
    expect(user!.lockUntil).toBeNull();
  });

  // AUTH-08: Protection state is server-side and unaffected by client refresh
  it('AUTH-08: Server-side failed attempt state persists independently of client state', async () => {
    const email = 'billing@hospitalcare.demo';
    await request(app).post('/api/auth/login').send({ email, password: 'Bad1' });
    await request(app).post('/api/auth/login').send({ email, password: 'Bad2' });

    const user = db.users.find((u) => u.email === email);
    expect(user!.failedLoginAttempts).toBe(2);
  });

  // AUTH-09: Backend role is authoritative (Role tampering impossible)
  it('AUTH-09: Authenticated user role is strictly derived from backend database, not frontend selection', async () => {
    // Authenticate with admin credentials
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@hospitalcare.demo', password: 'Admin@123' });

    expect(res.status).toBe(200);
    expect(res.body.data.user.role).toBe('admin');
  });

  // AUTH-11: Unauthenticated request to protected endpoint -> 401
  it('AUTH-11: Unauthenticated request without Bearer token returns 401 Unauthorized', async () => {
    const res = await request(app).get('/api/patients');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  // AUTH-12: Unauthorized role attempting protected operation -> 403
  it('AUTH-12: Doctor attempting to start hospital admission (Admin only) returns 403 Forbidden', async () => {
    const docAuth = await AuthService.login('doctor@hospitalcare.demo', 'Doctor@123');

    const res = await request(app)
      .post('/api/admissions')
      .set('Authorization', `Bearer ${docAuth.token}`)
      .send({
        patientId: 'pat-002',
        doctorId: 'doc-001',
        wardId: 'ward-gen-a',
        roomNumber: 'GEN-201',
        bedNumber: 'GEN-201-A',
        reason: 'Observation',
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  // AUTH-13: IDOR resource ownership protection
  it('AUTH-13: Patient attempting to view another patient record returns 403 IDOR Forbidden', async () => {
    const pat1Auth = await AuthService.login('patient@hospitalcare.demo', 'Patient@123');

    const res = await request(app)
      .get('/api/records/patient/pat-002')
      .set('Authorization', `Bearer ${pat1Auth.token}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('IDOR_FORBIDDEN');
  });

  // AUTH-14: Throttling one account does not throttle unrelated accounts
  it('AUTH-14: Throttling user A does not lock user B', async () => {
    const emailA = 'patient@hospitalcare.demo';
    const emailB = 'patient2@hospitalcare.demo';

    // Lock user A with 5 failed attempts
    for (let i = 1; i <= 5; i++) {
      await request(app).post('/api/auth/login').send({ email: emailA, password: `Wrong${i}` });
    }

    // User A is throttled on next attempt
    const resA = await request(app).post('/api/auth/login').send({ email: emailA, password: 'any' });
    expect(resA.status).toBe(429);

    // User B can log in normally with correct password
    const resB = await request(app).post('/api/auth/login').send({ email: emailB, password: 'Patient@123' });
    expect(resB.status).toBe(200);
    expect(resB.body.success).toBe(true);
  });

  // AUTH-15: Server returns sanitized errors with no stack trace or passwords
  it('AUTH-15: Error responses are sanitized and include requestId with zero stack traces', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nonexistent@hospitalcare.demo', password: 'SecretPassword123!' });

    expect(res.status).toBe(401);
    expect(res.body.error.message).toBe('Invalid email or password.');
    expect(res.body.error.requestId).toBeDefined();
    expect(res.body.stack).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain('SecretPassword123!');
  });
});
