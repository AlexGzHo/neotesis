import { useState, useEffect } from 'react';

const QUOTA_LIMIT = 3;
const QUOTA_PERIOD = 24 * 60 * 60 * 1000; // 24 hours in ms
const STORAGE_KEY = 'neotesis_quota';

export const useQuota = () => {
  const [quota, setQuota] = useState({
    count: 0,
    firstUsed: null
  });
  
  const [timeRemaining, setTimeRemaining] = useState(0);

  // Load from storage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        checkReset(parsed);
      } catch (e) {
        console.error("Error parsing quota:", e);
        resetQuota();
      }
    }
  }, []);

  // Timer for countdown
  useEffect(() => {
    if (!quota.firstUsed) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, (quota.firstUsed + QUOTA_PERIOD) - Date.now());
      setTimeRemaining(remaining);
      
      if (remaining === 0 && quota.count > 0) {
        resetQuota();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [quota]);

  const checkReset = (currentQuota) => {
    if (!currentQuota.firstUsed) {
      setQuota(currentQuota);
      return;
    }

    const now = Date.now();
    if (now - currentQuota.firstUsed > QUOTA_PERIOD) {
      resetQuota();
    } else {
      setQuota(currentQuota);
      setTimeRemaining(Math.max(0, (currentQuota.firstUsed + QUOTA_PERIOD) - now));
    }
  };

  const resetQuota = () => {
    const newQuota = { count: 0, firstUsed: null };
    setQuota(newQuota);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newQuota));
    setTimeRemaining(0);
  };

  const incrementQuota = () => {
    const now = Date.now();
    let newQuota = { ...quota };

    if (newQuota.count === 0) {
      newQuota.firstUsed = now;
    }

    newQuota.count += 1;
    setQuota(newQuota);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newQuota));
    
    // Recalculate time immediately
    if (newQuota.firstUsed) {
        setTimeRemaining(Math.max(0, (newQuota.firstUsed + QUOTA_PERIOD) - now));
    }
  };

  const isAvailable = quota.count < QUOTA_LIMIT;
  const remaining = Math.max(0, QUOTA_LIMIT - quota.count);
  const percentUsed = (quota.count / QUOTA_LIMIT) * 100;

  return {
    quota,
    isAvailable,
    remaining,
    percentUsed,
    timeRemaining,
    incrementQuota,
    resetQuota
  };
};
