-- Keep stock entry, individual plates, QR identifiers and history in one transaction.
-- This migration also repairs older stock entries whose plate rows were never created.

WITH missing_plates AS (
  SELECT
    se.id AS entry_id,
    se.model_id,
    se.created_at,
    s.seq::integer AS seq,
    public.format_nfc_code(s.seq::integer) AS code
  FROM public.stock_entries AS se
  CROSS JOIN LATERAL generate_series(se.first_seq, se.last_seq) AS s(seq)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.plates AS p WHERE p.seq = s.seq::integer
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.plates AS p WHERE p.code = public.format_nfc_code(s.seq::integer)
  )
)
INSERT INTO public.plates (code, seq, slug, model_id, entry_id, status, qr_active, created_at)
SELECT
  code,
  seq,
  replace(gen_random_uuid()::text, '-', ''),
  model_id,
  entry_id,
  'disponivel',
  true,
  created_at
FROM missing_plates
ON CONFLICT DO NOTHING;

INSERT INTO public.code_counter (id, last_seq)
SELECT 1, COALESCE(MAX(seq), 0) FROM public.plates
ON CONFLICT (id) DO UPDATE
SET last_seq = GREATEST(public.code_counter.last_seq, EXCLUDED.last_seq);

CREATE OR REPLACE FUNCTION public.create_stock_entry(
  _model_id uuid,
  _notes text,
  _quantity integer,
  _received_date date,
  _supplier text,
  _unit_cost numeric
)
RETURNS public.stock_entries
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry public.stock_entries%ROWTYPE;
  v_counter_last integer;
  v_max_seq integer;
  v_first_seq integer;
  v_last_seq integer;
  v_stock_before integer;
  v_seq integer;
  v_plate_id public.plates.id%TYPE;
  v_slug text;
  v_notes text := NULLIF(BTRIM(_notes), '');
  v_supplier text := NULLIF(BTRIM(_supplier), '');
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Você precisa estar autenticado para registrar uma entrada.';
  END IF;

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Somente um administrador pode registrar entradas de estoque.';
  END IF;

  IF _quantity IS NULL OR _quantity < 1 OR _quantity > 10000 THEN
    RAISE EXCEPTION 'A quantidade deve ser um número inteiro entre 1 e 10.000.';
  END IF;

  IF _unit_cost IS NULL OR _unit_cost < 0 THEN
    RAISE EXCEPTION 'O custo unitário não pode ser negativo.';
  END IF;

  IF _received_date IS NULL THEN
    RAISE EXCEPTION 'Informe a data de recebimento.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.plate_models WHERE id = _model_id AND active = true
  ) THEN
    RAISE EXCEPTION 'O modelo selecionado não existe ou está inativo.';
  END IF;

  INSERT INTO public.code_counter (id, last_seq)
  VALUES (1, 0)
  ON CONFLICT (id) DO NOTHING;

  -- The counter row serializes concurrent stock entries.
  SELECT last_seq INTO v_counter_last
  FROM public.code_counter
  WHERE id = 1
  FOR UPDATE;

  SELECT COALESCE(MAX(seq), 0) INTO v_max_seq
  FROM public.plates;

  v_first_seq := GREATEST(COALESCE(v_counter_last, 0), COALESCE(v_max_seq, 0)) + 1;
  v_last_seq := v_first_seq + _quantity - 1;

  UPDATE public.code_counter
  SET last_seq = v_last_seq
  WHERE id = 1;

  SELECT COUNT(*)::integer INTO v_stock_before FROM public.plates;

  INSERT INTO public.stock_entries (
    model_id, quantity, first_seq, last_seq, received_date, supplier,
    unit_cost, total_cost, stock_before, stock_after, notes, created_by
  )
  VALUES (
    _model_id, _quantity, v_first_seq, v_last_seq, _received_date, v_supplier,
    _unit_cost, _unit_cost * _quantity, v_stock_before,
    v_stock_before + _quantity, v_notes, auth.uid()
  )
  RETURNING * INTO v_entry;

  FOR v_seq IN v_first_seq..v_last_seq LOOP
    v_slug := replace(gen_random_uuid()::text, '-', '');

    INSERT INTO public.plates (
      code, seq, slug, model_id, entry_id, status, qr_active, destination_url, created_at
    )
    VALUES (
      public.format_nfc_code(v_seq), v_seq, v_slug, _model_id, v_entry.id,
      'disponivel', true, NULL, now()
    )
    RETURNING id INTO v_plate_id;

    INSERT INTO public.plate_movements (
      plate_id, action, from_status, to_status, actor, reason
    )
    VALUES (
      v_plate_id, 'entrada', NULL, 'disponivel', auth.uid(),
      COALESCE(v_notes, 'Entrada de estoque #' || v_entry.entry_number::text)
    );

    INSERT INTO public.qr_history (plate_id, action, old_url, new_url, actor)
    VALUES (v_plate_id, 'created', NULL, NULL, auth.uid());
  END LOOP;

  RETURN v_entry;
END;
$$;

REVOKE ALL ON FUNCTION public.create_stock_entry(uuid, text, integer, date, text, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_stock_entry(uuid, text, integer, date, text, numeric) TO authenticated;
