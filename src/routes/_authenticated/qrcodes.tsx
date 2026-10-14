import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Empty } from "@/components/ui-kit";

export const Route = createFileRoute("/_authenticated/qrcodes")({
  head: () => ({ meta: [{ title: "qrcodes — NFC Control" }, { name: "description", content: "NFC Control" }, { property: "og:title", content: "qrcodes — NFC Control" }, { property: "og:description", content: "NFC Control" }] }),
  component: () => (
    <div>
      <PageHeader title="qrcodes" />
      <Empty>Esta tela ainda não foi construída.</Empty>
    </div>
  ),
});
