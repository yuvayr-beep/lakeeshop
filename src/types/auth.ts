export type AuthStep = 'mobile' | 'password';
export type ForgotStep = 'mobile' | 'verify';

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

export interface AuthState {
  phone: string;
  step: AuthStep;
}

export interface ForgotPasswordState {
  phone: string;
  step: ForgotStep;
}