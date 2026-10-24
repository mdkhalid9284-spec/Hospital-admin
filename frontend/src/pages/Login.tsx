import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, ShieldCheck, Lock, Mail, ArrowRight, AlertCircle, Eye, EyeOff, UserRound, Stethoscope, HeartPulse, Receipt } from 'lucide-react';
import { UserRole } from '../types';
import { cn } from '../components/ui/primitives';

const DEMO_ACCOUNTS: { id: UserRole; label: string; icon: React.ReactNode; email: string; pass: string }[] = [
  { id: 'admin', label: 'Hospital Admin', icon: <UserRound size={16} />, email: 'admin@hospitalcare.demo', pass: 'Admin@123' },
  { id: 'doctor', label: 'Medical Doctor', icon: <Stethoscope size={16} />, email: 'doctor@hospitalcare.demo', pass: 'Doctor@123' },
  { id: 'patient', label: 'Patient Member', icon: <HeartPulse size={16} />, email: 'patient@hospitalcare.demo', pass: 'Patient@123' },
  { id: 'billing', label: 'Billing Staff', icon: <Receipt size={16} />, email: 'billing@hospitalcare.demo', pass: 'Billing@123' },
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

  // Development-only credential convenience. Fills a legitimate demo account's
  // credentials — the server alone determines the authenticated role; the client
  // can never select or assert an arbitrary server-side role. Disabled in prod.
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
    e.preventDefault(); setError(null); setLoading(true);
    try { 
      const authedUser = await login(email, password); 
      navigate(`/portal/${authedUser.role}/dashboard`); 
    }
    catch (err: any) { setError(err.message || 'Login failed. Check credentials.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[#f8fafc]">
      <div className="hidden lg:flex flex-col justify-between bg-slate-950 text-white p-12 relative overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[480px] h-[480px] bg-sky-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-24 w-[420px] h-[420px] bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="relative flex items-center gap-3">
          <span className="w-11 h-11 rounded-2xl bg-sky-500 flex items-center justify-center shadow-lg shadow-sky-500/40"><Activity size={22} /></span>
          <span><span className="block text-xl font-bold tracking-tight">Hospital<span className="text-sky-400">Care</span></span><span className="block text-[10px] uppercase tracking-[0.18em] text-slate-400 font-semibold">Integrated Healthcare Platform</span></span>
        </div>
        <div className="relative max-w-lg">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-sky-300 text-xs font-semibold"><ShieldCheck size={14} /> High-assurance clinical prototype</span>
          <h1 className="text-[40px] font-bold leading-[1.1] tracking-tight mt-5">One platform for beds, care, scripts & billing.</h1>
          <p className="text-slate-300/90 mt-4 leading-relaxed">Admissions with atomic bed locks, doctor notes with vitals, multi-drug prescriptions, authoritative billing and a tamper-evident audit trail — all behind strict RBAC.</p>
          <div className="grid grid-cols-4 gap-3 mt-8">
            {[['Live', 'Bed board'], ['Zero', 'IDOR tolerance'], ['V(G)=4', 'Admission tests'], ['100%', 'Audited billing']].map(([a, b]) => (
              <div key={b} className="rounded-2xl bg-white/5 border border-white/10 p-3.5"><p className="font-bold text-sky-300">{a}</p><p className="text-[11px] text-slate-400 mt-0.5">{b}</p></div>
            ))}
          </div>
        </div>
        <p className="relative text-[11px] text-slate-500">Argon2 / Bcrypt verified demo credentials · RBAC + IDOR enforced server-side</p>
      </div>

      <div className="flex items-center justify-center p-5 sm:p-10">
        <div className="w-full max-w-[440px] anim-fade-up">
          <div className="lg:hidden flex items-center gap-2.5 mb-6">
            <span className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white"><Activity size={19} className="text-sky-400" /></span>
            <span className="text-lg font-bold">Hospital<span className="text-sky-600">Care</span></span>
          </div>
          <h2 className="text-[26px] font-bold tracking-tight text-slate-900">Sign in to HospitalCare</h2>
          <p className="text-[13px] text-slate-500 mt-1">Sign in with your hospital account. Role is assigned by the server.</p>

          {isDev && (
            <>
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider mb-2">Development demo accounts</p>
              <div className="grid grid-cols-4 gap-2 mt-2 mb-4">
                {DEMO_ACCOUNTS.map((r) => (
                  <button key={r.id} type="button" onClick={() => pick(r.id)} className={cn('flex flex-col items-center gap-1.5 py-3 rounded-2xl border text-xs font-bold transition-all active:scale-95', selectedDemo === r.id ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-800')}>
                    {r.icon}
                    <span className="leading-tight">{r.label}</span>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 text-center mb-4">Credentials prefill only — server verifies and assigns your role.</p>
            </>
          )}

          {error && <div className="mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex gap-2.5 text-rose-700 text-[13px]"><AlertCircle size={16} className="shrink-0 mt-px" />{error}</div>}

          <form onSubmit={submit} className="mt-5 space-y-4 bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_16px_32px_-20px_rgba(15,23,42,0.2)]">
            <div>
              <label className="hc-label">Email address</label>
              <div className="relative"><Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="hc-input !pl-10" placeholder="name@hospitalcare.demo" /></div>
            </div>
            <div>
              <label className="hc-label">Password</label>
              <div className="relative"><Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input type={show ? 'text' : 'password'} required value={password} onChange={(e) => setPassword(e.target.value)} className="hc-input !pl-10 !pr-11" placeholder="••••••••" /><button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">{show ? <EyeOff size={16} /> : <Eye size={16} />}</button></div>
            </div>
            <button type="submit" disabled={loading} className="hc-btn-dark w-full !py-3 !rounded-xl !bg-sky-600 hover:!bg-sky-700">{loading ? 'Authenticating…' : 'Sign In to Portal'} <ArrowRight size={16} /></button>
            <p className="text-center text-[11px] text-slate-400">Demo instance · passwords verified with Argon2/Bcrypt</p>
          </form>
        </div>
      </div>
    </div>
  );
};
