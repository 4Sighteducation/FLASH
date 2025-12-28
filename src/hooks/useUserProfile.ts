import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';

export interface UserSubjectProfile {
  subject_id: string;
  subject_name: string;
  exam_board: string;
  exam_board_code: string;
  qualification_level: string; // 'GCSE', 'A_LEVEL', etc.
  qualification_code: string;
  color: string;
}

export interface UserProfile {
  user_id: string;
  subjects: UserSubjectProfile[];
  primary_subject: UserSubjectProfile | null;
  exam_boards: string[]; // Array of unique exam boards
  qualification_levels: string[]; // Array of unique levels
}

export function useUserProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    fetchUserProfile();
  }, [user?.id]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch user subjects with full context
      const { data: userSubjects, error: subjectsError } = await supabase
        .from('user_subjects')
        .select(`
          id,
          subject_id,
          exam_board,
          color,
          exam_board_subjects!inner(
            id,
            subject_name,
            exam_board_id,
            qualification_type_id,
            exam_boards!inner(
              id,
              code,
              full_name
            ),
            qualification_types!inner(
              id,
              code,
              name
            )
          )
        `)
        .eq('user_id', user?.id);

      if (subjectsError) throw subjectsError;

      if (!userSubjects || userSubjects.length === 0) {
        setProfile({
          user_id: user?.id || '',
          subjects: [],
          primary_subject: null,
          exam_boards: [],
          qualification_levels: [],
        });
        return;
      }

      // Transform to clean profile structure
      const subjects: UserSubjectProfile[] = userSubjects.map((us: any) => {
        const ebs = us.exam_board_subjects;
        const examBoard = ebs.exam_boards;
        const qualType = ebs.qualification_types;

        return {
          subject_id: us.subject_id,
          subject_name: ebs.subject_name,
          exam_board: examBoard.full_name || examBoard.code,
          exam_board_code: examBoard.code,
          qualification_level: qualType.name, // e.g., "A-Level", "GCSE"
          qualification_code: qualType.code, // e.g., "A_LEVEL", "GCSE"
          color: us.color,
        };
      });

      // Extract unique exam boards and qualification levels
      const uniqueBoards = [...new Set(subjects.map(s => s.exam_board_code))];
      const uniqueLevels = [...new Set(subjects.map(s => s.qualification_code))];

      setProfile({
        user_id: user?.id || '',
        subjects,
        primary_subject: subjects[0] || null,
        exam_boards: uniqueBoards,
        qualification_levels: uniqueLevels,
      });

    } catch (err) {
      // Avoid spamming LogBox/toasts with noisy objects; surface a short message.
      console.warn('Error fetching user profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = () => {
    fetchUserProfile();
  };

  return {
    profile,
    loading,
    error,
    refreshProfile,
  };
}

/**
 * Helper function to format subject name for search
 * Converts "Biology" + "GCSE" → "Biology (GCSE)"
 * This matches the format in topic_ai_metadata table
 */
export function formatSubjectForSearch(subjectName: string, qualificationLevel: string): string {
  // Map qualification codes to display names
  const levelMap: Record<string, string> = {
    'GCSE': 'GCSE',
    'A_LEVEL': 'A-Level',
    'IGCSE': 'International GCSE',
    'BTEC': 'BTEC',
    'IB': 'IB',
  };

  const levelDisplay = levelMap[qualificationLevel] || qualificationLevel;
  
  // Check if subject name already includes qualification
  if (subjectName.includes('(')) {
    return subjectName;
  }

  return `${subjectName} (${levelDisplay})`;
}











