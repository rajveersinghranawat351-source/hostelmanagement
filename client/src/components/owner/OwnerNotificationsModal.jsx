import React from 'react';
import { Bell, CheckCheck, X, Clock, User, ArrowRight } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';

export default function OwnerNotificationsModal({
  notifications,
  onClose,
  onOpenStudent,
  onNotificationsMarkedRead,
}) {
  const { showSuccess } = useToast();

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      showSuccess('All notifications marked as read.');
      onNotificationsMarkedRead();
    } catch (e) {
      console.warn('Mark read error', e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden animate-fade-in">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 font-heading">Notifications</h3>
              <p className="text-[11px] text-slate-400">Activity & registrations</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {notifications.some((n) => n.read === 0) && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-lg"
              >
                <CheckCheck className="w-3 h-3" />
                <span>Mark read</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-xs">
              <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="font-semibold text-slate-600">You're all caught up.</p>
              <p className="mt-0.5">New student joins will appear here instantly.</p>
            </div>
          ) : (
            notifications.map((notif) => {
              const isUnread = notif.read === 0;
              return (
                <div
                  key={notif.id}
                  className={`p-3.5 rounded-2xl border transition ${
                    isUnread
                      ? 'bg-amber-50/60 border-amber-200/80 shadow-sm'
                      : 'bg-slate-50 border-slate-200/70 opacity-80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                      {isUnread && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
                      <span>🔔 New Student Registration</span>
                    </div>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 mb-2.5">{notif.message}</p>

                  {notif.student_id && (
                    <button
                      onClick={() => {
                        onClose();
                        onOpenStudent(notif.student_id);
                      }}
                      className="w-full py-1.5 px-3 bg-white hover:bg-slate-100 border border-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition shadow-xs cursor-pointer"
                    >
                      <span>View Details</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
          <button
            onClick={onClose}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
