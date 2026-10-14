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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      code_counter: {
        Row: {
          id: number
          last_seq: number
        }
        Insert: {
          id?: number
          last_seq?: number
        }
        Update: {
          id?: number
          last_seq?: number
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          reseller_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          reseller_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          reseller_id?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          created_by: string | null
          description: string
          expense_date: string
          id: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          expense_date?: string
          id?: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          expense_date?: string
          id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          id: string
          is_reversal: boolean
          method: string | null
          paid_at: string
          sale_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          id?: string
          is_reversal?: boolean
          method?: string | null
          paid_at?: string
          sale_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          id?: string
          is_reversal?: boolean
          method?: string | null
          paid_at?: string
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      plate_models: {
        Row: {
          active: boolean
          created_at: string
          default_cost: number | null
          default_price: number | null
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          default_cost?: number | null
          default_price?: number | null
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          created_at?: string
          default_cost?: number | null
          default_price?: number | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      plate_movements: {
        Row: {
          action: string
          actor: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["plate_status"] | null
          id: string
          plate_id: string
          reason: string | null
          reference_id: string | null
          to_status: Database["public"]["Enums"]["plate_status"]
        }
        Insert: {
          action: string
          actor?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["plate_status"] | null
          id?: string
          plate_id: string
          reason?: string | null
          reference_id?: string | null
          to_status: Database["public"]["Enums"]["plate_status"]
        }
        Update: {
          action?: string
          actor?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["plate_status"] | null
          id?: string
          plate_id?: string
          reason?: string | null
          reference_id?: string | null
          to_status?: Database["public"]["Enums"]["plate_status"]
        }
        Relationships: [
          {
            foreignKeyName: "plate_movements_plate_id_fkey"
            columns: ["plate_id"]
            isOneToOne: false
            referencedRelation: "plates"
            referencedColumns: ["id"]
          },
        ]
      }
      plates: {
        Row: {
          code: string
          created_at: string
          customer_id: string | null
          destination_url: string | null
          entry_id: string
          id: string
          model_id: string
          qr_active: boolean
          qr_updated_at: string | null
          reseller_id: string | null
          sale_id: string | null
          seq: number
          slug: string
          status: Database["public"]["Enums"]["plate_status"]
        }
        Insert: {
          code: string
          created_at?: string
          customer_id?: string | null
          destination_url?: string | null
          entry_id: string
          id?: string
          model_id: string
          qr_active?: boolean
          qr_updated_at?: string | null
          reseller_id?: string | null
          sale_id?: string | null
          seq: number
          slug: string
          status?: Database["public"]["Enums"]["plate_status"]
        }
        Update: {
          code?: string
          created_at?: string
          customer_id?: string | null
          destination_url?: string | null
          entry_id?: string
          id?: string
          model_id?: string
          qr_active?: boolean
          qr_updated_at?: string | null
          reseller_id?: string | null
          sale_id?: string | null
          seq?: number
          slug?: string
          status?: Database["public"]["Enums"]["plate_status"]
        }
        Relationships: [
          {
            foreignKeyName: "plates_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plates_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "stock_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plates_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "plate_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plates_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      qr_history: {
        Row: {
          action: string
          actor: string | null
          created_at: string
          id: string
          new_url: string | null
          old_url: string | null
          plate_id: string
        }
        Insert: {
          action: string
          actor?: string | null
          created_at?: string
          id?: string
          new_url?: string | null
          old_url?: string | null
          plate_id: string
        }
        Update: {
          action?: string
          actor?: string | null
          created_at?: string
          id?: string
          new_url?: string | null
          old_url?: string | null
          plate_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qr_history_plate_id_fkey"
            columns: ["plate_id"]
            isOneToOne: false
            referencedRelation: "plates"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          created_at: string
          id: string
          plate_id: string
          sale_id: string
          unit_cost: number | null
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          plate_id: string
          sale_id: string
          unit_cost?: number | null
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          plate_id?: string
          sale_id?: string
          unit_cost?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_plate_id_fkey"
            columns: ["plate_id"]
            isOneToOne: false
            referencedRelation: "plates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          amount_paid: number
          cancel_reason: string | null
          cancelled: boolean
          cancelled_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          discount: number
          id: string
          notes: string | null
          payment_method: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          reseller_id: string | null
          sale_date: string
          sale_number: number
          subtotal: number
          total: number
        }
        Insert: {
          amount_paid?: number
          cancel_reason?: string | null
          cancelled?: boolean
          cancelled_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          discount?: number
          id?: string
          notes?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          reseller_id?: string | null
          sale_date?: string
          sale_number?: never
          subtotal?: number
          total?: number
        }
        Update: {
          amount_paid?: number
          cancel_reason?: string | null
          cancelled?: boolean
          cancelled_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          discount?: number
          id?: string
          notes?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          reseller_id?: string | null
          sale_date?: string
          sale_number?: never
          subtotal?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          business_name: string
          id: number
          low_stock_threshold: number
          public_base_url: string | null
          updated_at: string
        }
        Insert: {
          business_name?: string
          id?: number
          low_stock_threshold?: number
          public_base_url?: string | null
          updated_at?: string
        }
        Update: {
          business_name?: string
          id?: number
          low_stock_threshold?: number
          public_base_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      stock_entries: {
        Row: {
          created_at: string
          created_by: string | null
          entry_number: number
          first_seq: number
          id: string
          last_seq: number
          model_id: string
          notes: string | null
          quantity: number
          received_date: string
          stock_after: number
          stock_before: number
          supplier: string | null
          total_cost: number | null
          unit_cost: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          entry_number?: never
          first_seq: number
          id?: string
          last_seq: number
          model_id: string
          notes?: string | null
          quantity: number
          received_date?: string
          stock_after: number
          stock_before: number
          supplier?: string | null
          total_cost?: number | null
          unit_cost?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          entry_number?: never
          first_seq?: number
          id?: string
          last_seq?: number
          model_id?: string
          notes?: string | null
          quantity?: number
          received_date?: string
          stock_after?: number
          stock_before?: number
          supplier?: string | null
          total_cost?: number | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_entries_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "plate_models"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_payment: {
        Args: {
          _amount: number
          _method: string
          _paid_at: string
          _sale_id: string
        }
        Returns: undefined
      }
      cancel_sale: {
        Args: { _reason: string; _sale_id: string }
        Returns: undefined
      }
      change_plate_status: {
        Args: {
          _action: string
          _plate_id: string
          _reason: string
          _reseller_id?: string
        }
        Returns: undefined
      }
      create_sale: {
        Args: {
          _amount_paid: number
          _customer_id: string
          _discount: number
          _notes: string
          _payment_method: string
          _plate_ids: string[]
          _reseller_id: string
          _sale_date: string
          _unit_price: number
        }
        Returns: {
          amount_paid: number
          cancel_reason: string | null
          cancelled: boolean
          cancelled_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          discount: number
          id: string
          notes: string | null
          payment_method: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          reseller_id: string | null
          sale_date: string
          sale_number: number
          subtotal: number
          total: number
        }
        SetofOptions: {
          from: "*"
          to: "sales"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_stock_entry: {
        Args: {
          _model_id: string
          _notes: string
          _quantity: number
          _received_date: string
          _supplier: string
          _unit_cost: number
        }
        Returns: {
          created_at: string
          created_by: string | null
          entry_number: number
          first_seq: number
          id: string
          last_seq: number
          model_id: string
          notes: string | null
          quantity: number
          received_date: string
          stock_after: number
          stock_before: number
          supplier: string | null
          total_cost: number | null
          unit_cost: number | null
        }
        SetofOptions: {
          from: "*"
          to: "stock_entries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      format_nfc_code: { Args: { _seq: number }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      next_nfc_seq: { Args: never; Returns: number }
      resolve_qr: {
        Args: { _slug: string }
        Returns: {
          active: boolean
          destination: string
          found: boolean
        }[]
      }
      set_qr_active: {
        Args: { _active: boolean; _plate_id: string }
        Returns: undefined
      }
      set_user_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: undefined
      }
      update_qr_destination: {
        Args: { _plate_id: string; _url: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "revendedor"
      payment_status: "pendente" | "parcial" | "pago"
      plate_status:
        | "disponivel"
        | "reservada"
        | "vendida"
        | "atribuida"
        | "defeituosa"
        | "perdida"
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
  public: {
    Enums: {
      app_role: ["admin", "revendedor"],
      payment_status: ["pendente", "parcial", "pago"],
      plate_status: [
        "disponivel",
        "reservada",
        "vendida",
        "atribuida",
        "defeituosa",
        "perdida",
      ],
    },
  },
} as const
