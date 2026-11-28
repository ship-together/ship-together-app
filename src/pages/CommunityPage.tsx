import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Link2, MessageSquarePlus, Search } from 'lucide-react';
import {
  createPost,
  STARTER_COLLABORATION_SEEDS,
  subscribeCollaborationRequests,
  subscribePosts,
  subscribeProjects,
} from '../lib/api';
import {
  countTextLines,
  isSafeHttpUrl,
  validatePostContent,
} from '../lib/validators';
import { useAuth } from '../context/AuthContext';
import type { CollaborationRequest, Post, Project } from '../types/domain';
import {
  formatPostContentWithIntent,
  parsePostContentAndIntent,
  POST_INTENTS,
  PostCard,
  type PostIntent,
} from '../components/PostCard';
import { SafeImage } from '../components/SafeImage';

export function CommunityPage() {
  const { profile, isVerified } = useAuth();
  const navigate = useNavigate();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [intentFilter, setIntentFilter] = useState<'All' | PostIntent>('All');

  // Sidebar interconnected previews
  const [openRoles, setOpenRoles] = useState<CollaborationRequest[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);

  // Composer state
  const [content, setContent] = useState('');
  const [selectedIntent, setSelectedIntent] = useState<PostIntent | null>(null);
  const [projectUrl, setProjectUrl] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsubPosts = subscribePosts(
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

    const unsubRoles = subscribeCollaborationRequests(
      (items) => {
        setOpenRoles(items.filter((r) => r.status === 'Open'));
        setRolesLoading(false);
      },
      () => {
        setRolesLoading(false);
      }
    );

    const unsubProjects = subscribeProjects(
      (items) => {
        setRecentProjects(items.slice(0, 3));
        setProjectsLoading(false);
      },
      () => {
        setProjectsLoading(false);
      },
      undefined,
      4
    );

    return () => {
      unsubPosts();
      unsubRoles();
      unsubProjects();
    };
  }, []);

  const lineCount = countTextLines(content);
  const isOverLineLimit = lineCount > 5;
  const intentPrefixLength = selectedIntent ? selectedIntent.length + 3 : 0;
  const maxBodyChars = 600 - intentPrefixLength;

  const submitBuildLog = async () => {
    if (!profile || !isVerified) {
      navigate('/auth', { state: { from: '/community' } });
      return;
    }

    if (!content.trim()) {
      setFormError('Post content cannot be empty.');
      return;
    }

    const combinedContent = formatPostContentWithIntent(content, selectedIntent);
    const validationError = validatePostContent(combinedContent);
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
      await createPost(profile, { content: combinedContent, projectUrl });
      setContent('');
      setSelectedIntent(null);
      setProjectUrl('');
      setPublishSuccess('Build log published.');
    } catch {
      setFormError('Could not publish post. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitBuildLog();
  };

  const handleComposerKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && content.trim() && !submitting) {
      e.preventDefault();
      void submitBuildLog();
    }
  };

  const filteredPosts = posts.filter((p) => {
    const parsed = parsePostContentAndIntent(p.content);
    if (intentFilter !== 'All' && parsed.intent !== intentFilter) {
      return false;
    }
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      p.content.toLowerCase().includes(q) ||
      p.authorDisplayName.toLowerCase().includes(q) ||
      p.authorUsername.toLowerCase().includes(q) ||
      (p.projectUrl && p.projectUrl.toLowerCase().includes(q))
    );
  });

  const sidebarRoles = useMemo(() => {
    if (openRoles.length > 0) {
      return openRoles.slice(0, 3).map((role) => ({
        id: role.id,
        title: role.title,
        collaborationType: role.collaborationType,
        skills: role.skillsNeeded.slice(0, 2),
        projectName: role.projectName,
      }));
    }
    if (!rolesLoading) {
      return STARTER_COLLABORATION_SEEDS.filter((seed) => seed.status === 'Open')
        .slice(0, 3)
        .map((seed) => ({
          id: seed.id,
          title: seed.title,
          collaborationType: seed.collaborationType,
          skills: seed.skillsNeeded.slice(0, 2),
          projectName: seed.projectName,
        }));
    }
    return [];
  }, [openRoles, rolesLoading]);

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
        {/* Main feed column */}
        <div className="lg:col-span-8 space-y-5">
          {/* Header & Search */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-white/10">
            <div>
              <div className="flex items-baseline gap-3">
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#FAFAFA] tracking-tight">
                  Community Feed
                </h1>
                {!loading && (
                  <span className="font-mono text-xs text-[#A1A1AA] tabular-nums">
                    {filteredPosts.length} {filteredPosts.length === 1 ? 'log' : 'logs'}
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-[#A1A1AA]">
                Daily build logs, shipping notes, and working links.
              </p>
            </div>

            <div className="relative w-full sm:w-72 shrink-0">
              <Search className="w-4 h-4 text-[#A1A1AA] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <label htmlFor="community-search" className="sr-only">
                Search posts
              </label>
              <input
                id="community-search"
                type="search"
                placeholder="Search logs, URLs, or @handle..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg bg-[#111114] border border-white/10 pl-9 pr-3.5 py-2 text-sm text-[#FAFAFA] placeholder-[#A1A1AA]/55 focus:border-white/30 focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Focused 5-Line Build-Log Composer */}
          {profile && isVerified ? (
            <form
              onSubmit={handlePublish}
              className="bg-[#111114] border border-white/10 focus-within:border-white/25 rounded-xl overflow-hidden transition-colors"
            >
              <div className="px-4 py-2.5 border-b border-white/[0.07] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <SafeImage
                    src={profile.avatarUrl}
                    alt={profile.displayName}
                    fallbackLabel={profile.displayName}
                    variant="avatar"
                    className="w-5 h-5 rounded-full object-cover border border-white/10 shrink-0"
                  />
                  <span className="font-mono text-xs text-[#FAFAFA] truncate">
                    @{profile.username}
                  </span>
                  <span className="text-[#A1A1AA]/40 text-xs" aria-hidden="true">
                    ·
                  </span>
                  <span className="font-mono text-[11px] text-[#A1A1AA]">Build log</span>
                </div>

                <div className="flex items-center gap-2.5 shrink-0">
                  <div className="hidden sm:flex items-center gap-1" aria-hidden="true">
                    {[1, 2, 3, 4, 5].map((tick) => (
                      <span
                        key={tick}
                        className={`w-2.5 h-1 rounded-full transition-colors ${
                          isOverLineLimit
                            ? 'bg-red-400'
                            : lineCount >= tick
                              ? 'bg-[#FAFAFA]'
                              : 'bg-white/15'
                        }`}
                      />
                    ))}
                  </div>
                  <span
                    className={`font-mono text-[11px] tabular-nums ${
                      isOverLineLimit ? 'text-red-400 font-medium' : 'text-[#A1A1AA]'
                    }`}
                  >
                    {lineCount}/5 lines · {content.length + intentPrefixLength}/600
                  </span>
                </div>
              </div>

              <div className="px-4 pt-3 pb-2.5 space-y-2.5">
                <div>
                  <label htmlFor="new-post-content" className="sr-only">
                    Share what you are building (max 5 lines)
                  </label>
                  <textarea
                    id="new-post-content"
                    rows={3}
                    maxLength={maxBodyChars}
                    placeholder="What did you ship, debug, or learn today? (5 lines max)"
                    value={content}
                    onChange={(e) => {
                      setContent(e.target.value);
                      if (publishSuccess) setPublishSuccess(null);
                    }}
                    onKeyDown={handleComposerKeyDown}
                    className="w-full bg-transparent text-[14.5px] leading-relaxed text-[#FAFAFA] placeholder-[#A1A1AA]/55 focus:outline-none resize-none"
                  />
                  {isOverLineLimit && (
                    <p className="mt-1 text-xs font-mono text-red-400">
                      {lineCount}/5 lines — keep updates to 5 lines or fewer.
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-[11px] text-[#A1A1AA]/75 mr-1">
                    Tag (optional):
                  </span>
                  {POST_INTENTS.map((intent) => {
                    const active = selectedIntent === intent;
                    return (
                      <button
                        key={intent}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setSelectedIntent(active ? null : intent)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-mono border transition-colors whitespace-nowrap shrink-0 ${
                          active
                            ? 'bg-[#27272A] border-white/25 text-[#FAFAFA]'
                            : 'bg-[#0C0C0E]/60 border-white/[0.08] text-[#A1A1AA] hover:text-[#FAFAFA] hover:border-white/20'
                        }`}
                      >
                        {intent}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="px-4 py-2.5 bg-[#0C0C0E]/70 border-t border-white/[0.07] flex flex-col sm:flex-row sm:items-center gap-2.5">
                <div className="relative flex-1">
                  <Link2 className="w-3.5 h-3.5 text-[#A1A1AA] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <label htmlFor="new-post-url" className="sr-only">
                    Attach repo or demo URL (optional)
                  </label>
                  <input
                    id="new-post-url"
                    type="url"
                    maxLength={300}
                    placeholder="https://github.com/... or live demo URL (optional)"
                    value={projectUrl}
                    onChange={(e) => setProjectUrl(e.target.value)}
                    className="w-full rounded-lg bg-[#111114] border border-white/10 pl-8 pr-3 py-1.5 text-xs font-mono text-[#FAFAFA] placeholder-[#A1A1AA]/55 focus:border-white/30 focus:outline-none transition-colors"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 shrink-0">
                  <span className="hidden md:inline font-mono text-[11px] text-[#A1A1AA]/65">
                    ⌘↵ to post
                  </span>
                  <button
                    type="submit"
                    disabled={submitting || !content.trim() || isOverLineLimit}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#FAFAFA] text-[#09090B] text-xs font-semibold hover:bg-[#FAFAFA]/90 disabled:opacity-45 transition-colors whitespace-nowrap shrink-0"
                  >
                    <MessageSquarePlus className="w-3.5 h-3.5" />
                    {submitting ? 'Posting...' : 'Post Log'}
                  </button>
                </div>
              </div>

              {(formError || publishSuccess) && (
                <div className="px-4 py-2 border-t border-white/[0.07] bg-[#0C0C0E]/70">
                  {formError && (
                    <p role="alert" className="text-xs text-red-400">
                      {formError}
                    </p>
                  )}
                  {publishSuccess && (
                    <p role="status" className="text-xs text-[#10B981]">
                      {publishSuccess}
                    </p>
                  )}
                </div>
              )}
            </form>
          ) : (
            <div className="bg-[#111114] border border-white/10 rounded-xl px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-[#FAFAFA]">
                  Log what you shipped today
                </h2>
                <p className="text-xs text-[#A1A1AA] mt-0.5">
                  Sign in with a verified account to post updates, like logs, and reply.
                </p>
              </div>
              <Link
                to="/auth"
                state={{ from: '/community' }}
                className="px-4 py-2 rounded-lg bg-[#FAFAFA] text-[#09090B] text-xs font-semibold hover:bg-[#FAFAFA]/90 transition-colors whitespace-nowrap shrink-0 text-center"
              >
                Sign Up / Log In
              </Link>
            </div>
          )}

          {/* Compact Intent Filter Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1">
            {(['All', ...POST_INTENTS] as const).map((tab) => {
              const active = intentFilter === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setIntentFilter(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-[#27272A] text-[#FAFAFA]'
                      : 'text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#111114]'
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          {/* Feed Stream */}
          {feedError && (
            <div
              role="alert"
              className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-300"
            >
              {feedError}
            </div>
          )}

          {loading ? (
            <div className="divide-y divide-white/10 border-t border-white/10">
              {[0, 1, 2].map((i) => (
                <div key={i} className="py-5 flex items-start gap-3.5 animate-pulse">
                  <div className="w-9 h-9 rounded-full bg-white/10 shrink-0" />
                  <div className="flex-1 space-y-2.5">
                    <div className="h-3.5 w-44 rounded bg-white/10" />
                    <div className="h-4 w-5/6 rounded bg-white/10" />
                    <div className="h-4 w-2/3 rounded bg-white/10" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredPosts.length === 0 ? (
            <div className="py-12 text-center border-t border-b border-white/10">
              <h3 className="font-display text-base font-semibold text-[#FAFAFA]">
                {searchTerm || intentFilter !== 'All'
                  ? 'No logs match that filter'
                  : 'No build logs yet'}
              </h3>
              <p className="mt-1.5 text-sm text-[#A1A1AA]">
                {searchTerm || intentFilter !== 'All'
                  ? 'Reset your search or tag filter to see all logs.'
                  : 'Post the first build update above.'}
              </p>
            </div>
          ) : (
            <div className="border-t border-white/10">
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

        {/* Interconnected Right Rail */}
        <aside className="lg:col-span-4 space-y-5 lg:sticky lg:top-24">
          {/* Brief Log Format */}
          <section className="bg-[#111114] border border-white/10 rounded-xl p-4">
            <h2 className="font-mono text-xs font-medium text-[#FAFAFA] tracking-wide">
              Log Format
            </h2>
            <p className="mt-2 text-xs text-[#A1A1AA] leading-relaxed">
              5 lines max · Attach a repo or demo for review · Share commits, blockers, and tradeoffs.
            </p>
          </section>

          {/* Open Collaborate Roles Preview */}
          <section className="bg-[#111114] border border-white/10 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.07] flex items-center justify-between gap-2">
              <h2 className="font-mono text-xs font-medium text-[#FAFAFA] tracking-wide">
                Open Roles
              </h2>
              <Link
                to="/collaborate"
                className="inline-flex items-center gap-1 text-xs font-medium text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors whitespace-nowrap"
              >
                <span>Collaborate</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {rolesLoading && sidebarRoles.length === 0 ? (
              <div className="p-4 space-y-3 animate-pulse">
                <div className="h-4 w-4/5 rounded bg-white/10" />
                <div className="h-3 w-1/2 rounded bg-white/10" />
              </div>
            ) : sidebarRoles.length === 0 ? (
              <div className="p-4">
                <p className="text-xs text-[#A1A1AA]">No open roles right now.</p>
                <Link
                  to="/collaborate"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#FAFAFA] hover:underline"
                >
                  Post an opportunity
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-white/[0.07]">
                {sidebarRoles.map((role) => (
                  <li key={role.id}>
                    <Link
                      to="/collaborate"
                      className="block px-4 py-3 hover:bg-[#27272A]/40 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-medium text-[#FAFAFA] group-hover:underline line-clamp-1">
                          {role.title}
                        </span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-[#A1A1AA] group-hover:text-[#FAFAFA] shrink-0 mt-0.5 transition-colors" />
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] font-mono text-[#A1A1AA]">
                        <span className="inline-flex items-center gap-1 text-[#10B981]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                          Open
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{role.collaborationType}</span>
                        {role.skills.map((skill) => (
                          <span key={skill} className="inline-flex items-center gap-1.5">
                            <span aria-hidden="true">·</span>
                            <span>{skill}</span>
                          </span>
                        ))}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Recent Projects Preview */}
          <section className="bg-[#111114] border border-white/10 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.07] flex items-center justify-between gap-2">
              <h2 className="font-mono text-xs font-medium text-[#FAFAFA] tracking-wide">
                Recent Projects
              </h2>
              <Link
                to="/projects"
                className="inline-flex items-center gap-1 text-xs font-medium text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors whitespace-nowrap"
              >
                <span>Projects</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {projectsLoading ? (
              <div className="p-4 space-y-3 animate-pulse">
                <div className="h-4 w-3/4 rounded bg-white/10" />
                <div className="h-3 w-1/2 rounded bg-white/10" />
              </div>
            ) : recentProjects.length === 0 ? (
              <div className="p-4">
                <p className="text-xs text-[#A1A1AA]">No projects published yet.</p>
                <Link
                  to="/projects"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[#FAFAFA] hover:underline"
                >
                  Publish a project
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-white/[0.07]">
                {recentProjects.map((proj) => (
                  <li key={proj.id}>
                    <Link
                      to={`/projects/${proj.id}`}
                      className="block px-4 py-3 hover:bg-[#27272A]/40 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-medium text-[#FAFAFA] group-hover:underline line-clamp-1">
                          {proj.name}
                        </span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-[#A1A1AA] group-hover:text-[#FAFAFA] shrink-0 mt-0.5 transition-colors" />
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] font-mono text-[#A1A1AA]">
                        <span
                          className={
                            proj.status === 'Launched' ? 'text-[#10B981]' : 'text-[#A1A1AA]'
                          }
                        >
                          {proj.status}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="truncate">@{proj.ownerUsername}</span>
                        {proj.tags.slice(0, 2).map((tag) => (
                          <span key={tag} className="inline-flex items-center gap-1.5">
                            <span aria-hidden="true">·</span>
                            <span>{tag}</span>
                          </span>
                        ))}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
