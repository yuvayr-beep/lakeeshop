import { z } from 'zod';

export const mobileSchema = z.object({
  phone: z
    .string()
    .min(10, 'Mobile number must be 10 digits')
    .max(10, 'Mobile number must be 10 digits')
    .regex(/^[6-9]\d{9}$/, 'Enter a valid Indian mobile number'),
});

export const passwordSchema = z.object({
  password: z
    .string()
    .min(1, 'Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

export const forgotPasswordInitiateSchema = z.object({
  phone: z
    .string()
    .min(10, 'Mobile number must be 10 digits')
    .max(10, 'Mobile number must be 10 digits')
    .regex(/^[6-9]\d{9}$/, 'Enter a valid Indian mobile number'),
});

export const forgotPasswordVerifySchema = z
  .object({
    otp: z
      .string()
      .min(6, 'OTP must be 6 digits')
      .max(6, 'OTP must be 6 digits')
      .regex(/^\d{6}$/, 'OTP must be numeric'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])/,
        'Password must include uppercase, lowercase, number, and special character'
      ),
    rePassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.rePassword, {
    message: 'Passwords do not match',
    path: ['rePassword'],
  });

export type MobileFormData = z.infer<typeof mobileSchema>;
export type PasswordFormData = z.infer<typeof passwordSchema>;
export type ForgotInitiateFormData = z.infer<typeof forgotPasswordInitiateSchema>;
export type ForgotVerifyFormData = z.infer<typeof forgotPasswordVerifySchema>;