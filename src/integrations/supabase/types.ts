export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      daily_insights: {
        Row: {
          created_at: string
          id: string
          insight_text: string
          insight_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          insight_text: string
          insight_type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          insight_text?: string
          insight_type?: string
          user_id?: string
        }
        Relationships: []
      }
      emotion_checkins: {
        Row: {
          body_location: string | null
          context: string | null
          created_at: string
          emotion: string
          id: string
          intensity: number | null
          session_id: string | null
          user_id: string
        }
        Insert: {
          body_location?: string | null
          context?: string | null
          created_at?: string
          emotion: string
          id?: string
          intensity?: number | null
          session_id?: string | null
          user_id: string
        }
        Update: {
          body_location?: string | null
          context?: string | null
          created_at?: string
          emotion?: string
          id?: string
          intensity?: number | null
          session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "emotion_checkins_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "mentor_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      emotional_profiles: {
        Row: {
          avg_post_intensity: number | null
          avg_pre_intensity: number | null
          common_body_locations: Json
          id: string
          preferred_exercises: Json
          top_emotions: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          avg_post_intensity?: number | null
          avg_pre_intensity?: number | null
          common_body_locations?: Json
          id?: string
          preferred_exercises?: Json
          top_emotions?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          avg_post_intensity?: number | null
          avg_pre_intensity?: number | null
          common_body_locations?: Json
          id?: string
          preferred_exercises?: Json
          top_emotions?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      journal_entries: {
        Row: {
          content: string | null
          created_at: string
          entry_type: string
          id: string
          mood: string | null
          reflection_prompt: string | null
          tags: string[] | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          entry_type?: string
          id?: string
          mood?: string | null
          reflection_prompt?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          entry_type?: string
          id?: string
          mood?: string | null
          reflection_prompt?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      journal_media: {
        Row: {
          created_at: string
          entry_id: string
          id: string
          media_type: string
          storage_path: string
          user_id: string
        }
        Insert: {
          created_at?: string
          entry_id: string
          id?: string
          media_type: string
          storage_path: string
          user_id: string
        }
        Update: {
          created_at?: string
          entry_id?: string
          id?: string
          media_type?: string
          storage_path?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_media_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          session_id: string
          step_at_time: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          session_id: string
          step_at_time?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_id?: string
          step_at_time?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "mentor_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_sessions: {
        Row: {
          attempt_number: number
          body_location: string | null
          completed_at: string | null
          created_at: string
          current_step: string
          emotion: string | null
          emotion_label_confirmed: boolean | null
          emotion_label_suggested: string | null
          entry_path: string
          exercise_options_shown: string[] | null
          id: string
          improvement_choice: string | null
          mirror_confirmed: boolean | null
          mirror_used: boolean
          post_intensity: number | null
          pre_intensity: number | null
          safety_override_state: string | null
          selected_exercise: string | null
          started_at: string
          trigger_text: string | null
          user_id: string
        }
        Insert: {
          attempt_number?: number
          body_location?: string | null
          completed_at?: string | null
          created_at?: string
          current_step?: string
          emotion?: string | null
          emotion_label_confirmed?: boolean | null
          emotion_label_suggested?: string | null
          entry_path?: string
          exercise_options_shown?: string[] | null
          id?: string
          improvement_choice?: string | null
          mirror_confirmed?: boolean | null
          mirror_used?: boolean
          post_intensity?: number | null
          pre_intensity?: number | null
          safety_override_state?: string | null
          selected_exercise?: string | null
          started_at?: string
          trigger_text?: string | null
          user_id: string
        }
        Update: {
          attempt_number?: number
          body_location?: string | null
          completed_at?: string | null
          created_at?: string
          current_step?: string
          emotion?: string | null
          emotion_label_confirmed?: boolean | null
          emotion_label_suggested?: string | null
          entry_path?: string
          exercise_options_shown?: string[] | null
          id?: string
          improvement_choice?: string | null
          mirror_confirmed?: boolean | null
          mirror_used?: boolean
          post_intensity?: number | null
          pre_intensity?: number | null
          safety_override_state?: string | null
          selected_exercise?: string | null
          started_at?: string
          trigger_text?: string | null
          user_id?: string
        }
        Relationships: []
      }
      pattern_insights: {
        Row: {
          created_at: string
          data: Json | null
          description: string
          id: string
          pattern_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json | null
          description: string
          id?: string
          pattern_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json | null
          description?: string
          id?: string
          pattern_type?: string
          user_id?: string
        }
        Relationships: []
      }
      practice_sessions: {
        Row: {
          created_at: string
          duration_seconds: number | null
          exercise_name: string
          id: string
          outcome: string | null
          post_intensity: number | null
          pre_intensity: number | null
          session_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          exercise_name: string
          id?: string
          outcome?: string | null
          post_intensity?: number | null
          pre_intensity?: number | null
          session_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          exercise_name?: string
          id?: string
          outcome?: string | null
          post_intensity?: number | null
          pre_intensity?: number | null
          session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_sessions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "mentor_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      progress_snapshots: {
        Row: {
          avg_intensity_change: number | null
          created_at: string
          id: string
          snapshot_date: string
          streak_days: number
          top_emotions: string[] | null
          total_practices: number
          total_sessions: number
          user_id: string
        }
        Insert: {
          avg_intensity_change?: number | null
          created_at?: string
          id?: string
          snapshot_date?: string
          streak_days?: number
          top_emotions?: string[] | null
          total_practices?: number
          total_sessions?: number
          user_id: string
        }
        Update: {
          avg_intensity_change?: number | null
          created_at?: string
          id?: string
          snapshot_date?: string
          streak_days?: number
          top_emotions?: string[] | null
          total_practices?: number
          total_sessions?: number
          user_id?: string
        }
        Relationships: []
      }
      snapshot_requests: {
        Row: {
          created_at: string
          id: string
          request_type: string
          result: Json | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          request_type: string
          result?: Json | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          request_type?: string
          result?: Json | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      user_feedback: {
        Row: {
          content: string
          context: Json | null
          created_at: string
          feedback_type: string
          id: string
          rating: number | null
          user_id: string
        }
        Insert: {
          content: string
          context?: Json | null
          created_at?: string
          feedback_type?: string
          id?: string
          rating?: number | null
          user_id: string
        }
        Update: {
          content?: string
          context?: Json | null
          created_at?: string
          feedback_type?: string
          id?: string
          rating?: number | null
          user_id?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          is_guest: boolean
          onboarding_completed: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_guest?: boolean
          onboarding_completed?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_guest?: boolean
          onboarding_completed?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
