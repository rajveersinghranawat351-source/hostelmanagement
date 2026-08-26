const express = require('express');
const router = express.Router();
const multer = require('multer');
const { nanoid } = require('../utils');
const { db } = require('../db');
const { requireAuth, requireRole } = require('../auth');
const {
  calculateNextDueDate,
  evaluateFeeStatus,
  getBillingPeriodName,
  generateUpiIntentUrl,
  formatDate,
} = require('../services/billingService');
const {
  syncOwnerPaymentSettings,
  uploadOwnerQRImage,
  syncRentBill,
  syncPaymentTransaction,
} = require('../services/supabasePaymentService');

const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for UPI QR codes.'), false);
    }
  },
});

// ==========================================
// TENANT / STUDENT PAYMENT ROUTES
// ==========================================

// 1. GET tenant fee status
router.get(['/tenant/fee-status', '/fee-status', '/my-rent'], requireAuth, requireRole('student'), (req, res) => {
  try {
    const student = db.prepare(`
      SELECT sp.*, p.property_name, p.address as property_address, p.city as property_city, u.name as owner_name, u.mobile as owner_mobile, u.email as owner_email
      FROM student_profiles sp
      JOIN properties p ON sp.property_id = p.id
      JOIN users u ON p.owner_id = u.id
      WHERE sp.user_id = ?
      ORDER BY sp.created_at DESC
      LIMIT 1
    `).get(req.user.id);

    if (!student) {
      return res.json({
        hasJoined: false,
        message: 'No active hostel admission found.',
      });
    }

    const ownerSettings = db.prepare(`
      SELECT * FROM owner_payment_settings WHERE owner_id = ?
    `).get(student.owner_id);

    const upiId = ownerSettings?.upi_id || 'hostelpg@upi';
    const payeeName = ownerSettings?.account_holder_name || student.owner_name || 'PG Owner';

    const now = new Date();
    const currentDueDate = student.next_due_date || formatDate(new Date(now.getFullYear(), now.getMonth(), student.rent_due_day || 5));
    const monthlyFee = Number(student.monthly_fee || 8000);
    const billingPeriod = getBillingPeriodName(currentDueDate);

    const feeStatusInfo = evaluateFeeStatus(currentDueDate, student.last_paid_date);

    const txnRef = `FEE-${student.student_id_code || student.id.slice(-6)}-${Date.now().toString().slice(-6)}`;
    const upiIntentUrl = generateUpiIntentUrl(
      upiId,
      payeeName,
      monthlyFee,
      `${billingPeriod} - Room ${student.room_number || ''}`,
      txnRef
    );

    return res.json({
      hasJoined: true,
      student: {
        id: student.id,
        fullName: student.full_name,
        studentIdCode: student.student_id_code,
        roomNumber: student.room_number,
        bed: student.bed,
        propertyName: student.property_name,
        ownerName: student.owner_name,
      },
      billing: {
        billingPeriod,
        monthlyFee,
        dueDate: currentDueDate,
        lastPaidDate: student.last_paid_date,
        status: feeStatusInfo.status,
        statusLabel: feeStatusInfo.label,
        countdownText: feeStatusInfo.countdownText,
        daysRemaining: feeStatusInfo.daysRemaining,
        overdueDays: feeStatusInfo.overdueDays,
        isDueToday: feeStatusInfo.isDueToday,
      },
      paymentDetails: {
        upiId,
        payeeName,
        qrImageUrl: ownerSettings?.qr_image_url || null,
        paymentLink: ownerSettings?.payment_link || null,
        lateFee: ownerSettings?.late_fee || 0,
        gracePeriod: ownerSettings?.grace_period || 0,
        upiIntentUrl,
        txnRef,
      },
    });
  } catch (error) {
    console.error('Fee status fetch error:', error);
    return res.status(500).json({ error: 'Failed to retrieve room fee status.' });
  }
});

// 2. GET tenant payment history
router.get(['/tenant/history', '/tenant-history', '/my-history'], requireAuth, requireRole('student'), (req, res) => {
  try {
    const student = db.prepare(`
      SELECT id FROM student_profiles WHERE user_id = ? ORDER BY created_at DESC LIMIT 1
    `).get(req.user.id);

    if (!student) {
      return res.json({ history: [] });
    }

    const history = db.prepare(`
      SELECT * FROM payment_transactions WHERE tenant_id = ? ORDER BY created_at DESC
    `).all(student.id);

    return res.json({ history });
  } catch (error) {
    console.error('Payment history error:', error);
    return res.status(500).json({ error: 'Failed to retrieve payment history.' });
  }
});

