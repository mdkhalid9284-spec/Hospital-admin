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

  // Concentric radar polygons
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
      className={`relative bg-white/95 rounded-[28px] border border-slate-200/90 p-5 shadow-[0_16px_36px_-12px_rgba(15,23,42,0.12)] transition-all duration-300 hover:shadow-[0_22px_44px_-10px_rgba(15,23,42,0.16)] ${className}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[13.5px] font-bold text-slate-800">Top Consultations</p>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-[26px] font-bold tracking-tight text-slate-900 leading-none">{total}</span>
            <span className="text-[11px] text-slate-400 font-medium">Total Consultations</span>
          </div>
        </div>
        {hovered && (
          <div className="px-2.5 py-1 rounded-full bg-slate-900 text-white text-[11px] font-bold anim-pop shadow-sm">
            {hovered.condition}: {hovered.count} cases
          </div>
        )}
      </div>

      <div className="relative mt-2 flex items-center justify-center">
        <svg viewBox="0 0 260 220" className="w-full max-w-[280px] h-[190px] overflow-visible">
          <defs>
            <linearGradient id="radarGrad3D" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.75" />
              <stop offset="50%" stopColor="#2563eb" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.85" />
            </linearGradient>
            <linearGradient id="facetHighlight" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0.1" />
            </linearGradient>
            <filter id="radarGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#2563eb" floodOpacity="0.35" />
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
              stroke="#e2e8f0"
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
                stroke="#e2e8f0"
                strokeWidth="1"
              />
            );
          })}

          {/* Radar shaded polygon with 3D drop shadow */}
          <polygon
            points={polygonPoints}
            fill="url(#radarGrad3D)"
            stroke="#1d4ed8"
            strokeWidth="2"
            filter="url(#radarGlow)"
            className="transition-all duration-300"
          />

          {/* Highlight facet overlay for dimensional glass look */}
          <polygon
            points={`${cx},${cy} ${polygonPoints.split(' ')[0]} ${polygonPoints.split(' ')[1]}`}
            fill="url(#facetHighlight)"
          />

          {/* Vertices */}
          {data.map((item, idx) => {
            const r = (item.count / item.max) * maxRadius;
            const pt = getCoordinates(item.angle, r);
            const labelPt = getCoordinates(item.angle, maxRadius + 22);

            const isHovered = hovered?.condition === item.condition;

            return (
              <g key={idx}>
                {/* Vertex node circle */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 6 : 4}
                  fill="#ffffff"
                  stroke="#1d4ed8"
                  strokeWidth={isHovered ? 3 : 2}
                  className="cursor-pointer transition-all duration-200"
                  onMouseEnter={() => setHovered(item)}
                  onMouseLeave={() => setHovered(null)}
                />

                {/* Condition label */}
                <text
                  x={labelPt.x}
                  y={labelPt.y}
                  textAnchor="middle"
                  alignmentBaseline="middle"
                  className={`text-[10px] font-semibold select-none transition-colors ${
                    isHovered ? 'fill-blue-600 font-bold' : 'fill-slate-600'
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
