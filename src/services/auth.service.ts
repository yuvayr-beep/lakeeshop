import axiosInstance from '@/lib/axios';

export interface SignInRequest {
  phone: string;
  password: string;
}

export interface SignInResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface ForgotPasswordInitiateRequest {
  phone: string;
}

export interface ForgotPasswordInitiateResponse {
  status: string;
  code: string;
  message: string;
}

export interface ForgotPasswordVerifyRequest {
  phone: string;
  otp: string;
  newPassword: string;
  rePassword: string;
}

export interface ForgotPasswordVerifyResponse {
  status: string;
  code: string;
  message: string;
}

// Backend integration: POST /auth/signin
export const signIn = async (data: SignInRequest): Promise<SignInResponse> => {
  const response = await axiosInstance.post<SignInResponse>('/auth/signin', data);
  return response.data;
};

// Backend integration: POST /auth/forgot-password/initiate
export const forgotPasswordInitiate = async (
  data: ForgotPasswordInitiateRequest
): Promise<ForgotPasswordInitiateResponse> => {
  const response = await axiosInstance.post<ForgotPasswordInitiateResponse>(
    '/auth/forgot-password/initiate',
    data
  );
  return response.data;
};

// Backend integration: POST /auth/forgot-password/verify
export const forgotPasswordVerify = async (
  data: ForgotPasswordVerifyRequest
): Promise<ForgotPasswordVerifyResponse> => {
  const response = await axiosInstance.post<ForgotPasswordVerifyResponse>(
    '/auth/forgot-password/verify',
    data
  );
  return response.data;
};

export const saveAuthTokens = (tokens: SignInResponse) => {
  localStorage.setItem('accessToken', tokens.accessToken);
  localStorage.setItem('refreshToken', tokens.refreshToken);
  localStorage.setItem('expiresIn', String(tokens.expiresIn));
  localStorage.setItem('tokenType', tokens.tokenType);
};

export const clearAuthTokens = () => {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('expiresIn');
  localStorage.removeItem('tokenType');
};

export const isAuthenticated = (): boolean => {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('accessToken');
};