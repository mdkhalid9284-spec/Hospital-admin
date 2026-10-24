import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { IAppointment } from '../../types';
import { InteractiveCalendar } from '../../components/ui/InteractiveCalendar';
import { Modal, ModalHeader, Field, inputCls } from '../../components/ui/primitives';
import { CheckCircle, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const DoctorAppointmentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<IAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/appointments');
      setAppointments(res.data.data.appointments);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleStatusChange = async (
    id: string,
    status: 'Confirmed' | 'Completed' | 'Cancelled'
  ) => {
    try {
      await apiClient.patch(`/appointments/${id}/status`, { status });
      setToastMsg(`Appointment status changed to ${status}.`);
      fetchAppointments();
      setTimeout(() => setToastMsg(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  return (
    <div className="space-y-5 anim-fade-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-slate-900 leading-none">
            Appointments & Schedule
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Day, week & month calendar view with real-time patient status workflows
          </p>
        </div>
      </div>

      {toastMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 anim-pop">
          <CheckCircle size={16} className="text-emerald-600 shrink-0" />
          {toastMsg}
        </div>
      )}

      {/* Interactive Calendar matching screenshot media_1792651876197.png */}
      <InteractiveCalendar
        appointments={appointments}
        onStatusChange={handleStatusChange}
        onViewPatient={() => navigate('/portal/doctor/patients')}
      />
    </div>
  );
};
