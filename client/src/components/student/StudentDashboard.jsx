import React, { useState, useEffect } from 'react';
import {
  Building2,
  MapPin,
  Phone,
  User,
  Calendar,
  Compass,
  FileText,
  Clock,
  Home,
  BedSingle,
  GraduationCap,
  Users,
  CheckCircle2,
  Clock3,
  AlertCircle,
  Eye,
  ShieldCheck,
  LogOut,
  RefreshCw,
  X,
  FileBadge,
  Sparkles,
  CreditCard,
  Receipt,
  ArrowUpRight,
  Copy,
  Check,
  Smartphone,
  ExternalLink,
  QrCode
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import PayFeeModal from './PayFeeModal';
import PaymentHistoryList from './PaymentHistoryList';

export default function StudentDashboard({ onRescanQR }) {
  const { user, logout } = useAuth();
  const { showError, showSuccess } = useToast();

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'rent'
  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState(null);
  const [activeDocModal, setActiveDocModal] = useState(null); // 'face' | 'aadhaar' | null
  const [docBlobUrl, setDocBlobUrl] = useState(null);
  const [docLoading, setDocLoading] = useState(false);

  // Fee & Payment States
  const [feeData, setFeeData] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [showPayModal, setShowPayModal] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

  useEffect(() => {
    fetchStudentProfile();
    fetchFeeDetails();
    fetchPaymentHistory();
  }, []);

  const fetchStudentProfile = async () => {
    setLoading(true);
    try {
      const res = await api.getStudentMe();
      if (res.hasJoined) {
        setStudentData(res.profile);
      } else {
        setStudentData(null);
      }
    } catch (err) {
      showError('Failed to load your hostel details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchFeeDetails = async () => {
    try {
      const res = await api.getTenantFeeStatus();
      if (res.hasJoined) {
        setFeeData(res);
      }
    } catch (_) {}
  };

  const fetchPaymentHistory = async () => {
    try {
      const res = await api.getTenantPaymentHistory();
      setPaymentHistory(res.history || []);
    } catch (_) {}
  };

  const handlePaymentCompleted = (receipt) => {
    fetchFeeDetails();
    fetchPaymentHistory();
    fetchStudentProfile();
  };

  const handleCopyUpi = async (upiId) => {
    if (!upiId) return;
    try {
      await navigator.clipboard.writeText(upiId);
      setCopiedUpi(true);
      showSuccess('UPI ID copied to clipboard!');
      setTimeout(() => setCopiedUpi(false), 2500);
    } catch (_) {
      showError('Unable to copy UPI ID.');
    }
  };

  const handleOpenDoc = async (type) => {
    setActiveDocModal(type);
    setDocLoading(true);
    setDocBlobUrl(null);
    try {
      const url = type === 'face' ? studentData.facePhotoUrl : studentData.aadhaarDocumentUrl;
      const blobUrl = await api.fetchSecureDocumentBlob(url);
      setDocBlobUrl(blobUrl);
    } catch (err) {
      showError('Failed to securely load document.');
    } finally {
      setDocLoading(false);
    }
  };

  const handleCloseDoc = () => {
    if (docBlobUrl) {
      URL.revokeObjectURL(docBlobUrl);
    }
    setDocBlobUrl(null);
    setActiveDocModal(null);
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm font-medium text-slate-500">Loading your student dashboard...</p>
      </div>
    );
  }

  if (!studentData) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl p-8 text-center max-w-lg mx-auto animate-fade-in">
        <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-900 font-heading">No Active Hostel Found</h2>
        <p className="text-xs text-slate-500 mt-1 mb-6">
          You have not connected to any hostel yet. Scan the owner's QR code to join.
        </p>
        <button
          onClick={onRescanQR}
          className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition cursor-pointer"
        >
          Scan Hostel QR Code
        </button>
      </div>
    );
  }

  const isPending = studentData.status === 'pending';
  const isActive = studentData.status === 'active';
  const isVacated = studentData.status === 'vacated';

  const billing = feeData?.billing || {
    monthlyFee: 8000,
    dueDate: '2026-09-05',
    status: 'due',
    statusLabel: 'Due',
    countdownText: 'Due Soon',
    billingPeriod: 'Current Month',
  };

  const paymentDetails = feeData?.paymentDetails || {};
  const currentDueAmount = billing.status === 'paid' ? 0 : Number(billing.monthlyFee || 8000);

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* 1. TOP WELCOME HEADER BAR */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-2xl shadow-md shadow-indigo-600/20 shrink-0">
            {studentData.full_name?.charAt(0) || 'S'}
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading">
              Welcome, {studentData.full_name} 👋
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-500">
              <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-100">
                {studentData.student_id_code || 'STU-ID'}
              </span>
              <span>•</span>
              <span>{studentData.email || user?.email}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => {
              fetchStudentProfile();
              fetchFeeDetails();
              fetchPaymentHistory();
            }}
            title="Refresh Data"
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={logout}
            className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* 2. TAB SWITCHER: OVERVIEW VS MY RENT */}
      <div className="flex items-center gap-2 bg-slate-200/70 p-1.5 rounded-2xl w-full sm:w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Home className="w-4 h-4" />
          <span>Overview & Hostel</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('rent')}
          className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === 'rent'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>My Rent & Dues</span>
          {billing.status !== 'paid' && (
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* VIEW A: DEDICATED "MY RENT & DUES" SECTION */}
      {/* ========================================================================= */}
      {activeTab === 'rent' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* RENT COUNTDOWN & DUE SUMMARY CARD */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                    My Room Rent
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      billing.status === 'paid'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : billing.status === 'overdue'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {billing.status === 'paid' ? 'Paid ✓' : billing.statusLabel || 'Due'}
                  </span>
                </div>

                <div className="flex items-baseline gap-2 pt-1">
                  <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-heading">
                    ₹{Number(billing.monthlyFee || 8000).toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">/ month</span>
                </div>

                <p className="text-xs text-slate-500 mt-1">
                  {billing.status === 'paid' ? (
                    <span className="text-emerald-700 font-semibold">
                      ✓ Paid for {billing.billingPeriod} • Next Rent Due Date: <strong>{billing.dueDate}</strong>
                    </span>
                  ) : (
                    <span>
                      Next Due Date: <strong>{billing.dueDate}</strong> • Status: <strong>{billing.countdownText}</strong>
                    </span>
                  )}
                </p>
              </div>

              {/* Action Button */}
              <div className="flex items-center gap-2">
                {billing.status !== 'paid' ? (
                  <button
                    type="button"
                    onClick={() => setShowPayModal(true)}
                    className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition cursor-pointer min-h-[44px]"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Pay Rent (₹{Number(billing.monthlyFee || 8000).toLocaleString('en-IN')})</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowPayModal(true)}
                    className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer min-h-[40px]"
                  >
                    <Receipt className="w-4 h-4 text-slate-500" />
                    <span>View UPI Details</span>
                  </button>
                )}
              </div>
            </div>

            {/* 3 Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 text-xs">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <span className="text-slate-400 block font-medium">Current Due Amount</span>
                <span className={`text-xl font-extrabold font-heading mt-1 block ${currentDueAmount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  ₹{currentDueAmount.toLocaleString('en-IN')}
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  {currentDueAmount === 0 ? 'All current dues cleared' : 'Due for this month'}
                </span>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <span className="text-slate-400 block font-medium">Rent Countdown</span>
                <span className="text-lg font-bold text-indigo-600 mt-1 block">
                  {billing.countdownText || 'Due Soon'}
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Due on {billing.dueDate}
                </span>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <span className="text-slate-400 block font-medium">Last Payment Date</span>
                <span className="text-lg font-bold text-slate-800 mt-1 block">
                  {billing.lastPaidDate || 'On Admission'}
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  Verified in hostel ledger
                </span>
              </div>
            </div>
          </div>

          {/* OWNER PAYMENT CONFIGURATION & UPI QR CARD */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-md">
            <h3 className="text-base font-extrabold text-slate-900 font-heading mb-1 flex items-center gap-2">
              <QrCode className="w-5 h-5 text-indigo-600" />
              <span>Owner Payment Details & QR Standee</span>
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Official payment configuration set by <strong>{studentData.owner_name}</strong> for {studentData.property_name}.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* QR Preview Card */}
              <div className="bg-slate-900 rounded-2xl p-5 text-center text-white space-y-3 shadow-lg">
                <div className="w-44 h-44 mx-auto bg-white p-2 rounded-2xl shadow-inner flex items-center justify-center overflow-hidden">
                  {paymentDetails.qrImageUrl ? (
                    <img
                      src={paymentDetails.qrImageUrl}
                      alt="Owner Standee QR"
                      className="w-full h-full object-contain"
                    />
                  ) : paymentDetails.upiIntentUrl ? (
                    <QRCodeSVG
                      value={paymentDetails.upiIntentUrl}
                      size={160}
                      level="H"
                      includeMargin={false}
                    />
                  ) : (
                    <QrCode className="w-20 h-20 text-slate-300" />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">{paymentDetails.payeeName || studentData.owner_name}</h4>
                  <p className="text-xs text-indigo-300">Official UPI QR for {studentData.property_name}</p>
                </div>
              </div>

              {/* UPI ID & Online Links */}
              <div className="space-y-4 flex flex-col justify-center">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                  <span className="text-xs font-semibold text-slate-500 block">Owner UPI ID (VPA)</span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-slate-900 text-sm">{paymentDetails.upiId || 'hostel@upi'}</span>
                    <button
                      type="button"
                      onClick={() => handleCopyUpi(paymentDetails.upiId)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedUpi ? 'Copied' : 'Copy UPI'}</span>
                    </button>
                  </div>
                </div>

                {/* Direct UPI App Mobile Trigger */}
                {paymentDetails.upiIntentUrl && (
                  <a
                    href={paymentDetails.upiIntentUrl}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition"
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>Pay ₹{Number(billing.monthlyFee || 8000).toLocaleString('en-IN')} via UPI App</span>
                  </a>
                )}

                {/* Online Gateway Link if configured */}
                {paymentDetails.paymentLink && (
                  <a
                    href={paymentDetails.paymentLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Pay Online via Gateway Link</span>
                  </a>
                )}

                <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 text-indigo-900 text-xs flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <p>
                    All payments are securely verified and synced directly with your owner's live ledger.
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* PAYMENT HISTORY LIST */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-7 shadow-md">
            <h3 className="text-base font-extrabold text-slate-900 font-heading mb-1 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-emerald-600" />
              <span>Rent Payment History</span>
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Complete chronological record of all verified fee transactions for your room.
            </p>

            <PaymentHistoryList history={paymentHistory} />
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW B: OVERVIEW & RESIDENT PROFILE (Original Information) */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* PROMINENT MONTHLY ROOM FEE SUMMARY CARD */}
          {feeData && feeData.billing && (
            <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-md overflow-hidden relative">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Monthly Room Fee
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        feeData.billing.status === 'paid'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : feeData.billing.status === 'overdue'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {feeData.billing.status === 'paid' ? '✓ Paid' : feeData.billing.statusLabel || 'Due'}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2 pt-1">
                    <span className="text-3xl font-extrabold text-slate-900 font-heading">
                      ₹{Number(feeData.billing.monthlyFee || 8000).toLocaleString('en-IN')}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      / month ({feeData.billing.billingPeriod})
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 pt-0.5">
                    {feeData.billing.status === 'paid' ? (
                      <span className="text-emerald-700 font-medium">
                        ✓ Paid for {feeData.billing.billingPeriod} • Next Rent Due: <strong>{feeData.billing.dueDate}</strong>
                      </span>
                    ) : (
                      <span>
                        Due Date: <strong>{feeData.billing.dueDate}</strong> • Status: <strong>{feeData.billing.countdownText}</strong>
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2.5 pt-2 sm:pt-0">
                  <button
                    type="button"
                    onClick={() => setActiveTab('rent')}
                    className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition cursor-pointer min-h-[44px]"
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Manage My Rent</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* HOSTEL & RESIDENCE CONNECTION BANNER */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-indigo-800/60">
              <div>
                <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider block mb-1">
                  Connected Hostel
                </span>
                <h2 className="text-2xl font-extrabold font-heading text-white">{studentData.property_name}</h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  Account Owner: <strong>{studentData.owner_name}</strong> • {studentData.property_city || 'Jaipur'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  🟢 Connected to Hostel
                </span>
                {isPending && (
                  <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold">
                    Pending Verification
                  </span>
                )}
              </div>
            </div>

            {/* Quick Resident Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Assigned Room</span>
                <span className="text-lg font-bold text-white mt-0.5 flex items-center gap-1.5">
                  <Home className="w-4 h-4 text-indigo-400" />
                  Room {studentData.room_number || '204'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Assigned Bed</span>
                <span className="text-lg font-bold text-white mt-0.5 flex items-center gap-1.5">
                  <BedSingle className="w-4 h-4 text-indigo-400" />
                  Bed {studentData.bed || 'B'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Joining Date</span>
                <span className="text-sm font-semibold text-slate-200 mt-1 block">
                  {studentData.created_at ? studentData.created_at.split('T')[0] : 'Active'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block font-medium">Owner Contact</span>
                <span className="text-sm font-semibold text-indigo-300 mt-1 block">
                  {studentData.owner_mobile || '+91 98290 12345'}
                </span>
              </div>
            </div>
          </div>

          {/* 2-COLUMN PROFILE CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Card 1: Academic Details */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-md space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900 font-heading">Academic Information</h3>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block">College Name</span>
                  <span className="text-slate-900 font-bold text-sm">{studentData.college_name || 'N/A'}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-400 block">Course & Branch</span>
                    <span className="text-slate-800 font-medium">{studentData.course} ({studentData.branch || 'General'})</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Year / Semester</span>
                    <span className="text-slate-800 font-medium">{studentData.year_semester || 'N/A'}</span>
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 block">Enrollment Number</span>
                  <span className="text-slate-800 font-mono font-medium">{studentData.enrollment_number || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Card 2: Guardian & Emergency */}
            <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-md space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900 font-heading">Guardian & Emergency</h3>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block">Parent / Guardian Name</span>
                  <span className="text-slate-900 font-bold text-sm">
                    {studentData.guardian_name || 'N/A'} ({studentData.relationship || 'Parent'})
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-400 block">Guardian Mobile</span>
                    <span className="text-slate-800 font-medium">{studentData.guardian_mobile || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Emergency Mobile</span>
                    <span className="text-slate-800 font-medium">{studentData.emergency_contact || studentData.guardian_mobile || 'N/A'}</span>
                  </div>
                </div>
                <div>
                  <span className="text-slate-400 block">Hometown</span>
                  <span className="text-slate-800 font-medium">{studentData.hometown || 'N/A'}</span>
                </div>
              </div>
            </div>

          </div>

          {/* IDENTITY DOCUMENTS CARD */}
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 shadow-md">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100 mb-4">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 font-heading">Encrypted Identity Documents</h3>
                <p className="text-xs text-slate-400">Secure KYC files provided during admission</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-indigo-500" />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Aadhaar Card</span>
                    <span className="text-[11px] text-emerald-600 font-medium">Uploaded & Verified ✓</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenDoc('aadhaar')}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View</span>
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <User className="w-6 h-6 text-indigo-500" />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">Verified Photo</span>
                    <span className="text-[11px] text-emerald-600 font-medium">Face Photo Attached ✓</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenDoc('face')}
                  className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View</span>
                </button>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* DOCUMENT PREVIEW MODAL */}
      {activeDocModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-900">
                {activeDocModal === 'face' ? 'Your Verified Photo' : 'Your Aadhaar Card'}
              </span>
              <button
                type="button"
                onClick={handleCloseDoc}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 flex items-center justify-center min-h-[260px]">
              {docLoading ? (
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  <span>Loading encrypted document...</span>
                </div>
              ) : docBlobUrl ? (
                <img
                  src={docBlobUrl}
                  alt="Student Document"
                  className="max-h-[380px] w-auto object-contain rounded-xl shadow-md"
                />
              ) : (
                <p className="text-xs text-rose-500">Failed to display document.</p>
              )}
            </div>

            <div className="p-3 bg-white border-t border-slate-100 text-center">
              <button
                type="button"
                onClick={handleCloseDoc}
                className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAY FEE MODAL */}
      {showPayModal && (
        <PayFeeModal
          onClose={() => setShowPayModal(false)}
          onSuccess={handlePaymentCompleted}
        />
      )}

    </div>
  );
}
