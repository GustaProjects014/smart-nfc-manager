import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Empty } from "@/components/ui-kit";

export const Route = createFileRoute("/_authenticated/relatorios")({
  head: () => ({ meta: [{ title: "relatorios — NFC Control" }, { name: "description", content: "NFC Control" }, { property: "og:title", content: "relatorios — NFC Control" }, { property: "og:description", content: "NFC Control" }] }),
  component: () => (
    <div>
      <PageHeader title="relatorios" />
      <Empty>Esta tela ainda não foi construída.</Empty>
    </div>
  ),
});
