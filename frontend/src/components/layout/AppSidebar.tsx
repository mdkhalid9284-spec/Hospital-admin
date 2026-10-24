import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import {
  LayoutDashboard, Users, BedDouble, CalendarDays, BarChart3, ShieldCheck,
  Settings, Stethoscope, UserCheck, Pill, FileText, FolderOpen, Receipt,
  HeartPulse, UserRound, LogOut, ChevronLeft, ChevronRight, Activity, X,
  Menu, Bell, Search, DollarSign,
} from 'lucide-react';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const NAV_CONFIG: Record<UserRole, NavItem[]> = {
  admin: [
    { label: 'Dashboard', path: '/portal/admin/dashboard', icon: <LayoutDashboard size={17} /> },
    { label: 'Patients', path: '/portal/admin/patients', icon: <Users size={17} /> },
    { label: 'Doctors & Staff', path: '/portal/admin/doctors', icon: <Stethoscope size={17} /> },
    { label: 'Admissions', path: '/portal/admin/admissions', icon: <UserCheck size={17} /> },
    { label: 'Beds & Wards', path: '/portal/admin/bed-board', icon: <BedDouble size={17} /> },
    { label: 'Appointments', path: '/portal/admin/appointments', icon: <CalendarDays size={17} /> },
    { label: 'Analytics', path: '/portal/admin/analytics', icon: <BarChart3 size={17} /> },
    { label: 'Audit Logs', path: '/portal/admin/audit-logs', icon: <ShieldCheck size={17} /> },
    { label: 'Settings', path: '/portal/admin/settings', icon: <Settings size={17} /> },
  ],
  doctor: [
    { label: 'Dashboard', path: '/portal/doctor/dashboard', icon: <LayoutDashboard size={17} /> },
    { label: 'My Patients', path: '/portal/doctor/patients', icon: <Users size={17} /> },
    { label: 'Appointments', path: '/portal/doctor/appointments', icon: <CalendarDays size={17} /> },
    { label: 'Clinical Notes', path: '/portal/doctor/records', icon: <FileText size={17} /> },
    { label: 'Prescriptions', path: '/portal/doctor/prescriptions', icon: <Pill size={17} /> },
    { label: 'Documents', path: '/portal/doctor/documents', icon: <FolderOpen size={17} /> },
  ],
  patient: [
    { label: 'Dashboard', path: '/portal/patient/dashboard', icon: <LayoutDashboard size={17} /> },
    { label: 'My Appointments', path: '/portal/patient/appointments', icon: <CalendarDays size={17} /> },
    { label: 'My Doctors', path: '/portal/patient/doctors', icon: <Stethoscope size={17} /> },
    { label: 'Medical Records', path: '/portal/patient/records', icon: <HeartPulse size={17} /> },
    { label: 'Documents', path: '/portal/patient/documents', icon: <FolderOpen size={17} /> },
    { label: 'Bills & Insurance', path: '/portal/patient/billing', icon: <Receipt size={17} /> },
    { label: 'My Profile', path: '/portal/patient/profile', icon: <UserRound size={17} /> },
  ],
  billing: [
    { label: 'Dashboard', path: '/portal/billing/dashboard', icon: <LayoutDashboard size={17} /> },
    { label: 'Invoices', path: '/portal/billing/invoices', icon: <Receipt size={17} /> },
    { label: 'Patients', path: '/portal/billing/patients', icon: <Users size={17} /> },
    { label: 'Insurance Claims', path: '/portal/billing/insurance', icon: <ShieldCheck size={17} /> },
    { label: 'Financial Reports', path: '/portal/billing/reports', icon: <BarChart3 size={17} /> },
  ],
};

