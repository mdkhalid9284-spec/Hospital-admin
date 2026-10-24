/**
 * Local-timezone date helpers. Calendar days are represented as YYYY-MM-DD
 * strings built from the local date components so that a booking made at
 * 11pm is not shifted to the next day by UTC conversion.
 */

export const toISODate = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;

export const parseISODate = (value: string): Date => new Date(`${value.slice(0, 10)}T00:00:00`);

export const todayISO = (): string => toISODate(new Date());

export const addDays = (base: Date, days: number): Date => {
  const copy = new Date(base);
  copy.setDate(copy.getDate() + days);
  return copy;
};

export const startOfWeekMonday = (date: Date): Date => {
  const copy = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const offsetFromMonday = (copy.getDay() + 6) % 7; // Mon=0 … Sun=6
  copy.setDate(copy.getDate() - offsetFromMonday);
  return copy;
};

export const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export const isToday = (date: Date): boolean => isSameDay(date, new Date());

export const calculateAge = (dob: string, onDate: string | Date = new Date()): number => {
  if (!dob) return 0;
  const birth = parseISODate(dob);
  const reference = typeof onDate === 'string' ? parseISODate(onDate) : onDate;
  if (Number.isNaN(birth.getTime()) || Number.isNaN(reference.getTime())) return 0;

  let age = reference.getFullYear() - birth.getFullYear();
  const monthDiff = reference.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && reference.getDate() < birth.getDate())) {
    age -= 1;
  }
  return Math.max(0, age);
};

export const formatMonthYear = (date: Date): string =>
  date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

export const formatDayLong = (date: Date): string =>
  date.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

export const formatDateShort = (date: Date): string =>
  date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

export const formatDateRange = (start: Date, end: Date): string => {
  if (isSameDay(start, end)) return formatDayLong(start);
  return `${formatDateShort(start)} – ${formatDateShort(end)}`;
};
