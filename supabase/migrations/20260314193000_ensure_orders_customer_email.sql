-- Ensure checkout can persist customer email directly in orders.
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS customer_email TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON public.orders (customer_email);
