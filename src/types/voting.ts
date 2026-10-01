import { Candidate } from "../types";

/**
 * Configuration mapping each position to its permitted maximum number of votes.
 * For example: Single-winner positions allow 1, while multi-member positions (e.g. Councilors) allow N.
 */
export type PositionVoteLimits = Record<string, number>;

/**
 * Default voting limits for all standard positions (1 vote each).
 * Can be augmented or overridden per election setup.
 */
export const DEFAULT_POSITION_VOTE_LIMITS: PositionVoteLimits = {
  "President": 1,
  "Vice President": 1,
  "Secretary": 1,
  "Treasurer": 1,
  "PIO": 1,
  "Public Officer": 1,
  "Gr 8 Representative": 1,
  "Gr 9 Representative": 1,
  "Gr 10 Representative": 1,
  "Gr 11 Representative": 1,
  "Gr 12 Representative": 1,
};

/**
 * State map storing selected candidate IDs per position.
 * Key: Position name (e.g., "President")
 * Value: Array of selected candidate IDs (empty array if undervoted/blank)
 */
export type BallotSelections = Record<string, string[]>;

/**
 * Modal flow steps for ballot submission:
 * - "idle": Voter is interacting with the ballot
 * - "summary": Stage 1 - Summary confirmation modal reviewing choices & undervotes
 * - "lock_in": Stage 2 - Final lock-in confirmation modal with irreversible warning
 */
export type ConfirmationStep = "idle" | "summary" | "lock_in";

/**
 * Status of a voter's selection for an individual position.
 * - "full": Voter selected the exact maximum permitted candidates.
 * - "undervote": Voter selected fewer candidates than permitted (but at least 1).
 * - "blank": Voter made 0 selections for this position (abstention).
 */
export type PositionVoteStatus = "full" | "undervote" | "blank";

/**
 * Structured summary detail for each position presented in the Stage 1 Summary Modal.
 */
export interface PositionSummaryItem {
  position: string;
  maxAllowed: number;
  selectedCount: number;
  selectedCandidates: Candidate[];
  status: PositionVoteStatus;
  statusNotice: string;
}

/**
 * Immediate warning structure triggered when a voter tries to exceed a position's vote limit.
 */
export interface OvervoteNotice {
  position: string;
  maxAllowed: number;
  message: string;
}
