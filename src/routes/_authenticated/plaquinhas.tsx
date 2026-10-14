import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ExternalLink, QrCode, Search, Tags } from "lucide-react";
import { PageHeader, Panel, Stat, DataTable, Empty, StatusBadge } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate, STATUS_LABEL } from "@/lib/format";

const inputCls =
  "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20";

export const Route = createFileRoute("/_authenticated/plaquinhas")({
  head: () => ({
    meta: [
      { title: "Plaquinhas — NFC Control" },
      { name: "description", content: "Gerencie cada plaquinha NFC individualmente." },
    ],
  }),
  component: PlatesPage,
});

function PlatesPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("todos");
  const platesQuery = useQuery({
    queryKey: ["plates-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plates")
        .select(
          "id,code,seq,status,created_at,slug,destination_url,qr_active,qr_updated_at,plate_models(name),customers(name),stock_entries(received_date)",
        )
        .order("seq", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 15_000,
  });
  const plates = useMemo(() => platesQuery.data ?? [], [platesQuery.data]);
  const filtered = useMemo(
    () =>
      plates.filter((plate) => {
        const model = plate.plate_models as unknown as { name?: string } | null;
        const customer = plate.customers as unknown as { name?: string } | null;
        const q = search.trim().toLocaleLowerCase("pt-BR");
        const matches =
          !q ||
          plate.code.toLocaleLowerCase("pt-BR").includes(q) ||
          (model?.name ?? "").toLocaleLowerCase("pt-BR").includes(q) ||
          (customer?.name ?? "").toLocaleLowerCase("pt-BR").includes(q);
        return matches && (status === "todos" || plate.status === status);
      }),
    [plates, search, status],
  );
  const count = (s: string) => plates.filter((p) => p.status === s).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plaquinhas"
        subtitle="Cada unidade tem seu próprio código, histórico e QR Code permanente."
        actions={
          <Link
            to="/qrcodes"
            className="inline-flex h-10 items-center gap-2 rounded-lg border bg-card px-3 text-sm font-medium hover:bg-secondary"
          >
            <QrCode className="size-4" /> Gerenciar QR Codes
          </Link>
        }
      />
      {platesQuery.isError && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm"
        >
          Não foi possível carregar as plaquinhas. Confira o acesso ao Supabase e tente novamente.
        </div>
      )}
      <section className="grid gap-3 grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Cadastradas"
          value={platesQuery.isLoading ? "…" : plates.length}
          hint="Unidades individuais"
        />
        <Stat
          label="Disponíveis"
          value={platesQuery.isLoading ? "…" : count("disponivel")}
          hint="Prontas para venda"
          tone="gold"
        />
        <Stat
          label="Vendidas"
          value={platesQuery.isLoading ? "…" : count("vendida")}
          hint="Comercializadas"
        />
        <Stat
          label="QR ativo"
          value={platesQuery.isLoading ? "…" : plates.filter((p) => p.qr_active).length}
          hint="Redirecionamento habilitado"
        />
      </section>
      <Panel title="Pesquisar e filtrar">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className={inputCls + " pl-9"}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Código NFC, modelo ou cliente..."
            />
          </div>
          <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="todos">Todos os status</option>
            {Object.entries(STATUS_LABEL).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </Panel>
      <Panel
        title="Unidades cadastradas"
        action={
          <span className="text-xs text-muted-foreground">{filtered.length} resultado(s)</span>
        }
      >
        {platesQuery.isLoading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Carregando plaquinhas…</p>
        ) : filtered.length === 0 ? (
          <Empty>
            <Tags className="mx-auto mb-2 size-6" />
            {plates.length === 0
              ? "Nenhuma plaquinha individual foi encontrada no banco. Confira se a entrada de estoque gerou as unidades."
              : "Nenhuma plaquinha corresponde aos filtros."}
          </Empty>
        ) : (
          <DataTable head={["Código", "Modelo", "Status", "Entrada", "QR Code", ""]}>
            {filtered.map((plate) => {
              const model = plate.plate_models as unknown as { name?: string } | null;
              const entry = plate.stock_entries as unknown as { received_date?: string } | null;
              return (
                <tr key={plate.id}>
                  <td className="whitespace-nowrap font-semibold">{plate.code}</td>
                  <td>{model?.name ?? "—"}</td>
                  <td>
                    <StatusBadge value={plate.status} />
                  </td>
                  <td className="whitespace-nowrap">
                    {fmtDate(entry?.received_date ?? plate.created_at)}
                  </td>
                  <td>
                    <StatusBadge
                      value={
                        plate.qr_active
                          ? plate.destination_url
                            ? "ativo"
                            : "pendente"
                          : "bloqueado"
                      }
                      label={
                        !plate.qr_active
                          ? "Desativado"
                          : plate.destination_url
                            ? "Configurado"
                            : "Sem destino"
                      }
                    />
                  </td>
                  <td>
                    <a
                      href={"/plaquinhas/" + plate.id}
                      className="inline-flex items-center gap-1 whitespace-nowrap text-sm font-semibold underline-offset-4 hover:underline"
                    >
                      Abrir <ExternalLink className="size-3.5" />
                    </a>
                  </td>
                </tr>
              );
            })}
          </DataTable>
        )}
        {plates.length >= 2000 && (
          <p className="mt-3 text-xs text-muted-foreground">
            Exibindo as 2.000 unidades mais recentes. Use os filtros para localizar uma unidade.
          </p>
        )}
      </Panel>
    </div>
  );
}
