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
      audit_logs: {
        Row: {
          action: string
          created_at: string
          description: string
          entity_id: string | null
          entity_type: string | null
          id: string
          user_email: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          description: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_email: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          user_email?: string
          user_id?: string
        }
        Relationships: []
      }
      batch_construction_components: {
        Row: {
          batch_construction_item_id: string
          component_type: string
          created_at: string
          id: string
          is_delivered: boolean
          quantity: number
          unit_index: number
        }
        Insert: {
          batch_construction_item_id: string
          component_type: string
          created_at?: string
          id?: string
          is_delivered?: boolean
          quantity?: number
          unit_index?: number
        }
        Update: {
          batch_construction_item_id?: string
          component_type?: string
          created_at?: string
          id?: string
          is_delivered?: boolean
          quantity?: number
          unit_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "batch_construction_components_batch_construction_item_id_fkey"
            columns: ["batch_construction_item_id"]
            isOneToOne: false
            referencedRelation: "batch_construction_items"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_construction_items: {
        Row: {
          batch_id: string
          construction_id: string
          created_at: string
          delivery_notes: string | null
          id: string
          include_blinds: boolean
          include_glass: boolean
          include_hardware: boolean
          include_screens: boolean
          is_delivered: boolean
          quantity: number
        }
        Insert: {
          batch_id: string
          construction_id: string
          created_at?: string
          delivery_notes?: string | null
          id?: string
          include_blinds?: boolean
          include_glass?: boolean
          include_hardware?: boolean
          include_screens?: boolean
          is_delivered?: boolean
          quantity?: number
        }
        Update: {
          batch_id?: string
          construction_id?: string
          created_at?: string
          delivery_notes?: string | null
          id?: string
          include_blinds?: boolean
          include_glass?: boolean
          include_hardware?: boolean
          include_screens?: boolean
          is_delivered?: boolean
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "batch_construction_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "delivery_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "batch_construction_items_construction_id_fkey"
            columns: ["construction_id"]
            isOneToOne: false
            referencedRelation: "order_constructions"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_custom_delivery_items: {
        Row: {
          batch_id: string
          created_at: string
          id: string
          is_delivered: boolean
          name: string
          quantity: number
        }
        Insert: {
          batch_id: string
          created_at?: string
          id?: string
          is_delivered?: boolean
          name: string
          quantity?: number
        }
        Update: {
          batch_id?: string
          created_at?: string
          id?: string
          is_delivered?: boolean
          name?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "batch_custom_delivery_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "delivery_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_custom_shipping_items: {
        Row: {
          batch_id: string
          created_at: string
          id: string
          is_complete: boolean
          name: string
          quantity: number
        }
        Insert: {
          batch_id: string
          created_at?: string
          id?: string
          is_complete?: boolean
          name: string
          quantity?: number
        }
        Update: {
          batch_id?: string
          created_at?: string
          id?: string
          is_complete?: boolean
          name?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "batch_custom_shipping_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "delivery_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_delivery_items: {
        Row: {
          batch_id: string
          created_at: string
          id: string
          is_delivered: boolean
          item_type: string
          quantity: number
        }
        Insert: {
          batch_id: string
          created_at?: string
          id?: string
          is_delivered?: boolean
          item_type: string
          quantity?: number
        }
        Update: {
          batch_id?: string
          created_at?: string
          id?: string
          is_delivered?: boolean
          item_type?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "batch_delivery_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "delivery_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      batch_shipping_items: {
        Row: {
          batch_id: string
          created_at: string
          id: string
          is_complete: boolean
          item_type: string
          quantity: number
        }
        Insert: {
          batch_id: string
          created_at?: string
          id?: string
          is_complete?: boolean
          item_type: string
          quantity?: number
        }
        Update: {
          batch_id?: string
          created_at?: string
          id?: string
          is_complete?: boolean
          item_type?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "batch_shipping_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "delivery_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      construction_components: {
        Row: {
          component_name: string | null
          component_type: string
          construction_id: string
          created_at: string
          id: string
          notes: string | null
          order_date: string | null
          quantity: number
          status: string
          updated_at: string | null
          updated_by: string | null
          updated_by_email: string | null
        }
        Insert: {
          component_name?: string | null
          component_type: string
          construction_id: string
          created_at?: string
          id?: string
          notes?: string | null
          order_date?: string | null
          quantity?: number
          status?: string
          updated_at?: string | null
          updated_by?: string | null
          updated_by_email?: string | null
        }
        Update: {
          component_name?: string | null
          component_type?: string
          construction_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          order_date?: string | null
          quantity?: number
          status?: string
          updated_at?: string | null
          updated_by?: string | null
          updated_by_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "construction_components_construction_id_fkey"
            columns: ["construction_id"]
            isOneToOne: false
            referencedRelation: "order_constructions"
            referencedColumns: ["id"]
          },
        ]
      }
      construction_delivery: {
        Row: {
          construction_id: string
          created_at: string
          delivery_batch_id: string | null
          id: string
          is_delivered: boolean
          is_prepared: boolean
          notes: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          construction_id: string
          created_at?: string
          delivery_batch_id?: string | null
          id?: string
          is_delivered?: boolean
          is_prepared?: boolean
          notes?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          construction_id?: string
          created_at?: string
          delivery_batch_id?: string | null
          id?: string
          is_delivered?: boolean
          is_prepared?: boolean
          notes?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "construction_delivery_construction_id_fkey"
            columns: ["construction_id"]
            isOneToOne: false
            referencedRelation: "order_constructions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "construction_delivery_delivery_batch_id_fkey"
            columns: ["delivery_batch_id"]
            isOneToOne: false
            referencedRelation: "delivery_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      construction_issues: {
        Row: {
          construction_id: string
          created_at: string
          created_by: string | null
          created_by_email: string | null
          description: string
          id: string
          issue_type: string
          resolved_at: string | null
          resolved_by: string | null
          resolved_by_email: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          construction_id: string
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          description: string
          id?: string
          issue_type: string
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_by_email?: string | null
          status?: string
          updated_at?: string | null
        }
        Update: {
          construction_id?: string
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          description?: string
          id?: string
          issue_type?: string
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_by_email?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "construction_issues_construction_id_fkey"
            columns: ["construction_id"]
            isOneToOne: false
            referencedRelation: "order_constructions"
            referencedColumns: ["id"]
          },
        ]
      }
      construction_manufacturing: {
        Row: {
          construction_id: string
          created_at: string
          id: string
          notes: string | null
          stage: string
          status: string
          updated_at: string | null
          updated_by: string | null
          updated_by_email: string | null
        }
        Insert: {
          construction_id: string
          created_at?: string
          id?: string
          notes?: string | null
          stage: string
          status?: string
          updated_at?: string | null
          updated_by?: string | null
          updated_by_email?: string | null
        }
        Update: {
          construction_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          stage?: string
          status?: string
          updated_at?: string | null
          updated_by?: string | null
          updated_by_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "construction_manufacturing_construction_id_fkey"
            columns: ["construction_id"]
            isOneToOne: false
            referencedRelation: "order_constructions"
            referencedColumns: ["id"]
          },
        ]
      }
      construction_notes: {
        Row: {
          construction_id: string
          created_at: string
          created_by: string | null
          created_by_email: string | null
          id: string
          note_text: string
          note_type: string
        }
        Insert: {
          construction_id: string
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          id?: string
          note_text: string
          note_type?: string
        }
        Update: {
          construction_id?: string
          created_at?: string
          created_by?: string | null
          created_by_email?: string | null
          id?: string
          note_text?: string
          note_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "construction_notes_construction_id_fkey"
            columns: ["construction_id"]
            isOneToOne: false
            referencedRelation: "order_constructions"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_delivery_items: {
        Row: {
          created_at: string
          id: string
          is_delivered: boolean
          name: string
          order_id: string
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_delivered?: boolean
          name: string
          order_id: string
          quantity?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_delivered?: boolean
          name?: string
          order_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "custom_delivery_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_shipping_items: {
        Row: {
          created_at: string
          id: string
          is_complete: boolean
          name: string
          order_id: string
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_complete?: boolean
          name: string
          order_id: string
          quantity?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_complete?: boolean
          name?: string
          order_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "custom_shipping_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_steps: {
        Row: {
          created_at: string
          id: string
          name: string
          notes: string | null
          order_date: string | null
          order_id: string
          status: string
          step_type: string
          updated_at: string | null
          updated_by: string | null
          updated_by_email: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          order_date?: string | null
          order_id: string
          status?: string
          step_type: string
          updated_at?: string | null
          updated_by?: string | null
          updated_by_email?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          order_date?: string | null
          order_id?: string
          status?: string
          step_type?: string
          updated_at?: string | null
          updated_by?: string | null
          updated_by_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_steps_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
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
      delivery_batches: {
        Row: {
          created_at: string
          created_by: string | null
          delivery_date: string
          delivery_person: string | null
          id: string
          notes: string | null
          order_id: string
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          delivery_date: string
          delivery_person?: string | null
          id?: string
          notes?: string | null
          order_id: string
          status?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          delivery_date?: string
          delivery_person?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_batches_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_constructions: {
        Row: {
          blinds_color: string | null
          center_seal: boolean | null
          color_exterior: string | null
          color_interior: string | null
          comments: string | null
          construction_number: string
          construction_type: string
          created_at: string
          glass_type: string | null
          handle_type: string | null
          has_blinds: boolean | null
          height_inches: number | null
          height_mm: number | null
          id: string
          location: string | null
          model: string | null
          opening_type: string | null
          order_id: string
          position_index: number
          quantity: number
          raw_data: Json | null
          rough_opening: string | null
          screen_type: string | null
          updated_at: string
          width_inches: number | null
          width_mm: number | null
        }
        Insert: {
          blinds_color?: string | null
          center_seal?: boolean | null
          color_exterior?: string | null
          color_interior?: string | null
          comments?: string | null
          construction_number: string
          construction_type?: string
          created_at?: string
          glass_type?: string | null
          handle_type?: string | null
          has_blinds?: boolean | null
          height_inches?: number | null
          height_mm?: number | null
          id?: string
          location?: string | null
          model?: string | null
          opening_type?: string | null
          order_id: string
          position_index?: number
          quantity?: number
          raw_data?: Json | null
          rough_opening?: string | null
          screen_type?: string | null
          updated_at?: string
          width_inches?: number | null
          width_mm?: number | null
        }
        Update: {
          blinds_color?: string | null
          center_seal?: boolean | null
          color_exterior?: string | null
          color_interior?: string | null
          comments?: string | null
          construction_number?: string
          construction_type?: string
          created_at?: string
          glass_type?: string | null
          handle_type?: string | null
          has_blinds?: boolean | null
          height_inches?: number | null
          height_mm?: number | null
          id?: string
          location?: string | null
          model?: string | null
          opening_type?: string | null
          order_id?: string
          position_index?: number
          quantity?: number
          raw_data?: Json | null
          rough_opening?: string | null
          screen_type?: string | null
          updated_at?: string
          width_inches?: number | null
          width_mm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_constructions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_delivery_log: {
        Row: {
          created_at: string | null
          created_by: string | null
          delivery_date: string
          id: string
          items_delivered: string
          notes: string | null
          order_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          delivery_date: string
          id?: string
          items_delivered: string
          notes?: string | null
          order_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          delivery_date?: string
          id?: string
          items_delivered?: string
          notes?: string | null
          order_id?: string
        }
        Relationships: []
      }
      order_fulfillment: {
        Row: {
          assembly_notes: string | null
          assembly_status: string | null
          brackets_delivered: boolean | null
          brackets_delivered_qty: number | null
          created_at: string
          delivery_notes: string | null
          doors_assembled: boolean | null
          doors_delivered: boolean | null
          doors_delivered_qty: number | null
          doors_glass_available: boolean | null
          doors_glass_installed: boolean | null
          doors_image_url: string | null
          doors_notes: string | null
          doors_status: string | null
          frame_sash_assembled: boolean | null
          frames_welded: boolean | null
          glass_delivered: boolean | null
          glass_delivered_final: boolean | null
          glass_delivered_qty: number | null
          glass_installed: boolean | null
          glass_not_delivered_notes: string | null
          glass_not_installed_notes: string | null
          glass_notes: string | null
          glass_status: string | null
          handles_delivered: boolean | null
          handles_delivered_qty: number | null
          id: string
          nailing_fins_delivered: boolean | null
          nailing_fins_delivered_qty: number | null
          order_id: string
          profile_cutting: string | null
          reinforcement_cutting: string | null
          screens_cutting: string | null
          screens_delivered: boolean | null
          screens_delivered_final: boolean | null
          screens_delivered_qty: number | null
          screens_made: boolean | null
          screens_notes: string | null
          shipping_brackets: boolean | null
          shipping_brackets_qty: number | null
          shipping_fins_qty: number | null
          shipping_handles_boxed: boolean | null
          shipping_handles_qty: number | null
          shipping_hinges_covers: boolean | null
          shipping_hinges_qty: number | null
          shipping_labels_qty: number | null
          shipping_nailing_fins: boolean | null
          shipping_spec_labels: boolean | null
          shipping_weeping_covers: boolean | null
          shipping_weeping_qty: number | null
          sliding_doors_assembled: boolean | null
          sliding_doors_delivered: boolean | null
          sliding_doors_delivered_qty: number | null
          sliding_doors_glass_available: boolean | null
          sliding_doors_glass_installed: boolean | null
          sliding_doors_image_url: string | null
          sliding_doors_notes: string | null
          sliding_doors_profile_cutting: string | null
          sliding_doors_reinforcement_cutting: string | null
          sliding_doors_status: string | null
          sliding_doors_welding_notes: string | null
          sliding_doors_welding_status: string | null
          updated_at: string | null
          updated_by: string | null
          updated_by_email: string | null
          welding_notes: string | null
          welding_status: string | null
          windows_delivered: boolean | null
          windows_delivered_qty: number | null
        }
        Insert: {
          assembly_notes?: string | null
          assembly_status?: string | null
          brackets_delivered?: boolean | null
          brackets_delivered_qty?: number | null
          created_at?: string
          delivery_notes?: string | null
          doors_assembled?: boolean | null
          doors_delivered?: boolean | null
          doors_delivered_qty?: number | null
          doors_glass_available?: boolean | null
          doors_glass_installed?: boolean | null
          doors_image_url?: string | null
          doors_notes?: string | null
          doors_status?: string | null
          frame_sash_assembled?: boolean | null
          frames_welded?: boolean | null
          glass_delivered?: boolean | null
          glass_delivered_final?: boolean | null
          glass_delivered_qty?: number | null
          glass_installed?: boolean | null
          glass_not_delivered_notes?: string | null
          glass_not_installed_notes?: string | null
          glass_notes?: string | null
          glass_status?: string | null
          handles_delivered?: boolean | null
          handles_delivered_qty?: number | null
          id?: string
          nailing_fins_delivered?: boolean | null
          nailing_fins_delivered_qty?: number | null
          order_id: string
          profile_cutting?: string | null
          reinforcement_cutting?: string | null
          screens_cutting?: string | null
          screens_delivered?: boolean | null
          screens_delivered_final?: boolean | null
          screens_delivered_qty?: number | null
          screens_made?: boolean | null
          screens_notes?: string | null
          shipping_brackets?: boolean | null
          shipping_brackets_qty?: number | null
          shipping_fins_qty?: number | null
          shipping_handles_boxed?: boolean | null
          shipping_handles_qty?: number | null
          shipping_hinges_covers?: boolean | null
          shipping_hinges_qty?: number | null
          shipping_labels_qty?: number | null
          shipping_nailing_fins?: boolean | null
          shipping_spec_labels?: boolean | null
          shipping_weeping_covers?: boolean | null
          shipping_weeping_qty?: number | null
          sliding_doors_assembled?: boolean | null
          sliding_doors_delivered?: boolean | null
          sliding_doors_delivered_qty?: number | null
          sliding_doors_glass_available?: boolean | null
          sliding_doors_glass_installed?: boolean | null
          sliding_doors_image_url?: string | null
          sliding_doors_notes?: string | null
          sliding_doors_profile_cutting?: string | null
          sliding_doors_reinforcement_cutting?: string | null
          sliding_doors_status?: string | null
          sliding_doors_welding_notes?: string | null
          sliding_doors_welding_status?: string | null
          updated_at?: string | null
          updated_by?: string | null
          updated_by_email?: string | null
          welding_notes?: string | null
          welding_status?: string | null
          windows_delivered?: boolean | null
          windows_delivered_qty?: number | null
        }
        Update: {
          assembly_notes?: string | null
          assembly_status?: string | null
          brackets_delivered?: boolean | null
          brackets_delivered_qty?: number | null
          created_at?: string
          delivery_notes?: string | null
          doors_assembled?: boolean | null
          doors_delivered?: boolean | null
          doors_delivered_qty?: number | null
          doors_glass_available?: boolean | null
          doors_glass_installed?: boolean | null
          doors_image_url?: string | null
          doors_notes?: string | null
          doors_status?: string | null
          frame_sash_assembled?: boolean | null
          frames_welded?: boolean | null
          glass_delivered?: boolean | null
          glass_delivered_final?: boolean | null
          glass_delivered_qty?: number | null
          glass_installed?: boolean | null
          glass_not_delivered_notes?: string | null
          glass_not_installed_notes?: string | null
          glass_notes?: string | null
          glass_status?: string | null
          handles_delivered?: boolean | null
          handles_delivered_qty?: number | null
          id?: string
          nailing_fins_delivered?: boolean | null
          nailing_fins_delivered_qty?: number | null
          order_id?: string
          profile_cutting?: string | null
          reinforcement_cutting?: string | null
          screens_cutting?: string | null
          screens_delivered?: boolean | null
          screens_delivered_final?: boolean | null
          screens_delivered_qty?: number | null
          screens_made?: boolean | null
          screens_notes?: string | null
          shipping_brackets?: boolean | null
          shipping_brackets_qty?: number | null
          shipping_fins_qty?: number | null
          shipping_handles_boxed?: boolean | null
          shipping_handles_qty?: number | null
          shipping_hinges_covers?: boolean | null
          shipping_hinges_qty?: number | null
          shipping_labels_qty?: number | null
          shipping_nailing_fins?: boolean | null
          shipping_spec_labels?: boolean | null
          shipping_weeping_covers?: boolean | null
          shipping_weeping_qty?: number | null
          sliding_doors_assembled?: boolean | null
          sliding_doors_delivered?: boolean | null
          sliding_doors_delivered_qty?: number | null
          sliding_doors_glass_available?: boolean | null
          sliding_doors_glass_installed?: boolean | null
          sliding_doors_image_url?: string | null
          sliding_doors_notes?: string | null
          sliding_doors_profile_cutting?: string | null
          sliding_doors_reinforcement_cutting?: string | null
          sliding_doors_status?: string | null
          sliding_doors_welding_notes?: string | null
          sliding_doors_welding_status?: string | null
          updated_at?: string | null
          updated_by?: string | null
          updated_by_email?: string | null
          welding_notes?: string | null
          welding_status?: string | null
          windows_delivered?: boolean | null
          windows_delivered_qty?: number | null
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
          created_by: string | null
          customer_id: string
          customer_name: string
          delivery_complete: boolean | null
          delivery_date: string
          doors_count: number | null
          fulfillment_percentage: number | null
          glass_delivery_date: string | null
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
          hold_started_at: string | null
          id: string
          is_priority: boolean | null
          nail_fins_order_date: string | null
          nail_fins_status: string | null
          order_date: string
          order_number: string
          ordering_updated_at: string | null
          ordering_updated_by: string | null
          ordering_updated_by_email: string | null
          plisse_door_count: number | null
          plisse_screens_count: number | null
          plisse_screens_order_date: string | null
          plisse_screens_status: string | null
          plisse_window_count: number | null
          production_status: string
          reinforcement_order_date: string | null
          reinforcement_status: string | null
          screen_profile_available: boolean | null
          screen_profile_ordered: boolean | null
          screen_type: string | null
          screens_order_date: string | null
          screens_status: string | null
          sliding_door_type: string | null
          sliding_doors_count: number | null
          sliding_doors_hardware_order_date: string | null
          sliding_doors_hardware_status: string | null
          sliding_doors_profile_order_date: string | null
          sliding_doors_profile_status: string | null
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
          created_by?: string | null
          customer_id: string
          customer_name: string
          delivery_complete?: boolean | null
          delivery_date: string
          doors_count?: number | null
          fulfillment_percentage?: number | null
          glass_delivery_date?: string | null
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
          hold_started_at?: string | null
          id?: string
          is_priority?: boolean | null
          nail_fins_order_date?: string | null
          nail_fins_status?: string | null
          order_date: string
          order_number: string
          ordering_updated_at?: string | null
          ordering_updated_by?: string | null
          ordering_updated_by_email?: string | null
          plisse_door_count?: number | null
          plisse_screens_count?: number | null
          plisse_screens_order_date?: string | null
          plisse_screens_status?: string | null
          plisse_window_count?: number | null
          production_status?: string
          reinforcement_order_date?: string | null
          reinforcement_status?: string | null
          screen_profile_available?: boolean | null
          screen_profile_ordered?: boolean | null
          screen_type?: string | null
          screens_order_date?: string | null
          screens_status?: string | null
          sliding_door_type?: string | null
          sliding_doors_count?: number | null
          sliding_doors_hardware_order_date?: string | null
          sliding_doors_hardware_status?: string | null
          sliding_doors_profile_order_date?: string | null
          sliding_doors_profile_status?: string | null
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
          created_by?: string | null
          customer_id?: string
          customer_name?: string
          delivery_complete?: boolean | null
          delivery_date?: string
          doors_count?: number | null
          fulfillment_percentage?: number | null
          glass_delivery_date?: string | null
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
          hold_started_at?: string | null
          id?: string
          is_priority?: boolean | null
          nail_fins_order_date?: string | null
          nail_fins_status?: string | null
          order_date?: string
          order_number?: string
          ordering_updated_at?: string | null
          ordering_updated_by?: string | null
          ordering_updated_by_email?: string | null
          plisse_door_count?: number | null
          plisse_screens_count?: number | null
          plisse_screens_order_date?: string | null
          plisse_screens_status?: string | null
          plisse_window_count?: number | null
          production_status?: string
          reinforcement_order_date?: string | null
          reinforcement_status?: string | null
          screen_profile_available?: boolean | null
          screen_profile_ordered?: boolean | null
          screen_type?: string | null
          screens_order_date?: string | null
          screens_status?: string | null
          sliding_door_type?: string | null
          sliding_doors_count?: number | null
          sliding_doors_hardware_order_date?: string | null
          sliding_doors_hardware_status?: string | null
          sliding_doors_profile_order_date?: string | null
          sliding_doors_profile_status?: string | null
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
      procurement_cart: {
        Row: {
          added_by: string
          added_by_email: string | null
          component_name: string | null
          component_type: string
          created_at: string
          customer_name: string
          id: string
          is_file_extracted: boolean
          order_id: string
          order_number: string
          quantity: number
        }
        Insert: {
          added_by: string
          added_by_email?: string | null
          component_name?: string | null
          component_type: string
          created_at?: string
          customer_name: string
          id?: string
          is_file_extracted?: boolean
          order_id: string
          order_number: string
          quantity?: number
        }
        Update: {
          added_by?: string
          added_by_email?: string | null
          component_name?: string | null
          component_type?: string
          created_at?: string
          customer_name?: string
          id?: string
          is_file_extracted?: boolean
          order_id?: string
          order_number?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "procurement_cart_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          temporary_password: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role: Database["public"]["Enums"]["app_role"]
          temporary_password: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["app_role"]
          temporary_password?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          invited_by: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          invited_by?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          invited_by?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_user_active: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "manager" | "seller" | "worker"
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
      app_role: ["admin", "manager", "seller", "worker"],
    },
  },
} as const
