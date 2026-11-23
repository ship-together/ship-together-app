import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle2, KeyRound, Mail } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { APP_LOGO_URL } from '../types/domain';

type AuthMode = 'login' | 'signup' | 'reset';

export function AuthPage() {
  const {
    user,
    needsEmailVerification,
    authError,
    clearAuthError,
    signInWithGoogle,
    loginWithEmail,
    registerWithEmail,
    resetPassword,
  } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo =
    (location.state as { from?: string } | null)?.from || '/community';

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  useEffect(() => {
    if (user && !needsEmailVerification) {
      navigate(redirectTo, { replace: true });
    }
  }, [user, needsEmailVerification, navigate, redirectTo]);

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setLocalError(null);
    setSuccessNotice(null);
    clearAuthError();
  };

  const handleGoogleSignIn = async () => {
    setLocalError(null);
    setSuccessNotice(null);
    setSubmitting(true);
    try {
      await signInWithGoogle();
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Google sign-in failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setSuccessNotice(null);

    if (!email.trim() || !email.includes('@')) {
      setLocalError('Please enter a valid email address.');
      return;
    }

    if (mode !== 'reset' && password.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return;
    }

    if (mode === 'signup' && !displayName.trim()) {
      setLocalError('Please enter your display name.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        await loginWithEmail({ email, password });
        navigate(redirectTo, { replace: true });
      } else if (mode === 'signup') {
        await registerWithEmail({ email, password, displayName });
        setSuccessNotice(
          'Account created! We sent a verification link to your email. Click it, then refresh your status above.'
        );
      } else {
        await resetPassword(email);
        setSuccessNotice(
          'Password reset email sent. Check your inbox for instructions.'
        );
      }
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Action failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const displayError = localError || authError;

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12 sm:py-20">
      <div className="max-w-md mx-auto bg-[#171714] border border-[#292923] rounded-xl p-6 sm:p-8">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full overflow-hidden border border-[#292923] bg-white flex items-center justify-center">
            <img
              src={APP_LOGO_URL}
              alt="Ship Together logo"
              className="w-full h-full object-cover scale-[1.26]"
            />
          </div>
          <h1 className="font-display text-2xl font-bold text-white tracking-tight">
            {mode === 'login'
              ? 'Welcome back'
              : mode === 'signup'
                ? 'Join Ship Together'
                : 'Reset your password'}
          </h1>
          <p className="mt-2 text-sm text-[#A3A3A3]">
            {mode === 'login'
              ? 'Email & password login is available below, or continue with Google.'
              : mode === 'signup'
                ? 'Create your builder account with email & password or Google.'
                : 'Enter your email and we will send a password reset link.'}
          </p>
        </div>

        {/* Mode Segmented Control */}
        <div className="mt-6 grid grid-cols-3 gap-1 p-1 rounded-lg bg-[#090909] border border-[#292923]">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`py-2 text-xs font-medium rounded-md transition-colors ${
              mode === 'login'
                ? 'bg-[#292923] text-white'
                : 'text-[#A3A3A3] hover:text-white'
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => switchMode('signup')}
            className={`py-2 text-xs font-medium rounded-md transition-colors ${
              mode === 'signup'
                ? 'bg-[#292923] text-white'
                : 'text-[#A3A3A3] hover:text-white'
            }`}
          >
            Sign Up
          </button>
          <button
            type="button"
            onClick={() => switchMode('reset')}
            className={`py-2 text-xs font-medium rounded-md transition-colors ${
              mode === 'reset'
                ? 'bg-[#292923] text-white'
                : 'text-[#A3A3A3] hover:text-white'
            }`}
          >
            Reset
          </button>
        </div>

        {mode !== 'reset' && (
          <div className="mt-6 space-y-2.5">
            <button
              type="button"
              disabled={submitting}
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-lg bg-white text-[#090909] text-sm font-semibold hover:bg-white/90 disabled:opacity-50 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                />
              </svg>
              Continue with Google
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#292923]" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-[#171714] px-3 text-[#A3A3A3]">or with email &amp; password</span>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {mode === 'signup' && (
            <div>
              <label htmlFor="auth-display-name" className="block text-xs font-medium text-[#A3A3A3] mb-1.5">
                Display Name
              </label>
              <input
                id="auth-display-name"
                type="text"
                maxLength={60}
                required
                placeholder="Alex Rivera"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full rounded-lg bg-[#090909] border border-[#292923] px-3.5 py-2.5 text-sm text-white placeholder-[#A3A3A3]/50 focus:border-[#F59E0B] focus:outline-none"
              />
            </div>
          )}

          <div>
            <label htmlFor="auth-email" className="block text-xs font-medium text-[#A3A3A3] mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#A3A3A3] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="auth-email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg bg-[#090909] border border-[#292923] pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-[#A3A3A3]/50 focus:border-[#F59E0B] focus:outline-none"
              />
            </div>
          </div>

          {mode !== 'reset' && (
            <div>
              <label htmlFor="auth-password" className="block text-xs font-medium text-[#A3A3A3] mb-1.5">
                Password
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-[#A3A3A3] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="auth-password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg bg-[#090909] border border-[#292923] pl-10 pr-3.5 py-2.5 text-sm text-white placeholder-[#A3A3A3]/50 focus:border-[#F59E0B] focus:outline-none"
                />
              </div>
            </div>
          )}

          {displayError && (
            <div
              role="alert"
              className="rounded-lg bg-red-500/10 border border-red-500/30 px-3.5 py-2.5 text-xs text-red-300 leading-relaxed"
            >
              {displayError}
            </div>
          )}

          {successNotice && (
            <div
              role="status"
              className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-2.5 text-xs text-emerald-300 flex items-start gap-2 leading-relaxed"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successNotice}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#F59E0B] text-[#090909] text-sm font-semibold hover:bg-[#F59E0B]/90 disabled:opacity-50 transition-colors"
          >
            {submitting
              ? 'Please wait...'
              : mode === 'login'
                ? 'Log In'
                : mode === 'signup'
                  ? 'Create Account'
                  : 'Send Reset Email'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
