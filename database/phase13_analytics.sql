-- Phase 13: Financial Analytics & Profit Tracking

-- 1. Add cost_price to Products
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'products' AND COLUMN_NAME = 'cost_price') THEN
        ALTER TABLE products ADD COLUMN cost_price DECIMAL(12,2) DEFAULT 0.00;
    END IF;
END $$;

-- 2. Add cost_price to Transaction Items (for historical accuracy)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'transaction_items' AND COLUMN_NAME = 'cost_price') THEN
        ALTER TABLE transaction_items ADD COLUMN cost_price DECIMAL(12,2) DEFAULT 0.00;
    END IF;
END $$;

-- 3. Update existing transaction items with current product costs (optional/best effort)
UPDATE transaction_items ti
SET cost_price = p.cost_price
FROM products p
WHERE ti.product_id = p.id
AND ti.cost_price = 0;
