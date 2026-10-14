import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Empty } from "@/components/ui-kit";

export const Route = createFileRoute("/_authenticated/revendedores")({
  head: () => ({ meta: [{ title: "revendedores — NFC Control" }, { name: "description", content: "NFC Control" }, { property: "og:title", content: "revendedores — NFC Control" }, { property: "og:description", content: "NFC Control" }] }),
  component: () => (
    <div>
      <PageHeader title="revendedores" />
      <Empty>Esta tela ainda não foi construída.</Empty>
    </div>
  ),
});
