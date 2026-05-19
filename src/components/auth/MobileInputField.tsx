'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { useTimeOfDay } from '@/hooks/useTimeOfDay';

interface MobileInputFieldProps {
  value: string;
  onChange: (val: string) => void;
  error?: string;
  autoFocus?: boolean;
}

export default function MobileInputField({
  value,
  onChange,
  error,
  autoFocus = true,
}: MobileInputFieldProps) {
  const timeOfDay = useTimeOfDay();
  const isEvening = timeOfDay === 'evening';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 10);
    onChange(raw);
  };

  return (
    <div className="space-y-2">
      <label
        className={`text-xs font-600 tracking-wide uppercase ${
          isEvening ? 'text-white/60' : 'text-muted-foreground'
        }`}
        htmlFor="phone-input"
      >
        Mobile Number
      </label>
      <motion.div
        className={`flex items-center gap-0 rounded-xl overflow-hidden input-glow transition-all duration-200 rainbow-border ${
          isEvening ? 'bg-white/10' : 'bg-white'
        }`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
      >
        {/* Country code */}
        <div
          className={`px-4 py-3.5 text-sm font-600 border-r select-none ${
            isEvening
              ? 'text-white/70 border-white/20 bg-white/5' :'text-foreground/70 border-border bg-muted/40'
          }`}
        >
          +91
        </div>

        {/* Phone input */}
        <input
          id="phone-input"
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="Enter 10-digit number"
          value={value}
          onChange={handleChange}
          autoFocus={autoFocus}
          className={`flex-1 px-4 py-3.5 text-sm font-500 bg-transparent outline-none tabular-nums placeholder:font-400 ${
            isEvening
              ? 'text-white placeholder:text-white/30' :'text-foreground placeholder:text-muted-foreground/60'
          }`}
          maxLength={10}
        />

        {/* Character count */}
        <div
          className={`pr-3 text-xs tabular-nums ${
            value.length === 10
              ? 'text-green-500'
              : isEvening
              ? 'text-white/30' :'text-muted-foreground/40'
          }`}
        >
          {value.length}/10
        </div>
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