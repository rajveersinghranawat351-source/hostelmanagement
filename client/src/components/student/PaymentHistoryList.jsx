import React, { useState } from 'react';
import {
  Receipt,
  Calendar,
  Clock,
  CheckCircle2,
  ChevronRight,
  X,
  CreditCard,
  Building2,
  FileText,
  Printer
} from 'lucide-react';

export default function PaymentHistoryList({ history = [] }) {
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  if (!history || history.length === 0) {
    return (
      <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 text-center text-slate-500">
        <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-400" />
        <p className="text-xs font-semibold">No payment transactions recorded yet.</p>
        <p className="text-[11px] text-slate-400 mt-0.5">Your monthly fee payments will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((item) => (
        <div
          key={item.id}
          onClick={() => setSelectedReceipt(item)}
          className="bg-white rounded-2xl border border-slate-200/90 hover:border-indigo-400 p-4 shadow-sm hover:shadow-md transition cursor-pointer flex items-center justify-between gap-3 group"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center font-bold text-sm shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-900 font-heading">
                  ₹{Number(item.amount).toLocaleString('en-IN')}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                  ✓ Paid
                </span>
              </div>
              <p className="text-xs font-medium text-slate-700 truncate mt-0.5">
                {item.billing_period || 'Monthly Room Fee'}
              </p>
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                <span>{item.payment_date}</span>
                <span>•</span>
                <span>{item.payment_time}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="text-right hidden sm:block">
              <span className="text-[10px] font-mono text-slate-400 block">Ref: {item.transaction_id}</span>
              <span className="text-[11px] text-indigo-600 font-semibold">{item.payment_provider || 'UPI'}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      ))}

      {/* DETAILED RECEIPT MODAL */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full my-auto overflow-hidden">
            
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Receipt className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold font-heading">Digital Payment Receipt</h3>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6 text-center">
              <div>
                <span className="inline-block px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold mb-2">
                  ✓ Payment Confirmed
                </span>
                <h2 className="text-3xl font-extrabold text-slate-900 font-heading">
                  ₹{Number(selectedReceipt.amount).toLocaleString('en-IN')}
                </h2>
                <p className="text-xs text-slate-500 mt-1">{selectedReceipt.billing_period}</p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-left space-y-2.5 text-xs">
                <div className="flex justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500">Transaction Ref / UTR</span>
                  <span className="font-mono font-bold text-slate-900">{selectedReceipt.transaction_id}</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500">Payment Date</span>
                  <span className="font-semibold text-slate-900">{selectedReceipt.payment_date}</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500">Payment Time</span>
                  <span className="font-semibold text-slate-900">{selectedReceipt.payment_time}</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500">Payment Method</span>
                  <span className="font-semibold text-slate-900">{selectedReceipt.payment_provider || 'UPI'}</span>
                </div>
                {selectedReceipt.note && (
                  <div className="flex justify-between pt-1">
                    <span className="text-slate-500">Remark</span>
                    <span className="font-medium text-slate-800 text-right">{selectedReceipt.note}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedReceipt(null)}
                  className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Close
                </button>
              </div>

            </div>

          </div>
        </div>
      )}
    </div>
  );
}
