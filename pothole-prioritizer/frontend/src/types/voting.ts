// Voting system related types

export interface Vote {
  id: string;
  potholeId: string;
  userId: string;
  votedAt: string;
}

export interface VotingStats {
  totalVotes: number;
  userHasVoted: boolean;
  voteBreakdown: {
    citizens: number;
    officials: number;
  };
}

export interface DuplicateCheck {
  isDuplicate: boolean;
  nearbyPotholes: NearbyPothole[];
  radius: number; // in meters
}

export interface NearbyPothole {
  id: string;
  latitude: number;
  longitude: number;
  severity: string;
  distance: number; // in meters
  voteCount: number;
  status: string;
  description?: string;
  createdAt: string;
  canVote: boolean;
}

export interface VoteRequest {
  potholeId: string;
  userId?: string; // Optional for guest users
}

export interface VoteResponse {
  success: boolean;
  message: string;
  newVoteCount: number;
  priorityScore: number;
  userHasVoted: boolean;
}

export interface PriorityCalculation {
  baseScore: number;
  severityMultiplier: number;
  voteBonus: number;
  timeBonus: number;
  finalScore: number;
  factors: {
    severity: string;
    aiConfidence: number;
    voteCount: number;
    ageInDays: number;
  };
}
