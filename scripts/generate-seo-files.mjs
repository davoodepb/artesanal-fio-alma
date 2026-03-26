import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DEFAULT_SITE_URL = 'https://fioealma.pt';
const now = new Date().toISOString();

const staticPages = [
  { path: '/', changefreq: 'daily', priority: '1.0' },
  { path: '/products', changefreq: 'daily', priority: '0.9' },
  { path: '/categories', changefreq: 'weekly', priority: '0.8' },
  { path: '/blog', changefreq: 'weekly', priority: '0.8' },
  { path: '/about', changefreq: 'monthly', priority: '0.7' },
  { path: '/contact', changefreq: 'monthly', priority: '0.6' },
  { path: '/search', changefreq: 'weekly', priority: '0.5' },
  { path: '/privacy', changefreq: 'monthly', priority: '0.3' },
  { path: '/terms', changefreq: 'monthly', priority: '0.3' },
  { path: '/returns', changefreq: 'monthly', priority: '0.3' },
];

const fallbackCategorySlugs = [
  'arranjos-florais',
  'bijuteria',
  'bordados',
  'ceramica',
  'costura-criativa',
  'croche',
  'pinturas-em-tecido',
  'tricot',
  'diversos',
];

const blogSlugs = [
  'como-cuidar-pecas-croche',
  'presentes-artesanais-dia-mae',
  'artesanato-sustentavel',
  'tendencias-decoracao-artesanal-2026',
  'croche-artesanal-especial',
  'guia-presentes-artesanais',
  'historia-artesas-fio-alma',
  'ceramica-artesanal-argila-peca-unica',
  'bonecos-artesanais-presentes',
  'artesanato-portugues-tradicao',
];

function normalizeSiteUrl(input) {
  return (input || DEFAULT_SITE_URL).replace(/\/+$/, '');
}

function xmlEscape(input) {
  return String(input)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

async function fetchSupabaseRows({ base, key, table, select, filters = '' }) {
  if (!base || !key) return [];

  const query = new URL(`${base}/rest/v1/${table}`);
  query.searchParams.set('select', select);
  if (filters) {
    for (const segment of filters.split('&')) {
      const [k, v] = segment.split('=');
      if (k && v) query.searchParams.set(k, v);
    }
  }

  const response = await fetch(query, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase request failed for ${table} (${response.status})`);
  }

  return response.json();
}

function buildUrlNode({ loc, changefreq, priority, lastmod }) {
  return [
    '  <url>',
    `    <loc>${xmlEscape(loc)}</loc>`,
    `    <lastmod>${xmlEscape(lastmod || now)}</lastmod>`,
    `    <changefreq>${xmlEscape(changefreq)}</changefreq>`,
    `    <priority>${xmlEscape(priority)}</priority>`,
    '  </url>',
  ].join('\n');
}

async function run() {
  const siteUrl = normalizeSiteUrl(process.env.VITE_SITE_URL || process.env.SITE_URL);
  const publicDir = path.resolve(process.cwd(), 'public');
  const sitemapPath = path.join(publicDir, 'sitemap.xml');
  const robotsPath = path.join(publicDir, 'robots.txt');

  const supabaseBase = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  let categories = [];
  let products = [];

  try {
    categories = await fetchSupabaseRows({
      base: supabaseBase,
      key: supabaseKey,
      table: 'categories',
      select: 'slug,updated_at',
      filters: 'order=updated_at.desc.nullslast',
    });
  } catch {
    categories = fallbackCategorySlugs.map((slug) => ({ slug, updated_at: now }));
  }

  const validCategories = (Array.isArray(categories) ? categories : []).filter(
    (item) => typeof item?.slug === 'string' && item.slug.trim().length > 0
  );

  categories =
    validCategories.length > 0
      ? validCategories
      : fallbackCategorySlugs.map((slug) => ({ slug, updated_at: now }));

  try {
    products = await fetchSupabaseRows({
      base: supabaseBase,
      key: supabaseKey,
      table: 'products',
      select: 'slug,updated_at,is_active',
      filters: 'is_active=eq.true&order=updated_at.desc.nullslast',
    });
  } catch {
    products = [];
  }

  const entries = [
    ...staticPages.map((page) => ({
      loc: `${siteUrl}${page.path}`,
      changefreq: page.changefreq,
      priority: page.priority,
      lastmod: now,
    })),
    ...categories
      .filter((item) => item?.slug)
      .map((item) => ({
        loc: `${siteUrl}/categoria/${item.slug}`,
        changefreq: 'weekly',
        priority: '0.85',
        lastmod: item.updated_at || now,
      })),
    ...products
      .filter((item) => item?.slug)
      .map((item) => ({
        loc: `${siteUrl}/product/${item.slug}`,
        changefreq: 'weekly',
        priority: '0.8',
        lastmod: item.updated_at || now,
      })),
    ...blogSlugs.map((slug) => ({
      loc: `${siteUrl}/blog/${slug}`,
      changefreq: 'monthly',
      priority: '0.6',
      lastmod: now,
    })),
  ];

  const uniqueEntries = Array.from(new Map(entries.map((item) => [item.loc, item])).values());

  const sitemapXml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...uniqueEntries.map(buildUrlNode),
    '</urlset>',
    '',
  ].join('\n');

  const robotsTxt = [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${siteUrl}/sitemap.xml`,
    '',
  ].join('\n');

  await mkdir(publicDir, { recursive: true });
  await writeFile(sitemapPath, sitemapXml, 'utf8');
  await writeFile(robotsPath, robotsTxt, 'utf8');

  console.log(`SEO files generated: ${sitemapPath} and ${robotsPath}`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
