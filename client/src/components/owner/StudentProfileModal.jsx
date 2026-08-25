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
  Check
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

  const handleCloseDocPreview = () => {
    if (docBlobUrl) {
      URL.revokeObjectURL(docBlobUrl);
    }
    setDocBlobUrl(null);
    setPreviewDocType(null);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-600">Loading student details securely...</p>
        </div>
      </div>
    );
  }

  if (!student) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full my-auto overflow-hidden animate-fade-in">
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 flex items-center justify-center text-indigo-200 font-bold text-2xl shrink-0">
              {student.fullName?.charAt(0)}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight font-heading">{student.fullName}</h2>
                <span className="font-mono text-[10px] bg-slate-800 text-indigo-300 px-2 py-0.5 rounded-md border border-indigo-900">
                  {student.studentIdCode || 'STU-ID'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Joined: {student.joiningDate ? new Date(student.joiningDate).toLocaleDateString() : 'Active'} • {student.gender} • DOB: {student.dob || 'N/A'}
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

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          
          {/* Status Controls */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-slate-800 block">Hostel Admission Status</span>
              <span className="text-[11px] text-slate-500">Current state: <strong>{student.status.toUpperCase()}</strong></span>
            </div>

            <div className="flex items-center gap-2">
              {student.status !== 'active' && (
                <button
                  onClick={() => handleUpdateStatus('active')}
                  disabled={statusUpdating}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Approve (Active)</span>
                </button>
              )}

              {student.status !== 'vacated' && (
                <button
                  onClick={() => handleUpdateStatus('vacated')}
                  disabled={statusUpdating}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <span>Mark as Vacated</span>
                </button>
              )}

              {student.status !== 'pending' && (
                <button
                  onClick={() => handleUpdateStatus('pending')}
                  disabled={statusUpdating}
                  className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  <span>Reset to Pending</span>
                </button>
              )}
            </div>
          </div>

          {/* Room & Bed Allocation */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Home className="w-4 h-4 text-indigo-600" />
              <div>
                <span className="text-xs font-bold text-slate-800 block">Room & Bed Allocation</span>
                <span className="text-[11px] text-slate-500">Assign specific room number and bed letter</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={roomNumberInput}
                onChange={(e) => setRoomNumberInput(e.target.value)}
                placeholder="Room e.g. 204"
                className="w-24 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-indigo-500"
              />
              <input
                type="text"
                value={bedInput}
                onChange={(e) => setBedInput(e.target.value)}
                placeholder="Bed e.g. B"
                className="w-16 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={handleSaveRoomAndBed}
                disabled={savingRoom}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                {savingRoom ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                <span>Save</span>
              </button>
            </div>
          </div>

          {/* College Information */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              <GraduationCap className="w-4 h-4 text-indigo-500" />
              <span>College & Academic Details</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-4 rounded-2xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">College Name</span>
                <span className="text-slate-900 font-bold">{student.collegeName || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Course & Branch</span>
                <span className="text-slate-800 font-bold">{student.course} ({student.branch || 'General'})</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Year / Semester</span>
                <span className="text-slate-800 font-bold">{student.yearSemester || 'N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Enrollment No</span>
                <span className="text-slate-800 font-mono font-bold">{student.enrollmentNumber || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Guardian Information */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              <Users className="w-4 h-4 text-indigo-500" />
              <span>Guardian & Emergency Contact</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-4 rounded-2xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Parent / Guardian Name</span>
                <span className="text-slate-900 font-bold">{student.guardianName || 'N/A'} ({student.relationship || 'Parent'})</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Guardian Phone</span>
                <a href={`tel:${student.guardianMobile}`} className="text-indigo-600 font-bold hover:underline">
                  {student.guardianMobile || 'N/A'}
                </a>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Emergency Contact</span>
                <a href={`tel:${student.emergencyContact}`} className="text-slate-800 font-bold hover:underline">
                  {student.emergencyContact || student.guardianMobile}
                </a>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Student Mobile</span>
                <a href={`tel:${student.mobile}`} className="text-indigo-600 font-bold hover:underline">
                  {student.mobile}
                </a>
              </div>
            </div>
          </div>

          {/* Personal & Address */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              <MapPin className="w-4 h-4 text-indigo-500" />
              <span>Residence & Hometown</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 text-xs space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400 block font-medium">Hometown (From)</span>
                  <span className="text-slate-800 font-bold">{student.hometown}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Purpose of Stay</span>
                  <span className="text-slate-800 font-bold">{student.purpose}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-400 block font-medium mb-0.5">Permanent Address</span>
                <span className="text-slate-800 font-medium leading-relaxed">{student.address}</span>
              </div>
            </div>
          </div>

          {/* Identity Documents */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              <ShieldCheck className="w-4 h-4 text-indigo-500" />
              <span>Encrypted Identity Documents</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Aadhaar Document</span>
                    <span className="text-[11px] text-emerald-600 font-medium">Uploaded ✓</span>
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
                    <span className="text-xs font-bold text-slate-800 block">Profile Face Photo</span>
                    <span className="text-[11px] text-emerald-600 font-medium">Verified ✓</span>
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

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            Owner Authorized Record
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>

      {/* Internal Document Viewer Modal */}
      {previewDocType && (
        <div className="fixed inset-0 z-60 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-900">
                {previewDocType === 'face' ? `${student.fullName} — Profile Photo` : `${student.fullName} — Aadhaar Card`}
              </span>
              <button
                onClick={handleCloseDocPreview}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-900 flex items-center justify-center min-h-[260px]">
              {docLoading ? (
                <div className="text-white text-xs flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Streaming document...</span>
                </div>
              ) : docBlobUrl ? (
                <img
                  src={docBlobUrl}
                  alt="Document"
                  className="max-h-[380px] w-auto object-contain rounded-lg"
                />
              ) : (
                <p className="text-xs text-rose-300">Document preview failed.</p>
              )}
            </div>

            <div className="p-3 bg-slate-50 text-center">
              <button
                onClick={handleCloseDocPreview}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
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
