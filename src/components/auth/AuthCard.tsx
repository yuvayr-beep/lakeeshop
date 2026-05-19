'use client';
import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';

interface AuthCardProps {
  children: React.ReactNode;
  showLogo?: boolean;
  heading?: string;
  subheading?: string;
}

export default function AuthCard({
  children,
  showLogo = true,
  heading = 'Sign in',
  subheading = 'Enter your credentials to access the dashboard',
}: AuthCardProps) {
  return (
    <div className="min-h-screen flex items-center justify-end pr-8 md:pr-16 lg:pr-24 xl:pr-32">
      <motion.div
        className="w-full max-w-sm"
        initial={{ opacity: 0, x: 40, y: 20 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        suppressHydrationWarning
      >
        {/* Logo — single image */}
        {showLogo && (
          <motion.div
            className="flex items-center mb-6"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            suppressHydrationWarning
          >
            <Image
              src="/assets/images/app_logo.png"
              alt="App Logo"
              width={160}
              height={60}
              className="object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/assets/images/app_logo.png';
              }}
            />
          </motion.div>
        )}

        {/* Heading outside card */}
        <motion.div
          className="mb-9"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          suppressHydrationWarning
        >
          <h1
            className="text-4xl text-gray-800 mb-1"
            style={{
              fontFamily: "'Alluring Delight', 'Caveat', cursive",
              fontWeight: 400,
            }}
          >
            {heading}
          </h1>
          <p
            className="text-sm text-black"
            style={{
              fontFamily: "'Bradley Hand ITC', 'Bradley Hand', cursive",
            }}
          >
            {subheading}
          </p>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
          suppressHydrationWarning
          style={{
            paddingTop: '2px',
            paddingRight: '2px',
            paddingBottom: '2px',
            paddingLeft: '2px',
            borderRadius: '16px',
            background:
              'linear-gradient(135deg, #f59e0b, #ef4444, #8b5cf6, #3b82f6, #06b6d4, #10b981, #f59e0b)',
            boxShadow:
              '-20px 0 60px 10px rgba(251,191,36,0.45), 20px 0 60px 10px rgba(99,102,241,0.45), 0 -20px 60px 10px rgba(236,72,153,0.35), 0 20px 60px 10px rgba(16,185,129,0.35), 0 0 80px 20px rgba(59,130,246,0.25), 0 0 120px 40px rgba(139,92,246,0.18)',
          }}
        >
          <div
            className="bg-white rounded-2xl"
            style={{ borderRadius: '14px' }}
          >
            <div className="px-3 pt-4 pb-2">
              {children}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}