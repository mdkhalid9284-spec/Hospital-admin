import fs from 'fs';
import path from 'path';
import { config } from '../config/index.js';
import { IMedicalDocument } from '../models/types.js';
import { FileStorageService } from '../services/fileStorage.service.js';

/**
 * Lightweight, dependency-free PDF writer used to create clearly-labelled
 * SYNTHETIC demo documents. These files exist so the document module can be
 * exercised end-to-end (upload -> storage -> metadata -> download) without
 * shipping any real patient data.
 */
const escapePdfText = (value: string): string =>
  value
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x20-\x7E]/g, '?');

export const buildSamplePdf = (title: string, lines: string[]): Buffer => {
  const stream = [
    'BT',
    '/F1 16 Tf',
    '72 720 Td',
    `(${escapePdfText(title)}) Tj`,
    '/F1 11 Tf',
    ...lines.flatMap((line) => ['0 -22 Td', `(${escapePdfText(line)}) Tj`]),
    'ET',
  ].join('\n');

  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(stream, 'ascii')} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, 'ascii'));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, 'ascii');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, 'ascii');
};

const SYNTHETIC_BANNER =
  'SYNTHETIC DEMO DOCUMENT - FICTIONAL PATIENT DATA - NOT A REAL MEDICAL RECORD';

export interface SampleDocumentFile {
  safeStorageKey: string;
  originalFilename: string;
  title: string;
  mimeType: 'application/pdf';
  buffer: Buffer;
}

const createFile = (
  safeStorageKey: string,
  originalFilename: string,
  title: string,
  body: string[]
): SampleDocumentFile => ({
  safeStorageKey,
  originalFilename,
  title,
  mimeType: 'application/pdf',
  buffer: buildSamplePdf(title, [SYNTHETIC_BANNER, '', ...body]),
});

export const SAMPLE_DOCUMENT_FILES: SampleDocumentFile[] = [
  createFile(
    'sample_ecg_report.pdf',
    'ECG_Harrison_James_Synthetic.pdf',
    '12-Lead Electrocardiogram (ECG) Report',
    [
      'Patient: James Harrison (PAT-1001)',
      'Study: 12-Lead ECG - resting',
      'Reported rhythm: Normal sinus rhythm',
      'Heart rate: 74 bpm',
      'PR interval: 158 ms',
      'QRS duration: 92 ms',
      'QTc: 412 ms',
      'Impression: No acute ischaemic change. Fictional demo tracing.',
    ]
  ),
  createFile(
    'sample_opd_summary.pdf',
    'OPD_Summary_Synthetic.pdf',
    'Previous OPD Health Summary',
    [
      'Patient: James Harrison (PAT-1001)',
      'Visit type: Outpatient department review',
      'Presenting complaint: Intermittent exertional chest discomfort',
      'Blood pressure: 138/86 mmHg',
      'Plan: Lifestyle modification and cardiology follow-up',
      'Note: This is a synthetic historical summary for product demos.',
    ]
  ),
  createFile(
    'sample_diagnostic_report.pdf',
    'Diagnostic_Panel_Synthetic.pdf',
    'Diagnostic Laboratory Panel',
    [
      'Patient: Emma Watson-Clarke (PAT-1002)',
      'Panel: Neurology baseline bloods',
      'Haemoglobin: 13.2 g/dL',
      'White cell count: 6.4 x10^9/L',
      'Platelets: 248 x10^9/L',
      'CRP: 2.1 mg/L',
      'Impression: All results within reference range (synthetic).',
    ]
  ),
  createFile(
    'sample_lab_panel.pdf',
    'Lipid_Profile_Synthetic.pdf',
    'Lipid Profile & Cardiac Risk Panel',
    [
      'Patient: Aisha Rahman (PAT-1005)',
      'Total cholesterol: 5.4 mmol/L',
      'LDL cholesterol: 3.1 mmol/L',
      'HDL cholesterol: 1.4 mmol/L',
      'Triglycerides: 1.6 mmol/L',
      'Recommendation: Dietary review in 3 months (synthetic demo).',
    ]
  ),
  createFile(
    'sample_prescription_scan.pdf',
    'External_Prescription_Synthetic.pdf',
    'External Prescription Scan',
    [
      'Patient: Daniel Okafor (PAT-1004)',
      'Prescriber: Community Neurology Clinic',
      'Medicine: Sumatriptan 50mg as required',
      'Quantity: 6 tablets',
      'Instructions: Take at onset of migraine, maximum 2 per day',
      'Note: Synthetic scan supplied by the demo patient.',
    ]
  ),
];

