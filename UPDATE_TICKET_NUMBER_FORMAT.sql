-- Update Ticket Number Format to Sequential (1-1000)
-- Run this SQL in your Supabase SQL Editor

-- Drop the old trigger first
DROP TRIGGER IF EXISTS before_insert_patient_tickets ON patient_tickets;
DROP TRIGGER IF EXISTS trigger_set_ticket_identifiers ON patient_tickets;

-- Drop the old function with CASCADE to remove dependencies
DROP FUNCTION IF EXISTS set_ticket_identifiers() CASCADE;

-- Create new function for sequential ticket numbers
CREATE OR REPLACE FUNCTION set_ticket_identifiers()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER trigger_set_ticket_identifiers
    BEFORE INSERT ON patient_tickets
    FOR EACH ROW
    EXECUTE FUNCTION set_ticket_identifiers();

-- Verify the trigger was created
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'patient_tickets';

