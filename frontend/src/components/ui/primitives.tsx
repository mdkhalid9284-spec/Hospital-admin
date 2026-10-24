import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: (string | false | null | undefined)[]) {
  return twMerge(clsx(...inputs));
}

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement> & { hover?: boolean }> = ({
  className, hover, children, ...rest
}) => (
  <div className={cn('hc-card', hover && 'hc-card-hover', className)} {...rest}>{children}</div>
);

export const PageHeader: React.FC<{
  title: string; subtitle?: string; icon?: React.ReactNode;
  actions?: React.ReactNode; date?: string;
}> = ({ title, subtitle, icon, actions, date }) => (
  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between anim-fade-up">
    <div>
      <div className="flex items-center gap-2.5">
        {icon && (
          <span className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm shrink-0">{icon}</span>
        )}
        <div>
          <h1 className="text-[22px] sm:text-2xl font-bold tracking-tight text-slate-900 leading-tight">{title}</h1>
          {subtitle && <p className="text-[13px] text-slate-500 mt-0.5 max-w-xl">{subtitle}</p>}
        </div>
      </div>
      {date && <p className="text-xs text-slate-400 font-medium mt-2 ml-[50px]">{date}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

const badgeTones: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  blue: 'bg-sky-50 text-sky-700 border-sky-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  rose: 'bg-rose-50 text-rose-700 border-rose-200',
  slate: 'bg-slate-100 text-slate-600 border-slate-200',
  purple: 'bg-violet-50 text-violet-700 border-violet-200',
  dark: 'bg-slate-900 text-white border-slate-900',
};

export const Badge: React.FC<{ tone?: keyof typeof badgeTones; className?: string; children: React.ReactNode }> = ({
  tone = 'slate', className, children,
}) => (
  <span className={cn('inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-full border whitespace-nowrap', badgeTones[tone], className)}>
    {children}
  </span>
);

export function statusTone(status?: string): 'emerald' | 'blue' | 'amber' | 'rose' | 'slate' | 'purple' {
  const s = (status || '').toLowerCase();
  if (['paid', 'admitted', 'confirmed', 'completed', 'approved', 'available', 'success'].includes(s)) return 'emerald';
  if (['partially paid', 'consultation', 'submitted', 'pending review'].includes(s)) return 'blue';
  if (['pending', 'reserved', 'submitted', 'in-review'].includes(s)) return 'amber';
  if (['cancelled', 'rejected', 'occupied', 'failure', 'discharged'].includes(s) || s.includes('cancel') || s.includes('reject')) return 'rose';
  if (s.includes('icu') || s.includes('admin')) return 'purple';
  return 'slate';
}

export const StatusBadge: React.FC<{ status?: string; className?: string }> = ({ status, className }) => (
  <Badge tone={statusTone(status)} className={className}>{status || '—'}</Badge>
);

export const Avatar: React.FC<{ name?: string; size?: 'sm' | 'md' | 'lg'; tone?: string; className?: string }> = ({
  name = '?', size = 'md', tone, className,
}) => {
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-lg' };
  return (
    <div className={cn('rounded-full flex items-center justify-center font-bold shrink-0 border', sizes[size], tone || 'bg-sky-50 text-sky-700 border-sky-200', className)}>
      {initials}
    </div>
  );
};

export const EmptyState: React.FC<{ icon?: React.ReactNode; title: string; hint?: string; action?: React.ReactNode }> = ({
  icon, title, hint, action,
}) => (
  <div className="flex flex-col items-center justify-center text-center py-12 px-6">
    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">{icon}</div>
    <p className="text-sm font-semibold text-slate-800">{title}</p>
    {hint && <p className="text-xs text-slate-500 mt-1 max-w-sm">{hint}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const ErrorState: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <div className="hc-card p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 border-rose-200 bg-rose-50/40">
    <div className="text-sm text-rose-800 flex-1"><span className="font-bold">Something went wrong. </span>{message}</div>
    {onRetry && <button onClick={onRetry} className="hc-btn-ghost !py-2 text-xs shrink-0">Retry</button>}
  </div>
);

export const SkeletonBlock: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('skeleton h-4', className)} />
);

export const SearchInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { onClear?: () => void }> = ({
  className, onClear, ...rest
}) => (
  <div className={cn('hc-card !rounded-xl flex items-center gap-2.5 px-4 py-1', className)}>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.4" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
    <input {...rest} className="w-full bg-transparent py-2.5 text-sm text-slate-900 focus:outline-none placeholder:text-slate-400" />
  </div>
);

export const Modal: React.FC<{ open: boolean; onClose: () => void; children: React.ReactNode; width?: string }> = ({
  open, onClose, children, width = 'max-w-lg',
}) => {
  React.useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', fn); document.body.style.overflow = ''; };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]" onClick={onClose} />
      <div className={`relative w-full ${width} max-h-[92vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-2xl anim-pop`}>
        {children}
      </div>
    </div>
  );
};

export const ModalHeader: React.FC<{ title: string; subtitle?: string; onClose: () => void }> = ({ title, subtitle, onClose }) => (
  <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-slate-100 sticky top-0 bg-white/95 backdrop-blur z-10">
    <div>
      <h3 className="text-[17px] font-bold text-slate-900 tracking-tight">{title}</h3>
      {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
    <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors shrink-0">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
    </button>
  </div>
);

export const Tabs: React.FC<{ tabs: { id: string; label: string; count?: number }[]; active: string; onChange: (id: string) => void }> = ({
  tabs, active, onChange,
}) => (
  <div className="flex gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/70 overflow-x-auto">
    {tabs.map((t) => (
      <button
        key={t.id}
        onClick={() => onChange(t.id)}
        className={cn(
          'flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[13px] font-semibold whitespace-nowrap transition-all',
          active === t.id ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'
        )}
      >
        {t.label}
        {typeof t.count === 'number' && (
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded-md font-bold', active === t.id ? 'bg-white/20 text-white' : 'bg-white text-slate-500 border border-slate-200')}>{t.count}</span>
        )}
      </button>
    ))}
  </div>
);

export const Field: React.FC<{ label: string; children: React.ReactNode; className?: string }> = ({ label, children, className }) => (
  <div className={className}>
    <label className="hc-label">{label}</label>
    {children}
  </div>
);

export const inputCls = 'hc-input';
