import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@vercel/blob', () => {
  class BlobNotFoundError extends Error {
    constructor() {
      super('The blob was not found');
      this.name = 'BlobNotFoundError';
    }
  }

  return {
    put: vi.fn(),
    get: vi.fn(),
    del: vi.fn(),
    head: vi.fn(),
    BlobNotFoundError,
  };
});

import fs from 'fs';
import path from 'path';
import request from 'supertest';
import { BlobNotFoundError, del } from '@vercel/blob';
import { createApp } from '../../src/app.js';
import { config } from '../../src/config/index.js';
import { db } from '../../src/database/index.js';
import { AuthService } from '../../src/services/auth.service.js';

const PDF_BYTES = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n',
  'utf8'
);

const uploadPdf = (app: ReturnType<typeof createApp>, token: string, title: string) =>
  request(app)
    .post('/api/documents/upload')
    .set('Authorization', `Bearer ${token}`)
    .field('patientId', 'pat-001')
    .field('category', 'Report')
    .field('title', title)
    .attach('file', PDF_BYTES, 'patient-note.pdf');

describe('Document deletion authorization and storage', () => {
  let app: ReturnType<typeof createApp>;
  let patientToken: string;
  let otherPatientToken: string;
  let doctorToken: string;
  let adminToken: string;

  beforeEach(async () => {
    vi.mocked(del).mockReset();
    await db.resetForTesting();
    app = createApp();
    patientToken = (await AuthService.login('patient@hospitalcare.demo', 'Patient@123')).token;
    otherPatientToken = (await AuthService.login('patient2@hospitalcare.demo', 'Patient@123')).token;
    doctorToken = (await AuthService.login('doctor@hospitalcare.demo', 'Doctor@123')).token;
    adminToken = (await AuthService.login('admin@hospitalcare.demo', 'Admin@123')).token;
  });

  it('deletes the local file and metadata only for the uploader, and writes an audit event', async () => {
    const upload = await uploadPdf(app, patientToken, 'Patient owned note');
    expect(upload.status).toBe(201);
    const document = upload.body.data.document;
    const filePath = path.join(config.storage.localPath, document.safeStorageKey);
    expect(fs.existsSync(filePath)).toBe(true);

    const forbiddenPatient = await request(app)
      .delete(`/api/documents/${document.id}`)
      .set('Authorization', `Bearer ${otherPatientToken}`);
    expect(forbiddenPatient.status).toBe(403);
    expect(forbiddenPatient.body.error.code).toBe('FORBIDDEN_DOCUMENT_DELETE');

    const forbiddenDoctor = await request(app)
      .delete(`/api/documents/${document.id}`)
      .set('Authorization', `Bearer ${doctorToken}`);
    expect(forbiddenDoctor.status).toBe(403);
    expect(forbiddenDoctor.body.error.code).toBe('FORBIDDEN_DOCUMENT_DELETE');
    expect(fs.existsSync(filePath)).toBe(true);
    expect(db.documents.some((item) => item.id === document.id)).toBe(true);

    const removed = await request(app)
      .delete(`/api/documents/${document.id}`)
      .set('Authorization', `Bearer ${patientToken}`);
    expect(removed.status).toBe(200);

    expect(fs.existsSync(filePath)).toBe(false);
    expect(db.documents.some((item) => item.id === document.id)).toBe(false);
    expect(
      db.auditLogs.some(
        (entry) =>
          entry.action === 'DOCUMENT_DELETED' &&
          entry.resourceId === document.id &&
          entry.status === 'SUCCESS'
      )
    ).toBe(true);

    const list = await request(app)
      .get('/api/documents/patient/pat-001')
      .set('Authorization', `Bearer ${patientToken}`);
    expect(list.body.data.documents.some((item: { id: string }) => item.id === document.id)).toBe(false);
  });

  it('keeps metadata when storage deletion fails', async () => {
    const upload = await uploadPdf(app, patientToken, 'Keep when storage fails');
    const document = upload.body.data.document;
    const stored = db.documents.find((item) => item.id === document.id);
    expect(stored).toBeTruthy();
    const filePath = path.join(config.storage.localPath, document.safeStorageKey);
    stored!.safeStorageKey = '../escape.pdf';

    const failed = await request(app)
      .delete(`/api/documents/${document.id}`)
      .set('Authorization', `Bearer ${patientToken}`);
    expect(failed.status).toBe(500);
    expect(failed.body.error.code).toBe('INVALID_STORAGE_KEY');
    expect(db.documents.some((item) => item.id === document.id)).toBe(true);
    expect(fs.existsSync(filePath)).toBe(true);
    expect(db.auditLogs.some((entry) => entry.action === 'DOCUMENT_DELETED' && entry.resourceId === document.id)).toBe(
      false
    );
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  });

  it('removes a private blob before metadata, and keeps metadata when blob deletion fails', async () => {
    const upload = await uploadPdf(app, patientToken, 'Private blob note');
    const document = upload.body.data.document;
    const stored = db.documents.find((item) => item.id === document.id);
    const localPath = path.join(config.storage.localPath, document.safeStorageKey);
    const blobPath = 'medical-documents/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee.pdf';
    stored!.storageProvider = 'vercel-blob';
    stored!.safeStorageKey = blobPath;

    vi.mocked(del).mockRejectedValueOnce(new Error('private blob unavailable'));
    const failed = await request(app)
      .delete(`/api/documents/${document.id}`)
      .set('Authorization', `Bearer ${patientToken}`);
    expect(failed.status).toBe(502);
    expect(failed.body.error.code).toBe('STORAGE_DELETE_FAILED');
    expect(db.documents.some((item) => item.id === document.id)).toBe(true);
    expect(vi.mocked(del)).toHaveBeenCalledWith(blobPath);
    expect(String(vi.mocked(del).mock.calls[0][0])).not.toMatch(/^https?:/);

    vi.mocked(del).mockRejectedValueOnce(new BlobNotFoundError());
    const missing = await request(app)
      .delete(`/api/documents/${document.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(missing.status).toBe(200);
    expect(db.documents.some((item) => item.id === document.id)).toBe(false);

    if (fs.existsSync(localPath)) fs.unlinkSync(localPath);
  });
});
