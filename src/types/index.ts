export interface SelectedSubject {
  subjectId: string;
  subjectName: string;
  examBoard: string;
}

export interface Topic {
  id: string;
  title: string;
  parentId?: string;
  isCustom: boolean;
  isDeleted?: boolean;
  sortOrder: number;
  color?: string;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  examType?: string;
  isOnboarded: boolean;
} 