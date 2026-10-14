import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id);
      const r = (roles ?? []).map((x) => x.role);
      return {
        id: u.user.id,
        email: u.user.email ?? "",
        isAdmin: r.includes("admin"),
        isReseller: r.includes("revendedor"),
      };
    },
    staleTime: 60_000,
  });
}

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data } = await supabase.from("settings").select("*").eq("id", 1).maybeSingle();
      return data;
    },
  });
}

/** Base URL for permanent QR addresses: configured domain or current origin. */
export function useQrBase() {
  const { data } = useSettings();
  const base = (data?.public_base_url || (typeof window !== "undefined" ? window.location.origin : "")).replace(/\/$/, "");
  return (slug: string) => `${base}/q/${slug}`;
}

export function useResellers() {
  return useQuery({
    queryKey: ["resellers"],
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "revendedor");
      const ids = (roles ?? []).map((r) => r.user_id);
      if (!ids.length) return [];
      const { data } = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
      return data ?? [];
    },
  });
}

export function useModels() {
  return useQuery({
    queryKey: ["models"],
    queryFn: async () => (await supabase.from("plate_models").select("*").order("name")).data ?? [],
  });
}
