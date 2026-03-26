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

    // Service-role client (bypasses RLS)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Verify calling user
    const token = authHeader.replace('Bearer ', '')
    const {
      data: { user: caller },
      error: authError,
    } = await supabase.auth.getUser(token)
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: corsHeaders,
      })
    }

    const { orderId, userId } = await req.json()
    if (!orderId || !userId) {
      return new Response(
        JSON.stringify({ error: 'orderId and userId required' }),
        { status: 400, headers: corsHeaders }
      )
    }

    /* ── 1. Fetch order + items ── */
    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (!order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: corsHeaders,
      })
    }

    const { data: items } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId)

    /* ── 2. Get customer info ── */
    const {
      data: { user: customer },
    } = await supabase.auth.admin.getUserById(userId)

    const customerEmail = customer?.email || ''

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', userId)
      .maybeSingle()

    const customerName = profile?.full_name || 'Cliente'
    const orderCode = orderId.substring(0, 8).toUpperCase()

    /* ── 3. Send email via Resend (if configured) ── */
    const resendKey = Deno.env.get('RESEND_API_KEY')
    let emailSent = false

    if (resendKey && customerEmail) {
      const itemsHtml = (items || [])
        .map(
          (i: any) =>
            `<tr>
              <td style="padding:6px 10px;border-bottom:1px solid #f0f0f0;">${i.product_name}</td>
              <td style="padding:6px 10px;border-bottom:1px solid #f0f0f0;text-align:center;">${i.quantity}</td>
              <td style="padding:6px 10px;border-bottom:1px solid #f0f0f0;text-align:right;">€${Number(i.unit_price).toFixed(2)}</td>
              <td style="padding:6px 10px;border-bottom:1px solid #f0f0f0;text-align:right;">€${Number(i.subtotal).toFixed(2)}</td>
            </tr>`
        )
        .join('')

      const html = `
        <div style="font-family:'Segoe UI',Tahoma,sans-serif;max-width:600px;margin:0 auto;color:#333;">
          <div style="background:linear-gradient(135deg,#c9184a,#e8507a);padding:30px;text-align:center;border-radius:12px 12px 0 0;">
            <h1 style="color:#fff;margin:0;font-size:24px;">Fio &amp; Alma Studio</h1>
            <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">Artesanato &amp; Design Português</p>
          </div>
          <div style="padding:30px;background:#fff;border:1px solid #eee;border-top:none;">
            <h2 style="color:#c9184a;margin:0 0 8px;">Pedido Confirmado! ✅</h2>
            <p>Olá <strong>${customerName}</strong>,</p>
            <p>O seu pedido <strong>#${orderCode}</strong> foi recebido com sucesso.</p>

            <table style="width:100%;border-collapse:collapse;margin:20px 0;">
              <thead>
                <tr style="background:#f8f8f8;">
                  <th style="padding:8px 10px;text-align:left;font-size:12px;text-transform:uppercase;color:#888;">Produto</th>
                  <th style="padding:8px 10px;text-align:center;font-size:12px;text-transform:uppercase;color:#888;">Qtd</th>
                  <th style="padding:8px 10px;text-align:right;font-size:12px;text-transform:uppercase;color:#888;">Preço</th>
                  <th style="padding:8px 10px;text-align:right;font-size:12px;text-transform:uppercase;color:#888;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <div style="text-align:right;font-size:18px;font-weight:bold;color:#c9184a;margin:10px 0 20px;">
              Total: €${Number(order.total).toFixed(2)}
            </div>

            ${order.shipping_address ? `<p style="font-size:13px;color:#666;"><strong>Morada de envio:</strong><br/>${order.shipping_address.replace(/\n/g, '<br/>')}</p>` : ''}
            ${order.notes ? `<p style="font-size:13px;color:#666;"><strong>Notas:</strong> ${order.notes}</p>` : ''}

            <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
            <p style="font-size:13px;color:#666;">Iremos processar o seu pedido em breve. Receberá atualizações sobre o estado da encomenda.</p>
            <p style="font-size:13px;color:#666;">Se tiver alguma dúvida, utilize o chat no nosso site ou responda a este email.</p>
          </div>
          <div style="text-align:center;padding:20px;color:#aaa;font-size:12px;">
            Fio &amp; Alma Studio — Obrigado pela sua compra! 🧵
          </div>
        </div>
      `

      try {
        // Determine "from" address – use custom domain if RESEND_FROM_EMAIL is set, else default
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
            subject: `Pedido #${orderCode} confirmado — Fio & Alma Studio`,
            html,
          }),
        })

        if (res.ok) {
          emailSent = true
          console.log(`✅ Email sent to ${customerEmail} for order ${orderCode}`)
        } else {
          const errBody = await res.text()
          console.error('Resend error:', res.status, errBody)
        }
      } catch (emailErr) {
        console.error('Email send error:', emailErr)
      }
    } else {
      console.warn(
        'Email skipped: RESEND_API_KEY not set or no customer email.',
        { hasKey: !!resendKey, email: customerEmail }
      )
    }

    /* ── 4. Admin notification: insert system message in conversation ── */
    // Find or create the customer's chat conversation (using service role)
    let convId: string | null = null
    {
      const { data: conv } = await supabase
        .from('chat_conversations')
        .select('id')
        .eq('customer_id', userId)
        .in('status', ['open', 'active'])
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      convId = conv?.id || null

      if (!convId) {
        const { data: newConv } = await supabase
          .from('chat_conversations')
          .insert({ customer_id: userId, status: 'active' })
          .select('id')
          .single()
        convId = newConv?.id || null
      }
    }

    if (convId) {
      const itemsSummary = (items || [])
        .map((i: any) => `  • ${i.product_name} ×${i.quantity} — €${Number(i.subtotal).toFixed(2)}`)
        .join('\n')

      const paymentMethodLabels: Record<string, string> = {
        mbway: 'MB WAY',
        card: 'Cartão',
        transfer: 'Transferência Bancária',
        multibanco: 'Multibanco',
        googlepay: 'Google Pay',
        paypal: 'PayPal',
      }
      const paymentInfo = order.payment_method 
        ? `\nPagamento: ${paymentMethodLabels[order.payment_method] || order.payment_method}` 
        : ''
      const invoiceInfo = order.invoice_number ? `\nFatura: ${order.invoice_number}` : ''

      // Admin-facing notification (sender_role = 'system', sender_id = customer)
      await supabase.from('chat_messages').insert({
        conversation_id: convId,
        sender_id: userId,
        sender_role: 'system',
        content:
          `📦 Nova encomenda #${orderCode}\n` +
          `Cliente: ${customerName}${customerEmail ? ` (${customerEmail})` : ''}\n` +
          `Total: €${Number(order.total).toFixed(2)}` +
          paymentInfo +
          invoiceInfo +
          (itemsSummary ? `\n\n${itemsSummary}\n` : '') +
          `\nEstado: Pendente` +
          (emailSent ? `\n📧 Email de confirmação enviado.` : '\n⚠️ Email não enviado (RESEND_API_KEY não configurada).'),
      })

      await supabase
        .from('chat_conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', convId)
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailSent,
        orderCode,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('order-notification error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: corsHeaders }
    )
  }
})
