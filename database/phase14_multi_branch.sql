-- antiPOS Phase 14: Multi-Branch Inventory & Audit logs
-- This migration introduces branch-specific stock tracking and transfers.

-- 1. Create Branch Inventory Table
-- This table tracks how much of each product is at each branch.
CREATE TABLE IF NOT EXISTS branch_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(branch_id, product_id)
);

-- 2. Inventory Transfers Table
-- Tracks movement of stock from one branch to another.
CREATE TABLE IF NOT EXISTS inventory_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_branch_id UUID REFERENCES branches(id),
    to_branch_id UUID REFERENCES branches(id),
    product_id UUID REFERENCES products(id),
    quantity INTEGER NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Initial Migration: Move existing global stock to the "Main" or first branch
-- We assume the first branch created is the primary store.
DO $$
DECLARE
    main_branch_id UUID;
BEGIN
    SELECT id INTO main_branch_id FROM branches ORDER BY created_at LIMIT 1;

    IF main_branch_id IS NOT NULL THEN
        -- Insert existing product stock levels into this branch
        INSERT INTO branch_inventory (branch_id, product_id, quantity, low_stock_threshold)
        SELECT main_branch_id, id, stock_quantity, low_stock_threshold
        FROM products
        ON CONFLICT (branch_id, product_id) DO UPDATE 
        SET quantity = EXCLUDED.quantity;
    END IF;
END $$;

-- 4. Update decrement_stock RPC to be Branch-Aware
-- Now needs branch_id to know which stock to reduce.
CREATE OR REPLACE FUNCTION decrement_branch_stock(target_branch_id uuid, target_product_id uuid, amount int)
RETURNS void AS $$
BEGIN
    UPDATE branch_inventory
    SET quantity = quantity - amount,
        updated_at = NOW()
    WHERE branch_id = target_branch_id AND product_id = target_product_id;
    
    -- If no record exists for this branch/product, create one with negative balance (or zero)
    IF NOT FOUND THEN
        INSERT INTO branch_inventory (branch_id, product_id, quantity)
        VALUES (target_branch_id, target_product_id, -amount);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 5. Helper Function for Stock Transfer
CREATE OR REPLACE FUNCTION complete_inventory_transfer(transfer_id uuid)
RETURNS void AS $$
DECLARE
    t_row RECORD;
BEGIN
    SELECT * INTO t_row FROM inventory_transfers WHERE id = transfer_id AND status = 'pending';
    
    IF t_row.id IS NOT NULL THEN
        -- Reduce from source
        UPDATE branch_inventory 
        SET quantity = quantity - t_row.quantity 
        WHERE branch_id = t_row.from_branch_id AND product_id = t_row.product_id;
        
        -- Add to destination
        INSERT INTO branch_inventory (branch_id, product_id, quantity)
        VALUES (t_row.to_branch_id, t_row.product_id, t_row.quantity)
        ON CONFLICT (branch_id, product_id) DO UPDATE 
        SET quantity = branch_inventory.quantity + t_row.quantity;
        
        -- Mark as completed
        UPDATE inventory_transfers SET status = 'completed', updated_at = NOW() WHERE id = transfer_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 6. Ensure real-time for new tables
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'branch_inventory'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE branch_inventory;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'inventory_transfers'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE inventory_transfers;
    END IF;
END $$;
