-- Strengthen stock reservation RPCs used by checkout.
-- decrement_stock now enforces availability and fails atomically when stock is insufficient.

CREATE OR REPLACE FUNCTION public.decrement_stock(p_product_id UUID, p_quantity INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_stock INTEGER;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'INVALID_QUANTITY';
  END IF;

  SELECT stock
  INTO current_stock
  FROM public.products
  WHERE id = p_product_id
  FOR UPDATE;

  IF current_stock IS NULL THEN
    RAISE EXCEPTION 'PRODUCT_NOT_FOUND';
  END IF;

  IF current_stock < p_quantity THEN
    RAISE EXCEPTION 'INSUFFICIENT_STOCK';
  END IF;

  UPDATE public.products
  SET stock = stock - p_quantity,
      updated_at = now()
  WHERE id = p_product_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_stock(p_product_id UUID, p_quantity INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'INVALID_QUANTITY';
  END IF;

  UPDATE public.products
  SET stock = stock + p_quantity,
      updated_at = now()
  WHERE id = p_product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PRODUCT_NOT_FOUND';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.decrement_stock(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_stock(UUID, INTEGER) TO authenticated;
