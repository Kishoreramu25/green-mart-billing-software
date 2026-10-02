-- ============================================================================
-- GREEN MART - SUPABASE POSTGRESQL SCHEMA & SEED DATA
-- ============================================================================
-- Run this script in your Supabase Dashboard -> SQL Editor -> New query -> Run
-- It creates all 9 tables, sets up Row Level Security (RLS) for the web client,
-- and seeds the initial store products and settings.
-- ============================================================================

-- 1. App Settings
CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT PRIMARY KEY,
    val TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Products
CREATE TABLE IF NOT EXISTS public.products (
    id BIGINT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT DEFAULT '',
    bc TEXT DEFAULT '',
    cat TEXT DEFAULT 'General',
    unit TEXT DEFAULT 'pc',
    pp NUMERIC(12,2) DEFAULT 0,
    sp NUMERIC(12,2) NOT NULL DEFAULT 0,
    mrp NUMERIC(12,2) DEFAULT 0,
    gst NUMERIC(5,2) DEFAULT 0,
    stock NUMERIC(12,2) DEFAULT 0,
    min NUMERIC(12,2) DEFAULT 0,
    box INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Customers
CREATE TABLE IF NOT EXISTS public.customers (
    id BIGINT PRIMARY KEY,
    name TEXT NOT NULL,
    mobile TEXT DEFAULT '',
    bal NUMERIC(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Bills (Invoices)
CREATE TABLE IF NOT EXISTS public.bills (
    no TEXT PRIMARY KEY,
    t TIMESTAMPTZ NOT NULL,
    cust BIGINT,
    sub NUMERIC(12,2) DEFAULT 0,
    disc NUMERIC(12,2) DEFAULT 0,
    gst NUMERIC(12,2) DEFAULT 0,
    total NUMERIC(12,2) NOT NULL,
    pay JSONB DEFAULT '{}'::jsonb,
    cashier TEXT DEFAULT 'Admin',
    ret INT DEFAULT 0,
    ret_t TIMESTAMPTZ,
    items JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Purchases
CREATE TABLE IF NOT EXISTS public.purchases (
    id BIGSERIAL PRIMARY KEY,
    t TIMESTAMPTZ NOT NULL,
    s TEXT DEFAULT '',
    i TEXT DEFAULT '',
    n TEXT NOT NULL,
    q NUMERIC(12,2) DEFAULT 0,
    tot NUMERIC(12,2) DEFAULT 0,
    st TEXT DEFAULT 'Paid',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Expenses
CREATE TABLE IF NOT EXISTS public.expenses (
    id BIGSERIAL PRIMARY KEY,
    t TIMESTAMPTZ NOT NULL,
    cat TEXT DEFAULT 'Other',
    amt NUMERIC(12,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Stock Movements (Ledger)
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id BIGSERIAL PRIMARY KEY,
    t TIMESTAMPTZ NOT NULL,
    pid BIGINT,
    qty NUMERIC(12,2) DEFAULT 0,
    why TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id BIGSERIAL PRIMARY KEY,
    t TIMESTAMPTZ NOT NULL,
    a TEXT DEFAULT '',
    d TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Daily Closings
CREATE TABLE IF NOT EXISTS public.daily_closings (
    day TEXT PRIMARY KEY,
    open NUMERIC(12,2) DEFAULT 0,
    cnt NUMERIC(12,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_closings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anon public access settings" ON public.settings;
CREATE POLICY "Anon public access settings" ON public.settings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon public access products" ON public.products;
CREATE POLICY "Anon public access products" ON public.products FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon public access customers" ON public.customers;
CREATE POLICY "Anon public access customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon public access bills" ON public.bills;
CREATE POLICY "Anon public access bills" ON public.bills FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon public access purchases" ON public.purchases;
CREATE POLICY "Anon public access purchases" ON public.purchases FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon public access expenses" ON public.expenses;
CREATE POLICY "Anon public access expenses" ON public.expenses FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon public access stock_movements" ON public.stock_movements;
CREATE POLICY "Anon public access stock_movements" ON public.stock_movements FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon public access audit_logs" ON public.audit_logs;
CREATE POLICY "Anon public access audit_logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anon public access daily_closings" ON public.daily_closings;
CREATE POLICY "Anon public access daily_closings" ON public.daily_closings FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- SEED INITIAL DATA
-- ============================================================================
INSERT INTO public.customers (id, name, mobile, bal)
VALUES (1, 'Walk-in', '', 0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.products (id, name, code, bc, cat, unit, pp, sp, mrp, gst, stock, min, box)
VALUES
(1, 'Basmati Rice 1kg', 'P001', '8901001', 'Grocery', 'pkt', 90, 110, 120, 5, 60, 15, 10),
(2, 'Sunflower Oil 1L', 'P002', '8901002', 'Grocery', 'btl', 120, 145, 155, 5, 8, 12, 0),
(3, 'Toor Dal 1kg', 'P003', '8901003', 'Grocery', 'pkt', 110, 135, 140, 5, 40, 10, 0),
(4, 'Green Tea 25 bags', 'P004', '8901004', 'Beverage', 'box', 70, 95, 105, 12, 25, 8, 12),
(5, 'Hand Soap', 'P005', '8901005', 'Personal', 'pc', 25, 38, 40, 18, 90, 20, 12)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.settings (key, val)
VALUES
('shop', 'Green Mart'),
('addr', 'Main Road, Your City'),
('phone', '98xxxxxx00'),
('gstin', ''),
('pre', 'INV-'),
('w', '58'),
('auto', 'true')
ON CONFLICT (key) DO NOTHING;
