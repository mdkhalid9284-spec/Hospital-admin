import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';
import { BlobNotFoundError, del, get, head, put } from '@vercel/blob';
import { config } from '../config/index.js';

export type StorageProvider = 'local' | 'vercel-blob';

export type DownloadStream = NodeJS.ReadableStream | WebReadableStream<Uint8Array>;

export type StorageFailureCode = 'NOT_FOUND' | 'UNAVAILABLE' | 'MISCONFIGURED' | 'INVALID_KEY';

const UPLOAD_FILE_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|jpg|png|webp)$/i;
const LOCAL_FILE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]{0,180}$/;
const BLOB_PATHNAME = /^medical-documents\/(?:samples\/)?[A-Za-z0-9][A-Za-z0-9._-]{0,180}$/;
const SAMPLE_BLOB_PREFIX = 'medical-documents/samples/';

/** Private medical objects should not linger in shared caches. The SDK minimum is 60 seconds. */
const PRIVATE_CACHE_MAX_AGE_SECONDS = 60;

export class StorageOperationError extends Error {
  public readonly code: StorageFailureCode;

  constructor(message: string, code: StorageFailureCode) {
    super(message);
    this.name = 'StorageOperationError';
    this.code = code;
  }
}

export const getStorageProvider = (): StorageProvider =>
  config.storage.driver === 'vercel-blob' ? 'vercel-blob' : 'local';

const redactSecrets = (value: string): string =>
  value
    .replace(/vercel_blob_rw_[A-Za-z0-9_-]+/gi, '[redacted]')
    .replace(/BLOB_READ_WRITE_TOKEN\s*[=:]\s*\S+/gi, 'BLOB_READ_WRITE_TOKEN=[redacted]')
    .replace(/https?:\/\/\S+/gi, '[url]');

const logStorageFailure = (message: string, error: unknown): void => {
  const detail = error instanceof Error ? redactSecrets(error.message) : '';
  console.error(`[Storage] ${message}${detail ? `: ${detail}` : ''}`);
};

const isBlobNotFound = (error: unknown): boolean =>
  error instanceof BlobNotFoundError ||
  (error instanceof Error && error.name === 'BlobNotFoundError');

/**
 * Blob storage is required when selected. A missing token is a startup failure,
 * and callers must not continue with the local disk.
 */
export const assertBlobStorageConfigured = (): void => {
  if (config.storage.driver !== 'vercel-blob') return;

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token || token.trim() === '') {
    throw new StorageOperationError(
      'STORAGE_DRIVER is vercel-blob but BLOB_READ_WRITE_TOKEN is missing. ' +
        'Connect the private Vercel Blob store to the backend service so the token is injected, ' +
        'or set BLOB_READ_WRITE_TOKEN in that service environment.',
      'MISCONFIGURED'
    );
  }
};

const assertUploadFileName = (fileName: string): string => {
  if (!UPLOAD_FILE_NAME.test(fileName) || fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
    throw new StorageOperationError('Rejected an unsafe upload file name.', 'INVALID_KEY');
  }
  return fileName;
};

const assertLocalFileName = (storageKey: string): string => {
  if (
    !LOCAL_FILE_NAME.test(storageKey) ||
    storageKey.includes('..') ||
    storageKey.includes('/') ||
    storageKey.includes('\\')
  ) {
    throw new StorageOperationError('Rejected an unsafe local storage key.', 'INVALID_KEY');
  }
  return storageKey;
};

const assertBlobPathname = (storageKey: string): string => {
  const key = storageKey.replace(/^\/+/, '');
  if (!BLOB_PATHNAME.test(key) || key.includes('..') || key.includes('\\') || key.includes('://')) {
    throw new StorageOperationError('Rejected an unsafe Blob pathname.', 'INVALID_KEY');
  }
  return key;
};

const resolveLocalFile = (storageKey: string): string => {
  const fileName = assertLocalFileName(storageKey);
  const root = path.resolve(config.storage.localPath);
  const target = path.resolve(root, fileName);
  const relative = path.relative(root, target);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new StorageOperationError('Rejected a local path outside the upload directory.', 'INVALID_KEY');
  }
  return target;
};

const requireBlobToken = (): void => {
  try {
    assertBlobStorageConfigured();
  } catch (error) {
    if (error instanceof StorageOperationError) throw error;
    throw new StorageOperationError('Private Blob storage is not configured.', 'MISCONFIGURED');
  }
};

export const toNodeReadable = (stream: DownloadStream): Readable => {
  if (stream instanceof Readable || typeof (stream as NodeJS.ReadableStream).pipe === 'function') {
    return stream as Readable;
  }
  return Readable.fromWeb(stream as WebReadableStream<Uint8Array>);
};

