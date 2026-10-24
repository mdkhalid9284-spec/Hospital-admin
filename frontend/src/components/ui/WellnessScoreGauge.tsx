import React from 'react';

export const WellnessScoreGauge: React.FC<{
  score?: number;
  subtitle?: string;
  className?: string;
}> = ({
  score = 88,
  subtitle = 'Calculated from your latest health records, vitals, and lifestyle inputs.',
  className = '',
}) => {
  // SVG circular arc parameters
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  // Use 75% arc (semi-circle / open ring)
  const arcLength = circumference * 0.75;
  const strokeDashoffset = arcLength - (arcLength * (score / 100));

  return (
    <div className={`bg-white rounded-[28px] border border-slate-200/90 p-5 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06)] ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-[14.5px] font-bold text-slate-900 tracking-tight">Wellness Score</h3>
          <p className="text-[11.5px] text-slate-500 mt-1 max-w-[280px] leading-relaxed">{subtitle}</p>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold">
          Optimal
        </span>
      </div>

      <div className="relative mt-4 flex items-center justify-center">
        <svg viewBox="0 0 160 140" className="w-[170px] h-[130px] overflow-visible">
          <defs>
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#1d6cf2" />
            </linearGradient>
            <filter id="scoreGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#1d6cf2" floodOpacity="0.3" />
            </filter>
          </defs>

          {/* Background track arc */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth="16"
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset="0"
            strokeLinecap="round"
            transform="rotate(135 80 80)"
          />

          {/* Value progress arc */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="url(#scoreGradient)"
            strokeWidth="16"
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            filter="url(#scoreGlow)"
            transform="rotate(135 80 80)"
            className="transition-all duration-700 ease-out"
          />

          {/* Center text */}
          <text
            x="80"
            y="76"
            textAnchor="middle"
            className="fill-slate-900 font-bold text-[32px] tracking-tight"
            style={{ fontSize: '30px' }}
          >
            {score}
          </text>
          <text
            x="80"
            y="94"
            textAnchor="middle"
            className="fill-slate-400 font-medium text-[11px]"
            style={{ fontSize: '10.5px' }}
          >
            / 100 points
          </text>
        </svg>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
        <div>
          <p className="text-[10px] uppercase font-bold text-slate-400">Cardio</p>
          <p className="text-[13px] font-bold text-slate-800">92%</p>
        </div>
        <div>
          <p className="text-[10px] uppercase font-bold text-slate-400">Metabolic</p>
          <p className="text-[13px] font-bold text-slate-800">86%</p>
        </div>
        <div>
          <p className="text-[10px] uppercase font-bold text-slate-400">Sleep</p>
          <p className="text-[13px] font-bold text-slate-800">85%</p>
        </div>
      </div>
    </div>
  );
};
