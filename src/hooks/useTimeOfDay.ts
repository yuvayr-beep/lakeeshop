'use client';
import { useState, useEffect } from 'react';
import type { TimeOfDay } from '@/types/auth';

export function useTimeOfDay(): TimeOfDay {
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('morning');

  useEffect(() => {
    const getTimeOfDay = (): TimeOfDay => {
      const hour = new Date().getHours();
      if (hour >= 5 && hour < 12) return 'morning';
      if (hour >= 12 && hour < 17) return 'afternoon';
      if (hour >= 17 && hour < 20) return 'evening';
      return 'night';
    };

    setTimeOfDay(getTimeOfDay());

    const interval = setInterval(() => {
      setTimeOfDay(getTimeOfDay());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  return timeOfDay;
}