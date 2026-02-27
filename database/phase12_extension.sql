-- Phase 12 Extension: Suppliers & Stock Adjustments

-- 1. Suppliers Table
CREATE TABLE IF NOT EXISTS suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Stock Adjustments Table (History/Audit for manual changes)
CREATE TABLE IF NOT EXISTS stock_adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES profiles(id),
    change_amount INTEGER NOT NULL, -- positive for restock, negative for damage/loss
    reason TEXT NOT NULL, -- 'restock', 'spoilage', 'damage', 'correction', etc.
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Update Products Table to link Suppliers
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'products' AND COLUMN_NAME = 'supplier_id') THEN
        ALTER TABLE products ADD COLUMN supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 4. Enable Realtime for new tables
DO $$
DECLARE
    tbl_name TEXT;
    target_tables TEXT[] := ARRAY['suppliers', 'stock_adjustments'];
BEGIN
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
