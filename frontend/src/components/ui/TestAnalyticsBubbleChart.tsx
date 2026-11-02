import React, { useState } from 'react';

export interface VitalMetricNode {
  id: string;
  label: string;
  value: string;
  x: number;
  y: number;
  tone: 'light' | 'dark' | 'lime';
  category: 'Heart Rate' | 'Blood Pressure' | 'Blood Sugar' | 'Hemoglobin' | 'SpO2';
}

const DEFAULT_NODES: VitalMetricNode[] = [
  { id: 'spo2', label: 'SpO2', value: '98%', x: 40, y: 65, tone: 'light', category: 'SpO2' },
  { id: 'sugar', label: 'Blood Sugar', value: '95 mg/dL', x: 48, y: 75, tone: 'light', category: 'Blood Sugar' },
  { id: 'bp', label: 'Blood Pressure', value: '120/80', x: 58, y: 72, tone: 'dark', category: 'Blood Pressure' },
  { id: 'hr', label: 'Heart Rate', value: '74bpm', x: 52, y: 52, tone: 'light', category: 'Heart Rate' },
  { id: 'hb', label: 'Hemoglobin', value: '13.4g/dL', x: 65, y: 54, tone: 'lime', category: 'Hemoglobin' },
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
    <div className={`bg-white rounded-[24px] border border-[#E3E8DE] p-5 shadow-sm ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h3 className="text-[14px] font-bold text-[#26352A] tracking-tight">Vitals & Test Analytics</h3>
        <div className="flex flex-wrap items-center gap-1 bg-[#F5F6F2] p-1 rounded-full border border-[#E3E8DE]">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 text-[11px] font-bold rounded-full transition-all ${
                activeTab === tab
                  ? 'bg-[#14532D] text-white shadow-xs'
                  : 'text-[#667367] hover:text-[#26352A]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="relative w-full h-[230px] border border-dashed border-[#E3E8DE] rounded-2xl bg-[#FAFBF5] p-4 overflow-hidden">
        {[100, 80, 60, 40, 20].map((val) => (
          <div
            key={val}
            className="absolute left-0 right-0 border-b border-dashed border-[#E3E8DE]/70 flex items-center"
            style={{ bottom: `${val * 0.9}%` }}
          >
            <span className="text-[9px] font-semibold text-[#8A998B] pl-2 -translate-y-2 select-none">
              {val}
            </span>
          </div>
        ))}

        <div className="absolute bottom-1 left-8 right-4 flex justify-between text-[9px] font-semibold text-[#8A998B] select-none">
          {[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((v) => (
            <span key={v}>{v}</span>
          ))}
        </div>

        {filteredNodes.map((n) => {
          const isSelected = hovered?.id === n.id;
          const bgTone =
            n.tone === 'dark'
              ? 'bg-[#0B3D20] text-white border-[#0B3D20] shadow-md'
              : n.tone === 'lime'
              ? 'bg-[#C7FF75] text-[#0B3D20] border-[#9cdd3a] shadow-sm font-bold'
              : 'bg-white text-[#26352A] border-[#E3E8DE] hover:bg-[#F5F6F2] shadow-xs';

          return (
            <div
              key={n.id}
              className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full flex flex-col items-center justify-center p-3 text-center cursor-pointer transition-all duration-300 border ${bgTone} ${
                isSelected ? 'scale-110 z-20 ring-4 ring-[#C7FF75]/50' : 'z-10'
              }`}
              style={{
                left: `${n.x}%`,
                bottom: `${n.y}%`,
                width: isSelected ? '74px' : '66px',
                height: isSelected ? '74px' : '66px',
              }}
              onMouseEnter={() => setHovered(n)}
              onMouseLeave={() => setHovered(null)}
            >
              <span className="text-[11px] font-bold leading-tight">{n.value}</span>
              <span
                className={`text-[8.5px] leading-tight font-medium mt-0.5 max-w-[55px] truncate ${
                  n.tone === 'dark' ? 'text-[#C7FF75]' : 'text-[#667367]'
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
