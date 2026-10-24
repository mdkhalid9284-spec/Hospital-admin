import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import {
  Search,
  Bell,
  Settings,
  Menu,
  X,
  LogOut,
  ShieldCheck,
  LayoutDashboard,
  CalendarDays,
  Users,
  BedDouble,
  UserCheck,
  BarChart3,
  Stethoscope,
  Pill,
  FileText,
  FolderOpen,
  Receipt,
  HeartPulse,
  UserRound,
  CheckCircle,
  Clock,
} from 'lucide-react';

interface NavLinkItem {
  label: string;
  path: string;
  icon?: React.ReactNode;
}

const PORTAL_NAV: Record<UserRole, NavLinkItem[]> = {
  admin: [
    { label: 'Dashboard', path: '/portal/admin/dashboard', icon: <LayoutDashboard size={15} /> },
    { label: 'Patients', path: '/portal/admin/patients', icon: <Users size={15} /> },
    { label: 'Doctors & Staff', path: '/portal/admin/doctors', icon: <Stethoscope size={15} /> },
    { label: 'Bed Board', path: '/portal/admin/bed-board', icon: <BedDouble size={15} /> },
    { label: 'Admissions', path: '/portal/admin/admissions', icon: <UserCheck size={15} /> },
    { label: 'Appointments', path: '/portal/admin/appointments', icon: <CalendarDays size={15} /> },
    { label: 'Analytics', path: '/portal/admin/analytics', icon: <BarChart3 size={15} /> },
    { label: 'Audit Logs', path: '/portal/admin/audit-logs', icon: <ShieldCheck size={15} /> },
  ],
  doctor: [
    { label: 'Dashboard', path: '/portal/doctor/dashboard', icon: <LayoutDashboard size={15} /> },
    { label: 'Appointments', path: '/portal/doctor/appointments', icon: <CalendarDays size={15} /> },
    { label: 'Patients', path: '/portal/doctor/patients', icon: <Users size={15} /> },
    { label: 'Prescriptions', path: '/portal/doctor/prescriptions', icon: <Pill size={15} /> },
    { label: 'Clinical Notes', path: '/portal/doctor/records', icon: <FileText size={15} /> },
    { label: 'Documents', path: '/portal/doctor/documents', icon: <FolderOpen size={15} /> },
  ],
  patient: [
    { label: 'Dashboard', path: '/portal/patient/dashboard', icon: <LayoutDashboard size={15} /> },
    { label: 'Appointments', path: '/portal/patient/appointments', icon: <CalendarDays size={15} /> },
    { label: 'My Doctors', path: '/portal/patient/doctors', icon: <Stethoscope size={15} /> },
    { label: 'Medical Records', path: '/portal/patient/records', icon: <HeartPulse size={15} /> },
    { label: 'Documents', path: '/portal/patient/documents', icon: <FolderOpen size={15} /> },
    { label: 'Bills & Insurance', path: '/portal/patient/billing', icon: <Receipt size={15} /> },
    { label: 'Profile', path: '/portal/patient/profile', icon: <UserRound size={15} /> },
  ],
  billing: [
    { label: 'Dashboard', path: '/portal/billing/dashboard', icon: <LayoutDashboard size={15} /> },
    { label: 'Invoices', path: '/portal/billing/invoices', icon: <Receipt size={15} /> },
    { label: 'Patients', path: '/portal/billing/patients', icon: <Users size={15} /> },
    { label: 'Insurance Claims', path: '/portal/billing/insurance', icon: <ShieldCheck size={15} /> },
    { label: 'Reports', path: '/portal/billing/reports', icon: <BarChart3 size={15} /> },
  ],
};

const ROLE_BADGE: Record<UserRole, { label: string; cls: string; title: string }> = {
  admin: { label: 'Admin', cls: 'bg-slate-900 text-white', title: 'Hospital Administrator' },
  doctor: { label: 'Doctor', cls: 'bg-blue-600 text-white', title: 'General Surgeon / MD' },
  patient: { label: 'Patient', cls: 'bg-emerald-600 text-white', title: 'Patient Member' },
  billing: { label: 'Staff', cls: 'bg-amber-600 text-white', title: 'Finance Officer' },
};

