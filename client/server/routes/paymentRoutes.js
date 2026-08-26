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

// 1. GET /api/payments/tenant/fee-status
router.get('/tenant/fee-status', requireAuth, requireRole('student'), (req, res) => {
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

    // Get owner's configured UPI settings
    const ownerSettings = db.prepare(`
      SELECT * FROM owner_payment_settings WHERE owner_id = ?
    `).get(student.owner_id);

    const upiId = ownerSettings?.upi_id || 'hostelpg@upi';
    const payeeName = ownerSettings?.account_holder_name || student.owner_name || 'PG Owner';

    const now = new Date();
    const currentDueDate = student.next_due_date || formatDate(new Date(now.getFullYear(), now.getMonth(), student.rent_due_day || 5));
    const monthlyFee = Number(student.monthly_fee || 8000);
    const billingPeriod = getBillingPeriodName(currentDueDate);

    // Evaluate fee status based on server-side date arithmetic
    const feeStatusInfo = evaluateFeeStatus(currentDueDate, student.last_paid_date);

    // Generate unique transaction reference for this billing attempt
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
        overdueDays: feeStatusInfo.overdueDays,
        isDueToday: feeStatusInfo.isDueToday,
      },
      paymentDetails: {
        upiId,
        payeeName,
        qrImageUrl: ownerSettings?.qr_image_url || null,
        upiIntentUrl,
        txnRef,
      },
    });
  } catch (error) {
    console.error('Fee status fetch error:', error);
    return res.status(500).json({ error: 'Failed to retrieve room fee status.' });
  }
});

