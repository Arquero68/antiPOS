-- antiPOS Phase 16: Purchase Orders & Procurement
-- This migration adds the structure for ordering and receiving stock from suppliers.

-- 1. Purchase Orders Table
CREATE TABLE IF NOT EXISTS purchase_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE, -- Where the stock is going
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'received', 'cancelled')),
    total_amount DECIMAL(12,2) DEFAULT 0,
    notes TEXT,
    created_by UUID REFERENCES profiles(id),
    received_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Purchase Order Items Table
CREATE TABLE IF NOT EXISTS purchase_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    unit_cost DECIMAL(12,2) NOT NULL,
    total_cost DECIMAL(12,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Function to Receive PO and Update Inventory
CREATE OR REPLACE FUNCTION receive_purchase_order(po_id uuid, staff_id uuid)
RETURNS void AS $$
DECLARE
    item RECORD;
    po_row RECORD;
BEGIN
    SELECT * INTO po_row FROM purchase_orders WHERE id = po_id AND status != 'received';
    
    IF po_row.id IS NOT NULL THEN
        -- Iterate through PO items
        FOR item IN SELECT * FROM purchase_order_items WHERE purchase_order_id = po_id LOOP
            -- Update branch inventory
            INSERT INTO branch_inventory (branch_id, product_id, quantity)
            VALUES (po_row.branch_id, item.product_id, item.quantity)
            ON CONFLICT (branch_id, product_id) DO UPDATE 
            SET quantity = branch_inventory.quantity + item.quantity,
                updated_at = NOW();
                
            -- Update product's cost_price globally (optional, but keeps it updated)
            UPDATE products SET cost_price = item.unit_cost WHERE id = item.product_id;
        END LOOP;

        -- Create an expense entry for the PO
        INSERT INTO expenses (branch_id, category, amount, description, created_by, expense_date)
        VALUES (po_row.branch_id, 'inventory', po_row.total_amount, 'Purchase Order Recv: ' || po_id, staff_id, CURRENT_DATE);

        -- Mark PO as received
        UPDATE purchase_orders 
        SET status = 'received', 
            received_at = NOW(), 
            updated_at = NOW() 
        WHERE id = po_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 4. Enable Real-time
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'purchase_orders'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE purchase_orders;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'purchase_order_items'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE purchase_order_items;
    END IF;
END $$;
