-- Create a flexible temp table that accepts text for everything
-- This avoids type conflicts during import
CREATE TABLE IF NOT EXISTS temp_knack_import (
    id SERIAL PRIMARY KEY,
    -- Use TEXT for all columns to avoid type conflicts
    column1 TEXT,
    column2 TEXT,
    column3 TEXT,
    column4 TEXT,
    column5 TEXT,
    column6 TEXT,
    column7 TEXT,
    column8 TEXT,
    column9 TEXT,
    column10 TEXT,
    column11 TEXT,
    column12 TEXT,
    column13 TEXT,
    column14 TEXT,
    column15 TEXT,
    column16 TEXT,
    column17 TEXT,
    column18 TEXT,
    column19 TEXT,
    column20 TEXT
);

-- After creating this table, you can import your CSV
-- Then we'll rename the columns based on what's actually in your CSV 