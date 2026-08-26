import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  QrCode,
  ShieldCheck,
  Check,
  Loader2,
  Building2,
  AlertCircle
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';

export default function OwnerPaymentSettingsModal({ onClose, onSaved }) {
  const { showError, showSuccess } = useToast();

  const [upiId, setUpiId] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.getOwnerPaymentSettings();
      if (res.settings) {
        setUpiId(res.settings.upi_id || res.settings.upiId || '');
        setAccountHolderName(res.settings.account_holder_name || res.settings.accountHolderName || '');
      }
    } catch (_) {
      showError('Failed to load existing UPI settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    if (!upiId.trim() || !upiId.includes('@')) {
      showError('Please enter a valid UPI ID (e.g., yourname@okhdfcbank).');
      return;
    }

    setSaving(true);
    try {
      const res = await api.saveOwnerPaymentSettings({
        upiId: upiId.trim(),
        accountHolderName: accountHolderName.trim(),
      });
      showSuccess(res.message || 'Payment settings saved successfully!');
      if (onSaved) onSaved(res.settings);
      onClose();
    } catch (err) {
      showError(err.message || 'Failed to save payment settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full my-auto overflow-hidden">
        
        {/* HEADER */}
        <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold font-heading">Owner Payment Settings</h3>
              <p className="text-xs text-emerald-300/80">Configure UPI ID for tenant fee payments</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENT */}
        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500">Loading settings...</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Your UPI ID (VPA) *
              </label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="e.g. rajesh.pg@okhdfcbank or 9876543210@paytm"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 font-mono transition"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Tenants will scan this UPI QR or copy this UPI ID to pay their room rent.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Account Holder / Business Name
              </label>
              <input
                type="text"
                value={accountHolderName}
                onChange={(e) => setAccountHolderName(e.target.value)}
                placeholder="e.g. Silver Heights PG & Hostel"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p>
                Payments go directly to your bank account via UPI. The app handles reminders, tracking, and digital receipt generation.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving || !upiId.trim()}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Save Payment Settings</span>
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
