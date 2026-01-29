import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function generateToken(): string {
  // Gerar código de 6 dígitos
  return Math.floor(100000 + Math.random() * 900000).toString();
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

    const { email } = await req.json()

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar se o email existe no sistema
    const { data: users, error: userError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (userError) {
      console.error('Error listing users:', userError)
      return new Response(
        JSON.stringify({ error: 'Erro ao verificar email' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userExists = users.users.some(u => u.email?.toLowerCase() === email.toLowerCase())
    
    // Sempre retornar sucesso para não revelar se o email existe (segurança)
    if (!userExists) {
      console.log('Email not found, but returning success for security')
      return new Response(
        JSON.stringify({ success: true, message: 'Se o email existir, você receberá um código de recuperação.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Limpar tokens antigos para este email
    await supabaseAdmin
      .from('password_reset_tokens')
      .delete()
      .eq('email', email.toLowerCase())

    // Gerar novo token
    const token = generateToken()
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000) // 30 minutos

    // Salvar token no banco
    const { error: insertError } = await supabaseAdmin
      .from('password_reset_tokens')
      .insert({
        email: email.toLowerCase(),
        token: token,
        expires_at: expiresAt.toISOString()
      })

    if (insertError) {
      console.error('Error inserting token:', insertError)
      return new Response(
        JSON.stringify({ error: 'Erro ao gerar código de recuperação' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Enviar email usando Supabase Auth (magic link customizado)
    // Por enquanto, vamos retornar o código diretamente (em produção, enviar por email)
    console.log(`Password reset code for ${email}: ${token}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Código de recuperação gerado com sucesso.',
        // Em produção, remover o código da resposta e enviar por email
        code: token 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error?.message || 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
