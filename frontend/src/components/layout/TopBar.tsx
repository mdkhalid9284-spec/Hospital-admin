import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { Menu, Search, Bell, X, ChevronRight } from 'lucide-react';

const ROUTE_LABELS: Record<string, string> = {
  '/portal/admin/dashboard': 'Dashboard',
  '/portal/admin/patients': 'Patients',
  '/portal/admin/doctors': 'Doctors & Staff',
  '/portal/admin/admissions': 'Admissions',
  '/portal/admin/bed-board': 'Beds & Wards',
  '/portal/admin/appointments': 'Appointments',
  '/portal/admin/analytics': 'Analytics & Reports',
  '/portal/admin/audit-logs': 'Audit Logs',
  '/portal/admin/settings': 'Settings',
  '/portal/doctor/dashboard': 'Dashboard',
  '/portal/doctor/patients': 'My Patients',
  '/portal/doctor/appointments': 'Appointments',
  '/portal/doctor/records': 'Clinical Notes',
  '/portal/doctor/prescriptions': 'Prescriptions',
  '/portal/doctor/documents': 'Documents',
  '/portal/patient/dashboard': 'Dashboard',
  '/portal/patient/appointments': 'My Appointments',
  '/portal/patient/doctors': 'My Doctors',
  '/portal/patient/records': 'Medical Records',
  '/portal/patient/documents': 'Documents',
  '/portal/patient/billing': 'Bills & Insurance',
  '/portal/patient/profile': 'My Profile',
  '/portal/billing/dashboard': 'Dashboard',
  '/portal/billing/invoices': 'Invoices',
  '/portal/billing/patients': 'Patient Accounts',
  '/portal/billing/insurance': 'Insurance Claims',
  '/portal/billing/reports': 'Financial Reports',
};

const PORTAL_LABELS: Record<UserRole, string> = {
  admin: 'Administration',
  doctor: 'Clinical Portal',
  patient: 'Patient Portal',
  billing: 'Finance & Billing',
};

interface TopBarProps {
  onMobileMenuOpen: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onMobileMenuOpen }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const role = (user?.role ?? 'patient') as UserRole;
  const pageLabel = ROUTE_LABELS[location.pathname] ?? 'Dashboard';
  const portalLabel = PORTAL_LABELS[role];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const q = searchQuery.toLowerCase();
    // Route-aware search per role
    if (role === 'admin') {
      if (q.includes('bed') || q.includes('ward')) navigate('/portal/admin/bed-board');
      else if (q.includes('doctor') || q.includes('staff')) navigate('/portal/admin/doctors');
      else if (q.includes('admit') || q.includes('discharge')) navigate('/portal/admin/admissions');
      else if (q.includes('appoint') || q.includes('schedule')) navigate('/portal/admin/appointments');
      else if (q.includes('audit') || q.includes('log')) navigate('/portal/admin/audit-logs');
      else if (q.includes('analytic') || q.includes('report')) navigate('/portal/admin/analytics');
      else navigate('/portal/admin/patients');
    } else if (role === 'doctor') {
      if (q.includes('appoint') || q.includes('schedule')) navigate('/portal/doctor/appointments');
      else if (q.includes('prescri') || q.includes('rx')) navigate('/portal/doctor/prescriptions');
      else if (q.includes('note') || q.includes('record')) navigate('/portal/doctor/records');
      else navigate('/portal/doctor/patients');
    } else if (role === 'billing') {
      if (q.includes('claim') || q.includes('insurance')) navigate('/portal/billing/insurance');
      else if (q.includes('report')) navigate('/portal/billing/reports');
      else navigate('/portal/billing/invoices');
    } else {
      if (q.includes('appoint')) navigate('/portal/patient/appointments');
      else if (q.includes('bill') || q.includes('invoice')) navigate('/portal/patient/billing');
      else if (q.includes('record') || q.includes('medical')) navigate('/portal/patient/records');
      else navigate('/portal/patient/appointments');
    }
    setSearchOpen(false);
    setSearchQuery('');
  };

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 h-14 flex items-center justify-between gap-4 flex-shrink-0"
      style={{ boxShadow: '0 1px 8px -2px rgba(15,23,42,0.06)' }}>

      {/* Left: Mobile hamburger + breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMobileMenuOpen}
          className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors flex-shrink-0"
          aria-label="Open navigation"
        >
          <Menu size={20} />
        </button>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm min-w-0">
          <span className="text-slate-400 font-medium hidden sm:block truncate">{portalLabel}</span>
          <ChevronRight size={14} className="text-slate-300 hidden sm:block flex-shrink-0" />
          <span className="font-semibold text-slate-900 truncate">{pageLabel}</span>
        </div>
      </div>

      {/* Right: Search + Notifications */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Search */}
        <div ref={searchRef} className="relative">
          {searchOpen ? (
            <form onSubmit={handleSearch} className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 w-56 sm:w-72">
              <Search size={14} className="text-slate-400 flex-shrink-0" />
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search…"
                className="bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none w-full"
              />
              <button
                type="button"
                onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                className="text-slate-400 hover:text-slate-600 flex-shrink-0"
              >
                <X size={14} />
              </button>
            </form>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors"
              aria-label="Search"
            >
              <Search size={18} />
            </button>
          )}
        </div>

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors relative"
            aria-label="Notifications"
          >
            <Bell size={18} />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white" />
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-11 w-80 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 overflow-hidden"
              style={{ animation: 'popIn 0.18s ease both' }}>
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Notifications</span>
                <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">3 new</span>
              </div>
              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {[
                  { title: 'Appointment reminder', sub: 'Dr. Smith at 2:00 PM today', time: '5 min ago', dot: 'bg-blue-500' },
                  { title: 'Lab report ready', sub: 'CBC panel results available', time: '1 hr ago', dot: 'bg-emerald-500' },
                  { title: 'Prescription updated', sub: 'New dosage instructions', time: '3 hrs ago', dot: 'bg-amber-500' },
                ].map((n, i) => (
                  <div key={i} className="flex gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer">
                    <span className={`w-2 h-2 rounded-full ${n.dot} mt-1.5 flex-shrink-0`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-900 truncate">{n.title}</p>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{n.sub}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{n.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User pill — display only, no role switching */}
        <div className="flex items-center gap-2 pl-2 pr-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-full cursor-default select-none">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-white flex items-center justify-center text-[11px] font-bold flex-shrink-0">
            {user?.fullName?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() ?? 'U'}
          </div>
          <span className="hidden sm:block text-[12px] font-semibold text-slate-800 max-w-[120px] truncate">
            {user?.fullName ?? 'User'}
          </span>
        </div>
      </div>
    </header>
  );
};
