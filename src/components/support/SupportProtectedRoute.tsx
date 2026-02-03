import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { useIsSupportOrAdmin } from "@/hooks/use-support-access";
import { Loader2 } from "lucide-react";

interface SupportProtectedRouteProps {
  children: ReactNode;
}

export function SupportProtectedRoute({ children }: SupportProtectedRouteProps) {
  const { user, isLoading: authLoading } = useAuth();
  const { data: hasSupportAccess, isLoading: supportLoading } = useIsSupportOrAdmin();

  // Show loading state
  if (authLoading || supportLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Not logged in - redirect to auth
  if (!user) {
    return <Navigate to="/auth?returnUrl=/support" replace />;
  }

  // No support access - show access denied
  if (!hasSupportAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md p-8">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
            <span className="text-2xl">🔒</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            You don't have permission to access the Support panel.
            Please contact an administrator if you believe this is an error.
          </p>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground px-6 py-3 font-medium hover:opacity-90 transition-opacity"
          >
            Return Home
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
