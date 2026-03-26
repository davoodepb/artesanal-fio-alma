import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ORIGINS = [
  'https://fioealma.pt',
  'https://www.fioealma.pt',
  Deno.env.get('SITE_URL'),
].filter(Boolean) as string[];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '';
  const isAllowed = ALLOWED_ORIGINS.includes(origin) || origin.startsWith('http://localhost');
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization' }), {
        status: 401,
        headers: corsHeaders,
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Verify calling user
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: corsHeaders,
      })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .maybeSingle()

    const customerName = profile?.full_name || user.email?.split('@')[0] || 'Cliente'
    const customerEmail = user.email || ''

    if (!customerEmail) {
      return new Response(
        JSON.stringify({ success: true, emailSent: false, reason: 'No email' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    /* ── Send login notification email via Resend ── */
    const resendKey = Deno.env.get('RESEND_API_KEY')
    let emailSent = false

    if (resendKey) {
      const loginDate = new Date().toLocaleString('pt-PT', {
        timeZone: 'Europe/Lisbon',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })

      const html = `
        <div style="font-family:'Segoe UI',Tahoma,sans-serif;max-width:600px;margin:0 auto;color:#333;">
          <div style="background:linear-gradient(135deg,#c9184a,#e8507a);padding:30px;text-align:center;border-radius:12px 12px 0 0;">
            <h1 style="color:#fff;margin:0;font-size:24px;">Fio &amp; Alma Studio</h1>
            <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">Artesanato &amp; Design Português</p>
          </div>
          <div style="padding:30px;background:#fff;border:1px solid #eee;border-top:none;">
            <h2 style="color:#c9184a;margin:0 0 16px;">Olá, ${customerName}! 👋</h2>
            <p style="font-size:15px;line-height:1.6;">
              Acabou de iniciar sessão na sua conta <strong>Fio &amp; Alma Studio</strong>.
            </p>
            <div style="background:#f8f9fa;border-radius:8px;padding:16px;margin:20px 0;">
              <p style="margin:0;font-size:14px;color:#666;">
                <strong>📅 Data:</strong> ${loginDate}<br/>
                <strong>📧 Email:</strong> ${customerEmail}
              </p>
            </div>
            <p style="font-size:14px;color:#666;line-height:1.6;">
              Se não reconhece esta atividade, por favor altere a sua palavra-passe imediatamente.
            </p>
            <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
            <p style="font-size:14px;color:#666;">
              Explore as nossas novidades e produtos artesanais únicos! 🧵
            </p>
            <div style="text-align:center;margin-top:20px;">
              <a href="${Deno.env.get('SITE_URL') || 'https://fioealma.pt'}/products" 
                 style="display:inline-block;padding:12px 30px;background:#c9184a;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;font-size:14px;">
                Ver Produtos
              </a>
            </div>
          </div>
          <div style="text-align:center;padding:20px;color:#aaa;font-size:12px;">
            Fio &amp; Alma Studio — O melhor do artesanato português 🧶
          </div>
        </div>
      `

      try {
        const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'Fio & Alma Studio <onboarding@resend.dev>'

        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [customerEmail],
            subject: `Bem-vindo de volta, ${customerName}! — Fio & Alma Studio`,
            html,
          }),
        })

        if (res.ok) {
          emailSent = true
          console.log(`✅ Login email sent to ${customerEmail}`)
        } else {
          const errBody = await res.text()
          console.error('Resend error:', res.status, errBody)
        }
      } catch (emailErr) {
        console.error('Email send error:', emailErr)
      }
    } else {
      console.warn('Login email skipped: RESEND_API_KEY not set.')
    }

    return new Response(
      JSON.stringify({ success: true, emailSent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('send-login-email error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: corsHeaders }
    )
  }
})
