-- ============================================================
-- 1. Create chat-images storage bucket with RLS
-- ============================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-images', 'chat-images', true)
ON CONFLICT (id) DO NOTHING;

-- Anyone can view chat images (bucket is public)
CREATE POLICY "Chat images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-images');

-- Authenticated users can upload chat images
CREATE POLICY "Authenticated users can upload chat images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-images');

-- Users can delete their own uploaded chat images
CREATE POLICY "Users can delete own chat images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'chat-images' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ============================================================
-- 2. RPC function for stock decrement (SECURITY DEFINER)
--    Allows customers to decrement stock without direct UPDATE on products
-- ============================================================

CREATE OR REPLACE FUNCTION public.decrement_stock(p_product_id UUID, p_quantity INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.products
  SET stock = GREATEST(0, stock - p_quantity),
      updated_at = now()
  WHERE id = p_product_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.decrement_stock(UUID, INTEGER) TO authenticated;

-- ============================================================
-- 3. Ensure chat tables have proper RLS policies
--    (Tables may have been created via dashboard without policies)
-- ============================================================

-- Enable RLS (idempotent)
ALTER TABLE IF EXISTS public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Chat conversations: customers can see/create their own, admin sees all
DO $$
BEGIN
  -- Drop existing policies if they exist to avoid conflicts
  DROP POLICY IF EXISTS "Users can view own conversations" ON public.chat_conversations;
  DROP POLICY IF EXISTS "Users can create own conversations" ON public.chat_conversations;
  DROP POLICY IF EXISTS "Users can update own conversations" ON public.chat_conversations;
  DROP POLICY IF EXISTS "Admins can manage all conversations" ON public.chat_conversations;

  CREATE POLICY "Users can view own conversations" ON public.chat_conversations
    FOR SELECT TO authenticated USING (auth.uid() = customer_id);

  CREATE POLICY "Users can create own conversations" ON public.chat_conversations
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = customer_id);

  CREATE POLICY "Users can update own conversations" ON public.chat_conversations
    FOR UPDATE TO authenticated USING (auth.uid() = customer_id);

  CREATE POLICY "Admins can manage all conversations" ON public.chat_conversations
    FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
END $$;

-- Chat messages: users can see/create messages in their conversations, admin sees all
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view messages in own conversations" ON public.chat_messages;
  DROP POLICY IF EXISTS "Users can send messages in own conversations" ON public.chat_messages;
  DROP POLICY IF EXISTS "Users can update messages in own conversations" ON public.chat_messages;
  DROP POLICY IF EXISTS "Admins can manage all messages" ON public.chat_messages;

  CREATE POLICY "Users can view messages in own conversations" ON public.chat_messages
    FOR SELECT TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.chat_conversations
        WHERE chat_conversations.id = chat_messages.conversation_id
        AND chat_conversations.customer_id = auth.uid()
      )
    );

  CREATE POLICY "Users can send messages in own conversations" ON public.chat_messages
    FOR INSERT TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.chat_conversations
        WHERE chat_conversations.id = chat_messages.conversation_id
        AND chat_conversations.customer_id = auth.uid()
      )
    );

  CREATE POLICY "Users can update messages in own conversations" ON public.chat_messages
    FOR UPDATE TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.chat_conversations
        WHERE chat_conversations.id = chat_messages.conversation_id
        AND chat_conversations.customer_id = auth.uid()
      )
    );

  CREATE POLICY "Admins can manage all messages" ON public.chat_messages
    FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));
END $$;
