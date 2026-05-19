'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTimeOfDay } from '@/hooks/useTimeOfDay';

interface DynamicBackgroundProps {
  children: React.ReactNode;
}

const themes = {
  morning: {
    image: "url('/assets/images/morning.png')",
    overlay: 'rgba(255,237,213,0.15)',
  },
  afternoon: {
    image: "url('/assets/images/afternoon.png')",
    overlay: 'rgba(224,242,254,0.2)',
  },
  evening: {
    image: "url('/assets/images/evening.png')",
    overlay: 'rgba(15,12,41,0.3)',
  },
  night: {
    image: "url('/assets/images/night.png')",
    overlay: 'rgba(0,0,0,0.5)',
  },
};

export default function DynamicBackground({ children }: DynamicBackgroundProps) {
  const timeOfDay = useTimeOfDay();
  const theme = themes[timeOfDay];

  return (
    <div className="min-h-screen w-full relative overflow-hidden">
      {/* Animated base background image */}
      <AnimatePresence mode="wait">
        <motion.div
          key={timeOfDay}
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: theme.image }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
        />
      </AnimatePresence>

      {/* Blur overlay behind auth card area */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: theme.overlay }}
      />

      {/* Main content */}
      <div className="relative z-10 min-h-screen">{children}</div>
    </div>
  );
}