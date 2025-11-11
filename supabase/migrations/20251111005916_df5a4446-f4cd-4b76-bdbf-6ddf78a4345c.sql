-- Converter todos os roles 'empresa' e 'funcionario' para 'user'
UPDATE user_roles 
SET role = 'user'::app_role 
WHERE role::text IN ('empresa', 'funcionario');