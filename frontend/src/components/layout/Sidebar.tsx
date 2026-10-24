import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Users, BedDouble, UserCheck, CalendarDays,
  Stethoscope, HeartPulse, Receipt, FolderOpen, BarChart3, ShieldCheck, X,
} from 'lucide-react';
import { UserRole } from '../../types';
import { cn } from '../ui/primitives';

interface NavItem { label: string; path: string; icon: React.ReactNode; roles: UserRole[]; section: string }

const NAV: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={17} />, roles: ['admin','doctor','patient','billing'], section: 'Overview' },
  { label: 'Patients', path: '/patients', icon: <Users size={17} />, roles: ['admin','doctor','billing'], section: 'Care' },
  { label: 'Bed Board', path: '/bed-board', icon: <BedDouble size={17} />, roles: ['admin','doctor','billing'], section: 'Care' },
  { label: 'Admissions', path: '/admissions', icon: <UserCheck size={17} />, roles: ['admin'], section: 'Care' },
  { label: 'Appointments', path: '/appointments', icon: <CalendarDays size={17} />, roles: ['admin','doctor','patient'], section: 'Care' },
  { label: 'Doctor Portal', path: '/doctor-portal', icon: <Stethoscope size={17} />, roles: ['doctor','admin'], section: 'Clinical' },
  { label: 'My Health', path: '/patient-portal', icon: <HeartPulse size={17} />, roles: ['patient'], section: 'Clinical' },
  { label: 'Billing', path: '/billing', icon: <Receipt size={17} />, roles: ['admin','billing','patient'], section: 'Finance' },
  { label: 'Documents', path: '/documents', icon: <FolderOpen size={17} />, roles: ['admin','doctor','patient','billing'], section: 'Finance' },
  { label: 'Analytics', path: '/analytics', icon: <BarChart3 size={17} />, roles: ['admin','billing'], section: 'Insights' },
  { label: 'Audit Logs', path: '/audit-logs', icon: <ShieldCheck size={17} />, roles: ['admin'], section: 'Insights' },
];

const SECTIONS = ['Overview', 'Care', 'Clinical', 'Finance', 'Insights'];

export const Sidebar: React.FC<{ mobileOpen: boolean; onClose: () => void }> = ({ mobileOpen, onClose }) => {
  const { user } = useAuth();
  const role = user?.role || 'patient';
  const visible = NAV.filter((n) => n.roles.includes(role));

  const body = (
    <div className="flex flex-col h-full">
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {SECTIONS.map((sec) => {
          const items = visible.filter((v) => v.section === sec);
          if (!items.length) return null;
          return (
            <div key={sec}>
              <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{sec}</p>
              <div className="space-y-1">
                {items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className={({ isActive }) => cn(
                      'hc-nav-item',
                      isActive
                        ? 'bg-slate-900 text-white shadow-[0_8px_16px_-8px_rgba(15,23,42,0.5)]'
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                    )}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>
      <div className="p-3">
        <div className="rounded-2xl bg-slate-900 text-white p-4 relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-28 h-28 bg-sky-500/30 rounded-full blur-2xl" />
          <div className="flex items-center gap-2 text-[12px] font-bold"><ShieldCheck size={15} className="text-sky-400" /> Guard Active</div>
          <p className="text-[11px] text-slate-300/90 mt-1 leading-relaxed">Server RBAC + IDOR checks enforced on every request.</p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden lg:flex w-[248px] shrink-0 sticky top-16 h-[calc(100vh-4rem)] bg-white/80 backdrop-blur border-r border-slate-200/80 flex-col">
        {body}
      </aside>
      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/50" onClick={onClose} />
          <aside className="absolute left-0 top-0 bottom-0 w-[280px] bg-white shadow-2xl flex flex-col anim-drawer">
            <div className="flex items-center justify-between px-4 h-16 border-b border-slate-100">
              <span className="font-bold text-slate-900">Hospital<span className="text-sky-600">Care</span></span>
              <button onClick={onClose} className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"><X size={16} /></button>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col">{body}</div>
          </aside>
        </div>
      )}
    </>
  );
};
