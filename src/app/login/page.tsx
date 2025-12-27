"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Shield, AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";
import { logger } from '@/lib/utils/logger';

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const getDefaultPortal = (roles: string[] = []) => {
    const normalized = roles.map((role) => role.toLowerCase());
    const isAdmin = normalized.includes("admin");
    if (isAdmin) {
      return "/admin";
    }
    // All other roles (super-user, business roles) go to dashboard
    return "/dashboard";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: identifier, password }),
        credentials: "include", // Important: Include cookies in request
      });

      const data = await response.json();

      if (!response.ok) {
        // Show detailed error message to help debug
        const errorMsg = data.error || `Login failed (Status: ${response.status}). Please try again.`;
        console.error('Login failed:', { status: response.status, error: data.error, data });
        setError(errorMsg);
        setLoading(false);
        return;
      }

      let destination = searchParams.get("next");

      if (!destination) {
        try {
          const meResponse = await fetch("/api/auth/me", {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          });
          if (meResponse.ok) {
            const meData = await meResponse.json();
            destination = getDefaultPortal(meData?.user?.roles);
          }
        } catch {
          // swallow errors and fall back to dashboard
        }

        if (!destination) {
          destination = "/dashboard";
        }
      }

      router.push(destination);
      router.refresh();
    } catch (err) {
      setError("An error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#050505] text-white">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(120,120,120,0.35),_transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(40,40,40,0.5),_transparent_45%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0f0f0f] via-transparent to-[#050505] opacity-80" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-2xl flex-col items-center justify-center px-4 py-12 text-center">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="w-full rounded-[32px] border border-white/10 bg-white/[0.03] p-1 backdrop-blur-xl"
        >
          <div className="rounded-[28px] border border-white/5 bg-black/65 px-10 pt-10 pb-8 shadow-[0_25px_40px_rgba(0,0,0,0.55)]">
            <div className="mx-auto mb-6 flex items-center justify-center">
              <BrandLogo showWordmark={false} size={200} priority />
            </div>
            <div className="mb-6 space-y-2">
              <p className="text-xs uppercase tracking-[0.35em] text-white/50">
                Sign in to your ReView account
              </p>
              <p className="text-sm text-white/60">
                Authenticate with your secure Kuwait Re credentials to manage dashboards, renewals, and analytics.
              </p>
            </div>
            {error && (
              <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                <div className="flex items-center justify-center space-x-2">
                  <AlertCircle className="h-4 w-4" />
                  <p className="font-medium">Authentication error</p>
                </div>
                <p className="mt-1 text-xs text-red-300">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="Username or email"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
                />
              </div>
              <div>
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/20"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="group flex w-full items-center justify-center space-x-3 rounded-2xl bg-white/90 px-4 py-4 text-base font-semibold text-black transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <Shield className="h-5 w-5" />
                    <span>Sign In</span>
                    <ArrowRight className="h-5 w-5 transition group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#050505] flex items-center justify-center text-white">Loading...</div>}>
      <LoginPageContent />
    </Suspense>
  );
}

