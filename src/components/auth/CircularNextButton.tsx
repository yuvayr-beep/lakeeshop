'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Loader2 } from 'lucide-react';

interface CircularNextButtonProps {
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit';
  size?: number;
}

export default function CircularNextButton({
  disabled = false,
  loading = false,
  onClick,
  type = 'submit',
  size = 30,
}: CircularNextButtonProps) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={!disabled && !loading ? { scale: 1.08 } : {}}
      whileTap={!disabled && !loading ? { scale: 0.94 } : {}}
      className={`relative flex items-center justify-center rounded-full transition-all duration-200 btn-primary-glow ${
        disabled || loading
          ? 'bg-muted text-muted-foreground cursor-not-allowed'
          : 'bg-primary text-primary-foreground cursor-pointer'
      }`}
      style={{ width: size, height: size }}
    >
      {loading ? (
        <Loader2 size={20} className="animate-spin" />
      ) : (
        <ArrowRight size={20} />
      )}

      {/* Pulse ring when active */}
      {!disabled && !loading && (
        <span className="absolute inset-0 rounded-full border-2 border-primary animate-pulse-ring opacity-0" />
      )}
    </motion.button>
  );
}