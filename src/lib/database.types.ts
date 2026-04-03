export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      notebooks: {
        Row: {
          id: string;
          title: string;
          source_file_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          source_file_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          source_file_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      words: {
        Row: {
          id: string;
          notebook_id: string;
          term: string;
          meaning: string;
          part_of_speech: string;
          example_sentence: string;
          context: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          notebook_id: string;
          term: string;
          meaning: string;
          part_of_speech?: string;
          example_sentence?: string;
          context?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          notebook_id?: string;
          term?: string;
          meaning?: string;
          part_of_speech?: string;
          example_sentence?: string;
          context?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "words_notebook_id_fkey";
            columns: ["notebook_id"];
            isOneToOne: false;
            referencedRelation: "notebooks";
            referencedColumns: ["id"];
          },
        ];
      };
      word_learning: {
        Row: {
          id: string;
          word_id: string;
          ease_factor: number;
          interval_days: number;
          repetition: number;
          lapses: number;
          total_reviews: number;
          correct_count: number;
          next_review_at: string;
          last_reviewed_at: string | null;
        };
        Insert: {
          id?: string;
          word_id: string;
          ease_factor?: number;
          interval_days?: number;
          repetition?: number;
          lapses?: number;
          total_reviews?: number;
          correct_count?: number;
          next_review_at?: string;
          last_reviewed_at?: string | null;
        };
        Update: {
          id?: string;
          word_id?: string;
          ease_factor?: number;
          interval_days?: number;
          repetition?: number;
          lapses?: number;
          total_reviews?: number;
          correct_count?: number;
          next_review_at?: string;
          last_reviewed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "word_learning_word_id_fkey";
            columns: ["word_id"];
            isOneToOne: true;
            referencedRelation: "words";
            referencedColumns: ["id"];
          },
        ];
      };
      review_logs: {
        Row: {
          id: string;
          word_id: string;
          score: number;
          mode: string;
          reviewed_at: string;
        };
        Insert: {
          id?: string;
          word_id: string;
          score: number;
          mode: string;
          reviewed_at?: string;
        };
        Update: {
          id?: string;
          word_id?: string;
          score?: number;
          mode?: string;
          reviewed_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "review_logs_word_id_fkey";
            columns: ["word_id"];
            isOneToOne: false;
            referencedRelation: "words";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
