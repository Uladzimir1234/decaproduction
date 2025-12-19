-- Add unit_index column to track components per individual unit within a construction
ALTER TABLE batch_construction_components 
ADD COLUMN unit_index INTEGER NOT NULL DEFAULT 1;