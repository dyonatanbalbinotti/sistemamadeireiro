import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from "https://esm.sh/resend@2.0.0"

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
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured')
      return new Response(
        JSON.stringify({ error: 'Serviço de email não configurado' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const resend = new Resend(resendApiKey)

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

    // Enviar email com o código usando Resend
    try {
      const emailResponse = await resend.emails.send({
        from: 'DW Corporation <onboarding@resend.dev>',
        to: [email.toLowerCase()],
        subject: 'Código de Recuperação de Senha - DW Corporation',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0a;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td align="center" style="padding: 40px 0;">
                  <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0, 255, 255, 0.1);">
                    <!-- Header -->
                    <tr>
                      <td style="padding: 40px 40px 20px; text-align: center; border-bottom: 1px solid rgba(0, 255, 255, 0.2);">
                        <h1 style="margin: 0; font-size: 28px; font-weight: bold; background: linear-gradient(90deg, #00ffff, #0080ff); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                          DW Corporation
                        </h1>
                        <p style="margin: 10px 0 0; color: #888; font-size: 14px;">Sistema Madeireiro</p>
                      </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                      <td style="padding: 40px;">
                        <h2 style="margin: 0 0 20px; color: #ffffff; font-size: 22px; text-align: center;">
                          Recuperação de Senha
                        </h2>
                        <p style="margin: 0 0 30px; color: #cccccc; font-size: 16px; line-height: 1.6; text-align: center;">
                          Você solicitou a recuperação de senha da sua conta. Use o código abaixo para criar uma nova senha:
                        </p>
                        
                        <!-- Code Box -->
                        <div style="background: linear-gradient(135deg, #0f0f23 0%, #1a1a3e 100%); border: 2px solid #00ffff; border-radius: 12px; padding: 30px; text-align: center; margin: 0 0 30px;">
                          <p style="margin: 0 0 10px; color: #888; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">Seu código de verificação</p>
                          <p style="margin: 0; font-size: 42px; font-weight: bold; color: #00ffff; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                            ${token}
                          </p>
                        </div>
                        
                        <p style="margin: 0 0 10px; color: #999; font-size: 14px; text-align: center;">
                          ⏱️ Este código expira em <strong style="color: #00ffff;">30 minutos</strong>
                        </p>
                        
                        <p style="margin: 0; color: #666; font-size: 13px; text-align: center;">
                          Se você não solicitou esta recuperação de senha, ignore este email.
                        </p>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="padding: 20px 40px; background: rgba(0, 0, 0, 0.3); border-top: 1px solid rgba(0, 255, 255, 0.1);">
                        <p style="margin: 0; color: #666; font-size: 12px; text-align: center;">
                          © ${new Date().getFullYear()} DW Corporation. Todos os direitos reservados.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      })

      console.log('Email sent successfully:', emailResponse)
    } catch (emailError: any) {
      console.error('Error sending email:', emailError)
      // Mesmo se o email falhar, retornamos sucesso para não revelar informações
      // O token foi salvo no banco, então o usuário pode tentar novamente
    }

    console.log(`Password reset code generated for ${email}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Código de recuperação enviado para seu email.'
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
