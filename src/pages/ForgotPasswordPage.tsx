import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { Logo, ThemeToggle } from '@/components/nextoffice/shared';
import { supabase } from '@/lib/supabase';
import { Check, Mail, Loader2, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ForgotPasswordPage: React.FC = () => {
  const { isDark, toggle } = useTheme();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    if (!email) {
      setError('Please enter your email');
      setIsLoading(false);
      return;
    }
    
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (resetError) {
        setError('Failed to send reset email');
        setIsLoading(false);
        return;
      }
      
      setEmailSent(true);
    } catch (err) {
      setError('An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-background text-foreground transition-colors duration-200 relative overflow-hidden">
      {/* Background gradient blobs */}
      <div className="absolute top-0 left-0 w-72 h-72 bg-primary/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

      {/* Theme toggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10">
        <ThemeToggle isDark={isDark} toggle={toggle} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-sm"
      >
        <div className="rounded-2xl border border-border bg-card shadow-2xl shadow-black/5 overflow-hidden">
          {/* Gradient top bar */}
          <div className="h-1 w-full bg-gradient-to-r from-primary via-blue-500 to-primary" />

          <div className="p-6 sm:p-8">
            <AnimatePresence mode="wait">
              {emailSent ? (
                /* ── Success state ── */
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                  className="text-center py-4"
                >
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-primary/25">
                    <Check size={30} className="text-white" />
                  </div>
                  <h1 className="text-xl font-bold mb-2">Check your email</h1>
                  <p className="text-sm text-muted-foreground mb-1">
                    We sent a reset link to
                  </p>
                  <p className="text-sm font-semibold text-primary mb-6 truncate">{email}</p>
                  <button
                    onClick={() => navigate('/signin')}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-blue-600 text-white font-semibold text-sm hover:opacity-90 transition-all active:scale-[0.98] shadow-lg shadow-primary/20"
                  >
                    Back to Sign In
                  </button>
                </motion.div>
              ) : (
                /* ── Form state ── */
                <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {/* Logo + heading */}
                  <div className="text-center mb-8">
                    <div className="flex justify-center mb-5">
                      <Logo />
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <Mail size={22} className="text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold mb-1">Reset password</h1>
                    <p className="text-sm text-muted-foreground">
                      Enter your email and we'll send you a reset link
                    </p>
                  </div>

                  {/* Error */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-5 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 text-sm"
                    >
                      {error}
                    </motion.div>
                  )}

                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                        Email
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="you@example.co.za"
                        disabled={isLoading}
                        className="w-full px-4 py-3 rounded-xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm disabled:opacity-50"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary to-blue-600 text-white font-semibold text-sm hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-primary/25 mt-2"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          Send Reset Link
                          <ArrowRight size={16} />
                        </>
                      )}
                    </button>
                  </form>

                  <div className="mt-6 text-center">
                    <button
                      type="button"
                      onClick={() => navigate('/signin')}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      ← Back to sign in
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <p className="text-center text-[11px] text-muted-foreground/50 mt-5">
          Built in South Africa · © 2026 Trailbill<span className="text-primary/50">.com</span>
        </p>
      </motion.div>
    </div>
  );
};

export default ForgotPasswordPage;
