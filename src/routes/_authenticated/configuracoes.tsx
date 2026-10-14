import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Check, Package, Plus, Settings2, ToggleLeft, ToggleRight, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel, DataTable, Empty, StatusBadge } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";

const fieldCls = "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20";
const blankModel = { name: "", default_cost: "", default_price: "", active: true };

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — NFC Control" }, { name: "description", content: "Configure os dados do negócio, os alertas e os modelos de plaquinhas." }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const [businessName, setBusinessName] = useState("NFC Control");
  const [threshold, setThreshold] = useState("10");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState(blankModel);
  const [editingId, setEditingId] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ["settings-page"],
    queryFn: async () => {
      const [settingsRes, modelsRes] = await Promise.all([
        supabase.from("settings").select("id,business_name,low_stock_threshold,public_base_url,updated_at").eq("id", 1).maybeSingle(),
        supabase.from("plate_models").select("id,name,active,default_cost,default_price,created_at").order("name"),
      ]);
      if (settingsRes.error) throw settingsRes.error;
      if (modelsRes.error) throw modelsRes.error;
      return { settings: settingsRes.data, models: modelsRes.data ?? [] };
    },
  });
  const settings = query.data?.settings;
  useEffect(() => {
    if (!settings) return;
    setBusinessName(settings.business_name);
    setThreshold(String(settings.low_stock_threshold));
    setBaseUrl(settings.public_base_url ?? "");
  }, [settings]);

  const saveSettings = useMutation({
    mutationFn: async () => {
      const n = Number(threshold);
      if (!businessName.trim()) throw new Error("Informe o nome do negócio.");
      if (!Number.isInteger(n) || n < 0 || n > 100000) throw new Error("O alerta de estoque deve ser um número inteiro entre 0 e 100.000.");
      const normalizedUrl = baseUrl.trim().replace(/\/+$/, "");
      if (normalizedUrl && !/^https?:\/\//i.test(normalizedUrl)) throw new Error("O endereço público precisa começar com https:// ou http://.");
      const { error } = await supabase.from("settings").upsert({ id: 1, business_name: businessName.trim(), low_stock_threshold: n, public_base_url: normalizedUrl || null, updated_at: new Date().toISOString() }, { onConflict: "id" });
      if (error) throw error;
    },
    onSuccess: async () => { toast.success("Configurações salvas."); await Promise.all([qc.invalidateQueries({ queryKey: ["settings-page"] }), qc.invalidateQueries({ queryKey: ["public-qr-settings"] }), qc.invalidateQueries({ queryKey: ["qr-list"] }), qc.invalidateQueries({ queryKey: ["dashboard-summary"] })]); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível salvar as configurações."),
  });
  const saveModel = useMutation({
    mutationFn: async () => {
      if (!model.name.trim()) throw new Error("Informe o nome do modelo.");
      const cost = model.default_cost.trim() ? Number(model.default_cost.replace(",", ".")) : null;
      const price = model.default_price.trim() ? Number(model.default_price.replace(",", ".")) : null;
      if (cost != null && (!Number.isFinite(cost) || cost < 0)) throw new Error("O custo padrão deve ser zero ou maior.");
      if (price != null && (!Number.isFinite(price) || price < 0)) throw new Error("O preço padrão deve ser zero ou maior.");
      const values = { name: model.name.trim(), default_cost: cost, default_price: price, active: model.active };
      const result = editingId
        ? await supabase.from("plate_models").update(values).eq("id", editingId)
        : await supabase.from("plate_models").insert(values);
      if (result.error) throw result.error;
    },
    onSuccess: async () => { toast.success(editingId ? "Modelo atualizado." : "Modelo cadastrado."); setModel(blankModel); setEditingId(null); await Promise.all([qc.invalidateQueries({ queryKey: ["settings-page"] }), qc.invalidateQueries({ queryKey: ["stock-page"] })]); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível salvar o modelo."),
  });
  const toggleModel = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("plate_models").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => { toast.success("Status do modelo atualizado."); await qc.invalidateQueries({ queryKey: ["settings-page"] }); await qc.invalidateQueries({ queryKey: ["stock-page"] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível alterar o modelo."),
  });

  const resetModel = () => { setEditingId(null); setModel(blankModel); };
  const editModel = (m: NonNullable<typeof query.data>["models"][number]) => { setEditingId(m.id); setModel({ name: m.name, default_cost: m.default_cost == null ? "" : String(m.default_cost), default_price: m.default_price == null ? "" : String(m.default_price), active: m.active }); };

  return (
    <div className="space-y-6">
      <PageHeader title="Configurações" subtitle="Defina os parâmetros do negócio e mantenha os modelos de plaquinhas organizados." />
      {query.isError && <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">Não foi possível carregar as configurações.</div>}
      <Panel title="Dados gerais" action={<Settings2 className="size-4 text-muted-foreground" />}>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={(e) => { e.preventDefault(); saveSettings.mutate(); }}>
          <label className="block text-sm font-medium">Nome do negócio<input className={fieldCls + " mt-1.5"} value={businessName} onChange={(e) => setBusinessName(e.target.value)} required maxLength={120} /></label>
          <label className="block text-sm font-medium">Alerta de estoque baixo (unidades)<input className={fieldCls + " mt-1.5"} type="number" min="0" max="100000" step="1" value={threshold} onChange={(e) => setThreshold(e.target.value)} required /></label>
          <label className="block text-sm font-medium md:col-span-2">URL pública para QR Codes (opcional)<input className={fieldCls + " mt-1.5"} type="url" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://seu-dominio.com" /><span className="mt-1 block text-xs text-muted-foreground">Se ficar vazio, o sistema usa o domínio em que o painel estiver aberto. Configure o domínio publicado que receberá os acessos /r/slug.</span></label>
          <div className="md:col-span-2"><button disabled={saveSettings.isPending} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"><Check className="size-4" />{saveSettings.isPending ? "Salvando…" : "Salvar configurações"}</button></div>
        </form>
      </Panel>
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.4fr)]">
        <Panel title={editingId ? "Editar modelo" : "Novo modelo"} action={editingId ? <button onClick={resetModel} className="grid size-8 place-items-center rounded-md hover:bg-secondary" aria-label="Cancelar edição"><X className="size-4" /></button> : <Package className="size-4 text-muted-foreground" />}>
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); saveModel.mutate(); }}>
            <label className="block text-sm font-medium">Nome do modelo *<input className={fieldCls + " mt-1.5"} value={model.name} onChange={(e) => setModel({ ...model, name: e.target.value })} required maxLength={120} placeholder="Ex.: Plaquinha redonda" /></label>
            <label className="block text-sm font-medium">Custo padrão (R$)<input className={fieldCls + " mt-1.5"} type="number" min="0" step="0.01" value={model.default_cost} onChange={(e) => setModel({ ...model, default_cost: e.target.value })} placeholder="Opcional" /></label>
            <label className="block text-sm font-medium">Preço padrão de venda (R$)<input className={fieldCls + " mt-1.5"} type="number" min="0" step="0.01" value={model.default_price} onChange={(e) => setModel({ ...model, default_price: e.target.value })} placeholder="Opcional" /></label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={model.active} onChange={(e) => setModel({ ...model, active: e.target.checked })} /> Modelo ativo para novas entradas</label>
            <button disabled={saveModel.isPending} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"><Plus className="size-4" />{saveModel.isPending ? "Salvando…" : editingId ? "Salvar modelo" : "Cadastrar modelo"}</button>
          </form>
        </Panel>
        <Panel title="Modelos cadastrados" action={<span className="text-xs text-muted-foreground">{query.data?.models.length ?? "—"} modelo(s)</span>}>
          {!query.data?.models.length ? <Empty>Nenhum modelo cadastrado. Cadastre um modelo ativo antes de registrar entradas de estoque.</Empty> : <DataTable head={["Modelo", "Custo", "Preço", "Status", "Ações"]}>{query.data.models.map((m) => <tr key={m.id}><td className="font-semibold">{m.name}</td><td>{m.default_cost == null ? "—" : brl(m.default_cost)}</td><td>{m.default_price == null ? "—" : brl(m.default_price)}</td><td><StatusBadge value={m.active ? "ativo" : "bloqueado"} label={m.active ? "Ativo" : "Inativo"} /></td><td><div className="flex items-center gap-2"><button onClick={() => editModel(m)} className="text-sm font-semibold underline-offset-4 hover:underline">Editar</button><button onClick={() => toggleModel.mutate({ id: m.id, active: !m.active })} title={m.active ? "Desativar modelo" : "Ativar modelo"} className="grid size-8 place-items-center rounded-md hover:bg-secondary">{m.active ? <ToggleRight className="size-4" /> : <ToggleLeft className="size-4" />}</button></div></td></tr>)}</DataTable>}
        </Panel>
      </div>
      <Panel title="Informações do sistema">
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground"><li>A numeração das plaquinhas é gerada no banco de dados, não no navegador.</li><li>Desativar um modelo impede novas entradas com ele, sem apagar o histórico das unidades existentes.</li><li>Alterações no destino de QR Code não exigem reimprimir o código permanente.</li></ul>
      </Panel>
    </div>
  );
}
