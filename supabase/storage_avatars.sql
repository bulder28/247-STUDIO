-- ============================================================================
-- 247 STUDIO — Bucket de Fotos de Perfil ('avatars') con seguridad estricta
-- Solo permite JPEG, PNG y WebP (sin SVG para evitar XSS), máx. 2 MB.
-- Ejecutar en Supabase -> SQL Editor -> New query
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
CREATE POLICY "avatars_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_upload_own_or_admin" ON storage.objects;
CREATE POLICY "avatars_upload_own_or_admin" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND (
      public.get_my_role() = 'admin'
      OR name = auth.uid()::text || '.webp'
    )
  );

DROP POLICY IF EXISTS "avatars_update_own_or_admin" ON storage.objects;
CREATE POLICY "avatars_update_own_or_admin" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND (
      public.get_my_role() = 'admin'
      OR name = auth.uid()::text || '.webp'
    )
  );

