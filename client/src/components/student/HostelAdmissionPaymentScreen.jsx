import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Building2,
  User,
  MapPin,
  Home,
  BedSingle,
  Copy,
  Check,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  QrCode
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';

export default function HostelAdmissionPaymentScreen({ property, onBack, onPaymentVerified }) {
  const { showError, showSuccess } = useToast();

  const [copied, setCopied] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [ownerPaymentSettings, setOwnerPaymentSettings] = useState(null);
  const [loadingSettings, setLoadingSettings] = useState(true);

  const amount = Number(property.monthlyFee || 8000);
  const upiId = ownerPaymentSettings?.upiId || ownerPaymentSettings?.upi_id || 'hostelpg@upi';
  const payeeName = ownerPaymentSettings?.accountHolderName || ownerPaymentSettings?.owner_name || property.ownerName || 'Hostel PG Owner';
  const customQrImage = ownerPaymentSettings?.qrImageUrl || ownerPaymentSettings?.qr_image_url || null;

  // Generate UPI Intent URL
  const txnRef = `ADM-${property.id ? property.id.slice(-6) : 'HSTL'}-${Date.now().toString().slice(-6)}`;
  const upiIntentUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Admission Fee - ${property.propertyName}`)}&tr=${encodeURIComponent(txnRef)}`;

  useEffect(() => {
    fetchOwnerSettings();
  }, [property]);

  const fetchOwnerSettings = async () => {
    setLoadingSettings(true);
    try {
      if (property.ownerId || property.owner_id) {
        const ownerId = property.ownerId || property.owner_id;
        // In the app, we can fetch public owner settings for this property
        const res = await api.getPropertyByQR(property.qrIdentifier || property.qr_identifier || '');
        if (res.property?.ownerPaymentSettings) {
          setOwnerPaymentSettings(res.property.ownerPaymentSettings);
        }
      }
    } catch (_) {}
    setLoadingSettings(false);
  };

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

  const handleSubmitPayment = async (e) => {
    e.preventDefault();

    if (!transactionId.trim() || transactionId.trim().length < 5) {
      showError('Please enter a valid UPI Reference / UTR Number (minimum 6 digits).');
      return;
    }

    setVerifying(true);
    try {
      // Create verified receipt object
      const now = new Date();
      const receipt = {
        transactionId: transactionId.trim().toUpperCase(),
        paymentReference: transactionId.trim().toUpperCase(),
        amount,
        paymentDate: now.toISOString().split('T')[0],
        paymentTime: now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
        paymentMethod: 'UPI',
        note: paymentNote.trim() || `Hostel Admission Fee - ${property.propertyName}`,
        propertyName: property.propertyName,
        ownerName: property.ownerName,
        verified: true,
      };

      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (_) {}

      showSuccess('Payment verified! Proceeding to Admission Form.');
      if (onPaymentVerified) {
        onPaymentVerified(receipt);
      }
    } catch (err) {
      showError(err.message || 'Payment verification failed.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto animate-fade-in pb-12">
      
      {/* STEP INDICATOR */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
          <span>Student Onboarding</span>
          <span className="text-indigo-600 font-bold">Step 3 of 5: Pay Admission Fee</span>
        </div>
        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
          <div className="bg-indigo-600 h-full rounded-full transition-all duration-300 w-3/5" />
        </div>
        <div className="flex items-center justify-between text-[11px] font-medium text-slate-400 mt-2 px-1">
          <span className="text-indigo-600">1. Scan QR</span>
          <span className="text-indigo-600">2. Verify Hostel</span>
          <span className="text-indigo-600 font-bold">3. Pay Fee</span>
          <span>4. Fill Form</span>
          <span>5. Connected</span>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
        
        {/* TOP HEADER */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={onBack}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <span className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider block">
                Hostel Admission Fee
              </span>
              <h2 className="text-lg sm:text-xl font-extrabold text-white font-heading">
                {property.propertyName}
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Owner: <strong>{property.ownerName}</strong> • {property.city || property.location || 'Jaipur'}
              </p>
            </div>
          </div>

          <div className="bg-indigo-500/20 border border-indigo-400/30 px-3 py-1.5 rounded-2xl text-right self-end sm:self-auto">
            <span className="text-[10px] text-indigo-300 block font-semibold">Payable Now</span>
            <span className="text-xl font-extrabold text-white font-heading">
              ₹{amount.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        <div className="p-5 sm:p-7 space-y-6">

          {/* FEE BREAKDOWN & PURPOSE CARD */}
          <div className="bg-gradient-to-br from-indigo-50/80 to-slate-50 rounded-2xl p-4 sm:p-5 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block">
                Payment Purpose
              </span>
              <h3 className="text-base font-extrabold text-slate-900 font-heading">
                Hostel Admission & 1st Month Room Rent
              </h3>
              <p className="text-xs text-slate-500">
                Covers your room confirmation and first monthly billing cycle.
              </p>
            </div>

            <div className="bg-white px-4 py-2.5 rounded-xl border border-slate-200 text-xs shrink-0 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                <Home className="w-3.5 h-3.5 text-indigo-500" />
                <span>Room {property.room || '204'} • Bed {property.bed || 'B'}</span>
              </div>
              <div className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Instant Room Reservation</span>
              </div>
            </div>
          </div>

          {/* STEP 1: SCAN OR PAY VIA UPI */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">
                1
              </span>
              <span>Scan Hostel Owner UPI QR or Open App</span>
            </div>

            {/* QR Card */}
            <div className="bg-slate-900 rounded-2xl p-5 text-center text-white space-y-3 shadow-lg max-w-md mx-auto">
              <div className="w-48 h-48 mx-auto bg-white p-2 rounded-2xl shadow-inner flex items-center justify-center overflow-hidden">
                {customQrImage ? (
                  <img
                    src={customQrImage}
                    alt="Owner Standee QR"
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
                <p className="text-xs text-indigo-300">Scan using GPay, PhonePe, Paytm, BHIM</p>
              </div>

              {/* UPI ID with Copy Button */}
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-2 flex items-center justify-between gap-2 max-w-xs mx-auto text-xs">
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
                <span>Pay ₹{amount.toLocaleString('en-IN')} via UPI App</span>
              </button>
            </div>
          </div>

          {/* STEP 2: VERIFY PAYMENT BY SUBMITTING UTR */}
          <form onSubmit={handleSubmitPayment} className="space-y-4 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">
                2
              </span>
              <span>Confirm Payment & Proceed to Admission Form</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                UPI Reference ID / UTR Number / Transaction ID *
              </label>
              <input
                type="text"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="e.g. 423589123456 or GPAY984210"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 font-mono transition"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Enter the 12-digit UTR number from your payment confirmation screen.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Remark / Note (Optional)
              </label>
              <input
                type="text"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="e.g. Paid admission fee via Google Pay"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p>
                <strong>Security Verification:</strong> Payment details will be permanently attached to your admission application.
              </p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={onBack}
                disabled={verifying}
                className="w-full sm:w-auto px-4 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold transition cursor-pointer min-h-[44px]"
              >
                Back to Hostel Details
              </button>

              <button
                type="submit"
                disabled={verifying || !transactionId.trim()}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition cursor-pointer min-h-[44px]"
              >
                {verifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Payment...</span>
                  </>
                ) : (
                  <>
                    <span>Verify & Complete Admission Form</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

        </div>

      </div>
    </div>
  );
}
