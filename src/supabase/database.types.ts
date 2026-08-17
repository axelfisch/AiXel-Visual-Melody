export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type AccountEntitlementRow = { user_id: string; schema_version: number; plan: string; entitlement: string; cloud_save: boolean; max_cloud_projects: number; max_brand_presets: number; export_1080p: boolean; social_ratios: boolean; clean_end_card: boolean; billing_interval: string | null; paid_through: string | null; cancel_at_period_end: boolean; grace_ends_at: string | null; recovery_action: string | null; suspension_reason: string | null; projection_version: number; as_of: string };
export type CloudProjectRow = { id: string; user_id: string; name: string; artist_name: string | null; schema_version: number; revision: number; analysis: Json | null; creative_configuration: Json; source_hint: Json | null; created_at: string; updated_at: string };
export type BrandPresetRow = { id: string; user_id: string; name: string; revision: number; configuration: Json; created_at: string; updated_at: string };

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          user_id: string;
          display_name: string | null;
          locale: 'en' | 'fr';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          display_name?: string | null;
          locale?: 'en' | 'fr';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          display_name?: string | null;
          locale?: 'en' | 'fr';
        };
        Relationships: [];
      };
      account_entitlements: { Row: AccountEntitlementRow; Insert: never; Update: never; Relationships: [] };
      projects: { Row: CloudProjectRow; Insert: never; Update: never; Relationships: [] };
      brand_presets: { Row: BrandPresetRow; Insert: never; Update: never; Relationships: [] };
    };
    Views: Record<never, never>;
    Functions: {
      create_cloud_project: { Args: { payload: Json }; Returns: Omit<CloudProjectRow, 'user_id'>[] };
      update_cloud_project: { Args: { project_id: string; expected_revision: number; payload: Json }; Returns: Omit<CloudProjectRow, 'user_id'>[] };
      delete_cloud_project: { Args: { project_id: string; expected_revision: number }; Returns: undefined };
      create_brand_preset: { Args: { payload: Json }; Returns: Omit<BrandPresetRow, 'user_id'>[] };
      update_brand_preset: { Args: { preset_id: string; expected_revision: number; payload: Json }; Returns: Omit<BrandPresetRow, 'user_id'>[] };
      delete_brand_preset: { Args: { preset_id: string; expected_revision: number }; Returns: undefined };
      reserve_checkout_attempt: { Args: { requested_catalog_key: string }; Returns: { attempt_id: string | null; action: string; checkout_url: string | null; stripe_session_id: string | null; stripe_customer_id: string | null; replaces_session_id: string | null }[] };
      attach_checkout_customer: { Args: { attempt_id: string; customer_id: string }; Returns: undefined };
      finalize_checkout_attempt: { Args: { attempt_id: string; session_id: string; session_url: string; expires_at: string }; Returns: undefined };
      fail_checkout_attempt: { Args: { attempt_id: string }; Returns: undefined };
      claim_stripe_event: { Args: { event_id: string; event_type: string; event_created_at: string }; Returns: boolean };
      finish_stripe_event: { Args: { event_id: string; error_code?: string | null }; Returns: undefined };
      apply_billing_snapshot: { Args: { event_id: string; customer_id: string; subscription_snapshot: Json; invoice_snapshot: Json }; Returns: undefined };
      list_duplicate_remediations: { Args: Record<never,never>; Returns: { stripe_customer_id: string; stripe_subscription_id: string }[] };
      finish_duplicate_remediation: { Args: { subscription_id: string; outcome: string }; Returns: undefined };
      list_billing_reconciliations: { Args: Record<never,never>; Returns: { stripe_customer_id: string; stripe_subscription_id: string }[] };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
