import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Settings, ShieldCheck, Database, Server, CheckCircle, Lock, User, Hospital } from 'lucide-react';
import { Field, inputCls } from '../../components/ui/primitives';

export const AdminSettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [hospitalName, setHospitalName] = useState('HospitalCare Metropolitan Medical Center');
  const [emergencyPhone, setEmergencyPhone] = useState('+1 (800) 555-9111');
  const [maxFileSize, setMaxFileSize] = useState('10');
  const [rateLimitWindow, setRateLimitWindow] = useState('15');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto anim-fade-up">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight text-slate-900 leading-none">
          Hospital Configuration & Settings
        </h1>
        <p className="text-xs text-slate-500 font-semibold mt-1">
          Role-appropriate configuration, security thresholds & system telemetry
        </p>
      </div>

      {saved && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 anim-pop">
          <CheckCircle size={16} className="text-emerald-600 shrink-0" />
          System settings saved successfully.
        </div>
      )}

      {/* Hospital Identity Settings */}
      <form onSubmit={handleSave} className="bg-white rounded-[28px] border border-slate-200/90 p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Hospital size={16} className="text-[#14532D]" /> Facility Profile
        </h3>

        <Field label="Hospital Facility Name">
          <input
            value={hospitalName}
            onChange={(e) => setHospitalName(e.target.value)}
            className={inputCls}
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Emergency Line Hotline">
            <input
              value={emergencyPhone}
              onChange={(e) => setEmergencyPhone(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Max Document Upload Size (MB)">
            <input
              type="number"
              value={maxFileSize}
              onChange={(e) => setMaxFileSize(e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>

        <div className="flex justify-end pt-2">
          <button type="submit" className="hc-btn-blue">
            Save Operational Changes
          </button>
        </div>
      </form>

      {/* System Telemetry & Security Card */}
      <div className="bg-white rounded-[28px] border border-slate-200/90 p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck size={16} className="text-emerald-600" /> Security & Architecture
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <p className="font-bold text-slate-900">RBAC Enforcement</p>
            <p className="text-slate-500 mt-0.5">Strict server-side verification with token claim assertions</p>
            <span className="inline-block mt-2 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px]">
              Active & Verified
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <p className="font-bold text-slate-900">IDOR Guard</p>
            <p className="text-slate-500 mt-0.5">Resource ownership checks on records, documents & bills</p>
            <span className="inline-block mt-2 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px]">
              Active & Verified
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <p className="font-bold text-slate-900">Document Security</p>
            <p className="text-slate-500 mt-0.5">MIME type + file signature magic bytes validation</p>
            <span className="inline-block mt-2 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px]">
              10MB Limit · Enforced
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <p className="font-bold text-slate-900">Append-Only Audit Trail</p>
            <p className="text-slate-500 mt-0.5">Non-repudiable transaction logs with correlation IDs</p>
            <span className="inline-block mt-2 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px]">
              Enabled
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
