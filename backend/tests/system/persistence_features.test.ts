import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { db } from '../../src/database/index.js';
import { AuthService } from '../../src/services/auth.service.js';
import { toISODate } from '../../src/utils/date.js';

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

const uniquePatient = (suffix: string) => ({
  fullName: `Test Patient ${suffix}`,
  dob: '1990-05-12',
  gender: 'female' as const,
  phone: `+1 (555) 099-${suffix.padStart(4, '0')}`,
  email: `test.patient.${suffix}@example.com`,
  address: '10 Test Avenue, Testville, TS 10001',
  emergencyContact: {
    name: 'Test Contact',
    relationship: 'Sibling',
    phone: '+1 (555) 099-0000',
  },
});

describe('Patient identity, appointments, messaging and teleconsultation', () => {
  let app: any;
  let adminToken: string;
  let doctorToken: string;
  let patient1Token: string;
  let patient2Token: string;

  beforeEach(async () => {
    await db.resetForTesting();
    app = createApp();
    adminToken = (await AuthService.login('admin@hospitalcare.demo', 'Admin@123')).token;
    doctorToken = (await AuthService.login('doctor@hospitalcare.demo', 'Doctor@123')).token;
    patient1Token = (await AuthService.login('patient@hospitalcare.demo', 'Patient@123')).token;
    patient2Token = (await AuthService.login('patient2@hospitalcare.demo', 'Patient@123')).token;
  });

  describe('Duplicate patient prevention', () => {
    it('rejects a same-name/same-phone registration until an admin confirms it is a different person', async () => {
      const payload = uniquePatient('1');

      const first = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);
      expect(first.status).toBe(201);
      const created = first.body.data.patient;
      expect(created.identityKey).toBeTruthy();

      const duplicate = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...payload, email: 'other-email@example.com' });

      expect(duplicate.status).toBe(409);
      expect(duplicate.body.error.code).toBe('POSSIBLE_DUPLICATE_PATIENT');
      expect(duplicate.body.error.details.candidates.length).toBeGreaterThan(0);
      expect(duplicate.body.error.details.candidates[0].patientCode).toBe(created.patientCode);

      const confirmed = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ ...payload, email: 'different-person@example.com', confirmDistinct: true });

      expect(confirmed.status).toBe(201);
      expect(confirmed.body.data.patient.id).not.toBe(created.id);
    });

    it('allows the duplicate-check endpoint to suggest candidates before registration', async () => {
      const payload = uniquePatient('2');
      await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);

      const res = await request(app)
        .post('/api/patients/check-duplicates')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          fullName: payload.fullName,
          dob: payload.dob,
          gender: payload.gender,
          phone: payload.phone,
          email: payload.email,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.hasStrongMatch).toBe(true);
      expect(res.body.data.candidates[0].reasons).toContain('Same phone number');
    });
  });

  describe('Patient portal sign-up', () => {
    it('links a new login to an existing record and never creates a second medical profile', async () => {
      const payload = uniquePatient('3');
      const created = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);
      expect(created.status).toBe(201);
      const patient = created.body.data.patient;
      const patientCountBefore = db.patients.length;

      const signup = await request(app).post('/api/auth/patient-signup').send({
        identifier: patient.patientCode,
        dob: payload.dob,
        phone: payload.phone,
        email: 'portal.login@example.com',
        password: 'Portal@1234',
      });

      expect(signup.status).toBe(201);
      expect(signup.body.data.patientId).toBe(patient.id);
      expect(signup.body.data.user.role).toBe('patient');
      expect(db.patients.length).toBe(patientCountBefore);

      const linked = db.patients.find((item) => item.id === patient.id);
      expect(linked?.userId).toBe(signup.body.data.user.id);

      const ownProfile = await request(app)
        .get(`/api/patients/${patient.id}`)
        .set('Authorization', `Bearer ${signup.body.data.token}`);
      expect(ownProfile.status).toBe(200);
      expect(ownProfile.body.data.patient.patientCode).toBe(patient.patientCode);
    });

    it('rejects a wrong date of birth and prevents claiming an already-linked record', async () => {
      const payload = uniquePatient('4');
      const created = await request(app)
        .post('/api/patients')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload);
      const patient = created.body.data.patient;

      const wrongDob = await request(app).post('/api/auth/patient-signup').send({
        identifier: patient.patientCode,
        dob: '1999-01-01',
        phone: payload.phone,
        email: 'wrong.dob@example.com',
        password: 'Portal@1234',
      });
      expect(wrongDob.status).toBe(403);
      expect(wrongDob.body.error.code).toBe('PATIENT_VERIFICATION_FAILED');

      const conflictingEmail = await request(app).post('/api/auth/patient-signup').send({
        identifier: patient.patientCode,
        dob: payload.dob,
        phone: payload.phone,
        email: 'patient@hospitalcare.demo',
        password: 'Portal@1234',
      });
      expect(conflictingEmail.status).toBe(409);
      expect(conflictingEmail.body.error.code).toBe('EMAIL_EXISTS');

      const linked = await request(app).post('/api/auth/patient-signup').send({
        identifier: patient.patientCode,
        dob: payload.dob,
        phone: payload.phone,
        email: 'claimed@example.com',
        password: 'Portal@1234',
      });
      expect(linked.status).toBe(201);

      const secondClaim = await request(app).post('/api/auth/patient-signup').send({
        identifier: patient.patientCode,
        dob: payload.dob,
        phone: payload.phone,
        email: 'second.claim@example.com',
        password: 'Portal@1234',
      });
      expect(secondClaim.status).toBe(409);
      expect(secondClaim.body.error.code).toBe('PATIENT_ACCOUNT_ALREADY_LINKED');
    });
  });

  describe('Appointment isolation and rescheduling', () => {
    it('rejects double-booking the same patient with a different doctor', async () => {
      const date = nextDateMatching([2, 3, 4]);
      const slot = '10:00 - 10:30';

      const first = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          patientId: 'pat-001',
          doctorId: 'doc-001',
          appointmentDate: date,
          timeSlot: slot,
          reason: 'First booking',
        });
      expect(first.status).toBe(201);

      const second = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          patientId: 'pat-001',
          doctorId: 'doc-002',
          appointmentDate: date,
          timeSlot: slot,
          reason: 'Overlapping booking',
        });

      expect(second.status).toBe(409);
      expect(second.body.error.code).toBe('PATIENT_SLOT_UNAVAILABLE');
    });

    it('reschedules an appointment and releases the previous slot', async () => {
      const date = nextDateMatching([2, 3, 4, 6]);
      const available = await request(app)
        .get(`/api/appointments/available-slots?doctorId=doc-002&date=${date}`)
        .set('Authorization', `Bearer ${adminToken}`);
      const [firstSlot, secondSlot] = available.body.data.availableSlots;
      expect(firstSlot).toBeTruthy();
      expect(secondSlot).toBeTruthy();

      const created = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          patientId: 'pat-001',
          doctorId: 'doc-002',
          appointmentDate: date,
          timeSlot: firstSlot,
          reason: 'Initial consultation',
        });
      expect(created.status).toBe(201);
      const appointment = created.body.data.appointment;

      const rescheduled = await request(app)
        .patch(`/api/appointments/${appointment.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          timeSlot: secondSlot,
          reason: 'Rescheduled consultation',
        });
      expect(rescheduled.status).toBe(200);
      expect(rescheduled.body.data.appointment.timeSlot).toBe(secondSlot);
      expect(rescheduled.body.data.appointment.patientSlotKey).toBe(
        `pat-001|${date}|${secondSlot}`
      );

      const slots = await request(app)
        .get(`/api/appointments/available-slots?doctorId=doc-002&date=${date}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(slots.body.data.availableSlots).toContain(firstSlot);
      expect(slots.body.data.availableSlots).not.toContain(secondSlot);
    });

    it('clears unique slot keys on cancellation so the slot can be rebooked', async () => {
      const date = nextDateMatching([1, 2, 3, 4, 5]);
      const created = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          patientId: 'pat-001',
          doctorId: 'doc-001',
          appointmentDate: date,
          timeSlot: '14:00 - 14:30',
          reason: 'Cancellation test',
        });
      const appointment = created.body.data.appointment;

      const cancelled = await request(app)
        .patch(`/api/appointments/${appointment.id}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'Cancelled' });
      expect(cancelled.status).toBe(200);
      expect(cancelled.body.data.appointment.doctorSlotKey).toBeUndefined();
      expect(cancelled.body.data.appointment.patientSlotKey).toBeUndefined();

      const rebooked = await request(app)
        .post('/api/appointments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          patientId: 'pat-003',
          doctorId: 'doc-001',
          appointmentDate: date,
          timeSlot: '14:00 - 14:30',
          reason: 'Rebook released slot',
        });
      expect(rebooked.status).toBe(201);
    });
  });

  describe('Persistent clinical messaging', () => {
    it('creates one conversation per pair and enforces participant access', async () => {
      const create = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${patient1Token}`)
        .send({ subject: 'Post-visit question' });
      expect(create.status).toBe(201);
      const conversation = create.body.data.conversation;
      expect(conversation.patientId).toBe('pat-001');

      const again = await request(app)
        .post('/api/conversations')
        .set('Authorization', `Bearer ${patient1Token}`)
        .send({ subject: 'Post-visit question' });
      expect(again.status).toBe(201);
      expect(again.body.data.conversation.id).toBe(conversation.id);

      const sent = await request(app)
        .post(`/api/conversations/${conversation.id}/messages`)
        .set('Authorization', `Bearer ${patient1Token}`)
        .send({ body: 'Is it safe to take the medicine with food?' });
      expect(sent.status).toBe(201);

      const doctorView = await request(app)
        .get(`/api/conversations/${conversation.id}/messages`)
        .set('Authorization', `Bearer ${doctorToken}`);
      expect(doctorView.status).toBe(200);
      expect(doctorView.body.data.messages).toHaveLength(1);
      expect(doctorView.body.data.messages[0].body).toContain('with food');

      const outsider = await request(app)
        .get(`/api/conversations/${conversation.id}/messages`)
        .set('Authorization', `Bearer ${patient2Token}`);
      expect(outsider.status).toBe(403);
      expect(outsider.body.error.code).toBe('IDOR_FORBIDDEN');

      // Messages are stored in the shared database, not just returned to the sender.
      expect(db.messages.filter((message) => message.conversationId === conversation.id)).toHaveLength(1);
      expect(db.conversations.filter((item) => item.patientId === 'pat-001')).toHaveLength(1);
    });
  });

  describe('Teleconsultation rooms', () => {
    it('creates a real provider URL and reuses the active room', async () => {
      const first = await request(app)
        .post('/api/teleconsultations')
        .set('Authorization', `Bearer ${patient1Token}`)
        .send({});
      expect(first.status).toBe(201);
      const session = first.body.data.teleconsultation;
      expect(session.joinUrl).toMatch(/^https:\/\/meet\.jit\.si\//);
      expect(session.provider).toBe('jitsi');
      expect(session.status).toBe('Active');

      const second = await request(app)
        .post('/api/teleconsultations')
        .set('Authorization', `Bearer ${patient1Token}`)
        .send({});
      expect(second.status).toBe(201);
      expect(second.body.data.teleconsultation.id).toBe(session.id);

      const outsider = await request(app)
        .get(`/api/teleconsultations/${session.id}`)
        .set('Authorization', `Bearer ${patient2Token}`);
      expect(outsider.status).toBe(403);

      const ended = await request(app)
        .post(`/api/teleconsultations/${session.id}/end`)
        .set('Authorization', `Bearer ${patient1Token}`);
      expect(ended.status).toBe(200);
      expect(ended.body.data.teleconsultation.status).toBe('Ended');
    });
  });
});
