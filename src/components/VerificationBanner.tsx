import { useState } from 'react';
import { MailCheck, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function VerificationBanner() {
  const { user, needsEmailVerification, resendVerification, reloadAuthUser } = useAuth();
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!needsEmailVerification || !user) return null;

  const handleResend = async () => {
    setBusy(true);
    setStatusMsg(null);
    try {
      await resendVerification();
      setStatusMsg('Verification email sent. Please check your inbox.');
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Could not resend verification email.');
    } finally {
      setBusy(false);
    }
  };

  const handleRefresh = async () => {
    setBusy(true);
    setStatusMsg(null);
    try {
      const verified = await reloadAuthUser();
      if (!verified) {
        setStatusMsg('Email not verified yet. Please click the link in your inbox first.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-[#171714] border-b border-[#F59E0B]/40">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3 text-sm">
          <MailCheck className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5 sm:mt-0" />
          <div>
            <span className="text-white font-medium">Verify your email ({user.email})</span>
            <span className="text-[#A3A3A3]">
              {' '}to publish posts, showcase projects, and apply to collaborate.
            </span>
            {statusMsg && <p className="text-xs text-[#F59E0B] mt-1">{statusMsg}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={busy}
            onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F59E0B] text-[#090909] text-xs font-semibold hover:bg-[#F59E0B]/90 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            I&apos;ve Verified
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleResend}
            className="px-3 py-1.5 rounded-lg border border-[#292923] text-xs font-medium text-white hover:bg-[#292923] disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            Resend Email
          </button>
        </div>
      </div>
    </div>
  );
}
