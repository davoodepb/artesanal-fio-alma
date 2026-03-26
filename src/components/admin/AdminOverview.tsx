import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, ShoppingCart, MessageSquare, TrendingDown, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Stats {
  totalProducts: number;
  totalOrders: number;
  totalCustomers: number;
  activeUsers: number;
  revenue: number;
  pendingReviews: number;
  unreadMessages: number;
  newOrders?: number;
}

interface AdminOverviewProps {
  stats: Stats;
}

interface Order {
  id: string;
  total: number;
  status: string;
  customer_name?: string | null;
  customer_email?: string | null;
  shipping_address?: string | null;
  notes?: string | null;
  created_at: string;
}

const extractNameFromAddress = (address?: string | null): string => {
  if (!address) return 'Cliente';
  return address.split('\n')[0] || 'Cliente';
};

const extractEmailFromNotes = (notes?: string | null): string => {
  if (!notes) return '';
  const line = notes
    .split('\n')
    .find((entry) => entry.toLowerCase().startsWith('email:'));
  return line ? line.replace(/^email:\s*/i, '').trim() : '';
};

export function AdminOverview({ stats }: AdminOverviewProps) {
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [lowStockCount, setLowStockCount] = useState(0);

  const fetchRecentOrders = async () => {
    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (orders) setRecentOrders(orders);
  };

  useEffect(() => {
    const fetchData = async () => {
      await fetchRecentOrders();

      // Fetch low stock count
      const { count } = await supabase
        .from('products')
        .select('id', { count: 'exact' })
        .lte('stock', 5)
        .eq('is_active', true);
      
      setLowStockCount(count || 0);
    };

    fetchData();
  }, []);

  useEffect(() => {
    const ordersChannel = supabase
      .channel('admin-overview-recent-orders')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        () => {
          fetchRecentOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ordersChannel);
    };
  }, []);

  const statCards = [
    { 
      label: 'Receita Total', 
      value: `€${stats.revenue.toFixed(2)}`, 
      icon: DollarSign, 
      iconColor: 'text-blue-500',
      borderColor: 'border-l-blue-500'
    },
    { 
      label: 'Total Pedidos', 
      value: stats.totalOrders, 
      icon: ShoppingCart, 
      iconColor: 'text-orange-500',
      borderColor: 'border-l-orange-500'
    },
    { 
      label: 'Utilizadores Ativos',
      value: stats.activeUsers,
      icon: Users,
      iconColor: 'text-violet-500',
      borderColor: 'border-l-violet-500'
    },
    {
      label: 'Avaliações Pendentes', 
      value: stats.pendingReviews, 
      icon: MessageSquare, 
      iconColor: 'text-green-500',
      borderColor: 'border-l-green-500'
    },
    {
      label: 'Novos Pedidos',
      value: stats.newOrders || 0,
      icon: ShoppingCart,
      iconColor: 'text-amber-500',
      borderColor: 'border-l-amber-500'
    },
    { 
      label: 'Stock Baixo', 
      value: lowStockCount, 
      icon: TrendingDown, 
      iconColor: 'text-red-500',
      borderColor: 'border-l-red-500'
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Visão Geral</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <Card key={i} className={`border-l-4 ${stat.borderColor}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                    <p className="text-3xl font-bold text-foreground">{stat.value}</p>
                  </div>
                  <Icon className={`h-6 w-6 ${stat.iconColor}`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">Pedidos Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Sem pedidos ainda</p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">Pedido #{order.id.slice(0, 8)}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.customer_name || extractNameFromAddress(order.shipping_address)}
                    </p>
                    {(order.customer_email || extractEmailFromNotes(order.notes)) && (
                      <p className="text-xs text-muted-foreground">
                        {order.customer_email || extractEmailFromNotes(order.notes)}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleString('pt-PT')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">€{Number(order.total).toFixed(2)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      order.status === 'paid' ? 'bg-green-100 text-green-700' :
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      order.status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                      order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {order.status === 'pending' ? 'Pendente' :
                       order.status === 'paid' ? 'Pago' :
                       order.status === 'shipped' ? 'Enviado' :
                       order.status === 'delivered' ? 'Entregue' :
                       'Cancelado'}
                    </span>
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
