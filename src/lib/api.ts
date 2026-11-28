import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import {
  db,
  handleFirestoreError,
  isFirebaseStorageConfigured,
  OperationType,
  storage,
} from './firebase';
import type {
  ApplicationStatus,
  CollaborationApplication,
  CollaborationRequest,
  CollaborationStatus,
  CollaborationType,
  Post,
  PostComment,
  Profile,
  Project,
  ProjectStatus,
} from '../types/domain';
import {
  isSafeImageUrl,
  MAX_IMAGE_DATA_URL_LENGTH,
  sanitizeUsernameCandidate,
} from './validators';

// ---------------------------------------------------------------------------
// Media upload via Supabase Storage / Firebase Storage (10s timeout)
// with automatic client-side Canvas resize & compression fallback (<200KB)
// ---------------------------------------------------------------------------

const UPLOAD_TIMEOUT_MS = 10_000;
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);
const TARGET_MAX_DATA_URL_CHARS = 262_000; // <= ~196KB binary payload

export interface UploadMediaResult {
  url: string;
  source: 'supabase' | 'firebase' | 'data-url';
  notice: string;
}

function getSupabaseStorageConfig(): { url: string; anonKey: string } | null {
  const rawUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || '';
  const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || '';
  if (
    !rawUrl ||
    !rawKey ||
    rawUrl.includes('your-project-ref') ||
    rawKey.includes('your-supabase-anon')
  ) {
    return null;
  }
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;
    return { url: rawUrl.replace(/\/+$/, ''), anonKey: rawKey };
  } catch {
    return null;
  }
}

async function uploadToSupabaseStorage(
  file: File,
  folder: 'avatars' | 'project-images',
  objectPath: string
): Promise<string | null> {
  const cfg = getSupabaseStorageConfig();
  if (!cfg) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
  try {
    const endpoint = `${cfg.url}/storage/v1/object/${folder}/${objectPath}`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        apikey: cfg.anonKey,
        Authorization: `Bearer ${cfg.anonKey}`,
        'Content-Type': file.type,
        'x-upsert': 'true',
      },
      body: file,
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`Supabase Storage responded with HTTP ${res.status}.`);
    }
    return `${cfg.url}/storage/v1/object/public/${folder}/${objectPath}`;
  } finally {
    clearTimeout(timer);
  }
}

async function uploadToFirebaseStorageWithTimeout(
  file: File,
  folder: 'avatars' | 'project-images',
  objectPath: string
): Promise<string> {
  if (!isFirebaseStorageConfigured || !storage) {
    throw new Error('Firebase Storage is not configured.');
  }

  const storageRef = ref(storage, `${folder}/${objectPath}`);
  const uploadTask = uploadBytesResumable(storageRef, file, {
    contentType: file.type,
  });

  return await new Promise<string>((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      try {
        uploadTask.cancel();
      } catch {
        // ignore cancel failure
      }
      reject(new Error('Cloud upload timed out after 10 seconds.'));
    }, UPLOAD_TIMEOUT_MS);

    uploadTask.on(
      'state_changed',
      undefined,
      (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(err);
      },
      () => {
        getDownloadURL(uploadTask.snapshot.ref)
          .then((downloadUrl) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            resolve(downloadUrl);
          })
          .catch((err) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            reject(err);
          });
      }
    );
  });
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    const timer = setTimeout(() => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Image decoding timed out.'));
    }, 8_000);

    img.onload = () => {
      clearTimeout(timer);
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Selected file is not a valid readable image.'));
    };
    img.src = objectUrl;
  });
}

