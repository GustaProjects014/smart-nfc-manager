CREATE OR REPLACE FUNCTION public.confirm_full_payment_with_date(_sale_id uuid, _paid_at date)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
declare s public.sales; v_rest numeric;
begin
  select * into s from public.sales where id = _sale_id for update;
  if not found then raise exception 'Venda não encontrada'; end if;
  if not (public.is_admin() or s.reseller_id = auth.uid()) then raise exception 'Sem permissão'; end if;
  if s.cancelled then raise exception 'Venda cancelada'; end if;
  v_rest := s.total - s.amount_paid;
  if v_rest <= 0 then raise exception 'Esta venda já está totalmente paga'; end if;
  insert into public.payments(sale_id, amount, method, paid_at, created_by)
  values (s.id, v_rest, coalesce(s.payment_method, 'outro'), coalesce(_paid_at, current_date), auth.uid());
  update public.sales set amount_paid = s.total, payment_status = 'pago' where id = s.id;
end $$;
REVOKE ALL ON FUNCTION public.confirm_full_payment_with_date(uuid, date) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.confirm_full_payment_with_date(uuid, date) TO authenticated;
NOTIFY pgrst, 'reload schema';