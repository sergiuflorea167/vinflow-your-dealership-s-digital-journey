-- Private Dokumentenablage für Vorgänge und To-Dos.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('vinflow-documents', 'vinflow-documents', false, 20971520)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit;

DROP POLICY IF EXISTS "Dokumente: Org-Mitglieder lesen" ON storage.objects;
CREATE POLICY "Dokumente: Org-Mitglieder lesen"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'vinflow-documents'
  AND (storage.foldername(name))[1] = public.get_user_org(auth.uid())::text
);

DROP POLICY IF EXISTS "Dokumente: Org-Mitglieder anlegen" ON storage.objects;
CREATE POLICY "Dokumente: Org-Mitglieder anlegen"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'vinflow-documents'
  AND (storage.foldername(name))[1] = public.get_user_org(auth.uid())::text
  AND owner_id = auth.uid()::text
);

DROP POLICY IF EXISTS "Dokumente: Org-Mitglieder aktualisieren" ON storage.objects;
CREATE POLICY "Dokumente: Org-Mitglieder aktualisieren"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'vinflow-documents'
  AND (storage.foldername(name))[1] = public.get_user_org(auth.uid())::text
)
WITH CHECK (
  bucket_id = 'vinflow-documents'
  AND (storage.foldername(name))[1] = public.get_user_org(auth.uid())::text
);

DROP POLICY IF EXISTS "Dokumente: Org-Mitglieder löschen" ON storage.objects;
CREATE POLICY "Dokumente: Org-Mitglieder löschen"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'vinflow-documents'
  AND (storage.foldername(name))[1] = public.get_user_org(auth.uid())::text
);
