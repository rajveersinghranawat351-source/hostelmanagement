import React from 'react';
import { useAuth } from './context/AuthContext';
import RoleSelectionScreen from './components/RoleSelectionScreen';
import AuthScreen from './components/auth/AuthScreen';
import StudentPortal from './components/student/StudentPortal';
import OwnerPortal from './components/owner/OwnerPortal';
import Navbar from './components/common/Navbar';
import PWAInstallBanner from './components/common/PWAInstallBanner';

export default function App() {
  const { activeRole, selectRole, isAuthenticated, user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between relative">
      {/* 1. Role Selection Screen */}
      {!activeRole && <RoleSelectionScreen />}

      {/* 2. Unauthenticated -> Show Role-specific Auth (Login / Sign Up) */}
      {activeRole && !isAuthenticated && (
        <AuthScreen role={activeRole} onBack={() => selectRole(null)} />
      )}

      {/* 3. User is logged in, but role doesn't match active selected role */}
      {activeRole && isAuthenticated && user && user.role !== activeRole && (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between">
          <Navbar />
          <main className="max-w-md mx-auto my-auto p-6 bg-slate-800 rounded-3xl border border-slate-700 text-center shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-4 text-xl">
              ⚠️
            </div>
            <h2 className="text-xl font-bold mb-2">Role Mismatch</h2>
            <p className="text-sm text-slate-400 mb-6">
              You are currently logged in as a <strong>{user.role}</strong> ({user.name}), but you selected the{' '}
              <strong>{activeRole} portal</strong>.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => selectRole(user.role)}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition"
              >
                Switch to My {user.role === 'owner' ? 'Owner' : 'Student'} Portal
              </button>
              <button
                onClick={logout}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold text-xs transition"
              >
                Logout & Login as {activeRole}
              </button>
            </div>
          </main>
        </div>
      )}

      {/* 4. Authenticated in correct portal */}
      {activeRole && isAuthenticated && user && user.role === activeRole && (
        <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
          <Navbar />
          <main className="max-w-6xl mx-auto w-full px-4 sm:px-6 py-6 flex-1">
            {activeRole === 'student' ? <StudentPortal /> : <OwnerPortal />}
          </main>
          <footer className="text-center py-4 text-xs text-slate-400 border-t border-slate-200">
            Hostel Management • Smart Hostel & PG System
          </footer>
        </div>
      )}

      {/* PWA Install Banner */}
      <PWAInstallBanner />
    </div>
  );
}
