-- Newsletter subscribers table
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL UNIQUE,
  subscribed_at timestamptz DEFAULT now(),
  unsubscribed_at timestamptz DEFAULT NULL,
  is_active boolean DEFAULT true
);

-- RLS
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (subscribe)
CREATE POLICY "Anyone can subscribe to newsletter" ON public.newsletter_subscribers
  FOR INSERT WITH CHECK (true);

-- Only admins can view subscribers
CREATE POLICY "Admins can view subscribers" ON public.newsletter_subscribers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- NIF field on profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nif text DEFAULT NULL;
