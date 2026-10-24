import React, { useMemo, useState } from 'react';
import { IAppointment } from '../../types';
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  Plus,
  CalendarDays,
  Clock,
  User,
  FileText,
  CheckCircle,
  X,
} from 'lucide-react';
import { Avatar, StatusBadge } from './primitives';
import {
  addDays,
  formatDateRange,
  formatDayLong,
  formatMonthYear,
  isSameDay,
  isToday,
  parseISODate,
  startOfWeekMonday,
  toISODate,
} from '../../utils/date';

type ViewMode = 'day' | 'week' | 'month';

interface InteractiveCalendarProps {
  appointments: IAppointment[];
  onSelectAppointment?: (app: IAppointment) => void;
  onBookNew?: () => void;
  onViewPatient?: (patientId: string, patientName: string) => void;
  onStatusChange?: (id: string, status: 'Confirmed' | 'Completed' | 'Cancelled') => void;
}

/** Mirrors the backend's single source of truth for consult slots. */
const TIME_SLOTS = [
  '09:00 - 09:30',
  '09:30 - 10:00',
  '10:00 - 10:30',
  '10:30 - 11:00',
  '11:00 - 11:30',
  '11:30 - 12:00',
  '14:00 - 14:30',
  '14:30 - 15:00',
  '15:00 - 15:30',
  '15:30 - 16:00',
  '16:00 - 16:30',
  '16:30 - 17:00',
];

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const startOfMonth = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), 1);
const endOfMonth = (date: Date): Date => new Date(date.getFullYear(), date.getMonth() + 1, 0);

const monthMatrixStart = (date: Date): Date => startOfWeekMonday(startOfMonth(date));

const shortTime = (slot: string): string => slot.split(' - ')[0];

const chipTone = (status: string): string => {
  switch (status) {
    case 'Confirmed':
      return 'bg-sky-50 border-sky-200 text-sky-800 hover:bg-sky-100';
    case 'Pending':
      return 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100';
    case 'Completed':
      return 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100';
    default:
      return 'bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200';
  }
};

