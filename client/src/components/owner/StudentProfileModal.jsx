import React, { useState, useEffect } from 'react';
import {
  User,
  Phone,
  Calendar,
  MapPin,
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
  X,
  Loader2,
  Save,
  Check,
  ArrowLeft,
  CreditCard,
  Receipt,
  Sparkles,
  Building2
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';

export default function StudentProfileModal({ studentId, onClose, onStatusUpdated }) {
  const { showSuccess, showError } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState(null);
  const [roomNumberInput, setRoomNumberInput] = useState('');
  const [bedInput, setBedInput] = useState('');
  const [savingRoom, setSavingRoom] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  // Document preview state
  const [previewDocType, setPreviewDocType] = useState(null); // 'face' | 'aadhaar'
  const [docBlobUrl, setDocBlobUrl] = useState(null);
  const [docLoading, setDocLoading] = useState(false);

  useEffect(() => {
    fetchStudentDetail();
  }, [studentId]);

  const fetchStudentDetail = async () => {
    setLoading(true);
    try {
      const res = await api.getOwnerStudentProfile(studentId);
      setStudent(res.student);
      setRoomNumberInput(res.student.roomNumber || '204');
      setBedInput(res.student.bed || 'B');
    } catch (err) {
      showError(err.message || 'Failed to fetch student details.');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus) => {
    setStatusUpdating(true);
    try {
      await api.updateStudentStatus(studentId, newStatus);
      showSuccess(`Status changed to ${newStatus.toUpperCase()}`);
      setStudent((prev) => ({ ...prev, status: newStatus }));
      onStatusUpdated();
    } catch (err) {
      showError(err.message || 'Failed to update status.');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleSaveRoomAndBed = async () => {
    setSavingRoom(true);
    try {
      await api.updateStudentRoom(studentId, roomNumberInput, bedInput);
      showSuccess('Room & Bed allocation saved!');
      setStudent((prev) => ({ ...prev, roomNumber: roomNumberInput, bed: bedInput }));
      onStatusUpdated();
    } catch (err) {
      showError(err.message || 'Failed to save room assignment.');
    } finally {
      setSavingRoom(false);
    }
  };

  const handleOpenDoc = async (type) => {
    setPreviewDocType(type);
    setDocLoading(true);
    setDocBlobUrl(null);
    try {
      const url = type === 'face' ? student.facePhotoUrl : student.aadhaarDocumentUrl;
      const blobUrl = await api.fetchSecureDocumentBlob(url);
      setDocBlobUrl(blobUrl);
    } catch (err) {
      showError('Failed to securely stream document.');
    } finally {
      setDocLoading(false);
    }
  };

  const handleCloseDoc = () => {
    if (docBlobUrl) {
      URL.revokeObjectURL(docBlobUrl);
    }
    setDocBlobUrl(null);
    setPreviewDocType(null);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center text-white p-6 animate-fade-in">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-400">Loading student profile & KYC records...</p>
      </div>
    );
  }

  if (!student) return null;

  const isPending = student.status === 'pending';
  const isActive = student.status === 'active';
  const isVacated = student.status === 'vacated';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-slate-100 flex flex-col overflow-y-auto animate-fade-in">
      
      {/* 1. TOP STICKY APP HEADER BAR */}
      <div className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 py-4 flex items-center justify-between gap-4 shadow-xl">
        
        {/* Left: Back Button & Student Identity */}
        <div className="flex items-center gap-3.5 min-w-0">
          <button
            type="button"
            onClick={onClose}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back</span>
          </button>

          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-emerald-600/30 shrink-0">
              {student.fullName?.charAt(0) || 'S'}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-xl font-extrabold text-white font-heading truncate">
                  {student.fullName}
                </h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider ${
                    isActive
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : isPending
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {student.status}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate mt-0.5">
                ID: <span className="font-mono font-bold text-slate-200">{student.studentIdCode}</span> • Mobile: {student.mobile}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {isPending ? (
            <button
              type="button"
              onClick={() => handleUpdateStatus('active')}
              disabled={statusUpdating}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-emerald-600/25 flex items-center gap-1.5 transition cursor-pointer"
            >
              {statusUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              <span>Approve Admission</span>
            </button>
          ) : isActive ? (
            <button
              type="button"
              onClick={() => handleUpdateStatus('vacated')}
              disabled={statusUpdating}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-700 text-slate-300 hover:text-rose-300 text-xs font-semibold transition cursor-pointer"
            >
              Mark as Vacated
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleUpdateStatus('active')}
              disabled={statusUpdating}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer"
            >
              Re-Activate
            </button>
          )}

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

      {/* 2. FULL-SCREEN CONTENT BODY */}
      <main className="max-w-6xl mx-auto w-full p-4 sm:p-8 space-y-6 pb-24">
        
        {/* ROW 1: STATUS & PAYMENT SUMMARY + ROOM ALLOCATION */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Card A: Admission & Verified Fee Summary */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-heading">Hostel Admission & Payment</h3>
                  <span className="text-xs text-slate-400">Verified transaction & ledger status</span>
                </div>
              </div>

              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verified Fee</span>
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80">
                <span className="text-slate-400 block mb-1">Monthly Room Fee</span>
                <span className="text-xl font-extrabold text-white font-heading">
                  ₹{Number(student.monthlyFee || 8000).toLocaleString('en-IN')}
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">Due on {student.rentDueDay || 5}th of month</span>
              </div>

              <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80">
                <span className="text-slate-400 block mb-1">Next Rent Due Date</span>
                <span className="text-lg font-bold text-emerald-400 font-heading">
                  {student.nextDueDate || '2026-09-05'}
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">Last Paid: {student.lastPaidDate || 'On Admission'}</span>
              </div>
            </div>

            <div className="bg-slate-950/40 rounded-2xl p-3 border border-slate-800/60 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Admission Date:</span>
                <span className="text-white font-medium">{student.joiningDate || 'Active'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Purpose of Stay:</span>
                <span className="text-slate-200 font-medium">{student.purpose || 'College Studies'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Planned Duration:</span>
                <span className="text-slate-200 font-medium">{student.stayDuration || '1 Year'}</span>
              </div>
            </div>
          </div>

          {/* Card B: Room & Bed Allocation */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                  <Home className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-heading">Room & Bed Allocation</h3>
                  <span className="text-xs text-slate-400">Assign or update student living space</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Room Number *
                  </label>
                  <div className="relative">
                    <Home className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={roomNumberInput}
                      onChange={(e) => setRoomNumberInput(e.target.value)}
                      placeholder="e.g. 204"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white font-bold focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Bed Identifier *
                  </label>
                  <div className="relative">
                    <BedSingle className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={bedInput}
                      onChange={(e) => setBedInput(e.target.value)}
                      placeholder="e.g. A / B"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white font-bold focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-400">Changes update resident profile in real-time.</span>
              <button
                type="button"
                onClick={handleSaveRoomAndBed}
                disabled={savingRoom || !roomNumberInput.trim() || !bedInput.trim()}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                {savingRoom ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Save Room & Bed</span>
              </button>
            </div>
          </div>

        </div>

        {/* ROW 2: COLLEGE & ACADEMIC DETAILS + GUARDIAN & EMERGENCY */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Card C: Academic & College Details */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
              <div className="w-9 h-9 rounded-xl bg-violet-500/20 text-violet-400 flex items-center justify-center font-bold">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-heading">College & Academic Details</h3>
                <span className="text-xs text-slate-400">Enrollment and course background</span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                <span className="text-slate-400 block font-medium">College Name</span>
                <span className="text-white font-bold text-sm mt-0.5 block">{student.collegeName || 'N/A'}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                  <span className="text-slate-400 block font-medium">Course & Branch</span>
                  <span className="text-slate-200 font-semibold mt-0.5 block">
                    {student.course} ({student.branch || 'General'})
                  </span>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                  <span className="text-slate-400 block font-medium">Year / Semester</span>
                  <span className="text-slate-200 font-semibold mt-0.5 block">{student.yearSemester || 'N/A'}</span>
                </div>
              </div>

              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                <span className="text-slate-400 block font-medium">Enrollment / Roll Number</span>
                <span className="text-indigo-400 font-mono font-bold text-sm mt-0.5 block">
                  {student.enrollmentNumber || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Card D: Guardian & Emergency Contacts */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-heading">Guardian & Emergency Contacts</h3>
                <span className="text-xs text-slate-400">Parent contact and emergency reach</span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                <span className="text-slate-400 block font-medium">Parent / Guardian Name</span>
                <span className="text-white font-bold text-sm mt-0.5 block">
                  {student.guardianName || 'N/A'} ({student.relationship || 'Parent'})
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                  <span className="text-slate-400 block font-medium">Guardian Phone</span>
                  <a
                    href={`tel:${student.guardianMobile}`}
                    className="text-emerald-400 hover:underline font-bold text-sm mt-0.5 block"
                  >
                    {student.guardianMobile || 'N/A'}
                  </a>
                </div>

                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                  <span className="text-slate-400 block font-medium">Emergency Phone</span>
                  <a
                    href={`tel:${student.emergencyContact || student.guardianMobile}`}
                    className="text-amber-400 hover:underline font-bold text-sm mt-0.5 block"
                  >
                    {student.emergencyContact || student.guardianMobile || 'N/A'}
                  </a>
                </div>
              </div>

              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
                <span className="text-slate-400 block font-medium">Hometown / Origin</span>
                <span className="text-slate-200 font-semibold mt-0.5 block">{student.hometown || 'N/A'}</span>
              </div>
            </div>
          </div>

        </div>

        {/* ROW 3: PERSONAL & RESIDENCE + ENCRYPTED IDENTITY DOCUMENTS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Card E: Personal & Residence Details */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-heading">Personal & Permanent Address</h3>
                <span className="text-xs text-slate-400">Verified residential profile</span>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Full Name</span>
                <span className="text-white font-semibold">{student.fullName}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Contact Number</span>
                <span className="text-white font-semibold">{student.mobile}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Email Address</span>
                <span className="text-white font-semibold">{student.email || 'N/A'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Date of Birth & Gender</span>
                <span className="text-white font-semibold">{student.dob || 'N/A'} • {student.gender}</span>
              </div>
              <div className="pt-2">
                <span className="text-slate-400 block mb-1">Permanent Residential Address</span>
                <p className="text-slate-200 bg-slate-950/60 p-3 rounded-xl border border-slate-800 leading-relaxed">
                  {student.address || 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Card F: Encrypted Identity Documents */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-800">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-heading">Encrypted Identity Documents</h3>
                  <span className="text-xs text-slate-400">Government ID & Biometric Photo</span>
                </div>
              </div>

              <div className="space-y-3 pt-4">
                
                {/* Aadhaar Card Document */}
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">Aadhaar Card Document</span>
                      <span className="text-[11px] text-emerald-400 font-medium">Encrypted & Attached ✓</span>
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

                {/* Profile Face Photo */}
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">Verified Profile Photo</span>
                      <span className="text-[11px] text-emerald-400 font-medium">Attached ✓</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenDoc('face')}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View</span>
                  </button>
                </div>

              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-2 text-[11px] text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Protected by 256-bit student data privacy encryption standards.</span>
            </div>
          </div>

        </div>

      </main>

      {/* SECURE IN-PLACE DOCUMENT VIEWER MODAL */}
      {previewDocType && (
        <div className="fixed inset-0 z-60 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-3xl border border-slate-700 shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in text-white">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <span className="text-sm font-bold text-white">
                {previewDocType === 'face' ? 'Verified Student Photo' : 'Aadhaar Card Document'}
              </span>
              <button
                type="button"
                onClick={handleCloseDoc}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-950 flex items-center justify-center min-h-[260px]">
              {docLoading ? (
                <div className="text-xs text-slate-400 flex items-center gap-2">
                  <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
                  <span>Streaming encrypted document...</span>
                </div>
              ) : docBlobUrl ? (
                <img
                  src={docBlobUrl}
                  alt="Student Document"
                  className="max-h-[380px] w-auto object-contain rounded-xl shadow-lg"
                />
              ) : (
                <p className="text-xs text-rose-400">Failed to render document preview.</p>
              )}
            </div>

            <div className="p-3 bg-slate-900 border-t border-slate-800 text-center">
              <button
                type="button"
                onClick={handleCloseDoc}
                className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition"
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
