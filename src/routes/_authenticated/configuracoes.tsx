import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Empty } from "@/components/ui-kit";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({ meta: [{ title: "configuracoes — NFC Control" }, { name: "description", content: "NFC Control" }, { property: "og:title", content: "configuracoes — NFC Control" }, { property: "og:description", content: "NFC Control" }] }),
  component: () => (
    <div>
      <PageHeader title="configuracoes" />
      <Empty>Esta tela ainda não foi construída.</Empty>
    </div>
  ),
});
