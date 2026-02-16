
-- Remove the old check constraint and add updated one including supervisor_geral
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_cargo_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_cargo_check CHECK (cargo IN ('gerente', 'financeiro', 'almoxarifado', 'supervisor_geral'));
