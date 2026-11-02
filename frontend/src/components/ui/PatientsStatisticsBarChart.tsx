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
    <div className={`bg-white rounded-[24px] border border-[#E3E8DE] p-5 shadow-sm ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="text-[14px] font-bold text-[#26352A] tracking-tight">Patients Statistics</h3>
          <p className="text-[11px] text-[#667367]">Weekly admissions vs recovered discharge</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 font-medium text-[#667367]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#14532D] shrink-0" />
            <span>Admitted <b className="text-[#26352A]">{admittedTotal}</b></span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-[#667367]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C7FF75] border border-[#14532D]/30 shrink-0" />
            <span>Recovered <b className="text-[#26352A]">{recoveredTotal}</b></span>
          </div>
        </div>
      </div>

      {/* Bar Chart Area */}
      <div className="flex items-end gap-3 pt-6 pb-2">
        {/* Y Axis */}
        <div className="flex flex-col justify-between h-[150px] text-[10px] font-semibold text-[#8A998B] select-none pr-1">
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
                  className="w-full max-w-[34px] rounded-[18px] transition-all duration-300 relative overflow-hidden flex flex-col justify-between shadow-xs group-hover:scale-[1.04]"
                  style={{ height: `${heightPercent}%` }}
                >
                  {isActive ? (
                    // Highlight bar in forest green + fresh lime accent
                    <div className="w-full h-full flex flex-col justify-between bg-gradient-to-t from-[#0B3D20] via-[#14532D] to-[#1e7b43] rounded-[18px] shadow-[0_6px_16px_-4px_rgba(20,83,45,0.4)]">
                      <div className="w-full h-1/2 bg-[#C7FF75] rounded-t-[18px] flex items-center justify-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0B3D20]" />
                      </div>
                      <div
                        className="w-full h-1/2 bg-[#14532D] rounded-b-[18px]"
                        style={{
                          backgroundImage:
                            'repeating-linear-gradient(45deg, rgba(199,255,117,0.2), rgba(199,255,117,0.2) 2px, transparent 2px, transparent 6px)',
                        }}
                      />
                    </div>
                  ) : (
                    // Standard soft pill bar
                    <div className="w-full h-full flex flex-col justify-between bg-[#F5F6F2] rounded-[18px] border border-[#E3E8DE]">
                      <div className="w-full h-1/2 bg-[#EAF9D8]/80 rounded-t-[18px] group-hover:bg-[#EAF9D8] transition-colors" />
                      <div
                        className="w-full h-1/2 bg-[#F5F6F2] rounded-b-[18px]"
                        style={{
                          backgroundImage:
                            'repeating-linear-gradient(45deg, rgba(102,115,103,0.12), rgba(102,115,103,0.12) 2px, transparent 2px, transparent 6px)',
                        }}
                      />
                    </div>
                  )}

                  {/* Tooltip on hover */}
                  {selectedDay?.day === item.day && (
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[#0B3D20] text-white text-[10px] font-bold py-1 px-2.5 rounded-lg whitespace-nowrap shadow-md z-10 anim-pop pointer-events-none">
                      {item.admitted} admitted · {item.recovered} recovered
                    </div>
                  )}
                </div>

                {/* Day label */}
                <span
                  className={`mt-2 text-[11px] font-semibold transition-colors ${
                    isActive ? 'text-[#14532D] font-bold' : 'text-[#667367]'
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
