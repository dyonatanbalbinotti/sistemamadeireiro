-- Fix function search_path for update_configuracoes_updated_at
CREATE OR REPLACE FUNCTION public.update_configuracoes_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Fix function search_path for update_pedidos_updated_at
CREATE OR REPLACE FUNCTION public.update_pedidos_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;