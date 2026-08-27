"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Music, Eye, EyeOff, Mail, Lock, Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/app/providers";
import { useToast } from "@/components/toast";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-brand-darker flex items-center justify-center text-white">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signIn, signUp, resendVerification } = useAuth();
  const toast = useToast();

  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setNeedsVerification(false);
    setIsLoading(true);

    try {
      const redirectTo = searchParams.get("redirect") || "/";
      if (isSignup) {
        const result = await signUp(email, password, name);
        if (result.error) {
          setError(result.error);
          return;
        }
        if (result.needsVerification) {
          setNeedsVerification(true);
          setSuccess("Account created! Please check your email to verify your account before signing in.");
          return;
        }
        router.push(redirectTo);
      } else {
        const result = await signIn(email, password);
        if (result.error) {
          setError(result.error);
          if (result.error.includes("verify your email")) {
            setNeedsVerification(true);
          }
          return;
        }
        router.push(redirectTo);
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      setError("Please enter your email address first.");
      return;
    }

    setIsResending(true);
    setError("");
    setSuccess("");

    try {
      const result = await resendVerification(email);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess("Verification email resent. Please check your inbox.");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-darker flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Branding Header */}
        <div className="text-center">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-3 group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-gold to-brand-goldLight flex items-center justify-center shadow-xl shadow-brand-gold/20 group-hover:scale-105 transition-transform">
              <Music className="w-6 h-6 text-brand-darker stroke-[2.5]" />
            </div>
          </Link>
          <h1 className="font-display text-3xl font-extrabold text-white tracking-tight">
            WORSHIP<span className="text-brand-gold font-sans font-light">FLOW</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Smart Church Lyrics & Worship Presentation Platform
          </p>
        </div>

        {/* Auth Form Card */}
        <div className="glass rounded-2xl p-8 border border-white/10 shadow-2xl backdrop-blur-xl space-y-6">
          <div className="flex rounded-xl bg-white/5 p-1 border border-white/10">
            <button
              onClick={() => {
                setIsSignup(false);
                setError("");
                setSuccess("");
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                !isSignup ? "bg-brand-gold text-brand-darker shadow" : "text-muted-foreground hover:text-white"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setIsSignup(true);
                setError("");
                setSuccess("");
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                isSignup ? "bg-brand-gold text-brand-darker shadow" : "text-muted-foreground hover:text-white"
              }`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3.5 bg-green-500/10 border border-green-500/20 rounded-xl text-xs text-green-400">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignup && (
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Worship Leader"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  required
                  placeholder="worship@church.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-gold/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-brand-gold text-brand-darker font-extrabold text-sm hover:bg-brand-goldLight shadow-xl disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  {isSignup ? "Complete Registration" : "Sign In to WorshipFlow"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {needsVerification && (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={isResending}
                className="text-xs text-brand-gold hover:underline"
              >
                {isResending ? "Sending..." : "Didn't receive email? Resend verification link"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
