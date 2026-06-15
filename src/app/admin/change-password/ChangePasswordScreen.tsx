'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, KeyRound, CheckCircle2, AlertCircle, Lock } from 'lucide-react';
import { useAppSelector } from '@/redux/hooks';
import axiosInstance from '@/lib/axios';
import { toast } from 'sonner';

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: '' };
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (password.length >= 12) score++;

  if (score <= 1) return { score, label: 'Weak', color: 'bg-red-500' };
  if (score <= 2) return { score, label: 'Fair', color: 'bg-amber-500' };
  if (score <= 3) return { score, label: 'Good', color: 'bg-blue-500' };
  return { score, label: 'Strong', color: 'bg-emerald-500' };
}

interface PasswordFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
}

function PasswordField({ label, value, onChange, placeholder, error }: PasswordFieldProps) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="text-xs font-600 text-slate-500 dark:text-slate-400 mb-1.5 block">{label}</label>
      <div className={`relative flex items-center rounded-xl border ${error ? 'border-red-400' : 'border-slate-200 dark:border-slate-600'} bg-white dark:bg-slate-800 transition-all focus-within:ring-2 focus-within:ring-blue-500/30 focus-within:border-blue-500`}>
        <Lock size={15} className="absolute left-4 text-slate-400" />
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 pl-10 pr-10 py-3 bg-transparent text-sm text-slate-800 dark:text-white outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
        />
        <button
          type="button"
          onClick={() => setShow((p) => !p)}
          className="absolute right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      {error && (
        <p className="flex items-center gap-1.5 text-xs text-red-500 mt-1.5">
          <AlertCircle size={12} />
          {error}
        </p>
      )}
    </div>
  );
}

export default function ChangePasswordScreen() {
  const phoneNumber = useAppSelector((s) => s.auth.phoneNumber);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const strength = getPasswordStrength(newPassword);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!oldPassword) errs.oldPassword = 'Current password is required';
    if (!newPassword) errs.newPassword = 'New password is required';
    else if (newPassword.length < 8) errs.newPassword = 'Password must be at least 8 characters';
    else if (strength.score < 2) errs.newPassword = 'Password is too weak';
    if (!confirmPassword) errs.confirmPassword = 'Please confirm your new password';
    else if (newPassword !== confirmPassword) errs.confirmPassword = 'Passwords do not match';
    if (oldPassword && newPassword && oldPassword === newPassword) errs.newPassword = 'New password must differ from current';
    return errs;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      await axiosInstance.post('https://v2.lakeetech.com/auth/change-password', {
        phone: phoneNumber,
        oldPassword,
        newPassword,
      });
      setSuccess(true);
      toast.success('Password changed successfully');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      const msg = error?.response?.data?.message || 'Failed to change password. Please try again.';
      toast.error(msg);
      setErrors({ oldPassword: msg });
    } finally {
      setLoading(false);
    }
  };

  const requirements = [
    { label: 'At least 8 characters', met: newPassword.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(newPassword) },
    { label: 'One number', met: /[0-9]/.test(newPassword) },
    { label: 'One special character', met: /[^A-Za-z0-9]/.test(newPassword) },
  ];

  return (
    <div className="max-w-lg">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-2xl font-700 text-slate-800 dark:text-white">Change Password</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Update your account password securely</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        className="mt-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-6 shadow-sm"
      >
        {success && (
          <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl mb-5">
            <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
            <p className="text-sm font-600 text-emerald-700 dark:text-emerald-400">Password changed successfully!</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
              <KeyRound size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-700 text-slate-800 dark:text-white">Security Update</p>
              <p className="text-xs text-slate-400">Choose a strong, unique password</p>
            </div>
          </div>

          <PasswordField
            label="Current Password"
            value={oldPassword}
            onChange={setOldPassword}
            placeholder="Enter current password"
            error={errors.oldPassword}
          />

          <PasswordField
            label="New Password"
            value={newPassword}
            onChange={setNewPassword}
            placeholder="Enter new password"
            error={errors.newPassword}
          />

          {/* Password Strength */}
          {newPassword && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-slate-400">Password strength</span>
                <span className={`text-xs font-700 ${
                  strength.label === 'Strong' ? 'text-emerald-600' :
                  strength.label === 'Good' ? 'text-blue-600' :
                  strength.label === 'Fair' ? 'text-amber-600' : 'text-red-500'
                }`}>{strength.label}</span>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                      i <= strength.score ? strength.color : 'bg-slate-100 dark:bg-slate-700'
                    }`}
                  />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-1.5 mt-3">
                {requirements.map((req) => (
                  <div key={req.label} className="flex items-center gap-1.5 text-xs">
                    <CheckCircle2 size={12} className={req.met ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600'} />
                    <span className={req.met ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}>{req.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <PasswordField
            label="Confirm New Password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="Confirm new password"
            error={errors.confirmPassword}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-xl text-sm font-700 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md"
          >
            {loading ? 'Updating Password...' : 'Update Password'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
