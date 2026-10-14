import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NFC Control — Plaquinhas NFC e QR Codes dinâmicos" },
      { name: "description", content: "Sistema de gestão de estoque, vendas, financeiro e QR Codes dinâmicos para plaquinhas NFC." },
      { property: "og:title", content: "NFC Control" },
      { property: "og:description", content: "Gestão de plaquinhas NFC e QR Codes dinâmicos em um único painel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="flex min-h-screen flex-col bg-ink text-ink-foreground">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <div className="font-display text-lg font-semibold">NFC Control</div>
        <Button asChild variant="gold" size="sm">
          <Link to="/painel">Acessar painel</Link>
        </Button>
      </header>
      <main className="mx-auto flex max-w-3xl flex-1 flex-col items-start justify-center px-6 sm:px-10">
        <div className="gold-line mb-8 w-24" />
        <h1 className="text-4xl font-semibold leading-tight sm:text-6xl">Plaquinhas NFC com QR Codes que nunca precisam ser reimpressos.</h1>
        <p className="mt-6 max-w-xl text-lg text-ink-foreground/60">
          Numeração automática, estoque, vendas, financeiro e redirecionamentos dinâmicos — tudo em um painel.
        </p>
        <div className="mt-10 flex gap-3">
          <Button asChild variant="gold" size="lg">
            <Link to="/auth">Entrar</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
