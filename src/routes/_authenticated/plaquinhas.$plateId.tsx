import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import {
  ArrowLeft,
  Copy,
  Download,
  ExternalLink,
  History,
  Link2,
  QrCode,
  RefreshCw,
  Save,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel, StatusBadge } from "@/components/ui-kit";
import { supabase } from "@/integrations/supabase/client";
import { ACTION_LABEL, fmtDate, fmtDateTime, isValidHttpUrl, STATUS_LABEL } from "@/lib/format";

const fieldCls =
  "h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20";
const labelCls = "mb-1.5 block text-sm font-medium";

export const Route = createFileRoute("/_authenticated/plaquinhas/$plateId")({
  head: () => ({
    meta: [
      { title: "Detalhes da plaquinha — NFC Control" },
      { name: "description", content: "Configure a unidade e seu QR Code dinâmico." },
    ],
  }),
  component: PlateDetailPage,
  errorComponent: ({ error, reset }) => (
    <div className="mx-auto max-w-2xl space-y-4 py-12">
      <Panel title="Não foi possível abrir a configuração do QR Code">
        <p className="text-sm text-muted-foreground">
          A tela encontrou um erro ao carregar esta plaquinha. Tente novamente; se continuar,
          confira sua sessão e a conexão com o banco de dados.
        </p>
        <p className="mt-3 break-words rounded-lg bg-muted p-3 text-xs text-muted-foreground">
          {error instanceof Error ? error.message : "Erro inesperado ao carregar a rota."}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            Tentar novamente
          </button>
          <a
            href="/qrcodes"
            className="inline-flex h-10 items-center rounded-lg border px-4 text-sm font-medium"
          >
            Voltar aos QR Codes
          </a>
        </div>
      </Panel>
    </div>
  ),
});

