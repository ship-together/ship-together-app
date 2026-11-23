import { Timestamp } from 'firebase/firestore';
import { HERO_DESK_IMAGE, PRESET_PROJECT_COVERS } from '../types/domain';

const PRESET_COVER_SET = new Set(PRESET_PROJECT_COVERS.map((c) => c.url));
export const MAX_IMAGE_DATA_URL_LENGTH = 280_000;
const SAFE_RASTER_DATA_URL_RE =
  /^data:image\/(webp|jpeg|png|gif);base64,[A-Za-z0-9+/=]+$/;
const SAFE_LOCAL_IMAGE_RE =
  /^\/(?:src\/assets\/)?images\/[a-zA-Z0-9_-]+\.(?:jpg|jpeg|png|webp|svg)$/;

function isLocalBundledImage(trimmed: string): boolean {
  return (
    trimmed === HERO_DESK_IMAGE ||
    PRESET_COVER_SET.has(trimmed) ||
    SAFE_LOCAL_IMAGE_RE.test(trimmed)
  );
}

export function isSafeHttpUrl(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return true;
  if (isLocalBundledImage(trimmed)) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function isSafeImageUrl(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return true;
  if (isLocalBundledImage(trimmed)) return true;
  if (SAFE_RASTER_DATA_URL_RE.test(trimmed)) {
    return trimmed.length <= MAX_IMAGE_DATA_URL_LENGTH;
  }
  if (trimmed.length > 500) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function normalizeExternalHref(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

export function isValidUsername(username: string): boolean {
  return /^[a-z0-9_]{3,30}$/.test(username);
}

export function sanitizeUsernameCandidate(seed: string): string {
  const cleaned = seed
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (cleaned.length >= 3) {
    return cleaned.slice(0, 22);
  }
  return `builder_${cleaned || 'dev'}`.slice(0, 22);
}

export function countTextLines(value: string): number {
  if (!value) return 0;
  return value.split(/\r?\n/).length;
}

export function validatePostContent(content: string): string | null {
  const trimmed = content.trim();
  if (!trimmed) return 'Post content cannot be empty.';
  if (trimmed.length > 600) return 'Post must be 600 characters or fewer.';
  if (countTextLines(trimmed) > 5) {
    return 'Posts are limited to a maximum of 5 lines.';
  }
  return null;
}

export function parseCommaList(input: string, maxItems: number): string[] {
  const seen = new Set<string>();
  const items: string[] = [];
  for (const part of input.split(',')) {
    const clean = part.trim().slice(0, 40);
    if (clean && !seen.has(clean.toLowerCase())) {
      seen.add(clean.toLowerCase());
      items.push(clean);
      if (items.length >= maxItems) break;
    }
  }
  return items;
}

export function formatRelativeOrDate(ts: Timestamp | null | undefined): string {
  if (!ts) return 'Just now';
  const date = ts.toDate();
  const diffSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSeconds < 60) return 'Just now';
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)}d ago`;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'ST';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
