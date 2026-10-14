import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Empty } from "@/components/ui-kit";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({ meta: [{ title: "painel — NFC Control" }, { name: "description", content: "NFC Control" }, { property: "og:title", content: "painel — NFC Control" }, { property: "og:description", content: "NFC Control" }] }),
  component: () => (
    <div>
      <PageHeader title="painel" />
      <Empty>Esta tela ainda não foi construída.</Empty>
    </div>
  ),
});
