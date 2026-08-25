import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { CheckCircle2, ArrowRight, Building2, ShieldCheck, Sparkles, Home, BedSingle, FileBadge } from 'lucide-react';

export default function RegistrationSuccessScreen({ profile, onGoToDashboard }) {
  useEffect(() => {
    confetti({
      particleCount: 90,
      spread: 75,
      origin: { y: 0.6 },
    });
  }, []);

  return (
    <div className="w-full max-w-xl mx-auto animate-fade-in text-center pb-12">
      
      {/* Step Indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
          <span>Student Onboarding</span>
          <span>Step 5 of 5: Connected</span>
        </div>
        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
          <div className="bg-emerald-500 h-full rounded-full transition-all duration-300 w-full" />
        </div>
        <div className="flex items-center justify-between text-[11px] font-medium text-slate-400 mt-2 px-1">
          <span className="text-emerald-600 font-medium">1. Scan QR</span>
          <span className="text-emerald-600 font-medium">2. Verify</span>
          <span className="text-emerald-600 font-medium">3. Information</span>
          <span className="text-emerald-600 font-medium">4. Review</span>
          <span className="text-emerald-600 font-bold">5. Connected</span>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl p-6 sm:p-8">
        
        {/* Animated Celebration Icon */}
        <div className="w-20 h-20 rounded-full bg-emerald-50 border-4 border-emerald-100 flex items-center justify-center mx-auto mb-6 text-emerald-500 shadow-xl shadow-emerald-500/15">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold mb-3 shadow-xs">
          <Sparkles className="w-3.5 h-3.5" />
          🎉 Account Connected Successfully
        </span>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-1 font-heading">
          Welcome to {profile?.property_name || 'Hostel'}!
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mb-6">
          Your student account has been linked to the hostel owner account.
        </p>

        {/* Link Details Card */}
        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 text-left space-y-3.5 mb-8 text-xs">
          
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <span className="text-slate-500 font-medium">Connection Status</span>
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              🟢 Connected to Hostel
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-200">
            <div>
              <span className="text-slate-400 block font-medium">Generated Student ID</span>
              <span className="font-mono text-sm font-bold text-indigo-700">
                {profile?.student_id_code || 'STU-2026-ACTIVE'}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Hostel Owner</span>
              <span className="font-bold text-slate-900">{profile?.owner_name || 'Rajesh Sharma'}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2">
              <Home className="w-4 h-4 text-indigo-500" />
              <div>
                <span className="text-slate-400 block font-medium">Assigned Room</span>
                <span className="font-bold text-slate-900">Room {profile?.room_number || '204'}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <BedSingle className="w-4 h-4 text-indigo-500" />
              <div>
                <span className="text-slate-400 block font-medium">Assigned Bed</span>
                <span className="font-bold text-slate-900">Bed {profile?.bed || 'B'}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Action Button */}
        <button
          onClick={onGoToDashboard}
          className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm sm:text-base shadow-xl shadow-indigo-600/25 flex items-center justify-center gap-2 transition cursor-pointer"
        >
          <span>Go to Student Dashboard</span>
          <ArrowRight className="w-5 h-5" />
        </button>

      </div>
    </div>
  );
}
