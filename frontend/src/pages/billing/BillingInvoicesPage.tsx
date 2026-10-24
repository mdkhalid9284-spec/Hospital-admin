import React, { useState, useEffect } from 'react';
import { apiClient } from '../../api/client';
import { IBill, IPatient, IBillItem, BillStatus } from '../../types';
import { 
  FileText, Plus, Search, Filter, CheckCircle, 
  AlertTriangle, DollarSign, CreditCard, Printer, X, Trash2
} from 'lucide-react';

export const BillingInvoicesPage: React.FC = () => {
  const [bills, setBills] = useState<IBill[]>([]);
  const [patients, setPatients] = useState<IPatient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedBillForPayment, setSelectedBillForPayment] = useState<IBill | null>(null);
  const [selectedBillForPrint, setSelectedBillForPrint] = useState<IBill | null>(null);

  // New Invoice Form state
  const [newPatientId, setNewPatientId] = useState('');
  const [newDiscount, setNewDiscount] = useState<number>(0);
  const [newTaxRate, setNewTaxRate] = useState<number>(5);
  const [lineItems, setLineItems] = useState<{ description: string; category: string; quantity: number; unitPrice: number }[]>([
    { description: 'Specialist Consultation Fee', category: 'Consultation', quantity: 1, unitPrice: 120 },
  ]);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Payment Form state
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [billsRes, patientsRes] = await Promise.all([
        apiClient.get('/bills'),
        apiClient.get('/patients'),
      ]);
      setBills((billsRes.data.data?.bills ?? billsRes.data.data) || []);
      setPatients((patientsRes.data.data?.patients ?? patientsRes.data.data) || []);
      if (patientsRes.data.data?.length > 0) {
        setNewPatientId(patientsRes.data.data[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load billing invoices');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddLineItem = () => {
    setLineItems([...lineItems, { description: '', category: 'Lab', quantity: 1, unitPrice: 50 }]);
  };

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length === 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleUpdateLineItem = (index: number, field: string, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const calculatedSubtotal = lineItems.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  const calculatedTax = (calculatedSubtotal * (newTaxRate / 100));
  const calculatedTotal = Math.max(0, calculatedSubtotal + calculatedTax - (newDiscount || 0));

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientId) {
      setCreateError('Please select a patient.');
      return;
    }

    for (const item of lineItems) {
      if (!item.description.trim() || item.quantity <= 0 || item.unitPrice <= 0) {
        setCreateError('All items must have a valid description, quantity > 0, and unit price > 0.');
        return;
      }
    }

    try {
      setIsCreating(true);
      setCreateError(null);

      await apiClient.post('/bills', {
        patientId: newPatientId,
        items: lineItems.map((item) => ({
          description: item.description.trim(),
          category: item.category,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        })),
        discount: Number(newDiscount),
        taxRatePercent: Number(newTaxRate),
      });

      setSuccessMsg('Invoice generated and billed successfully.');
      setIsCreateOpen(false);
      setLineItems([{ description: 'Specialist Consultation Fee', category: 'Consultation', quantity: 1, unitPrice: 120 }]);
      fetchData();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create invoice.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBillForPayment || paymentAmount <= 0) {
      setPaymentError('Payment amount must be greater than zero.');
      return;
    }
    if (paymentAmount > selectedBillForPayment.balance) {
      setPaymentError(`Payment amount cannot exceed the remaining balance ($${selectedBillForPayment.balance}).`);
      return;
    }

    try {
      setIsRecordingPayment(true);
      setPaymentError(null);

      await apiClient.post(`/bills/${selectedBillForPayment.id}/payments`, {
        amountPaid: Number(paymentAmount),
      });

      setSuccessMsg(`Payment of $${paymentAmount} recorded successfully.`);
      setSelectedBillForPayment(null);
      setPaymentAmount(0);
      fetchData();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setPaymentError(err.message || 'Failed to record payment.');
    } finally {
      setIsRecordingPayment(false);
    }
  };

  const filteredBills = bills.filter((b) => {
    const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
    const matchesSearch = 
      b.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.billCode.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Patient Invoices & Statements</h1>
          <p className="text-sm text-slate-500 mt-1">
            Generate itemized hospital bills, record partial/full collections, and print official statements.
          </p>
        </div>

        <button
          onClick={() => {
            setCreateError(null);
            setIsCreateOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-md shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" /> Generate Invoice
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Controls Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <Filter className="w-4 h-4 text-slate-400 mr-1 flex-shrink-0" />
          {(['ALL', 'Pending', 'Partially Paid', 'Paid'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                statusFilter === status
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {status === 'ALL' ? 'All Invoices' : status}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by patient or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">Loading invoices...</div>
        ) : filteredBills.length === 0 ? (
          <div className="p-12 text-center text-slate-400">No invoices match your search query.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/75 text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200/60 font-semibold">
                <tr>
                  <th className="py-3.5 px-5">Invoice Code</th>
                  <th className="py-3.5 px-5">Patient</th>
                  <th className="py-3.5 px-5">Date</th>
                  <th className="py-3.5 px-5">Total</th>
                  <th className="py-3.5 px-5">Collected</th>
                  <th className="py-3.5 px-5">Balance</th>
                  <th className="py-3.5 px-5">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBills.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-5 font-mono font-semibold text-slate-900">{b.billCode}</td>
                    <td className="py-4 px-5 font-medium text-slate-800">{b.patientName}</td>
                    <td className="py-4 px-5 text-slate-500">{new Date(b.createdAt).toLocaleDateString()}</td>
                    <td className="py-4 px-5 font-bold text-slate-900">${b.total.toLocaleString()}</td>
                    <td className="py-4 px-5 font-semibold text-emerald-600">${b.amountPaid.toLocaleString()}</td>
                    <td className="py-4 px-5 font-semibold text-amber-600">${b.balance.toLocaleString()}</td>
                    <td className="py-4 px-5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        b.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                        b.status === 'Partially Paid' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                        'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right space-x-2 whitespace-nowrap">
                      {b.balance > 0 && (
                        <button
                          onClick={() => {
                            setSelectedBillForPayment(b);
                            setPaymentAmount(b.balance);
                            setPaymentError(null);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold transition-colors"
                        >
                          Record Payment
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedBillForPrint(b)}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                      >
                        Print / View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Invoice Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Generate New Hospital Invoice</h3>
                  <p className="text-xs text-slate-500">Calculate itemized medical services and pharmacy orders</p>
                </div>
              </div>
              <button 
                onClick={() => setIsCreateOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="mt-4 space-y-4 text-xs">
              {createError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Patient</label>
                <select
                  value={newPatientId}
                  onChange={(e) => setNewPatientId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} ({p.patientCode}) - {p.phone}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dynamic Line Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="font-semibold text-slate-700">Line Items & Services</label>
                  <button
                    type="button"
                    onClick={handleAddLineItem}
                    className="text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Item
                  </button>
                </div>

                <div className="space-y-2">
                  {lineItems.map((item, index) => (
                    <div key={index} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <input
                        type="text"
                        placeholder="Item Description (e.g. CBC Blood Panel)"
                        value={item.description}
                        onChange={(e) => handleUpdateLineItem(index, 'description', e.target.value)}
                        required
                        className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      />
                      <select
                        value={item.category}
                        onChange={(e) => handleUpdateLineItem(index, 'category', e.target.value)}
                        className="w-28 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                      >
                        <option value="Consultation">Consultation</option>
                        <option value="Lab">Lab / Test</option>
                        <option value="Bed">Bed Charge</option>
                        <option value="Pharmacy">Pharmacy</option>
                        <option value="Surgery">Procedure</option>
                        <option value="Other">Other</option>
                      </select>
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => handleUpdateLineItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-14 px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-center"
                      />
                      <div className="relative w-20">
                        <span className="absolute left-2 top-1.5 text-slate-400">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Price"
                          value={item.unitPrice}
                          onChange={(e) => handleUpdateLineItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-full pl-5 pr-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveLineItem(index)}
                        disabled={lineItems.length === 1}
                        className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tax & Discount */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tax Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newTaxRate}
                    onChange={(e) => setNewTaxRate(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Discount ($)</label>
                  <input
                    type="number"
                    min="0"
                    value={newDiscount}
                    onChange={(e) => setNewDiscount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Total Summary Preview */}
              <div className="bg-slate-50 rounded-2xl p-4 space-y-1.5 border border-slate-200/60">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal:</span>
                  <span>${calculatedSubtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Tax ({newTaxRate}%):</span>
                  <span>+${calculatedTax.toFixed(2)}</span>
                </div>
                {newDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount:</span>
                    <span>-${Number(newDiscount).toFixed(2)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900 text-sm">
                  <span>Total Calculated:</span>
                  <span>${calculatedTotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-md shadow-blue-500/20 disabled:opacity-50"
                >
                  {isCreating ? 'Generating...' : 'Confirm & Bill'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {selectedBillForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Record Payment</h3>
                  <p className="text-xs text-slate-500">Receipt for {selectedBillForPayment.billCode}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedBillForPayment(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="mt-4 space-y-4 text-xs">
              {paymentError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{paymentError}</span>
                </div>
              )}

              <div className="bg-slate-50 p-4 rounded-2xl space-y-2">
                <div className="flex justify-between text-slate-600">
                  <span>Patient:</span>
                  <span className="font-bold text-slate-800">{selectedBillForPayment.patientName}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Total Invoiced:</span>
                  <span>${selectedBillForPayment.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Already Paid:</span>
                  <span className="text-emerald-600 font-semibold">${selectedBillForPayment.amountPaid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-900 font-bold pt-2 border-t border-slate-200">
                  <span>Remaining Balance:</span>
                  <span className="text-amber-600">${selectedBillForPayment.balance.toFixed(2)}</span>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Amount Received ($)</label>
                <input
                  type="number"
                  min="0.01"
                  max={selectedBillForPayment.balance}
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-emerald-600"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedBillForPayment(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRecordingPayment || paymentAmount <= 0}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-md shadow-emerald-500/20 disabled:opacity-50"
                >
                  {isRecordingPayment ? 'Processing...' : 'Apply Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Invoice Modal */}
      {selectedBillForPrint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">HospitalCare Clinical Invoice</h3>
                  <p className="text-xs font-mono text-slate-400">INVOICE: {selectedBillForPrint.billCode}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
                <button 
                  onClick={() => setSelectedBillForPrint(null)}
                  className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block uppercase tracking-wider font-semibold">Patient Name</span>
                  <span className="font-bold text-slate-800 text-sm mt-0.5 block">{selectedBillForPrint.patientName}</span>
                  <span className="text-slate-500 font-mono mt-0.5 block">ID: {selectedBillForPrint.patientId}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block uppercase tracking-wider font-semibold">Invoice Date</span>
                  <span className="font-semibold text-slate-800 text-sm mt-0.5 block">
                    {new Date(selectedBillForPrint.createdAt).toLocaleDateString()}
                  </span>
                  <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    selectedBillForPrint.status === 'Paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                  }`}>
                    {selectedBillForPrint.status}
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4">Description</th>
                      <th className="py-2.5 px-4">Category</th>
                      <th className="py-2.5 px-4 text-center">Qty</th>
                      <th className="py-2.5 px-4 text-right">Price</th>
                      <th className="py-2.5 px-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedBillForPrint.items.map((item) => (
                      <tr key={item.id}>
                        <td className="py-3 px-4 font-medium text-slate-800">{item.description}</td>
                        <td className="py-3 px-4 text-slate-500">{item.category}</td>
                        <td className="py-3 px-4 text-center text-slate-700">{item.quantity}</td>
                        <td className="py-3 px-4 text-right text-slate-700">${item.unitPrice.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-900">${item.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Breakdown */}
              <div className="bg-slate-50 rounded-2xl p-4 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>${selectedBillForPrint.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tax (5%):</span>
                  <span>+${selectedBillForPrint.tax.toFixed(2)}</span>
                </div>
                {selectedBillForPrint.discount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount:</span>
                    <span>-${selectedBillForPrint.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200 flex justify-between text-base font-bold text-slate-900">
                  <span>Total Amount:</span>
                  <span>${selectedBillForPrint.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Paid:</span>
                  <span className="text-emerald-600 font-semibold">${selectedBillForPrint.amountPaid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-800 font-bold border-t border-slate-200/60 pt-1">
                  <span>Balance Due:</span>
                  <span className="text-amber-600">${selectedBillForPrint.balance.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedBillForPrint(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default BillingInvoicesPage;
