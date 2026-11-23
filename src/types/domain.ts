import { Timestamp } from 'firebase/firestore';

export type ProjectStatus = 'Building' | 'Launched' | 'Completed';
export type CollaborationType =
  | 'Open Source'
  | 'Startup'
  | 'Side Project'
  | 'Learning Together';
export type CollaborationStatus = 'Open' | 'Closed';
export type ApplicationStatus = 'Pending' | 'Accepted' | 'Rejected';

export interface Profile {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
  location: string;
  skills: string[];
  githubUrl: string;
  portfolioUrl: string;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface Post {
  id: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatarUrl: string;
  content: string;
  projectUrl: string;
  likesCount: number;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface PostComment {
  id: string;
  postId: string;
  authorId: string;
  authorUsername: string;
  authorDisplayName: string;
  authorAvatarUrl: string;
  content: string;
  createdAt: Timestamp | null;
}

export interface Project {
  id: string;
  ownerId: string;
  ownerUsername: string;
  ownerDisplayName: string;
  ownerAvatarUrl: string;
  name: string;
  description: string;
  coverImageUrl: string;
  liveDemoUrl: string;
  githubUrl: string;
  tags: string[];
  status: ProjectStatus;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface CollaborationRequest {
  id: string;
  ownerId: string;
  ownerUsername: string;
  ownerDisplayName: string;
  ownerAvatarUrl: string;
  title: string;
  description: string;
  skillsNeeded: string[];
  projectName: string;
  projectUrl?: string;
  collaborationType: CollaborationType;
  status: CollaborationStatus;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export interface CollaborationApplication {
  id: string;
  requestId: string;
  requestTitle: string;
  opportunityOwnerId: string;
  applicantId: string;
  applicantUsername: string;
  applicantDisplayName: string;
  applicantAvatarUrl: string;
  message: string;
  skills: string[];
  status: ApplicationStatus;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}

export const HERO_DESK_IMAGE = '/images/hero_builders_desk_1795295593852.jpg';

export const PRESET_PROJECT_COVERS: { label: string; url: string }[] = [
  {
    label: 'Developer Tooling',
    url: '/images/cover_cli_devtools_1795295593920.jpg',
  },
  {
    label: 'Design Systems',
    url: '/images/cover_design_system_1795295592951.jpg',
  },
  {
    label: 'Realtime & Sync',
    url: '/images/cover_realtime_sync_1795295592220.jpg',
  },
  {
    label: 'Cloud & Hardware',
    url: '/images/cover_cloud_infra_1795295593473.jpg',
  },
];
