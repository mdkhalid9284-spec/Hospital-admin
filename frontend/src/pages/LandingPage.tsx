import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Activity, BedDouble, CalendarDays, FileText, Pill, Receipt,
  Users, CheckCircle2, ChevronRight, Video, Mic, MicOff,
  Share2, PhoneOff, Lock, UserCheck, ArrowRight, ArrowDown,
  Shield, Clock, BarChart2, Stethoscope, HeartPulse, ClipboardList,
} from 'lucide-react';

/* ─── DATA ──────────────────────────────────────────────────────────────────── */

const TICKER_ITEMS = [
  { label: 'Personalized',  img: 'https://images.unsplash.com/photo-1594824813511-57685600c920?auto=format&fit=crop&w=64&q=80' },
  { label: 'Accessible',    img: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=64&q=80' },
  { label: 'Innovative',    img: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=64&q=80' },
  { label: 'Trustworthy',   img: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&w=64&q=80' },
  { label: 'Convenient',    img: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&w=64&q=80' },
  { label: 'Reliable',      img: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&w=64&q=80' },
  { label: 'Efficient',     img: 'https://images.unsplash.com/photo-1551601651-2a8555f1a136?auto=format&fit=crop&w=64&q=80' },
  { label: 'Caring',        img: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=64&q=80' },
  { label: 'Human',         img: 'https://images.unsplash.com/photo-1622902046580-2b47f47f5471?auto=format&fit=crop&w=64&q=80' },
  { label: 'Flexible',      img: 'https://images.unsplash.com/photo-1612531387486-b9993a9c5e36?auto=format&fit=crop&w=64&q=80' },
  { label: 'Inclusive',     img: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=64&q=80' },
];

/* ─── TICKER STRIP ───────────────────────────────────────────────────────────── */
interface TickerStripProps { offset?: boolean }

const TickerStrip: React.FC<TickerStripProps> = ({ offset = false }) => {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS]; // duplicate for seamless loop
  return (
    <div className="overflow-hidden w-full">
      <div
        className="flex items-center gap-6 whitespace-nowrap"
        style={{
          animation: `ticker-scroll ${offset ? '38s' : '32s'} linear infinite`,
          transform: offset ? 'translateX(-15%)' : undefined,
        }}
      >
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2.5 shrink-0">
            <img
              src={item.img}
              alt={item.label}
              className="w-8 h-8 rounded-full object-cover border-2 border-[#C7FF75] shadow-sm"
              loading="lazy"
            />
            <span className="text-lg sm:text-xl font-bold text-[#26352A] tracking-tight">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─── CONSULTATION CARD ──────────────────────────────────────────────────────── */
const ConsultationCard: React.FC = () => {
  const [isMuted, setIsMuted] = useState(false);
  return (
    <div className="bg-white rounded-[20px] border border-[#E3E8DE] shadow-lg overflow-hidden">
      {/* Meta bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-[#E3E8DE]">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl bg-[#14532D] text-[#C7FF75] flex items-center justify-center font-bold text-sm select-none">
            hc
          </span>
          <div>
            <p className="text-sm font-bold text-[#26352A]">Consultation</p>
            <p className="text-[11px] text-[#667367]">Today · 11:00 AM</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Avatars */}
          <div className="flex -space-x-2">
            <img src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=48&q=80" alt="Attendee" className="w-7 h-7 rounded-full border-2 border-white object-cover" />
            <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=48&q=80" alt="Attendee" className="w-7 h-7 rounded-full border-2 border-white object-cover" />
          </div>
          <span className="text-xs font-semibold text-[#667367] border border-[#E3E8DE] px-2 py-0.5 rounded-full">All</span>
          <span className="px-3 py-1 rounded-full bg-[#14532D] text-[#C7FF75] text-[11px] font-mono font-semibold">sjm-jlmt-nsu</span>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[#F5F6F2] border border-[#E3E8DE]">
            <img src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=48&q=80" alt="Dr. Julia Nilson" className="w-5 h-5 rounded-full object-cover" />
            <div className="hidden sm:block">
              <p className="text-[11px] font-bold text-[#26352A] leading-none">Dr. Julia Nilson</p>
              <p className="text-[10px] text-[#667367] leading-none mt-0.5">Doctor</p>
            </div>
          </div>
        </div>
      </div>

      {/* Video streams */}
      <div className="grid grid-cols-2 gap-3 p-4">
        {/* Doctor — active (lime border) */}
        <div className="relative rounded-xl overflow-hidden aspect-[4/3] border-2 border-[#C7FF75]">
          <img
            src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=600&q=80"
            alt="Dr. Julia Nilson — video on"
            className="w-full h-full object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-semibold">Julia Nilson</span>
            <span className="flex items-end gap-0.5 h-4">
              <span className="w-0.5 h-1.5 bg-[#C7FF75] rounded-full animate-pulse" />
              <span className="w-0.5 h-3 bg-[#C7FF75] rounded-full animate-pulse" style={{ animationDelay: '0.15s' }} />
              <span className="w-0.5 h-2 bg-[#C7FF75] rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
            </span>
          </div>
        </div>
        {/* Patient */}
        <div className="relative rounded-xl overflow-hidden aspect-[4/3] border-2 border-[#E3E8DE]">
          <img
            src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80"
            alt="Helen Watson — patient video"
            className="w-full h-full object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-semibold">Helen Watson</span>
            <span className="flex items-end gap-0.5 h-4">
              <span className="w-0.5 h-1.5 bg-white/60 rounded-full" />
              <span className="w-0.5 h-2.5 bg-white/60 rounded-full" />
              <span className="w-0.5 h-1 bg-white/60 rounded-full" />
            </span>
          </div>
          {/* Expand icon */}
          <button className="absolute top-2 right-2 w-6 h-6 rounded bg-black/30 flex items-center justify-center text-white/80 hover:text-white">
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />
            </svg>
          </button>
        </div>
      </div>

      {/* Control bar */}
      <div className="px-4 sm:px-6 pb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { icon: isMuted ? <MicOff size={13} /> : <Mic size={13} />, label: isMuted ? 'Unmute' : 'Mute', action: () => setIsMuted(!isMuted), active: isMuted },
            { icon: <Video size={13} />, label: 'Start Video' },
            { icon: <Shield size={13} />, label: 'Security' },
            { icon: <Users size={13} />, label: 'Participants' },
            { icon: <Share2 size={13} />, label: 'Share Screen', lime: true },
            { icon: <BarChart2 size={13} />, label: 'Polling' },
            { icon: <ClipboardList size={13} />, label: 'Record' },
          ].map((ctrl, i) => (
            <button
              key={i}
              type="button"
              onClick={ctrl.action}
              className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl text-[10px] font-semibold transition-colors ${
                ctrl.lime
                  ? 'bg-[#14532D] text-[#C7FF75]'
                  : ctrl.active
                  ? 'bg-red-50 text-red-600'
                  : 'text-[#667367] hover:text-[#26352A] hover:bg-[#F5F6F2]'
              }`}
            >
              {ctrl.icon}
              <span className="hidden sm:block">{ctrl.label}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#14532D] hover:bg-[#0B3D20] text-white text-xs font-bold transition-all"
        >
          <PhoneOff size={13} /> End Call
        </button>
      </div>
    </div>
  );
};

/* ─── MAIN PAGE ──────────────────────────────────────────────────────────────── */
export const LandingPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#26352A] overflow-x-hidden selection:bg-[#C7FF75] selection:text-[#0B3D20]">

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 1 — HERO (cinematic photo card, nav embedded inside)
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="px-3 sm:px-5 pt-4 pb-2">
        <div className="relative rounded-[28px] sm:rounded-[36px] overflow-hidden min-h-[560px] sm:min-h-[640px] lg:min-h-[680px]">

          {/* Full-bleed cinematic background photo */}
          <img
            src="https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1800&q=85"
            alt="Clinician working at a modern hospital workstation"
            className="absolute inset-0 w-full h-full object-cover object-center"
            loading="eager"
          />

          {/* Gradient overlays — subtle top for nav legibility + heavy bottom for text */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/15 to-black/75 pointer-events-none" />

          {/* ── NAV BAR — INSIDE the hero card ───────────────────────────── */}
          <nav className="relative z-20 flex items-center justify-between px-5 sm:px-8 pt-5 pb-2">
            {/* Brand mark */}
            <Link to="/" className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white flex items-center justify-center">
                <Activity size={15} />
              </span>
              <div>
                <span className="text-white font-bold text-sm tracking-tight leading-none">HospitalCare</span>
              </div>
            </Link>

            {/* Center nav links (pill group) */}
            <div className="hidden md:flex items-center gap-0.5 bg-white/15 backdrop-blur-md border border-white/20 rounded-full px-1.5 py-1.5">
              {['Home', 'About', 'Services', 'Contact us'].map((link, i) => (
                <a
                  key={link}
                  href={i === 0 ? '#' : `#${link.toLowerCase().replace(' ', '-')}`}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                    i === 0
                      ? 'bg-white text-[#26352A]'
                      : 'text-white/90 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {link}
                </a>
              ))}
            </div>

            {/* Right — Login pill */}
            {user ? (
              <button
                onClick={() => navigate(`/portal/${user.role}/dashboard`)}
                className="px-4 py-1.5 rounded-full bg-[#C7FF75] text-[#0B3D20] text-xs font-bold hover:bg-[#bbf654] transition-all"
              >
                Enter Portal →
              </button>
            ) : (
              <Link
                to="/login"
                className="px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/30 text-white text-xs font-semibold hover:bg-white/25 transition-all"
              >
                Log in
              </Link>
            )}
          </nav>

          {/* ── HERO CONTENT — bottom-left ────────────────────────────────── */}
          <div className="absolute bottom-0 left-0 right-0 z-10 p-6 sm:p-10 lg:p-14">
            <div className="max-w-xl">
              <span className="inline-block text-[11px] font-bold uppercase tracking-[0.14em] text-[#C7FF75] mb-3">
                Meet HospitalCare
              </span>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-[1.1] tracking-tight">
                Powering unified<br />hospital operations
              </h1>
              <p className="mt-4 text-sm sm:text-base text-white/75 max-w-md leading-relaxed">
                Admissions, clinical records, multi-drug prescriptions, and audited billing — unified in a single high-assurance platform.
              </p>
              <div className="mt-7 flex items-center gap-3">
                <Link
                  to="/login"
                  className="px-6 py-3 rounded-full bg-[#C7FF75] hover:bg-[#bbf654] text-[#0B3D20] text-sm font-bold transition-all active:scale-95 shadow-sm"
                >
                  Get started
                </Link>
                <a
                  href="#features"
                  className="px-6 py-3 rounded-full border border-white/30 bg-white/10 backdrop-blur-sm text-white text-sm font-semibold hover:bg-white/20 transition-all"
                >
                  See features
                </a>
              </div>
            </div>

            {/* Bottom-right scroll arrow */}
            <a
              href="#tagline"
              className="absolute bottom-6 right-6 sm:bottom-10 sm:right-10 w-10 h-10 rounded-full bg-white/15 border border-white/25 backdrop-blur-md flex items-center justify-center text-white hover:bg-[#C7FF75] hover:text-[#0B3D20] transition-all"
              aria-label="Scroll down"
            >
              <ArrowDown size={16} />
            </a>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 2 — TAGLINE (centered, below hero)
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="tagline" className="pt-10 pb-6 text-center px-4">
        <p className="text-[#667367] text-sm sm:text-base max-w-lg mx-auto leading-relaxed">
          We provide unified hospital operations to keep patients well-cared&nbsp;for,<br className="hidden sm:block" />
          anytime, anywhere.
        </p>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 3 — ATTRIBUTE TICKER (two rows, infinite scroll)
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="py-5 overflow-hidden">
        <style>{`
          @keyframes ticker-scroll {
            0%   { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
        `}</style>
        <div className="flex flex-col gap-3">
          <TickerStrip />
          <TickerStrip offset />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 4 — STAGGERED 4-COLUMN BENTO GRID (key Avocado reference)
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="features" className="py-16 px-3 sm:px-5 max-w-[1400px] mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#26352A] tracking-tight">
            On-demand clinical care across all hospital departments
          </h2>
          <p className="text-[#667367] text-sm mt-2 max-w-md mx-auto">
            Our integrated platform ensures your patients receive the highest-quality care across every ward.
          </p>
        </div>

        {/* 4-column asymmetric grid — matches Avocado reference exactly */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">

          {/* ── COL 1: Two stacked text cards ─────────────────────────── */}
          <div className="flex flex-col gap-4">
            {/* Dark forest green statement card */}
            <div className="rounded-[24px] bg-[#14532D] text-white p-6">
              <h3 className="text-base font-bold leading-snug">Full Hospital Coverage</h3>
              <p className="text-[#EAF9D8]/80 text-xs mt-2 leading-relaxed">
                Complete ward management across ICU, General, Semi-Private, and Maternity — all with atomic bed locking.
              </p>
            </div>
            {/* Pale lime specialty card */}
            <div className="rounded-[24px] bg-[#EAF9D8] p-6">
              <span className="w-10 h-10 rounded-2xl bg-white text-[#14532D] flex items-center justify-center mb-4 shadow-xs">
                <HeartPulse size={18} />
              </span>
              <h3 className="text-base font-bold text-[#0B3D20]">Specialty Care</h3>
              <p className="text-[#26352A]/70 text-xs mt-1.5 leading-relaxed">
                Cardiology, Oncology, Pediatrics, OB/GYN, Neurology, and more.
              </p>
            </div>
          </div>

          {/* ── COL 2: Tall doctor photo card ─────────────────────────── */}
          <div className="rounded-[24px] overflow-hidden relative min-h-[360px] lg:min-h-[440px] bg-[#d4e8c2]">
            <img
              src="https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=600&q=80"
              alt="Male doctor with stethoscope"
              className="absolute inset-0 w-full h-full object-cover object-top"
              loading="lazy"
            />
            {/* Subtle bottom fade */}
            <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-[#d4e8c2]/60 to-transparent" />
          </div>

          {/* ── COL 3: Two stacked lime feature cards ─────────────────── */}
          <div className="flex flex-col gap-4">
            {/* Bright lime card */}
            <div className="rounded-[24px] bg-[#C7FF75] p-6">
              <span className="w-10 h-10 rounded-2xl bg-white/50 text-[#0B3D20] flex items-center justify-center mb-4">
                <BedDouble size={18} />
              </span>
              <h3 className="text-base font-bold text-[#0B3D20]">Atomic Bed Locks</h3>
              <p className="text-[#26352A]/75 text-xs mt-1.5 leading-relaxed">
                Transactional concurrency control prevents duplicate bed reservations across all wards.
              </p>
            </div>
            {/* Pale lime card */}
            <div className="rounded-[24px] bg-[#EAF9D8] p-6">
              <span className="w-10 h-10 rounded-2xl bg-white text-[#14532D] flex items-center justify-center mb-4 shadow-xs">
                <Clock size={18} />
              </span>
              <h3 className="text-base font-bold text-[#0B3D20]">24/7 Real-time Telemetry</h3>
              <p className="text-[#26352A]/70 text-xs mt-1.5 leading-relaxed">
                Live vital-sign streaming — BP, SpO₂, HR, temperature — per clinical encounter.
              </p>
            </div>
          </div>

          {/* ── COL 4: Tall female clinician photo card with overlay ───── */}
          <div className="rounded-[24px] overflow-hidden relative min-h-[360px] lg:min-h-[440px] bg-[#b0c4b0]">
            <img
              src="https://images.unsplash.com/photo-1594824813511-57685600c920?auto=format&fit=crop&w=600&q=80"
              alt="Female clinician — verified patients"
              className="absolute inset-0 w-full h-full object-cover object-top"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0B3D20]/70 via-transparent to-transparent" />
            <div className="absolute bottom-5 left-5 right-5 text-white">
              <span className="w-8 h-8 rounded-full bg-[#C7FF75] text-[#0B3D20] flex items-center justify-center mb-2">
                <CheckCircle2 size={15} />
              </span>
              <p className="text-sm font-bold">Patients, verified</p>
              <p className="text-xs text-white/80 mt-0.5 leading-relaxed">
                Patient IDs verified with server-enforced RBAC and zero IDOR tolerance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 5 — CONSULTATION UI PREVIEW
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="preview" className="py-12 px-3 sm:px-5 max-w-[1400px] mx-auto">
        <div className="rounded-[28px] sm:rounded-[36px] bg-[#F7F8EF] border border-[#E3E8DE] p-6 sm:p-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <span className="px-3 py-1 rounded-full bg-[#EAF9D8] text-[#0B3D20] border border-[#C7FF75] text-[11px] font-bold uppercase tracking-wider">
                Live Clinical Experience
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#26352A] mt-2 tracking-tight">
                Telehealth & clinical consultation board
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-[#667367] max-w-sm">
              HospitalCare coordinates real-time consultations alongside synchronized electronic patient charting.
            </p>
          </div>
          <ConsultationCard />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 6 — FEATURE HIGHLIGHT (alternating image + text)
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="about" className="py-16 px-4 sm:px-8 max-w-7xl mx-auto space-y-20">
        {/* 6a: Left text + right image */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="px-3 py-1 rounded-full bg-[#EAF9D8] text-[#0B3D20] border border-[#C7FF75] text-[11px] font-bold uppercase tracking-wider">
              Clinical Operations
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#26352A] mt-3 tracking-tight leading-snug">
              Bringing Healthcare<br />Records Together
            </h2>
            <p className="text-[#667367] text-sm mt-3 leading-relaxed max-w-md">
              From initial admission through doctor examination, multi-drug prescribing, lab orders, and final discharge billing — every step is recorded and audited in a single authoritative system.
            </p>
            <ul className="mt-5 space-y-2.5">
              {[
                'Atomic bed reservation prevents double-booking',
                'Real-time vital signs per doctor encounter',
                'Multi-item prescriptions with dosage & schedule',
                'Complete insurance claim lifecycle',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-[#26352A]">
                  <CheckCircle2 size={16} className="text-[#14532D] shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
            <Link to="/login" className="mt-7 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#14532D] hover:bg-[#0B3D20] text-white text-sm font-bold transition-all">
              Explore the platform <ArrowRight size={14} />
            </Link>
          </div>
          <div className="rounded-[28px] overflow-hidden aspect-[4/3] bg-[#EAF9D8]">
            <img
              src="https://images.unsplash.com/photo-1551601651-2a8555f1a136?auto=format&fit=crop&w=800&q=80"
              alt="Doctor reviewing patient records on tablet"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        </div>

        {/* 6b: Left image + right dark green text panel */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div className="rounded-[28px] overflow-hidden aspect-[4/3] bg-[#14532D] order-2 md:order-1">
            <img
              src="https://images.unsplash.com/photo-1612531387486-b9993a9c5e36?auto=format&fit=crop&w=800&q=80"
              alt="Medical team reviewing data on monitors"
              className="w-full h-full object-cover opacity-80 mix-blend-luminosity"
              loading="lazy"
            />
          </div>
          <div className="order-1 md:order-2">
            <span className="px-3 py-1 rounded-full bg-[#EAF9D8] text-[#0B3D20] border border-[#C7FF75] text-[11px] font-bold uppercase tracking-wider">
              Security & Compliance
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#26352A] mt-3 tracking-tight leading-snug">
              Engineered for clinical<br />security & auditability
            </h2>
            <p className="text-[#667367] text-sm mt-3 leading-relaxed max-w-md">
              Zero IDOR tolerance. Server-enforced RBAC. Argon2/Bcrypt authentication. Every action written to an immutable audit log.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {[
                { label: '4 Role Portals', sub: 'Admin · Doctor · Patient · Billing', icon: <Users size={16} /> },
                { label: 'Zero IDOR', sub: 'Server validates every patient ID', icon: <Shield size={16} /> },
                { label: 'Atomic Beds', sub: 'No concurrency race conditions', icon: <Lock size={16} /> },
                { label: 'Audit Trail', sub: 'Every action logged to immutable DB', icon: <ClipboardList size={16} /> },
              ].map((item) => (
                <div key={item.label} className="p-4 rounded-2xl bg-[#F5F6F2] border border-[#E3E8DE]">
                  <span className="text-[#14532D] mb-1.5 block">{item.icon}</span>
                  <p className="text-sm font-bold text-[#26352A]">{item.label}</p>
                  <p className="text-[11px] text-[#667367] mt-0.5">{item.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 7 — HOW IT WORKS (3 numbered steps)
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="services" className="py-16 px-4 sm:px-8 max-w-7xl mx-auto">
        <div className="rounded-[32px] bg-[#F7F8EF] border border-[#E3E8DE] p-8 sm:p-12">
          <div className="max-w-xl mb-10">
            <span className="px-3 py-1 rounded-full bg-[#EAF9D8] text-[#0B3D20] border border-[#C7FF75] text-[11px] font-bold uppercase tracking-wider">
              How it works
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#26352A] mt-3 tracking-tight">
              Keeping things simple
            </h2>
            <p className="text-[#667367] text-sm mt-2">
              Patients move seamlessly from intake and admission through physician review to authoritative settlement.
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                num: '01',
                numBg: 'bg-[#14532D] text-[#C7FF75]',
                title: 'Patient Registration & Atomic Bed Reservation',
                desc: 'Admissions staff register patient demographics, assign attending physicians, and lock ICU/General/Semi-Private beds with transactional concurrency guards.',
                tag: 'Admissions Board',
              },
              {
                num: '02',
                numBg: 'bg-[#C7FF75] text-[#0B3D20]',
                title: 'Physician Examination & Vitals Telemetry',
                desc: 'Doctors record clinical findings, measure blood pressure, pulse, temperature, and SpO₂, then order diagnostic lab panels or referrals.',
                tag: 'Doctor Console',
              },
              {
                num: '03',
                numBg: 'bg-[#0B3D20] text-white',
                title: 'Multi-Item Prescription & Audited Billing',
                desc: 'Prescriptions specify dosage, duration, and food schedule per drug. Invoices and insurance claims are compiled automatically with complete audit trails.',
                tag: 'Finance & Pharmacy',
              },
            ].map((step) => (
              <div
                key={step.num}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-white border border-[#E3E8DE] shadow-xs"
              >
                <div className="flex items-start sm:items-center gap-4">
                  <span className={`text-2xl font-extrabold px-4 py-2 rounded-2xl font-mono shrink-0 ${step.numBg}`}>
                    {step.num}
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-[#26352A]">{step.title}</h4>
                    <p className="text-xs text-[#667367] mt-0.5 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
                <span className="shrink-0 text-xs font-bold text-[#14532D] bg-[#EAF9D8] px-3 py-1 rounded-full border border-[#C7FF75]">
                  {step.tag}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 8 — DARK GREEN CTA STRIP
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="py-6 px-3 sm:px-5 max-w-[1400px] mx-auto">
        <div className="rounded-[28px] sm:rounded-[36px] bg-[#14532D] px-8 sm:px-16 py-14 sm:py-20 text-center relative overflow-hidden">
          {/* Subtle lime glow top-right */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-[#C7FF75]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-xl mx-auto">
            <span className="w-12 h-12 rounded-full bg-white/10 border border-white/20 text-[#C7FF75] flex items-center justify-center mx-auto mb-5">
              <Activity size={22} />
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white tracking-tight">
              Ready to elevate<br />
              <span className="text-[#C7FF75]">hospital operations?</span>
            </h2>
            <p className="text-white/70 text-sm mt-4 leading-relaxed">
              Access development demo credentials for hospital administrators, physicians, patient members, and financial staff.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                to="/login"
                className="px-8 py-3.5 rounded-full bg-[#C7FF75] hover:bg-[#bbf654] text-[#0B3D20] text-sm font-bold transition-all active:scale-95 flex items-center gap-2"
              >
                Get started <ArrowRight size={15} />
              </Link>
              <a
                href="#contact-us"
                className="px-8 py-3.5 rounded-full border border-white/25 text-white text-sm font-semibold hover:bg-white/10 transition-all"
              >
                Contact us
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 9 — FOOTER
      ══════════════════════════════════════════════════════════════════════ */}
      <footer id="contact-us" className="border-t border-[#E3E8DE] bg-[#FFFFFF] py-12 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8">
          {/* Brand column */}
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <span className="w-8 h-8 rounded-full bg-[#14532D] text-[#C7FF75] flex items-center justify-center">
                <Activity size={15} />
              </span>
              <span className="font-bold text-base text-[#26352A]">
                Hospital<span className="text-[#14532D]">Care</span>
              </span>
            </div>
            <p className="text-xs text-[#667367] leading-relaxed max-w-xs">
              Integrated hospital management — bed allocations, clinical encounter charting, multi-drug prescriptions, and audited medical billing.
            </p>
            <div className="flex gap-2 mt-4">
              <span className="px-2.5 py-1 rounded-full bg-[#EAF9D8] text-[#0B3D20] text-[10px] font-bold border border-[#C7FF75]">#HospitalOps</span>
              <span className="px-2.5 py-1 rounded-full bg-[#EAF9D8] text-[#0B3D20] text-[10px] font-bold border border-[#C7FF75]">#ClinicalSaaS</span>
            </div>
          </div>

          {/* Navigation column */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#26352A] mb-3">Platform</p>
            <div className="flex flex-col gap-2 text-xs font-semibold text-[#667367]">
              <Link to="/login" className="hover:text-[#14532D] transition-colors">Admin Portal</Link>
              <Link to="/login" className="hover:text-[#14532D] transition-colors">Clinical Console</Link>
              <Link to="/login" className="hover:text-[#14532D] transition-colors">Patient Member View</Link>
              <Link to="/login" className="hover:text-[#14532D] transition-colors">Billing & Claims</Link>
            </div>
          </div>

          {/* Contact column */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#26352A] mb-3">Contact</p>
            <div className="flex flex-col gap-2 text-xs text-[#667367]">
              <p>info@hospitalcare.dev</p>
              <p>+1 (800) HOSP-CARE</p>
            </div>
            <p className="text-[11px] text-[#8A998B] mt-6">
              © {new Date().getFullYear()} HospitalCare Enterprise<br />
              Server RBAC & IDOR enforced on every request.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
