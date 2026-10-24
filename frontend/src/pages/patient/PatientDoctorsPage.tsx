import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { IDoctor } from '../../types';
import { Avatar } from '../../components/ui/primitives';
import { Stethoscope, Calendar, DollarSign, GraduationCap, Search, Phone, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const PatientDoctorsPage: React.FC = () => {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState<IDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQ, setSearchQ] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await apiClient.get('/doctors');
        setDoctors(res.data.data.doctors);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = doctors.filter(
    (d) =>
      !searchQ ||
      d.fullName.toLowerCase().includes(searchQ.toLowerCase()) ||
      d.specialization.toLowerCase().includes(searchQ.toLowerCase()) ||
      d.department.toLowerCase().includes(searchQ.toLowerCase())
  );

  return (
    <div className="space-y-5 anim-fade-up">
      {/* Subheader */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-slate-900 leading-none">
            Find Doctors & Specialists
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Certified healthcare professionals, medical departments & consultation schedules
          </p>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="bg-white rounded-[26px] border border-slate-200/90 p-4 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.06)]">
        <div className="relative max-w-md">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="Search by specialty (Cardiology, Neurology) or doctor name…"
            className="w-full pl-9 pr-4 py-2 bg-slate-100/80 border border-transparent focus:bg-white focus:border-slate-300 rounded-full text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-all"
          />
        </div>
      </div>

      {/* Doctors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.map((d) => (
          <div
            key={d.id}
            className="bg-white rounded-[28px] border border-slate-200/90 p-5 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06)] flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar name={d.fullName} size="md" className="w-12 h-12 text-xs" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{d.fullName}</h3>
                    <p className="text-xs text-blue-600 font-semibold">{d.specialization}</p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10.5px] font-bold border border-emerald-200">
                  Available
                </span>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <GraduationCap size={13} className="text-slate-400 shrink-0" />
                  <span className="truncate">{d.qualification}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Stethoscope size={13} className="text-slate-400 shrink-0" />
                  <span>{d.department}</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign size={13} className="text-slate-400 shrink-0" />
                  <span className="font-semibold text-slate-900">${d.consultationFee.toFixed(2)} Consultation Fee</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={13} className="text-slate-400 shrink-0" />
                  <span className="truncate">{d.availableDays?.join(', ')}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100">
              <button
                onClick={() => navigate('/portal/patient/appointments')}
                className="w-full py-2.5 bg-[#1d6cf2] hover:bg-blue-700 text-white rounded-full font-bold text-xs shadow-md shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Calendar size={13} /> Book Consultation
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
