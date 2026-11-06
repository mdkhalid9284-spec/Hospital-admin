/**
 * Patient identity helpers.
 *
 * The hospital registers people, not email addresses. These helpers build the
 * normalised keys used for duplicate detection and for the sparse unique index
 * that makes concurrent registration safe across serverless instances.
 */

/** Lowercase, strip accents/punctuation and collapse whitespace. */
export const normalizeName = (value: string | undefined | null): string =>
  (value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Digits only, so "+1 (555) 018-7712" and "15550187712" compare equal. */
export const normalizePhone = (value: string | undefined | null): string =>
  (value ?? '').replace(/\D/g, '');

export const normalizeCode = (value: string | undefined | null): string =>
  (value ?? '').trim().toUpperCase();

export const normalizeEmail = (value: string | undefined | null): string =>
  (value ?? '').trim().toLowerCase();

/** Identity key used to block re-registration of the same person. */
export const patientIdentityKey = (fullName: string, phone: string): string | null => {
  const name = normalizeName(fullName);
  const digits = normalizePhone(phone);
  if (!name || !digits) return null;
  return `${name}|${digits}`;
};

/** Levenshtein distance, used for "highly similar" (typo) name suggestions. */
export const levenshtein = (a: string, b: string): number => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + cost);
    }
    previous = current;
  }
  return previous[b.length];
};

/** 0..1 similarity on the normalised name. */
export const nameSimilarity = (a: string, b: string): number => {
  const longest = Math.max(a.length, b.length);
  if (!longest) return 0;
  return 1 - levenshtein(a, b) / longest;
};
