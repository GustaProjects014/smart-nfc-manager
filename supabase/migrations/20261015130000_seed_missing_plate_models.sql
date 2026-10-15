-- Add the four missing NFC Control plate models without touching existing records.
-- Costs and prices are intentionally left NULL because their correct values
-- have not yet been confirmed. Existing models are preserved.
insert into public.plate_models (name, active)
values
  ('BioSite', true),
  ('Google Avaliações', true),
  ('Instagram', true),
  ('Pix', true)
on conflict (name) do nothing;
