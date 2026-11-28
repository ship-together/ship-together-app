import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Check,
  Heart,
  Link2,
  MessageSquare,
  Pencil,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import {
  addComment,
  deleteComment,
  deletePost,
  getPostCommentCount,
  hasUserLikedPost,
  subscribeComments,
  toggleLikePost,
  updatePost,
} from '../lib/api';
import {
  countTextLines,
  formatRelativeOrDate,
  isSafeHttpUrl,
  normalizeExternalHref,
  validatePostContent,
} from '../lib/validators';
import { useAuth } from '../context/AuthContext';
import type { Post, PostComment } from '../types/domain';
import { SafeImage } from './SafeImage';

export type PostIntent = 'Shipping' | 'Need Help' | 'Looking for Teammate' | 'TIL';

export const POST_INTENTS: PostIntent[] = [
  'Shipping',
  'Need Help',
  'Looking for Teammate',
  'TIL',
];

const INTENT_PREFIX_RE = /^\[(Shipping|Need Help|Looking for Teammate|TIL)\]\s*/;

export function parsePostContentAndIntent(rawContent: string): {
  intent: PostIntent | null;
  body: string;
} {
  const match = rawContent.match(INTENT_PREFIX_RE);
  if (!match) {
    return { intent: null, body: rawContent };
  }
  return {
    intent: match[1] as PostIntent,
    body: rawContent.slice(match[0].length),
  };
}

export function formatPostContentWithIntent(
  body: string,
  intent: PostIntent | null
): string {
  const trimmedBody = body.trim();
  if (!intent) return trimmedBody;
  return `[${intent}] ${trimmedBody}`;
}

interface PostCardProps {
  post: Post;
  onRequireAuth?: () => void;
}

function parseUrlDisplay(href: string): { host: string; path: string } {
  try {
    const parsed = new URL(href);
    const host = parsed.hostname.replace(/^www\./, '');
    const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    return {
      host,
      path: path === '/' ? '' : path,
    };
  } catch {
    return { host: href, path: '' };
  }
}