// 3. POST verify and record tenant payment
router.post(['/tenant/verify-and-record', '/verify-and-record', '/pay'], requireAuth, requireRole('student'), (req, res) => {
  try {
    const { transactionId, paymentReference, paymentMethod, note } = req.body;

    if (!transactionId || !transactionId.trim()) {
      return res.status(400).json({ error: 'Valid transaction/reference ID is required.' });
    }

    const cleanTxnId = transactionId.trim().toUpperCase();

    const existingPayment = db.prepare('SELECT id FROM payment_transactions WHERE transaction_id = ?').get(cleanTxnId);
    if (existingPayment) {
      return res.status(409).json({
        error: 'This transaction ID has already been recorded. Duplicate submissions are not allowed.',
      });
    }

    const student = db.prepare(`
      SELECT sp.*, p.property_name, p.address as property_address, u.name as owner_name
      FROM student_profiles sp
      JOIN properties p ON sp.property_id = p.id
      JOIN users u ON p.owner_id = u.id
      WHERE sp.user_id = ?
      ORDER BY sp.created_at DESC
      LIMIT 1
    `).get(req.user.id);

    if (!student) {
      return res.status(404).json({ error: 'Student profile not found.' });
    }

    const now = new Date();
    const todayStr = formatDate(now);
    const currentTimeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    const currentDueDate = student.next_due_date || todayStr;
    const monthlyFee = Number(student.monthly_fee || 8000);
    const billingPeriod = getBillingPeriodName(currentDueDate);

    const billId = `bill_${nanoid(10)}`;
    db.prepare(`
      INSERT OR REPLACE INTO monthly_billings (
        id, tenant_id, user_id, owner_id, property_id, billing_period, amount, due_date, status, paid_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'paid', ?)
    `).run(billId, student.id, student.user_id, student.owner_id, student.property_id, billingPeriod, monthlyFee, currentDueDate, now.toISOString());

    const paymentId = `pay_${nanoid(10)}`;
    db.prepare(`
      INSERT INTO payment_transactions (
        id, tenant_id, user_id, owner_id, property_id, billing_id, billing_period,
        amount, status, payment_provider, transaction_id, payment_reference, payment_date, payment_time, note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      paymentId,
      student.id,
      student.user_id,
      student.owner_id,
      student.property_id,
      billId,
      billingPeriod,
      monthlyFee,
      'success',
      paymentMethod || 'UPI',
      cleanTxnId,
      paymentReference || cleanTxnId,
      todayStr,
      currentTimeStr,
      note || `Verified UPI Payment for ${billingPeriod}`
    );

    const nextDueDate = calculateNextDueDate(currentDueDate, student.rent_due_day || 5);

    db.prepare(`
      UPDATE student_profiles
      SET last_paid_date = ?, next_due_date = ?, payment_status = 'paid'
      WHERE id = ?
    `).run(todayStr, nextDueDate, student.id);

    const notifId = `notif_${nanoid(10)}`;
    const notifMessage = `💰 Room Fee Received: ₹${monthlyFee.toLocaleString('en-IN')} paid by ${student.full_name} (Room ${student.room_number || 'N/A'}). UTR: ${cleanTxnId}`;
    db.prepare(`
      INSERT INTO notifications (id, owner_id, student_id, type, message)
      VALUES (?, ?, ?, 'payment_received', ?)
    `).run(notifId, student.owner_id, student.id, notifMessage);

    Promise.all([
      syncRentBill({
        roomId: student.property_id,
        ownerId: student.owner_id,
        tenantId: student.user_id,
        billingPeriod: currentDueDate,
        amount: monthlyFee,
        dueDate: currentDueDate,
        status: 'paid',
        paidAt: now.toISOString(),
      }),
      syncPaymentTransaction({
        billId,
        roomId: student.property_id,
        ownerId: student.owner_id,
        tenantId: student.user_id,
        amount: monthlyFee,
        status: 'success',
        paymentProvider: paymentMethod || 'UPI',
        transactionId: cleanTxnId,
        paymentReference: paymentReference || cleanTxnId,
        note: note || `Verified UPI Payment for ${billingPeriod}`,
        paidAt: now.toISOString(),
      }),
    ]).catch((err) => console.warn('[Supabase Payment Sync Warning]:', err.message));

    return res.status(201).json({
      success: true,
      message: `Payment of ₹${monthlyFee.toLocaleString('en-IN')} successfully verified and recorded!`,
      receipt: {
        id: paymentId,
        transactionId: cleanTxnId,
        amount: monthlyFee,
        billingPeriod: `${billingPeriod} Room Fee`,
        paymentDate: todayStr,
        paymentTime: currentTimeStr,
        studentName: student.full_name,
        roomNumber: student.room_number,
        propertyName: student.property_name,
        ownerName: student.owner_name,
        nextDueDate,
      },
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    return res.status(500).json({ error: 'Failed to process payment verification.' });
  }
});

// ==========================================
// OWNER PAYMENT ROUTES
// ==========================================

// 4. GET owner dashboard
router.get(['/owner/dashboard', '/dashboard', '/'], requireAuth, requireRole('owner'), (req, res) => {
  try {
    const ownerId = req.user.id;
    const property = db.prepare('SELECT id, property_name FROM properties WHERE owner_id = ?').get(ownerId);
    const propertyId = property ? property.id : null;

    let students = [];
    if (propertyId) {
      students = db.prepare(`
        SELECT * FROM student_profiles
        WHERE owner_id = ? OR property_id = ?
        ORDER BY created_at DESC
      `).all(ownerId, propertyId);
    } else {
      students = db.prepare(`
        SELECT * FROM student_profiles
        WHERE owner_id = ?
        ORDER BY created_at DESC
      `).all(ownerId);
    }

    let totalExpectedRevenue = 0;
    let totalCollectedThisMonth = 0;
    let pendingCount = 0;
    let overdueCount = 0;
    let paidCount = 0;

    const todayStr = formatDate(new Date());

    const tenantsList = students.map((s) => {
      const monthlyFee = Number(s.monthly_fee || 8000);
      totalExpectedRevenue += monthlyFee;

      const currentDueDate = s.next_due_date || s.rent_due_date || todayStr;

      const latestPayment = db.prepare(`
        SELECT * FROM payment_transactions
        WHERE tenant_id = ? OR user_id = ?
        ORDER BY created_at DESC
        LIMIT 1
      `).get(s.id, s.user_id || s.id);

      const feeStatusInfo = evaluateFeeStatus(currentDueDate, s.last_paid_date || latestPayment?.payment_date);

      if (feeStatusInfo.status === 'paid' || s.payment_status === 'paid') {
        paidCount++;
        totalCollectedThisMonth += monthlyFee;
      } else if (feeStatusInfo.status === 'overdue') {
        overdueCount++;
      } else {
        pendingCount++;
      }

      return {
        id: s.id,
        fullName: s.full_name,
        studentIdCode: s.student_id_code,
        roomNumber: s.room_number || '204',
        bed: s.bed || 'B',
        mobile: s.mobile,
        monthlyFee,
        rentDueDay: s.rent_due_day || 5,
        dueDate: currentDueDate,
        lastPaidDate: s.last_paid_date || (latestPayment ? latestPayment.payment_date : null),
        lastPaymentAmount: latestPayment ? latestPayment.amount : null,
        status: (feeStatusInfo.status === 'paid' || s.payment_status === 'paid') ? 'paid' : feeStatusInfo.status,
        statusLabel: (feeStatusInfo.status === 'paid' || s.payment_status === 'paid') ? 'Paid ✓' : feeStatusInfo.label,
        countdownText: feeStatusInfo.countdownText,
        overdueDays: feeStatusInfo.overdueDays,
        hasPayments: Boolean(latestPayment),
      };
    });

    return res.json({
      property: property || { id: null, property_name: 'My Hostel & PG' },
      summary: {
        totalTenants: students.length,
        totalExpectedRevenue,
        totalCollectedThisMonth,
        pendingCount,
        overdueCount,
        paidCount,
      },
      tenants: tenantsList,
    });
  } catch (error) {
    console.error('Owner payment dashboard error:', error);
    return res.status(500).json({ error: 'Failed to retrieve payment dashboard.' });
  }
});

// 5. GET & POST owner settings
router.get(['/owner/settings', '/settings'], requireAuth, requireRole('owner'), (req, res) => {
  try {
    const settings = db.prepare('SELECT * FROM owner_payment_settings WHERE owner_id = ?').get(req.user.id);
    const user = db.prepare('SELECT name FROM users WHERE id = ?').get(req.user.id);

    return res.json({
      settings: settings || {
        upiId: '',
        accountHolderName: user?.name || '',
        qrImageUrl: null,
        paymentLink: '',
        lateFee: 0,
        gracePeriod: 0,
      },
    });
  } catch (error) {
    console.error('Owner settings fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch owner payment settings.' });
  }
});

router.post(['/owner/settings', '/settings'], requireAuth, requireRole('owner'), async (req, res) => {
  try {
    const { upiId, accountHolderName, qrImageUrl, paymentLink, lateFee, gracePeriod } = req.body;

    if (!upiId || !upiId.includes('@')) {
      return res.status(400).json({ error: 'Please enter a valid UPI ID (e.g., yourname@okhdfcbank).' });
    }

    const cleanUpi = upiId.trim();
    const cleanName = (accountHolderName || '').trim() || 'Hostel PG Owner';
    const settingsId = `pay_set_${nanoid(10)}`;

    db.prepare(`
      INSERT OR REPLACE INTO owner_payment_settings (
        id, owner_id, upi_id, account_holder_name, qr_image_url, payment_link, late_fee, grace_period
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      settingsId, req.user.id, cleanUpi, cleanName, qrImageUrl || null,
      paymentLink ? paymentLink.trim() : null, Number(lateFee) || 0, Number(gracePeriod) || 0
    );

    syncOwnerPaymentSettings(req.user.id, {
      ownerName: cleanName,
      upiId: cleanUpi,
      qrImageUrl: qrImageUrl || null,
    }).catch((err) => console.warn('[Supabase Sync Warning]:', err.message));

    return res.json({
      message: 'Payment settings saved successfully!',
      settings: {
        upiId: cleanUpi,
        accountHolderName: cleanName,
        qrImageUrl: qrImageUrl || null,
        paymentLink: paymentLink || null,
        lateFee: Number(lateFee) || 0,
        gracePeriod: Number(gracePeriod) || 0,
      },
    });
  } catch (error) {
    console.error('Owner settings save error:', error);
    return res.status(500).json({ error: 'Failed to save payment settings.' });
  }
});

// 6. POST owner QR upload
router.post(['/owner/upload-qr', '/upload-qr'], requireAuth, requireRole('owner'), upload.single('qrImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please select a QR code image to upload.' });
    }

    let publicUrl = await uploadOwnerQRImage(req.user.id, req.file.buffer, req.file.mimetype);

    if (!publicUrl) {
      publicUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }

    return res.json({
      success: true,
      message: 'QR code image uploaded successfully!',
      qrImageUrl: publicUrl,
    });
  } catch (error) {
    console.error('QR upload error:', error);
    return res.status(500).json({ error: 'Failed to upload QR image.' });
  }
});

