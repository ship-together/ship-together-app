import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Upload, X } from 'lucide-react';
import { createProject, subscribeProjects, uploadMediaFile } from '../lib/api';
import { isSafeHttpUrl, isSafeImageUrl, parseCommaList } from '../lib/validators';
import { useAuth } from '../context/AuthContext';
import {
  PRESET_PROJECT_COVERS,
  type Project,
  type ProjectStatus,
} from '../types/domain';
import { ProjectCard } from '../components/ProjectCard';
import { SafeImage } from '../components/SafeImage';

const STATUS_FILTERS: ('All' | ProjectStatus)[] = [
  'All',
  'Building',
  'Launched',
  'Completed',
];

export function ProjectsPage() {
  const { user, profile, isVerified } = useAuth();
  const navigate = useNavigate();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'All' | ProjectStatus>('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Publish modal state
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState(PRESET_PROJECT_COVERS[0].url);
  const [liveDemoUrl, setLiveDemoUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [tagsInput, setTagsInput] = useState('TypeScript, React, Tailwind');
  const [status, setStatus] = useState<ProjectStatus>('Building');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeProjects(
      (items) => {
        setProjects(items);
        setLoading(false);
        setLoadError(null);
      },
      (err) => {
        setLoadError(err.message || 'Unable to load projects.');
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  const handleOpenPublish = () => {
    if (!profile || !isVerified) {
      navigate('/auth', { state: { from: '/projects' } });
      return;
    }
    setShowForm(true);
    setFormError(null);
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.currentTarget;
    const file = inputEl.files?.[0];
    if (!file || !user) return;
    setFormError(null);
    setUploadNotice(null);
    setUploadingCover(true);
    try {
      const result = await uploadMediaFile(file, 'project-images', user.uid);
      setCoverImageUrl(result.url);
      setUploadNotice(result.notice);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Cover upload failed.');
    } finally {
      inputEl.value = '';
      setUploadingCover(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !isVerified) {
      navigate('/auth', { state: { from: '/projects' } });
      return;
    }

    const cleanName = name.trim();
    const cleanDesc = description.trim();
    const tags = parseCommaList(tagsInput, 8);

    if (cleanName.length < 2 || cleanName.length > 100) {
      setFormError('Project name must be between 2 and 100 characters.');
      return;
    }
    if (cleanDesc.length < 10 || cleanDesc.length > 600) {
      setFormError('Short description must be between 10 and 600 characters.');
      return;
    }
    if (tags.length === 0) {
      setFormError('Please add at least 1 technology tag.');
      return;
    }
    if (!isSafeImageUrl(coverImageUrl)) {
      setFormError('Cover image must be a valid https:// URL, preset cover, or uploaded image under 200 KB.');
      return;
    }
    if (!isSafeHttpUrl(liveDemoUrl)) {
      setFormError('Live demo URL must start with https:// or http://.');
      return;
    }
    if (!isSafeHttpUrl(githubUrl)) {
      setFormError('GitHub URL must start with https:// or http://.');
      return;
    }

    setFormError(null);
    setSubmitting(true);
    try {
      const createdId = await createProject(profile, {
        name: cleanName,
        description: cleanDesc,
        coverImageUrl,
        liveDemoUrl,
        githubUrl,
        tags,
        status,
      });
      setShowForm(false);
      setName('');
      setDescription('');
      setLiveDemoUrl('');
      setGithubUrl('');
      navigate(`/projects/${createdId}`, { state: { justPublished: true } });
    } catch {
      setFormError('Could not publish project. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = projects.filter((p) => {
    if (statusFilter !== 'All' && p.status !== statusFilter) return false;
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags.some((t) => t.toLowerCase().includes(q)) ||
      p.ownerDisplayName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Project Showcase
          </h1>
          <p className="mt-1 text-sm text-[#A3A3A3]">
            Discover real products, tools, and experiments shipped by the community.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenPublish}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#F59E0B] text-[#090909] text-sm font-semibold hover:bg-[#F59E0B]/90 transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          Publish Project
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div
          role="tablist"
          aria-label="Filter projects by status"
          className="inline-flex items-center gap-1 p-1 rounded-lg bg-[#171714] border border-[#292923] self-start overflow-x-auto max-w-full"
        >
          {STATUS_FILTERS.map((st) => (
            <button
              key={st}
              type="button"
              role="tab"
              aria-selected={statusFilter === st}
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                statusFilter === st
                  ? 'bg-[#292923] text-white'
                  : 'text-[#A3A3A3] hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#A3A3A3] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <label htmlFor="project-search" className="sr-only">
            Search projects
          </label>
          <input
            id="project-search"
            type="search"
            placeholder="Search by name, stack, or builder..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg bg-[#171714] border border-[#292923] pl-9 pr-3.5 py-2 text-sm text-white placeholder-[#A3A3A3]/60 focus:border-[#F59E0B] focus:outline-none"
          />
        </div>
      </div>

      {/* Publish Project Form Panel */}
      {showForm && (
        <section
          aria-label="Publish a new project"
          className="bg-[#171714] border border-[#292923] rounded-xl p-6 sm:p-8 space-y-6"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-semibold text-white">
                Publish a Project
              </h2>
              <p className="text-xs text-[#A3A3A3] mt-1">
                Share what you are building or have launched with fellow developers.
              </p>
            </div>
            <button
              type="button"
              aria-label="Close publish form"
              onClick={() => setShowForm(false)}
              className="p-2 rounded-lg text-[#A3A3A3] hover:text-white hover:bg-[#292923]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label htmlFor="proj-name" className="block text-xs font-medium text-[#A3A3A3] mb-1.5">
                Project Name *
              </label>
              <input
                id="proj-name"
                type="text"
                required
                maxLength={100}
                placeholder="Chronicle CLI"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg bg-[#090909] border border-[#292923] px-3.5 py-2.5 text-sm text-white placeholder-[#A3A3A3]/50 focus:border-[#F59E0B] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="proj-status" className="block text-xs font-medium text-[#A3A3A3] mb-1.5">
                Project Status *
              </label>
              <select
                id="proj-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className="w-full rounded-lg bg-[#090909] border border-[#292923] px-3.5 py-2.5 text-sm text-white focus:border-[#F59E0B] focus:outline-none"
              >
                <option value="Building">Building</option>
                <option value="Launched">Launched</option>
                <option value="Completed">Completed</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label htmlFor="proj-desc" className="block text-xs font-medium text-[#A3A3A3] mb-1.5">
                Short Description *
              </label>
              <textarea
                id="proj-desc"
                rows={3}
                required
                maxLength={600}
                placeholder="Explain what your project does, who it helps, and what makes it interesting."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg bg-[#090909] border border-[#292923] px-3.5 py-2.5 text-sm text-white placeholder-[#A3A3A3]/50 focus:border-[#F59E0B] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="proj-demo" className="block text-xs font-medium text-[#A3A3A3] mb-1.5">
                Live Demo URL
              </label>
              <input
                id="proj-demo"
                type="url"
                maxLength={300}
                placeholder="https://myproject.dev"
                value={liveDemoUrl}
                onChange={(e) => setLiveDemoUrl(e.target.value)}
                className="w-full rounded-lg bg-[#090909] border border-[#292923] px-3.5 py-2.5 text-sm text-white placeholder-[#A3A3A3]/50 focus:border-[#F59E0B] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="proj-github" className="block text-xs font-medium text-[#A3A3A3] mb-1.5">
                GitHub Repository URL
              </label>
              <input
                id="proj-github"
                type="url"
                maxLength={300}
                placeholder="https://github.com/username/repo"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                className="w-full rounded-lg bg-[#090909] border border-[#292923] px-3.5 py-2.5 text-sm text-white placeholder-[#A3A3A3]/50 focus:border-[#F59E0B] focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="proj-tags" className="block text-xs font-medium text-[#A3A3A3] mb-1.5">
                Technology Tags (comma-separated, up to 8) *
              </label>
              <input
                id="proj-tags"
                type="text"
                required
                placeholder="TypeScript, Next.js, PostgreSQL, Tailwind"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="w-full rounded-lg bg-[#090909] border border-[#292923] px-3.5 py-2.5 text-sm text-white placeholder-[#A3A3A3]/50 focus:border-[#F59E0B] focus:outline-none"
              />
            </div>

            <div className="md:col-span-2 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label htmlFor="proj-cover-url" className="text-xs font-medium text-[#A3A3A3]">
                  Project Cover Image (choose a studio cover, upload, or paste URL)
                </label>
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#292923] text-xs font-medium text-white hover:bg-[#292923] cursor-pointer">
                  <Upload className="w-3.5 h-3.5 text-[#F59E0B]" />
                  {uploadingCover ? 'Uploading...' : 'Upload Image'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleCoverUpload}
                    disabled={uploadingCover}
                    className="sr-only"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {PRESET_PROJECT_COVERS.map((preset) => (
                  <button
                    key={preset.url}
                    type="button"
                    onClick={() => {
                      setUploadNotice(null);
                      setCoverImageUrl(preset.url);
                    }}
                    className={`group rounded-lg overflow-hidden border text-left transition-colors ${
                      coverImageUrl === preset.url
                        ? 'border-[#F59E0B]'
                        : 'border-[#292923] hover:border-[#A3A3A3]/50'
                    }`}
                  >
                    <div className="aspect-[4/3] bg-[#090909]">
                      <SafeImage
                        src={preset.url}
                        alt={preset.label}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="px-2.5 py-1.5 text-[11px] font-medium text-[#A3A3A3] group-hover:text-white truncate">
                      {preset.label}
                    </div>
                  </button>
                ))}
              </div>

              {coverImageUrl.startsWith('data:image/') && (
                <div className="flex items-center gap-3 p-2.5 rounded-lg bg-[#090909] border border-[#292923]">
                  <SafeImage
                    src={coverImageUrl}
                    alt="Uploaded project cover preview"
                    className="w-16 h-12 rounded object-cover border border-[#292923] shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white font-medium">Custom cover image ready</p>
                    <p className="text-[11px] text-[#A3A3A3]">
                      Optimized under 200 KB for fast saving.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCoverImageUrl(PRESET_PROJECT_COVERS[0].url);
                      setUploadNotice(null);
                    }}
                    className="px-2.5 py-1 rounded border border-[#292923] text-xs text-[#A3A3A3] hover:text-white shrink-0"
                  >
                    Reset
                  </button>
                </div>
              )}

              <input
                id="proj-cover-url"
                type="text"
                maxLength={280000}
                placeholder={
                  coverImageUrl.startsWith('data:image/')
                    ? 'Uploaded cover active (or paste a new https:// URL)'
                    : 'https://... or select one of the covers above'
                }
                value={coverImageUrl.startsWith('data:image/') ? '' : coverImageUrl}
                onChange={(e) => {
                  setUploadNotice(null);
                  setCoverImageUrl(e.target.value);
                }}
                className="w-full rounded-lg bg-[#090909] border border-[#292923] px-3.5 py-2 text-xs font-mono text-white placeholder-[#A3A3A3]/50 focus:border-[#F59E0B] focus:outline-none"
              />
              {uploadNotice && (
                <p role="status" className="text-xs text-emerald-400">
                  {uploadNotice}
                </p>
              )}
            </div>

            {formError && (
              <div className="md:col-span-2 text-xs text-red-400" role="alert">
                {formError}
              </div>
            )}

            <div className="md:col-span-2 flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg border border-[#292923] text-sm font-medium text-[#A3A3A3] hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || uploadingCover}
                className="px-5 py-2.5 rounded-lg bg-[#F59E0B] text-[#090909] text-sm font-semibold hover:bg-[#F59E0B]/90 disabled:opacity-50"
              >
                {submitting ? 'Publishing...' : 'Publish Project'}
              </button>
            </div>
          </form>
        </section>
      )}

      {loadError && (
        <div
          role="alert"
          className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-300"
        >
          {loadError}
        </div>
      )}

      {/* Projects Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[0, 1, 2, 3, 4, 5].map((idx) => (
            <div
              key={idx}
              className="bg-[#171714] border border-[#292923] rounded-xl h-80 animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-[#171714] border border-[#292923] rounded-xl p-12 text-center">
          <h2 className="font-display text-lg font-semibold text-white">
            {searchTerm || statusFilter !== 'All'
              ? 'No matching projects found'
              : 'No projects showcased yet'}
          </h2>
          <p className="mt-2 text-sm text-[#A3A3A3] max-w-md mx-auto">
            {searchTerm || statusFilter !== 'All'
              ? 'Try adjusting your search query or status filter.'
              : 'Publish your first project to inspire other builders in the community.'}
          </p>
          {!user ? (
            <Link
              to="/auth"
              className="mt-5 inline-flex items-center px-5 py-2.5 rounded-lg bg-[#F59E0B] text-[#090909] text-sm font-semibold hover:bg-[#F59E0B]/90"
            >
              Sign In to Publish
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleOpenPublish}
              className="mt-5 inline-flex items-center px-5 py-2.5 rounded-lg bg-[#F59E0B] text-[#090909] text-sm font-semibold hover:bg-[#F59E0B]/90"
            >
              Publish First Project
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
