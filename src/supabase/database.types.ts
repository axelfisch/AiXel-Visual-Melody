export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

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
    };
    Views: Record<never, never>;
    Functions: Record<never, never>;
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
