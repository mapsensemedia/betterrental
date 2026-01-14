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
      abandoned_carts: {
        Row: {
          abandoned_at: string
          add_on_ids: string[] | null
          cart_data: Json | null
          contact_notes: string | null
          contacted_at: string | null
          converted_at: string | null
          created_at: string
          delivery_address: string | null
          delivery_mode: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          location_id: string | null
          phone: string | null
          pickup_date: string | null
          protection: string | null
          return_date: string | null
          session_id: string
          total_amount: number | null
          updated_at: string
          user_id: string | null
          vehicle_id: string | null
        }
        Insert: {
          abandoned_at?: string
          add_on_ids?: string[] | null
          cart_data?: Json | null
          contact_notes?: string | null
          contacted_at?: string | null
          converted_at?: string | null
          created_at?: string
          delivery_address?: string | null
          delivery_mode?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          location_id?: string | null
          phone?: string | null
          pickup_date?: string | null
          protection?: string | null
          return_date?: string | null
          session_id: string
          total_amount?: number | null
          updated_at?: string
          user_id?: string | null
          vehicle_id?: string | null
        }
        Update: {
          abandoned_at?: string
          add_on_ids?: string[] | null
          cart_data?: Json | null
          contact_notes?: string | null
          contacted_at?: string | null
          converted_at?: string | null
          created_at?: string
          delivery_address?: string | null
          delivery_mode?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          location_id?: string | null
          phone?: string | null
          pickup_date?: string | null
          protection?: string | null
          return_date?: string | null
          session_id?: string
          total_amount?: number | null
          updated_at?: string
          user_id?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "abandoned_carts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abandoned_carts_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
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
      booking_otps: {
        Row: {
          attempts: number | null
          booking_id: string
          channel: string
          created_at: string
          expires_at: string
          id: string
          otp_hash: string
          user_id: string
          verified_at: string | null
        }
        Insert: {
          attempts?: number | null
          booking_id: string
          channel: string
          created_at?: string
          expires_at: string
          id?: string
          otp_hash: string
          user_id: string
          verified_at?: string | null
        }
        Update: {
          attempts?: number | null
          booking_id?: string
          channel?: string
          created_at?: string
          expires_at?: string
          id?: string
          otp_hash?: string
          user_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_otps_booking_id_fkey"
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
          assigned_driver_id: string | null
          assigned_unit_id: string | null
          booking_code: string
          created_at: string
          daily_rate: number
          deposit_amount: number | null
          driver_age_band: string | null
          end_at: string
          id: string
          location_id: string
          notes: string | null
          pickup_address: string | null
          pickup_contact_name: string | null
          pickup_contact_phone: string | null
          pickup_lat: number | null
          pickup_lng: number | null
          pickup_place_id: string | null
          return_evidence_completed_at: string | null
          return_evidence_completed_by: string | null
          return_exception_reason: string | null
          return_intake_completed_at: string | null
          return_intake_completed_by: string | null
          return_is_exception: boolean | null
          return_issues_reviewed_at: string | null
          return_issues_reviewed_by: string | null
          return_started_at: string | null
          return_state: string | null
          save_time_at_counter: boolean | null
          special_instructions: string | null
          start_at: string
          status: Database["public"]["Enums"]["booking_status"]
          subtotal: number
          tax_amount: number | null
          total_amount: number
          total_days: number
          updated_at: string
          user_id: string
          vehicle_id: string
          young_driver_fee: number | null
        }
        Insert: {
          actual_return_at?: string | null
          assigned_driver_id?: string | null
          assigned_unit_id?: string | null
          booking_code: string
          created_at?: string
          daily_rate: number
          deposit_amount?: number | null
          driver_age_band?: string | null
          end_at: string
          id?: string
          location_id: string
          notes?: string | null
          pickup_address?: string | null
          pickup_contact_name?: string | null
          pickup_contact_phone?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_place_id?: string | null
          return_evidence_completed_at?: string | null
          return_evidence_completed_by?: string | null
          return_exception_reason?: string | null
          return_intake_completed_at?: string | null
          return_intake_completed_by?: string | null
          return_is_exception?: boolean | null
          return_issues_reviewed_at?: string | null
          return_issues_reviewed_by?: string | null
          return_started_at?: string | null
          return_state?: string | null
          save_time_at_counter?: boolean | null
          special_instructions?: string | null
          start_at: string
          status?: Database["public"]["Enums"]["booking_status"]
          subtotal: number
          tax_amount?: number | null
          total_amount: number
          total_days: number
          updated_at?: string
          user_id: string
          vehicle_id: string
          young_driver_fee?: number | null
        }
        Update: {
          actual_return_at?: string | null
          assigned_driver_id?: string | null
          assigned_unit_id?: string | null
          booking_code?: string
          created_at?: string
          daily_rate?: number
          deposit_amount?: number | null
          driver_age_band?: string | null
          end_at?: string
          id?: string
          location_id?: string
          notes?: string | null
          pickup_address?: string | null
          pickup_contact_name?: string | null
          pickup_contact_phone?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_place_id?: string | null
          return_evidence_completed_at?: string | null
          return_evidence_completed_by?: string | null
          return_exception_reason?: string | null
          return_intake_completed_at?: string | null
          return_intake_completed_by?: string | null
          return_is_exception?: boolean | null
          return_issues_reviewed_at?: string | null
          return_issues_reviewed_by?: string | null
          return_started_at?: string | null
          return_state?: string | null
          save_time_at_counter?: boolean | null
          special_instructions?: string | null
          start_at?: string
          status?: Database["public"]["Enums"]["booking_status"]
          subtotal?: number
          tax_amount?: number | null
          total_amount?: number
          total_days?: number
          updated_at?: string
          user_id?: string
          vehicle_id?: string
          young_driver_fee?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_assigned_unit_id_fkey"
            columns: ["assigned_unit_id"]
            isOneToOne: false
            referencedRelation: "vehicle_units"
            referencedColumns: ["id"]
          },
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
      checkin_records: {
        Row: {
          age_notes: string | null
          age_verified: boolean | null
          arrival_time: string | null
          blocked_reason: string | null
          booking_id: string
          check_in_status: string
          checked_in_at: string | null
          checked_in_by: string | null
          created_at: string
          customer_dob: string | null
          id: string
          identity_notes: string | null
          identity_verified: boolean | null
          license_expiry_date: string | null
          license_name_matches: boolean | null
          license_notes: string | null
          license_valid: boolean | null
          license_verified: boolean | null
          timing_notes: string | null
          timing_status: string | null
          updated_at: string
        }
        Insert: {
          age_notes?: string | null
          age_verified?: boolean | null
          arrival_time?: string | null
          blocked_reason?: string | null
          booking_id: string
          check_in_status?: string
          checked_in_at?: string | null
          checked_in_by?: string | null
          created_at?: string
          customer_dob?: string | null
          id?: string
          identity_notes?: string | null
          identity_verified?: boolean | null
          license_expiry_date?: string | null
          license_name_matches?: boolean | null
          license_notes?: string | null
          license_valid?: boolean | null
          license_verified?: boolean | null
          timing_notes?: string | null
          timing_status?: string | null
          updated_at?: string
        }
        Update: {
          age_notes?: string | null
          age_verified?: boolean | null
          arrival_time?: string | null
          blocked_reason?: string | null
          booking_id?: string
          check_in_status?: string
          checked_in_at?: string | null
          checked_in_by?: string | null
          created_at?: string
          customer_dob?: string | null
          id?: string
          identity_notes?: string | null
          identity_verified?: boolean | null
          license_expiry_date?: string | null
          license_name_matches?: boolean | null
          license_notes?: string | null
          license_valid?: boolean | null
          license_verified?: boolean | null
          timing_notes?: string | null
          timing_status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkin_records_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
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
          vehicle_unit_id: string | null
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
          vehicle_unit_id?: string | null
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
          vehicle_unit_id?: string | null
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
          {
            foreignKeyName: "damage_reports_vehicle_unit_id_fkey"
            columns: ["vehicle_unit_id"]
            isOneToOne: false
            referencedRelation: "vehicle_units"
            referencedColumns: ["id"]
          },
        ]
      }
      deposit_ledger: {
        Row: {
          action: string
          amount: number
          booking_id: string
          created_at: string
          created_by: string
          id: string
          payment_id: string | null
          reason: string | null
        }
        Insert: {
          action: string
          amount: number
          booking_id: string
          created_at?: string
          created_by: string
          id?: string
          payment_id?: string | null
          reason?: string | null
        }
        Update: {
          action?: string
          amount?: number
          booking_id?: string
          created_at?: string
          created_by?: string
          id?: string
          payment_id?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deposit_ledger_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposit_ledger_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
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
      notification_logs: {
        Row: {
          booking_id: string | null
          channel: string
          created_at: string
          error_message: string | null
          id: string
          idempotency_key: string
          notification_type: string
          provider_id: string | null
          sent_at: string | null
          status: string
          user_id: string | null
        }
        Insert: {
          booking_id?: string | null
          channel: string
          created_at?: string
          error_message?: string | null
          id?: string
          idempotency_key: string
          notification_type: string
          provider_id?: string | null
          sent_at?: string | null
          status?: string
          user_id?: string | null
        }
        Update: {
          booking_id?: string | null
          channel?: string
          created_at?: string
          error_message?: string | null
          id?: string
          idempotency_key?: string
          notification_type?: string
          provider_id?: string | null
          sent_at?: string | null
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
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
      rental_agreements: {
        Row: {
          agreement_content: string
          booking_id: string
          created_at: string
          customer_ip_address: string | null
          customer_signature: string | null
          customer_signed_at: string | null
          id: string
          staff_confirmed_at: string | null
          staff_confirmed_by: string | null
          status: string
          terms_json: Json
          updated_at: string
        }
        Insert: {
          agreement_content: string
          booking_id: string
          created_at?: string
          customer_ip_address?: string | null
          customer_signature?: string | null
          customer_signed_at?: string | null
          id?: string
          staff_confirmed_at?: string | null
          staff_confirmed_by?: string | null
          status?: string
          terms_json?: Json
          updated_at?: string
        }
        Update: {
          agreement_content?: string
          booking_id?: string
          created_at?: string
          customer_ip_address?: string | null
          customer_signature?: string | null
          customer_signed_at?: string | null
          id?: string
          staff_confirmed_at?: string | null
          staff_confirmed_by?: string | null
          status?: string
          terms_json?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rental_agreements_booking_id_fkey"
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
      ticket_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_type: string | null
          file_url: string
          id: string
          is_internal: boolean
          ticket_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_type?: string | null
          file_url: string
          id?: string
          is_internal?: boolean
          ticket_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_type?: string | null
          file_url?: string
          id?: string
          is_internal?: boolean
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
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
      ticket_timeline: {
        Row: {
          action: string
          created_at: string
          id: string
          new_status: string | null
          note: string | null
          old_status: string | null
          ticket_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_status?: string | null
          note?: string | null
          old_status?: string | null
          ticket_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_status?: string | null
          note?: string | null
          old_status?: string | null
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_timeline_ticket_id_fkey"
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
          resolution_summary: string | null
          resolved_at: string | null
          resolved_by: string | null
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
          resolution_summary?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
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
          resolution_summary?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
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
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicle_expenses: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          description: string | null
          expense_date: string
          expense_type: string
          id: string
          mileage_at_expense: number | null
          receipt_url: string | null
          updated_at: string
          vehicle_unit_id: string
          vendor: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string
          expense_type: string
          id?: string
          mileage_at_expense?: number | null
          receipt_url?: string | null
          updated_at?: string
          vehicle_unit_id: string
          vendor?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string
          expense_type?: string
          id?: string
          mileage_at_expense?: number | null
          receipt_url?: string | null
          updated_at?: string
          vehicle_unit_id?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_expenses_vehicle_unit_id_fkey"
            columns: ["vehicle_unit_id"]
            isOneToOne: false
            referencedRelation: "vehicle_units"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_units: {
        Row: {
          acquisition_cost: number
          acquisition_date: string | null
          color: string | null
          created_at: string
          current_mileage: number | null
          id: string
          license_plate: string | null
          mileage_at_acquisition: number | null
          notes: string | null
          status: string
          updated_at: string
          vehicle_id: string
          vin: string
        }
        Insert: {
          acquisition_cost?: number
          acquisition_date?: string | null
          color?: string | null
          created_at?: string
          current_mileage?: number | null
          id?: string
          license_plate?: string | null
          mileage_at_acquisition?: number | null
          notes?: string | null
          status?: string
          updated_at?: string
          vehicle_id: string
          vin: string
        }
        Update: {
          acquisition_cost?: number
          acquisition_date?: string | null
          color?: string | null
          created_at?: string
          current_mileage?: number | null
          id?: string
          license_plate?: string | null
          mileage_at_acquisition?: number | null
          notes?: string | null
          status?: string
          updated_at?: string
          vehicle_id?: string
          vin?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_units_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
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
          maintenance_reason: string | null
          maintenance_until: string | null
          make: string
          model: string
          seats: number | null
          specs_json: Json | null
          status: string | null
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
          maintenance_reason?: string | null
          maintenance_until?: string | null
          make: string
          model: string
          seats?: number | null
          specs_json?: Json | null
          status?: string | null
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
          maintenance_reason?: string | null
          maintenance_until?: string | null
          make?: string
          model?: string
          seats?: number | null
          specs_json?: Json | null
          status?: string | null
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
      walkaround_inspections: {
        Row: {
          booking_id: string
          completed_at: string | null
          conducted_at: string
          conducted_by: string
          created_at: string
          customer_acknowledged: boolean
          customer_acknowledged_at: string | null
          customer_signature: string | null
          exterior_notes: string | null
          fuel_level: number | null
          id: string
          inspection_complete: boolean
          interior_condition: string | null
          interior_notes: string | null
          odometer_reading: number | null
          scratches_dents: Json | null
          updated_at: string
        }
        Insert: {
          booking_id: string
          completed_at?: string | null
          conducted_at?: string
          conducted_by: string
          created_at?: string
          customer_acknowledged?: boolean
          customer_acknowledged_at?: string | null
          customer_signature?: string | null
          exterior_notes?: string | null
          fuel_level?: number | null
          id?: string
          inspection_complete?: boolean
          interior_condition?: string | null
          interior_notes?: string | null
          odometer_reading?: number | null
          scratches_dents?: Json | null
          updated_at?: string
        }
        Update: {
          booking_id?: string
          completed_at?: string | null
          conducted_at?: string
          conducted_by?: string
          created_at?: string
          customer_acknowledged?: boolean
          customer_acknowledged_at?: string | null
          customer_signature?: string | null
          exterior_notes?: string | null
          fuel_level?: number | null
          id?: string
          inspection_complete?: boolean
          interior_condition?: string | null
          interior_notes?: string | null
          odometer_reading?: number | null
          scratches_dents?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "walkaround_inspections_booking_id_fkey"
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_staff: { Args: { _user_id: string }; Returns: boolean }
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
        | "return_due_soon"
        | "overdue"
        | "customer_issue"
        | "emergency"
      app_role: "admin" | "staff" | "cleaner" | "finance"
      booking_status:
        | "pending"
        | "confirmed"
        | "active"
        | "completed"
        | "cancelled"
      damage_severity: "minor" | "moderate" | "severe"
      damage_status:
        | "reported"
        | "reviewing"
        | "approved"
        | "repaired"
        | "closed"
      hold_status: "active" | "expired" | "converted"
      receipt_status: "draft" | "issued" | "voided"
      staff_role: "admin" | "staff" | "cleaner" | "finance"
      ticket_status:
        | "open"
        | "in_progress"
        | "resolved"
        | "closed"
        | "assigned"
        | "waiting_customer"
      vehicle_status:
        | "available"
        | "booked"
        | "active_rental"
        | "maintenance"
        | "inactive"
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
        "return_due_soon",
        "overdue",
        "customer_issue",
        "emergency",
      ],
      app_role: ["admin", "staff", "cleaner", "finance"],
      booking_status: [
        "pending",
        "confirmed",
        "active",
        "completed",
        "cancelled",
      ],
      damage_severity: ["minor", "moderate", "severe"],
      damage_status: [
        "reported",
        "reviewing",
        "approved",
        "repaired",
        "closed",
      ],
      hold_status: ["active", "expired", "converted"],
      receipt_status: ["draft", "issued", "voided"],
      staff_role: ["admin", "staff", "cleaner", "finance"],
      ticket_status: [
        "open",
        "in_progress",
        "resolved",
        "closed",
        "assigned",
        "waiting_customer",
      ],
      vehicle_status: [
        "available",
        "booked",
        "active_rental",
        "maintenance",
        "inactive",
      ],
      verification_status: ["pending", "verified", "rejected"],
    },
  },
} as const
