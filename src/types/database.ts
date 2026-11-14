export type UserRole = 'client' | 'coach' | 'admin';
export type MemberStatus = 'active' | 'paused' | 'inactive';

export interface Profile {
  id: string;
  role: UserRole;
  status: MemberStatus;
  full_name: string;
  alias: string | null;
  email: string;
  phone: string | null;
  birth_date: string | null;
  avatar_url: string | null;
  belt: string | null;
  belt_stripes: number;
  weight_category: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  medical_notes: string | null;
  personal_goals: string | null;
  guardian_user_id: string | null;
  first_training_at: string | null;
  must_change_password: boolean;
  created_at: string;
}

