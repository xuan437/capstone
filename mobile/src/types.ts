export interface Student {
  id: string; // LRN
  name: string;
  grade: string;
  section?: string;
  age?: number;
  has_voted: boolean;
  password?: string;
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
  platform?: string;
  photo_url?: string;
  grade?: string;
  section?: string;
  age?: number;
  vote_count?: number;
}

export const POSITIONS = [
  "President",
  "Vice President",
  "Secretary",
  "Treasurer",
  "Auditor",
  "Public Information Officer",
  "Protocol Officer",
  "Grade 7 Representative",
  "Grade 8 Representative",
  "Grade 9 Representative",
  "Grade 10 Representative",
  "Grade 11 Representative",
  "Grade 12 Representative",
] as const;

export type Position = typeof POSITIONS[number];

export const ADMIN_IDENTIFIER = "admin@gmail.com";
export const ADMIN_PASSWORD = "admin123";