// 2. GET /api/payments/tenant/history
router.get('/tenant/history', requireAuth, requireRole('student'), (req, res) => {
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

// 3. POST /api/payments/tenant/verify-and-record
router.post('/tenant/verify-and-record', requireAuth, requireRole('student'), (req, res) => {
  try {
    const { transactionId, paymentReference, note, paymentMethod } = req.body;

    if (!transactionId || transactionId.trim().length < 5) {
      return res.status(400).json({
        error: 'Please provide a valid UPI Reference / UTR Number or Transaction ID (minimum 6 digits).',
      });
    }

    const cleanTxnId = transactionId.trim().toUpperCase();

    // Check for duplicate transaction ID (Prevent double submission)
    const existingTxn = db.prepare(`
      SELECT id, payment_date, amount FROM payment_transactions WHERE transaction_id = ?
    `).get(cleanTxnId);

    if (existingTxn) {
      return res.status(409).json({
        error: `Transaction ID "${cleanTxnId}" has already been verified and recorded.`,
        alreadyRecorded: true,
      });
    }

    // Get active student profile
    const student = db.prepare(`
      SELECT sp.*, p.property_name, u.name as owner_name
      FROM student_profiles sp
      JOIN properties p ON sp.property_id = p.id
      JOIN users u ON p.owner_id = u.id
      WHERE sp.user_id = ?
      ORDER BY sp.created_at DESC
      LIMIT 1
    `).get(req.user.id);

    if (!student) {
      return res.status(404).json({ error: 'No active hostel profile found for this student.' });
    }

    const now = new Date();
    const todayStr = formatDate(now);
    const currentTimeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    const currentDueDate = student.next_due_date || todayStr;
    const monthlyFee = Number(student.monthly_fee || 8000);
    const billingPeriod = getBillingPeriodName(currentDueDate);

    // 1. Create or update billing record
    const billId = `bill_${nanoid(10)}`;
    db.prepare(`
      INSERT INTO monthly_billings (id, tenant_id, user_id, owner_id, property_id, billing_period, amount, due_date, status, paid_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      billId,
      student.id,
      student.user_id,
      student.owner_id,
      student.property_id,
      billingPeriod,
      monthlyFee,
      currentDueDate,
      'paid',
      now.toISOString()
    );

    // 2. Insert verified payment transaction
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
      `${billingPeriod} Room Fee`,
      monthlyFee,
      'success',
      paymentMethod || 'UPI',
      cleanTxnId,
      paymentReference || cleanTxnId,
      todayStr,
      currentTimeStr,
      note || `Verified UPI Payment for ${billingPeriod}`
    );

    // 3. Compute new next due date (+1 month)
    const nextDueDate = calculateNextDueDate(currentDueDate, student.rent_due_day || 5);

    // 4. Update student profile with last paid and new next due date
    db.prepare(`
      UPDATE student_profiles
      SET last_paid_date = ?, next_due_date = ?, payment_status = 'paid'
      WHERE id = ?
    `).run(todayStr, nextDueDate, student.id);

    // 5. Send notification to owner
    const notifId = `notif_${nanoid(10)}`;
    const notifMessage = `💰 Room Fee Received: ₹${monthlyFee.toLocaleString('en-IN')} paid by ${student.full_name} (Room ${student.room_number || 'N/A'}). UTR: ${cleanTxnId}`;
    db.prepare(`
      INSERT INTO notifications (id, owner_id, student_id, type, message)
      VALUES (?, ?, ?, 'payment_received', ?)
    `).run(notifId, student.owner_id, student.id, notifMessage);

    // 6. Sync bill and payment record to Supabase
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

// 4. GET /api/payments/owner/dashboard
router.get('/owner/dashboard', requireAuth, requireRole('owner'), (req, res) => {
  try {
    const property = db.prepare('SELECT id, property_name FROM properties WHERE owner_id = ?').get(req.user.id);
    if (!property) {
      return res.status(404).json({ error: 'Property not found.' });
    }

    const students = db.prepare('SELECT * FROM student_profiles WHERE property_id = ?').all(property.id);

    let totalExpectedRevenue = 0;
    let totalCollectedThisMonth = 0;
    let pendingCount = 0;
    let overdueCount = 0;
    let paidCount = 0;

    const tenantsList = students.map((s) => {
      const monthlyFee = Number(s.monthly_fee || 8000);
      totalExpectedRevenue += monthlyFee;

      const currentDueDate = s.next_due_date || formatDate(new Date());
      const feeStatusInfo = evaluateFeeStatus(currentDueDate, s.last_paid_date);

      if (feeStatusInfo.status === 'paid') {
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
        roomNumber: s.room_number,
        bed: s.bed,
        mobile: s.mobile,
        monthlyFee,
        rentDueDay: s.rent_due_day || 5,
        dueDate: currentDueDate,
        lastPaidDate: s.last_paid_date,
        status: feeStatusInfo.status,
        statusLabel: feeStatusInfo.label,
        overdueDays: feeStatusInfo.overdueDays,
      };
    });

    return res.json({
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

// 5. GET & POST /api/payments/owner/settings
router.get('/owner/settings', requireAuth, requireRole('owner'), (req, res) => {
  try {
    const settings = db.prepare('SELECT * FROM owner_payment_settings WHERE owner_id = ?').get(req.user.id);
    const user = db.prepare('SELECT name FROM users WHERE id = ?').get(req.user.id);

    return res.json({
      settings: settings || {
        upiId: '',
        accountHolderName: user?.name || '',
        qrImageUrl: null,
      },
    });
  } catch (error) {
    console.error('Owner settings fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch owner payment settings.' });
  }
});

router.post('/owner/settings', requireAuth, requireRole('owner'), async (req, res) => {
  try {
    const { upiId, accountHolderName, qrImageUrl } = req.body;

    if (!upiId || !upiId.includes('@')) {
      return res.status(400).json({ error: 'Please enter a valid UPI ID (e.g., yourname@okhdfcbank).' });
    }

    const cleanUpi = upiId.trim();
    const cleanName = (accountHolderName || '').trim() || 'Hostel PG Owner';
    const settingsId = `pay_set_${nanoid(10)}`;

    db.prepare(`
      INSERT OR REPLACE INTO owner_payment_settings (id, owner_id, upi_id, account_holder_name, qr_image_url)
      VALUES (?, ?, ?, ?, ?)
    `).run(settingsId, req.user.id, cleanUpi, cleanName, qrImageUrl || null);

    // Sync to Supabase in background
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
      },
    });
  } catch (error) {
    console.error('Owner settings save error:', error);
    return res.status(500).json({ error: 'Failed to save payment settings.' });
  }
});

// 6. POST /api/payments/owner/upload-qr
router.post('/owner/upload-qr', requireAuth, requireRole('owner'), upload.single('qrImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Please select a QR code image to upload.' });
    }

    // Try uploading to Supabase Storage bucket 'payment_qrs'
    let publicUrl = await uploadOwnerQRImage(req.user.id, req.file.buffer, req.file.mimetype);

    // Fallback: if Supabase Storage is not set up, convert to data URL so the owner's QR displays immediately
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

// 6. GET /api/payments/owner/tenant-history/:studentId
router.get('/owner/tenant-history/:studentId', requireAuth, requireRole('owner'), (req, res) => {
  try {
    const { studentId } = req.params;

    const student = db.prepare(`
      SELECT sp.*, p.owner_id
      FROM student_profiles sp
      JOIN properties p ON sp.property_id = p.id
      WHERE sp.id = ?
    `).get(studentId);

    if (!student || student.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied: Tenant not found in your property.' });
    }

    const history = db.prepare(`
      SELECT * FROM payment_transactions WHERE tenant_id = ? ORDER BY created_at DESC
    `).all(studentId);

    return res.json({
      student: {
        id: student.id,
        fullName: student.full_name,
        roomNumber: student.room_number,
        bed: student.bed,
        monthlyFee: student.monthly_fee || 8000,
        rentDueDay: student.rent_due_day || 5,
        dueDate: student.next_due_date,
        lastPaidDate: student.last_paid_date,
      },
      history,
    });
  } catch (error) {
    console.error('Tenant history fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch tenant payment history.' });
  }
});

// 7. POST /api/payments/owner/update-tenant-fee
router.post('/owner/update-tenant-fee', requireAuth, requireRole('owner'), (req, res) => {
  try {
    const { studentId, monthlyFee, rentDueDay } = req.body;

    if (!studentId || !monthlyFee || Number(monthlyFee) <= 0) {
      return res.status(400).json({ error: 'Valid monthly fee amount is required.' });
    }

    const student = db.prepare(`
      SELECT sp.*, p.owner_id
      FROM student_profiles sp
      JOIN properties p ON sp.property_id = p.id
      WHERE sp.id = ?
    `).get(studentId);

    if (!student || student.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied: Tenant not found in your property.' });
    }

    const numFee = Number(monthlyFee);
    const numDay = Number(rentDueDay || student.rent_due_day || 5);

    const now = new Date();
    const nextDueDate = new Date(now.getFullYear(), now.getMonth(), numDay).toISOString().split('T')[0];

    db.prepare(`
      UPDATE student_profiles
      SET monthly_fee = ?, rent_due_day = ?, next_due_date = ?
      WHERE id = ?
    `).run(numFee, numDay, nextDueDate, studentId);

    return res.json({
      message: `Monthly room fee updated to ₹${numFee.toLocaleString('en-IN')} (Due ${numDay}th of month).`,
      student: {
        id: student.id,
        monthlyFee: numFee,
        rentDueDay: numDay,
        nextDueDate,
      },
    });
  } catch (error) {
    console.error('Update fee error:', error);
    return res.status(500).json({ error: 'Failed to update tenant room fee.' });
  }
});

// 8. POST /api/payments/owner/record-offline-payment
router.post('/owner/record-offline-payment', requireAuth, requireRole('owner'), (req, res) => {
  try {
    const { studentId, amount, paymentMethod, referenceNote } = req.body;

    const student = db.prepare(`
      SELECT sp.*, p.property_name, p.owner_id
      FROM student_profiles sp
      JOIN properties p ON sp.property_id = p.id
      WHERE sp.id = ?
    `).get(studentId);

    if (!student || student.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied: Tenant not found.' });
    }

    const payAmount = Number(amount || student.monthly_fee || 8000);
    const now = new Date();
    const todayStr = formatDate(now);
    const currentTimeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    const currentDueDate = student.next_due_date || todayStr;
    const billingPeriod = getBillingPeriodName(currentDueDate);
    const txnId = `OFFLINE-${Date.now().toString().slice(-8)}`;

    const billId = `bill_${nanoid(10)}`;
    db.prepare(`
      INSERT INTO monthly_billings (id, tenant_id, user_id, owner_id, property_id, billing_period, amount, due_date, status, paid_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(billId, student.id, student.user_id, req.user.id, student.property_id, billingPeriod, payAmount, currentDueDate, 'paid', now.toISOString());

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
      `${billingPeriod} Room Fee (Offline)`,
      payAmount,
      'success',
      paymentMethod || 'Cash / Offline',
      txnId,
      referenceNote || 'Direct Cash / Bank Transfer',
      todayStr,
      currentTimeStr,
      referenceNote || 'Marked as Paid by Owner'
    );

    const nextDueDate = calculateNextDueDate(currentDueDate, student.rent_due_day || 5);

    db.prepare(`
      UPDATE student_profiles
      SET last_paid_date = ?, next_due_date = ?, payment_status = 'paid'
      WHERE id = ?
    `).run(todayStr, nextDueDate, student.id);

    return res.status(201).json({
      message: `Offline payment of ₹${payAmount.toLocaleString('en-IN')} recorded successfully!`,
      nextDueDate,
    });
  } catch (error) {
    console.error('Offline payment record error:', error);
    return res.status(500).json({ error: 'Failed to record offline payment.' });
  }
});

module.exports = router;
