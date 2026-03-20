export type ViewName = 'dashboard' | 'community' | 'finished' | 'trash' | 'tools' | 'help' | 'profile' | 'settings';

export type Difficulty = 'Easy' | 'Medium' | 'Hard' | 'Group';
export type AssignmentStatus = 'active' | 'finished' | 'trashed';
export type CommunityPostStatus = 'open' | 'withdrawn';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
}

export interface Assignment {
  id: string;
  name: string;
  cls: string;
  difficulty: Difficulty;
  ad: string;
  due: string;
  desc: string;
  status: AssignmentStatus;
}

export interface AssignmentFormValues {
  name: string;
  cls: string;
  difficulty: '' | Difficulty;
  ad: string;
  due: string;
  desc: string;
}

export interface CommunityComment {
  id: string;
  postId: string;
  userId: string;
  authorName: string;
  authorEmail: string;
  body: string;
  createdAt: string;
}

export interface CommunityPost {
  id: string;
  userId: string;
  authorName: string;
  authorEmail: string;
  title: string;
  body: string;
  status: CommunityPostStatus;
  createdAt: string;
  withdrawnAt: string;
  comments: CommunityComment[];
}

export interface CommunityPostFormValues {
  title: string;
  body: string;
}

export interface StatusMessage {
  tone: 'info' | 'success' | 'error';
  text: string;
}
