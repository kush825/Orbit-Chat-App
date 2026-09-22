import { useEffect, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export const useAppTimer = () => {
  const { user } = useAuth();
  const PING_INTERVAL_MS = 60000; // 60 seconds
  
  const lastActiveTimeRef = useRef(Date.now());
  const activeSecondsRef = useRef(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!user) return; // Only track logged-in users

    const handleActivity = () => {
      lastActiveTimeRef.current = Date.now();
    };

    // Listen for user activity
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('scroll', handleActivity);
    window.addEventListener('click', handleActivity);

    // Set up the interval to ping backend
    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const isWindowFocused = document.hasFocus();
      
      // If window is focused AND user was active in the last 2 minutes
      if (isWindowFocused && (now - lastActiveTimeRef.current < 120000)) {
        // Send ping for the last interval duration (60 seconds)
        api.put('/users/usage-ping', { durationSeconds: PING_INTERVAL_MS / 1000 })
          .catch(err => console.error('Failed to update app usage time', err));
      }
    }, PING_INTERVAL_MS);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('click', handleActivity);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user]);

  return null; // This hook doesn't return anything, just runs in background
};
