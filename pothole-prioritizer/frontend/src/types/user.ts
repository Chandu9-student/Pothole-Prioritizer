// User and admin related types

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  jurisdictionLevel?: string;
  jurisdictionArea?: string;
  totalReports: number;
  activeReports: number;
  emailNotifications: boolean;
  createdAt: string;
}

export interface UserReport {
  id: string;
  latitude: number;
  longitude: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  aiConfidence: number;
  description?: string;
  status: 'reported' | 'in_progress' | 'completed' | 'rejected';
  priorityScore: number;
  voteCount: number;
  hasUserVoted?: boolean;
  imagePaths: string[];
  videoPath?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUser extends UserProfile {
  jurisdiction: {
    level: 'panchayath' | 'municipality' | 'city' | 'district' | 'state' | 'national';
    area: string;
    state?: string;
    district?: string;
    city?: string;
  };
  permissions: string[];
  lastLogin: string;
}

export interface AdminStats {
  totalPotholes: number;
  pendingReports: number;
  inProgressReports: number;
  completedReports: number;
  highPriorityCount: number;
  averageResolutionTime: number;
  citizenReports: number;
  duplicateReports: number;
}

export interface AdminDashboardData {
  stats: AdminStats;
  recentReports: UserReport[];
  highPriorityPotholes: UserReport[];
  jurisdictionInfo: {
    level: string;
    area: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
}
