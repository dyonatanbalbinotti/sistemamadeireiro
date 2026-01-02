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

    // Verificar se quem está chamando é admin
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar se é admin
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!roleData || roleData.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Apenas administradores podem criar usuários' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { email, password, nome, nomeEmpresa, planoId, planoMeses, planoValor, dataVencimento } = await req.json()

    // Criar usuário
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome }
    })

    if (createError) {
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Criar empresa para o usuário
    const { data: empresaData, error: empresaError } = await supabaseAdmin
      .from('empresas')
      .insert({
        user_id: newUser.user.id,
        nome_empresa: nomeEmpresa || nome,
        data_vencimento_anuidade: dataVencimento
      })
      .select()
      .single()

    if (empresaError) {
      console.error('Erro ao criar empresa:', empresaError)
    }

    // Criar profile vinculado à empresa
    await supabaseAdmin
      .from('profiles')
      .insert({
        id: newUser.user.id,
        nome,
        status: 'operacional',
        empresa_id: empresaData?.id || null
      })

    // Criar role padrão como 'user'
    await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role: 'user'
      })

    // Registrar no histórico de anuidades se tiver plano
    if (empresaData && planoId && planoValor) {
      await supabaseAdmin
        .from('historico_anuidades')
        .insert({
          empresa_id: empresaData.id,
          valor_pago: planoValor,
          data_vencimento_anterior: null,
          data_novo_vencimento: dataVencimento,
          observacao: `Plano inicial - ${planoMeses} mês(es) - Criação de usuário`
        })
    }

    return new Response(
      JSON.stringify({ success: true, user: newUser.user, empresa: empresaData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error?.message || 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
