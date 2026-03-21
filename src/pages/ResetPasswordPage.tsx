import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import { Logo, ThemeToggle } from '@/components/nextoffice/shared';
import { supabase } from '@/lib/supabase';
import { Check, Lock, Loader2, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ResetPasswordPage: React.FC = () => {
  const { isDark, toggle } = useTheme();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState(false);

  useEffect(() => {
    // Supabase redirects here with a token in the URL hash.
    // The supabase client automatically picks up the recovery token
    // and establishes a session via onAuthStateChange.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true);
      }
    });

    // Also check if there's already a session (e.g. token was already processed)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionReady(true);
    });

    // If no session after 5 seconds, show error
    const timeout = setTimeout(() => {
      setSessionReady(prev => {
        if (!prev) setSessionError(true);
        return prev;
      });
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!password || !confirmPassword) {
      setError('Please fill in both fields');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      setSuccess(true);
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-background text-foreground transition-colors duration-200 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-72 h-72 bg-primary/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />

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
          <div className="h-1 w-full bg-gradient-to-r from-primary via-blue-500 to-primary" />

          <div className="p-6 sm:p-8">
            <AnimatePresence mode="wait">
              {success ? (
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
                  <h1 className="text-xl font-bold mb-2">Password updated!</h1>
                  <p className="text-sm text-muted-foreground mb-6">
                    Your password has been changed successfully. You can now sign in with your new password.
                  </p>
                  <button
                    onClick={() => navigate('/signin')}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-blue-600 text-white font-semibold text-sm hover:opacity-90 transition-all active:scale-[0.98] shadow-lg shadow-primary/20"
                  >
                    Sign In
                  </button>
                </motion.div>
              ) : sessionError ? (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
                  className="text-center py-4"
                >
                  <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-950/30 flex items-center justify-center mx-auto mb-5">
                    <Lock size={30} className="text-red-500" />
                  </div>
                  <h1 className="text-xl font-bold mb-2">Link expired</h1>
                  <p className="text-sm text-muted-foreground mb-6">
                    This reset link has expired or is invalid. Please request a new one.
                  </p>
                  <button
                    onClick={() => navigate('/forgot-password')}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-blue-600 text-white font-semibold text-sm hover:opacity-90 transition-all active:scale-[0.98] shadow-lg shadow-primary/20"
                  >
                    Request New Link
                  </button>
                </motion.div>
              ) : !sessionReady ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-8"
                >
                  <Loader2 size={32} className="animate-spin text-primary mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">Verifying reset link...</p>
                </motion.div>
              ) : (
                <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="text-center mb-8">
                    <div className="flex justify-center mb-5">
                      <Logo />
                    </div>
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <Lock size={22} className="text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold mb-1">Set new password</h1>
                    <p className="text-sm text-muted-foreground">
                      Choose a strong password for your account
                    </p>
                  </div>

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
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          placeholder="Min 6 characters"
                          disabled={isLoading}
                          className="w-full px-4 py-3 pr-10 rounded-xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm disabled:opacity-50"
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirm ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter your password"
                          disabled={isLoading}
                          className="w-full px-4 py-3 pr-10 rounded-xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm disabled:opacity-50"
                        />
                        <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-primary to-blue-600 text-white font-semibold text-sm hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-primary/25 mt-2"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Updating...
                        </>
                      ) : (
                        'Update Password'
                      )}
                    </button>
                  </form>
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

export default ResetPasswordPage;
