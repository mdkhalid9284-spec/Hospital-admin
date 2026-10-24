import React, { useState } from 'react';

interface DayStat {
  day: string;
  admitted: number;
  recovered: number;
  isActive?: boolean;
}

const DEFAULT_DAYS: DayStat[] = [
  { day: 'Sun', admitted: 24, recovered: 18 },
  { day: 'Mon', admitted: 28, recovered: 22 },
  { day: 'Tue', admitted: 32, recovered: 26 },
  { day: 'Wed', admitted: 38, recovered: 33, isActive: true },
  { day: 'Thu', admitted: 27, recovered: 20 },
  { day: 'Fri', admitted: 29, recovered: 25 },
  { day: 'Sat', admitted: 22, recovered: 19 },
];

export const PatientsStatisticsBarChart: React.FC<{
  admittedTotal?: number;
  recoveredTotal?: number;
  days?: DayStat[];
  className?: string;
}> = ({ admittedTotal = 35, recoveredTotal = 33, days = DEFAULT_DAYS, className = '' }) => {
  const [selectedDay, setSelectedDay] = useState<DayStat | null>(null);

  const maxVal = 40;

  return (
    <div className={`bg-white rounded-[28px] border border-slate-200/90 p-5 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06)] ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-[14.5px] font-bold text-slate-900 tracking-tight">Patients Statistics</h3>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 font-medium text-slate-600">
            <span className="w-2 h-2 rounded-full bg-slate-900 shrink-0" />
            <span>Admitted <b className="text-slate-900">{admittedTotal}</b></span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-slate-600">
            <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0" />
            <span>Recovered <b className="text-slate-900">{recoveredTotal}</b></span>
          </div>
        </div>
      </div>

      {/* Bar Chart Area */}
      <div className="flex items-end gap-3 pt-6 pb-2">
        {/* Y Axis */}
        <div className="flex flex-col justify-between h-[150px] text-[10px] font-semibold text-slate-400 select-none pr-1">
          <span>40</span>
          <span>30</span>
          <span>20</span>
          <span>10</span>
          <span>0</span>
        </div>

        {/* Bars Container */}
        <div className="flex-1 grid grid-cols-7 gap-2 sm:gap-3 items-end h-[150px]">
          {days.map((item, idx) => {
            const heightPercent = Math.min(100, Math.round((item.admitted / maxVal) * 100));
            const recoveredPercent = Math.min(100, Math.round((item.recovered / item.admitted) * 100));
            const isActive = item.isActive;

            return (
              <div
                key={idx}
                className="flex flex-col items-center h-full justify-end group cursor-pointer"
                onMouseEnter={() => setSelectedDay(item)}
                onMouseLeave={() => setSelectedDay(null)}
              >
                {/* Segmented Pill Bar */}
                <div
                  className="w-full max-w-[34px] rounded-[18px] transition-all duration-300 relative overflow-hidden flex flex-col justify-between shadow-sm group-hover:scale-[1.04]"
                  style={{ height: `${heightPercent}%` }}
                >
                  {isActive ? (
                    // Wednesday highlight bar matching screenshot
                    <div className="w-full h-full flex flex-col justify-between bg-gradient-to-t from-blue-700 via-blue-600 to-blue-500 rounded-[18px] shadow-[0_8px_18px_-4px_rgba(37,99,235,0.45)]">
                      {/* Top active capsule */}
                      <div className="w-full h-1/2 bg-blue-500/90 rounded-t-[18px]" />
                      {/* Bottom hatched texture */}
                      <div
                        className="w-full h-1/2 bg-blue-700/80 rounded-b-[18px]"
                        style={{
                          backgroundImage:
                            'repeating-linear-gradient(45deg, rgba(255,255,255,0.15), rgba(255,255,255,0.15) 2px, transparent 2px, transparent 6px)',
                        }}
                      />
                    </div>
                  ) : (
                    // Standard soft gray segmented pill bar
                    <div className="w-full h-full flex flex-col justify-between bg-slate-100 rounded-[18px] border border-slate-200/60">
                      {/* Top section */}
                      <div className="w-full h-1/2 bg-slate-200/60 rounded-t-[18px] group-hover:bg-slate-300/70 transition-colors" />
                      {/* Bottom section with subtle hatching */}
                      <div
                        className="w-full h-1/2 bg-slate-100 rounded-b-[18px]"
                        style={{
                          backgroundImage:
                            'repeating-linear-gradient(45deg, rgba(148,163,184,0.18), rgba(148,163,184,0.18) 2px, transparent 2px, transparent 6px)',
                        }}
                      />
                    </div>
                  )}

                  {/* Tooltip on hover */}
                  {selectedDay?.day === item.day && (
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-bold py-1 px-2 rounded-lg whitespace-nowrap shadow-md z-10 anim-pop pointer-events-none">
                      {item.admitted} admitted · {item.recovered} recovered
                    </div>
                  )}
                </div>

                {/* Day label */}
                <span
                  className={`mt-2 text-[11px] font-semibold transition-colors ${
                    isActive ? 'text-blue-600 font-bold' : 'text-slate-500'
                  }`}
                >
                  {item.day}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
