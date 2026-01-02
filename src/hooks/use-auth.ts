import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
}

/**
 * Hook to get current auth state
 */
export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Ensure we have a profile row for this user (required for SMS/booking UX)
  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    const ensureProfile = async () => {
      try {
        const { data: existing, error: existingError } = await supabase
          .from("profiles")
          .select("id, email, full_name, phone")
          .eq("id", user.id)
          .maybeSingle();

        if (cancelled) return;
        if (existingError) {
          console.error("Error checking profile:", existingError);
          return;
        }

        const meta = (user.user_metadata || {}) as any;
        const email = user.email ?? null;
        const fullName =
          typeof meta.full_name === "string" && meta.full_name.trim() ? meta.full_name.trim() : null;
        const phone = typeof meta.phone === "string" && meta.phone.trim() ? meta.phone.trim() : null;

        const shouldUpsert =
          !existing ||
          (!!email && !existing.email) ||
          (!!fullName && !existing.full_name) ||
          (!!phone && !existing.phone);

        if (!shouldUpsert) return;

        const payload = {
          id: user.id,
          ...(email ? { email } : {}),
          ...(fullName ? { full_name: fullName } : {}),
          ...(phone ? { phone } : {}),
        };

        const { error: upsertError } = await supabase
          .from("profiles")
          .upsert(payload as any, { onConflict: "id" });

        if (upsertError) {
          console.error("Error ensuring profile:", upsertError);
        }
      } catch (err) {
        console.error("Unexpected error ensuring profile:", err);
      }
    };

    // Defer to avoid doing work inside any auth callback timing window
    setTimeout(() => {
      if (!cancelled) ensureProfile();
    }, 0);

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return { user, session, isLoading };
}
