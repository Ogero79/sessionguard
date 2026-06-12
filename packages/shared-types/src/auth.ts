export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface UpdateProfileRequest {
  displayName: string;
}

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: string;
  sessionId?: string;
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: string;
  createdAt: string;
}

