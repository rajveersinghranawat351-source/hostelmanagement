import React, { useState, useEffect } from 'react';
import { Building2, GraduationCap, ArrowLeftRight, LogOut, Download, Smartphone } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const { user, activeRole, selectRole, logout, isAuthenticated } = useAuth();
  const [canInstall, setCanInstall] = useState(false);
  const [installPromptEvent, setInstallPromptEvent] = useState(null);

  useEffect(() => {
    const handlePrompt = (e) => {
      e.preventDefault();
      setInstallPromptEvent(e);
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handlePrompt);
    return () => window.removeEventListener('beforeinstallprompt', handlePrompt);
  }, []);

  const handleInstallApp = async () => {
    if (!installPromptEvent) return;
    installPromptEvent.prompt();
    await installPromptEvent.userChoice;
    setCanInstall(false);
    setInstallPromptEvent(null);
  };

  if (!activeRole) return null;

  const isOwner = activeRole === 'owner';

  return (
    <header className="bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        
        {/* Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => selectRole(null)}
            className="flex items-center gap-2 text-left group cursor-pointer"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-bold text-slate-900 font-heading block leading-none">
                HostelStay
              </span>
              <span className="text-[10px] text-slate-400 font-medium leading-none">
                Smart PG Portal
              </span>
            </div>
          </button>

          {/* Active Portal Badge */}
          <div className="hidden sm:flex items-center gap-1.5 ml-2 px-3 py-1 rounded-full text-xs font-semibold border">
            {isOwner ? (
              <span className="bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" />
                Owner Portal
              </span>
            ) : (
              <span className="bg-indigo-50 text-indigo-700 border-indigo-200 flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5" />
                Student Portal
              </span>
            )}
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* In-app Install App Button if supported */}
          {canInstall && (
            <button
              onClick={handleInstallApp}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 transition cursor-pointer"
              title="Install App"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Install App</span>
              <span className="sm:hidden">Install</span>
            </button>
          )}

          {/* Switch Role Button */}
          <button
            onClick={() => selectRole(null)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Switch Role</span>
            <span className="sm:hidden">Switch</span>
          </button>

          {isAuthenticated && user && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-700">
                {user.name?.charAt(0) || 'U'}
              </div>
              <button
                onClick={logout}
                title="Logout"
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}
