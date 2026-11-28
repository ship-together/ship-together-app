import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, ExternalLink } from 'lucide-react';
import {
  subscribeCollaborationRequests,
  subscribePosts,
  subscribeProjects,
} from '../lib/api';
import {
  formatRelativeOrDate,
  isSafeHttpUrl,
  normalizeExternalHref,
} from '../lib/validators';
import type { CollaborationRequest, Post, Project } from '../types/domain';
import { useAuth } from '../context/AuthContext';
import { ProjectCard } from '../components/ProjectCard';
import { SafeImage } from '../components/SafeImage';

export function LandingPage() {
  const { user } = useAuth();
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);

  const [recentPosts, setRecentPosts] = useState<Post[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);

  const [openRoles, setOpenRoles] = useState<CollaborationRequest[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);

  useEffect(() => {
    const unsubProjects = subscribeProjects(
      (items) => {
        setRecentProjects(items.slice(0, 6));
        setProjectsLoading(false);
      },
      () => {
        setProjectsLoading(false);
      },
      undefined,
      6
    );

    const unsubPosts = subscribePosts(
      (items) => {
        setRecentPosts(items);
        setPostsLoading(false);
      },
      () => {
        setPostsLoading(false);
      }
    );

    const unsubRoles = subscribeCollaborationRequests(
      (items) => {
        setOpenRoles(items.filter((item) => item.status === 'Open'));
        setRolesLoading(false);
      },
      () => {
        setRolesLoading(false);
      }
    );

    return () => {
      unsubProjects();
      unsubPosts();
      unsubRoles();
    };
  }, []);

  const heroPosts = recentPosts.slice(0, 2);
  const heroRoles = openRoles.slice(0, 2);
  const showcaseProjects = recentProjects.slice(0, 3);
  const featuredRoles = openRoles.slice(0, 4);

  return (
    <div className="bg-[#09090B] text-[#FAFAFA]">
      {/* Hero Section */}
      <section className="border-b border-white/10">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-12 pb-16 sm:pt-16 sm:pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
            {/* Left Copy Column */}
            <div className="lg:col-span-6 lg:pt-4">
              <h1 className="font-display font-bold text-[#FAFAFA] tracking-tight leading-[1.08] text-[clamp(2.25rem,4vw,3.4rem)] text-balance">
                Share build logs, ship projects, and find teammates.
              </h1>

              <p className="mt-5 text-base sm:text-lg text-[#A1A1AA] leading-relaxed max-w-xl">
                Post short progress updates, share working repos and live links, and team up on
                active builds.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  to={user ? '/community' : '/auth'}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#FAFAFA] text-[#09090B] text-sm font-semibold hover:bg-[#FAFAFA]/90 transition-colors whitespace-nowrap shrink-0"
                >
                  {user ? 'Post a Build Log' : 'Get Started'}
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/projects"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-white/10 bg-[#111114] text-sm font-medium text-[#FAFAFA] hover:bg-[#27272A] transition-colors whitespace-nowrap shrink-0"
                >
                  Browse Projects
                </Link>
              </div>
            </div>

            {/* Right Column: Live Recent Activity from Community & Collaborate */}
            <div className="lg:col-span-6">
              <div className="rounded-xl border border-white/10 bg-[#111114] overflow-hidden">
                {/* Latest Community Build Logs */}
                <div className="p-4 sm:p-5 border-b border-white/10">
                  <div className="flex items-center justify-between gap-3 mb-3.5">
                    <h2 className="font-mono text-xs text-[#A1A1AA]">Latest Build Logs</h2>
                    <Link
                      to="/community"
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors whitespace-nowrap"
                    >
                      View feed
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {postsLoading ? (
                    <div className="space-y-3">
                      {[0, 1].map((idx) => (
                        <div
                          key={idx}
                          className="h-20 rounded-lg bg-[#09090B] border border-white/10 animate-pulse"
                        />
                      ))}
                    </div>
                  ) : heroPosts.length > 0 ? (
                    <div className="space-y-3">
                      {heroPosts.map((post) => {
                        const safeUrl =
                          post.projectUrl && isSafeHttpUrl(post.projectUrl)
                            ? normalizeExternalHref(post.projectUrl)
                            : null;
                        return (
                          <div
                            key={post.id}
                            className="rounded-lg border border-white/10 bg-[#09090B] p-3.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <Link
                                to={`/u/${post.authorUsername}`}
                                className="flex items-center gap-2 min-w-0 group"
                              >
                                <SafeImage
                                  src={post.authorAvatarUrl}
                                  alt={post.authorDisplayName}
                                  fallbackLabel={post.authorDisplayName}
                                  variant="avatar"
                                  className="w-6 h-6 rounded-full object-cover border border-white/10 shrink-0"
                                />
                                <span className="text-xs font-medium text-[#FAFAFA] group-hover:underline truncate">
                                  {post.authorDisplayName}
                                </span>
                                <span className="font-mono text-[11px] text-[#A1A1AA] truncate">
                                  @{post.authorUsername}
                                </span>
                              </Link>
                              <span className="font-mono text-[11px] text-[#A1A1AA] shrink-0 tabular-nums">
                                {formatRelativeOrDate(post.createdAt)}
                              </span>
                            </div>

                            <p className="mt-2 text-xs sm:text-sm text-zinc-200 leading-relaxed line-clamp-3 whitespace-pre-line">
                              {post.content}
                            </p>

                            {safeUrl && (
                              <a
                                href={safeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 inline-flex items-center gap-1.5 font-mono text-[11px] text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors max-w-full"
                              >
                                <ExternalLink className="w-3 h-3 shrink-0" />
                                <span className="truncate">{post.projectUrl}</span>
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-white/10 bg-[#09090B] p-4 flex items-center justify-between gap-4">
                      <p className="text-xs text-[#A1A1AA]">
                        No build logs posted yet. Share what you worked on today.
                      </p>
                      <Link
                        to="/community"
                        className="text-xs font-medium text-[#FAFAFA] hover:underline whitespace-nowrap shrink-0"
                      >
                        Post first log
                      </Link>
                    </div>
                  )}
                </div>

                {/* Open Collaboration Roles */}
                <div className="p-4 sm:p-5 bg-[#0C0C0E]">
                  <div className="flex items-center justify-between gap-3 mb-3.5">
                    <h2 className="font-mono text-xs text-[#A1A1AA]">Open Collaborate Roles</h2>
                    <Link
                      to="/collaborate"
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors whitespace-nowrap"
                    >
                      All roles
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {rolesLoading ? (
                    <div className="h-16 rounded-lg bg-[#09090B] border border-white/10 animate-pulse" />
                  ) : heroRoles.length > 0 ? (
                    <div className="space-y-2.5">
                      {heroRoles.map((role) => (
                        <Link
                          key={role.id}
                          to="/collaborate"
                          className="block rounded-lg border border-white/10 bg-[#09090B] px-3.5 py-3 hover:border-white/25 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs sm:text-sm font-medium text-[#FAFAFA] truncate">
                              {role.title}
                            </span>
                            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-[#10B981] shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                              Open
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-mono text-[#A1A1AA]">
                            <span>{role.collaborationType}</span>
                            {role.projectName && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="truncate">{role.projectName}</span>
                              </>
                            )}
                            {role.skillsNeeded.slice(0, 3).map((skill) => (
                              <span key={skill} className="inline-flex items-center gap-2">
                                <span aria-hidden="true">·</span>
                                <span>{skill}</span>
                              </span>
                            ))}
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-white/10 bg-[#09090B] p-4 flex items-center justify-between gap-4">
                      <p className="text-xs text-[#A1A1AA]">
                        No open roles right now. Looking for contributors or a study partner?
                      </p>
                      <Link
                        to="/collaborate"
                        className="text-xs font-medium text-[#FAFAFA] hover:underline whitespace-nowrap shrink-0"
                      >
                        Post a role
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Real Member Projects Showcase */}
      <section className="border-b border-white/10 bg-[#09090B]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-14 sm:py-16">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold text-[#FAFAFA] tracking-tight">
                Recent Projects
              </h2>
              <p className="mt-1 text-sm text-[#A1A1AA]">
                Working builds and active repositories shared by members.
              </p>
            </div>
            <Link
              to="/projects"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors whitespace-nowrap"
            >
              View all projects
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {projectsLoading ? (
            <div className="mt-7 grid grid-cols-1 md:grid-cols-3 gap-6">
              {[0, 1, 2].map((idx) => (
                <div
                  key={idx}
                  className="bg-[#111114] border border-white/10 rounded-xl h-80 animate-pulse"
                />
              ))}
            </div>
          ) : showcaseProjects.length > 0 ? (
            <div className="mt-7 grid grid-cols-1 md:grid-cols-3 gap-6">
              {showcaseProjects.map((proj) => (
                <ProjectCard key={proj.id} project={proj} />
              ))}
            </div>
          ) : (
            <div className="mt-7 bg-[#111114] border border-white/10 rounded-xl p-10 text-center">
              <h3 className="font-display text-lg font-semibold text-[#FAFAFA]">
                No projects published yet
              </h3>
              <p className="mt-2 text-sm text-[#A1A1AA] max-w-md mx-auto">
                Publish a project with a live demo URL, GitHub link, and stack tags.
              </p>
              <Link
                to={user ? '/projects' : '/auth'}
                className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#FAFAFA] text-[#09090B] text-sm font-semibold hover:bg-[#FAFAFA]/90 transition-colors"
              >
                {user ? 'Publish a Project' : 'Sign Up to Publish'}
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Finding Teammates: Real Open Collaboration Roles */}
      <section className="bg-[#09090B]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-14 sm:py-16">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold text-[#FAFAFA] tracking-tight">
                Find Teammates
              </h2>
              <p className="mt-1 text-sm text-[#A1A1AA]">
                Open roles, weekend pairs, and study groups looking for contributors.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                to={user ? '/collaborate' : '/auth'}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#FAFAFA] text-[#09090B] text-xs font-semibold hover:bg-[#FAFAFA]/90 transition-colors whitespace-nowrap"
              >
                {user ? 'Post a Role' : 'Join to Apply'}
              </Link>
              <Link
                to="/collaborate"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors whitespace-nowrap"
              >
                All opportunities
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {rolesLoading ? (
            <div className="mt-7 grid grid-cols-1 md:grid-cols-2 gap-5">
              {[0, 1].map((idx) => (
                <div
                  key={idx}
                  className="bg-[#111114] border border-white/10 rounded-xl h-44 animate-pulse"
                />
              ))}
            </div>
          ) : featuredRoles.length > 0 ? (
            <div className="mt-7 grid grid-cols-1 md:grid-cols-2 gap-5">
              {featuredRoles.map((role) => (
                <Link
                  key={role.id}
                  to="/collaborate"
                  className="group rounded-xl border border-white/10 bg-[#111114] p-5 sm:p-6 flex flex-col justify-between gap-4 hover:border-white/25 transition-colors"
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                      <div className="flex flex-wrap items-center gap-2 text-[#A1A1AA]">
                        <span className="inline-flex items-center gap-1.5 text-[#10B981] font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                          Open
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{role.collaborationType}</span>
                        {role.projectName && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-[#FAFAFA]/80">{role.projectName}</span>
                          </>
                        )}
                      </div>
                      <span className="text-[#A1A1AA] tabular-nums">
                        {formatRelativeOrDate(role.createdAt)}
                      </span>
                    </div>

                    <h3 className="mt-3 font-display text-base sm:text-lg font-semibold text-[#FAFAFA] group-hover:text-white flex items-start justify-between gap-3">
                      <span>{role.title}</span>
                      <ArrowUpRight className="w-4 h-4 shrink-0 text-[#A1A1AA] group-hover:text-[#FAFAFA] transition-colors mt-1" />
                    </h3>

                    <p className="mt-1.5 text-sm text-[#A1A1AA] leading-relaxed line-clamp-2">
                      {role.description}
                    </p>
                  </div>

                  <div className="pt-3.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[#A1A1AA]">
                      {role.skillsNeeded.slice(0, 4).map((skill, idx) => (
                        <span key={skill} className="inline-flex items-center gap-2">
                          {idx > 0 && <span aria-hidden="true">·</span>}
                          <span>{skill}</span>
                        </span>
                      ))}
                    </div>
                    <span className="font-mono text-[#A1A1AA]">@{role.ownerUsername}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-7 bg-[#111114] border border-white/10 rounded-xl p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-display text-base font-semibold text-[#FAFAFA]">
                  No open roles posted yet
                </h3>
                <p className="mt-1 text-sm text-[#A1A1AA]">
                  List the stack and scope for an OSS repo, side project, or study group.
                </p>
              </div>
              <Link
                to="/collaborate"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#FAFAFA] text-[#09090B] text-xs font-semibold hover:bg-[#FAFAFA]/90 transition-colors whitespace-nowrap shrink-0"
              >
                Open Collaborate
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
