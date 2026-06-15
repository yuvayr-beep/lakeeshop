'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import AuthCard from '@/components/auth/AuthCard';
import CircularNextButton from '@/components/auth/CircularNextButton';
import {
  forgotPasswordInitiateSchema,
  forgotPasswordOtpSchema,
  forgotPasswordResetSchema,
  type ForgotInitiateFormData,
  type ForgotOtpFormData,
  type ForgotResetFormData,
} from '@/lib/validators';
import { forgotPasswordInitiate, forgotPasswordVerify } from '@/services/auth.service';
import type { ForgotStep } from '@/types/auth';

export default function ForgotPasswordClient() {
  const router = useRouter();
  const [step, setStep] = useState<ForgotStep>('mobile');
  const [phone, setPhone] = useState('');
  const [otpVal, setOtpVal] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showRePassword, setShowRePassword] = useState(false);

  const initiateForm = useForm<ForgotInitiateFormData>({
    resolver: zodResolver(forgotPasswordInitiateSchema),
    defaultValues: { phone: '' },
  });

  const otpForm = useForm<ForgotOtpFormData>({
    resolver: zodResolver(forgotPasswordOtpSchema),
    defaultValues: { otp: '' },
  });

  const resetForm = useForm<ForgotResetFormData>({
    resolver: zodResolver(forgotPasswordResetSchema),
    defaultValues: { newPassword: '', rePassword: '' },
  });

  const phoneValue = initiateForm.watch('phone');
  const otpValue = otpForm.watch('otp');
  const newPasswordValue = resetForm.watch('newPassword');
  const rePasswordValue = resetForm.watch('rePassword');

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 10);
    initiateForm.setValue('phone', raw, { shouldValidate: true });
  };

  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 6);
    otpForm.setValue('otp', raw, { shouldValidate: true });
  };

  const onInitiateSubmit = async (data: ForgotInitiateFormData) => {
    setLoading(true);
    try {
      await forgotPasswordInitiate({ phone: data.phone });
      setPhone(data.phone);
      toast.success('OTP sent successfully', {
        description: 'Check your registered mobile number for the OTP',
      });
      setStep('otp');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to send OTP. Please try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const onOtpSubmit = (data: ForgotOtpFormData) => {
    setOtpVal(data.otp);
    setStep('password');
  };

  const onResetSubmit = async (data: ForgotResetFormData) => {
    setLoading(true);
    try {
      await forgotPasswordVerify({
        phone,
        otp: otpVal,
        newPassword: data.newPassword,
        rePassword: data.rePassword,
      });
      toast.success('Password changed successfully', {
        description: 'You can now sign in with your new password',
      });
      router.push('/');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Failed to reset password. Please try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      heading="Forgot Password"
      subheading={
        step === 'mobile' ?'Enter your registered mobile number to receive OTP'
          : step === 'otp'
          ? `OTP sent to +91 ${phone.slice(0, 2)}****${phone.slice(-4)}`
          : 'Set a new password for your account'
      }
    >
      <AnimatePresence mode="wait">
        {step === 'mobile' && (
          <motion.form
            key="initiate-form"
            onSubmit={initiateForm.handleSubmit(onInitiateSubmit)}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
            noValidate
          >
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
              <span className="text-gray-400 text-base select-none">~</span>
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="mobilenumber"
                value={phoneValue}
                onChange={handlePhoneChange}
                autoFocus
                maxLength={10}
                className="flex-1 text-sm text-gray-700 bg-transparent outline-none placeholder:text-gray-400"
                style={{ fontFamily: "'Caveat', cursive", fontSize: '1rem' }}
              />
            </div>

            {initiateForm.formState.errors.phone && (
              <motion.p
                className="text-xs text-red-500 mt-1"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {initiateForm.formState.errors.phone.message}
              </motion.p>
            )}

            <motion.div
              className="flex items-center gap-3 mt-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                aria-label="More options"
              >
                <Plus size={16} />
              </button>
              <Link
                href="/"
                className="text-xs text-blue-600 hover:text-blue-700 transition-colors ml-auto"
              >
                Back to sign in
              </Link>
              <CircularNextButton
                type="submit"
                disabled={phoneValue.length !== 10}
                loading={loading}
              />
            </motion.div>
          </motion.form>
        )}

        {step === 'otp' && (
          <motion.form
            key="otp-form"
            onSubmit={otpForm.handleSubmit(onOtpSubmit)}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            noValidate
          >
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
              <span className="text-gray-400 text-base select-none">~</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="6 digit otp"
                value={otpValue}
                onChange={handleOtpChange}
                autoFocus
                maxLength={6}
                className="flex-1 text-sm text-gray-700 bg-transparent outline-none placeholder:text-gray-400"
                style={{ fontFamily: "'Caveat', cursive", fontSize: '1rem' }}
              />
            </div>

            {otpForm.formState.errors.otp && (
              <motion.p
                className="text-xs text-red-500 mt-1"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {otpForm.formState.errors.otp.message}
              </motion.p>
            )}

            <motion.div
              className="flex items-center gap-3 mt-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                aria-label="More options"
              >
                <Plus size={16} />
              </button>
              <button
                type="button"
                onClick={() => setStep('mobile')}
                className="text-xs text-blue-600 hover:text-blue-700 transition-colors ml-auto"
              >
                Change number
              </button>
              <CircularNextButton
                type="submit"
                disabled={otpValue.length !== 6}
              />
            </motion.div>
          </motion.form>
        )}

        {step === 'password' && (
          <motion.form
            key="password-form"
            onSubmit={resetForm.handleSubmit(onResetSubmit)}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            noValidate
          >
            <div className="flex items-center gap-2 pb-3 border-b border-gray-100 mb-3">
              <span className="text-gray-400 text-base select-none">~</span>
              <input
                type={showNewPassword ? 'text' : 'password'}
                placeholder="new password"
                value={newPasswordValue}
                onChange={(e) => resetForm.setValue('newPassword', e.target.value, { shouldValidate: true })}
                autoFocus
                className="flex-1 text-sm text-gray-700 bg-transparent outline-none placeholder:text-gray-400"
                style={{ fontFamily: "'Caveat', cursive", fontSize: '1rem' }}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((p) => !p)}
                className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                aria-label={showNewPassword ? 'Hide password' : 'Show password'}
              >
                {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {resetForm.formState.errors.newPassword && (
              <motion.p
                className="text-xs text-red-500 mt-1 mb-2"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {resetForm.formState.errors.newPassword.message}
              </motion.p>
            )}

            <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
              <span className="text-gray-400 text-base select-none">~</span>
              <input
                type={showRePassword ? 'text' : 'password'}
                placeholder="confirm password"
                value={rePasswordValue}
                onChange={(e) => resetForm.setValue('rePassword', e.target.value, { shouldValidate: true })}
                className="flex-1 text-sm text-gray-700 bg-transparent outline-none placeholder:text-gray-400"
                style={{ fontFamily: "'Caveat', cursive", fontSize: '1rem' }}
              />
              <button
                type="button"
                onClick={() => setShowRePassword((p) => !p)}
                className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                aria-label={showRePassword ? 'Hide password' : 'Show password'}
              >
                {showRePassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {resetForm.formState.errors.rePassword && (
              <motion.p
                className="text-xs text-red-500 mt-1"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {resetForm.formState.errors.rePassword.message}
              </motion.p>
            )}

            <motion.div
              className="flex items-center gap-3 mt-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                aria-label="More options"
              >
                <Plus size={16} />
              </button>
              <button
                type="button"
                onClick={() => setStep('otp')}
                className="text-xs text-blue-600 hover:text-blue-700 transition-colors ml-auto"
              >
                Back to OTP
              </button>
              <CircularNextButton
                type="submit"
                disabled={newPasswordValue.length < 8 || rePasswordValue.length < 8}
                loading={loading}
              />
            </motion.div>
          </motion.form>
        )}
      </AnimatePresence>
    </AuthCard>
  );
}