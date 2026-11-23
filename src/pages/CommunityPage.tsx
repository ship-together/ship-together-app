import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Link2, MessageSquarePlus, Search } from 'lucide-react';
import { createPost, subscribePosts } from '../lib/api';
import {
  countTextLines,
  isSafeHttpUrl,
  validatePostContent,
} from '../lib/validators';
import { useAuth } from '../context/AuthContext';
import type { Post } from '../types/domain';
import { PostCard } from '../components/PostCard';
import { SafeImage } from '../components/SafeImage';

export function CommunityPage() {
  const { profile, isVerified } = useAuth();
  const navigate = useNavigate();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Composer state
  const [content, setContent] = useState('');
  const [projectUrl, setProjectUrl] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsub = subscribePosts(
      (items) => {
        setPosts(items);
        setLoading(false);
        setFeedError(null);
      },
      (err) => {
        setFeedError(err.message || 'Unable to load community posts.');
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  const lineCount = countTextLines(content);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !isVerified) {
      navigate('/auth', { state: { from: '/community' } });
      return;
    }

    const validationError = validatePostContent(content);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    if (!isSafeHttpUrl(projectUrl)) {
      setFormError('Project URL must start with https:// or http://.');
      return;
    }

    setFormError(null);
    setPublishSuccess(null);
    setSubmitting(true);
    try {
      await createPost(profile, { content, projectUrl });
      setContent('');
      setProjectUrl('');
      setPublishSuccess('Update published to the community feed.');
    } catch {
      setFormError('Could not publish post. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPosts = posts.filter((p) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      p.content.toLowerCase().includes(q) ||
      p.authorDisplayName.toLowerCase().includes(q) ||
      p.authorUsername.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-10 sm:py-14">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main feed column */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Community Feed
              </h1>
              <p className="mt-1 text-sm text-[#A3A3A3]">
                Short build updates from developers, designers, and makers.
              </p>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-[#A3A3A3] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <label htmlFor="community-search" className="sr-only">
                Search posts
              </label>
              <input
                id="community-search"
                type="search"
                placeholder="Filter updates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg bg-[#171714] border border-[#292923] pl-9 pr-3.5 py-2 text-sm text-white placeholder-[#A3A3A3]/60 focus:border-[#F59E0B] focus:outline-none"
              />
            </div>
          </div>

          {/* Composer Card */}
          {profile && isVerified ? (
            <form
              onSubmit={handlePublish}
              className="bg-[#171714] border border-[#292923] rounded-xl p-5 sm:p-6 space-y-4"
            >
              <div className="flex items-start gap-3">
                <SafeImage
                  src={profile.avatarUrl}
                  alt={profile.displayName}
                  fallbackLabel={profile.displayName}
                  variant="avatar"
                  className="w-10 h-10 rounded-full object-cover border border-[#292923] shrink-0"
                />
                <div className="flex-1 space-y-3">
                  <div>
                    <label htmlFor="new-post-content" className="sr-only">
                      Share what you are building (max 5 lines)
                    </label>
                    <textarea
                      id="new-post-content"
                      rows={4}
                      maxLength={600}
                      placeholder="What are you building or shipping today? (Maximum 5 lines)"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      className="w-full rounded-lg bg-[#090909] border border-[#292923] px-3.5 py-2.5 text-sm text-white placeholder-[#A3A3A3]/60 focus:border-[#F59E0B] focus:outline-none resize-none"
                    />
                    <div className="mt-1.5 flex items-center justify-between text-xs font-mono">
                      <span className={lineCount > 5 ? 'text-red-400' : 'text-[#A3A3A3]'}>
                        {lineCount}/5 lines
                      </span>
                      <span className="text-[#A3A3A3] tabular-nums">
                        {content.length}/600
                      </span>
                    </div>
                  </div>

                  <div className="relative">
                    <Link2 className="w-4 h-4 text-[#A3A3A3] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <label htmlFor="new-post-url" className="sr-only">
                      Attach project URL (optional)
                    </label>
                    <input
                      id="new-post-url"
                      type="url"
                      maxLength={300}
                      placeholder="Attach project URL (optional, https://...)"
                      value={projectUrl}
                      onChange={(e) => setProjectUrl(e.target.value)}
                      className="w-full rounded-lg bg-[#090909] border border-[#292923] pl-9 pr-3.5 py-2 text-sm text-white placeholder-[#A3A3A3]/60 focus:border-[#F59E0B] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {formError && (
                <p role="alert" className="text-xs text-red-400">
                  {formError}
                </p>
              )}

              {publishSuccess && (
                <p role="status" className="text-xs text-emerald-400">
                  {publishSuccess}
                </p>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting || !content.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#F59E0B] text-[#090909] text-sm font-semibold hover:bg-[#F59E0B]/90 disabled:opacity-50 transition-colors"
                >
                  <MessageSquarePlus className="w-4 h-4" />
                  {submitting ? 'Publishing...' : 'Post Update'}
                </button>
              </div>
            </form>
          ) : (
            <div className="bg-[#171714] border border-[#292923] rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-white">
                  Share what you are building
                </h2>
                <p className="text-xs text-[#A3A3A3] mt-1">
                  Sign in with a verified account to publish updates, like posts, and comment.
                </p>
              </div>
              <Link
                to="/auth"
                state={{ from: '/community' }}
                className="px-4 py-2 rounded-lg bg-[#F59E0B] text-[#090909] text-xs font-semibold hover:bg-[#F59E0B]/90 transition-colors whitespace-nowrap shrink-0 text-center"
              >
                Sign Up / Log In
              </Link>
            </div>
          )}

          {/* Feed List */}
          {feedError && (
            <div
              role="alert"
              className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-300"
            >
              {feedError}
            </div>
          )}

          {loading ? (
            <div className="space-y-4">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="bg-[#171714] border border-[#292923] rounded-xl h-40 animate-pulse"
                />
              ))}
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="bg-[#171714] border border-[#292923] rounded-xl p-10 text-center">
              <h3 className="font-display text-lg font-semibold text-white">
                {searchTerm ? 'No matching updates found' : 'No community posts yet'}
              </h3>
              <p className="mt-2 text-sm text-[#A3A3A3]">
                {searchTerm
                  ? 'Try clearing your filter query.'
                  : 'Publish the first update above to kick off the conversation.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onRequireAuth={() => navigate('/auth', { state: { from: '/community' } })}
                />
              ))}
            </div>
          )}
        </div>

        {/* Helpful Community Guidelines Sidebar */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="bg-[#171714] border border-[#292923] rounded-xl p-6">
            <h2 className="font-display text-base font-semibold text-white">
              Community Guidelines
            </h2>
            <ul className="mt-4 space-y-3 text-sm text-[#A3A3A3] leading-relaxed">
              <li>Keep updates concise—up to five lines about what you built, learned, or shipped.</li>
              <li>Attach a project link when you want peers to test a demo or review code.</li>
              <li>Welcome beginners and experienced builders alike with constructive feedback.</li>
            </ul>
          </div>

          <div className="bg-[#171714] border border-[#292923] rounded-xl p-6">
            <h2 className="font-display text-base font-semibold text-white">
              Looking for teammates?
            </h2>
            <p className="mt-2 text-sm text-[#A3A3A3] leading-relaxed">
              Browse open collaboration requests for open-source repos, weekend builds, and study
              groups.
            </p>
            <Link
              to="/collaborate"
              className="mt-4 inline-block text-sm font-medium text-[#F59E0B] hover:underline"
            >
              Explore Collaborate Directory →
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
