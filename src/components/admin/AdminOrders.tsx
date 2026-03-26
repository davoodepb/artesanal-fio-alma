import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2, FileText, Download, Mail, Search, CreditCard, Smartphone, Building2, Landmark, Eye, Wallet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { generateInvoiceHTML, openInvoiceWindow, paymentMethodLabels } from '@/lib/invoiceGenerator';

interface Order {
  id: string;
  user_id: string | null;
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'canceled';
  total: number;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  shipping_address_line1: string | null;
  shipping_city: string | null;
  shipping_postal_code: string | null;
  shipping_country: string | null;
  customer_nif: string | null;
  shipping_address: string | null;
  notes: string | null;
  invoice_number: string | null;
  payment_method: string | null;
  created_at: string;
}

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface CustomerInfo {
  name: string;
  email: string;
}

const statusLabels: Record<string, string> = {
  pending: 'Pendente',
  paid: 'Pago',
  shipped: 'Enviado',
  delivered: 'Entregue',
  canceled: 'Cancelado',
};

const statusVariant = (s: string) => {
  switch (s) {
    case 'paid': case 'delivered': return 'default' as const;
    case 'shipped': return 'secondary' as const;
    case 'canceled': return 'destructive' as const;
    default: return 'outline' as const;
  }
};

const paymentIcons: Record<string, React.ReactNode> = {
  mbway: <Smartphone className="h-3.5 w-3.5" />,
  card: <CreditCard className="h-3.5 w-3.5" />,
  transfer: <Building2 className="h-3.5 w-3.5" />,
  multibanco: <Landmark className="h-3.5 w-3.5" />,
  googlepay: <Wallet className="h-3.5 w-3.5" />,
  paypal: <CreditCard className="h-3.5 w-3.5" />,
};

