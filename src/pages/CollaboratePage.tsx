import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  Lock,
  Plus,
  Send,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  createCollaborationRequest,
  deleteCollaborationRequest,
  reviewCollaborationApplication,
  submitCollaborationApplication,
  subscribeCollaborationRequests,
  subscribeIncomingApplications,
  subscribeMyApplications,
  updateCollaborationRequest,
  withdrawCollaborationApplication,
} from '../lib/api';
import {
  formatRelativeOrDate,
  isSafeHttpUrl,
  normalizeExternalHref,
  parseCommaList,
} from '../lib/validators';
import { useAuth } from '../context/AuthContext';
import type {
  CollaborationApplication,
  CollaborationRequest,
  CollaborationStatus,
  CollaborationType,
} from '../types/domain';
import { SafeImage } from '../components/SafeImage';

const COLLAB_TYPES: ('All' | CollaborationType)[] = [
  'All',
  'Open Source',
  'Startup',
  'Side Project',
  'Learning Together',
];

export function CollaboratePage() {
  const { user, profile, isVerified } = useAuth();
  const navigate = useNavigate();

  const [requests, setRequests] = useState<CollaborationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [myApplications, setMyApplications] = useState<CollaborationApplication[]>([]);
  const [incomingApplications, setIncomingApplications] = useState<CollaborationApplication[]>([]);

  const [typeFilter, setTypeFilter] = useState<'All' | CollaborationType>('All');
  const [statusFilter, setStatusFilter] = useState<'All' | CollaborationStatus>('Open');
  const [activeView, setActiveView] = useState<'opportunities' | 'applications'>('opportunities');

  // Create opportunity state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [skillsInput, setSkillsInput] = useState('TypeScript, UI Design');
  const [projectName, setProjectName] = useState('');
  const [projectUrl, setProjectUrl] = useState('');
  const [collabType, setCollabType] = useState<CollaborationType>('Side Project');
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Action feedback & confirmation state
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [busyRequestId, setBusyRequestId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyAppId, setBusyAppId] = useState<string | null>(null);
  const [confirmWithdrawId, setConfirmWithdrawId] = useState<string | null>(null);

  // Apply to opportunity state
  const [applyingRequest, setApplyingRequest] = useState<CollaborationRequest | null>(null);
  const [applyMessage, setApplyMessage] = useState('');
  const [applySkillsInput, setApplySkillsInput] = useState('');
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    const unsub = subscribeCollaborationRequests(
      (items) => {
        setRequests(items);
        setLoading(false);
        setLoadError(null);
      },
      (err) => {
        setLoadError(err.message || 'Unable to load collaboration opportunities.');
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  useEffect(() => {
    if (!isVerified || !user) {
      setMyApplications([]);
      setIncomingApplications([]);
      return;
    }
    const unsubMine = subscribeMyApplications(user.uid, setMyApplications);
    const unsubIncoming = subscribeIncomingApplications(user.uid, setIncomingApplications);
    return () => {
      unsubMine();
      unsubIncoming();
    };
  }, [user, isVerified]);

  const handleOpenCreate = () => {
    if (!profile || !isVerified) {
      navigate('/auth', { state: { from: '/collaborate' } });
      return;
    }
    setShowCreateForm(true);
    setCreateError(null);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    const skillsNeeded = parseCommaList(skillsInput, 10);
    if (title.trim().length < 3 || description.trim().length < 10) {
      setCreateError('Please enter a title (3+ chars) and description (10+ chars).');
      return;
    }
    if (skillsNeeded.length === 0) {
      setCreateError('Please list at least 1 skill needed.');
      return;
    }
    if (!isSafeHttpUrl(projectUrl)) {
      setCreateError('Project link must start with https:// or http://.');
      return;
    }

    setCreateError(null);
    setActionError(null);
    setActionSuccess(null);
    setCreating(true);
    try {
      await createCollaborationRequest(profile, {
        title,
        description,
        skillsNeeded,
        projectName,
        projectUrl,
        collaborationType: collabType,
      });
      setTitle('');
      setDescription('');
      setProjectName('');
      setProjectUrl('');
      setShowCreateForm(false);
      setActionSuccess('Collaboration opportunity published.');
    } catch {
      setCreateError('Failed to publish collaboration opportunity.');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleOpportunityStatus = async (req: CollaborationRequest) => {
    if (!profile) return;
    const nextStatus: CollaborationStatus = req.status === 'Open' ? 'Closed' : 'Open';
    setActionError(null);
    setActionSuccess(null);
    setBusyRequestId(req.id);
    try {
      await updateCollaborationRequest(req.id, profile, {
        title: req.title,
        description: req.description,
        skillsNeeded: req.skillsNeeded,
        projectName: req.projectName,
        projectUrl: req.projectUrl || '',
        collaborationType: req.collaborationType,
        status: nextStatus,
      });
      setActionSuccess(
        nextStatus === 'Closed'
          ? 'Opportunity marked as Closed.'
          : 'Opportunity reopened.'
      );
    } catch {
      setActionError('Could not update opportunity status. Please try again.');
    } finally {
      setBusyRequestId(null);
    }
  };

  const handleDeleteOpportunity = async (requestId: string) => {
    setActionError(null);
    setActionSuccess(null);
    setBusyRequestId(requestId);
    try {
      await deleteCollaborationRequest(requestId);
      setConfirmDeleteId(null);
      setActionSuccess('Collaboration opportunity deleted.');
    } catch {
      setActionError('Failed to delete collaboration opportunity.');
    } finally {
      setBusyRequestId(null);
    }
  };

  const handleOpenApply = (req: CollaborationRequest) => {
    if (!profile || !isVerified) {
      navigate('/auth', { state: { from: '/collaborate' } });
      return;
    }
    setApplyingRequest(req);
    setApplyMessage('');
    setApplySkillsInput(profile.skills.join(', '));
    setApplyError(null);
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !applyingRequest) return;
    if (applyMessage.trim().length < 10) {
      setApplyError('Please write a short introduction (at least 10 characters).');
      return;
    }
    setApplyError(null);
    setActionError(null);
    setActionSuccess(null);
    setApplying(true);
    try {
      await submitCollaborationApplication(applyingRequest, profile, {
        message: applyMessage,
        skills: parseCommaList(applySkillsInput, 10),
      });
      setApplyingRequest(null);
      setActiveView('applications');
      setActionSuccess('Private application sent.');
    } catch (err) {
      setApplyError(
        err instanceof Error ? err.message : 'Failed to submit application.'
      );
    } finally {
      setApplying(false);
    }
  };

  const handleReviewApplication = async (
    applicationId: string,
    decision: 'Accepted' | 'Rejected'
  ) => {
    setActionError(null);
    setActionSuccess(null);
    setBusyAppId(applicationId);
    try {
      await reviewCollaborationApplication(applicationId, decision);
      setActionSuccess(
        decision === 'Accepted'
          ? 'Application accepted.'
          : 'Application declined.'
      );
    } catch {
      setActionError('Could not update application status. Please try again.');
    } finally {
      setBusyAppId(null);
    }
  };

  const handleWithdrawApplication = async (applicationId: string) => {
    setActionError(null);
    setActionSuccess(null);
    setBusyAppId(applicationId);
    try {
      await withdrawCollaborationApplication(applicationId);
      setConfirmWithdrawId(null);
      setActionSuccess('Application withdrawn.');
    } catch {
      setActionError('Could not withdraw application. Please try again.');
    } finally {
      setBusyAppId(null);
    }
  };

  const myApplicationByRequestId = new Map(
    myApplications.map((a) => [a.requestId, a])
  );

  const filteredRequests = requests.filter((r) => {
    if (typeFilter !== 'All' && r.collaborationType !== typeFilter) return false;
    if (statusFilter !== 'All' && r.status !== statusFilter) return false;
    return true;
  });

  const pendingIncomingCount = incomingApplications.filter(
    (a) => a.status === 'Pending'
  ).length;

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Collaborate
          </h1>
          <p className="mt-1 text-sm text-[#A3A3A3]">
            Find open-source maintainers, startup partners, and weekend study teammates.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#F59E0B] text-[#090909] text-sm font-semibold hover:bg-[#F59E0B]/90 transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          Post Opportunity
        </button>
      </div>

      {/* Primary View Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#292923] pb-4">
        <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-[#171714] border border-[#292923]">
          <button
            type="button"
            onClick={() => setActiveView('opportunities')}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
              activeView === 'opportunities'
                ? 'bg-[#292923] text-white'
                : 'text-[#A3A3A3] hover:text-white'
            }`}
          >
            Opportunities
          </button>
          {isVerified && (
            <button
              type="button"
              onClick={() => setActiveView('applications')}
              className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                activeView === 'applications'
                  ? 'bg-[#292923] text-white'
                  : 'text-[#A3A3A3] hover:text-white'
              }`}
            >
              <Lock className="w-3.5 h-3.5 text-[#F59E0B]" />
              Private Applications
              {pendingIncomingCount > 0 && (
                <span className="font-mono text-[#F59E0B] tabular-nums">
                  ({pendingIncomingCount})
                </span>
              )}
            </button>
          )}
        </div>

        {activeView === 'opportunities' && (
          <div className="flex flex-wrap items-center gap-3">
            <select
              aria-label="Filter by collaboration type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as 'All' | CollaborationType)}
              className="rounded-lg bg-[#171714] border border-[#292923] px-3 py-1.5 text-xs text-white focus:border-[#F59E0B] focus:outline-none"
            >
              {COLLAB_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t === 'All' ? 'All Types' : t}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'All' | CollaborationStatus)}
              className="rounded-lg bg-[#171714] border border-[#292923] px-3 py-1.5 text-xs text-white focus:border-[#F59E0B] focus:outline-none"
            >
              <option value="Open">Open Only</option>
              <option value="Closed">Closed Only</option>
              <option value="All">All Statuses</option>
            </select>
          </div>
        )}
      </div>

      {/* Create Opportunity Form */}
      {showCreateForm && (
        <section className="bg-[#171714] border border-[#292923] rounded-xl p-6 sm:p-8 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-display text-xl font-semibold text-white">
              Publish Collaboration Opportunity
            </h2>
            <button
              type="button"
              aria-label="Close form"
              onClick={() => setShowCreateForm(false)}
              className="p-2 rounded-lg text-[#A3A3A3] hover:text-white hover:bg-[#292923]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleCreateSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="collab-title" className="block text-xs text-[#A3A3A3] mb-1.5">
                Opportunity Title *
              </label>
              <input
                id="collab-title"
                type="text"
                required
                maxLength={120}
                placeholder="Looking for a frontend collaborator for open-source CLI UI"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg bg-[#090909] border border-[#292923] px-3.5 py-2.5 text-sm text-white focus:border-[#F59E0B] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="collab-type" className="block text-xs text-[#A3A3A3] mb-1.5">
                Collaboration Type *
              </label>
              <select
                id="collab-type"
                value={collabType}
                onChange={(e) => setCollabType(e.target.value as CollaborationType)}
                className="w-full rounded-lg bg-[#090909] border border-[#292923] px-3.5 py-2.5 text-sm text-white focus:border-[#F59E0B] focus:outline-none"
              >
                <option value="Open Source">Open Source</option>
                <option value="Startup">Startup</option>
                <option value="Side Project">Side Project</option>
                <option value="Learning Together">Learning Together</option>
              </select>
            </div>

            <div>
              <label htmlFor="collab-project" className="block text-xs text-[#A3A3A3] mb-1.5">
                Project Name (optional)
              </label>
              <input
                id="collab-project"
                type="text"
                maxLength={100}
                placeholder="ShipLog"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full rounded-lg bg-[#090909] border border-[#292923] px-3.5 py-2.5 text-sm text-white focus:border-[#F59E0B] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="collab-project-url" className="block text-xs text-[#A3A3A3] mb-1.5">
                Project Link (optional)
              </label>
              <input
                id="collab-project-url"
                type="url"
                maxLength={300}
                placeholder="https://github.com/username/project"
                value={projectUrl}
                onChange={(e) => setProjectUrl(e.target.value)}
                className="w-full rounded-lg bg-[#090909] border border-[#292923] px-3.5 py-2.5 text-sm text-white focus:border-[#F59E0B] focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="collab-skills" className="block text-xs text-[#A3A3A3] mb-1.5">
                Skills Needed (comma-separated) *
              </label>
              <input
                id="collab-skills"
                type="text"
                required
                placeholder="React, TypeScript, Figma"
                value={skillsInput}
                onChange={(e) => setSkillsInput(e.target.value)}
                className="w-full rounded-lg bg-[#090909] border border-[#292923] px-3.5 py-2.5 text-sm text-white focus:border-[#F59E0B] focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="collab-desc" className="block text-xs text-[#A3A3A3] mb-1.5">
                Description *
              </label>
              <textarea
                id="collab-desc"
                rows={4}
                required
                maxLength={1200}
                placeholder="Describe what you are building, expected time commitment, and who you would love to collaborate with."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg bg-[#090909] border border-[#292923] px-3.5 py-2.5 text-sm text-white focus:border-[#F59E0B] focus:outline-none"
              />
            </div>

            {createError && (
              <p role="alert" className="md:col-span-2 text-xs text-red-400">
                {createError}
              </p>
            )}

            <div className="md:col-span-2 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 rounded-lg border border-[#292923] text-sm text-[#A3A3A3] hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="px-5 py-2.5 rounded-lg bg-[#F59E0B] text-[#090909] text-sm font-semibold hover:bg-[#F59E0B]/90"
              >
                {creating ? 'Publishing...' : 'Publish Opportunity'}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Apply Modal/Panel */}
      {applyingRequest && (
        <section
          aria-label="Submit collaboration application"
          className="bg-[#171714] border border-[#F59E0B]/50 rounded-xl p-6 sm:p-8 space-y-4"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-mono text-[#F59E0B]">Private Application</p>
              <h2 className="font-display text-lg font-semibold text-white mt-1">
                Request to join: {applyingRequest.title}
              </h2>
              <p className="text-xs text-[#A3A3A3] mt-1">
                Only you and @{applyingRequest.ownerUsername} can view this application.
              </p>
            </div>
            <button
              type="button"
              aria-label="Close application form"
              onClick={() => setApplyingRequest(null)}
              className="p-2 rounded-lg text-[#A3A3A3] hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmitApplication} className="space-y-4">
            <div>
              <label htmlFor="apply-message" className="block text-xs text-[#A3A3A3] mb-1.5">
                How would you like to contribute? *
              </label>
              <textarea
                id="apply-message"
                rows={3}
                required
                maxLength={600}
                placeholder="Share a quick note about your interest, background, and what you'd like to build together."
                value={applyMessage}
                onChange={(e) => setApplyMessage(e.target.value)}
                className="w-full rounded-lg bg-[#090909] border border-[#292923] px-3.5 py-2.5 text-sm text-white focus:border-[#F59E0B] focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="apply-skills" className="block text-xs text-[#A3A3A3] mb-1.5">
                Relevant Skills (comma-separated)
              </label>
              <input
                id="apply-skills"
                type="text"
                value={applySkillsInput}
                onChange={(e) => setApplySkillsInput(e.target.value)}
                className="w-full rounded-lg bg-[#090909] border border-[#292923] px-3.5 py-2.5 text-sm text-white focus:border-[#F59E0B] focus:outline-none"
              />
            </div>

            {applyError && (
              <p role="alert" className="text-xs text-red-400">
                {applyError}
              </p>
            )}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setApplyingRequest(null)}
                className="px-4 py-2 rounded-lg border border-[#292923] text-sm text-[#A3A3A3] hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={applying}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[#F59E0B] text-[#090909] text-sm font-semibold hover:bg-[#F59E0B]/90"
              >
                <Send className="w-4 h-4" />
                {applying ? 'Sending...' : 'Send Request'}
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

      {actionError && (
        <div
          role="alert"
          className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-300"
        >
          {actionError}
        </div>
      )}

      {actionSuccess && (
        <div
          role="status"
          className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-sm text-emerald-300 flex items-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {activeView === 'opportunities' ? (
        loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-[#171714] border border-[#292923] rounded-xl h-56 animate-pulse"
              />
            ))}
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="bg-[#171714] border border-[#292923] rounded-xl p-12 text-center">
            <Users className="w-8 h-8 text-[#F59E0B] mx-auto mb-3" />
            <h2 className="font-display text-lg font-semibold text-white">
              No collaboration opportunities match your filter
            </h2>
            <p className="mt-2 text-sm text-[#A3A3A3]">
              Post an opportunity to invite collaborators onto your project or study group.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredRequests.map((req) => {
              const isOwner = Boolean(profile && profile.userId === req.ownerId);
              const existingApp = myApplicationByRequestId.get(req.id);
              const safeProjectLink = normalizeExternalHref(req.projectUrl || '');
              const isBusy = busyRequestId === req.id;

              return (
                <article
                  key={req.id}
                  className="bg-[#171714] border border-[#292923] rounded-xl p-6 flex flex-col justify-between gap-5"
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                      <div className="flex flex-wrap items-center gap-2 text-[#A3A3A3]">
                        <span
                          className={
                            req.status === 'Open'
                              ? 'text-[#F59E0B] font-medium'
                              : 'text-[#A3A3A3]'
                          }
                        >
                          {req.status}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{req.collaborationType}</span>
                        {req.projectName && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-white/80">{req.projectName}</span>
                          </>
                        )}
                      </div>
                      <span className="text-[#A3A3A3]">
                        {formatRelativeOrDate(req.createdAt)}
                      </span>
                    </div>

                    <h2 className="mt-3 font-display text-lg font-semibold text-white">
                      {req.title}
                    </h2>

                    <p className="mt-2 text-sm text-[#A3A3A3] leading-relaxed whitespace-pre-line">
                      {req.description}
                    </p>

                    {safeProjectLink && (
                      <a
                        href={safeProjectLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 text-xs font-mono text-[#F59E0B] hover:underline break-all"
                      >
                        <span>{safeProjectLink}</span>
                        <ArrowUpRight className="w-3.5 h-3.5 shrink-0" />
                      </a>
                    )}

                    <div className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-mono text-[#A3A3A3]">
                      <span className="text-white/90">Skills needed:</span>
                      {req.skillsNeeded.map((s, idx) => (
                        <span key={s} className="inline-flex items-center gap-2.5">
                          {idx > 0 && <span aria-hidden="true">·</span>}
                          <span>{s}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#292923] flex flex-wrap items-center justify-between gap-3">
                    <Link
                      to={`/u/${req.ownerUsername}`}
                      className="flex items-center gap-2.5 group"
                    >
                      <SafeImage
                        src={req.ownerAvatarUrl}
                        alt={req.ownerDisplayName}
                        fallbackLabel={req.ownerDisplayName}
                        variant="avatar"
                        className="w-7 h-7 rounded-full object-cover border border-[#292923]"
                      />
                      <span className="text-xs text-[#A3A3A3] group-hover:text-white">
                        {req.ownerDisplayName}{' '}
                        <span className="font-mono">@{req.ownerUsername}</span>
                      </span>
                    </Link>

                    {isOwner ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleToggleOpportunityStatus(req)}
                          className="px-3 py-1.5 rounded-lg border border-[#292923] text-xs font-medium text-white hover:bg-[#292923] disabled:opacity-50"
                        >
                          {isBusy
                            ? 'Updating...'
                            : req.status === 'Open'
                              ? 'Close'
                              : 'Reopen'}
                        </button>
                        {confirmDeleteId === req.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleDeleteOpportunity(req.id)}
                              className="px-2.5 py-1 rounded-lg bg-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/30 disabled:opacity-50"
                            >
                              {isBusy ? 'Deleting...' : 'Delete'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              aria-label="Cancel delete opportunity"
                              className="p-1.5 rounded-lg text-[#A3A3A3] hover:text-white"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            aria-label="Delete opportunity"
                            onClick={() => setConfirmDeleteId(req.id)}
                            className="p-1.5 rounded-lg text-[#A3A3A3] hover:text-red-400 hover:bg-[#292923]"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ) : existingApp ? (
                      <span className="text-xs font-mono text-[#F59E0B]">
                        Applied ({existingApp.status})
                      </span>
                    ) : req.status === 'Open' ? (
                      <button
                        type="button"
                        onClick={() => handleOpenApply(req)}
                        className="px-4 py-2 rounded-lg bg-[#F59E0B] text-[#090909] text-xs font-semibold hover:bg-[#F59E0B]/90 transition-colors whitespace-nowrap"
                      >
                        Request to Join
                      </button>
                    ) : (
                      <span className="text-xs font-mono text-[#A3A3A3]">Closed</span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )
      ) : (
        /* Private Applications View */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Incoming for Owner */}
          <section className="space-y-4">
            <div>
              <h2 className="font-display text-lg font-semibold text-white">
                Incoming Requests to Your Opportunities
              </h2>
              <p className="text-xs text-[#A3A3A3] mt-1">
                Review applicants and accept or decline collaboration requests.
              </p>
            </div>

            {incomingApplications.length === 0 ? (
              <div className="bg-[#171714] border border-[#292923] rounded-xl p-6 text-sm text-[#A3A3A3]">
                No incoming applications yet.
              </div>
            ) : (
              <div className="space-y-4">
                {incomingApplications.map((app) => (
                  <div
                    key={app.id}
                    className="bg-[#171714] border border-[#292923] rounded-xl p-5 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        to={`/u/${app.applicantUsername}`}
                        className="flex items-center gap-2.5 group"
                      >
                        <SafeImage
                          src={app.applicantAvatarUrl}
                          alt={app.applicantDisplayName}
                          fallbackLabel={app.applicantDisplayName}
                          variant="avatar"
                          className="w-8 h-8 rounded-full object-cover border border-[#292923]"
                        />
                        <div>
                          <div className="text-sm font-semibold text-white group-hover:text-[#F59E0B]">
                            {app.applicantDisplayName}
                          </div>
                          <div className="text-xs font-mono text-[#A3A3A3]">
                            @{app.applicantUsername} · {app.requestTitle}
                          </div>
                        </div>
                      </Link>
                      <span
                        className={`text-xs font-mono font-medium ${
                          app.status === 'Accepted'
                            ? 'text-emerald-400'
                            : app.status === 'Rejected'
                              ? 'text-red-400'
                              : 'text-[#F59E0B]'
                        }`}
                      >
                        {app.status}
                      </span>
                    </div>

                    <p className="text-sm text-white/90 leading-relaxed">{app.message}</p>

                    {app.skills.length > 0 && (
                      <p className="text-xs font-mono text-[#A3A3A3]">
                        Skills: {app.skills.join(' · ')}
                      </p>
                    )}

                    {app.status === 'Pending' && (
                      <div className="pt-2 flex items-center gap-2">
                        <button
                          type="button"
                          disabled={busyAppId === app.id}
                          onClick={() => handleReviewApplication(app.id, 'Accepted')}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#F59E0B] text-[#090909] text-xs font-semibold hover:bg-[#F59E0B]/90 disabled:opacity-50"
                        >
                          <Check className="w-3.5 h-3.5" />
                          {busyAppId === app.id ? 'Updating...' : 'Accept'}
                        </button>
                        <button
                          type="button"
                          disabled={busyAppId === app.id}
                          onClick={() => handleReviewApplication(app.id, 'Rejected')}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-[#292923] text-xs font-medium text-[#A3A3A3] hover:text-white hover:bg-[#292923] disabled:opacity-50"
                        >
                          <X className="w-3.5 h-3.5" />
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Outgoing Sent Applications */}
          <section className="space-y-4">
            <div>
              <h2 className="font-display text-lg font-semibold text-white">
                Your Sent Applications
              </h2>
              <p className="text-xs text-[#A3A3A3] mt-1">
                Track responses from opportunity owners.
              </p>
            </div>

            {myApplications.length === 0 ? (
              <div className="bg-[#171714] border border-[#292923] rounded-xl p-6 text-sm text-[#A3A3A3]">
                You haven&apos;t applied to any collaboration opportunities yet.
              </div>
            ) : (
              <div className="space-y-4">
                {myApplications.map((app) => (
                  <div
                    key={app.id}
                    className="bg-[#171714] border border-[#292923] rounded-xl p-5 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-white">
                          {app.requestTitle}
                        </h3>
                        <p className="text-xs font-mono text-[#A3A3A3] mt-0.5">
                          Submitted {formatRelativeOrDate(app.createdAt)}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-mono font-medium ${
                          app.status === 'Accepted'
                            ? 'text-emerald-400'
                            : app.status === 'Rejected'
                              ? 'text-red-400'
                              : 'text-[#F59E0B]'
                        }`}
                      >
                        {app.status}
                      </span>
                    </div>

                    <p className="text-sm text-[#A3A3A3] leading-relaxed">{app.message}</p>

                    {app.status === 'Pending' && (
                      <div className="pt-1">
                        {confirmWithdrawId === app.id ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={busyAppId === app.id}
                              onClick={() => handleWithdrawApplication(app.id)}
                              className="px-2.5 py-1 rounded bg-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/30 disabled:opacity-50"
                            >
                              {busyAppId === app.id ? 'Withdrawing...' : 'Confirm Withdraw'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmWithdrawId(null)}
                              className="text-xs text-[#A3A3A3] hover:text-white"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmWithdrawId(app.id)}
                            className="text-xs text-[#A3A3A3] hover:text-red-400 transition-colors"
                          >
                            Withdraw request
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
