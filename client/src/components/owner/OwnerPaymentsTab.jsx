import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Receipt,
  Users,
  CheckCircle2,
  Clock3,
  AlertCircle,
  Search,
  Settings,
  RefreshCw,
  Edit2,
  ChevronRight,
  TrendingUp,
  SlidersHorizontal,
  Home,
  User,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import OwnerPaymentSettingsModal from './OwnerPaymentSettingsModal';
import TenantPaymentLedgerModal from './TenantPaymentLedgerModal';

export default function OwnerPaymentsTab() {
  const { showError, showSuccess } = useToast();

  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all' | 'paid' | 'due' | 'overdue'
  const [searchQuery, setSearchQuery] = useState('');
  const [errorState, setErrorState] = useState(null);

  // Modals
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState(null);

  useEffect(() => {
    fetchPaymentDashboard();
  }, []);

  const fetchPaymentDashboard = async () => {
    setLoading(true);
    setErrorState(null);
    try {
      const res = await api.getOwnerPaymentDashboard();
      if (res && res.tenants) {
        setDashboardData(res);
      } else {
        setDashboardData({
          summary: {
            totalTenants: 0,
            totalExpectedRevenue: 0,
            totalCollectedThisMonth: 0,
            pendingCount: 0,
            overdueCount: 0,
            paidCount: 0,
          },
          tenants: [],
        });
      }
    } catch (err) {
      console.warn('Owner payment dashboard fetch error:', err);
      setErrorState('Unable to load rent records. Please check your connection and retry.');
    } finally {
      setLoading(false);
    }
  };

  const summary = dashboardData?.summary || {
    totalTenants: 0,
    totalExpectedRevenue: 0,
    totalCollectedThisMonth: 0,
    pendingCount: 0,
    overdueCount: 0,
    paidCount: 0,
  };

  const tenants = dashboardData?.tenants || [];

  // Filter & Search
  const filteredTenants = tenants.filter((t) => {
    if (filter !== 'all') {
      if (filter === 'paid' && t.status !== 'paid') return false;
      if (filter === 'due' && t.status !== 'due') return false;
      if (filter === 'overdue' && t.status !== 'overdue') return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = t.fullName?.toLowerCase().includes(q);
      const roomMatch = t.roomNumber?.toLowerCase().includes(q);
      const mobileMatch = t.mobile?.includes(q);
      if (!nameMatch && !roomMatch && !mobileMatch) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* 1. TOP HEADER & SETTINGS ACTION */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading">
              Room Rent & Payments
            </h2>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
              Live Ledger
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Track monthly room rent dues, collections, UPI records, and individual tenant ledgers.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center justify-center gap-2 cursor-pointer min-h-[40px]"
          >
            <Settings className="w-4 h-4 text-emerald-400" />
            <span>UPI & Fee Settings</span>
          </button>

          <button
            type="button"
            onClick={fetchPaymentDashboard}
            title="Refresh"
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. COLLECTION METRICS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Total Monthly Expected Rent */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Expected</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-900 font-heading">
            ₹{summary.totalExpectedRevenue.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-slate-400 mt-0.5 block">{summary.totalTenants} Resident(s) enrolled</span>
        </div>

        {/* Total Rent Collected This Cycle */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Collected</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 font-heading">
            ₹{summary.totalCollectedThisMonth.toLocaleString('en-IN')}
          </div>
          <span className="text-[11px] text-emerald-700/80 mt-0.5 block">{summary.paidCount} Paid ✓</span>
        </div>

        {/* Pending Collections */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Pending Dues</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock3 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-amber-600 font-heading">
            {summary.pendingCount}
          </div>
          <span className="text-[11px] text-amber-700/80 mt-0.5 block">Residents due this cycle</span>
        </div>

        {/* Overdue Payments */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-rose-700 uppercase tracking-wider">Overdue</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-rose-600 font-heading">
            {summary.overdueCount}
          </div>
          <span className="text-[11px] text-rose-700/80 mt-0.5 block">Payment date passed</span>
        </div>

      </div>

      {/* 3. SEARCH & FILTER CONTROLS */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-200/80 shadow-sm">
        
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student name, room number, or mobile..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: `All (${summary.totalTenants})` },
            { id: 'paid', label: `Paid (${summary.paidCount})` },
            { id: 'due', label: `Due (${summary.pendingCount})` },
            { id: 'overdue', label: `Overdue (${summary.overdueCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                filter === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. ERROR STATE OR TENANTS RENT LEDGER LIST */}
      {errorState ? (
        <div className="p-8 text-center bg-white rounded-3xl border border-rose-200 shadow-sm text-slate-700 space-y-3">
          <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
          <div>
            <h4 className="text-base font-bold text-slate-900">Failed to Load Rent Records</h4>
            <p className="text-xs text-slate-500 mt-1">{errorState}</p>
          </div>
          <button
            type="button"
            onClick={fetchPaymentDashboard}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition"
          >
            Retry Loading Rent
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {loading ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80">
              <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-500">Loading student rent records...</p>
            </div>
          ) : filteredTenants.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-3xl border border-slate-200/80 text-slate-400">
              <CreditCard className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">No students found matching this filter</p>
              <p className="text-xs text-slate-400 mt-0.5">Try clearing your search query or filter.</p>
            </div>
          ) : (
            filteredTenants.map((t) => (
              <div
                key={t.id}
                onClick={() => setSelectedStudentId(t.id)}
                className="bg-white rounded-3xl border border-slate-200/80 hover:border-indigo-400 p-4 sm:p-5 shadow-sm hover:shadow-md transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
              >
                {/* Left: Avatar & Resident Info */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white font-bold text-lg flex items-center justify-center shrink-0 shadow-sm">
                    {t.fullName?.charAt(0) || 'S'}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm sm:text-base font-bold text-slate-900 font-heading truncate">
                        {t.fullName}
                      </h4>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold ${
                          t.status === 'paid'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : t.status === 'overdue'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {t.status === 'paid' ? 'Paid ✓' : t.statusLabel || 'Due'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                      <span className="font-semibold text-slate-700 flex items-center gap-1">
                        <Home className="w-3.5 h-3.5 text-indigo-500" />
                        Room {t.roomNumber || '204'} • Bed {t.bed || 'B'}
                      </span>
                      <span>•</span>
                      <span>{t.mobile}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Rent Amount, Last Payment & Ledger Arrow */}
                <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="text-left sm:text-right">
                    <div className="text-base sm:text-lg font-extrabold text-slate-900 font-heading">
                      ₹{t.monthlyFee.toLocaleString('en-IN')}
                      <span className="text-xs font-normal text-slate-400">/month</span>
                    </div>
                    <span className="text-[11px] text-slate-500 block">
                      {t.lastPaidDate ? `Last paid: ${t.lastPaidDate}` : 'No payment yet'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-xs font-bold text-indigo-600 group-hover:translate-x-1 transition-transform shrink-0">
                    <span className="hidden sm:inline">View History</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* OWNER PAYMENT SETTINGS MODAL */}
      {showSettingsModal && (
        <OwnerPaymentSettingsModal
          onClose={() => setShowSettingsModal(false)}
          onSaved={() => fetchPaymentDashboard()}
        />
      )}

      {/* DEDICATED FULL-SCREEN INDIVIDUAL PAYMENT HISTORY */}
      {selectedStudentId && (
        <TenantPaymentLedgerModal
          studentId={selectedStudentId}
          onClose={() => setSelectedStudentId(null)}
          onDataUpdated={() => fetchPaymentDashboard()}
        />
      )}

    </div>
  );
}
