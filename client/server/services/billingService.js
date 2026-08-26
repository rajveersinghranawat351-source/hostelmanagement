/**
 * High-precision billing and due-date calculation service
 */

function parseDate(dateStr) {
  if (!dateStr) return new Date();
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Calculates the next due date by adding exactly one month
 * Properly handles 28, 29, 30, and 31-day months without jumping 2 months ahead.
 */
function calculateNextDueDate(currentDueDateStr, targetDay = 5) {
  const current = parseDate(currentDueDateStr);
  const currentYear = current.getFullYear();
  const currentMonth = current.getMonth(); // 0-indexed

  // Move to next month
  let nextMonth = currentMonth + 1;
  let nextYear = currentYear;
  if (nextMonth > 11) {
    nextMonth = 0;
    nextYear += 1;
  }

  // Get maximum days in the target month
  const maxDaysInNextMonth = new Date(nextYear, nextMonth + 1, 0).getDate();
  const clampedDay = Math.min(targetDay || 5, maxDaysInNextMonth);

  const nextDate = new Date(nextYear, nextMonth, clampedDay);
  return formatDate(nextDate);
}

/**
 * Determines current billing status for a tenant
 */
function evaluateFeeStatus(dueDateStr, lastPaidDateStr) {
  const now = new Date();
  const todayStr = formatDate(now);

  const dueDate = parseDate(dueDateStr);
  const today = parseDate(todayStr);

  const diffTime = today.getTime() - dueDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Check if last paid date covers this due date or is very recent
  let isPaid = false;
  if (lastPaidDateStr) {
    const lastPaid = parseDate(lastPaidDateStr);
    // If paid on or after due date or paid in current month/cycle
    if (lastPaid.getTime() >= dueDate.getTime()) {
      isPaid = true;
    }
  }

  if (isPaid) {
    return {
      status: 'paid',
      label: 'Paid',
      overdueDays: 0,
      isDueToday: false,
    };
  }

  if (diffDays > 0) {
    return {
      status: 'overdue',
      label: `Overdue by ${diffDays} day${diffDays > 1 ? 's' : ''}`,
      overdueDays: diffDays,
      isDueToday: false,
    };
  }

  if (diffDays === 0) {
    return {
      status: 'due',
      label: 'Due Today',
      overdueDays: 0,
      isDueToday: true,
    };
  }

  const daysLeft = Math.abs(diffDays);
  return {
    status: 'due',
    label: `Due in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`,
    overdueDays: 0,
    isDueToday: false,
  };
}

/**
 * Returns formatted billing period string (e.g. "August 2026")
 */
function getBillingPeriodName(dateStr) {
  const d = parseDate(dateStr);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/**
 * Generates standard UPI URI for QR codes and deep linking
 */
function generateUpiIntentUrl(upiId, payeeName, amount, note = 'Hostel Room Fee', transactionRef = '') {
  if (!upiId) return '';
  const cleanUpi = upiId.trim();
  const cleanName = encodeURIComponent((payeeName || 'Hostel PG Owner').trim());
  const cleanNote = encodeURIComponent(note);
  const cleanAmount = Number(amount || 0).toFixed(2);
  const ref = transactionRef ? `&tr=${encodeURIComponent(transactionRef)}` : '';

  return `upi://pay?pa=${cleanUpi}&pn=${cleanName}&am=${cleanAmount}&cu=INR&tn=${cleanNote}${ref}`;
}

module.exports = {
  calculateNextDueDate,
  evaluateFeeStatus,
  getBillingPeriodName,
  generateUpiIntentUrl,
  formatDate,
};
