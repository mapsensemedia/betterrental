import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

/**
 * Hook to require authentication for booking actions.
 * Returns a function that checks auth and redirects if needed.
 */
export function useRequireAuth() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const requireAuth = (action?: string): boolean => {
    if (isLoading) return false;
    
    if (!user) {
      // Store current URL to return after login
      const returnUrl = `${location.pathname}${location.search}`;
      
      toast({
        title: "Sign in required",
        description: action || "Create an account to reserve this vehicle.",
      });
      
      navigate(`/auth?returnUrl=${encodeURIComponent(returnUrl)}`);
      return false;
    }
    
    return true;
  };

  return { user, isLoading, requireAuth };
}
