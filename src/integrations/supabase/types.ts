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
      add_ons: {
        Row: {
          created_at: string
          daily_rate: number
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          one_time_fee: number | null
        }
        Insert: {
          created_at?: string
          daily_rate: number
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          one_time_fee?: number | null
        }
        Update: {
          created_at?: string
          daily_rate?: number
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          one_time_fee?: number | null
        }
        Relationships: []
      }
      admin_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: Database["public"]["Enums"]["alert_type"]
          booking_id: string | null
          created_at: string
          id: string
          message: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["alert_status"]
          title: string
          user_id: string | null
          vehicle_id: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: Database["public"]["Enums"]["alert_type"]
          booking_id?: string | null
          created_at?: string
          id?: string
          message?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["alert_status"]
          title: string
          user_id?: string | null
          vehicle_id?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: Database["public"]["Enums"]["alert_type"]
          booking_id?: string | null
          created_at?: string
          id?: string
          message?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["alert_status"]
          title?: string
          user_id?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_alerts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_alerts_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      booking_add_ons: {
        Row: {
          add_on_id: string
          booking_id: string
          created_at: string
          id: string
          price: number
          quantity: number | null
        }
        Insert: {
          add_on_id: string
          booking_id: string
          created_at?: string
          id?: string
          price: number
          quantity?: number | null
        }
        Update: {
          add_on_id?: string
          booking_id?: string
          created_at?: string
          id?: string
          price?: number
          quantity?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_add_ons_add_on_id_fkey"
            columns: ["add_on_id"]
            isOneToOne: false
            referencedRelation: "add_ons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_add_ons_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          actual_return_at: string | null
          booking_code: string
          created_at: string
          daily_rate: number
          deposit_amount: number | null
          end_at: string
          id: string
          location_id: string
          notes: string | null
          pickup_address: string | null
          pickup_lat: number | null
          pickup_lng: number | null
          pickup_place_id: string | null
          start_at: string
          status: Database["public"]["Enums"]["booking_status"]
          subtotal: number
          tax_amount: number | null
          total_amount: number
          total_days: number
          updated_at: string
          user_id: string
          vehicle_id: string
        }
        Insert: {
          actual_return_at?: string | null
          booking_code: string
          created_at?: string
          daily_rate: number
          deposit_amount?: number | null
          end_at: string
          id?: string
          location_id: string
          notes?: string | null
          pickup_address?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_place_id?: string | null
          start_at: string
          status?: Database["public"]["Enums"]["booking_status"]
          subtotal: number
          tax_amount?: number | null
          total_amount: number
          total_days: number
          updated_at?: string
          user_id: string
          vehicle_id: string
        }
        Update: {
          actual_return_at?: string | null
          booking_code?: string
          created_at?: string
          daily_rate?: number
          deposit_amount?: number | null
          end_at?: string
          id?: string
          location_id?: string
          notes?: string | null
          pickup_address?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_place_id?: string | null
          start_at?: string
          status?: Database["public"]["Enums"]["booking_status"]
          subtotal?: number
          tax_amount?: number | null
          total_amount?: number
          total_days?: number
          updated_at?: string
          user_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      condition_photos: {
        Row: {
          booking_id: string
          captured_at: string
          captured_by: string
          id: string
          notes: string | null
          phase: string
          photo_type: string
          photo_url: string
        }
        Insert: {
          booking_id: string
          captured_at?: string
          captured_by: string
          id?: string
          notes?: string | null
          phase: string
          photo_type: string
          photo_url: string
        }
        Update: {
          booking_id?: string
          captured_at?: string
          captured_by?: string
          id?: string
          notes?: string | null
          phase?: string
          photo_type?: string
          photo_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "condition_photos_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      damage_reports: {
        Row: {
          booking_id: string
          created_at: string
          description: string
          estimated_cost: number | null
          id: string
          location_on_vehicle: string
          photo_urls: Json | null
          reported_by: string
          resolution_notes: string | null
          resolved_at: string | null
          severity: Database["public"]["Enums"]["damage_severity"]
          status: string
          vehicle_id: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          description: string
          estimated_cost?: number | null
          id?: string
          location_on_vehicle: string
          photo_urls?: Json | null
          reported_by: string
          resolution_notes?: string | null
          resolved_at?: string | null
          severity: Database["public"]["Enums"]["damage_severity"]
          status?: string
          vehicle_id: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          description?: string
          estimated_cost?: number | null
          id?: string
          location_on_vehicle?: string
          photo_urls?: Json | null
          reported_by?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          severity?: Database["public"]["Enums"]["damage_severity"]
          status?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "damage_reports_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "damage_reports_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      inspection_metrics: {
        Row: {
          booking_id: string
          exterior_notes: string | null
          fuel_level: number | null
          id: string
          interior_notes: string | null
          odometer: number | null
          phase: string
          recorded_at: string
          recorded_by: string
        }
        Insert: {
          booking_id: string
          exterior_notes?: string | null
          fuel_level?: number | null
          id?: string
          interior_notes?: string | null
          odometer?: number | null
          phase: string
          recorded_at?: string
          recorded_by: string
        }
        Update: {
          booking_id?: string
          exterior_notes?: string | null
          fuel_level?: number | null
          id?: string
          interior_notes?: string | null
          odometer?: number | null
          phase?: string
          recorded_at?: string
          recorded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "inspection_metrics_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string
          city: string
          created_at: string
          email: string | null
          hours_json: Json | null
          id: string
          is_active: boolean | null
          lat: number | null
          lng: number | null
          name: string
          phone: string | null
          place_id: string | null
          updated_at: string
        }
        Insert: {
          address: string
          city: string
          created_at?: string
          email?: string | null
          hours_json?: Json | null
          id?: string
          is_active?: boolean | null
          lat?: number | null
          lng?: number | null
          name: string
          phone?: string | null
          place_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string
          city?: string
          created_at?: string
          email?: string | null
          hours_json?: Json | null
          id?: string
          is_active?: boolean | null
          lat?: number | null
          lng?: number | null
          name?: string
          phone?: string | null
          place_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          booking_id: string
          created_at: string
          id: string
          payment_method: string | null
          payment_type: string
          status: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string
          id?: string
          payment_method?: string | null
          payment_type: string
          status?: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string
          id?: string
          payment_method?: string | null
          payment_type?: string
          status?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_verified: boolean | null
          phone: string | null
          role: Database["public"]["Enums"]["staff_role"] | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          is_verified?: boolean | null
          phone?: string | null
          role?: Database["public"]["Enums"]["staff_role"] | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_verified?: boolean | null
          phone?: string | null
          role?: Database["public"]["Enums"]["staff_role"] | null
          updated_at?: string
        }
        Relationships: []
      }
      receipt_events: {
        Row: {
          action: string
          actor_user_id: string
          created_at: string
          id: string
          meta_json: Json | null
          receipt_id: string
        }
        Insert: {
          action: string
          actor_user_id: string
          created_at?: string
          id?: string
          meta_json?: Json | null
          receipt_id: string
        }
        Update: {
          action?: string
          actor_user_id?: string
          created_at?: string
          id?: string
          meta_json?: Json | null
          receipt_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipt_events_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          booking_id: string
          created_at: string
          created_by: string
          currency: string | null
          id: string
          issued_at: string | null
          line_items_json: Json
          notes: string | null
          receipt_number: string
          status: Database["public"]["Enums"]["receipt_status"]
          totals_json: Json
          updated_at: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          created_by: string
          currency?: string | null
          id?: string
          issued_at?: string | null
          line_items_json?: Json
          notes?: string | null
          receipt_number: string
          status?: Database["public"]["Enums"]["receipt_status"]
          totals_json?: Json
          updated_at?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          created_by?: string
          currency?: string | null
          id?: string
          issued_at?: string | null
          line_items_json?: Json
          notes?: string | null
          receipt_number?: string
          status?: Database["public"]["Enums"]["receipt_status"]
          totals_json?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_holds: {
        Row: {
          created_at: string
          end_at: string
          expires_at: string
          id: string
          start_at: string
          status: Database["public"]["Enums"]["hold_status"]
          user_id: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          end_at: string
          expires_at: string
          id?: string
          start_at: string
          status?: Database["public"]["Enums"]["hold_status"]
          user_id: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          end_at?: string
          expires_at?: string
          id?: string
          start_at?: string
          status?: Database["public"]["Enums"]["hold_status"]
          user_id?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservation_holds_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          created_at: string
          id: string
          is_staff: boolean | null
          message: string
          sender_id: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_staff?: boolean | null
          message: string
          sender_id: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_staff?: boolean | null
          message?: string
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          assigned_to: string | null
          booking_id: string | null
          created_at: string
          id: string
          priority: string | null
          status: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          booking_id?: string | null
          created_at?: string
          id?: string
          priority?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          booking_id?: string | null
          created_at?: string
          id?: string
          priority?: string | null
          status?: Database["public"]["Enums"]["ticket_status"]
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          category: string
          cleaning_buffer_hours: number | null
          created_at: string
          daily_rate: number
          features_json: Json | null
          fuel_type: string | null
          id: string
          image_url: string | null
          images_json: Json | null
          is_available: boolean | null
          is_featured: boolean | null
          location_id: string | null
          make: string
          model: string
          seats: number | null
          specs_json: Json | null
          transmission: string | null
          updated_at: string
          year: number
        }
        Insert: {
          category: string
          cleaning_buffer_hours?: number | null
          created_at?: string
          daily_rate: number
          features_json?: Json | null
          fuel_type?: string | null
          id?: string
          image_url?: string | null
          images_json?: Json | null
          is_available?: boolean | null
          is_featured?: boolean | null
          location_id?: string | null
          make: string
          model: string
          seats?: number | null
          specs_json?: Json | null
          transmission?: string | null
          updated_at?: string
          year: number
        }
        Update: {
          category?: string
          cleaning_buffer_hours?: number | null
          created_at?: string
          daily_rate?: number
          features_json?: Json | null
          fuel_type?: string | null
          id?: string
          image_url?: string | null
          images_json?: Json | null
          is_available?: boolean | null
          is_featured?: boolean | null
          location_id?: string | null
          make?: string
          model?: string
          seats?: number | null
          specs_json?: Json | null
          transmission?: string | null
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_requests: {
        Row: {
          booking_id: string | null
          created_at: string
          document_type: string
          document_url: string
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          status: Database["public"]["Enums"]["verification_status"]
          user_id: string
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          document_type: string
          document_url: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          user_id: string
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          document_type?: string
          document_url?: string
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: Database["public"]["Enums"]["verification_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "verification_requests_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_booking_code: { Args: never; Returns: string }
    }
    Enums: {
      alert_status: "pending" | "acknowledged" | "resolved"
      alert_type:
        | "verification_pending"
        | "payment_pending"
        | "cleaning_required"
        | "damage_reported"
        | "late_return"
        | "hold_expiring"
      booking_status:
        | "pending"
        | "confirmed"
        | "active"
        | "completed"
        | "cancelled"
      damage_severity: "minor" | "moderate" | "severe"
      hold_status: "active" | "expired" | "converted"
      receipt_status: "draft" | "issued" | "voided"
      staff_role: "admin" | "staff" | "cleaner" | "finance"
      ticket_status: "open" | "in_progress" | "resolved" | "closed"
      verification_status: "pending" | "verified" | "rejected"
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
      alert_status: ["pending", "acknowledged", "resolved"],
      alert_type: [
        "verification_pending",
        "payment_pending",
        "cleaning_required",
        "damage_reported",
        "late_return",
        "hold_expiring",
      ],
      booking_status: [
        "pending",
        "confirmed",
        "active",
        "completed",
        "cancelled",
      ],
      damage_severity: ["minor", "moderate", "severe"],
      hold_status: ["active", "expired", "converted"],
      receipt_status: ["draft", "issued", "voided"],
      staff_role: ["admin", "staff", "cleaner", "finance"],
      ticket_status: ["open", "in_progress", "resolved", "closed"],
      verification_status: ["pending", "verified", "rejected"],
    },
  },
} as const
