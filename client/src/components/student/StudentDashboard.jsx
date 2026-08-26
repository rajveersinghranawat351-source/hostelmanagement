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
  ArrowUpRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import PayFeeModal from './PayFeeModal';
import PaymentHistoryList from './PaymentHistoryList';

export default function StudentDashboard({ onRescanQR }) {
  const { user, logout } = useAuth();
  const { showError, showSuccess } = useToast();

  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState(null);
  const [activeDocModal, setActiveDocModal] = useState(null); // 'face' | 'aadhaar' | null
  const [docBlobUrl, setDocBlobUrl] = useState(null);
  const [docLoading, setDocLoading] = useState(false);

  // Fee & Payment States
  const [feeData, setFeeData] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [showPayModal, setShowPayModal] = useState(false);

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
        <p className="text-sm font-medium text-slate-500">Loading your student portal...</p>
      </div>
    );
  }

  if (!studentData) {
    return (
      <div className="max-w-md mx-auto p-6 bg-white rounded-3xl border border-slate-200 text-center shadow-xl">
        <Building2 className="w-12 h-12 text-indigo-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-slate-900 mb-2">No Connected Hostel</h3>
        <p className="text-xs sm:text-sm text-slate-500 mb-6">
          You are not currently connected to any Hostel/PG account. Scan or upload your hostel owner's QR code to connect.
        </p>
        <button
          onClick={onRescanQR}
          className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm shadow-md transition cursor-pointer"
        >
          Connect to Hostel QR
        </button>
      </div>
    );
  }

  const isPending = studentData.status === 'pending';
  const isActive = studentData.status === 'active';
  const isVacated = studentData.status === 'vacated';

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-16">
      
      {/* 1. TOP WELCOME HEADER BAR */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
            onClick={fetchStudentProfile}
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

      {/* 2. PROMINENT MONTHLY ROOM FEE REMINDER CARD */}
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
                    Due Date: <strong>{feeData.billing.dueDate}</strong> • Pay to: <strong>{feeData.paymentDetails?.payeeName || 'PG Owner'}</strong>
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2.5 pt-2 sm:pt-0">
              {feeData.billing.status !== 'paid' ? (
                <button
                  type="button"
                  onClick={() => setShowPayModal(true)}
                  className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition cursor-pointer min-h-[44px]"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Pay Room Fee Now</span>
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
        </div>
      )}

      {/* 3. CONNECTION & ROOM/BED STATUS BANNER */}
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
            <span className="text-slate-400 block font-medium">Joined Date</span>
            <span className="text-sm font-semibold text-white mt-0.5 block">
              {studentData.joining_date ? new Date(studentData.joining_date).toLocaleDateString() : 'Active'}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block font-medium">Owner Contact</span>
            <span className="text-sm font-semibold text-white mt-0.5 block">
              {studentData.property_contact || 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. PROFILE DETAILS & COLLEGE & GUARDIAN GRIDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* College & Education Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <GraduationCap className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900 font-heading">College Information</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">College Name</span>
              <span className="text-slate-900 font-bold text-sm">{studentData.college_name || 'N/A'}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <span className="text-slate-400 block font-medium">Course & Branch</span>
                <span className="text-slate-800 font-semibold">{studentData.course} ({studentData.branch || 'General'})</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Year / Semester</span>
                <span className="text-slate-800 font-semibold">{studentData.year_semester || 'N/A'}</span>
              </div>
            </div>

            {studentData.enrollment_number && (
              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-400 block font-medium">Enrollment / ID</span>
                <span className="text-slate-800 font-mono font-bold">{studentData.enrollment_number}</span>
              </div>
            )}
          </div>
        </div>

        {/* Guardian & Emergency Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Users className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900 font-heading">Guardian & Emergency</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">Parent / Guardian Name</span>
              <span className="text-slate-900 font-bold text-sm">
                {studentData.guardian_name || 'N/A'} ({studentData.relationship || 'Parent'})
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <span className="text-slate-400 block font-medium">Guardian Contact</span>
                <a href={`tel:${studentData.guardian_mobile}`} className="text-indigo-600 font-bold hover:underline">
                  {studentData.guardian_mobile || 'N/A'}
                </a>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Emergency Contact</span>
                <a href={`tel:${studentData.emergency_contact}`} className="text-slate-800 font-semibold hover:underline">
                  {studentData.emergency_contact || studentData.guardian_mobile}
                </a>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <span className="text-slate-400 block font-medium">Hometown (From)</span>
              <span className="text-slate-800 font-semibold">{studentData.hometown || 'N/A'}</span>
            </div>
          </div>
        </div>

      </div>

      {/* 4. IDENTITY DOCUMENTS & PERMANENT ADDRESS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Personal & Address Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-3">
          <h3 className="text-base font-bold text-slate-900 font-heading mb-3">Personal & Residence Details</h3>
          
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-400 font-medium">Full Name</span>
              <span className="text-slate-800 font-semibold">{studentData.full_name}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-400 font-medium">Contact Mobile</span>
              <span className="text-slate-800 font-semibold">{studentData.mobile}</span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100">
              <span className="text-slate-400 font-medium">Date of Birth & Gender</span>
              <span className="text-slate-800 font-semibold">{studentData.dob || 'N/A'} • {studentData.gender}</span>
            </div>
            <div className="pt-2">
              <span className="text-slate-400 block font-medium mb-1">Permanent Address</span>
              <span className="text-slate-800 block leading-relaxed">{studentData.address}</span>
            </div>
          </div>
        </div>

        {/* Identity Documents Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-heading mb-4">My Identity Documents</h3>
            
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Aadhaar Card Document</span>
                    <span className="text-[11px] text-emerald-600 font-medium">Encrypted & Attached ✓</span>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenDoc('aadhaar')}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View</span>
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Verified Profile Photo</span>
                    <span className="text-[11px] text-emerald-600 font-medium">Attached ✓</span>
                  </div>
                </div>

                <button
                  onClick={() => handleOpenDoc('face')}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View</span>
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Encrypted under student-owner data protection protocol.</span>
          </div>
        </div>

      </div>

      {/* 5. PAYMENT HISTORY SECTION */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-heading">Payment History</h3>
              <p className="text-xs text-slate-500">Verified receipts & past monthly fee transactions</p>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchPaymentHistory}
            className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        <PaymentHistoryList history={paymentHistory} />
      </div>

      {/* Pay Fee Modal */}
      {showPayModal && feeData && (
        <PayFeeModal
          feeData={feeData}
          onClose={() => setShowPayModal(false)}
          onPaymentSuccess={handlePaymentCompleted}
        />
      )}

      {/* Secure Document Viewer Modal */}
      {activeDocModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-900">
                {activeDocModal === 'face' ? 'Profile / Face Photo' : 'Aadhaar Document'}
              </span>
              <button
                onClick={handleCloseDoc}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-900 flex items-center justify-center min-h-[250px]">
              {docLoading ? (
                <div className="text-white text-xs flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Fetching encrypted document...</span>
                </div>
              ) : docBlobUrl ? (
                <img
                  src={docBlobUrl}
                  alt="Secure Document"
                  className="max-h-[350px] w-auto object-contain rounded-lg"
                />
              ) : (
                <p className="text-xs text-rose-300">Document preview failed.</p>
              )}
            </div>

            <div className="p-3 bg-slate-50 text-center">
              <button
                onClick={handleCloseDoc}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