function PlateDetailPage() {
  const { plateId } = Route.useParams();
  const queryClient = useQueryClient();
  const [destination, setDestination] = useState("");
  const [qrImage, setQrImage] = useState("");
  const [qrImageError, setQrImageError] = useState(false);
  const [action, setAction] = useState("reservar");
  const [reason, setReason] = useState("");
  const [resellerId, setResellerId] = useState("");
  const plateQuery = useQuery({
    queryKey: ["plate-detail", plateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plates")
        .select(
          "id,code,seq,status,created_at,slug,destination_url,qr_active,qr_updated_at,model_id,entry_id,customer_id,reseller_id,sale_id,plate_models(name,default_price),stock_entries(received_date,supplier,entry_number),customers(name,phone,email)",
        )
        .eq("id", plateId)
        .single();
      if (error) throw error;
      return data;
    },
  });
  const historyQuery = useQuery({
    queryKey: ["plate-history", plateId],
    queryFn: async () => {
      const [qr, movements] = await Promise.all([
        supabase
          .from("qr_history")
          .select("id,action,old_url,new_url,created_at,actor")
          .eq("plate_id", plateId)
          .order("created_at", { ascending: false })
          .limit(30),
        supabase
          .from("plate_movements")
          .select("id,action,from_status,to_status,created_at,reason,actor")
          .eq("plate_id", plateId)
          .order("created_at", { ascending: false })
          .limit(30),
      ]);
      if (qr.error) throw qr.error;
      if (movements.error) throw movements.error;
      return { qr: qr.data ?? [], movements: movements.data ?? [] };
    },
  });
  const settingsQuery = useQuery({
    queryKey: ["public-qr-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("public_base_url")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 60_000,
  });
  const resellersQuery = useQuery({
    queryKey: ["reseller-options"],
    queryFn: async () => {
      const { data: roles, error: roleError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "revendedor");
      if (roleError) throw roleError;
      const ids = (roles ?? []).map((item) => item.user_id);
      if (!ids.length) return [];
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id,full_name,email")
        .in("id", ids);
      if (profileError) throw profileError;
      return (profiles ?? []).map((profile) => ({ user_id: profile.id, profiles: profile }));
    },
    enabled: action === "atribuir",
  });
  const plate = plateQuery.data;
  useEffect(() => {
    if (plate) setDestination(plate.destination_url ?? "");
  }, [plate]);
  const baseUrl = useMemo(() => {
    const configured = settingsQuery.data?.public_base_url?.trim().replace(/\/+$/, "");
    return configured || (typeof window !== "undefined" ? window.location.origin : "");
  }, [settingsQuery.data?.public_base_url]);
  const permanentUrl = plate && baseUrl ? baseUrl + "/r/" + plate.slug : "";
  useEffect(() => {
    let cancelled = false;
    setQrImageError(false);
    if (!permanentUrl) {
      setQrImage("");
      return;
    }
    QRCode.toDataURL(permanentUrl, {
      width: 360,
      margin: 2,
      errorCorrectionLevel: "H",
      color: { dark: "#171717", light: "#FFFFFF" },
    })
      .then((url) => {
        if (!cancelled) setQrImage(url);
      })
      .catch(() => {
        if (!cancelled) {
          setQrImage("");
          setQrImageError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [permanentUrl]);

  const saveDestination = useMutation({
    mutationFn: async () => {
      if (!isValidHttpUrl(destination.trim()))
        throw new Error("Informe um endereço completo começando com https:// ou http://.");
      const { error } = await supabase.rpc("update_qr_destination", {
        _plate_id: plateId,
        _url: destination.trim(),
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Destino do QR Code atualizado. O código permanente continua o mesmo.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["plate-detail", plateId] }),
        queryClient.invalidateQueries({ queryKey: ["plate-history", plateId] }),
        queryClient.invalidateQueries({ queryKey: ["plates-list"] }),
        queryClient.invalidateQueries({ queryKey: ["qr-list"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
      ]);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível salvar o destino."),
  });
  const toggleQr = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("set_qr_active", {
        _active: !plate?.qr_active,
        _plate_id: plateId,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success(plate?.qr_active ? "QR Code desativado." : "QR Code ativado.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["plate-detail", plateId] }),
        queryClient.invalidateQueries({ queryKey: ["plates-list"] }),
        queryClient.invalidateQueries({ queryKey: ["qr-list"] }),
      ]);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível alterar o QR Code."),
  });
  const changeStatus = useMutation({
    mutationFn: async () => {
      if (!reason.trim())
        throw new Error("Informe o motivo da movimentação para manter o histórico.");
      if (action === "atribuir" && !resellerId) throw new Error("Selecione o revendedor.");
      const { error } = await supabase.rpc("change_plate_status", {
        _action: action,
        _plate_id: plateId,
        _reason: reason.trim(),
        _reseller_id: action === "atribuir" ? resellerId : undefined,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Status da plaquinha atualizado.");
      setReason("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["plate-detail", plateId] }),
        queryClient.invalidateQueries({ queryKey: ["plate-history", plateId] }),
        queryClient.invalidateQueries({ queryKey: ["plates-list"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] }),
      ]);
    },
    onError: (error) =>
      toast.error(error instanceof Error ? error.message : "Não foi possível alterar o status."),
  });

  if (plateQuery.isLoading)
    return (
      <div className="py-20 text-center text-sm text-muted-foreground">
        Carregando dados da plaquinha…
      </div>
    );
  if (plateQuery.isError || !plate)
    return (
      <div className="space-y-4">
        <a href="/plaquinhas" className="inline-flex items-center gap-2 text-sm font-medium">
          <ArrowLeft className="size-4" /> Voltar às plaquinhas
        </a>
        <Panel title="Plaquinha não encontrada">
          <p className="text-sm text-muted-foreground">
            Não foi possível localizar essa unidade. Ela pode ter sido removida ou sua conta não ter
            permissão para consultá-la.
          </p>
          <button className="mt-3 text-sm underline" onClick={() => plateQuery.refetch()}>
            Tentar novamente
          </button>
        </Panel>
      </div>
    );

  const model = plate.plate_models as unknown as {
    name?: string;
    default_price?: number | null;
  } | null;
  const entry = plate.stock_entries as unknown as {
    received_date?: string;
    supplier?: string | null;
    entry_number?: number;
  } | null;
  const customer = plate.customers as unknown as {
    name?: string;
    phone?: string | null;
    email?: string | null;
  } | null;
  const actions = [
    { value: "reservar", label: "Reservar unidade" },
    { value: "cancelar_reserva", label: "Cancelar reserva" },
    { value: "atribuir", label: "Atribuir a revendedor" },
    { value: "devolver", label: "Devolução autorizada" },
    { value: "baixa_defeito", label: "Dar baixa por defeito" },
    { value: "baixa_perda", label: "Dar baixa por perda" },
    { value: "reativar", label: "Reativar / corrigir status" },
  ];

  return (
    <div className="space-y-6">
      <a
        href="/plaquinhas"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Todas as plaquinhas
      </a>
      <PageHeader
        title={plate.code}
        subtitle="Detalhes individuais, configurações e QR Code permanente."
        actions={<StatusBadge value={plate.status} />}
      />
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.8fr)]">
        <div className="space-y-5">
          <Panel
            title="Dados da unidade"
            action={<ShieldCheck className="size-4 text-muted-foreground" />}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Código único</p>
                <p className="mt-1 text-base font-semibold">{plate.code}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Status atual</p>
                <div className="mt-1">
                  <StatusBadge value={plate.status} />
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Modelo</p>
                <p className="mt-1 text-sm font-medium">{model?.name ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Data de cadastro</p>
                <p className="mt-1 text-sm font-medium">{fmtDate(plate.created_at)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Entrada no estoque</p>
                <p className="mt-1 text-sm font-medium">{fmtDate(entry?.received_date)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Última alteração do QR</p>
                <p className="mt-1 text-sm font-medium">{fmtDateTime(plate.qr_updated_at)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Cliente vinculado</p>
                <p className="mt-1 text-sm font-medium">
                  {customer?.name ?? "Ainda não vinculada"}
                </p>
                {customer?.phone && (
                  <p className="text-xs text-muted-foreground">{customer.phone}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fornecedor</p>
                <p className="mt-1 text-sm font-medium">{entry?.supplier || "—"}</p>
              </div>
            </div>
          </Panel>
          <Panel
            title="Configuração do QR Code"
            action={<Link2 className="size-4 text-muted-foreground" />}
          >
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                saveDestination.mutate();
              }}
            >
              <div>
                <label className={labelCls} htmlFor="plate-destination">
                  Destino digital *
                </label>
                <input
                  id="plate-destination"
                  className={fieldCls}
                  type="url"
                  value={destination}
                  onChange={(event) => setDestination(event.target.value)}
                  placeholder="https://seusite.com/perfil"
                  required
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  É para este endereço que o visitante será encaminhado após ler o QR Code.
                </p>
              </div>
              <div>
                <label className={labelCls}>Endereço permanente do QR Code</label>
                <div className="flex gap-2">
                  <input className={fieldCls + " min-w-0"} readOnly value={permanentUrl} />
                  <button
                    type="button"
                    className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-medium hover:bg-secondary"
                    onClick={() => {
                      if (permanentUrl)
                        navigator.clipboard
                          .writeText(permanentUrl)
                          .then(() => toast.success("Endereço copiado."))
                          .catch(() =>
                            toast.error(
                              "Não foi possível copiar; selecione o endereço manualmente.",
                            ),
                          );
                    }}
                  >
                    <Copy className="size-4" />
                    <span className="hidden sm:inline">Copiar</span>
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={saveDestination.isPending}
                  className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  <Save className="size-4" />
                  {saveDestination.isPending ? "Salvando…" : "Salvar destino"}
                </button>
                <button
                  type="button"
                  onClick={() => toggleQr.mutate()}
                  disabled={toggleQr.isPending}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-medium hover:bg-secondary disabled:opacity-50"
                >
                  <RefreshCw className="size-4" />
                  {plate.qr_active ? "Desativar QR" : "Ativar QR"}
                </button>
              </div>
              {!plate.qr_active && (
                <p className="text-xs text-destructive">
                  Este QR Code está desativado e não redirecionará visitantes.
                </p>
              )}
            </form>
          </Panel>
          <Panel
            title="Movimentar plaquinha"
            action={<RefreshCw className="size-4 text-muted-foreground" />}
          >
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                changeStatus.mutate();
              }}
            >
              <div>
                <label className={labelCls} htmlFor="plate-action">
                  Ação
                </label>
                <select
                  id="plate-action"
                  className={fieldCls}
                  value={action}
                  onChange={(event) => setAction(event.target.value)}
                >
                  {actions.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
              {action === "atribuir" && (
                <div>
                  <label className={labelCls} htmlFor="plate-reseller">
                    Revendedor
                  </label>
                  <select
                    id="plate-reseller"
                    className={fieldCls}
                    value={resellerId}
                    onChange={(event) => setResellerId(event.target.value)}
                    required
                  >
                    <option value="">Selecione um revendedor</option>
                    {(resellersQuery.data ?? []).map((item) => {
                      const profile = item.profiles as unknown as {
                        full_name?: string | null;
                        email?: string | null;
                      } | null;
                      return (
                        <option key={item.user_id} value={item.user_id}>
                          {profile?.full_name || profile?.email || item.user_id}
                        </option>
                      );
                    })}
                  </select>
                  {resellersQuery.isError && (
                    <p className="mt-1 text-xs text-destructive">
                      Não foi possível carregar os revendedores.
                    </p>
                  )}
                </div>
              )}
              <div>
                <label className={labelCls} htmlFor="plate-reason">
                  Motivo / observação *
                </label>
                <input
                  id="plate-reason"
                  className={fieldCls}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  maxLength={500}
                  placeholder="Descreva o motivo da movimentação"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={changeStatus.isPending}
                className="inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-semibold hover:bg-secondary disabled:opacity-50"
              >
                {changeStatus.isPending ? "Registrando…" : "Confirmar movimentação"}
              </button>
            </form>
          </Panel>
        </div>
        <div className="space-y-5">
          <Panel
            title="QR Code da plaquinha"
            action={<QrCode className="size-4 text-muted-foreground" />}
          >
            <div className="flex flex-col items-center rounded-xl border bg-white p-4 text-center">
              {qrImage ? (
                <img
                  src={qrImage}
                  alt={"QR Code permanente " + plate.code}
                  className="block h-auto w-full max-w-[280px]"
                  onError={() => setQrImageError(true)}
                />
              ) : (
                <div className="grid aspect-square w-full max-w-[280px] place-items-center p-6 text-sm text-muted-foreground">
                  {qrImageError
                    ? "Não foi possível gerar a imagem. Confira o endereço permanente e tente atualizar."
                    : "Gerando QR Code permanente…"}
                </div>
              )}
              <p className="mt-2 text-sm font-semibold text-neutral-900">{plate.code}</p>
              <p className="mt-1 break-all text-xs text-neutral-600">{permanentUrl}</p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={!qrImage || !permanentUrl}
                onClick={async () => {
                  if (!permanentUrl) return;
                  try {
                    const image =
                      qrImage ||
                      (await QRCode.toDataURL(permanentUrl, {
                        width: 1000,
                        margin: 3,
                        errorCorrectionLevel: "H",
                        color: { dark: "#171717", light: "#FFFFFF" },
                      }));
                    const a = document.createElement("a");
                    a.href = image;
                    a.download = plate.code.toLowerCase().replace(/\s+/g, "-") + "-qr.png";
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                  } catch (error) {
                    console.error("Falha ao baixar QR Code:", error);
                    toast.error("Não foi possível gerar o PNG. Tente novamente.");
                  }
                }}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
              >
                <Download className="size-4" /> Baixar PNG
              </button>
              <button
                type="button"
                disabled={!permanentUrl}
                onClick={() => window.open(permanentUrl, "_blank", "noopener,noreferrer")}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border px-3 text-sm font-medium hover:bg-secondary disabled:opacity-50"
              >
                <ExternalLink className="size-4" /> Testar QR
              </button>
            </div>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              O QR contém o endereço permanente do NFC Control, não o destino final. Alterar o
              destino não exige imprimir outro código.
            </p>
          </Panel>
          <Panel
            title="Histórico da unidade"
            action={<History className="size-4 text-muted-foreground" />}
          >
            {historyQuery.isLoading ? (
              <p className="py-5 text-sm text-muted-foreground">Carregando histórico…</p>
            ) : historyQuery.isError ? (
              <p className="py-5 text-sm text-destructive">
                Não foi possível carregar o histórico.
              </p>
            ) : !(historyQuery.data?.qr.length || historyQuery.data?.movements.length) ? (
              <p className="py-5 text-sm text-muted-foreground">
                Ainda não há alterações registradas.
              </p>
            ) : (
              <div className="space-y-4">
                {[
                  ...(historyQuery.data?.qr ?? []).map((item) => ({
                    ...item,
                    kind: "qr" as const,
                  })),
                  ...(historyQuery.data?.movements ?? []).map((item) => ({
                    ...item,
                    kind: "movement" as const,
                  })),
                ]
                  .sort(
                    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
                  )
                  .map((item) => (
                    <div key={item.kind + item.id} className="border-l-2 border-gold/50 pl-3">
                      <p className="text-sm font-semibold">
                        {item.kind === "qr"
                          ? item.action === "destination"
                            ? "Destino do QR alterado"
                            : item.action === "activate"
                              ? "QR ativado"
                              : item.action === "deactivate"
                                ? "QR desativado"
                                : "QR Code atualizado"
                          : (ACTION_LABEL[item.action] ?? item.action)}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {fmtDateTime(item.created_at)}
                      </p>
                      {item.kind === "movement" && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {STATUS_LABEL[item.from_status ?? ""] ?? "—"} →{" "}
                          {STATUS_LABEL[item.to_status] ?? item.to_status}
                          {item.reason ? " · " + item.reason : ""}
                        </p>
                      )}
                      {item.kind === "qr" && item.new_url && (
                        <p className="mt-1 break-all text-xs text-muted-foreground">
                          {item.new_url}
                        </p>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
