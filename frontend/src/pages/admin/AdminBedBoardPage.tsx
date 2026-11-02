import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { IWard, IBed } from '../../types';
import { BedDouble, CheckCircle, AlertCircle, Clock, User, ShieldCheck, RefreshCw } from 'lucide-react';
import { Modal, ModalHeader, Field, inputCls } from '../../components/ui/primitives';

export const AdminBedBoardPage: React.FC = () => {
  const [wards, setWards] = useState<IWard[]>([]);
  const [stats, setStats] = useState({ totalBeds: 0, availableBeds: 0, occupiedBeds: 0, occupancyRate: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedBed, setSelectedBed] = useState<{ ward: IWard; bed: IBed; roomNumber: string } | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const fetchBoard = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/beds/board');
      setWards(res.data.data.wards);
      setStats(res.data.data.stats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoard();
  }, []);

  const handleUpdateBedStatus = async (newStatus: 'Available' | 'Reserved') => {
    if (!selectedBed) return;
    try {
      await apiClient.patch('/beds/status', {
        wardId: selectedBed.ward.id,
        roomNumber: selectedBed.roomNumber,
        bedNumber: selectedBed.bed.bedNumber,
        status: newStatus,
      });
      setSelectedBed(null);
      setToastMsg(`Bed ${selectedBed.bed.bedNumber} status updated to ${newStatus}.`);
      fetchBoard();
      setTimeout(() => setToastMsg(null), 3500);
    } catch (err: any) {
      alert(err.message || 'Failed to update bed');
    }
  };

  return (
    <div className="space-y-5 anim-fade-up">
      {/* Subheader */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-slate-900 leading-none">
            Interactive Bed Board
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Real-time ward & room matrix with atomic concurrency locks
          </p>
        </div>

        <button
          onClick={fetchBoard}
          className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200/90 hover:bg-slate-50 rounded-full text-xs font-semibold text-slate-700 shadow-sm transition-all"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh Board
        </button>
      </div>

      {toastMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 anim-pop">
          <CheckCircle size={16} className="text-emerald-600 shrink-0" />
          {toastMsg}
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-[24px] border border-slate-200/90 p-4 shadow-sm">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Capacity</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totalBeds} Beds</p>
        </div>
        <div className="bg-white rounded-[24px] border border-slate-200/90 p-4 shadow-sm">
          <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Available Now</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.availableBeds} Beds</p>
        </div>
        <div className="bg-white rounded-[24px] border border-slate-200/90 p-4 shadow-sm">
          <p className="text-[11px] font-bold text-rose-500 uppercase tracking-wider">Occupied Beds</p>
          <p className="text-2xl font-bold text-rose-600 mt-1">{stats.occupiedBeds} Beds</p>
        </div>
        <div className="bg-white rounded-[24px] border border-slate-200/90 p-4 shadow-sm">
          <p className="text-[11px] font-bold text-[#14532D] uppercase tracking-wider">Occupancy Rate</p>
          <p className="text-2xl font-bold text-[#0B3D20] mt-1">{stats.occupancyRate}%</p>
        </div>
      </div>

      {/* Legend */}
      <div className="bg-white/80 rounded-2xl p-3 border border-slate-200/80 flex flex-wrap items-center gap-4 text-xs font-semibold">
        <span className="text-slate-400 uppercase tracking-wider text-[10.5px]">Bed Statuses:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0 shadow-sm" />
          <span className="text-slate-700">Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-rose-500 shrink-0 shadow-sm" />
          <span className="text-slate-700">Occupied (Inpatient)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-500 shrink-0 shadow-sm" />
          <span className="text-slate-700">Reserved / Maintenance</span>
        </div>
      </div>

      {/* Wards Matrix */}
      <div className="space-y-5">
        {wards.map((ward) => (
          <div
            key={ward.id}
            className="bg-white rounded-[28px] border border-slate-200/90 p-6 shadow-[0_4px_24px_-4px_rgba(15,23,42,0.06)]"
          >
            {/* Ward Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <BedDouble size={18} className="text-[#14532D]" />
                  {ward.name}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 font-medium">
                  {ward.type} Ward · {ward.totalBeds} total beds
                </p>
              </div>

              {/* Occupancy Pill Progress */}
              <div className="flex items-center gap-3">
                <div className="w-32 sm:w-44 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#14532D] rounded-full transition-all duration-500"
                    style={{ width: `${ward.totalBeds > 0 ? (ward.occupiedBeds / ward.totalBeds) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-slate-700">
                  {ward.occupiedBeds}/{ward.totalBeds} Occupied
                </span>
              </div>
            </div>

            {/* Rooms Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
              {ward.rooms.map((room) => (
                <div
                  key={room.roomNumber}
                  className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-slate-700">
                      Room {room.roomNumber}
                    </span>
                    <span className="text-[10px] text-slate-400 font-semibold">
                      {room.beds.length} beds
                    </span>
                  </div>

                  {/* Bed Chips */}
                  <div className="grid grid-cols-2 gap-2">
                    {room.beds.map((bed) => {
                      const isAvailable = bed.status === 'Available';
                      const isOccupied = bed.status === 'Occupied';

                      const chipCls = isAvailable
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:border-emerald-400'
                        : isOccupied
                        ? 'bg-rose-50 border-rose-200 text-rose-800 hover:border-rose-400'
                        : 'bg-amber-50 border-amber-200 text-amber-800 hover:border-amber-400';

                      return (
                        <button
                          key={bed.bedNumber}
                          onClick={() => setSelectedBed({ ward, bed, roomNumber: room.roomNumber })}
                          className={`p-2.5 rounded-xl border text-left transition-all duration-200 hover:scale-[1.02] shadow-sm ${chipCls}`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-xs truncate">{bed.bedNumber}</span>
                            <span
                              className={`w-2 h-2 rounded-full ${
                                isAvailable
                                  ? 'bg-emerald-500'
                                  : isOccupied
                                  ? 'bg-rose-500'
                                  : 'bg-amber-500'
                              }`}
                            />
                          </div>
                          {isOccupied ? (
                            <p className="text-[10.5px] font-semibold text-rose-900 truncate">
                              {bed.currentPatientName || 'Patient'}
                            </p>
                          ) : (
                            <p className="text-[10.5px] font-medium text-emerald-700">
                              Ready for Care
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Bed Detail Modal */}
      {selectedBed && (
        <Modal open={true} onClose={() => setSelectedBed(null)}>
          <ModalHeader
            title={`Bed Inspection: ${selectedBed.bed.bedNumber}`}
            subtitle={`${selectedBed.ward.name} · Room ${selectedBed.roomNumber}`}
            onClose={() => setSelectedBed(null)}
          />
          <div className="p-6 space-y-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400">Current Status</p>
                <p className="font-bold text-sm text-slate-900 mt-0.5">{selectedBed.bed.status}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400">Ward Type</p>
                <p className="font-bold text-sm text-slate-900 mt-0.5">{selectedBed.ward.type}</p>
              </div>
              {selectedBed.bed.status === 'Occupied' && (
                <>
                  <div className="col-span-2 pt-2 border-t border-slate-200/60">
                    <p className="text-[10px] font-bold uppercase text-slate-400">Admitted Inpatient</p>
                    <p className="font-bold text-sm text-slate-900 mt-0.5">{selectedBed.bed.currentPatientName}</p>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">Admission #{selectedBed.bed.currentAdmissionId}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase text-slate-400">Allocated At</p>
                    <p className="font-semibold text-slate-700 mt-0.5">
                      {selectedBed.bed.allocatedAt ? new Date(selectedBed.bed.allocatedAt).toLocaleString() : '—'}
                    </p>
                  </div>
                </>
              )}
            </div>

            {selectedBed.bed.status === 'Available' ? (
              <div className="space-y-2 pt-2">
                <button
                  onClick={() => handleUpdateBedStatus('Reserved')}
                  className="w-full py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-full font-bold text-xs transition-colors"
                >
                  Reserve Bed / Place Under Sanitization
                </button>
              </div>
            ) : selectedBed.bed.status === 'Reserved' ? (
              <div className="space-y-2 pt-2">
                <button
                  onClick={() => handleUpdateBedStatus('Available')}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-bold text-xs transition-colors shadow-sm"
                >
                  Release to Available Pool
                </button>
              </div>
            ) : null}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedBed(null)}
                className="hc-btn-ghost"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
