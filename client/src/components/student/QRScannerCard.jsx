import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  QrCode,
  Camera,
  Upload,
  Keyboard,
  AlertCircle,
  RefreshCw,
  Sparkles,
  X,
  CheckCircle2,
  ArrowRight,
  Loader2,
  ShieldCheck,
  Building2,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';

export default function QRScannerCard({ onPropertyDetected, onGoToDashboard }) {
  const { showError, showSuccess } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [errorDetails, setErrorDetails] = useState(null); // { title, message, type: 'invalid'|'expired'|'revoked'|'already_joined' }
  const [loading, setLoading] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [manualLoading, setManualLoading] = useState(false);

  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isScanning) {
      startCameraScanner();
    }
    return () => {
      stopCameraScanner();
    };
  }, [isScanning]);

  const startCameraScanner = async () => {
    setCameraError(null);
    setErrorDetails(null);
    try {
      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        throw new Error('No camera found on this device.');
      }

      // Prefer environment/back camera on mobile
      const backCamera = devices.find((d) =>
        d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment')
      );
      const chosenId = backCamera ? backCamera.id : devices[0].id;

      const html5QrCode = new Html5Qrcode('qr-reader-container', {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        chosenId,
        {
          fps: 10,
          qrbox: { width: 240, height: 240 },
          aspectRatio: 1.0,
        },
        async (decodedText) => {
          handleScannedContent(decodedText);
        },
        () => {}
      );
    } catch (err) {
      console.error('Camera start error:', err);
      setCameraError(err.message || 'Unable to access camera. Please allow camera permissions.');
      showError(err.message || 'Camera permission denied or camera not available.');
    }
  };

  const stopCameraScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (e) {
        console.warn('Scanner stop error', e);
      }
      scannerRef.current = null;
    }
  };

  const handleScannedContent = async (rawText) => {
    await stopCameraScanner();
    setIsScanning(false);
    setLoading(true);
    setErrorDetails(null);

    try {
      let identifier = rawText.trim();
      if (rawText.includes('qr=')) {
        const urlParams = new URLSearchParams(rawText.split('?')[1]);
        identifier = urlParams.get('qr') || identifier;
      } else if (rawText.includes('/join/')) {
        identifier = rawText.split('/join/')[1];
      }

      const res = await api.lookupPropertyByQR(identifier);
      showSuccess(`Hostel Account Found: ${res.property.propertyName}!`);
      onPropertyDetected(res.property);
    } catch (err) {
      handleValidationFailure(err);
    } finally {
      setLoading(false);
    }
  };

  const handleValidationFailure = (err) => {
    if (err.status === 'expired') {
      setErrorDetails({
        title: 'QR Expired',
        message: 'Please ask the hostel owner for a new QR code.',
        type: 'expired',
      });
      showError('This QR code is expired.');
    } else if (err.status === 'revoked') {
      setErrorDetails({
        title: 'QR No Longer Active',
        message: 'Please contact your hostel owner.',
        type: 'revoked',
      });
      showError('This QR code is no longer active.');
    } else if (err.alreadyJoined) {
      setErrorDetails({
        title: 'Already Connected',
        message: 'You are already connected to this hostel account.',
        type: 'already_joined',
      });
    } else {
      setErrorDetails({
        title: 'Invalid QR Code',
        message: 'This QR code is not linked to a valid hostel account.',
        type: 'invalid',
      });
      showError('Invalid QR Code: Not linked to a valid hostel account.');
    }
  };

  // Scan from uploaded file
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setCameraError(null);
    setErrorDetails(null);
    try {
      const html5QrCode = new Html5Qrcode('qr-file-helper');
      const decodedText = await html5QrCode.scanFile(file, true);
      html5QrCode.clear();
      await handleScannedContent(decodedText);
    } catch (err) {
      console.error('File scan error:', err);
      setErrorDetails({
        title: 'Invalid QR Code',
        message: 'This QR code is not linked to a valid hostel account or no QR was detected in this image.',
        type: 'invalid',
      });
      showError('Could not find a valid QR code in the uploaded image.');
    } finally {
      setLoading(false);
    }
  };

  // Manual code lookup fallback
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualCode.trim()) {
      showError('Please enter a Property QR code / ID');
      return;
    }

    setManualLoading(true);
    setCameraError(null);
    setErrorDetails(null);
    try {
      const res = await api.lookupPropertyByQR(manualCode.trim());
      showSuccess(`Hostel Account Found: ${res.property.propertyName}!`);
      onPropertyDetected(res.property);
    } catch (err) {
      handleValidationFailure(err);
    } finally {
      setManualLoading(false);
    }
  };

  // Demo QR Test shortcut
  const handleDemoTest = async () => {
    setLoading(true);
    setErrorDetails(null);
    try {
      const res = await api.lookupPropertyByQR('pg_sunrise_boys_2026');
      showSuccess(`Hostel Account Found: ${res.property.propertyName}!`);
      onPropertyDetected(res.property);
    } catch (err) {
      handleValidationFailure(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto animate-fade-in">
      {/* Hidden helper for file scanning */}
      <div id="qr-file-helper" className="hidden"></div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Step Indicator Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-2">
          <span>Student Onboarding</span>
          <span>Step 1 of 5: Scan QR</span>
        </div>
        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
          <div className="bg-indigo-600 h-full rounded-full transition-all duration-300 w-1/5" />
        </div>
        <div className="flex items-center justify-between text-[11px] font-medium text-slate-400 mt-2 px-1">
          <span className="text-indigo-600 font-bold">1. Scan QR</span>
          <span>2. Verify</span>
          <span>3. Information</span>
          <span>4. Review</span>
          <span>5. Connected</span>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden p-6 sm:p-8 text-center">
        
        {/* Top Icon & Branding */}
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto mb-4 text-indigo-600 shadow-inner">
          <QrCode className="w-8 h-8" />
        </div>

        <span className="inline-block px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider mb-2">
          Student Portal
        </span>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2 font-heading">
          Connect your Hostel Account
        </h2>
        <p className="text-slate-500 text-xs sm:text-sm max-w-md mx-auto mb-8 leading-relaxed">
          “Scan or upload the QR code provided by your hostel account owner to securely connect your student account.”
        </p>

        {/* Dynamic Error State with Retry / Go to Dashboard */}
        {errorDetails && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-left animate-fade-in">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-sm font-bold text-rose-900 mb-0.5">{errorDetails.title}</h4>
                <p className="text-xs text-rose-700">{errorDetails.message}</p>

                <div className="mt-3 flex items-center gap-2">
                  {errorDetails.type === 'already_joined' ? (
                    <button
                      onClick={onGoToDashboard}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-sm transition"
                    >
                      Go to Student Portal →
                    </button>
                  ) : (
                    <button
                      onClick={() => setErrorDetails(null)}
                      className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-sm transition"
                    >
                      Retry Scanning
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Live Camera Scanner View */}
        {isScanning ? (
          <div className="relative bg-slate-950 rounded-2xl overflow-hidden p-4 mb-6 border-2 border-indigo-500 shadow-2xl">
            <div className="flex items-center justify-between text-white text-xs mb-3 px-2">
              <span className="flex items-center gap-1.5 font-medium text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Camera Live — Align QR inside box
              </span>
              <button
                onClick={() => {
                  stopCameraScanner();
                  setIsScanning(false);
                }}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div id="qr-reader-container" className="w-full max-w-sm mx-auto overflow-hidden rounded-xl bg-black"></div>

            {cameraError && (
              <div className="mt-3 p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-rose-200 text-xs text-left flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                <div className="flex-1">
                  <p>{cameraError}</p>
                  <button
                    onClick={startCameraScanner}
                    className="mt-2 text-xs font-semibold text-white bg-rose-600 px-2.5 py-1 rounded-md hover:bg-rose-500"
                  >
                    Retry Camera
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Two Clear Primary Options: 1. 📷 Scan QR, 2. 🖼️ Upload QR */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            
            {/* Option 1: Scan QR */}
            <button
              type="button"
              onClick={() => setIsScanning(true)}
              disabled={loading}
              className="p-5 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/25 flex flex-col items-center justify-center gap-3 transition-transform active:scale-98 cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Camera className="w-6 h-6 text-white" />
              </div>
              <span className="text-base">📷 Scan QR</span>
              <span className="text-[11px] font-normal text-indigo-100/90">Open mobile/device camera</span>
            </button>

            {/* Option 2: Upload QR */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="p-5 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-sm border-2 border-dashed border-slate-300 hover:border-indigo-400 flex flex-col items-center justify-center gap-3 transition-all active:scale-98 cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                <Upload className="w-6 h-6" />
              </div>
              <span className="text-base">🖼️ Upload QR</span>
              <span className="text-[11px] font-normal text-slate-500">Choose QR image from gallery</span>
            </button>

          </div>
        )}

        {/* Option 3: Manual Code Fallback */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 mb-6 text-left">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-2">
            <Keyboard className="w-4 h-4 text-indigo-600" />
            <span>Or enter Property / Invitation Code manually:</span>
          </div>

          <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="e.g. pg_sunrise_boys_2026"
              className="flex-1 bg-white border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 transition font-mono"
            />
            <button
              type="submit"
              disabled={manualLoading || !manualCode.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center gap-1 cursor-pointer"
            >
              {manualLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <span>Connect</span>
                  <ArrowRight className="w-3 h-3" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Demo PG shortcut */}
        <div className="pt-4 border-t border-slate-100">
          <p className="text-[11px] text-slate-400 mb-2">Want to test right now with 1-click?</p>
          <button
            onClick={handleDemoTest}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200 transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Auto-fill "Sunrise Boys PG" Demo QR</span>
          </button>
        </div>

      </div>
    </div>
  );
}
