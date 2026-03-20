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
      action_style_catalog: {
        Row: {
          code: string
          created_at: string
        }
        Insert: {
          code: string
          created_at?: string
        }
        Update: {
          code?: string
          created_at?: string
        }
        Relationships: []
      }
      business: {
        Row: {
          created_at: string
          id: string
          id_document: string | null
          location_id: string | null
          name: string | null
          num_ratings: number | null
          rating: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          id_document?: string | null
          location_id?: string | null
          name?: string | null
          num_ratings?: number | null
          rating?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          id_document?: string | null
          location_id?: string | null
          name?: string | null
          num_ratings?: number | null
          rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "business_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "location"
            referencedColumns: ["id"]
          },
        ]
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
      conversation: {
        Row: {
          buyer_profile_id: string | null
          created_at: string
          id: string
          purchase_offer_id: string | null
          purchase_request_id: string | null
          seller_profile_id: string | null
          status_code: string | null
        }
        Insert: {
          buyer_profile_id?: string | null
          created_at?: string
          id?: string
          purchase_offer_id?: string | null
          purchase_request_id?: string | null
          seller_profile_id?: string | null
          status_code?: string | null
        }
        Update: {
          buyer_profile_id?: string | null
          created_at?: string
          id?: string
          purchase_offer_id?: string | null
          purchase_request_id?: string | null
          seller_profile_id?: string | null
          status_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_buyer_profile_id_fkey"
            columns: ["buyer_profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_purchase_offer_id_fkey"
            columns: ["purchase_offer_id"]
            isOneToOne: true
            referencedRelation: "purchase_offer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_purchase_request_id_fkey"
            columns: ["purchase_request_id"]
            isOneToOne: false
            referencedRelation: "purchase_request"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_seller_profile_id_fkey"
            columns: ["seller_profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_status_code_fkey"
            columns: ["status_code"]
            isOneToOne: false
            referencedRelation: "conversation_status"
            referencedColumns: ["code"]
          },
        ]
      }
      conversation_action: {
        Row: {
          code: string | null
          created_at: string
          icon: string | null
          id: string
          label: string | null
          style_code: string | null
          ui_slot: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          label?: string | null
          style_code?: string | null
          ui_slot?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          label?: string | null
          style_code?: string | null
          ui_slot?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_action_style_code_fkey"
            columns: ["style_code"]
            isOneToOne: false
            referencedRelation: "action_style_catalog"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "conversation_action_ui_slot_fkey"
            columns: ["ui_slot"]
            isOneToOne: false
            referencedRelation: "ui_slot_catalog"
            referencedColumns: ["code"]
          },
        ]
      }
      conversation_deadline: {
        Row: {
          created_at: string
          deadline_type: string | null
          due_at: string | null
          id: string
          resolved_at: string | null
          trigger_transition_to: string | null
        }
        Insert: {
          created_at?: string
          deadline_type?: string | null
          due_at?: string | null
          id?: string
          resolved_at?: string | null
          trigger_transition_to?: string | null
        }
        Update: {
          created_at?: string
          deadline_type?: string | null
          due_at?: string | null
          id?: string
          resolved_at?: string | null
          trigger_transition_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_deadline_deadline_type_fkey"
            columns: ["deadline_type"]
            isOneToOne: false
            referencedRelation: "deadline_type_catalog"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "conversation_deadline_trigger_transition_to_fkey"
            columns: ["trigger_transition_to"]
            isOneToOne: false
            referencedRelation: "conversation_status"
            referencedColumns: ["code"]
          },
        ]
      }
      conversation_message: {
        Row: {
          conversation_id: string | null
          created_at: string
          id: string
          message_kind: string | null
          sender_profile_id: string | null
          text: string | null
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          message_kind?: string | null
          sender_profile_id?: string | null
          text?: string | null
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          id?: string
          message_kind?: string | null
          sender_profile_id?: string | null
          text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_message_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_message_message_kind_fkey"
            columns: ["message_kind"]
            isOneToOne: false
            referencedRelation: "conversation_message_kind"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "conversation_message_sender_profile_id_fkey"
            columns: ["sender_profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_message_kind: {
        Row: {
          code: string
          created_at: string
        }
        Insert: {
          code: string
          created_at?: string
        }
        Update: {
          code?: string
          created_at?: string
        }
        Relationships: []
      }
      conversation_status: {
        Row: {
          code: string
          created_at: string
          description: string | null
          is_terminal: boolean | null
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          is_terminal?: boolean | null
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          is_terminal?: boolean | null
        }
        Relationships: []
      }
      conversation_status_history: {
        Row: {
          action_id: string | null
          actor_profile_id: string | null
          conversation_id: string | null
          created_at: string
          from_status_code: string | null
          id: string
          reason: string | null
          to_status_code: string | null
        }
        Insert: {
          action_id?: string | null
          actor_profile_id?: string | null
          conversation_id?: string | null
          created_at?: string
          from_status_code?: string | null
          id?: string
          reason?: string | null
          to_status_code?: string | null
        }
        Update: {
          action_id?: string | null
          actor_profile_id?: string | null
          conversation_id?: string | null
          created_at?: string
          from_status_code?: string | null
          id?: string
          reason?: string | null
          to_status_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_status_history_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "conversation_action"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_status_history_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_status_history_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_status_history_from_status_code_fkey"
            columns: ["from_status_code"]
            isOneToOne: false
            referencedRelation: "conversation_status"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "conversation_status_history_to_status_code_fkey"
            columns: ["to_status_code"]
            isOneToOne: false
            referencedRelation: "conversation_status"
            referencedColumns: ["code"]
          },
        ]
      }
      conversation_status_role_action: {
        Row: {
          action_id: string | null
          created_at: string
          id: string
          is_enabled: boolean | null
          role_id: string | null
          status_code: string | null
        }
        Insert: {
          action_id?: string | null
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          role_id?: string | null
          status_code?: string | null
        }
        Update: {
          action_id?: string | null
          created_at?: string
          id?: string
          is_enabled?: boolean | null
          role_id?: string | null
          status_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_status_role_action_action_id_fkey1"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "conversation_action"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_status_role_action_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "role"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_status_role_action_status_code_fkey"
            columns: ["status_code"]
            isOneToOne: false
            referencedRelation: "conversation_status"
            referencedColumns: ["code"]
          },
        ]
      }
      conversation_status_role_rule: {
        Row: {
          can_send_attachments: boolean | null
          can_send_messages: boolean | null
          conversation_status: string | null
          created_at: string
          id: string
          role_id: string | null
        }
        Insert: {
          can_send_attachments?: boolean | null
          can_send_messages?: boolean | null
          conversation_status?: string | null
          created_at?: string
          id?: string
          role_id?: string | null
        }
        Update: {
          can_send_attachments?: boolean | null
          can_send_messages?: boolean | null
          conversation_status?: string | null
          created_at?: string
          id?: string
          role_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_status_role_rule_conversation_status_fkey"
            columns: ["conversation_status"]
            isOneToOne: false
            referencedRelation: "conversation_status"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "conversation_status_role_rule_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "role"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_transition: {
        Row: {
          action_id: string | null
          actor_role_id: string | null
          created_at: string
          from_status_code: string | null
          id: string
          is_system_transition: boolean | null
          to_status_code: string | null
        }
        Insert: {
          action_id?: string | null
          actor_role_id?: string | null
          created_at?: string
          from_status_code?: string | null
          id?: string
          is_system_transition?: boolean | null
          to_status_code?: string | null
        }
        Update: {
          action_id?: string | null
          actor_role_id?: string | null
          created_at?: string
          from_status_code?: string | null
          id?: string
          is_system_transition?: boolean | null
          to_status_code?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversation_transition_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "conversation_action"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_transition_actor_role_id_fkey"
            columns: ["actor_role_id"]
            isOneToOne: false
            referencedRelation: "role"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_transition_from_status_code_fkey"
            columns: ["from_status_code"]
            isOneToOne: false
            referencedRelation: "conversation_status"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "conversation_transition_to_status_code_fkey"
            columns: ["to_status_code"]
            isOneToOne: false
            referencedRelation: "conversation_status"
            referencedColumns: ["code"]
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
      deadline_type_catalog: {
        Row: {
          code: string
          created_at: string
          description: string | null
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
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
      location: {
        Row: {
          canton: string | null
          created_at: string
          district: string | null
          id: string
          province: string | null
        }
        Insert: {
          canton?: string | null
          created_at?: string
          district?: string | null
          id?: string
          province?: string | null
        }
        Update: {
          canton?: string | null
          created_at?: string
          district?: string | null
          id?: string
          province?: string | null
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
          business_id: string | null
          created_at: string
          currency_id: string | null
          delivery_id: string | null
          description: string | null
          id: string
          price: number | null
          purchase_request_id: string | null
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          currency_id?: string | null
          delivery_id?: string | null
          description?: string | null
          id?: string
          price?: number | null
          purchase_request_id?: string | null
        }
        Update: {
          business_id?: string | null
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
            foreignKeyName: "purchase_offer_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business"
            referencedColumns: ["id"]
          },
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
      purchase_request_visualization: {
        Row: {
          created_at: string
          id: string
          profile_id: string | null
          purchase_request_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id?: string | null
          purchase_request_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string | null
          purchase_request_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offer_visualization_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profile"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_request_visualization_purchase_request_id_fkey"
            columns: ["purchase_request_id"]
            isOneToOne: false
            referencedRelation: "purchase_request"
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
          role_code: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          role_code?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          role_code?: string | null
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
      ui_slot_catalog: {
        Row: {
          code: string
          created_at: string
          description: string | null
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
        }
        Relationships: []
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
      get_conversation_view: {
        Args: { p_conversation_id: string; p_profile_id: string }
        Returns: Json
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
