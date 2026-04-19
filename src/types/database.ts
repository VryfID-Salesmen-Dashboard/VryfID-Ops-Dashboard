// Hand-authored Supabase types mirroring supabase/migrations/0001_init.sql.
// Regenerate with `supabase gen types typescript` once the project is linked.

export type SalesRepRole = "admin" | "sales_rep";
export type SalesRepStatus = "active" | "inactive" | "terminated";
export type SalesRepTier = "starter" | "proven" | "elite";

export type ClientType = "landlord_pm" | "brokerage";
export type ClientStatus = "active" | "churned" | "paused";

export type CommissionEventType = "subscription" | "verification";
export type CommissionEventStatus = "pending" | "approved" | "paid" | "voided";

export type QuarterlyBonusStatus = "calculated" | "approved" | "paid";
export type PayoutStatus = "pending" | "paid";

export interface SalesRepRow {
  id: string;
  clerk_user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role: SalesRepRole;
  status: SalesRepStatus;
  lifetime_clients_signed: number;
  current_tier: SalesRepTier;
  start_date: string;
  territory: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientRow {
  id: string;
  sales_rep_id: string;
  stripe_customer_id: string;
  company_name: string;
  client_type: ClientType;
  unit_count: number | null;
  agent_count: number | null;
  dashboard_count: number;
  monthly_subscription: string;
  sign_date: string;
  commission_end_date: string;
  commission_rate_locked: string;
  status: ClientStatus;
  churned_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommissionEventRow {
  id: string;
  sales_rep_id: string;
  client_id: string;
  stripe_payment_id: string;
  event_type: CommissionEventType;
  payment_amount: string;
  commission_rate: string;
  commission_amount: string;
  period_start: string;
  period_end: string;
  status: CommissionEventStatus;
  approved_at: string | null;
  paid_at: string | null;
  voided_at: string | null;
  void_reason: string | null;
  created_at: string;
}

export interface QuarterlyBonusRow {
  id: string;
  sales_rep_id: string;
  quarter: string;
  new_clients_count: number;
  acquisition_bonus: string;
  total_verifications: number;
  volume_bonus: string;
  retention_rate: string | null;
  retention_bonus: string;
  total_bonus: string;
  status: QuarterlyBonusStatus;
  created_at: string;
}

export interface PayoutRow {
  id: string;
  sales_rep_id: string;
  payout_date: string;
  period_label: string;
  subscription_total: string;
  verification_total: string;
  bonus_total: string;
  gross_total: string;
  notes: string | null;
  status: PayoutStatus;
  created_at: string;
}

type WithDefaults<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type Database = {
  public: {
    Tables: {
      sales_reps: {
        Row: SalesRepRow;
        Insert: WithDefaults<
          SalesRepRow,
          | "id"
          | "phone"
          | "role"
          | "status"
          | "lifetime_clients_signed"
          | "current_tier"
          | "territory"
          | "created_at"
          | "updated_at"
        >;
        Update: Partial<SalesRepRow>;
        Relationships: [];
      };
      clients: {
        Row: ClientRow;
        Insert: WithDefaults<
          ClientRow,
          | "id"
          | "unit_count"
          | "agent_count"
          | "dashboard_count"
          | "status"
          | "churned_date"
          | "notes"
          | "created_at"
          | "updated_at"
        >;
        Update: Partial<ClientRow>;
        Relationships: [
          {
            foreignKeyName: "clients_sales_rep_id_fkey";
            columns: ["sales_rep_id"];
            referencedRelation: "sales_reps";
            referencedColumns: ["id"];
          },
        ];
      };
      commission_events: {
        Row: CommissionEventRow;
        Insert: WithDefaults<
          CommissionEventRow,
          | "id"
          | "status"
          | "approved_at"
          | "paid_at"
          | "voided_at"
          | "void_reason"
          | "created_at"
        >;
        Update: Partial<CommissionEventRow>;
        Relationships: [
          {
            foreignKeyName: "commission_events_sales_rep_id_fkey";
            columns: ["sales_rep_id"];
            referencedRelation: "sales_reps";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "commission_events_client_id_fkey";
            columns: ["client_id"];
            referencedRelation: "clients";
            referencedColumns: ["id"];
          },
        ];
      };
      quarterly_bonuses: {
        Row: QuarterlyBonusRow;
        Insert: WithDefaults<
          QuarterlyBonusRow,
          | "id"
          | "new_clients_count"
          | "acquisition_bonus"
          | "total_verifications"
          | "volume_bonus"
          | "retention_rate"
          | "retention_bonus"
          | "total_bonus"
          | "status"
          | "created_at"
        >;
        Update: Partial<QuarterlyBonusRow>;
        Relationships: [
          {
            foreignKeyName: "quarterly_bonuses_sales_rep_id_fkey";
            columns: ["sales_rep_id"];
            referencedRelation: "sales_reps";
            referencedColumns: ["id"];
          },
        ];
      };
      payouts: {
        Row: PayoutRow;
        Insert: WithDefaults<
          PayoutRow,
          | "id"
          | "subscription_total"
          | "verification_total"
          | "bonus_total"
          | "gross_total"
          | "notes"
          | "status"
          | "created_at"
        >;
        Update: Partial<PayoutRow>;
        Relationships: [
          {
            foreignKeyName: "payouts_sales_rep_id_fkey";
            columns: ["sales_rep_id"];
            referencedRelation: "sales_reps";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      is_admin: {
        Args: { clerk_sub: string };
        Returns: boolean;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
