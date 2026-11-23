import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Check,
  CheckCircle2,
  Code2,
  Globe,
  MapPin,
  Pencil,
  Upload,
  X,
} from 'lucide-react';
import {
  getProfileByUsername,
  subscribePosts,
  subscribeProjects,
  updateUserProfile,
  uploadMediaFile,
} from '../lib/api';
import {
  isSafeHttpUrl,
  isSafeImageUrl,
  isValidUsername,
  normalizeExternalHref,
  parseCommaList,
} from '../lib/validators';
import { useAuth } from '../context/AuthContext';
import type { Post, Profile, Project } from '../types/domain';
import { PostCard } from '../components/PostCard';
import { ProjectCard } from '../components/ProjectCard';
import { SafeImage } from '../components/SafeImage';

export function ProfilePage() {
  const { username: routeUsername } = useParams<{ username?: string }>();
  const { user, profile: myProfile, loading: authLoading, isVerified, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const isViewingSelfRoute = !routeUsername;

  const [viewedProfile, setViewedProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [posts, setPosts] = useState<Post[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'projects'>('projects');

  // Edit profile state
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [skillsInput, setSkillsInput] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (isViewingSelfRoute) {
      if (authLoading) return;
      if (!user) {
        navigate('/auth', { state: { from: '/profile' }, replace: true });
        return;
      }
      setViewedProfile(myProfile);
      setProfileLoading(false);
      return;
    }

    setProfileLoading(true);
    setProfileError(null);
    getProfileByUsername(routeUsername!)
      .then((found) => {
        if (!active) return;
        setViewedProfile(found);
        setProfileLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setProfileError(err instanceof Error ? err.message : 'Unable to load profile.');
        setProfileLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isViewingSelfRoute, routeUsername, authLoading, user, myProfile, navigate]);

  useEffect(() => {
    if (!viewedProfile) return;
    const unsubPosts = subscribePosts(setPosts, undefined, viewedProfile.userId);
    const unsubProjects = subscribeProjects(setProjects, undefined, viewedProfile.userId);
    return () => {
      unsubPosts();
      unsubProjects();
    };
  }, [viewedProfile?.userId]);

  const startEditing = () => {
    if (!viewedProfile) return;
    setDisplayName(viewedProfile.displayName);
    setUsernameInput(viewedProfile.username);
    setAvatarUrl(viewedProfile.avatarUrl);
    setBio(viewedProfile.bio);
    setLocation(viewedProfile.location);
    setSkillsInput(viewedProfile.skills.join(', '));
    setGithubUrl(viewedProfile.githubUrl);
    setPortfolioUrl(viewedProfile.portfolioUrl);
    setEditError(null);
    setUploadNotice(null);
    setSaveSuccess(null);
    setEditing(true);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.currentTarget;
    const file = inputEl.files?.[0];
    if (!file || !user) return;
    setEditError(null);
    setUploadNotice(null);
    setUploadingAvatar(true);
    try {
      const result = await uploadMediaFile(file, 'avatars', user.uid);
      setAvatarUrl(result.url);
      setUploadNotice(result.notice);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Avatar upload failed.');
    } finally {
      inputEl.value = '';
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !myProfile) return;

    const cleanUsername = usernameInput.toLowerCase().trim();
    if (!isValidUsername(cleanUsername)) {
      setEditError('Username must be 3-30 lowercase letters, numbers, or underscores.');
      return;
    }
    if (!displayName.trim()) {
      setEditError('Display name is required.');
      return;
    }
    if (!isSafeImageUrl(avatarUrl)) {
      setEditError('Profile picture must be an HTTPS image URL or an uploaded image under 200 KB.');
      return;
    }
    if (!isSafeHttpUrl(githubUrl) || !isSafeHttpUrl(portfolioUrl)) {
      setEditError('GitHub and Portfolio URLs must start with https:// or http://.');
      return;
    }

    setEditError(null);
    setSaveSuccess(null);
    setSaving(true);
    try {
      const updated = await updateUserProfile(user.uid, myProfile.username, {
        username: cleanUsername,
        displayName,
        avatarUrl,
        bio,
        location,
        skills: parseCommaList(skillsInput, 15),
        githubUrl,
        portfolioUrl,
      });
      await refreshProfile();
      setViewedProfile(updated);
      setEditing(false);
      setSaveSuccess('Profile updated.');
      if (routeUsername && cleanUsername !== routeUsername) {
        navigate(`/u/${cleanUsername}`, { replace: true });
      }
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Could not update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (profileLoading || (isViewingSelfRoute && authLoading)) {
    return (
      <div className="max-w-[1000px] mx-auto px-4 sm:px-6 py-12 space-y-6">
        <div className="bg-[#171714] border border-[#292923] rounded-xl h-52 animate-pulse" />
      </div>
    );
  }

  if (isViewingSelfRoute && user && !isVerified) {
    return (
      <div className="max-w-[700px] mx-auto px-4 sm:px-6 py-16 text-center">
        <div className="bg-[#171714] border border-[#292923] rounded-xl p-8">
          <h1 className="font-display text-2xl font-bold text-white">
            Verify your email to activate your profile
          </h1>
          <p className="mt-2 text-sm text-[#A3A3A3]">
            Check your inbox for the verification link we sent to {user.email}, then click
            &ldquo;I&apos;ve Verified&rdquo; in the banner above.
          </p>
        </div>
      </div>
    );
  }

  if (profileError || !viewedProfile) {
    return (
      <div className="max-w-[700px] mx-auto px-4 sm:px-6 py-16 text-center">
        <h1 className="font-display text-2xl font-bold text-white">
          Developer profile not found
        </h1>
        <p className="mt-2 text-sm text-[#A3A3A3]">
          {profileError || `No builder found with username "@${routeUsername}".`}
        </p>
        <Link
          to="/community"
          className="mt-6 inline-block px-5 py-2.5 rounded-lg bg-[#F59E0B] text-[#090909] text-sm font-semibold"
        >
          Back to Community
        </Link>
      </div>
    );
  }

  const isOwnProfile = Boolean(myProfile && myProfile.userId === viewedProfile.userId);
  const safeGithub = normalizeExternalHref(viewedProfile.githubUrl);
  const safePortfolio = normalizeExternalHref(viewedProfile.portfolioUrl);

  return (
    <div className="max-w-[1000px] mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-8">
      {/* Profile Header Card */}
      <section className="bg-[#171714] border border-[#292923] rounded-xl p-6 sm:p-8">
        {editing ? (
          <form onSubmit={handleSaveProfile} className="space-y-5">
            <div className="flex items-center justify-between gap-4">
              <h1 className="font-display text-xl font-semibold text-white">Edit Profile</h1>
              <button
                type="button"
                aria-label="Cancel profile edit"
                onClick={() => setEditing(false)}
                className="p-2 rounded-lg text-[#A3A3A3] hover:text-white hover:bg-[#292923]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="prof-name" className="block text-xs text-[#A3A3A3] mb-1.5">
                  Display Name *
                </label>
                <input
                  id="prof-name"
                  type="text"
                  required
                  maxLength={60}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-lg bg-[#090909] border border-[#292923] px-3.5 py-2.5 text-sm text-white focus:border-[#F59E0B] focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="prof-username" className="block text-xs text-[#A3A3A3] mb-1.5">
                  Username *
                </label>
                <input
                  id="prof-username"
                  type="text"
                  required
                  maxLength={30}
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="w-full rounded-lg bg-[#090909] border border-[#292923] px-3.5 py-2.5 text-sm font-mono text-white focus:border-[#F59E0B] focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label htmlFor="prof-avatar" className="text-xs text-[#A3A3A3]">
                    Profile Picture URL
                  </label>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border border-[#292923] text-xs text-white hover:bg-[#292923] cursor-pointer">
                    <Upload className="w-3.5 h-3.5 text-[#F59E0B]" />
                    {uploadingAvatar ? 'Uploading...' : 'Upload Photo'}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleAvatarUpload}
                      disabled={uploadingAvatar}
                      className="sr-only"
                    />
                  </label>
                </div>
                <div className="flex items-center gap-3">
                  <SafeImage
                    src={avatarUrl}
                    alt={displayName || 'Avatar preview'}
                    fallbackLabel={displayName || usernameInput || 'ST'}
                    variant="avatar"
                    className="w-10 h-10 rounded-full object-cover border border-[#292923] shrink-0"
                  />
                  <input
                    id="prof-avatar"
                    type="text"
                    maxLength={280000}
                    placeholder={
                      avatarUrl.startsWith('data:image/')
                        ? 'Uploaded compressed image active (or paste a new https:// URL)'
                        : 'https://...'
                    }
                    value={avatarUrl.startsWith('data:image/') ? '' : avatarUrl}
                    onChange={(e) => {
                      setUploadNotice(null);
                      setAvatarUrl(e.target.value);
                    }}
                    className="w-full rounded-lg bg-[#090909] border border-[#292923] px-3.5 py-2.5 text-sm text-white placeholder-[#A3A3A3]/60 focus:border-[#F59E0B] focus:outline-none"
                  />
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setAvatarUrl('');
                        setUploadNotice(null);
                      }}
                      className="px-2.5 py-2 rounded-lg border border-[#292923] text-xs text-[#A3A3A3] hover:text-white shrink-0"
                    >
                      Clear
                    </button>
                  )}
                </div>
                {uploadNotice && (
                  <p role="status" className="mt-1.5 text-xs text-emerald-400">
                    {uploadNotice}
                  </p>
                )}
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="prof-bio" className="block text-xs text-[#A3A3A3] mb-1.5">
                  Short Biography
                </label>
                <textarea
                  id="prof-bio"
                  rows={3}
                  maxLength={400}
                  placeholder="Tell the community what you love building or learning."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full rounded-lg bg-[#090909] border border-[#292923] px-3.5 py-2.5 text-sm text-white focus:border-[#F59E0B] focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="prof-location" className="block text-xs text-[#A3A3A3] mb-1.5">
                  Location (optional)
                </label>
                <input
                  id="prof-location"
                  type="text"
                  maxLength={80}
                  placeholder="London, UK"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full rounded-lg bg-[#090909] border border-[#292923] px-3.5 py-2.5 text-sm text-white focus:border-[#F59E0B] focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="prof-skills" className="block text-xs text-[#A3A3A3] mb-1.5">
                  Skills &amp; Technologies (comma-separated)
                </label>
                <input
                  id="prof-skills"
                  type="text"
                  placeholder="TypeScript, React, Rust, UI Design"
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                  className="w-full rounded-lg bg-[#090909] border border-[#292923] px-3.5 py-2.5 text-sm text-white focus:border-[#F59E0B] focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="prof-github" className="block text-xs text-[#A3A3A3] mb-1.5">
                  GitHub Profile URL
                </label>
                <input
                  id="prof-github"
                  type="url"
                  maxLength={300}
                  placeholder="https://github.com/username"
                  value={githubUrl}
                  onChange={(e) => setGithubUrl(e.target.value)}
                  className="w-full rounded-lg bg-[#090909] border border-[#292923] px-3.5 py-2.5 text-sm text-white focus:border-[#F59E0B] focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="prof-portfolio" className="block text-xs text-[#A3A3A3] mb-1.5">
                  Portfolio URL
                </label>
                <input
                  id="prof-portfolio"
                  type="url"
                  maxLength={300}
                  placeholder="https://yourwebsite.dev"
                  value={portfolioUrl}
                  onChange={(e) => setPortfolioUrl(e.target.value)}
                  className="w-full rounded-lg bg-[#090909] border border-[#292923] px-3.5 py-2.5 text-sm text-white focus:border-[#F59E0B] focus:outline-none"
                />
              </div>
            </div>

            {editError && (
              <p role="alert" className="text-xs text-red-400">
                {editError}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-4 py-2 rounded-lg border border-[#292923] text-sm text-[#A3A3A3] hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || uploadingAvatar}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#F59E0B] text-[#090909] text-sm font-semibold hover:bg-[#F59E0B]/90"
              >
                <Check className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-start gap-5">
              <SafeImage
                src={viewedProfile.avatarUrl}
                alt={viewedProfile.displayName}
                fallbackLabel={viewedProfile.displayName}
                variant="avatar"
                className="w-20 h-20 rounded-full object-cover border border-[#292923] shrink-0"
              />
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  {viewedProfile.displayName}
                </h1>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono text-[#A3A3A3]">
                  <span>@{viewedProfile.username}</span>
                  {viewedProfile.location && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-[#F59E0B]" />
                      {viewedProfile.location}
                    </span>
                  )}
                </div>

                <p className="mt-4 text-sm sm:text-base text-white/90 leading-relaxed max-w-2xl">
                  {viewedProfile.bio ||
                    (isOwnProfile
                      ? 'Add a short biography and your skills so other builders can discover you.'
                      : 'No biography added yet.')}
                </p>

                {viewedProfile.skills.length > 0 && (
                  <div className="mt-4 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-mono text-[#A3A3A3]">
                    <span className="text-white font-medium">Skills:</span>
                    {viewedProfile.skills.map((skill, idx) => (
                      <span key={skill} className="inline-flex items-center gap-2.5">
                        {idx > 0 && <span aria-hidden="true">·</span>}
                        <span>{skill}</span>
                      </span>
                    ))}
                  </div>
                )}

                {(safeGithub || safePortfolio) && (
                  <div className="mt-5 flex flex-wrap items-center gap-4 text-xs font-medium">
                    {safeGithub && (
                      <a
                        href={safeGithub}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[#F59E0B] hover:underline"
                      >
                        <Code2 className="w-4 h-4" />
                        GitHub
                      </a>
                    )}
                    {safePortfolio && (
                      <a
                        href={safePortfolio}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[#F59E0B] hover:underline"
                      >
                        <Globe className="w-4 h-4" />
                        Portfolio
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            {isOwnProfile && (
              <button
                type="button"
                onClick={startEditing}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#292923] text-xs font-medium text-white hover:bg-[#292923] transition-colors whitespace-nowrap shrink-0 self-start"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit Profile
              </button>
            )}
          </div>
        )}

        {!editing && saveSuccess && (
          <div
            role="status"
            className="mt-5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-2.5 text-xs text-emerald-300 flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{saveSuccess}</span>
          </div>
        )}
      </section>

      {/* Tabs: Showcased Projects & Published Posts */}
      <div className="space-y-6">
        <div
          role="tablist"
          aria-label="Developer content"
          className="inline-flex items-center gap-1 p-1 rounded-lg bg-[#171714] border border-[#292923]"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'projects'}
            onClick={() => setActiveTab('projects')}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'projects'
                ? 'bg-[#292923] text-white'
                : 'text-[#A3A3A3] hover:text-white'
            }`}
          >
            Showcased Projects <span className="font-mono tabular-nums">({projects.length})</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'posts'}
            onClick={() => setActiveTab('posts')}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === 'posts'
                ? 'bg-[#292923] text-white'
                : 'text-[#A3A3A3] hover:text-white'
            }`}
          >
            Published Posts <span className="font-mono tabular-nums">({posts.length})</span>
          </button>
        </div>

        {activeTab === 'projects' ? (
          projects.length === 0 ? (
            <div className="bg-[#171714] border border-[#292923] rounded-xl p-10 text-center">
              <p className="text-sm text-[#A3A3A3]">
                {isOwnProfile
                  ? 'You have not showcased any projects yet.'
                  : 'No projects showcased yet.'}
              </p>
              {isOwnProfile && (
                <Link
                  to="/projects"
                  className="mt-4 inline-block px-4 py-2 rounded-lg bg-[#F59E0B] text-[#090909] text-xs font-semibold"
                >
                  Publish a Project
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {projects.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </div>
          )
        ) : posts.length === 0 ? (
          <div className="bg-[#171714] border border-[#292923] rounded-xl p-10 text-center">
            <p className="text-sm text-[#A3A3A3]">
              {isOwnProfile
                ? 'You have not shared any community updates yet.'
                : 'No community updates yet.'}
            </p>
            {isOwnProfile && (
              <Link
                to="/community"
                className="mt-4 inline-block px-4 py-2 rounded-lg bg-[#F59E0B] text-[#090909] text-xs font-semibold"
              >
                Write an Update
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onRequireAuth={() => navigate('/auth')}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
