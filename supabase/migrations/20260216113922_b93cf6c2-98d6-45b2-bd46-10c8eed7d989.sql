
-- Add invoice_number column to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS invoice_number TEXT UNIQUE;

-- Create a sequence for invoice numbers
CREATE SEQUENCE IF NOT EXISTS public.invoice_number_seq START WITH 1001;

-- Create function to auto-generate invoice number on order creation
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.invoice_number IS NULL THEN
    NEW.invoice_number := 'FAS-' || LPAD(nextval('public.invoice_number_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS set_invoice_number ON public.orders;
CREATE TRIGGER set_invoice_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_invoice_number();

-- Generate invoice numbers for existing orders that don't have one
UPDATE public.orders 
SET invoice_number = 'FAS-' || LPAD(nextval('public.invoice_number_seq')::TEXT, 6, '0')
WHERE invoice_number IS NULL;
