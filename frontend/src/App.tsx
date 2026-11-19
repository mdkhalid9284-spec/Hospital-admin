import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { PortalLayout } from './components/layout/PortalLayout';
import { UserRole } from './types';

// Keep for legacy compatibility — pages still import this
export const GlobalSearchContext = React.createContext<{ query: string }>({ query: '' });

// ─── Landing & Auth (Eager for instant first paint) ──────────────────────────
import { LandingPage } from './pages/LandingPage';
import { Login } from './pages/Login';

// ─── Admin Portal (Lazy Loaded) ──────────────────────────────────────────────
const AdminDashboardPage   = lazy(() => import('./pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })));
const AdminPatientsPage    = lazy(() => import('./pages/admin/AdminPatientsPage').then((m) => ({ default: m.AdminPatientsPage })));
const AdminDoctorsPage     = lazy(() => import('./pages/admin/AdminDoctorsPage').then((m) => ({ default: m.AdminDoctorsPage })));
const AdminBedBoardPage    = lazy(() => import('./pages/admin/AdminBedBoardPage').then((m) => ({ default: m.AdminBedBoardPage })));
const AdminAdmissionsPage  = lazy(() => import('./pages/admin/AdminAdmissionsPage').then((m) => ({ default: m.AdminAdmissionsPage })));
const AdminAppointmentsPage = lazy(() => import('./pages/admin/AdminAppointmentsPage').then((m) => ({ default: m.AdminAppointmentsPage })));
const AdminAnalyticsPage   = lazy(() => import('./pages/admin/AdminAnalyticsPage').then((m) => ({ default: m.AdminAnalyticsPage })));
const AdminAuditLogsPage   = lazy(() => import('./pages/admin/AdminAuditLogsPage').then((m) => ({ default: m.AdminAuditLogsPage })));
const AdminSettingsPage    = lazy(() => import('./pages/admin/AdminSettingsPage').then((m) => ({ default: m.AdminSettingsPage })));

// ─── Doctor Portal (Lazy Loaded) ─────────────────────────────────────────────
const DoctorDashboardPage     = lazy(() => import('./pages/doctor/DoctorDashboardPage').then((m) => ({ default: m.DoctorDashboardPage })));
const DoctorAppointmentsPage  = lazy(() => import('./pages/doctor/DoctorAppointmentsPage').then((m) => ({ default: m.DoctorAppointmentsPage })));
const DoctorPatientsPage      = lazy(() => import('./pages/doctor/DoctorPatientsPage').then((m) => ({ default: m.DoctorPatientsPage })));
const DoctorPrescriptionsPage = lazy(() => import('./pages/doctor/DoctorPrescriptionsPage').then((m) => ({ default: m.DoctorPrescriptionsPage })));
const DoctorRecordsPage       = lazy(() => import('./pages/doctor/DoctorRecordsPage').then((m) => ({ default: m.DoctorRecordsPage })));
const DoctorDocumentsPage     = lazy(() => import('./pages/doctor/DoctorDocumentsPage').then((m) => ({ default: m.DoctorDocumentsPage })));

// ─── Patient Portal (Lazy Loaded) ────────────────────────────────────────────
const PatientDashboardPage    = lazy(() => import('./pages/patient/PatientDashboardPage').then((m) => ({ default: m.PatientDashboardPage })));
const PatientAppointmentsPage = lazy(() => import('./pages/patient/PatientAppointmentsPage').then((m) => ({ default: m.PatientAppointmentsPage })));
const PatientDoctorsPage      = lazy(() => import('./pages/patient/PatientDoctorsPage').then((m) => ({ default: m.PatientDoctorsPage })));
const PatientRecordsPage      = lazy(() => import('./pages/patient/PatientRecordsPage').then((m) => ({ default: m.PatientRecordsPage })));
const PatientDocumentsPage    = lazy(() => import('./pages/patient/PatientDocumentsPage').then((m) => ({ default: m.PatientDocumentsPage })));
const PatientBillingPage      = lazy(() => import('./pages/patient/PatientBillingPage').then((m) => ({ default: m.PatientBillingPage })));
const PatientProfilePage      = lazy(() => import('./pages/patient/PatientProfilePage').then((m) => ({ default: m.PatientProfilePage })));
const MessagesPage            = lazy(() => import('./pages/shared/MessagesPage').then((m) => ({ default: m.MessagesPage })));

// ─── Billing Portal (Lazy Loaded) ────────────────────────────────────────────
const BillingDashboardPage = lazy(() => import('./pages/billing/BillingDashboardPage').then((m) => ({ default: m.BillingDashboardPage })));
const BillingInvoicesPage  = lazy(() => import('./pages/billing/BillingInvoicesPage').then((m) => ({ default: m.BillingInvoicesPage })));
const BillingPatientsPage  = lazy(() => import('./pages/billing/BillingPatientsPage').then((m) => ({ default: m.BillingPatientsPage })));
const BillingInsurancePage = lazy(() => import('./pages/billing/BillingInsurancePage').then((m) => ({ default: m.BillingInsurancePage })));
const BillingReportsPage   = lazy(() => import('./pages/billing/BillingReportsPage').then((m) => ({ default: m.BillingReportsPage })));

const PageLoader: React.FC = () => (
  <div className="p-16 text-center anim-fade-up">
    <div className="w-8 h-8 rounded-full border-2 border-[#14532D] border-t-transparent animate-spin mx-auto" />
    <p className="text-xs text-slate-500 font-medium mt-3">Loading module…</p>
  </div>
);

// ─── Role Guard ───────────────────────────────────────────────────────────────
const RoleGuard: React.FC<{ roles: UserRole[]; children: React.ReactNode }> = ({ roles, children }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="p-16 text-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#14532D] border-t-transparent animate-spin mx-auto" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) {
    return <Navigate to={`/portal/${user.role}/dashboard`} replace />;
  }
  return <>{children}</>;
};

// ─── Auto Dashboard Redirect ──────────────────────────────────────────────────
const DashboardRedirect: React.FC = () => {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={`/portal/${user.role}/dashboard`} replace />;
};

// ─── Root App ─────────────────────────────────────────────────────────────────
export const App: React.FC = () => (
  <AuthProvider>
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public Landing & Authentication */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />

          {/* Protected Operational Application */}
          <Route element={<ProtectedRoute />}>
            {/* Legacy route redirects */}
            <Route path="/dashboard" element={<DashboardRedirect />} />
            <Route path="/patients" element={<DashboardRedirect />} />
            <Route path="/billing" element={<DashboardRedirect />} />
            <Route path="/documents" element={<DashboardRedirect />} />
            <Route path="/appointments" element={<DashboardRedirect />} />
            <Route path="/admissions" element={<DashboardRedirect />} />
            <Route path="/bed-board" element={<DashboardRedirect />} />
            <Route path="/analytics" element={<DashboardRedirect />} />
            <Route path="/audit-logs" element={<DashboardRedirect />} />

            {/* Portal Routes — all wrapped in the sidebar layout */}
            <Route path="/portal" element={<PortalLayout />}>
              <Route index element={<DashboardRedirect />} />

              {/* A. ADMIN PORTAL */}
              <Route path="admin/dashboard"    element={<RoleGuard roles={['admin']}><AdminDashboardPage /></RoleGuard>} />
              <Route path="admin/patients"     element={<RoleGuard roles={['admin']}><AdminPatientsPage /></RoleGuard>} />
              <Route path="admin/doctors"      element={<RoleGuard roles={['admin']}><AdminDoctorsPage /></RoleGuard>} />
              <Route path="admin/bed-board"    element={<RoleGuard roles={['admin']}><AdminBedBoardPage /></RoleGuard>} />
              <Route path="admin/admissions"   element={<RoleGuard roles={['admin']}><AdminAdmissionsPage /></RoleGuard>} />
              <Route path="admin/appointments" element={<RoleGuard roles={['admin']}><AdminAppointmentsPage /></RoleGuard>} />
              <Route path="admin/messages"     element={<RoleGuard roles={['admin']}><MessagesPage /></RoleGuard>} />
              <Route path="admin/analytics"    element={<RoleGuard roles={['admin']}><AdminAnalyticsPage /></RoleGuard>} />
              <Route path="admin/audit-logs"   element={<RoleGuard roles={['admin']}><AdminAuditLogsPage /></RoleGuard>} />
              <Route path="admin/settings"     element={<RoleGuard roles={['admin']}><AdminSettingsPage /></RoleGuard>} />

              {/* B. DOCTOR PORTAL */}
              <Route path="doctor/dashboard"     element={<RoleGuard roles={['doctor']}><DoctorDashboardPage /></RoleGuard>} />
              <Route path="doctor/appointments"  element={<RoleGuard roles={['doctor']}><DoctorAppointmentsPage /></RoleGuard>} />
              <Route path="doctor/patients"      element={<RoleGuard roles={['doctor']}><DoctorPatientsPage /></RoleGuard>} />
              <Route path="doctor/prescriptions" element={<RoleGuard roles={['doctor']}><DoctorPrescriptionsPage /></RoleGuard>} />
              <Route path="doctor/records"       element={<RoleGuard roles={['doctor']}><DoctorRecordsPage /></RoleGuard>} />
              <Route path="doctor/documents"     element={<RoleGuard roles={['doctor']}><DoctorDocumentsPage /></RoleGuard>} />
              <Route path="doctor/messages"      element={<RoleGuard roles={['doctor']}><MessagesPage /></RoleGuard>} />

              {/* C. PATIENT PORTAL */}
              <Route path="patient/dashboard"    element={<RoleGuard roles={['patient']}><PatientDashboardPage /></RoleGuard>} />
              <Route path="patient/appointments" element={<RoleGuard roles={['patient']}><PatientAppointmentsPage /></RoleGuard>} />
              <Route path="patient/doctors"      element={<RoleGuard roles={['patient']}><PatientDoctorsPage /></RoleGuard>} />
              <Route path="patient/records"      element={<RoleGuard roles={['patient']}><PatientRecordsPage /></RoleGuard>} />
              <Route path="patient/documents"    element={<RoleGuard roles={['patient']}><PatientDocumentsPage /></RoleGuard>} />
              <Route path="patient/billing"      element={<RoleGuard roles={['patient']}><PatientBillingPage /></RoleGuard>} />
              <Route path="patient/profile"      element={<RoleGuard roles={['patient']}><PatientProfilePage /></RoleGuard>} />
              <Route path="patient/messages"     element={<RoleGuard roles={['patient']}><MessagesPage /></RoleGuard>} />

              {/* D. BILLING PORTAL */}
              <Route path="billing/dashboard" element={<RoleGuard roles={['billing']}><BillingDashboardPage /></RoleGuard>} />
              <Route path="billing/invoices"  element={<RoleGuard roles={['billing']}><BillingInvoicesPage /></RoleGuard>} />
              <Route path="billing/patients"  element={<RoleGuard roles={['billing']}><BillingPatientsPage /></RoleGuard>} />
              <Route path="billing/insurance" element={<RoleGuard roles={['billing']}><BillingInsurancePage /></RoleGuard>} />
              <Route path="billing/reports"   element={<RoleGuard roles={['billing']}><BillingReportsPage /></RoleGuard>} />

              <Route path="*" element={<DashboardRedirect />} />
            </Route>

            <Route path="*" element={<DashboardRedirect />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  </AuthProvider>
);

export default App;
