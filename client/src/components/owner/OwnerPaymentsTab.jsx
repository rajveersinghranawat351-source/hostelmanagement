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
  PlusCircle,
  Home,
  User,
  AlertTriangle,
  Upload,
  FileText,
  FileBadge,
  Eye,
  Download,
  Trash2,
  Check,
  X,
  Loader2,
  Smartphone,
  Sparkles
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
  const [showAddRentModal, setShowAddRentModal] = useState(false);
  const [showEditRentModal, setShowEditRentModal] = useState(false);
  const [selectedTenantForEdit, setSelectedTenantForEdit] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedTenantForReceipt, setSelectedTenantForReceipt] = useState(null);

  // Add Rent Form State
  const [addTenantId, setAddTenantId] = useState('');
  const [addBillingPeriod, setAddBillingPeriod] = useState('');
  const [addAmount, setAddAmount] = useState('');
  const [addDueDate, setAddDueDate] = useState('');
  const [addStatus, setAddStatus] = useState('due'); // 'due' | 'paid'
  const [addPaymentMethod, setAddPaymentMethod] = useState('UPI');
  const [addNotes, setAddNotes] = useState('');
  const [addReceiptFile, setAddReceiptFile] = useState(null);
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Edit Rent Form State
  const [editAmount, setEditAmount] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editStatus, setEditStatus] = useState('due');
  const [editNotes, setEditNotes] = useState('');
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Receipt Modal State
  const [receiptBlobUrl, setReceiptBlobUrl] = useState(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [uploadingNewReceipt, setUploadingNewReceipt] = useState(false);
  const [deletingReceipt, setDeletingReceipt] = useState(false);

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

  // Open Add Rent Modal with prefilled defaults
  const handleOpenAddRent = (prefillTenant = null) => {
    const now = new Date();
    const currentMonthName = now.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
    const todayStr = now.toISOString().split('T')[0];

    const targetTenant = prefillTenant || (tenants.length > 0 ? tenants[0] : null);

    setAddTenantId(targetTenant ? targetTenant.id : '');
    setAddBillingPeriod(currentMonthName);
    setAddAmount(targetTenant ? String(targetTenant.monthlyFee || 8000) : '8000');
    setAddDueDate(targetTenant?.dueDate || todayStr);
    setAddStatus('due');
    setAddPaymentMethod('UPI');
    setAddNotes('');
    setAddReceiptFile(null);
    setShowAddRentModal(true);
  };

  // Submit Add Rent Record
  const handleSubmitAddRent = async (e) => {
    e.preventDefault();
    if (!addTenantId) {
      showError('Please select a student/tenant.');
      return;
    }

    if (!addAmount || Number(addAmount) <= 0) {
      showError('Please enter a valid rent amount.');
      return;
    }

    setSubmittingAdd(true);
    try {
      const formData = new FormData();
      formData.append('studentId', addTenantId);
      formData.append('billingPeriod', addBillingPeriod.trim() || 'Monthly Rent');
      formData.append('amount', addAmount);
      formData.append('dueDate', addDueDate);
      formData.append('status', addStatus);
      formData.append('paymentMethod', addPaymentMethod);
      formData.append('notes', addNotes.trim());
      if (addReceiptFile) {
        formData.append('receiptDocument', addReceiptFile);
      }

      const res = await api.addOwnerRentBill(formData);
      showSuccess(res.message || 'Rent bill added successfully!');
      setShowAddRentModal(false);
      fetchPaymentDashboard();
    } catch (err) {
      showError(err.message || 'Failed to add rent record.');
    } finally {
      setSubmittingAdd(false);
    }
  };

  // Quick Toggle Status (Mark Paid / Mark Due)
  const handleQuickToggleStatus = async (tenant, e) => {
    e.stopPropagation();
    const newStatus = tenant.status === 'paid' ? 'due' : 'paid';

    try {
      if (tenant.latestBillId) {
        await api.updateOwnerRentStatus(tenant.latestBillId, newStatus, 'Cash / Direct');
      } else {
        // If no bill ID exists yet, record payment or add bill
        await api.recordOwnerOfflinePayment({
          studentId: tenant.id,
          amount: tenant.monthlyFee || 8000,
          paymentMethod: 'Cash',
          referenceNote: `Marked as ${newStatus} by owner`,
        });
      }
      showSuccess(`Status updated to ${newStatus === 'paid' ? 'Paid ✓' : 'Pending Dues'}.`);
      fetchPaymentDashboard();
    } catch (err) {
      showError(err.message || 'Failed to update rent status.');
    }
  };

  // Open Edit Rent Modal
  const handleOpenEditRent = (tenant, e) => {
    e.stopPropagation();
    setSelectedTenantForEdit(tenant);
    setEditAmount(String(tenant.monthlyFee || 8000));
    setEditDueDate(tenant.dueDate || new Date().toISOString().split('T')[0]);
    setEditStatus(tenant.status === 'paid' ? 'paid' : 'due');
    setEditNotes('');
    setShowEditRentModal(true);
  };

  // Submit Edit Rent Record
  const handleSubmitEditRent = async (e) => {
    e.preventDefault();
    if (!selectedTenantForEdit) return;

    setSubmittingEdit(true);
    try {
      if (selectedTenantForEdit.latestBillId) {
        await api.updateOwnerRentBill(selectedTenantForEdit.latestBillId, {
          amount: Number(editAmount),
          dueDate: editDueDate,
          status: editStatus,
          notes: editNotes,
        });
      } else {
        await api.updateOwnerTenantFee(selectedTenantForEdit.id, Number(editAmount), selectedTenantForEdit.rentDueDay || 5);
      }
      showSuccess('Rent record updated successfully!');
      setShowEditRentModal(false);
      fetchPaymentDashboard();
    } catch (err) {
      showError(err.message || 'Failed to update rent.');
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Open Receipt Modal
  const handleOpenReceiptModal = async (tenant, e) => {
    e.stopPropagation();
    setSelectedTenantForReceipt(tenant);
    setShowReceiptModal(true);
    setReceiptBlobUrl(null);

    if (tenant.receiptDocumentUrl) {
      setReceiptLoading(true);
      try {
        const blobUrl = await api.fetchSecureDocumentBlob(tenant.receiptDocumentUrl);
        setReceiptBlobUrl(blobUrl);
      } catch (err) {
        console.warn('Failed to fetch receipt blob', err);
      } finally {
        setReceiptLoading(false);
      }
    }
  };

  // Upload/Replace Receipt in Modal
  const handleUploadReceiptFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTenantForReceipt) return;

    setUploadingNewReceipt(true);
    try {
      let targetBillId = selectedTenantForReceipt.latestBillId;

      if (!targetBillId) {
        // Create initial bill if none exists
        const now = new Date();
        const resAdd = await api.addOwnerRentBill({
          studentId: selectedTenantForReceipt.id,
          billingPeriod: selectedTenantForReceipt.latestBillingPeriod || 'Current Month',
          amount: selectedTenantForReceipt.monthlyFee || 8000,
          dueDate: selectedTenantForReceipt.dueDate || now.toISOString().split('T')[0],
          status: selectedTenantForReceipt.status === 'paid' ? 'paid' : 'due',
          notes: 'Auto-created for receipt attachment',
        });
        targetBillId = resAdd.bill.id;
      }

      const formData = new FormData();
      formData.append('receiptDocument', file);

      const res = await api.uploadOwnerRentReceipt(targetBillId, formData);
      showSuccess('Receipt document uploaded successfully!');

      // Update local preview
      const blobUrl = await api.fetchSecureDocumentBlob(res.receiptUrl);
      setReceiptBlobUrl(blobUrl);
      fetchPaymentDashboard();
    } catch (err) {
      showError(err.message || 'Failed to upload receipt document.');
    } finally {
      setUploadingNewReceipt(false);
    }
  };

  // Delete Receipt in Modal
  const handleDeleteReceipt = async () => {
    if (!selectedTenantForReceipt?.latestBillId) return;
    if (!window.confirm('Are you sure you want to remove this receipt document?')) return;

    setDeletingReceipt(true);
    try {
      await api.deleteOwnerRentReceipt(selectedTenantForReceipt.latestBillId);
      showSuccess('Receipt document removed successfully!');
      if (receiptBlobUrl) URL.revokeObjectURL(receiptBlobUrl);
      setReceiptBlobUrl(null);
      fetchPaymentDashboard();
    } catch (err) {
      showError(err.message || 'Failed to delete receipt.');
    } finally {
      setDeletingReceipt(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* 1. TOP HEADER & ACTION BUTTONS */}
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
            Manage student rent dues, payment receipts, offline collections, and custom UPI QR configs.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Add Rent Button */}
          <button
            type="button"
            onClick={() => handleOpenAddRent()}
            className="flex-1 sm:flex-none px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-1.5 cursor-pointer min-h-[40px]"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Rent Bill</span>
          </button>

          {/* UPI Settings Button */}
          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer min-h-[40px]"
          >
            <Settings className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">UPI & QR</span>
          </button>

          {/* Refresh */}
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
                      <span>•</span>
                      <span>Due: {t.dueDate}</span>
                    </div>
                  </div>
                </div>

                {/* Right: Rent Amount & Quick Actions */}
                <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                  <div className="text-left sm:text-right mr-2">
                    <div className="text-base sm:text-lg font-extrabold text-slate-900 font-heading">
                      ₹{t.monthlyFee.toLocaleString('en-IN')}
                      <span className="text-xs font-normal text-slate-400">/month</span>
                    </div>
                    <span className="text-[11px] text-slate-500 block">
                      {t.lastPaidDate ? `Last paid: ${t.lastPaidDate}` : 'No payment yet'}
                    </span>
                  </div>

                  {/* Action Group */}
                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    
                    {/* Mark Paid / Due Toggle Button */}
                    <button
                      type="button"
                      onClick={(e) => handleQuickToggleStatus(t, e)}
                      title={t.status === 'paid' ? 'Mark as Pending Due' : 'Mark as Paid'}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                        t.status === 'paid'
                          ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800'
                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{t.status === 'paid' ? 'Paid ✓' : 'Mark Paid'}</span>
                    </button>

                    {/* Receipt Document Action */}
                    <button
                      type="button"
                      onClick={(e) => handleOpenReceiptModal(t, e)}
                      title={t.receiptDocumentUrl ? 'View Receipt Document' : 'Upload Receipt / Document'}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1 cursor-pointer ${
                        t.receiptDocumentUrl
                          ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                      }`}
                    >
                      {t.receiptDocumentUrl ? (
                        <>
                          <FileBadge className="w-3.5 h-3.5 text-indigo-600" />
                          <span className="hidden md:inline">Receipt</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5 text-slate-500" />
                          <span className="hidden md:inline">Doc</span>
                        </>
                      )}
                    </button>

                    {/* Edit Rent Button */}
                    <button
                      type="button"
                      onClick={(e) => handleOpenEditRent(t, e)}
                      title="Edit Rent Amount & Due Date"
                      className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Ledger / Details Arrow */}
                    <button
                      type="button"
                      onClick={() => setSelectedStudentId(t.id)}
                      title="View Full Ledger History"
                      className="p-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. ADD RENT BILL MODAL */}
      {/* ========================================================================= */}
      {showAddRentModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full my-auto overflow-hidden">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-heading">Add Monthly Rent Bill</h3>
                  <p className="text-xs text-emerald-300/80">Create new rent record & attach receipt/document</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddRentModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitAddRent} className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              
              {/* Tenant Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Resident / Student *
                </label>
                <select
                  value={addTenantId}
                  onChange={(e) => {
                    setAddTenantId(e.target.value);
                    const selected = tenants.find((t) => t.id === e.target.value);
                    if (selected) {
                      setAddAmount(String(selected.monthlyFee || 8000));
                      setAddDueDate(selected.dueDate || new Date().toISOString().split('T')[0]);
                    }
                  }}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                >
                  <option value="">-- Choose Resident --</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName} (Room {t.roomNumber} - Bed {t.bed}) • ₹{t.monthlyFee}/mo
                    </option>
                  ))}
                </select>
              </div>

              {/* Month / Billing Period & Amount */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Month / Billing Period *
                  </label>
                  <input
                    type="text"
                    value={addBillingPeriod}
                    onChange={(e) => setAddBillingPeriod(e.target.value)}
                    placeholder="e.g. August 2026"
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Rent Amount (₹) *
                  </label>
                  <input
                    type="number"
                    value={addAmount}
                    onChange={(e) => setAddAmount(e.target.value)}
                    placeholder="8000"
                    required
                    min="100"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 font-bold focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
              </div>

              {/* Due Date & Initial Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Rent Due Date *
                  </label>
                  <input
                    type="date"
                    value={addDueDate}
                    onChange={(e) => setAddDueDate(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Status *
                  </label>
                  <select
                    value={addStatus}
                    onChange={(e) => setAddStatus(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 transition font-semibold"
                  >
                    <option value="due">Pending / Due</option>
                    <option value="paid">Paid ✓</option>
                  </select>
                </div>
              </div>

              {/* Payment Method (if marked paid) */}
              {addStatus === 'paid' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={addPaymentMethod}
                    onChange={(e) => setAddPaymentMethod(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                  >
                    <option value="UPI">Direct UPI / QR</option>
                    <option value="Cash">Cash In Hand</option>
                    <option value="Bank Transfer">Bank Transfer / NEFT</option>
                    <option value="Cheque">Bank Cheque</option>
                  </select>
                </div>
              )}

              {/* Remarks / Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Notes / Remarks (Optional)
                </label>
                <input
                  type="text"
                  value={addNotes}
                  onChange={(e) => setAddNotes(e.target.value)}
                  placeholder="e.g. Standard monthly fee + electricity adjustment"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              {/* File / Receipt / QR Document Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Attach Rent Receipt / Document / QR (Optional)
                </label>
                {addReceiptFile ? (
                  <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileBadge className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-slate-900 block truncate">{addReceiptFile.name}</span>
                        <span className="text-[10px] text-slate-500">{(addReceiptFile.size / 1024).toFixed(1)} KB</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAddReceiptFile(null)}
                      className="p-1 text-slate-400 hover:text-rose-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-slate-200 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/40 rounded-2xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center gap-1.5 block">
                    <input
                      type="file"
                      accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
                      onChange={(e) => {
                        if (e.target.files?.[0]) setAddReceiptFile(e.target.files[0]);
                      }}
                      className="hidden"
                    />
                    <Upload className="w-5 h-5 text-slate-400" />
                    <span className="text-xs font-semibold text-slate-700">Click to attach Receipt (PDF / Image / QR)</span>
                    <span className="text-[10px] text-slate-400">PDF, PNG, JPG up to 15MB</span>
                  </label>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddRentModal(false)}
                  disabled={submittingAdd}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submittingAdd || !addTenantId || !addAmount}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
                >
                  {submittingAdd ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Add Rent Bill</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. EDIT RENT BILL MODAL */}
      {/* ========================================================================= */}
      {showEditRentModal && selectedTenantForEdit && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full my-auto overflow-hidden">
            
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-heading">Edit Rent Details</h3>
                  <p className="text-xs text-indigo-300/80">{selectedTenantForEdit.fullName} • Room {selectedTenantForEdit.roomNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditRentModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitEditRent} className="p-5 sm:p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Monthly Rent Amount (₹) *
                </label>
                <input
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  required
                  min="100"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Due Date *
                </label>
                <input
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Status *
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 font-semibold"
                >
                  <option value="due">Pending / Due</option>
                  <option value="paid">Paid ✓</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Remark / Note
                </label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="e.g. Revised rent from this cycle"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditRentModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5"
                >
                  {submittingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. RECEIPT / DOCUMENT VIEWER & UPLOADER MODAL */}
      {/* ========================================================================= */}
      {showReceiptModal && selectedTenantForReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full my-auto overflow-hidden">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                  <FileBadge className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-heading">Rent Document / Receipt</h3>
                  <p className="text-xs text-indigo-300/80">{selectedTenantForReceipt.fullName} • Room {selectedTenantForReceipt.roomNumber}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (receiptBlobUrl) URL.revokeObjectURL(receiptBlobUrl);
                  setShowReceiptModal(false);
                }}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Document Content / Preview Area */}
            <div className="p-5 sm:p-6 space-y-4">
              
              {receiptLoading ? (
                <div className="p-10 text-center">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-500">Loading document preview...</p>
                </div>
              ) : receiptBlobUrl ? (
                <div className="space-y-3">
                  <div className="w-full h-64 sm:h-80 bg-slate-100 rounded-2xl border border-slate-200 overflow-hidden flex items-center justify-center">
                    {selectedTenantForReceipt.receiptOriginalName?.endsWith('.pdf') || selectedTenantForReceipt.receiptFilename?.endsWith('.pdf') ? (
                      <iframe
                        src={receiptBlobUrl}
                        title="Receipt PDF"
                        className="w-full h-full border-none"
                      />
                    ) : (
                      <img
                        src={receiptBlobUrl}
                        alt="Receipt Document"
                        className="w-full h-full object-contain p-2"
                      />
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <a
                      href={receiptBlobUrl}
                      download={selectedTenantForReceipt.receiptOriginalName || `Rent_Receipt_${selectedTenantForReceipt.fullName}.pdf`}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Receipt</span>
                    </a>

                    <button
                      type="button"
                      onClick={handleDeleteReceipt}
                      disabled={deletingReceipt}
                      className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete Receipt</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-slate-800">No Receipt Document Attached Yet</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    You can upload a receipt PDF, photo of cash receipt, or UPI transaction screenshot.
                  </p>
                </div>
              )}

              {/* Upload or Replace Action */}
              <div className="pt-3 border-t border-slate-100">
                <label className="w-full py-3 px-4 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 flex items-center justify-center gap-2 transition cursor-pointer">
                  <input
                    type="file"
                    accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
                    onChange={handleUploadReceiptFile}
                    disabled={uploadingNewReceipt}
                    className="hidden"
                  />
                  {uploadingNewReceipt ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Uploading Document...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>{receiptBlobUrl ? 'Replace Receipt Document' : 'Upload Receipt Document (PDF/Image)'}</span>
                    </>
                  )}
                </label>
              </div>

            </div>

          </div>
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
