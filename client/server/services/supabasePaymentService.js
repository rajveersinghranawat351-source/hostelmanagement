const { supabase } = require('../supabase');

/**
 * Supabase Payment & Rent Synchronization Service
 */

const isSupabaseReady = () => Boolean(supabase);

/**
 * Saves or updates owner payment settings in Supabase
 */
async function syncOwnerPaymentSettings(ownerId, { ownerName, upiId, qrImageUrl }) {
  if (!isSupabaseReady()) return null;

  try {
    const { data, error } = await supabase
      .from('owner_payment_settings')
      .upsert(
        {
          owner_id: ownerId,
          owner_name: ownerName,
          upi_id: upiId,
          qr_image_url: qrImageUrl || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'owner_id' }
      )
      .select()
      .single();

    if (error) {
      console.warn('[Supabase Sync Warning - owner_payment_settings]:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.warn('[Supabase Exception - owner_payment_settings]:', err.message);
    return null;
  }
}

/**
 * Uploads owner payment QR image to Supabase Storage bucket 'payment_qrs'
 */
async function uploadOwnerQRImage(ownerId, fileBuffer, fileMimeType = 'image/png') {
  if (!isSupabaseReady()) return null;

  try {
    const ext = fileMimeType.includes('jpeg') || fileMimeType.includes('jpg') ? 'jpg' : 'png';
    const filePath = `${ownerId}/qr_${Date.now()}.${ext}`;

    const { data, error } = await supabase.storage
      .from('payment_qrs')
      .upload(filePath, fileBuffer, {
        contentType: fileMimeType,
        upsert: true,
      });

    if (error) {
      console.warn('[Supabase Storage Upload Warning]:', error.message);
      return null;
    }

    const { data: publicData } = supabase.storage
      .from('payment_qrs')
      .getPublicUrl(filePath);

    return publicData?.publicUrl || null;
  } catch (err) {
    console.warn('[Supabase Storage Upload Exception]:', err.message);
    return null;
  }
}

/**
 * Inserts or updates rent_bills record in Supabase
 */
async function syncRentBill({ roomId, ownerId, tenantId, billingPeriod, amount, dueDate, status, paidAt }) {
  if (!isSupabaseReady()) return null;

  try {
    const { data, error } = await supabase
      .from('rent_bills')
      .upsert(
        {
          room_id: roomId,
          owner_id: ownerId,
          tenant_id: tenantId,
          billing_period: billingPeriod,
          amount,
          due_date: dueDate,
          status: status || 'pending',
          paid_at: paidAt || null,
        },
        { onConflict: 'room_id,billing_period' }
      )
      .select()
      .single();

    if (error) {
      console.warn('[Supabase Sync Warning - rent_bills]:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.warn('[Supabase Exception - rent_bills]:', err.message);
    return null;
  }
}

/**
 * Inserts payment record in Supabase payments table
 */
async function syncPaymentTransaction({ billId, roomId, ownerId, tenantId, amount, status, paymentProvider, transactionId, paymentReference, note, paidAt }) {
  if (!isSupabaseReady()) return null;

  try {
    const { data, error } = await supabase
      .from('payments')
      .insert({
        bill_id: billId || null,
        room_id: roomId || null,
        owner_id: ownerId,
        tenant_id: tenantId,
        amount,
        status: status || 'success',
        payment_provider: paymentProvider || 'UPI',
        transaction_id: transactionId,
        payment_reference: paymentReference || transactionId,
        note: note || '',
        paid_at: paidAt || new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.warn('[Supabase Sync Warning - payments]:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.warn('[Supabase Exception - payments]:', err.message);
    return null;
  }
}

module.exports = {
  isSupabaseReady,
  syncOwnerPaymentSettings,
  uploadOwnerQRImage,
  syncRentBill,
  syncPaymentTransaction,
};
