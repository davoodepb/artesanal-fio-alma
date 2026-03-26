import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const PING_INTERVAL_MS = 60_000; // Update last_seen every 60 seconds

/**
 * Hook that periodically updates the authenticated user's `last_seen` timestamp
 * in the profiles table. This is used by admins to see who is online.
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

    const ping = async () => {
      try {
        await supabase.rpc('update_last_seen');
      } catch {
        // Silently ignore — presence is non-critical
      }
    };

    // Ping immediately, then on interval
    ping();
    intervalRef.current = setInterval(ping, PING_INTERVAL_MS);

    // Also ping on visibility change (user returns to tab)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        ping();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [user]);
}
