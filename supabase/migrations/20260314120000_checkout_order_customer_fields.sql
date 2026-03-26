-- Store full checkout customer data directly in orders for reliable admin/history access
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS customer_email TEXT,
ADD COLUMN IF NOT EXISTS customer_phone TEXT,
ADD COLUMN IF NOT EXISTS shipping_address_line1 TEXT,
ADD COLUMN IF NOT EXISTS shipping_city TEXT,
ADD COLUMN IF NOT EXISTS shipping_postal_code TEXT,
ADD COLUMN IF NOT EXISTS shipping_country TEXT,
ADD COLUMN IF NOT EXISTS customer_nif TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON public.orders (customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_shipping_city ON public.orders (shipping_city);
CREATE INDEX IF NOT EXISTS idx_orders_shipping_country ON public.orders (shipping_country);
