'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import AuthCard from '@/components/auth/AuthCard';
import MobileInputField from '@/components/auth/MobileInputField';
import PasswordInputField from '@/components/auth/PasswordInputField';
import CircularNextButton from '@/components/auth/CircularNextButton';
import {
  forgotPasswordInitiateSchema,
  forgotPasswordVerifySchema,
  type ForgotInitiateFormData,
  type ForgotVerifyFormData,
} from '@/lib/validators';
import { forgotPasswordInitiate, forgotPasswordVerify } from '@/services/auth.service';
import { useTimeOfDay } from '@/hooks/useTimeOfDay';
import type { ForgotStep } from '@/types/auth';

export default function ForgotPasswordClient() {
  const router = useRouter();
  const timeOfDay = useTimeOfDay();
  const isEvening = timeOfDay === 'evening';
  const [step, setStep] = useState<ForgotStep>('mobile');
  const [phone, setPhone] = useState('');
  const [loadingInitiate, setLoadingInitiate] = useState(false);
  const [loadingVerify, setLoadingVerify] = useState(false);

  const initiateForm = useForm<ForgotInitiateFormData>({
    resolver: zodResolver(forgotPasswordInitiateSchema),
    defaultValues: { phone: '' },
  });

  const verifyForm = useForm<ForgotVerifyFormData>({
    resolver: zodResolver(forgotPasswordVerifySchema),
    defaultValues: { otp: '', newPassword: '', rePassword: '' },
  });

  const phoneVal = initiateForm.watch('phone');

  const onInitiateSubmit = async (data: ForgotInitiateFormData) => {
    setLoadingInitiate(true);
    try {
      // Backend integration: POST /auth/forgot-password/initiate
      await forgotPasswordInitiate({ phone: data.phone });
      setPhone(data.phone);
      toast.success('OTP sent successfully', {
        description: 'Check your registered email for the OTP',
      });
      setStep('verify');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to send OTP. Please try again.';
      toast.error(msg);
    } finally {
      setLoadingInitiate(false);
    }
  };

  const onVerifySubmit = async (data: ForgotVerifyFormData) => {
    setLoadingVerify(true);
    try {
      // Backend integration: POST /auth/forgot-password/verify
      await forgotPasswordVerify({ phone, ...data });
      toast.success('Password changed successfully', {
        description: 'You can now sign in with your new password',
      });
      router.push('/');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'OTP verification failed. Please try again.';
      toast.error(msg);
    } finally {
      setLoadingVerify(false);
    }
  };

  return (
    <AuthCard>
      <motion.div
        className="mb-6"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.5 }}
      >
        <h1
          className={`font-script text-4xl mb-1 ${
            isEvening ? 'text-white' : 'text-foreground'
          }`}
        >
          {step === 'mobile' ? 'Forgot Password' : 'Reset Password'}
        </h1>
        <p
          className={`text-sm font-400 ${
            isEvening ? 'text-white/60' : 'text-muted-foreground'
          }`}
          style={{ fontFamily: "'Caveat', cursive" }}
        >
          {step === 'mobile' ?'Enter your mobile number to receive OTP'
            : `OTP sent to +91 ${phone.slice(0, 2)}****${phone.slice(-4)}`}
        </p>
      </motion.div>

      <AnimatePresence mode="wait">
        {step === 'mobile' ? (
          <motion.form
            key="initiate-form"
            onSubmit={initiateForm.handleSubmit(onInitiateSubmit)}
            className="space-y-5"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            noValidate
          >
            <MobileInputField
              value={phoneVal}
              onChange={(val) =>
                initiateForm.setValue('phone', val, { shouldValidate: true })
              }
              error={initiateForm.formState.errors.phone?.message}
            />
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => router.push('/')}
                className={`text-xs font-500 transition-colors duration-150 ${
                  isEvening
                    ? 'text-white/40 hover:text-white/70' :'text-muted-foreground hover:text-foreground'
                }`}
              >
                ← Back to Sign In
              </button>
              <CircularNextButton
                type="submit"
                disabled={phoneVal.length !== 10}
                loading={loadingInitiate}
              />
            </div>
          </motion.form>
        ) : (
          <motion.form
            key="verify-form"
            onSubmit={verifyForm.handleSubmit(onVerifySubmit)}
            className="space-y-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            noValidate
          >
            {/* OTP input */}
            <div className="space-y-2">
              <label
                className={`text-xs font-600 tracking-wide uppercase ${
                  isEvening ? 'text-white/60' : 'text-muted-foreground'
                }`}
                htmlFor="otp-input"
              >
                OTP Code
              </label>
              <input
                id="otp-input"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Enter 6-digit OTP"
                maxLength={6}
                {...verifyForm.register('otp')}
                className={`w-full px-4 py-3.5 text-sm font-500 rounded-xl rainbow-border outline-none tabular-nums transition-all duration-200 input-glow ${
                  isEvening
                    ? 'bg-white/10 text-white placeholder:text-white/30' :'bg-white text-foreground placeholder:text-muted-foreground/60'
                }`}
              />
              {verifyForm.formState.errors.otp && (
                <p className="text-xs text-red-500 font-500">
                  {verifyForm.formState.errors.otp.message}
                </p>
              )}
            </div>

            <PasswordInputField
              value={verifyForm.watch('newPassword')}
              onChange={(val) =>
                verifyForm.setValue('newPassword', val, { shouldValidate: true })
              }
              error={verifyForm.formState.errors.newPassword?.message}
              label="New Password"
              placeholder="Min 8 chars, uppercase, number, symbol"
            />

            <PasswordInputField
              value={verifyForm.watch('rePassword')}
              onChange={(val) =>
                verifyForm.setValue('rePassword', val, { shouldValidate: true })
              }
              error={verifyForm.formState.errors.rePassword?.message}
              label="Confirm Password"
              placeholder="Re-enter your new password"
            />

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setStep('mobile')}
                className={`text-xs font-500 transition-colors duration-150 ${
                  isEvening
                    ? 'text-white/40 hover:text-white/70' :'text-muted-foreground hover:text-foreground'
                }`}
              >
                ← Change Number
              </button>
              <CircularNextButton
                type="submit"
                loading={loadingVerify}
              />
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </AuthCard>
  );
}