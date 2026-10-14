import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Copy, ExternalLink, QrCode, Search, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel, DataTable, Empty, StatusBadge, Stat } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { fmtDateTime } from "@/lib/format";

const inputCls = "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20";

export const Route = createFileRoute("/_authenticated/qrcodes")({
  head: () => ({ meta: [{ title: "QR Codes — NFC Control" }, { name: "description", content: "Gerencie QR Codes permanentes e redirecionamentos dinâmicos." }] }),
  component: QrCodesPage,
});

function QrCodesPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("todos");
  const query = useQuery({
    queryKey: ["qr-list"],
    queryFn: async () => {
      const [platesRes, settingsRes] = await Promise.all([
        supabase.from("plates").select("id,code,slug,status,destination_url,qr_active,qr_updated_at,plate_models(name)").order("seq", { ascending: false }).limit(2000),
        supabase.from("settings").select("public_base_url").eq("id", 1).maybeSingle(),
      ]);
      if (platesRes.error) throw platesRes.error;
      if (settingsRes.error) throw settingsRes.error;
      return { plates: platesRes.data ?? [], base: settingsRes.data?.public_base_url ?? "" };
    },
    staleTime: 15_000,
  });
  const baseUrl = query.data?.base.trim().replace(/\/+$/, "") || (typeof window !== "undefined" ? window.location.origin : "");
  const plates = query.data?.plates ?? [];
  const filtered = useMemo(() => plates.filter((p) => {
    const model = p.plate_models as unknown as { name?: string } | null;
    const q = search.trim().toLocaleLowerCase("pt-BR");
    const matchesSearch = !q || p.code.toLocaleLowerCase("pt-BR").includes(q) || (model?.name ?? "").toLocaleLowerCase("pt-BR").includes(q) || p.slug.toLocaleLowerCase("pt-BR").includes(q);
    const matchesFilter = filter === "todos" || (filter === "configurados" && !!p.destination_url) || (filter === "sem_destino" && !p.destination_url) || (filter === "ativos" && p.qr_active) || (filter === "desativados" && !p.qr_active);
    return matchesSearch && matchesFilter;
  }), [plates, search, filter]);
  const copy = (value: string) => navigator.clipboard.writeText(value).then(() => toast.success("Endereço copiado.")).catch(() => toast.error("Não foi possível copiar o endereço."));

  return (
    <div className="space-y-6">
      <PageHeader title="QR Codes dinâmicos" subtitle="Cada plaquinha recebe um endereço permanente que pode redirecionar para destinos diferentes." actions={<a href="/plaquinhas" className="inline-flex h-10 items-center gap-2 rounded-lg border bg-card px-3 text-sm font-medium hover:bg-secondary"><Settings2 className="size-4" /> Configurar plaquinhas</a>} />
      {query.isError && <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">Não foi possível consultar os QR Codes. Verifique a conexão com o Supabase.</div>}
      <section className="grid gap-3 grid-cols-2 xl:grid-cols-4">
        <Stat label="QR cadastrados" value={query.isLoading ? "…" : plates.length} hint="Um por plaquinha" />
        <Stat label="Configurados" value={query.isLoading ? "…" : plates.filter((p) => !!p.destination_url).length} hint="Com destino digital" tone="gold" />
        <Stat label="Sem destino" value={query.isLoading ? "…" : plates.filter((p) => !p.destination_url).length} hint="Precisam de configuração" />
        <Stat label="Ativos" value={query.isLoading ? "…" : plates.filter((p) => p.qr_active).length} hint="Redirecionamento habilitado" />
      </section>
      <Panel title="Localizar QR Code">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
          <div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input className={inputCls + " pl-9"} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar código NFC, modelo ou slug..." /></div>
          <select className={inputCls} value={filter} onChange={(e) => setFilter(e.target.value)}><option value="todos">Todos os QR Codes</option><option value="configurados">Com destino configurado</option><option value="sem_destino">Sem destino</option><option value="ativos">Ativos</option><option value="desativados">Desativados</option></select>
        </div>
      </Panel>
      <Panel title="QR Codes por plaquinha" action={<span className="text-xs text-muted-foreground">{filtered.length} resultado(s)</span>}>
        {query.isLoading ? <p className="py-8 text-center text-sm text-muted-foreground">Carregando QR Codes…</p> : !filtered.length ? <Empty><QrCode className="mx-auto mb-2 size-6" />{plates.length ? "Nenhum QR Code corresponde à pesquisa." : "Nenhum QR Code encontrado. Confira se as entradas de estoque criaram as plaquinhas individuais."}</Empty> : (
          <DataTable head={["Plaquinha", "Destino", "Status", "Última alteração", "Endereço permanente", ""]}>
            {filtered.map((plate) => {
              const url = baseUrl ? baseUrl + "/r/" + plate.slug : "";
              return <tr key={plate.id}>
                <td><a href={"/plaquinhas/" + plate.id} className="font-semibold underline-offset-4 hover:underline">{plate.code}</a></td>
                <td className="max-w-[230px]"><span className="block truncate text-xs text-muted-foreground">{plate.destination_url || "Destino ainda não configurado"}</span></td>
                <td><StatusBadge value={!plate.qr_active ? "bloqueado" : plate.destination_url ? "ativo" : "pendente"} label={!plate.qr_active ? "Desativado" : plate.destination_url ? "Configurado" : "Sem destino"} /></td>
                <td className="whitespace-nowrap text-xs">{fmtDateTime(plate.qr_updated_at)}</td>
                <td><div className="flex max-w-[260px] items-center gap-1"><span className="truncate text-xs text-muted-foreground">{url}</span><button title="Copiar endereço" onClick={() => url && copy(url)} className="grid size-8 shrink-0 place-items-center rounded-md hover:bg-secondary"><Copy className="size-3.5" /></button></div></td>
                <td><div className="flex items-center gap-2"><a href={"/plaquinhas/" + plate.id} className="inline-flex items-center gap-1 whitespace-nowrap text-sm font-semibold underline-offset-4 hover:underline">Configurar</a>{url && <a href={url} target="_blank" rel="noreferrer" title="Testar endereço permanente" className="grid size-8 place-items-center rounded-md hover:bg-secondary"><ExternalLink className="size-4" /></a>}</div></td>
              </tr>;
            })}
          </DataTable>
        )}
        <p className="mt-4 text-xs leading-5 text-muted-foreground">A tela de detalhes permite visualizar e baixar o QR Code em PNG, copiar o endereço permanente, alterar o destino e ativar/desativar o redirecionamento.</p>
      </Panel>
    </div>
  );
}
