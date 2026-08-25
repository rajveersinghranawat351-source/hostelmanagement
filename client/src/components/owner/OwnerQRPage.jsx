import React, { useState } from 'react';
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
import {
  Download,
  Share2,
  Printer,
  ArrowLeft,
  ShieldCheck,
  RefreshCw,
  Power,
  CheckCircle2,
  Sparkles,
  Building2,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';

export default function OwnerQRPage({ property, onBackToDashboard, onPropertyUpdated }) {
  const { showSuccess, showError, showInfo } = useToast();
  const [currentProperty, setCurrentProperty] = useState(property);
  const [regenerating, setRegenerating] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  if (!currentProperty) return null;

  const qrIdentifier = currentProperty.qr_identifier || currentProperty.qrIdentifier;
  const qrStatus = currentProperty.qr_status || currentProperty.qrStatus || 'active';
  const qrValue = `${window.location.origin}/?qr=${encodeURIComponent(qrIdentifier)}`;

  // Download QR
  const handleDownloadQR = () => {
    const canvas = document.getElementById('permanent-qr-canvas');
    if (!canvas) return;

    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentProperty.property_name.replace(/[^a-zA-Z0-9]/g, '_')}_QR.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccess('QR Code downloaded as PNG!');
  };

  // Share QR
  const handleShareQR = async () => {
    const shareText = `Join ${currentProperty.property_name} on HostelStay: ${qrValue}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: currentProperty.property_name,
          text: `Scan QR to join ${currentProperty.property_name}`,
          url: qrValue,
        });
        showSuccess('Shared successfully!');
        return;
      } catch (e) {}
    }

    try {
      await navigator.clipboard.writeText(qrValue);
      showSuccess('Join link copied to clipboard!');
    } catch (e) {
      showInfo(`Join Code: ${qrIdentifier}`);
    }
  };

  // Print QR
  const handlePrintQR = () => {
    window.print();
  };

  // Regenerate QR
  const handleRegenerateQR = async () => {
    if (!window.confirm('Are you sure you want to generate a new invitation QR code? Previous QR codes will be replaced.')) {
      return;
    }

    setRegenerating(true);
    try {
      const res = await api.regenerateOwnerQR();
      setCurrentProperty(res.property);
      showSuccess('New invitation QR generated successfully!');
      if (onPropertyUpdated) onPropertyUpdated(res.property);
    } catch (err) {
      showError(err.message || 'Failed to regenerate QR.');
    } finally {
      setRegenerating(false);
    }
  };

  // Toggle QR Active / Deactivated
  const handleToggleQRStatus = async () => {
    const newStatus = qrStatus === 'active' ? 'revoked' : 'active';
    setUpdatingStatus(true);
    try {
      const res = await api.updateOwnerQRStatus(newStatus);
      setCurrentProperty(res.property);
      showSuccess(`QR invitation code is now ${newStatus === 'active' ? 'ACTIVE' : 'DEACTIVATED'}.`);
      if (onPropertyUpdated) onPropertyUpdated(res.property);
    } catch (err) {
      showError(err.message || 'Failed to toggle QR status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto animate-fade-in pb-16">
      
      {/* Navigation Header */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <button
          onClick={onBackToDashboard}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm transition cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </button>

        <span
          className={`text-xs font-bold px-3 py-1 rounded-full border ${
            qrStatus === 'active'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}
        >
          {qrStatus === 'active' ? '● QR Code Active' : '✕ QR Deactivated'}
        </span>
      </div>

      {/* Printable QR Display Card */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden p-6 sm:p-10 text-center print:shadow-none print:border-none">
        
        {/* PG Branding */}
        <div className="mb-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-3 text-emerald-600">
            <Building2 className="w-6 h-6" />
          </div>
          <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">
            {currentProperty.property_type || 'PG & Hostel'}
          </p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1 font-heading">
            {currentProperty.property_name}
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">{currentProperty.address}</p>
        </div>

        {/* QR Render Container */}
        <div className="relative inline-block p-6 sm:p-8 bg-white rounded-3xl border-2 border-slate-200 shadow-inner mb-6">
          <div className="flex justify-center">
            <QRCodeSVG
              value={qrValue}
              size={240}
              level="H"
              includeMargin={true}
              className={`w-48 h-48 sm:w-60 sm:h-60 transition ${qrStatus !== 'active' ? 'opacity-30 filter grayscale' : ''}`}
            />
          </div>

          {qrStatus !== 'active' && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-xs rounded-3xl flex flex-col items-center justify-center p-4">
              <AlertTriangle className="w-8 h-8 text-rose-500 mb-1" />
              <span className="text-xs font-bold text-rose-800">QR Invitation Deactivated</span>
            </div>
          )}

          {/* Hidden High-res Canvas */}
          <div className="hidden">
            <QRCodeCanvas
              id="permanent-qr-canvas"
              value={qrValue}
              size={1024}
              level="H"
              includeMargin={true}
            />
          </div>
        </div>

        {/* Property ID Code */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 mb-6 max-w-sm mx-auto">
          <span className="text-xs font-medium text-slate-400 block mb-0.5">Secure Invitation Token</span>
          <span className="font-mono text-xs sm:text-sm font-bold text-slate-800 tracking-wider">
            {qrIdentifier}
          </span>
        </div>

        {/* Informational Message */}
        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 text-left text-xs text-emerald-900 space-y-1 mb-8 print:hidden">
          <div className="flex items-center gap-1.5 font-bold text-emerald-800">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Permanent QR Student Onboarding</span>
          </div>
          <p>
            Display or print this QR at your reception. Any student who scans this QR code will immediately be guided through the 5-step onboarding and automatically connected to your hostel.
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 print:hidden mb-4">
          <button
            onClick={handleDownloadQR}
            className="py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download PNG</span>
          </button>

          <button
            onClick={handleShareQR}
            className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>Share QR</span>
          </button>

          <button
            onClick={handlePrintQR}
            className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Poster</span>
          </button>
        </div>

        {/* Secondary Actions: Regenerate & Deactivate */}
        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100 print:hidden">
          <button
            onClick={handleRegenerateQR}
            disabled={regenerating}
            className="py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            {regenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            <span>Regenerate QR</span>
          </button>

          <button
            onClick={handleToggleQRStatus}
            disabled={updatingStatus}
            className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
              qrStatus === 'active'
                ? 'bg-rose-50 hover:bg-rose-100 text-rose-700'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{qrStatus === 'active' ? 'Deactivate QR' : 'Activate QR'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
