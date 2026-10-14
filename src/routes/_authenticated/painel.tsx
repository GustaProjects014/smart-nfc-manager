import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Boxes,
  CircleDollarSign,
  Clock3,
  QrCode,
  ShoppingBag,
  Tags,
  Wallet,
} from "lucide-react";
import { PageHeader, Panel, StatusBadge } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { ACTION_LABEL, brl, fmtDateTime } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [
      { title: "Início — NFC Control" },
      { name: "description", content: "Visão geral da gestão de plaquinhas NFC e QR Codes." },
    ],
  }),
  component: Dashboard,
});

const shortcuts = [
  {
    title: "Registrar entrada",
    description: "Adicionar unidades ao estoque",
    to: "/estoque",
    icon: ArrowDownToLine,
  },
  {
    title: "Gerenciar plaquinhas",
    description: "Consultar códigos e situações",
    to: "/plaquinhas",
    icon: Tags,
  },
  {
    title: "Configurar QR Codes",
    description: "Editar destinos e redirecionamentos",
    to: "/qrcodes",
    icon: QrCode,
  },
  {
    title: "Nova venda",
    description: "Registrar uma venda e pagamento",
    to: "/vendas",
    icon: ShoppingBag,
  },
];

function Dashboard() {
  const dashboard = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: async () => {
      const [platesRes, salesRes, expensesRes, movementsRes, settingsRes] = await Promise.all([
        supabase.from("plates").select("id,status"),
        supabase.from("sales").select("id,total,amount_paid,cancelled").eq("cancelled", false),
        supabase.from("expenses").select("amount"),
        supabase
          .from("plate_movements")
          .select("id,action,to_status,created_at,reason,plates(code)")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase.from("settings").select("low_stock_threshold").eq("id", 1).maybeSingle(),
      ]);
      const error =
        platesRes.error ||
        salesRes.error ||
        expensesRes.error ||
        movementsRes.error ||
        settingsRes.error;
      if (error) throw error;
      const plates = platesRes.data ?? [];
      const sales = salesRes.data ?? [];
      const expenses = (expensesRes.data ?? []).reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0,
      );
      const totalSold = sales.reduce((sum, item) => sum + Number(item.total || 0), 0);
      const received = sales.reduce((sum, item) => sum + Number(item.amount_paid || 0), 0);
      const pending = sales.reduce(
        (sum, item) => sum + Math.max(0, Number(item.total || 0) - Number(item.amount_paid || 0)),
        0,
      );
      const count = (status: string) => plates.filter((plate) => plate.status === status).length;
      return {
        total: plates.length,
        available: count("disponivel"),
        sold: count("vendida"),
        reserved: count("reservada"),
        assigned: count("atribuida"),
        unavailable: count("defeituosa") + count("perdida"),
        totalSold,
        received,
        pending,
        expenses,
        profit: received - expenses,
        lowStockThreshold: settingsRes.data?.low_stock_threshold ?? 10,
        movements: movementsRes.data ?? [],
      };
    },
    staleTime: 30_000,
  });

  const data = dashboard.data;
  const metrics = [
    {
      label: "Plaquinhas cadastradas",
      value: data ? String(data.total) : "—",
      hint: data ? `${data.sold} vendidas · ${data.reserved} reservadas` : "Total de unidades",
      icon: Tags,
    },
    {
      label: "Disponíveis em estoque",
      value: data ? String(data.available) : "—",
      hint: data
        ? data.available <= data.lowStockThreshold
          ? "Estoque baixo: precisa de atenção"
          : "Prontas para venda"
        : "Prontas para venda",
      icon: Boxes,
    },
    {
      label: "Vendas realizadas",
      value: data ? String(data.sold) : "—",
      hint: data ? `${data.assigned} atribuídas a revendedores` : "Unidades vendidas",
      icon: ShoppingBag,
    },
    {
      label: "Total recebido",
      value: data ? brl(data.received) : "—",
      hint: data ? `Vendido: ${brl(data.totalSold)}` : "Valores confirmados",
      icon: CircleDollarSign,
    },
  ];

  return (
    <div className="space-y-7">
      <PageHeader
        title="Visão geral"
        subtitle="Acompanhe sua operação de plaquinhas NFC em um só lugar."
        actions={
          <Link
            to="/estoque"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <ArrowDownToLine className="size-4" /> Registrar entrada
          </Link>
        }
      />

      {dashboard.isError && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm"
        >
          Não foi possível carregar os indicadores do banco de dados. Verifique a conexão com o
          Supabase e as permissões da sua conta.
          <button
            className="ml-2 font-semibold underline underline-offset-4"
            onClick={() => dashboard.refetch()}
          >
            Tentar novamente
          </button>
        </div>
      )}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="relative overflow-hidden rounded-2xl border bg-card p-5 shadow-soft"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="text-sm font-medium text-muted-foreground">{metric.label}</div>
              <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                <metric.icon className="size-4" strokeWidth={1.8} />
              </div>
            </div>
            <div className="mt-4 font-display text-3xl font-semibold tracking-tight">
              {dashboard.isLoading ? "…" : metric.value}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {dashboard.isLoading ? "Consultando banco de dados" : metric.hint}
            </p>
          </div>
        ))}
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Panel title="Atalhos da operação">
          <div className="grid gap-3 sm:grid-cols-2">
            {shortcuts.map((item) => (
              <Link
                key={item.title}
                to={item.to}
                className="group flex items-center gap-3 rounded-xl border p-4 transition-colors hover:border-gold/60 hover:bg-secondary/50"
              >
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                  <item.icon className="size-5" strokeWidth={1.7} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{item.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{item.description}</div>
                </div>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        </Panel>

        <Panel
          title="Resumo financeiro"
          action={<Wallet className="size-4 text-muted-foreground" />}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-xl bg-secondary/60 p-4">
              <div>
                <p className="text-sm text-muted-foreground">Total recebido</p>
                <p className="mt-1 font-display text-2xl font-semibold">
                  {data ? brl(data.received) : "—"}
                </p>
              </div>
              <ArrowUpRight className="size-5 text-muted-foreground" />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border p-4">
              <div>
                <p className="text-sm text-muted-foreground">Pagamentos pendentes</p>
                <p className="mt-1 font-display text-2xl font-semibold">
                  {data ? brl(data.pending) : "—"}
                </p>
              </div>
              <Clock3 className="size-5 text-muted-foreground" />
            </div>
            <div className="flex items-center justify-between gap-3 px-1 text-sm">
              <span className="text-muted-foreground">Despesas registradas</span>
              <span className="font-semibold">{data ? brl(data.expenses) : "—"}</span>
            </div>
            <div className="flex items-center justify-between gap-3 px-1 text-sm">
              <span className="text-muted-foreground">Saldo recebido − despesas</span>
              <span className="font-semibold">{data ? brl(data.profit) : "—"}</span>
            </div>
            <Link
              to="/financeiro"
              className="inline-flex items-center gap-2 pt-1 text-sm font-semibold underline-offset-4 hover:underline"
            >
              Abrir financeiro <ArrowRight className="size-4" />
            </Link>
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Movimentações recentes">
          {dashboard.isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Carregando movimentações…
            </p>
          ) : !data?.movements.length ? (
            <div className="flex min-h-36 flex-col items-center justify-center rounded-xl border border-dashed px-6 py-8 text-center">
              <Clock3 className="mb-3 size-6 text-muted-foreground" strokeWidth={1.5} />
              <p className="text-sm font-medium">Nenhuma movimentação registrada</p>
              <p className="mt-1 text-xs text-muted-foreground">
                As entradas e alterações de status aparecerão aqui.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {data.movements.map((movement) => {
                const plate = movement.plates as unknown as { code?: string } | null;
                return (
                  <div
                    key={movement.id}
                    className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">
                        {plate?.code ?? "Plaquinha"} ·{" "}
                        {ACTION_LABEL[movement.action] ?? movement.action}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {fmtDateTime(movement.created_at)}
                        {movement.reason ? ` · ${movement.reason}` : ""}
                      </p>
                    </div>
                    <StatusBadge value={movement.to_status} />
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
        <Panel title="Atenção ao estoque">
          <div
            className={`rounded-xl border p-4 ${data && data.available <= data.lowStockThreshold ? "border-warning/40 bg-warning/5" : "bg-secondary/40"}`}
          >
            <div className="flex items-center gap-3">
              <Boxes className="size-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-semibold">
                  {data
                    ? data.available <= data.lowStockThreshold
                      ? "Estoque baixo"
                      : "Estoque dentro do limite"
                    : "Consultando estoque"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {data
                    ? `${data.available} unidades disponíveis · alerta configurado em ${data.lowStockThreshold}`
                    : "Aguardando resposta do banco de dados"}
                </p>
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{
                  width: data
                    ? `${Math.min(100, (data.available / Math.max(1, data.lowStockThreshold)) * 100)}%`
                    : "0%",
                }}
              />
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl border p-3">
              <p className="text-xs text-muted-foreground">Atribuídas</p>
              <p className="mt-1 text-xl font-semibold">{data ? data.assigned : "—"}</p>
            </div>
            <div className="rounded-xl border p-3">
              <p className="text-xs text-muted-foreground">Defeituosas / perdidas</p>
              <p className="mt-1 text-xl font-semibold">{data ? data.unavailable : "—"}</p>
            </div>
          </div>
        </Panel>
      </div>
      <p className="text-xs text-muted-foreground">
        Os indicadores são consultados no Supabase e refletem os registros disponíveis para sua
        conta.
      </p>
    </div>
  );
}
