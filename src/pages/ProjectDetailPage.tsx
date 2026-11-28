import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  CheckCircle2,
  Code2,
  Pencil,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { deleteProject, getProjectById, updateProject, uploadMediaFile } from '../lib/api';
import {
  formatRelativeOrDate,
  isSafeHttpUrl,
  isSafeImageUrl,
  normalizeExternalHref,
  parseCommaList,
} from '../lib/validators';
import { useAuth } from '../context/AuthContext';
import {
  PRESET_PROJECT_COVERS,
  type Project,
  type ProjectStatus,
} from '../types/domain';
import { SafeImage } from '../components/SafeImage';

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(
    (location.state as { justPublished?: boolean } | null)?.justPublished
      ? 'Project published to the showcase.'
      : null
  );

  // Edit state
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [liveDemoUrl, setLiveDemoUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('Building');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    getProjectById(id)
      .then((found) => {
        if (!active) return;
        setProject(found);
        if (found) {
          setName(found.name);
          setDescription(found.description);
          setCoverImageUrl(found.coverImageUrl);
          setLiveDemoUrl(found.liveDemoUrl);
          setGithubUrl(found.githubUrl);
          setTagsInput(found.tags.join(', '));
          setStatus(found.status);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Unable to load project.');
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.currentTarget;
    const file = inputEl.files?.[0];
    if (!file || !user) return;
    setError(null);
    setUploadNotice(null);
    setUploadingCover(true);
    try {
      const result = await uploadMediaFile(file, 'project-images', user.uid);
      setCoverImageUrl(result.url);
      setUploadNotice(result.notice);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cover upload failed.');
    } finally {
      inputEl.value = '';
      setUploadingCover(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !profile) return;

    const tags = parseCommaList(tagsInput, 8);
    if (name.trim().length < 2 || description.trim().length < 10 || tags.length === 0) {
      setError('Please provide a valid name, description (10+ chars), and at least 1 tag.');
      return;
    }
    if (!isSafeImageUrl(coverImageUrl)) {
      setError('Cover image must be a valid https:// URL, preset cover, or uploaded image under 200 KB.');
      return;
    }
    if (!isSafeHttpUrl(liveDemoUrl) || !isSafeHttpUrl(githubUrl)) {
      setError('Live demo and GitHub URLs must start with https:// or http://.');
      return;
    }

    setError(null);
    setSuccessNotice(null);
    setSaving(true);
    try {
      await updateProject(project.id, profile, {
        name,
        description,
        coverImageUrl,
        liveDemoUrl,
        githubUrl,
        tags,
        status,
      });
      const updated = await getProjectById(project.id);
      setProject(updated);
      setEditing(false);
      setSuccessNotice('Project details updated.');
    } catch {
      setError('Could not update project.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!project) return;
    setDeleting(true);
    try {
      await deleteProject(project.id);
      navigate('/projects', { replace: true });
    } catch {
      setError('Failed to delete project.');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-[960px] mx-auto px-4 sm:px-6 py-12 space-y-6">
        <div className="h-6 w-32 bg-[#111114] rounded animate-pulse" />
        <div className="aspect-[16/9] bg-[#111114] border border-white/10 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-[960px] mx-auto px-4 sm:px-6 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-[#FAFAFA]">Project not found</h1>
        <p className="mt-2 text-sm text-[#A1A1AA]">
          This project may have been removed or the link is incorrect.
        </p>
        <Link
          to="/projects"
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#FAFAFA] text-[#09090B] text-sm font-semibold hover:bg-[#FAFAFA]/90"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Projects
        </Link>
      </div>
    );
  }

  const isOwner = Boolean(profile && profile.userId === project.ownerId);
  const demoHref = normalizeExternalHref(project.liveDemoUrl);
  const repoHref = normalizeExternalHref(project.githubUrl);

  return (
    <div className="max-w-[960px] mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-8">
      <div className="flex items-center justify-between gap-4">
        <Link
          to="/projects"
          className="inline-flex items-center gap-2 text-sm text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          All Projects
        </Link>

        {isOwner && !editing && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-white/10 bg-[#111114] text-xs font-medium text-[#FAFAFA] hover:bg-[#27272A]"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit Project
            </button>
            {confirmDelete ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDelete}
                  className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/30"
                >
                  {deleting ? 'Deleting...' : 'Confirm Delete'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="p-1.5 rounded-lg text-[#A1A1AA] hover:text-[#FAFAFA]"
                  aria-label="Cancel delete"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-white/10 bg-[#111114] text-xs font-medium text-[#A1A1AA] hover:text-red-400 hover:border-red-500/40"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-300"
        >
          {error}
        </div>
      )}

      {successNotice && (
        <div
          role="status"
          className="bg-[#10B981]/10 border border-[#10B981]/30 rounded-xl p-4 text-sm text-[#10B981] flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {editing ? (
        <form
          onSubmit={handleSave}
          className="bg-[#111114] border border-white/10 rounded-xl p-6 sm:p-8 space-y-5"
        >
          <h2 className="font-display text-xl font-semibold text-[#FAFAFA]">Edit Project</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit-proj-name" className="block text-xs text-[#A1A1AA] mb-1.5">
                Project Name
              </label>
              <input
                id="edit-proj-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg bg-[#09090B] border border-white/10 px-3.5 py-2.5 text-sm text-[#FAFAFA] focus:border-white/40 focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="edit-proj-status" className="block text-xs text-[#A1A1AA] mb-1.5">
                Status
              </label>
              <select
                id="edit-proj-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className="w-full rounded-lg bg-[#09090B] border border-white/10 px-3.5 py-2.5 text-sm text-[#FAFAFA] focus:border-white/40 focus:outline-none"
              >
                <option value="Building">Building</option>
                <option value="Launched">Launched</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="edit-proj-desc" className="block text-xs text-[#A1A1AA] mb-1.5">
              Description
            </label>
            <textarea
              id="edit-proj-desc"
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg bg-[#09090B] border border-white/10 px-3.5 py-2.5 text-sm text-[#FAFAFA] focus:border-white/40 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit-proj-demo" className="block text-xs text-[#A1A1AA] mb-1.5">
                Live Demo URL
              </label>
              <input
                id="edit-proj-demo"
                type="url"
                value={liveDemoUrl}
                onChange={(e) => setLiveDemoUrl(e.target.value)}
                className="w-full rounded-lg bg-[#09090B] border border-white/10 px-3.5 py-2.5 text-sm text-[#FAFAFA] focus:border-white/40 focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="edit-proj-gh" className="block text-xs text-[#A1A1AA] mb-1.5">
                GitHub Repository URL
              </label>
              <input
                id="edit-proj-gh"
                type="url"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                className="w-full rounded-lg bg-[#09090B] border border-white/10 px-3.5 py-2.5 text-sm text-[#FAFAFA] focus:border-white/40 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="edit-proj-tags" className="block text-xs text-[#A1A1AA] mb-1.5">
              Tags (comma-separated)
            </label>
            <input
              id="edit-proj-tags"
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full rounded-lg bg-[#09090B] border border-white/10 px-3.5 py-2.5 text-sm text-[#FAFAFA] focus:border-white/40 focus:outline-none"
            />
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
              <label htmlFor="edit-proj-cover" className="text-xs text-[#A1A1AA]">
                Cover Image URL
              </label>
              <label className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-white/10 bg-[#27272A]/60 text-xs font-medium text-[#FAFAFA] hover:bg-[#27272A] cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-[#A1A1AA]" />
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
            <div className="flex flex-wrap gap-2 mb-2">
              {PRESET_PROJECT_COVERS.map((preset) => (
                <button
                  key={preset.url}
                  type="button"
                  onClick={() => {
                    setUploadNotice(null);
                    setCoverImageUrl(preset.url);
                  }}
                  className={`px-2.5 py-1 rounded text-xs border ${
                    coverImageUrl === preset.url
                      ? 'border-[#FAFAFA] text-[#FAFAFA] bg-[#27272A]'
                      : 'border-white/10 text-[#A1A1AA] hover:text-[#FAFAFA]'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            {coverImageUrl.startsWith('data:image/') && (
              <div className="mb-2 flex items-center gap-3 p-2.5 rounded-lg bg-[#09090B] border border-white/10">
                <SafeImage
                  src={coverImageUrl}
                  alt="Uploaded project cover preview"
                  className="w-16 h-12 rounded object-cover border border-white/10 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#FAFAFA] font-medium">Custom cover image ready</p>
                  <p className="text-[11px] text-[#A1A1AA]">
                    Optimized under 200 KB for fast saving.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCoverImageUrl(project.coverImageUrl);
                    setUploadNotice(null);
                  }}
                  className="px-2.5 py-1 rounded border border-white/10 bg-[#27272A]/60 text-xs text-[#A1A1AA] hover:text-[#FAFAFA] shrink-0"
                >
                  Revert
                </button>
              </div>
            )}
            <input
              id="edit-proj-cover"
              type="text"
              maxLength={280000}
              placeholder={
                coverImageUrl.startsWith('data:image/')
                  ? 'Uploaded cover active (or paste a new https:// URL)'
                  : 'https://... or choose a preset cover'
              }
              value={coverImageUrl.startsWith('data:image/') ? '' : coverImageUrl}
              onChange={(e) => {
                setUploadNotice(null);
                setCoverImageUrl(e.target.value);
              }}
              className="w-full rounded-lg bg-[#09090B] border border-white/10 px-3.5 py-2 text-xs font-mono text-[#FAFAFA] placeholder-[#A1A1AA]/50 focus:border-white/40 focus:outline-none"
            />
            {uploadNotice && (
              <p role="status" className="mt-1.5 text-xs text-[#10B981]">
                {uploadNotice}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="px-4 py-2 rounded-lg border border-white/10 bg-[#27272A]/60 text-sm text-[#A1A1AA] hover:text-[#FAFAFA]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || uploadingCover}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#FAFAFA] text-[#09090B] text-sm font-semibold hover:bg-[#FAFAFA]/90 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      ) : (
        <article className="bg-[#111114] border border-white/10 rounded-xl overflow-hidden">
          <div className="aspect-[16/9] w-full bg-[#09090B] border-b border-white/10">
            <SafeImage
              src={project.coverImageUrl}
              alt={`${project.name} cover`}
              fallbackLabel={project.name}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            <div>
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-mono text-[#A1A1AA]">
                {project.status === 'Launched' ? (
                  <span className="inline-flex items-center gap-1.5 text-[#10B981] font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                    {project.status}
                  </span>
                ) : (
                  <span
                    className={
                      project.status === 'Completed'
                        ? 'text-[#A1A1AA] font-medium'
                        : 'text-[#FAFAFA] font-medium'
                    }
                  >
                    {project.status}
                  </span>
                )}
                <span aria-hidden="true">·</span>
                <span>Published {formatRelativeOrDate(project.createdAt)}</span>
              </div>

              <h1 className="mt-3 font-display text-2xl sm:text-4xl font-bold text-[#FAFAFA] tracking-tight text-balance">
                {project.name}
              </h1>

              <p className="mt-4 text-base text-[#FAFAFA]/90 leading-relaxed whitespace-pre-line">
                {project.description}
              </p>
            </div>

            {/* Tech tags */}
            <div className="pt-4 border-t border-white/10 flex flex-wrap items-center gap-2 text-xs font-mono text-[#A1A1AA]">
              <span className="text-[#FAFAFA] font-medium mr-1">Stack:</span>
              {project.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded border border-white/10 bg-[#27272A] text-[#A1A1AA]"
                >
                  {tag}
                </span>
              ))}
            </div>

            {/* Action links + Author */}
            <div className="pt-5 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              <Link
                to={`/u/${project.ownerUsername}`}
                className="flex items-center gap-3 group"
              >
                <SafeImage
                  src={project.ownerAvatarUrl}
                  alt={project.ownerDisplayName}
                  fallbackLabel={project.ownerDisplayName}
                  variant="avatar"
                  className="w-10 h-10 rounded-full object-cover border border-white/10"
                />
                <div>
                  <div className="text-sm font-semibold text-[#FAFAFA] group-hover:underline">
                    {project.ownerDisplayName}
                  </div>
                  <div className="text-xs font-mono text-[#A1A1AA]">
                    @{project.ownerUsername}
                  </div>
                </div>
              </Link>

              <div className="flex flex-wrap items-center gap-3">
                {repoHref && (
                  <a
                    href={repoHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-white/10 bg-[#27272A]/60 text-sm font-medium text-[#FAFAFA] hover:bg-[#27272A] transition-colors"
                  >
                    <Code2 className="w-4 h-4 text-[#A1A1AA]" />
                    Source Code
                  </a>
                )}
                {demoHref && (
                  <a
                    href={demoHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#FAFAFA] text-[#09090B] text-sm font-semibold hover:bg-[#FAFAFA]/90 transition-colors"
                  >
                    Live Demo
                    <ArrowUpRight className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </article>
      )}
    </div>
  );
}
