import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Bell, Menu, Activity, LogOut, ChevronDown, Search, ShieldCheck, UserRound } from 'lucide-react';
import { UserRole } from '../../types';
import { cn } from '../ui/primitives';
import { useNavigate } from 'react-router-dom';

const roleTone: Record<UserRole, string> = {
  admin: 'bg-violet-50 text-violet-700 border-violet-200',
  doctor: 'bg-sky-50 text-sky-700 border-sky-200',
  patient: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  billing: 'bg-amber-50 text-amber-700 border-amber-200',
};

export const Navbar: React.FC<{ onMenu: () => void; onSearch: (q: string) => void; onSearchSubmit?: (q: string) => void }> = ({ onMenu, onSearch, onSearchSubmit }) => {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [q, setQ] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fn = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) { setMenuOpen(false); setNotifOpen(false); } };
    window.addEventListener('mousedown', fn);
    return () => window.removeEventListener('mousedown', fn);
  }, []);

  const doLogout = () => { logout(); navigate('/login'); };

  return (
    <header className="h-16 bg-white/85 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40">
      <div className="h-full px-4 sm:px-6 flex items-center gap-3 max-w-[1440px] mx-auto">
        <button onClick={onMenu} className="lg:hidden hc-icon-btn !w-9 !h-9" aria-label="Open navigation"><Menu size={17} /></button>
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-sm">
            <Activity size={18} className="text-sky-400" />
          </div>
          <div className="leading-none">
            <span className="text-[17px] font-bold text-slate-900 tracking-tight">Hospital<span className="text-sky-600">Care</span></span>
            <p className="hidden sm:block text-[9.5px] text-slate-400 font-semibold tracking-[0.14em] uppercase mt-0.5">Healthcare Platform</p>
          </div>
        </div>

        <div className="hidden md:flex flex-1 max-w-md ml-4">
          <div className="flex items-center gap-2 w-full px-3.5 py-2 bg-slate-100/80 border border-transparent focus-within:bg-white focus-within:border-slate-200 rounded-full transition-all">
            <Search size={15} className="text-slate-400 shrink-0" />
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); onSearch(e.target.value); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && onSearchSubmit) onSearchSubmit(q); }}
              placeholder="Search patients, beds, bills…  ( Enter ⏎ )"
              className="w-full bg-transparent text-[13px] focus:outline-none placeholder:text-slate-400"
            />
            {q && <button onClick={() => { setQ(''); onSearch(''); }} className="text-xs text-slate-400 hover:text-slate-700">✕</button>}
          </div>
        </div>

        <div className="flex-1 md:hidden" />

        <div className="relative" ref={menuRef}>
          <button onClick={() => { setNotifOpen(!notifOpen); setMenuOpen(false); }} className="hc-icon-btn" aria-label="Notifications">
            <Bell size={17} />
            <span className="absolute top-2 right-2.5 w-2 h-2 bg-sky-600 rounded-full ring-2 ring-white" />
          </button>
          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 hc-card p-2 anim-pop z-50">
              <p className="px-3 pt-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">Notifications</p>
              {[
                { t: 'Shift handover due at 8:00 PM', s: 'Nursing • 12 min ago', tone: 'bg-sky-50 text-sky-700' },
                { t: '2 lab reports ready for review', s: 'Laboratory • 1 hr ago', tone: 'bg-emerald-50 text-emerald-700' },
                { t: 'Bed occupancy above 80% in ICU', s: 'Operations • 3 hrs ago', tone: 'bg-amber-50 text-amber-700' },
              ].map((n, i) => (
                <div key={i} className="px-3 py-2.5 rounded-xl hover:bg-slate-50 flex gap-3 cursor-pointer">
                  <span className={cn('w-2 h-2 rounded-full mt-1.5 shrink-0', n.tone.split(' ')[0].replace('bg-', 'bg-').replace('-50', '-500'))} />
                  <div><p className="text-[13px] font-semibold text-slate-800">{n.t}</p><p className="text-[11px] text-slate-400">{n.s}</p></div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button onClick={() => { setMenuOpen(!menuOpen); setNotifOpen(false); }} className="flex items-center gap-2 pl-1.5 pr-2 py-1.5 rounded-full bg-white border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all">
            <span className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center"><UserRound size={15} /></span>
            <span className="hidden sm:block text-left leading-tight">
              <span className="block text-[12.5px] font-bold text-slate-900 max-w-[140px] truncate">{user?.fullName}</span>
              <span className={cn('inline-block text-[9.5px] font-bold px-1.5 py-px rounded-md border uppercase tracking-wider', roleTone[user?.role || 'patient'])}>{user?.role}</span>
            </span>
            <ChevronDown size={14} className="text-slate-400 hidden sm:block" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-60 hc-card p-2 anim-pop z-50">
              <div className="px-3 py-2.5 border-b border-slate-100 mb-1">
                <p className="text-[13px] font-bold text-slate-900 truncate">{user?.fullName}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                <p className="flex items-center gap-1 text-[10.5px] text-emerald-600 font-semibold mt-1"><ShieldCheck size={12} /> RBAC session verified</p>
              </div>
              <button onClick={doLogout} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-semibold text-rose-600 hover:bg-rose-50 transition-colors">
                <LogOut size={15} /> Sign out securely
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
