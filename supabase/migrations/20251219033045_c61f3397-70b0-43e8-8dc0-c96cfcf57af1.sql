-- Create a function to auto-populate construction_manufacturing stages when order_constructions are inserted
CREATE OR REPLACE FUNCTION public.create_construction_manufacturing_stages()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Define stages based on construction type
  -- For windows: reinforcement_cutting, profile_cutting, welding, assembly, glass, screens
  -- For doors: reinforcement_cutting, profile_cutting, welding, assembly, glass, screens
  -- For sliding_doors: reinforcement_cutting, profile_cutting, welding, assembly, glass, screens
  
  -- Insert common stages for all construction types
  INSERT INTO public.construction_manufacturing (construction_id, stage, status)
  VALUES 
    (NEW.id, 'reinforcement_cutting', 'not_started'),
    (NEW.id, 'profile_cutting', 'not_started'),
    (NEW.id, 'welding', 'not_started'),
    (NEW.id, 'assembly', 'not_started'),
    (NEW.id, 'glass', 'not_started'),
    (NEW.id, 'screens', 'not_started');
  
  RETURN NEW;
END;
$$;

-- Create trigger to fire after insert on order_constructions
DROP TRIGGER IF EXISTS create_manufacturing_stages_trigger ON public.order_constructions;

CREATE TRIGGER create_manufacturing_stages_trigger
AFTER INSERT ON public.order_constructions
FOR EACH ROW
EXECUTE FUNCTION public.create_construction_manufacturing_stages();

-- Backfill existing constructions that don't have manufacturing stages
INSERT INTO public.construction_manufacturing (construction_id, stage, status)
SELECT oc.id, stage.stage_name, 'not_started'
FROM public.order_constructions oc
CROSS JOIN (
  VALUES 
    ('reinforcement_cutting'),
    ('profile_cutting'),
    ('welding'),
    ('assembly'),
    ('glass'),
    ('screens')
) AS stage(stage_name)
WHERE NOT EXISTS (
  SELECT 1 FROM public.construction_manufacturing cm 
  WHERE cm.construction_id = oc.id AND cm.stage = stage.stage_name
);