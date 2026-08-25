import React, { useState, useRef } from 'react';
import {
  User,
  Phone,
  Mail,
  Calendar,
  MapPin,
  Compass,
  GraduationCap,
  BookOpen,
  Layers,
  FileBadge,
  Users,
  HeartHandshake,
  FileText,
  Home,
  BedSingle,
  Camera,
  Upload,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Trash2,
  RefreshCw,
  ShieldCheck,
  Loader2,
  Sparkles,
  Building2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';

// Helper to ensure a File or Blob is available even if DataURL was captured
async function ensureFileObject(fileOrPreview, defaultFilename) {
  if (fileOrPreview instanceof File || fileOrPreview instanceof Blob) {
    return fileOrPreview;
  }
  if (typeof fileOrPreview === 'string' && (fileOrPreview.startsWith('data:') || fileOrPreview.startsWith('blob:'))) {
    try {
      const res = await fetch(fileOrPreview);
      const blob = await res.blob();
      const ext = blob.type.includes('png') ? '.png' : blob.type.includes('pdf') ? '.pdf' : '.jpg';
      return new File([blob], `${defaultFilename}${ext}`, { type: blob.type || 'image/jpeg' });
    } catch (e) {
      console.warn('Failed to convert preview to File:', e);
    }
  }
  return null;
}

export default function StudentRegistrationForm({ property, onBackToScan, onRegistrationSuccess }) {
  const { user } = useAuth();
  const { showError, showSuccess } = useToast();

  const [isReviewMode, setIsReviewMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State with all required sections
  const [formData, setFormData] = useState({
    // Personal Information
    fullName: user?.name || '',
    dob: '2003-05-14',
    gender: 'Male',
    mobile: user?.mobile || '',
    email: user?.email || '',
    address: '',
    hometown: '',
    // College Information
    collegeName: '',
    course: 'B.Tech',
    branch: 'Computer Science',
    yearSemester: '1st Year',
    enrollmentNumber: '',
    // Guardian Information
    guardianName: '',
    guardianMobile: '',
    emergencyContact: '',
    relationship: 'Father',
    // Stay Information (auto-populated from QR where available)
    hostelName: property.propertyName,
    ownerName: property.ownerName,
    roomNumber: property.room || '204',
    bed: property.bed || 'B',
    purpose: 'College / Higher Studies',
    stayDuration: '1 Year',
  });

  // Documents
  const [facePhotoFile, setFacePhotoFile] = useState(null);
  const [facePhotoPreview, setFacePhotoPreview] = useState(null);

  const [aadhaarFile, setAadhaarFile] = useState(null);
  const [aadhaarPreview, setAadhaarPreview] = useState(null);

  const faceInputRef = useRef(null);
  const faceCameraRef = useRef(null);
  const aadhaarInputRef = useRef(null);
  const aadhaarCameraRef = useRef(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFacePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        showError('Photo size exceeds 10MB limit.');
        return;
      }
      setFacePhotoFile(file);
      setFacePhotoPreview(URL.createObjectURL(file));
      showSuccess('Profile photo selected!');
    }
  };

  const handleAadhaarSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        showError('File size exceeds 10MB limit.');
        return;
      }
      setAadhaarFile(file);
      setAadhaarPreview(URL.createObjectURL(file));
      showSuccess('Aadhaar card document selected!');
    }
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) return 'Please enter your Full Name.';
    if (!formData.mobile.trim()) return 'Please enter your Mobile Number.';
    if (!formData.address.trim()) return 'Please enter your Permanent Address.';
    if (!formData.hometown.trim()) return 'Please enter your Hometown.';
    if (!formData.collegeName.trim()) return 'Please enter your College Name.';
    if (!formData.guardianName.trim()) return 'Please enter Parent/Guardian Name.';
    if (!formData.guardianMobile.trim()) return 'Please enter Guardian Mobile Number.';
    if (!facePhotoFile && !facePhotoPreview) return 'Please upload or capture your Profile/Face Photo.';
    if (!aadhaarFile && !aadhaarPreview) return 'Please upload your Aadhaar Card document.';
    return null;
  };

  const handleProceedToReview = (e) => {
    e.preventDefault();
    const error = validateForm();
    if (error) {
      showError(error);
      return;
    }
    setIsReviewMode(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);

    try {
      // 1. Resolve and validate files before submission
      const resolvedFace = await ensureFileObject(facePhotoFile || facePhotoPreview, 'face_photo');
      const resolvedAadhaar = await ensureFileObject(aadhaarFile || aadhaarPreview, 'aadhaar_doc');

      if (!resolvedFace) {
        showError('Please upload your Face / Profile photo before submitting.');
        setSubmitting(false);
        return;
      }
      if (!resolvedAadhaar) {
        showError('Please upload your Aadhaar card document before submitting.');
        setSubmitting(false);
        return;
      }

      // 2. Build FormData cleanly without setting manual Content-Type header
      const payload = new FormData();
      payload.append('qrIdentifier', property.qrIdentifier);
      payload.append('propertyId', property.id);

      // Personal
      payload.append('fullName', formData.fullName.trim());
      payload.append('dob', formData.dob);
      payload.append('gender', formData.gender);
      payload.append('mobile', formData.mobile.trim());
      payload.append('email', formData.email.trim());
      payload.append('address', formData.address.trim());
      payload.append('hometown', formData.hometown.trim());

      // College
      payload.append('collegeName', formData.collegeName.trim());
      payload.append('course', formData.course);
      payload.append('branch', formData.branch.trim());
      payload.append('yearSemester', formData.yearSemester);
      payload.append('enrollmentNumber', formData.enrollmentNumber.trim());

      // Guardian
      payload.append('guardianName', formData.guardianName.trim());
      payload.append('guardianMobile', formData.guardianMobile.trim());
      payload.append('emergencyContact', (formData.emergencyContact || formData.guardianMobile).trim());
      payload.append('relationship', formData.relationship);

      // Stay
      payload.append('purpose', formData.purpose);
      payload.append('stayDuration', formData.stayDuration);
      payload.append('roomNumber', formData.roomNumber);
      payload.append('bed', formData.bed);

      // Append files
      payload.append('facePhoto', resolvedFace, resolvedFace.name || 'face_photo.jpg');
      payload.append('aadhaarDocument', resolvedAadhaar, resolvedAadhaar.name || 'aadhaar_doc.jpg');

      const res = await api.registerStudent(payload);
      showSuccess('Hostel registration submitted successfully!');
      onRegistrationSuccess(res.profile);
    } catch (err) {
      console.error('Registration submit error:', err);
      showError(err.message || 'Failed to submit registration. Please check your information.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto animate-fade-in pb-12">
      
      {/* Step Indicator Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
          <span>Joining {property.propertyName}</span>
          <span>{isReviewMode ? 'Step 4 of 5: Review' : 'Step 3 of 5: Student Information'}</span>
        </div>
        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
          <div
            className="bg-indigo-600 h-full rounded-full transition-all duration-300"
            style={{ width: isReviewMode ? '80%' : '60%' }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] font-medium text-slate-400 mt-2 px-1">
          <span className="text-indigo-600 font-medium">1. Scan QR</span>
          <span className="text-indigo-600 font-medium">2. Verify</span>
          <span className={`font-bold ${!isReviewMode ? 'text-indigo-600' : 'text-indigo-600'}`}>3. Information</span>
          <span className={isReviewMode ? 'text-indigo-600 font-bold' : ''}>4. Review</span>
          <span>5. Connected</span>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden p-6 sm:p-8">
        
        {/* VIEW A: FILL INFORMATION FORM */}
        {!isReviewMode ? (
          <form onSubmit={handleProceedToReview} className="space-y-8 animate-fade-in">
            
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 font-heading">
                Student Information Form
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Please complete your details to link your account to <strong>{property.propertyName}</strong>.
              </p>
            </div>

            {/* SECTION 1: PERSONAL INFORMATION */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-sm font-bold text-slate-900">
                <User className="w-4 h-4 text-indigo-600" />
                <span>1. Personal Information</span>
              </div>

              {/* Photo Upload & Preview Card */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center gap-4">
                <input
                  ref={faceInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFacePhotoSelect}
                  className="hidden"
                />
                <input
                  ref={faceCameraRef}
                  type="file"
                  accept="image/*"
                  capture="user"
                  onChange={handleFacePhotoSelect}
                  className="hidden"
                />

                <div className="w-20 h-20 rounded-2xl bg-white border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden shrink-0">
                  {facePhotoPreview ? (
                    <img src={facePhotoPreview} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <Camera className="w-8 h-8 text-slate-400" />
                  )}
                </div>

                <div className="flex-1 text-center sm:text-left">
                  <span className="text-xs font-bold text-slate-800 block mb-1">Your Profile / Face Photo *</span>
                  <p className="text-[11px] text-slate-500 mb-2">Capture a clear selfie or upload from gallery</p>
                  
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <button
                      type="button"
                      onClick={() => faceCameraRef.current?.click()}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Take Photo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => faceInputRef.current?.click()}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload</span>
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="e.g. Abhishek Sharma"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth *</label>
                  <input
                    type="date"
                    name="dob"
                    value={formData.dob}
                    onChange={handleChange}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Gender *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Male', 'Female', 'Other'].map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setFormData({ ...formData, gender: g })}
                        className={`py-2 text-xs font-bold rounded-xl border transition ${
                          formData.gender === g
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-700'
                            : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mobile Number *</label>
                  <input
                    type="tel"
                    name="mobile"
                    value={formData.mobile}
                    onChange={handleChange}
                    placeholder="e.g. 9876543210"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="e.g. name@example.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hometown / City *</label>
                  <input
                    type="text"
                    name="hometown"
                    value={formData.hometown}
                    onChange={handleChange}
                    placeholder="e.g. Jaipur, Rajasthan"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Permanent Address *</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Full residential address"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 2: COLLEGE INFORMATION */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-sm font-bold text-slate-900">
                <GraduationCap className="w-4 h-4 text-indigo-600" />
                <span>2. College Information</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">College / Institute Name *</label>
                <input
                  type="text"
                  name="collegeName"
                  value={formData.collegeName}
                  onChange={handleChange}
                  placeholder="e.g. Jaipur Engineering College & Research Centre (JECRC)"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Course *</label>
                  <select
                    name="course"
                    value={formData.course}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 transition"
                  >
                    <option value="B.Tech">B.Tech / B.E.</option>
                    <option value="BCA / MCA">BCA / MCA</option>
                    <option value="MBBS / Medical">MBBS / Medical</option>
                    <option value="MBA / BBA">MBA / BBA</option>
                    <option value="B.Sc / M.Sc">B.Sc / M.Sc</option>
                    <option value="Coaching / Test Prep">Coaching / Test Prep</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Branch / Specialization</label>
                  <input
                    type="text"
                    name="branch"
                    value={formData.branch}
                    onChange={handleChange}
                    placeholder="e.g. Computer Science, AI, Mechanical"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Year / Semester *</label>
                  <select
                    name="yearSemester"
                    value={formData.yearSemester}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 transition"
                  >
                    <option value="1st Year / 1st Sem">1st Year</option>
                    <option value="2nd Year / 3rd Sem">2nd Year</option>
                    <option value="3rd Year / 5th Sem">3rd Year</option>
                    <option value="4th Year / 7th Sem">4th Year</option>
                    <option value="Final Year">Final Year</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Student ID / Enrollment No <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    name="enrollmentNumber"
                    value={formData.enrollmentNumber}
                    onChange={handleChange}
                    placeholder="e.g. JECRC-2023-CS-094"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>
            </div>

            {/* SECTION 3: GUARDIAN INFORMATION */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-sm font-bold text-slate-900">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>3. Guardian Information</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Parent / Guardian Name *</label>
                  <input
                    type="text"
                    name="guardianName"
                    value={formData.guardianName}
                    onChange={handleChange}
                    placeholder="e.g. Vikram Sharma"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Guardian Mobile Number *</label>
                  <input
                    type="tel"
                    name="guardianMobile"
                    value={formData.guardianMobile}
                    onChange={handleChange}
                    placeholder="e.g. 9829012345"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Emergency Contact Number</label>
                  <input
                    type="tel"
                    name="emergencyContact"
                    value={formData.emergencyContact}
                    onChange={handleChange}
                    placeholder="e.g. Alternate phone"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Relationship *</label>
                  <select
                    name="relationship"
                    value={formData.relationship}
                    onChange={handleChange}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 transition"
                  >
                    <option value="Father">Father</option>
                    <option value="Mother">Mother</option>
                    <option value="Local Guardian">Local Guardian</option>
                    <option value="Brother / Sister">Brother / Sister</option>
                  </select>
                </div>
              </div>
            </div>

            {/* SECTION 4: STAY DETAILS & AADHAAR */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-sm font-bold text-slate-900">
                <Home className="w-4 h-4 text-indigo-600" />
                <span>4. Stay Details & Aadhaar Document</span>
              </div>

              {/* Auto-populated from QR */}
              <div className="p-4 bg-indigo-50/70 rounded-2xl border border-indigo-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Hostel (From QR)</span>
                  <span className="text-indigo-900 font-bold">{formData.hostelName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Owner (From QR)</span>
                  <span className="text-indigo-900 font-bold">{formData.ownerName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Room Assigned</span>
                  <span className="text-indigo-900 font-bold">Room {formData.roomNumber}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Bed Assigned</span>
                  <span className="text-indigo-900 font-bold">Bed {formData.bed}</span>
                </div>
              </div>

              {/* Aadhaar Upload Card */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <input
                  ref={aadhaarInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleAadhaarSelect}
                  className="hidden"
                />
                <input
                  ref={aadhaarCameraRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleAadhaarSelect}
                  className="hidden"
                />

                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-800">Aadhaar Card Document *</span>
                  </div>
                  {aadhaarPreview && (
                    <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Uploaded ✓
                    </span>
                  )}
                </div>

                {aadhaarPreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-white p-2">
                    <img src={aadhaarPreview} alt="Aadhaar" className="w-full h-36 object-contain bg-slate-50 rounded-lg" />
                    <div className="flex justify-end gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => aadhaarInputRef.current?.click()}
                        className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        Replace
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAadhaarFile(null);
                          setAadhaarPreview(null);
                        }}
                        className="px-2.5 py-1 bg-rose-50 text-rose-600 rounded-lg text-xs font-semibold cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => aadhaarCameraRef.current?.click()}
                      className="p-3 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Camera className="w-4 h-4 text-indigo-500" />
                      <span>Take Photo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => aadhaarInputRef.current?.click()}
                      className="p-3 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Upload className="w-4 h-4 text-indigo-500" />
                      <span>Upload File</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-100">
              <button
                type="button"
                onClick={onBackToScan}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>

              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-indigo-600/20 flex items-center gap-2 transition cursor-pointer"
              >
                <span>Review Information</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </form>
        ) : (
          /* VIEW B: REVIEW BEFORE SUBMIT */
          <div className="space-y-6 animate-fade-in">
            
            <div>
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block">
                Final Step
              </span>
              <h2 className="text-2xl font-extrabold text-slate-900 font-heading">
                Review Your Information
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Please double check your details before connecting to <strong>{property.propertyName}</strong>.
              </p>
            </div>

            {/* Summary Sections */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-4 text-xs">
              
              {/* Personal Card */}
              <div className="flex items-center gap-4 pb-4 border-b border-slate-200">
                {facePhotoPreview && (
                  <img
                    src={facePhotoPreview}
                    alt="Applicant"
                    className="w-16 h-16 rounded-xl object-cover border-2 border-indigo-500 shadow-sm"
                  />
                )}
                <div>
                  <h4 className="text-base font-bold text-slate-900">{formData.fullName}</h4>
                  <p className="text-slate-500 font-medium">{formData.gender} • DOB: {formData.dob}</p>
                  <p className="text-slate-700 font-bold mt-0.5">{formData.mobile} {formData.email ? `• ${formData.email}` : ''}</p>
                </div>
              </div>

              {/* College Card */}
              <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-200">
                <div>
                  <span className="text-slate-400 block font-medium">College</span>
                  <span className="text-slate-800 font-bold">{formData.collegeName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Course & Branch</span>
                  <span className="text-slate-800 font-bold">{formData.course} ({formData.branch})</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Year / Sem</span>
                  <span className="text-slate-800 font-bold">{formData.yearSemester}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Enrollment No</span>
                  <span className="text-slate-800 font-bold">{formData.enrollmentNumber || 'N/A'}</span>
                </div>
              </div>

              {/* Guardian Card */}
              <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-200">
                <div>
                  <span className="text-slate-400 block font-medium">Guardian Name ({formData.relationship})</span>
                  <span className="text-slate-800 font-bold">{formData.guardianName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Guardian Phone</span>
                  <span className="text-slate-800 font-bold">{formData.guardianMobile}</span>
                </div>
              </div>

              {/* Stay & Room Card */}
              <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-200">
                <div>
                  <span className="text-slate-400 block font-medium">Hostel & Owner</span>
                  <span className="text-slate-800 font-bold">{formData.hostelName} ({formData.ownerName})</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Room & Bed</span>
                  <span className="text-indigo-900 font-extrabold">Room {formData.roomNumber} • Bed {formData.bed}</span>
                </div>
              </div>

              {/* Documents Badges */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Profile Photo Attached ✓
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Aadhaar Document Attached ✓
                </span>
              </div>

            </div>

            {/* Privacy Guarantee Note */}
            <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <p>
                <strong>Security Guarantee:</strong> Your information will only be linked to the verified hostel account of <strong>{property.ownerName}</strong>.
              </p>
            </div>

            {/* Review Action Buttons */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsReviewMode(false)}
                disabled={submitting}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>← Edit Information</span>
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-600/25 flex items-center gap-2 transition cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Connecting Account...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Confirm & Join Hostel</span>
                  </>
                )}
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