// 7. GET owner tenant history
router.get(['/owner/tenant-history/:studentId', '/tenant-history/:studentId', '/history/:studentId'], requireAuth, requireRole('owner'), (req, res) => {
  try {
    const { studentId } = req.params;

    const student = db.prepare(`
      SELECT sp.*, p.property_name, p.owner_id as prop_owner_id
      FROM student_profiles sp
      LEFT JOIN properties p ON sp.property_id = p.id
      WHERE sp.id = ?
    `).get(studentId);

    if (!student) {
      return res.status(404).json({ error: 'Tenant not found.' });
    }

    if (student.owner_id !== req.user.id && student.prop_owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied: Tenant does not belong to your property.' });
    }

    const history = db.prepare(`
      SELECT * FROM payment_transactions
      WHERE tenant_id = ? OR user_id = ?
      ORDER BY created_at DESC
    `).all(studentId, student.user_id || studentId);

    const currentDueDate = student.next_due_date || student.rent_due_date || formatDate(new Date());
    const latestPayment = history.length > 0 ? history[0] : null;
    const feeStatusInfo = evaluateFeeStatus(currentDueDate, student.last_paid_date || latestPayment?.payment_date);

    return res.json({
      property: {
        propertyName: student.property_name || 'My Hostel & PG',
        ownerName: req.user.name || 'Hostel PG Owner',
      },
      student: {
        id: student.id,
        fullName: student.full_name,
        roomNumber: student.room_number || '204',
        bed: student.bed || 'B',
        mobile: student.mobile,
        monthlyFee: student.monthly_fee || 8000,
        rentDueDay: student.rent_due_day || 5,
        dueDate: currentDueDate,
        lastPaidDate: student.last_paid_date || (latestPayment ? latestPayment.payment_date : 'No payment yet'),
      },
      statusInfo: feeStatusInfo,
      history,
    });
  } catch (error) {
    console.error('Tenant history fetch error:', error);
    return res.status(500).json({ error: 'Failed to retrieve tenant payment history.' });
  }
});

