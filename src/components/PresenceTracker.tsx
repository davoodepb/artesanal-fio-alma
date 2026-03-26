import { usePresence } from '@/hooks/usePresence';

/**
 * Invisible component that tracks user presence (last_seen).
 * Must be rendered inside AuthProvider.
 */
export function PresenceTracker() {
  usePresence();
  return null;
}
