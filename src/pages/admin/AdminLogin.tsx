import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useState } from "react";

/**
 * /admin/login — always starts a clean staff sign-in.
 * Any lingering session (e.g. an old admin account that no longer has access)
 * is signed out first, then the user is sent to the auth screen.
 */
export default function AdminLogin() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        // ignore — we only care about clearing local state
      }
      if (!cancelled) setDone(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (done) {
    return <Navigate to="/auth?returnUrl=/admin&forceLogin=1" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Preparing staff sign-in...</p>
      </div>
    </div>
  );
}
