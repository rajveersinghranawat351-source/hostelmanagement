import React from 'react';
import { GraduationCap, Building2, ShieldCheck, QrCode, Sparkles, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function RoleSelectionScreen() {
  const { selectRole } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Brand Bar */}
      <header className="max-w-6xl mx-auto w-full flex items-center justify-between py-2 sm:py-4 gap-2">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 shrink-0">
            <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div className="min-w-0">
            <span className="text-lg sm:text-xl font-bold tracking-tight text-white font-heading block truncate">
              Hostel Management
            </span>
            <span className="text-[11px] text-indigo-300 font-medium block">
              Smart PG & Resident Portal
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/80 border border-slate-700/80 px-2.5 sm:px-3 py-1.5 rounded-full backdrop-blur shrink-0">
          <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
          <span className="hidden sm:inline">Secure Permanent QR System</span>
          <span className="sm:hidden text-[11px]">Secure QR</span>
        </div>
      </header>

      {/* Hero Content */}
      <main className="max-w-4xl mx-auto w-full my-auto py-8">
        <div className="text-center mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-indigo-300 text-xs sm:text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>Fast, Paperless & Seamless Onboarding</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
            How do you want to continue?
          </h1>
          <p className="text-slate-400 text-base sm:text-lg max-w-lg mx-auto">
            Choose your role to enter the personalized portal. Students can instantly scan QR to join, and Owners can effortlessly manage their PG.
          </p>
        </div>

        {/* 2 Large Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          
          {/* Card 1: Student / User */}
          <div
            onClick={() => selectRole('student')}
            className="group relative bg-gradient-to-b from-slate-800/90 to-slate-900/90 border border-slate-700/80 hover:border-indigo-500/80 rounded-2xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1 cursor-pointer"
          >
            <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-indigo-400/50 group-hover:bg-indigo-400 transition" />
            
            <div>
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <GraduationCap className="w-8 h-8 text-indigo-400" />
              </div>

              <div className="flex items-center gap-2 text-2xl font-bold text-white mb-2">
                <span>👨‍🎓 Student / User</span>
              </div>
              <p className="text-slate-400 text-sm sm:text-base leading-relaxed mb-6">
                Scan your PG/Hostel QR code, complete instant digital verification, and access your stay details anytime.
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 text-xs text-indigo-300/80 mb-4 bg-indigo-950/40 p-2.5 rounded-xl border border-indigo-800/30">
                <QrCode className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Instant QR camera scanning & paperless join</span>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  selectRole('student');
                }}
                className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-sm sm:text-base shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition"
              >
                <span>Continue as Student</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Card 2: Owner */}
          <div
            onClick={() => selectRole('owner')}
            className="group relative bg-gradient-to-b from-slate-800/90 to-slate-900/90 border border-slate-700/80 hover:border-emerald-500/80 rounded-2xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/10 hover:-translate-y-1 cursor-pointer"
          >
            <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-emerald-400/50 group-hover:bg-emerald-400 transition" />

            <div>
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                <Building2 className="w-8 h-8 text-emerald-400" />
              </div>

              <div className="flex items-center gap-2 text-2xl font-bold text-white mb-2">
                <span>🏠 Owner</span>
              </div>
              <p className="text-slate-400 text-sm sm:text-base leading-relaxed mb-6">
                Generate your permanent property QR, receive instant student join requests, verify documents, and manage residents.
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 text-xs text-emerald-300/80 mb-4 bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-800/30">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>1 Permanent QR for all new student registrations</span>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  selectRole('owner');
                }}
                className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-sm sm:text-base shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition"
              >
                <span>Continue as Owner</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

        </div>
      </main>

      {/* Footer info */}
      <footer className="max-w-4xl mx-auto w-full text-center py-4 text-xs text-slate-500 border-t border-slate-800/80">
        <p>Hostel Management • Secure, Mobile-Friendly & Paperless PWA</p>
      </footer>
    </div>
  );
}
