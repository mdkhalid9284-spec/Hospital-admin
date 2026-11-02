import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { IBill, IInsuranceClaim, IPatient } from '../types';
import { useAuth } from '../context/AuthContext';
import { Receipt, Plus, FileCheck, X, Wallet, Clock, CheckCircle2 } from 'lucide-react';
import { Card, PageHeader, StatusBadge, Avatar, EmptyState, Modal, ModalHeader, Tabs, Field, inputCls, Badge } from '../components/ui/primitives';

export const BillingPage: React.FC = () => {
  const { user } = useAuth();
  const [bills, setBills] = useState<IBill[]>([]);
  const [claims, setClaims] = useState<IInsuranceClaim[]>([]);
  const [patients, setPatients] = useState<IPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('invoices');
  const [statusF, setStatusF] = useState('all');

  const [showBill, setShowBill] = useState(false);
  const [billForm, setBillForm] = useState({ patientId: '', discount: 0, taxRatePercent: 5, items: [{ description: 'General Consultation', category: 'Consultation', quantity: 1, unitPrice: 100 }] });
  const [paying, setPaying] = useState<IBill | null>(null);
  const [payAmt, setPayAmt] = useState(0);
  const [showClaim, setShowClaim] = useState(false);
  const [claimForm, setClaimForm] = useState({ patientId: '', billId: '', provider: 'Blue Cross Healthcare', policyNumber: 'BCBS-100293-IL', claimAmount: 500, remarks: 'Hospital care claim' });
  const [modalError, setModalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [detail, setDetail] = useState<IBill | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [b, c] = await Promise.all([
        apiClient.get('/bills'),
        apiClient.get('/insurance'),
      ]);
      setBills(b.data.data.bills);
      setClaims(c.data.data.claims);
      // Patient list is admin/billing/doctor only — patients must still see their own bills
      try {
        const p = await apiClient.get('/patients');
        setPatients(p.data.data.patients || []);
      } catch {
        setPatients([]);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const totals = {
    billed: bills.reduce((s, b) => s + b.total, 0),
    collected: bills.reduce((s, b) => s + b.amountPaid, 0),
    due: bills.reduce((s, b) => s + b.balance, 0),
  };

  const invoiceList = bills.filter((b) => statusF === 'all' || b.status === statusF);

  const createBill = async (e: React.FormEvent) => {
    e.preventDefault(); setModalError(null); setSubmitting(true);
    try {
      await apiClient.post('/bills', { patientId: billForm.patientId, items: billForm.items.map((i) => ({ ...i, quantity: Number(i.quantity), unitPrice: Number(i.unitPrice) })), discount: Number(billForm.discount), taxRatePercent: Number(billForm.taxRatePercent) });
      setShowBill(false);
      setBillForm({ patientId: '', discount: 0, taxRatePercent: 5, items: [{ description: 'General Consultation', category: 'Consultation', quantity: 1, unitPrice: 100 }] });
      fetchData();
    } catch (e: any) { setModalError(e.message || 'Failed to create bill'); }
    finally { setSubmitting(false); }
  };

  const recordPay = async (e: React.FormEvent) => {
    e.preventDefault(); if (!paying) return;
    setModalError(null); setSubmitting(true);
    try {
      await apiClient.post(`/bills/${paying.id}/payments`, { amountPaid: Number(payAmt) });
      setPaying(null); fetchData();
    } catch (e: any) { setModalError(e.message || 'Failed to record payment'); }
    finally { setSubmitting(false); }
  };

  const submitClaim = async (e: React.FormEvent) => {
    e.preventDefault(); setModalError(null); setSubmitting(true);
    try {
      await apiClient.post('/insurance/claims', { ...claimForm, claimAmount: Number(claimForm.claimAmount) });
      setShowClaim(false); fetchData();
    } catch (e: any) { setModalError(e.message || 'Failed to submit claim'); }
    finally { setSubmitting(false); }
  };

  const canEdit = user?.role === 'admin' || user?.role === 'billing';
  const liveTotal = billForm.items.reduce((s, i) => s + Number(i.quantity || 0) * Number(i.unitPrice || 0), 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Billing & Insurance"
        subtitle="Authoritative server-side totals · line items, tax, discounts and claim lifecycle"
        icon={<Receipt size={18} />}
        actions={canEdit ? <><button onClick={() => setShowClaim(true)} className="hc-btn-dark !py-2.5 text-[13px]"><FileCheck size={15} className="text-[#C7FF75]" /> Insurance Claim</button><button onClick={() => setShowBill(true)} className="hc-btn-blue !py-2.5 text-[13px]"><Plus size={15} /> New Invoice</button></> : undefined}
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 stagger">
        <Card className="p-5"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total billed</p><p className="text-[26px] font-bold text-slate-900 mt-1 tabular-nums">${totals.billed.toFixed(2)}</p><p className="text-xs text-slate-500">{bills.length} invoice(s)</p></Card>
        <Card className="p-5 !border-emerald-200 !bg-emerald-50/40"><p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1"><CheckCircle2 size={12} /> Collected</p><p className="text-[26px] font-bold text-emerald-600 mt-1 tabular-nums">${totals.collected.toFixed(2)}</p><p className="text-xs text-emerald-700/70">Realized receipts</p></Card>
        <Card className="p-5 !bg-slate-900 !border-slate-900 text-white"><p className="text-[11px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1"><Clock size={12} /> Outstanding</p><p className="text-[26px] font-bold mt-1 tabular-nums">${totals.due.toFixed(2)}</p><div className="h-1.5 bg-white/15 rounded-full mt-2 overflow-hidden"><div className="h-full bg-amber-400 rounded-full" style={{ width: `${totals.billed ? (totals.due / totals.billed) * 100 : 0}%` }} /></div></Card>
      </div>

      <Tabs tabs={[{ id: 'invoices', label: 'Invoices', count: bills.length }, { id: 'claims', label: 'Insurance Claims', count: claims.length }]} active={tab} onChange={setTab} />

      {tab === 'invoices' && (
        <Card className="overflow-hidden">
          <div className="px-4 pt-4 flex flex-wrap gap-2">
            {['all', 'Pending', 'Partially Paid', 'Paid'].map((s) => (
              <button key={s} onClick={() => setStatusF(s)} className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${statusF === s ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'}`}>{s === 'all' ? 'All' : s}</button>
            ))}
          </div>
          {loading ? <div className="p-4 space-y-2">{[0,1,2].map((i) => <div key={i} className="skeleton h-16 !rounded-xl" />)}</div>
          : invoiceList.length === 0 ? <EmptyState icon={<Wallet size={20} />} title="No invoices" hint="Generate the first invoice to start the revenue cycle." />
          : (
            <>
              <div className="hidden md:block overflow-x-auto mt-2">
                <table className="w-full hc-table">
                  <thead><tr><th>Invoice</th><th>Patient</th><th className="!text-right">Total</th><th className="!text-right">Paid / Due</th><th>Status</th><th className="!text-right">Action</th></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoiceList.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/70 cursor-pointer" onClick={() => setDetail(b)}>
                        <td className="font-mono text-xs font-bold text-[#0B3D20]">{b.billCode}</td>
                        <td><div className="flex items-center gap-2"><Avatar name={b.patientName} size="sm" /><span className="font-bold text-[13px] text-slate-900">{b.patientName}</span></div></td>
                        <td className="!text-right font-bold text-slate-900 tabular-nums">${b.total.toFixed(2)}</td>
                        <td className="!text-right text-xs tabular-nums"><span className="text-emerald-600 font-bold">${b.amountPaid.toFixed(2)}</span> <span className="text-slate-300">/</span> <span className="text-rose-600 font-bold">${b.balance.toFixed(2)}</span></td>
                        <td><StatusBadge status={b.status} /></td>
                        <td className="!text-right" onClick={(e) => e.stopPropagation()}>
                          {b.status !== 'Paid' && canEdit && <button onClick={() => { setPaying(b); setPayAmt(b.balance); }} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl">Collect</button>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="md:hidden divide-y divide-slate-100">
                {invoiceList.map((b) => (
                  <button key={b.id} onClick={() => setDetail(b)} className="w-full text-left p-4 active:bg-slate-50">
                    <div className="flex items-center justify-between gap-2"><span className="font-mono text-xs font-bold text-[#0B3D20]">{b.billCode}</span><StatusBadge status={b.status} /></div>
                    <p className="font-bold text-[14px] text-slate-900 mt-1">{b.patientName}</p>
                    <p className="text-xs text-slate-500 tabular-nums mt-0.5">Total ${b.total.toFixed(2)} · <span className="text-rose-600 font-bold">Due ${b.balance.toFixed(2)}</span></p>
                  </button>
                ))}
              </div>
            </>
          )}
        </Card>
      )}

      {tab === 'claims' && (
        <Card className="overflow-hidden">
          {claims.length === 0 ? <EmptyState icon={<FileCheck size={20} />} title="No claims submitted" hint="File insurer claims against unpaid invoices." />
          : <div className="overflow-x-auto"><table className="w-full hc-table min-w-[640px]">
            <thead><tr><th>Claim</th><th>Patient</th><th>Insurer</th><th className="!text-right">Amount</th><th>Status</th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {claims.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/70">
                  <td className="font-mono text-xs font-bold text-violet-700">{c.claimCode}</td>
                  <td className="font-bold text-[13px] text-slate-900">{c.patientName}</td>
                  <td className="text-xs"><p className="font-bold text-slate-800">{c.provider}</p><p className="text-slate-400 font-mono">{c.policyNumber}</p></td>
                  <td className="!text-right font-bold tabular-nums">${c.claimAmount.toFixed(2)}</td>
                  <td><StatusBadge status={c.status} /></td>
                </tr>
              ))}
            </tbody>
          </table></div>}
        </Card>
      )}

      {/* Invoice detail drawer */}
      {detail && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-slate-950/50" onClick={() => setDetail(null)} />
          <aside className="absolute right-0 top-0 bottom-0 w-full sm:w-[480px] bg-white shadow-2xl overflow-y-auto anim-drawer">
            <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/60">
              <div><p className="font-mono text-xs font-bold text-[#14532D]">{detail.billCode}</p><h3 className="text-lg font-bold text-slate-900">{detail.patientName}</h3><StatusBadge status={detail.status} /></div>
              <button onClick={() => setDetail(null)} className="hc-icon-btn !w-8 !h-8"><X size={14} /></button>
            </div>
            <div className="p-6">
              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 grid grid-cols-[1fr_52px_76px_76px] gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400"><span>Item</span><span className="text-right">Qty</span><span className="text-right">Unit</span><span className="text-right">Amount</span></div>
                {detail.items.map((it) => <div key={it.id} className="px-4 py-2.5 grid grid-cols-[1fr_52px_76px_76px] gap-2 text-[13px] border-t border-slate-100"><span><b className="text-slate-900">{it.description}</b><br /><span className="text-[11px] text-slate-400">{it.category}</span></span><span className="text-right tabular-nums">×{it.quantity}</span><span className="text-right tabular-nums">${it.unitPrice.toFixed(2)}</span><span className="text-right font-bold tabular-nums">${it.amount.toFixed(2)}</span></div>)}
              </div>
              <div className="mt-4 space-y-1.5 text-[13px] tabular-nums">
                <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>${detail.subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-slate-500"><span>Discount</span><span>−${detail.discount.toFixed(2)}</span></div>
                <div className="flex justify-between text-slate-500"><span>Tax</span><span>${detail.tax.toFixed(2)}</span></div>
                <div className="flex justify-between text-lg font-bold text-slate-900 pt-2 border-t border-slate-200"><span>Total</span><span>${detail.total.toFixed(2)}</span></div>
                <div className="flex justify-between text-emerald-600 font-bold"><span>Paid</span><span>${detail.amountPaid.toFixed(2)}</span></div>
                <div className="flex justify-between text-rose-600 font-bold"><span>Balance due</span><span>${detail.balance.toFixed(2)}</span></div>
              </div>
              {detail.status !== 'Paid' && canEdit && <button onClick={() => { setPaying(detail); setPayAmt(detail.balance); setDetail(null); }} className="hc-btn-blue w-full mt-5">Record Payment</button>}
            </div>
          </aside>
        </div>
      )}

      <Modal open={showBill} onClose={() => setShowBill(false)} width="max-w-xl">
        <ModalHeader title="Generate invoice" subtitle="Line items compute server-side with tax and discount" onClose={() => setShowBill(false)} />
        <form onSubmit={createBill} className="p-6 space-y-4">
          {modalError && <div className="p-2.5 bg-rose-50 text-rose-700 text-xs rounded-xl">{modalError}</div>}
          <Field label="Patient *"><select required value={billForm.patientId} onChange={(e) => setBillForm({ ...billForm, patientId: e.target.value })} className={inputCls}><option value="">Choose patient…</option>{patients.map((p) => <option key={p.id} value={p.id}>{p.fullName} ({p.patientCode})</option>)}</select></Field>
          <div className="space-y-2">
            <div className="flex items-center justify-between"><span className="hc-label !mb-0">Line items</span><button type="button" onClick={() => setBillForm({ ...billForm, items: [...billForm.items, { description: '', category: 'Services', quantity: 1, unitPrice: 50 }] })} className="text-xs font-bold text-[#14532D] hover:underline">+ Add item</button></div>
            {billForm.items.map((it, idx) => (
              <div key={idx} className="p-2.5 bg-slate-50 rounded-2xl border border-slate-200 flex gap-2">
                <input required value={it.description} onChange={(e) => { const u = [...billForm.items]; u[idx].description = e.target.value; setBillForm({ ...billForm, items: u }); }} placeholder="Description" className="flex-1 min-w-0 px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-[13px]" />
                <input type="number" min={1} value={it.quantity} onChange={(e) => { const u = [...billForm.items]; u[idx].quantity = Number(e.target.value); setBillForm({ ...billForm, items: u }); }} className="w-14 px-2 py-2 bg-white border border-slate-200 rounded-xl text-[13px] tabular-nums" title="Qty" />
                <input type="number" min={0} step="0.01" value={it.unitPrice} onChange={(e) => { const u = [...billForm.items]; u[idx].unitPrice = Number(e.target.value); setBillForm({ ...billForm, items: u }); }} className="w-20 px-2 py-2 bg-white border border-slate-200 rounded-xl text-[13px] tabular-nums" title="Unit price" />
              </div>
            ))}
            <p className="text-right text-[13px] font-bold text-slate-900 tabular-nums">Subtotal ≈ ${liveTotal.toFixed(2)}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Discount ($)"><input type="number" min={0} value={billForm.discount} onChange={(e) => setBillForm({ ...billForm, discount: Number(e.target.value) || 0 })} className={inputCls} /></Field>
            <Field label="Tax rate (%)"><input type="number" min={0} max={100} value={billForm.taxRatePercent} onChange={(e) => setBillForm({ ...billForm, taxRatePercent: Number(e.target.value) || 0 })} className={inputCls} /></Field>
          </div>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowBill(false)} className="hc-btn-ghost">Cancel</button><button type="submit" disabled={submitting} className="hc-btn-blue">{submitting ? 'Creating…' : 'Create Invoice'}</button></div>
        </form>
      </Modal>

      <Modal open={!!paying} onClose={() => setPaying(null)} width="max-w-sm">
        <ModalHeader title="Record payment" subtitle={paying ? `${paying.patientName} · ${paying.billCode}` : ''} onClose={() => setPaying(null)} />
        <form onSubmit={recordPay} className="p-6 space-y-4">
          {paying && <div className="p-3.5 bg-slate-50 rounded-2xl border text-[13px] space-y-1 tabular-nums"><div className="flex justify-between"><span>Total</span><b>${paying.total.toFixed(2)}</b></div><div className="flex justify-between text-rose-600"><span>Due</span><b>${paying.balance.toFixed(2)}</b></div></div>}
          {modalError && <div className="p-2.5 bg-rose-50 text-rose-700 text-xs rounded-xl">{modalError}</div>}
          <Field label="Amount ($) *"><input type="number" step="0.01" min={0.01} max={paying?.balance} required value={payAmt} onChange={(e) => setPayAmt(Number(e.target.value))} className={`${inputCls} font-bold tabular-nums`} /></Field>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setPaying(null)} className="hc-btn-ghost">Cancel</button><button type="submit" disabled={submitting} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm">{submitting ? 'Processing…' : 'Confirm'}</button></div>
        </form>
      </Modal>

      <Modal open={showClaim} onClose={() => setShowClaim(false)} width="max-w-md">
        <ModalHeader title="Submit insurance claim" subtitle="Link an unpaid invoice to a policy" onClose={() => setShowClaim(false)} />
        <form onSubmit={submitClaim} className="p-6 space-y-3.5">
          {modalError && <div className="p-2.5 bg-rose-50 text-rose-700 text-xs rounded-xl">{modalError}</div>}
          <Field label="Patient *"><select required value={claimForm.patientId} onChange={(e) => setClaimForm({ ...claimForm, patientId: e.target.value })} className={inputCls}><option value="">Choose…</option>{patients.map((p) => <option key={p.id} value={p.id}>{p.fullName}</option>)}</select></Field>
          <Field label="Invoice *"><select required value={claimForm.billId} onChange={(e) => setClaimForm({ ...claimForm, billId: e.target.value })} className={inputCls}><option value="">Choose…</option>{bills.map((b) => <option key={b.id} value={b.id}>{b.billCode} — ${b.balance.toFixed(2)} due</option>)}</select></Field>
          <div className="grid grid-cols-2 gap-2.5">
            <Field label="Provider *"><input required value={claimForm.provider} onChange={(e) => setClaimForm({ ...claimForm, provider: e.target.value })} className={inputCls} /></Field>
            <Field label="Policy # *"><input required value={claimForm.policyNumber} onChange={(e) => setClaimForm({ ...claimForm, policyNumber: e.target.value })} className={inputCls} /></Field>
          </div>
          <Field label="Claim amount *"><input type="number" step="0.01" required value={claimForm.claimAmount} onChange={(e) => setClaimForm({ ...claimForm, claimAmount: Number(e.target.value) })} className={inputCls} /></Field>
          <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowClaim(false)} className="hc-btn-ghost">Cancel</button><button type="submit" disabled={submitting} className="hc-btn-blue">{submitting ? 'Submitting…' : 'Submit Claim'}</button></div>
        </form>
      </Modal>
    </div>
  );
  void Badge;
};
