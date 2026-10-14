import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Download, Receipt, Wallet } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel, DataTable, Empty, Stat } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { brl, downloadCsv, fmtDate, fmtDateTime } from "@/lib/format";

const fieldCls =
  "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20";

export const Route = createFileRoute("/_authenticated/financeiro")({
  head: () => ({
    meta: [
      { title: "Financeiro — NFC Control" },
      { name: "description", content: "Acompanhe recebimentos, pendências e despesas." },
    ],
  }),
  component: FinancePage,
});

function FinancePage() {
  const qc = useQueryClient();
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("operacional");
  const [expenseDate, setExpenseDate] = useState(today());
  const [filter, setFilter] = useState("todos");
  const query = useQuery({
    queryKey: ["finance-page"],
    queryFn: async () => {
      const [salesRes, paymentsRes, expensesRes] = await Promise.all([
        supabase
          .from("sales")
          .select(
            "id,sale_number,sale_date,total,amount_paid,payment_status,cancelled,customers(name)",
          )
          .order("sale_date", { ascending: false })
          .limit(1000),
        supabase
          .from("payments")
          .select("id,sale_id,amount,method,paid_at,created_at,is_reversal")
          .order("paid_at", { ascending: false })
          .limit(2000),
        supabase
          .from("expenses")
          .select("id,description,category,amount,expense_date,created_at")
          .order("expense_date", { ascending: false })
          .limit(2000),
      ]);
      const error = salesRes.error || paymentsRes.error || expensesRes.error;
      if (error) throw error;
      return {
        sales: salesRes.data ?? [],
        payments: paymentsRes.data ?? [],
        expenses: expensesRes.data ?? [],
      };
    },
  });
  const data = query.data;
  const activeSales = (data?.sales ?? []).filter((s) => !s.cancelled);
  const received = activeSales.reduce((sum, s) => sum + Number(s.amount_paid || 0), 0);
  const revenue = activeSales.reduce((sum, s) => sum + Number(s.total || 0), 0);
  const pending = Math.max(0, revenue - received);
  const expensesTotal = (data?.expenses ?? []).reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const monthlySales = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      const key = date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0");
      const label = date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
      const monthSales = activeSales.filter((sale) => String(sale.sale_date).slice(0, 7) === key);
      return {
        key,
        label: label.charAt(0).toUpperCase() + label.slice(1),
        sales: monthSales.reduce((sum, sale) => sum + Number(sale.total || 0), 0),
        received: monthSales.reduce((sum, sale) => sum + Number(sale.amount_paid || 0), 0),
        count: monthSales.length,
      };
    });
  }, [data]);
  const chartMax = Math.max(
    1,
    ...monthlySales.map((month) => Math.max(month.sales, month.received)),
  );
  const entries = useMemo(
    () =>
      [
        ...(data?.payments ?? [])
          .filter((p) => !p.is_reversal)
          .map((p) => ({
            id: "p-" + p.id,
            date: p.paid_at,
            description: "Recebimento de venda",
            category: p.method || "Pagamento",
            amount: Number(p.amount),
            type: "Receita",
          })),
        ...(data?.expenses ?? []).map((e) => ({
          id: "e-" + e.id,
          date: e.expense_date,
          description: e.description,
          category: e.category || "Despesa",
          amount: -Number(e.amount),
          type: "Despesa",
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [data],
  );
  const filtered = entries.filter((e) => filter === "todos" || e.type === filter);

  const addExpense = useMutation({
    mutationFn: async () => {
      const n = Number(amount.replace(",", "."));
      if (!description.trim()) throw new Error("Informe a descrição da despesa.");
      if (!Number.isFinite(n) || n <= 0) throw new Error("Informe um valor maior que zero.");
      const { error } = await supabase.from("expenses").insert({
        description: description.trim(),
        amount: n,
        category,
        expense_date: expenseDate,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Despesa registrada.");
      setDescription("");
      setAmount("");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["finance-page"] }),
        qc.invalidateQueries({ queryKey: ["dashboard-summary"] }),
      ]);
    },
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : "Não foi possível registrar a despesa."),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financeiro"
        subtitle="Visão consolidada de vendas, recebimentos, pendências e despesas."
        actions={
          <button
            onClick={() =>
              downloadCsv(
                "nfc-control-financeiro.csv",
                filtered.map((e) => ({
                  Data: fmtDate(e.date),
                  Tipo: e.type,
                  Descrição: e.description,
                  Categoria: e.category,
                  Valor: e.amount,
                })),
              )
            }
            className="inline-flex h-10 items-center gap-2 rounded-lg border bg-card px-3 text-sm font-medium hover:bg-secondary"
          >
            <Download className="size-4" /> Exportar CSV
          </button>
        }
      />
      {query.isError && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm"
        >
          Não foi possível carregar os dados financeiros:{" "}
          {query.error instanceof Error
            ? query.error.message
            : "verifique as permissões e a conexão com o banco de dados."}
        </div>
      )}
      {query.isLoading && (
        <Panel title="Carregando financeiro">
          <p className="text-sm text-muted-foreground">Buscando vendas, recebimentos e despesas…</p>
        </Panel>
      )}
      <Panel title="Vendas e recebimentos por mês">
        <div className="mb-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <span className="size-2.5 rounded-sm bg-primary" /> Faturamento
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="size-2.5 rounded-sm bg-amber-500" /> Recebido
          </span>
        </div>
        {monthlySales.every((month) => month.sales === 0 && month.received === 0) ? (
          <Empty>
            {query.isLoading
              ? "Carregando dados para o gráfico…"
              : "Ainda não há vendas nesses seis meses. Assim que registrar vendas, o gráfico será preenchido automaticamente."}
          </Empty>
        ) : (
          <div className="grid grid-cols-6 items-end gap-3 pt-2">
            {monthlySales.map((month) => (
              <div key={month.key} className="min-w-0 text-center">
                <div className="flex h-36 items-end justify-center gap-1 border-b pb-1">
                  <div
                    title={"Faturamento: " + brl(month.sales)}
                    className="w-3/12 min-w-2 rounded-t bg-primary"
                    style={{
                      height: Math.max(month.sales ? 5 : 0, (month.sales / chartMax) * 100) + "%",
                    }}
                  />
                  <div
                    title={"Recebido: " + brl(month.received)}
                    className="w-3/12 min-w-2 rounded-t bg-amber-500"
                    style={{
                      height:
                        Math.max(month.received ? 5 : 0, (month.received / chartMax) * 100) + "%",
                    }}
                  />
                </div>
                <p className="mt-2 truncate text-xs font-medium">{month.label}</p>
                <p className="mt-1 text-[10px] text-muted-foreground">{month.count} venda(s)</p>
              </div>
            ))}
          </div>
        )}
        <p className="mt-4 text-xs text-muted-foreground">
          Valores de vendas não canceladas. O faturamento representa o total vendido; recebido
          representa o valor registrado como pago.
        </p>
      </Panel>
      <section className="grid gap-3 grid-cols-2 xl:grid-cols-4">
        <Stat label="Faturamento ativo" value={brl(revenue)} hint="Vendas não canceladas" />
        <Stat label="Recebido" value={brl(received)} hint="Valores confirmados" tone="gold" />
        <Stat label="A receber" value={brl(pending)} hint="Saldo de vendas em aberto" />
        <Stat label="Despesas" value={brl(expensesTotal)} hint="Despesas registradas" />
      </section>
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.4fr)]">
        <Panel
          title="Registrar despesa"
          action={<Receipt className="size-4 text-muted-foreground" />}
        >
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              addExpense.mutate();
            }}
          >
            <label className="block text-sm font-medium">
              Descrição *
              <input
                className={fieldCls + " mt-1.5"}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={180}
                required
                placeholder="Ex.: compra de materiais"
              />
            </label>
            <label className="block text-sm font-medium">
              Valor (R$) *
              <input
                className={fieldCls + " mt-1.5"}
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </label>
            <label className="block text-sm font-medium">
              Categoria
              <select
                className={fieldCls + " mt-1.5"}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="operacional">Operacional</option>
                <option value="materiais">Materiais / estoque</option>
                <option value="frete">Frete</option>
                <option value="marketing">Marketing</option>
                <option value="taxas">Taxas</option>
                <option value="impostos">Impostos</option>
                <option value="outros">Outros</option>
              </select>
            </label>
            <label className="block text-sm font-medium">
              Data da despesa
              <input
                className={fieldCls + " mt-1.5"}
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                required
              />
            </label>
            <button
              disabled={addExpense.isPending}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              <Wallet className="size-4" />
              {addExpense.isPending ? "Salvando…" : "Registrar despesa"}
            </button>
          </form>
        </Panel>
        <Panel
          title="Movimentações financeiras"
          action={
            <span className="text-xs text-muted-foreground">{filtered.length} registro(s)</span>
          }
        >
          <div className="mb-4 flex flex-wrap gap-2">
            {["todos", "Receita", "Despesa"].map((v) => (
              <button
                key={v}
                onClick={() => setFilter(v)}
                className={
                  "rounded-full border px-3 py-1.5 text-xs font-semibold " +
                  (filter === v
                    ? "border-primary bg-primary text-primary-foreground"
                    : "hover:bg-secondary")
                }
              >
                {v === "todos" ? "Todas" : v + "s"}
              </button>
            ))}
          </div>
          {query.isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Carregando movimentações…
            </p>
          ) : !filtered.length ? (
            <Empty>Nenhuma movimentação financeira encontrada.</Empty>
          ) : (
            <DataTable head={["Data", "Descrição", "Categoria", "Tipo", "Valor"]}>
              {filtered.map((e) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap">{fmtDate(e.date)}</td>
                  <td>
                    <p className="font-medium">{e.description}</p>
                    {e.type === "Receita" && (
                      <p className="text-xs text-muted-foreground">{fmtDateTime(e.date)}</p>
                    )}
                  </td>
                  <td>{e.category}</td>
                  <td>{e.type}</td>
                  <td
                    className={
                      "whitespace-nowrap font-semibold " +
                      (e.amount < 0 ? "text-destructive" : "text-success")
                    }
                  >
                    {brl(e.amount)}
                  </td>
                </tr>
              ))}
            </DataTable>
          )}
        </Panel>
      </div>
      <Panel title="Resultado operacional estimado">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Recebimentos menos despesas</p>
            <p className="mt-1 font-display text-3xl font-semibold">
              {brl(received - expensesTotal)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Não inclui custos de plaquinhas ainda não vendidas nem impostos não lançados.
            </p>
          </div>
          <div className="rounded-xl border p-4 text-right">
            <p className="text-xs text-muted-foreground">Vendas em aberto</p>
            <p className="mt-1 text-xl font-semibold">{brl(pending)}</p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