export class FileStorageService {
  static async upload(
    fileName: string,
    buffer: Buffer,
    contentType: string
  ): Promise<{ storageKey: string; provider: StorageProvider }> {
    const safeName = assertUploadFileName(fileName);

    if (getStorageProvider() === 'vercel-blob') {
      requireBlobToken();
      const pathname = `medical-documents/${safeName}`;
      try {
        const result = await put(pathname, buffer, {
          access: 'private',
          addRandomSuffix: false,
          allowOverwrite: false,
          contentType,
          cacheControlMaxAge: PRIVATE_CACHE_MAX_AGE_SECONDS,
        });

        const storedPath = assertBlobPathname(result.pathname);
        return { storageKey: storedPath, provider: 'vercel-blob' };
      } catch (error) {
        if (error instanceof StorageOperationError) throw error;
        logStorageFailure('Private Blob upload failed', error);
        throw new StorageOperationError(
          'The document could not be stored in private Blob storage.',
          'UNAVAILABLE'
        );
      }
    }

    const directory = path.resolve(config.storage.localPath);
    const target = resolveLocalFile(safeName);
    await fs.promises.mkdir(directory, { recursive: true });
    await fs.promises.writeFile(target, buffer);
    return { storageKey: safeName, provider: 'local' };
  }

  /**
   * Creates a synthetic sample object at a deterministic private pathname.
   * Existing objects are left in place so cold starts do not upload duplicates.
   */
  static async ensurePrivateBlob(pathname: string, body: Buffer, contentType: string): Promise<void> {
    const key = assertBlobPathname(pathname);
    requireBlobToken();
    if (!key.startsWith(SAMPLE_BLOB_PREFIX)) {
      throw new StorageOperationError('Sample Blob path is outside the sample prefix.', 'INVALID_KEY');
    }

    try {
      const existing = await head(key);
      if (existing.size >= 256) return;
    } catch (error) {
      if (!isBlobNotFound(error)) {
        logStorageFailure('Private Blob sample lookup failed', error);
        throw new StorageOperationError(
          'Synthetic sample documents could not be verified in private Blob storage.',
          'UNAVAILABLE'
        );
      }
    }

    try {
      await put(key, body, {
        access: 'private',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType,
        cacheControlMaxAge: PRIVATE_CACHE_MAX_AGE_SECONDS,
      });
    } catch (error) {
      logStorageFailure('Private Blob sample upload failed', error);
      throw new StorageOperationError(
        'Synthetic sample documents could not be stored in private Blob storage.',
        'UNAVAILABLE'
      );
    }
  }

  static async download(
    storageKey: string,
    provider: StorageProvider
  ): Promise<{ stream: DownloadStream; size?: number }> {
    if (provider === 'vercel-blob') {
      const key = assertBlobPathname(storageKey);
      requireBlobToken();
      try {
        const result = await get(key, { access: 'private', useCache: false });
        if (!result || result.statusCode !== 200 || !result.stream) {
          throw new StorageOperationError('Document not found in private Blob storage.', 'NOT_FOUND');
        }
        return { stream: result.stream, size: result.blob.size };
      } catch (error) {
        if (error instanceof StorageOperationError) throw error;
        if (isBlobNotFound(error)) {
          throw new StorageOperationError('Document not found in private Blob storage.', 'NOT_FOUND');
        }
        logStorageFailure('Private Blob download failed', error);
        throw new StorageOperationError(
          'The document could not be read from private Blob storage.',
          'UNAVAILABLE'
        );
      }
    }

    const filePath = resolveLocalFile(storageKey);
    try {
      const stats = await fs.promises.stat(filePath);
      if (!stats.isFile()) {
        throw new StorageOperationError('Document not found in local storage.', 'NOT_FOUND');
      }
      return { stream: fs.createReadStream(filePath), size: stats.size };
    } catch (error) {
      if (error instanceof StorageOperationError) throw error;
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new StorageOperationError('Document not found in local storage.', 'NOT_FOUND');
      }
      logStorageFailure('Local document read failed', error);
      throw new StorageOperationError('The document could not be read from local storage.', 'UNAVAILABLE');
    }
  }

  static async delete(storageKey: string, provider: StorageProvider): Promise<'deleted' | 'missing'> {
    if (provider === 'vercel-blob') {
      const key = assertBlobPathname(storageKey);
      requireBlobToken();
      try {
        await del(key);
        return 'deleted';
      } catch (error) {
        if (isBlobNotFound(error)) return 'missing';
        logStorageFailure('Private Blob delete failed', error);
        throw new StorageOperationError(
          'The document could not be deleted from private Blob storage.',
          'UNAVAILABLE'
        );
      }
    }

    const filePath = resolveLocalFile(storageKey);
    try {
      await fs.promises.unlink(filePath);
      return 'deleted';
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return 'missing';
      logStorageFailure('Local document delete failed', error);
      throw new StorageOperationError('The document could not be deleted from local storage.', 'UNAVAILABLE');
    }
  }
}
