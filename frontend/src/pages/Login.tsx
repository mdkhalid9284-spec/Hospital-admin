import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Activity, ShieldCheck, Lock, Mail, ArrowRight, AlertCircle, Eye, EyeOff,
  UserRound, Stethoscope, HeartPulse, Receipt, ArrowLeft, CheckCircle2
} from 'lucide-react';
import { UserRole } from '../types';
import { cn } from '../components/ui/primitives';

const DEMO_ACCOUNTS: { id: UserRole; label: string; icon: React.ReactNode; email: string; pass: string }[] = [
  { id: 'admin', label: 'Hospital Admin', icon: <UserRound size={15} />, email: 'admin@hospitalcare.demo', pass: 'Admin@123' },
  { id: 'doctor', label: 'Medical Doctor', icon: <Stethoscope size={15} />, email: 'doctor@hospitalcare.demo', pass: 'Doctor@123' },
  { id: 'patient', label: 'Patient Member', icon: <HeartPulse size={15} />, email: 'patient@hospitalcare.demo', pass: 'Patient@123' },
  { id: 'billing', label: 'Billing Staff', icon: <Receipt size={15} />, email: 'billing@hospitalcare.demo', pass: 'Billing@123' },
];

export const Login: React.FC = () => {
  const isDev = import.meta.env.DEV;
  const [selectedDemo, setSelectedDemo] = useState<UserRole | null>(isDev ? 'admin' : null);
  const [email, setEmail] = useState(isDev ? 'admin@hospitalcare.demo' : '');
  const [password, setPassword] = useState(isDev ? 'Admin@123' : '');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const pick = (role: UserRole) => {
    if (!isDev) return;
    const acct = DEMO_ACCOUNTS.find((a) => a.id === role);
    if (!acct) return;
    setSelectedDemo(role);
    setEmail(acct.email);
    setPassword(acct.pass);
    setError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const authedUser = await login(email, password);
      navigate(`/portal/${authedUser.role}/dashboard`);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-12 bg-[#F7F8EF] text-[#26352A]">
      {/* Left Column: Forest Green Editorial Identity Showcase */}
      <div className="hidden lg:flex lg:col-span-5 flex-col justify-between bg-[#14532D] text-white p-12 relative overflow-hidden">
        {/* Organic avocado accent glow */}
        <div className="absolute -top-32 -left-32 w-[460px] h-[460px] bg-[#C7FF75]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-24 w-[420px] h-[420px] bg-[#0B3D20] rounded-full blur-2xl pointer-events-none" />

        {/* Top Brand & Back to Home */}
        <div className="relative z-10 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <span className="w-10 h-10 rounded-2xl bg-[#0B3D20] border border-[#C7FF75]/30 flex items-center justify-center text-[#C7FF75] shadow-sm group-hover:scale-105 transition-transform">
              <Activity size={20} />
            </span>
            <span>
              <span className="block text-lg font-bold tracking-tight text-white leading-tight">
                Hospital<span className="text-[#C7FF75]">Care</span>
              </span>
              <span className="block text-[9.5px] uppercase tracking-[0.16em] text-[#EAF9D8]/80 font-medium">
                Unified Clinical Operations
              </span>
            </span>
          </Link>

          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs text-[#EAF9D8]/80 hover:text-white transition-colors"
          >
            <ArrowLeft size={14} /> Back
          </Link>
        </div>

        {/* Editorial Story & Real Photography */}
        <div className="relative z-10 my-auto py-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 border border-white/15 text-[#C7FF75] text-xs font-semibold backdrop-blur-sm mb-6">
            <ShieldCheck size={14} />
            <span>High-Assurance Clinical System</span>
          </div>

          <h1 className="text-[34px] xl:text-[38px] font-bold leading-[1.15] tracking-tight text-white">
            Better care. Smarter hospital operations.
          </h1>

          <p className="text-[#EAF9D8]/85 mt-4 text-sm leading-relaxed max-w-md">
            Admissions with atomic bed locks, verified clinical notes with vitals telemetry, multi-drug prescriptions, and audited billing—all behind server-enforced RBAC.
          </p>

          {/* Clinician Card Preview */}
          <div className="mt-8 p-4 rounded-3xl bg-white/10 border border-white/15 backdrop-blur-md flex items-center gap-4">
            <img
              src="https://images.unsplash.com/photo-1594824813511-57685600c920?auto=format&fit=crop&w=180&q=80"
              alt="Dr. Nilson, Attending Clinician"
              className="w-14 h-14 rounded-2xl object-cover border border-white/20 shrink-0"
              loading="lazy"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-xs font-bold text-white truncate">Dr. Julia Nilson, MD</p>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#C7FF75] text-[#0B3D20] font-bold">
                  On Duty
                </span>
              </div>
              <p className="text-[11px] text-[#EAF9D8]/80 mt-0.5">ICU & Internal Medicine Telemetry</p>
              <div className="flex items-center gap-1.5 text-[10px] text-[#C7FF75] font-semibold mt-1">
                <CheckCircle2 size={12} />
                <span>Zero IDOR · Argon2/Bcrypt Session Verified</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Assurance Note */}
        <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-[#EAF9D8]/60">
          <span>HospitalCare Enterprise SaaS</span>
          <span>HIPAA & RBAC Compliant</span>
        </div>
      </div>

      {/* Right Column: Clean White Authentication Form on Soft Neutral Cream */}
      <div className="lg:col-span-7 flex flex-col justify-center items-center p-6 sm:p-12">
        <div className="w-full max-w-[440px] anim-fade-up">
          {/* Mobile Header */}
          <div className="lg:hidden flex items-center justify-between mb-8">
            <Link to="/" className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-[#14532D] text-[#C7FF75] flex items-center justify-center">
                <Activity size={18} />
              </span>
              <span className="text-lg font-bold text-[#26352A]">
                Hospital<span className="text-[#14532D]">Care</span>
              </span>
            </Link>
            <Link to="/" className="text-xs text-[#667367] hover:text-[#26352A] flex items-center gap-1">
              <ArrowLeft size={13} /> Home
            </Link>
          </div>

          <div className="mb-6">
            <h2 className="text-[26px] font-bold tracking-tight text-[#26352A]">
              Sign in to HospitalCare
            </h2>
            <p className="text-[13px] text-[#667367] mt-1">
              Select a verified demo role or enter your credentials to open your portal.
            </p>
          </div>

          {/* Development Demo Role Switcher */}
          {isDev && (
            <div className="mb-6 p-4 rounded-3xl bg-white border border-[#E3E8DE] shadow-xs">
              <p className="text-[10px] font-bold text-[#667367] uppercase tracking-wider mb-2.5">
                Quick-fill demo roles (Dev only)
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DEMO_ACCOUNTS.map((r) => {
                  const isPicked = selectedDemo === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => pick(r.id)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 py-2.5 px-2 rounded-2xl border text-xs font-semibold transition-all active:scale-95 text-center',
                        isPicked
                          ? 'bg-[#EAF9D8] border-[#C7FF75] text-[#0B3D20] font-bold shadow-xs'
                          : 'bg-[#F5F6F2] border-[#E3E8DE] text-[#667367] hover:text-[#26352A] hover:bg-white'
                      )}
                    >
                      <span className={isPicked ? 'text-[#14532D]' : 'text-[#667367]'}>
                        {r.icon}
                      </span>
                      <span className="text-[10.5px] leading-tight">{r.label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-[#8A998B] mt-2.5 text-center">
                Credentials pre-fill only — user role is strictly assigned by server response.
              </p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3.5 bg-[#FEE2E2] border border-[#FCA5A5] rounded-2xl flex gap-2.5 text-[#B42318] text-xs font-semibold anim-pop">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={submit} className="space-y-4 bg-white border border-[#E3E8DE] rounded-3xl p-6 sm:p-7 shadow-sm">
            <div>
              <label className="hc-label">Email address</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A998B]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="hc-input !pl-10"
                  placeholder="name@hospitalcare.demo"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="hc-label !mb-0">Password</label>
              </div>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A998B]" />
                <input
                  type={show ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="hc-input !pl-10 !pr-11"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8A998B] hover:text-[#26352A]"
                  aria-label={show ? 'Hide password' : 'Show password'}
                >
                  {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="hc-btn-primary w-full !py-3 !rounded-full !bg-[#14532D] hover:!bg-[#0B3D20] text-white shadow-md text-sm mt-2"
            >
              {loading ? 'Verifying Session…' : 'Enter HospitalCare Portal'}
              <ArrowRight size={15} />
            </button>

            <div className="pt-2 text-center">
              <p className="text-[11px] text-[#8A998B]">
                Argon2 / Bcrypt verified authentication · Role-Based Access Control
              </p>
            </div>
          </form>

          <div className="mt-6 text-center">
            <Link to="/" className="text-xs text-[#667367] hover:text-[#14532D] font-medium transition-colors">
              ← Return to HospitalCare Public Website
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
