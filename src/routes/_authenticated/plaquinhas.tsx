import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Empty } from "@/components/ui-kit";

export const Route = createFileRoute("/_authenticated/plaquinhas")({
  head: () => ({ meta: [{ title: "plaquinhas — NFC Control" }, { name: "description", content: "NFC Control" }, { property: "og:title", content: "plaquinhas — NFC Control" }, { property: "og:description", content: "NFC Control" }] }),
  component: () => (
    <div>
      <PageHeader title="plaquinhas" />
      <Empty>Esta tela ainda não foi construída.</Empty>
    </div>
  ),
});
