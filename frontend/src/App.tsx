import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { PortalLayout } from './components/layout/PortalLayout';
import { UserRole } from './types';

// Keep for legacy compatibility — pages still import this
export const GlobalSearchContext = React.createContext<{ query: string }>({ query: '' });

// ─── Landing & Auth ──────────────────────────────────────────────────────────
import { LandingPage } from './pages/LandingPage';
import { Login } from './pages/Login';

// ─── Admin Portal ────────────────────────────────────────────────────────────
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminPatientsPage } from './pages/admin/AdminPatientsPage';
import { AdminDoctorsPage } from './pages/admin/AdminDoctorsPage';
import { AdminBedBoardPage } from './pages/admin/AdminBedBoardPage';
import { AdminAdmissionsPage } from './pages/admin/AdminAdmissionsPage';
import { AdminAppointmentsPage } from './pages/admin/AdminAppointmentsPage';
import { AdminAnalyticsPage } from './pages/admin/AdminAnalyticsPage';
import { AdminAuditLogsPage } from './pages/admin/AdminAuditLogsPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';

// ─── Doctor Portal ────────────────────────────────────────────────────────────
import { DoctorDashboardPage } from './pages/doctor/DoctorDashboardPage';
import { DoctorAppointmentsPage } from './pages/doctor/DoctorAppointmentsPage';
import { DoctorPatientsPage } from './pages/doctor/DoctorPatientsPage';
import { DoctorPrescriptionsPage } from './pages/doctor/DoctorPrescriptionsPage';
import { DoctorRecordsPage } from './pages/doctor/DoctorRecordsPage';
import { DoctorDocumentsPage } from './pages/doctor/DoctorDocumentsPage';

// ─── Patient Portal ───────────────────────────────────────────────────────────
import { PatientDashboardPage } from './pages/patient/PatientDashboardPage';
import { PatientAppointmentsPage } from './pages/patient/PatientAppointmentsPage';
import { PatientDoctorsPage } from './pages/patient/PatientDoctorsPage';
import { PatientRecordsPage } from './pages/patient/PatientRecordsPage';
import { PatientDocumentsPage } from './pages/patient/PatientDocumentsPage';
import { PatientBillingPage } from './pages/patient/PatientBillingPage';
import { PatientProfilePage } from './pages/patient/PatientProfilePage';
import { MessagesPage } from './pages/shared/MessagesPage';

// ─── Billing Portal ───────────────────────────────────────────────────────────
import { BillingDashboardPage } from './pages/billing/BillingDashboardPage';
import { BillingInvoicesPage } from './pages/billing/BillingInvoicesPage';
import { BillingPatientsPage } from './pages/billing/BillingPatientsPage';
import { BillingInsurancePage } from './pages/billing/BillingInsurancePage';
import { BillingReportsPage } from './pages/billing/BillingReportsPage';

// ─── Role Guard ───────────────────────────────────────────────────────────────
// Frontend mirror of server RBAC. Unauthorized users are redirected to their
// own portal — the server rejects requests with 401/403 regardless.
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
    // Redirect to the user's own dashboard — never expose another role's pages
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
            <Route path="admin/dashboard"   element={<RoleGuard roles={['admin']}><AdminDashboardPage /></RoleGuard>} />
            <Route path="admin/patients"    element={<RoleGuard roles={['admin']}><AdminPatientsPage /></RoleGuard>} />
            <Route path="admin/doctors"     element={<RoleGuard roles={['admin']}><AdminDoctorsPage /></RoleGuard>} />
            <Route path="admin/bed-board"   element={<RoleGuard roles={['admin']}><AdminBedBoardPage /></RoleGuard>} />
            <Route path="admin/admissions"  element={<RoleGuard roles={['admin']}><AdminAdmissionsPage /></RoleGuard>} />
            <Route path="admin/appointments" element={<RoleGuard roles={['admin']}><AdminAppointmentsPage /></RoleGuard>} />
            <Route path="admin/messages"    element={<RoleGuard roles={['admin']}><MessagesPage /></RoleGuard>} />
            <Route path="admin/analytics"   element={<RoleGuard roles={['admin']}><AdminAnalyticsPage /></RoleGuard>} />
            <Route path="admin/audit-logs"  element={<RoleGuard roles={['admin']}><AdminAuditLogsPage /></RoleGuard>} />
            <Route path="admin/settings"    element={<RoleGuard roles={['admin']}><AdminSettingsPage /></RoleGuard>} />

            {/* B. DOCTOR PORTAL */}
            <Route path="doctor/dashboard"    element={<RoleGuard roles={['doctor']}><DoctorDashboardPage /></RoleGuard>} />
            <Route path="doctor/appointments" element={<RoleGuard roles={['doctor']}><DoctorAppointmentsPage /></RoleGuard>} />
            <Route path="doctor/patients"     element={<RoleGuard roles={['doctor']}><DoctorPatientsPage /></RoleGuard>} />
            <Route path="doctor/prescriptions" element={<RoleGuard roles={['doctor']}><DoctorPrescriptionsPage /></RoleGuard>} />
            <Route path="doctor/records"      element={<RoleGuard roles={['doctor']}><DoctorRecordsPage /></RoleGuard>} />
            <Route path="doctor/documents"    element={<RoleGuard roles={['doctor']}><DoctorDocumentsPage /></RoleGuard>} />
            <Route path="doctor/messages"     element={<RoleGuard roles={['doctor']}><MessagesPage /></RoleGuard>} />

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
    </BrowserRouter>
  </AuthProvider>
);

export default App;
