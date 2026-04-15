import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ensureUserDocument, updatePresence } from '@/lib/firebase/userService';

const PING_INTERVAL_MS = 60_000; // Update last_seen every 60 seconds

/**
 * Hook that updates user presence in Firestore users collection.
 */
export function usePresence() {
  const { user } = useAuth();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const pingOnline = async () => {
      try {
        await ensureUserDocument(user.raw);
        await updatePresence(true);
      } catch {
        // Silently ignore — presence is non-critical
      }
    };

    const pingOffline = async () => {
      try {
        await updatePresence(false);
      } catch {
        // Silently ignore — presence is non-critical
      }
    };

    // Ping immediately, then on interval
    pingOnline();
    intervalRef.current = setInterval(pingOnline, PING_INTERVAL_MS);

    // Also ping on visibility change (user returns to tab)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        pingOnline();
      } else {
        pingOffline();
      }
    };

    const handleBeforeUnload = () => {
      pingOffline();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      pingOffline();
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user]);
}
