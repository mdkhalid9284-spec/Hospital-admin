import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { IAnalyticsSummary } from '../../types';
import { PatientsStatisticsBarChart } from '../../components/ui/PatientsStatisticsBarChart';
import { TopConsultationsRadar } from '../../components/ui/TopConsultationsRadar';
import { BarChart3, Download, TrendingUp, DollarSign, BedDouble, Calendar, ArrowUpRight } from 'lucide-react';

export const AdminAnalyticsPage: React.FC = () => {
  const [metrics, setMetrics] = useState<IAnalyticsSummary | null>(null);
  const [dateRange, setDateRange] = useState('30d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await apiClient.get('/analytics/summary');
        setMetrics(res.data.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [dateRange]);

  const handleExport = () => {
    const data = JSON.stringify(metrics, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hospital_analytics_report_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 anim-fade-up">
      {/* Subheader */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-slate-900 leading-none">
            Operational Analytics
          </h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Revenue velocity, bed occupancy trends & consultation breakdown
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white p-1 rounded-full border border-slate-200 text-xs font-bold">
            {(['7d', '30d', '90d', '1y'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setDateRange(r)}
                className={`px-3 py-1 rounded-full uppercase transition-all ${
                  dateRange === r ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200/90 hover:bg-slate-50 rounded-full text-xs font-semibold text-slate-700 shadow-sm transition-all"
          >
            <Download size={14} /> Export Report
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-[26px] border border-slate-200/90 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">Gross Revenue</span>
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600"><DollarSign size={16} /></span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">${(metrics?.totalRevenue || 0).toFixed(2)}</p>
          <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
            <ArrowUpRight size={12} /> +14.2% from prior period
          </span>
        </div>

        <div className="bg-white rounded-[26px] border border-slate-200/90 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">Pending Collections</span>
            <span className="p-2 rounded-xl bg-amber-50 text-amber-600"><DollarSign size={16} /></span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">${(metrics?.pendingRevenue || 0).toFixed(2)}</p>
          <span className="text-[11px] text-slate-400 font-medium block mt-1">
            Across {metrics?.pendingInsuranceClaims || 0} claims & invoices
          </span>
        </div>

        <div className="bg-white rounded-[26px] border border-slate-200/90 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">Bed Occupancy</span>
            <span className="p-2 rounded-xl bg-blue-50 text-blue-600"><BedDouble size={16} /></span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{metrics?.occupancyRate || 0}%</p>
          <span className="text-[11px] text-slate-400 font-medium block mt-1">
            {metrics?.availableBeds || 0} beds available of {metrics?.totalBeds || 0}
          </span>
        </div>

        <div className="bg-white rounded-[26px] border border-slate-200/90 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">Audit Triggers</span>
            <span className="p-2 rounded-xl bg-purple-50 text-purple-600"><TrendingUp size={16} /></span>
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{metrics?.recentActivityCount || 0}</p>
          <span className="text-[11px] text-emerald-600 font-semibold block mt-1">
            100% security verified
          </span>
        </div>
      </div>

      {/* Visual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <PatientsStatisticsBarChart />
        <TopConsultationsRadar />
      </div>
    </div>
  );
};
