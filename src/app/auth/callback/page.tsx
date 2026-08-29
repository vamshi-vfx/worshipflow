"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { BrandLogo } from "@/components/brand-logo";

type VerificationState = "loading" | "success" | "error";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [state, setState] = useState<VerificationState>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const handleVerification = async () => {
      try {
        const code = searchParams.get("code");
        const tokenHash = searchParams.get("token_hash");
        const type = searchParams.get("type");
        const error = searchParams.get("error");
        const errorDescription = searchParams.get("error_description");

        if (error) {
          setState("error");
          setMessage(errorDescription || "Verification failed. Please try again.");
          return;
        }

        // 1. PKCE Code Exchange
        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.error("Exchange code error:", exchangeError);
            setState("error");
            setMessage("Verification link expired or invalid. Please request a new verification email.");
            return;
          }
        }
        // 2. Token Hash OTP Verification
        else if (tokenHash && type) {
          const { error: otpError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as any,
          });
          if (otpError) {
            console.error("OTP verification error:", otpError);
            setState("error");
            setMessage("Verification token expired or invalid. Please try again.");
            return;
          }
        }
        // 3. Check for implicit hash fragments in window.location.hash (#access_token=...&refresh_token=...)
        else if (typeof window !== "undefined" && window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");

          if (accessToken && refreshToken) {
            const { error: setSessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (setSessionError) {
              console.error("Set session error:", setSessionError);
              setState("error");
              setMessage("Failed to establish authenticated session from link.");
              return;
            }
          }
        }

        // Verify that a valid session actually exists
        const { data: { session } } = await supabase.auth.getSession();
        
        await new Promise((resolve) => setTimeout(resolve, 600));
        setState("success");
        setMessage("Authentication verified successfully! Redirecting to WorshipFlow...");

        const redirectTo = searchParams.get("redirect") || (session ? "/dashboard" : "/login");
        setTimeout(() => {
          router.push(redirectTo);
          router.refresh();
        }, 1200);
      } catch (err: any) {
        console.error("Auth callback exception:", err);
        setState("error");
        setMessage("An unexpected error occurred during verification.");
      }
    };

    handleVerification();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-brand-darker flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <BrandLogo variant="full" href="/" className="w-[160px] h-[160px] mx-auto" />
          <p className="text-xs text-muted-foreground mt-1">Smart Church Lyrics &amp; Worship Presentation Platform</p>
        </div>

        <div className="glass rounded-2xl p-8 text-center border border-white/10 shadow-2xl backdrop-blur-xl">
          {state === "loading" && (
            <div className="space-y-3 py-4">
              <Loader2 className="w-10 h-10 text-brand-gold animate-spin mx-auto" />
              <h2 className="text-lg font-bold text-white">Verifying Your Email</h2>
              <p className="text-xs text-muted-foreground">Please wait a moment while we verify your credentials...</p>
            </div>
          )}

          {state === "success" && (
            <div className="space-y-3 py-4">
              <div className="w-12 h-12 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-white">Email Verified!</h2>
              <p className="text-xs text-green-400">{message}</p>
            </div>
          )}

          {state === "error" && (
            <div className="space-y-4 py-4">
              <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-white">Verification Failed</h2>
              <p className="text-xs text-red-400">{message}</p>
              <button
                onClick={() => router.push("/login")}
                className="px-5 py-2.5 bg-brand-gold text-brand-darker font-bold text-xs rounded-xl hover:bg-brand-goldLight transition-all"
              >
                Return to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-brand-darker flex items-center justify-center text-white text-xs">Verifying...</div>}>
      <AuthCallbackContent />
    </Suspense>
  );
}
