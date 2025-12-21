-- Adicionar política para permitir upload de logos na pasta logos/ do bucket avatars
CREATE POLICY "Usuários podem fazer upload de logos da empresa"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = 'logos'
  AND auth.uid() IS NOT NULL
);

-- Política para atualizar logos
CREATE POLICY "Usuários podem atualizar logos da empresa"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = 'logos'
  AND auth.uid() IS NOT NULL
);

-- Política para deletar logos
CREATE POLICY "Usuários podem deletar logos da empresa"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = 'logos'
  AND auth.uid() IS NOT NULL
);