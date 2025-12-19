-- Add quantity column to batch_construction_items for partial shipments
ALTER TABLE batch_construction_items 
ADD COLUMN quantity integer NOT NULL DEFAULT 1;

-- Add comment for documentation
COMMENT ON COLUMN batch_construction_items.quantity IS 'Number of units from this construction being shipped in this batch (for partial shipments)';