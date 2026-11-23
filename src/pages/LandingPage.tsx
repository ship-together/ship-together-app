import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { subscribeProjects } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { HERO_DESK_IMAGE, type Project } from '../types/domain';
import { ProjectCard } from '../components/ProjectCard';
import { SafeImage } from '../components/SafeImage';

export function LandingPage() {
  const { user } = useAuth();
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeProjects(
      (items) => {
        setRecentProjects(items.slice(0, 3));
        setProjectsLoading(false);
      },
      () => {
        setProjectsLoading(false);
      },
      undefined,
      3
    );
    return unsub;
  }, []);

  return (
    <div className="bg-[#090909]">
      {/* Hero Section */}
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-12 pb-16 sm:pt-20 sm:pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-center">
            <p className="text-sm font-medium text-[#F59E0B] tracking-wide">
              Global Developer Community
            </p>
            <h1 className="mt-4 font-display font-bold text-white tracking-tight leading-[1.08] text-[clamp(2.25rem,4vw,3.75rem)] text-balance">
              Connect. Hang Out. Build &amp; Ship Together.
            </h1>
            <p className="mt-6 text-base sm:text-lg text-[#A3A3A3] leading-relaxed max-w-xl">
              Ship Together is a welcoming home for developers, makers, designers, founders,
              and learners. Share daily progress, showcase real launches, and team up on
              meaningful software without noisy feeds.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                to={user ? '/community' : '/auth'}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#F59E0B] text-[#090909] text-sm font-semibold hover:bg-[#F59E0B]/90 transition-colors whitespace-nowrap shrink-0"
              >
                {user ? 'Open Community Feed' : 'Join Ship Together'}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/projects"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-[#292923] text-sm font-medium text-white hover:bg-[#171714] transition-colors whitespace-nowrap shrink-0"
              >
                Browse Projects
              </Link>
            </div>
          </div>

          <div className="lg:col-span-6 flex">
            <div className="w-full rounded-xl overflow-hidden border border-[#292923] bg-[#171714] min-h-[280px]">
              <SafeImage
                src={HERO_DESK_IMAGE}
                alt="Developer workspace illuminated by a warm amber desk lamp"
                fallbackLabel="Ship Together Builder Studio"
                className="w-full h-full object-cover aspect-[16/10] lg:aspect-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Core Rhythm Section */}
      <section className="border-t border-[#292923] bg-[#090909]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight text-balance">
              Built for momentum, from first commit to launch day
            </h2>
            <p className="mt-3 text-[#A3A3A3] text-base leading-relaxed">
              Whether you are shipping your very first side project or scaling an open-source tool,
              everyone here learns and builds in the open.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#171714] border border-[#292923] rounded-xl p-6">
              <span className="font-mono text-xs text-[#F59E0B]">01</span>
              <h3 className="mt-3 font-display text-lg font-semibold text-white">
                Share crisp build logs
              </h3>
              <p className="mt-2 text-sm text-[#A3A3A3] leading-relaxed">
                Post short five-line updates on what you shipped today, attach a live link, and get
                thoughtful feedback from fellow builders.
              </p>
            </div>

            <div className="bg-[#171714] border border-[#292923] rounded-xl p-6">
              <span className="font-mono text-xs text-[#F59E0B]">02</span>
              <h3 className="mt-3 font-display text-lg font-semibold text-white">
                Showcase finished work
              </h3>
              <p className="mt-2 text-sm text-[#A3A3A3] leading-relaxed">
                Publish projects with cover visuals, live demos, source repositories, tech stacks,
                and honest status from Building to Launched.
              </p>
            </div>

            <div className="bg-[#171714] border border-[#292923] rounded-xl p-6">
              <span className="font-mono text-xs text-[#F59E0B]">03</span>
              <h3 className="mt-3 font-display text-lg font-semibold text-white">
                Find your next teammate
              </h3>
              <p className="mt-2 text-sm text-[#A3A3A3] leading-relaxed">
                List open-source, startup, side-project, or study-group opportunities and review
                applications privately as an owner.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Live Community Projects Strip */}
      <section className="border-t border-[#292923] bg-[#090909]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Recently Shipped
              </h2>
              <p className="mt-2 text-sm text-[#A3A3A3]">
                Live projects published by Ship Together members.
              </p>
            </div>
            <Link
              to="/projects"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[#F59E0B] hover:underline whitespace-nowrap"
            >
              View all projects
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {projectsLoading ? (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              {[0, 1, 2].map((idx) => (
                <div
                  key={idx}
                  className="bg-[#171714] border border-[#292923] rounded-xl h-80 animate-pulse"
                />
              ))}
            </div>
          ) : recentProjects.length > 0 ? (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              {recentProjects.map((proj) => (
                <ProjectCard key={proj.id} project={proj} />
              ))}
            </div>
          ) : (
            <div className="mt-8 bg-[#171714] border border-[#292923] rounded-xl p-10 text-center">
              <h3 className="font-display text-lg font-semibold text-white">
                Be the first to showcase a project
              </h3>
              <p className="mt-2 text-sm text-[#A3A3A3] max-w-md mx-auto">
                No projects have been published yet. Sign in and share what you are building with
                the community.
              </p>
              <Link
                to={user ? '/projects' : '/auth'}
                className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#F59E0B] text-[#090909] text-sm font-semibold hover:bg-[#F59E0B]/90 transition-colors"
              >
                {user ? 'Publish a Project' : 'Sign Up to Publish'}
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="border-t border-[#292923]">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <div className="bg-[#171714] border border-[#292923] rounded-xl p-8 sm:p-12 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="max-w-xl">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight text-balance">
                Ready to ship something real this week?
              </h2>
              <p className="mt-3 text-sm sm:text-base text-[#A3A3A3] leading-relaxed">
                Create your developer profile in seconds, share your first update in the community
                feed, or join an open collaboration.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link
                to={user ? '/collaborate' : '/auth'}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#F59E0B] text-[#090909] text-sm font-semibold hover:bg-[#F59E0B]/90 transition-colors whitespace-nowrap"
              >
                {user ? 'Find Collaborators' : 'Create Free Account'}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/community"
                className="px-5 py-3 rounded-lg border border-[#292923] text-sm font-medium text-white hover:bg-[#292923] transition-colors whitespace-nowrap"
              >
                Explore Community
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
