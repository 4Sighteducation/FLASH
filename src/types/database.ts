export interface Database {
  public: {
    Tables: {
      exam_boards: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
      };
      subjects: {
        Row: {
          id: string;
          name: string;
          exam_board_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          exam_board_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          exam_board_id?: string;
          created_at?: string;
        };
      };
      modules: {
        Row: {
          id: string;
          name: string;
          subject_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          subject_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          subject_id?: string;
          created_at?: string;
        };
      };
      topics: {
        Row: {
          id: string;
          name: string;
          module_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          module_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          module_id?: string;
          created_at?: string;
        };
      };
      subtopics: {
        Row: {
          id: string;
          name: string;
          topic_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          topic_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          topic_id?: string;
          created_at?: string;
        };
      };
      users: {
        Row: {
          id: string;
          username: string;
          email: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          email: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          email?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_topics: {
        Row: {
          id: string;
          user_id: string;
          topic_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          topic_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          topic_id?: string;
          created_at?: string;
        };
      };
      flashcards: {
        Row: {
          id: string;
          user_id: string;
          topic_id: string;
          question: string;
          answer: string;
          box_number: number;
          next_review_date: string;
          created_at: string;
          updated_at: string;
          is_ai_generated: boolean;
        };
        Insert: {
          id?: string;
          user_id: string;
          topic_id: string;
          question: string;
          answer: string;
          box_number?: number;
          next_review_date?: string;
          created_at?: string;
          updated_at?: string;
          is_ai_generated?: boolean;
        };
        Update: {
          id?: string;
          user_id?: string;
          topic_id?: string;
          question?: string;
          answer?: string;
          box_number?: number;
          next_review_date?: string;
          created_at?: string;
          updated_at?: string;
          is_ai_generated?: boolean;
        };
      };
      study_sessions: {
        Row: {
          id: string;
          user_id: string;
          started_at: string;
          ended_at: string | null;
          cards_studied: number;
          xp_earned: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          started_at?: string;
          ended_at?: string | null;
          cards_studied?: number;
          xp_earned?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          started_at?: string;
          ended_at?: string | null;
          cards_studied?: number;
          xp_earned?: number;
          created_at?: string;
        };
      };
    };
  };
}

export interface UserSubject {
  id: string;
  subject_id: string;
  exam_board: string;
  color: string;
  subject: {
    subject_name: string;
  };
}

export interface UserSubjectWithName {
  subject_id: string;
  subject: {
    subject_name: string;
  };
} 