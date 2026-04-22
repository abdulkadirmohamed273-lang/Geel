-- ========================================
-- FIX FUNCTION SEARCH PATH WARNINGS
-- This fixes the "Function Search Path Mutable" security warnings
-- Run this in your Supabase SQL Editor
-- ========================================

-- Fix 1: generate_ticket_code function
CREATE OR REPLACE FUNCTION generate_ticket_code()
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Excluding similar chars like I,O,0,1
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    RETURN result;
END;
$$;

-- Fix 2: update_pharmacy_stock_status function
CREATE OR REPLACE FUNCTION update_pharmacy_stock_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW.expiry_date IS NOT NULL AND NEW.expiry_date < CURRENT_DATE THEN
        NEW.status := 'expired';
    ELSIF NEW.quantity <= 0 THEN
        NEW.status := 'out_of_stock';
    ELSE
        NEW.status := 'active';
    END IF;
    NEW.updated_date := NOW();
    RETURN NEW;
END;
$$;

-- Fix 3: set_ticket_identifiers function
-- Note: This uses the version from UPDATE_TICKET_NUMBER_FORMAT.sql
CREATE OR REPLACE FUNCTION set_ticket_identifiers()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_ticket_number INTEGER;
    max_ticket_number INTEGER;
BEGIN
    -- Generate ticket code if not provided
    IF NEW.ticket_code IS NULL OR NEW.ticket_code = '' THEN
        LOOP
            NEW.ticket_code := (
                SELECT string_agg(
                    substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', floor(random() * 33 + 1)::int, 1),
                    ''
                )
                FROM generate_series(1, 8)
            );
            
            -- Check if code is unique
            EXIT WHEN NOT EXISTS (
                SELECT 1 FROM patient_tickets WHERE ticket_code = NEW.ticket_code
            );
        END LOOP;
    END IF;
    
    -- Generate sequential ticket number (1-1000, then restart)
    IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
        -- Get the current maximum ticket number
        SELECT COALESCE(MAX(
            CASE 
                WHEN ticket_number ~ '^[0-9]+$' THEN ticket_number::INTEGER
                ELSE 0
            END
        ), 0) INTO max_ticket_number
        FROM patient_tickets;
        
        -- Increment by 1
        new_ticket_number := max_ticket_number + 1;
        
        -- Reset to 1 if exceeds 1000
        IF new_ticket_number > 1000 THEN
            new_ticket_number := 1;
        END IF;
        
        -- Set the ticket number as simple integer string
        NEW.ticket_number := new_ticket_number::TEXT;
    END IF;
    
    RETURN NEW;
END;
$$;

-- ========================================
-- VERIFICATION
-- After running, check the Security Advisor again
-- The 3 warnings should be resolved
-- ========================================
