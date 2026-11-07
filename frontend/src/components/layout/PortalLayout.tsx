import React, { useState, useEffect, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { TopBar } from './TopBar';
import { useAuth } from '../../context/AuthContext';
import { AlertCircle, CheckCircle2, RotateCw, Send } from 'lucide-react';

export const PortalLayout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const { user, sendVerificationEmail, reloadUser } = useAuth();
  const location = useLocation();

  const handleResend = async () => {
    setResending(true);
    setResendStatus(null);
    try {
      await sendVerificationEmail();
      setResendStatus('Verification email sent! Please check your inbox.');
    } catch (err: any) {
      setResendStatus(err.message || 'Failed to send verification email.');
    } finally {
      setResending(false);
    }
  };

  const handleRefresh = async () => {
    setChecking(true);
    try {
      await reloadUser();
    } finally {
      setChecking(false);
    }
  };

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

        {user && user.emailVerified === false && (
          <div className="bg-[#FEF3C7] border-b border-[#FCD34D] px-4 sm:px-6 py-2.5 text-xs text-[#92400E] flex flex-wrap items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0 text-[#B45309]" />
              <span>
                <b>Email verification required:</b> Your email address (<b>{user.email}</b>) has not been verified yet. Complete verification to unlock all hospital features.
              </span>
            </div>
            <div className="flex items-center gap-2">
              {resendStatus && (
                <span className="text-[11px] font-semibold text-[#065F46] flex items-center gap-1">
                  <CheckCircle2 size={13} /> {resendStatus}
                </span>
              )}
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="px-2.5 py-1 rounded-md bg-[#F59E0B] hover:bg-[#D97706] text-white font-bold text-[11px] inline-flex items-center gap-1 transition-colors"
              >
                <Send size={11} /> {resending ? 'Sending…' : 'Resend Email'}
              </button>
              <button
                type="button"
                onClick={handleRefresh}
                disabled={checking}
                className="px-2 py-1 rounded-md bg-white border border-[#FCD34D] text-[#92400E] hover:bg-[#FEF9C3] font-semibold text-[11px] inline-flex items-center gap-1 transition-colors"
              >
                <RotateCw size={11} className={checking ? 'animate-spin' : ''} /> {checking ? 'Checking…' : 'Check Status'}
              </button>
            </div>
          </div>
        )}

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
