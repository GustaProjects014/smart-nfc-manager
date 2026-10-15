import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CircleDollarSign, CreditCard, Plus, Search, ShoppingBag, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel, DataTable, Empty, StatusBadge, Stat } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { brl, fmtDate } from "@/lib/format";

const fieldCls =
  "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20";
const today = () => new Date().toISOString().slice(0, 10);

export const Route = createFileRoute("/_authenticated/vendas")({
  head: () => ({
    meta: [
      { title: "Vendas — NFC Control" },
      { name: "description", content: "Registre vendas e pagamentos de plaquinhas NFC." },
    ],
  }),
  component: SalesPage,
});

function SalesPage() {
  const qc = useQueryClient();
  const [customerName, setCustomerName] = useState("");
  const [plateIds, setPlateIds] = useState<string[]>([]);
  const [unitPrice, setUnitPrice] = useState("");
  const [discount, setDiscount] = useState("0");
  const [amountPaid, setAmountPaid] = useState("0");
  const [method, setMethod] = useState("pix");
  const [saleDate, setSaleDate] = useState(today());
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [paymentSaleId, setPaymentSaleId] = useState("");
  const [cancelId, setCancelId] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  const dataQuery = useQuery({
    queryKey: ["sales-page-data"],
    queryFn: async () => {
      const [platesRes, salesRes] = await Promise.all([
        supabase
          .from("plates")
          .select("id,code,status,model_id,plate_models(name,default_price)")
          .eq("status", "disponivel")
          .order("seq")
          .limit(2000),
        supabase
          .from("sales")
          .select(
            "id,sale_number,sale_date,total,amount_paid,payment_status,cancelled,created_at,customers(name),notes",
          )
          .order("sale_number", { ascending: false })
          .limit(500),
      ]);
      const error = platesRes.error || salesRes.error;
      if (error) throw error;
      return {
        plates: platesRes.data ?? [],
        sales: salesRes.data ?? [],
      };
    },
    staleTime: 10_000,
  });
  const data = dataQuery.data;
  const available = data?.plates ?? [];
  const sales = useMemo(() => data?.sales ?? [], [data?.sales]);
  const selectedPlates = available.filter((p) => plateIds.includes(p.id));
  const subtotal = selectedPlates.length * Math.max(0, Number(unitPrice) || 0);
  const total = Math.max(0, subtotal - Math.max(0, Number(discount) || 0));
  const filteredSales = useMemo(
    () =>
      sales.filter((s) => {
        const customer = s.customers as unknown as { name?: string } | null;
        const q = search.trim().toLocaleLowerCase("pt-BR");
        return (
          !q ||
          String(s.sale_number).includes(q) ||
          (customer?.name ?? "").toLocaleLowerCase("pt-BR").includes(q)
        );
      }),
    [sales, search],
  );

  const createSale = useMutation({
    mutationFn: async () => {
      const name = customerName.trim();
      if (!name) throw new Error("Informe o nome do cliente.");
      if (!plateIds.length) throw new Error("Selecione ao menos uma plaquinha disponível.");
      const price = Number(unitPrice.replace(",", "."));
      const disc = Number(discount.replace(",", "."));
      const paid = Number(amountPaid.replace(",", "."));
      if (!Number.isFinite(price) || price <= 0)
        throw new Error("Informe um preço unitário maior que zero.");
      if (!Number.isFinite(disc) || disc < 0 || disc > plateIds.length * price)
        throw new Error("O desconto informado é inválido.");
      if (!Number.isFinite(paid) || paid < 0 || paid > plateIds.length * price - disc)
        throw new Error("O valor recebido não pode ser negativo nem maior que o total.");
      const { data: customer, error: customerError } = await supabase
        .from("customers")
        .insert({ name })
        .select("id")
        .single();
      if (customerError) throw customerError;
      const { error } = await supabase.rpc("create_sale", {
        _amount_paid: paid,
        _customer_id: customer.id,
        _discount: disc,
        _notes: notes.trim(),
        _payment_method: method,
        _plate_ids: plateIds,
        _reseller_id: null as unknown as string,
        _sale_date: saleDate,
        _unit_price: price,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Venda registrada e plaquinhas atualizadas.");
      setPlateIds([]);
      setCustomerName("");
      setNotes("");
      setDiscount("0");
      setAmountPaid("0");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["sales-page-data"] }),
        qc.invalidateQueries({ queryKey: ["plates-list"] }),
        qc.invalidateQueries({ queryKey: ["qr-list"] }),
        qc.invalidateQueries({ queryKey: ["dashboard-summary"] }),
        qc.invalidateQueries({ queryKey: ["stock-page"] }),
      ]);
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Não foi possível registrar a venda."),
  });
  const addPayment = useMutation({
    mutationFn: async () => {
      if (!paymentSaleId) throw new Error("Selecione uma venda em aberto.");
      const { error } = await supabase.rpc("confirm_full_payment", {
        _sale_id: paymentSaleId,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Pagamento total confirmado e registrado.");
      setPaymentSaleId("");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["sales-page-data"] }),
        qc.invalidateQueries({ queryKey: ["dashboard-summary"] }),
        qc.invalidateQueries({ queryKey: ["finance-page"] }),
      ]);
    },
    onError: (e: unknown) => {
      const message =
        e instanceof Error
          ? e.message
          : typeof e === "object" && e !== null && "message" in e && typeof e.message === "string"
            ? e.message
            : "Não foi possível confirmar o pagamento total.";
      toast.error(message);
    },
  });
  const cancelSale = useMutation({
    mutationFn: async () => {
      if (!cancelId) throw new Error("Selecione a venda que deseja cancelar.");
      if (!cancelReason.trim()) throw new Error("Informe o motivo do cancelamento.");
      const { error } = await supabase.rpc("cancel_sale", {
        _reason: cancelReason.trim(),
        _sale_id: cancelId,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Venda cancelada e movimentações atualizadas.");
      setCancelId("");
      setCancelReason("");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["sales-page-data"] }),
        qc.invalidateQueries({ queryKey: ["plates-list"] }),
        qc.invalidateQueries({ queryKey: ["dashboard-summary"] }),
      ]);
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Não foi possível cancelar a venda."),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendas"
        subtitle="Registre a venda de plaquinhas disponíveis e acompanhe recebimentos."
      />
      {dataQuery.isError && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm"
        >
          Não foi possível carregar estoque e vendas:{" "}
          {dataQuery.error instanceof Error
            ? dataQuery.error.message
            : "verifique a conexão com o banco."}
        </div>
      )}
      <section className="grid gap-3 grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Vendas ativas"
          value={sales.filter((s) => !s.cancelled).length}
          hint="Registros não cancelados"
        />
        <Stat
          label="Faturamento"
          value={brl(
            sales.filter((s) => !s.cancelled).reduce((sum, s) => sum + Number(s.total), 0),
          )}
          hint="Total das vendas ativas"
          tone="gold"
        />
        <Stat
          label="Recebido"
          value={brl(
            sales.filter((s) => !s.cancelled).reduce((sum, s) => sum + Number(s.amount_paid), 0),
          )}
          hint="Pagamentos contabilizados"
        />
        <Stat
          label="Em aberto"
          value={brl(
            sales
              .filter((s) => !s.cancelled)
              .reduce((sum, s) => sum + Math.max(0, Number(s.total) - Number(s.amount_paid)), 0),
          )}
          hint="Saldo a receber"
        />
      </section>
      <div className="grid items-start gap-5 xl:grid-cols-2">
        <Panel
          title="Registrar nova venda"
          action={<ShoppingBag className="size-4 text-muted-foreground" />}
        >
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              createSale.mutate();
            }}
          >
            <label className="block text-sm font-medium">
              Cliente *
              <input
                className={fieldCls + " mt-1.5"}
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                maxLength={180}
                placeholder="Digite o nome do cliente"
                autoComplete="name"
                required
              />
            </label>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm font-medium">Plaquinhas disponíveis *</label>
                <span className="text-xs text-muted-foreground">
                  {plateIds.length} selecionada(s)
                </span>
              </div>
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border p-2">
                {dataQuery.isLoading ? (
                  <p className="p-3 text-sm text-muted-foreground">Carregando estoque…</p>
                ) : available.length ? (
                  available.map((p) => (
                    <label
                      key={p.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-secondary"
                    >
                      <input
                        type="checkbox"
                        checked={plateIds.includes(p.id)}
                        onChange={(e) =>
                          setPlateIds((old) =>
                            e.target.checked ? [...old, p.id] : old.filter((id) => id !== p.id),
                          )
                        }
                      />
                      <span className="font-medium">{p.code}</span>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {(p.plate_models as unknown as { name?: string } | null)?.name ?? "Modelo"}
                      </span>
                    </label>
                  ))
                ) : (
                  <p className="p-3 text-sm text-muted-foreground">
                    Nenhuma plaquinha disponível. Registre uma entrada no estoque primeiro.
                  </p>
                )}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Preço unitário (R$) *
                <input
                  className={fieldCls + " mt-1.5"}
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  required
                />
              </label>
              <label className="block text-sm font-medium">
                Desconto total (R$)
                <input
                  className={fieldCls + " mt-1.5"}
                  type="number"
                  min="0"
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Valor recebido agora (R$)
                <input
                  className={fieldCls + " mt-1.5"}
                  type="number"
                  min="0"
                  step="0.01"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                />
              </label>
              <label className="block text-sm font-medium">
                Data da venda
                <input
                  className={fieldCls + " mt-1.5"}
                  type="date"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  required
                />
              </label>
            </div>
            <label className="block text-sm font-medium">
              Forma de pagamento inicial
              <select
                className={fieldCls + " mt-1.5"}
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                <option value="pix">Pix</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="cartao">Cartão</option>
                <option value="transferencia">Transferência</option>
                <option value="outro">Outro</option>
              </select>
            </label>
            <label className="block text-sm font-medium">
              Observações
              <textarea
                className={fieldCls + " mt-1.5 min-h-16 py-2"}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={1000}
              />
            </label>
            <div className="rounded-xl border bg-secondary/40 p-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{brl(subtotal)}</span>
              </div>
              <div className="mt-2 flex justify-between text-sm">
                <span className="text-muted-foreground">Desconto</span>
                <span>{brl(Number(discount) || 0)}</span>
              </div>
              <div className="mt-3 flex justify-between border-t pt-3 text-base font-semibold">
                <span>Total estimado</span>
                <span>{brl(total)}</span>
              </div>
            </div>
            <button
              disabled={createSale.isPending || !plateIds.length || !customerName.trim()}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              <Plus className="size-4" />
              {createSale.isPending ? "Registrando venda…" : "Confirmar venda"}
            </button>
          </form>
        </Panel>
        <div className="space-y-5">
          <Panel
            title="Confirmar pagamento total"
            action={<CreditCard className="size-4 text-muted-foreground" />}
          >
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                addPayment.mutate();
              }}
            >
              <label className="block text-sm font-medium">
                Venda em aberto
                <select
                  className={fieldCls + " mt-1.5"}
                  value={paymentSaleId}
                  onChange={(e) => setPaymentSaleId(e.target.value)}
                  required
                >
                  <option value="">Selecione uma venda</option>
                  {sales
                    .filter((s) => !s.cancelled && Number(s.total) > Number(s.amount_paid))
                    .map((s) => {
                      const c = s.customers as unknown as { name?: string } | null;
                      return (
                        <option key={s.id} value={s.id}>
                          #{s.sale_number} · {c?.name ?? "Cliente"} ·{" "}
                          {brl(Number(s.total) - Number(s.amount_paid))} pendente
                        </option>
                      );
                    })}
                </select>
              </label>
              {paymentSaleId && (
                <p className="rounded-lg border bg-secondary/40 p-3 text-sm">
                  Será registrado o pagamento do saldo restante da venda selecionada. O valor será
                  calculado automaticamente pelo sistema.
                </p>
              )}
              <button
                disabled={addPayment.isPending || !paymentSaleId}
                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border px-4 text-sm font-semibold hover:bg-secondary disabled:opacity-50"
              >
                <CircleDollarSign className="size-4" />
                {addPayment.isPending ? "Confirmando pagamento…" : "Confirmar pagamento total"}
              </button>
            </form>
          </Panel>
          <Panel title="Cancelar venda" action={<X className="size-4 text-muted-foreground" />}>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                cancelSale.mutate();
              }}
            >
              <label className="block text-sm font-medium">
                Venda ativa
                <select
                  className={fieldCls + " mt-1.5"}
                  value={cancelId}
                  onChange={(e) => setCancelId(e.target.value)}
                  required
                >
                  <option value="">Selecione uma venda</option>
                  {sales
                    .filter((s) => !s.cancelled)
                    .map((s) => {
                      const c = s.customers as unknown as { name?: string } | null;
                      return (
                        <option key={s.id} value={s.id}>
                          #{s.sale_number} · {c?.name ?? "Cliente"} · {brl(s.total)}
                        </option>
                      );
                    })}
                </select>
              </label>
              <label className="block text-sm font-medium">
                Motivo do cancelamento
                <input
                  className={fieldCls + " mt-1.5"}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  maxLength={500}
                  required
                />
              </label>
              <button
                disabled={cancelSale.isPending || !cancelId}
                className="inline-flex h-10 w-full items-center justify-center rounded-lg border border-destructive/30 px-4 text-sm font-semibold text-destructive hover:bg-destructive/5 disabled:opacity-50"
              >
                {cancelSale.isPending ? "Cancelando…" : "Cancelar venda selecionada"}
              </button>
            </form>
          </Panel>
        </div>
      </div>
      <Panel
        title="Histórico de vendas"
        action={
          <span className="text-xs text-muted-foreground">{filteredSales.length} registro(s)</span>
        }
      >
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className={fieldCls + " pl-9"}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar número da venda ou cliente…"
          />
        </div>
        {!filteredSales.length ? (
          <Empty>Nenhuma venda registrada.</Empty>
        ) : (
          <DataTable
            head={["Venda", "Cliente", "Data", "Total", "Recebido", "Pagamento", "Status"]}
          >
            {filteredSales.map((s) => {
              const c = s.customers as unknown as { name?: string } | null;
              return (
                <tr key={s.id}>
                  <td className="font-semibold">#{s.sale_number}</td>
                  <td>{c?.name ?? "—"}</td>
                  <td className="whitespace-nowrap">{fmtDate(s.sale_date)}</td>
                  <td>{brl(s.total)}</td>
                  <td>{brl(s.amount_paid)}</td>
                  <td>
                    <StatusBadge value={s.payment_status} />
                  </td>
                  <td>
                    {s.cancelled ? (
                      <StatusBadge value="cancelada" label="Cancelada" />
                    ) : (
                      <StatusBadge value="ativo" label="Ativa" />
                    )}
                  </td>
                </tr>
              );
            })}
          </DataTable>
        )}
      </Panel>
    </div>
  );
}