async function compressImageToDataUrl(file: File): Promise<string> {
  const img = await loadImageFromFile(file);
  const srcWidth = img.naturalWidth || img.width;
  const srcHeight = img.naturalHeight || img.height;
  if (!srcWidth || !srcHeight) {
    throw new Error('Image dimensions could not be read.');
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Browser canvas is unavailable for image optimization.');
  }

  const encodeWithBounds = (maxSide: number, mime: 'image/webp' | 'image/jpeg', quality: number) => {
    const scale = Math.min(1, maxSide / Math.max(srcWidth, srcHeight));
    const targetW = Math.max(1, Math.round(srcWidth * scale));
    const targetH = Math.max(1, Math.round(srcHeight * scale));
    canvas.width = targetW;
    canvas.height = targetH;
    ctx.clearRect(0, 0, targetW, targetH);
    if (mime === 'image/jpeg') {
      ctx.fillStyle = '#090909';
      ctx.fillRect(0, 0, targetW, targetH);
    }
    ctx.drawImage(img, 0, 0, targetW, targetH);
    return canvas.toDataURL(mime, quality);
  };

  // Detect WebP encoding support cleanly
  const testWebp = encodeWithBounds(Math.min(800, Math.max(srcWidth, srcHeight)), 'image/webp', 0.8);
  const supportsWebp = testWebp.startsWith('data:image/webp');
  const preferredMime: 'image/webp' | 'image/jpeg' = supportsWebp ? 'image/webp' : 'image/jpeg';

  const attempts: Array<{ maxSide: number; quality: number }> = [
    { maxSide: 800, quality: 0.82 },
    { maxSide: 800, quality: 0.68 },
    { maxSide: 800, quality: 0.52 },
    { maxSide: 600, quality: 0.62 },
    { maxSide: 480, quality: 0.5 },
    { maxSide: 360, quality: 0.45 },
  ];

  let bestCandidate = testWebp.startsWith('data:image/') ? testWebp : '';
  for (const step of attempts) {
    const candidate = encodeWithBounds(step.maxSide, preferredMime, step.quality);
    if (!bestCandidate || candidate.length < bestCandidate.length) {
      bestCandidate = candidate;
    }
    if (candidate.length <= TARGET_MAX_DATA_URL_CHARS && isSafeImageUrl(candidate)) {
      return candidate;
    }
  }

  if (bestCandidate && bestCandidate.length <= MAX_IMAGE_DATA_URL_LENGTH && isSafeImageUrl(bestCandidate)) {
    return bestCandidate;
  }

  throw new Error('Image is too complex to compress under 200 KB. Please choose a smaller image.');
}

export async function uploadMediaFile(
  file: File,
  folder: 'avatars' | 'project-images',
  uid: string
): Promise<UploadMediaResult> {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error('Please upload a JPG, PNG, WebP, or GIF image.');
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Selected image must be 10 MB or smaller.');
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 60);
  const objectPath = `${uid}/${Date.now()}_${safeName}`;
  let failureReason = 'Cloud storage is unavailable';

  // 1. Try Supabase Storage if VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY are configured
  const supabaseCfg = getSupabaseStorageConfig();
  if (supabaseCfg) {
    try {
      const publicUrl = await uploadToSupabaseStorage(file, folder, objectPath);
      if (publicUrl) {
        return {
          url: publicUrl,
          source: 'supabase',
          notice: 'Image uploaded to Supabase Storage.',
        };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      failureReason =
        err instanceof Error && err.name === 'AbortError'
          ? 'Supabase Storage upload timed out after 10 seconds'
          : msg;
      console.warn('Supabase Storage upload failed, checking fallback:', failureReason);
    }
  }

  // 2. Try Firebase Storage with a hard 10-second timeout
  if (isFirebaseStorageConfigured && storage) {
    try {
      const downloadUrl = await uploadToFirebaseStorageWithTimeout(file, folder, objectPath);
      return {
        url: downloadUrl,
        source: 'firebase',
        notice: 'Image uploaded successfully.',
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('10 seconds')) {
        failureReason = 'Cloud storage upload timed out after 10 seconds';
      } else if (msg.includes('storage/unauthorized') || msg.includes('permission')) {
        failureReason = 'Firebase Storage rules are not enabled';
      } else {
        failureReason = 'Cloud storage upload failed';
      }
      console.warn('Firebase Storage fallback triggered:', msg);
    }
  } else if (!supabaseCfg) {
    failureReason = 'Cloud storage bucket is unavailable';
  }

  // 3. Automatic client-side Canvas resize & compression (< 200 KB WebP/JPEG data URL)
  const compressedDataUrl = await compressImageToDataUrl(file);
  return {
    url: compressedDataUrl,
    source: 'data-url',
    notice: `${failureReason} — image was automatically resized & compressed under 200 KB. Save changes to apply.`,
  };
}

