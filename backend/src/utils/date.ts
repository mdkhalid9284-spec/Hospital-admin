/**
 * Shared date helpers. All "calendar day" calculations use the server's local
 * timezone so that a prescription issued today is recorded under today's
 * calendar date regardless of UTC offset.
 */

export const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export const toISODate = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const todayISODate = (): string => toISODate(new Date());

export const addDays = (base: Date, days: number): Date => {
  const copy = new Date(base);
  copy.setDate(copy.getDate() + days);
  return copy;
};

/**
 * Completed years between a date of birth (YYYY-MM-DD) and a reference date.
 * Birthday-aware: a patient born on 1985-06-14 is 40 on 2026-06-13 and 41 on
 * 2026-06-14.
 */
export const calculateAge = (dob: string, onDate: string | Date = new Date()): number => {
  if (!dob) return 0;
  const birth = new Date(`${dob.slice(0, 10)}T00:00:00`);
  const reference = typeof onDate === 'string' ? new Date(onDate) : onDate;
  if (Number.isNaN(birth.getTime()) || Number.isNaN(reference.getTime())) return 0;

  let age = reference.getFullYear() - birth.getFullYear();
  const monthDiff = reference.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && reference.getDate() < birth.getDate())) {
    age -= 1;
  }
  return Math.max(0, age);
};

/** Inclusive start date for a supported analytics range. */
export const rangeStartDate = (
  range: string,
  reference: Date = new Date()
): { days: number; from: Date; to: Date } => {
  const days = range === '7d' ? 7 : range === '90d' ? 90 : range === '1y' ? 365 : 30;
  const to = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  const from = addDays(to, -(days - 1));
  return { days, from, to };
};
