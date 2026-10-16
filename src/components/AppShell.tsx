import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  LayoutDashboard, Boxes, Tags, QrCode, ShoppingBag, Wallet, Handshake, FileBarChart, Settings, LogOut, Menu, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMe } from "@/lib/session";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/painel", label: "Início", icon: LayoutDashboard },
  { to: "/estoque", label: "Estoque", icon: Boxes, admin: true },
  { to: "/plaquinhas", label: "Plaquinhas", icon: Tags },
  { to: "/qrcodes", label: "QR Codes", icon: QrCode },
  { to: "/vendas", label: "Vendas", icon: ShoppingBag },
  { to: "/financeiro", label: "Financeiro", icon: Wallet, admin: true },
  { to: "/revendedores", label: "Revendedores", icon: Handshake, admin: true },
  { to: "/relatorios", label: "Relatórios", icon: FileBarChart, admin: true },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
] as const;

export function AppShell() {
  const { data: me } = useMe();
  const [open, setOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const qc = useQueryClient();
  const navigate = useNavigate();
  const items = NAV.filter((n) => !("admin" in n) || me?.isAdmin);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const nav = (
    <nav className="flex flex-1 flex-col gap-0.5">
      {items.map((n) => {
        const active = path === n.to || path.startsWith(n.to + "/");
        return (
          <Link
            key={n.to}
            to={n.to}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
            )}
          >
            <n.icon className={cn("size-4", active && "text-sidebar-primary")} strokeWidth={1.6} />
            {n.label}
          </Link>
        );
      })}
    </nav>
  );

  const brand = (
    <div className="flex items-center gap-2.5 px-2">
      <img src="/nfc-control-logo.svg" alt="NC NFC" className="h-12 w-20 shrink-0 object-contain" />
      <div>
        <div className="font-display text-sm font-semibold text-sidebar-accent-foreground">NFC Control</div>
        <div className="text-[11px] text-sidebar-foreground/60">{me?.isAdmin ? "Administrador" : me?.isReseller ? "Revendedor" : "Sem permissão"}</div>
      </div>
    </div>
  );

  const footer = (
    <div className="border-t border-sidebar-border pt-3">
      <div className="truncate px-3 pb-2 text-xs text-sidebar-foreground/60">{me?.email}</div>
      <button onClick={signOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/75 hover:bg-sidebar-accent/60">
        <LogOut className="size-4" strokeWidth={1.6} /> Sair
      </button>
    </div>
  );

  return (
    <div className="min-h-screen lg:pl-64">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col gap-6 bg-sidebar p-4 lg:flex">
        {brand}
        <div className="gold-line opacity-60" />
        {nav}
        {footer}
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b bg-sidebar px-4 py-3 lg:hidden">
        {brand}
        <button aria-label="Abrir menu" onClick={() => setOpen(true)} className="rounded-md p-2 text-sidebar-foreground">
          <Menu className="size-5" />
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col gap-6 bg-sidebar p-4">
            <div className="flex items-center justify-between">
              {brand}
              <button aria-label="Fechar menu" onClick={() => setOpen(false)} className="p-2 text-sidebar-foreground">
                <X className="size-5" />
              </button>
            </div>
            {nav}
            {footer}
          </aside>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
        {me && !me.isAdmin && !me.isReseller ? (
          <div className="rounded-2xl border bg-card p-8 text-center shadow-soft">
            <h2 className="text-lg font-semibold">Acesso pendente</h2>
            <p className="mt-2 text-sm text-muted-foreground">Sua conta foi criada, mas ainda não recebeu permissão. Peça ao administrador para liberar seu acesso.</p>
          </div>
        ) : (
          <Outlet />
        )}
      </main>
    </div>
  );
}
