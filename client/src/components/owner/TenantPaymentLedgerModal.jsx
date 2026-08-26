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
  Home,
  ArrowLeft,
  DollarSign,
  Printer,
  ChevronRight,
  ShieldCheck,
  Smartphone
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

  // Receipt Modal
  const [selectedReceipt, setSelectedReceipt] = useState(null);

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
      setOfflineNote('');
      fetchLedger();
      if (onDataUpdated) onDataUpdated();
    } catch (err) {
      showError(err.message || 'Failed to record offline payment.');
    } finally {
      setRecordingOffline(false);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center text-white p-6 animate-fade-in">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-400">Loading student payment ledger...</p>
      </div>
    );
  }

  if (!data || !data.student) return null;

  const student = data.student;
  const history = data.history || [];
  const statusInfo = data.statusInfo || {};

  const totalPaid = history
    .filter((h) => h.status === 'success' || h.status === 'paid')
    .reduce((sum, h) => sum + Number(h.amount || 0), 0);

  const totalDue = statusInfo.status === 'paid' ? 0 : Number(student.monthlyFee || 8000);
  const paymentsCount = history.length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col overflow-y-auto animate-fade-in">
      
      {/* 1. TOP STICKY HEADER BAR */}
      <div className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        
        <div className="flex items-center gap-3.5 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
            title="Back to All Residents"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>All Residents</span>
          </button>

          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md shrink-0">
              {student.fullName?.charAt(0) || 'R'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-xl font-extrabold text-white font-heading truncate">
                  {student.fullName}
                </h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider ${
                    statusInfo.status === 'paid'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : statusInfo.status === 'overdue'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {statusInfo.status === 'paid' ? 'Paid ✓' : statusInfo.statusLabel || 'Due'}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">
                Room {student.roomNumber || '204'} • Bed {student.bed || 'B'} • {student.mobile}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setIsEditingFee(!isEditingFee)}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <Edit2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Edit Monthly Fee</span>
          </button>

          <button
            type="button"
            onClick={() => setShowOfflinePay(true)}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Record Offline Rent</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

      </div>

      {/* 2. FULL-SCREEN CONTENT AREA */}
      <main className="max-w-6xl mx-auto w-full p-4 sm:p-8 space-y-6 pb-24">
        
        {/* EDIT MONTHLY FEE PANEL (Expandable) */}
        {isEditingFee && (
          <form onSubmit={handleUpdateFee} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl animate-fade-in space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white font-heading">Update Monthly Rent for {student.fullName}</h3>
              <button
                type="button"
                onClick={() => setIsEditingFee(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Monthly Rent (₹) *
                </label>
                <input
                  type="number"
                  value={monthlyFee}
                  onChange={(e) => setMonthlyFee(e.target.value)}
                  required
                  min="100"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-bold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Monthly Due Day of Month (1 - 28) *
                </label>
                <input
                  type="number"
                  value={rentDueDay}
                  onChange={(e) => setRentDueDay(Number(e.target.value))}
                  required
                  min="1"
                  max="28"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-bold focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="submit"
                disabled={savingFee}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                {savingFee ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Save Fee Changes</span>
              </button>
            </div>
          </form>
        )}

        {/* RECORD OFFLINE RENT PANEL (Expandable) */}
        {showOfflinePay && (
          <form onSubmit={handleRecordOfflinePayment} className="bg-slate-900 border border-emerald-800/60 rounded-3xl p-5 sm:p-6 shadow-xl animate-fade-in space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white font-heading">Record Cash / Bank / UPI Payment</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowOfflinePay(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Amount Received (₹) *
                </label>
                <input
                  type="number"
                  value={offlineAmount}
                  onChange={(e) => setOfflineAmount(e.target.value)}
                  required
                  min="1"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Payment Method *
                </label>
                <select
                  value={offlineMethod}
                  onChange={(e) => setOfflineMethod(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Cash">Cash In Hand</option>
                  <option value="Direct UPI">Direct UPI / QR</option>
                  <option value="Bank Transfer">Bank NEFT / IMPS</option>
                  <option value="Cheque">Bank Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Remark / Reference Note (Optional)
                </label>
                <input
                  type="text"
                  value={offlineNote}
                  onChange={(e) => setOfflineNote(e.target.value)}
                  placeholder="e.g. Received by owner in cash"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="submit"
                disabled={recordingOffline}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                {recordingOffline ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Confirm & Record Payment</span>
              </button>
            </div>
          </form>
        )}

        {/* 3. SUMMARY METRIC CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-lg">
            <span className="text-xs text-slate-400 block mb-1">Monthly Rent</span>
            <div className="text-xl sm:text-2xl font-extrabold text-white font-heading">
              ₹{Number(student.monthlyFee || 8000).toLocaleString('en-IN')}
            </div>
            <span className="text-[11px] text-slate-500 block mt-1">Due on {student.rentDueDay || 5}th of each month</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-lg">
            <span className="text-xs text-slate-400 block mb-1">Total Amount Paid</span>
            <div className="text-xl sm:text-2xl font-extrabold text-emerald-400 font-heading">
              ₹{totalPaid.toLocaleString('en-IN')}
            </div>
            <span className="text-[11px] text-emerald-500/80 block mt-1">{paymentsCount} payment(s) recorded</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-lg">
            <span className="text-xs text-slate-400 block mb-1">Current Pending Amount</span>
            <div className={`text-xl sm:text-2xl font-extrabold font-heading ${totalDue > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
              ₹{totalDue.toLocaleString('en-IN')}
            </div>
            <span className="text-[11px] text-slate-500 block mt-1">
              {statusInfo.status === 'paid' ? 'All dues cleared ✓' : 'Due for current cycle'}
            </span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-lg">
            <span className="text-xs text-slate-400 block mb-1">Next Rent Due Date</span>
            <div className="text-lg sm:text-xl font-bold text-indigo-400 font-heading">
              {student.nextDueDate || '2026-09-05'}
            </div>
            <span className="text-[11px] text-slate-500 block mt-1">Last Paid: {student.lastPaidDate || 'N/A'}</span>
          </div>

        </div>

        {/* 4. CHRONOLOGICAL PAYMENT HISTORY TABLE / LIST */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-xl overflow-hidden">
          
          <div className="p-5 sm:p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-extrabold text-white font-heading flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-400" />
                <span>Complete Payment History</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Every verified room rent transaction for <strong>{student.fullName}</strong> in chronological order.
              </p>
            </div>

            <div className="text-xs text-slate-400 font-medium">
              Showing <strong>{history.length}</strong> record(s)
            </div>
          </div>

          {history.length === 0 ? (
            <div className="p-12 text-center text-slate-400">
              <CreditCard className="w-10 h-10 mx-auto mb-2 text-slate-600" />
              <p className="text-sm font-semibold text-slate-300">No payment records found yet</p>
              <p className="text-xs text-slate-500 mt-1">
                Payments made by the student or recorded offline will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-950/80 text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-5 py-3.5">Date & Time</th>
                    <th className="px-5 py-3.5">Amount</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Method</th>
                    <th className="px-5 py-3.5">Transaction / UTR ID</th>
                    <th className="px-5 py-3.5 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {history.map((h, idx) => (
                    <tr
                      key={h.id || idx}
                      onClick={() => setSelectedReceipt({
                        ...h,
                        studentName: student.fullName,
                        roomNumber: student.roomNumber,
                        bed: student.bed,
                        propertyName: data.property?.propertyName || 'Hostel PG',
                        ownerName: data.property?.ownerName || 'Hostel PG Owner',
                      })}
                      className="hover:bg-slate-800/50 transition cursor-pointer group"
                    >
                      {/* Date & Time */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="font-bold text-white">{h.paymentDate || '2026-08-26'}</div>
                        <div className="text-[11px] text-slate-400">{h.paymentTime || '10:30 AM'}</div>
                      </td>

                      {/* Amount */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="font-extrabold text-emerald-400 font-heading text-base">
                          ₹{Number(h.amount || 0).toLocaleString('en-IN')}
                        </div>
                        <div className="text-[10px] text-slate-400">{h.billingPeriod || 'Room Fee'}</div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Paid ✓</span>
                        </span>
                      </td>

                      {/* Method */}
                      <td className="px-5 py-4 whitespace-nowrap font-medium text-slate-200">
                        {h.paymentProvider || h.paymentMethod || 'UPI'}
                      </td>

                      {/* UTR / Transaction ID */}
                      <td className="px-5 py-4 whitespace-nowrap font-mono text-indigo-300 font-medium">
                        {h.transactionId || h.paymentReference || 'TXN_DIRECT'}
                      </td>

                      {/* Receipt Action */}
                      <td className="px-5 py-4 whitespace-nowrap text-right">
                        <button
                          type="button"
                          className="px-3 py-1.5 rounded-lg bg-slate-800 group-hover:bg-indigo-600 text-slate-300 group-hover:text-white text-xs font-semibold transition inline-flex items-center gap-1"
                        >
                          <span>View</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 5. BOTTOM SUMMARY LEDGER BAR */}
          <div className="bg-slate-950 px-5 sm:px-8 py-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs font-semibold">
            <div className="flex items-center gap-6">
              <div>
                <span className="text-slate-400">Total Paid: </span>
                <span className="text-emerald-400 font-bold font-heading text-sm">
                  ₹{totalPaid.toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Total Due: </span>
                <span className="text-amber-400 font-bold font-heading text-sm">
                  ₹{totalDue.toLocaleString('en-IN')}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Payments Made: </span>
                <span className="text-white font-bold font-heading text-sm">
                  {paymentsCount}
                </span>
              </div>
            </div>

            <div className="text-slate-500 text-[11px]">
              Hostel Rent Ledger • Isolated to Owner Property
            </div>
          </div>

        </div>

      </main>

      {/* 6. INDIVIDUAL PAYMENT RECEIPT MODAL */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-60 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fade-in">
          <div className="bg-white text-slate-900 rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden my-auto print:border-none print:shadow-none">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-6 text-center relative">
              <button
                onClick={() => setSelectedReceipt(null)}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-white transition print:hidden cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-2 text-white">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold font-heading">Payment Verified</h3>
              <p className="text-xs text-emerald-100">Digital Room Rent Receipt</p>
            </div>

            {/* Receipt Details */}
            <div className="p-6 space-y-4 text-xs">
              <div className="text-center pb-4 border-b border-slate-200">
                <span className="text-xs text-slate-400 block uppercase tracking-wider font-semibold">Amount Paid</span>
                <div className="text-3xl font-extrabold text-slate-900 font-heading mt-0.5">
                  ₹{Number(selectedReceipt.amount || 0).toLocaleString('en-IN')}
                </div>
                <span className="text-[11px] text-emerald-600 font-bold mt-1 inline-block bg-emerald-50 px-2.5 py-0.5 rounded-full">
                  Status: Paid ✓
                </span>
              </div>

              <div className="space-y-2.5">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Student Name</span>
                  <span className="font-bold text-slate-900">{selectedReceipt.studentName}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Room & Bed</span>
                  <span className="font-semibold text-slate-800">Room {selectedReceipt.roomNumber} • Bed {selectedReceipt.bed || 'B'}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Hostel Name</span>
                  <span className="font-semibold text-slate-800">{selectedReceipt.propertyName}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Date & Time</span>
                  <span className="font-semibold text-slate-800">{selectedReceipt.paymentDate} • {selectedReceipt.paymentTime}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Payment Provider</span>
                  <span className="font-semibold text-slate-800">{selectedReceipt.paymentProvider || selectedReceipt.paymentMethod || 'UPI'}</span>
                </div>

                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-400">Transaction / UTR</span>
                  <span className="font-mono font-bold text-indigo-600">{selectedReceipt.transactionId || selectedReceipt.paymentReference}</span>
                </div>

                {selectedReceipt.note && (
                  <div className="pt-1 text-slate-500">
                    <span className="text-[11px] text-slate-400 block">Note:</span>
                    <span className="italic">{selectedReceipt.note}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 pt-2 print:hidden">
                <button
                  type="button"
                  onClick={handlePrintReceipt}
                  className="flex-1 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Receipt</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedReceipt(null)}
                  className="px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition cursor-pointer"
                >
                  Close
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
