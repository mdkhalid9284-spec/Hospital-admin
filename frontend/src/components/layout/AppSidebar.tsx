import React from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import {
  LayoutDashboard, Users, BedDouble, CalendarDays, BarChart3, ShieldCheck,
  Settings, Stethoscope, UserCheck, Pill, FileText, FolderOpen, Receipt,
  HeartPulse, UserRound, LogOut, ChevronLeft, ChevronRight, Activity, X,
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

const ROLE_META: Record<UserRole, { label: string; portalName: string }> = {
  admin: { label: 'Administrator', portalName: 'Admin Operations' },
  doctor: { label: 'Medical Doctor', portalName: 'Clinical Console' },
  patient: { label: 'Patient Member', portalName: 'Health Portal' },
  billing: { label: 'Financial Staff', portalName: 'Revenue Operations' },
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
    <div className="flex flex-col h-full w-full bg-[#FFFFFF]">
      {/* Brand header */}
      <div className={`flex items-center gap-3 px-5 py-5 border-b border-[#E3E8DE] ${collapsed ? 'justify-center px-3' : ''}`}>
        <div className="w-10 h-10 rounded-2xl bg-[#14532D] flex items-center justify-center shadow-md shadow-[#14532D]/20 flex-shrink-0 relative overflow-hidden">
          <Activity size={20} className="text-[#C7FF75]" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="font-bold text-[#26352A] text-[16px] leading-tight tracking-tight">
              Hospital<span className="text-[#14532D]">Care</span>
            </div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#667367] mt-0.5">
              {meta.portalName}
            </div>
          </div>
        )}
      </div>

      {/* Role verified session pill */}
      {!collapsed && (
        <div className="px-5 pt-4 pb-2">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#EAF9D8] text-[#0B3D20] border border-[#C7FF75]/60 text-[11px] font-semibold">
            <ShieldCheck size={13} className="text-[#14532D]" />
            <span>{meta.label}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#14532D] animate-pulse" />
          </div>
        </div>
      )}

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onMobileClose}
              title={collapsed ? item.label : undefined}
              className={({ isActive: navActive }) => `
                flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-[13px] font-medium transition-all duration-180 group relative
                ${navActive
                  ? 'bg-[#EAF9D8] text-[#0B3D20] font-bold border border-[#C7FF75]/80 shadow-sm'
                  : 'text-[#667367] hover:text-[#26352A] hover:bg-[#F5F6F2] border-transparent'
                } ${collapsed ? 'justify-center px-3' : ''}
              `}
            >
              {({ isActive: navActive }) => (
                <>
                  <span className={`flex-shrink-0 w-5 text-center transition-colors ${navActive ? 'text-[#14532D]' : 'text-[#667367] group-hover:text-[#26352A]'}`}>
                    {item.icon}
                  </span>
                  {!collapsed && <span className="truncate">{item.label}</span>}
                  {collapsed && (
                    <span className="absolute left-full ml-3 px-2.5 py-1.5 text-[11px] font-semibold bg-[#0B3D20] text-white rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity shadow-lg">
                      {item.label}
                    </span>
                  )}
                  {navActive && !collapsed && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 w-1.5 h-4 rounded-full bg-[#14532D]" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User Profile + Logout */}
      <div className={`border-t border-[#E3E8DE] p-4 space-y-2 bg-[#F9FAF6] ${collapsed ? 'justify-center' : ''}`}>
        <div className={`flex items-center gap-2.5 p-2.5 rounded-2xl bg-white border border-[#E3E8DE] shadow-xs ${collapsed ? 'justify-center px-2' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-[#14532D] text-[#C7FF75] flex items-center justify-center text-xs font-bold flex-shrink-0">
            {initials}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[#26352A] truncate leading-tight">{user?.fullName}</p>
              <p className="text-[10px] text-[#667367] truncate">{user?.email}</p>
            </div>
          )}
        </div>

        <button
          onClick={handleLogout}
          title={collapsed ? 'Sign Out' : undefined}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-full text-xs font-semibold text-[#B42318] hover:bg-[#FEE2E2] transition-colors border border-transparent ${collapsed ? 'justify-center px-2' : ''}`}
        >
          <LogOut size={15} className="flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-white border-r border-[#E3E8DE] h-screen sticky top-0 transition-all duration-300 flex-shrink-0 z-20 ${
          collapsed ? 'w-[72px]' : 'w-[250px]'
        }`}
        style={{ boxShadow: '2px 0 16px -4px rgba(38, 53, 42, 0.05)' }}
      >
        <div className="relative h-full overflow-hidden flex flex-col">
          <SidebarContent />

          {/* Collapse Toggle */}
          <button
            onClick={onToggleCollapse}
            className="absolute right-3 top-16 w-7 h-7 bg-white border border-[#E3E8DE] rounded-full flex items-center justify-center shadow-sm hover:bg-[#F5F6F2] text-[#667367] hover:text-[#26352A] transition-all z-10"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" aria-hidden="true">
          <div
            className="absolute inset-0 bg-[#0B3D20]/40 backdrop-blur-sm transition-opacity"
            onClick={onMobileClose}
            aria-label="Close navigation"
            tabIndex={-1}
          />
          <aside
            className="absolute left-0 top-0 bottom-0 w-[270px] bg-white shadow-2xl flex flex-col overflow-y-auto z-50 anim-drawer"
          >
            <div className="flex items-center justify-between px-5 h-16 border-b border-[#E3E8DE] bg-[#F9FAF6] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#14532D] flex items-center justify-center text-[#C7FF75]">
                  <Activity size={16} />
                </div>
                <div>
                  <div className="font-bold text-[#26352A] text-sm">Hospital<span className="text-[#14532D]">Care</span></div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#667367]">{meta.portalName}</div>
                </div>
              </div>
              <button
                onClick={onMobileClose}
                className="w-8 h-8 rounded-full bg-[#EAF9D8] text-[#14532D] flex items-center justify-center hover:bg-[#C7FF75] transition-colors"
                aria-label="Close menu"
              >
                <X size={15} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <div className="mb-3 px-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF9D8] text-[#0B3D20] border border-[#C7FF75] text-[10.5px] font-bold">
                  <ShieldCheck size={12} />
                  <span>{meta.label}</span>
                </span>
              </div>
              <nav className="space-y-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={onMobileClose}
                    className={({ isActive: navActive }) => `
                      flex items-center gap-3 px-3 py-2.5 rounded-2xl text-[13px] font-medium transition-all
                      ${navActive
                        ? 'bg-[#EAF9D8] text-[#0B3D20] font-bold border border-[#C7FF75]'
                        : 'text-[#667367] hover:text-[#26352A] hover:bg-[#F5F6F2]'
                      }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </nav>
            </div>
            <div className="border-t border-[#E3E8DE] p-4 bg-[#F9FAF6]">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-full text-xs font-semibold text-[#B42318] bg-[#FEE2E2] hover:bg-[#FCA5A5]/30 transition-colors"
              >
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
};
