import React, { useState } from 'react';

interface ConsultationItem {
  condition: string;
  count: number;
  max: number;
  angle: number; // in degrees
}

const DEFAULT_DATA: ConsultationItem[] = [
  { condition: 'Hypertension', count: 18, max: 25, angle: 30 },
  { condition: 'Hemorrhoid', count: 12, max: 25, angle: 90 },
  { condition: 'Appendicitis', count: 15, max: 25, angle: 210 },
  { condition: 'Thyroid Nodule', count: 10, max: 25, angle: 290 },
];

export const TopConsultationsRadar: React.FC<{
  total?: number;
  data?: ConsultationItem[];
  className?: string;
  interactive?: boolean;
}> = ({ total = 22, data = DEFAULT_DATA, className = '', interactive = true }) => {
  const [hovered, setHovered] = useState<ConsultationItem | null>(null);

  const cx = 130;
  const cy = 110;
  const maxRadius = 75;

  const getCoordinates = (angleDeg: number, radius: number) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad),
    };
  };

  const levels = [0.25, 0.5, 0.75, 1];

  const polygonPoints = data
    .map((item) => {
      const r = (item.count / item.max) * maxRadius;
      const pt = getCoordinates(item.angle, r);
      return `${pt.x},${pt.y}`;
    })
    .join(' ');

  return (
    <div
      className={`relative bg-white rounded-[24px] border border-[#E3E8DE] p-5 shadow-sm transition-all duration-300 hover:shadow-md ${className}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[13.5px] font-bold text-[#26352A]">Top Consultations</p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-[26px] font-bold tracking-tight text-[#14532D] leading-none">{total}</span>
            <span className="text-[11px] text-[#667367] font-medium">Cases this cycle</span>
          </div>
        </div>
        {hovered && (
          <div className="px-2.5 py-1 rounded-full bg-[#14532D] text-[#C7FF75] text-[11px] font-bold anim-pop shadow-sm">
            {hovered.condition}: {hovered.count}
          </div>
        )}
      </div>

      <div className="relative mt-2 flex items-center justify-center">
        <svg viewBox="0 0 260 220" className="w-full max-w-[280px] h-[190px] overflow-visible">
          <defs>
            <linearGradient id="radarGradForest" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#C7FF75" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#14532D" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#0B3D20" stopOpacity="0.85" />
            </linearGradient>
            <filter id="radarForestGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#14532D" floodOpacity="0.25" />
            </filter>
          </defs>

          {/* Web grid levels */}
          {levels.map((lvl, idx) => (
            <polygon
              key={idx}
              points={data
                .map((d) => {
                  const pt = getCoordinates(d.angle, maxRadius * lvl);
                  return `${pt.x},${pt.y}`;
                })
                .join(' ')}
              fill="none"
              stroke="#E3E8DE"
              strokeWidth="1"
              strokeDasharray={idx === levels.length - 1 ? 'none' : '2,2'}
            />
          ))}

          {/* Axis spokes from center */}
          {data.map((item, idx) => {
            const pt = getCoordinates(item.angle, maxRadius);
            return (
              <line
                key={idx}
                x1={cx}
                y1={cy}
                x2={pt.x}
                y2={pt.y}
                stroke="#E3E8DE"
                strokeWidth="1"
              />
            );
          })}

          {/* Radar shaded polygon */}
          <polygon
            points={polygonPoints}
            fill="url(#radarGradForest)"
            stroke="#14532D"
            strokeWidth="2"
            filter="url(#radarForestGlow)"
            className="transition-all duration-300"
          />

          {/* Vertices */}
          {data.map((item, idx) => {
            const r = (item.count / item.max) * maxRadius;
            const pt = getCoordinates(item.angle, r);
            const labelPt = getCoordinates(item.angle, maxRadius + 22);

            const isHovered = hovered?.condition === item.condition;

            return (
              <g key={idx}>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 6 : 4}
                  fill="#FFFFFF"
                  stroke="#14532D"
                  strokeWidth={isHovered ? 3 : 2}
                  className="cursor-pointer transition-all duration-200"
                  onMouseEnter={() => setHovered(item)}
                  onMouseLeave={() => setHovered(null)}
                />

                <text
                  x={labelPt.x}
                  y={labelPt.y}
                  textAnchor="middle"
                  alignmentBaseline="middle"
                  className={`text-[10px] font-semibold select-none transition-colors ${
                    isHovered ? 'fill-[#14532D] font-bold' : 'fill-[#667367]'
                  }`}
                  style={{ fontSize: '9.5px' }}
                >
                  {item.condition}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};
