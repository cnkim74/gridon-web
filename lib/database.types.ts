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

export type MemberType = "개인" | "기업" | "직원";
export type UserRole = "member" | "admin" | "superadmin";
export type EmploymentType = "정규직" | "계약직" | "일용직" | "파견";
export type EmployeeStatus = "재직" | "휴직" | "퇴사";
export type PayType = "월급" | "일급" | "시급" | "기타소득" | "사업소득";
export type AttendanceStatus = "정상" | "지각" | "조퇴" | "결근" | "휴가" | "출장";

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
      employees: {
        Row: {
          id: string;
          name: string;
          position: string | null;
          department: string | null;
          phone: string | null;
          email: string | null;
          hire_date: string | null;
          employment_type: EmploymentType;
          status: EmployeeStatus;
          memo: string | null;
          photo_url: string | null;
          rrn_masked: string | null;
          salary: number | null;
          pay_type: PayType;
          ins_pension: boolean;
          ins_health: boolean;
          ins_employment: boolean;
          ins_industrial: boolean;
          profile_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          position?: string | null;
          department?: string | null;
          phone?: string | null;
          email?: string | null;
          hire_date?: string | null;
          employment_type?: EmploymentType;
          status?: EmployeeStatus;
          memo?: string | null;
          photo_url?: string | null;
          salary?: number | null;
          pay_type?: PayType;
          ins_pension?: boolean;
          ins_health?: boolean;
          ins_employment?: boolean;
          ins_industrial?: boolean;
          profile_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          position?: string | null;
          department?: string | null;
          phone?: string | null;
          email?: string | null;
          hire_date?: string | null;
          employment_type?: EmploymentType;
          status?: EmployeeStatus;
          memo?: string | null;
          photo_url?: string | null;
          salary?: number | null;
          pay_type?: PayType;
          ins_pension?: boolean;
          ins_health?: boolean;
          ins_employment?: boolean;
          ins_industrial?: boolean;
          profile_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      attendance: {
        Row: {
          id: string;
          employee_id: string;
          work_date: string;
          check_in: string | null;
          check_out: string | null;
          status: AttendanceStatus;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          employee_id: string;
          work_date: string;
          check_in?: string | null;
          check_out?: string | null;
          status?: AttendanceStatus;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          employee_id?: string;
          work_date?: string;
          check_in?: string | null;
          check_out?: string | null;
          status?: AttendanceStatus;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      payroll_entries: {
        Row: {
          id: string;
          employee_id: string;
          year_month: string;
          base_salary: number;
          note: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          employee_id: string;
          year_month: string;
          base_salary: number;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          employee_id?: string;
          year_month?: string;
          base_salary?: number;
          note?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      contracts: {
        Row: {
          id: string;
          employee_id: string;
          title: string;
          file_path: string;
          mime_type: string | null;
          size_bytes: number | null;
          uploaded_at: string;
        };
        Insert: {
          id?: string;
          employee_id: string;
          title: string;
          file_path: string;
          mime_type?: string | null;
          size_bytes?: number | null;
          uploaded_at?: string;
        };
        Update: {
          id?: string;
          employee_id?: string;
          title?: string;
          file_path?: string;
          mime_type?: string | null;
          size_bytes?: number | null;
          uploaded_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      get_employee_rrn: { Args: { p_emp: string }; Returns: string | null };
      save_employee_rrn: { Args: { p_emp: string; p_rrn: string }; Returns: undefined };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
