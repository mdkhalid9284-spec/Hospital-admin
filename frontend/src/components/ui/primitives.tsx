import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: (string | false | null | undefined)[]) {
  return twMerge(clsx(...inputs));
}

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement> & { hover?: boolean; tone?: 'white' | 'cream' | 'pale' | 'forest' }> = ({
  className, hover, tone = 'white', children, ...rest
}) => {
  const toneCls = {
    white: 'bg-white border-[#E3E8DE]',
    cream: 'bg-[#F7F8EF] border-[#E3E8DE]',
    pale: 'bg-[#EAF9D8] border-[#C7FF75]/50',
    forest: 'bg-[#14532D] text-white border-[#14532D]',
  }[tone];

  return (
    <div className={cn('hc-card', toneCls, hover && 'hc-card-hover', className)} {...rest}>
      {children}
    </div>
  );
};

export const PageHeader: React.FC<{
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  date?: string;
}> = ({ title, subtitle, icon, actions, date }) => (
  <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between anim-fade-up">
    <div>
      <div className="flex items-center gap-3">
        {icon && (
          <span className="w-11 h-11 rounded-2xl bg-[#14532D] text-[#C7FF75] flex items-center justify-center shadow-sm shrink-0">
            {icon}
          </span>
        )}
        <div>
          <h1 className="text-[24px] sm:text-[26px] font-bold tracking-tight text-[#26352A] leading-tight">
            {title}
          </h1>
          {subtitle && <p className="text-[13px] text-[#667367] mt-0.5 max-w-xl">{subtitle}</p>}
        </div>
      </div>
      {date && <p className="text-xs text-[#667367] font-medium mt-2 ml-[56px]">{date}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

const badgeTones = {
  emerald: 'bg-[#EAF9D8] text-[#0B3D20] border-[#C7FF75]',
  blue: 'bg-[#EAF9D8] text-[#14532D] border-[#C7FF75]/70',
  lime: 'bg-[#C7FF75] text-[#0B3D20] font-bold border-transparent',
  forest: 'bg-[#14532D] text-white border-transparent',
  amber: 'bg-[#FEF9C3] text-[#9A6700] border-[#FDE047]',
  rose: 'bg-[#FEE2E2] text-[#B42318] border-[#FCA5A5]',
  slate: 'bg-[#F5F6F2] text-[#667367] border-[#E3E8DE]',
  purple: 'bg-[#F3E8FF] text-[#6B21A8] border-[#E9D5FF]',
  dark: 'bg-[#0B3D20] text-[#C7FF75] border-[#0B3D20]',
};

export const Badge: React.FC<{ tone?: keyof typeof badgeTones; className?: string; children: React.ReactNode }> = ({
  tone = 'slate', className, children,
}) => (
  <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold rounded-full border whitespace-nowrap', badgeTones[tone], className)}>
    {children}
  </span>
);

export function statusTone(status?: string): 'emerald' | 'blue' | 'amber' | 'rose' | 'slate' | 'purple' {
  const s = (status || '').toLowerCase();
  if (['paid', 'admitted', 'confirmed', 'completed', 'approved', 'available', 'success'].includes(s)) return 'emerald';
  if (['partially paid', 'consultation', 'submitted', 'pending review'].includes(s)) return 'blue';
  if (['pending', 'reserved', 'in-review'].includes(s)) return 'amber';
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
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-base' };
  return (
    <div className={cn('rounded-full flex items-center justify-center font-bold shrink-0 border select-none', sizes[size], tone || 'bg-[#EAF9D8] text-[#14532D] border-[#C7FF75]/50 shadow-sm', className)}>
      {initials}
    </div>
  );
};

export const EmptyState: React.FC<{ icon?: React.ReactNode; title: string; hint?: string; action?: React.ReactNode }> = ({
  icon, title, hint, action,
}) => (
  <div className="flex flex-col items-center justify-center text-center py-12 px-6">
    <div className="w-14 h-14 rounded-2xl bg-[#EAF9D8] text-[#14532D] flex items-center justify-center mb-3">
      {icon}
    </div>
    <p className="text-sm font-bold text-[#26352A]">{title}</p>
    {hint && <p className="text-xs text-[#667367] mt-1 max-w-sm">{hint}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const ErrorState: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <div className="hc-card p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 border-[#FCA5A5] bg-[#FEF2F2]">
    <div className="text-sm text-[#B42318] flex-1">
      <span className="font-bold">Something went wrong: </span>{message}
    </div>
    {onRetry && <button onClick={onRetry} className="hc-btn-secondary !py-2 text-xs shrink-0">Retry</button>}
  </div>
);

export const SkeletonBlock: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('skeleton h-4', className)} />
);

export const SearchInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { onClear?: () => void }> = ({
  className, onClear, ...rest
}) => (
  <div className={cn('hc-card !rounded-full flex items-center gap-2.5 px-4 py-0.5 border-[#E3E8DE] focus-within:border-[#14532D]', className)}>
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#667367" strokeWidth="2.2" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
    </svg>
    <input {...rest} className="w-full bg-transparent py-2.5 text-xs text-[#26352A] focus:outline-none placeholder:text-[#8A998B]" />
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
      <div className="absolute inset-0 bg-[#0B3D20]/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${width} max-h-[92vh] overflow-y-auto bg-white rounded-t-3xl sm:rounded-3xl border border-[#E3E8DE] shadow-2xl anim-pop`}>
        {children}
      </div>
    </div>
  );
};

export const ModalHeader: React.FC<{ title: string; subtitle?: string; onClose: () => void }> = ({ title, subtitle, onClose }) => (
  <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-[#E3E8DE] sticky top-0 bg-white/95 backdrop-blur z-10">
    <div>
      <h3 className="text-[17px] font-bold text-[#26352A] tracking-tight">{title}</h3>
      {subtitle && <p className="text-xs text-[#667367] mt-0.5">{subtitle}</p>}
    </div>
    <button onClick={onClose} aria-label="Close" className="w-8 h-8 rounded-full bg-[#F5F6F2] hover:bg-[#EAF9D8] text-[#26352A] flex items-center justify-center transition-colors shrink-0">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12" /></svg>
    </button>
  </div>
);

export const Tabs: React.FC<{ tabs: { id: string; label: string; count?: number }[]; active: string; onChange: (id: string) => void }> = ({
  tabs, active, onChange,
}) => (
  <div className="flex gap-1.5 p-1.5 bg-[#F5F6F2] rounded-full border border-[#E3E8DE] overflow-x-auto">
    {tabs.map((t) => (
      <button
        key={t.id}
        onClick={() => onChange(t.id)}
        className={cn(
          'flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all',
          active === t.id
            ? 'bg-[#14532D] text-white shadow-sm'
            : 'text-[#667367] hover:text-[#26352A] hover:bg-white/60'
        )}
      >
        {t.label}
        {typeof t.count === 'number' && (
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-bold', active === t.id ? 'bg-[#C7FF75] text-[#0B3D20]' : 'bg-white text-[#667367] border border-[#E3E8DE]')}>
            {t.count}
          </span>
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