export const PillNavbar: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', fn);
    return () => window.removeEventListener('mousedown', fn);
  }, []);

  const role = user?.role || 'patient';
  const navItems = PORTAL_NAV[role] || [];
  const badgeInfo = ROLE_BADGE[role];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchOpen(false);
    const q = searchQuery.toLowerCase().trim();
    if (role === 'admin') {
      if (q.includes('bed')) navigate('/portal/admin/bed-board');
      else if (q.includes('doctor')) navigate('/portal/admin/doctors');
      else if (q.includes('admission')) navigate('/portal/admin/admissions');
      else if (q.includes('appointment')) navigate('/portal/admin/appointments');
      else navigate(`/portal/admin/patients?search=${encodeURIComponent(searchQuery)}`);
    } else if (role === 'doctor') {
      if (q.includes('appointment') || q.includes('calendar')) navigate('/portal/doctor/appointments');
      else if (q.includes('rx') || q.includes('prescri')) navigate('/portal/doctor/prescriptions');
      else navigate('/portal/doctor/patients');
    } else if (role === 'billing') {
      if (q.includes('claim') || q.includes('insurance')) navigate('/portal/billing/insurance');
      else navigate('/portal/billing/invoices');
    } else {
      navigate('/portal/patient/appointments');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <header className="sticky top-0 z-40 px-3 sm:px-6 py-3 bg-[#f0f2f5]/90 backdrop-blur-md">
        <div className="max-w-[1520px] mx-auto flex items-center justify-between gap-3">
          {/* Left: Brand Icon & Mobile Trigger */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="xl:hidden hc-icon-btn !w-10 !h-10"
              aria-label="Toggle navigation menu"
            >
              <Menu size={18} />
            </button>

            {/* Circular Blue Logo matching screenshot */}
            <button
              onClick={() => navigate(`/portal/${role}/dashboard`)}
              className="w-10 h-10 rounded-full bg-[#1d6cf2] flex items-center justify-center text-white shadow-md shadow-blue-500/25 transition-transform active:scale-95 hover:opacity-95"
              title="HospitalCare"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20M2 12h20" />
                <circle cx="12" cy="12" r="3" fill="currentColor" />
              </svg>
            </button>
          </div>

          {/* Center: Signature Pill Navigation Container */}
          <nav className="hidden xl:flex items-center bg-white/95 backdrop-blur-md rounded-full p-1 border border-slate-200/80 shadow-[0_2px_12px_-2px_rgba(15,23,42,0.06)]">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  isActive
                    ? 'bg-slate-900 text-white font-semibold rounded-full px-4 py-2 text-[13px] shadow-sm flex items-center gap-2 transition-all duration-200'
                    : 'text-slate-600 hover:text-slate-900 font-semibold rounded-full px-3.5 py-2 text-[13px] hover:bg-slate-100/70 transition-all duration-200 flex items-center gap-2'
                }
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Right Controls: Search, Settings, Notification Bell, User Profile Pill */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Search Icon Button */}
            <div className="relative">
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="hc-icon-btn !w-10 !h-10"
                aria-label="Global search"
              >
                <Search size={16} />
              </button>

              {searchOpen && (
                <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white rounded-2xl border border-slate-200 p-2 shadow-xl z-50 anim-pop">
                  <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-xl">
                    <Search size={15} className="text-slate-400 shrink-0" />
                    <input
                      autoFocus
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search patients, beds, bills… ⏎"
                      className="w-full bg-transparent text-xs focus:outline-none text-slate-800 placeholder:text-slate-400"
                    />
                    {searchQuery && (
                      <button type="button" onClick={() => setSearchQuery('')} className="text-xs text-slate-400 hover:text-slate-700">✕</button>
                    )}
                  </form>
                </div>
              )}
            </div>

            {/* Settings Button */}
            <button
              onClick={() => {
                if (role === 'admin') navigate('/portal/admin/settings');
                else if (role === 'patient') navigate('/portal/patient/profile');
                else setUserMenuOpen(true);
              }}
              className="hc-icon-btn !w-10 !h-10"
              aria-label="Platform settings"
              title="Settings"
            >
              <Settings size={16} />
            </button>

            {/* Notifications Button with active blue dot */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                className="hc-icon-btn !w-10 !h-10 relative"
                aria-label="Notifications"
                title="Notifications"
              >
                <Bell size={16} />
                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-[#1d6cf2] rounded-full ring-2 ring-white" />
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-slate-200 p-3 shadow-2xl z-50 anim-pop">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Notifications</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">3 new</span>
                  </div>
                  <div className="mt-2 space-y-1.5 max-h-[320px] overflow-y-auto">
                    {[
                      {
                        title: 'New patient admission confirmed',
                        sub: 'James Harrison admitted to ICU-101-A',
                        time: '10 min ago',
                        icon: <CheckCircle size={14} className="text-blue-600" />,
                      },
                      {
                        title: 'Lab reports ready for evaluation',
                        sub: 'Cardiac enzyme & 12-lead ECG ready',
                        time: '45 min ago',
                        icon: <Clock size={14} className="text-emerald-600" />,
                      },
                      {
                        title: 'Bed occupancy above 80% in ICU',
                        sub: 'Ward operations advisory active',
                        time: '2 hrs ago',
                        icon: <BedDouble size={14} className="text-amber-600" />,
                      },
                    ].map((n, i) => (
                      <div key={i} className="p-2.5 rounded-xl hover:bg-slate-50 transition-colors flex gap-2.5 cursor-pointer">
                        <div className="mt-0.5 shrink-0">{n.icon}</div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 leading-tight truncate">{n.title}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{n.sub}</p>
                          <span className="text-[9.5px] font-semibold text-slate-400 mt-1 block">{n.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* User Capsule matching screenshot */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-full bg-white border border-slate-200/90 hover:border-slate-300 hover:shadow-sm transition-all"
              >
                {/* Avatar with rounded-full */}
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
                  {user?.fullName?.split(' ').map((n) => n[0]).slice(0, 2).join('') || 'U'}
                </div>

                {/* Name & Title */}
                <div className="hidden md:block text-left leading-tight min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12.5px] font-bold text-slate-900 max-w-[130px] truncate block">
                      {user?.fullName || 'User'}
                    </span>
                    <span className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider ${badgeInfo.cls}`}>
                      {badgeInfo.label}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium block truncate max-w-[140px]">
                    {badgeInfo.title}
                  </span>
                </div>
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-slate-200 p-2 shadow-2xl z-50 anim-pop">
                  <div className="p-3 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900">{user?.fullName}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-bold mt-1">
                      <ShieldCheck size={12} /> RBAC Active ({user?.role})
                    </span>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors mt-1"
                  >
                    <LogOut size={14} /> Sign out securely
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 xl:hidden">
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-[280px] bg-white shadow-2xl flex flex-col p-5 anim-drawer">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#1d6cf2] flex items-center justify-center text-white font-bold text-sm">
                  +
                </div>
                <span className="font-bold text-slate-900 text-base">HospitalCare</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
                {user?.fullName?.[0] || 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 truncate">{user?.fullName}</p>
                <p className="text-[10px] text-slate-400 capitalize">{role} Portal</p>
              </div>
            </div>

            <nav className="mt-5 space-y-1 overflow-y-auto flex-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    isActive
                      ? 'flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm shadow-sm'
                      : 'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-sm transition-colors'
                  }
                >
                  {item.icon}
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>

            <div className="pt-4 border-t border-slate-100">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-rose-50 text-rose-700 font-bold text-xs rounded-xl hover:bg-rose-100 transition-colors"
              >
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};
