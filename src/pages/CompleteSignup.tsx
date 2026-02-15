import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { CustomerLayout } from "@/components/layout/CustomerLayout";

import c2cLogo from "@/assets/c2c-logo.png";

export default function CompleteSignup() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();

  const bookingCode = searchParams.get("bookingCode") || "";
  const bookingId = searchParams.get("bookingId") || "";
  const prefillEmail = searchParams.get("email") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // If user is already authenticated, redirect to booking
  useEffect(() => {
    if (!authLoading && user) {
      if (bookingId) {
        navigate(`/booking/${bookingId}`, { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
    }
  }, [user, authLoading, navigate, bookingId]);

  // No booking context — show fallback
  if (!bookingCode && !prefillEmail) {
    return (
      <CustomerLayout>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <img src={c2cLogo} alt="C2C" className="h-10 mx-auto mb-4" />
              <CardTitle>Create an Account</CardTitle>
              <CardDescription>
                Sign up or log in to view your bookings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full" onClick={() => navigate("/auth")}>
                Go to Sign Up / Login
              </Button>
            </CardContent>
          </Card>
        </div>
      </CustomerLayout>
    );
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast({ title: "Password too short", description: "Must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", description: "Please confirm your password.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: prefillEmail,
        password,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) {
        // If already registered, prompt login
        if (error.message?.toLowerCase().includes("already registered") || error.message?.toLowerCase().includes("already been registered")) {
          toast({
            title: "Account already exists",
            description: "This email already has an account — please log in.",
            variant: "destructive",
          });
          navigate(`/auth?returnUrl=${encodeURIComponent(`/booking/${bookingId}`)}&email=${encodeURIComponent(prefillEmail)}`);
          return;
        }
        throw error;
      }

      // Check if email confirmation is required
      if (data.user && !data.session) {
        toast({
          title: "Verify your email",
          description: "We've sent a verification link to your email. Please verify to view your booking.",
        });
      } else if (data.session) {
        // Auto-confirmed — redirect to booking
        toast({ title: "Account created!", description: "Redirecting to your booking..." });
        navigate(`/booking/${bookingId}`, { replace: true });
      }
    } catch (err: any) {
      toast({ title: "Sign up failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <CustomerLayout>
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <img src={c2cLogo} alt="C2C" className="h-10 mx-auto mb-4" />
            <CardTitle className="text-xl">Create your account to view your booking</CardTitle>
            <CardDescription>
              Use the same email you used during booking: <strong>{prefillEmail}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">
              {/* Booking code display */}
              {bookingCode && (
                <div className="p-3 bg-muted rounded-lg text-center">
                  <p className="text-xs text-muted-foreground">Your Booking Code</p>
                  <p className="font-mono font-bold text-lg tracking-wider">{bookingCode}</p>
                </div>
              )}

              {/* Email (read-only) */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={prefillEmail}
                    readOnly
                    disabled
                    className="pl-10 bg-muted"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password"
                    className="pl-10"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    className="pl-10"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating Account..." : "Create Account"}
                {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                This helps us securely connect your booking to your account.
              </p>

              <div className="text-center text-sm">
                <span className="text-muted-foreground">Already have an account? </span>
                <Link
                  to={`/auth?returnUrl=${encodeURIComponent(`/booking/${bookingId}`)}&email=${encodeURIComponent(prefillEmail)}`}
                  className="text-primary hover:underline font-medium"
                >
                  Log in
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </CustomerLayout>
  );
}
