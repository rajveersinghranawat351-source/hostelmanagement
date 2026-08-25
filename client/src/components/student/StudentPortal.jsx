import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import QRScannerCard from './QRScannerCard';
import PropertyConfirmationScreen from './PropertyConfirmationScreen';
import StudentRegistrationForm from './StudentRegistrationForm';
import RegistrationSuccessScreen from './RegistrationSuccessScreen';
import StudentDashboard from './StudentDashboard';

export default function StudentPortal() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [hasJoined, setHasJoined] = useState(false);
  const [activeProperty, setActiveProperty] = useState(null);
  const [stage, setStage] = useState('scan'); // 'scan' | 'confirm' | 'form' | 'success' | 'dashboard'
  const [registeredProfile, setRegisteredProfile] = useState(null);

  useEffect(() => {
    checkStudentStatus();
  }, []);

  const checkStudentStatus = async () => {
    setLoading(true);
    try {
      const res = await api.getStudentMe();
      if (res.hasJoined) {
        setHasJoined(true);
        setStage('dashboard');
      } else {
        setHasJoined(false);
        setStage('scan');
      }
    } catch (err) {
      console.warn('Student status check error', err);
      setStage('scan');
    } finally {
      setLoading(false);
    }
  };

  const handlePropertyDetected = (property) => {
    setActiveProperty(property);
    setStage('confirm');
  };

  const handleConfirmProperty = () => {
    setStage('form');
  };

  const handleBackToScan = () => {
    setActiveProperty(null);
    setStage('scan');
  };

  const handleRegistrationSuccess = (profile) => {
    setRegisteredProfile(profile);
    setStage('success');
  };

  const handleGoToDashboard = () => {
    setHasJoined(true);
    setStage('dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-500">Checking your hostel connection...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {stage === 'dashboard' && (
        <StudentDashboard onRescanQR={() => setStage('scan')} />
      )}

      {stage === 'scan' && (
        <QRScannerCard
          onPropertyDetected={handlePropertyDetected}
          onGoToDashboard={handleGoToDashboard}
        />
      )}

      {stage === 'confirm' && (
        <PropertyConfirmationScreen
          property={activeProperty}
          onConfirm={handleConfirmProperty}
          onCancel={handleBackToScan}
        />
      )}

      {stage === 'form' && (
        <StudentRegistrationForm
          property={activeProperty}
          onBackToScan={handleBackToScan}
          onRegistrationSuccess={handleRegistrationSuccess}
        />
      )}

      {stage === 'success' && (
        <RegistrationSuccessScreen
          profile={registeredProfile}
          onGoToDashboard={handleGoToDashboard}
        />
      )}
    </div>
  );
}
