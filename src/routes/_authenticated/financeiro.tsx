import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Empty } from "@/components/ui-kit";

export const Route = createFileRoute("/_authenticated/financeiro")({
  head: () => ({ meta: [{ title: "financeiro — NFC Control" }, { name: "description", content: "NFC Control" }, { property: "og:title", content: "financeiro — NFC Control" }, { property: "og:description", content: "NFC Control" }] }),
  component: () => (
    <div>
      <PageHeader title="financeiro" />
      <Empty>Esta tela ainda não foi construída.</Empty>
    </div>
  ),
});
