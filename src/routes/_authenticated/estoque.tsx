import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowDownToLine, Boxes, CalendarDays, PackagePlus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel, Stat } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { brl, fmtDate, fmtDateTime, formatNfcCode } from "@/lib/format";

const fieldClass = "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20";
const labelClass = "mb-1.5 block text-sm font-medium";

export const Route = createFileRoute("/_authenticated/estoque")({
  head: () => ({ meta: [{ title: "Estoque — NFC Control" }, { name: "description", content: "Entradas e saldo de plaquinhas NFC." }] }),
  component: StockPage,
});

function StockPage() {
  const queryClient = useQueryClient();
  const [quantity, setQuantity] = useState("10");
  const [modelId, setModelId] = useState("");
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().slice(0, 10));
  const [supplier, setSupplier] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [notes, setNotes] = useState("");

  const stock = useQuery({
    queryKey: ["stock-page"],
    queryFn: async () => {
      const [platesRes, entriesRes, modelsRes] = await Promise.all([
        supabase.from("plates").select("id,seq,status"),
        supabase.from("stock_entries").select("id,entry_number,quantity,first_seq,last_seq,received_date,supplier,unit_cost,total_cost,stock_before,stock_after,created_at,notes,plate_models(name)").order("entry_number", { ascending: false }).limit(100),
        supabase.from("plate_models").select("id,name,active,default_cost").eq("active", true).order("name"),
      ]);
      const error = platesRes.error || entriesRes.error || modelsRes.error;
      if (error) throw error;
      const plates = platesRes.data ?? [];
      return {
        plates,
        entries: entriesRes.data ?? [],
        models: modelsRes.data ?? [],
        total: plates.length,
        available: plates.filter((p) => p.status === "disponivel").length,
        reserved: plates.filter((p) => p.status === "reservada").length,
        sold: plates.filter((p) => p.status === "vendida").length,
        lastSeq: plates.reduce((max, p) => Math.max(max, p.seq), 0),
      };
    },
    staleTime: 15_000,
  });

  const selectedModel = stock.data?.models.find((model) => model.id === modelId);
  const qty = Number(quantity);
  const preview = useMemo(() => {
    if (!Number.isSafeInteger(qty) || qty < 1 || !stock.data) return null;
    const first = stock.data.lastSeq + 1;
    return { first, last: first + qty - 1 };
  }, [qty, stock.data]);

  const addEntry = useMutation({
    mutationFn: async () => {
      if (!modelId) throw new Error("Selecione o modelo da plaquinha.");
      if (!Number.isSafeInteger(qty) || qty < 1 || qty > 10000) throw new Error("Informe uma quantidade inteira entre 1 e 10.000.");
      const cost = unitCost.trim() === "" ? 0 : Number(unitCost.replace(",", "."));
      if (!Number.isFinite(cost) || cost < 0) throw new Error("Informe um custo unitário válido.");
      const { data, error } = await supabase.rpc("create_stock_entry", {
        _model_id: modelId,
        _notes: notes.trim(),
        _quantity: qty,
        _received_date: receivedDate,
        _supplier: supplier.trim(),
        _unit_cost: cost,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: async (entry) => {
      toast.success(`Entrada registrada: ${formatNfcCode(entry.first_seq)} até ${formatNfcCode(entry.last_seq)}.`);
      setSupplier("");
      setUnitCost("");
      setNotes("");
      await queryClient.invalidateQueries();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Não foi possível registrar a entrada."),
  });

  const data = stock.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Estoque"
        subtitle="Registre recebimentos e acompanhe a numeração automática das plaquinhas."
        actions={<button onClick={() => stock.refetch()} className="inline-flex h-10 items-center gap-2 rounded-lg border bg-card px-3 text-sm font-medium hover:bg-secondary"><RefreshCw className="size-4" /> Atualizar</button>}
      />

      {stock.isError && <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">Não foi possível carregar o estoque. Confira a conexão com o Supabase e as permissões da conta.</div>}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Total cadastrado" value={data ? data.total : "—"} hint="Identificações já utilizadas" />
        <Stat label="Disponíveis" value={data ? data.available : "—"} hint="Prontas para venda" tone="gold" />
        <Stat label="Reservadas" value={data ? data.reserved : "—"} hint="Aguardando confirmação" />
        <Stat label="Vendidas" value={data ? data.sold : "—"} hint="Unidades já comercializadas" />
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.85fr)]">
        <Panel title="Adicionar entrada" action={<PackagePlus className="size-4 text-muted-foreground" />}>
          {!data?.models.length && !stock.isLoading ? (
            <div className="rounded-xl border border-dashed p-6 text-center">
              <Boxes className="mx-auto mb-3 size-7 text-muted-foreground" />
              <p className="text-sm font-semibold">Nenhum modelo ativo cadastrado</p>
              <p className="mt-1 text-xs text-muted-foreground">Cadastre ou ative um modelo em Configurações antes de registrar recebimentos.</p>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); addEntry.mutate(); }}>
              <div>
                <label className={labelClass} htmlFor="stock-model">Modelo da plaquinha *</label>
                <select id="stock-model" className={fieldClass} value={modelId} onChange={(event) => { setModelId(event.target.value); const model = data?.models.find((item) => item.id === event.target.value); if (model?.default_cost != null) setUnitCost(String(model.default_cost)); }} required>
                  <option value="">Selecione um modelo</option>
                  {data?.models.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}
                </select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className={labelClass} htmlFor="stock-quantity">Quantidade recebida *</label><input id="stock-quantity" className={fieldClass} type="number" min="1" max="10000" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} required /></div>
                <div><label className={labelClass} htmlFor="stock-date">Data de recebimento *</label><input id="stock-date" className={fieldClass} type="date" value={receivedDate} onChange={(event) => setReceivedDate(event.target.value)} required /></div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label className={labelClass} htmlFor="stock-supplier">Fornecedor (opcional)</label><input id="stock-supplier" className={fieldClass} value={supplier} onChange={(event) => setSupplier(event.target.value)} maxLength={160} placeholder="Nome do fornecedor" /></div>
                <div><label className={labelClass} htmlFor="stock-cost">Custo unitário (R$)</label><input id="stock-cost" className={fieldClass} type="number" min="0" step="0.01" value={unitCost} onChange={(event) => setUnitCost(event.target.value)} placeholder={selectedModel?.default_cost != null ? String(selectedModel.default_cost) : "0,00"} /></div>
              </div>
              <div><label className={labelClass} htmlFor="stock-notes">Observações (opcional)</label><textarea id="stock-notes" className={fieldClass + " min-h-20 py-2"} value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={1000} placeholder="Informações sobre este recebimento" /></div>

              <div className="rounded-xl border border-gold/30 bg-secondary/50 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><CalendarDays className="size-4" /> Prévia da entrada</div>
                {preview ? <>
                  <p className="text-sm">Você está adicionando <strong>{qty}</strong> plaquinha(s) {selectedModel ? `do modelo ${selectedModel.name}` : ""}.</p>
                  <p className="mt-1 text-sm text-muted-foreground">Numeração estimada: <strong className="text-foreground">{formatNfcCode(preview.first)} até {formatNfcCode(preview.last)}</strong></p>
                  <p className="mt-1 text-xs text-muted-foreground">Estoque atual: {data ? data.total : "—"} · após a entrada: {data ? data.total + qty : "—"} unidades.</p>
                  <p className="mt-2 text-xs text-muted-foreground">A numeração definitiva é calculada no banco no momento da confirmação para evitar duplicidades.</p>
                </> : <p className="text-sm text-muted-foreground">Informe uma quantidade válida para visualizar a prévia.</p>}
              </div>
              <button type="submit" disabled={addEntry.isPending || stock.isLoading || !modelId || !preview} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">
                <ArrowDownToLine className="size-4" /> {addEntry.isPending ? "Registrando entrada…" : "Confirmar entrada"}
              </button>
            </form>
          )}
        </Panel>

        <Panel title="Histórico de entradas" action={<span className="text-xs text-muted-foreground">{data ? data.entries.length : "—"} registros</span>}>
          {!data?.entries.length && !stock.isLoading ? (
            <div className="py-8 text-center"><Boxes className="mx-auto mb-3 size-6 text-muted-foreground" /><p className="text-sm font-medium">Nenhuma entrada registrada</p><p className="mt-1 text-xs text-muted-foreground">As entradas confirmadas aparecerão aqui.</p></div>
          ) : stock.isLoading ? <p className="py-8 text-center text-sm text-muted-foreground">Carregando histórico…</p> : (
            <div className="space-y-3">
              {data?.entries.map((entry) => {
                const model = entry.plate_models as unknown as { name?: string } | null;
                return <div key={entry.id} className="rounded-xl border p-3">
                  <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">Entrada #{String(entry.entry_number).padStart(3, "0")}</p><p className="mt-1 text-xs text-muted-foreground">{fmtDate(entry.received_date)} · {model?.name ?? "Modelo"}</p></div><span className="rounded-full bg-secondary px-2 py-1 text-xs font-medium">{entry.quantity} un.</span></div>
                  <p className="mt-3 text-sm">{formatNfcCode(entry.first_seq)} – {formatNfcCode(entry.last_seq)}</p>
                  <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground"><span>{entry.supplier || "Fornecedor não informado"}</span><span className="font-medium text-foreground">{entry.total_cost != null ? brl(entry.total_cost) : "—"}</span></div>
                  <p className="mt-2 text-xs text-muted-foreground">Estoque: {entry.stock_before} → {entry.stock_after} · Registrado {fmtDateTime(entry.created_at)}</p>
                  {entry.notes && <p className="mt-2 text-xs text-muted-foreground">{entry.notes}</p>}
                </div>;
              })}
            </div>
          )}
          {data && data.entries.length >= 100 && <p className="mt-3 text-xs text-muted-foreground">Exibindo as 100 entradas mais recentes.</p>}
        </Panel>
      </div>
    </div>
  );
}
