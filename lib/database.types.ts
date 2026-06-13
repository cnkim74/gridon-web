// Supabase database types.
//
// Hand-written to match supabase/migrations/0001_init_profiles.sql so the app
// typechecks before the remote project exists. Once the `gridon` project is
// created and the migration applied, regenerate the canonical version with the
// Supabase MCP `generate_typescript_types` tool (or the CLI) and overwrite this
// file.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type MemberType = "개인" | "기업";
export type UserRole = "member" | "admin" | "superadmin";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          name: string | null;
          member_type: MemberType;
          role: UserRole;
          phone: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          name?: string | null;
          member_type?: MemberType;
          role?: UserRole;
          phone?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          name?: string | null;
          member_type?: MemberType;
          role?: UserRole;
          phone?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
