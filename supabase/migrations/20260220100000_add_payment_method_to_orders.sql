-- Add payment_method column to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS payment_method text DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.orders.payment_method IS 'Payment method used: mbway, card, transfer, multibanco, or null if not yet specified';