export const sampleBlobPathname = (fileName: string): string =>
  `medical-documents/samples/${fileName}`;

const SAMPLE_FILE_NAMES = new Set(SAMPLE_DOCUMENT_FILES.map((file) => file.safeStorageKey));

/** Accept only the original sample file name or its deterministic private Blob pathname. */
export const canonicalSampleFileName = (storageKey: string): string | null => {
  if (SAMPLE_FILE_NAMES.has(storageKey)) return storageKey;
  const prefix = 'medical-documents/samples/';
  if (!storageKey.startsWith(prefix)) return null;
  const fileName = storageKey.slice(prefix.length);
  if (!SAMPLE_FILE_NAMES.has(fileName) || fileName.includes('/')) return null;
  return fileName;
};

/**
 * Writes synthetic sample PDFs to the local upload directory.
 * Idempotent: existing files are only replaced when missing or tiny placeholders.
 */
export const ensureLocalSampleDocumentFiles = (): void => {
  const storageDir = config.storage.localPath;
  if (!fs.existsSync(storageDir)) {
    fs.mkdirSync(storageDir, { recursive: true });
  }

  for (const file of SAMPLE_DOCUMENT_FILES) {
    const target = path.join(storageDir, file.safeStorageKey);
    if (!fs.existsSync(target) || fs.statSync(target).size < 256) {
      fs.writeFileSync(target, file.buffer);
    }
  }
};

/**
 * Makes synthetic sample PDFs available for the active storage driver.
 * Blob uploads use deterministic pathnames and skip objects that already exist.
 */
export const ensureSampleDocumentFiles = async (): Promise<void> => {
  if (config.storage.driver === 'vercel-blob') {
    for (const file of SAMPLE_DOCUMENT_FILES) {
      await FileStorageService.ensurePrivateBlob(
        sampleBlobPathname(file.safeStorageKey),
        file.buffer,
        file.mimeType
      );
    }
    return;
  }

  ensureLocalSampleDocumentFiles();
};

/**
 * Points seeded synthetic records at the private Blob objects created above.
 * Records that are not known sample files are left unchanged, including older
 * uploads that have no storageProvider and therefore remain local.
 */
export const alignSampleDocumentsForBlob = (documents: IMedicalDocument[]): IMedicalDocument[] => {
  if (config.storage.driver !== 'vercel-blob') return [];

  const changed: IMedicalDocument[] = [];
  for (const document of documents) {
    const fileName = canonicalSampleFileName(document.safeStorageKey);
    if (!fileName) continue;
    const sample = SAMPLE_DOCUMENT_FILES.find((file) => file.safeStorageKey === fileName);
    if (!sample) continue;

    const pathname = sampleBlobPathname(fileName);
    if (
      document.storageProvider === 'vercel-blob' &&
      document.safeStorageKey === pathname &&
      document.mimeType === sample.mimeType &&
      document.fileSizeBytes === sample.buffer.length
    ) {
      continue;
    }

    document.storageProvider = 'vercel-blob';
    document.safeStorageKey = pathname;
    document.mimeType = sample.mimeType;
    document.fileSizeBytes = sample.buffer.length;
    changed.push(document);
  }

  return changed;
};