const escapeCsv = (value: string): string => {
  const sanitized = value ?? '';
  return /[",\r\n]/.test(sanitized) ? `"${sanitized.replace(/"/g, '""')}"` : sanitized;
};

export const InteractiveCalendar: React.FC<InteractiveCalendarProps> = ({
  appointments,
  onSelectAppointment,
  onBookNew,
  onViewPatient,
  onStatusChange,
}) => {
  const [view, setView] = useState<ViewMode>('week');
  const [cursor, setCursor] = useState<Date>(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
  });
  const [selectedApp, setSelectedApp] = useState<IAppointment | null>(null);
  const [searchQ, setSearchQ] = useState('');

  const weekStart = useMemo(() => startOfWeekMonday(cursor), [cursor]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart]
  );
  const monthStart = useMemo(() => startOfMonth(cursor), [cursor]);
  const monthEnd = useMemo(() => endOfMonth(cursor), [cursor]);
  const monthDays = useMemo(() => {
    const start = monthMatrixStart(cursor);
    return Array.from({ length: 42 }, (_, index) => addDays(start, index));
  }, [cursor]);

  const filtered = useMemo(() => {
    const query = searchQ.trim().toLowerCase();
    if (!query) return appointments;
    return appointments.filter((appointment) =>
      [
        appointment.appointmentCode,
        appointment.patientName,
        appointment.doctorName,
        appointment.reason,
        appointment.timeSlot,
        appointment.status,
        appointment.notes ?? '',
      ]
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [appointments, searchQ]);

  const inView = (appointment: IAppointment): boolean => {
    if (view === 'day') return appointment.appointmentDate === toISODate(cursor);
    if (view === 'week') {
      const start = toISODate(weekStart);
      const end = toISODate(addDays(weekStart, 6));
      return appointment.appointmentDate >= start && appointment.appointmentDate <= end;
    }
    const month = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
    return appointment.appointmentDate.startsWith(month);
  };

  const visibleAppointments = useMemo(
    () => filtered.filter(inView),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filtered, view, cursor, weekStart]
  );

  const appointmentsOn = (date: Date): IAppointment[] => {
    const key = toISODate(date);
    return filtered.filter((appointment) => appointment.appointmentDate === key);
  };

  const appointmentsAt = (date: Date, slot: string): IAppointment[] => {
    const key = toISODate(date);
    return filtered.filter(
      (appointment) => appointment.appointmentDate === key && appointment.timeSlot === slot
    );
  };

  const headerLabel = useMemo(() => {
    if (view === 'day') return formatDayLong(cursor);
    if (view === 'week') return formatDateRange(weekStart, addDays(weekStart, 6));
    return formatMonthYear(cursor);
  }, [view, cursor, weekStart]);

  const move = (direction: -1 | 1): void => {
    if (view === 'day') {
      setCursor((current) => addDays(current, direction));
      return;
    }
    if (view === 'week') {
      setCursor((current) => addDays(current, direction * 7));
      return;
    }
    setCursor(
      (current) => new Date(current.getFullYear(), current.getMonth() + direction, 1)
    );
  };

  const goToToday = (): void => {
    const today = new Date();
    setCursor(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
  };

  const openDay = (date: Date): void => {
    setCursor(new Date(date.getFullYear(), date.getMonth(), date.getDate()));
    setView('day');
  };

  const selectAppointment = (appointment: IAppointment): void => {
    setSelectedApp(appointment);
    onSelectAppointment?.(appointment);
  };

  const handleExport = (): void => {
    const rows = visibleAppointments.map((appointment) => [
      appointment.appointmentCode,
      appointment.appointmentDate,
      appointment.timeSlot,
      appointment.patientName,
      appointment.doctorName,
      appointment.reason,
      appointment.status,
      appointment.notes ?? '',
    ]);
    const csv = [
      ['Appointment Code', 'Date', 'Time Slot', 'Patient', 'Doctor', 'Reason', 'Status', 'Notes'],
      ...rows,
    ]
      .map((row) => row.map(escapeCsv).join(','))
      .join('\r\n');

    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const rangeKey =
      view === 'day'
        ? toISODate(cursor)
        : view === 'week'
          ? `${toISODate(weekStart)}_to_${toISODate(addDays(weekStart, 6))}`
          : `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
    link.href = url;
    link.download = `appointments-${view}-${rangeKey}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const renderChip = (appointment: IAppointment, compact = false): React.ReactNode => (
    <button
      key={appointment.id}
      type="button"
      onClick={() => selectAppointment(appointment)}
      title={`${appointment.timeSlot} · ${appointment.patientName} · ${appointment.reason}`}
      className={`w-full text-left rounded-md border px-1.5 py-1 transition-colors ${chipTone(
        appointment.status
      )} ${compact ? 'text-[10px] leading-tight' : 'text-[11px]'}`}
    >
      <span className="font-bold">{shortTime(appointment.timeSlot)}</span>{' '}
      <span className="font-medium truncate">{appointment.patientName}</span>
    </button>
  );

  const renderDayView = (): React.ReactNode => {
    const dailyAppointments = appointmentsOn(cursor);

    return (
      <div className="space-y-3">
        {dailyAppointments.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
            <CalendarDays className="mx-auto mb-2 text-slate-300" size={26} />
            <p className="text-sm font-semibold text-slate-600">No appointments scheduled</p>
            <p className="text-xs text-slate-400 mt-1">
              There are no consultations for {formatDayLong(cursor)}.
            </p>
          </div>
        )}

        <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
          {TIME_SLOTS.map((slot) => {
            const slotAppointments = appointmentsAt(cursor, slot);
            return (
              <div
                key={slot}
                className="grid grid-cols-[84px_minmax(0,1fr)] sm:grid-cols-[110px_minmax(0,1fr)] border-b border-slate-100 last:border-b-0"
              >
                <div className="bg-slate-50/80 border-r border-slate-100 px-2 sm:px-3 py-3 text-[11px] sm:text-xs font-semibold text-slate-500">
                  {slot}
                </div>
                <div className="p-2 min-h-[48px] flex flex-col gap-1.5">
                  {slotAppointments.length === 0 ? (
                    <span className="text-[11px] text-slate-300 py-1">Available</span>
                  ) : (
                    slotAppointments.map((appointment) => (
                      <button
                        key={appointment.id}
                        type="button"
                        onClick={() => selectAppointment(appointment)}
                        className={`w-full text-left rounded-lg border px-3 py-2 transition-colors ${chipTone(
                          appointment.status
                        )}`}
                      >
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="text-xs font-bold">{appointment.patientName}</span>
                          <span className="text-[10px] opacity-80">
                            {appointment.doctorName}
                          </span>
                          <StatusBadge status={appointment.status} className="ml-auto" />
                        </div>
                        <p className="text-[11px] mt-0.5 opacity-80 truncate">
                          {appointment.reason}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = (): React.ReactNode => (
    <div className="space-y-3">
      {visibleAppointments.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-center text-sm text-slate-500">
          No appointments scheduled for this week.
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <div className="min-w-[860px]">
          <div className="grid grid-cols-[96px_repeat(7,minmax(0,1fr))] border-b border-slate-200 bg-slate-50">
            <div className="px-2 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Time
            </div>
            {weekDays.map((day) => (
              <button
                key={toISODate(day)}
                type="button"
                onClick={() => openDay(day)}
                className={`px-1 py-2 text-center border-l border-slate-100 hover:bg-sky-50 transition-colors ${
                  isToday(day) ? 'bg-sky-100/70' : ''
                }`}
              >
                <div className="text-[10px] font-semibold uppercase text-slate-400">
                  {WEEKDAY_LABELS[(day.getDay() + 6) % 7]}
                </div>
                <div
                  className={`mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                    isToday(day) ? 'bg-sky-600 text-white' : 'text-slate-700'
                  }`}
                >
                  {day.getDate()}
                </div>
              </button>
            ))}
          </div>

          {TIME_SLOTS.map((slot) => (
            <div
              key={slot}
              className="grid grid-cols-[96px_repeat(7,minmax(0,1fr))] border-b border-slate-100 last:border-b-0"
            >
              <div className="bg-slate-50/60 border-r border-slate-100 px-2 py-2 text-[10px] font-semibold text-slate-500">
                {slot}
              </div>
              {weekDays.map((day) => {
                const cellAppointments = appointmentsAt(day, slot);
                return (
                  <div
                    key={`${toISODate(day)}-${slot}`}
                    className={`min-h-[48px] border-l border-slate-100 p-1 space-y-1 ${
                      isToday(day) ? 'bg-sky-50/40' : ''
                    }`}
                  >
                    {cellAppointments.map((appointment) => renderChip(appointment, true))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderMonthView = (): React.ReactNode => (
    <div className="space-y-3">
      {visibleAppointments.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-center text-sm text-slate-500">
          No appointments scheduled for {formatMonthYear(cursor)}.
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="px-1 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400"
            >
              {label}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {monthDays.map((day) => {
            const dayAppointments = appointmentsOn(day);
            const isCurrentMonth = day.getMonth() === cursor.getMonth();
            return (
              <div
                key={toISODate(day)}
                className={`min-h-[92px] sm:min-h-[112px] border-b border-r border-slate-100 p-1 sm:p-1.5 ${
                  isCurrentMonth ? 'bg-white' : 'bg-slate-50/60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => openDay(day)}
                    aria-label={`View ${formatDayLong(day)}`}
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold transition-colors ${
                      isToday(day)
                        ? 'bg-sky-600 text-white'
                        : isCurrentMonth
                          ? 'text-slate-700 hover:bg-slate-100'
                          : 'text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    {day.getDate()}
                  </button>
                  {dayAppointments.length > 0 && (
                    <span className="text-[9px] font-semibold text-slate-400">
                      {dayAppointments.length}
                    </span>
                  )}
                </div>

                <div className="mt-1 space-y-1">
                  {dayAppointments.slice(0, 3).map((appointment) =>
                    renderChip(appointment, true)
                  )}
                  {dayAppointments.length > 3 && (
                    <button
                      type="button"
                      onClick={() => openDay(day)}
                      className="w-full text-left px-1 text-[10px] font-semibold text-sky-700 hover:underline"
                    >
                      +{dayAppointments.length - 3} more
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border border-slate-200 bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => move(-1)}
              aria-label={`Previous ${view}`}
              className="p-2 text-slate-500 hover:bg-slate-50"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => move(1)}
              aria-label={`Next ${view}`}
              className="p-2 text-slate-500 hover:bg-slate-50 border-l border-slate-200"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          <button
            type="button"
            onClick={goToToday}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Today
          </button>
          <h3 className="text-sm sm:text-base font-bold text-slate-900">{headerLabel}</h3>
        </div>

        <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2">
          <div className="relative">
            <Search
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={searchQ}
              onChange={(event) => setSearchQ(event.target.value)}
              placeholder="Search patient, doctor, reason…"
              aria-label="Search appointments"
              className="hc-input pl-8 pr-7 py-2 text-xs w-full sm:w-56"
            />
            {searchQ && (
              <button
                type="button"
                onClick={() => setSearchQ('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
            {(['day', 'week', 'month'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setView(mode)}
                aria-pressed={view === mode}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                  view === mode
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Download size={14} /> Export
          </button>

          {onBookNew && (
            <button
              type="button"
              onClick={onBookNew}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-700"
            >
              <Plus size={14} /> New Appointment
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-4 items-start">
        <div className="min-w-0">
          {view === 'day' && renderDayView()}
          {view === 'week' && renderWeekView()}
          {view === 'month' && renderMonthView()}
        </div>

        {/* Detail panel */}
        <aside className="rounded-xl border border-slate-200 bg-white p-4 xl:sticky xl:top-4">
          {selectedApp ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={selectedApp.patientName} size="md" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 truncate">
                      {selectedApp.patientName}
                    </p>
                    <p className="text-[11px] text-slate-500">{selectedApp.appointmentCode}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedApp(null)}
                  aria-label="Close appointment details"
                  className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X size={15} />
                </button>
              </div>

              <StatusBadge status={selectedApp.status} />

              <div className="space-y-2 text-xs text-slate-600">
                <p className="flex items-start gap-2">
                  <CalendarDays size={14} className="mt-0.5 text-slate-400 shrink-0" />
                  <span>{formatDayLong(parseISODate(selectedApp.appointmentDate))}</span>
                </p>
                <p className="flex items-start gap-2">
                  <Clock size={14} className="mt-0.5 text-slate-400 shrink-0" />
                  <span>{selectedApp.timeSlot}</span>
                </p>
                <p className="flex items-start gap-2">
                  <User size={14} className="mt-0.5 text-slate-400 shrink-0" />
                  <span>{selectedApp.doctorName}</span>
                </p>
                <p className="flex items-start gap-2">
                  <FileText size={14} className="mt-0.5 text-slate-400 shrink-0" />
                  <span>{selectedApp.reason}</span>
                </p>
                {selectedApp.notes && (
                  <p className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
                    {selectedApp.notes}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                {onViewPatient && (
                  <button
                    type="button"
                    onClick={() =>
                      onViewPatient(selectedApp.patientId, selectedApp.patientName)
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    View Patient Record
                  </button>
                )}

                {onStatusChange && selectedApp.status === 'Pending' && (
                  <button
                    type="button"
                    onClick={() => {
                      onStatusChange(selectedApp.id, 'Confirmed');
                      setSelectedApp({ ...selectedApp, status: 'Confirmed' });
                    }}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    <CheckCircle size={14} /> Confirm Appointment
                  </button>
                )}

                {onStatusChange && selectedApp.status === 'Confirmed' && (
                  <button
                    type="button"
                    onClick={() => {
                      onStatusChange(selectedApp.id, 'Completed');
                      setSelectedApp({ ...selectedApp, status: 'Completed' });
                    }}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    <CheckCircle size={14} /> Mark Completed
                  </button>
                )}

                {onStatusChange &&
                  (selectedApp.status === 'Pending' || selectedApp.status === 'Confirmed') && (
                    <button
                      type="button"
                      onClick={() => {
                        onStatusChange(selectedApp.id, 'Cancelled');
                        setSelectedApp({ ...selectedApp, status: 'Cancelled' });
                      }}
                      className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
                    >
                      Cancel Appointment
                    </button>
                  )}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center">
              <CalendarDays className="mx-auto mb-2 text-slate-300" size={30} />
              <p className="text-sm font-semibold text-slate-600">Appointment details</p>
              <p className="mt-1 text-xs text-slate-400">
                Select an appointment to see the patient, clinician and status.
              </p>
              <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                {visibleAppointments.length} appointment
                {visibleAppointments.length === 1 ? '' : 's'} in this {view}.
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
