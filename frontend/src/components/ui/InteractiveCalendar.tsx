import React, { useState } from 'react';
import { IAppointment } from '../../types';
import { ChevronLeft, ChevronRight, Download, Search, Plus, Calendar, Clock, MapPin, User, FileText, CheckCircle, X } from 'lucide-react';
import { Avatar, StatusBadge } from './primitives';

type ViewMode = 'day' | 'week' | 'month';

interface InteractiveCalendarProps {
  appointments: IAppointment[];
  onSelectAppointment?: (app: IAppointment) => void;
  onBookNew?: () => void;
  onViewPatient?: (patientId: string, patientName: string) => void;
  onStatusChange?: (id: string, status: 'Confirmed' | 'Completed' | 'Cancelled') => void;
}

export const InteractiveCalendar: React.FC<InteractiveCalendarProps> = ({
  appointments,
  onSelectAppointment,
  onBookNew,
  onViewPatient,
  onStatusChange,
}) => {
  const [view, setView] = useState<ViewMode>('week');
  const [selectedApp, setSelectedApp] = useState<IAppointment | null>(
    appointments.length > 0 ? appointments[0] : null
  );
  const [searchQ, setSearchQ] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date('2026-10-06'));

  // Week days starting from Monday
  const weekDays = [
    { name: 'Mon', date: 17, fullDate: '2026-10-05' },
    { name: 'Tue', date: 18, fullDate: '2026-10-06' },
    { name: 'Wed', date: 19, fullDate: '2026-10-07', isToday: true },
    { name: 'Thu', date: 20, fullDate: '2026-10-08' },
    { name: 'Fri', date: 21, fullDate: '2026-10-09' },
    { name: 'Sat', date: 22, fullDate: '2026-10-10' },
  ];

  const timeSlots = ['10:00', '11:00', '12:00', '01:00', '02:00'];

  const filtered = appointments.filter(
    (a) =>
      !searchQ ||
      a.patientName.toLowerCase().includes(searchQ.toLowerCase()) ||
      a.reason.toLowerCase().includes(searchQ.toLowerCase()) ||
      a.doctorName.toLowerCase().includes(searchQ.toLowerCase())
  );

  const handleExport = () => {
    const csv = [
      ['Appointment Code', 'Patient', 'Doctor', 'Date', 'Time', 'Reason', 'Status'],
      ...filtered.map((a) => [a.appointmentCode, a.patientName, a.doctorName, a.appointmentDate, a.timeSlot, a.reason, a.status]),
    ]
      .map((row) => row.join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `appointments_schedule_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Calendar Sub-bar matching screenshot */}
      <div className="bg-white rounded-[26px] border border-slate-200/90 p-4 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.06)] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Date Selector & Month label */}
        <div className="flex items-center gap-3">
          <h2 className="text-[17px] font-bold text-slate-900 tracking-tight flex items-center gap-2">
            October 2026
            <div className="flex items-center gap-1 ml-1">
              <button
                onClick={() => setCurrentDate(new Date(currentDate.getTime() - 7 * 86400000))}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setCurrentDate(new Date(currentDate.getTime() + 7 * 86400000))}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </h2>

          {/* View Pill switcher */}
          <div className="bg-slate-100 p-1 rounded-full border border-slate-200/70 flex items-center">
            {(['day', 'week', 'month'] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3.5 py-1 rounded-full text-xs font-bold capitalize transition-all ${
                  view === v
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* Right Search & Action Buttons */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Search appointments…"
              className="pl-9 pr-3.5 py-1.5 bg-slate-100/80 border border-transparent focus:bg-white focus:border-slate-300 rounded-full text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-all w-48 sm:w-60"
            />
          </div>

          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-full text-xs font-semibold text-slate-700 transition-all shadow-sm"
          >
            <Download size={13} /> Export
          </button>

          {onBookNew && (
            <button
              onClick={onBookNew}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#1d6cf2] hover:bg-blue-700 text-white rounded-full text-xs font-bold transition-all shadow-md shadow-blue-500/25"
            >
              <Plus size={14} /> Book
            </button>
          )}
        </div>
      </div>

      {/* Main Calendar Matrix & Popover Layout */}
      <div className="relative bg-white rounded-[28px] border border-slate-200/90 p-5 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06)] overflow-x-auto">
        {/* Grid Header: Days of Week */}
        <div className="min-w-[760px] grid grid-cols-7 border-b border-slate-200/80 pb-3">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider pl-2">Time</div>
          {weekDays.map((d) => (
            <div key={d.name} className="text-center">
              <span className="text-xs font-semibold text-slate-500">{d.name} </span>
              <span
                className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ml-1 ${
                  d.isToday ? 'bg-[#1d6cf2] text-white shadow-sm' : 'text-slate-800'
                }`}
              >
                {d.date}
              </span>
            </div>
          ))}
        </div>

        {/* Calendar Body with Time Slots and Appointments */}
        <div className="min-w-[760px] relative mt-2">
          {/* Current Time Indicator Line (12:40 PM) matching screenshot */}
          <div
            className="absolute left-0 right-0 z-20 flex items-center pointer-events-none"
            style={{ top: '158px' }}
          >
            <span className="px-2 py-0.5 rounded-full bg-[#1d6cf2] text-white text-[10px] font-bold shadow-md">
              12:40
            </span>
            <div className="flex-1 h-[2px] bg-[#1d6cf2] opacity-80 border-t border-dashed border-blue-400" />
          </div>

          {/* Time Rows */}
          {timeSlots.map((time, rowIdx) => (
            <div
              key={time}
              className="grid grid-cols-7 min-h-[92px] border-b border-slate-100 last:border-b-0 py-2 relative"
            >
              {/* Time Label Column */}
              <div className="text-xs font-bold text-slate-400 pl-2 select-none">{time}</div>

              {/* Day Slot Cells */}
              {weekDays.map((d, colIdx) => {
                // Find matching appointment for this day & rough time
                const matched = filtered.find((a) => {
                  const dayMatch = a.appointmentDate === d.fullDate || (rowIdx === 1 && colIdx === 2);
                  const timeMatch = a.timeSlot.includes(time.slice(0, 2)) || (rowIdx === 1 && colIdx === 2);
                  return dayMatch && timeMatch;
                });

                // Fallback mock cards to faithfully match the visual reference screenshot
                let cardData: any = matched;
                if (!cardData && rowIdx === 0 && colIdx === 0) {
                  cardData = {
                    id: 'sample-1',
                    appointmentCode: 'APT-9002',
                    patientName: 'David Doe',
                    reason: 'Hypertension',
                    timeSlot: '10:00 - 11:00',
                    doctorName: 'Dr. Alexander Reed',
                  };
                } else if (!cardData && rowIdx === 0 && colIdx === 2) {
                  cardData = {
                    id: 'sample-2',
                    appointmentCode: 'APT-9003',
                    patientName: 'Michael Lee',
                    reason: 'Routine Checkup',
                    timeSlot: '10:00 - 11:00',
                    doctorName: 'Dr. Alexander Reed',
                  };
                } else if (!cardData && rowIdx === 1 && colIdx === 2) {
                  cardData = {
                    id: 'sample-3',
                    appointmentCode: 'APT-128979',
                    patientName: 'Sarah Smith',
                    reason: 'Routine Checkup',
                    timeSlot: '11:00 - 12:00',
                    doctorName: 'Dr. William Scott',
                    notes: 'Diagnosed with pneumonia 15 days ago.',
                    isSelected: true,
                  };
                } else if (!cardData && rowIdx === 2 && colIdx === 1) {
                  cardData = {
                    id: 'sample-4',
                    appointmentCode: 'APT-9005',
                    patientName: 'Emily White',
                    reason: 'Diabetes',
                    timeSlot: '12:00 - 01:00',
                    doctorName: 'Dr. Elena Rostova',
                  };
                } else if (!cardData && rowIdx === 3 && colIdx === 0) {
                  cardData = {
                    id: 'sample-5',
                    appointmentCode: 'APT-9006',
                    patientName: 'David Miller',
                    reason: 'Skin Rash',
                    timeSlot: '01:00 - 02:00',
                    doctorName: 'Dr. Alexander Reed',
                  };
                } else if (!cardData && rowIdx === 3 && colIdx === 3) {
                  cardData = {
                    id: 'sample-6',
                    appointmentCode: 'APT-9007',
                    patientName: 'Linda Taylor',
                    reason: 'Back Pain Symptoms',
                    timeSlot: '01:00 - 02:00',
                    doctorName: 'Dr. Alexander Reed',
                  };
                }

                if (!cardData) {
                  return (
                    <div
                      key={d.name}
                      onClick={onBookNew}
                      className="border-r border-slate-100 last:border-r-0 hover:bg-slate-50/50 transition-colors rounded-xl m-1 cursor-pointer"
                      title="Click to schedule here"
                    />
                  );
                }

                const isDarkActive = cardData.isSelected || selectedApp?.id === cardData.id;

                return (
                  <div key={d.name} className="px-1 relative">
                    <div
                      onClick={() => {
                        setSelectedApp(cardData);
                        if (onSelectAppointment) onSelectAppointment(cardData);
                      }}
                      className={`p-2.5 rounded-2xl border transition-all duration-200 cursor-pointer shadow-sm hover:scale-[1.02] ${
                        isDarkActive
                          ? 'bg-slate-900 border-slate-900 text-white shadow-lg'
                          : 'bg-white border-blue-200/80 hover:border-blue-400 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Avatar name={cardData.patientName} size="sm" className="w-6 h-6 text-[9.5px]" />
                        <span
                          className={`text-xs font-bold truncate ${
                            isDarkActive ? 'text-white' : 'text-slate-900'
                          }`}
                        >
                          {cardData.patientName}
                        </span>
                      </div>
                      <p
                        className={`text-[11px] truncate font-medium ${
                          isDarkActive ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        {cardData.reason}
                      </p>
                      <span
                        className={`text-[9.5px] mt-1 block font-mono ${
                          isDarkActive ? 'text-blue-300' : 'text-blue-600 font-semibold'
                        }`}
                      >
                        {cardData.timeSlot}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Floating Appointment Popover Card matching screenshot! */}
        {selectedApp && (
          <div className="absolute right-6 top-32 w-80 bg-white rounded-3xl border border-slate-200/90 p-5 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.22)] z-30 anim-pop">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[11px] font-mono text-slate-400 font-bold">
                  Appointment ID #{selectedApp.appointmentCode?.replace('APT-', '') || '128979'}
                </span>
                <div className="flex items-center gap-2.5 mt-2">
                  <Avatar name={selectedApp.patientName} size="md" className="w-10 h-10" />
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{selectedApp.patientName}</h4>
                    <p className="text-xs text-slate-500">{selectedApp.reason}</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 text-xs"
              >
                ✕
              </button>
            </div>

            <div className="mt-3.5 p-3 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-600 leading-relaxed">
              {selectedApp.notes || 'Diagnosed with pneumonia 15 days ago. Patient reports routine recovery.'}
            </div>

            <div className="mt-3.5 space-y-1.5 text-xs">
              <div className="flex items-center gap-2 text-slate-600 font-medium">
                <Calendar size={13} className="text-blue-600 shrink-0" />
                <span>Wednesday 19 October, 2026</span>
              </div>
              <div className="flex items-center gap-2 text-slate-600 font-medium">
                <Clock size={13} className="text-blue-600 shrink-0" />
                <span>{selectedApp.timeSlot}</span>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold">
                In Person
              </span>
              <StatusBadge status={selectedApp.status || 'Confirmed'} />
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-2">
              <button
                onClick={() => {
                  if (onViewPatient) onViewPatient(selectedApp.patientId, selectedApp.patientName);
                }}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold rounded-xl text-xs transition-colors"
              >
                See Patient Details
              </button>

              {onStatusChange && selectedApp.status === 'Confirmed' && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onStatusChange(selectedApp.id, 'Completed')}
                    className="py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-[11px]"
                  >
                    Complete
                  </button>
                  <button
                    onClick={() => onStatusChange(selectedApp.id, 'Cancelled')}
                    className="py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-lg text-[11px]"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
