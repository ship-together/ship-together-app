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
    <div className="bg-[#111114] border-b border-white/10">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3 text-sm">
          <MailCheck className="w-4 h-4 text-[#FAFAFA] shrink-0 mt-0.5 sm:mt-0" />
          <div>
            <span className="text-[#FAFAFA] font-medium">Verify your email ({user.email})</span>
            <span className="text-[#A1A1AA]">
              {' '}to publish posts, showcase projects, and apply to collaborate.
            </span>
            {statusMsg && <p className="text-xs text-[#A1A1AA] mt-1">{statusMsg}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={busy}
            onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FAFAFA] text-[#09090B] text-xs font-semibold hover:bg-[#FAFAFA]/90 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            I&apos;ve Verified
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleResend}
            className="px-3 py-1.5 rounded-lg border border-white/10 bg-[#27272A]/60 text-xs font-medium text-[#FAFAFA] hover:bg-[#27272A] disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            Resend Email
          </button>
        </div>
      </div>
    </div>
  );
}