// 8. POST update tenant fee
router.post(['/owner/update-tenant-fee', '/update-tenant-fee'], requireAuth, requireRole('owner'), (req, res) => {
  try {
    const { studentId, monthlyFee, rentDueDay } = req.body;

    if (!studentId || !monthlyFee || Number(monthlyFee) <= 0) {
      return res.status(400).json({ error: 'Valid monthly fee amount is required.' });
    }

    const student = db.prepare(`
      SELECT sp.*, p.owner_id as prop_owner_id
      FROM student_profiles sp
      LEFT JOIN properties p ON sp.property_id = p.id
      WHERE sp.id = ?
    `).get(studentId);

    if (!student || (student.owner_id !== req.user.id && student.prop_owner_id !== req.user.id)) {
      return res.status(403).json({ error: 'Access denied: Tenant does not belong to your property.' });
    }

    const newFee = Number(monthlyFee);
    const newDueDay = Number(rentDueDay) || student.rent_due_day || 5;

    db.prepare(`
      UPDATE student_profiles
      SET monthly_fee = ?, rent_due_day = ?
      WHERE id = ?
    `).run(newFee, newDueDay, studentId);

    return res.json({
      success: true,
      message: `Monthly rent updated to ₹${newFee.toLocaleString('en-IN')} (Due on ${newDueDay}th of month).`,
      monthlyFee: newFee,
      rentDueDay: newDueDay,
    });
  } catch (error) {
    console.error('Update tenant fee error:', error);
    return res.status(500).json({ error: 'Failed to update tenant fee.' });
  }
});