// ---------------------------------------------------------------------------
// Profiles & Usernames
// ---------------------------------------------------------------------------

export async function getProfileByUid(uid: string): Promise<Profile | null> {
  const path = `profiles/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'profiles', uid));
    if (!snap.exists()) return null;
    return snap.data() as Profile;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function getProfileByUsername(username: string): Promise<Profile | null> {
  const clean = username.toLowerCase().trim();
  const path = 'profiles';
  try {
    const q = query(collection(db, 'profiles'), where('username', '==', clean), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return snap.docs[0].data() as Profile;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function listRecentProfiles(maxItems = 12): Promise<Profile[]> {
  try {
    const q = query(collection(db, 'profiles'), orderBy('createdAt', 'desc'), limit(maxItems));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as Profile);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'profiles');
  }
}

export async function ensureUserProfile(params: {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  usernameSeed?: string;
  githubUrl?: string;
  bio?: string;
  location?: string;
  portfolioUrl?: string;
}): Promise<Profile> {
  const existing = await getProfileByUid(params.uid);
  if (existing) return existing;

  const seed =
    params.usernameSeed ||
    params.displayName ||
    (params.email ? params.email.split('@')[0] : '') ||
    `builder_${params.uid.slice(0, 6)}`;
  const baseUsername = sanitizeUsernameCandidate(seed);

  let chosenUsername = baseUsername;
  for (let attempt = 0; attempt < 6; attempt++) {
    const candidate =
      attempt === 0
        ? baseUsername
        : `${baseUsername.slice(0, 20)}_${Math.floor(100 + Math.random() * 899)}`;
    const claimSnap = await getDoc(doc(db, 'usernames', candidate));
    if (!claimSnap.exists()) {
      chosenUsername = candidate;
      break;
    }
  }

  const batch = writeBatch(db);
  const profileRef = doc(db, 'profiles', params.uid);
  const usernameRef = doc(db, 'usernames', chosenUsername);

  const safeAvatar =
    params.photoURL && isSafeImageUrl(params.photoURL)
      ? params.photoURL.trim().slice(0, MAX_IMAGE_DATA_URL_LENGTH)
      : '';
  const safeDisplayName = (params.displayName || chosenUsername).trim().slice(0, 60);
  const safeGithubUrl =
    params.githubUrl && /^https?:\/\//.test(params.githubUrl)
      ? params.githubUrl.slice(0, 300)
      : '';
  const safePortfolioUrl =
    params.portfolioUrl && /^https?:\/\//.test(params.portfolioUrl)
      ? params.portfolioUrl.slice(0, 300)
      : '';

  batch.set(usernameRef, {
    userId: params.uid,
    createdAt: serverTimestamp(),
  });

  batch.set(profileRef, {
    userId: params.uid,
    username: chosenUsername,
    displayName: safeDisplayName,
    avatarUrl: safeAvatar,
    bio: (params.bio || '').trim().slice(0, 400),
    location: (params.location || '').trim().slice(0, 80),
    skills: [],
    githubUrl: safeGithubUrl,
    portfolioUrl: safePortfolioUrl,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
    const created = await getProfileByUid(params.uid);
    if (!created) throw new Error('Failed to load created profile.');
    return created;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `profiles/${params.uid}`);
  }
}

export async function updateUserProfile(
  uid: string,
  previousUsername: string,
  updates: {
    username: string;
    displayName: string;
    avatarUrl: string;
    bio: string;
    location: string;
    skills: string[];
    githubUrl: string;
    portfolioUrl: string;
  }
): Promise<Profile> {
  const newUsername = updates.username.toLowerCase().trim();
  const oldUsername = previousUsername.toLowerCase().trim();

  if (newUsername !== oldUsername) {
    const claimSnap = await getDoc(doc(db, 'usernames', newUsername));
    if (claimSnap.exists() && claimSnap.data()?.userId !== uid) {
      throw new Error(`Username "@${newUsername}" is already taken.`);
    }
  }

  const batch = writeBatch(db);
  if (newUsername !== oldUsername) {
    if (oldUsername) {
      batch.delete(doc(db, 'usernames', oldUsername));
    }
    batch.set(doc(db, 'usernames', newUsername), {
      userId: uid,
      createdAt: serverTimestamp(),
    });
  }

  const trimmedAvatar = updates.avatarUrl.trim();
  if (!isSafeImageUrl(trimmedAvatar)) {
    throw new Error('Avatar image URL or uploaded image is invalid or exceeds size limits.');
  }

  batch.update(doc(db, 'profiles', uid), {
    username: newUsername.slice(0, 30),
    displayName: updates.displayName.trim().slice(0, 60),
    avatarUrl: trimmedAvatar,
    bio: updates.bio.trim().slice(0, 400),
    location: updates.location.trim().slice(0, 80),
    skills: updates.skills.slice(0, 15),
    githubUrl: updates.githubUrl.trim().slice(0, 300),
    portfolioUrl: updates.portfolioUrl.trim().slice(0, 300),
    updatedAt: serverTimestamp(),
  });

  try {
    await batch.commit();
    const updated = await getProfileByUid(uid);
    if (!updated) throw new Error('Profile not found after update.');
    return updated;
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, `profiles/${uid}`);
  }
}

// ---------------------------------------------------------------------------
// Community Posts, Likes & Comments
// ---------------------------------------------------------------------------

export function subscribePosts(
  onData: (posts: Post[]) => void,
  onError?: (err: Error) => void,
  authorId?: string
): Unsubscribe {
  const q = authorId
    ? query(collection(db, 'posts'), where('authorId', '==', authorId), limit(50))
    : query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(50));

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs
        .map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Post, 'id'>),
        }))
        .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
      onData(items);
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, 'posts');
      } catch (wrapped) {
        if (onError) onError(wrapped as Error);
      }
    }
  );
}

export async function createPost(
  author: Profile,
  payload: { content: string; projectUrl: string }
): Promise<string> {
  try {
    const refDoc = await addDoc(collection(db, 'posts'), {
      authorId: author.userId,
      authorUsername: author.username,
      authorDisplayName: author.displayName.slice(0, 60),
      authorAvatarUrl: isSafeImageUrl(author.avatarUrl) ? author.avatarUrl : '',
      content: payload.content.trim().slice(0, 600),
      projectUrl: payload.projectUrl.trim().slice(0, 300),
      likesCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return refDoc.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'posts');
  }
}

export async function updatePost(
  postId: string,
  author: Profile,
  payload: { content: string; projectUrl: string }
): Promise<void> {
  const path = `posts/${postId}`;
  try {
    await updateDoc(doc(db, 'posts', postId), {
      content: payload.content.trim().slice(0, 600),
      projectUrl: payload.projectUrl.trim().slice(0, 300),
      authorUsername: author.username,
      authorDisplayName: author.displayName.slice(0, 60),
      authorAvatarUrl: isSafeImageUrl(author.avatarUrl) ? author.avatarUrl : '',
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deletePost(postId: string): Promise<void> {
  const path = `posts/${postId}`;
  try {
    await deleteDoc(doc(db, 'posts', postId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function hasUserLikedPost(postId: string, uid: string): Promise<boolean> {
  const path = `posts/${postId}/likes/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'posts', postId, 'likes', uid));
    return snap.exists();
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function toggleLikePost(
  postId: string,
  uid: string,
  currentlyLiked: boolean,
  currentLikesCount: number
): Promise<void> {
  const postRef = doc(db, 'posts', postId);
  const likeRef = doc(db, 'posts', postId, 'likes', uid);
  const batch = writeBatch(db);

  if (currentlyLiked) {
    batch.delete(likeRef);
    batch.update(postRef, {
      likesCount: Math.max(0, currentLikesCount - 1),
    });
  } else {
    batch.set(likeRef, {
      postId,
      userId: uid,
      createdAt: serverTimestamp(),
    });
    batch.update(postRef, {
      likesCount: currentLikesCount + 1,
    });
  }

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `posts/${postId}/likes/${uid}`);
  }
}

