import React, { useState } from 'react';

export interface VitalMetricNode {
  id: string;
  label: string;
  value: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  tone: 'light' | 'dark' | 'blue';
  category: 'Heart Rate' | 'Blood Pressure' | 'Blood Sugar' | 'Hemoglobin' | 'SpO2';
}

const DEFAULT_NODES: VitalMetricNode[] = [
  { id: 'spo2', label: 'SpO2', value: '98%', x: 40, y: 65, tone: 'light', category: 'SpO2' },
  { id: 'sugar', label: 'Blood Sugar', value: '95 mg/dL', x: 48, y: 75, tone: 'light', category: 'Blood Sugar' },
  { id: 'bp', label: 'Blood Pressure', value: '120/80', x: 58, y: 72, tone: 'dark', category: 'Blood Pressure' },
  { id: 'hr', label: 'Heart Rate', value: '90bpm', x: 52, y: 52, tone: 'light', category: 'Heart Rate' },
  { id: 'hb', label: 'Hemoglobin', value: '12.0g/dL', x: 65, y: 54, tone: 'blue', category: 'Hemoglobin' },
];

const TABS = ['Overall', 'Heart Rate', 'Blood Pressure', 'Blood Sugar', 'Hemoglobin', 'SpO2'] as const;

export const TestAnalyticsBubbleChart: React.FC<{
  nodes?: VitalMetricNode[];
  className?: string;
}> = ({ nodes = DEFAULT_NODES, className = '' }) => {
  const [activeTab, setActiveTab] = useState<string>('Overall');
  const [hovered, setHovered] = useState<VitalMetricNode | null>(null);

  const filteredNodes = nodes.filter(
    (n) => activeTab === 'Overall' || n.category === activeTab
  );

  return (
    <div className={`bg-white rounded-[28px] border border-slate-200/90 p-5 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06)] ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h3 className="text-[14.5px] font-bold text-slate-900 tracking-tight">Test Analytics</h3>
        {/* Metric tabs */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-100/70 p-1 rounded-full border border-slate-200/60">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 text-[11px] font-bold rounded-full transition-all ${
                activeTab === tab
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Coordinate Canvas */}
      <div className="relative w-full h-[240px] border border-dashed border-slate-200 rounded-2xl bg-slate-50/40 p-4 overflow-hidden">
        {/* Y Axis Grid lines */}
        {[100, 80, 60, 40, 20].map((val) => (
          <div
            key={val}
            className="absolute left-0 right-0 border-b border-dashed border-slate-200/80 flex items-center"
            style={{ bottom: `${val * 0.9}%` }}
          >
            <span className="text-[9px] font-semibold text-slate-400 pl-2 -translate-y-2 select-none">
              {val}
            </span>
          </div>
        ))}

        {/* X Axis Coordinates */}
        <div className="absolute bottom-1 left-8 right-4 flex justify-between text-[9px] font-semibold text-slate-400 select-none">
          {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((v) => (
            <span key={v}>{v}</span>
          ))}
        </div>

        {/* Bubbles */}
        {filteredNodes.map((n) => {
          const isSelected = hovered?.id === n.id;
          const bgTone =
            n.tone === 'dark'
              ? 'bg-slate-900 text-white border-slate-900 shadow-md'
              : n.tone === 'blue'
              ? 'bg-[#1d6cf2] text-white border-[#1d6cf2] shadow-[0_8px_20px_-4px_rgba(29,108,242,0.5)]'
              : 'bg-slate-100 text-slate-800 border-slate-200/80 hover:bg-slate-200 shadow-sm';

          return (
            <div
              key={n.id}
              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-all duration-300 ${bgTone} ${
                isSelected ? 'scale-110 z-20 ring-4 ring-blue-400/30' : 'z-10'
              }`}
              style={{
                left: `${n.x}%`,
                bottom: `${n.y}%`,
                width: isSelected ? '76px' : '68px',
                height: isSelected ? '76px' : '68px',
              }}
              onMouseEnter={() => setHovered(n)}
              onMouseLeave={() => setHovered(null)}
            >
              <span className="text-[11.5px] font-bold leading-tight">{n.value}</span>
              <span
                className={`text-[8.5px] leading-tight font-medium mt-0.5 max-w-[55px] truncate ${
                  n.tone === 'light' ? 'text-slate-500' : 'text-white/80'
                }`}
              >
                {n.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
