-- antiPOS Master Database Setup (Phases 1-11)
-- Run this in your Supabase SQL Editor to ensure your database is fully up to date.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    icon TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Products Table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES categories(id),
    name TEXT NOT NULL,
    price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    emoji TEXT,
    stock_quantity INTEGER DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 10,
    sku TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Branches Table
CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    location TEXT,
    status TEXT DEFAULT 'open',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Profiles Table (Staff Roles)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    full_name TEXT,
    role TEXT DEFAULT 'cashier' CHECK (role IN ('admin', 'manager', 'cashier')),
    avatar_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Customers Table (CRM)
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    phone TEXT,
    loyalty_points INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Coupons Table (Promotions)
CREATE TABLE IF NOT EXISTS coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK (type IN ('percent', 'fixed')),
    value DECIMAL(10,2) NOT NULL,
    min_spend DECIMAL(10,2) DEFAULT 0,
    expiry_date TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id),
    staff_id UUID REFERENCES profiles(id),
    customer_id UUID REFERENCES customers(id),
    coupon_id UUID REFERENCES coupons(id),
    total_amount DECIMAL(12,2) NOT NULL,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    points_spent INTEGER DEFAULT 0,
    payment_method TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Transaction Items Table
CREATE TABLE IF NOT EXISTS transaction_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Settings Table
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES profiles(id),
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    details JSONB
);

-- CUSTOM FUNCTIONS --

-- Stock Deduction
CREATE OR REPLACE FUNCTION decrement_stock(row_id uuid, amount int)
RETURNS void AS $$
BEGIN
    UPDATE products
    SET stock_quantity = stock_quantity - amount
    WHERE id = row_id;
END;
$$ LANGUAGE plpgsql;

-- Coupon Usage Increment
CREATE OR REPLACE FUNCTION increment_coupon_usage(coupon_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE coupons
    SET usage_count = usage_count + 1
    WHERE id = coupon_id;
END;
$$ LANGUAGE plpgsql;

-- REAL-TIME SETUP --
-- Check if publication exists, then add tables safely
DO $$
DECLARE
    tbl_name TEXT;
    target_tables TEXT[] := ARRAY['categories', 'products', 'branches', 'profiles', 'customers', 'coupons', 'transactions', 'transaction_items', 'settings', 'audit_logs'];
BEGIN
    -- Ensure publication exists
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;

    -- Add each table only if not already in the publication
    FOREACH tbl_name IN ARRAY target_tables
    LOOP
        IF EXISTS (SELECT 1 FROM pg_class WHERE relname = tbl_name AND relkind = 'r') THEN
            IF NOT EXISTS (
                SELECT 1 FROM pg_publication_tables 
                WHERE pubname = 'supabase_realtime' 
                AND schemaname = 'public' 
                AND tablename = tbl_name
            ) THEN
                EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', tbl_name);
            END IF;
        END IF;
    END LOOP;
END $$;

-- COLUMN UPDATES (In case tables existed but were missing columns)
DO $$
BEGIN
    BEGIN
        ALTER TABLE transactions ADD COLUMN staff_id UUID REFERENCES profiles(id);
    EXCEPTION WHEN duplicate_column THEN
    END;
    
    BEGIN
        ALTER TABLE transactions ADD COLUMN customer_id UUID REFERENCES customers(id);
    EXCEPTION WHEN duplicate_column THEN
    END;

    BEGIN
        ALTER TABLE transactions ADD COLUMN coupon_id UUID REFERENCES coupons(id);
    EXCEPTION WHEN duplicate_column THEN
    END;

    BEGIN
        ALTER TABLE transactions ADD COLUMN discount_amount DECIMAL(12,2) DEFAULT 0;
    EXCEPTION WHEN duplicate_column THEN
    END;

    BEGIN
        ALTER TABLE transactions ADD COLUMN points_spent INTEGER DEFAULT 0;
    EXCEPTION WHEN duplicate_column THEN
    END;

    BEGIN
        ALTER TABLE products ADD COLUMN low_stock_threshold INTEGER DEFAULT 10;
    EXCEPTION WHEN duplicate_column THEN
    END;
END $$;
