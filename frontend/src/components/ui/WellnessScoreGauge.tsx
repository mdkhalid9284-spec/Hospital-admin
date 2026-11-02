import React from 'react';

export const WellnessScoreGauge: React.FC<{
  score?: number;
  subtitle?: string;
  className?: string;
}> = ({
  score = 88,
  subtitle = 'Calculated from clinical telemetry, vitals, and lifestyle metrics.',
  className = '',
}) => {
  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * 0.75;
  const strokeDashoffset = arcLength - (arcLength * (score / 100));

  return (
    <div className={`bg-white rounded-[24px] border border-[#E3E8DE] p-5 shadow-sm ${className}`}>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-[14px] font-bold text-[#26352A] tracking-tight">Wellness Score</h3>
          <p className="text-[11px] text-[#667367] mt-0.5 max-w-[280px] leading-relaxed">{subtitle}</p>
        </div>
        <span className="px-2.5 py-0.5 rounded-full bg-[#EAF9D8] text-[#0B3D20] border border-[#C7FF75] text-[11px] font-bold">
          Optimal
        </span>
      </div>

      <div className="relative mt-3 flex items-center justify-center">
        <svg viewBox="0 0 160 140" className="w-[160px] h-[125px] overflow-visible">
          <defs>
            <linearGradient id="scoreGradientForest" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#C7FF75" />
              <stop offset="100%" stopColor="#14532D" />
            </linearGradient>
            <filter id="scoreGlowForest" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="3" stdDeviation="5" floodColor="#14532D" floodOpacity="0.25" />
            </filter>
          </defs>

          {/* Background track arc */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="#F5F6F2"
            strokeWidth="15"
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
            stroke="url(#scoreGradientForest)"
            strokeWidth="15"
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            filter="url(#scoreGlowForest)"
            transform="rotate(135 80 80)"
            className="transition-all duration-700 ease-out"
          />

          <text
            x="80"
            y="76"
            textAnchor="middle"
            className="fill-[#26352A] font-bold tracking-tight"
            style={{ fontSize: '28px' }}
          >
            {score}
          </text>
          <text
            x="80"
            y="93"
            textAnchor="middle"
            className="fill-[#667367] font-medium"
            style={{ fontSize: '10px' }}
          >
            / 100 points
          </text>
        </svg>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#E3E8DE] text-center">
        <div>
          <p className="text-[10px] uppercase font-bold text-[#8A998B]">Cardio</p>
          <p className="text-[13px] font-bold text-[#26352A]">92%</p>
        </div>
        <div>
          <p className="text-[10px] uppercase font-bold text-[#8A998B]">Metabolic</p>
          <p className="text-[13px] font-bold text-[#26352A]">86%</p>
        </div>
        <div>
          <p className="text-[10px] uppercase font-bold text-[#8A998B]">Sleep</p>
          <p className="text-[13px] font-bold text-[#26352A]">85%</p>
        </div>
      </div>
    </div>
  );
};
