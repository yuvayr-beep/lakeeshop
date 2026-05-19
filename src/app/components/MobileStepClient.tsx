'use client';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import AuthCard from '@/components/auth/AuthCard';
import CircularNextButton from '@/components/auth/CircularNextButton';
import { mobileSchema, type MobileFormData } from '@/lib/validators';

export default function MobileStepClient() {
  const router = useRouter();
  const [rememberMe, setRememberMe] = useState(false);

  const {
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<MobileFormData>({
    resolver: zodResolver(mobileSchema),
    defaultValues: { phone: '' },
  });

  const phone = watch('phone');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 10);
    setValue('phone', raw, { shouldValidate: true });
  };

  const onSubmit = (data: MobileFormData) => {
    sessionStorage.setItem('auth_phone', data.phone);
    router.push('/sign-in-password-screen');
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
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="mobilenumber"
            value={phone}
            onChange={handleChange}
            autoFocus
            maxLength={10}
            className="flex-1 text-sm text-gray-700 bg-transparent outline-none placeholder:text-gray-400"
            style={{ fontFamily: "'Caveat', cursive", fontSize: '1rem' }}
          />
        </div>

        {errors.phone && (
          <motion.p
            className="text-xs text-red-500 mt-1"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {errors.phone.message}
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
          <Link
            href="/forgot-password"
            className="text-xs text-blue-600 hover:text-blue-700 transition-colors ml-auto"
          >
            Forgot password?
          </Link>

          {/* Submit button */}
          <CircularNextButton
            type="submit"
            disabled={phone.length !== 10}
          />
        </motion.div>
      </form>
    </AuthCard>
  );
}