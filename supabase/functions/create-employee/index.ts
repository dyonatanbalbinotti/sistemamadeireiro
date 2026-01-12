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

    // Verificar se quem está chamando é dono da empresa ou admin
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      console.error('Auth error:', authError)
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

    // Buscar empresa do usuário
    const { data: empresaData, error: empresaError } = await supabaseAdmin
      .from('empresas')
      .select('id, user_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!isAdmin && !empresaData) {
      return new Response(
        JSON.stringify({ error: 'Você não tem permissão para criar funcionários' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { email, password, nome, empresaId } = await req.json()

    // Determinar qual empresa usar
    const targetEmpresaId = isAdmin && empresaId ? empresaId : empresaData?.id

    if (!targetEmpresaId) {
      return new Response(
        JSON.stringify({ error: 'Empresa não encontrada' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Creating employee:', { email, nome, empresaId: targetEmpresaId })

    // Criar usuário - o trigger handle_new_user vai criar o profile e o user_role automaticamente
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome }
    })

    if (createError) {
      console.error('Create user error:', createError)
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User created:', newUser.user.id)

    // Atualizar profile para vincular à empresa e definir como funcionário
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        empresa_id: targetEmpresaId
      })
      .eq('id', newUser.user.id)

    if (profileError) {
      console.error('Update profile error:', profileError)
    }

    // Atualizar role para funcionario
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .update({ role: 'funcionario' })
      .eq('user_id', newUser.user.id)

    if (roleError) {
      console.error('Update role error:', roleError)
    }

    console.log('Employee creation complete')

    return new Response(
      JSON.stringify({ success: true, user: newUser.user }),
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
