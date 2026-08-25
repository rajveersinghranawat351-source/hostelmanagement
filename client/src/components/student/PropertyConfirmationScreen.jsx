import React from 'react';
import { Building2, MapPin, Phone, User, CheckCircle2, ArrowRight, ArrowLeft, ShieldCheck, Home, BedSingle } from 'lucide-react';

export default function PropertyConfirmationScreen({ property, onConfirm, onCancel }) {
  if (!property) return null;

  return (
    <div className="w-full max-w-xl mx-auto animate-fade-in">
      
      {/* Step Indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
          <span>Student Onboarding</span>
          <span>Step 2 of 5: Verify Hostel</span>
        </div>
        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
          <div className="bg-indigo-600 h-full rounded-full transition-all duration-300 w-2/5" />
        </div>
        <div className="flex items-center justify-between text-[11px] font-medium text-slate-400 mt-2 px-1">
          <span className="text-indigo-600 font-medium">1. Scan QR</span>
          <span className="text-indigo-600 font-bold">2. Verify</span>
          <span>3. Information</span>
          <span>4. Review</span>
          <span>5. Connected</span>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden p-6 sm:p-8">
        
        {/* Verification Success Badge */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold mb-3 shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Hostel Account Found ✓</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 font-heading">
            {property.propertyName}
          </h2>
          <span className="inline-block mt-2 px-3 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
            {property.propertyType || 'Hostel / PG'}
          </span>
        </div>

        {/* Retrieved Details Card */}
        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 space-y-3.5 mb-6">
          
          <div className="flex items-start gap-3 text-xs sm:text-sm">
            <User className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-medium text-slate-400 block">Account Owner</span>
              <span className="text-slate-900 font-bold">{property.ownerName}</span>
            </div>
          </div>

          <div className="flex items-start gap-3 text-xs sm:text-sm pt-3 border-t border-slate-200/60">
            <MapPin className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <div>
              <span className="text-xs font-medium text-slate-400 block">Location & Address</span>
              <span className="text-slate-800 font-medium">{property.address}</span>
              {property.location && (
                <span className="text-xs text-slate-500 block mt-0.5">({property.location})</span>
              )}
            </div>
          </div>

          {/* Context from QR if available: Room & Bed */}
          {(property.room || property.bed) && (
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200/60 text-xs">
              <div className="flex items-center gap-2">
                <Home className="w-4 h-4 text-indigo-500 shrink-0" />
                <div>
                  <span className="text-slate-400 block font-medium">Assigned Room</span>
                  <span className="text-slate-900 font-bold">Room {property.room || '204'}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <BedSingle className="w-4 h-4 text-indigo-500 shrink-0" />
                <div>
                  <span className="text-slate-400 block font-medium">Assigned Bed</span>
                  <span className="text-slate-900 font-bold">Bed {property.bed || 'B'}</span>
                </div>
              </div>
            </div>
          )}

          {property.contact && (
            <div className="flex items-center gap-3 text-xs sm:text-sm pt-3 border-t border-slate-200/60">
              <Phone className="w-4 h-4 text-indigo-500 shrink-0" />
              <div>
                <span className="text-xs font-medium text-slate-400 block">Owner Contact</span>
                <span className="text-slate-800 font-medium">{property.contact}</span>
              </div>
            </div>
          )}

        </div>

        {/* Security & Privacy Notice */}
        <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900 mb-8">
          <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <p>
            Secure connection: Submitting registration will link your student profile directly to <strong>{property.ownerName}</strong>'s hostel account.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Rescan QR</span>
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="w-full sm:flex-1 py-3.5 px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm sm:text-base shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <span>Continue Registration →</span>
          </button>
        </div>

      </div>
    </div>
  );
}
