import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Pencil, Plus, Search, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel, DataTable, Empty } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate } from "@/lib/format";

const fieldCls = "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20";
const emptyForm = { name: "", phone: "", email: "", notes: "" };

export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => ({ meta: [{ title: "Clientes — NFC Control" }, { name: "description", content: "Cadastro e consulta de clientes." }] }),
  component: CustomersPage,
});

function CustomersPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const query = useQuery({
    queryKey: ["customers-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("customers").select("id,name,phone,email,notes,created_at").order("name").limit(2000);
      if (error) throw error;
      return data ?? [];
    },
  });
  const filtered = useMemo(() => (query.data ?? []).filter((c) => {
    const q = search.trim().toLocaleLowerCase("pt-BR");
    return !q || [c.name, c.phone ?? "", c.email ?? ""].some((v) => v.toLocaleLowerCase("pt-BR").includes(q));
  }), [query.data, search]);
  const save = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Informe o nome do cliente.");
      const values = { name: form.name.trim(), phone: form.phone.trim() || null, email: form.email.trim() || null, notes: form.notes.trim() || null };
      const result = editingId
        ? await supabase.from("customers").update(values).eq("id", editingId)
        : await supabase.from("customers").insert(values);
      if (result.error) throw result.error;
    },
    onSuccess: async () => {
      toast.success(editingId ? "Cliente atualizado." : "Cliente cadastrado.");
      setForm(emptyForm); setEditingId(null);
      await qc.invalidateQueries({ queryKey: ["customers-list"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Não foi possível salvar o cliente."),
  });
  const startEdit = (c: NonNullable<typeof query.data>[number]) => {
    setEditingId(c.id); setForm({ name: c.name, phone: c.phone ?? "", email: c.email ?? "", notes: c.notes ?? "" });
  };
  const cancelEdit = () => { setEditingId(null); setForm(emptyForm); };

  return (
    <div className="space-y-6">
      <PageHeader title="Clientes" subtitle="Mantenha os contatos organizados e vincule-os às vendas." />
      {query.isError && <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">Não foi possível carregar os clientes.</div>}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.4fr)]">
        <Panel title={editingId ? "Editar cliente" : "Novo cliente"} action={editingId ? <button onClick={cancelEdit} className="grid size-8 place-items-center rounded-md hover:bg-secondary" aria-label="Cancelar edição"><X className="size-4" /></button> : <Plus className="size-4 text-muted-foreground" />}>
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
            <label className="block text-sm font-medium">Nome completo *<input className={fieldCls + " mt-1.5"} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={160} /></label>
            <label className="block text-sm font-medium">Telefone<input className={fieldCls + " mt-1.5"} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={40} placeholder="(00) 00000-0000" /></label>
            <label className="block text-sm font-medium">E-mail<input className={fieldCls + " mt-1.5"} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={254} /></label>
            <label className="block text-sm font-medium">Observações<textarea className={fieldCls + " mt-1.5 min-h-20 py-2"} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={1000} /></label>
            <button disabled={save.isPending} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50">{save.isPending ? "Salvando…" : editingId ? "Salvar alterações" : "Cadastrar cliente"}</button>
          </form>
        </Panel>
        <Panel title="Base de clientes" action={<span className="text-xs text-muted-foreground">{filtered.length} registro(s)</span>}>
          <div className="relative mb-4"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input className={fieldCls + " pl-9"} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar nome, telefone ou e-mail…" /></div>
          {query.isLoading ? <p className="py-8 text-center text-sm text-muted-foreground">Carregando clientes…</p> : !filtered.length ? <Empty><UserRound className="mx-auto mb-2 size-6" />Nenhum cliente encontrado.</Empty> : <DataTable head={["Cliente", "Contato", "Cadastro", ""]}>{filtered.map((c) => <tr key={c.id}><td><p className="font-semibold">{c.name}</p>{c.email && <p className="mt-0.5 text-xs text-muted-foreground">{c.email}</p>}</td><td>{c.phone || "—"}</td><td className="whitespace-nowrap">{fmtDate(c.created_at)}</td><td><button onClick={() => startEdit(c)} className="inline-flex items-center gap-1 text-sm font-semibold underline-offset-4 hover:underline"><Pencil className="size-3.5" /> Editar</button></td></tr>)}</DataTable>}
        </Panel>
      </div>
    </div>
  );
}
