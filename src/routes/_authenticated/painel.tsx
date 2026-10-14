import { createFileRoute, Link } from "@tanstack/react-router";
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
  Users,
  Wallet,
} from "lucide-react";
import { PageHeader, Panel, Stat } from "@/components/ui-kit";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [
      { title: "Início — NFC Control" },
      { name: "description", content: "Visão geral da gestão de plaquinhas NFC e QR Codes." },
    ],
  }),
  component: Dashboard,
});

const metrics = [
  { label: "Plaquinhas cadastradas", value: "—", hint: "Total de unidades", icon: Tags },
  { label: "Disponíveis em estoque", value: "—", hint: "Prontas para venda", icon: Boxes },
  { label: "Vendas realizadas", value: "—", hint: "Unidades vendidas", icon: ShoppingBag },
  { label: "Recebimentos", value: "—", hint: "Total confirmado", icon: CircleDollarSign },
];

const shortcuts = [
  { title: "Registrar entrada", description: "Adicionar unidades ao estoque", to: "/estoque", icon: ArrowDownToLine },
  { title: "Gerenciar plaquinhas", description: "Consultar códigos e situações", to: "/plaquinhas", icon: Tags },
  { title: "Configurar QR Codes", description: "Editar destinos e redirecionamentos", to: "/qrcodes", icon: QrCode },
  { title: "Nova venda", description: "Registrar uma venda e pagamento", to: "/vendas", icon: ShoppingBag },
];

function Dashboard() {
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
            <ArrowDownToLine className="size-4" />
            Registrar entrada
          </Link>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="relative overflow-hidden rounded-2xl border bg-card p-5 shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div className="text-sm font-medium text-muted-foreground">{metric.label}</div>
              <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                <metric.icon className="size-4" strokeWidth={1.8} />
              </div>
            </div>
            <div className="mt-4 font-display text-3xl font-semibold tracking-tight">{metric.value}</div>
            <p className="mt-1 text-xs text-muted-foreground">{metric.hint}</p>
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

        <Panel title="Resumo financeiro" action={<Wallet className="size-4 text-muted-foreground" />}>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-xl bg-secondary/60 p-4">
              <div>
                <p className="text-sm text-muted-foreground">Total recebido</p>
                <p className="mt-1 font-display text-2xl font-semibold">—</p>
              </div>
              <ArrowUpRight className="size-5 text-muted-foreground" />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border p-4">
              <div>
                <p className="text-sm text-muted-foreground">Pagamentos pendentes</p>
                <p className="mt-1 font-display text-2xl font-semibold">—</p>
              </div>
              <Clock3 className="size-5 text-muted-foreground" />
            </div>
            <Link to="/financeiro" className="inline-flex items-center gap-2 text-sm font-semibold underline-offset-4 hover:underline">
              Abrir financeiro <ArrowRight className="size-4" />
            </Link>
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Movimentações recentes">
          <div className="flex min-h-36 flex-col items-center justify-center rounded-xl border border-dashed px-6 py-8 text-center">
            <Clock3 className="mb-3 size-6 text-muted-foreground" strokeWidth={1.5} />
            <p className="text-sm font-medium">Nenhuma movimentação exibida</p>
            <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
              O histórico aparecerá aqui quando as entradas, vendas e alterações estiverem conectadas ao banco de dados.
            </p>
          </div>
        </Panel>
        <Panel title="Atenção ao estoque">
          <div className="flex min-h-36 flex-col items-center justify-center rounded-xl border border-dashed px-6 py-8 text-center">
            <Boxes className="mb-3 size-6 text-muted-foreground" strokeWidth={1.5} />
            <p className="text-sm font-medium">Indicadores aguardando dados reais</p>
            <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
              O alerta de estoque baixo será calculado com base nas unidades disponíveis, sem usar números de demonstração.
            </p>
          </div>
        </Panel>
      </div>

      <div className="rounded-xl border border-gold/30 bg-card px-4 py-3 text-xs leading-5 text-muted-foreground">
        <span className="font-semibold text-foreground">Próxima etapa técnica:</span> conectar os indicadores às tabelas reais do Supabase e implementar o registro seguro de entradas, sem inventar saldos ou movimentações.
      </div>
    </div>
  );
}
