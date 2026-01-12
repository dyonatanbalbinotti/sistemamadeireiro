import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar se é admin ou dono de empresa
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()

    const isAdmin = roleData?.role === 'admin'

    const { employeeId, newPassword } = await req.json()

    if (!employeeId || !newPassword) {
      return new Response(
        JSON.stringify({ error: 'ID do funcionário e nova senha são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Se não for admin, verificar se o funcionário pertence à empresa do usuário
    if (!isAdmin) {
      // Buscar empresa do usuário que está fazendo a requisição
      const { data: empresaData } = await supabaseAdmin
        .from('empresas')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!empresaData) {
        return new Response(
          JSON.stringify({ error: 'Você não tem permissão para alterar senhas' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Verificar se o funcionário pertence à empresa
      const { data: employeeProfile } = await supabaseAdmin
        .from('profiles')
        .select('empresa_id')
        .eq('id', employeeId)
        .maybeSingle()

      if (!employeeProfile || employeeProfile.empresa_id !== empresaData.id) {
        return new Response(
          JSON.stringify({ error: 'Este funcionário não pertence à sua empresa' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    console.log('Resetting password for employee:', employeeId)

    // Atualizar senha do funcionário
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      employeeId,
      { password: newPassword }
    )

    if (updateError) {
      console.error('Update password error:', updateError)
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Password reset successful')

    return new Response(
      JSON.stringify({ success: true, message: 'Senha atualizada com sucesso' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: error?.message || 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
