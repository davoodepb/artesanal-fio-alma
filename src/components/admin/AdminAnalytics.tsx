import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, DollarSign, ShoppingCart, Users, Download, CreditCard, Smartphone, Building2, Landmark, Receipt, Calculator, Wallet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { paymentMethodLabels } from '@/lib/invoiceGenerator';

interface OrderData {
  id: string;
  total: number;
  status: string;
  payment_method: string | null;
  created_at: string;
  invoice_number: string | null;
}

interface ProductSales {
  product_name: string;
  total_quantity: number;
  total_revenue: number;
}

interface MonthlySales {
  month: string;
  monthKey: string;
  revenue: number;
  orders: number;
  iva: number;
}

interface PaymentMethodStats {
  method: string;
  count: number;
  revenue: number;
}

const IVA_RATE = 0.23;

const paymentIcons: Record<string, React.ReactNode> = {
  mbway: <Smartphone className="h-4 w-4" />,
  card: <CreditCard className="h-4 w-4" />,
  transfer: <Building2 className="h-4 w-4" />,
  multibanco: <Landmark className="h-4 w-4" />,
  googlepay: <Wallet className="h-4 w-4" />,
  paypal: <CreditCard className="h-4 w-4" />,
};

export function AdminAnalytics() {
  const [isLoading, setIsLoading] = useState(true);
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [topProducts, setTopProducts] = useState<ProductSales[]>([]);
  const [monthlySales, setMonthlySales] = useState<MonthlySales[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<Record<string, number>>({});
  const [paymentBreakdown, setPaymentBreakdown] = useState<PaymentMethodStats[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [avgOrderValue, setAvgOrderValue] = useState(0);
  const [totalIVA, setTotalIVA] = useState(0);
  const [periodFilter, setPeriodFilter] = useState('all');

  useEffect(() => {
    fetchAnalytics();
  }, [periodFilter]);

  const getDateFilter = () => {
    const now = new Date();
    switch (periodFilter) {
      case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      case '30d': return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      case '90d': return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
      case '1y': return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()).toISOString();
      default: return null;
    }
  };

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      // Fetch all orders with optional date filter
      let query = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      
      const dateFilter = getDateFilter();
      if (dateFilter) {
        query = query.gte('created_at', dateFilter);
      }

      const { data: ordersData, error: ordersError } = await query;

      if (ordersError) throw ordersError;
      const allOrders = (ordersData || []) as OrderData[];
      setOrders(allOrders);

      // Calculate total revenue (only paid/shipped/delivered)
      const paidOrders = allOrders.filter(o => ['paid', 'shipped', 'delivered'].includes(o.status));
      const revenue = paidOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
      const ivaTotal = revenue - (revenue / (1 + IVA_RATE));
      
      setTotalRevenue(revenue);
      setTotalIVA(ivaTotal);
      setTotalOrders(allOrders.length);
      setAvgOrderValue(paidOrders.length > 0 ? revenue / paidOrders.length : 0);

      // Status breakdown
      const breakdown: Record<string, number> = {};
      allOrders.forEach(o => {
        breakdown[o.status] = (breakdown[o.status] || 0) + 1;
      });
      setStatusBreakdown(breakdown);

      // Payment method breakdown
      const paymentMap: Record<string, { count: number; revenue: number }> = {};
      paidOrders.forEach(o => {
        const method = o.payment_method || 'none';
        if (!paymentMap[method]) paymentMap[method] = { count: 0, revenue: 0 };
        paymentMap[method].count += 1;
        paymentMap[method].revenue += Number(o.total || 0);
      });
      setPaymentBreakdown(
        Object.entries(paymentMap)
          .map(([method, data]) => ({ method, ...data }))
          .sort((a, b) => b.revenue - a.revenue)
      );

      // Monthly sales data (last 12 months)
      const monthlyMap: Record<string, { revenue: number; orders: number }> = {};
      const now = new Date();
      const monthCount = periodFilter === '7d' ? 1 : periodFilter === '30d' ? 2 : periodFilter === '90d' ? 4 : 12;
      for (let i = monthCount - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        monthlyMap[key] = { revenue: 0, orders: 0 };
      }
      paidOrders.forEach(o => {
        const d = new Date(o.created_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (monthlyMap[key]) {
          monthlyMap[key].revenue += Number(o.total || 0);
          monthlyMap[key].orders += 1;
        }
      });
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      setMonthlySales(
        Object.entries(monthlyMap).map(([key, val]) => ({
          monthKey: key,
          month: monthNames[parseInt(key.split('-')[1]) - 1] + ' ' + key.split('-')[0],
          revenue: val.revenue,
          orders: val.orders,
          iva: val.revenue - (val.revenue / (1 + IVA_RATE)),
        }))
      );

      // Top products by sales
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('product_name, quantity, subtotal');

      if (orderItems) {
        const productMap: Record<string, { quantity: number; revenue: number }> = {};
        orderItems.forEach((item: any) => {
          const name = item.product_name;
          if (!productMap[name]) productMap[name] = { quantity: 0, revenue: 0 };
          productMap[name].quantity += Number(item.quantity);
          productMap[name].revenue += Number(item.subtotal);
        });
        const sorted = Object.entries(productMap)
          .map(([name, data]) => ({
            product_name: name,
            total_quantity: data.quantity,
            total_revenue: data.revenue,
          }))
          .sort((a, b) => b.total_revenue - a.total_revenue)
          .slice(0, 10);
        setTopProducts(sorted);
      }

      // Total products count
      const { count: productsCount } = await supabase
        .from('products')
        .select('id', { count: 'exact' })
        .eq('is_active', true);
      setTotalProducts(productsCount || 0);

      // Total customers count
      const { count: customersCount } = await supabase
        .from('profiles')
        .select('id', { count: 'exact' });
      setTotalCustomers(customersCount || 0);

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportFinancialReport = () => {
    const headers = [
      'Período', 'Receita Total (€)', 'Base Tributável (€)', 'IVA 23% (€)', 
      'Nº Pedidos', 'Valor Médio (€)'
    ];
    const rows = monthlySales.map(m => [
      m.month,
      m.revenue.toFixed(2),
      (m.revenue / (1 + IVA_RATE)).toFixed(2),
      m.iva.toFixed(2),
      m.orders.toString(),
      m.orders > 0 ? (m.revenue / m.orders).toFixed(2) : '0.00',
    ]);

    // Add totals row
    rows.push([
      'TOTAL',
      totalRevenue.toFixed(2),
      (totalRevenue / (1 + IVA_RATE)).toFixed(2),
      totalIVA.toFixed(2),
      totalOrders.toString(),
      avgOrderValue.toFixed(2),
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio_financeiro_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Relatório financeiro exportado!');
  };

  const exportPaymentReport = () => {
    const headers = ['Método de Pagamento', 'Nº Transações', 'Receita Total (€)', 'Base Tributável (€)', 'IVA (€)', '% do Total'];
    const rows = paymentBreakdown.map(p => [
      paymentMethodLabels[p.method] || (p.method === 'none' ? 'Não especificado' : p.method),
      p.count.toString(),
      p.revenue.toFixed(2),
      (p.revenue / (1 + IVA_RATE)).toFixed(2),
      (p.revenue - p.revenue / (1 + IVA_RATE)).toFixed(2),
      totalRevenue > 0 ? ((p.revenue / totalRevenue) * 100).toFixed(1) + '%' : '0%',
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pagamentos_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Relatório de pagamentos exportado!');
  };

  const statusLabels: Record<string, string> = {
    pending: 'Pendente',
    paid: 'Pago',
    shipped: 'Enviado',
    delivered: 'Entregue',
    canceled: 'Cancelado',
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    paid: 'bg-green-100 text-green-800',
    shipped: 'bg-blue-100 text-blue-800',
    delivered: 'bg-emerald-100 text-emerald-800',
    canceled: 'bg-red-100 text-red-800',
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const maxRevenue = Math.max(...monthlySales.map(m => m.revenue), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">Análises & Finanças</h1>
          <p className="text-muted-foreground">Visão detalhada das vendas, pagamentos e dados fiscais</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={periodFilter} onValueChange={setPeriodFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo o período</SelectItem>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
              <SelectItem value="1y">Último ano</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Receita Total</p>
                <p className="text-2xl font-bold text-foreground">€{totalRevenue.toFixed(2)}</p>
              </div>
              <DollarSign className="h-5 w-5 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-400">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">IVA Total (23%)</p>
                <p className="text-2xl font-bold text-foreground">€{totalIVA.toFixed(2)}</p>
              </div>
              <Calculator className="h-5 w-5 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Pedidos</p>
                <p className="text-2xl font-bold text-foreground">{totalOrders}</p>
              </div>
              <ShoppingCart className="h-5 w-5 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Valor Médio</p>
                <p className="text-2xl font-bold text-foreground">€{avgOrderValue.toFixed(2)}</p>
              </div>
              <TrendingUp className="h-5 w-5 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Clientes</p>
                <p className="text-2xl font-bold text-foreground">{totalCustomers}</p>
              </div>
              <Users className="h-5 w-5 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold">Receita Mensal</CardTitle>
            <Button variant="outline" size="sm" onClick={exportFinancialReport}>
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Exportar Relatório
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {monthlySales.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Sem dados disponíveis</p>
          ) : (
            <div className="space-y-3">
              {monthlySales.map((m, i) => (
                <div key={i} className="flex items-center gap-4">
                  <span className="w-24 text-sm text-muted-foreground text-right">{m.month}</span>
                  <div className="flex-1 bg-muted rounded-full h-8 relative overflow-hidden">
                    <div
                      className="h-full bg-primary/80 rounded-full transition-all duration-500 flex items-center justify-end pr-3"
                      style={{ width: `${Math.max((m.revenue / maxRevenue) * 100, 2)}%` }}
                    >
                      {m.revenue > 0 && (
                        <span className="text-xs font-medium text-primary-foreground whitespace-nowrap">
                          €{m.revenue.toFixed(0)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-24 text-right">
                    <span className="text-xs text-muted-foreground">{m.orders} ped.</span>
                    <br />
                    <span className="text-xs text-red-400">IVA €{m.iva.toFixed(0)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Methods Breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Métodos de Pagamento
              </CardTitle>
              <Button variant="outline" size="sm" onClick={exportPaymentReport}>
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Exportar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {paymentBreakdown.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Sem pagamentos registados</p>
            ) : (
              <div className="space-y-3">
                {paymentBreakdown.map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        {paymentIcons[p.method] || <CreditCard className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {paymentMethodLabels[p.method] || (p.method === 'none' ? 'Não especificado' : p.method)}
                        </p>
                        <p className="text-xs text-muted-foreground">{p.count} transações</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">€{p.revenue.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">
                        {totalRevenue > 0 ? ((p.revenue / totalRevenue) * 100).toFixed(0) : 0}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status Breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">Estado dos Pedidos</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(statusBreakdown).length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Sem pedidos</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(statusBreakdown).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
                        {statusLabels[status] || status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">{count}</span>
                      <span className="text-xs text-muted-foreground">
                        ({totalOrders > 0 ? ((count / totalOrders) * 100).toFixed(0) : 0}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">Produtos Mais Vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Sem vendas registadas</p>
            ) : (
              <div className="space-y-3">
                {topProducts.map((product, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {i + 1}
                      </span>
                      <div>
                        <p className="font-medium text-sm line-clamp-1">{product.product_name}</p>
                        <p className="text-xs text-muted-foreground">{product.total_quantity} unidades vendidas</p>
                      </div>
                    </div>
                    <span className="font-semibold text-sm">€{product.total_revenue.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Financial Summary Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Resumo Fiscal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-xs text-green-600 font-medium mb-1">Receita Bruta (com IVA)</p>
                <p className="text-2xl font-bold text-green-800">€{totalRevenue.toFixed(2)}</p>
              </div>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-600 font-medium mb-1">Base Tributável (sem IVA)</p>
                <p className="text-2xl font-bold text-blue-800">€{(totalRevenue / (1 + IVA_RATE)).toFixed(2)}</p>
              </div>
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs text-red-600 font-medium mb-1">IVA a entregar (23%)</p>
                <p className="text-2xl font-bold text-red-800">€{totalIVA.toFixed(2)}</p>
              </div>
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-xs text-purple-600 font-medium mb-1">Receita Líquida</p>
                <p className="text-2xl font-bold text-purple-800">€{(totalRevenue - totalIVA).toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">Últimos 10 Pedidos</CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Sem pedidos</p>
          ) : (
            <div className="space-y-2">
              {orders.slice(0, 10).map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium text-sm">
                        {order.invoice_number || `#${order.id.slice(0, 8)}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString('pt-PT', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {order.payment_method && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        {paymentIcons[order.payment_method]}
                      </div>
                    )}
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[order.status] || 'bg-gray-100 text-gray-800'}`}>
                      {statusLabels[order.status] || order.status}
                    </span>
                    <span className="font-semibold">€{Number(order.total).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