export function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [orderItems, setOrderItems] = useState<Record<string, OrderItem[]>>({});
  const [customerInfo, setCustomerInfo] = useState<Record<string, CustomerInfo>>({});
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');

  const fetchOrders = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setOrders(data as Order[]);
    setIsLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  useEffect(() => {
    const ordersRealtime = supabase
      .channel('admin-orders-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const incoming = payload.new as Order;
          setOrders((prev) => {
            if (prev.some((o) => o.id === incoming.id)) return prev;
            return [incoming, ...prev];
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        (payload) => {
          const updated = payload.new as Order;
          setOrders((prev) => prev.map((order) => (order.id === updated.id ? { ...order, ...updated } : order)));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersRealtime);
    };
  }, []);

  const fetchItems = async (orderId: string) => {
    if (orderItems[orderId]) return;
    const { data } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId);
    if (data) setOrderItems(prev => ({ ...prev, [orderId]: data }));
  };

  const fetchCustomerInfo = async (order: Order) => {
    if (customerInfo[order.id]) return;

    setCustomerInfo(prev => ({
      ...prev,
      [order.id]: {
        name: order.customer_name || extractNameFromAddress(order.shipping_address),
        email: order.customer_email || '',
      },
    }));

    if (order.customer_name || order.customer_email || !order.user_id) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('user_id', order.user_id)
        .maybeSingle();

      if (!profile) return;

      setCustomerInfo(prev => ({
        ...prev,
        [order.id]: {
          name: profile.full_name || prev[order.id]?.name || 'Cliente',
          email: profile.email || prev[order.id]?.email || '',
        },
      }));
    } catch (err) {
      console.error('Error fetching customer info:', err);
    }
  };

  const toggleExpand = (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (expandedOrder === orderId) {
      setExpandedOrder(null);
    } else {
      setExpandedOrder(orderId);
      fetchItems(orderId);
      if (order) fetchCustomerInfo(order);
    }
  };

  const updateStatus = async (orderId: string, newStatus: Order['status']) => {
    setUpdatingStatus(orderId);
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);
    if (error) {
      toast.error('Erro ao atualizar estado');
    } else {
      toast.success('Estado atualizado!');
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      
      // If status changed to 'paid', send invoice email automatically
      if (newStatus === 'paid') {
        sendInvoiceEmail(orderId);
      }
    }
    setUpdatingStatus(null);
  };

  const openInvoice = async (order: Order) => {
    try {
      const items = orderItems[order.id];
      if (!items) {
        // Fetch items first
        const { data } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', order.id);
        if (data) {
          setOrderItems(prev => ({ ...prev, [order.id]: data }));
          openInvoiceFromData(order, data);
        }
      } else {
        openInvoiceFromData(order, items);
      }
    } catch (err: any) {
      toast.error('Erro ao gerar fatura: ' + (err.message || ''));
    }
  };

  const openInvoiceFromData = (order: Order, items: OrderItem[]) => {
    const customer = customerInfo[order.id];
    const html = generateInvoiceHTML({
      orderId: order.id,
      invoiceNumber: order.invoice_number,
      status: order.status,
      total: order.total,
      shippingAddress: order.shipping_address,
      notes: order.notes,
      paymentMethod: order.payment_method,
      createdAt: order.created_at,
      customerName: order.customer_name || customer?.name || extractNameFromAddress(order.shipping_address),
      customerEmail: order.customer_email || customer?.email || '',
      items,
    });
    openInvoiceWindow(html);
  };

  const extractNameFromAddress = (address: string | null): string => {
    if (!address) return 'Cliente';
    const firstLine = address.split('\n')[0];
    return firstLine || 'Cliente';
  };

  const sendInvoiceEmail = async (orderId: string) => {
    setSendingEmail(orderId);
    try {
      const { data, error } = await supabase.functions.invoke('send-invoice-email', {
        body: { orderId },
      });
      if (error) throw error;
      if (data?.emailSent) {
        toast.success('Fatura enviada por email!');
      } else {
        toast.info('Fatura gerada mas email não enviado (verificar RESEND_API_KEY)');
      }
    } catch (err: any) {
      toast.error('Erro ao enviar fatura: ' + (err.message || ''));
    } finally {
      setSendingEmail(null);
    }
  };

  const exportToExcel = () => {
    const headers = ['Nº Fatura', 'Data', 'Estado', 'Nome', 'Email', 'Telefone', 'Pagamento', 'Total (€)', 'Base Tributável (€)', 'IVA 23% (€)', 'Morada', 'Cidade', 'Código Postal', 'País', 'NIF', 'Notas'];
    const rows = filteredOrders.map(o => {
      const total = Number(o.total);
      const base = total / 1.23;
      const iva = total - base;
      return [
        o.invoice_number || '-',
        new Date(o.created_at).toLocaleDateString('pt-PT'),
        statusLabels[o.status] || o.status,
        o.customer_name || extractNameFromAddress(o.shipping_address),
        o.customer_email || '',
        o.customer_phone || '',
        paymentMethodLabels[o.payment_method || ''] || '-',
        total.toFixed(2),
        base.toFixed(2),
        iva.toFixed(2),
        (o.shipping_address_line1 || o.shipping_address || '').replace(/,/g, ';').replace(/\n/g, ' | '),
        o.shipping_city || '',
        o.shipping_postal_code || '',
        o.shipping_country || '',
        o.customer_nif || '',
        (o.notes || '').replace(/,/g, ';'),
      ];
    });

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pedidos_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Ficheiro exportado!');
  };

  // Filtering
  const filteredOrders = orders.filter(order => {
    const matchesSearch = searchQuery === '' || 
      (order.invoice_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.shipping_address || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.customer_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.customer_email || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesPayment = paymentFilter === 'all' || order.payment_method === paymentFilter;
    
    return matchesSearch && matchesStatus && matchesPayment;
  });

  // Summary stats
  const totalRevenue = filteredOrders
    .filter(o => ['paid', 'shipped', 'delivered'].includes(o.status))
    .reduce((sum, o) => sum + Number(o.total), 0);
  const totalPending = filteredOrders.filter(o => o.status === 'pending').length;
  const totalPaid = filteredOrders.filter(o => ['paid', 'shipped', 'delivered'].includes(o.status)).length;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-serif font-bold text-foreground">Pedidos</h1>
        <Button variant="outline" onClick={exportToExcel}>
          <Download className="h-4 w-4 mr-2" />
          Exportar Excel
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Receita (pagos)</p>
            <p className="text-2xl font-bold">€{totalRevenue.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Pendentes</p>
            <p className="text-2xl font-bold">{totalPending}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Pagos/Enviados/Entregues</p>
            <p className="text-2xl font-bold">{totalPaid}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar por fatura, ID, morada..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(statusLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Pagamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {Object.entries(paymentMethodLabels).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Nenhum pedido encontrado.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº Fatura</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Pagamento</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map(order => (
                  <React.Fragment key={order.id}>
                    <TableRow 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleExpand(order.id)}
                    >
                      <TableCell className="font-mono text-sm">
                        {order.invoice_number || order.id.substring(0, 8)}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(order.created_at).toLocaleDateString('pt-PT')}
                      </TableCell>
                      <TableCell>
                        {order.payment_method ? (
                          <div className="flex items-center gap-1.5">
                            {paymentIcons[order.payment_method]}
                            <span className="text-xs">{paymentMethodLabels[order.payment_method] || order.payment_method}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">€{Number(order.total).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(order.status)}>
                          {statusLabels[order.status] || order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Select
                            value={order.status}
                            onValueChange={(v) => updateStatus(order.id, v as Order['status'])}
                            disabled={updatingStatus === order.id}
                          >
                            <SelectTrigger className="w-[120px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(statusLabels).map(([k, v]) => (
                                <SelectItem key={k} value={k}>{v}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openInvoice(order)}
                            title="Ver fatura"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => sendInvoiceEmail(order.id)}
                            disabled={sendingEmail === order.id}
                            title="Enviar fatura por email"
                          >
                            {sendingEmail === order.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Mail className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedOrder === order.id && (
                      <TableRow>
                        <TableCell colSpan={6} className="bg-muted/30 p-4">
                          <div className="space-y-3">
                            {/* Customer info */}
                            {customerInfo[order.id] && (
                              <div className="space-y-1">
                                <p className="text-sm">
                                  <strong>Cliente:</strong> {customerInfo[order.id].name}
                                  {customerInfo[order.id].email && ` (${customerInfo[order.id].email})`}
                                </p>
                                {order.customer_phone && (
                                  <p className="text-sm"><strong>Telefone:</strong> {order.customer_phone}</p>
                                )}
                                {order.customer_nif && (
                                  <p className="text-sm"><strong>NIF:</strong> {order.customer_nif}</p>
                                )}
                              </div>
                            )}
                            
                            {(order.shipping_address_line1 || order.shipping_city || order.shipping_postal_code || order.shipping_country || order.shipping_address) && (
                              <div className="space-y-1">
                                <p className="text-sm">
                                  <strong>Morada:</strong> {order.shipping_address_line1 || order.shipping_address || '—'}
                                </p>
                                <p className="text-sm">
                                  <strong>Localidade:</strong> {[order.shipping_postal_code, order.shipping_city].filter(Boolean).join(' ')}
                                  {order.shipping_country ? `, ${order.shipping_country}` : ''}
                                </p>
                              </div>
                            )}
                            
                            {order.payment_method && (
                              <p className="text-sm">
                                <strong>Pagamento:</strong> {paymentMethodLabels[order.payment_method] || order.payment_method}
                              </p>
                            )}

                            {/* IVA breakdown */}
                            <div className="bg-white rounded-lg p-3 border">
                              <p className="text-xs font-medium text-muted-foreground mb-2">Detalhes Fiscais</p>
                              <div className="grid grid-cols-3 gap-2 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Base:</span>{' '}
                                  <span className="font-medium">€{(Number(order.total) / 1.23).toFixed(2)}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">IVA 23%:</span>{' '}
                                  <span className="font-medium">€{(Number(order.total) - Number(order.total) / 1.23).toFixed(2)}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Total:</span>{' '}
                                  <span className="font-bold">€{Number(order.total).toFixed(2)}</span>
                                </div>
                              </div>
                            </div>

                            {order.notes && (
                              <p className="text-sm"><strong>Notas:</strong> {order.notes}</p>
                            )}
                            
                            <div className="mt-2">
                              <p className="text-xs font-medium text-muted-foreground mb-1">Itens:</p>
                              {orderItems[order.id] ? (
                                <ul className="space-y-1">
                                  {orderItems[order.id].map(item => (
                                    <li key={item.id} className="text-sm flex justify-between">
                                      <span>{item.quantity}x {item.product_name}</span>
                                      <span>€{Number(item.subtotal).toFixed(2)}</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              )}
                            </div>

                            {/* Action buttons */}
                            <div className="flex gap-2 pt-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openInvoice(order)}
                              >
                                <FileText className="h-3.5 w-3.5 mr-1.5" />
                                Ver Fatura
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => sendInvoiceEmail(order.id)}
                                disabled={sendingEmail === order.id}
                              >
                                {sendingEmail === order.id ? (
                                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                ) : (
                                  <Mail className="h-3.5 w-3.5 mr-1.5" />
                                )}
                                Enviar Fatura por Email
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
