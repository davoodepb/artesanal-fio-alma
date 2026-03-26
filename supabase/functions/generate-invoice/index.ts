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
      return new Response(JSON.stringify({ error: 'No authorization' }), { status: 401, headers: corsHeaders })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Verify user is admin
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle()

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Not admin' }), { status: 403, headers: corsHeaders })
    }

    const { orderId } = await req.json()
    if (!orderId) {
      return new Response(JSON.stringify({ error: 'orderId required' }), { status: 400, headers: corsHeaders })
    }

    // Fetch order with items
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), { status: 404, headers: corsHeaders })
    }

    const { data: items } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId)

    // Fetch customer profile
    let customerName = 'Cliente'
    let customerEmail = ''
    if (order.user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', order.user_id)
        .maybeSingle()
      
      const { data: { user: customer } } = await supabase.auth.admin.getUserById(order.user_id)
      customerName = profile?.full_name || 'Cliente'
      customerEmail = customer?.email || ''
    }

    const invoiceDate = new Date(order.created_at).toLocaleDateString('pt-PT')
    const invoiceNumber = order.invoice_number || `FAS-${orderId.substring(0, 8).toUpperCase()}`

    // IVA calculations (23% Portuguese standard)
    const totalNum = Number(order.total)
    const baseAmount = totalNum / 1.23
    const ivaAmount = totalNum - baseAmount

    const paymentMethodLabels: Record<string, string> = {
      mbway: 'MB WAY',
      card: 'Cartão de Crédito/Débito',
      transfer: 'Transferência Bancária',
      multibanco: 'Multibanco',
      googlepay: 'Google Pay',
      paypal: 'PayPal',
    }
    const paymentLabel = paymentMethodLabels[order.payment_method || ''] || 'Não especificado'

    const statusLabels: Record<string, string> = {
      pending: 'Pendente',
      paid: 'Pago',
      shipped: 'Enviado',
      delivered: 'Entregue',
      canceled: 'Cancelado',
    }

    const itemsHtml = (items || []).map(item => `
      <tr>
        <td style="padding:10px 14px;border-bottom:1px solid #eee;">${item.product_name}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #eee;text-align:right;">€${Number(item.unit_price).toFixed(2)}</td>
        <td style="padding:10px 14px;border-bottom:1px solid #eee;text-align:right;">€${Number(item.subtotal).toFixed(2)}</td>
      </tr>
    `).join('')

    const html = `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <title>Fatura ${invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #333; padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 3px solid #c9184a; padding-bottom: 20px; }
    .logo { font-size: 28px; font-weight: bold; color: #c9184a; }
    .logo span { font-style: italic; font-weight: 300; }
    .invoice-info { text-align: right; }
    .invoice-info h2 { font-size: 24px; color: #c9184a; margin-bottom: 8px; }
    .invoice-info p { color: #666; font-size: 14px; line-height: 1.6; }
    .parties { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .party { width: 45%; }
    .party h3 { font-size: 11px; text-transform: uppercase; color: #999; margin-bottom: 8px; letter-spacing: 1px; }
    .party p { font-size: 14px; line-height: 1.6; }
    .meta-row { display: flex; justify-content: space-between; background: #f8f9fa; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; }
    .meta-item { text-align: center; }
    .meta-label { font-size: 11px; text-transform: uppercase; color: #999; letter-spacing: 0.5px; }
    .meta-value { font-size: 14px; font-weight: 600; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    thead th { background: #f8f9fa; padding: 10px 14px; text-align: left; font-size: 11px; text-transform: uppercase; color: #666; letter-spacing: 0.5px; }
    .totals { border-top: 2px solid #eee; padding-top: 16px; margin-bottom: 30px; }
    .totals .row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 14px; }
    .totals .row.iva { color: #666; }
    .totals .row.grand-total { font-size: 20px; font-weight: bold; color: #c9184a; padding: 12px 0; border-top: 2px solid #c9184a; margin-top: 8px; }
    .status { display: inline-block; padding: 4px 14px; border-radius: 20px; font-size: 12px; font-weight: bold; }
    .status-pending { background: #fff3cd; color: #856404; }
    .status-paid { background: #d4edda; color: #155724; }
    .status-shipped { background: #cce5ff; color: #004085; }
    .status-delivered { background: #d4edda; color: #155724; }
    .status-canceled { background: #f8d7da; color: #721c24; }
    .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; }
    .footer p { color: #999; font-size: 12px; line-height: 1.8; }
    @media print { body { padding: 20px; } .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="no-print" style="text-align:center;margin-bottom:20px;">
    <button onclick="window.print()" style="padding:12px 30px;background:#c9184a;color:white;border:none;border-radius:8px;cursor:pointer;font-size:16px;margin-right:10px;">
      🖨️ Imprimir / PDF
    </button>
    <button onclick="window.close()" style="padding:12px 30px;background:#666;color:white;border:none;border-radius:8px;cursor:pointer;font-size:16px;">
      ✕ Fechar
    </button>
  </div>

  <div class="header">
    <div>
      <div class="logo">Fio & Alma <span>Studio</span></div>
      <p style="color:#666;font-size:13px;margin-top:4px;">Artesanato & Design Português</p>
    </div>
    <div class="invoice-info">
      <h2>FATURA</h2>
      <p><strong>Nº:</strong> ${invoiceNumber}</p>
      <p><strong>Data:</strong> ${invoiceDate}</p>
      <p style="margin-top:8px;"><span class="status status-${order.status}">${(statusLabels[order.status] || order.status).toUpperCase()}</span></p>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <h3>De</h3>
      <p>
        <strong>Fio & Alma Studio</strong><br/>
        Artesanato & Design<br/>
        Portugal
      </p>
    </div>
    <div class="party">
      <h3>Para</h3>
      <p>
        <strong>${customerName}</strong><br/>
        ${customerEmail ? customerEmail + '<br/>' : ''}
        ${order.shipping_address ? order.shipping_address.replace(/\\n/g, '<br/>') : ''}
      </p>
    </div>
  </div>

  <div class="meta-row">
    <div class="meta-item">
      <div class="meta-label">Fatura</div>
      <div class="meta-value">${invoiceNumber}</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">Data</div>
      <div class="meta-value">${invoiceDate}</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">Pagamento</div>
      <div class="meta-value">${paymentLabel}</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">Estado</div>
      <div class="meta-value">${statusLabels[order.status] || order.status}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Produto</th>
        <th style="text-align:center;">Qtd.</th>
        <th style="text-align:right;">Preço Unit.</th>
        <th style="text-align:right;">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <div class="totals">
    <div class="row iva">
      <span>Base tributável:</span>
      <span>€${baseAmount.toFixed(2)}</span>
    </div>
    <div class="row iva">
      <span>IVA (23%):</span>
      <span>€${ivaAmount.toFixed(2)}</span>
    </div>
    <div class="row grand-total">
      <span>TOTAL</span>
      <span>€${totalNum.toFixed(2)}</span>
    </div>
  </div>

  ${order.notes ? `<div style="margin-bottom:20px;padding:14px;background:#f8f9fa;border-radius:8px;"><strong>Notas:</strong> ${order.notes}</div>` : ''}

  <div class="footer">
    <p>
      Fio & Alma Studio — Obrigado pela sua compra!<br/>
      Todos os preços incluem IVA à taxa legal de 23%.<br/>
      Este documento serve como fatura/recibo.
    </p>
  </div>
</body>
</html>`

    return new Response(html, {
      headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
  }
})
