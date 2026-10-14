export const brl = (v: number | string | null | undefined) =>
  Number(v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Accepts 'YYYY-MM-DD' or ISO timestamp; returns DD/MM/AAAA. */
export function fmtDate(v?: string | null) {
  if (!v) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = new Date(v);
  return d.toLocaleDateString("pt-BR");
}
export function fmtDateTime(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  return `${d.toLocaleDateString("pt-BR")} ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Mirrors public.format_nfc_code in the database (display/preview only). */
export function formatNfcCode(seq: number) {
  const s = String(seq);
  return "NFC " + (s.length < 3 ? s.padStart(3, "0") : s);
}
export const pad3 = (n: number) => String(n).padStart(3, "0");

export const STATUS_LABEL: Record<string, string> = {
  disponivel: "Disponível",
  reservada: "Reservada",
  vendida: "Vendida",
  atribuida: "Atribuída a revendedor",
  defeituosa: "Defeituosa",
  perdida: "Perdida",
};
export const PAY_LABEL: Record<string, string> = { pendente: "Pendente", parcial: "Parcial", pago: "Pago" };
export const ACTION_LABEL: Record<string, string> = {
  entrada: "Entrada no estoque",
  reservar: "Reserva",
  cancelar_reserva: "Cancelamento de reserva",
  atribuir: "Atribuição a revendedor",
  devolver: "Devolução autorizada",
  baixa_defeito: "Baixa por defeito",
  baixa_perda: "Baixa por perda",
  reativar: "Correção / reativação",
  venda: "Venda",
  cancelamento_venda: "Cancelamento de venda",
};

export function isValidHttpUrl(v: string) {
  try {
    const u = new URL(v.trim());
    return (u.protocol === "http:" || u.protocol === "https:") && !!u.hostname && u.hostname.includes(".");
  } catch {
    return false;
  }
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v == null ? "" : String(v);
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = "\uFEFF" + [headers.join(";"), ...rows.map((r) => headers.map((h) => esc(r[h])).join(";"))].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function errMsg(e: unknown) {
  if (e && typeof e === "object" && "message" in e) return String((e as { message: string }).message);
  return "Erro inesperado";
}
