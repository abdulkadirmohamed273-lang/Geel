-- Pharmacy Stock Table for Inventory Management
-- Run this SQL in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS pharmacy_stock (
    id SERIAL PRIMARY KEY,
    medication_name VARCHAR(255) NOT NULL,
    generic_name VARCHAR(255),
    category VARCHAR(100), -- e.g., 'Antibiotic', 'Pain Relief', 'Vitamins', etc.
    quantity INTEGER NOT NULL DEFAULT 0,
    unit VARCHAR(50) DEFAULT 'units', -- e.g., 'tablets', 'bottles', 'boxes', 'vials'
    unit_price DECIMAL(10, 2) DEFAULT 0.00,
    expiry_date DATE,
    batch_number VARCHAR(100),
    supplier VARCHAR(255),
    reorder_level INTEGER DEFAULT 10, -- Alert when stock falls below this
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'expired', 'out_of_stock'
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pharmacy_stock_medication_name ON pharmacy_stock(medication_name);
CREATE INDEX IF NOT EXISTS idx_pharmacy_stock_category ON pharmacy_stock(category);
CREATE INDEX IF NOT EXISTS idx_pharmacy_stock_status ON pharmacy_stock(status);
CREATE INDEX IF NOT EXISTS idx_pharmacy_stock_expiry_date ON pharmacy_stock(expiry_date);

-- Function to update stock status based on quantity and expiry
CREATE OR REPLACE FUNCTION update_pharmacy_stock_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if expired
    IF NEW.expiry_date IS NOT NULL AND NEW.expiry_date < CURRENT_DATE THEN
        NEW.status := 'expired';
    -- Check if out of stock
    ELSIF NEW.quantity <= 0 THEN
        NEW.status := 'out_of_stock';
    -- Otherwise active
    ELSE
        NEW.status := 'active';
    END IF;
    
    NEW.updated_date := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update status
CREATE TRIGGER trigger_update_pharmacy_stock_status
    BEFORE INSERT OR UPDATE ON pharmacy_stock
    FOR EACH ROW
    EXECUTE FUNCTION update_pharmacy_stock_status();

