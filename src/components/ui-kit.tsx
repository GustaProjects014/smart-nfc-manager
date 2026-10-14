import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { STATUS_LABEL, PAY_LABEL } from "@/lib/format";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ children, className, title, action }: { children: ReactNode; className?: string; title?: string; action?: ReactNode }) {
  return (
    <section className={cn("rounded-2xl border bg-card p-4 shadow-soft sm:p-5", className)}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-2">
          {title && <h2 className="text-base font-semibold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: string; tone?: "gold" | "ink" | "default" }) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4 shadow-soft",
        tone === "ink" ? "border-transparent bg-ink text-ink-foreground" : "bg-card",
        tone === "gold" && "border-gold/40",
      )}
    >
      <div className={cn("text-xs font-medium uppercase tracking-wider", tone === "ink" ? "text-gold" : "text-muted-foreground")}>{label}</div>
      <div className="mt-2 font-display text-2xl font-semibold">{value}</div>
      {hint && <div className={cn("mt-1 text-xs", tone === "ink" ? "text-ink-foreground/60" : "text-muted-foreground")}>{hint}</div>}
    </div>
  );
}

const statusTone: Record<string, string> = {
  disponivel: "bg-success/12 text-success border-success/30",
  reservada: "bg-warning/15 text-warning border-warning/30",
  vendida: "bg-ink text-ink-foreground border-ink",
  atribuida: "bg-info/12 text-info border-info/30",
  defeituosa: "bg-destructive/10 text-destructive border-destructive/30",
  perdida: "bg-muted text-muted-foreground border-border",
  pendente: "bg-destructive/10 text-destructive border-destructive/30",
  parcial: "bg-warning/15 text-warning border-warning/30",
  pago: "bg-success/12 text-success border-success/30",
  ativo: "bg-success/12 text-success border-success/30",
  bloqueado: "bg-destructive/10 text-destructive border-destructive/30",
  cancelada: "bg-muted text-muted-foreground border-border line-through",
};

export function StatusBadge({ value, label }: { value: string; label?: string }) {
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium", statusTone[value] ?? "bg-muted")}>
      {label ?? STATUS_LABEL[value] ?? PAY_LABEL[value] ?? value}
    </span>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{children}</div>;
}

export function DataTable({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="-mx-4 overflow-x-auto sm:mx-0">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
            {head.map((h) => (
              <th key={h} className="px-3 py-2 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="[&>tr]:border-b [&>tr:last-child]:border-0 [&>tr:hover]:bg-muted/50 [&_td]:px-3 [&_td]:py-2.5">{children}</tbody>
      </table>
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

export const selectCls =
  "h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";
