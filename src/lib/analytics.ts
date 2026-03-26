const COOKIE_CONSENT_KEY = 'fioealma_cookie_consent';

interface ConsentState {
  essential: boolean;
  analytics: boolean;
  timestamp: string;
}

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let analyticsBootstrapped = false;

export function hasAnalyticsConsent(): boolean {
  try {
    const raw = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as Partial<ConsentState>;
    return parsed.analytics === true;
  } catch {
    return false;
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load analytics script'));
    document.head.appendChild(script);
  });
}

export async function initAnalyticsIfAllowed(): Promise<boolean> {
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (!measurementId || !hasAnalyticsConsent()) {
    return false;
  }

  if (!analyticsBootstrapped) {
    await loadScript(`https://www.googletagmanager.com/gtag/js?id=${measurementId}`);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer.push(args);
    };

    window.gtag('js', new Date());
    window.gtag('config', measurementId, {
      anonymize_ip: true,
      send_page_view: false,
    });

    analyticsBootstrapped = true;
  }

  return true;
}

export function trackPageView(pathname: string, search = ''): void {
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (!measurementId || !window.gtag || !hasAnalyticsConsent()) {
    return;
  }

  window.gtag('event', 'page_view', {
    page_path: `${pathname}${search}`,
    page_location: window.location.href,
    page_title: document.title,
    send_to: measurementId,
  });
}