const ROLE_META: Record<UserRole, { label: string; color: string; bg: string; portalName: string; accent: string }> = {
  admin: { label: 'Administrator', color: 'text-violet-700', bg: 'bg-violet-50', portalName: 'Admin Portal', accent: 'border-violet-200/60' },
  doctor: { label: 'Doctor', color: 'text-blue-700', bg: 'bg-blue-50', portalName: 'Doctor Portal', accent: 'border-blue-200/60' },
  patient: { label: 'Patient', color: 'text-emerald-700', bg: 'bg-emerald-50', portalName: 'Patient Portal', accent: 'border-emerald-200/60' },
  billing: { label: 'Billing Staff', color: 'text-amber-700', bg: 'bg-amber-50', portalName: 'Billing Portal', accent: 'border-amber-200/60' },
};

interface AppSidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onMobileClose,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const role = (user?.role ?? 'patient') as UserRole;
  const navItems = NAV_CONFIG[role] ?? [];
  const meta = ROLE_META[role];

  const handleLogout = () => {
    logout();
    navigate('/login');
    onMobileClose();
  };

  const initials = user?.fullName
    ? user.fullName.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  const isActive = (path: string) => location.pathname === path;

  const SidebarContent = () => (
    <div className="flex flex-col h-full w-full">
      {/* Brand header */}
      <div className={`flex items-center gap-3 px-5 py-6 ${collapsed ? 'justify-center px-3' : ''}`}>
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg shadow-blue-500/40 flex-shrink-0 relative overflow-hidden">
          <Activity size={20} className="text-white relative z-10" />
          <div className="absolute top-0 left-0 w-full h-full bg-white/10 -translate-y-full transition-transform duration-300 group-hover:translate-y-0" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="font-bold text-slate-900 text-[16px] leading-tight tracking-tight">Hospital<span className="text-blue-600">Care</span></div>
            <div className={`text-[10.5px] font-bold uppercase tracking-wider ${meta.color}`}>
              {meta.portalName}
            </div>
          </div>
        )}
      </div>

      {/* Role badge — server verified, not a switcher */}
      {!collapsed && (
        <div className="px-5 mb-4">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl ${meta.bg} ${meta.color} border ${meta.accent} text-[11px] font-bold`}>
            <ShieldCheck size={12} />
            <span>{meta.label}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
          </div>
          <p className="text-[10px] text-slate-400 mt-1.5 font-medium">Session verified server-side</p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 space-y-0.5 pb-6">
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onMobileClose}
              title={collapsed ? item.label : undefined}
              className={({ isActive: navActive }) => `
                flex items-center gap-3 px-3.5 py-2.75 rounded-2xl text-[13.5px] font-medium transition-all duration-200 group relative
                ${navActive
                  ? 'bg-blue-600/12 text-blue-700 font-bold border border-blue-200/60 shadow-[0_4px_12px_-4px_rgba(2,132,199,0.12)]'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60 border-transparent'
                } ${collapsed ? 'justify-center px-3' : ''}
              `}
            >
              {({ isActive: navActive }) => (
                <>
                  <span className={`flex-shrink-0 w-5 text-center transition-colors ${navActive ? 'text-blue-700' : 'text-slate-400 group-hover:text-slate-700'}`}>
                    {item.icon}
                  </span>
                  {!collapsed && <span className="truncate">{item.label}</span>}
                  {collapsed && (
                    <span className="absolute left-full ml-2.5 px-2.5 py-1.5 text-[11px] font-semibold bg-slate-900 text-white rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity shadow-lg">
                      {item.label}
                    </span>
                  )}
                  {navActive && !collapsed && (
                    <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-1.5 h-4 rounded-full bg-blue-600" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User Profile + Logout */}
      <div className={`border-t border-slate-200/80 p-4 space-y-2 ${collapsed ? 'justify-center' : ''}`}>
        <div className={`flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50/80 border border-slate-200/60 ${collapsed ? 'justify-center px-2' : ''}`}>
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-white flex items-center justify-center text-sm font-bold shadow-sm flex-shrink-0">
            {initials}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 truncate leading-tight">{user?.fullName}</p>
              <p className="text-[9.5px] text-slate-400 truncate">{user?.email}</p>
            </div>
          )}
        </div>

        <button
          onClick={handleLogout}
          title={collapsed ? 'Sign Out' : undefined}
          className={`w-full flex items-center gap-2.5 px-3.5 py-3 rounded-2xl text-[13px] font-semibold text-rose-700 hover:bg-rose-50 hover:text-rose-800 transition-colors border border-transparent hover:border-rose-100 ${collapsed ? 'justify-center px-2' : ''}`}
        >
          <LogOut size={17} className="flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-white/90 backdrop-blur-md border-r border-slate-200/80 h-screen sticky top-0 transition-all duration-300 flex-shrink-0 z-20 ${
          collapsed ? 'w-[72px]' : 'w-[256px]'
        }`}
        style={{ boxShadow: '4px 0 24px -8px rgba(15,23,42,0.10)' }}
      >
        <div className="relative h-full overflow-hidden">
          <SidebarContent />

          {/* Ambient depth glow on right edge */}
          <div className="absolute top-0 right-0 w-1 h-full bg-gradient-to-r from-transparent via-blue-600/20 to-transparent pointer-events-none" />

          {/* Collapse Toggle */}
          <button
            onClick={onToggleCollapse}
            className="absolute right-3 top-20 w-8 h-8 bg-white border border-slate-200 rounded-xl flex items-center justify-center shadow-md hover:shadow-lg text-slate-600 hover:text-slate-900 transition-all z-10"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={14} className="text-slate-700" /> : <ChevronLeft size={14} className="text-slate-700" />}
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" aria-hidden="true">
          {/* Backdrop with close on click + scroll lock handled in PortalLayout */}
          <div
            className="absolute inset-0 bg-slate-900/55 backdrop-blur-sm transition-opacity"
            onClick={onMobileClose}
            aria-label="Close navigation"
            tabIndex={-1}
          />
          {/* Drawer */}
          <aside
            className="absolute left-0 top-0 bottom-0 w-[280px] bg-white shadow-2xl flex flex-col overflow-y-auto z-50"
            style={{ animation: 'slideInLeft 0.24s ease both' }}
          >
            <div className="flex items-center justify-between px-5 h-17 border-b border-slate-100/80 bg-white/80 backdrop-blur shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white shadow-sm">
                  <Activity size={16} />
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-sm">Hospital<span className="text-blue-600">Care</span></div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600">{meta.portalName}</div>
                </div>
              </div>
              <button
                onClick={onMobileClose}
                className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors"
                aria-label="Close navigation menu"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 pb-6">
              <div className="px-1 mb-6">
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl ${meta.bg} ${meta.color} border ${meta.accent} text-[10.5px] font-bold`}>
                  <ShieldCheck size={11} />
                  <span>{meta.label}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                </div>
              </div>
              <nav className="space-y-0.5">
                {navItems.map((item) => {
                  const active = isActive(item.path);
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={onMobileClose}
                      className={({ isActive: navActive }) => `
                        flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-all duration-200 group
                        ${navActive
                          ? 'bg-blue-600/12 text-blue-700 font-bold border border-blue-200/60 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/60 border-transparent'
                        }`}
                    >
                      {item.icon}
                      <span className="font-medium">{item.label}</span>
                    </NavLink>
                  );
                })}
              </nav>
            </div>
            <div className="border-t border-slate-200/80 p-4 space-y-2">
              <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50/80 border border-slate-200/60">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-white flex items-center justify-center text-sm font-bold shadow-sm flex-shrink-0">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 truncate leading-tight">{user?.fullName}</p>
                  <p className="text-[9.5px] text-slate-400 truncate">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3.5 py-3 rounded-2xl text-[13px] font-semibold text-rose-700 hover:bg-rose-50 hover:text-rose-800 transition-colors border border-transparent hover:border-rose-100"
              >
                <LogOut size={17} className="flex-shrink-0" />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};
