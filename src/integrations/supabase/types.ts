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
      assigned_tasks: {
        Row: {
          assignee_id: string
          created_at: string
          creator_id: string
          description: string | null
          due_date: string | null
          id: string
          priority: string
          status: string
          title: string
        }
        Insert: {
          assignee_id: string
          created_at?: string
          creator_id: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status?: string
          title: string
        }
        Update: {
          assignee_id?: string
          created_at?: string
          creator_id?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status?: string
          title?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          booking_date: string
          client_name: string
          comment: string | null
          created_at: string
          id: string
          owner_id: string
          phone: string | null
          service: string
          status: string
        }
        Insert: {
          booking_date?: string
          client_name: string
          comment?: string | null
          created_at?: string
          id?: string
          owner_id: string
          phone?: string | null
          service: string
          status?: string
        }
        Update: {
          booking_date?: string
          client_name?: string
          comment?: string | null
          created_at?: string
          id?: string
          owner_id?: string
          phone?: string | null
          service?: string
          status?: string
        }
        Relationships: []
      }
      call_logs: {
        Row: {
          call_time: string
          call_type: string
          contact_name: string
          created_at: string
          duration: string | null
          email: string | null
          id: string
          notes: string | null
          owner_id: string
          phone: string
        }
        Insert: {
          call_time?: string
          call_type?: string
          contact_name?: string
          created_at?: string
          duration?: string | null
          email?: string | null
          id?: string
          notes?: string | null
          owner_id: string
          phone?: string
        }
        Update: {
          call_time?: string
          call_type?: string
          contact_name?: string
          created_at?: string
          duration?: string | null
          email?: string | null
          id?: string
          notes?: string | null
          owner_id?: string
          phone?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          amount: number
          content: string
          counterparty: string
          created_at: string
          doc_type: string
          file_path: string | null
          id: string
          name: string
          owner_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          content?: string
          counterparty?: string
          created_at?: string
          doc_type?: string
          file_path?: string | null
          id?: string
          name: string
          owner_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          content?: string
          counterparty?: string
          created_at?: string
          doc_type?: string
          file_path?: string | null
          id?: string
          name?: string
          owner_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_campaigns: {
        Row: {
          body: string
          channel: string
          clicked_count: number
          created_at: string
          id: string
          name: string
          opened_count: number
          owner_id: string
          scheduled_at: string | null
          segment: string
          sent_count: number
          status: string
          subject: string
        }
        Insert: {
          body?: string
          channel?: string
          clicked_count?: number
          created_at?: string
          id?: string
          name: string
          opened_count?: number
          owner_id: string
          scheduled_at?: string | null
          segment?: string
          sent_count?: number
          status?: string
          subject?: string
        }
        Update: {
          body?: string
          channel?: string
          clicked_count?: number
          created_at?: string
          id?: string
          name?: string
          opened_count?: number
          owner_id?: string
          scheduled_at?: string | null
          segment?: string
          sent_count?: number
          status?: string
          subject?: string
        }
        Relationships: []
      }
      finance_entries: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          id: string
          name: string
          owner_id: string
          type: string
        }
        Insert: {
          amount?: number
          category?: string | null
          created_at?: string
          id?: string
          name: string
          owner_id: string
          type: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          id?: string
          name?: string
          owner_id?: string
          type?: string
        }
        Relationships: []
      }
      internal_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          read: boolean
          recipient_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          read?: boolean
          recipient_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          read?: boolean
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          client_email: string | null
          client_name: string
          client_phone: string | null
          created_at: string
          id: string
          items: string
          manager: string | null
          notes: string | null
          order_number: string
          owner_id: string
          payment_method: string | null
          status: string
          total: number
          updated_at: string
        }
        Insert: {
          client_email?: string | null
          client_name: string
          client_phone?: string | null
          created_at?: string
          id?: string
          items?: string
          manager?: string | null
          notes?: string | null
          order_number?: string
          owner_id: string
          payment_method?: string | null
          status?: string
          total?: number
          updated_at?: string
        }
        Update: {
          client_email?: string | null
          client_name?: string
          client_phone?: string | null
          created_at?: string
          id?: string
          items?: string
          manager?: string | null
          notes?: string | null
          order_number?: string
          owner_id?: string
          payment_method?: string | null
          status?: string
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          role: string
          team_id: string
        }
        Insert: {
          created_at?: string
          full_name?: string
          id: string
          role?: string
          team_id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          role?: string
          team_id?: string
        }
        Relationships: []
      }
      role_management_delegates: {
        Row: {
          created_at: string
          granted_by: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      sites: {
        Row: {
          created_at: string
          id: string
          last_check: string | null
          mobile: boolean
          name: string
          owner_id: string
          pages: number
          speed: number
          ssl: boolean
          status: string
          uptime: number
          url: string
          visitors: number
        }
        Insert: {
          created_at?: string
          id?: string
          last_check?: string | null
          mobile?: boolean
          name?: string
          owner_id: string
          pages?: number
          speed?: number
          ssl?: boolean
          status?: string
          uptime?: number
          url: string
          visitors?: number
        }
        Update: {
          created_at?: string
          id?: string
          last_check?: string | null
          mobile?: boolean
          name?: string
          owner_id?: string
          pages?: number
          speed?: number
          ssl?: boolean
          status?: string
          uptime?: number
          url?: string
          visitors?: number
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount: number
          auto_renew: boolean
          client_email: string | null
          client_name: string
          client_phone: string | null
          created_at: string
          id: string
          next_payment: string | null
          owner_id: string
          payment_method: string | null
          plan: string
          started_at: string
          status: string
          total_paid: number
        }
        Insert: {
          amount?: number
          auto_renew?: boolean
          client_email?: string | null
          client_name: string
          client_phone?: string | null
          created_at?: string
          id?: string
          next_payment?: string | null
          owner_id: string
          payment_method?: string | null
          plan?: string
          started_at?: string
          status?: string
          total_paid?: number
        }
        Update: {
          amount?: number
          auto_renew?: boolean
          client_email?: string | null
          client_name?: string
          client_phone?: string | null
          created_at?: string
          id?: string
          next_payment?: string | null
          owner_id?: string
          payment_method?: string | null
          plan?: string
          started_at?: string
          status?: string
          total_paid?: number
        }
        Relationships: []
      }
      team_members: {
        Row: {
          access_level: string
          created_at: string
          email: string | null
          id: string
          name: string
          online: boolean
          owner_id: string
          phone: string | null
          restricted_blocks: string[] | null
          role: string
        }
        Insert: {
          access_level?: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          online?: boolean
          owner_id: string
          phone?: string | null
          restricted_blocks?: string[] | null
          role?: string
        }
        Update: {
          access_level?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          online?: boolean
          owner_id?: string
          phone?: string | null
          restricted_blocks?: string[] | null
          role?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      warehouse_products: {
        Row: {
          category: string
          created_at: string
          id: string
          min_qty: number
          name: string
          owner_id: string
          price: number
          qty: number
          sku: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          min_qty?: number
          name: string
          owner_id: string
          price?: number
          qty?: number
          sku?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          min_qty?: number
          name?: string
          owner_id?: string
          price?: number
          qty?: number
          sku?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_my_team_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "observer"
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
      app_role: ["admin", "manager", "observer"],
    },
  },
} as const
