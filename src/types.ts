export type Student = {
  id: string;
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
};

export type Candidate = {
  id: string;
  position: string;
  name: string;
  votes?: number;
  image_url?: string;
  campaign_text?: string;
  age?: number;
  section?: string;
};

export type Admin = { name: string; id: string; isAdmin: boolean };
export type User = Student | Admin;

export type Page =
  | "login"
  | "admin_setup"
  | "ballot"
  | "confirm"
  | "results"
  | "admin_voters"
  | "student_profile"
  | "candidate_profile"
  | "download_results"
  | "admin_register"
  | "admin_add_candidate"
  | "admin_election_settings";

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

export const ADMIN_IDENTIFIER = "admin@gmail.com";
export const ADMIN_PASSWORD = "admin123";
