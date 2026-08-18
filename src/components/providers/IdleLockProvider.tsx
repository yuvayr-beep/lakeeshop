'use client';

import React, { useEffect, useRef, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { lockSession, unlockSession } from '@/redux/slices/authSlice';
import LockScreenModal from '@/components/auth/LockScreenModal';

interface IdleLockProviderProps {
  children: React.ReactNode;
  timeoutMinutes?: number;
}

const LAST_ACTIVE_KEY = 'idle_last_active_time';
const IS_LOCKED_KEY = 'idle_is_locked';

export default function IdleLockProvider({
  children,
  timeoutMinutes = 10,
}: IdleLockProviderProps) {
  const dispatch = useAppDispatch();
  const { isAuthenticated, isLocked } = useAppSelector((state) => state.auth);

  const timeoutMs = timeoutMinutes * 60 * 1000; // 10 minutes default
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const lockPortal = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(IS_LOCKED_KEY, 'true');
    }
    dispatch(lockSession());
  }, [dispatch]);

  const resetTimer = useCallback(() => {
    const now = Date.now();
    if (typeof window !== 'undefined') {
      localStorage.setItem(LAST_ACTIVE_KEY, now.toString());
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      lockPortal();
    }, timeoutMs);
  }, [lockPortal, timeoutMs]);

  // Sync across tabs via window 'storage' event
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === IS_LOCKED_KEY) {
        if (e.newValue === 'true' && !isLocked) {
          dispatch(lockSession());
        } else if (e.newValue === 'false' && isLocked) {
          dispatch(unlockSession());
        }
      } else if (e.key === LAST_ACTIVE_KEY && e.newValue) {
        const lastActiveTime = parseInt(e.newValue, 10);
        const elapsed = Date.now() - lastActiveTime;
        if (elapsed >= timeoutMs) {
          lockPortal();
        } else {
          // Reset local timer based on latest active timestamp across all tabs
          if (timerRef.current) clearTimeout(timerRef.current);
          const remaining = timeoutMs - elapsed;
          timerRef.current = setTimeout(() => {
            lockPortal();
          }, remaining);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [isAuthenticated, isLocked, timeoutMs, lockPortal, dispatch]);

  useEffect(() => {
    if (!isAuthenticated) {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (typeof window !== 'undefined') {
        localStorage.removeItem(IS_LOCKED_KEY);
        localStorage.removeItem('isLocked');
      }
      return;
    }

    // 1. Check if another tab has already locked the portal
    if (typeof window !== 'undefined') {
      const storedLocked = localStorage.getItem(IS_LOCKED_KEY);
      if (storedLocked === 'true' && !isLocked) {
        dispatch(lockSession());
        return;
      }
    }

    if (isLocked) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    // 2. Check elapsed time since last activity across all tabs
    const checkElapsed = () => {
      const stored = localStorage.getItem(LAST_ACTIVE_KEY);
      if (stored) {
        const lastActiveTime = parseInt(stored, 10);
        const elapsed = Date.now() - lastActiveTime;
        if (elapsed >= timeoutMs) {
          lockPortal();
          return;
        } else {
          if (timerRef.current) clearTimeout(timerRef.current);
          const remaining = timeoutMs - elapsed;
          timerRef.current = setTimeout(() => {
            lockPortal();
          }, remaining);
          return;
        }
      }
      resetTimer();
    };

    checkElapsed();

    // 3. Periodic check every 10 seconds for background tabs
    const intervalId = setInterval(() => {
      const storedLocked = localStorage.getItem(IS_LOCKED_KEY);
      if (storedLocked === 'true' && !isLocked) {
        dispatch(lockSession());
        return;
      }
      const storedTime = localStorage.getItem(LAST_ACTIVE_KEY);
      if (storedTime) {
        const lastActiveTime = parseInt(storedTime, 10);
        if (Date.now() - lastActiveTime >= timeoutMs) {
          lockPortal();
        }
      }
    }, 10000);

    // Global Keyboard Shortcut for manual locking (Alt + L)
    const handleShortcutKeyDown = (e: KeyboardEvent) => {
      const isLKey = e.key === 'l' || e.key === 'L' || e.code === 'KeyL';
      if (isLKey && (e.altKey || ((e.ctrlKey || e.metaKey) && e.shiftKey))) {
        e.preventDefault();
        lockPortal();
      }
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    // Throttle user activity events (max 1 update per second to localStorage)
    let throttleTimeout: NodeJS.Timeout | null = null;
    const handleUserActivity = () => {
      if (throttleTimeout) return;
      throttleTimeout = setTimeout(() => {
        throttleTimeout = null;
        resetTimer();
      }, 1000);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkElapsed();
      }
    };

    window.addEventListener('keydown', handleShortcutKeyDown);
    events.forEach((evt) => {
      window.addEventListener(evt, handleUserActivity, { passive: true });
    });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (throttleTimeout) clearTimeout(throttleTimeout);
      window.removeEventListener('keydown', handleShortcutKeyDown);
      events.forEach((evt) => {
        window.removeEventListener(evt, handleUserActivity);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, isLocked, timeoutMs, resetTimer, lockPortal, dispatch]);

  return (
    <>
      {children}
      {isAuthenticated && isLocked && <LockScreenModal />}
    </>
  );
}
