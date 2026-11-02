import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { TopBar } from './TopBar';

export const PortalLayout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [mobileMenuOpen]);

  const handleMobileClose = useCallback(() => setMobileMenuOpen(false), []);

  return (
    <div className="min-h-screen bg-[#F5F6F2] flex overflow-x-hidden text-[#26352A]">
      {/* Persistent Left Sidebar */}
      <AppSidebar
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        mobileOpen={mobileMenuOpen}
        onMobileClose={handleMobileClose}
      />

      {/* Main Content Column */}
      <div className="flex-1 min-w-0 flex flex-col h-screen overflow-y-auto">
        <TopBar onMobileMenuOpen={() => setMobileMenuOpen(true)} />

        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 max-w-none w-full">
          <Outlet />
        </main>

        <footer className="px-6 py-4 border-t border-[#E3E8DE] text-center text-[11px] text-[#667367] bg-white/70 backdrop-blur flex-shrink-0">
          <span>HospitalCare Enterprise Healthcare Platform · Strict RBAC · Verified Telemetry</span>
        </footer>
      </div>
    </div>
  );
};
