import { useEffect, useState } from 'react';
import { Layers } from 'lucide-react';
import { getInitials, isSafeImageUrl } from '../lib/validators';

interface SafeImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
  variant?: 'cover' | 'avatar';
}

export function SafeImage({
  src,
  alt,
  className = '',
  fallbackLabel = '',
  variant = 'cover',
}: SafeImageProps) {
  const [failed, setFailed] = useState(false);
  const normalizedSrc = src?.startsWith('/src/assets/images/')
    ? src.replace('/src/assets/images/', '/images/')
    : src;

  useEffect(() => {
    setFailed(false);
  }, [normalizedSrc]);

  const validSrc = Boolean(
    normalizedSrc && normalizedSrc.trim() && !failed && isSafeImageUrl(normalizedSrc)
  );

  if (!validSrc) {
    if (variant === 'avatar') {
      return (
        <div
          aria-label={alt}
          className={`flex items-center justify-center bg-[#292923] text-[#F59E0B] font-semibold select-none ${className}`}
        >
          <span className="text-xs tracking-wide">{getInitials(fallbackLabel || alt)}</span>
        </div>
      );
    }

    return (
      <div
        aria-label={alt}
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#171714] via-[#292923]/60 to-[#090909] text-[#A3A3A3] select-none p-6 ${className}`}
      >
        <Layers className="w-7 h-7 text-[#F59E0B]/70 mb-2" />
        {fallbackLabel && (
          <span className="text-xs text-[#A3A3A3] text-center line-clamp-1 max-w-[200px]">
            {fallbackLabel}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={normalizedSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
