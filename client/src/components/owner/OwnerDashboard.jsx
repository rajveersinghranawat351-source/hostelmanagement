import React, { useState, useEffect } from 'react';
import {
  Users,
  Clock3,
  CheckCircle2,
  AlertCircle,
  Search,
  QrCode,
  Bell,
  LogOut,
  RefreshCw,
  Building2,
  ChevronRight,
  ShieldCheck,
  Filter,
  GraduationCap,
  Home,
  BedSingle,
  Phone
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import StudentProfileModal from './StudentProfileModal';
import OwnerNotificationsModal from './OwnerNotificationsModal';

export default function OwnerDashboard({ property, onViewQR }) {
  const { user, logout } = useAuth();
  const { showError, showSuccess } = useToast();

  const [stats, setStats] = useState({ total: 0, pending: 0, active: 0, vacated: 0, unreadNotifications: 0 });
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected student for detailed profile modal
  const [selectedStudentId, setSelectedStudentId] = useState(null);

  // Notifications modal
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  useEffect(() => {
    fetchDashboardData();
    fetchNotifications();

    const interval = setInterval(() => {
      fetchNotifications(false);
    }, 12000);

    return () => clearInterval(interval);
  }, [filterStatus, searchQuery]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, studentsRes] = await Promise.all([
        api.getOwnerStats(),
        api.getOwnerStudents(filterStatus, searchQuery),
      ]);
      if (statsRes.stats) setStats(statsRes.stats);
      if (studentsRes.students) setStudents(studentsRes.students);
    } catch (err) {
      showError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async (showErr = false) => {
    try {
      const res = await api.getOwnerNotifications();
      setNotifications(res.notifications || []);
      setUnreadNotifCount(res.unreadCount || 0);
    } catch (err) {
      if (showErr) showError('Failed to fetch notifications.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in pb-16">
      
      {/* 1. TOP WELCOME & BRAND HEADER */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-emerald-600/20 shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-heading">
                Welcome, {user?.name || 'Owner'}
              </h1>
            </div>
            <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5 mt-0.5">
              <span>{property.property_name}</span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-500">{property.city || property.property_type || 'PG'}</span>
            </p>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Notification Button */}
          <button
            onClick={() => setShowNotificationsModal(true)}
            className="relative p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center animate-bounce shadow-sm">
                {unreadNotifCount}
              </span>
            )}
          </button>

          {/* View QR Code Button */}
          <button
            onClick={onViewQR}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-2 transition cursor-pointer"
          >
            <QrCode className="w-4 h-4" />
            <span>Invite QR Code</span>
          </button>

          {/* Refresh */}
          <button
            onClick={fetchDashboardData}
            className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Logout */}
          <button
            onClick={logout}
            className="p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition cursor-pointer"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
              Total Students
            </span>
            <span className="text-3xl font-extrabold text-slate-900 font-heading">
              {stats.total}
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider block mb-1">
              Pending
            </span>
            <span className="text-3xl font-extrabold text-amber-600 font-heading">
              {stats.pending}
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <Clock3 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider block mb-1">
              Active
            </span>
            <span className="text-3xl font-extrabold text-emerald-600 font-heading">
              {stats.active}
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Vacated
            </span>
            <span className="text-3xl font-extrabold text-slate-600 font-heading">
              {stats.vacated}
            </span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* 3. STUDENT LIST */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
        
        {/* Section Header with Search & Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 font-heading">Connected Students</h2>
            <p className="text-xs text-slate-400">Click any student to view full details, documents, and manage room/status.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, college, room..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {['all', 'pending', 'active', 'vacated'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterStatus(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition cursor-pointer ${
                    filterStatus === f
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* List Content */}
        {loading ? (
          <div className="py-12 text-center">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-400">Loading student directory...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="py-12 text-center bg-slate-50 rounded-2xl border border-slate-200/70 p-6">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">No students have joined yet.</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
              Display your permanent invitation QR code at your reception so new students can scan and register instantly.
            </p>
            <button
              onClick={onViewQR}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
              <span>View & Share Invite QR</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {students.map((student) => {
              const isPending = student.status === 'pending';
              const isActive = student.status === 'active';
              const isVacated = student.status === 'vacated';

              return (
                <div
                  key={student.id}
                  onClick={() => setSelectedStudentId(student.id)}
                  className="py-4 px-3 -mx-3 rounded-2xl hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition cursor-pointer group"
                >
                  <div className="flex items-start sm:items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-slate-100 group-hover:bg-emerald-50 group-hover:text-emerald-700 text-slate-700 font-bold text-sm flex items-center justify-center transition shrink-0">
                      {student.full_name?.charAt(0) || 'S'}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition">
                          {student.full_name}
                        </h4>
                        <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-semibold">
                          {student.student_id_code || 'STU'}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                        {student.college_name && (
                          <span className="flex items-center gap-1 font-medium text-slate-700">
                            <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
                            {student.college_name} ({student.course || 'B.Tech'})
                          </span>
                        )}
                        <span>•</span>
                        <span>Mob: {student.mobile}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 self-stretch sm:self-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <div className="text-right text-xs">
                      <span className="font-bold text-slate-900 block">
                        Room {student.room_number || '204'} • Bed {student.bed || 'B'}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Joined: {new Date(student.joining_date || student.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : isPending
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {student.status}
                    </span>

                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Student Profile Modal */}
      {selectedStudentId && (
        <StudentProfileModal
          studentId={selectedStudentId}
          onClose={() => setSelectedStudentId(null)}
          onStatusUpdated={() => {
            fetchDashboardData();
            fetchNotifications(false);
          }}
        />
      )}

      {/* Notifications Modal */}
      {showNotificationsModal && (
        <OwnerNotificationsModal
          notifications={notifications}
          onClose={() => setShowNotificationsModal(false)}
          onOpenStudent={(id) => setSelectedStudentId(id)}
          onNotificationsMarkedRead={() => {
            setUnreadNotifCount(0);
            fetchNotifications(false);
          }}
        />
      )}

    </div>
  );
}
