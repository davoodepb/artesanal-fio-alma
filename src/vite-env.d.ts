/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SITE_URL?: string;
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_SUPABASE_AUTH_URL?: string;
  readonly VITE_SUPABASE_AUTH_PUBLISHABLE_KEY?: string;
  readonly VITE_ENABLE_SPLIT_AUTH?: string;
  readonly VITE_SUPABASE_PROJECT_ID?: string;
  readonly VITE_GA_MEASUREMENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
