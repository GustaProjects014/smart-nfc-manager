import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui-kit";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — NFC Control" },
      { name: "description", content: "Acesse o painel de gestão de plaquinhas NFC." },
      { property: "og:title", content: "Entrar — NFC Control" },
      { property: "og:description", content: "Acesse o painel de gestão de plaquinhas NFC." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [keepConnected, setKeepConnected] = useState(true);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/painel" });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/painel", data: { full_name: name } },
        });
        if (error) throw error;
        if (data.session) navigate({ to: "/painel" });
        else toast.success("Conta criada. Confirme seu e-mail para entrar.");
      }
    } catch (err) {
      const m = (err as Error).message || "";
      const normalized = m.toLocaleLowerCase("pt-BR");
      if (mode === "in" && (normalized.includes("invalid login") || normalized.includes("invalid credentials"))) {
        toast.error("E-mail ou senha incorretos.");
      } else if (
        mode === "up" &&
        (normalized.includes("already registered") ||
          normalized.includes("user already exists") ||
          normalized.includes("already been registered") ||
          normalized.includes("email_exists"))
      ) {
        toast.error("Este e-mail já está cadastrado. Faça login ou use outro e-mail.");
      } else {
        toast.error(m || "Não foi possível concluir o acesso.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-ink p-10 text-ink-foreground lg:flex">
        <div className="font-display text-lg font-semibold">NFC Control</div>
        <div>
          <div className="gold-line mb-6 w-24" />
          <h1 className="max-w-md text-4xl font-semibold leading-tight">Cada plaquinha com código único, destino dinâmico e histórico completo.</h1>
          <p className="mt-4 max-w-md text-ink-foreground/60">Estoque, vendas, financeiro e QR Codes em um só painel.</p>
        </div>
        <div className="text-xs text-ink-foreground/40">© {new Date().getFullYear()} NFC Control</div>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-4">
          <div>
            <h2 className="text-2xl font-semibold">{mode === "in" ? "Entrar" : "Criar conta"}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "in" ? "Acesse seu painel." : "A primeira conta criada se torna a administradora."}
            </p>
          </div>
          {mode === "up" && (
            <Field label="Nome">
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </Field>
          )}
          <Field label="E-mail">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </Field>
          <Field label="Senha">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete={mode === "in" ? "current-password" : "new-password"} />
          </Field>
          {mode === "in" && (
            <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={keepConnected}
                onChange={(e) => setKeepConnected(e.target.checked)}
                className="size-4 rounded border-input accent-primary"
              />
              Mantenha conectado
            </label>
          )}
          <Button type="submit" variant="gold" className="w-full" disabled={busy}>
            {busy ? "Aguarde..." : mode === "in" ? "Entrar" : "Criar conta"}
          </Button>
          <button type="button" className="w-full text-center text-sm text-muted-foreground hover:text-foreground" onClick={() => setMode(mode === "in" ? "up" : "in")}>
            {mode === "in" ? "Não tem conta? Criar conta" : "Já tem conta? Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
