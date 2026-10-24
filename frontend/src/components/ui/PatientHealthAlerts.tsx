import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';
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
    description: 'Patient reports severe chest pain & shortness of breath.',
    actionText: 'Advise ER Visit',
  },
  {
    id: 'alt-2',
    patientName: 'David Miller',
    severity: 'High Risk',
    time: '11:20 AM',
    description: 'Low blood sugar. Fasting glucose dropped to 60 mg/dL',
    actionText: 'Visit',
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
    <div className={`bg-white rounded-[28px] border border-slate-200/90 p-5 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06)] ${className}`}>
      <div className="flex items-center justify-between mb-3.5">
        <h3 className="text-[14.5px] font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <ShieldAlert size={17} className="text-rose-500" />
          Patient Health Monitoring & Alerts
        </h3>
        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
      </div>

      {feedback && (
        <div className="mb-3 px-3.5 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2 anim-pop">
          <CheckCircle size={14} className="text-emerald-600 shrink-0" />
          {feedback}
        </div>
      )}

      <div className="space-y-3">
        {items.map((alt) => (
          <div
            key={alt.id}
            className={`p-4 rounded-2xl border transition-all duration-200 ${
              alt.actionDone
                ? 'bg-slate-50 border-slate-200 opacity-60'
                : 'bg-rose-50/40 border-rose-100 hover:border-rose-200'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider">
                {alt.severity}
              </span>
              <span className="text-[11px] font-semibold text-slate-400">{alt.time}</span>
            </div>

            <p className="text-[13px] font-medium text-slate-800 mt-1 leading-snug">
              {alt.description}
            </p>

            <div className="mt-3.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Avatar name={alt.patientName} size="sm" className="w-7 h-7 text-[10px]" />
                <span className="text-xs font-bold text-slate-900 truncate">{alt.patientName}</span>
              </div>

              {alt.actionDone ? (
                <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                  <CheckCircle size={12} /> Dispatched
                </span>
              ) : (
                <button
                  onClick={() => handleAction(alt.id, alt.actionText, alt.patientName)}
                  className="px-3.5 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold transition-all active:scale-95 shadow-sm"
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
