import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, UserRoundPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel, DataTable, Empty, StatusBadge, Stat } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate } from "@/lib/format";

const fieldCls =
  "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20";

export const Route = createFileRoute("/_authenticated/revendedores")({
  head: () => ({
    meta: [
      { title: "Revendedores — NFC Control" },
      { name: "description", content: "Gerencie usuários que atuam como revendedores." },
    ],
  }),
  component: ResellersPage,
});

function ResellersPage() {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const query = useQuery({
    queryKey: ["resellers-page"],
    queryFn: async () => {
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("id,full_name,email,created_at").order("full_name"),
        supabase.from("user_roles").select("id,user_id,role"),
      ]);
      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;
      const roles = rolesRes.data ?? [];
      return (profilesRes.data ?? []).map((profile) => ({
        ...profile,
        role: roles.find((r) => r.user_id === profile.id)?.role ?? null,
        roleId: roles.find((r) => r.user_id === profile.id)?.id ?? null,
      }));
    },
  });
  const assign = useMutation({
    mutationFn: async () => {
      if (!selectedId) throw new Error("Selecione um usuário cadastrado.");
      const { error } = await supabase.rpc("set_user_role", {
        _role: "revendedor",
        _user_id: selectedId,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Usuário definido como revendedor.");
      setSelectedId("");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["resellers-page"] }),
        qc.invalidateQueries({ queryKey: ["reseller-options"] }),
      ]);
    },
    onError: (e) =>
      toast.error(
        e instanceof Error ? e.message : "Não foi possível atribuir o perfil de revendedor.",
      ),
  });
  const profiles = query.data ?? [];
  const resellers = profiles.filter((p) => p.role === "revendedor");
  const available = profiles.filter((p) => p.role !== "revendedor");
  const filtered = useMemo(
    () =>
      resellers.filter((p) => {
        const q = search.trim().toLocaleLowerCase("pt-BR");
        return (
          !q ||
          (p.full_name ?? "").toLocaleLowerCase("pt-BR").includes(q) ||
          (p.email ?? "").toLocaleLowerCase("pt-BR").includes(q)
        );
      }),
    [resellers, search],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Revendedores"
        subtitle="Associe contas já cadastradas ao perfil de revendedor."
      />
      {query.isError && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm"
        >
          Não foi possível consultar os usuários e suas permissões.
        </div>
      )}
      <section className="grid gap-3 sm:grid-cols-2">
        <Stat
          label="Revendedores ativos"
          value={resellers.length}
          hint="Contas com perfil revendedor"
          tone="gold"
        />
        <Stat
          label="Usuários disponíveis"
          value={available.length}
          hint="Contas que ainda não são revendedoras"
        />
      </section>
      <Panel
        title="Adicionar revendedor"
        action={<UserRoundPlus className="size-4 text-muted-foreground" />}
      >
        <form
          className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            assign.mutate();
          }}
        >
          <label className="block text-sm font-medium">
            Usuário já cadastrado
            <select
              className={fieldCls + " mt-1.5"}
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              required
            >
              <option value="">Selecione um usuário</option>
              {available.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name || p.email || p.id}
                </option>
              ))}
            </select>
          </label>
          <button
            disabled={assign.isPending || !selectedId}
            className="inline-flex h-10 items-center justify-center gap-2 self-end rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            <UserRoundPlus className="size-4" />
            {assign.isPending ? "Atualizando…" : "Definir como revendedor"}
          </button>
        </form>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          A conta precisa existir no sistema. O cadastro/autenticação de novos usuários é feito pelo
          fluxo de acesso do NFC Control.
        </p>
      </Panel>
      <Panel
        title="Lista de revendedores"
        action={<span className="text-xs text-muted-foreground">{filtered.length} conta(s)</span>}
      >
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className={fieldCls + " pl-9"}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar por nome ou e-mail…"
          />
        </div>
        {!filtered.length ? (
          <Empty>
            <Users className="mx-auto mb-2 size-6" />
            Nenhum revendedor encontrado.
          </Empty>
        ) : (
          <DataTable head={["Nome", "E-mail", "Cadastro", "Perfil"]}>
            {filtered.map((p) => (
              <tr key={p.id}>
                <td className="font-semibold">{p.full_name || "Nome não informado"}</td>
                <td>{p.email || "—"}</td>
                <td className="whitespace-nowrap">{fmtDate(p.created_at)}</td>
                <td>
                  <StatusBadge value="ativo" label="Revendedor" />
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </Panel>
    </div>
  );
}
