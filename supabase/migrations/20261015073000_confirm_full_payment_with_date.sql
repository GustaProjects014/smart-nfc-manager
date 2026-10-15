-- Confirma o saldo pendente integral usando a data escolhida na tela.
create or replace function public.confirm_full_payment(_sale_id uuid, _paid_at date)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.sales%rowtype;
  v_balance numeric(14,2);
begin
  select * into s
  from public.sales
  where id = _sale_id
  for update;

  if not found then
    raise exception 'Venda não encontrada';
  end if;

  if not (public.is_admin() or s.reseller_id = auth.uid()) then
    raise exception 'Sem permissão';
  end if;

  if s.cancelled then
    raise exception 'Venda cancelada';
  end if;

  v_balance := round(s.total - s.amount_paid, 2);

  if v_balance <= 0 then
    raise exception 'Esta venda já está totalmente paga';
  end if;

  insert into public.payments (sale_id, amount, method, paid_at, created_by)
  values (s.id, v_balance, 'outro', coalesce(_paid_at, current_date), auth.uid());

  update public.sales
  set amount_paid = s.total,
      payment_status = 'pago'::public.payment_status
  where id = s.id;
end;
$$;

grant execute on function public.confirm_full_payment(uuid, date) to authenticated;
