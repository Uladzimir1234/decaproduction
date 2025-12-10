-- Change height_mm and width_mm from integer to numeric to support decimal values
ALTER TABLE order_constructions 
  ALTER COLUMN height_mm TYPE numeric USING height_mm::numeric;

ALTER TABLE order_constructions 
  ALTER COLUMN width_mm TYPE numeric USING width_mm::numeric;