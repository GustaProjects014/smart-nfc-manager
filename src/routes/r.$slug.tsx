import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { ExternalLink, QrCode, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/r/$slug")({
  head: () => ({
    meta: [
      { title: "Redirecionamento QR — NFC Control" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: PublicQrRedirect,
});

function PublicQrRedirect() {
  const { slug } = Route.useParams();
  const query = useQuery({
    queryKey: ["public-qr-resolve", slug],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("resolve_qr", { _slug: slug });
      if (error) throw error;
      return data?.[0] ?? null;
    },
    retry: 1,
  });
  const result = query.data;
  useEffect(() => {
    if (result?.found && result.active && result.destination) {
      try {
        const target = new URL(result.destination);
        if (target.protocol === "http:" || target.protocol === "https:")
          window.location.replace(target.toString());
      } catch {
        // Invalid destinations are shown as unavailable instead of redirecting.
      }
    }
  }, [result]);

  const title = query.isLoading
    ? "Localizando seu destino…"
    : query.isError
      ? "Não foi possível abrir este QR Code"
      : !result?.found
        ? "QR Code não encontrado"
        : !result.active
          ? "QR Code temporariamente desativado"
          : !result.destination
            ? "QR Code ainda não configurado"
            : "Redirecionando…";
  const description = query.isLoading
    ? "Estamos verificando o endereço vinculado a esta plaquinha."
    : query.isError
      ? "Não conseguimos consultar o serviço de redirecionamento. Tente novamente em instantes."
      : !result?.found
        ? "O endereço pode estar incorreto ou a plaquinha não está cadastrada."
        : !result.active
          ? "O responsável pela plaquinha desativou o redirecionamento temporariamente."
          : !result.destination
            ? "O responsável ainda precisa configurar o destino digital desta plaquinha."
            : "Você será encaminhado ao destino configurado.";

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border bg-card p-8 text-center shadow-soft">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-ink text-ink-foreground">
          <QrCode className="size-7 text-gold" />
        </div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          NFC CONTROL
        </p>
        <h1 className="mt-3 text-xl font-semibold">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
        {query.isError && (
          <button
            onClick={() => query.refetch()}
            className="mt-5 inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"
          >
            Tentar novamente
          </button>
        )}
        {result?.found && !result.active && (
          <ShieldAlert className="mx-auto mt-5 size-6 text-muted-foreground" />
        )}
        {result?.found && result.active && result.destination && (
          <a
            href={result.destination}
            className="mt-5 inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-4"
          >
            Continuar manualmente <ExternalLink className="size-4" />
          </a>
        )}
        <p className="mt-8 border-t pt-4 text-xs text-muted-foreground">
          Endereço permanente de uma plaquinha NFC com QR Code dinâmico.
        </p>
      </section>
    </main>
  );
}
