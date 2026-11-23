import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Check,
  Heart,
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

interface PostCardProps {
  post: Post;
  onRequireAuth?: () => void;
}

export function PostCard({ post, onRequireAuth }: PostCardProps) {
  const { user, profile, isVerified } = useAuth();
  const isOwner = Boolean(profile && profile.userId === post.authorId);

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
  const [editContent, setEditContent] = useState(post.content);
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
    const contentErr = validatePostContent(editContent);
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
        content: editContent,
        projectUrl: editProjectUrl,
      });
      setEditing(false);
      setActionSuccess('Post updated.');
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

  return (
    <article className="bg-[#171714] border border-[#292923] rounded-xl p-5 sm:p-6 transition-colors hover:border-[#292923]/90">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <Link
          to={`/u/${post.authorUsername}`}
          className="flex items-center gap-3 group min-w-0"
        >
          <SafeImage
            src={post.authorAvatarUrl}
            alt={post.authorDisplayName}
            fallbackLabel={post.authorDisplayName}
            variant="avatar"
            className="w-10 h-10 rounded-full object-cover border border-[#292923] shrink-0"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="text-sm font-semibold text-white group-hover:text-[#F59E0B] transition-colors truncate">
                {post.authorDisplayName}
              </span>
              <span className="text-xs text-[#A3A3A3] font-mono truncate">
                @{post.authorUsername}
              </span>
              <span className="text-xs text-[#A3A3A3]" aria-hidden="true">
                ·
              </span>
              <time className="text-xs text-[#A3A3A3] font-mono">
                {formatRelativeOrDate(post.createdAt)}
              </time>
            </div>
          </div>
        </Link>

        {isOwner && !editing && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              aria-label="Edit post"
              onClick={() => {
                setEditContent(post.content);
                setEditProjectUrl(post.projectUrl);
                setEditing(true);
                setConfirmDelete(false);
              }}
              className="p-2 rounded-lg text-[#A3A3A3] hover:text-white hover:bg-[#292923] transition-colors"
            >
              <Pencil className="w-4 h-4" />
            </button>
            {confirmDelete ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDeletePost}
                  className="px-2.5 py-1 rounded-lg bg-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/30 transition-colors"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="p-1.5 rounded-lg text-[#A3A3A3] hover:text-white"
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
                className="p-2 rounded-lg text-[#A3A3A3] hover:text-red-400 hover:bg-[#292923] transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Content or Edit form */}
      {editing ? (
        <form onSubmit={handleSaveEdit} className="mt-4 space-y-3">
          <div>
            <label htmlFor={`edit-post-${post.id}`} className="sr-only">
              Edit post text
            </label>
            <textarea
              id={`edit-post-${post.id}`}
              rows={4}
              maxLength={600}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full rounded-lg bg-[#090909] border border-[#292923] px-3.5 py-2.5 text-sm text-white placeholder-[#A3A3A3]/60 focus:border-[#F59E0B] focus:outline-none"
            />
            <div className="mt-1 flex items-center justify-between text-xs font-mono">
              <span className={countTextLines(editContent) > 5 ? 'text-red-400' : 'text-[#A3A3A3]'}>
                {countTextLines(editContent)}/5 lines
              </span>
              <span className="text-[#A3A3A3] tabular-nums">{editContent.length}/600</span>
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
              className="w-full rounded-lg bg-[#090909] border border-[#292923] px-3.5 py-2 text-sm text-white placeholder-[#A3A3A3]/60 focus:border-[#F59E0B] focus:outline-none"
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="px-3.5 py-1.5 rounded-lg border border-[#292923] text-xs font-medium text-[#A3A3A3] hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editSaving}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#F59E0B] text-[#090909] text-xs font-semibold hover:bg-[#F59E0B]/90 disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              {editSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      ) : (
        <>
          <p className="mt-4 text-[15px] leading-relaxed text-white/95 whitespace-pre-line break-words">
            {post.content}
          </p>

          {safeProjectHref && (
            <a
              href={safeProjectHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3.5 flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg bg-[#090909] border border-[#292923] hover:border-[#F59E0B]/60 transition-colors group"
            >
              <span className="text-xs font-mono text-[#A3A3A3] group-hover:text-white truncate">
                {safeProjectHref}
              </span>
              <ArrowUpRight className="w-4 h-4 text-[#F59E0B] shrink-0" />
            </a>
          )}
        </>
      )}

      {actionError && (
        <p role="alert" className="mt-3 text-xs text-red-400">
          {actionError}
        </p>
      )}

      {actionSuccess && (
        <p role="status" className="mt-3 text-xs text-emerald-400">
          {actionSuccess}
        </p>
      )}

      {/* Actions bar */}
      <div className="mt-4 pt-3.5 border-t border-[#292923]/70 flex items-center gap-5">
        <button
          type="button"
          onClick={handleToggleLike}
          disabled={likePending}
          aria-pressed={liked}
          className={`inline-flex items-center gap-2 text-xs font-medium transition-colors py-1 px-2 -ml-2 rounded-lg hover:bg-[#292923]/60 ${
            liked ? 'text-[#F59E0B]' : 'text-[#A3A3A3] hover:text-white'
          }`}
        >
          <Heart className={`w-4 h-4 ${liked ? 'fill-[#F59E0B]' : ''}`} />
          <span className="tabular-nums font-mono">{post.likesCount}</span>
          <span>{post.likesCount === 1 ? 'Like' : 'Likes'}</span>
        </button>

        <button
          type="button"
          onClick={() => setCommentsOpen((prev) => !prev)}
          aria-expanded={commentsOpen}
          className={`inline-flex items-center gap-2 text-xs font-medium transition-colors py-1 px-2 rounded-lg hover:bg-[#292923]/60 ${
            commentsOpen ? 'text-white' : 'text-[#A3A3A3] hover:text-white'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span className="tabular-nums font-mono">{commentCount}</span>
          <span>{commentCount === 1 ? 'Comment' : 'Comments'}</span>
        </button>
      </div>

      {/* Comments Drawer */}
      {commentsOpen && (
        <div className="mt-4 pt-4 border-t border-[#292923] space-y-4">
          {commentsLoading ? (
            <p className="text-xs text-[#A3A3A3]">Loading comments...</p>
          ) : comments.length === 0 ? (
            <p className="text-xs text-[#A3A3A3]">No comments yet. Start the conversation below.</p>
          ) : (
            <ul className="space-y-3">
              {comments.map((c) => (
                <li
                  key={c.id}
                  className="flex items-start justify-between gap-3 bg-[#090909]/70 rounded-lg px-3.5 py-2.5"
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <SafeImage
                      src={c.authorAvatarUrl}
                      alt={c.authorDisplayName}
                      fallbackLabel={c.authorDisplayName}
                      variant="avatar"
                      className="w-7 h-7 rounded-full object-cover border border-[#292923] shrink-0 mt-0.5"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 text-xs">
                        <Link
                          to={`/u/${c.authorUsername}`}
                          className="font-semibold text-white hover:text-[#F59E0B]"
                        >
                          {c.authorDisplayName}
                        </Link>
                        <span className="text-[#A3A3A3] font-mono">
                          {formatRelativeOrDate(c.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-white/90 mt-1 break-words">{c.content}</p>
                    </div>
                  </div>
                  {profile?.userId === c.authorId && (
                    confirmCommentDeleteId === c.id ? (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={deletingCommentId === c.id}
                          onClick={() => handleDeleteComment(c.id)}
                          className="px-2 py-1 rounded bg-red-500/20 text-red-400 text-[11px] font-medium hover:bg-red-500/30 disabled:opacity-50"
                        >
                          {deletingCommentId === c.id ? 'Deleting...' : 'Delete'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmCommentDeleteId(null)}
                          aria-label="Cancel comment delete"
                          className="p-1 rounded text-[#A3A3A3] hover:text-white"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        aria-label="Delete comment"
                        onClick={() => setConfirmCommentDeleteId(c.id)}
                        className="p-1.5 rounded text-[#A3A3A3] hover:text-red-400 shrink-0"
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
            <form onSubmit={handleAddComment} className="flex items-center gap-2">
              <label htmlFor={`comment-input-${post.id}`} className="sr-only">
                Write a comment
              </label>
              <input
                id={`comment-input-${post.id}`}
                type="text"
                maxLength={500}
                placeholder="Write a supportive comment..."
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                className="flex-1 rounded-lg bg-[#090909] border border-[#292923] px-3.5 py-2 text-sm text-white placeholder-[#A3A3A3]/60 focus:border-[#F59E0B] focus:outline-none"
              />
              <button
                type="submit"
                disabled={commentSubmitting || !commentDraft.trim()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#F59E0B] text-[#090909] text-xs font-semibold hover:bg-[#F59E0B]/90 disabled:opacity-50 transition-colors shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                Reply
              </button>
            </form>
          ) : (
            <p className="text-xs text-[#A3A3A3]">
              <Link to="/auth" className="text-[#F59E0B] hover:underline">
                Sign in
              </Link>{' '}
              with a verified account to leave a comment.
            </p>
          )}
        </div>
      )}
    </article>
  );
}
