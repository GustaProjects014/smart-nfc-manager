import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Empty } from "@/components/ui-kit";

export const Route = createFileRoute("/_authenticated/vendas")({
  head: () => ({ meta: [{ title: "vendas — NFC Control" }, { name: "description", content: "NFC Control" }, { property: "og:title", content: "vendas — NFC Control" }, { property: "og:description", content: "NFC Control" }] }),
  component: () => (
    <div>
      <PageHeader title="vendas" />
      <Empty>Esta tela ainda não foi construída.</Empty>
    </div>
  ),
});
