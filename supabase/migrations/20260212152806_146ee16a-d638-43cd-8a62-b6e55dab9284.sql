
-- Allow empresa owners to update profiles of employees linked to their company
CREATE POLICY "Donos podem atualizar perfis de funcionarios da sua empresa"
ON public.profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM empresas
    WHERE empresas.id = profiles.empresa_id
    AND empresas.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM empresas
    WHERE empresas.id = profiles.empresa_id
    AND empresas.user_id = auth.uid()
  )
);
