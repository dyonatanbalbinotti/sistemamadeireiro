-- Permitir que donos de empresa vejam perfis dos funcionários vinculados
CREATE POLICY "Donos podem ver perfis de funcionários da empresa" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.empresas
    WHERE empresas.user_id = auth.uid()
      AND empresas.id = profiles.empresa_id
  )
);