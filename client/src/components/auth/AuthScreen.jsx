import React, { useState } from 'react';
import { ArrowLeft, Lock, Mail, Phone, User, Eye, EyeOff, Sparkles, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';

export default function AuthScreen({ role, onBack }) {
  const isOwner = role === 'owner';
  const { login } = useAuth();
  const { showSuccess, showError } = useToast();

  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    password: '',
    emailOrMobile: '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setLoading(true);

    try {
      if (isLogin) {
        if (!formData.emailOrMobile || !formData.password) {
          throw new Error('Please enter your email or mobile and password.');
        }
        const data = await api.login(formData.emailOrMobile, formData.password, role);
        showSuccess(`Welcome back, ${data.user.name}!`);
        login(data.token, data.user);
      } else {
        if (!formData.name || !formData.email || !formData.mobile || !formData.password) {
          throw new Error('Please fill all registration fields.');
        }
        if (formData.password.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }
        const data = await api.register({
          name: formData.name,
          email: formData.email,
          mobile: formData.mobile,
          password: formData.password,
          role,
        });
        showSuccess(`Account created! Welcome, ${data.user.name}!`);
        login(data.token, data.user);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Authentication failed. Please check your credentials.');
      showError(err.message || 'Authentication error');
    } finally {
      setLoading(false);
    }
  };

  // Demo auto-fill helpers
  const handleQuickFill = (type) => {
    setIsLogin(true);
    if (type === 'owner') {
      setFormData({
        ...formData,
        emailOrMobile: 'owner@sunrise.com',
        password: 'owner123',
      });
    } else {
      setFormData({
        ...formData,
        emailOrMobile: 'abhay@example.com',
        password: 'student123',
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-6 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Role Selection</span>
        </button>

        {/* Auth Card */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur">
          
          {/* Header & Role Badge */}
          <div className="text-center mb-6">
            <div
              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-3 ${
                isOwner
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
              }`}
            >
              <span>{isOwner ? '🏠 Owner Portal' : '👨‍🎓 Student Portal'}</span>
            </div>

            <h2 className="text-2xl font-bold text-white tracking-tight">
              {isLogin ? (isOwner ? 'Owner Login' : 'Student Login') : (isOwner ? 'Create Owner Account' : 'Student Sign Up')}
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              {isLogin
                ? 'Enter your credentials to access your portal'
                : 'Fill in your details to create a new account'}
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="grid grid-cols-2 bg-slate-900/80 p-1 rounded-xl mb-6 border border-slate-700/50">
            <button
              type="button"
              onClick={() => {
                setIsLogin(true);
                setErrorMessage('');
              }}
              className={`py-2 text-xs sm:text-sm font-semibold rounded-lg transition ${
                isLogin
                  ? isOwner
                    ? 'bg-emerald-600 text-white shadow'
                    : 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => {
                setIsLogin(false);
                setErrorMessage('');
              }}
              className={`py-2 text-xs sm:text-sm font-semibold rounded-lg transition ${
                !isLogin
                  ? isOwner
                    ? 'bg-emerald-600 text-white shadow'
                    : 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Error Message Box */}
          {errorMessage && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs sm:text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Rajesh Sharma"
                    required
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>
            )}

            {!isLogin ? (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="e.g. name@example.com"
                      required
                      className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Mobile Number</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="tel"
                      name="mobile"
                      value={formData.mobile}
                      onChange={handleChange}
                      placeholder="e.g. 9876543210"
                      required
                      className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Email or Mobile Number</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    name="emailOrMobile"
                    value={formData.emailOrMobile}
                    onChange={handleChange}
                    placeholder="Enter registered email or mobile"
                    required
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  className="w-full bg-slate-900/80 border border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-white transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 rounded-xl text-white font-semibold text-sm shadow-lg flex items-center justify-center gap-2 transition cursor-pointer ${
                isOwner
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/25'
                  : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/25'
              } ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <span>{isLogin ? 'Login to Portal' : 'Create Account'}</span>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials Assistant */}
          <div className="mt-6 pt-5 border-t border-slate-700/60 text-center">
            <p className="text-xs text-slate-400 mb-2">Want to test right away without registering?</p>
            <button
              type="button"
              onClick={() => handleQuickFill(isOwner ? 'owner' : 'student')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-600 transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Auto-fill Demo {isOwner ? 'Owner' : 'Student'} Credentials</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
