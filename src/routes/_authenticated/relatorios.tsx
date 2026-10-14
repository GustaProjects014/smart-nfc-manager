import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, FileSpreadsheet, TrendingUp } from "lucide-react";
import { PageHeader, Panel, DataTable, Empty, Stat } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { brl, downloadCsv, fmtDate, STATUS_LABEL } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios — NFC Control" },
      { name: "description", content: "Indicadores e exportação dos dados do NFC Control." },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const query = useQuery({
    queryKey: ["reports-data"],
    queryFn: async () => {
      const [platesRes, salesRes, expensesRes, entriesRes] = await Promise.all([
        supabase
          .from("plates")
          .select(
            "id,code,seq,status,created_at,destination_url,qr_active,plate_models(name),customers(name),stock_entries(received_date)",
          )
          .order("seq")
          .limit(5000),
        supabase
          .from("sales")
          .select(
            "id,sale_number,sale_date,total,amount_paid,payment_status,cancelled,customers(name)",
          )
          .order("sale_date", { ascending: false })
          .limit(5000),
        supabase
          .from("expenses")
          .select("id,description,category,amount,expense_date")
          .order("expense_date", { ascending: false })
          .limit(5000),
        supabase
          .from("stock_entries")
          .select("id,entry_number,quantity,first_seq,last_seq,received_date,supplier,total_cost")
          .order("entry_number", { ascending: false })
          .limit(5000),
      ]);
      const error = platesRes.error || salesRes.error || expensesRes.error || entriesRes.error;
      if (error) throw error;
      return {
        plates: platesRes.data ?? [],
        sales: salesRes.data ?? [],
        expenses: expensesRes.data ?? [],
        entries: entriesRes.data ?? [],
      };
    },
  });
  const data = query.data;
  const plates = data?.plates ?? [];
  const sales = (data?.sales ?? []).filter((s) => !s.cancelled);
  const expenses = data?.expenses ?? [];
  const entries = data?.entries ?? [];
  const revenue = sales.reduce((sum, s) => sum + Number(s.total), 0);
  const received = sales.reduce((sum, s) => sum + Number(s.amount_paid), 0);
  const expensesTotal = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const byMonth = new Map<string, { sales: number; received: number; count: number }>();
  sales.forEach((sale) => {
    const month = sale.sale_date.slice(0, 7);
    const current = byMonth.get(month) ?? { sales: 0, received: 0, count: 0 };
    current.sales += Number(sale.total);
    current.received += Number(sale.amount_paid);
    current.count += 1;
    byMonth.set(month, current);
  });
  const months = [...byMonth.entries()].sort(([a], [b]) => b.localeCompare(a));

  const exportPlates = () =>
    downloadCsv(
      "nfc-control-plaquinhas.csv",
      plates.map((p) => {
        const model = p.plate_models as unknown as { name?: string } | null;
        const customer = p.customers as unknown as { name?: string } | null;
        const entry = p.stock_entries as unknown as { received_date?: string } | null;
        return {
          Código: p.code,
          Sequência: p.seq,
          Modelo: model?.name ?? "",
          Status: STATUS_LABEL[p.status] ?? p.status,
          Cliente: customer?.name ?? "",
          "Data de entrada": fmtDate(entry?.received_date ?? p.created_at),
          "Destino QR": p.destination_url ?? "",
          "QR ativo": p.qr_active ? "Sim" : "Não",
        };
      }),
    );
  const exportSales = () =>
    downloadCsv(
      "nfc-control-vendas.csv",
      (data?.sales ?? []).map((s) => {
        const customer = s.customers as unknown as { name?: string } | null;
        return {
          Venda: s.sale_number,
          Cliente: customer?.name ?? "",
          Data: fmtDate(s.sale_date),
          Total: s.total,
          Recebido: s.amount_paid,
          Pendente: Math.max(0, Number(s.total) - Number(s.amount_paid)),
          Status: s.cancelled ? "Cancelada" : s.payment_status,
        };
      }),
    );
  const exportExpenses = () =>
    downloadCsv(
      "nfc-control-despesas.csv",
      expenses.map((e) => ({
        Data: fmtDate(e.expense_date),
        Descrição: e.description,
        Categoria: e.category ?? "",
        Valor: e.amount,
      })),
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios"
        subtitle="Consulte indicadores reais e exporte dados para planilhas."
        actions={
          <button
            onClick={exportPlates}
            className="inline-flex h-10 items-center gap-2 rounded-lg border bg-card px-3 text-sm font-medium hover:bg-secondary"
          >
            <Download className="size-4" /> Exportar plaquinhas
          </button>
        }
      />
      {query.isError && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm"
        >
          Não foi possível carregar os dados dos relatórios.
        </div>
      )}
      <section className="grid gap-3 grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Plaquinhas"
          value={query.isLoading ? "…" : plates.length}
          hint="Unidades encontradas"
        />
        <Stat label="Faturamento" value={brl(revenue)} hint="Vendas não canceladas" tone="gold" />
        <Stat label="Recebido" value={brl(received)} hint="Pagamentos contabilizados" />
        <Stat label="Despesas" value={brl(expensesTotal)} hint="Despesas registradas" />
      </section>
      <Panel title="Resumo do estoque">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(STATUS_LABEL).map(([status, label]) => (
            <div
              key={status}
              className="flex items-center justify-between gap-3 rounded-xl border p-3"
            >
              <span className="text-sm text-muted-foreground">{label}</span>
              <span className="text-lg font-semibold">
                {plates.filter((p) => p.status === status).length}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-secondary/50 p-4">
          <div>
            <p className="text-sm font-semibold">Histórico de entradas</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {entries.length} recebimento(s) ·{" "}
              {entries.reduce((sum, e) => sum + Number(e.quantity), 0)} unidade(s) registradas
            </p>
          </div>
          <button
            onClick={() =>
              downloadCsv(
                "nfc-control-entradas.csv",
                entries.map((e) => ({
                  Entrada: e.entry_number,
                  Data: fmtDate(e.received_date),
                  Quantidade: e.quantity,
                  "Primeiro código": e.first_seq,
                  "Último código": e.last_seq,
                  Fornecedor: e.supplier ?? "",
                  "Custo total": e.total_cost ?? "",
                })),
              )
            }
            className="inline-flex h-9 items-center gap-2 rounded-lg border bg-card px-3 text-sm font-semibold hover:bg-secondary"
          >
            <Download className="size-4" /> Exportar entradas
          </button>
        </div>
      </Panel>
      <Panel
        title="Desempenho mensal"
        action={<TrendingUp className="size-4 text-muted-foreground" />}
      >
        {!months.length ? (
          <Empty>Nenhuma venda registrada para montar o relatório mensal.</Empty>
        ) : (
          <DataTable head={["Mês", "Vendas", "Faturamento", "Recebido", "Pendente"]}>
            {months.map(([month, values]) => (
              <tr key={month}>
                <td className="font-semibold">{month.slice(5, 7) + "/" + month.slice(0, 4)}</td>
                <td>{values.count}</td>
                <td>{brl(values.sales)}</td>
                <td>{brl(values.received)}</td>
                <td>{brl(Math.max(0, values.sales - values.received))}</td>
              </tr>
            ))}
          </DataTable>
        )}
      </Panel>
      <Panel
        title="Exportações"
        action={<FileSpreadsheet className="size-4 text-muted-foreground" />}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <button
            onClick={exportPlates}
            className="flex items-center justify-between gap-3 rounded-xl border p-4 text-left hover:bg-secondary/50"
          >
            <div>
              <p className="text-sm font-semibold">Plaquinhas</p>
              <p className="mt-1 text-xs text-muted-foreground">Código, status, cliente e QR</p>
            </div>
            <Download className="size-4" />
          </button>
          <button
            onClick={exportSales}
            className="flex items-center justify-between gap-3 rounded-xl border p-4 text-left hover:bg-secondary/50"
          >
            <div>
              <p className="text-sm font-semibold">Vendas</p>
              <p className="mt-1 text-xs text-muted-foreground">Faturamento e pagamentos</p>
            </div>
            <Download className="size-4" />
          </button>
          <button
            onClick={exportExpenses}
            className="flex items-center justify-between gap-3 rounded-xl border p-4 text-left hover:bg-secondary/50"
          >
            <div>
              <p className="text-sm font-semibold">Despesas</p>
              <p className="mt-1 text-xs text-muted-foreground">Custos e categorias</p>
            </div>
            <Download className="size-4" />
          </button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Os relatórios refletem os registros retornados pelo banco. Para grandes volumes,
          exportações extensas podem precisar de paginação.
        </p>
      </Panel>
    </div>
  );
}
