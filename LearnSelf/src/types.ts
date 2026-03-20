export type ViewName = 'dashboard' | 'finished' | 'trash' | 'tools' | 'help' | 'profile' | 'settings';

export type Difficulty = 'Easy' | 'Medium' | 'Hard' | 'Group';
export type AssignmentStatus = 'active' | 'finished' | 'trashed';

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

export interface StatusMessage {
  tone: 'info' | 'success' | 'error';
  text: string;
}
