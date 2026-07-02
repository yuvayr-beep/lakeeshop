'use client';
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Plus, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import AuthCard from '@/components/auth/AuthCard';
import CircularNextButton from '@/components/auth/CircularNextButton';
import { passwordSchema, type PasswordFormData } from '@/lib/validators';
import { signIn, saveAuthTokens } from '@/services/auth.service';
import { useAppDispatch } from '@/redux/hooks';
import { setCredentials } from '@/redux/slices/authSlice';

export default function PasswordStepClient() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('auth_phone');
    if (!stored) {
      router.replace('/');
    } else {
      setPhone(stored);
    }
  }, [router]);

  const {
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: '' },
  });

  const password = watch('password');

  const onSubmit = async (data: PasswordFormData) => {
    setLoading(true);
    try {
      const response = await signIn({ phone, password: data.password });
      saveAuthTokens(response);
      // Save phone for profile fetch and sync Redux auth state
      localStorage.setItem('userPhone', phone);
      dispatch(setCredentials({ token: response.accessToken, phoneNumber: phone }));
      toast.success('Successfully Logged In', {
        description: 'Welcome back to Lakeeshop Erp',
      });
      sessionStorage.removeItem('auth_phone');
      router.push('/admin/dashboard/operations');
    } catch (err: unknown) {
      const errorMessage =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Invalid credentials. Please try again.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      heading="Sign in"
      subheading="Enter your credentials to access the dashboard"
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        {/* Input row */}
        <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
          <span className="text-gray-400 text-base select-none">~</span>
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="password"
            value={password}
            onChange={(e) => setValue('password', e.target.value, { shouldValidate: true })}
            autoFocus
            className="flex-1 text-sm text-gray-700 bg-transparent outline-none placeholder:text-gray-400"
            style={{ fontFamily: "'Caveat', cursive", fontSize: '1rem' }}
          />
          <button
            type="button"
            onClick={() => setShowPassword((p) => !p)}
            className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>

        {errors.password && (
          <motion.p
            className="text-xs text-red-500 mt-1"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {errors.password.message}
          </motion.p>
        )}

        {/* Bottom row */}
        <motion.div
          className="flex items-center gap-3 mt-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          {/* Plus icon */}
          <button
            type="button"
            className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
            aria-label="More options"
          >
            <Plus size={16} />
          </button>

          {/* Remember me */}
          <label className="flex items-center gap-1.5 cursor-pointer flex-shrink-0">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-gray-300 accent-blue-600 cursor-pointer"
            />
            <span className="text-xs text-gray-500 select-none">Remember me</span>
          </label>

          {/* Forgot password */}
          <button
            type="button"
            onClick={() => router.push('/forgot-password')}
            className="text-xs text-blue-600 hover:text-blue-700 transition-colors ml-auto"
          >
            Forgot password?
          </button>

          {/* Submit button */}
          <CircularNextButton
            type="submit"
            disabled={password.length < 1}
            loading={loading}
          />
        </motion.div>
      </form>
    </AuthCard>
  );
}