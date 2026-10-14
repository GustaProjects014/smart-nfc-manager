import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Empty } from "@/components/ui-kit";

export const Route = createFileRoute("/_authenticated/estoque")({
  head: () => ({ meta: [{ title: "estoque — NFC Control" }, { name: "description", content: "NFC Control" }, { property: "og:title", content: "estoque — NFC Control" }, { property: "og:description", content: "NFC Control" }] }),
  component: () => (
    <div>
      <PageHeader title="estoque" />
      <Empty>Esta tela ainda não foi construída.</Empty>
    </div>
  ),
});
