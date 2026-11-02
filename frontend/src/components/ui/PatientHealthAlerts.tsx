import React, { useState } from 'react';
import { CheckCircle, ShieldAlert } from 'lucide-react';
import { Avatar } from './primitives';

export interface HealthAlertItem {
  id: string;
  patientName: string;
  patientAvatar?: string;
  severity: 'High Risk' | 'Medium Risk' | 'Observation';
  time: string;
  description: string;
  actionText: string;
  actionDone?: boolean;
}

const DEFAULT_ALERTS: HealthAlertItem[] = [
  {
    id: 'alt-1',
    patientName: 'William Thomas',
    severity: 'High Risk',
    time: '11:20 AM',
    description: 'Patient reports severe chest discomfort & shortness of breath.',
    actionText: 'Advise ER Triage',
  },
  {
    id: 'alt-2',
    patientName: 'David Miller',
    severity: 'High Risk',
    time: '11:20 AM',
    description: 'Low blood sugar. Fasting glucose dropped to 60 mg/dL.',
    actionText: 'Order Stat Labs',
  },
];

export const PatientHealthAlerts: React.FC<{
  alerts?: HealthAlertItem[];
  className?: string;
}> = ({ alerts = DEFAULT_ALERTS, className = '' }) => {
  const [items, setItems] = useState<HealthAlertItem[]>(alerts);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleAction = (id: string, actionName: string, patientName: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, actionDone: true } : item))
    );
    setFeedback(`Action taken: "${actionName}" dispatched for ${patientName}.`);
    setTimeout(() => setFeedback(null), 3500);
  };

  return (
    <div className={`bg-white rounded-[24px] border border-[#E3E8DE] p-5 shadow-sm ${className}`}>
      <div className="flex items-center justify-between mb-3.5">
        <h3 className="text-[14px] font-bold text-[#26352A] tracking-tight flex items-center gap-2">
          <ShieldAlert size={17} className="text-[#B42318]" />
          Patient Health Monitoring & Alerts
        </h3>
        <span className="w-2 h-2 rounded-full bg-[#B42318] animate-pulse" />
      </div>

      {feedback && (
        <div className="mb-3 px-3.5 py-2 bg-[#EAF9D8] border border-[#C7FF75] rounded-xl text-xs font-semibold text-[#0B3D20] flex items-center gap-2 anim-pop">
          <CheckCircle size={14} className="text-[#14532D] shrink-0" />
          {feedback}
        </div>
      )}

      <div className="space-y-3">
        {items.map((alt) => (
          <div
            key={alt.id}
            className={`p-3.5 rounded-2xl border transition-all duration-200 ${
              alt.actionDone
                ? 'bg-[#F5F6F2] border-[#E3E8DE] opacity-65'
                : 'bg-[#FEF2F2]/60 border-[#FCA5A5]/60 hover:border-[#FCA5A5]'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-[#B42318] text-white text-[10px] font-bold uppercase tracking-wider">
                {alt.severity}
              </span>
              <span className="text-[11px] font-semibold text-[#667367]">{alt.time}</span>
            </div>

            <p className="text-[12.5px] font-medium text-[#26352A] mt-1 leading-snug">
              {alt.description}
            </p>

            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Avatar name={alt.patientName} size="sm" className="w-6 h-6 text-[9.5px]" />
                <span className="text-xs font-bold text-[#26352A] truncate">{alt.patientName}</span>
              </div>

              {alt.actionDone ? (
                <span className="text-[11px] font-semibold text-[#14532D] flex items-center gap-1">
                  <CheckCircle size={12} /> Dispatched
                </span>
              ) : (
                <button
                  onClick={() => handleAction(alt.id, alt.actionText, alt.patientName)}
                  className="px-3.5 py-1.5 rounded-full bg-[#14532D] hover:bg-[#0B3D20] text-white text-[11px] font-semibold transition-all active:scale-95 shadow-xs"
                >
                  {alt.actionText}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