// 9. POST record offline payment
router.post(['/owner/record-offline-payment', '/record-offline-payment'], requireAuth, requireRole('owner'), (req, res) => {
  try {
    const { studentId, amount, paymentMethod, referenceNote } = req.body;

    if (!studentId || !amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Valid payment amount is required.' });
    }

    const student = db.prepare(`
      SELECT sp.*, p.property_name, p.owner_id as prop_owner_id
      FROM student_profiles sp
      LEFT JOIN properties p ON sp.property_id = p.id
      WHERE sp.id = ?
    `).get(studentId);

    if (!student || (student.owner_id !== req.user.id && student.prop_owner_id !== req.user.id)) {
      return res.status(403).json({ error: 'Access denied: Tenant does not belong to your property.' });
    }

    const now = new Date();
    const todayStr = formatDate(now);
    const currentTimeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    const currentDueDate = student.next_due_date || todayStr;
    const payAmount = Number(amount);
    const billingPeriod = getBillingPeriodName(currentDueDate);
    const cleanTxnId = `OFFLINE-${Date.now().toString().slice(-6)}-${nanoid(6).toUpperCase()}`;

    const billId = `bill_${nanoid(10)}`;
    db.prepare(`
      INSERT OR REPLACE INTO monthly_billings (
        id, tenant_id, user_id, owner_id, property_id, billing_period, amount, due_date, status, paid_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'paid', ?)
    `).run(billId, student.id, student.user_id, req.user.id, student.property_id, billingPeriod, payAmount, currentDueDate, now.toISOString());

    const paymentId = `pay_${nanoid(10)}`;
    db.prepare(`
      INSERT INTO payment_transactions (
        id, tenant_id, user_id, owner_id, property_id, billing_id, billing_period,
        amount, status, payment_provider, transaction_id, payment_reference, payment_date, payment_time, note
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      paymentId,
      student.id,
      student.user_id,
      req.user.id,
      student.property_id,
      billId,
      billingPeriod,
      payAmount,
      'success',
      paymentMethod || 'Cash',
      cleanTxnId,
      cleanTxnId,
      todayStr,
      currentTimeStr,
      referenceNote || `Offline ${paymentMethod || 'Cash'} payment recorded by owner`
    );

    const nextDueDate = calculateNextDueDate(currentDueDate, student.rent_due_day || 5);

    db.prepare(`
      UPDATE student_profiles
      SET last_paid_date = ?, next_due_date = ?, payment_status = 'paid'
      WHERE id = ?
    `).run(todayStr, nextDueDate, student.id);

    return res.status(201).json({
      success: true,
      message: `Offline payment of ₹${payAmount.toLocaleString('en-IN')} successfully recorded!`,
      receipt: {
        id: paymentId,
        transactionId: cleanTxnId,
        amount: payAmount,
        billingPeriod,
        paymentDate: todayStr,
        paymentTime: currentTimeStr,
        studentName: student.full_name,
        roomNumber: student.room_number,
        paymentMethod: paymentMethod || 'Cash',
        nextDueDate,
      },
    });
  } catch (error) {
    console.error('Record offline payment error:', error);
    return res.status(500).json({ error: 'Failed to record offline payment.' });
  }
});

module.exports = router;
