-- =============================================
-- FIX RECEIPT NUMBER ISSUE
-- Each business should have independent receipt numbering
-- =============================================

-- Add receipt_number column to sales table
ALTER TABLE sales ADD COLUMN IF NOT EXISTS receipt_number INTEGER;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sales_receipt_number ON sales(business_id, receipt_number);

-- Update existing sales with receipt_number = id (for backward compatibility)
-- This will keep the existing receipt numbers as-is
UPDATE sales 
SET receipt_number = id 
WHERE receipt_number IS NULL OR receipt_number = 0;

-- Verify the changes
SELECT id, business_id, receipt_number, created_at 
FROM sales 
ORDER BY created_at DESC 
LIMIT 10;
