'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { useTimeOfDay } from '@/hooks/useTimeOfDay';

interface PasswordInputFieldProps {
  value: string;
  onChange: (val: string) => void;
  error?: string;
  placeholder?: string;
  label?: string;
  autoFocus?: boolean;
}

export default function PasswordInputField({
  value,
  onChange,
  error,
  placeholder = 'Enter your password',
  label = 'Password',
  autoFocus = false,
}: PasswordInputFieldProps) {
  const [showPassword, setShowPassword] = useState(false);
  const timeOfDay = useTimeOfDay();
  const isEvening = timeOfDay === 'evening';

  return (
    <div className="space-y-2">
      <label
        className={`text-xs font-600 tracking-wide uppercase ${
          isEvening ? 'text-white/60' : 'text-muted-foreground'
        }`}
        htmlFor="password-input"
      >
        {label}
      </label>
      <motion.div
        className={`flex items-center rounded-xl overflow-hidden input-glow transition-all duration-200 rainbow-border ${
          isEvening ? 'bg-white/10' : 'bg-white'
        }`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.4 }}
      >
        <input
          id="password-input"
          type={showPassword ? 'text' : 'password'}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus={autoFocus}
          className={`flex-1 px-4 py-3.5 text-sm font-500 bg-transparent outline-none ${
            isEvening
              ? 'text-white placeholder:text-white/30' :'text-foreground placeholder:text-muted-foreground/60'
          }`}
        />
        <button
          type="button"
          onClick={() => setShowPassword((p) => !p)}
          className={`pr-4 pl-2 transition-colors duration-150 ${
            isEvening
              ? 'text-white/40 hover:text-white/70' :'text-muted-foreground/50 hover:text-foreground/70'
          }`}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          <motion.span
            key={showPassword ? 'eye-off' : 'eye'}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.15 }}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </motion.span>
        </button>
      </motion.div>

      {error && (
        <motion.p
          className="text-xs text-red-500 font-500"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}