-- Patient Tickets Table for Shareable Ticket Links
-- Run this SQL in your Supabase SQL Editor: https://supabase.com/dashboard/project/wbcnyzzvynqgoaexehor/sql

-- Patient Tickets table
CREATE TABLE IF NOT EXISTS patient_tickets (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER REFERENCES patients(id) ON DELETE CASCADE,
    ticket_number VARCHAR(50) UNIQUE NOT NULL,
    ticket_code VARCHAR(20) UNIQUE NOT NULL, -- Short unique code for easy sharing
    purpose TEXT, -- Reason for the ticket (appointment, consultation, follow-up, etc.)
    appointment_date TIMESTAMPTZ,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'used', 'expired', 'cancelled'
    whatsapp_number VARCHAR(50), -- WhatsApp contact for this ticket
    created_by INTEGER REFERENCES users(id),
    created_date TIMESTAMPTZ DEFAULT NOW(),
    updated_date TIMESTAMPTZ DEFAULT NOW(),
    expires_date TIMESTAMPTZ, -- Optional expiration date
    used_date TIMESTAMPTZ -- When the ticket was used
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_patient_tickets_patient_id ON patient_tickets(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_tickets_ticket_number ON patient_tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_patient_tickets_ticket_code ON patient_tickets(ticket_code);
CREATE INDEX IF NOT EXISTS idx_patient_tickets_status ON patient_tickets(status);

-- Function to generate unique ticket code
CREATE OR REPLACE FUNCTION generate_ticket_code()
RETURNS TEXT AS $$
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
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate ticket number and code before insert
CREATE OR REPLACE FUNCTION set_ticket_identifiers()
RETURNS TRIGGER AS $$
BEGIN
    -- Generate ticket number: TKT-YYYYMMDD-NNNN
    IF NEW.ticket_number IS NULL THEN
        NEW.ticket_number := 'TKT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                             LPAD(NEXTVAL('patient_tickets_id_seq')::TEXT, 4, '0');
    END IF;
    
    -- Generate unique ticket code
    IF NEW.ticket_code IS NULL THEN
        LOOP
            NEW.ticket_code := generate_ticket_code();
            EXIT WHEN NOT EXISTS (SELECT 1 FROM patient_tickets WHERE ticket_code = NEW.ticket_code);
        END LOOP;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS before_insert_patient_tickets ON patient_tickets;
CREATE TRIGGER before_insert_patient_tickets
    BEFORE INSERT ON patient_tickets
    FOR EACH ROW
    EXECUTE FUNCTION set_ticket_identifiers();

COMMENT ON TABLE patient_tickets IS 'Patient tickets for shareable appointment/visit links';
COMMENT ON COLUMN patient_tickets.ticket_number IS 'Full ticket number (TKT-YYYYMMDD-NNNN)';
COMMENT ON COLUMN patient_tickets.ticket_code IS 'Short unique code for easy sharing (8 chars)';
COMMENT ON COLUMN patient_tickets.purpose IS 'Purpose of the ticket';
COMMENT ON COLUMN patient_tickets.whatsapp_number IS 'WhatsApp contact number';

