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

const paymentMethodLabels: Record<string, string> = {
  mbway: 'MB WAY',
  card: 'Cartão de Crédito/Débito',
  transfer: 'Transferência Bancária',
  multibanco: 'Multibanco',
  googlepay: 'Google Pay',
  paypal: 'PayPal',
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
        status: 401, headers: corsHeaders,
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Verify caller
    const token = authHeader.replace('Bearer ', '')
    const { data: { user: caller }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: corsHeaders,
      })
    }

    const { orderId } = await req.json()
    if (!orderId) {
      return new Response(JSON.stringify({ error: 'orderId required' }), {
        status: 400, headers: corsHeaders,
      })
    }

    /* ── 1. Fetch order + items ── */
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404, headers: corsHeaders,
      })
    }

    const { data: items } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId)

    /* ── 2. Get customer info ── */
    let customerName = 'Cliente'
    let customerEmail = ''
    if (order.user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone, address')
        .eq('user_id', order.user_id)
        .maybeSingle()

      const { data: { user: customer } } = await supabase.auth.admin.getUserById(order.user_id)
      customerName = profile?.full_name || 'Cliente'
      customerEmail = customer?.email || ''
    }

    if (!customerEmail) {
      return new Response(
        JSON.stringify({ success: true, emailSent: false, reason: 'No customer email' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    /* ── 3. Calculate IVA (23% Portuguese standard rate) ── */
    const IVA_RATE = 0.23
    const subtotalWithIVA = Number(order.total)
    // In Portugal, product prices include IVA, so we reverse-calculate
    const baseAmount = subtotalWithIVA / (1 + IVA_RATE)
    const ivaAmount = subtotalWithIVA - baseAmount

    const invoiceNumber = order.invoice_number || `FAS-${orderId.substring(0, 8).toUpperCase()}`
    const invoiceDate = new Date(order.created_at).toLocaleDateString('pt-PT')
    const paymentMethod = paymentMethodLabels[order.payment_method || ''] || 'Não especificado'

    /* ── 4. Build invoice email HTML ── */
    const itemsHtml = (items || []).map((item: any) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;">${item.product_name}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:center;font-size:14px;">${item.quantity}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-size:14px;">€${Number(item.unit_price).toFixed(2)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-size:14px;">€${Number(item.subtotal).toFixed(2)}</td>
      </tr>
    `).join('')

    const statusLabels: Record<string, string> = {
      pending: 'Pendente',
      paid: 'Pago',
      shipped: 'Enviado',
      delivered: 'Entregue',
      canceled: 'Cancelado',
    }

    const html = `
      <div style="font-family:'Segoe UI',Tahoma,sans-serif;max-width:700px;margin:0 auto;color:#333;">
        <!-- Header -->
        <div style="background:linear-gradient(135deg,#c9184a,#e8507a);padding:30px;text-align:center;border-radius:12px 12px 0 0;">
          <h1 style="color:#fff;margin:0;font-size:24px;">Fio &amp; Alma Studio</h1>
          <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">Artesanato &amp; Design Português</p>
        </div>

        <div style="padding:30px;background:#fff;border:1px solid #eee;border-top:none;">
          <!-- Title -->
          <div style="text-align:center;margin-bottom:24px;">
            <h2 style="color:#c9184a;margin:0 0 4px;font-size:22px;">FATURA / RECIBO</h2>
            <p style="color:#666;margin:0;font-size:14px;">Nº ${invoiceNumber}</p>
          </div>
          
          <!-- Billing Info -->
          <div style="display:flex;margin-bottom:24px;">
            <div style="flex:1;">
              <p style="font-size:11px;text-transform:uppercase;color:#999;margin:0 0 6px;letter-spacing:1px;">De</p>
              <p style="margin:0;font-size:14px;line-height:1.5;">
                <strong>Fio &amp; Alma Studio</strong><br/>
                Artesanato &amp; Design<br/>
                Portugal
              </p>
            </div>
            <div style="flex:1;text-align:right;">
              <p style="font-size:11px;text-transform:uppercase;color:#999;margin:0 0 6px;letter-spacing:1px;">Para</p>
              <p style="margin:0;font-size:14px;line-height:1.5;">
                <strong>${customerName}</strong><br/>
                ${customerEmail}<br/>
                ${order.shipping_address ? order.shipping_address.replace(/\n/g, '<br/>') : ''}
              </p>
            </div>
          </div>

          <!-- Invoice Details -->
          <div style="background:#f8f9fa;border-radius:8px;padding:14px;margin-bottom:20px;">
            <table style="width:100%;font-size:13px;color:#666;">
              <tr>
                <td><strong>Data:</strong> ${invoiceDate}</td>
                <td style="text-align:center;"><strong>Estado:</strong> ${statusLabels[order.status] || order.status}</td>
                <td style="text-align:right;"><strong>Pagamento:</strong> ${paymentMethod}</td>
              </tr>
            </table>
          </div>

          <!-- Items Table -->
          <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
            <thead>
              <tr style="background:#f8f8f8;">
                <th style="padding:10px 12px;text-align:left;font-size:11px;text-transform:uppercase;color:#888;letter-spacing:0.5px;">Produto</th>
                <th style="padding:10px 12px;text-align:center;font-size:11px;text-transform:uppercase;color:#888;letter-spacing:0.5px;">Qtd</th>
                <th style="padding:10px 12px;text-align:right;font-size:11px;text-transform:uppercase;color:#888;letter-spacing:0.5px;">Preço Unit.</th>
                <th style="padding:10px 12px;text-align:right;font-size:11px;text-transform:uppercase;color:#888;letter-spacing:0.5px;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <!-- Totals -->
          <div style="border-top:2px solid #eee;padding-top:16px;">
            <table style="width:100%;font-size:14px;">
              <tr>
                <td style="padding:4px 0;color:#666;">Base tributável:</td>
                <td style="padding:4px 0;text-align:right;">€${baseAmount.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding:4px 0;color:#666;">IVA (23%):</td>
                <td style="padding:4px 0;text-align:right;">€${ivaAmount.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;font-size:18px;font-weight:bold;color:#c9184a;">TOTAL:</td>
                <td style="padding:8px 0;text-align:right;font-size:18px;font-weight:bold;color:#c9184a;">€${Number(order.total).toFixed(2)}</td>
              </tr>
            </table>
          </div>

          ${order.notes ? `
            <div style="margin-top:16px;padding:12px;background:#f8f9fa;border-radius:6px;">
              <strong style="font-size:13px;">Notas:</strong>
              <p style="margin:4px 0 0;font-size:13px;color:#666;">${order.notes}</p>
            </div>
          ` : ''}

          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
          
          <p style="font-size:13px;color:#666;text-align:center;">
            Este documento serve como fatura/recibo do seu pedido.<br/>
            Guarde este email para os seus registos.
          </p>
        </div>

        <!-- Footer -->
        <div style="text-align:center;padding:20px;color:#aaa;font-size:12px;border-radius:0 0 12px 12px;">
          Fio &amp; Alma Studio — Obrigado pela sua compra! 🧵<br/>
          Este é um email automático, por favor não responda diretamente.
        </div>
      </div>
    `

    /* ── 5. Send email via Resend ── */
    const resendKey = Deno.env.get('RESEND_API_KEY')
    let emailSent = false

    if (resendKey) {
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
            subject: `Fatura ${invoiceNumber} — Fio & Alma Studio`,
            html,
          }),
        })

        if (res.ok) {
          emailSent = true
          console.log(`✅ Invoice email sent to ${customerEmail} for order ${invoiceNumber}`)
        } else {
          const errBody = await res.text()
          console.error('Resend error:', res.status, errBody)
        }
      } catch (emailErr) {
        console.error('Email send error:', emailErr)
      }
    } else {
      console.warn('Invoice email skipped: RESEND_API_KEY not set.')
    }

    return new Response(
      JSON.stringify({ success: true, emailSent, invoiceNumber }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('send-invoice-email error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: corsHeaders }
    )
  }
})
