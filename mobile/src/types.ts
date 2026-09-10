export interface Student {
  id: string; // LRN (12 digits)
  name: string;
  password?: string;
  grade: string;
  section?: string;
  age?: number;
  has_voted: boolean;
  voted_at?: string;
  vote_location?: string;
  photo_url?: string;
  mobile_number?: string;
  otp_code?: string;
  otp_expires_at?: string;
}

export interface Admin {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
}

export type User = Student | Admin;

export interface Candidate {
  id: string;
  name: string;
  position: string;
  campaign_text?: string;
  platform?: string; // alias fallback
  image_url?: string;
  photo_url?: string; // alias fallback
  grade?: string;
  section?: string;
  age?: number;
  votes?: number;
  vote_count?: number; // alias fallback
}

export const POSITIONS = [
  "President",
  "Vice President",
  "Secretary",
  "Treasurer",
  "PIO",
  "Public Officer",
  "Gr 8 Representative",
  "Gr 9 Representative",
  "Gr 10 Representative",
  "Gr 11 Representative",
  "Gr 12 Representative",
] as const;

export type Position = (typeof POSITIONS)[number];

export type Page =
  | "login"
  | "ballot"
  | "confirm"
  | "results"
  | "admin_voters"
  | "admin_add_candidate"
  | "student_profile"
  | "admin_settings"
  | "candidate_profile";

export interface AuditLog {
  id?: string;
  user_name: string;
  action: string;
  target?: string;
  details?: string;
  created_at?: string;
}

export const ADMIN_IDENTIFIER = "admin@gmail.com";
export const ADMIN_PASSWORD = "admin123";
