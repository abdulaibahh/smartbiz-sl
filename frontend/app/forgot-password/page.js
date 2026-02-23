"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/providers/LanguageContext";
import { authAPI } from "@/services/api";
import { Loader2, Mail, ArrowLeft, CheckCircle } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function ForgotPassword() {
  const router = useRouter();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [demoLink, setDemoLink] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await authAPI.forgotPassword(email);
      setSuccess(true);
      if (res.data?.demoLink) {
        setDemoLink(res.data.demoLink);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send reset link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 p-4">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-indigo-500/20 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-purple-500/20 to-transparent rounded-full blur-3xl"></div>
      </div>

<div className="relative w-full max-w-md">
        {/* Language Switcher */}
        <div className="absolute top-4 right-4">
          <LanguageSwitcher />
        </div>

        {/* Back Button */}
        <button
          onClick={() => router.push("/login")}
          className="absolute -top-12 left-0 flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
          {t('common.back')} {t('auth.login')}
        </button>

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-4">
            <span className="text-white font-bold text-2xl">SB</span>
          </div>
          <h1 className="text-3xl font-bold text-white">SmartBiz</h1>
          <p className="text-zinc-500 mt-2">{t('auth.resetPassword')}</p>
        </div>

        {/* Form */}
        <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-2xl p-8">
          {success ? (
<div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto">
                <CheckCircle className="text-emerald-400" size={32} />
              </div>
              <h2 className="text-xl font-semibold text-white">{t('auth.checkEmail') || 'Check your email'}</h2>
              <p className="text-zinc-400">
                {t('auth.resetInstructions') || 'If an account exists with this email, we have sent password reset instructions.'}
              </p>
              {demoLink && (
                <div className="p-4 rounded-lg bg-zinc-800/50 border border-zinc-700">
                  <p className="text-sm text-zinc-400 mb-2">Development mode - Reset link:</p>
                  <a 
                    href={demoLink} 
                    className="text-sm text-indigo-400 hover:text-indigo-300 break-all"
                  >
                    {demoLink}
                  </a>
                </div>
              )}
              <button
                onClick={() => router.push("/login")}
                className="w-full py-3 px-4 rounded-xl bg-zinc-800 text-white font-medium hover:bg-zinc-700 transition-all"
              >
                {t('auth.returnToLogin') || 'Return to login'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  <Mail size={16} className="inline mr-2" />
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-zinc-800/50 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                />
              </div>

<button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    {t('common.loading')}
                  </>
                ) : (
                  t('auth.sendResetLink') || 'Send Reset Link'
                )}
              </button>

              <div className="text-center">
                <p className="text-zinc-500 text-sm">
                  {t('auth.rememberPassword') || 'Remember your password?'}{" "}
                  <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
                    {t('auth.signIn')}
                  </Link>
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
