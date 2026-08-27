"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Music, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

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
        const error = searchParams.get("error");
        const errorDescription = searchParams.get("error_description");

        if (error) {
          setState("error");
          setMessage(errorDescription || "Verification failed. Please try again.");
          return;
        }

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            setState("error");
            setMessage("Verification link expired or invalid. Please try again.");
            return;
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 800));
        setState("success");
        setMessage("Email verified successfully! Redirecting to WorshipFlow...");

        const redirectTo = searchParams.get("redirect") || "/";
        setTimeout(() => {
          router.push(redirectTo);
        }, 1500);
      } catch {
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
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-gold/15 mb-3 shadow-lg">
            <Music className="w-7 h-7 text-brand-gold" />
          </div>
          <h1 className="font-display text-3xl font-extrabold text-white">
            WORSHIP<span className="text-brand-gold font-sans font-light">FLOW</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">Smart Church Lyrics & Worship Presentation Platform</p>
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
