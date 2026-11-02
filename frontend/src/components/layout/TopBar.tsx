import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { Menu, Search, Bell, X, ChevronRight, ShieldCheck } from 'lucide-react';

const ROUTE_LABELS: Record<string, string> = {
  '/portal/admin/dashboard': 'Operational Dashboard',
  '/portal/admin/patients': 'Patient Directory',
  '/portal/admin/doctors': 'Doctors & Medical Staff',
  '/portal/admin/admissions': 'Inpatient Admissions',
  '/portal/admin/bed-board': 'Live Beds & Wards',
  '/portal/admin/appointments': 'Clinical Schedule',
  '/portal/admin/analytics': 'Hospital Analytics',
  '/portal/admin/audit-logs': 'Security Audit Logs',
  '/portal/admin/settings': 'System Settings',
  '/portal/doctor/dashboard': 'Doctor Dashboard',
  '/portal/doctor/patients': 'Assigned Patients',
  '/portal/doctor/appointments': 'Consultation Schedule',
  '/portal/doctor/records': 'Clinical Notes & Findings',
  '/portal/doctor/prescriptions': 'Prescriptions Authoring',
  '/portal/doctor/documents': 'Diagnostic Documents',
  '/portal/patient/dashboard': 'Health Overview',
  '/portal/patient/appointments': 'My Consultations',
  '/portal/patient/doctors': 'My Care Team',
  '/portal/patient/records': 'Medical History',
  '/portal/patient/documents': 'Test Reports & Files',
  '/portal/patient/billing': 'Invoices & Coverage',
  '/portal/patient/profile': 'Patient Profile',
  '/portal/billing/dashboard': 'Revenue Dashboard',
  '/portal/billing/invoices': 'Invoices & Billing',
  '/portal/billing/patients': 'Patient Billing Accounts',
  '/portal/billing/insurance': 'Insurance Claims',
  '/portal/billing/reports': 'Financial Reports',
};

const PORTAL_LABELS: Record<UserRole, string> = {
  admin: 'Administration',
  doctor: 'Clinical Portal',
  patient: 'Patient Portal',
  billing: 'Finance & Claims',
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
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#E3E8DE] px-4 sm:px-6 h-14 flex items-center justify-between gap-4 flex-shrink-0"
      style={{ boxShadow: '0 1px 6px -2px rgba(38, 53, 42, 0.04)' }}>

      {/* Left: Mobile menu toggle + breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMobileMenuOpen}
          className="lg:hidden w-8 h-8 rounded-full flex items-center justify-center text-[#667367] hover:bg-[#F5F6F2] hover:text-[#26352A] transition-colors flex-shrink-0"
          aria-label="Open navigation"
        >
          <Menu size={18} />
        </button>

        <div className="flex items-center gap-1.5 text-xs min-w-0">
          <span className="text-[#667367] font-medium hidden sm:block truncate">{portalLabel}</span>
          <ChevronRight size={13} className="text-[#8A998B] hidden sm:block flex-shrink-0" />
          <span className="font-bold text-[#26352A] truncate">{pageLabel}</span>
        </div>
      </div>

      {/* Right: Search, Notifications, User Status */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Quick Search */}
        <div ref={searchRef} className="relative">
          {searchOpen ? (
            <form onSubmit={handleSearch} className="flex items-center gap-2 bg-[#F5F6F2] border border-[#E3E8DE] rounded-full px-3 py-1.5 w-56 sm:w-72">
              <Search size={14} className="text-[#667367] flex-shrink-0" />
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patients, beds, clinical records…"
                className="bg-transparent text-xs text-[#26352A] placeholder:text-[#8A998B] focus:outline-none w-full"
              />
              <button
                type="button"
                onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                className="text-[#667367] hover:text-[#26352A] flex-shrink-0"
              >
                <X size={13} />
              </button>
            </form>
          ) : (
            <button
              onClick={() => setSearchOpen(true)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#667367] hover:bg-[#F5F6F2] hover:text-[#26352A] transition-colors"
              aria-label="Search"
            >
              <Search size={16} />
            </button>
          )}
        </div>

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#667367] hover:bg-[#F5F6F2] hover:text-[#26352A] transition-colors relative"
            aria-label="Notifications"
          >
            <Bell size={16} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#14532D] ring-2 ring-white" />
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-11 w-80 bg-white rounded-2xl border border-[#E3E8DE] shadow-xl z-50 overflow-hidden anim-pop">
              <div className="px-4 py-3 border-b border-[#E3E8DE] bg-[#F9FAF6] flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#26352A] uppercase tracking-wider">Clinical Updates</span>
                <span className="text-[10px] font-bold bg-[#EAF9D8] text-[#0B3D20] px-2 py-0.5 rounded-full border border-[#C7FF75]">3 active</span>
              </div>
              <div className="divide-y divide-[#E3E8DE]/60 max-h-72 overflow-y-auto">
                {[
                  { title: 'Shift Telemetry Check', sub: 'ICU Ward occupancy at 82%', time: '8 min ago', color: 'bg-[#14532D]' },
                  { title: 'Lab Panel Completed', sub: 'Fasting lipid & HbA1c ready', time: '45 min ago', color: 'bg-[#14532D]' },
                  { title: 'Scheduled Consultation', sub: 'Dr. Nilson · Video checkup in 1 hr', time: '1 hr ago', color: 'bg-[#C7FF75]' },
                ].map((n, i) => (
                  <div key={i} className="flex gap-3 px-4 py-3 hover:bg-[#F7F8EF] cursor-pointer transition-colors">
                    <span className={`w-2 h-2 rounded-full ${n.color} mt-1.5 flex-shrink-0`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[#26352A] truncate">{n.title}</p>
                      <p className="text-[11px] text-[#667367] truncate mt-0.5">{n.sub}</p>
                      <p className="text-[10px] text-[#8A998B] mt-1">{n.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Pill */}
        <div className="flex items-center gap-2 pl-2 pr-3 py-1 bg-[#F5F6F2] border border-[#E3E8DE] rounded-full select-none">
          <div className="w-6 h-6 rounded-full bg-[#14532D] text-[#C7FF75] flex items-center justify-center text-[10px] font-bold flex-shrink-0">
            {user?.fullName?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() ?? 'U'}
          </div>
          <span className="hidden sm:block text-[11.5px] font-bold text-[#26352A] max-w-[120px] truncate">
            {user?.fullName ?? 'User'}
          </span>
        </div>
      </div>
    </header>
  );
};
