-- antiPOS Phase 17: Inventory Reconciliation & Stocktake
-- This migration adds the structure for periodic physical stock checks.

-- 1. Stocktake Sessions
CREATE TABLE IF NOT EXISTS stocktake_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'completed', 'cancelled')),
    started_by UUID REFERENCES profiles(id),
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Stocktake Counts (The actual entries)
CREATE TABLE IF NOT EXISTS stocktake_counts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES stocktake_sessions(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    system_quantity INTEGER NOT NULL, -- Recorded at start/entry
    actual_quantity INTEGER NOT NULL, -- What the staff counted
    staff_id UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(session_id, product_id)
);

-- 3. Function to Apply Reconciliation
CREATE OR REPLACE FUNCTION apply_reconciliation(session_id_val uuid, user_id_val uuid)
RETURNS void AS $$
DECLARE
    entry RECORD;
    branch_id_val uuid;
BEGIN
    SELECT branch_id INTO branch_id_val FROM stocktake_sessions WHERE id = session_id_val AND status = 'open';
    
    IF branch_id_val IS NOT NULL THEN
        -- Iterate through counts in this session
        FOR entry IN SELECT * FROM stocktake_counts WHERE session_id = session_id_val LOOP
            -- 1. Update branch inventory to match actual count
            INSERT INTO branch_inventory (branch_id, product_id, quantity)
            VALUES (branch_id_val, entry.product_id, entry.actual_quantity)
            ON CONFLICT (branch_id, product_id) DO UPDATE 
            SET quantity = entry.actual_quantity,
                updated_at = NOW();
                
            -- 2. Log a stock adjustment if there's a variance
            IF entry.actual_quantity != entry.system_quantity THEN
                INSERT INTO stock_adjustments (product_id, branch_id, quantity_change, reason, staff_id)
                VALUES (
                    entry.product_id, 
                    branch_id_val, 
                    entry.actual_quantity - entry.system_quantity, 
                    'reconciliation', 
                    user_id_val
                );
            END IF;
        END LOOP;

        -- Mark session as completed
        UPDATE stocktake_sessions 
        SET status = 'completed', 
            completed_at = NOW(), 
            updated_at = NOW() 
        WHERE id = session_id_val;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 4. Enable Real-time
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'stocktake_sessions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE stocktake_sessions;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'stocktake_counts'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE stocktake_counts;
    END IF;
END $$;
