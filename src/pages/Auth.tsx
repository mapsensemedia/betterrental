import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Mail, Lock, User, ArrowRight, Upload, X, FileCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PhoneInput } from "@/components/shared/PhoneInput";
import { useAuth } from "@/hooks/use-auth";
import { uploadLicenseOnSignup } from "@/hooks/use-license-upload";

import heroImage from "@/assets/hero-car.jpg";
import c2cLogo from "@/assets/c2c-logo.png";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  const licenseInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();

  // Get return URL from query params
  const returnUrl = searchParams.get("returnUrl") || "/dashboard";

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      navigate(returnUrl, { replace: true });
    }
  }, [user, authLoading, navigate, returnUrl]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast({ title: "Welcome back!", description: "Successfully signed in." });
        navigate(returnUrl, { replace: true });
      } else {
        // Validate phone for signup
        if (phone.length < 10) {
          toast({
            title: "Phone Required",
            description: "Please enter a valid phone number for booking confirmations.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}${returnUrl}`,
            data: { full_name: name, phone },
          },
        });
        if (error) throw error;

        // Update profile with phone number
        if (data.user) {
          await supabase.from("profiles").upsert({
            id: data.user.id,
            email,
            full_name: name,
            phone,
          });

          // Upload license if provided
          if (licenseFile) {
            const uploadSuccess = await uploadLicenseOnSignup(data.user.id, licenseFile);
            if (uploadSuccess) {
              toast({
                title: "License Uploaded",
                description: "Your driver's license has been saved to your profile.",
              });
            }
          }
        }

        toast({
          title: "Account created!",
          description: "You can now sign in and start booking.",
        });
        
        // Auto sign in after signup (if email confirmation is disabled)
        if (data.session) {
          navigate(returnUrl, { replace: true });
        } else {
          setIsLogin(true);
        }
      }
    } catch (error: any) {
      let errorMessage = error.message;
      
      // Handle common errors with friendly messages
      if (error.message.includes("User already registered")) {
        errorMessage = "An account with this email already exists. Please sign in instead.";
        setIsLogin(true);
      } else if (error.message.includes("Invalid login credentials")) {
        errorMessage = "Invalid email or password. Please try again.";
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Show message if redirected for booking
  const showBookingMessage = searchParams.has("returnUrl") && searchParams.get("returnUrl")?.includes("/vehicle");

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 lg:px-16 xl:px-24 py-12">
        {/* Logo */}
        <Link to="/" className="flex items-center mb-12">
          <img src={c2cLogo} alt="C2C Rental" className="h-12 w-auto" />
        </Link>

        <div className="max-w-md">
          {showBookingMessage && !isLogin && (
            <div className="mb-6 p-4 bg-primary/10 rounded-xl border border-primary/20">
              <p className="text-sm text-primary font-medium">
                Create an account to reserve this vehicle
              </p>
            </div>
          )}

          <h1 className="heading-2 mb-2">
            {isLogin ? "Welcome back" : "Create an account"}
          </h1>
          <p className="text-muted-foreground mb-8">
            {isLogin
              ? "Sign in to access your bookings and manage your rentals."
              : "Sign up to start booking premium vehicles."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                </div>

                <PhoneInput
                  value={phone}
                  onChange={setPhone}
                  required
                  label="Mobile Number"
                />

                {/* Optional Driver's License Upload */}
                <div className="space-y-2">
                  <Label htmlFor="license" className="flex items-center gap-2">
                    Driver's License
                    <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Upload now to speed up your first pickup
                  </p>
                  
                  {licenseFile ? (
                    <div className="flex items-center gap-3 p-3 bg-primary/10 rounded-lg border border-primary/20">
                      <FileCheck className="h-5 w-5 text-primary" />
                      <span className="text-sm flex-1 truncate">{licenseFile.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => {
                          setLicenseFile(null);
                          if (licenseInputRef.current) {
                            licenseInputRef.current.value = "";
                          }
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
                      onClick={() => licenseInputRef.current?.click()}
                    >
                      <Upload className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Click to upload license photo</span>
                    </div>
                  )}
                  <input
                    ref={licenseInputRef}
                    id="license"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setLicenseFile(e.target.files?.[0] || null)}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                  minLength={6}
                />
              </div>
            </div>

            {isLogin && (
              <div className="flex justify-end">
                <Link
                  to="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            )}

            <Button
              type="submit"
              variant="hero"
              size="lg"
              className="w-full"
              disabled={loading}
            >
              {loading ? "Loading..." : isLogin ? "Sign In" : "Create Account"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </form>

          <Separator className="my-8" />

          <p className="text-center text-muted-foreground">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary font-medium hover:underline"
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </p>
        </div>
      </div>

      {/* Right Panel - Image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <img
          src={heroImage}
          alt="Premium car"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-foreground/60" />
        <div className="absolute inset-0 flex items-center justify-center p-16">
          <div className="text-center">
            <h2 className="heading-1 text-card mb-4">
              Drive the
              <br />
              extraordinary
            </h2>
            <p className="text-card/80 max-w-md mx-auto">
              Access our curated fleet of premium vehicles and experience luxury
              on the road.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
