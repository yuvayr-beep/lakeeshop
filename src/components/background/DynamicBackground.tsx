'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTimeOfDay } from '@/hooks/useTimeOfDay';
import WeatherWidget from './WeatherWidget';

interface DynamicBackgroundProps {
  children: React.ReactNode;
}

const themes = {
  morning: {
    video: 'https://lakeeshop.com/videos/Earlymorning.mp4',
    overlay: 'rgba(255,237,213,0.15)',
  },
  afternoon: {
    video: 'https://lakeeshop.com/videos/afternoon.mp4',
    overlay: 'rgba(224,242,254,0.2)',
  },
  evening: {
    video: 'https://lakeeshop.com/videos/evening.mp4',
    overlay: 'rgba(15,12,41,0.3)',
  },
  night: {
    video: 'https://lakeeshop.com/videos/night.mp4',
    overlay: 'rgba(0,0,0,0.5)',
  },
};

export default function DynamicBackground({ children }: DynamicBackgroundProps) {
  const timeOfDay = useTimeOfDay();
  const theme = themes[timeOfDay];

  return (
    <div className="min-h-screen w-full relative overflow-hidden">
      {/* Animated base background video */}
      <AnimatePresence mode="wait">
        <motion.video
          key={timeOfDay}
          className="absolute inset-0 w-full h-full object-cover"
          src={theme.video}
          autoPlay
          loop
          muted
          playsInline
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

      {/* Floating weather widget in top left */}
      <div className="absolute top-6 left-6 z-20">
        <WeatherWidget />
      </div>

      {/* Main content */}
      <div className="relative z-10 min-h-screen">{children}</div>
    </div>
  );
}