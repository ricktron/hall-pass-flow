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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      academic_terms: {
        Row: {
          end_date: string
          id: number
          name: string
          start_date: string
        }
        Insert: {
          end_date: string
          id?: number
          name: string
          start_date: string
        }
        Update: {
          end_date?: string
          id?: number
          name?: string
          start_date?: string
        }
        Relationships: []
      }
      bathroom_passes: {
        Row: {
          classroom: string | null
          created_at: string
          date_local: string | null
          destination: string | null
          duration_min: number | null
          id: string
          manual_adjust_min: number | null
          manual_adjust_reason: string | null
          notes: string | null
          override_reason: string | null
          overrode_period: boolean
          pass_status: string | null
          period: string | null
          period_norm: string | null
          raw_student_name: string | null
          student_id: string | null
          student_name: string | null
          timein: string | null
          timeout: string | null
          updated_at: string
          was_auto_closed: boolean
        }
        Insert: {
          classroom?: string | null
          created_at?: string
          date_local?: string | null
          destination?: string | null
          duration_min?: number | null
          id?: string
          manual_adjust_min?: number | null
          manual_adjust_reason?: string | null
          notes?: string | null
          override_reason?: string | null
          overrode_period?: boolean
          pass_status?: string | null
          period?: string | null
          period_norm?: string | null
          raw_student_name?: string | null
          student_id?: string | null
          student_name?: string | null
          timein?: string | null
          timeout?: string | null
          updated_at?: string
          was_auto_closed?: boolean
        }
        Update: {
          classroom?: string | null
          created_at?: string
          date_local?: string | null
          destination?: string | null
          duration_min?: number | null
          id?: string
          manual_adjust_min?: number | null
          manual_adjust_reason?: string | null
          notes?: string | null
          override_reason?: string | null
          overrode_period?: boolean
          pass_status?: string | null
          period?: string | null
          period_norm?: string | null
          raw_student_name?: string | null
          student_id?: string | null
          student_name?: string | null
          timein?: string | null
          timeout?: string | null
          updated_at?: string
          was_auto_closed?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "fk_bathroom_passes_classroom"
            columns: ["classroom"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      classroom_arrivals: {
        Row: {
          arrival_reason: string | null
          created_at: string
          id: string
          period: string
          student_name: string
          time_in: string
        }
        Insert: {
          arrival_reason?: string | null
          created_at?: string
          id?: string
          period: string
          student_name: string
          time_in?: string
        }
        Update: {
          arrival_reason?: string | null
          created_at?: string
          id?: string
          period?: string
          student_name?: string
          time_in?: string
        }
        Relationships: []
      }
      Classroom_Arrivals: {
        Row: {
          arrival_reason: string | null
          created_at: string
          id: string
          period: string | null
          student_name: string | null
          time_in: string | null
        }
        Insert: {
          arrival_reason?: string | null
          created_at?: string
          id?: string
          period?: string | null
          student_name?: string | null
          time_in?: string | null
        }
        Update: {
          arrival_reason?: string | null
          created_at?: string
          id?: string
          period?: string | null
          student_name?: string | null
          time_in?: string | null
        }
        Relationships: []
      }
      classrooms: {
        Row: {
          id: string
          teacher_email: string | null
        }
        Insert: {
          id: string
          teacher_email?: string | null
        }
        Update: {
          id?: string
          teacher_email?: string | null
        }
        Relationships: []
      }
      courses: {
        Row: {
          course_code: string
          course_name: string | null
          id: number
        }
        Insert: {
          course_code: string
          course_name?: string | null
          id?: number
        }
        Update: {
          course_code?: string
          course_name?: string | null
          id?: number
        }
        Relationships: []
      }
      hall_pass_corrections: {
        Row: {
          corrected_at: string | null
          corrected_by: string | null
          corrected_duration: number
          corrected_reason: string | null
          pass_id: string
        }
        Insert: {
          corrected_at?: string | null
          corrected_by?: string | null
          corrected_duration: number
          corrected_reason?: string | null
          pass_id: string
        }
        Update: {
          corrected_at?: string | null
          corrected_by?: string | null
          corrected_duration?: number
          corrected_reason?: string | null
          pass_id?: string
        }
        Relationships: []
      }
      hall_passes: {
        Row: {
          destination_id: number
          id: number
          issued_by: string
          origin_id: number
          status: Database["public"]["Enums"]["pass_status"]
          student_id: string
          time_in: string | null
          time_out: string
        }
        Insert: {
          destination_id: number
          id?: number
          issued_by: string
          origin_id: number
          status?: Database["public"]["Enums"]["pass_status"]
          student_id: string
          time_in?: string | null
          time_out?: string
        }
        Update: {
          destination_id?: number
          id?: number
          issued_by?: string
          origin_id?: number
          status?: Database["public"]["Enums"]["pass_status"]
          student_id?: string
          time_in?: string | null
          time_out?: string
        }
        Relationships: [
          {
            foreignKeyName: "hall_passes_destination_id_fkey"
            columns: ["destination_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hall_passes_issued_by_fkey"
            columns: ["issued_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hall_passes_origin_id_fkey"
            columns: ["origin_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hall_passes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      Hall_Passes_deleted_backup: {
        Row: {
          classroom: string | null
          destination: string | null
          id: string | null
          notes: string | null
          period: string | null
          studentId: string | null
          studentName: string | null
          timeIn: string | null
          timeOut: string | null
        }
        Insert: {
          classroom?: string | null
          destination?: string | null
          id?: string | null
          notes?: string | null
          period?: string | null
          studentId?: string | null
          studentName?: string | null
          timeIn?: string | null
          timeOut?: string | null
        }
        Update: {
          classroom?: string | null
          destination?: string | null
          id?: string | null
          notes?: string | null
          period?: string | null
          studentId?: string | null
          studentName?: string | null
          timeIn?: string | null
          timeOut?: string | null
        }
        Relationships: []
      }
      locations: {
        Row: {
          id: number
          name: string
          type: Database["public"]["Enums"]["location_type"] | null
          user_id: string | null
        }
        Insert: {
          id?: number
          name: string
          type?: Database["public"]["Enums"]["location_type"] | null
          user_id?: string | null
        }
        Update: {
          id?: number
          name?: string
          type?: Database["public"]["Enums"]["location_type"] | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      rosters: {
        Row: {
          academic_term_id: number
          course_id: number
          id: number
          period_code: string | null
          student_id: string
        }
        Insert: {
          academic_term_id: number
          course_id: number
          id?: number
          period_code?: string | null
          student_id: string
        }
        Update: {
          academic_term_id?: number
          course_id?: number
          id?: number
          period_code?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rosters_academic_term_id_fkey"
            columns: ["academic_term_id"]
            isOneToOne: false
            referencedRelation: "academic_terms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rosters_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rosters_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          description: string | null
          id: number
          setting_name: string
          value: string | null
        }
        Insert: {
          description?: string | null
          id?: number
          setting_name: string
          value?: string | null
        }
        Update: {
          description?: string | null
          id?: number
          setting_name?: string
          value?: string | null
        }
        Relationships: []
      }
      student_name_synonyms: {
        Row: {
          created_at: string
          id: string
          raw_input: string
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          raw_input: string
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          raw_input?: string
          student_id?: string
        }
        Relationships: []
      }
      students: {
        Row: {
          grade_level: number | null
          id: string
          sis_id: string | null
        }
        Insert: {
          grade_level?: number | null
          id: string
          sis_id?: string | null
        }
        Update: {
          grade_level?: number | null
          id?: string
          sis_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          email: string
          first_name: string
          id: string
          last_name: string
          nickname: string | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Insert: {
          email: string
          first_name: string
          id?: string
          last_name: string
          nickname?: string | null
          role: Database["public"]["Enums"]["user_role"]
        }
        Update: {
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          nickname?: string | null
          role?: Database["public"]["Enums"]["user_role"]
        }
        Relationships: []
      }
    }
    Views: {
      Hall_Passes: {
        Row: {
          classroom: string | null
          destination: string | null
          id: string | null
          notes: string | null
          period: string | null
          studentId: string | null
          studentName: string | null
          timeIn: string | null
          timeOut: string | null
        }
        Insert: {
          classroom?: string | null
          destination?: string | null
          id?: string | null
          notes?: string | null
          period?: string | null
          studentId?: string | null
          studentName?: string | null
          timeIn?: string | null
          timeOut?: string | null
        }
        Update: {
          classroom?: string | null
          destination?: string | null
          id?: string | null
          notes?: string | null
          period?: string | null
          studentId?: string | null
          studentName?: string | null
          timeIn?: string | null
          timeOut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_bathroom_passes_classroom"
            columns: ["classroom"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      Hall_Passes_api: {
        Row: {
          destination: string | null
          duration: number | null
          firstName: string | null
          id: string | null
          lastName: string | null
          needsReview: boolean | null
          period: string | null
          studentId: string | null
          studentName: string | null
          timeIn: string | null
          timeOut: string | null
          typedName: string | null
        }
        Insert: {
          destination?: string | null
          duration?: number | null
          firstName?: never
          id?: string | null
          lastName?: never
          needsReview?: never
          period?: string | null
          studentId?: string | null
          studentName?: string | null
          timeIn?: string | null
          timeOut?: string | null
          typedName?: string | null
        }
        Update: {
          destination?: string | null
          duration?: number | null
          firstName?: never
          id?: string | null
          lastName?: never
          needsReview?: never
          period?: string | null
          studentId?: string | null
          studentName?: string | null
          timeIn?: string | null
          timeOut?: string | null
          typedName?: string | null
        }
        Relationships: []
      }
      hp_month_window: {
        Row: {
          end_ct: string | null
          start_ct: string | null
        }
        Relationships: []
      }
      hp_quarter_window: {
        Row: {
          end_ct: string | null
          start_ct: string | null
        }
        Relationships: []
      }
      hp_week_window: {
        Row: {
          end_ct: string | null
          start_ct: string | null
        }
        Relationships: []
      }
      hp_windows: {
        Row: {
          end_ct: string | null
          start_ct: string | null
          window: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_full_analytics: {
        Args: { time_frame_arg: string }
        Returns: Json
      }
      get_teacher_dashboard_data: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_weekly_top_students: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      normalize_name: {
        Args: { txt: string }
        Returns: string
      }
      to_local_date_toronto: {
        Args: { ts: string }
        Returns: string
      }
      verify_teacher_pin: {
        Args: { pin_to_check: string }
        Returns: boolean
      }
    }
    Enums: {
      location_type:
        | "classroom"
        | "restroom"
        | "library"
        | "office"
        | "other"
        | "athletics"
        | "hallway"
        | "chapel"
        | "theater"
      pass_status: "ACTIVE" | "RETURNED" | "LATE"
      user_role: "student" | "teacher" | "admin"
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
    Enums: {
      location_type: [
        "classroom",
        "restroom",
        "library",
        "office",
        "other",
        "athletics",
        "hallway",
        "chapel",
        "theater",
      ],
      pass_status: ["ACTIVE", "RETURNED", "LATE"],
      user_role: ["student", "teacher", "admin"],
    },
  },
} as const