export function PostCard({ post, onRequireAuth }: PostCardProps) {
  const { user, profile, isVerified } = useAuth();
  const isOwner = Boolean(profile && profile.userId === post.authorId);

  const parsedPost = parsePostContentAndIntent(post.content);

  const [liked, setLiked] = useState(false);
  const [likePending, setLikePending] = useState(false);
  const [commentCount, setCommentCount] = useState<number>(0);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<PostComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentDraft, setCommentDraft] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [confirmCommentDeleteId, setConfirmCommentDeleteId] = useState<string | null>(null);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Edit mode state
  const [editing, setEditing] = useState(false);
  const [editIntent, setEditIntent] = useState<PostIntent | null>(parsedPost.intent);
  const [editContent, setEditContent] = useState(parsedPost.body);
  const [editProjectUrl, setEditProjectUrl] = useState(post.projectUrl);
  const [editSaving, setEditSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    getPostCommentCount(post.id)
      .then((count) => {
        if (active) setCommentCount(count);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [post.id]);

  useEffect(() => {
    let active = true;
    if (!isVerified || !user) {
      setLiked(false);
      return;
    }
    hasUserLikedPost(post.id, user.uid)
      .then((res) => {
        if (active) setLiked(res);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [post.id, user, isVerified]);

  useEffect(() => {
    if (!commentsOpen) return;
    setCommentsLoading(true);
    const unsub = subscribeComments(
      post.id,
      (items) => {
        setComments(items);
        setCommentCount(items.length);
        setCommentsLoading(false);
      },
      (err) => {
        setActionError(err.message);
        setCommentsLoading(false);
      }
    );
    return unsub;
  }, [commentsOpen, post.id]);

  const handleToggleLike = async () => {
    if (!profile || !isVerified) {
      onRequireAuth?.();
      return;
    }
    if (likePending) return;
    setActionError(null);
    setLikePending(true);
    const prevLiked = liked;
    setLiked(!prevLiked);
    try {
      await toggleLikePost(post.id, profile.userId, prevLiked, post.likesCount);
    } catch {
      setLiked(prevLiked);
      setActionError('Could not update like. Please try again.');
    } finally {
      setLikePending(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !isVerified) {
      onRequireAuth?.();
      return;
    }
    const clean = commentDraft.trim();
    if (!clean) return;
    if (clean.length > 500) {
      setActionError('Comment must be 500 characters or fewer.');
      return;
    }
    setActionError(null);
    setCommentSubmitting(true);
    try {
      await addComment(post.id, profile, clean);
      setCommentDraft('');
    } catch {
      setActionError('Failed to post comment.');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    setActionError(null);
    setActionSuccess(null);
    setDeletingCommentId(commentId);
    try {
      await deleteComment(post.id, commentId);
      setConfirmCommentDeleteId(null);
    } catch {
      setActionError('Failed to delete comment.');
    } finally {
      setDeletingCommentId(null);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!editContent.trim()) {
      setActionError('Post content cannot be empty.');
      return;
    }
    const combinedContent = formatPostContentWithIntent(editContent, editIntent);
    const contentErr = validatePostContent(combinedContent);
    if (contentErr) {
      setActionError(contentErr);
      return;
    }
    if (!isSafeHttpUrl(editProjectUrl)) {
      setActionError('Project URL must start with https:// or http://.');
      return;
    }
    setActionError(null);
    setActionSuccess(null);
    setEditSaving(true);
    try {
      await updatePost(post.id, profile, {
        content: combinedContent,
        projectUrl: editProjectUrl,
      });
      setEditing(false);
      setActionSuccess('Log updated.');
    } catch {
      setActionError('Failed to save post changes.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeletePost = async () => {
    setDeleting(true);
    try {
      await deletePost(post.id);
    } catch {
      setActionError('Failed to delete post.');
      setDeleting(false);
    }
  };

  const safeProjectHref = normalizeExternalHref(post.projectUrl);
  const parsedLink = safeProjectHref ? parseUrlDisplay(safeProjectHref) : null;
  const editPrefixLength = editIntent ? editIntent.length + 3 : 0;
  const maxEditBodyLength = 600 - editPrefixLength;

  return (
    <article className="group/card py-5 border-b border-white/10">
      <div className="flex items-start gap-3.5">
        <Link to={`/u/${post.authorUsername}`} className="shrink-0 mt-0.5">
          <SafeImage
            src={post.authorAvatarUrl}
            alt={post.authorDisplayName}
            fallbackLabel={post.authorDisplayName}
            variant="avatar"
            className="w-9 h-9 rounded-full object-cover border border-white/10"
          />
        </Link>

        <div className="flex-1 min-w-0">
          {/* Author / Handle / Timestamp / Intent Metadata & Owner Actions */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 min-w-0">
              <Link
                to={`/u/${post.authorUsername}`}
                className="text-[14.5px] font-semibold text-[#FAFAFA] hover:underline truncate"
              >
                {post.authorDisplayName}
              </Link>
              <Link
                to={`/u/${post.authorUsername}`}
                className="text-xs text-[#A1A1AA] font-mono truncate hover:text-[#FAFAFA] transition-colors"
              >
                @{post.authorUsername}
              </Link>
              <span className="text-xs text-[#A1A1AA]/40" aria-hidden="true">
                ·
              </span>
              <time className="text-[11.5px] text-[#A1A1AA] font-mono tabular-nums whitespace-nowrap">
                {formatRelativeOrDate(post.createdAt)}
              </time>
              {parsedPost.intent && !editing && (
                <>
                  <span className="text-xs text-[#A1A1AA]/40" aria-hidden="true">
                    ·
                  </span>
                  <span
                    className={`font-mono text-[11.5px] whitespace-nowrap ${
                      parsedPost.intent === 'Shipping' ||
                      parsedPost.intent === 'Looking for Teammate'
                        ? 'text-[#10B981]'
                        : 'text-[#FAFAFA]/80'
                    }`}
                  >
                    {parsedPost.intent}
                  </span>
                </>
              )}
            </div>

            {isOwner && !editing && (
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  aria-label="Edit post"
                  onClick={() => {
                    const latest = parsePostContentAndIntent(post.content);
                    setEditIntent(latest.intent);
                    setEditContent(latest.body);
                    setEditProjectUrl(post.projectUrl);
                    setEditing(true);
                    setConfirmDelete(false);
                    setActionError(null);
                  }}
                  className="p-1.5 rounded-md text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#27272A]/80 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                {confirmDelete ? (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      disabled={deleting}
                      onClick={handleDeletePost}
                      className="px-2 py-0.5 rounded-md bg-red-500/20 text-red-400 text-[11px] font-medium hover:bg-red-500/30 transition-colors"
                    >
                      {deleting ? 'Deleting...' : 'Delete'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="p-1 rounded-md text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#27272A]/80"
                      aria-label="Cancel delete"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    aria-label="Delete post"
                    onClick={() => setConfirmDelete(true)}
                    className="p-1.5 rounded-md text-[#A1A1AA] hover:text-red-400 hover:bg-[#27272A]/80 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Content or Edit form */}
          {editing ? (
            <form onSubmit={handleSaveEdit} className="mt-2.5 space-y-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-mono text-[11px] text-[#A1A1AA] mr-1">Tag:</span>
                {POST_INTENTS.map((intent) => {
                  const active = editIntent === intent;
                  return (
                    <button
                      key={intent}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setEditIntent(active ? null : intent)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-mono border transition-colors whitespace-nowrap shrink-0 ${
                        active
                          ? 'bg-[#27272A] border-white/25 text-[#FAFAFA]'
                          : 'bg-[#111114] border-white/10 text-[#A1A1AA] hover:text-[#FAFAFA] hover:border-white/20'
                      }`}
                    >
                      {intent}
                    </button>
                  );
                })}
              </div>

              <div>
                <label htmlFor={`edit-post-${post.id}`} className="sr-only">
                  Edit post text
                </label>
                <textarea
                  id={`edit-post-${post.id}`}
                  rows={4}
                  maxLength={maxEditBodyLength}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full rounded-lg bg-[#111114] border border-white/10 px-3 py-2 text-sm text-[#FAFAFA] placeholder-[#A1A1AA]/60 focus:border-white/35 focus:outline-none"
                />
                <div className="mt-1 flex items-center justify-between text-[11px] font-mono">
                  <span className={countTextLines(editContent) > 5 ? 'text-red-400' : 'text-[#A1A1AA]'}>
                    {countTextLines(editContent)}/5 lines
                  </span>
                  <span className="text-[#A1A1AA] tabular-nums">
                    {editContent.length + editPrefixLength}/600
                  </span>
                </div>
              </div>
              <div>
                <label htmlFor={`edit-url-${post.id}`} className="sr-only">
                  Attached project URL
                </label>
                <input
                  id={`edit-url-${post.id}`}
                  type="url"
                  placeholder="https://your-project-link.com (optional)"
                  value={editProjectUrl}
                  onChange={(e) => setEditProjectUrl(e.target.value)}
                  className="w-full rounded-lg bg-[#111114] border border-white/10 px-3 py-1.5 text-xs font-mono text-[#FAFAFA] placeholder-[#A1A1AA]/60 focus:border-white/35 focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setActionError(null);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-white/10 bg-[#27272A]/60 text-xs font-medium text-[#A1A1AA] hover:text-[#FAFAFA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#FAFAFA] text-[#09090B] text-xs font-semibold hover:bg-[#FAFAFA]/90 disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  {editSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          ) : (
            <>
              <p className="mt-2 text-[14.5px] leading-[1.65] text-zinc-200 whitespace-pre-line break-words max-w-[66ch]">
                {parsedPost.body}
              </p>

              {safeProjectHref && parsedLink && (
                <a
                  href={safeProjectHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg bg-[#111114] border border-white/10 hover:border-white/25 hover:bg-[#16161B] transition-colors group max-w-xl"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-7 h-7 rounded-md bg-[#27272A]/80 border border-white/[0.06] flex items-center justify-center shrink-0">
                      <Link2 className="w-3.5 h-3.5 text-[#A1A1AA] group-hover:text-[#FAFAFA] transition-colors" />
                    </span>
                    <div className="min-w-0 font-mono">
                      <div className="text-xs font-medium text-[#FAFAFA] truncate">
                        {parsedLink.host}
                      </div>
                      {parsedLink.path && (
                        <div className="text-[11px] text-[#A1A1AA] truncate">
                          {parsedLink.path}
                        </div>
                      )}
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-[#A1A1AA] group-hover:text-[#FAFAFA] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
                </a>
              )}
            </>
          )}

          {actionError && (
            <p role="alert" className="mt-2.5 text-xs text-red-400">
              {actionError}
            </p>
          )}

          {actionSuccess && (
            <p role="status" className="mt-2.5 text-xs text-[#10B981]">
              {actionSuccess}
            </p>
          )}

          {/* Crisp Actions Row */}
          <div className="mt-3.5 flex items-center gap-3">
            <button
              type="button"
              onClick={handleToggleLike}
              disabled={likePending}
              aria-pressed={liked}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 -ml-2.5 rounded-md text-xs font-medium transition-colors ${
                liked
                  ? 'bg-[#27272A]/80 text-[#FAFAFA]'
                  : 'text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#27272A]/50'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-[#FAFAFA]' : ''}`} />
              <span className="tabular-nums font-mono">{post.likesCount}</span>
              <span>{post.likesCount === 1 ? 'Like' : 'Likes'}</span>
            </button>

            <button
              type="button"
              onClick={() => setCommentsOpen((prev) => !prev)}
              aria-expanded={commentsOpen}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                commentsOpen
                  ? 'bg-[#27272A]/80 text-[#FAFAFA]'
                  : 'text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#27272A]/50'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="tabular-nums font-mono">{commentCount}</span>
              <span>{commentCount === 1 ? 'Reply' : 'Replies'}</span>
            </button>
          </div>

          {/* Replies Drawer */}
          {commentsOpen && (
            <div className="mt-3.5 pt-3 border-t border-white/[0.08] space-y-3">
              {commentsLoading ? (
                <p className="text-xs text-[#A1A1AA]">Loading replies...</p>
              ) : comments.length === 0 ? (
                <p className="text-xs text-[#A1A1AA]">No replies yet.</p>
              ) : (
                <ul className="divide-y divide-white/[0.06]">
                  {comments.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <SafeImage
                          src={c.authorAvatarUrl}
                          alt={c.authorDisplayName}
                          fallbackLabel={c.authorDisplayName}
                          variant="avatar"
                          className="w-6 h-6 rounded-full object-cover border border-white/10 shrink-0 mt-0.5"
                        />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-x-2 text-xs">
                            <Link
                              to={`/u/${c.authorUsername}`}
                              className="font-semibold text-[#FAFAFA] hover:underline"
                            >
                              {c.authorDisplayName}
                            </Link>
                            <span className="text-[#A1A1AA] font-mono text-[11px]">
                              {formatRelativeOrDate(c.createdAt)}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-[#FAFAFA]/90 mt-0.5 break-words">
                            {c.content}
                          </p>
                        </div>
                      </div>
                      {profile?.userId === c.authorId && (
                        confirmCommentDeleteId === c.id ? (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              disabled={deletingCommentId === c.id}
                              onClick={() => handleDeleteComment(c.id)}
                              className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-[11px] font-medium hover:bg-red-500/30 disabled:opacity-50"
                            >
                              {deletingCommentId === c.id ? 'Deleting...' : 'Delete'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmCommentDeleteId(null)}
                              aria-label="Cancel comment delete"
                              className="p-1 rounded text-[#A1A1AA] hover:text-[#FAFAFA]"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            aria-label="Delete comment"
                            onClick={() => setConfirmCommentDeleteId(c.id)}
                            className="p-1 rounded text-[#A1A1AA] hover:text-red-400 shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {profile && isVerified ? (
                <form onSubmit={handleAddComment} className="flex items-center gap-2 pt-1">
                  <label htmlFor={`comment-input-${post.id}`} className="sr-only">
                    Write a reply
                  </label>
                  <input
                    id={`comment-input-${post.id}`}
                    type="text"
                    maxLength={500}
                    placeholder="Add a reply..."
                    value={commentDraft}
                    onChange={(e) => setCommentDraft(e.target.value)}
                    className="flex-1 rounded-lg bg-[#111114] border border-white/10 px-3 py-1.5 text-sm text-[#FAFAFA] placeholder-[#A1A1AA]/55 focus:border-white/30 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={commentSubmitting || !commentDraft.trim()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FAFAFA] text-[#09090B] text-xs font-semibold hover:bg-[#FAFAFA]/90 disabled:opacity-50 transition-colors shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Reply
                  </button>
                </form>
              ) : (
                <p className="text-xs text-[#A1A1AA]">
                  <Link to="/auth" className="text-[#FAFAFA] hover:underline">
                    Sign in
                  </Link>{' '}
                  with a verified account to reply.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
