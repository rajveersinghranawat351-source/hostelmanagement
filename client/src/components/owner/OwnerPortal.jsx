import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import PropertySetupScreen from './PropertySetupScreen';
import OwnerDashboard from './OwnerDashboard';
import OwnerQRPage from './OwnerQRPage';

export default function OwnerPortal() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [property, setProperty] = useState(null);
  const [view, setView] = useState('dashboard'); // 'dashboard' | 'qr' | 'setup'

  useEffect(() => {
    fetchOwnerProperty();
  }, []);

  const fetchOwnerProperty = async () => {
    setLoading(true);
    try {
      const res = await api.getOwnerProperty();
      if (res.property) {
        setProperty(res.property);
        setView('dashboard');
      } else {
        setProperty(null);
        setView('setup');
      }
    } catch (err) {
      console.warn('Fetch owner property error', err);
      setView('setup');
    } finally {
      setLoading(false);
    }
  };

  const handlePropertyCreated = (newProperty) => {
    setProperty(newProperty);
    setView('qr'); // Show permanent QR immediately after property setup
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-500">Loading your property details...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {view === 'setup' && (
        <PropertySetupScreen onPropertyCreated={handlePropertyCreated} />
      )}

      {view === 'dashboard' && property && (
        <OwnerDashboard
          property={property}
          onViewQR={() => setView('qr')}
        />
      )}

      {view === 'qr' && property && (
        <OwnerQRPage
          property={property}
          onBackToDashboard={() => setView('dashboard')}
        />
      )}
    </div>
  );
}
