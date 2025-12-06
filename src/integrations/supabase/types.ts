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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      customers: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          user_id?: string
        }
        Relationships: []
      }
      order_fulfillment: {
        Row: {
          assembly_notes: string | null
          assembly_status: string | null
          created_at: string
          doors_assembled: boolean | null
          doors_glass_available: boolean | null
          doors_glass_installed: boolean | null
          doors_image_url: string | null
          doors_notes: string | null
          doors_status: string | null
          frame_sash_assembled: boolean | null
          frames_welded: boolean | null
          glass_delivered: boolean | null
          glass_installed: boolean | null
          glass_not_delivered_notes: string | null
          glass_not_installed_notes: string | null
          glass_notes: string | null
          glass_status: string | null
          id: string
          order_id: string
          profile_cutting: string | null
          reinforcement_cutting: string | null
          screens_cutting: string | null
          screens_delivered: boolean | null
          screens_made: boolean | null
          screens_notes: string | null
          sliding_doors_assembled: boolean | null
          sliding_doors_glass_available: boolean | null
          sliding_doors_glass_installed: boolean | null
          sliding_doors_image_url: string | null
          sliding_doors_notes: string | null
          sliding_doors_status: string | null
          welding_notes: string | null
          welding_status: string | null
        }
        Insert: {
          assembly_notes?: string | null
          assembly_status?: string | null
          created_at?: string
          doors_assembled?: boolean | null
          doors_glass_available?: boolean | null
          doors_glass_installed?: boolean | null
          doors_image_url?: string | null
          doors_notes?: string | null
          doors_status?: string | null
          frame_sash_assembled?: boolean | null
          frames_welded?: boolean | null
          glass_delivered?: boolean | null
          glass_installed?: boolean | null
          glass_not_delivered_notes?: string | null
          glass_not_installed_notes?: string | null
          glass_notes?: string | null
          glass_status?: string | null
          id?: string
          order_id: string
          profile_cutting?: string | null
          reinforcement_cutting?: string | null
          screens_cutting?: string | null
          screens_delivered?: boolean | null
          screens_made?: boolean | null
          screens_notes?: string | null
          sliding_doors_assembled?: boolean | null
          sliding_doors_glass_available?: boolean | null
          sliding_doors_glass_installed?: boolean | null
          sliding_doors_image_url?: string | null
          sliding_doors_notes?: string | null
          sliding_doors_status?: string | null
          welding_notes?: string | null
          welding_status?: string | null
        }
        Update: {
          assembly_notes?: string | null
          assembly_status?: string | null
          created_at?: string
          doors_assembled?: boolean | null
          doors_glass_available?: boolean | null
          doors_glass_installed?: boolean | null
          doors_image_url?: string | null
          doors_notes?: string | null
          doors_status?: string | null
          frame_sash_assembled?: boolean | null
          frames_welded?: boolean | null
          glass_delivered?: boolean | null
          glass_installed?: boolean | null
          glass_not_delivered_notes?: string | null
          glass_not_installed_notes?: string | null
          glass_notes?: string | null
          glass_status?: string | null
          id?: string
          order_id?: string
          profile_cutting?: string | null
          reinforcement_cutting?: string | null
          screens_cutting?: string | null
          screens_delivered?: boolean | null
          screens_made?: boolean | null
          screens_notes?: string | null
          sliding_doors_assembled?: boolean | null
          sliding_doors_glass_available?: boolean | null
          sliding_doors_glass_installed?: boolean | null
          sliding_doors_image_url?: string | null
          sliding_doors_notes?: string | null
          sliding_doors_status?: string | null
          welding_notes?: string | null
          welding_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_fulfillment_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          customer_id: string
          customer_name: string
          delivery_date: string
          doors_count: number | null
          fulfillment_percentage: number | null
          glass_order_date: string | null
          glass_ordered: boolean | null
          glass_status: string | null
          hardware_available: boolean | null
          hardware_order_date: string | null
          hardware_status: string | null
          has_nailing_flanges: boolean | null
          has_plisse_screens: boolean | null
          has_sliding_doors: boolean | null
          hidden_hinges_count: number | null
          id: string
          nail_fins_order_date: string | null
          nail_fins_status: string | null
          order_date: string
          order_number: string
          plisse_door_count: number | null
          plisse_screens_count: number | null
          plisse_screens_order_date: string | null
          plisse_screens_status: string | null
          plisse_window_count: number | null
          reinforcement_order_date: string | null
          reinforcement_status: string | null
          screen_profile_available: boolean | null
          screen_profile_ordered: boolean | null
          screen_type: string | null
          screens_order_date: string | null
          screens_status: string | null
          sliding_door_type: string | null
          sliding_doors_count: number | null
          user_id: string
          visible_hinges_count: number | null
          windows_count: number | null
          windows_profile_available: boolean | null
          windows_profile_order_date: string | null
          windows_profile_status: string | null
          windows_profile_type: string | null
        }
        Insert: {
          created_at?: string
          customer_id: string
          customer_name: string
          delivery_date: string
          doors_count?: number | null
          fulfillment_percentage?: number | null
          glass_order_date?: string | null
          glass_ordered?: boolean | null
          glass_status?: string | null
          hardware_available?: boolean | null
          hardware_order_date?: string | null
          hardware_status?: string | null
          has_nailing_flanges?: boolean | null
          has_plisse_screens?: boolean | null
          has_sliding_doors?: boolean | null
          hidden_hinges_count?: number | null
          id?: string
          nail_fins_order_date?: string | null
          nail_fins_status?: string | null
          order_date: string
          order_number: string
          plisse_door_count?: number | null
          plisse_screens_count?: number | null
          plisse_screens_order_date?: string | null
          plisse_screens_status?: string | null
          plisse_window_count?: number | null
          reinforcement_order_date?: string | null
          reinforcement_status?: string | null
          screen_profile_available?: boolean | null
          screen_profile_ordered?: boolean | null
          screen_type?: string | null
          screens_order_date?: string | null
          screens_status?: string | null
          sliding_door_type?: string | null
          sliding_doors_count?: number | null
          user_id: string
          visible_hinges_count?: number | null
          windows_count?: number | null
          windows_profile_available?: boolean | null
          windows_profile_order_date?: string | null
          windows_profile_status?: string | null
          windows_profile_type?: string | null
        }
        Update: {
          created_at?: string
          customer_id?: string
          customer_name?: string
          delivery_date?: string
          doors_count?: number | null
          fulfillment_percentage?: number | null
          glass_order_date?: string | null
          glass_ordered?: boolean | null
          glass_status?: string | null
          hardware_available?: boolean | null
          hardware_order_date?: string | null
          hardware_status?: string | null
          has_nailing_flanges?: boolean | null
          has_plisse_screens?: boolean | null
          has_sliding_doors?: boolean | null
          hidden_hinges_count?: number | null
          id?: string
          nail_fins_order_date?: string | null
          nail_fins_status?: string | null
          order_date?: string
          order_number?: string
          plisse_door_count?: number | null
          plisse_screens_count?: number | null
          plisse_screens_order_date?: string | null
          plisse_screens_status?: string | null
          plisse_window_count?: number | null
          reinforcement_order_date?: string | null
          reinforcement_status?: string | null
          screen_profile_available?: boolean | null
          screen_profile_ordered?: boolean | null
          screen_type?: string | null
          screens_order_date?: string | null
          screens_status?: string | null
          sliding_door_type?: string | null
          sliding_doors_count?: number | null
          user_id?: string
          visible_hinges_count?: number | null
          windows_count?: number | null
          windows_profile_available?: boolean | null
          windows_profile_order_date?: string | null
          windows_profile_status?: string | null
          windows_profile_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
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
