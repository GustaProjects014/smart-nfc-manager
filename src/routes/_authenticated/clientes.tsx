import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Empty } from "@/components/ui-kit";

export const Route = createFileRoute("/_authenticated/clientes")({
  head: () => ({ meta: [{ title: "clientes — NFC Control" }, { name: "description", content: "NFC Control" }, { property: "og:title", content: "clientes — NFC Control" }, { property: "og:description", content: "NFC Control" }] }),
  component: () => (
    <div>
      <PageHeader title="clientes" />
      <Empty>Esta tela ainda não foi construída.</Empty>
    </div>
  ),
});
