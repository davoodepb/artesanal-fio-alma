-- ============================================================
-- User Management, Presence & Chat Moderation
-- ============================================================

-- 1. Add user management columns to profiles
-- ============================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;

-- 2. Update handle_new_user trigger to also store email
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, full_name, email)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.email);

    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'customer');

    RETURN NEW;
END;
$$;

-- 3. Backfill emails from auth.users into profiles
-- ============================================================
CREATE OR REPLACE FUNCTION public.backfill_profile_emails()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.profiles p
    SET email = u.email
    FROM auth.users u
    WHERE p.user_id = u.id
    AND (p.email IS NULL OR p.email = '');
END;
$$;

-- Execute backfill immediately
SELECT public.backfill_profile_emails();

-- Drop the one-time function
DROP FUNCTION IF EXISTS public.backfill_profile_emails();

-- 4. Presence: update_last_seen RPC (callable by authenticated users)
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_last_seen()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public.profiles
    SET last_seen = now()
    WHERE user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_last_seen() TO authenticated;

-- 5. Admin: block/unblock user
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_block_user(target_user_id UUID, block BOOLEAN DEFAULT true)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Unauthorized: admin role required';
    END IF;

    UPDATE public.profiles
    SET is_blocked = block,
        blocked_at = CASE WHEN block THEN now() ELSE NULL END
    WHERE user_id = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_block_user(UUID, BOOLEAN) TO authenticated;

-- 6. Admin: delete user (cascades via FK)
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Unauthorized: admin role required';
    END IF;

    -- Prevent deleting other admins
    IF public.has_role(target_user_id, 'admin') THEN
        RAISE EXCEPTION 'Cannot delete an admin user';
    END IF;

    -- Delete from auth.users — cascades to profiles, user_roles, orders (SET NULL)
    DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID) TO authenticated;

-- 7. Admin: delete a single chat message
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_delete_chat_message(message_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Unauthorized: admin role required';
    END IF;

    DELETE FROM public.chat_messages WHERE id = message_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_delete_chat_message(UUID) TO authenticated;

-- 8. Admin: clear all messages in a conversation
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_clear_conversation(conv_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Unauthorized: admin role required';
    END IF;

    DELETE FROM public.chat_messages WHERE conversation_id = conv_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_clear_conversation(UUID) TO authenticated;

-- 9. Admin: close/block a conversation
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_close_conversation(conv_id UUID, new_status TEXT DEFAULT 'closed')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
        RAISE EXCEPTION 'Unauthorized: admin role required';
    END IF;

    UPDATE public.chat_conversations
    SET status = new_status, updated_at = now()
    WHERE id = conv_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_close_conversation(UUID, TEXT) TO authenticated;

-- 10. Ensure chat-images bucket exists (idempotent)
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-images', 'chat-images', true)
ON CONFLICT (id) DO NOTHING;

-- Idempotent storage policies for chat-images
DO $$
BEGIN
    -- Public read
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Chat images are publicly accessible' AND tablename = 'objects'
    ) THEN
        CREATE POLICY "Chat images are publicly accessible"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'chat-images');
    END IF;

    -- Authenticated upload
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can upload chat images' AND tablename = 'objects'
    ) THEN
        CREATE POLICY "Authenticated users can upload chat images"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = 'chat-images');
    END IF;

    -- Admin can delete any chat image
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'Admins can delete chat images' AND tablename = 'objects'
    ) THEN
        CREATE POLICY "Admins can delete chat images"
        ON storage.objects FOR DELETE
        TO authenticated
        USING (bucket_id = 'chat-images' AND public.has_role(auth.uid(), 'admin'::public.app_role));
    END IF;
END $$;

-- 11. Index for last_seen queries
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_profiles_last_seen ON public.profiles (last_seen DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_profiles_is_blocked ON public.profiles (is_blocked) WHERE is_blocked = true;
