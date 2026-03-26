const DEFAULT_SITE_URL = 'https://fioealma.pt';

function normalizeUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

export const siteUrl = normalizeUrl(import.meta.env.VITE_SITE_URL || DEFAULT_SITE_URL);

export function toAbsoluteUrl(value: string): string {
  if (!value) return siteUrl;
  if (/^https?:\/\//i.test(value)) return value;
  return `${siteUrl}${value.startsWith('/') ? '' : '/'}${value}`;
}
