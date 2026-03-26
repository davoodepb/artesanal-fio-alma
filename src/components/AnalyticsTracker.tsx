import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { initAnalyticsIfAllowed, trackPageView } from '@/lib/analytics';

function dispatchAnalyticsState(enabled: boolean) {
  window.dispatchEvent(
    new CustomEvent('analytics-ready-state', {
      detail: { enabled },
    })
  );
}

export function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    let mounted = true;

    const syncAnalytics = async () => {
      const enabled = await initAnalyticsIfAllowed();
      if (mounted) {
        dispatchAnalyticsState(enabled);
      }
    };

    syncAnalytics();

    const onConsentChange = () => {
      syncAnalytics().catch(() => dispatchAnalyticsState(false));
    };

    window.addEventListener('cookie-consent-updated', onConsentChange);

    return () => {
      mounted = false;
      window.removeEventListener('cookie-consent-updated', onConsentChange);
    };
  }, []);

  useEffect(() => {
    trackPageView(location.pathname, location.search);
  }, [location.pathname, location.search]);

  return null;
}
