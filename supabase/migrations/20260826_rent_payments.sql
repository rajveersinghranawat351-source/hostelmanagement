-- ==============================================================================
-- SUPABASE MIGRATION: ROOM RENT & MONTHLY FEE PAYMENT SYSTEM
-- ==============================================================================

-- 1. Enable UUID Extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CREATE TABLE: rooms
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    room_name TEXT NOT NULL,
    monthly_fee NUMERIC(10, 2) NOT NULL DEFAULT 8000.00,
    rent_due_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. CREATE TABLE: rent_bills
CREATE TABLE IF NOT EXISTS public.rent_bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    billing_period DATE NOT NULL,
    amount NUMERIC(10, 2) NOT NULL,
    due_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'overdue')) DEFAULT 'pending',
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_room_billing UNIQUE (room_id, billing_period)
);

-- 4. CREATE TABLE: payments
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID REFERENCES public.rent_bills(id) ON DELETE CASCADE,
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'pending')) DEFAULT 'success',
    payment_provider TEXT NOT NULL DEFAULT 'UPI',
    transaction_id TEXT NOT NULL UNIQUE,
    payment_reference TEXT,
    note TEXT,
    paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. CREATE TABLE: owner_payment_settings
CREATE TABLE IF NOT EXISTS public.owner_payment_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    owner_name TEXT NOT NULL,
    upi_id TEXT NOT NULL,
    qr_image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. CREATE STORAGE BUCKET FOR OWNER PAYMENT QR CODES
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment_qrs', 'payment_qrs', true)
ON CONFLICT (id) DO NOTHING;

-- 7. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rent_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_payment_settings ENABLE ROW LEVEL SECURITY;

-- 8. RLS POLICIES FOR 'rooms'
-- Tenant: Can only read the room they are assigned to
CREATE POLICY "Tenant can view assigned room"
ON public.rooms
FOR SELECT
USING (auth.uid() = tenant_id);

-- Owner: Full access to rooms they own
CREATE POLICY "Owner can manage own rooms"
ON public.rooms
FOR ALL
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- 9. RLS POLICIES FOR 'rent_bills'
-- Tenant: Can only view their own rent bills
CREATE POLICY "Tenant can view own rent bills"
ON public.rent_bills
FOR SELECT
USING (auth.uid() = tenant_id);

-- Owner: Can view and manage rent bills belonging to their rooms
CREATE POLICY "Owner can manage own rent bills"
ON public.rent_bills
FOR ALL
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- 10. RLS POLICIES FOR 'payments'
-- Tenant: Can view their own payments and insert verified payment attempts
CREATE POLICY "Tenant can view own payments"
ON public.payments
FOR SELECT
USING (auth.uid() = tenant_id);

CREATE POLICY "Tenant can record payments"
ON public.payments
FOR INSERT
WITH CHECK (auth.uid() = tenant_id);

-- Owner: Can view and manage all payments for their property/rooms
CREATE POLICY "Owner can manage received payments"
ON public.payments
FOR ALL
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- 11. RLS POLICIES FOR 'owner_payment_settings'
-- Owner: Can read and manage own payment settings
CREATE POLICY "Owner can manage payment settings"
ON public.owner_payment_settings
FOR ALL
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- Tenant: Can read owner payment settings for their assigned room's owner
CREATE POLICY "Tenant can view owner payment settings"
ON public.owner_payment_settings
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.rooms
        WHERE rooms.owner_id = owner_payment_settings.owner_id
        AND rooms.tenant_id = auth.uid()
    )
);

-- 12. STORAGE RLS POLICIES FOR 'payment_qrs'
CREATE POLICY "Public can view payment QR images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'payment_qrs');

CREATE POLICY "Owners can upload payment QR images"
ON storage.objects
FOR INSERT
WITH CHECK (
    bucket_id = 'payment_qrs'
    AND auth.role() = 'authenticated'
);

CREATE POLICY "Owners can update their own payment QR images"
ON storage.objects
FOR UPDATE
USING (
    bucket_id = 'payment_qrs'
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 13. INDEXES FOR HIGH-PERFORMANCE QUERYING
CREATE INDEX IF NOT EXISTS idx_rooms_tenant ON public.rooms(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rooms_owner ON public.rooms(owner_id);
CREATE INDEX IF NOT EXISTS idx_rent_bills_tenant ON public.rent_bills(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_rent_bills_owner ON public.rent_bills(owner_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_tenant ON public.payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_owner ON public.payments(owner_id);
CREATE INDEX IF NOT EXISTS idx_payments_txn ON public.payments(transaction_id);

-- 14. TRIGGER FOR AUTO-UPDATING 'updated_at'
CREATE OR REPLACE FUNCTION update_timestamp_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_rooms_timestamp ON public.rooms;
CREATE TRIGGER trigger_update_rooms_timestamp
BEFORE UPDATE ON public.rooms
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_column();

DROP TRIGGER IF EXISTS trigger_update_settings_timestamp ON public.owner_payment_settings;
CREATE TRIGGER trigger_update_settings_timestamp
BEFORE UPDATE ON public.owner_payment_settings
FOR EACH ROW
EXECUTE FUNCTION update_timestamp_column();
