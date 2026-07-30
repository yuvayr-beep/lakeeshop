'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Lock, LogOut, User } from 'lucide-react';
import { toast } from 'sonner';
import DynamicBackground from '@/components/background/DynamicBackground';
import AuthCard from '@/components/auth/AuthCard';
import CircularNextButton from '@/components/auth/CircularNextButton';
import { signIn } from '@/services/auth.service';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { unlockSession, logout } from '@/redux/slices/authSlice';
import { useRouter } from 'next/navigation';

export default function LockScreenModal() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const userPhone = useAppSelector((state) => state.auth.phoneNumber) || (typeof window !== 'undefined' ? localStorage.getItem('userPhone') : '') || '';
  
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMsg('Please enter your password');
      return;
    }
    setLoading(true);
    setErrorMsg('');

    try {
      if (userPhone) {
        await signIn({ phone: userPhone, password });
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('idle_last_active_time', Date.now().toString());
        localStorage.setItem('idle_is_locked', 'false');
      }
      dispatch(unlockSession());
      toast.success('Session Unlocked', {
        description: 'Welcome back!',
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Incorrect password. Please try again.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchAccount = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('idle_is_locked');
      localStorage.removeItem('idle_last_active_time');
    }
    dispatch(logout());
    router.replace('/');
  };

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden">
      <DynamicBackground>
        <div className="min-h-screen w-full flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="w-full max-w-md"
          >
            <AuthCard
              heading="Portal Locked"
              subheading="Enter your password to resume your session"
            >
              {/* User Profile Badge */}
              <div className="flex items-center justify-between p-3 mb-4 rounded-xl bg-gray-50/80 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600/10 text-blue-600 flex items-center justify-center font-semibold text-sm">
                    {userPhone ? userPhone.slice(-4) : <User size={18} />}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-400 font-medium">Locked Account</span>
                    <span className="text-sm font-semibold text-gray-800">
                      {userPhone ? `+91 ${userPhone}` : 'Authorized User'}
                    </span>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Lock size={16} />
                </div>
              </div>

              <form onSubmit={handleUnlock} noValidate>
                {/* Input row */}
                <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
                  <span className="text-gray-400 text-base select-none">~</span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter password to unlock"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errorMsg) setErrorMsg('');
                    }}
                    autoFocus
                    className="flex-1 text-sm text-gray-700 bg-transparent outline-none placeholder:text-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {errorMsg && (
                  <motion.p
                    className="text-xs text-red-500 mt-2"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {errorMsg}
                  </motion.p>
                )}

                {/* Actions row */}
                <div className="flex items-center justify-between mt-5">
                  <button
                    type="button"
                    onClick={handleSwitchAccount}
                    className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 transition-colors"
                  >
                    <LogOut size={14} />
                    <span>Log in with another account</span>
                  </button>

                  <CircularNextButton
                    type="submit"
                    disabled={password.length < 1}
                    loading={loading}
                  />
                </div>
              </form>
            </AuthCard>
          </motion.div>
        </div>
      </DynamicBackground>
    </div>
  );
}
