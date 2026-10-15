-- Fix enum assignment when recording an additional payment.
create or replace function public.add_payment(_sale_id uuid, _amount numeric, _method text, _paid_at date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.sales;
  v_paid numeric;
  v_status public.payment_status;
begin
  select * into s
  from public.sales
  where id = _sale_id
  for update;

  if not found then raise exception 'Venda não encontrada'; end if;
  if not (public.is_admin() or s.reseller_id = auth.uid()) then raise exception 'Sem permissão'; end if;
  if s.cancelled then raise exception 'Venda cancelada'; end if;
  if _amount is null or _amount <= 0 then raise exception 'Valor inválido'; end if;

  v_paid := s.amount_paid + _amount;
  if v_paid > s.total then raise exception 'Valor excede o saldo pendente'; end if;

  v_status := case
    when v_paid >= s.total then 'pago'::public.payment_status
    else 'parcial'::public.payment_status
  end;

  insert into public.payments(sale_id, amount, method, paid_at, created_by)
  values (s.id, _amount, _method, coalesce(_paid_at, current_date), auth.uid());

  update public.sales
  set amount_paid = v_paid,
      payment_status = v_status
  where id = s.id;
end;
$$;
