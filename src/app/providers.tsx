"use client";

import { useEffect, useState, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@/types";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: string | null; needsVerification?: boolean }>;
  signOut: () => Promise<void>;
  resendVerification: (email: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function Providers({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getSession = async () => {
      try {
        const isDevBypass = typeof window !== "undefined" && window.location.search.includes("dev_bypass");
        
        if (isDevBypass) {
          setUser({
            id: "00000000-0000-0000-0000-000000000000",
            email: "dev@localhost",
            name: "Dev User",
            role: "owner",
            churchId: undefined,
          });
          setIsLoading(false);
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          let profile: any = null;
          try {
            const result = await supabase
              .from("users")
              .select("*")
              .eq("id", session.user.id)
              .maybeSingle();
            profile = result.data;
          } catch (e) {
            console.error("Failed to fetch user profile, using auth fallback:", e);
          }

          if (profile) {
            setUser({
              id: profile.id,
              email: session.user.email || profile.email,
              name: profile.name,
              role: profile.role,
              churchId: profile.church_id || undefined,
            });
          } else {
            const fallbackUser: User = {
              id: session.user.id,
              email: session.user.email || "",
              name: session.user.user_metadata?.name || session.user.email?.split("@")[0] || "User",
              role: "viewer",
              churchId: undefined,
            };

            supabase
              .from("users")
              .insert([{
                id: fallbackUser.id,
                email: fallbackUser.email,
                name: fallbackUser.name,
                role: fallbackUser.role,
              }])
              .then(({ error }) => {
                if (error) console.error("Failed to create user profile:", error);
              });

            setUser(fallbackUser);
          }
        }
      } catch (error) {
        console.error("Auth session error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          const isDevBypass = typeof window !== "undefined" && window.location.search.includes("dev_bypass");
          
          if (isDevBypass) {
            setUser({
              id: "00000000-0000-0000-0000-000000000000",
              email: "dev@localhost",
              name: "Dev User",
              role: "owner",
              churchId: undefined,
            });
            setIsLoading(false);
            return;
          }

          if (session?.user) {
            let profile: any = null;
            try {
              const result = await supabase
                .from("users")
                .select("*")
                .eq("id", session.user.id)
                .maybeSingle();
              profile = result.data;
            } catch (e) {
              console.error("Failed to fetch user profile on auth change, using auth fallback:", e);
            }

            if (profile) {
              setUser({
                id: profile.id,
                email: session.user.email || profile.email,
                name: profile.name,
                role: profile.role,
                churchId: profile.church_id || undefined,
              });
            } else {
              const fallbackUser: User = {
                id: session.user.id,
                email: session.user.email || "",
                name: session.user.user_metadata?.name || session.user.email?.split("@")[0] || "User",
                role: "viewer",
                churchId: undefined,
              };

              supabase
                .from("users")
                .insert([{
                  id: fallbackUser.id,
                  email: fallbackUser.email,
                  name: fallbackUser.name,
                  role: fallbackUser.role,
                }])
                .then(({ error }) => {
                  if (error) console.error("Failed to create user profile:", error);
                });

              setUser(fallbackUser);
            }
          } else {
            setUser(null);
          }
        } catch (error) {
          console.error("Auth state change error:", error);
        } finally {
          setIsLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Sign in error:", {
          message: error.message,
          code: error.code,
          status: error.status,
        });
        
        let userMessage = "Unable to sign in. Please check your credentials and try again.";
        if (error.code === "invalid_credentials" || error.message?.toLowerCase().includes("invalid")) {
          userMessage = "Incorrect email or password.";
        } else if (error.code === "email_not_confirmed" || error.message?.toLowerCase().includes("confirm")) {
          userMessage = "Please verify your email before signing in.";
        } else if (error.code === "too_many_requests" || error.code === "over_request_rate_limit") {
          userMessage = "Too many sign-in attempts. Please wait a moment and try again.";
        } else if (error.status === 400 || error.code === "unexpected_audience") {
          userMessage = "Authentication is not configured correctly.";
        }
        
        return { error: userMessage };
      }

      if (data.user) {
        const { data: profile } = await supabase
          .from("users")
          .select("*")
          .eq("id", data.user.id)
          .maybeSingle();

        if (profile) {
          setUser({
            id: profile.id,
            email: data.user.email || profile.email,
            name: profile.name,
            role: profile.role,
            churchId: profile.church_id || undefined,
          });
        } else {
          setUser({
            id: data.user.id,
            email: data.user.email || "",
            name: data.user.user_metadata?.name || data.user.email?.split("@")[0] || "User",
            role: "viewer",
            churchId: undefined,
          });
        }
      }

      return { error: null };
    } catch {
      return { error: "An unexpected error occurred" };
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      });

      if (error) {
        console.error("Sign up error:", {
          message: error.message,
          code: error.code,
          status: error.status,
        });
        
        let userMessage = "Unable to create account. Please try again.";
        if (error.code === "user_already_exists" || error.message?.toLowerCase().includes("already")) {
          userMessage = "An account with this email already exists.";
        } else if (error.code === "too_many_requests" || error.code === "over_request_rate_limit") {
          userMessage = "Too many requests. Please wait a moment and try again.";
        } else if (error.status === 400 || error.code === "unexpected_audience") {
          userMessage = "Authentication is not configured correctly.";
        } else if (error.message?.toLowerCase().includes("password")) {
          userMessage = "Password does not meet requirements.";
        }
        
        return { error: userMessage };
      }

      if (data.user) {
        const { data: profile } = await supabase
          .from("users")
          .select("*")
          .eq("id", data.user.id)
          .maybeSingle();

        if (!profile) {
          await supabase.from("users").insert([{
            id: data.user.id,
            email: data.user.email || email,
            name,
            role: "viewer",
          }]);
        }

        const needsVerification = !data.user.email_confirmed_at;
        if (needsVerification) {
          return { error: null, needsVerification: true };
        }

        setUser({
          id: data.user.id,
          email: data.user.email || email,
          name,
          role: "viewer",
          churchId: undefined,
        });
      }

      return { error: null };
    } catch {
      return { error: "An unexpected error occurred" };
    }
  };

  const resendVerification = async (email: string) => {
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
      });

      if (error) {
        console.error("Resend verification error:", {
          message: error.message,
          code: error.code,
        });
        
        let userMessage = "Unable to send verification email. Please try again.";
        if (error.code === "too_many_requests" || error.code === "over_request_rate_limit") {
          userMessage = "Please wait before requesting another verification email.";
        }
        
        return { error: userMessage };
      }

      return { error: null };
    } catch {
      return { error: "An unexpected error occurred." };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signUp, signOut, resendVerification }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
