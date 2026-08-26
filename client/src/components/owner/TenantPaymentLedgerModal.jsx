import React, { useState, useEffect } from 'react';
import {
  X,
  Receipt,
  User,
  CreditCard,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Edit2,
  Check,
  Loader2,
  Building2,
  Home
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';

export default function TenantPaymentLedgerModal({ studentId, onClose, onDataUpdated }) {
  const { showError, showSuccess } = useToast();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  // Edit fee form
  const [isEditingFee, setIsEditingFee] = useState(false);
  const [monthlyFee, setMonthlyFee] = useState('');
  const [rentDueDay, setRentDueDay] = useState(5);
  const [savingFee, setSavingFee] = useState(false);

  // Record offline payment form
  const [showOfflinePay, setShowOfflinePay] = useState(false);
  const [offlineAmount, setOfflineAmount] = useState('');
  const [offlineMethod, setOfflineMethod] = useState('Cash');
  const [offlineNote, setOfflineNote] = useState('');
  const [recordingOffline, setRecordingOffline] = useState(false);

  useEffect(() => {
    if (studentId) {
      fetchLedger();
    }
  }, [studentId]);

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const res = await api.getOwnerTenantHistory(studentId);
      setData(res);
      if (res.student) {
        setMonthlyFee(String(res.student.monthlyFee || 8000));
        setRentDueDay(res.student.rentDueDay || 5);
        setOfflineAmount(String(res.student.monthlyFee || 8000));
      }
    } catch (err) {
      showError('Failed to load tenant payment history.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateFee = async (e) => {
    e.preventDefault();
    if (!monthlyFee || Number(monthlyFee) <= 0) {
      showError('Please enter a valid monthly fee amount.');
      return;
    }

    setSavingFee(true);
    try {
      const res = await api.updateOwnerTenantFee(studentId, Number(monthlyFee), Number(rentDueDay));
      showSuccess(res.message || 'Monthly fee updated successfully!');
      setIsEditingFee(false);
      fetchLedger();
      if (onDataUpdated) onDataUpdated();
    } catch (err) {
      showError(err.message || 'Failed to update fee.');
    } finally {
      setSavingFee(false);
    }
  };

  const handleRecordOfflinePayment = async (e) => {
    e.preventDefault();
    if (!offlineAmount || Number(offlineAmount) <= 0) {
      showError('Please enter a valid amount.');
      return;
    }

    setRecordingOffline(true);
    try {
      const res = await api.recordOwnerOfflinePayment({
        studentId,
        amount: Number(offlineAmount),
        paymentMethod: offlineMethod,
        referenceNote: offlineNote.trim() || `Marked as paid by owner (${offlineMethod})`,
      });
      showSuccess(res.message || 'Payment recorded successfully!');
      setShowOfflinePay(false);
      fetchLedger();
      if (onDataUpdated) onDataUpdated();
    } catch (err) {
      showError(err.message || 'Failed to record payment.');
    } finally {
      setRecordingOffline(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full my-auto overflow-hidden">
        
        {/* HEADER */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold font-heading">
                {data?.student?.fullName || 'Resident'} - Payment Ledger
              </h3>
              <p className="text-xs text-indigo-300/80">
                Room {data?.student?.roomNumber || 'N/A'} • Bed {data?.student?.bed || 'N/A'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500">Loading ledger data...</p>
          </div>
        ) : (
          <div className="p-5 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
            
            {/* 1. RENT STATUS & ACTION BAR */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs text-slate-400 font-semibold block">Configured Monthly Rent</span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-extrabold text-slate-900 font-heading">
                    ₹{Number(data?.student?.monthlyFee || 8000).toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs text-slate-500">
                    (Due on {data?.student?.rentDueDay || 5}th of every month)
                  </span>
                </div>
                <span className="text-xs text-indigo-600 font-medium block mt-0.5">
                  Next Due: {data?.student?.dueDate || 'N/A'}
                </span>
              </div>

              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setIsEditingFee(!isEditingFee)}
                  className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm"
                >
                  <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>{isEditingFee ? 'Cancel Edit' : 'Edit Rent'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowOfflinePay(!showOfflinePay)}
                  className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-sm shadow-emerald-600/20"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>{showOfflinePay ? 'Cancel' : 'Record Offline Pay'}</span>
                </button>
              </div>
            </div>

            {/* 2. EDIT FEE FORM (Conditional) */}
            {isEditingFee && (
              <form onSubmit={handleUpdateFee} className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100 space-y-3 animate-fade-in">
                <h4 className="text-xs font-bold text-indigo-900">Update Monthly Room Rent</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Monthly Fee (₹) *</label>
                    <input
                      type="number"
                      value={monthlyFee}
                      onChange={(e) => setMonthlyFee(e.target.value)}
                      required
                      min="1"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Rent Due Day (1-31) *</label>
                    <input
                      type="number"
                      value={rentDueDay}
                      onChange={(e) => setRentDueDay(e.target.value)}
                      required
                      min="1"
                      max="31"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={savingFee}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer"
                  >
                    {savingFee ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>Save Changes</span>
                  </button>
                </div>
              </form>
            )}

            {/* 3. RECORD OFFLINE CASH PAYMENT FORM (Conditional) */}
            {showOfflinePay && (
              <form onSubmit={handleRecordOfflinePayment} className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100 space-y-3 animate-fade-in">
                <h4 className="text-xs font-bold text-emerald-900">Record Direct Cash / Bank Payment</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Amount Received (₹) *</label>
                    <input
                      type="number"
                      value={offlineAmount}
                      onChange={(e) => setOfflineAmount(e.target.value)}
                      required
                      min="1"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Payment Method</label>
                    <select
                      value={offlineMethod}
                      onChange={(e) => setOfflineMethod(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Cash">Cash in Hand</option>
                      <option value="Bank Transfer">Bank Transfer (NEFT/IMPS)</option>
                      <option value="Direct UPI">Direct UPI to Personal QR</option>
                      <option value="Cheque">Cheque</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Note / Reference (Optional)</label>
                  <input
                    type="text"
                    value={offlineNote}
                    onChange={(e) => setOfflineNote(e.target.value)}
                    placeholder="e.g. Paid in cash at hostel counter"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={recordingOffline}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer"
                  >
                    {recordingOffline ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    <span>Confirm Offline Payment</span>
                  </button>
                </div>
              </form>
            )}

            {/* 4. CHRONOLOGICAL TRANSACTIONS LEDGER */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Payment History & Receipts ({data?.history?.length || 0})
              </h4>

              {(!data?.history || data.history.length === 0) ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400 text-xs">
                  No payment records found for this tenant yet.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {data.history.map((tx) => (
                    <div
                      key={tx.id}
                      className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-sm flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                          ✓
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">
                              ₹{Number(tx.amount).toLocaleString('en-IN')}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                              {tx.payment_provider || 'UPI'}
                            </span>
                          </div>
                          <p className="text-slate-600 font-medium">{tx.billing_period}</p>
                          <p className="text-[11px] text-slate-400">
                            {tx.payment_date} • {tx.payment_time}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-mono text-[10px] text-slate-500 block">UTR: {tx.transaction_id}</span>
                        {tx.note && <span className="text-[11px] text-slate-400 italic block">{tx.note}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
