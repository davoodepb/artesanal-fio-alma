import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  User,
  Mail,
  Phone,
  MapPin,
  ShoppingBag,
  Heart,
  LogOut,
  Save,
  Package,
  Loader2,
  Key,
  FileText,
  Trash2,
  ChevronDown,
  ChevronUp,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { openInvoiceWindow, generateInvoiceHTML } from '@/lib/invoiceGenerator';

interface ProfileData {
  full_name: string;
  phone: string;
  address: string;
  nif: string;
}

interface OrderItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

interface OrderSummary {
  id: string;
  total: number;
  status: string;
  created_at: string;
  invoice_number: string | null;
  payment_method: string | null;
  shipping_address: string | null;
  order_items?: OrderItem[];
}

const Account = () => {
  const { user, isLoading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData>({
    full_name: '',
    phone: '',
    address: '',
    nif: '',
  });
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login?redirect=/account');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      setIsLoading(true);
      try {
        // Load profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, phone, address')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profileData) {
          const pd = profileData as any;
          setProfile({
            full_name: pd.full_name || '',
            phone: pd.phone || '',
            address: pd.address || '',
            nif: pd.nif || '',
          });
        } else {
          setProfile({
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
            phone: '',
            address: '',
            nif: '',
          });
        }

        // Load recent orders
        const { data: orderData } = await supabase
          .from('orders')
          .select('id, total, status, created_at, invoice_number, payment_method, shipping_address')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20);

        if (orderData) {
          setOrders(orderData);
        }
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          full_name: profile.full_name || null,
          phone: profile.phone || null,
          address: profile.address || null,
          nif: profile.nif || null,
          updated_at: new Date().toISOString(),
        } as any, { onConflict: 'user_id' });

      if (error) throw error;
      toast.success('Perfil atualizado com sucesso!');
    } catch (err: any) {
      console.error('Error saving profile:', err);
      toast.error('Erro ao guardar perfil: ' + (err.message || 'Tente novamente'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
    toast.success('Sessão terminada');
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error('A nova palavra-passe deve ter pelo menos 6 caracteres.');
      return;
    }
    setChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Palavra-passe alterada com sucesso!');
      setNewPassword('');
    } catch (err: any) {
      toast.error('Erro: ' + (err.message || 'Tente novamente'));
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      // Delete profile data
      await supabase.from('profiles').delete().eq('user_id', user!.id);
      // Sign out
      await signOut();
      toast.success('Conta eliminada. Os seus dados foram removidos.');
      navigate('/');
    } catch (err: any) {
      toast.error('Erro ao eliminar conta: ' + (err.message || 'Contacte-nos'));
    } finally {
      setDeletingAccount(false);
    }
  };

  const toggleOrderDetail = async (orderId: string) => {
    if (expandedOrder === orderId) {
      setExpandedOrder(null);
      return;
    }
    // Fetch order items
    const order = orders.find(o => o.id === orderId);
    if (order && !order.order_items) {
      const { data: items } = await supabase
        .from('order_items')
        .select('product_name, quantity, unit_price, subtotal')
        .eq('order_id', orderId);
      if (items) {
        setOrders(prev => prev.map(o =>
          o.id === orderId ? { ...o, order_items: items } : o
        ));
      }
    }
    setExpandedOrder(orderId);
  };

  const handleViewInvoice = (order: OrderSummary) => {
    const html = generateInvoiceHTML({
      orderId: order.id,
      invoiceNumber: order.invoice_number || null,
      status: order.status,
      total: order.total,
      shippingAddress: order.shipping_address || null,
      notes: null,
      paymentMethod: order.payment_method || null,
      createdAt: order.created_at,
      customerName: profile.full_name,
      customerEmail: user!.email || '',
      items: order.order_items || [],
    });
    openInvoiceWindow(html);
  };

  const paymentLabels: Record<string, string> = {
    mbway: 'MB WAY',
    card: 'Cartão',
    transfer: 'Transferência',
    multibanco: 'Multibanco',
    googlepay: 'Google Pay',
    paypal: 'PayPal',
  };

  const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    pending: { label: 'Pendente', variant: 'outline' },
    paid: { label: 'Pago', variant: 'default' },
    shipped: { label: 'Enviado', variant: 'secondary' },
    delivered: { label: 'Entregue', variant: 'default' },
    canceled: { label: 'Cancelado', variant: 'destructive' },
  };

  if (authLoading || isLoading) {
    return (
      <Layout>
        <div className="container py-16 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!user) return null;

  return (
    <Layout>
      <div className="container py-8 max-w-4xl">
        <h1 className="font-serif text-3xl font-bold mb-8">Minha Conta</h1>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Profile Card */}
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Dados Pessoais
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="email" className="flex items-center gap-2 mb-1.5">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={user.email || ''}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    O email não pode ser alterado
                  </p>
                </div>

                <div>
                  <Label htmlFor="full_name" className="flex items-center gap-2 mb-1.5">
                    <User className="h-4 w-4 text-muted-foreground" />
                    Nome Completo
                  </Label>
                  <Input
                    id="full_name"
                    value={profile.full_name}
                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                    placeholder="O seu nome completo"
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className="flex items-center gap-2 mb-1.5">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    Telefone
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    placeholder="+351 912 345 678"
                  />
                </div>

                <div>
                  <Label htmlFor="address" className="flex items-center gap-2 mb-1.5">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    Morada
                  </Label>
                  <Input
                    id="address"
                    value={profile.address}
                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                    placeholder="Rua, código postal, cidade"
                  />
                </div>

                <div>
                  <Label htmlFor="nif" className="flex items-center gap-2 mb-1.5">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    NIF (para faturas)
                  </Label>
                  <Input
                    id="nif"
                    value={profile.nif}
                    onChange={(e) => setProfile({ ...profile, nif: e.target.value.replace(/\D/g, '').slice(0, 9) })}
                    placeholder="123456789"
                    maxLength={9}
                  />
                </div>

                <Button onClick={handleSave} disabled={isSaving} className="w-full">
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Guardar Alterações
                </Button>
              </CardContent>
            </Card>

            {/* Orders */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Encomendas ({orders.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {orders.length === 0 ? (
                  <div className="text-center py-6">
                    <ShoppingBag className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                    <p className="text-muted-foreground">Ainda sem encomendas</p>
                    <Link
                      to="/products"
                      className="text-primary hover:underline text-sm mt-2 inline-block"
                    >
                      Explorar produtos →
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orders.map((order) => {
                      const st = statusLabels[order.status] || {
                        label: order.status,
                        variant: 'outline' as const,
                      };
                      const isExpanded = expandedOrder === order.id;
                      return (
                        <div key={order.id} className="rounded-lg border overflow-hidden">
                          <button
                            onClick={() => toggleOrderDetail(order.id)}
                            className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors"
                          >
                            <div className="text-left">
                              <p className="text-sm font-medium">
                                #{order.id.slice(0, 8)}
                                {order.invoice_number && (
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    {order.invoice_number}
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(order.created_at).toLocaleDateString('pt-PT')}
                                {order.payment_method && (
                                  <> · {paymentLabels[order.payment_method] || order.payment_method}</>
                                )}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold">€{order.total.toFixed(2)}</span>
                              <Badge variant={st.variant}>{st.label}</Badge>
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </button>

                          {isExpanded && (
                            <div className="border-t p-3 bg-muted/20 space-y-3">
                              {/* Order items */}
                              {order.order_items ? (
                                <div className="space-y-2">
                                  {order.order_items.map((item, idx) => (
                                    <div key={idx} className="flex justify-between text-sm">
                                      <span>
                                        {item.product_name} ×{item.quantity}
                                      </span>
                                      <span className="font-medium">€{item.subtotal.toFixed(2)}</span>
                                    </div>
                                  ))}
                                  <Separator />
                                  <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Base tributável</span>
                                    <span>€{(order.total / 1.23).toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>IVA (23%)</span>
                                    <span>€{(order.total - order.total / 1.23).toFixed(2)}</span>
                                  </div>
                                  <div className="flex justify-between font-bold text-sm">
                                    <span>Total</span>
                                    <span>€{order.total.toFixed(2)}</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex justify-center py-2">
                                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                </div>
                              )}
                              {/* Actions */}
                              <div className="flex gap-2">
                                {order.order_items && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleViewInvoice(order)}
                                    className="gap-1"
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                    Ver Fatura
                                  </Button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Change Password */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5 text-primary" />
                  Alterar Palavra-passe
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input
                  type="password"
                  placeholder="Nova palavra-passe (mín. 6 caracteres)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <Button onClick={handleChangePassword} disabled={changingPassword || newPassword.length < 6} size="sm">
                  {changingPassword ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Key className="h-4 w-4 mr-2" />
                  )}
                  Alterar Palavra-passe
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Quick actions */}
            <Card>
              <CardContent className="p-4 space-y-2">
                <p className="text-sm font-medium text-muted-foreground mb-3">Ações Rápidas</p>
                <Link to="/wishlist" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <Heart className="h-4 w-4 mr-2 text-primary" />
                    Lista de Desejos
                  </Button>
                </Link>
                <Link to="/cart" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <ShoppingBag className="h-4 w-4 mr-2 text-primary" />
                    Carrinho
                  </Button>
                </Link>
                <Separator className="my-3" />
                <Button
                  variant="outline"
                  className="w-full justify-start text-destructive hover:text-destructive"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Terminar Sessão
                </Button>
              </CardContent>
            </Card>

            {/* Account info */}
            <Card>
              <CardContent className="p-4">
                <p className="text-sm font-medium text-muted-foreground mb-2">Conta</p>
                <p className="text-sm truncate">{user.email}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Membro desde {new Date(user.created_at).toLocaleDateString('pt-PT')}
                </p>
              </CardContent>
            </Card>

            {/* Delete Account (RGPD) */}
            <Card className="border-destructive/30">
              <CardContent className="p-4">
                <p className="text-sm font-medium text-muted-foreground mb-2">Zona de Perigo</p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar Conta
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Tem a certeza?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação é irreversível. Todos os seus dados pessoais serão eliminados
                        permanentemente, incluindo o perfil, morada e NIF. O histórico de encomendas
                        será anonimizado conforme o RGPD.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteAccount}
                        disabled={deletingAccount}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {deletingAccount ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 mr-2" />
                        )}
                        Sim, eliminar conta
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Account;
