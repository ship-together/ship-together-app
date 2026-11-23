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
        <div className="h-6 w-32 bg-[#171714] rounded animate-pulse" />
        <div className="aspect-[16/9] bg-[#171714] border border-[#292923] rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-[960px] mx-auto px-4 sm:px-6 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-white">Project not found</h1>
        <p className="mt-2 text-sm text-[#A3A3A3]">
          This project may have been removed or the link is incorrect.
        </p>
        <Link
          to="/projects"
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#F59E0B] text-[#090909] text-sm font-semibold"
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
          className="inline-flex items-center gap-2 text-sm text-[#A3A3A3] hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          All Projects
        </Link>

        {isOwner && !editing && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-[#292923] text-xs font-medium text-white hover:bg-[#171714]"
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
                  className="p-1.5 rounded-lg text-[#A3A3A3] hover:text-white"
                  aria-label="Cancel delete"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-[#292923] text-xs font-medium text-[#A3A3A3] hover:text-red-400 hover:border-red-500/40"
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
          className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-sm text-emerald-300 flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {editing ? (
        <form
          onSubmit={handleSave}
          className="bg-[#171714] border border-[#292923] rounded-xl p-6 sm:p-8 space-y-5"
        >
          <h2 className="font-display text-xl font-semibold text-white">Edit Project</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit-proj-name" className="block text-xs text-[#A3A3A3] mb-1.5">
                Project Name
              </label>
              <input
                id="edit-proj-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg bg-[#090909] border border-[#292923] px-3.5 py-2.5 text-sm text-white focus:border-[#F59E0B] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="edit-proj-status" className="block text-xs text-[#A3A3A3] mb-1.5">
                Status
              </label>
              <select
                id="edit-proj-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as ProjectStatus)}
                className="w-full rounded-lg bg-[#090909] border border-[#292923] px-3.5 py-2.5 text-sm text-white focus:border-[#F59E0B] focus:outline-none"
              >
                <option value="Building">Building</option>
                <option value="Launched">Launched</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="edit-proj-desc" className="block text-xs text-[#A3A3A3] mb-1.5">
              Description
            </label>
            <textarea
              id="edit-proj-desc"
              rows={4}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg bg-[#090909] border border-[#292923] px-3.5 py-2.5 text-sm text-white focus:border-[#F59E0B] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit-proj-demo" className="block text-xs text-[#A3A3A3] mb-1.5">
                Live Demo URL
              </label>
              <input
                id="edit-proj-demo"
                type="url"
                value={liveDemoUrl}
                onChange={(e) => setLiveDemoUrl(e.target.value)}
                className="w-full rounded-lg bg-[#090909] border border-[#292923] px-3.5 py-2.5 text-sm text-white focus:border-[#F59E0B] focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="edit-proj-gh" className="block text-xs text-[#A3A3A3] mb-1.5">
                GitHub Repository URL
              </label>
              <input
                id="edit-proj-gh"
                type="url"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
                className="w-full rounded-lg bg-[#090909] border border-[#292923] px-3.5 py-2.5 text-sm text-white focus:border-[#F59E0B] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label htmlFor="edit-proj-tags" className="block text-xs text-[#A3A3A3] mb-1.5">
              Tags (comma-separated)
            </label>
            <input
              id="edit-proj-tags"
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full rounded-lg bg-[#090909] border border-[#292923] px-3.5 py-2.5 text-sm text-white focus:border-[#F59E0B] focus:outline-none"
            />
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
              <label htmlFor="edit-proj-cover" className="text-xs text-[#A3A3A3]">
                Cover Image URL
              </label>
              <label className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-[#292923] text-xs font-medium text-white hover:bg-[#292923] cursor-pointer">
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
                      ? 'border-[#F59E0B] text-[#F59E0B]'
                      : 'border-[#292923] text-[#A3A3A3]'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            {coverImageUrl.startsWith('data:image/') && (
              <div className="mb-2 flex items-center gap-3 p-2.5 rounded-lg bg-[#090909] border border-[#292923]">
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
                    setCoverImageUrl(project.coverImageUrl);
                    setUploadNotice(null);
                  }}
                  className="px-2.5 py-1 rounded border border-[#292923] text-xs text-[#A3A3A3] hover:text-white shrink-0"
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
              className="w-full rounded-lg bg-[#090909] border border-[#292923] px-3.5 py-2 text-xs font-mono text-white placeholder-[#A3A3A3]/50 focus:border-[#F59E0B] focus:outline-none"
            />
            {uploadNotice && (
              <p role="status" className="mt-1.5 text-xs text-emerald-400">
                {uploadNotice}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="px-4 py-2 rounded-lg border border-[#292923] text-sm text-[#A3A3A3] hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || uploadingCover}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#F59E0B] text-[#090909] text-sm font-semibold hover:bg-[#F59E0B]/90 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      ) : (
        <article className="bg-[#171714] border border-[#292923] rounded-xl overflow-hidden">
          <div className="aspect-[16/9] w-full bg-[#090909] border-b border-[#292923]">
            <SafeImage
              src={project.coverImageUrl}
              alt={`${project.name} cover`}
              fallbackLabel={project.name}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            <div>
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-mono text-[#A3A3A3]">
                <span
                  className={
                    project.status === 'Launched'
                      ? 'text-[#F59E0B] font-medium'
                      : project.status === 'Completed'
                        ? 'text-emerald-400 font-medium'
                        : 'text-white font-medium'
                  }
                >
                  {project.status}
                </span>
                <span aria-hidden="true">·</span>
                <span>Published {formatRelativeOrDate(project.createdAt)}</span>
              </div>

              <h1 className="mt-3 font-display text-2xl sm:text-4xl font-bold text-white tracking-tight text-balance">
                {project.name}
              </h1>

              <p className="mt-4 text-base text-white/90 leading-relaxed whitespace-pre-line">
                {project.description}
              </p>
            </div>

            {/* Tech tags as clean unboxed metadata */}
            <div className="pt-4 border-t border-[#292923] flex flex-wrap items-center gap-x-3 gap-y-2 text-xs font-mono text-[#A3A3A3]">
              <span className="text-white font-medium">Stack:</span>
              {project.tags.map((tag, idx) => (
                <span key={tag} className="inline-flex items-center gap-3">
                  {idx > 0 && <span aria-hidden="true">/</span>}
                  <span>{tag}</span>
                </span>
              ))}
            </div>

            {/* Action links + Author */}
            <div className="pt-5 border-t border-[#292923] flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              <Link
                to={`/u/${project.ownerUsername}`}
                className="flex items-center gap-3 group"
              >
                <SafeImage
                  src={project.ownerAvatarUrl}
                  alt={project.ownerDisplayName}
                  fallbackLabel={project.ownerDisplayName}
                  variant="avatar"
                  className="w-10 h-10 rounded-full object-cover border border-[#292923]"
                />
                <div>
                  <div className="text-sm font-semibold text-white group-hover:text-[#F59E0B] transition-colors">
                    {project.ownerDisplayName}
                  </div>
                  <div className="text-xs font-mono text-[#A3A3A3]">
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
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#292923] text-sm font-medium text-white hover:bg-[#292923] transition-colors"
                  >
                    <Code2 className="w-4 h-4 text-[#A3A3A3]" />
                    Source Code
                  </a>
                )}
                {demoHref && (
                  <a
                    href={demoHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#F59E0B] text-[#090909] text-sm font-semibold hover:bg-[#F59E0B]/90 transition-colors"
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
