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
      booking_access_tokens: {
        Row: {
          booking_id: string
          created_at: string
          expires_at: string
          id: string
          revoked_at: string | null
          token_hash: string
          used_at: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string
          expires_at: string
          id?: string
          revoked_at?: string | null
          token_hash: string
          used_at?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          revoked_at?: string | null
          token_hash?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booking_access_tokens_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
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
      booking_additional_drivers: {
        Row: {
          booking_id: string
          created_at: string
          driver_age_band: string
          driver_name: string | null
          id: string
          young_driver_fee: number
        }
        Insert: {
          booking_id: string
          created_at?: string
          driver_age_band: string
          driver_name?: string | null
          id?: string
          young_driver_fee?: number
        }
        Update: {
          booking_id?: string
          created_at?: string
          driver_age_band?: string
          driver_name?: string | null
          id?: string
          young_driver_fee?: number
        }
        Relationships: [
          {
            foreignKeyName: "booking_additional_drivers_booking_id_fkey"
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
          account_closed_at: string | null
          account_closed_by: string | null
          activated_at: string | null
          activated_by: string | null
          activation_reason: string | null
          activation_source: string | null
          actual_return_at: string | null
          assigned_driver_id: string | null
          assigned_unit_id: string | null
          booking_code: string
          booking_source: string | null
          card_holder_name: string | null
          card_last_four: string | null
          card_type: string | null
          created_at: string
          customer_marked_returned_at: string | null
          customer_return_address: string | null
          customer_return_lat: number | null
          customer_return_lng: number | null
          daily_rate: number
          delivery_fee: number | null
          deposit_amount: number | null
          deposit_authorized_at: string | null
          deposit_capture_reason: string | null
          deposit_captured_amount: number | null
          deposit_captured_at: string | null
          deposit_expires_at: string | null
          deposit_released_at: string | null
          deposit_status: string | null
          different_dropoff_fee: number | null
          driver_age_band: string | null
          end_at: string
          final_invoice_generated: boolean | null
          final_invoice_id: string | null
          handed_over_at: string | null
          handed_over_by: string | null
          handover_sms_sent_at: string | null
          id: string
          internal_unit_category_id: string | null
          late_return_fee: number | null
          late_return_fee_override: number | null
          late_return_override_at: string | null
          late_return_override_by: string | null
          late_return_override_reason: string | null
          location_id: string
          notes: string | null
          original_vehicle_id: string | null
          pickup_address: string | null
          pickup_contact_name: string | null
          pickup_contact_phone: string | null
          pickup_lat: number | null
          pickup_lng: number | null
          pickup_place_id: string | null
          pricing_locked_at: string | null
          pricing_locked_by: string | null
          pricing_snapshot: Json | null
          protection_plan: string | null
          return_evidence_completed_at: string | null
          return_evidence_completed_by: string | null
          return_exception_reason: string | null
          return_intake_completed_at: string | null
          return_intake_completed_by: string | null
          return_is_exception: boolean | null
          return_issues_reviewed_at: string | null
          return_issues_reviewed_by: string | null
          return_location_id: string | null
          return_started_at: string | null
          return_state: string | null
          save_time_at_counter: boolean | null
          special_instructions: string | null
          start_at: string
          status: Database["public"]["Enums"]["booking_status"]
          stripe_deposit_charge_id: string | null
          stripe_deposit_client_secret: string | null
          stripe_deposit_pi_id: string | null
          stripe_deposit_pm_id: string | null
          stripe_deposit_refund_id: string | null
          subtotal: number
          tax_amount: number | null
          total_amount: number
          total_days: number
          updated_at: string
          upgrade_category_label: string | null
          upgrade_daily_fee: number | null
          upgrade_reason: string | null
          upgrade_visible_to_customer: boolean | null
          upgraded_at: string | null
          upgraded_by: string | null
          user_id: string
          vehicle_id: string
          young_driver_fee: number | null
        }
        Insert: {
          account_closed_at?: string | null
          account_closed_by?: string | null
          activated_at?: string | null
          activated_by?: string | null
          activation_reason?: string | null
          activation_source?: string | null
          actual_return_at?: string | null
          assigned_driver_id?: string | null
          assigned_unit_id?: string | null
          booking_code: string
          booking_source?: string | null
          card_holder_name?: string | null
          card_last_four?: string | null
          card_type?: string | null
          created_at?: string
          customer_marked_returned_at?: string | null
          customer_return_address?: string | null
          customer_return_lat?: number | null
          customer_return_lng?: number | null
          daily_rate: number
          delivery_fee?: number | null
          deposit_amount?: number | null
          deposit_authorized_at?: string | null
          deposit_capture_reason?: string | null
          deposit_captured_amount?: number | null
          deposit_captured_at?: string | null
          deposit_expires_at?: string | null
          deposit_released_at?: string | null
          deposit_status?: string | null
          different_dropoff_fee?: number | null
          driver_age_band?: string | null
          end_at: string
          final_invoice_generated?: boolean | null
          final_invoice_id?: string | null
          handed_over_at?: string | null
          handed_over_by?: string | null
          handover_sms_sent_at?: string | null
          id?: string
          internal_unit_category_id?: string | null
          late_return_fee?: number | null
          late_return_fee_override?: number | null
          late_return_override_at?: string | null
          late_return_override_by?: string | null
          late_return_override_reason?: string | null
          location_id: string
          notes?: string | null
          original_vehicle_id?: string | null
          pickup_address?: string | null
          pickup_contact_name?: string | null
          pickup_contact_phone?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_place_id?: string | null
          pricing_locked_at?: string | null
          pricing_locked_by?: string | null
          pricing_snapshot?: Json | null
          protection_plan?: string | null
          return_evidence_completed_at?: string | null
          return_evidence_completed_by?: string | null
          return_exception_reason?: string | null
          return_intake_completed_at?: string | null
          return_intake_completed_by?: string | null
          return_is_exception?: boolean | null
          return_issues_reviewed_at?: string | null
          return_issues_reviewed_by?: string | null
          return_location_id?: string | null
          return_started_at?: string | null
          return_state?: string | null
          save_time_at_counter?: boolean | null
          special_instructions?: string | null
          start_at: string
          status?: Database["public"]["Enums"]["booking_status"]
          stripe_deposit_charge_id?: string | null
          stripe_deposit_client_secret?: string | null
          stripe_deposit_pi_id?: string | null
          stripe_deposit_pm_id?: string | null
          stripe_deposit_refund_id?: string | null
          subtotal: number
          tax_amount?: number | null
          total_amount: number
          total_days: number
          updated_at?: string
          upgrade_category_label?: string | null
          upgrade_daily_fee?: number | null
          upgrade_reason?: string | null
          upgrade_visible_to_customer?: boolean | null
          upgraded_at?: string | null
          upgraded_by?: string | null
          user_id: string
          vehicle_id: string
          young_driver_fee?: number | null
        }
        Update: {
          account_closed_at?: string | null
          account_closed_by?: string | null
          activated_at?: string | null
          activated_by?: string | null
          activation_reason?: string | null
          activation_source?: string | null
          actual_return_at?: string | null
          assigned_driver_id?: string | null
          assigned_unit_id?: string | null
          booking_code?: string
          booking_source?: string | null
          card_holder_name?: string | null
          card_last_four?: string | null
          card_type?: string | null
          created_at?: string
          customer_marked_returned_at?: string | null
          customer_return_address?: string | null
          customer_return_lat?: number | null
          customer_return_lng?: number | null
          daily_rate?: number
          delivery_fee?: number | null
          deposit_amount?: number | null
          deposit_authorized_at?: string | null
          deposit_capture_reason?: string | null
          deposit_captured_amount?: number | null
          deposit_captured_at?: string | null
          deposit_expires_at?: string | null
          deposit_released_at?: string | null
          deposit_status?: string | null
          different_dropoff_fee?: number | null
          driver_age_band?: string | null
          end_at?: string
          final_invoice_generated?: boolean | null
          final_invoice_id?: string | null
          handed_over_at?: string | null
          handed_over_by?: string | null
          handover_sms_sent_at?: string | null
          id?: string
          internal_unit_category_id?: string | null
          late_return_fee?: number | null
          late_return_fee_override?: number | null
          late_return_override_at?: string | null
          late_return_override_by?: string | null
          late_return_override_reason?: string | null
          location_id?: string
          notes?: string | null
          original_vehicle_id?: string | null
          pickup_address?: string | null
          pickup_contact_name?: string | null
          pickup_contact_phone?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          pickup_place_id?: string | null
          pricing_locked_at?: string | null
          pricing_locked_by?: string | null
          pricing_snapshot?: Json | null
          protection_plan?: string | null
          return_evidence_completed_at?: string | null
          return_evidence_completed_by?: string | null
          return_exception_reason?: string | null
          return_intake_completed_at?: string | null
          return_intake_completed_by?: string | null
          return_is_exception?: boolean | null
          return_issues_reviewed_at?: string | null
          return_issues_reviewed_by?: string | null
          return_location_id?: string | null
          return_started_at?: string | null
          return_state?: string | null
          save_time_at_counter?: boolean | null
          special_instructions?: string | null
          start_at?: string
          status?: Database["public"]["Enums"]["booking_status"]
          stripe_deposit_charge_id?: string | null
          stripe_deposit_client_secret?: string | null
          stripe_deposit_pi_id?: string | null
          stripe_deposit_pm_id?: string | null
          stripe_deposit_refund_id?: string | null
          subtotal?: number
          tax_amount?: number | null
          total_amount?: number
          total_days?: number
          updated_at?: string
          upgrade_category_label?: string | null
          upgrade_daily_fee?: number | null
          upgrade_reason?: string | null
          upgrade_visible_to_customer?: boolean | null
          upgraded_at?: string | null
          upgraded_by?: string | null
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
            foreignKeyName: "bookings_internal_unit_category_id_fkey"
            columns: ["internal_unit_category_id"]
            isOneToOne: false
            referencedRelation: "vehicle_categories"
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
            foreignKeyName: "bookings_return_location_id_fkey"
            columns: ["return_location_id"]
            isOneToOne: false
            referencedRelation: "locations"
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
      competitor_pricing: {
        Row: {
          competitor_name: string
          created_at: string
          daily_rate: number | null
          id: string
          last_updated: string | null
          monthly_rate: number | null
          notes: string | null
          updated_at: string
          updated_by: string | null
          vehicle_id: string
          weekly_rate: number | null
        }
        Insert: {
          competitor_name: string
          created_at?: string
          daily_rate?: number | null
          id?: string
          last_updated?: string | null
          monthly_rate?: number | null
          notes?: string | null
          updated_at?: string
          updated_by?: string | null
          vehicle_id: string
          weekly_rate?: number | null
        }
        Update: {
          competitor_name?: string
          created_at?: string
          daily_rate?: number | null
          id?: string
          last_updated?: string | null
          monthly_rate?: number | null
          notes?: string | null
          updated_at?: string
          updated_by?: string | null
          vehicle_id?: string
          weekly_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "competitor_pricing_vehicle_id_fkey"
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
      delivery_status_log: {
        Row: {
          booking_id: string
          created_at: string
          created_by: string | null
          id: string
          location_lat: number | null
          location_lng: number | null
          notes: string | null
          odometer_reading: number | null
          photo_urls: Json | null
          status: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          notes?: string | null
          odometer_reading?: number | null
          photo_urls?: Json | null
          status: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          notes?: string | null
          odometer_reading?: number | null
          photo_urls?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_status_log_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_statuses: {
        Row: {
          booking_id: string
          created_at: string
          id: string
          location_lat: number | null
          location_lng: number | null
          notes: string | null
          photo_urls: Json | null
          status: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          booking_id: string
          created_at?: string
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          notes?: string | null
          photo_urls?: Json | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          booking_id?: string
          created_at?: string
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          notes?: string | null
          photo_urls?: Json | null
          status?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_statuses_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_tasks: {
        Row: {
          activated_at: string | null
          activated_by: string | null
          activation_reason: string | null
          activation_source: string | null
          assigned_driver_id: string | null
          booking_id: string
          created_at: string
          dispatch_window_end: string | null
          dispatch_window_start: string | null
          dispatched_at: string | null
          dispatched_by: string | null
          driver_arrived_at: string | null
          driver_en_route_at: string | null
          driver_picked_up_at: string | null
          fuel_level_recorded: boolean | null
          handover_completed_at: string | null
          handover_completed_by: string | null
          handover_photos_count: number | null
          id: string
          id_check_required: boolean | null
          id_check_result: string | null
          intake_completed_at: string | null
          intake_completed_by: string | null
          odometer_recorded: boolean | null
          payment_verified_at: string | null
          payment_verified_by: string | null
          ready_line_completed_at: string | null
          ready_line_completed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          activated_by?: string | null
          activation_reason?: string | null
          activation_source?: string | null
          assigned_driver_id?: string | null
          booking_id: string
          created_at?: string
          dispatch_window_end?: string | null
          dispatch_window_start?: string | null
          dispatched_at?: string | null
          dispatched_by?: string | null
          driver_arrived_at?: string | null
          driver_en_route_at?: string | null
          driver_picked_up_at?: string | null
          fuel_level_recorded?: boolean | null
          handover_completed_at?: string | null
          handover_completed_by?: string | null
          handover_photos_count?: number | null
          id?: string
          id_check_required?: boolean | null
          id_check_result?: string | null
          intake_completed_at?: string | null
          intake_completed_by?: string | null
          odometer_recorded?: boolean | null
          payment_verified_at?: string | null
          payment_verified_by?: string | null
          ready_line_completed_at?: string | null
          ready_line_completed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          activated_by?: string | null
          activation_reason?: string | null
          activation_source?: string | null
          assigned_driver_id?: string | null
          booking_id?: string
          created_at?: string
          dispatch_window_end?: string | null
          dispatch_window_start?: string | null
          dispatched_at?: string | null
          dispatched_by?: string | null
          driver_arrived_at?: string | null
          driver_en_route_at?: string | null
          driver_picked_up_at?: string | null
          fuel_level_recorded?: boolean | null
          handover_completed_at?: string | null
          handover_completed_by?: string | null
          handover_photos_count?: number | null
          id?: string
          id_check_required?: boolean | null
          id_check_result?: string | null
          intake_completed_at?: string | null
          intake_completed_by?: string | null
          odometer_recorded?: boolean | null
          payment_verified_at?: string | null
          payment_verified_by?: string | null
          ready_line_completed_at?: string | null
          ready_line_completed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_tasks_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      deposit_jobs: {
        Row: {
          amount: number
          attempts: number
          booking_id: string
          created_at: string
          id: string
          job_type: string
          last_error: string | null
          max_attempts: number
          processed_at: string | null
          reason: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          attempts?: number
          booking_id: string
          created_at?: string
          id?: string
          job_type: string
          last_error?: string | null
          max_attempts?: number
          processed_at?: string | null
          reason?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          attempts?: number
          booking_id?: string
          created_at?: string
          id?: string
          job_type?: string
          last_error?: string | null
          max_attempts?: number
          processed_at?: string | null
          reason?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deposit_jobs_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      deposit_ledger: {
        Row: {
          action: string
          amount: number
          booking_id: string
          category: string | null
          created_at: string
          created_by: string
          id: string
          payment_id: string | null
          reason: string | null
          stripe_balance_txn_id: string | null
          stripe_charge_id: string | null
          stripe_pi_id: string | null
          stripe_refund_id: string | null
        }
        Insert: {
          action: string
          amount: number
          booking_id: string
          category?: string | null
          created_at?: string
          created_by: string
          id?: string
          payment_id?: string | null
          reason?: string | null
          stripe_balance_txn_id?: string | null
          stripe_charge_id?: string | null
          stripe_pi_id?: string | null
          stripe_refund_id?: string | null
        }
        Update: {
          action?: string
          amount?: number
          booking_id?: string
          category?: string | null
          created_at?: string
          created_by?: string
          id?: string
          payment_id?: string | null
          reason?: string | null
          stripe_balance_txn_id?: string | null
          stripe_charge_id?: string | null
          stripe_pi_id?: string | null
          stripe_refund_id?: string | null
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
      final_invoices: {
        Row: {
          addons_total: number | null
          amount_due: number | null
          amount_refunded: number | null
          booking_id: string
          created_at: string | null
          created_by: string | null
          damage_charges: number | null
          deposit_captured: number | null
          deposit_held: number | null
          deposit_released: number | null
          fees_total: number | null
          grand_total: number
          id: string
          invoice_number: string
          issued_at: string | null
          late_fees: number | null
          line_items_json: Json
          notes: string | null
          payments_received: number | null
          rental_subtotal: number
          status: string | null
          stripe_charge_ids: Json | null
          stripe_payment_ids: Json | null
          stripe_refund_ids: Json | null
          taxes_total: number
          updated_at: string | null
        }
        Insert: {
          addons_total?: number | null
          amount_due?: number | null
          amount_refunded?: number | null
          booking_id: string
          created_at?: string | null
          created_by?: string | null
          damage_charges?: number | null
          deposit_captured?: number | null
          deposit_held?: number | null
          deposit_released?: number | null
          fees_total?: number | null
          grand_total?: number
          id?: string
          invoice_number: string
          issued_at?: string | null
          late_fees?: number | null
          line_items_json?: Json
          notes?: string | null
          payments_received?: number | null
          rental_subtotal?: number
          status?: string | null
          stripe_charge_ids?: Json | null
          stripe_payment_ids?: Json | null
          stripe_refund_ids?: Json | null
          taxes_total?: number
          updated_at?: string | null
        }
        Update: {
          addons_total?: number | null
          amount_due?: number | null
          amount_refunded?: number | null
          booking_id?: string
          created_at?: string | null
          created_by?: string | null
          damage_charges?: number | null
          deposit_captured?: number | null
          deposit_held?: number | null
          deposit_released?: number | null
          fees_total?: number | null
          grand_total?: number
          id?: string
          invoice_number?: string
          issued_at?: string | null
          late_fees?: number | null
          line_items_json?: Json
          notes?: string | null
          payments_received?: number | null
          rental_subtotal?: number
          status?: string | null
          stripe_charge_ids?: Json | null
          stripe_payment_ids?: Json | null
          stripe_refund_ids?: Json | null
          taxes_total?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "final_invoices_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_cost_cache: {
        Row: {
          cache_type: string
          calculation_period_end: string | null
          calculation_period_start: string | null
          category_id: string | null
          created_at: string
          id: string
          last_calculated_at: string
          net_profit: number | null
          rental_count: number | null
          total_damage_cost: number | null
          total_maintenance_cost: number | null
          total_miles_driven: number | null
          total_rental_days: number | null
          total_rental_revenue: number | null
          updated_at: string
          vehicle_unit_id: string | null
        }
        Insert: {
          cache_type: string
          calculation_period_end?: string | null
          calculation_period_start?: string | null
          category_id?: string | null
          created_at?: string
          id?: string
          last_calculated_at?: string
          net_profit?: number | null
          rental_count?: number | null
          total_damage_cost?: number | null
          total_maintenance_cost?: number | null
          total_miles_driven?: number | null
          total_rental_days?: number | null
          total_rental_revenue?: number | null
          updated_at?: string
          vehicle_unit_id?: string | null
        }
        Update: {
          cache_type?: string
          calculation_period_end?: string | null
          calculation_period_start?: string | null
          category_id?: string | null
          created_at?: string
          id?: string
          last_calculated_at?: string
          net_profit?: number | null
          rental_count?: number | null
          total_damage_cost?: number | null
          total_maintenance_cost?: number | null
          total_miles_driven?: number | null
          total_rental_days?: number | null
          total_rental_revenue?: number | null
          updated_at?: string
          vehicle_unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fleet_cost_cache_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "vehicle_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_cost_cache_vehicle_unit_id_fkey"
            columns: ["vehicle_unit_id"]
            isOneToOne: false
            referencedRelation: "vehicle_units"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_cases: {
        Row: {
          airbags_deployed: boolean | null
          approved_amount: number | null
          assigned_staff_id: string | null
          booking_id: string | null
          claim_number: string | null
          claim_required: boolean | null
          closed_at: string | null
          closed_by: string | null
          created_at: string
          created_by: string
          customer_id: string | null
          deductible_amount: number | null
          description: string
          estimate_amount: number | null
          evidence_complete: boolean | null
          evidence_completed_at: string | null
          evidence_completed_by: string | null
          final_invoice_amount: number | null
          id: string
          incident_date: string
          incident_type: string
          internal_notes: string | null
          is_drivable: boolean | null
          location: string | null
          repair_completed_at: string | null
          repair_started_at: string | null
          repair_vendor: string | null
          repair_vendor_contact: string | null
          severity: string
          status: string
          third_party_involved: boolean | null
          towing_required: boolean | null
          updated_at: string
          vehicle_id: string
          vehicle_unit_id: string | null
        }
        Insert: {
          airbags_deployed?: boolean | null
          approved_amount?: number | null
          assigned_staff_id?: string | null
          booking_id?: string | null
          claim_number?: string | null
          claim_required?: boolean | null
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          created_by: string
          customer_id?: string | null
          deductible_amount?: number | null
          description: string
          estimate_amount?: number | null
          evidence_complete?: boolean | null
          evidence_completed_at?: string | null
          evidence_completed_by?: string | null
          final_invoice_amount?: number | null
          id?: string
          incident_date?: string
          incident_type: string
          internal_notes?: string | null
          is_drivable?: boolean | null
          location?: string | null
          repair_completed_at?: string | null
          repair_started_at?: string | null
          repair_vendor?: string | null
          repair_vendor_contact?: string | null
          severity?: string
          status?: string
          third_party_involved?: boolean | null
          towing_required?: boolean | null
          updated_at?: string
          vehicle_id: string
          vehicle_unit_id?: string | null
        }
        Update: {
          airbags_deployed?: boolean | null
          approved_amount?: number | null
          assigned_staff_id?: string | null
          booking_id?: string | null
          claim_number?: string | null
          claim_required?: boolean | null
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          created_by?: string
          customer_id?: string | null
          deductible_amount?: number | null
          description?: string
          estimate_amount?: number | null
          evidence_complete?: boolean | null
          evidence_completed_at?: string | null
          evidence_completed_by?: string | null
          final_invoice_amount?: number | null
          id?: string
          incident_date?: string
          incident_type?: string
          internal_notes?: string | null
          is_drivable?: boolean | null
          location?: string | null
          repair_completed_at?: string | null
          repair_started_at?: string | null
          repair_vendor?: string | null
          repair_vendor_contact?: string | null
          severity?: string
          status?: string
          third_party_involved?: boolean | null
          towing_required?: boolean | null
          updated_at?: string
          vehicle_id?: string
          vehicle_unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_cases_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_cases_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicle_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_cases_vehicle_unit_id_fkey"
            columns: ["vehicle_unit_id"]
            isOneToOne: false
            referencedRelation: "vehicle_units"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_photos: {
        Row: {
          captured_at: string
          category: string
          created_at: string
          description: string | null
          id: string
          incident_id: string
          photo_url: string
          uploaded_by: string
        }
        Insert: {
          captured_at?: string
          category: string
          created_at?: string
          description?: string | null
          id?: string
          incident_id: string
          photo_url: string
          uploaded_by: string
        }
        Update: {
          captured_at?: string
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          incident_id?: string
          photo_url?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "incident_photos_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incident_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_repairs: {
        Row: {
          actual_cost: number | null
          created_at: string
          created_by: string
          description: string | null
          estimated_cost: number | null
          id: string
          incident_id: string
          receipt_url: string | null
          repair_type: string
          status: string | null
          updated_at: string
          vendor: string | null
        }
        Insert: {
          actual_cost?: number | null
          created_at?: string
          created_by: string
          description?: string | null
          estimated_cost?: number | null
          id?: string
          incident_id: string
          receipt_url?: string | null
          repair_type: string
          status?: string | null
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          actual_cost?: number | null
          created_at?: string
          created_by?: string
          description?: string | null
          estimated_cost?: number | null
          id?: string
          incident_id?: string
          receipt_url?: string | null
          repair_type?: string
          status?: string | null
          updated_at?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_repairs_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incident_cases"
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
      maintenance_logs: {
        Row: {
          cost: number
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          invoice_number: string | null
          maintenance_type: string
          mileage_at_service: number | null
          notes: string | null
          receipt_url: string | null
          service_date: string
          updated_at: string
          vehicle_unit_id: string
          vendor_name: string | null
        }
        Insert: {
          cost?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          invoice_number?: string | null
          maintenance_type: string
          mileage_at_service?: number | null
          notes?: string | null
          receipt_url?: string | null
          service_date?: string
          updated_at?: string
          vehicle_unit_id: string
          vendor_name?: string | null
        }
        Update: {
          cost?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          invoice_number?: string | null
          maintenance_type?: string
          mileage_at_service?: number | null
          notes?: string | null
          receipt_url?: string | null
          service_date?: string
          updated_at?: string
          vehicle_unit_id?: string
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_logs_vehicle_unit_id_fkey"
            columns: ["vehicle_unit_id"]
            isOneToOne: false
            referencedRelation: "vehicle_units"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_tiers: {
        Row: {
          benefits: Json | null
          color: string | null
          created_at: string | null
          display_name: string
          icon: string | null
          id: string
          is_active: boolean | null
          min_points: number
          name: string
          sort_order: number
          updated_at: string | null
        }
        Insert: {
          benefits?: Json | null
          color?: string | null
          created_at?: string | null
          display_name: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          min_points?: number
          name: string
          sort_order: number
          updated_at?: string | null
        }
        Update: {
          benefits?: Json | null
          color?: string | null
          created_at?: string | null
          display_name?: string
          icon?: string | null
          id?: string
          is_active?: boolean | null
          min_points?: number
          name?: string
          sort_order?: number
          updated_at?: string | null
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
      offer_redemptions: {
        Row: {
          booking_id: string | null
          discount_value: number
          id: string
          offer_id: string
          points_spent: number
          redeemed_at: string
          user_id: string
        }
        Insert: {
          booking_id?: string | null
          discount_value: number
          id?: string
          offer_id: string
          points_spent: number
          redeemed_at?: string
          user_id: string
        }
        Update: {
          booking_id?: string | null
          discount_value?: number
          id?: string
          offer_id?: string
          points_spent?: number
          redeemed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_redemptions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_redemptions_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "points_offers"
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
          location_id: string | null
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
          location_id?: string | null
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
          location_id?: string | null
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
      points_ledger: {
        Row: {
          balance_after: number
          booking_id: string | null
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          money_value: number | null
          notes: string | null
          points: number
          transaction_type: Database["public"]["Enums"]["points_transaction_type"]
          user_id: string
        }
        Insert: {
          balance_after: number
          booking_id?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          money_value?: number | null
          notes?: string | null
          points: number
          transaction_type: Database["public"]["Enums"]["points_transaction_type"]
          user_id: string
        }
        Update: {
          balance_after?: number
          booking_id?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          money_value?: number | null
          notes?: string | null
          points?: number
          transaction_type?: Database["public"]["Enums"]["points_transaction_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "points_ledger_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      points_offers: {
        Row: {
          created_at: string
          created_by: string | null
          current_uses: number | null
          description: string | null
          eligible_categories: string[] | null
          eligible_locations: string[] | null
          id: string
          is_active: boolean
          max_uses_per_user: number | null
          max_uses_total: number | null
          min_rental_days: number | null
          name: string
          offer_type: Database["public"]["Enums"]["offer_type"]
          offer_value: number
          points_required: number
          updated_at: string
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_uses?: number | null
          description?: string | null
          eligible_categories?: string[] | null
          eligible_locations?: string[] | null
          id?: string
          is_active?: boolean
          max_uses_per_user?: number | null
          max_uses_total?: number | null
          min_rental_days?: number | null
          name: string
          offer_type: Database["public"]["Enums"]["offer_type"]
          offer_value: number
          points_required: number
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_uses?: number | null
          description?: string | null
          eligible_categories?: string[] | null
          eligible_locations?: string[] | null
          id?: string
          is_active?: boolean
          max_uses_per_user?: number | null
          max_uses_total?: number | null
          min_rental_days?: number | null
          name?: string
          offer_type?: Database["public"]["Enums"]["offer_type"]
          offer_value?: number
          points_required?: number
          updated_at?: string
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      points_settings: {
        Row: {
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          created_at: string
          driver_license_back_url: string | null
          driver_license_expiry: string | null
          driver_license_front_url: string | null
          driver_license_number: string | null
          driver_license_reviewed_at: string | null
          driver_license_reviewed_by: string | null
          driver_license_status: string | null
          driver_license_uploaded_at: string | null
          email: string | null
          full_name: string | null
          id: string
          is_verified: boolean | null
          member_id: string | null
          membership_joined_at: string | null
          membership_status:
            | Database["public"]["Enums"]["membership_status"]
            | null
          membership_tier: Database["public"]["Enums"]["membership_tier"] | null
          phone: string | null
          points_balance: number
          role: Database["public"]["Enums"]["staff_role"] | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          driver_license_back_url?: string | null
          driver_license_expiry?: string | null
          driver_license_front_url?: string | null
          driver_license_number?: string | null
          driver_license_reviewed_at?: string | null
          driver_license_reviewed_by?: string | null
          driver_license_status?: string | null
          driver_license_uploaded_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_verified?: boolean | null
          member_id?: string | null
          membership_joined_at?: string | null
          membership_status?:
            | Database["public"]["Enums"]["membership_status"]
            | null
          membership_tier?:
            | Database["public"]["Enums"]["membership_tier"]
            | null
          phone?: string | null
          points_balance?: number
          role?: Database["public"]["Enums"]["staff_role"] | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          driver_license_back_url?: string | null
          driver_license_expiry?: string | null
          driver_license_front_url?: string | null
          driver_license_number?: string | null
          driver_license_reviewed_at?: string | null
          driver_license_reviewed_by?: string | null
          driver_license_status?: string | null
          driver_license_uploaded_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_verified?: boolean | null
          member_id?: string | null
          membership_joined_at?: string | null
          membership_status?:
            | Database["public"]["Enums"]["membership_status"]
            | null
          membership_tier?:
            | Database["public"]["Enums"]["membership_tier"]
            | null
          phone?: string | null
          points_balance?: number
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
          signature_device_info: Json | null
          signature_method: string | null
          signature_png_url: string | null
          signature_vector_json: Json | null
          signature_workstation_id: string | null
          signed_manually: boolean | null
          signed_manually_at: string | null
          signed_manually_by: string | null
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
          signature_device_info?: Json | null
          signature_method?: string | null
          signature_png_url?: string | null
          signature_vector_json?: Json | null
          signature_workstation_id?: string | null
          signed_manually?: boolean | null
          signed_manually_at?: string | null
          signed_manually_by?: string | null
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
          signature_device_info?: Json | null
          signature_method?: string | null
          signature_png_url?: string | null
          signature_vector_json?: Json | null
          signature_workstation_id?: string | null
          signed_manually?: boolean | null
          signed_manually_at?: string | null
          signed_manually_by?: string | null
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
      stripe_webhook_events: {
        Row: {
          booking_id: string | null
          event_id: string
          event_type: string
          id: string
          payload_hash: string | null
          processed_at: string
          result: Json | null
        }
        Insert: {
          booking_id?: string | null
          event_id: string
          event_type: string
          id?: string
          payload_hash?: string | null
          processed_at?: string
          result?: Json | null
        }
        Update: {
          booking_id?: string | null
          event_id?: string
          event_type?: string
          id?: string
          payload_hash?: string | null
          processed_at?: string
          result?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "stripe_webhook_events_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      support_macros: {
        Row: {
          category: string
          content: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
          usage_count: number | null
          variables: Json | null
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
          usage_count?: number | null
          variables?: Json | null
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
          usage_count?: number | null
          variables?: Json | null
        }
        Relationships: []
      }
      support_tickets_v2: {
        Row: {
          assigned_to: string | null
          booking_id: string | null
          category: string
          closed_at: string | null
          closed_by: string | null
          created_at: string
          created_by: string
          created_by_type: string
          customer_id: string | null
          damage_id: string | null
          description: string
          escalated_at: string | null
          escalated_by: string | null
          escalation_note: string | null
          first_response_at: string | null
          guest_email: string | null
          guest_name: string | null
          guest_phone: string | null
          id: string
          incident_id: string | null
          is_urgent: boolean
          priority: string
          resolution_note: string | null
          status: string
          subject: string
          ticket_id: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          booking_id?: string | null
          category?: string
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          created_by: string
          created_by_type?: string
          customer_id?: string | null
          damage_id?: string | null
          description: string
          escalated_at?: string | null
          escalated_by?: string | null
          escalation_note?: string | null
          first_response_at?: string | null
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          incident_id?: string | null
          is_urgent?: boolean
          priority?: string
          resolution_note?: string | null
          status?: string
          subject: string
          ticket_id: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          booking_id?: string | null
          category?: string
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          created_by?: string
          created_by_type?: string
          customer_id?: string | null
          damage_id?: string | null
          description?: string
          escalated_at?: string | null
          escalated_by?: string | null
          escalation_note?: string | null
          first_response_at?: string | null
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          incident_id?: string | null
          is_urgent?: boolean
          priority?: string
          resolution_note?: string | null
          status?: string
          subject?: string
          ticket_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_v2_damage_id_fkey"
            columns: ["damage_id"]
            isOneToOne: false
            referencedRelation: "damage_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
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
      ticket_audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          new_value: Json | null
          note: string | null
          old_value: Json | null
          performed_by: string
          ticket_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_value?: Json | null
          note?: string | null
          old_value?: Json | null
          performed_by: string
          ticket_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_value?: Json | null
          note?: string | null
          old_value?: Json | null
          performed_by?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_audit_log_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets_v2"
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
      ticket_messages_v2: {
        Row: {
          created_at: string
          id: string
          macro_id: string | null
          message: string
          message_type: string
          sender_id: string
          sender_type: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          macro_id?: string | null
          message: string
          message_type?: string
          sender_id: string
          sender_type?: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          id?: string
          macro_id?: string | null
          message?: string
          message_type?: string
          sender_id?: string
          sender_type?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_v2_macro_id_fkey"
            columns: ["macro_id"]
            isOneToOne: false
            referencedRelation: "support_macros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ticket_messages_v2_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets_v2"
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
          escalated_at: string | null
          escalated_from: string | null
          escalation_count: number | null
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
          escalated_at?: string | null
          escalated_from?: string | null
          escalation_count?: number | null
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
          escalated_at?: string | null
          escalated_from?: string | null
          escalation_count?: number | null
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
      vehicle_categories: {
        Row: {
          created_at: string
          created_by: string | null
          daily_rate: number
          description: string | null
          fuel_type: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          seats: number | null
          sort_order: number | null
          transmission: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          daily_rate?: number
          description?: string | null
          fuel_type?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          seats?: number | null
          sort_order?: number | null
          transmission?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          daily_rate?: number
          description?: string | null
          fuel_type?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          seats?: number | null
          sort_order?: number | null
          transmission?: string | null
          updated_at?: string
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
          actual_disposal_date: string | null
          annual_depreciation_amount: number | null
          category_id: string | null
          color: string | null
          created_at: string
          current_mileage: number | null
          depreciation_method: string | null
          disposal_value: number | null
          expected_disposal_date: string | null
          id: string
          license_plate: string | null
          location_id: string | null
          mileage_at_acquisition: number | null
          notes: string | null
          status: string
          tank_capacity_liters: number | null
          updated_at: string
          vehicle_id: string
          vendor_contact: string | null
          vendor_name: string | null
          vendor_notes: string | null
          vin: string
        }
        Insert: {
          acquisition_cost?: number
          acquisition_date?: string | null
          actual_disposal_date?: string | null
          annual_depreciation_amount?: number | null
          category_id?: string | null
          color?: string | null
          created_at?: string
          current_mileage?: number | null
          depreciation_method?: string | null
          disposal_value?: number | null
          expected_disposal_date?: string | null
          id?: string
          license_plate?: string | null
          location_id?: string | null
          mileage_at_acquisition?: number | null
          notes?: string | null
          status?: string
          tank_capacity_liters?: number | null
          updated_at?: string
          vehicle_id: string
          vendor_contact?: string | null
          vendor_name?: string | null
          vendor_notes?: string | null
          vin: string
        }
        Update: {
          acquisition_cost?: number
          acquisition_date?: string | null
          actual_disposal_date?: string | null
          annual_depreciation_amount?: number | null
          category_id?: string | null
          color?: string | null
          created_at?: string
          current_mileage?: number | null
          depreciation_method?: string | null
          disposal_value?: number | null
          expected_disposal_date?: string | null
          id?: string
          license_plate?: string | null
          location_id?: string | null
          mileage_at_acquisition?: number | null
          notes?: string | null
          status?: string
          tank_capacity_liters?: number | null
          updated_at?: string
          vehicle_id?: string
          vendor_contact?: string | null
          vendor_name?: string | null
          vendor_notes?: string | null
          vin?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_units_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "vehicle_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_units_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
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
      vendors: {
        Row: {
          address: string | null
          city: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          rating: number | null
          updated_at: string
          vendor_type: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          rating?: number | null
          updated_at?: string
          vendor_type?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          rating?: number | null
          updated_at?: string
          vendor_type?: string
        }
        Relationships: []
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
      assign_vin_to_booking: {
        Args: {
          p_booking_id: string
          p_category_id: string
          p_location_id: string
        }
        Returns: string
      }
      check_ticket_escalation: { Args: never; Returns: undefined }
      generate_booking_code: { Args: never; Returns: string }
      get_available_categories: {
        Args: { p_location_id: string }
        Returns: {
          available_count: number
          daily_rate: number
          description: string
          fuel_type: string
          id: string
          image_url: string
          name: string
          seats: number
          transmission: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_staff: { Args: { _user_id: string }; Returns: boolean }
      is_support_or_admin: { Args: { _user_id: string }; Returns: boolean }
      release_vin_from_booking: {
        Args: { p_booking_id: string; p_new_status?: string }
        Returns: undefined
      }
      update_points_balance: {
        Args: {
          p_booking_id?: string
          p_created_by?: string
          p_expires_at?: string
          p_money_value?: number
          p_notes?: string
          p_points: number
          p_transaction_type?: Database["public"]["Enums"]["points_transaction_type"]
          p_user_id: string
        }
        Returns: {
          ledger_id: string
          new_balance: number
        }[]
      }
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
      app_role: "admin" | "staff" | "cleaner" | "finance" | "support" | "driver"
      booking_status:
        | "draft"
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
      membership_status: "active" | "suspended" | "inactive"
      membership_tier: "bronze" | "silver" | "gold" | "platinum"
      offer_type: "percent_off" | "dollar_off" | "free_addon" | "free_upgrade"
      points_transaction_type:
        | "earn"
        | "redeem"
        | "adjust"
        | "expire"
        | "reverse"
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
      app_role: ["admin", "staff", "cleaner", "finance", "support", "driver"],
      booking_status: [
        "draft",
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
      membership_status: ["active", "suspended", "inactive"],
      membership_tier: ["bronze", "silver", "gold", "platinum"],
      offer_type: ["percent_off", "dollar_off", "free_addon", "free_upgrade"],
      points_transaction_type: [
        "earn",
        "redeem",
        "adjust",
        "expire",
        "reverse",
      ],
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
