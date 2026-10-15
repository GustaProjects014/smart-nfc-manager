-- Add the four commercial plaque models without changing existing products.
-- Idempotent: safe to apply more than once.
INSERT INTO public.plate_models (name, active)
VALUES
  ('Instagram', true),
  ('Pix', true),
  ('BioSite', true),
  ('Google Avaliações', true)
ON CONFLICT (name) DO UPDATE
SET active = true;
