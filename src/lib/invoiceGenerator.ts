/**
 * Client-side invoice HTML generator with Portuguese IVA
 * Used by admin panel to generate/view/print invoices
 */

const IVA_RATE = 0.23;

export const paymentMethodLabels: Record<string, string> = {
  mbway: 'MB WAY',
  card: 'Cartão de Crédito/Débito',
  transfer: 'Transferência Bancária',
  multibanco: 'Multibanco',
  googlepay: 'Google Pay',
  paypal: 'PayPal',
};

export const statusLabels: Record<string, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  shipped: 'Enviado',
  delivered: 'Entregue',
  canceled: 'Cancelado',
};

interface InvoiceItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface InvoiceData {
  orderId: string;
  invoiceNumber: string | null;
  status: string;
  total: number;
  shippingAddress: string | null;
  notes: string | null;
  paymentMethod: string | null;
  createdAt: string;
  customerName: string;
  customerEmail: string;
  items: InvoiceItem[];
}

export function generateInvoiceHTML(data: InvoiceData): string {
  const {
    invoiceNumber,
    status,
    total,
    shippingAddress,
    notes,
    paymentMethod,
    createdAt,
    customerName,
    customerEmail,
    items,
    orderId,
  } = data;

  const invNum = invoiceNumber || `FAS-${orderId.substring(0, 8).toUpperCase()}`;
  const invoiceDate = new Date(createdAt).toLocaleDateString('pt-PT');
  const paymentLabel = paymentMethodLabels[paymentMethod || ''] || 'Não especificado';

  // IVA calculations (Portuguese prices include IVA)
  const totalNum = Number(total);
  const baseAmount = totalNum / (1 + IVA_RATE);
  const ivaAmount = totalNum - baseAmount;

  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding:10px 14px;border-bottom:1px solid #eee;font-size:14px;">${item.product_name}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #eee;text-align:center;font-size:14px;">${item.quantity}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #eee;text-align:right;font-size:14px;">€${Number(item.unit_price).toFixed(2)}</td>
      <td style="padding:10px 14px;border-bottom:1px solid #eee;text-align:right;font-size:14px;">€${Number(item.subtotal).toFixed(2)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <title>Fatura ${invNum}</title>
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
    .meta-row .meta-item { text-align: center; }
    .meta-row .meta-label { font-size: 11px; text-transform: uppercase; color: #999; letter-spacing: 0.5px; }
    .meta-row .meta-value { font-size: 14px; font-weight: 600; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
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
    .notes { padding: 14px; background: #f8f9fa; border-radius: 8px; margin-bottom: 20px; }
    .notes strong { font-size: 13px; }
    .notes p { font-size: 13px; color: #666; margin-top: 4px; }
    .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; }
    .footer p { color: #999; font-size: 12px; line-height: 1.8; }
    @media print { 
      body { padding: 20px; } 
      .no-print { display: none; } 
    }
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
      <p><strong>Nº:</strong> ${invNum}</p>
      <p><strong>Data:</strong> ${invoiceDate}</p>
      <p style="margin-top:8px;"><span class="status status-${status}">${(statusLabels[status] || status).toUpperCase()}</span></p>
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
        ${shippingAddress ? shippingAddress.replace(/\n/g, '<br/>') : ''}
      </p>
    </div>
  </div>

  <div class="meta-row">
    <div class="meta-item">
      <div class="meta-label">Fatura</div>
      <div class="meta-value">${invNum}</div>
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
      <div class="meta-value">${statusLabels[status] || status}</div>
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

  ${notes ? `
    <div class="notes">
      <strong>Notas:</strong>
      <p>${notes}</p>
    </div>
  ` : ''}

  <div class="footer">
    <p>
      Fio & Alma Studio — Obrigado pela sua compra!<br/>
      Todos os preços incluem IVA à taxa legal de 23%.<br/>
      Este documento serve como fatura/recibo.
    </p>
  </div>
</body>
</html>`;
}

/** Open invoice in a new browser window for printing */
export function openInvoiceWindow(html: string) {
  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
