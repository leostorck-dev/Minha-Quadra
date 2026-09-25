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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          actor_id: string
          actor_name: string
          created_at: string
          details: Json
          entity_id: string
          entity_type: string
          event: string
          id: string
          tenant_id: string
        }
        Insert: {
          actor_id: string
          actor_name: string
          created_at?: string
          details?: Json
          entity_id: string
          entity_type: string
          event: string
          id?: string
          tenant_id: string
        }
        Update: {
          actor_id?: string
          actor_name?: string
          created_at?: string
          details?: Json
          entity_id?: string
          entity_type?: string
          event?: string
          id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      class_sessions: {
        Row: {
          coach_id: string
          commission_type: string
          commission_value: number
          completed_at: string | null
          court_id: string
          created_at: string
          created_by: string
          id: string
          kind: string
          price: number
          reservation_id: string
          status: string
          tenant_id: string
        }
        Insert: {
          coach_id: string
          commission_type: string
          commission_value: number
          completed_at?: string | null
          court_id: string
          created_at?: string
          created_by: string
          id?: string
          kind: string
          price: number
          reservation_id: string
          status?: string
          tenant_id: string
        }
        Update: {
          coach_id?: string
          commission_type?: string
          commission_value?: number
          completed_at?: string | null
          court_id?: string
          created_at?: string
          created_by?: string
          id?: string
          kind?: string
          price?: number
          reservation_id?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_sessions_coach_fk"
            columns: ["tenant_id", "coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "class_sessions_court_fk"
            columns: ["tenant_id", "court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "class_sessions_reservation_fk"
            columns: ["tenant_id", "reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "class_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      class_students: {
        Row: {
          attendance: string
          class_id: string
          customer_id: string
          tenant_id: string
        }
        Insert: {
          attendance?: string
          class_id: string
          customer_id: string
          tenant_id: string
        }
        Update: {
          attendance?: string
          class_id?: string
          customer_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_students_class_fk"
            columns: ["tenant_id", "class_id"]
            isOneToOne: false
            referencedRelation: "class_sessions"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "class_students_customer_fk"
            columns: ["tenant_id", "customer_id"]
            isOneToOne: false
            referencedRelation: "customer_crm"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "class_students_customer_fk"
            columns: ["tenant_id", "customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "class_students_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      coaches: {
        Row: {
          commission_type: string
          commission_value: number
          created_at: string
          created_by: string
          email: string | null
          id: string
          name: string
          phone: string | null
          profile_id: string | null
          specialties: string[]
          status: string
          tenant_id: string
        }
        Insert: {
          commission_type: string
          commission_value: number
          created_at?: string
          created_by: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          profile_id?: string | null
          specialties?: string[]
          status?: string
          tenant_id: string
        }
        Update: {
          commission_type?: string
          commission_value?: number
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          profile_id?: string | null
          specialties?: string[]
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaches_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      courts: {
        Row: {
          closing_time: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          opening_time: string
          price_per_hour: number
          sport: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          closing_time: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          opening_time: string
          price_per_hour: number
          sport: string
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          closing_time?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          opening_time?: string
          price_per_hour?: number
          sport?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_memberships: {
        Row: {
          billing_day: number
          cancelled_at: string | null
          classes_per_month: number | null
          created_at: string
          created_by: string
          customer_id: string
          id: string
          monthly_price: number
          next_due_on: string
          plan_id: string
          start_on: string
          status: string
          tenant_id: string
        }
        Insert: {
          billing_day: number
          cancelled_at?: string | null
          classes_per_month?: number | null
          created_at?: string
          created_by: string
          customer_id: string
          id?: string
          monthly_price: number
          next_due_on: string
          plan_id: string
          start_on: string
          status?: string
          tenant_id: string
        }
        Update: {
          billing_day?: number
          cancelled_at?: string | null
          classes_per_month?: number | null
          created_at?: string
          created_by?: string
          customer_id?: string
          id?: string
          monthly_price?: number
          next_due_on?: string
          plan_id?: string
          start_on?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_memberships_customer_fk"
            columns: ["tenant_id", "customer_id"]
            isOneToOne: false
            referencedRelation: "customer_crm"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "customer_memberships_customer_fk"
            columns: ["tenant_id", "customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "customer_memberships_plan_fk"
            columns: ["tenant_id", "plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "customer_memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          birth_date: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          status: string
          tags: string[]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          birth_date?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          status?: string
          tags?: string[]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          birth_date?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          status?: string
          tags?: string[]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          activity_on: string
          amount: number
          category: string
          created_at: string
          created_by: string
          description: string
          due_date: string | null
          id: string
          paid_at: string | null
          source_id: string | null
          source_type: string
          status: string
          tenant_id: string
          type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          activity_on?: string
          amount: number
          category: string
          created_at?: string
          created_by?: string
          description: string
          due_date?: string | null
          id?: string
          paid_at?: string | null
          source_id?: string | null
          source_type?: string
          status?: string
          tenant_id: string
          type: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          activity_on?: string
          amount?: number
          category?: string
          created_at?: string
          created_by?: string
          description?: string
          due_date?: string | null
          id?: string
          paid_at?: string | null
          source_id?: string | null
          source_type?: string
          status?: string
          tenant_id?: string
          type?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_payments: {
        Row: {
          amount: number
          id: string
          membership_id: string
          method: string
          paid_at: string
          paid_by: string
          period_due_on: string
          tenant_id: string
        }
        Insert: {
          amount: number
          id?: string
          membership_id: string
          method: string
          paid_at?: string
          paid_by: string
          period_due_on: string
          tenant_id: string
        }
        Update: {
          amount?: number
          id?: string
          membership_id?: string
          method?: string
          paid_at?: string
          paid_by?: string
          period_due_on?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_payments_membership_fk"
            columns: ["tenant_id", "membership_id"]
            isOneToOne: false
            referencedRelation: "customer_memberships"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "membership_payments_membership_fk"
            columns: ["tenant_id", "membership_id"]
            isOneToOne: false
            referencedRelation: "membership_class_usage"
            referencedColumns: ["tenant_id", "membership_id"]
          },
          {
            foreignKeyName: "membership_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_plans: {
        Row: {
          active: boolean
          classes_per_month: number | null
          created_at: string
          created_by: string
          id: string
          monthly_price: number
          name: string
          tenant_id: string
        }
        Insert: {
          active?: boolean
          classes_per_month?: number | null
          created_at?: string
          created_by: string
          id?: string
          monthly_price: number
          name: string
          tenant_id: string
        }
        Update: {
          active?: boolean
          classes_per_month?: number | null
          created_at?: string
          created_by?: string
          id?: string
          monthly_price?: number
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_plans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_events: {
        Row: {
          actor_id: string
          created_at: string
          event: string
          id: string
          payment_id: string
          tenant_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          event: string
          id?: string
          payment_id: string
          tenant_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          event?: string
          id?: string
          payment_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_events_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string
          id: string
          method: string
          refunded_at: string | null
          refunded_by: string | null
          reservation_id: string
          status: string
          tenant_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by?: string
          id?: string
          method: string
          refunded_at?: string | null
          refunded_by?: string | null
          reservation_id: string
          status?: string
          tenant_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string
          id?: string
          method?: string
          refunded_at?: string | null
          refunded_by?: string | null
          reservation_id?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_reservation_tenant_fkey"
            columns: ["tenant_id", "reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          role: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          name: string
          role: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          role?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          court_id: string
          created_at: string
          created_by: string
          customer_id: string | null
          end_at: string
          id: string
          kind: string
          notes: string | null
          price: number
          start_at: string
          status: Database["public"]["Enums"]["reservation_status"]
          tenant_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          court_id: string
          created_at?: string
          created_by?: string
          customer_id?: string | null
          end_at: string
          id?: string
          kind: string
          notes?: string | null
          price?: number
          start_at: string
          status?: Database["public"]["Enums"]["reservation_status"]
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          court_id?: string
          created_at?: string
          created_by?: string
          customer_id?: string | null
          end_at?: string
          id?: string
          kind?: string
          notes?: string | null
          price?: number
          start_at?: string
          status?: Database["public"]["Enums"]["reservation_status"]
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_court_tenant_fkey"
            columns: ["tenant_id", "court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "reservations_customer_tenant_fkey"
            columns: ["tenant_id", "customer_id"]
            isOneToOne: false
            referencedRelation: "customer_crm"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "reservations_customer_tenant_fkey"
            columns: ["tenant_id", "customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "reservations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: string
          status: string
          tenant_id: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string
          role: string
          status?: string
          tenant_id: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: string
          status?: string
          tenant_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_invites_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          id: string
          name: string
          owner_user_id: string
          slug: string
          status: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          owner_user_id: string
          slug: string
          status?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          owner_user_id?: string
          slug?: string
          status?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      customer_crm: {
        Row: {
          birth_date: string | null
          birth_month: number | null
          created_at: string | null
          created_by: string | null
          email: string | null
          has_upcoming: boolean | null
          id: string | null
          last_reservation_at: string | null
          name: string | null
          notes: string | null
          phone: string | null
          reservation_count: number | null
          status: string | null
          tags: string[] | null
          tenant_id: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_class_usage: {
        Row: {
          attended_classes: number | null
          classes_per_month: number | null
          cycle_end: string | null
          cycle_start: string | null
          membership_id: string | null
          remaining_classes: number | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      cancel_class: {
        Args: { p_id: string }
        Returns: {
          coach_id: string
          commission_type: string
          commission_value: number
          completed_at: string | null
          court_id: string
          created_at: string
          created_by: string
          id: string
          kind: string
          price: number
          reservation_id: string
          status: string
          tenant_id: string
        }
        SetofOptions: {
          from: "*"
          to: "class_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_customer_membership: {
        Args: { p_id: string }
        Returns: {
          billing_day: number
          cancelled_at: string | null
          classes_per_month: number | null
          created_at: string
          created_by: string
          customer_id: string
          id: string
          monthly_price: number
          next_due_on: string
          plan_id: string
          start_on: string
          status: string
          tenant_id: string
        }
        SetofOptions: {
          from: "*"
          to: "customer_memberships"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_class: {
        Args: {
          p_coach_id: string
          p_court_id: string
          p_customer_ids: string[]
          p_end_at: string
          p_kind: string
          p_price: number
          p_start_at: string
        }
        Returns: {
          coach_id: string
          commission_type: string
          commission_value: number
          completed_at: string | null
          court_id: string
          created_at: string
          created_by: string
          id: string
          kind: string
          price: number
          reservation_id: string
          status: string
          tenant_id: string
        }
        SetofOptions: {
          from: "*"
          to: "class_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_coach: {
        Args: {
          p_commission_type: string
          p_commission_value: number
          p_email: string
          p_name: string
          p_phone: string
          p_profile_id: string
          p_specialties: string[]
        }
        Returns: {
          commission_type: string
          commission_value: number
          created_at: string
          created_by: string
          email: string | null
          id: string
          name: string
          phone: string | null
          profile_id: string | null
          specialties: string[]
          status: string
          tenant_id: string
        }
        SetofOptions: {
          from: "*"
          to: "coaches"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_membership_plan: {
        Args: {
          p_classes_per_month: number
          p_monthly_price: number
          p_name: string
        }
        Returns: {
          active: boolean
          classes_per_month: number | null
          created_at: string
          created_by: string
          id: string
          monthly_price: number
          name: string
          tenant_id: string
        }
        SetofOptions: {
          from: "*"
          to: "membership_plans"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      dashboard_overview: { Args: never; Returns: Json }
      enroll_customer_membership: {
        Args: { p_customer_id: string; p_plan_id: string; p_start_on: string }
        Returns: {
          billing_day: number
          cancelled_at: string | null
          classes_per_month: number | null
          created_at: string
          created_by: string
          customer_id: string
          id: string
          monthly_price: number
          next_due_on: string
          plan_id: string
          start_on: string
          status: string
          tenant_id: string
        }
        SetofOptions: {
          from: "*"
          to: "customer_memberships"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      finance_month_summary: {
        Args: { p_month: string }
        Returns: {
          expense: number
          income: number
          payable: number
          result: number
        }[]
      }
      finish_class: {
        Args: { p_id: string; p_present_customer_ids: string[] }
        Returns: {
          coach_id: string
          commission_type: string
          commission_value: number
          completed_at: string | null
          court_id: string
          created_at: string
          created_by: string
          id: string
          kind: string
          price: number
          reservation_id: string
          status: string
          tenant_id: string
        }
        SetofOptions: {
          from: "*"
          to: "class_sessions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      join_arena: {
        Args: { member_name: string; p_token: string }
        Returns: string
      }
      onboard_arena: {
        Args: { arena_name: string; arena_slug: string; owner_name: string }
        Returns: string
      }
      pay_membership_due: {
        Args: { p_membership_id: string; p_method: string }
        Returns: {
          amount: number
          id: string
          membership_id: string
          method: string
          paid_at: string
          paid_by: string
          period_due_on: string
          tenant_id: string
        }
        SetofOptions: {
          from: "*"
          to: "membership_payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_coach_status: {
        Args: { p_id: string; p_status: string }
        Returns: {
          commission_type: string
          commission_value: number
          created_at: string
          created_by: string
          email: string | null
          id: string
          name: string
          phone: string | null
          profile_id: string | null
          specialties: string[]
          status: string
          tenant_id: string
        }
        SetofOptions: {
          from: "*"
          to: "coaches"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_membership_plan_active: {
        Args: { p_active: boolean; p_id: string }
        Returns: {
          active: boolean
          classes_per_month: number | null
          created_at: string
          created_by: string
          id: string
          monthly_price: number
          name: string
          tenant_id: string
        }
        SetofOptions: {
          from: "*"
          to: "membership_plans"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      reservation_status:
        | "pending"
        | "confirmed"
        | "checked_in"
        | "completed"
        | "cancelled"
        | "no_show"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      reservation_status: [
        "pending",
        "confirmed",
        "checked_in",
        "completed",
        "cancelled",
        "no_show",
      ],
    },
  },
} as const
