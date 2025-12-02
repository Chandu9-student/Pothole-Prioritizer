// Authentication related types

export interface User {
  id: number;
  email: string;
  name: string;
  role: 'citizen' | 'authority';
  created_at: string;
  is_active: boolean;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  confirmPassword?: string;
  role?: 'citizen' | 'authority';
}

export interface AuthResponse {
  user: User;
  token: string;
  message: string;
}

// These interfaces can be added later if needed
// export interface EmailVerificationRequest {
//   email: string;
//   token: string;
// }

// export interface PasswordResetRequest {
//   email: string;
// }

export interface PasswordResetData {
  token: string;
  newPassword: string;
  confirmPassword: string;
}
