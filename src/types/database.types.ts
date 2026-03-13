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
      business: {
        Row: {
          created_at: string
          id: string
          id_document: string | null
          name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          id_document?: string | null
          name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          id_document?: string | null
          name?: string | null
        }
        Relationships: []
      }
      category: {
        Row: {
          id: string
          name: string
          path: unknown
        }
        Insert: {
          id?: string
          name: string
          path: unknown
        }
        Update: {
          id?: string
          name?: string
          path?: unknown
        }
        Relationships: []
      }
      category_requirement: {
        Row: {
          allowed_values: Json | null
          category_id: string
          created_at: string
          field_name: string
          field_type: string | null
          id: string
          is_array: boolean | null
          required: boolean | null
          version: number
        }
        Insert: {
          allowed_values?: Json | null
          category_id?: string
          created_at?: string
          field_name: string
          field_type?: string | null
          id?: string
          is_array?: boolean | null
          required?: boolean | null
          version?: number
        }
        Update: {
          allowed_values?: Json | null
          category_id?: string
          created_at?: string
          field_name?: string
          field_type?: string | null
          id?: string
          is_array?: boolean | null
          required?: boolean | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "category_requirement_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "category"
            referencedColumns: ["id"]
          },
        ]
      }
      currency: {
        Row: {
          created_at: string
          currency_code: string | null
          display_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          currency_code?: string | null
          display_name?: string | null
          id?: string
        }
        Update: {
          created_at?: string
          currency_code?: string | null
          display_name?: string | null
          id?: string
        }
        Relationships: []
      }
      delivery_catalog: {
        Row: {
          created_at: string
          display_name: string | null
          hint: string | null
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          hint?: string | null
          id?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          hint?: string | null
          id?: string
        }
        Relationships: []
      }
      menu_item: {
        Row: {
          created_at: string
          icon: string
          id: string
          route: string
        }
        Insert: {
          created_at?: string
          icon: string
          id?: string
          route: string
        }
        Update: {
          created_at?: string
          icon?: string
          id?: string
          route?: string
        }
        Relationships: []
      }
      notification: {
        Row: {
          created_at: string
          id: string
        }
        Insert: {
          created_at?: string
          id?: string
        }
        Update: {
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      profile: {
        Row: {
          created_at: string
          id: string
          id_document: string
          name: string
          phone: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          id_document: string
          name: string
          phone?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          id_document?: string
          name?: string
          phone?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profile_business: {
        Row: {
          business_id: string | null
          created_at: string
          id: string
          profile_id: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          id?: string
          profile_id?: string | null
        }
        Update: {
          business_id?: string | null
          created_at?: string
          id?: string
          profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profile_business_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_business_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_notification: {
        Row: {
          created_at: string
          notification_id: string
          profile_id: string
        }
        Insert: {
          created_at?: string
          notification_id?: string
          profile_id?: string
        }
        Update: {
          created_at?: string
          notification_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_notification_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notification"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_notification_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      profile_role: {
        Row: {
          created_at: string
          profile_id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          profile_id?: string
          role_id?: string
        }
        Update: {
          created_at?: string
          profile_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_role_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profile_role_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "role"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_offer: {
        Row: {
          created_at: string
          currency_id: string | null
          delivery_id: string | null
          description: string | null
          id: string
          price: number | null
          purchase_request_id: string | null
        }
        Insert: {
          created_at?: string
          currency_id?: string | null
          delivery_id?: string | null
          description?: string | null
          id?: string
          price?: number | null
          purchase_request_id?: string | null
        }
        Update: {
          created_at?: string
          currency_id?: string | null
          delivery_id?: string | null
          description?: string | null
          id?: string
          price?: number | null
          purchase_request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_offer_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "currency"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_offer_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "purchase_offer_delivery"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_offer_purchase_request_id_fkey"
            columns: ["purchase_request_id"]
            isOneToOne: false
            referencedRelation: "purchase_request"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_offer_delivery: {
        Row: {
          after_days: number | null
          created_at: string
          delivery_cat_id: string | null
          id: string
          max_days: number | null
          price: number | null
        }
        Insert: {
          after_days?: number | null
          created_at?: string
          delivery_cat_id?: string | null
          id?: string
          max_days?: number | null
          price?: number | null
        }
        Update: {
          after_days?: number | null
          created_at?: string
          delivery_cat_id?: string | null
          id?: string
          max_days?: number | null
          price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_offer_delivery_delivery_id_fkey"
            columns: ["delivery_cat_id"]
            isOneToOne: false
            referencedRelation: "delivery_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_offer_image: {
        Row: {
          created_at: string
          id: string
          path: string | null
          purchase_offer_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          path?: string | null
          purchase_offer_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          path?: string | null
          purchase_offer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_offer_image_purchase_offer_id_fkey"
            columns: ["purchase_offer_id"]
            isOneToOne: false
            referencedRelation: "purchase_offer"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_request: {
        Row: {
          category_id: string | null
          category_name: string | null
          category_path: string | null
          contract: Json
          created_at: string
          draft_id: string | null
          id: string
          profile_id: string
          published_at: string
          status: string
          summary_text: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          category_name?: string | null
          category_path?: string | null
          contract: Json
          created_at?: string
          draft_id?: string | null
          id?: string
          profile_id: string
          published_at?: string
          status?: string
          summary_text?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          category_name?: string | null
          category_path?: string | null
          contract?: Json
          created_at?: string
          draft_id?: string | null
          id?: string
          profile_id?: string
          published_at?: string
          status?: string
          summary_text?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_request_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "category"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_request_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "request_draft"
            referencedColumns: ["id"]
          },
        ]
      }
      request_draft: {
        Row: {
          data: Json | null
          id: string
          pending_action: string | null
          profile_id: string | null
          purchase_request_id: string | null
          status: string
          ui_state: string
          updated_at: string
        }
        Insert: {
          data?: Json | null
          id?: string
          pending_action?: string | null
          profile_id?: string | null
          purchase_request_id?: string | null
          status?: string
          ui_state?: string
          updated_at?: string
        }
        Update: {
          data?: Json | null
          id?: string
          pending_action?: string | null
          profile_id?: string | null
          purchase_request_id?: string | null
          status?: string
          ui_state?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_draft_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_draft_purchase_request_id_fkey"
            columns: ["purchase_request_id"]
            isOneToOne: false
            referencedRelation: "purchase_request"
            referencedColumns: ["id"]
          },
        ]
      }
      role: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      role_menu: {
        Row: {
          created_at: string
          menu_item_id: string
          role_id: string
        }
        Insert: {
          created_at?: string
          menu_item_id?: string
          role_id?: string
        }
        Update: {
          created_at?: string
          menu_item_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_menu_menu_item_id_fkey"
            columns: ["menu_item_id"]
            isOneToOne: false
            referencedRelation: "menu_item"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_menu_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "role"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_category_lineage: {
        Args: { leaf_id: string }
        Returns: {
          id: string
          name: string
          path: unknown
        }[]
      }
      get_category_requirements: {
        Args: { category_ids: string[] }
        Returns: {
          category_id: string
          optional_fields: string[]
          required_fields: string[]
          version: number
        }[]
      }
      is_category_leaf: { Args: { category_id: string }; Returns: boolean }
      search_category: {
        Args: { search_text: string }
        Returns: {
          id: string
          name: string
          path: unknown
        }[]
      }
      text2ltree: { Args: { "": string }; Returns: unknown }
      unaccent: { Args: { "": string }; Returns: string }
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
