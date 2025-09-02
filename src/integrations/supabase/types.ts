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
            foreignKeyName: "bathroom_passes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
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
        Relationships: [
          {
            foreignKeyName: "student_name_synonyms_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          active: boolean
          created_at: string
          email: string | null
          external_ref: string | null
          first_name: string | null
          first_norm: string | null
          full_name: string | null
          full_name_norm: string | null
          id: string
          last_name: string | null
          last_norm: string | null
          period_code: string | null
          preferred_name: string | null
          roster_block: string
          sis_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email?: string | null
          external_ref?: string | null
          first_name?: string | null
          first_norm?: string | null
          full_name?: string | null
          full_name_norm?: string | null
          id?: string
          last_name?: string | null
          last_norm?: string | null
          period_code?: string | null
          preferred_name?: string | null
          roster_block?: string
          sis_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string | null
          external_ref?: string | null
          first_name?: string | null
          first_norm?: string | null
          full_name?: string | null
          full_name_norm?: string | null
          id?: string
          last_name?: string | null
          last_norm?: string | null
          period_code?: string | null
          preferred_name?: string | null
          roster_block?: string
          sis_id?: string | null
          updated_at?: string
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
            foreignKeyName: "bathroom_passes_student_id_fkey"
            columns: ["studentId"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
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
        Relationships: [
          {
            foreignKeyName: "bathroom_passes_student_id_fkey"
            columns: ["studentId"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      hp_base: {
        Row: {
          destination: string | null
          duration_min: number | null
          id: string | null
          period: string | null
          student_name: string | null
          timein: string | null
          timeout: string | null
          timeout_ct: string | null
        }
        Insert: {
          destination?: string | null
          duration_min?: never
          id?: string | null
          period?: string | null
          student_name?: string | null
          timein?: string | null
          timeout?: string | null
          timeout_ct?: never
        }
        Update: {
          destination?: string | null
          duration_min?: never
          id?: string | null
          period?: string | null
          student_name?: string | null
          timein?: string | null
          timeout?: string | null
          timeout_ct?: never
        }
        Relationships: []
      }
      hp_by_destination_windows: {
        Row: {
          destination: string | null
          median_min: number | null
          minutes_out: number | null
          p90_min: number | null
          passes: number | null
          window: string | null
        }
        Relationships: []
      }
      hp_by_period_windows: {
        Row: {
          minutes_out: number | null
          passes: number | null
          period: string | null
          window: string | null
        }
        Relationships: []
      }
      hp_frequent_flyers_windows: {
        Row: {
          minutes_out: number | null
          passes: number | null
          student_name: string | null
          window: string | null
        }
        Relationships: []
      }
      hp_longest_windows: {
        Row: {
          destination: string | null
          duration: number | null
          id: string | null
          period: string | null
          student_name: string | null
          timein: string | null
          timeout: string | null
          window: string | null
        }
        Relationships: []
      }
      hp_month_by_destination: {
        Row: {
          destination: string | null
          median_min: number | null
          minutes_out: number | null
          p90_min: number | null
          passes: number | null
        }
        Relationships: []
      }
      hp_month_by_period: {
        Row: {
          minutes_out: number | null
          passes: number | null
          period: string | null
        }
        Relationships: []
      }
      hp_month_frequent_flyers: {
        Row: {
          minutes_out: number | null
          passes: number | null
          studentname: string | null
        }
        Relationships: []
      }
      hp_month_longest: {
        Row: {
          destination: string | null
          duration: number | null
          id: string | null
          period: string | null
          studentname: string | null
          timeIn: string | null
          timeOut: string | null
        }
        Relationships: []
      }
      hp_month_return_rate: {
        Row: {
          pct_returned: number | null
          still_out: number | null
          total: number | null
        }
        Relationships: []
      }
      hp_month_summary: {
        Row: {
          minutes_out: number | null
          passes: number | null
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
      hp_passes_month: {
        Row: {
          classroom: string | null
          destination: string | null
          duration_min: number | null
          id: string | null
          notes: string | null
          period: string | null
          studentId: string | null
          studentName: string | null
          timeIn: string | null
          timeOut: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bathroom_passes_student_id_fkey"
            columns: ["studentId"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bathroom_passes_classroom"
            columns: ["classroom"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      hp_passes_quarter: {
        Row: {
          classroom: string | null
          destination: string | null
          duration_min: number | null
          id: string | null
          notes: string | null
          period: string | null
          studentId: string | null
          studentName: string | null
          timeIn: string | null
          timeOut: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bathroom_passes_student_id_fkey"
            columns: ["studentId"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bathroom_passes_classroom"
            columns: ["classroom"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      hp_passes_week: {
        Row: {
          classroom: string | null
          destination: string | null
          duration_min: number | null
          id: string | null
          notes: string | null
          period: string | null
          studentId: string | null
          studentName: string | null
          timeIn: string | null
          timeOut: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bathroom_passes_student_id_fkey"
            columns: ["studentId"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bathroom_passes_classroom"
            columns: ["classroom"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      hp_quarter_by_destination: {
        Row: {
          destination: string | null
          median_min: number | null
          minutes_out: number | null
          p90_min: number | null
          passes: number | null
        }
        Relationships: []
      }
      hp_quarter_by_period: {
        Row: {
          minutes_out: number | null
          passes: number | null
          period: string | null
        }
        Relationships: []
      }
      hp_quarter_frequent_flyers: {
        Row: {
          minutes_out: number | null
          passes: number | null
          studentname: string | null
        }
        Relationships: []
      }
      hp_quarter_longest: {
        Row: {
          destination: string | null
          duration: number | null
          id: string | null
          period: string | null
          studentname: string | null
          timeIn: string | null
          timeOut: string | null
        }
        Relationships: []
      }
      hp_quarter_return_rate: {
        Row: {
          pct_returned: number | null
          still_out: number | null
          total: number | null
        }
        Relationships: []
      }
      hp_quarter_summary: {
        Row: {
          minutes_out: number | null
          passes: number | null
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
      hp_return_rate_windows: {
        Row: {
          pct_returned: number | null
          still_out: number | null
          total: number | null
          window: string | null
        }
        Relationships: []
      }
      hp_summary_windows: {
        Row: {
          minutes_out: number | null
          passes: number | null
          window: string | null
        }
        Relationships: []
      }
      hp_week_by_destination: {
        Row: {
          destination: string | null
          median_min: number | null
          minutes_out: number | null
          p90_min: number | null
          passes: number | null
        }
        Relationships: []
      }
      hp_week_by_period: {
        Row: {
          minutes_out: number | null
          passes: number | null
          period: string | null
        }
        Relationships: []
      }
      hp_week_frequent_flyers: {
        Row: {
          minutes_out: number | null
          passes: number | null
          studentname: string | null
        }
        Relationships: []
      }
      hp_week_longest: {
        Row: {
          destination: string | null
          duration: number | null
          id: string | null
          period: string | null
          studentname: string | null
          timeIn: string | null
          timeOut: string | null
        }
        Relationships: []
      }
      hp_week_return_rate: {
        Row: {
          pct_returned: number | null
          still_out: number | null
          total: number | null
        }
        Relationships: []
      }
      hp_week_summary: {
        Row: {
          minutes_out: number | null
          passes: number | null
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
      get_analytics_avg_minutes: {
        Args: { time_frame_arg: string }
        Returns: {
          avg_minutes: number
        }[]
      }
      get_analytics_by_destination: {
        Args: { time_frame_arg: string }
        Returns: {
          destination: string
          median_minutes: number
          passes: number
          q1_minutes: number
          q3_minutes: number
          total_minutes: number
        }[]
      }
      get_analytics_by_period: {
        Args: { time_frame_arg: string }
        Returns: {
          avg_minutes: number
          passes: number
          period: string
          period_label: string
          total_minutes: number
        }[]
      }
      get_analytics_frequent_flyers: {
        Args: { time_frame_arg: string }
        Returns: {
          avg_minutes_per_trip: number
          passes: number
          student_name: string
          total_minutes: number
        }[]
      }
      get_analytics_longest_passes: {
        Args: { time_frame_arg: string }
        Returns: {
          destination: string
          duration_minutes: number
          period: string
          student_name: string
          timein: string
          timeout: string
        }[]
      }
      get_analytics_return_rate: {
        Args: { time_frame_arg: string }
        Returns: {
          return_rate_pct: number
          still_out: number
          total: number
        }[]
      }
      get_analytics_summary: {
        Args: { time_frame_arg: string }
        Returns: {
          passes: number
          total_minutes: number
        }[]
      }
      get_behavioral_insights: {
        Args: { time_frame_arg: string }
        Returns: {
          avg_duration: number
          insight_type: string
          pass_count: number
        }[]
      }
      get_passes_by_day_of_week: {
        Args: { time_frame_arg: string }
        Returns: {
          day_of_week: string
          pass_count: number
        }[]
      }
      get_schedule_type_analysis: {
        Args: { time_frame_arg: string }
        Returns: {
          instructional_minutes: number
          passes_per_100_min: number
          schedule_type: string
          total_passes: number
        }[]
      }
      get_teacher_dashboard_data: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_weekly_heatmap_data: {
        Args: { time_frame_arg: string }
        Returns: {
          day_of_week: string
          pass_count: number
          period: string
        }[]
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