export async function getPostCommentCount(postId: string): Promise<number> {
  const path = `posts/${postId}/comments`;
  try {
    const snap = await getCountFromServer(collection(db, 'posts', postId, 'comments'));
    return snap.data().count;
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export function subscribeComments(
  postId: string,
  onData: (comments: PostComment[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = `posts/${postId}/comments`;
  const q = query(collection(db, 'posts', postId, 'comments'), orderBy('createdAt', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<PostComment, 'id'>),
      }));
      onData(items);
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError) onError(wrapped as Error);
      }
    }
  );
}

export async function addComment(
  postId: string,
  author: Profile,
  content: string
): Promise<string> {
  const path = `posts/${postId}/comments`;
  try {
    const docRef = await addDoc(collection(db, 'posts', postId, 'comments'), {
      postId,
      authorId: author.userId,
      authorUsername: author.username,
      authorDisplayName: author.displayName.slice(0, 60),
      authorAvatarUrl: isSafeImageUrl(author.avatarUrl) ? author.avatarUrl : '',
      content: content.trim().slice(0, 500),
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function deleteComment(postId: string, commentId: string): Promise<void> {
  const path = `posts/${postId}/comments/${commentId}`;
  try {
    await deleteDoc(doc(db, 'posts', postId, 'comments', commentId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export function subscribeProjects(
  onData: (projects: Project[]) => void,
  onError?: (err: Error) => void,
  ownerId?: string,
  maxItems = 60
): Unsubscribe {
  const q = ownerId
    ? query(collection(db, 'projects'), where('ownerId', '==', ownerId), limit(maxItems))
    : query(collection(db, 'projects'), orderBy('createdAt', 'desc'), limit(maxItems));

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs
        .map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Project, 'id'>),
        }))
        .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
      onData(items);
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, 'projects');
      } catch (wrapped) {
        if (onError) onError(wrapped as Error);
      }
    }
  );
}

