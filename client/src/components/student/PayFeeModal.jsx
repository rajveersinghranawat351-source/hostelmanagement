import React, { useState } from 'react';
import {
  X,
  CreditCard,
  QrCode,
  Copy,
  Check,
  Smartphone,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Receipt,
  Sparkles,
  Building2
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';

export default function PayFeeModal({ feeData, onClose, onPaymentSuccess }) {
  const { showError, showSuccess } = useToast();

  const [copied, setCopied] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [successReceipt, setSuccessReceipt] = useState(null);

  if (!feeData) return null;

  const { student, billing, paymentDetails } = feeData;
  const amount = billing?.monthlyFee || 8000;
  const billingPeriod = billing?.billingPeriod || 'Current Month Room Fee';
  const upiId = paymentDetails?.upiId || 'hostelpg@upi';
  const payeeName = paymentDetails?.payeeName || student?.ownerName || 'PG Owner';
  const upiIntentUrl = paymentDetails?.upiIntentUrl || `upi://pay?pa=${upiId}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR`;

  const handleCopyUPI = async () => {
    try {
      await navigator.clipboard.writeText(upiId);
      setCopied(true);
      showSuccess('UPI ID copied to clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch (_) {
      showError('Unable to copy UPI ID.');
    }
  };

  const handleOpenUpiApp = () => {
    window.location.href = upiIntentUrl;
  };

  const handleSubmitVerification = async (e) => {
    e.preventDefault();

    if (!transactionId.trim() || transactionId.trim().length < 5) {
      showError('Please enter a valid UPI Reference / UTR Number (minimum 6 digits).');
      return;
    }

    setLoading(true);
    try {
      const res = await api.verifyAndRecordTenantPayment({
        transactionId: transactionId.trim(),
        paymentReference: transactionId.trim(),
        note: paymentNote.trim() || `Monthly Room Fee - ${billingPeriod}`,
        paymentMethod: 'UPI',
      });

      // Trigger celebratory confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (_) {}

      setSuccessReceipt(res.receipt);
      showSuccess('Room fee payment recorded successfully!');
      if (onPaymentSuccess) {
        onPaymentSuccess(res.receipt);
      }
    } catch (err) {
      showError(err.message || 'Payment verification failed. Please check the transaction ID.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full my-auto overflow-hidden">
        
        {/* MODAL HEADER */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold truncate font-heading">
                {successReceipt ? 'Payment Receipt' : 'Pay Monthly Room Fee'}
              </h3>
              <p className="text-xs text-indigo-300/80 truncate">
                {student?.propertyName || 'Hostel PG'} • Room {student?.roomNumber || 'N/A'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* VIEW A: SUCCESS RECEIPT */}
        {successReceipt ? (
          <div className="p-6 space-y-6 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold mb-2">
                ✓ Payment Verified & Confirmed
              </span>
              <h2 className="text-3xl font-extrabold text-slate-900 font-heading">
                ₹{successReceipt.amount?.toLocaleString('en-IN')}
              </h2>
              <p className="text-xs text-slate-500 mt-1">{successReceipt.billingPeriod}</p>
            </div>

            {/* Receipt Summary Details */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-left space-y-2.5 text-xs">
              <div className="flex justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500">Transaction Ref / UTR</span>
                <span className="font-mono font-bold text-slate-900">{successReceipt.transactionId}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500">Payment Date & Time</span>
                <span className="font-semibold text-slate-900">
                  {successReceipt.paymentDate} • {successReceipt.paymentTime}
                </span>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500">Tenant</span>
                <span className="font-semibold text-slate-900">{successReceipt.studentName}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-200">
                <span className="text-slate-500">Room & Bed</span>
                <span className="font-semibold text-slate-900">Room {successReceipt.roomNumber}</span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-indigo-600 font-bold">Next Rent Due Date</span>
                <span className="font-bold text-indigo-700">{successReceipt.nextDueDate}</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md transition cursor-pointer min-h-[44px]"
            >
              Done & View Dashboard
            </button>
          </div>
        ) : (
          /* VIEW B: PAY VIA UPI & SUBMIT TRANSACTION */
          <div className="p-5 sm:p-6 space-y-6 max-h-[80vh] overflow-y-auto">
            
            {/* Amount Banner */}
            <div className="bg-gradient-to-br from-indigo-50 to-violet-50 p-4 rounded-2xl border border-indigo-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-indigo-600 block">Room Fee Payable</span>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
                  ₹{amount.toLocaleString('en-IN')}
                </div>
                <span className="text-[11px] text-slate-500">{billingPeriod}</span>
              </div>

              <div className="text-right">
                <span
                  className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                    billing?.status === 'overdue'
                      ? 'bg-rose-100 text-rose-700 border border-rose-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}
                >
                  {billing?.statusLabel || 'Due'}
                </span>
                <span className="text-[10px] text-slate-400 block mt-1">Due: {billing?.dueDate}</span>
              </div>
            </div>

            {/* STEP 1: SCAN OR PAY VIA UPI */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">
                  1
                </span>
                <span>Scan Owner UPI QR or Open App</span>
              </div>

              {/* Dynamic / Custom QR Code Card */}
              <div className="bg-slate-900 rounded-2xl p-5 text-center text-white space-y-3 shadow-lg">
                <div className="w-48 h-48 mx-auto bg-white p-2 rounded-2xl shadow-inner flex items-center justify-center overflow-hidden">
                  {paymentDetails?.qrImageUrl ? (
                    <img
                      src={paymentDetails.qrImageUrl}
                      alt="Owner Standee QR Code"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <QRCodeSVG
                      value={upiIntentUrl}
                      size={170}
                      level="H"
                      includeMargin={false}
                    />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{payeeName}</h4>
                  <p className="text-xs text-indigo-300">Scan with GPay, PhonePe, Paytm, BHIM</p>
                </div>

                {/* UPI ID with Copy Button */}
                <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-2 flex items-center justify-between gap-2 max-w-xs mx-auto text-xs">
                  <span className="font-mono text-indigo-200 truncate pl-2 font-medium">{upiId}</span>
                  <button
                    type="button"
                    onClick={handleCopyUPI}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition shrink-0 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy UPI'}</span>
                  </button>
                </div>

                {/* Open UPI App Button for Mobile */}
                <button
                  type="button"
                  onClick={handleOpenUpiApp}
                  className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md flex items-center justify-center gap-2 transition cursor-pointer min-h-[44px]"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Pay Directly via UPI App (GPay / PhonePe)</span>
                </button>
              </div>
            </div>

            {/* STEP 2: ENTER TRANSACTION UTR NUMBER */}
            <form onSubmit={handleSubmitVerification} className="space-y-4 pt-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">
                  2
                </span>
                <span>Confirm Payment (Enter UTR / Ref No)</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  UPI Ref No. / UTR Number / Transaction ID *
                </label>
                <input
                  type="text"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="e.g. 423589123456 or GPAY12345"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 font-mono transition"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  12-digit UTR number from your payment receipt in GPay/PhonePe/Paytm.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Note / Remark (Optional)
                </label>
                <input
                  type="text"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder={`e.g. Paid for ${billingPeriod}`}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  <strong>Server Verification:</strong> Each transaction ID is verified and recorded with exact timestamp. Duplicate IDs are automatically rejected.
                </p>
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="w-full sm:w-auto px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold transition cursor-pointer min-h-[44px]"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={loading || !transactionId.trim()}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition cursor-pointer min-h-[44px]"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Verifying Payment...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Submit & Confirm Payment</span>
                    </>
                  )}
                </button>
              </div>
            </form>

          </div>
        )}

      </div>
    </div>
  );
}