export async function getProjectById(projectId: string): Promise<Project | null> {
  const path = `projects/${projectId}`;
  try {
    const snap = await getDoc(doc(db, 'projects', projectId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as Omit<Project, 'id'>) };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function createProject(
  owner: Profile,
  payload: {
    name: string;
    description: string;
    coverImageUrl: string;
    liveDemoUrl: string;
    githubUrl: string;
    tags: string[];
    status: ProjectStatus;
  }
): Promise<string> {
  const trimmedCover = payload.coverImageUrl.trim();
  if (!isSafeImageUrl(trimmedCover)) {
    throw new Error('Cover image URL or uploaded image is invalid or exceeds size limits.');
  }
  try {
    const docRef = await addDoc(collection(db, 'projects'), {
      ownerId: owner.userId,
      ownerUsername: owner.username,
      ownerDisplayName: owner.displayName.slice(0, 60),
      ownerAvatarUrl: isSafeImageUrl(owner.avatarUrl) ? owner.avatarUrl : '',
      name: payload.name.trim().slice(0, 100),
      description: payload.description.trim().slice(0, 600),
      coverImageUrl: trimmedCover,
      liveDemoUrl: payload.liveDemoUrl.trim().slice(0, 300),
      githubUrl: payload.githubUrl.trim().slice(0, 300),
      tags: payload.tags.slice(0, 8),
      status: payload.status,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'projects');
  }
}

export async function updateProject(
  projectId: string,
  owner: Profile,
  payload: {
    name: string;
    description: string;
    coverImageUrl: string;
    liveDemoUrl: string;
    githubUrl: string;
    tags: string[];
    status: ProjectStatus;
  }
): Promise<void> {
  const path = `projects/${projectId}`;
  const trimmedCover = payload.coverImageUrl.trim();
  if (!isSafeImageUrl(trimmedCover)) {
    throw new Error('Cover image URL or uploaded image is invalid or exceeds size limits.');
  }
  try {
    await updateDoc(doc(db, 'projects', projectId), {
      name: payload.name.trim().slice(0, 100),
      description: payload.description.trim().slice(0, 600),
      coverImageUrl: trimmedCover,
      liveDemoUrl: payload.liveDemoUrl.trim().slice(0, 300),
      githubUrl: payload.githubUrl.trim().slice(0, 300),
      tags: payload.tags.slice(0, 8),
      status: payload.status,
      ownerUsername: owner.username,
      ownerDisplayName: owner.displayName.slice(0, 60),
      ownerAvatarUrl: isSafeImageUrl(owner.avatarUrl) ? owner.avatarUrl : '',
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteProject(projectId: string): Promise<void> {
  const path = `projects/${projectId}`;
  try {
    await deleteDoc(doc(db, 'projects', projectId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// ---------------------------------------------------------------------------
// Collaboration Requests & Private Applications
// ---------------------------------------------------------------------------

export function subscribeCollaborationRequests(
  onData: (requests: CollaborationRequest[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, 'collaboration_requests'),
    orderBy('createdAt', 'desc'),
    limit(60)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<CollaborationRequest, 'id'>),
      }));
      onData(items);
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, 'collaboration_requests');
      } catch (wrapped) {
        if (onError) onError(wrapped as Error);
      }
    }
  );
}

export async function createCollaborationRequest(
  owner: Profile,
  payload: {
    title: string;
    description: string;
    skillsNeeded: string[];
    projectName: string;
    projectUrl: string;
    collaborationType: CollaborationType;
  }
): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, 'collaboration_requests'), {
      ownerId: owner.userId,
      ownerUsername: owner.username,
      ownerDisplayName: owner.displayName.slice(0, 60),
      ownerAvatarUrl: isSafeImageUrl(owner.avatarUrl) ? owner.avatarUrl : '',
      title: payload.title.trim().slice(0, 120),
      description: payload.description.trim().slice(0, 1200),
      skillsNeeded: payload.skillsNeeded.slice(0, 10),
      projectName: payload.projectName.trim().slice(0, 100),
      projectUrl: payload.projectUrl.trim().slice(0, 300),
      collaborationType: payload.collaborationType,
      status: 'Open' as CollaborationStatus,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, 'collaboration_requests');
  }
}

export async function updateCollaborationRequest(
  requestId: string,
  owner: Profile,
  payload: {
    title: string;
    description: string;
    skillsNeeded: string[];
    projectName: string;
    projectUrl: string;
    collaborationType: CollaborationType;
    status: CollaborationStatus;
  }
): Promise<void> {
  const path = `collaboration_requests/${requestId}`;
  try {
    await updateDoc(doc(db, 'collaboration_requests', requestId), {
      title: payload.title.trim().slice(0, 120),
      description: payload.description.trim().slice(0, 1200),
      skillsNeeded: payload.skillsNeeded.slice(0, 10),
      projectName: payload.projectName.trim().slice(0, 100),
      projectUrl: payload.projectUrl.trim().slice(0, 300),
      collaborationType: payload.collaborationType,
      status: payload.status,
      ownerUsername: owner.username,
      ownerDisplayName: owner.displayName.slice(0, 60),
      ownerAvatarUrl: isSafeImageUrl(owner.avatarUrl) ? owner.avatarUrl : '',
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteCollaborationRequest(requestId: string): Promise<void> {
  const path = `collaboration_requests/${requestId}`;
  try {
    await deleteDoc(doc(db, 'collaboration_requests', requestId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function submitCollaborationApplication(
  requestItem: CollaborationRequest,
  applicant: Profile,
  payload: { message: string; skills: string[] }
): Promise<string> {
  const applicationId = `${requestItem.id}_${applicant.userId}`;
  const path = `collaboration_applications/${applicationId}`;

  const existingSnap = await getDoc(doc(db, 'collaboration_applications', applicationId)).catch(
    () => null
  );
  if (existingSnap && existingSnap.exists()) {
    throw new Error('You have already submitted an application to this opportunity.');
  }

  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'collaboration_applications', applicationId), {
      requestId: requestItem.id,
      requestTitle: requestItem.title.slice(0, 120),
      opportunityOwnerId: requestItem.ownerId,
      applicantId: applicant.userId,
      applicantUsername: applicant.username,
      applicantDisplayName: applicant.displayName.slice(0, 60),
      applicantAvatarUrl: isSafeImageUrl(applicant.avatarUrl) ? applicant.avatarUrl : '',
      message: payload.message.trim().slice(0, 600),
      skills: payload.skills.slice(0, 10),
      status: 'Pending' as ApplicationStatus,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
    return applicationId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export function subscribeMyApplications(
  applicantUid: string,
  onData: (apps: CollaborationApplication[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, 'collaboration_applications'),
    where('applicantId', '==', applicantUid)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs
        .map((d) => ({
          id: d.id,
          ...(d.data() as Omit<CollaborationApplication, 'id'>),
        }))
        .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
      onData(items);
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, 'collaboration_applications');
      } catch (wrapped) {
        if (onError) onError(wrapped as Error);
      }
    }
  );
}

export function subscribeIncomingApplications(
  ownerUid: string,
  onData: (apps: CollaborationApplication[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, 'collaboration_applications'),
    where('opportunityOwnerId', '==', ownerUid)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs
        .map((d) => ({
          id: d.id,
          ...(d.data() as Omit<CollaborationApplication, 'id'>),
        }))
        .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
      onData(items);
    },
    (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, 'collaboration_applications');
      } catch (wrapped) {
        if (onError) onError(wrapped as Error);
      }
    }
  );
}

export async function reviewCollaborationApplication(
  applicationId: string,
  decision: 'Accepted' | 'Rejected'
): Promise<void> {
  const path = `collaboration_applications/${applicationId}`;
  try {
    await updateDoc(doc(db, 'collaboration_applications', applicationId), {
      status: decision,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function withdrawCollaborationApplication(applicationId: string): Promise<void> {
  const path = `collaboration_applications/${applicationId}`;
  try {
    await deleteDoc(doc(db, 'collaboration_applications', applicationId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export interface StarterCollaborationSeed {
  id: string;
  title: string;
  description: string;
  skillsNeeded: string[];
  projectName: string;
  projectUrl: string;
  collaborationType: CollaborationType;
  status: CollaborationStatus;
}

export const STARTER_COLLABORATION_SEEDS: StarterCollaborationSeed[] = [
  {
    id: 'starter_collab_cli_ui',
    title: 'Looking for a frontend collaborator for open-source CLI UI',
    description:
      'Building a minimal web companion for terminal build logs and diff snapshots. Looking for help polishing keyboard navigation, responsive spacing, and log filtering.',
    skillsNeeded: ['TypeScript', 'UI Design'],
    projectName: 'Community Builds',
    projectUrl: 'https://github.com/ship-together/community-builds',
    collaborationType: 'Open Source',
    status: 'Open',
  },
  {
    id: 'starter_collab_side_ui_review',
    title: 'Weekend pair for UI flow review & usability testing',
    description:
      'Wrapping up an offline-first changelog editor this weekend. Looking for a builder to walk through onboarding flows, catch mobile edge cases, and pair on UI polish.',
    skillsNeeded: ['React', 'Tailwind CSS', 'UI/UX'],
    projectName: 'RelayNotes',
    projectUrl: 'https://github.com/ship-together/relay-notes',
    collaborationType: 'Side Project',
    status: 'Open',
  },
  {
    id: 'starter_collab_learning_solidity',
    title: 'Solidity & Next.js smart contract study build',
    description:
      'Practicing EVM contract testing and wallet signature flows around an active security scanner build. Two short async check-ins per week plus PR walkthroughs.',
    skillsNeeded: ['Solidity', 'Next.js', 'TypeScript'],
    projectName: 'SolGuard Lab',
    projectUrl: 'https://github.com/ship-together/solguard-lab',
    collaborationType: 'Learning Together',
    status: 'Open',
  },
  {
    id: 'starter_collab_startup_hooks',
    title: 'Backend partner for webhook retries & Postgres queue',
    description:
      'Early developer tool for reliable webhook delivery, signature checks, and dead-letter inspection. Looking for someone to benchmark Postgres worker throughput.',
    skillsNeeded: ['Node.js', 'PostgreSQL', 'TypeScript'],
    projectName: 'HookPipe',
    projectUrl: 'https://github.com/ship-together/hookpipe',
    collaborationType: 'Startup',
    status: 'Open',
  },
  {
    id: 'starter_collab_closed_docs',
    title: 'Docs contributor for CLI quickstart & environment guide',
    description:
      'Role filled — restructured installation commands, environment variable templates, and local setup instructions.',
    skillsNeeded: ['Markdown', 'CLI', 'Documentation'],
    projectName: 'ShipKit Docs',
    projectUrl: 'https://github.com/ship-together/shipkit-docs',
    collaborationType: 'Open Source',
    status: 'Closed',
  },
];

const COLLAB_STARTER_SEED_KEY = 'ship_together_collab_starter_seeded_v1';
let starterCollabSeedPromise: Promise<boolean> | null = null;

export async function ensureStarterCollaborationRequests(owner: Profile): Promise<boolean> {
  if (typeof window !== 'undefined') {
    try {
      if (window.localStorage.getItem(COLLAB_STARTER_SEED_KEY) === '1') {
        return false;
      }
    } catch {
      // ignore storage errors
    }
  }

  if (starterCollabSeedPromise) {
    return starterCollabSeedPromise;
  }

  starterCollabSeedPromise = (async () => {
    try {
      const existingSnap = await getDocs(
        query(collection(db, 'collaboration_requests'), limit(60))
      );

      const existingIds = new Set<string>();
      const existingTitles = new Set<string>();
      existingSnap.docs.forEach((d) => {
        existingIds.add(d.id);
        const data = d.data() as Partial<CollaborationRequest>;
        if (typeof data.title === 'string') {
          existingTitles.add(data.title.trim().toLowerCase());
        }
      });

      const avatar = isSafeImageUrl(owner.avatarUrl) ? owner.avatarUrl : '';
      let createdAny = false;

      for (const seed of STARTER_COLLABORATION_SEEDS) {
        const normalizedTitle = seed.title.trim().toLowerCase();
        if (existingIds.has(seed.id) || existingTitles.has(normalizedTitle)) {
          continue;
        }

        const docRef = doc(db, 'collaboration_requests', seed.id);
        await setDoc(docRef, {
          ownerId: owner.userId,
          ownerUsername: owner.username,
          ownerDisplayName: owner.displayName.slice(0, 60),
          ownerAvatarUrl: avatar,
          title: seed.title.slice(0, 120),
          description: seed.description.slice(0, 1200),
          skillsNeeded: seed.skillsNeeded.slice(0, 10),
          projectName: seed.projectName.slice(0, 100),
          projectUrl: seed.projectUrl.slice(0, 300),
          collaborationType: seed.collaborationType,
          status: 'Open' as CollaborationStatus,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        if (seed.status === 'Closed') {
          await updateDoc(docRef, {
            status: 'Closed' as CollaborationStatus,
            updatedAt: serverTimestamp(),
          });
        }

        existingIds.add(seed.id);
        existingTitles.add(normalizedTitle);
        createdAny = true;
      }

      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(COLLAB_STARTER_SEED_KEY, '1');
        } catch {
          // ignore storage errors
        }
      }

      return createdAny;
    } catch (err) {
      console.warn('Starter collaboration seeding skipped:', err);
      return false;
    } finally {
      starterCollabSeedPromise = null;
    }
  })();

  return starterCollabSeedPromise;
}

